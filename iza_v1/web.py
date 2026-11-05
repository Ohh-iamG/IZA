"""
IZA web app - the phone-friendly front end. Standard library only.

    iza web                      -> http://127.0.0.1:8765 (this machine only)

To reach it from your phone, put both on Tailscale and run with
IZA_WEB_HOST=0.0.0.0 and a long IZA_WEB_TOKEN. The server refuses to listen
beyond localhost without a token.

Deliberately NOT in the web app: secrets. Those stay in the CLI behind the
passphrase.
"""

from __future__ import annotations

import datetime as dt
import hmac
import json
import os
import threading
import traceback
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import safety
from vault import Embedder, Vault, load_env, now, today

HERE = Path(__file__).resolve().parent
_EMBEDDER: Embedder | None = None
_LOCK = threading.Lock()


class _LockedEmbedder(Embedder):
    def embed(self, text: str, query: bool = False):
        with _LOCK:
            return super().embed(text, query)


def _vault() -> Vault:
    global _EMBEDDER
    if _EMBEDDER is None:
        _EMBEDDER = _LockedEmbedder()
    return Vault(embedder=_EMBEDDER)


def _ser(o):
    if isinstance(o, (dt.datetime, dt.date)):
        return o.isoformat()
    return str(o)


class Handler(BaseHTTPRequestHandler):
    server_version = "IZA"

    def log_message(self, fmt, *args):  # quiet; no request bodies in logs
        pass

    # -- auth ---------------------------------------------------------------
    def _authed(self) -> bool:
        token = os.getenv("IZA_WEB_TOKEN")
        if not token:
            return True  # localhost-only mode
        c = SimpleCookie(self.headers.get("Cookie", ""))
        got = c["iza"].value if "iza" in c else ""
        return hmac.compare_digest(got, token)

    def _send(self, code: int, body: bytes, ctype: str, extra: dict | None = None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy",
                         "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _json(self, obj, code=200, extra=None):
        self._send(code, json.dumps(obj, default=_ser).encode(), "application/json", extra)

    def _body(self) -> dict:
        n = int(self.headers.get("Content-Length") or 0)
        if n > 1_000_000:
            raise ValueError("too large")
        return json.loads(self.rfile.read(n) or b"{}")

    # -- routes ---------------------------------------------------------------
    def do_GET(self):
        url = urlparse(self.path)
        if url.path in ("/", "/index.html"):
            return self._send(200, (HERE / "static" / "index.html").read_bytes(), "text/html; charset=utf-8")
        if not url.path.startswith("/api/"):
            return self._send(404, b"not found", "text/plain")
        if not self._authed():
            return self._json({"error": "login"}, 401)
        qs = {k: v[0] for k, v in parse_qs(url.query).items()}
        try:
            with _vault() as v:
                return self._json(self._get(v, url.path, qs))
        except Exception as e:
            traceback.print_exc()
            return self._json({"error": str(e)}, 500)

    def do_POST(self):
        url = urlparse(self.path)
        if url.path == "/api/login":
            token = os.getenv("IZA_WEB_TOKEN") or ""
            body = self._body()
            if token and hmac.compare_digest(str(body.get("token", "")), token):
                secure = "; Secure" if os.getenv("IZA_WEB_SECURE") == "1" else ""
                return self._json({"ok": True}, extra={
                    "Set-Cookie": f"iza={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000{secure}"})
            return self._json({"error": "wrong token"}, 401)
        if not self._authed():
            return self._json({"error": "login"}, 401)
        if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
            return self._json({"error": "json only"}, 415)
        try:
            body = self._body()
            with _vault() as v:
                return self._json(self._post(v, url.path, body))
        except (KeyError, ValueError) as e:
            return self._json({"error": str(e.args[0] if e.args else e)}, 400)
        except Exception as e:
            traceback.print_exc()
            return self._json({"error": str(e)}, 500)

    def _get(self, v: Vault, path: str, qs: dict):
        if path == "/api/today":
            from circle import Circle
            c = Circle(v)
            last = c.last_checkin()
            return {"owner": os.getenv("IZA_OWNER", ""), "now": now(),
                    "doses": v.doses_today(), "refill": v.refill_check(21),
                    "nudges": c.nudges(), "last_checkin": last,
                    "pending": v.pending_count()}
        if path == "/api/card":
            return {"text": v.emergency_card()}
        if path == "/api/visit":
            days = int(qs.get("days", 90))
            return {"text": v.visit_prep(today() - dt.timedelta(days=days))}
        if path == "/api/meds":
            return {"meds": v.meds(), "facts": v.facts()}
        if path == "/api/recent":
            return {"items": v.recent(int(qs.get("n", 20)))}
        raise KeyError("unknown endpoint")

    def _post(self, v: Vault, path: str, b: dict):
        if path == "/api/take":
            slot = v.dose_log(b["medication"], b.get("slot"), b.get("status", "taken"))
            return {"ok": True, "slot": slot}
        if path == "/api/capture":
            text = str(b.get("text", "")).strip()
            kind = b.get("kind") or "note"
            if kind == "symptom":
                mid, warn = v.symptom(text, source="web")
            else:
                mid, _ = v.capture(text, kind=kind, source="web")
                warn = safety.screen(text)
            return {"id": mid, "warning": warn}
        if path == "/api/recall":
            hits = v.recall(str(b["q"]), limit=10)
            return {"hits": hits, "pending": v.pending_count()}
        if path == "/api/checkin":
            from circle import Circle
            Circle(v).checkin(b.get("note"))
            return {"ok": True}
        if path == "/api/talk":
            from confidant import Confidant
            c = Confidant(vault=v)
            conv = b.get("conversation") or c.start(resume=bool(b.get("resume")))
            return {"conversation": conv, "reply": c.converse(str(b["text"]), conv)}
        if path == "/api/save-last":
            from confidant import Confidant
            c = Confidant(vault=v)
            return {"id": c.save_last(b["conversation"])}
        raise KeyError("unknown endpoint")


def serve(host: str = "127.0.0.1", port: int = 8765) -> None:
    load_env()
    local = host in ("127.0.0.1", "localhost", "::1")
    token = os.getenv("IZA_WEB_TOKEN", "")
    if not local and len(token) < 24:
        raise SystemExit("Refusing to listen beyond this machine without IZA_WEB_TOKEN "
                         "(24+ random characters). Generate one: python -c \"import secrets;print(secrets.token_urlsafe(32))\"")
    httpd = ThreadingHTTPServer((host, port), Handler)
    print(f"IZA web on http://{host}:{port}" + ("" if local else "  (token required)"))
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
