"""
IZA VAULT v1 - the core.

Capture without losing a word, recall by meaning + time + person, hold
continuity secrets encrypted, keep the medical layer readable in an emergency,
and hand everything back on one command.

Environment (put these in .env next to this file):
    IZA_DB_URL          postgres connection string            (required)
    IZA_TZ              your timezone, e.g. Australia/Perth   (default: system)
    IZA_EMBED_BACKEND   local (default) | api | hash (tests only)
    IZA_EMBED_MODEL     default BAAI/bge-base-en-v1.5 (768-dim)
    OPENAI_API_KEY / OPENAI_EMBED_MODEL   only if IZA_EMBED_BACKEND=api
"""

from __future__ import annotations

import base64
import datetime as dt
import gzip
import hashlib
import json
import os
import re
import uuid
from pathlib import Path
from typing import Any, Optional
from zoneinfo import ZoneInfo

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from nacl import pwhash, secret as nsecret, public as npublic, utils as nutils
from nacl.exceptions import CryptoError

import safety
import shamir

HERE = Path(__file__).resolve().parent

# kinds that never fade with time and never go to a cloud model
MEDICAL_KINDS = {"medical", "symptom", "result", "appointment", "allergy",
                 "condition", "medication", "question"}
PINNED_KINDS = MEDICAL_KINDS - {"symptom", "question", "appointment"} | {"identity", "anchor"}

EXPORT_MAGIC = b"IZAX1\n"
TABLE_ORDER = ["iza_meta", "memory", "entity", "link", "attachment", "vault_key",
               "secret", "health_fact", "medication", "dose_log", "conversation",
               "turn", "circle_member", "checkin", "rule", "alert_log"]


# --------------------------------------------------------------------------
# config
# --------------------------------------------------------------------------
def load_env(path: Optional[Path] = None) -> None:
    """Read KEY=VALUE lines from .env (next to iza.py) without overriding
    variables already set in the environment."""
    path = path or HERE / ".env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.strip().strip('"').strip("'")
        os.environ.setdefault(k.strip(), v)


def tz() -> dt.tzinfo:
    name = os.getenv("IZA_TZ")
    return ZoneInfo(name) if name else dt.datetime.now().astimezone().tzinfo


def now() -> dt.datetime:
    return dt.datetime.now(tz())


def today() -> dt.date:
    return now().date()


# --------------------------------------------------------------------------
# embeddings - loaded lazily, so commands that don't need them stay fast
# --------------------------------------------------------------------------
class Embedder:
    def __init__(self) -> None:
        self.backend = os.getenv("IZA_EMBED_BACKEND", "local")
        self._model = None
        self._client = None
        if self.backend == "local":
            self.model_name = os.getenv("IZA_EMBED_MODEL", "BAAI/bge-base-en-v1.5")
        elif self.backend == "api":
            self.model_name = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")
        elif self.backend == "hash":
            self.model_name = "hash-768 (testing only, no real meaning)"
        else:
            raise ValueError(f"unknown IZA_EMBED_BACKEND {self.backend!r}")

    @property
    def dim(self) -> int:
        if self.backend == "hash":
            return 768
        if self.backend == "api":
            return int(os.getenv("OPENAI_EMBED_DIM", "1536"))
        self._load()
        fn = getattr(self._model, "get_embedding_dimension", None) or self._model.get_sentence_embedding_dimension
        return fn()

    def _load(self) -> None:
        if self.backend == "local" and self._model is None:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self.model_name)
        if self.backend == "api" and self._client is None:
            from openai import OpenAI
            self._client = OpenAI()

    def embed(self, text: str, query: bool = False) -> list[float]:
        if self.backend == "hash":
            return _hash_embed(text)
        self._load()
        if self.backend == "local":
            if query and "bge" in self.model_name.lower():
                text = "Represent this sentence for searching relevant passages: " + text
            return self._model.encode(text, normalize_embeddings=True).tolist()
        resp = self._client.embeddings.create(model=self.model_name, input=text)
        return resp.data[0].embedding


def _hash_embed(text: str, dim: int = 768) -> list[float]:
    vec = [0.0] * dim
    for tok in re.findall(r"[a-z0-9]+", text.lower()):
        h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
        vec[h % dim] += 1.0 if (h >> 20) & 1 else -1.0
    norm = sum(v * v for v in vec) ** 0.5 or 1.0
    return [v / norm for v in vec]


def _vec(values: list[float]) -> str:
    return "[" + ",".join(f"{float(v):.7g}" for v in values) + "]"


# --------------------------------------------------------------------------
# crypto helpers
# --------------------------------------------------------------------------
def _kdf(passphrase: str, salt: bytes) -> bytes:
    return pwhash.argon2id.kdf(
        nsecret.SecretBox.KEY_SIZE, passphrase.encode(), salt,
        opslimit=pwhash.argon2id.OPSLIMIT_MODERATE,
        memlimit=pwhash.argon2id.MEMLIMIT_MODERATE,
    )


def _check(master: bytes) -> bytes:
    return hashlib.blake2b(master, key=b"iza-master-check", digest_size=16).digest()


class VaultLocked(Exception):
    pass


# --------------------------------------------------------------------------
# the vault
# --------------------------------------------------------------------------
class Vault:
    def __init__(self, db_url: Optional[str] = None, embedder: Optional[Embedder] = None):
        load_env()
        url = db_url or os.getenv("IZA_DB_URL")
        if not url:
            raise SystemExit("IZA_DB_URL is not set. Copy .env.example to .env and fill it in.")
        self.conn = psycopg.connect(url, autocommit=True, row_factory=dict_row)
        self._embedder = embedder
        self._dim_checked = False

    # -- plumbing ---------------------------------------------------------
    @property
    def embedder(self) -> Embedder:
        if self._embedder is None:
            self._embedder = Embedder()
        if not self._dim_checked:
            db_dim = self.db_dim()
            if db_dim and self._embedder.dim != db_dim:
                raise SystemExit(
                    f"Embedding model gives {self._embedder.dim} numbers but the database "
                    f"expects {db_dim}. Change vector({db_dim}) in schema.sql to "
                    f"vector({self._embedder.dim}), run `iza init`, then `iza reembed`.")
            self._dim_checked = True
        return self._embedder

    def db_dim(self) -> Optional[int]:
        row = self.q1("""select atttypmod as d from pg_attribute
                         where attrelid = 'memory'::regclass and attname = 'embedding'""")
        return row["d"] if row and row["d"] > 0 else None

    def q(self, sql: str, params: Any = None) -> list[dict]:
        with self.conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall() if cur.description else []

    def q1(self, sql: str, params: Any = None) -> Optional[dict]:
        rows = self.q(sql, params)
        return rows[0] if rows else None

    def close(self) -> None:
        self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()

    # -- capture ------------------------------------------------------------
    def capture(self, content: str, kind: str = "note", source: str = "manual",
                occurred_at: Optional[dt.datetime] = None, salience: float = 0.5,
                pinned: Optional[bool] = None, meta: Optional[dict] = None,
                enrich: bool = True) -> tuple[str, bool]:
        """Store verbatim FIRST. Returns (memory_id, enriched). If enrichment
        fails (offline, model missing) the words are still safe; run
        `iza enrich` later."""
        content = content.strip()
        if not content:
            raise ValueError("nothing to capture")
        if not 0 <= salience <= 1:
            raise ValueError("salience must be between 0 and 1")
        if pinned is None:
            pinned = kind in PINNED_KINDS
        row = self.q1("""insert into memory (kind, content, source, occurred_at, salience, pinned, meta)
                         values (%s,%s,%s,%s,%s,%s,%s) returning id""",
                      (kind, content, source, occurred_at, salience, pinned, Jsonb(meta or {})))
        mid = str(row["id"])
        ok = False
        if enrich:
            try:
                self.enrich(mid)
                ok = True
            except SystemExit:
                raise
            except Exception:
                ok = False
        return mid, ok

    def enrich(self, memory_id: str) -> None:
        row = self.q1("select content from memory where id = %s", (memory_id,))
        if not row:
            raise KeyError(memory_id)
        vec = self.embedder.embed(row["content"])
        self.q("update memory set embedding = %s::vector where id = %s", (_vec(vec), memory_id))

    def enrich_pending(self, limit: int = 500) -> int:
        rows = self.q("""select id from memory where embedding is null
                         order by captured_at limit %s""", (limit,))
        for r in rows:
            self.enrich(str(r["id"]))
        return len(rows)

    def pending_count(self) -> int:
        return self.q1("select count(*) as n from memory where embedding is null")["n"]

    def recent(self, n: int = 15, kind: Optional[str] = None) -> list[dict]:
        return self.q("""select id, kind, content, captured_at, occurred_at, pinned,
                                embedding is not null as enriched
                         from memory where not is_archived and (%s::text is null or kind = %s)
                         order by captured_at desc limit %s""", (kind, kind, n))

    def archive(self, memory_id: str, archived: bool = True) -> None:
        self.q("update memory set is_archived = %s where id = %s", (archived, memory_id))

    # -- entities: candidates only, you confirm ---------------------------
    def find_entities(self, name: str, limit: int = 5) -> list[dict]:
        return self.q("select * from resolve_entity(%s::text, %s::int)", (name, limit))

    def entity_by_name(self, name: str) -> Optional[dict]:
        return self.q1("""select id, etype, name from entity
                          where lower(name) = lower(%s) or lower(%s) = any(select lower(a) from unnest(aka) a)
                          limit 1""", (name, name))

    def create_entity(self, name: str, etype: str = "person", aka: Optional[list[str]] = None,
                      notes: Optional[str] = None) -> str:
        vec = self.embedder.embed(f"{name}. {notes}" if notes else name)
        row = self.q1("""insert into entity (etype, name, aka, notes, embedding)
                         values (%s,%s,%s,%s,%s::vector) returning id""",
                      (etype, name, aka or [], notes, _vec(vec)))
        return str(row["id"])

    def add_alias(self, entity_id: str, alias: str) -> None:
        self.q("update entity set aka = array_append(aka, %s) where id = %s and not (%s = any(aka))",
               (alias, entity_id, alias))

    def link(self, src_memory: str, *, entity: Optional[str] = None,
             dst_memory: Optional[str] = None, relation: str = "mentions") -> None:
        if bool(entity) == bool(dst_memory):
            raise ValueError("link needs exactly one of entity or dst_memory")
        self.q("""insert into link (src_memory, dst_memory, entity, relation)
                  values (%s,%s,%s,%s) on conflict do nothing""",
               (src_memory, dst_memory, entity, relation))

    # -- recall --------------------------------------------------------------
    def recall(self, query: str, limit: int = 12, kind: Optional[str] = None,
               entity: Optional[str] = None, after: Optional[dt.datetime] = None,
               before: Optional[dt.datetime] = None,
               weights: tuple[float, float, float] = (0.60, 0.25, 0.15),
               exclude_kinds: Optional[set[str]] = None) -> list[dict]:
        qvec = self.embedder.embed(query, query=True)
        w_sim, w_rec, w_sal = weights
        fetch = limit * 3 if exclude_kinds else limit
        rows = self.q("select * from recall(%s::vector, %s::int, %s::text, %s::uuid, %s::timestamptz, %s::timestamptz, %s::real, %s::real, %s::real)",
                      (_vec(qvec), fetch, kind, entity, after, before, w_sim, w_rec, w_sal))
        if exclude_kinds:
            rows = [r for r in rows if r["kind"] not in exclude_kinds]
        return rows[:limit]

    def reembed_all(self) -> tuple[int, int]:
        mem = self.q("select id from memory")
        for r in mem:
            self.enrich(str(r["id"]))
        ents = self.q("select id, name, notes from entity")
        for e in ents:
            vec = self.embedder.embed(f"{e['name']}. {e['notes']}" if e["notes"] else e["name"])
            self.q("update entity set embedding = %s::vector where id = %s", (_vec(vec), e["id"]))
        turns = 0
        if self.has_table("turn"):
            for t in self.q("select id, content from turn"):
                self.q("update turn set embedding = %s::vector where id = %s",
                       (_vec(self.embedder.embed(t["content"])), t["id"]))
                turns += 1
        return len(mem), len(ents) + turns

    def has_table(self, name: str) -> bool:
        return bool(self.q1("select to_regclass(%s) as t", (name,))["t"])

    # -- key management: master key, passphrase wrap, 2-of-3 recovery --------
    def key_initialised(self) -> bool:
        return self.q1("select 1 as x from vault_key where id = 1") is not None

    def init_key(self, passphrase: str, k: int = 2, n: int = 3) -> list[str]:
        """Create the master key. Returns recovery shares - print them, hand
        them out, never store them in the database or on this machine."""
        if self.key_initialised():
            raise RuntimeError("vault key already exists")
        if len(passphrase) < 12:
            raise ValueError("use a passphrase of at least 12 characters")
        master = nutils.random(32)
        backup_sk = npublic.PrivateKey.generate()
        self._store_key(master, passphrase, backup_sk, insert=True)
        return shamir.split(master, k, n)

    def _store_key(self, master: bytes, passphrase: str, backup_sk: npublic.PrivateKey,
                   insert: bool) -> None:
        salt = nutils.random(pwhash.argon2id.SALTBYTES)
        wrapped = nsecret.SecretBox(_kdf(passphrase, salt)).encrypt(master)
        wrapped_sk = nsecret.SecretBox(master).encrypt(bytes(backup_sk))
        params = (salt, wrapped, _check(master), bytes(backup_sk.public_key), wrapped_sk)
        if insert:
            self.q("""insert into vault_key (kdf_salt, wrapped_master, master_check,
                      backup_pk, wrapped_backup_sk) values (%s,%s,%s,%s,%s)""", params)
        else:
            self.q("""update vault_key set kdf_salt=%s, wrapped_master=%s, master_check=%s,
                      backup_pk=%s, wrapped_backup_sk=%s where id = 1""", params)

    def unlock(self, passphrase: str) -> bytes:
        row = self.q1("select * from vault_key where id = 1")
        if not row:
            raise VaultLocked("no vault key yet - run `iza key-init`")
        try:
            master = nsecret.SecretBox(_kdf(passphrase, bytes(row["kdf_salt"]))).decrypt(
                bytes(row["wrapped_master"]))
        except CryptoError:
            raise VaultLocked("wrong passphrase") from None
        return master

    def master_from_shares(self, shares: list[str]) -> bytes:
        row = self.q1("select master_check from vault_key where id = 1")
        if not row:
            raise VaultLocked("no vault key yet")
        master = shamir.combine(shares)
        if _check(master) != bytes(row["master_check"]):
            raise VaultLocked("those shares do not open this vault")
        return master

    def _backup_sk(self, master: bytes) -> npublic.PrivateKey:
        row = self.q1("select wrapped_backup_sk from vault_key where id = 1")
        return npublic.PrivateKey(nsecret.SecretBox(master).decrypt(bytes(row["wrapped_backup_sk"])))

    def change_passphrase(self, master: bytes, new_passphrase: str) -> None:
        if len(new_passphrase) < 12:
            raise ValueError("use a passphrase of at least 12 characters")
        self._store_key(master, new_passphrase, self._backup_sk(master), insert=False)

    def new_shares(self, master: bytes, k: int = 2, n: int = 3) -> list[str]:
        """Issue a fresh set. Old shares still work (same master key); to
        revoke them, rotate the master key (roadmap)."""
        return shamir.split(master, k, n)

    # -- secrets (ciphertext only) -----------------------------------------
    def secret_put(self, label: str, value: str, master: bytes,
                   category: str = "credential", hint: Optional[str] = None) -> str:
        ct = nsecret.SecretBox(master).encrypt(value.encode())
        row = self.q1("""insert into secret (label, category, ciphertext, hint)
                         values (%s,%s,%s,%s)
                         on conflict (label) do update set ciphertext = excluded.ciphertext,
                             category = excluded.category, hint = excluded.hint
                         returning id""", (label, category, ct, hint))
        return str(row["id"])

    def secret_get(self, label: str, master: bytes) -> str:
        row = self.q1("select ciphertext from secret where label = %s", (label,))
        if not row:
            raise KeyError(label)
        return nsecret.SecretBox(master).decrypt(bytes(row["ciphertext"])).decode()

    def secret_list(self) -> list[dict]:
        return self.q("select label, category, hint, updated_at from secret order by label")

    def secret_delete(self, label: str) -> bool:
        return bool(self.q("delete from secret where label = %s returning id", (label,)))

    # -- MEDICAL ---------------------------------------------------------------
    def med_add(self, name: str, dose: str, times: list[str], instructions: str = None,
                prescriber: str = None, started_on: dt.date = None,
                supply_until: dt.date = None, notes: str = None) -> str:
        for t in times:
            if not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", t):
                raise ValueError(f"time {t!r} must be HH:MM, 24-hour")
        row = self.q1("""insert into medication (name, dose, times, instructions, prescriber,
                           started_on, supply_until, notes)
                         values (%s,%s,%s,%s,%s,%s,%s,%s) returning id""",
                      (name.strip(), dose.strip(), sorted(times), instructions, prescriber,
                       started_on or today(), supply_until, notes))
        self.capture(f"Started {name} {dose}" + (f" at {', '.join(sorted(times))}" if times else "")
                     + (f" ({instructions})" if instructions else ""),
                     kind="medication", source="medical", salience=0.9)
        return str(row["id"])

    def _active_med(self, name: str) -> dict:
        row = self.q1("select * from medication where lower(name) = lower(%s) and stopped_on is null",
                      (name.strip(),))
        if not row:
            names = [m["name"] for m in self.meds()]
            raise KeyError(f"no active medication called {name!r}. Active: {', '.join(names) or 'none'}")
        return row

    def med_stop(self, name: str, reason: str, stopped_on: dt.date = None) -> None:
        m = self._active_med(name)
        self.q("update medication set stopped_on = %s, stop_reason = %s where id = %s",
               (stopped_on or today(), reason, m["id"]))
        self.capture(f"Stopped {m['name']} {m['dose']}: {reason}", kind="medication",
                     source="medical", salience=0.9)

    def med_change(self, name: str, dose: str = None, times: list[str] = None,
                   reason: str = "dose changed") -> str:
        m = self._active_med(name)
        with self.conn.transaction():
            self.q("update medication set stopped_on = %s, stop_reason = %s where id = %s",
                   (today(), reason, m["id"]))
            return self.med_add(m["name"], dose or m["dose"], times if times is not None else m["times"],
                                m["instructions"], m["prescriber"], today(), m["supply_until"], m["notes"])

    def med_supply(self, name: str, supply_until: dt.date) -> None:
        m = self._active_med(name)
        self.q("update medication set supply_until = %s where id = %s", (supply_until, m["id"]))

    def meds(self, include_stopped: bool = False) -> list[dict]:
        return self.q(f"""select * from medication
                          {'' if include_stopped else 'where stopped_on is null'}
                          order by stopped_on nulls first, lower(name)""")

    def doses_today(self, day: dt.date = None, late_after_min: int = 60) -> list[dict]:
        day = day or today()
        t_now = now()
        logs = {(str(r["medication"]), r["slot"]): r for r in
                self.q("select * from dose_log where for_date = %s and slot is not null", (day,))}
        out = []
        for m in self.meds():
            if m["started_on"] > day:
                continue
            for slot in m["times"]:
                log = logs.get((str(m["id"]), slot))
                if log:
                    status = log["status"]
                else:
                    hh, mm = map(int, slot.split(":"))
                    due = dt.datetime.combine(day, dt.time(hh, mm), tzinfo=tz())
                    if day < t_now.date() or t_now > due + dt.timedelta(minutes=late_after_min):
                        status = "overdue"
                    elif t_now >= due - dt.timedelta(minutes=30):
                        status = "due"
                    else:
                        status = "later"
                out.append({"medication": m["name"], "dose": m["dose"], "slot": slot,
                            "status": status, "instructions": m["instructions"]})
        return sorted(out, key=lambda d: d["slot"])

    def dose_log(self, name: str, slot: str = None, status: str = "taken",
                 note: str = None, day: dt.date = None) -> str:
        m = self._active_med(name)
        day = day or today()
        if slot is None and m["times"]:
            mine = [d for d in self.doses_today(day) if d["medication"] == m["name"]]
            due_now = [d["slot"] for d in mine if d["status"] in ("due", "overdue")]
            later = [d["slot"] for d in mine if d["status"] == "later"]
            if not (due_now or later):
                raise ValueError(f"all of today's {m['name']} doses are already logged")
            slot = (due_now or later)[0]
        if slot is not None and slot not in m["times"]:
            raise ValueError(f"{m['name']} is scheduled at {', '.join(m['times'])}, not {slot}")
        self.q("""insert into dose_log (medication, slot, for_date, status, note)
                  values (%s,%s,%s,%s,%s)
                  on conflict (medication, for_date, slot) where slot is not null
                  do update set status = excluded.status, note = excluded.note,
                                logged_at = now()""",
               (m["id"], slot, day, status, note))
        return slot or "as-needed"

    def adherence(self, days: int = 30) -> list[dict]:
        start = today() - dt.timedelta(days=days - 1)
        res = []
        for m in self.meds():
            first = max(m["started_on"], start)
            n_days = (today() - first).days + 1
            expected = n_days * len(m["times"])
            taken = self.q1("""select count(*) as n from dose_log
                               where medication = %s and status = 'taken' and for_date >= %s""",
                            (m["id"], first))["n"]
            res.append({"medication": m["name"], "expected": expected, "taken": taken})
        return res

    def refill_check(self, days: int = 21) -> list[dict]:
        return self.q("""select name, dose, supply_until from medication
                         where stopped_on is null and supply_until is not null
                           and supply_until <= %s order by supply_until""",
                      (today() + dt.timedelta(days=days),))

    def fact_add(self, category: str, label: str, detail: str = None,
                 severity: str = None) -> str:
        row = self.q1("""insert into health_fact (category, label, detail, severity)
                         values (%s,%s,%s,%s) returning id""", (category, label, detail, severity))
        if category in ("allergy", "condition"):
            self.capture(f"{category.title()}: {label}" + (f" - {detail}" if detail else ""),
                         kind=category, source="medical", salience=1.0)
        return str(row["id"])

    def fact_retire(self, label: str) -> int:
        return len(self.q("""update health_fact set active = false
                             where lower(label) = lower(%s) and active returning id""", (label,)))

    def facts(self, category: str = None) -> list[dict]:
        return self.q("""select * from health_fact where active and (%s::text is null or category = %s)
                         order by category, label""", (category, category))

    def symptom(self, text: str, occurred_at: dt.datetime = None,
                source: str = "manual") -> tuple[str, Optional[str]]:
        warning = safety.screen(text)
        mid, _ = self.capture(text, kind="symptom", source=source, occurred_at=occurred_at,
                              salience=0.8 if warning else 0.6,
                              meta={"red_flag": bool(warning)})
        return mid, warning

    def emergency_card(self) -> str:
        owner = os.getenv("IZA_OWNER", "")
        f = self.facts()
        by = lambda c: [x for x in f if x["category"] == c]
        lines = ["EMERGENCY MEDICAL CARD" + (f" - {owner}" if owner else ""),
                 f"Updated {today().isoformat()}", ""]
        bg = by("blood_group")
        if bg:
            lines += [f"Blood group: {bg[0]['label']}", ""]
        lines.append("ALLERGIES")
        al = by("allergy")
        lines += [f"  - {a['label']}" + (f" ({a['detail']})" if a["detail"] else "")
                  + (f" [{a['severity']}]" if a["severity"] else "") for a in al] or ["  - none recorded"]
        lines.append("")
        lines.append("CONDITIONS")
        lines += [f"  - {c['label']}" + (f" ({c['detail']})" if c["detail"] else "")
                  for c in by("condition")] or ["  - none recorded"]
        lines.append("")
        lines.append("CURRENT MEDICATIONS")
        lines += [f"  - {m['name']} {m['dose']}" + (f" at {', '.join(m['times'])}" if m["times"] else "")
                  + (f" ({m['instructions']})" if m["instructions"] else "")
                  for m in self.meds()] or ["  - none"]
        for cat, title in (("directive", "DIRECTIVES"), ("clinician", "MY DOCTORS"),
                           ("contact", "EMERGENCY CONTACTS")):
            items = by(cat)
            if items:
                lines += ["", title]
                lines += [f"  - {x['label']}" + (f": {x['detail']}" if x["detail"] else "") for x in items]
        return "\n".join(lines) + "\n"

    def visit_prep(self, since: dt.date) -> str:
        since_ts = dt.datetime.combine(since, dt.time(0), tzinfo=tz())
        out = [f"GP VISIT PREP - changes since {since.isoformat()}", ""]
        started = self.q("select * from medication where started_on >= %s order by started_on", (since,))
        stopped = self.q("select * from medication where stopped_on >= %s order by stopped_on", (since,))
        out.append("MEDICATION CHANGES")
        ch = [f"  - {m['started_on']}: started {m['name']} {m['dose']}" for m in started]
        ch += [f"  - {m['stopped_on']}: stopped {m['name']} {m['dose']} ({m['stop_reason']})" for m in stopped]
        out += ch or ["  - none"]
        out += ["", "CURRENT MEDICATIONS"]
        out += [f"  - {m['name']} {m['dose']} {', '.join(m['times'])}" for m in self.meds()] or ["  - none"]
        days = max((today() - since).days + 1, 1)
        adh = self.adherence(min(days, 90))
        if adh:
            out += ["", f"DOSES TAKEN (last {min(days, 90)} days)"]
            out += [f"  - {a['medication']}: {a['taken']} of {a['expected']}" for a in adh]
        sym = self.q("""select content, coalesce(occurred_at, captured_at) as at, meta from memory
                        where kind = 'symptom' and coalesce(occurred_at, captured_at) >= %s
                        order by at""", (since_ts,))
        out += ["", "SYMPTOMS LOGGED"]
        out += [f"  - {s['at'].astimezone(tz()).strftime('%d %b %H:%M')}: {s['content']}"
                + ("  [RED FLAG]" if (s["meta"] or {}).get("red_flag") else "") for s in sym] or ["  - none"]
        qs = self.q("""select content from memory where kind = 'question' and not is_archived
                       and captured_at >= %s order by captured_at""", (since_ts,))
        out += ["", "MY QUESTIONS"]
        out += [f"  - {x['content']}" for x in qs] or ["  - none"]
        al = self.facts("allergy")
        out += ["", "ALLERGIES (confirm still correct)"]
        out += [f"  - {a['label']}" for a in al] or ["  - none recorded"]
        return "\n".join(out) + "\n"

    # -- export / backup / restore --------------------------------------------
    def _bundle(self, include_embeddings: bool = False) -> dict:
        bundle: dict = {"format": "iza-export", "version": 1,
                        "exported_at": now().isoformat(), "tables": {}}
        for table in TABLE_ORDER:
            if not self.has_table(table):
                continue
            rows = self.q(f"select * from {table}")
            clean = []
            for r in rows:
                rec = {}
                for k, v in r.items():
                    if k == "embedding":
                        if include_embeddings and v is not None:
                            rec[k] = json.loads(v) if isinstance(v, str) else list(v)
                        continue
                    rec[k] = _jsonable(v)
                clean.append(rec)
            bundle["tables"][table] = clean
        return bundle

    def export(self, path: str, plain: bool = False, include_embeddings: bool = False) -> str:
        """Encrypted by default (sealed to the vault's backup key - writing
        needs no passphrase, reading does). plain=True writes readable JSON."""
        data = json.dumps(self._bundle(include_embeddings), indent=1, ensure_ascii=False).encode()
        if plain:
            Path(path).write_bytes(data)
            return path
        key = self.q1("select * from vault_key where id = 1")
        if not key:
            raise VaultLocked("encrypted export needs a vault key - run `iza key-init` first "
                              "(or use --plain, which writes an unencrypted file)")
        # header = the vault's key material (all of it encrypted or public), so a
        # backup opens with ONLY the file + passphrase, or file + recovery shares,
        # even if this database is gone.
        header = json.dumps({k: base64.b64encode(bytes(key[k])).decode() for k in
                             ("kdf_salt", "wrapped_master", "master_check", "backup_pk",
                              "wrapped_backup_sk")}).encode()
        sealed = npublic.SealedBox(npublic.PublicKey(bytes(key["backup_pk"]))).encrypt(gzip.compress(data))
        Path(path).write_bytes(EXPORT_MAGIC + len(header).to_bytes(4, "big") + header + sealed)
        return path

    def backup(self, directory: str, keep: int = 30) -> str:
        d = Path(directory)
        d.mkdir(parents=True, exist_ok=True)
        path = d / f"iza-{now().strftime('%Y%m%d-%H%M%S')}.izax"
        self.export(str(path))
        files = sorted(d.glob("iza-*.izax"))
        for old in files[:-keep] if keep > 0 else []:
            old.unlink()
        self.meta_set("last_backup", now().isoformat())
        return str(path)

    def restore(self, bundle: dict) -> dict:
        """Load an export into an EMPTY database (after `iza init`)."""
        if self.q1("select count(*) as n from memory")["n"]:
            raise RuntimeError("restore needs an empty vault (memory table is not empty)")
        counts = {}
        with self.conn.transaction():
            for table in TABLE_ORDER:
                rows = bundle["tables"].get(table) or []
                if not rows or not self.has_table(table):
                    continue
                if table == "iza_meta":
                    for r in rows:
                        self.meta_set(r["key"], r["value"])
                    continue
                cols = list(rows[0].keys())
                types = {r["column_name"]: r["data_type"] for r in self.q(
                    "select column_name, data_type from information_schema.columns where table_name = %s",
                    (table,))}
                sql = (f"insert into {table} ({', '.join(cols)}) values "
                       f"({', '.join('%s' + ('::vector' if c == 'embedding' else '') for c in cols)})")
                for r in rows:
                    vals = []
                    for c in cols:
                        v = _from_json(r[c])
                        if types.get(c) == "jsonb" and v is not None:
                            v = Jsonb(v)
                        if c == "embedding" and v is not None:
                            v = _vec(v)
                        vals.append(v)
                    self.q(sql, vals)
                counts[table] = len(rows)
        return counts

    # -- meta -------------------------------------------------------------------
    def meta_get(self, key: str) -> Optional[str]:
        row = self.q1("select value from iza_meta where key = %s", (key,))
        return row["value"] if row else None

    def meta_set(self, key: str, value: str) -> None:
        self.q("""insert into iza_meta (key, value) values (%s,%s)
                  on conflict (key) do update set value = excluded.value""", (key, value))


def open_export_file(path: str, passphrase: Optional[str] = None,
                     shares: Optional[list[str]] = None) -> dict:
    """Open an export/backup with ONLY the file plus your passphrase or
    recovery shares. No database needed."""
    raw = Path(path).read_bytes()
    if not raw.startswith(EXPORT_MAGIC):
        return json.loads(raw.decode())  # a --plain export
    body = raw[len(EXPORT_MAGIC):]
    hlen = int.from_bytes(body[:4], "big")
    key = {k: base64.b64decode(v) for k, v in json.loads(body[4:4 + hlen]).items()}
    if shares:
        master = shamir.combine(shares)
    elif passphrase is not None:
        try:
            master = nsecret.SecretBox(_kdf(passphrase, key["kdf_salt"])).decrypt(key["wrapped_master"])
        except CryptoError:
            raise VaultLocked("wrong passphrase for this backup") from None
    else:
        raise ValueError("need a passphrase or recovery shares")
    if _check(master) != key["master_check"]:
        raise VaultLocked("those shares do not open this backup")
    sk = npublic.PrivateKey(nsecret.SecretBox(master).decrypt(key["wrapped_backup_sk"]))
    data = npublic.SealedBox(sk).decrypt(body[4 + hlen:])
    return json.loads(gzip.decompress(data).decode())


def _jsonable(v: Any) -> Any:
    if isinstance(v, (dt.datetime, dt.date, dt.time)):
        return v.isoformat()
    if isinstance(v, uuid.UUID):
        return str(v)
    if isinstance(v, (bytes, bytearray, memoryview)):
        return {"$b64": base64.b64encode(bytes(v)).decode()}
    if hasattr(v, "tolist"):
        return v.tolist()
    return v


def _from_json(v: Any) -> Any:
    if isinstance(v, dict) and set(v) == {"$b64"}:
        return base64.b64decode(v["$b64"])
    return v
