Build iza
IZA BUILD DATA THRU GEMINI APP.
You have built IZA v1 (Interpersonal Zen-Enmity Agent) — a local, privacy-first personal memory vault, health & medical tracker, security manager, and emergency contact system.
It is designed to give you complete digital sovereignty: everything runs locally on your machine, your data stays under your control, and no sensitive details or medical records leave your environment without explicit intention.

Key Modules & Components

1. The Core Memory Vault & Recall System

* Immutable Atomic Memories (memory): Raw memories, notes, and entries can be saved verbatim. Original text is locked by database triggers to ensure auditability and integrity.
* Hybrid Vector Search (recall()): Uses PostgreSQL with pgvector (bge-base-en-v1.5 embeddings) combined with a customized formula:
Score=(wsim×Similarity)+(wrecency×Recency Decay)+(wsalience×Salience)\text{Score} = (w_{\text{sim}} \times \text{Similarity}) + (w_{\text{recency}} \times \text{Recency Decay}) + (w_{\text{salience}} \times \text{Salience})Score=(wsim×Similarity)+(wrecency×Recency Decay)+(wsalience×Salience)
* Entities & Links (entity, link): Connects people, places, and concepts to memories without automatic entity merging.

2. Continuity Secrets & Key Management

* Encrypted Secrets (secret): Ciphertext-only storage for sensitive credentials, PINs, and sensitive values (isolated from vector search).
* Shamir's Secret Sharing (key-init, key-recover): Protected by a master passphrase and a 2-of-3 split recovery share scheme.

3. Health & Medical Tracking Layer

* Emergency Medical Card & Prep (health_fact): Keeps plaintext, offline-accessible records of blood group, allergies, conditions, and contacts for fast generation of emergency cards (iza card) and GP summaries (iza visit-prep).
* Medication & Dosing Engine (medication, dose_log): Tracks scheduled medications, log doses (take/skip), and monitors supply countdowns (refill).

4. The Circle (Emergency Contact & Heartbeat Network)

* Check-ins & Automated Escalation (circle_member, rule): Tracks contact with your inner circle, sends regular connection nudges, and handles automated alerts via ntfy, email, or webhooks if check-ins or scheduled doses are missed (iza watch).
* SOS Broadcast (sos): Dispatches immediate alert broadcasts across pre-configured channels to trusted members.

5. Safe Confidant (confidant.py & safety.py)

* Local Conversational AI: Runs with local Ollama models (llama3.1) or optional API backends, pulling grounding context directly from your memory vault.
* Medical Safety Guardrails: Uses strict red-flag screening for emergency symptoms (recommending Emergency Services 000 or Healthdirect) and never auto-adjusts medication dosages.

6. Multi-Interface Access

* Command Line Interface (iza.py): Full control over all features, database maintenance (iza doctor), and data imports/exports (iza export/iza restore).
* Web & Mobile App (web.py): Lightweight web UI tailored for daily mobile use (doses, quick capture, recall, check-ins) over local networks or secure Tailscale tunnels.
