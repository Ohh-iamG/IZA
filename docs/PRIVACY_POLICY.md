# IZA LIFE Privacy & Sovereign Data Policy
**Effective Date:** 6 November 2026  
**Last Updated:** 6 November 2026  
**Jurisdiction:** Western Australia  

Welcome to IZA LIFE. We believe that your personal life should remain entirely personal. This application is designed to help you capture, reflect on, and recall your episodic memories, thoughts, and daily routines without compromising your digital sovereignty.

---

### 1. Core Architecture & Our "Private by Design" Promise
Unlike traditional applications that actively track user identities or sell behavioral metrics, IZA LIFE is built around absolute user agency. 
* **User-Initiated Processing Only:** IZA LIFE does not deploy unsolicited background tracking, continuous location mapping, or covert ambient listening. The ecosystem only processes multimedia inputs (audio transcripts, screenshots, or files) when you explicitly tap a capture control button.
* **No Marketing or Analytics Tracking:** We maintain a strict zero third-party telemetry standard. This application contains zero advertising SDKs, tracking pixels, or third-party analytic brokers.

---

### 2. Information Ingestion & Storage Mechanics
When you deliberately capture elements into your life, the data is stratified across distinct secure layers:
* **Episodic Memories & Vector Space:** Text notes, structural descriptions, and voice transcripts are transmitted securely via encrypted HTTPS/WebSockets to our cloud database. For fast semantic search, mathematical representations (768-dimension vector embeddings) are used. These records are strictly isolated on a per-user basis using database Row-Level Security (RLS). Your data can never leak to or be viewed by other accounts.
* **The Continuity Vault:** Highly sensitive text notes, gate codes, or private credentials are side-encrypted directly on your client device using AES-256-GCM. The encryption keys are derived entirely on your device using a locally held passphrase via key-stretching functions (PBKDF2/Argon2id). Plaintext data from your Vault is never sent to cloud servers, never indexed in vector space, and can never be decrypted by IZA LIFE infrastructure.
* **On-Demand AI Voice Processing:** Spoken entries via the "Talk" function or hands-free voice sessions utilize Google Cloud APIs (including the Gemini Live API) for real-time model interaction and memory synthesis. All processing is governed under Google Generative AI Additional Terms of Service. Your private inputs are fully isolated and are never used to train global public foundation models.

---

### 3. Absolute Data Erasure & Compliance (WA Surveillance Devices Act 1998)
In strict compliance with Western Australia privacy standards and surveillance boundaries:
* **Visual Confirmation Steps:** To protect you from accidental data loss through misread voice commands, any administrative instruction that alters or purges your records (e.g., "iza forget") strictly requires a secondary manual confirmation step before executing.
* **Sovereign Deletion Cascades:** When you choose to purge a moment or delete your account, our system initiates an irreversible cascading purge. This completely deletes all associated text files, graph entity edges, vector embeddings, and binary assets from both cloud databases and local browser caches (IndexedDB).
* **Identity Control:** You retain the explicit right to wipe your entire profile and data history instantly from the application settings menu at any time.

---

### 4. Consumer Boundaries Under Australian Consumer Law (ACL)
* **Non-Diagnostic Tooling Status:** IZA LIFE is exclusively an automated self-reflection, personal memory care, and wellness journaling companion. It is not a licensed medical provider, clinical health tracker, or emergency crisis communication channel.
* **No Safety Monitoring Liability:** The application does not monitor your physical location, health baselines, or real-time personal safety. Missed user routines do not trigger automated emergency welfare alerts or dispatch actions.

---

### 5. Contact & Privacy Infrastructure
For technical inquiries regarding cryptographic keys, localized encryption standards, or complete account purges, reach out directly to our sovereign compliance node:

**Email Contact:** privacy@izalife.app  
**Ecosystem URL:** https://izalife.app
