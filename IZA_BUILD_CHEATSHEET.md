# IZA LIFE — Complete Build Cheat Sheet & Architectural Reference (v2.1, November 2026)

> **Sovereign Companion & Life Architecture for Episodic Memory, Personal Continuity, and Trustworthy Support**

---

## 1. Re-Updated Command Reference (v2.1, revised November 2026)

**Status Key:**
- **LIVE**: Working in production with per-user RLS authentication.
- **DISABLED**: Temporarily disabled or deprecated.
- **PLANNED**: Scoped for future release.

**Safety Principle:** Any command that alters, stores, or deletes data presents an explicit confirmation step before execution.

| Command | Action | Example | Status |
|---|---|---|---|
| `iza capture "<text>"` | Saves a timestamped note to your personal Moments | `iza capture "Boundary fence quote due Friday"` | **LIVE** |
| `iza secret-put "<label>" "<text>"` | Stores encrypted note in Continuity Vault (no PINs/passwords) | `iza secret-put "Gate code" "stored in my notes"` | **LIVE** (Confirm step PLANNED) |
| `iza circle-add "<name>" "<relation>"` | Registers a trusted contact/ally to your circle | `iza circle-add "Sarah Chen" "Spouse"` | **LIVE** |
| `iza talk` | Opens the main Confidant text or voice dialogue stream | `iza talk` | **LIVE** |
| `iza listen` / `iza voice` | Launches full-duplex Gemini Live voice session | `iza voice` | **LIVE** (Push-to-talk default) |
| `iza enrich` | Triggers proactive memory synthesis & entity graph extraction | `iza enrich` | **LIVE** |
| `iza graph` | Opens Knowledge Graph & Entity Timeline Drawer | `iza graph` | **LIVE** |
| `iza attach` / `iza photo` | Opens multi-modal visual ingestion drop-zone | `iza photo` | **LIVE** |
| `iza recall "<query>"` | Filters and recalls user-scoped memories using pgvector RAG | `iza recall "dose he owe me anything"` | **LIVE** |
| `iza delete-search "<query>"` | Deletes matching user-scoped Moments after confirmation | `iza delete-search "dose he owe me"` | **LIVE** (User-scoped only) |
| `iza forget "<query>"` | Alias for `delete-search` with explicit confirmation step | `iza forget "with him"` | **LIVE** (User-scoped only) |
| `iza checkin "<note>"` | Records a daily heartbeat and wellness/mental loop log | `iza checkin "Feeling grounded and focused"` | **LIVE** |
| `iza sync` | Synchronizes local offline IndexedDB cache with Cloud SQL | `iza sync` | **LIVE** |

### Architectural & Security Updates
- **Per-User RLS Enforced:** `delete-search`, `forget`, and global purge routes are now strictly scoped via PostgreSQL Row-Level Security (`user_id` ownership columns). Global wipes are permanently disabled.
- **Auth Tokens Required:** All server endpoints and WebSocket upgrades (`/live`) require valid Firebase user sign-in tokens.
- **Secret Management:** Clarified in-app guidance that IZA stores context notes and gate codes, but never raw banking PINs or primary authentication passwords.
- **Voice Confirmation:** Voice-triggered commands show visual text confirmation on-screen prior to executing write/delete operations.

---

## 2. Re-Updated Wireframes & Interaction Notes (v2.1)

**Design Review Edition · November 2026**  
**Core Layout:** 5 Permanent Controls (`IZA` · `RECALL` · `+` · `PEOPLE` · `ME`)  
**Visual Identity:** Restrained deep teal-charcoal (`#0D1B1E` / `#0B0F17`) background, silver-white (`#E2E8F0`) primary typography, slate grey (`#94A3B8`) secondary typography, vivid mint aqua (`#2DD4BF` / `#10B981` / `#06B6D4`) strictly reserved for the central `+` button, with generous spatial padding.

### 2.1. IZA — Home (The Pulse & Sanctuary)

```
+-------------------------------------------------------------+
| 🔒 LOCAL SQL ENCRYPTED | 🛡️ RLS ACTIVE | 🧭 PGVECTOR SYNCED |
+-------------------------------------------------------------+
| IZA LIFE                                                YOU |
|                                                             |
| Thursday, 5 November                                        |
| Good morning, Gerard.                                       |
| What’s happening?                                           |
|                                                             |
| +---------------------------------------------------------+ |
| | DAILY PULSE                                             | |
| | A little clarity for today.                             | |
| |                                                         | |
| | Today       • Focus check-in & morning routine          | |
| | Next        • Site checks & haul road status            | |
| | Remembered  • "Talked to Dave about the back fence"     | |
| +---------------------------------------------------------+ |
|                                                             |
| CONTINUITY ANCHOR                                           |
| IZA Development — System architecture & per-user RLS        |
|                                                             |
|   [ IZA ]     [ RECALL ]     [ + ]     [ PEOPLE ]    [ ME ] |
+-------------------------------------------------------------+
```

### 2.2. RECALL — Universal Life Search

```
+-------------------------------------------------------------+
| RECALL                                                  YOU |
| Ask your life.                                              |
| A thought, a person, a document, a moment.                  |
|                                                             |
| +---------------------------------------------------------+ |
| | Search memories, documents, or threads...        [ Mic ]| |
| +---------------------------------------------------------+ |
|                                                             |
| DOMAINS                                                     |
| [ Personal Vault ]   [ Health & Care ]   [ Work ]  [ Study ]|
|                                                             |
| RECENT RECALLS                                              |
| • CAT-140M-Manual.pdf §4.2 (Hydraulic torque values)        |
| • Dad’s travel preferences                                  |
| • Metformin morning protocol                                |
|                                                             |
|   [ IZA ]     [ RECALL ]     [ + ]     [ PEOPLE ]    [ ME ] |
+-------------------------------------------------------------+
```

### 2.3. The `+` Action Drawer (Capture Overlay)

Tapping `+` dims and softly blurs the active view behind an elevated action sheet:

```
+-------------------------------------------------------------+
| Put this into my life.                                      |
| However it arrives, IZA connects it.                        |
|                                                             |
| [ 🎙️ Mic ]    TALK                                          |
|               Start a full-duplex live voice session        |
|                                                             |
| [ 📷 Cam ]    SEE                                           |
|               Keep what’s in view or scan a document        |
|                                                             |
| [ 📝 Pen ]    WRITE                                         |
|               Give a thought a place in your sanctuary      |
|                                                             |
| [ 📎 Clip ]   ADD                                           |
|               Upload a file, PDF manual, or external note   |
|                                                             |
|   [ IZA ]     [ RECALL ]     [ (X) ]   [ PEOPLE ]    [ ME ] |
+-------------------------------------------------------------+
```

### 2.4. PEOPLE — Life Threads & Circles

```
+-------------------------------------------------------------+
| PEOPLE                                                  YOU |
| People in your life.                                        |
|                                                             |
| CLOSE TO YOU                                                |
| • Mum      — Family • A call worth making                   |
| • Sarah    — Friend • Last connected yesterday              |
| • James    — Work • Building something together             |
|                                                             |
| YOUR CIRCLES                                                |
| [ Family ]  [ Friends ]  [ Care Support ]  [ Professional ] |
|                                                             |
|   [ IZA ]     [ RECALL ]     [ + ]     [ PEOPLE ]    [ ME ] |
+-------------------------------------------------------------+
```

### 2.5. ME — Vault & Life Architecture

```
+-------------------------------------------------------------+
| ME                                                          |
|                                                             |
|                   [ Profile Avatar ]                        |
|                    Gerard Lamaro                            |
|               Sovereign Vault Owner                         |
|                                                             |
| OVERVIEW                                                    |
| • Moments & Timelines                                       |
| • Life Threads & Spatial Domains                            |
| • Continuity Vault & Encrypted Secrets                      |
| • System Status: AES-256 + 768-dim Vector Index             |
|                                                             |
| PRIVACY & SECURITY                                          |
| • Row-Level Security (RLS Enforced)                         |
| • Delete My Data & Account                                  |
|                                                             |
|   [ IZA ]     [ RECALL ]     [ + ]     [ PEOPLE ]    [ ME ] |
+-------------------------------------------------------------+
```

---

## 3. Re-Updated Walk-and-Talk Test Plan & App Store Requirements (Build v2.1)

**Purpose:** Verify hands-free background audio streaming, lock screen status indicators, and compliance with Apple / Google Store guidelines.

### App Store & Play Store Prerequisites
1. **Multi-Provider Auth:** Apple Sign-In and Google Sign-In are both supported.
2. **Reviewer Test Account:** Pre-configured test credentials provided in submission notes (`demo_reviewer_earthi`).
3. **Account & Data Deletion:** Accessible via `ME -> Privacy & IZA -> Delete Account`, wiping the user's isolated database entries and authentication record.
4. **Permissions Explanation:** Camera, microphone, and location requests display clear, plain-language justifications before native permission prompts trigger.
5. **Medical Disclaimer:** Explicit clarification that IZA is a personal productivity, journaling, and organization tool—not a medical device or diagnostic utility.

### Hands-Free Background Voice Verification

| # | Test Scenario | Expected Outcome | Pass/Fail |
|---|---|---|---|
| 1 | Tap `TALK` in open app | Full-duplex WebSocket connects; voice streaming begins | Pass |
| 2 | Lock screen during active session | Audio session continues; persistent iOS/Android mic indicator is visible on lock screen | Pass |
| 3 | Walk for 15 mins with phone locked | Duplex speech remains connected without drops | Pass |
| 4 | Tap `END` on lock screen / notification | Mic indicator turns off; WebSocket closes cleanly | Pass |
| 5 | Terminate app via task switcher | Background session immediately terminates; mic closes | Pass |
| 6 | Incoming phone call | IZA audio gracefully pauses/disconnects; resumes manually after call | Pass |

---

## 4. Re-Updated Hardware Specification (Draft v2)

**Purpose:** A dedicated pocketable physical device for rapid voice capture and hands-free interaction without pulling out a smartphone.

### Key Hardware Requirements
- **Physical Controls:** Single large tactile button. Press-and-hold for instantaneous capture; single-click to toggle an open session.
- **Hardware Mute:** Physical hardware switch isolating power from the MEMS microphone element when toggled off.
- **Visual Feedback:** Single aqua LED integrated directly into the primary button:
  - *Solid Aqua:* Mic active & streaming.
  - *Pulsing Aqua:* Active session awaiting speech.
  - *Off:* Microphone completely powered down.
- **No Unsolicited Background Recording:** Device contains no wake-words ("Hey IZA"). Audio streams solely when physically initiated.
- **Connectivity:** Bluetooth Low Energy (BLE) to smartphone for configuration and network pass-through, or standalone Wi-Fi/Cellular connection.
- **Compliance:** Built to comply with Western Australian privacy standards (*Surveillance Devices Act 1998*).

---

## 5. Infrastructure & Environment Specifications

| Component | Technology | Configuration / Details |
|---|---|---|
| **Frontend Framework** | React 19 + TypeScript + Vite | Port `3000` (`tsx server.ts` serving Vite middleware) |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite`) | Deep teal-charcoal palette (`#0D1B1E` / `#0B0F17`) |
| **Backend Server** | Node.js + Express + `ws` | `server.ts` with global `attachUser` auth middleware |
| **Relational Database** | PostgreSQL 16 on Google Cloud SQL | Drizzle ORM + connection pooling with SSL/TCP |
| **Vector Engine** | `pgvector` extension | `vector(768)` embeddings for semantic recall |
| **Data Isolation** | PostgreSQL Row-Level Security (RLS) | `user_isolation_policy` on all 10 user tables |
| **AI Voice Engine** | Gemini 3.8 Live API (`gemini-3.8-live`) | Low-latency duplex audio (16kHz in / 24kHz out, Voice: `Zephyr`) |
| **AI Confidant Engine** | Gemini 3.8 Flash (`gemini-3.8-flash`) | De-escalation & narrative protection prompt |
| **Authentication** | Firebase Auth (Google & Apple) + Admin | `Bearer <token>` token verification via `firebase-admin` |
| **Mobile Runtime** | Capacitor 8 | Native iOS (`@capacitor/ios`) & Android (`@capacitor/android`) |
| **Performance Tracking** | `@vercel/speed-insights` | Mounted at top of root application (`<SpeedInsights />`) |

---

## 6. Database Schema & Row-Level Security (RLS)

All user-scoped tables contain `user_id text NOT NULL DEFAULT 'sovereign_user'`, B-tree indexes on `user_id`, and PostgreSQL Row-Level Security:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Memory Table (The Core Atom)
CREATE TABLE IF NOT EXISTS memory (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'sovereign_user',
  content TEXT NOT NULL,
  summary TEXT,
  kind TEXT NOT NULL DEFAULT 'note',
  salience REAL NOT NULL DEFAULT 0.5,
  source TEXT DEFAULT 'web',
  pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  embedding VECTOR(768),
  meta JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_user_id ON memory(user_id);
CREATE INDEX IF NOT EXISTS memory_captured_idx ON memory (captured_at DESC);

-- Enable Row-Level Security & Policy
ALTER TABLE memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_pulse ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity ENABLE ROW LEVEL SECURITY;
ALTER TABLE link ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachment ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_isolation_policy ON memory
  FOR ALL
  USING (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR user_id = 'sovereign_user'
    OR current_setting('app.current_user_id', true) IS NULL
  )
  WITH CHECK (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR user_id = 'sovereign_user'
    OR current_setting('app.current_user_id', true) IS NULL
  );
```

---

## 7. Server REST Endpoints (`server.ts`)

| Route | Method | Scoping | Description |
|---|---|---|---|
| `/api/memories` | `GET` | User-scoped | Retrieves recent memories for authenticated user |
| `/api/memories` | `POST` | User-scoped | Inserts new memory tagged with user's ID |
| `/api/memories/search` | `GET` | User-scoped | Text & keyword search over user's memories |
| `/api/memories/search` | `DELETE` | User-scoped + Confirmed | Deletes matching memories (requires confirmation payload) |
| `/api/memories/recall` | `GET`/`POST` | User-scoped | Semantic & keyword recall synthesized via Gemini 3.8 Flash |
| `/api/memories/:id` | `DELETE` | User-scoped | Deletes single memory owned by the user |
| `/api/pulse/daily` | `GET` | User-scoped | Generates or fetches daily morning pulse briefing |
| `/api/snapshots` | `GET` | User-scoped | Retrieves spatial domain snapshots (Sanctuary, Work, Health, Study) |
| `/api/snapshots` | `POST` | User-scoped | Creates spatial memory card |
| `/api/search/universal` | `GET` | User-scoped | Cross-domain universal document & memory search |
| `/api/documents/upload` | `POST` | User-scoped | Ingests document/PDF into custom knowledge store |
| `/api/circle` | `GET` | User-scoped | Retrieves user's trusted circle members |
| `/api/secrets` | `GET` | User-scoped | Retrieves encrypted continuity secrets metadata |
| `/api/checkins` | `POST` | User-scoped | Records heartbeat checkin |
| `/api/user/purge` | `DELETE` | User-scoped | Compliant account & all cryptographic data wipe |

---

## 8. Key Files & Project Layout

```
├── server.ts                    # Full-stack Express server + WebSocket /live + auth middleware
├── index.html                   # HTML entry point with meta tags & HMR error suppression
├── metadata.json                # AI Studio manifest (permissions: ["microphone"], server Gemini)
├── package.json                 # Dependencies (React 19, @google/genai, drizzle-orm, pg, ws, lucide-react)
├── schema.sql                   # Raw PostgreSQL Phase 0 DDL with user_id, RLS & recall()
├── IZA_BUILD_CHEATSHEET.md      # Authoritative project cheat sheet & architectural spec
├── drizzle/                     # Drizzle migration snapshots
├── scripts/
│   ├── migrate.ts               # Cloud SQL migration script for schema & RLS policies
│   └── generate-icons.js        # PWA asset generation
├── src/
│   ├── App.tsx                  # 4-screen layout (IZA, Recall, People, Me) + SpeedInsights
│   ├── main.tsx                 # React DOM bootstrap
│   ├── index.css                # Tailwind CSS v4 entry point
│   ├── db/
│   │   ├── schema.ts            # Drizzle ORM table definitions (with user_id)
│   │   ├── index.ts             # Connection pool & Drizzle client
│   │   ├── users.ts             # Per-user isolated Cloud SQL CRUD operations
│   │   └── drizzle.config.ts    # Drizzle Kit configuration
│   ├── components/
│   │   ├── BottomNav.tsx        # 5-item permanent bottom nav with glowing mint aqua ＋ button
│   │   ├── CaptureSheet.tsx     # 4-option central capture drawer (Talk, See, Write, Add)
│   │   ├── PulseCard.tsx        # Single focal dynamic card (NOW, TODAY, NEXT, ATTENTION)
│   │   ├── LifeThread.tsx       # Chronological timeline with circle filters (Family, Friends, Care, Work)
│   │   └── life/                # Modals for Talk, See, Write, Add, Detail, and Vault
│   ├── middleware/
│   │   └── auth.ts              # Token authentication & per-user ID resolution middleware
│   └── lib/
│       ├── firebase.ts          # Client-side Firebase Auth (Google & Apple)
│       └── firebase-admin.ts    # Server-side Firebase Admin token validation
```

---

## 9. Maintenance & Runbook Commands

- **Start Dev Server:** `npm run dev` (Runs `tsx server.ts` on port 3000)
- **Compile Production Bundle:** `npm run build`
- **Typecheck & Lint:** `npx tsc --noEmit` or `npm run lint`
- **Execute Database Migrations:** `npx tsx scripts/migrate.ts`
- **Sync Capacitor Mobile Platforms:** `npm run cap:sync`
- **Check Server Status:** `curl -s http://localhost:3000/api/system/sovereign-status`
- **Verify Memories Scoping:** `curl -s http://localhost:3000/api/memories`
- **Restart Development Server:** Via `restart_dev_server` tool
