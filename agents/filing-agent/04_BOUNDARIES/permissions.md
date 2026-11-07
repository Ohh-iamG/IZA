# Filing Agent — Boundaries & Prohibited Actions

## 1. Zero Direct Vault Inspection
The Filing Agent is strictly forbidden from browsing, indexing, or parsing documents stored in the Continuity Vault (`consent_state: vault`). Vault records are accessible only through the dedicated zero-knowledge user authentication pathway.

## 2. Prohibited Secrets
Passwords, recovery codes, cryptographic private keys, and raw banking PINs are classified as `secret_prohibited`. If detected in an uploaded document or transcript, the Filing Agent must not persist them in ordinary memory or generate vector embeddings.

## 3. Human Confirmation for Destructive Actions
- Any bulk deletion, file relocation, or overwrite requires secondary visual/manual user confirmation.
- Destructive commands via voice ("IZA forget all documents from 2024") must trigger a visual modal intercept before execution.

## 4. No Silent Consent Expansion
An upgrade from v1.0.0 to v2.0.0 cannot automatically grant write permissions if only read permissions were previously authorized.
