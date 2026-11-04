// IZA Continuity Vault: client-side zero-knowledge encryption.
// Master key is random. It is wrapped twice: once by a passphrase (Argon2id) and
// once per recovery code (HKDF; codes are 128-bit random, so no slow KDF needed).
// The server stores only the Vault record. It never sees the passphrase, codes or master key.
// Status: NOT reviewed. Do not store real secrets until a security review is done.

import { argon2id } from '@noble/hashes/argon2';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from '@noble/ciphers/webcrypto';

export const VAULT_VERSION = 1;
const KEY_LEN = 32;
const NONCE_LEN = 24;
const ARGON2_PARAMS = { t: 3, m: 65536, p: 1, dkLen: KEY_LEN } as const;
const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_BYTES = 16;
const enc = new TextEncoder();
const dec = new TextDecoder();

export interface WrappedKey {
  salt: Uint8Array; // per-wrap salt (recovery codes); unused for passphrase, which uses kdfSalt
  nonce: Uint8Array;
  ciphertext: Uint8Array;
}

export interface SecretEntry {
  label: string; // plain label so the owner can find the entry; the label is bound to the ciphertext as AAD
  nonce: Uint8Array;
  ciphertext: Uint8Array;
}

export interface VaultRecord {
  version: number;
  kdfSalt: Uint8Array;
  passphraseWrap: WrappedKey;
  recoveryWraps: Array<{ id: string; wrap: WrappedKey }>; // one per unused recovery code
  secrets: SecretEntry[];
}

export interface NewVault {
  vault: VaultRecord;
  recoveryCodes: string[]; // shown once; the caller must store them offline
  masterKey: Uint8Array;   // caller should wipe() when done
}

function wipe(b: Uint8Array): void {
  b.fill(0);
}

function deriveFromPassphrase(passphrase: string, salt: Uint8Array): Uint8Array {
  return argon2id(enc.encode(passphrase), salt, ARGON2_PARAMS);
}

function encodeCode(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return hex.match(/.{1,4}/g)!.join('-'); // 8 groups of 4 hex chars
}

function decodeCode(code: string): Uint8Array {
  const hex = code.replace(/[\s-]/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) throw new Error('Invalid recovery code');
  return Uint8Array.from(hex.match(/../g)!, (h) => parseInt(h, 16));
}

function kekFromCode(codeBytes: Uint8Array, salt: Uint8Array): Uint8Array {
  return hkdf(sha256, codeBytes, salt, enc.encode('iza-vault-recovery-v1'), KEY_LEN);
}

function wrapKey(kek: Uint8Array, masterKey: Uint8Array, salt: Uint8Array): WrappedKey {
  const nonce = randomBytes(NONCE_LEN);
  const ciphertext = xchacha20poly1305(kek, nonce).encrypt(masterKey);
  return { salt, nonce, ciphertext };
}

function unwrapKey(kek: Uint8Array, wrap: WrappedKey): Uint8Array {
  return xchacha20poly1305(kek, wrap.nonce).decrypt(wrap.ciphertext);
}

function unlockError(): Error {
  // Same message for every failure so the caller cannot tell a wrong passphrase from a wrong code.
  return new Error('Vault could not be unlocked');
}

/** Create a new vault. Returns the record, the one-time recovery codes and the master key. */
export function createVault(passphrase: string): NewVault {
  if (passphrase.length < 12) throw new Error('Passphrase must be at least 12 characters');
  const masterKey = randomBytes(KEY_LEN);
  const kdfSalt = randomBytes(16);
  const pKek = deriveFromPassphrase(passphrase, kdfSalt);
  const passphraseWrap = wrapKey(pKek, masterKey, kdfSalt);
  wipe(pKek);

  const recoveryCodes: string[] = [];
  const recoveryWraps: VaultRecord['recoveryWraps'] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const codeBytes = randomBytes(RECOVERY_CODE_BYTES);
    const salt = randomBytes(16);
    const kek = kekFromCode(codeBytes, salt);
    recoveryWraps.push({ id: `rc-${i + 1}`, wrap: wrapKey(kek, masterKey, salt) });
    recoveryCodes.push(encodeCode(codeBytes));
    wipe(codeBytes);
    wipe(kek);
  }

  return {
    vault: { version: VAULT_VERSION, kdfSalt, passphraseWrap, recoveryWraps, secrets: [] },
    recoveryCodes,
    masterKey,
  };
}

/** Unlock with the passphrase. Returns the master key (caller wipes it). */
export function unlockWithPassphrase(vault: VaultRecord, passphrase: string): Uint8Array {
  const kek = deriveFromPassphrase(passphrase, vault.kdfSalt);
  try {
    return unwrapKey(kek, vault.passphraseWrap);
  } catch {
    throw unlockError();
  } finally {
    wipe(kek);
  }
}

/** Unlock with a recovery code. Returns the master key. The caller must remove the used code from the record. */
export function unlockWithRecoveryCode(vault: VaultRecord, code: string): { masterKey: Uint8Array; usedId: string } {
  let codeBytes: Uint8Array;
  try {
    codeBytes = decodeCode(code);
  } catch {
    throw unlockError();
  }
  try {
    for (const { id, wrap } of vault.recoveryWraps) {
      const kek = kekFromCode(codeBytes, wrap.salt);
      try {
        return { masterKey: unwrapKey(kek, wrap), usedId: id };
      } catch {
        // not this wrap; try the next one
      } finally {
        wipe(kek);
      }
    }
    throw unlockError();
  } finally {
    wipe(codeBytes);
  }
}

/** Set a new passphrase. Needs the master key from an unlock. Recovery codes stay valid. */
export function changePassphrase(vault: VaultRecord, masterKey: Uint8Array, newPassphrase: string): VaultRecord {
  if (newPassphrase.length < 12) throw new Error('Passphrase must be at least 12 characters');
  const kdfSalt = randomBytes(16);
  const kek = deriveFromPassphrase(newPassphrase, kdfSalt);
  const passphraseWrap = wrapKey(kek, masterKey, kdfSalt);
  wipe(kek);
  return { ...vault, kdfSalt, passphraseWrap };
}

/** Remove a recovery code after it has been used. */
export function consumeRecoveryCode(vault: VaultRecord, usedId: string): VaultRecord {
  return { ...vault, recoveryWraps: vault.recoveryWraps.filter((r) => r.id !== usedId) };
}

/** Add or replace an encrypted secret. The label is authenticated, so entries cannot be swapped. */
export function putSecret(vault: VaultRecord, masterKey: Uint8Array, label: string, value: string): VaultRecord {
  if (!label.trim()) throw new Error('Label is required');
  const nonce = randomBytes(NONCE_LEN);
  const ciphertext = xchacha20poly1305(masterKey, nonce, enc.encode(label)).encrypt(enc.encode(value));
  const secrets = vault.secrets.filter((s) => s.label !== label);
  secrets.push({ label, nonce, ciphertext });
  return { ...vault, secrets };
}

export function getSecret(vault: VaultRecord, masterKey: Uint8Array, label: string): string | null {
  const entry = vault.secrets.find((s) => s.label === label);
  if (!entry) return null;
  try {
    const plain = xchacha20poly1305(masterKey, entry.nonce, enc.encode(label)).decrypt(entry.ciphertext);
    return dec.decode(plain);
  } catch {
    throw new Error('Secret could not be decrypted');
  }
}

export function listSecretLabels(vault: VaultRecord): string[] {
  return vault.secrets.map((s) => s.label);
}

export { wipe };
