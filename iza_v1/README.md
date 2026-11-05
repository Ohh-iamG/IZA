# IZA v1

Your memory, your medical record, your people. One person, your machine, exportable.

This replaces every earlier copy (the Phase 0 `vault.py`/`schema.sql`, the
`schema_confidant.sql` / `schema_circle.sql` layers, `iza.py`, and the AI
Studio "Master UI"). One schema, one CLI, one web app. Tested end to end.

## 1. Database (local, Docker Desktop)

PowerShell:
```powershell
$pw = -join ((48..57)+(97..122) | Get-Random -Count 32 | % {[char]$_}); $pw
docker run -d --name iza-db --restart unless-stopped -e POSTGRES_PASSWORD=$pw -p 127.0.0.1:5432:5432 -v iza-data:/var/lib/postgresql/data pgvector/pgvector:pg16
```
Keep the printed password for `.env`. The `127.0.0.1` part keeps the database
off your network; the volume keeps your data if the container is removed.

Supabase or Railway also work. `iza init` turns on Row Level Security for
every table, which closes Supabase's public API to your data.

## 2. Install

```powershell
cd path\to\iza
python -m pip install -r requirements.txt
python -m pip install faster-whisper sounddevice numpy    # voice, optional
copy .env.example .env      # then edit: IZA_DB_URL password, IZA_OWNER, IZA_TZ
```
Put this folder on your PATH so `iza` works anywhere (uses `iza.bat`).

## 3. First run (in this order)

```
iza init                 # creates everything, safe to re-run
iza key-init             # passphrase + 3 recovery shares. Hand them out on paper.
iza key-recover --test   # prove 2 shares open it, now, not when you need it
iza doctor               # everything should say ok
```

## 4. Emergency layer first (10 minutes, do it today)

```
iza fact-add blood_group "O+"
iza fact-add allergy "Penicillin" --detail "hives" --severity moderate
iza fact-add condition "..." --detail "..."
iza fact-add clinician "Dr ..." --detail "GP, clinic, phone"
iza fact-add contact "Sam" --detail "wife 04xx xxx xxx"
iza med-add "Metformin" --dose 500mg --times 08:00,20:00 --instructions "with food" --supply-until 2026-11-30
iza card --out emergency_card.txt
```
Print the card. Put a photo of it on your phone. Fill in your phone's
Medical ID (iPhone: Health > Medical ID; Android: Settings > Safety & emergency).
The card must work when IZA, the laptop and the internet do not.

## 5. Every day

```
iza due                         # today's doses
iza take Metformin              # logs the dose that is due now
iza skip Metformin --note "sick"
iza symptom "left knee sore after swing, worse on stairs"
iza question "ask about knee scan"
iza capture "Dave lent me the post-hole digger" --kind event
iza recall "what did Dave lend me"
iza checkin
iza talk
```
Before a GP visit: `iza visit-prep --days 90 --out visit_prep.txt`
Before a swing: `iza refill --days 21`

## 6. Phone app

```
iza web                         # http://127.0.0.1:8765 on this machine
```
For your phone: install Tailscale on the PC and phone, then in `.env` set
`IZA_WEB_HOST=0.0.0.0` and `IZA_WEB_TOKEN` (generate with
`python -c "import secrets;print(secrets.token_urlsafe(32))"`), restart
`iza web`, and open `http://<pc-tailscale-name>:8765` on the phone.
Tabs: Today (doses, refills, people, check-in), Capture, Ask, Health
(emergency card, GP prep), Talk. Secrets are deliberately not in the app.

## 7. Your people (the Circle)

```
iza circle-add "Sam" --rel wife --phone "04xx xxx xxx" --webhook https://ntfy.sh/<long-random-topic> --escalations --every 3
iza circle-add "Tom" --rel mate --every 14
iza contact "Tom" --note "beers after swing"
iza nudges
iza rule-add daily --trigger no_checkin --hours 24 --message "Haven't heard from Gerard in a day. Please call him."
iza rule-add meds  --trigger missed_dose --hours 3 --message "Gerard may have missed a scheduled item today. Give him a call."
iza test-notify                 # Sam must receive the TEST before you rely on it
```
Sam installs the ntfy app and subscribes to her topic. Use a long random topic
name: anyone who guesses it can read it.

Schedule the jobs (Windows, once):
```powershell
powershell -ExecutionPolicy Bypass -File .\setup_tasks_windows.ps1
```
Linux/Railway cron:
```
0 * * * *    cd /path/iza && python3 iza.py watch  >> watch.log 2>&1
*/15 * * * * cd /path/iza && python3 iza.py remind
30 3 * * *   cd /path/iza && python3 iza.py backup
```
A sleeping laptop runs nothing. Set `IZA_WATCH_PING_URL` (free
healthchecks.io check) so you are told when the watcher stops, or run
`watch` on an always-on machine.

The Circle notifies people you trust. It is not a medical alarm and not 000.

## 8. Secrets

```
iza secret-put "bank PIN" --hint "everyday account"
iza secret-get "bank PIN"
iza secret-list
iza key-passphrase              # change passphrase
iza key-recover                 # lost passphrase: 2 shares + set a new one
```
Values are encrypted on this machine before the database sees them.

## 9. Backups and leaving

```
iza backup                      # encrypted, to IZA_BACKUP_DIR (keeps 30)
iza open-export backups\iza-....izax out.json            # with passphrase
iza open-export backups\iza-....izax out.json --shares   # with 2 shares
iza restore backups\iza-....izax   # into a fresh, empty database after iza init
iza export everything.izax         # whole vault, one encrypted file
```
A backup opens with only the file plus your passphrase or 2 shares. No
database needed. Point `IZA_BACKUP_DIR` at OneDrive or a USB drive so a copy
lives off this machine, and test `open-export` once a month.

## 10. Talking (the Confidant)

Install Ollama, `ollama pull llama3.1`, then `iza talk` or the Talk tab.
`/save` keeps your last message in the vault. Red-flag messages get the
000 message straight away. It answers health questions only from your record
and never gives doses. With `IZA_CHAT_BACKEND=api`, your medications,
allergies and medical memories are never put in the prompt, but what you type
is sent to the provider.

## Tests

```
set IZA_TEST_DB_URL=postgresql://postgres:<pw>@127.0.0.1:5432/postgres
python -m pip install pytest
python -m pytest tests -q
```
Creates and drops throwaway databases `iza_test_a/b/c`.

## Command list
`iza -h`, and `iza <command> -h` for each.
