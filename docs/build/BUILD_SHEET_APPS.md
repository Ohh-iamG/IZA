Owner: Gerard

# IZA — App Build Sheet (Web, Android, iOS)

App ID: `com.earthi.iza`
App name: IZA Sovereign Assistant
Version: 1.0 (Android versionCode 1, versionName 1.0; iOS MARKETING_VERSION 1.0)

## 1. Prerequisites

- Node.js and npm installed
- Java JDK (for Android)
- Android Studio (Android builds)
- Xcode on a Mac (iOS builds only)
- A `.env` file created from `.env.example`. Values are never committed.

Environment variables (names only):
- `GEMINI_API_KEY`
- `APP_URL`
- `VITE_API_BASE_URL`

## 2. Install

```bash
npm install
cp .env.example .env         # then fill in real values locally
```

## 3. Run locally

```bash
npm run dev                  # starts server.ts (tsx)
npm run preview              # serves the built web app from dist/
```

## 4. Build the web app

```bash
npm run build                # vite build → dist/
npm run lint                 # tsc --noEmit (type check)
npm run clean                # removes dist/ and server.js
```

## 5. Build the mobile apps (Capacitor)

Capacitor config: `capacitor.config.ts` (webDir `dist`, appId `com.earthi.iza`)

```bash
npm run cap:build            # npm run build + cap sync
npm run cap:android          # opens Android Studio
npm run cap:ios              # opens Xcode (Mac only)
```

Android: build from Android Studio, or from `android/` with `./gradlew assembleDebug`.
iOS: build and sign from Xcode (`ios/App`). Signing needs your Apple developer account.

After any change to web code, run `npm run cap:build` again before opening the native project, or the apps will show old code.

## 6. Release checklist

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm run cap:build` passes
- [ ] Version bumped (Android `versionCode` and `versionName`, iOS `MARKETING_VERSION`)
- [ ] Tested on a real device, not only the browser
- [ ] No secrets in the build; `.env` not included
- [ ] Firebase rules (`firestore.rules`) reviewed if data access changed
- [ ] Security-sensitive features (vault, sign-in, voice) reviewed before public release

## 7. Known gaps

- Store listing links (App Store, Google Play) are not yet set in the landing page.
- The vault (PR #7) is not security-reviewed. Do not store real secrets in it yet.

## 8. Known discrepancies (check before relying on Part B)

Part B is copied from the cheat sheet. The repo does not fully match it:

- **Encryption:** the cheat sheet says libsodium SecretBox / AES-GCM. PR #7 (`pr-7`) uses XChaCha20-Poly1305 with Argon2id. Pick one and update both.
- **Database:** the cheat sheet says PostgreSQL 16 on Google Cloud SQL. Confirm the current `DATABASE_URL` and host before running anything that touches data.
- **Port:** the cheat sheet says port 3000. Confirm with `server.ts` before use.
- **Package name:** `package.json` is still named `react-example`.
- **Environment variables:** the cheat sheet lists more variables than `.env.example`. `.env.example` currently has only `GEMINI_API_KEY`, `APP_URL`, and `VITE_API_BASE_URL`.
- **AI Studio references:** the restart instructions in Section 8 refer to AI Studio tools. Use `npm run dev` locally.
- **README.md:** the file begins with chat text ("Here is a complete, production-ready README..."). Remove the first lines before committing.

---

# Part B — Reference from the IZA Build Cheat Sheet

Copied from IZA_BUILD_CHEATSHEET.md. Read Section 8 above first: some statements here do not match the current repo.


## 1. System Overview & Trinitarian Architecture (restored verbatim from IZA_BUILD_CHEATSHEET.md)

## 1. System Overview & Trinitarian Architecture

IZA operates across three closed sovereign loops designed to protect cognitive sovereignty, harvest ambient energy, and provide un-rewritable personal continuity:

```
                          ┌─────────────────────────────────────┐
                          │            IZA MASTER UI            │
                          │   Human Sovereignty Control Center  │
                          └──────────────────┬──────────────────┘
                                             │
        ┌────────────────────────────────────┼────────────────────────────────────┐
        ▼                                    ▼                                    ▼
 ┌───────────────┐                    ┌──────────────┐                    ┌───────────────┐
 │   LOOP 1:     │                    │   LOOP 2:    │                    │   LOOP 3:     │
 │ Internal Loop │                    │ Ambient Loop │                    │Execution Loop │
 └───────┬───────┘                    └──────┬───────┘                    └───────┬───────┘
         │                                   │                                    │
  Biophysical Engine                  Interpersonal Zen                   Sovereign Vault &
  • ORR Oxygen Reduction              • Tone profiling                    • 6-table relational
  • TEG Thermoelectric                • Narrative defense                   Postgres + pgvector
  • TENG Kinetic                      • Integrity warning                 • Continuity secrets
  • Live telemetry (BPM,              • Audio telemetry stream            • Trusted circle &
    power, stress)                                                          emergency SOS
```

---


## 2. Infrastructure & Environment Specifications

| Component | Technology | Configuration / Port |
|---|---|---|
| **Frontend Framework** | React 19 + TypeScript + Vite | Port `3000` (Mounted via Express `vite.middlewares`) |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite`) | Dark industrial palette (`#020617` / `#0f172a`) |
| **Backend Server** | Node.js + Express + `ws` (WebSockets) | `server.ts` listening on `0.0.0.0:3000` |
| **Relational Database** | PostgreSQL 16 on Google Cloud SQL | Region: `asia-southeast1`, Instance: `ai-studio-a9c88bb8` |
| **Vector Engine** | `pgvector` extension | `vector(768)` embeddings for semantic recall |
| **AI Voice Engine** | Gemini 3.8 Live API (`gemini-3.8-live`) | Low-latency duplex audio (16kHz in / 24kHz out, Voice: `Zephyr`) |
| **AI Confidant Engine** | Gemini 3.8 Flash (`gemini-3.8-flash`) | De-escalation & narrative protection prompt |
| **Authentication** | Firebase Auth (Google Sign-In) | Client-side popup + token verification |

---

## 3. Database Schema & Vector Indexing (Phase 0)

All persistent tables are defined in PostgreSQL with `CREATE EXTENSION IF NOT EXISTS vector;`:

```sql
-- 1. Atomic Memory Table
CREATE TABLE IF NOT EXISTS memory (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  kind VARCHAR(32) NOT NULL DEFAULT 'note', -- 'note' | 'convo' | 'voice' | 'link' | 'decision'
  salience REAL NOT NULL DEFAULT 0.5,        -- Priority weight: 0.0 to 1.0
  embedding vector(768),                     -- 768-dimensional semantic embedding
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_captured_at ON memory(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_kind ON memory(kind);

-- 2. Durable Real-World Entities
CREATE TABLE IF NOT EXISTS entity (
  id BIGSERIAL PRIMARY KEY,
  canonical_name VARCHAR(255) NOT NULL UNIQUE,
  entity_type VARCHAR(64) NOT NULL DEFAULT 'person', -- 'person' | 'place' | 'concept' | 'org'
  aliases TEXT[] DEFAULT '{}',
  notes TEXT,
  embedding vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Knowledge Graph Links
CREATE TABLE IF NOT EXISTS link (
  id BIGSERIAL PRIMARY KEY,
  source_type VARCHAR(32) NOT NULL, -- 'memory' | 'entity'
  source_id BIGINT NOT NULL,
  target_type VARCHAR(32) NOT NULL,
  target_id BIGINT NOT NULL,
  relation VARCHAR(64) NOT NULL,    -- 'mentions' | 'caused' | 'supports' | 'contradicts'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Media & Binary Attachments
CREATE TABLE IF NOT EXISTS attachment (
  id BIGSERIAL PRIMARY KEY,
  memory_id BIGINT REFERENCES memory(id) ON DELETE CASCADE,
  mime_type VARCHAR(128) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. The Continuity Vault (Strictly Isolated, NEVER Embedded)
CREATE TABLE IF NOT EXISTS secret (
  id BIGSERIAL PRIMARY KEY,
  label VARCHAR(128) NOT NULL,
  ciphertext TEXT NOT NULL,         -- libsodium SecretBox / AES-GCM ciphertext
  nonce VARCHAR(64) NOT NULL,       -- Cryptographic nonce
  salt VARCHAR(64) NOT NULL,        -- Argon2id salt
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Trusted Circle & Safety Heartbeats
CREATE TABLE IF NOT EXISTS circle_member (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  relationship VARCHAR(64) NOT NULL,
  contact_info TEXT,
  max_days_between_contact INT DEFAULT 7,
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checkin_log (
  id BIGSERIAL PRIMARY KEY,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- 7. Hybrid Recall Function (Semantic + Recency Decay + Salience)
CREATE OR REPLACE FUNCTION recall(
  query_embedding vector(768),
  match_limit INT DEFAULT 10,
  w_sim REAL DEFAULT 0.60,
  w_rec REAL DEFAULT 0.25,
  w_sal REAL DEFAULT 0.15
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  kind VARCHAR(32),
  salience REAL,
  score REAL,
  captured_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.kind,
    m.salience,
    (
      w_sim * (1 - (m.embedding <=> query_embedding)) +
      w_rec * EXP(-EXTRACT(EPOCH FROM (NOW() - m.captured_at)) / (86400.0 * 180.0)) +
      w_sal * m.salience
    )::REAL AS score,
    m.captured_at
  FROM memory m
  WHERE m.embedding IS NOT NULL
  ORDER BY score DESC
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. CLI Command Dictionary

The interactive terminal input accepts native IZA commands:

| Command | Action | Example |
|---|---|---|
| `iza capture "<text>"` | Stores raw observation/memory into Cloud SQL with timestamp | `iza capture "Dave mentioned post-hole digger for boundary fence"` |
| `iza secret-put "<label>" "<text>"` | Stores locked secret into Continuity Vault | `iza secret-put "Bank PIN" "9482"` |
| `iza circle-add "<name>" "<rel>"` | Registers trusted human ally to circle | `iza circle-add "Sarah Chen" "Spouse"` |
| `iza talk` / `iza confidant` | Opens the Gemini 3.8 Flash de-escalation chat | `iza talk` |
| `iza listen` / `iza voice` | Launches full-duplex Gemini 3.8 Live voice modal | `iza voice` |
| `iza enrich` | Triggers proactive memory synthesis & entity graph extraction | `iza enrich` |
| `iza entities` / `iza graph` | Opens the Knowledge Graph & Entity Timeline Drawer | `iza graph` |
| `iza attach` / `iza photo` | Opens the Multi-Modal Visual Ingestion drop-zone | `iza attach` |
| `iza recall "<query>"` | Filters and recalls memories matching a semantic or keyword search | `iza recall "dose he owe me anything"` |
| `iza delete-search "<q>"` | Deletes all memories matching keyword from Cloud SQL | `iza delete-search "dose he owe me"` |
| `iza forget "<q>"` | Synonym for delete-search | `iza forget "with him."` |
| `iza checkin "<note>"` | Records a daily heartbeat & wellness log | `iza checkin "Feeling grounded and focused"` |
| `iza sync` | Manually flushes local IndexedDB offline cache to Cloud SQL | `iza sync` |
| `iza sos` / `iza emergency` | Triggers SOS emergency broadcast & override | `iza sos` |
| `iza purge` | Neutralizes external narrative threats and clears alerts | `iza purge` |

---

## 5. Gemini 3.8 Live API Audio & WebSocket Protocol

Bidirectional voice streaming operates over WebSocket at `/live`:

```
 [User Microphone] ──> (16kHz PCM 16-bit LE) ──> Base64 ──> WebSocket (/live)
                                                                    │
                                                                    ▼
                                                            Gemini Live API
                                                           (gemini-3.8-live)
                                                                    │
                                                                    ▼
 [Audio Output]   <── Gapless Scheduling <── 24kHz PCM <── WebSocket (/live)
```

### Audio Client & Sentiment Telemetry Specifications
- **Input:** `ScriptProcessorNode` capturing 2048-sample frames (~128ms) at **16,000 Hz**, converted from 32-bit Float to 16-bit Signed Little-Endian Integer (`pcm;rate=16000`).
- **Output:** 24,000 Hz mono PCM decoded from Base64 into `AudioBuffer` and played via `AudioBufferSourceNode` with gapless start scheduling.
- **Transcripts:** Real-time dual streams: `inputTranscript` (user thought) and `outputTranscript` (IZA answer).
- **Voice Sentiment Tagging:** Computes spectral zero-crossing rate and RMS energy in real time, determining `stress_index` (1..10) and inferred `tone` (`"calm"`, `"focused"`, `"strained"`, `"elevated"`).
- **Ambient Hotword ("Hey IZA"):** Uses local browser speech recognition to detect "Hey IZA" hands-free and activate the live audio session.
- **Daily Pulse Grounding:** On every session connection, IZA fetches the last 24 hours of check-ins, recent memories, and high-salience priorities, injecting a dynamic Daily Pulse directly into her system instructions.

---

## 6. Server REST Endpoints (`server.ts`)

| Route | Method | Body / Query | Description |
|---|---|---|---|
| `/api/gemini/chat` | `POST` | `{ message: string, history: Array }` | De-escalation & tactical advice via `gemini-3.8-flash` with Daily Pulse |
| `/api/memories` | `GET` | `?limit=50` | Retrieves latest episodic memories from Cloud SQL |
| `/api/memories` | `POST` | `{ content, kind, salience }` | Inserts new memory record into PostgreSQL |
| `/api/memories/search` | `GET` | `?q=query` | Searches memories by text/summary keyword |
| `/api/memories/search` | `DELETE` | `?q=query` | Deletes all memories matching keyword from Cloud SQL |
| `/api/memories/:id` | `DELETE` | — | Deletes a single memory record safely |
| `/api/memories/enrich` | `POST` | — | Proactively synthesizes un-enriched memories, extracts summaries & entities |
| `/api/attachments` | `POST` | `{ fileName, mimeType, fileData, note }` | Multi-modal visual ingestion (photos, sketches, schematics) |
| `/api/entities` | `GET` | — | Retrieves all durable entities (people, places, projects, tools) |
| `/api/entities/:id/timeline` | `GET` | — | Returns complete chronological timeline of memories linked to an entity |
| `/api/memories/batch` | `POST` | `{ items: Array }` | Flushes offline IndexedDB memories to Cloud SQL |
| `/api/checkins` | `POST` | `{ note: string }` | Records daily heartbeat log |
| `/api/circle` | `GET` | — | Retrieves all trusted circle contacts |
| `/api/secrets` | `GET` | — | Retrieves list of secret labels (ciphertexts protected) |

---

## 8. Maintenance & Runbook Commands

- **Start Dev Server:** `npm run dev` (Runs `tsx server.ts` on port 3000)
- **Compile & Typecheck:** `npm run build`
- **Lint Codebase:** `npm run lint`
- **Check Dev Server Status:** `curl -I http://localhost:3000/`
- **Check Cloud SQL Connection:** `curl -s http://localhost:3000/api/memories`
- **Restart Development Server:** Via AI Studio restart tool or `restart_dev_server`
# Appendix — Commands used in the IZA build session

These are the shell commands recorded in this session, in order. Long scripts are cut at the first 400 characters; the full text is in the session record. Secrets were not used in these commands.

### 1
```bash
pwd
```

### 2
```bash
mkdir -p /home/claude/izalife-landing/screens && cd /home/claude/izalife-landing/screens && \
curl -sSL -o home.jpg "https://framerusercontent.com/screenshots/on-demand/dc5fb097-0d3d-484b-9cf5-6a577c08385e.jpg" && \
curl -sSL -o recall.jpg "https://framerusercontent.com/screenshots/on-demand/e4c619e7-97bb-4549-a3e0-28e06b071683.jpg" && \
curl -sSL -o people.jpg "https://framerusercontent.com/scree …
```

### 3
```bash
find /home/claude/izalife-landing -type f -printf '%p\n'
```

### 4
```bash
mkdir -p /mnt/user-data/outputs/IZA && cp /home/claude/izalife-landing/index.html /mnt/user-data/outputs/IZA/izalife-landing-index.html && cp /mnt/user-data/attachments/9cda8652-ebe3-5172-8142-cd3762aaf738/e08509b3-attachment.txt "/mnt/user-data/outputs/IZA/IZA-Vault-Phase0-spec-v1.txt" && cp /mnt/user-data/attachments/9cda8652-ebe3-5172-8142-cd3762aaf738/408f2636-attachment.txt "/mnt/user-data/ou …
```

### 5
```bash
cd /home/claude/izalife-landing && grep -n "locale\|GBP\|mailto:hello\|en-GB\|PreOrder" index.html; echo "---"; python3 -c "import html.parser,sys; html.parser.HTMLParser().feed(open('index.html').read()); print('parsed ok')"; python3 -c "import json,re; s=open('index.html').read(); m=re.search(r'<script type=\"application/ld\+json\">(.*?)</script>',s,re.S); json.loads(m.group(1)); print('json-ld  …
```

### 6
```bash
cp /home/claude/izalife-landing/index.html /mnt/user-data/outputs/IZA/izalife-landing-index.html && echo ok
```

### 7
```bash
mkdir -p /tmp/claude-shots 2>/dev/null; SCR=/tmp/claude-shots; cat > /tmp/claude-shots/shot.js <<'EOF'
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const file = 'file:///home/claude/izalife-landing/index.html';
  for (const [name, w, h] of [['desktop', 1440, 900], ['phone', 390, 844]]) {
    const page = await browser.newPage({ viewport: { …
```

### 8
```bash
cd /tmp/claude-shots && cat > check.js <<'EOF'
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  for (const [name, w, h] of [['desktop', 1440, 900], ['tablet', 820, 1180], ['phone', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.goto('file:///home/claude/izalife- …
```

### 9
```bash
cp /home/claude/izalife-landing/index.html /mnt/user-data/outputs/IZA/izalife-landing-index.html && echo ok
```

### 10
```bash
cd /home/claude/izalife-landing && sed -i -E 's#href="https://(www\.linkedin\.com/company/izalife|github\.com/izalife|apps\.apple\.com/app/izalife|play\.google\.com/store/apps/details\?id=app\.izalife)" rel="noopener" target="_blank"#href="\#" data-replace-with-real-link="true" rel="noopener" target="_blank"#g' index.html && grep -n 'data-replace' index.html | head; grep -c 'data-replace' index.ht …
```

### 11
```bash
cd /tmp/claude-shots && NODE_PATH=$(npm root -g) node check.js && grep -c "hdr-social" /home/claude/izalife-landing/index.html && grep -c "1680px" /home/claude/izalife-landing/index.html
```

### 12
```bash
cp /home/claude/izalife-landing/index.html /mnt/user-data/outputs/IZA/izalife-landing-index.html && echo ok
```

### 13
```bash
cd /home/claude/izalife-landing && grep -n 'class="dot"\|class="ico"' index.html
```

### 14
```bash
python3 - <<'EOF'
import re
p='index.html'
s=open(p,encoding='utf-8').read()
def svg(body, color='#71F5DB', size=18):
    return f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" fill="none" stroke="{color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{body}</svg>'
icons = {
 'mic': '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 …
```

### 15
```bash
cd /tmp/claude-shots && cat > icons.js <<'EOF'
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await p.goto('file:///home/claude/izalife-landing/index.html', { waitUntil: 'load' });
  await p.evaluate(() => document.querySelectorAll('.reveal').forEach(e = …
```

### 16
```bash
cd /home/claude/izalife-landing && python3 - <<'EOF'
import re
p='index.html'
s=open(p,encoding='utf-8').read()
n=len(re.findall(r'</b> <span>\. ', s))
s=re.sub(r'</b> <span>\. ', '</b> <span>', s)
s=s.replace('<b>Talk</b> <span>Say what','<b>Talk</b> — <span>Say what')
open(p,'w',encoding='utf-8').write(s)
print('fixed', n)
EOF
grep -n '<span>\.' index.html | head -3; cd /tmp/claude-shots && NODE …
```

### 17
```bash
gh api user --jq '{login: .login, name: .name, html_url: .html_url}' 2>&1 | head -20
```

### 18
```bash
cd /home/claude/izalife-landing && python3 - <<'EOF'
p='index.html'
s=open(p,encoding='utf-8').read()
old='<a href="#" data-replace-with-real-link="true" rel="noopener" target="_blank">GitHub</a>'
new='<a href="https://github.com/Ohh-iamG" rel="noopener" target="_blank">GitHub</a>'
n=s.count(old); s=s.replace(old,new)
open(p,'w',encoding='utf-8').write(s); print('github links set:', n)
EOF
grep -n …
```

### 19
```bash
gh pr view 7 --repo Ohh-iamG/IZA --json title,state,author,body,url,headRefName,baseRefName,statusCheckRollup,reviews,comments 2>&1 | head -c 6000
```

### 20
```bash
gh api repos/Ohh-iamG/IZA/pulls/7 --jq '{title,state,draft,user:.user.login,body,head:.head.ref,base:.base.ref,url:.html_url,changed_files,additions,deletions}' 2>&1 | head -c 5000; echo; echo ---FILES---; gh api repos/Ohh-iamG/IZA/pulls/7/files --jq '.[] | {filename,status,additions,deletions}' 2>&1 | head -c 3000
```

### 21
```bash
ls -A /home/claude/ohh-iamg/iza 2>/dev/null; mkdir -p /home/claude/ohh-iamg && cd /home/claude/ohh-iamg && GIT_LFS_SKIP_SMUDGE=1 timeout 600 git clone --depth 1 https://github.com/Ohh-iamG/iza /home/claude/ohh-iamg/iza 2>&1 | tail -5; git -C /home/claude/ohh-iamg/iza log -1 --format='%H %s' 2>&1; git -C /home/claude/ohh-iamg/iza ls-files | head -100
```

### 22
```bash
cd /home/claude/ohh-iamg/iza && GIT_LFS_SKIP_SMUDGE=1 timeout 300 git fetch --depth=50 origin pull/7/head:pr-7 2>&1 | tail -3; git log -1 --format='%H %s' pr-7 2>&1; echo ---; git diff --stat HEAD...pr-7 2>&1 | tail -40
```

### 23
```bash
git diff HEAD...pr-7 -- package.json && git show pr-7:src/lib/vault.ts
```

### 24
```bash
cd /home/claude/ohh-iamg/iza && git status --short | head; echo "--- old vs new line counts"; wc -l IZA_BUILD_CHEATSHEET.md; wc -l /mnt/user-data/attachments/9cda8652-ebe3-5172-8142-cd3762aaf738/e7952b0a-attachment.txt; echo "--- old headings"; grep -n '^## ' IZA_BUILD_CHEATSHEET.md; echo "--- new headings"; grep -n '^## ' /mnt/user-data/attachments/9cda8652-ebe3-5172-8142-cd3762aaf738/e7952b0a-at …
```

### 25
```bash
diff IZA_BUILD_CHEATSHEET.md /mnt/user-data/attachments/9cda8652-ebe3-5172-8142-cd3762aaf738/e7952b0a-attachment.txt | head -80; echo "rc=$?"
```

### 26
```bash
for f in server.ts index.html metadata.json package.json schema.sql src/App.tsx src/main.tsx src/db/schema.ts src/db/index.ts src/db/users.ts src/db/drizzle.config.ts src/lib/live-audio.ts src/lib/firebase.ts src/lib/firebase-admin.ts src/components/LiveVoiceModal.tsx src/middleware/auth.ts; do [ -e "$f" ] && echo "OK  $f" || echo "MISSING $f"; done; echo "--- git branches on remote with cheatshee …
```

### 27
```bash
echo "hardware/biophysical terms in repo:"; grep -rIl -i 'TENG\|thermoelectric\|oxygen reduction\|biophysical\|stress_index' --exclude-dir=node_modules --exclude-dir=.git . | head; echo "--- secret/encryption terms in repo:"; grep -rIn -i 'secretbox\|aes-gcm\|xchacha\|argon2' --exclude-dir=node_modules --exclude-dir=.git . | grep -v IZA_BUILD_CHEATSHEET | head -5; echo "--- /api/secrets route:"; g …
```

### 28
```bash
echo "tracked files: $(git ls-files | wc -l)"; echo "working tree status:"; git status --short | head -5; echo "remote HEAD:"; git ls-remote origin HEAD 2>&1 | head -2; echo "--- src tree in clone:"; git ls-files src | sed 's#/[^/]*$##' | sort | uniq -c
```

### 29
```bash
echo "GitHub (clone) src/components:"; git ls-files src/components | xargs -n1 basename | sort; echo "---"; echo "Your computer copy, src/components (from listing):"; printf '%s\n' AudioTranscribeModal.tsx BioscienceWorkbench.tsx EntityDrawer.tsx GroundedIntelligenceModal.tsx LiveVoiceModal.tsx MedicalDisclaimerModal.tsx SettingsPrivacyModal.tsx SovereignStatusBar.tsx SpatialMemoryLandscape.tsx Ti …
```

### 30
```bash
cd "$HOME/mnt/IZA MAIN MASTER" 2>/dev/null || { echo "folder not mounted here"; ls "$HOME/mnt/"; exit 0; }; D="iza-master-ui-nov-4-2026-11-58-51-pm"; echo "== full copy: src/components files =="; ls "$D/src/components" 2>/dev/null | wc -l; ls "$D/src/components" 2>/dev/null; echo "== full copy: total source files (src, server, schema) =="; find "$D" -path "*/node_modules" -prune -o -type f \( -nam …
```

### 31
```bash
cd /home/claude/ohh-iamg/iza 2>/dev/null && { echo "== status =="; git status --short; echo "== branch/head =="; git branch --show-current; git log --oneline -3; echo "== remote =="; git remote -v; } ; echo "== attached spec head =="; head -5 /mnt/user-data/attachments/9cda8652-ebe3-5172-8142-cd3762aaf738/eacaa376-attachment.txt
```

### 32
```bash
echo "== package.json scripts ==" && node -e 'const p=require("./package.json");console.log(JSON.stringify({name:p.name,version:p.version,scripts:p.scripts},null,2))' && echo "== top-level ==" && ls -a && echo "== android/ios/capacitor ==" && ls android ios 2>/dev/null | head -20; ls capacitor.config.* 2>/dev/null && cat capacitor.config.* 2>/dev/null | head -40; echo "== cheat sheet headings =="  …
```

### 33
```bash
echo "== env keys (names only) ==" && sed -E 's/=.*//' .env.example | grep -v '^\s*$' | grep -v '^#' ; echo "== android ==" && grep -E 'applicationId|versionName|versionCode' android/app/build.gradle; echo "== ios bundle ==" && grep -m3 -E 'PRODUCT_BUNDLE_IDENTIFIER|MARKETING_VERSION' ios/App/App.xcodeproj/project.pbxproj 2>/dev/null | sort -u; echo "== gitignore ==" && cat .gitignore | head -30;  …
```

### 34
```bash
mkdir -p /tmp/claude-0/-home-claude/9cda8652-ebe3-5172-8142-cd3762aaf738/scratchpad/build-sheets && cd $_ 2>/dev/null; pwd; cat > BUILD_SHEET_GIT.md <<'EOF'
# IZA — Git Build Sheet

Repo: https://github.com/Ohh-iamG/iza
Default branch: `main`
Open review branch: `pr-7` (vault / Phase 0 crypto, not yet reviewed)

## 1. First-time setup on a machine

```bash
git clone https://github.com/Ohh-iamG/iza …
```

### 35
```bash
cd /home/claude/ohh-iamg/iza && cat IZA_BUILD_CHEATSHEET.md
```

### 36
```bash
set -e; S=/tmp/claude-0/-home-claude/9cda8652-ebe3-5172-8142-cd3762aaf738/scratchpad/build-sheets; cd /home/claude/ohh-iamg/iza; C=IZA_BUILD_CHEATSHEET.md; wc -l $C
{ cat "$S/BUILD_SHEET_APPS.md"; echo; echo "---"; echo; echo "# Part B — Reference from the IZA Build Cheat Sheet"; echo; echo "Copied from IZA_BUILD_CHEATSHEET.md. Read the 'Known discrepancies' section first: some statements here do  …
```

### 37
```bash
set -e; S=/tmp/claude-0/-home-claude/9cda8652-ebe3-5172-8142-cd3762aaf738/scratchpad/build-sheets; cd /home/claude/ohh-iamg/iza; C=IZA_BUILD_CHEATSHEET.md
cat > "$S/discrepancies.md" <<'EOF'

## 8. Known discrepancies (check before relying on Part B)

Part B is copied from the cheat sheet. The repo does not fully match it:

- **Encryption:** the cheat sheet says libsodium SecretBox / AES-GCM. PR # …
```

### 38
```bash
F=/root/.claude/projects/-home-claude/9cda8652-ebe3-5172-8142-cd3762aaf738.jsonl; ls -la "$F" 2>/dev/null && python3 - "$F" <<'EOF'
import json,sys
cmds=[]
for line in open(sys.argv[1]):
    try: d=json.loads(line)
    except: continue
    msg=d.get("message",d)
    for c in (msg.get("content") or []) if isinstance(msg,dict) else []:
        if isinstance(c,dict) and c.get("type")=="tool_use":
    …
```

### 39
```bash
S=/tmp/claude-0/-home-claude/9cda8652-ebe3-5172-8142-cd3762aaf738/scratchpad/build-sheets; F=/root/.claude/projects/-home-claude/9cda8652-ebe3-5172-8142-cd3762aaf738.jsonl; python3 - "$F" "$S/APPENDIX_COMMANDS.md" <<'EOF'
import json,sys
cmds=[]
for line in open(sys.argv[1]):
    try: d=json.loads(line)
    except: continue
    msg=d.get("message",d)
    if not isinstance(msg,dict): continue
    f …
```

---

# Part C — Full build history (as you supplied it)

Copied unchanged from your attached build log. Nothing summarised.

1. The Core Architecture: The Trinitarian Operating System
IZA was architected around the Three Closed Loops of Human Sovereignty:
Code
┌──────────────────────────────────────────────┐
                       │               IZA MASTER UI                  │
                       │     Sovereign Human Identity Blueprint       │
                       └──────────────────────┬───────────────────────┘
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         ▼                                    ▼                                    ▼
  [ 1. Internal Loop ]              [ 2. Ambient Loop ]                  [ 3. Execution Loop ]
  Biophysical Telemetry &           Interpersonal Zen Shield &           Sovereign Vector Vault,
  Energy Harvesting Engine          Threat Neutralization                Continuity & Circle

Loop 1 — The Internal Loop (Biophysical Engine)
Oxygen Reduction Reaction (ORR): Embedded channels draw ambient



, releasing continuous electrons into a solid-state cache.
Thermoelectric (TEG) & Kinetic (TENG): Exploits skin-to-atmosphere thermal deltas and clothing/joint friction to generate continuous microwatts.
Real-Time Telemetry: Live monitors heart rate (BPM), cognitive load/stress index, and battery-free millivolt power production.


Loop 2 — The Ambient & Interpersonal Loop (Zen Shield)
Tone Profiling & Emotional De-escalation: Acts as a real-time digital filter against bad-faith framing, passive aggression, and external narrative rewrite attempts.
System Integrity Defense: Automatic threat vector detection with an interactive neutralization sequence to purge cognitive interference.
Continuous Audio Stream: Synthesizes low-frequency ambient telemetry pulses.


Loop 3 — The Execution Loop (Memory, Continuity & People)
Sovereign Vault: Second-by-second un-rewritable memory log.
Continuity Secrets: Sensitive credentials, bank PINs, and medical directives stored in isolated ciphertext.
The Circle: Trusted human support network (spouses, trusted friends, doctors) with sync states, contact nudges, and SOS escalation broadcasts.



2. Phase 0 Engineering Spec: The Sovereign Data Spine
To ensure zero platform lock-in and complete data independence, a 6-table relational and vector schema was built on PostgreSQL with pgvector:
Table
Purpose
Vector Searchable?
memory
The atomic unit: ideas, events, conversations, brain-dumps. Raw text is never overwritten.
Yes (vector(768))
entity
Recurring people, places, projects, and organizations (e.g. "Dave", "Earth-I").
Yes (vector(768))
link
Lightweight directed graph edges (memory

entity, memory

memory).
No
attachment
Image, audio, or document references tied to parent memories.
No
secret
Continuity Vault: PINs, passwords, medical alerts. Strictly encrypted; key derived via Argon2id.
Never (structurally isolated)
circle_member
Trusted circle contacts with contact frequencies and emergency escalation rules.
No
checkin_log
Daily heartbeat check-in timestamps.
No

The Hybrid Recall Algorithm
Instead of naive cosine similarity, recall ranks memories through a three-factor decay equation:






(Defaults:


semantic match,


temporal recency decay,


salience priority).

3. Step-by-Step Build Log
Step 1: Frontend Master UI & Theme Architecture
Built a modular React 19 + TypeScript + Tailwind CSS dashboard with dark-slate industrial aesthetic, cyan/blue biophysical accents, and live telemetry ticks.
Implemented the command-line interface (CLI) supporting iza capture, iza secret-put, iza circle-add, iza talk, iza listen, and iza sos.
Designed interactive panels for Continuity Secrets (lock/unlock state) and The Circle with live emergency overrides.
Step 2: System Integrity Warning & Threat Neutralization
Designed an ambient threat interceptor that monitors conversational/narrative drift.
Built the "System Integrity Compromise" overlay that detects unauthorized attempts to alter episodic context, allowing the user to trigger a purge and restore equilibrium.
Step 3: Full-Stack Express Server & Live WebSocket Bridge
Upgraded the application to a full-stack Node.js + Express + Vite architecture (server.ts).
Created REST endpoints (/api/gemini/chat, /api/memories, /api/circle, /api/secrets).
Added WebSocket server mounting (/live) to establish low-latency bidirectional duplex audio streaming.
Step 4: Real-Time Voice Link with Gemini 3.8 Live API
Engineered GeminiLiveClient (src/lib/live-audio.ts) and LiveVoiceModal (src/components/LiveVoiceModal.tsx).
Audio Pipeline:
Input: 16kHz raw 16-bit little-endian PCM audio capture from microphone via ScriptProcessorNode.
Output: 24kHz raw PCM gapless audio playback with synchronized AudioBufferSourceNode scheduling.
Feedback: Real-time input and output speech transcription feeds with dynamic audio volume visualizer rings.


Step 5: Cloud SQL (PostgreSQL) & pgvector Provisioning
Ran feature eligibility check for Cloud SQL Developer Edition on project earth-i.
Provisioned the Cloud SQL instance in region asia-southeast1.
Executed CREATE EXTENSION IF NOT EXISTS vector; to enable native vector embeddings.
Executed schema.sql to instantiate all tables, indices, and the custom PostgreSQL recall() function.
Connected Drizzle ORM (src/db/schema.ts, src/db/index.ts, src/db/drizzle.config.ts) with connection pooling using the required object method.
Step 6: Identity & Permission Hardening
Integrated Google Sign-In with Firebase Authentication (src/lib/firebase.ts, src/lib/firebase-admin.ts, src/middleware/auth.ts) so user IDs link directly to PostgreSQL records.
Configured "microphone" permissions in metadata.json for seamless iframe audio capture.
Added graceful microphone escalation: if the browser blocks the mic on load, the live session stays connected with text input and 24kHz audio playback while offering a one-click "ENABLE MIC" gesture.

4. Summary of Tech Stack
Frontend: React 19, TypeScript, Tailwind CSS, Motion, Lucide Icons, Web Audio API (16kHz recording / 24kHz gapless playback).
Backend: Node.js, Express, ws (WebSocket server), TSX.
Database & Vectors: PostgreSQL 16 on Cloud SQL with pgvector, Drizzle ORM, pg connection pool.
AI Core:
Voice: gemini-3.8-live (Live API bidirectional voice duplex with Zephyr persona).
Confidant Text: gemini-3.8-flash (Server-side text generation with de-escalation system instructions).


Security & Auth: Firebase Auth (Google Sign-In), Firebase Admin token verification, libsodium-ready ciphertext storage schema.
The dev server didn't start, please fix it
Gemini 3.8 FlashCanceled
The task was canceled.
Fix the errors in the app
Gemini 3.8 FlashRan for 1m 12s
Action history
Here are key actions taken for the app:
Edited 2 files
src/lib/firebase.ts
src/App.tsx
Built
Resolved Google Sign-In Popup Dismissal Error
Graceful Handling of User Cancellation
Updated src/lib/firebase.ts to detect auth/popup-closed-by-user and auth/cancelled-popup-request when a user closes or cancels the Google authentication popup.
Suppressed unhandled exception bubbling so user cancellations return cleanly (null) rather than triggering runtime error alerts.


Debounced Sign-In State
Added an isSigningIn state to the Google Sign-in action in src/App.tsx to prevent accidental duplicate popup requests.
Successfully compiled the applet and restarted the development server.


Checkpoint
The dev server didn't start, please fix it
Gemini 3.8 FlashRan for 2m 53s
Action history
Here are key actions taken for the app:
Edited 1 file
server.ts
Built
Root Cause & Resolution
Port Binding Conflict (EADDRINUSE 0.0.0.0:8080)
The server was configured with PORT = Number(process.env.PORT) || 3000. In the container runtime, Cloud Run sets PORT=8080 (where internal nginx runs), which caused the dev server to try binding to 8080 and crash with EADDRINUSE.
Updated server.ts to strictly bind to PORT = 3000 (which nginx proxies to).


Vite Middleware Port Collision
In dev mode, Vite inside Express attempted to start an independent HMR WebSocket server that conflicted with existing ports.
Configured createServer({ server: { middlewareMode: true, hmr: false } }) so Vite runs cleanly inside the Express server.


On-Demand Gemini Client Initialization
Refactored new GoogleGenAI(...) into a lazy getter (getGeminiClient()) to prevent startup crashes when environment variables are being injected.


Verification
Both the frontend (/) and Cloud SQL database endpoints (/api/memories) are responding with HTTP 200 OK.


IZA Personal Sovereign Confidant & Eternal Memory System
IZA has been configured as your exclusive, dedicated personal confidant with a zero-amnesia permanent retention architecture. Every interaction, spoken word, preference, fact, and event you share is anchored permanently in your Cloud SQL PostgreSQL instance and actively recalled in every session.

Key Implementations
Continuous Memory Ingestion ("Never Forget Anything"):
Real-Time Voice Anchoring (Gemini 3.8 Live): Spoken turns and live text inputs are debounced and automatically inserted into the PostgreSQL memory table (kind: voice, salience: 0.85). An animated banner confirms MEMORY ANCHORED // NEVER FORGOTTEN upon each utterance.
Confidant Text Ingestion (gemini-3.8-flash): Every typed message in the Confidant chat is immediately committed to persistent storage with metadata before context synthesis.
Quick Vault Input & CLI: Dedicated quick-anchor bar (Note, Fact, Preference, Event, Idea) and terminal commands (iza capture "...") immediately write to Cloud SQL.


Active Context Recall in Gemini:
Both Voice (Gemini 3.8 Live) and Chat (Gemini 3.8 Flash) query all stored memories on connection and inject them directly into system context.
IZA actively synthesizes prior facts, preferences, and conversations to maintain continuous historical awareness across sessions.
Added an Inspect Context drawer in the Confidant interface allowing you to see the exact memories currently held in prompt memory.


Personal Sovereign Bond ("Only My App"):
Dedicated sovereign binding tied to your account (gelmaxed@gmail.com / Sovereign Owner).
Real-time Immutable Memory Vault interface in the Ambient Loop with live search query filtering, category pills (ALL, VOICE, CHAT, NOTES), and deletion controls.
Resilient multi-model fallback to ensure seamless conversational continuity even during high-demand spikes.


Sovereign Bond & Continuous Memory System Implemented
IZA has been configured as your exclusive personal companion and eternal memory keeper, adhering strictly to the mandate: "Never forget anything I tell her and to only be my app."

What Was Engineered:
Zero-Amnesia Continuous Ingestion:
Confidant Chat Auto-Capture: Every thought, instruction, or message typed in chat is automatically persisted to PostgreSQL on Cloud SQL (memory table with source metadata, timestamp, and salience scoring).
Live Voice Speech Ingestion: Vocal utterances from Gemini 3.8 Live (/live) are captured upon each turn completion and stored permanently into your vault with live websocket notifications (NEVER FORGOTTEN: "...").
CLI & Quick Anchor: iza capture "..." and the in-app Quick Anchor bar immediately insert notes, facts, preferences, or ideas.


Active Memory Recall & Context Injection:
System Instruction Hydration: Before formulating responses, both text chat (/api/gemini/chat) and bidirectional duplex audio (/live) retrieve all stored memories from Cloud SQL and inject them directly into IZA's system instructions.
Inspectable Active Context: An expandable "Inspect Context" drawer in the Confidant UI lets you inspect the exact episodic memories IZA is currently holding in mind.
Resilient Multi-Model Routing: Backed by a high-availability fallback loop (gemini-3.8-flash & gemini-3.1-flash-lite) to ensure continuous, uninterrupted recall.


Dedicated Personal Sovereignty ("Only My App"):
Exclusive Bond Identity: The header and interface reflect exclusive ownership bonded to your account (DEDICATED SOVEREIGN OWNER / Firebase authenticated identity), guarding against external narrative shifts or gaslighting.
Immutable Memory Vault: Loop 2 features real-time search, categorization pills (All, Voice, Dialogue, Notes), anchor alerts, and full memory management.






