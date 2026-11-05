# IZA v1 - Engineering Spec

Supersedes `IZA_Vault_Phase0.md`. One person, local-first, exportable.
Postgres + pgvector on your machine (or Railway/Supabase).

## 1. What it does

- **Captures** brain-dumps by typing or voice, word for word, instantly.
- **Recalls** by meaning, time and person ("what did Dave and I talk about").
- **Holds the medical record**: medications with dose logging, allergies,
  conditions, symptoms, GP questions, an emergency card and GP visit prep.
- **Keeps secrets** (PINs, passwords) encrypted, with a recovery path.
- **Keeps you connected**: the Circle, check-ins, nudges and escalation rules.
- **Talks** (the Confidant): grounded in the vault, honest, points you to people.
- **Hands everything back**: encrypted export/backup that opens with only the
  file plus your passphrase or 2 recovery shares.

## 2. Data model

| Area | Tables | Notes |
|---|---|---|
| Memory | `memory`, `entity`, `link`, `attachment` | `memory.content` is immutable (trigger). `pinned` memories never fade. Entities are never auto-merged. |
| Medical | `medication`, `dose_log`, `health_fact` | Plaintext on purpose: must open in an emergency without the passphrase. |
| Secrets | `vault_key`, `secret` | Ciphertext only. No embedding column, no path into recall. |
| Confidant | `conversation`, `turn` | Raw dialogue, separate from the curated vault. `/save` promotes. |
| Circle | `circle_member`, `checkin`, `rule`, `alert_log` | Rules fire once per quiet spell, not every hour. |
| System | `iza_meta` | schema version, last backup, last watch. |

Row Level Security is on for every table with no policies, which blocks
Supabase's public API; the owner connection still works.

## 3. Recall

```
score = 0.60 * similarity + 0.25 * recency + 0.15 * salience
recency = exp(-age / 180 days)       (halves about every 125 days)
recency = 1.0 for pinned memories    (allergies, conditions, medications, identity)
```
Filters: kind, linked entity, time window. bge queries get the bge retrieval
prefix. `iza tune "question"` compares weightings.

## 4. Capture and enrichment

1. Text stored immediately. Embedding attempted straight after.
2. If embedding fails (offline, model missing), the words are safe and the
   memory waits; `iza enrich` catches up; `iza doctor` reports the backlog.
3. Voice: local Whisper, your medication names passed as hints, near-miss
   drug names flagged, transcript shown, stored only on your yes.
4. Entities: similar names are shown; you choose new entity or alias.

## 5. Keys and secrets

- A random 32-byte master key encrypts secrets (XSalsa20-Poly1305).
- The master key is wrapped by your passphrase (Argon2id, moderate).
- `key-init` splits the master key 2-of-3 (Shamir, GF(256)). One share
  reveals nothing; any two rebuild it. Shares are printed once and never stored.
- A backup keypair: the public half seals exports (so scheduled backups need
  no passphrase); the private half is wrapped by the master key.
- Every export carries its own wrapped key material, so it opens with only
  the file plus passphrase or two shares, even if the database is gone.

## 6. Medical layer

- Medication history is never overwritten: a change stops the old entry and
  starts a new one. Doses are logged per scheduled slot.
- Statuses: later, due (from 30 min before), overdue (60 min after), taken, skipped.
- `refill --days 21` covers a FIFO swing.
- `card` lists blood group, allergies, conditions, current medications,
  directives, doctors and emergency contacts. Print it; mirror it to the
  phone's Medical ID. It must not depend on IZA running.
- Red-flag screen (chest pain, stroke signs, breathing, collapse, overdose,
  anaphylaxis, heat stroke, self-harm) runs on symptoms, captures, the web
  app and the Confidant, and returns the 000 or Lifeline message. It is a
  tripwire, never a diagnosis, and never says you are fine.

## 7. Confidant

- Local model by default (Ollama). Context: vault recall, earlier threads,
  the health record (local backend only), and your people by name.
- API backend: medical memories, medications and allergies never enter the prompt.
- No dosing advice; points to pharmacist, GP or healthdirect 1800 022 222.
- Vault content is passed as data, not instructions.

## 8. Circle

- People with optional webhook (ntfy/Discord/Slack) and email channels.
- `nudges`: who you have not connected with in your chosen interval.
- Rules: `no_checkin` (hours since last check-in) and `missed_dose`
  (a dose overdue by N hours). Each fires once per episode, logged in `alert_log`.
- `watch` records its last run and pings `IZA_WATCH_PING_URL`, so a dead
  watcher gets noticed.
- `remind` pushes generic due-dose reminders to your own phone.
- Not a medical alarm, not a substitute for 000.

## 9. Web app

Standard library server, one HTML page, phone-first, light and dark.
Localhost by default; refuses to listen wider without a 24+ character token.
HttpOnly SameSite=Strict cookie, JSON-only POSTs, strict CSP, no caching.
Secrets are not reachable from the web app by design.

## 10. Failure modes and what covers them

| Risk | Cover |
|---|---|
| Passphrase forgotten (the continuity case) | 2-of-3 recovery shares; `key-recover --test` at setup |
| Emergency, no laptop | Printed card + phone Medical ID |
| Database lost | Daily encrypted backups to an off-machine folder; restore tested |
| Watcher not running | `IZA_WATCH_PING_URL`; `doctor` shows last watch |
| Alert spam | Once-per-episode firing |
| Wrong drug name from voice | Hints + near-miss warnings + confirm before store |
| Two "Daves" merged silently | No auto-merge; aliases are explicit |
| Old allergies sinking in search | Pinned, recency 1.0 |
| Health data to a cloud model | Excluded on the api backend |
| Supabase public API | RLS on every table |
| Model change | Raw text kept; `reembed` covers memories, entities and turns |

## 11. Next

- Photo capture of scripts and letters with local OCR into `attachment`.
- My Health Record export import.
- Master key rotation (to revoke old shares).
- Sharing a chosen memory or kind with one circle member, revocable.
- Run `watch`/`remind` on Railway so the safety net never sleeps.
