Owner: Gerard

# IZA — Git Build Sheet

Repo: https://github.com/Ohh-iamG/iza
Default branch: `main`
Open review branch: `pr-7` (vault / Phase 0 crypto, not yet reviewed)

## 1. First-time setup on a machine

```bash
git clone https://github.com/Ohh-iamG/iza.git
cd iza
git config user.name "Your Name"
git config user.email "you@example.com"
```

Never commit `.env` files. `.gitignore` already excludes `.env*` except `.env.example`.

## 2. Daily workflow

```bash
git checkout main
git pull origin main
git checkout -b feature/short-description   # new branch for every change
# ...make changes...
git status
git add <specific files>                    # avoid `git add .` so secrets and build output stay out
git commit -m "Short, clear summary of the change"
git push -u origin feature/short-description
```

Then open a pull request into `main` on GitHub. Do not push straight to `main`.

## 3. Before you commit

- `git status` shows only the files you intended to change.
- No `node_modules/`, `dist/`, `build/`, `*.log`, or `.env` files are staged.
- No API keys, passwords, PINs, or tokens in the diff (search for `GEMINI_API_KEY`, `key`, `secret`, `token`).
- `npm run lint` (TypeScript check) passes.
- `npm run build` succeeds.

## 4. Pull requests

- Title: what changed, in one line.
- Body: what changed, why, how it was tested, anything not yet reviewed.
- Security-sensitive code (vault, auth, encryption, `server.ts` routes) needs a separate review before merge.
- Do not merge a PR that says "NOT reviewed" in its own status notes.

## 5. Recovering work

```bash
git reflog                       # shows recent positions of HEAD, even after a reset
git stash                        # park unfinished changes safely
git stash pop                    # bring them back
git checkout -- <file>           # discard local edits to one file (destructive, check first)
```

Do not run `git reset --hard` or `git clean -fd` unless you have confirmed nothing unsaved is in the folder.

## 6. Keeping copies in sync

- GitHub `main` is the reference copy. Local folders (including OneDrive copies) can drift from it.
- Before relying on a local folder as "the live app," compare it with GitHub (`git status`, `git log origin/main -1`).
- OneDrive "files on demand" can show placeholders instead of real files. Make sure a folder is fully downloaded before deleting anything else.

---

# Part B — Project layout (from the IZA Build Cheat Sheet)

## 7. Key Files & Project Layout

```
├── server.ts                    # Full-stack Node/Express server + WebSocket /live bridge
├── index.html                   # HTML entry point with synchronized metadata & title
├── metadata.json                # AI Studio manifest (permissions: ["microphone"], server Gemini)
├── package.json                 # Dependencies (React 19, @google/genai, drizzle-orm, pg, ws)
├── schema.sql                   # Raw PostgreSQL Phase 0 DDL & recall() function
├── src/
│   ├── App.tsx                  # Master UI dashboard (Internal, Ambient, Execution loops)
│   ├── main.tsx                 # React DOM bootstrap
│   ├── db/
│   │   ├── schema.ts            # Drizzle ORM table definitions
│   │   ├── index.ts             # Connection pool & Drizzle client
│   │   ├── users.ts             # Cloud SQL CRUD helper functions
│   │   └── drizzle.config.ts    # Drizzle Kit configuration
│   ├── lib/
│   │   ├── live-audio.ts        # Gemini 3.8 Live API WebSocket client & PCM audio pipeline
│   │   ├── firebase.ts          # Firebase Auth client (Google Sign-In with popup handling)
│   │   └── firebase-admin.ts    # Firebase Admin token verification
│   ├── components/
│   │   └── LiveVoiceModal.tsx   # Duplex voice conversation modal with visualizer orb
│   └── middleware/
│       └── auth.ts              # Bearer token authentication middleware
```

---

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
