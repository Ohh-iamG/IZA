# IZA LIFE — Store Submission & Reviewer Verification Matrix

Version: 1.0.0  
Owner: IZA LIFE (EARTH-I ABN 15 698 220 692)  
Effective Date: 6 November 2026  

---

## 🏛️ Part 1: Mandatory Legal Checks & Live Endpoints

Both of these endpoints are deployed and publicly served directly without authentication:

1. **Privacy Policy Page**:
   - Live URL: `https://izalife.app/privacy` or `https://izalife.app/privacy.html`
   - File location: `public/privacy.html`
   - Covers: Zero 3P telemetry, Western Australia Surveillance Devices Act 1998, Client-side Argon2id/AES-256-GCM zero-knowledge boundaries, Google Cloud Gemini on-demand processing.

2. **Terms of Service & Disclaimers Page**:
   - Live URL: `https://izalife.app/terms` or `https://izalife.app/terms.html`
   - File location: `public/terms.html`
   - Covers: Australian Consumer Law (ACL), Statutory Medical Disclaimer (Non-Diagnostic), No Proactive Welfare Monitoring Liability.

---

## 🍎 Part 2: Apple App Store Connect Submission Workflow

### 1. App Information
- **App Name**: `IZA LIFE`
- **Subtitle**: `Your life, remembered.`
- **Privacy Policy URL**: `https://izalife.app/privacy`
- **Primary Category**: `Lifestyle`
- **Secondary Category**: `Productivity`
- *Warning*: Do NOT select *Medical* or *Health & Fitness* to avoid unnecessary medical regulatory review delays.

### 2. App Privacy Profile (Data Nutrition Labels)
- **Do you collect data from this app?**: `Yes`
- **Data Types Declared**:
  - `User ID`: Linked to User (used strictly for account identification and data isolation).
  - `Audio Data`: Linked to User (voice notes via the on-demand "Talk" function).
  - `Photos or Videos`: Linked to User (manual user-initiated "See" / visual memory attachments).
- **Tracking**:
  - Select `No, we do not use any data from this app for tracking purposes`.
  - Zero advertising identifiers (IDFA), third-party analytic brokers, or marketing trackers.

### 3. Background Audio Declaration (UIBackgroundModes)
Because the app enables hands-free voice turns (`UIBackgroundModes: ["audio"]`), Apple opens a mandatory justification field.

**Copy-paste this exact text into the Background Modes justification box:**
> "IZA LIFE features an on-demand, user-initiated hands-free journaling tool ('Talk' function). The background audio capability is strictly utilized to allow a user to finish recording their personal verbal thoughts seamlessly if their device screen locks or goes dark mid-session. The input stream is entirely controlled by the user and shuts down immediately when the session ends. No covert or background ambient collection occurs."

### 4. App Review Information (Reviewer Credentials)
- **Sign-in Required**: Check `Yes`
- **Username / Email**: `review-tester@izalife.app`
- **Password**: `ReviewValid2026!`
- **Vault Passphrase**: `SovereignRecall2026`
- **Notes Field**: Paste the full block from `docs/APP_STORE_REVIEWER_NOTES.txt`.

---

## 🤖 Part 3: Google Play Console Submission Workflow (Android)

### 1. App Content & Data Safety Declarations
- **Data Safety Form**:
  - Encrypted in Transit: `Yes` (HTTPS/WSS TLS 1.3).
  - Data Deletion Mechanism: `Yes` (In-app one-click account purge cascade in ME → Settings & Privacy).
  - Data Collected: User ID, Voice/Audio recordings, Photos/Documents (all user-initiated).
  - Data Sharing: `No` (Data is never shared with third parties or external data brokers).
- **Financial / Health Feature Declaration**:
  - Toggle `No, this app does not provide any health or financial features`.

### 2. Sensitive Permissions (RECORD_AUDIO)
- When prompted if IZA LIFE is a default assistant or continuous background listening tool:
  - Select `No`.
  - Justification: `Microphone access is requested strictly for a Foreground Service Session initiated directly by the user tapping the 'Talk' button or hands-free toggle. The audio session terminates immediately when the turn concludes.`

### 3. Closed Internal Testing Track
- Release the initial build to the **Internal Testing** track first.
- Add tester accounts and provide reviewer credentials under **App Access** (`review-tester@izalife.app`).
