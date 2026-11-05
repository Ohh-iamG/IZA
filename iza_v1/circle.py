"""
IZA - the Circle. Your people, kept close, and looped in when it matters.

NOT a medical alarm and NOT a substitute for 000. It notifies people you
trust over channels you configure. Test it (`iza test-notify`) before you
rely on it, and run `iza watch` from an always-on machine.

Channels (per person, opt-in):
    webhook   ntfy topic URL (https://ntfy.sh/<long-random-topic>), Discord or
              Slack incoming webhook. Plain POST otherwise.
    email     via IZA_SMTP_HOST / IZA_SMTP_PORT / IZA_SMTP_USER / IZA_SMTP_PASS / IZA_SMTP_FROM

Optional env:
    IZA_NTFY_TOKEN      access token for a protected ntfy topic
    IZA_SELF_WEBHOOK    your own phone's ntfy topic, for dose reminders
    IZA_WATCH_PING_URL  pinged on every `iza watch` run (e.g. a healthchecks.io
                        check) so you are warned if the watcher itself stops
"""

from __future__ import annotations

import datetime as dt
import json
import os
import smtplib
import ssl
import urllib.request
from email.message import EmailMessage
from typing import Optional

from psycopg.types.json import Jsonb

from vault import Vault, now, today


def _post(url: str, message: str, title: str) -> str:
    if "discord.com/api/webhooks" in url:
        body, ctype = json.dumps({"content": f"**{title}**\n{message}"}).encode(), "application/json"
    elif "hooks.slack.com" in url:
        body, ctype = json.dumps({"text": f"*{title}*\n{message}"}).encode(), "application/json"
    else:
        body, ctype = message.encode(), "text/plain; charset=utf-8"
    req = urllib.request.Request(url, data=body, method="POST",
                                 headers={"Content-Type": ctype, "Title": title.encode("ascii", "ignore").decode(),
                                          "Priority": "high", "Tags": "warning"})
    tok = os.getenv("IZA_NTFY_TOKEN")
    if tok and "ntfy" in url:
        req.add_header("Authorization", f"Bearer {tok}")
    with urllib.request.urlopen(req, timeout=15) as r:
        return f"webhook {r.status}"


def _email(to: str, subject: str, message: str) -> str:
    host = os.getenv("IZA_SMTP_HOST")
    if not host:
        raise RuntimeError("IZA_SMTP_HOST not set")
    msg = EmailMessage()
    msg["From"] = os.getenv("IZA_SMTP_FROM") or os.getenv("IZA_SMTP_USER")
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(message)
    port = int(os.getenv("IZA_SMTP_PORT", "587"))
    with smtplib.SMTP(host, port, timeout=20) as s:
        s.starttls(context=ssl.create_default_context())
        if os.getenv("IZA_SMTP_USER"):
            s.login(os.getenv("IZA_SMTP_USER"), os.getenv("IZA_SMTP_PASS", ""))
        s.send_message(msg)
    return "email sent"


def notify_member(member: dict, title: str, message: str) -> dict:
    res = {"name": member["name"], "channels": []}
    if member.get("webhook"):
        try:
            res["channels"].append(_post(member["webhook"], message, title))
        except Exception as e:  # never let one channel stop the others
            res["channels"].append(f"webhook FAILED: {e}")
    if member.get("email"):
        try:
            res["channels"].append(_email(member["email"], title, message))
        except Exception as e:
            res["channels"].append(f"email FAILED: {e}")
    if not res["channels"]:
        res["channels"].append("no channel configured (message printed only)")
    return res


class Circle:
    def __init__(self, vault: Optional[Vault] = None):
        self.v = vault or Vault()
        self.owner = os.getenv("IZA_OWNER", "IZA owner")

    # -- people --------------------------------------------------------------
    def add(self, name: str, relation: str = None, email: str = None, webhook: str = None,
            phone: str = None, escalations: bool = False, every_days: int = None) -> str:
        row = self.v.q1("""insert into circle_member (name, relation, email, webhook, phone,
                             escalations, contact_every_days)
                           values (%s,%s,%s,%s,%s,%s,%s)
                           on conflict (name) do update set relation = coalesce(excluded.relation, circle_member.relation),
                             email = coalesce(excluded.email, circle_member.email),
                             webhook = coalesce(excluded.webhook, circle_member.webhook),
                             phone = coalesce(excluded.phone, circle_member.phone),
                             escalations = excluded.escalations,
                             contact_every_days = coalesce(excluded.contact_every_days, circle_member.contact_every_days)
                           returning id""",
                        (name, relation, email, webhook, phone, escalations, every_days))
        if phone and escalations:
            exists = self.v.q1("""select 1 as x from health_fact where category = 'contact'
                                  and lower(label) = lower(%s) and active""", (name,))
            if not exists:
                self.v.fact_add("contact", name, f"{relation or ''} {phone}".strip())
        return str(row["id"])

    def remove(self, name: str) -> bool:
        return bool(self.v.q("delete from circle_member where lower(name) = lower(%s) returning id", (name,)))

    def members(self) -> list[dict]:
        return self.v.q("select * from circle_member order by escalations desc, name")

    def contact(self, name: str, note: str = None) -> None:
        rows = self.v.q("""update circle_member set last_contact = now()
                           where lower(name) = lower(%s) returning name""", (name,))
        if not rows:
            raise KeyError(f"{name} is not in your circle")
        if note:
            self.v.capture(f"Caught up with {rows[0]['name']}: {note}", kind="event", source="circle")

    def nudges(self) -> list[dict]:
        out = []
        for m in self.members():
            every = m["contact_every_days"]
            if not every:
                continue
            last = m["last_contact"]
            days = (now() - last).days if last else None
            if days is None or days >= every:
                out.append({"name": m["name"], "relation": m["relation"], "days": days, "every": every})
        return out

    # -- heartbeat + rules ---------------------------------------------------
    def checkin(self, note: str = None) -> None:
        self.v.q("insert into checkin (note) values (%s)", (note,))

    def last_checkin(self) -> Optional[dt.datetime]:
        row = self.v.q1("select max(at) as at from checkin")
        return row["at"] if row else None

    def rule_add(self, name: str, trigger: str, hours: float, message: str) -> None:
        self.v.q("""insert into rule (name, trigger, hours, message) values (%s,%s,%s,%s)
                    on conflict (name) do update set trigger = excluded.trigger, hours = excluded.hours,
                      message = excluded.message, enabled = true""", (name, trigger, hours, message))

    def rules(self) -> list[dict]:
        return self.v.q("select * from rule order by name")

    def rule_enable(self, name: str, enabled: bool) -> bool:
        return bool(self.v.q("update rule set enabled = %s where name = %s returning id", (enabled, name)))

    def _escalate(self, kind: str, title: str, message: str) -> list[dict]:
        targets = [m for m in self.members() if m["escalations"]]
        full = f"{message}\n\n- sent by IZA for {self.owner} at {now().strftime('%d %b %H:%M')}"
        results = [notify_member(m, title, full) for m in targets]
        if not targets:
            results = [{"name": "(nobody)", "channels": ["no circle members have escalations on"]}]
        self.v.q("insert into alert_log (kind, message, results) values (%s,%s,%s)",
                 (kind, message, Jsonb(results)))
        return results

    def watch(self) -> list[dict]:
        """Evaluate rules once. Run on a schedule from an always-on machine."""
        fired = []
        last = self.last_checkin()
        t = now()
        for r in self.rules():
            if not r["enabled"]:
                continue
            if r["trigger"] == "no_checkin":
                ref = last or r["created_at"]
                quiet = t - ref
                already = r["last_fired"] and r["last_fired"] >= ref
                if quiet >= dt.timedelta(hours=r["hours"]) and not already:
                    res = self._escalate("rule", f"IZA check-in: {self.owner}", r["message"])
                    self.v.q("update rule set last_fired = now() where id = %s", (r["id"],))
                    fired.append({"rule": r["name"], "results": res})
            elif r["trigger"] == "missed_dose":
                late = []
                for d in self.v.doses_today(late_after_min=int(r["hours"] * 60)):
                    if d["status"] == "overdue":
                        late.append(d)
                fired_today = r["last_fired"] and r["last_fired"].astimezone(t.tzinfo).date() == today()
                if late and not fired_today:
                    res = self._escalate("rule", f"IZA reminder: {self.owner}", r["message"])
                    self.v.q("update rule set last_fired = now() where id = %s", (r["id"],))
                    fired.append({"rule": r["name"], "results": res})
        self.v.meta_set("last_watch", t.isoformat())
        ping = os.getenv("IZA_WATCH_PING_URL")
        if ping:
            try:
                urllib.request.urlopen(ping, timeout=10).close()
            except Exception:
                pass
        return fired

    def sos(self, message: str) -> list[dict]:
        return self._escalate("sos", f"IZA SOS from {self.owner}", message)

    def test(self) -> list[dict]:
        return self._escalate("test", "IZA TEST - please ignore",
                              f"This is a TEST from {self.owner}'s IZA. If you got this, the alert "
                              f"channel works. No action needed.")

    def remind_self(self, window_min: int = 15) -> list[str]:
        """Push a generic reminder to your own phone for doses due now."""
        url = os.getenv("IZA_SELF_WEBHOOK")
        due = [d for d in self.v.doses_today() if d["status"] in ("due", "overdue")]
        if not due or not url:
            return []
        sent_key = f"reminded:{today().isoformat()}"
        sent = set(json.loads(self.v.meta_get(sent_key) or "[]"))
        fresh = [d for d in due if f"{d['medication']}@{d['slot']}" not in sent]
        if not fresh:
            return []
        detail = os.getenv("IZA_REMINDER_DETAIL", "0") == "1"
        msg = (", ".join(f"{d['medication']} {d['dose']} ({d['slot']})" for d in fresh)
               if detail else f"{len(fresh)} scheduled item(s) due. Open IZA.")
        _post(url, msg, "IZA reminder")
        sent |= {f"{d['medication']}@{d['slot']}" for d in fresh}
        self.v.meta_set(sent_key, json.dumps(sorted(sent)))
        return [f"{d['medication']}@{d['slot']}" for d in fresh]
