#!/usr/bin/env python3
"""
iza - command line for the IZA Vault. `iza <command> -h` for options.

SET UP      init, doctor, key-init
MEMORY      capture, listen, recall, recent, tune, enrich, archive, entity, alias, link
HEALTH      symptom, question, med-add, med-stop, med-change, med-supply, meds,
            take, skip, due, refill, fact-add, fact-retire, facts, card, visit-prep
SECRETS     secret-put, secret-get, secret-list, secret-del,
            key-passphrase, key-shares, key-recover
CONFIDANT   talk
CIRCLE      circle-add, circle-remove, circle, contact, nudges, checkin,
            rule-add, rules, watch, sos, test-notify, remind
SOVEREIGNTY export, open-export, backup, restore, reembed
APP         web
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
from getpass import getpass
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import safety  # noqa: E402
from vault import Vault, VaultLocked, load_env, now, today, tz  # noqa: E402

load_env()


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def _date(s):
    return dt.date.fromisoformat(s) if s else None


def _when(s):
    if not s:
        return None
    d = dt.datetime.fromisoformat(s)
    return d if d.tzinfo else d.replace(tzinfo=tz())


def _stamp(m) -> str:
    w = m.get("occurred_at") or m.get("captured_at")
    return w.astimezone(tz()).strftime("%Y-%m-%d") if w else "?"


def _yes(prompt: str) -> bool:
    return input(f"{prompt} [y/N] ").strip().lower() in ("y", "yes")


def _master(v: Vault) -> bytes:
    try:
        return v.unlock(getpass("passphrase: "))
    except VaultLocked as e:
        sys.exit(str(e))


def _warn(msg):
    if msg:
        print("\n  !!! " + msg + "\n")


# --------------------------------------------------------------------------
# set up
# --------------------------------------------------------------------------
def cmd_init(a):
    import psycopg
    url = os.getenv("IZA_DB_URL") or sys.exit("IZA_DB_URL is not set (see .env.example)")
    sql = (HERE / "schema.sql").read_text(encoding="utf-8")
    with psycopg.connect(url, autocommit=True) as c:
        c.execute(sql)
    print("schema applied (safe to run again)")


def cmd_doctor(a):
    ok = lambda b: "ok  " if b else "FIX "
    try:
        v = Vault()
    except SystemExit as e:
        sys.exit(f"FIX  database: {e}")
    except Exception as e:
        sys.exit(f"FIX  database: cannot connect ({e})")
    with v:
        print(f"{ok(True)}database connected")
        ext = {r["extname"] for r in v.q("select extname from pg_extension")}
        print(f"{ok('vector' in ext)}pgvector extension")
        ver = v.meta_get("schema_version") if v.has_table("iza_meta") else None
        print(f"{ok(ver)}schema version {ver or 'missing - run iza init'}")
        if not ver:
            return
        rls = v.q1("""select count(*) as n from pg_tables where schemaname = current_schema()
                      and tablename in ('memory','secret','health_fact','vault_key') and not rowsecurity""")["n"]
        print(f"{ok(rls == 0)}row level security on")
        print(f"{ok(v.key_initialised())}vault key " + ("set" if v.key_initialised() else "missing - run iza key-init"))
        try:
            dim = v.embedder.dim
            print(f"{ok(True)}embeddings: {v.embedder.backend} / {v.embedder.model_name} ({dim})")
        except BaseException as e:
            print(f"FIX  embeddings: {e}")
        p = v.pending_count()
        print(f"{ok(p == 0)}{p} memories waiting for enrichment" + (" - run iza enrich" if p else ""))
        lb = v.meta_get("last_backup")
        print(f"{ok(lb)}last backup: {lb or 'never - run iza backup'}")
        lw = v.meta_get("last_watch")
        print(f"{ok(lw)}last watch run: {lw or 'never - schedule iza watch'}")
        print(f"{ok(bool(v.facts()))}emergency facts recorded: {len(v.facts())}")
        if os.getenv("IZA_CHAT_BACKEND", "local") == "local":
            import urllib.request
            host = os.getenv("IZA_OLLAMA_HOST", "http://localhost:11434")
            try:
                urllib.request.urlopen(host + "/api/tags", timeout=3).close()
                print(f"{ok(True)}Ollama reachable at {host}")
            except Exception:
                print(f"FIX  Ollama not reachable at {host} (needed for iza talk)")
        env = HERE / ".env"
        if env.exists() and os.name != "nt":
            mode = env.stat().st_mode & 0o077
            print(f"{ok(mode == 0)}.env permissions" + ("" if mode == 0 else " - run: chmod 600 .env"))


def cmd_key_init(a):
    with Vault() as v:
        if v.key_initialised():
            sys.exit("vault key already exists. Use key-passphrase or key-recover.")
        p1 = getpass("new passphrase (12+ chars): ")
        if getpass("again: ") != p1:
            sys.exit("passphrases did not match")
        shares = v.init_key(p1, a.k, a.n)
    print(f"""
Vault key created. These are your {a.n} RECOVERY SHARES. Any {a.k} of them open
the vault if the passphrase is ever lost; one alone reveals nothing.

Write each on paper or print it. Give them to different people (e.g. a
partner, a solicitor, a sealed envelope at home). Do NOT keep them on this
computer, in email, or in the vault.
""")
    for i, s in enumerate(shares, 1):
        print(f"  share {i}:  {s}")
    print("\nTest one recovery now with:  iza key-recover --test")


def cmd_key_passphrase(a):
    with Vault() as v:
        m = _master(v)
        p1 = getpass("new passphrase: ")
        if getpass("again: ") != p1:
            sys.exit("passphrases did not match")
        v.change_passphrase(m, p1)
    print("passphrase changed. Recovery shares still work.")


def cmd_key_shares(a):
    with Vault() as v:
        m = _master(v)
        for i, s in enumerate(v.new_shares(m, a.k, a.n), 1):
            print(f"  share {i}:  {s}")


def cmd_key_recover(a):
    with Vault() as v:
        try:
            m = v.master_from_shares(_read_shares())
        except Exception as e:
            sys.exit(f"could not recover: {e}")
        if a.test:
            print("recovery works. Nothing was changed.")
            return
        p1 = getpass("set a new passphrase: ")
        if getpass("again: ") != p1:
            sys.exit("passphrases did not match")
        v.change_passphrase(m, p1)
    print("vault recovered and new passphrase set.")


# --------------------------------------------------------------------------
# memory
# --------------------------------------------------------------------------
def cmd_capture(a):
    with Vault() as v:
        mid, ok = v.capture(a.text, kind=a.kind, salience=a.salience,
                            occurred_at=_when(a.occurred), pinned=True if a.pin else None)
    print(mid if ok else f"{mid}  (saved; enrichment pending - run iza enrich)")
    _warn(safety.screen(a.text))


def cmd_listen(a):
    import voice
    with Vault() as v:
        meds = [m["name"] for m in v.meds(include_stopped=True)]
        text = voice.transcribe_file(a.file, meds) if a.file else voice.record_and_transcribe(a.record, meds)
        if not text:
            sys.exit("heard nothing")
        print(f'\n  transcript: "{text}"\n')
        for w in voice.check_med_names(text, meds):
            print("  check: " + w)
        if not a.yes and not _yes("  store this?"):
            print("  discarded")
            return
        if a.kind == "symptom":
            mid, warn = v.symptom(text, source="voice")
            _warn(warn)
        else:
            mid, _ = v.capture(text, kind=a.kind, source="voice", salience=a.salience)
        print("  stored", mid)


def cmd_recall(a):
    with Vault() as v:
        ent = None
        if a.entity:
            e = v.entity_by_name(a.entity)
            if not e:
                cands = v.find_entities(a.entity)
                sys.exit(f"no entity called {a.entity!r}." +
                         (f" Did you mean: {', '.join(c['name'] for c in cands)}?" if cands else ""))
            ent = str(e["id"])
        hits = v.recall(a.text, limit=a.limit, kind=a.kind, entity=ent,
                        after=_when(a.after), before=_when(a.before))
        pending = v.pending_count()
    for h in hits:
        print(f"[{h['score']:.3f}] {_stamp(h)}  ({h['kind']}) {h['content']}")
    if not hits:
        print("(nothing found)")
    if pending:
        print(f"\n  note: {pending} memories not searchable yet - run iza enrich")


def cmd_recent(a):
    with Vault() as v:
        for m in v.recent(a.n, a.kind):
            flag = "" if m["enriched"] else "  [pending]"
            print(f"{_stamp(m)}  {str(m['id'])[:8]}  ({m['kind']}) {m['content']}{flag}")


def cmd_tune(a):
    presets = {"balanced": (0.60, 0.25, 0.15), "meaning": (0.85, 0.05, 0.10),
               "recent": (0.40, 0.50, 0.10), "important": (0.50, 0.15, 0.35)}
    with Vault() as v:
        for name, w in presets.items():
            print(f"\n== {name} {w}")
            for h in v.recall(a.text, limit=5, weights=w):
                print(f"  [{h['score']:.3f}] {_stamp(h)}  {h['content'][:90]}")
    print("\nSet your favourite as defaults with IZA_RECALL_WEIGHTS=0.6,0.25,0.15 (roadmap) or pass via the API.")


def cmd_enrich(a):
    with Vault() as v:
        print("enriched", v.enrich_pending(a.limit))


def cmd_archive(a):
    with Vault() as v:
        v.archive(a.memory, not a.undo)
    print("unarchived" if a.undo else "archived (still kept, just out of recall)")


def cmd_entity(a):
    with Vault() as v:
        exact = v.entity_by_name(a.name)
        if exact:
            print(f"already exists: {exact['name']} ({exact['etype']}) {exact['id']}")
            return
        cands = [c for c in v.find_entities(a.name) if c["sim"] >= 0.3]
        if cands and not a.new:
            print("similar entities already exist:")
            for c in cands:
                print(f"  {c['name']} ({c['etype']}) sim {c['sim']:.2f}  {c['id']}")
            if not _yes(f"create {a.name!r} as a NEW, separate entity?"):
                print("not created. To record another name for an existing one: iza alias \"Existing\" \"" + a.name + "\"")
                return
        print(v.create_entity(a.name, a.type, notes=a.notes))


def cmd_alias(a):
    with Vault() as v:
        e = v.entity_by_name(a.name) or sys.exit(f"no entity called {a.name!r}")
        v.add_alias(str(e["id"]), a.alias)
    print(f"{a.alias!r} now also means {e['name']}")


def cmd_link(a):
    with Vault() as v:
        if a.entity:
            e = v.entity_by_name(a.entity) or sys.exit(
                f"no entity called {a.entity!r} - create it first with iza entity")
            v.link(a.memory, entity=str(e["id"]), relation=a.relation)
        else:
            v.link(a.memory, dst_memory=a.to, relation=a.relation)
    print("linked")


# --------------------------------------------------------------------------
# health
# --------------------------------------------------------------------------
def cmd_symptom(a):
    with Vault() as v:
        mid, warn = v.symptom(a.text, occurred_at=_when(a.when))
    print("logged", mid)
    _warn(warn)
    if not warn:
        print("  " + safety.NON_URGENT)


def cmd_question(a):
    with Vault() as v:
        mid, _ = v.capture(a.text, kind="question", source="medical", salience=0.7)
    print("saved for your next visit:", mid)


def cmd_med_add(a):
    with Vault() as v:
        v.med_add(a.name, a.dose, a.times.split(",") if a.times else [], a.instructions,
                  a.prescriber, _date(a.started), _date(a.supply_until), a.notes)
    print(f"added {a.name} {a.dose}")


def cmd_med_stop(a):
    with Vault() as v:
        v.med_stop(a.name, a.reason, _date(a.on))
    print(f"stopped {a.name}")


def cmd_med_change(a):
    with Vault() as v:
        v.med_change(a.name, a.dose, a.times.split(",") if a.times else None, a.reason)
    print(f"changed {a.name} (old entry kept in history)")


def cmd_med_supply(a):
    with Vault() as v:
        v.med_supply(a.name, _date(a.until))
    print(f"{a.name} supply until {a.until}")


def cmd_meds(a):
    with Vault() as v:
        for m in v.meds(a.all):
            state = f"stopped {m['stopped_on']} ({m['stop_reason']})" if m["stopped_on"] else "active"
            sup = f"  supply to {m['supply_until']}" if m["supply_until"] else ""
            print(f"{m['name']} {m['dose']}  {','.join(m['times']) or 'as needed'}  [{state}]{sup}")


def cmd_take(a, status="taken"):
    with Vault() as v:
        slot = v.dose_log(a.name, a.slot, status, a.note)
    print(f"{a.name} {slot}: {status}")


def cmd_due(a):
    with Vault() as v:
        ds = v.doses_today()
    if not ds:
        print("nothing scheduled today")
    for d in ds:
        print(f"{d['slot']}  {d['medication']} {d['dose']:<12} {d['status'].upper()}")


def cmd_refill(a):
    with Vault() as v:
        rows = v.refill_check(a.days)
    if not rows:
        print(f"nothing runs out in the next {a.days} days")
    for r in rows:
        print(f"{r['supply_until']}  {r['name']} {r['dose']}  - get a script/refill before your swing")


def cmd_fact_add(a):
    with Vault() as v:
        v.fact_add(a.category, a.label, a.detail, a.severity)
    print(f"added {a.category}: {a.label}")


def cmd_fact_retire(a):
    with Vault() as v:
        print("retired", v.fact_retire(a.label))


def cmd_facts(a):
    with Vault() as v:
        for f in v.facts(a.category):
            print(f"{f['category']:<12} {f['label']}" + (f" - {f['detail']}" if f["detail"] else ""))


def cmd_card(a):
    with Vault() as v:
        text = v.emergency_card()
    print(text)
    if a.out:
        Path(a.out).write_text(text, encoding="utf-8")
        print(f"written to {a.out} - print it, keep a photo on your phone, update your phone's Medical ID")


def cmd_visit_prep(a):
    since = _date(a.since) or today() - dt.timedelta(days=a.days)
    with Vault() as v:
        text = v.visit_prep(since)
    print(text)
    if a.out:
        Path(a.out).write_text(text, encoding="utf-8")


# --------------------------------------------------------------------------
# secrets
# --------------------------------------------------------------------------
def cmd_secret_put(a):
    with Vault() as v:
        m = _master(v)
        value = getpass("secret value (hidden): ")
        if not value:
            sys.exit("empty value")
        v.secret_put(a.label, value, m, a.category, a.hint)
    print(f"stored {a.label!r} (ciphertext only)")


def cmd_secret_get(a):
    with Vault() as v:
        m = _master(v)
        try:
            print(v.secret_get(a.label, m))
        except KeyError:
            sys.exit(f"no secret called {a.label!r}")


def cmd_secret_list(a):
    with Vault() as v:
        for s in v.secret_list():
            print(f"{s['label']:<30} {s['category']:<12} {s['hint'] or ''}")


def cmd_secret_del(a):
    with Vault() as v:
        if _yes(f"permanently delete secret {a.label!r}?"):
            print("deleted" if v.secret_delete(a.label) else "not found")


# --------------------------------------------------------------------------
# confidant
# --------------------------------------------------------------------------
def cmd_talk(a):
    from confidant import Confidant
    c = Confidant()
    conv = c.start(resume=a.resume)
    print("IZA. /save keeps your last message, /new starts a fresh thread, /quit leaves.\n")
    try:
        while True:
            try:
                line = input("you> ").strip()
            except EOFError:
                break
            if not line:
                continue
            if line in ("/quit", "/q", "/exit"):
                break
            if line in ("/new", "/n"):
                conv = c.start()
                print("  (new thread)\n")
                continue
            if line in ("/save", "/s"):
                mid = c.save_last(conv)
                print(f"  (saved: {mid})\n" if mid else "  (nothing to save)\n")
                continue
            try:
                print("\niza>", c.converse(line, conv), "\n")
            except Exception as e:
                print(f"\n  (couldn't reach the chat model: {e}. Your message is saved.)\n")
    finally:
        c.v.close()


# --------------------------------------------------------------------------
# circle
# --------------------------------------------------------------------------
def _circle():
    from circle import Circle
    return Circle()


def cmd_circle_add(a):
    c = _circle()
    c.add(a.name, a.rel, a.email, a.webhook, a.phone, a.escalations, a.every)
    print(f"{a.name} is in your circle" + (" (gets escalations)" if a.escalations else ""))


def cmd_circle_remove(a):
    print("removed" if _circle().remove(a.name) else "not found")


def cmd_circle(a):
    for m in _circle().members():
        ch = ", ".join(x for x in ("webhook" if m["webhook"] else "", "email" if m["email"] else "") if x) or "no channel"
        last = m["last_contact"].astimezone(tz()).strftime("%Y-%m-%d") if m["last_contact"] else "never"
        print(f"{m['name']:<14} {m['relation'] or '':<10} {'ESCALATE' if m['escalations'] else '':<9} {ch:<15} last contact {last}")


def cmd_contact(a):
    _circle().contact(a.name, a.note)
    print(f"logged contact with {a.name}")


def cmd_nudges(a):
    ns = _circle().nudges()
    if not ns:
        print("you're up to date with everyone")
    for n in ns:
        print(f"{n['name']}: " + (f"{n['days']} days since you last connected" if n["days"] is not None else "no contact logged yet"))


def cmd_checkin(a):
    _circle().checkin(a.note)
    print("checked in")


def cmd_rule_add(a):
    _circle().rule_add(a.name, a.trigger, a.hours, a.message)
    print(f"rule {a.name!r} set. It only works if `iza watch` runs on a schedule.")


def cmd_rules(a):
    for r in _circle().rules():
        print(f"{r['name']:<12} {r['trigger']:<12} {r['hours']}h  {'on' if r['enabled'] else 'off'}  last fired {r['last_fired'] or 'never'}  \"{r['message']}\"")


def cmd_watch(a):
    fired = _circle().watch()
    for f in fired:
        print(f"{now().isoformat()} fired {f['rule']}: {json.dumps(f['results'])}")
    if not fired and a.verbose:
        print(f"{now().isoformat()} all quiet")


def cmd_sos(a):
    res = _circle().sos(a.message)
    print(json.dumps(res, indent=1))
    print("\nIf this is an emergency, call 000. The circle is not an emergency service.")


def cmd_test_notify(a):
    print(json.dumps(_circle().test(), indent=1))


def cmd_remind(a):
    sent = _circle().remind_self()
    if a.verbose:
        print("reminded:", sent or "nothing due")


# --------------------------------------------------------------------------
# sovereignty
# --------------------------------------------------------------------------
def cmd_export(a):
    with Vault() as v:
        if a.plain and not _yes("write an UNENCRYPTED file with your memories and medical record?"):
            return
        print("wrote", v.export(a.path, plain=a.plain, include_embeddings=a.embeddings))


def _read_shares() -> list[str]:
    shares = []
    print("Enter recovery shares one per line, blank line when done.")
    while True:
        s = input(f"  share {len(shares) + 1}: ").strip()
        if not s:
            return shares
        shares.append(s)


def cmd_open_export(a):
    from vault import open_export_file
    try:
        bundle = (open_export_file(a.path, shares=_read_shares()) if a.shares
                  else open_export_file(a.path, passphrase=getpass("passphrase: ")))
    except Exception as e:
        sys.exit(f"could not open: {e}")
    Path(a.out).write_text(json.dumps(bundle, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"decrypted to {a.out} (plain text - delete it when you are done)")


def cmd_backup(a):
    d = a.dir or os.getenv("IZA_BACKUP_DIR") or str(HERE / "backups")
    with Vault() as v:
        print("backup written:", v.backup(d, a.keep))


def cmd_restore(a):
    from vault import open_export_file
    raw = Path(a.path).read_bytes()
    with Vault() as v:
        if raw.startswith(b"IZAX1"):
            if a.shares:
                bundle = open_export_file(a.path, shares=_read_shares())
            else:
                bundle = open_export_file(a.path, passphrase=getpass("backup passphrase: "))
        else:
            bundle = json.loads(raw)
        counts = v.restore(bundle)
        print("restored:", counts)
        print("now run: iza enrich   (rebuilds search vectors)")


def cmd_reembed(a):
    with Vault() as v:
        m, e = v.reembed_all()
    print(f"re-embedded {m} memories and {e} entities/turns")


def cmd_web(a):
    import web
    web.serve(a.host, a.port)


# --------------------------------------------------------------------------
def build() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="iza", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    s = p.add_subparsers(dest="cmd", required=True, metavar="command")

    def add(name, fn, help_=None):
        sp = s.add_parser(name, help=help_)
        sp.set_defaults(func=fn)
        return sp

    add("init", cmd_init, "apply schema.sql")
    add("doctor", cmd_doctor, "health-check the whole setup")
    x = add("key-init", cmd_key_init, "create the vault key + recovery shares")
    x.add_argument("-k", type=int, default=2); x.add_argument("-n", type=int, default=3)
    add("key-passphrase", cmd_key_passphrase, "change passphrase")
    x = add("key-shares", cmd_key_shares, "issue a fresh set of recovery shares")
    x.add_argument("-k", type=int, default=2); x.add_argument("-n", type=int, default=3)
    x = add("key-recover", cmd_key_recover, "open the vault with recovery shares")
    x.add_argument("--test", action="store_true", help="check the shares work, change nothing")

    x = add("capture", cmd_capture, "store a memory verbatim")
    x.add_argument("text"); x.add_argument("--kind", default="note")
    x.add_argument("--salience", type=float, default=0.5); x.add_argument("--occurred")
    x.add_argument("--pin", action="store_true", help="never fade with time")
    x = add("listen", cmd_listen, "voice capture (local Whisper)")
    x.add_argument("--record", type=float, default=15); x.add_argument("--file")
    x.add_argument("--kind", default="note"); x.add_argument("--salience", type=float, default=0.5)
    x.add_argument("--yes", action="store_true")
    x = add("recall", cmd_recall, "ask your vault")
    x.add_argument("text"); x.add_argument("--limit", type=int, default=8); x.add_argument("--kind")
    x.add_argument("--entity"); x.add_argument("--after"); x.add_argument("--before")
    x = add("recent", cmd_recent, "last captures"); x.add_argument("-n", type=int, default=15); x.add_argument("--kind")
    x = add("tune", cmd_tune, "compare recall weightings"); x.add_argument("text")
    x = add("enrich", cmd_enrich, "embed memories still pending"); x.add_argument("--limit", type=int, default=1000)
    x = add("archive", cmd_archive, "hide a memory from recall"); x.add_argument("memory"); x.add_argument("--undo", action="store_true")
    x = add("entity", cmd_entity, "add a person/place/thing")
    x.add_argument("name"); x.add_argument("--type", default="person"); x.add_argument("--notes")
    x.add_argument("--new", action="store_true", help="skip the similar-name check")
    x = add("alias", cmd_alias, "another name for an entity"); x.add_argument("name"); x.add_argument("alias")
    x = add("link", cmd_link, "link a memory to an entity or memory")
    x.add_argument("memory"); x.add_argument("--entity"); x.add_argument("--to"); x.add_argument("--relation", default="mentions")

    x = add("symptom", cmd_symptom, "log a symptom"); x.add_argument("text"); x.add_argument("--when")
    x = add("question", cmd_question, "save a question for your GP"); x.add_argument("text")
    x = add("med-add", cmd_med_add, "add a medication")
    x.add_argument("name"); x.add_argument("--dose", required=True)
    x.add_argument("--times", help="HH:MM,HH:MM (24h). Omit for as-needed")
    x.add_argument("--instructions"); x.add_argument("--prescriber"); x.add_argument("--started")
    x.add_argument("--supply-until"); x.add_argument("--notes")
    x = add("med-stop", cmd_med_stop); x.add_argument("name"); x.add_argument("--reason", required=True); x.add_argument("--on")
    x = add("med-change", cmd_med_change); x.add_argument("name"); x.add_argument("--dose"); x.add_argument("--times")
    x.add_argument("--reason", default="dose changed")
    x = add("med-supply", cmd_med_supply, "set when supply runs out"); x.add_argument("name"); x.add_argument("until")
    x = add("meds", cmd_meds); x.add_argument("--all", action="store_true")
    for name, st in (("take", "taken"), ("skip", "skipped")):
        x = add(name, lambda a, st=st: cmd_take(a, st), f"log a dose as {st}")
        x.add_argument("name"); x.add_argument("--slot"); x.add_argument("--note")
    add("due", cmd_due, "today's doses")
    x = add("refill", cmd_refill, "what runs out soon"); x.add_argument("--days", type=int, default=21)
    x = add("fact-add", cmd_fact_add, "emergency-layer fact")
    x.add_argument("category", choices=["allergy", "condition", "blood_group", "contact", "clinician", "directive", "note"])
    x.add_argument("label"); x.add_argument("--detail"); x.add_argument("--severity")
    x = add("fact-retire", cmd_fact_retire); x.add_argument("label")
    x = add("facts", cmd_facts); x.add_argument("--category")
    x = add("card", cmd_card, "emergency medical card"); x.add_argument("--out")
    x = add("visit-prep", cmd_visit_prep, "one-page GP summary")
    x.add_argument("--since"); x.add_argument("--days", type=int, default=90); x.add_argument("--out")

    x = add("secret-put", cmd_secret_put); x.add_argument("label")
    x.add_argument("--category", default="credential"); x.add_argument("--hint")
    x = add("secret-get", cmd_secret_get); x.add_argument("label")
    add("secret-list", cmd_secret_list)
    x = add("secret-del", cmd_secret_del); x.add_argument("label")

    x = add("talk", cmd_talk, "talk with IZA"); x.add_argument("--resume", action="store_true")

    x = add("circle-add", cmd_circle_add)
    x.add_argument("name"); x.add_argument("--rel"); x.add_argument("--email"); x.add_argument("--webhook")
    x.add_argument("--phone"); x.add_argument("--escalations", action="store_true")
    x.add_argument("--every", type=int, help="nudge after this many days without contact")
    x = add("circle-remove", cmd_circle_remove); x.add_argument("name")
    add("circle", cmd_circle)
    x = add("contact", cmd_contact, "log real contact"); x.add_argument("name"); x.add_argument("--note")
    add("nudges", cmd_nudges)
    x = add("checkin", cmd_checkin); x.add_argument("--note")
    x = add("rule-add", cmd_rule_add)
    x.add_argument("name"); x.add_argument("--trigger", choices=["no_checkin", "missed_dose"], required=True)
    x.add_argument("--hours", type=float, required=True); x.add_argument("--message", required=True)
    add("rules", cmd_rules)
    x = add("watch", cmd_watch, "evaluate rules (schedule this)"); x.add_argument("-v", "--verbose", action="store_true")
    x = add("sos", cmd_sos); x.add_argument("--message", required=True)
    add("test-notify", cmd_test_notify)
    x = add("remind", cmd_remind, "push due-dose reminder to your phone"); x.add_argument("-v", "--verbose", action="store_true")

    x = add("export", cmd_export, "everything in one file (encrypted)")
    x.add_argument("path"); x.add_argument("--plain", action="store_true"); x.add_argument("--embeddings", action="store_true")
    x = add("open-export", cmd_open_export, "decrypt an export/backup")
    x.add_argument("path"); x.add_argument("out"); x.add_argument("--shares", action="store_true")
    x = add("backup", cmd_backup); x.add_argument("--dir"); x.add_argument("--keep", type=int, default=30)
    x = add("restore", cmd_restore, "load an export/backup into an empty vault")
    x.add_argument("path"); x.add_argument("--shares", action="store_true")
    add("reembed", cmd_reembed)
    x = add("web", cmd_web, "phone-friendly app")
    x.add_argument("--host", default=os.getenv("IZA_WEB_HOST", "127.0.0.1"))
    x.add_argument("--port", type=int, default=int(os.getenv("IZA_WEB_PORT", "8765")))
    return p


def main():
    a = build().parse_args()
    try:
        a.func(a)
    except (KeyError, ValueError, RuntimeError, VaultLocked) as e:
        sys.exit(f"error: {e.args[0] if e.args else e}")


if __name__ == "__main__":
    main()
