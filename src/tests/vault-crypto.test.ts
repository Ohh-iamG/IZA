import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveVaultKey,
  encryptVaultSecret,
  decryptVaultSecret,
  validateSecretPolicy,
  isVectorStoreIsolated,
  exportVaultEnvelope,
  importVaultEnvelope,
  VaultSecretRecord
} from '../lib/vault-crypto.ts';

describe('Feature: vault-crypto-spec (11 Unit Tests)', () => {
  const PASSPHRASE = 'sovereign-vault-master-passphrase-2026';
  const SAMPLE_SECRET = 'Side gate combination: 4821; key under stone slab';

  // Test 1: Key Derivation - Deterministic 256-bit key
  it('1. deriveVaultKey derives a deterministic 256-bit (32-byte) key from passphrase and salt', () => {
    const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const key1 = deriveVaultKey(PASSPHRASE, salt);
    const key2 = deriveVaultKey(PASSPHRASE, salt);

    assert.equal(key1.length, 32, 'Derived key must be exactly 32 bytes (256 bits)');
    assert.deepEqual(key1, key2, 'Key derivation must be deterministic for the same inputs');
  });

  // Test 2: Salt Uniqueness
  it('2. deriveVaultKey produces different keys for distinct salts with identical passphrase', () => {
    const salt1 = '11112222333344445555666677778888';
    const salt2 = '9999aaaabbbbccccddddeeeeffff0000';
    const key1 = deriveVaultKey(PASSPHRASE, salt1);
    const key2 = deriveVaultKey(PASSPHRASE, salt2);

    assert.notDeepEqual(key1, key2, 'Distinct salts must produce distinct derived keys');
  });

  // Test 3: Encryption Payload Structure
  it('3. encryptVaultSecret outputs valid AES-256-GCM ciphertext, 12-byte nonce, and 16-byte salt', () => {
    const encrypted = encryptVaultSecret(SAMPLE_SECRET, PASSPHRASE);

    assert.equal(encrypted.algorithm, 'AES-256-GCM');
    assert.equal(encrypted.version, '2.1');
    assert.equal(Buffer.from(encrypted.nonce, 'hex').length, 12, 'Nonce must be 12 bytes (96 bits)');
    assert.equal(Buffer.from(encrypted.salt, 'hex').length, 16, 'Salt must be 16 bytes (128 bits)');
    assert.ok(encrypted.ciphertext.length > 32, 'Ciphertext must contain encrypted payload and 16-byte auth tag');
  });

  // Test 4: Semantic Security & Nonce Freshness
  it('4. encryptVaultSecret produces unique ciphertexts and nonces on successive runs', () => {
    const run1 = encryptVaultSecret(SAMPLE_SECRET, PASSPHRASE);
    const run2 = encryptVaultSecret(SAMPLE_SECRET, PASSPHRASE);

    assert.notEqual(run1.nonce, run2.nonce, 'Each encryption must use a fresh, unique nonce');
    assert.notEqual(run1.ciphertext, run2.ciphertext, 'Ciphertexts must differ due to distinct nonces');
  });

  // Test 5: Plaintext Round-Trip
  it('5. decryptVaultSecret recovers exact plaintext using the correct passphrase', () => {
    const originalText = 'Medical Protocol: Hydrocortisone 20mg morning, Epipen in glove compartment';
    const encrypted = encryptVaultSecret(originalText, PASSPHRASE);
    const decrypted = decryptVaultSecret(encrypted, PASSPHRASE);

    assert.equal(decrypted, originalText, 'Decrypted text must match original plaintext exactly');
  });

  // Test 6: Wrong Passphrase Rejection
  it('6. decryptVaultSecret throws authentication error when incorrect passphrase is provided', () => {
    const encrypted = encryptVaultSecret(SAMPLE_SECRET, PASSPHRASE);
    const wrongPassphrase = 'incorrect-guess-passphrase-999';

    assert.throws(
      () => decryptVaultSecret(encrypted, wrongPassphrase),
      /Decryption failed|integrity check failed/i,
      'Decryption must fail with an invalid passphrase'
    );
  });

  // Test 7: Tamper Detection (Integrity Violation)
  it('7. decryptVaultSecret detects tampering in ciphertext or GCM authentication tag', () => {
    const encrypted = encryptVaultSecret(SAMPLE_SECRET, PASSPHRASE);
    
    // Tamper with the ciphertext by flipping characters
    const tamperedHex = encrypted.ciphertext.slice(0, -4) + (encrypted.ciphertext.endsWith('00') ? 'ff' : '00');
    const tamperedPayload = { ...encrypted, ciphertext: tamperedHex };

    assert.throws(
      () => decryptVaultSecret(tamperedPayload, PASSPHRASE),
      /Decryption failed|integrity check failed/i,
      'Tampered ciphertext must fail GCM authentication check'
    );
  });

  // Test 8: Nonce & Salt Validation
  it('8. decryptVaultSecret rejects corrupted nonce or truncated ciphertext', () => {
    const encrypted = encryptVaultSecret(SAMPLE_SECRET, PASSPHRASE);

    // Corrupted nonce (wrong length)
    const badNoncePayload = { ...encrypted, nonce: '001122' };
    assert.throws(
      () => decryptVaultSecret(badNoncePayload, PASSPHRASE),
      /Invalid nonce length/i,
      'Invalid nonce length must be rejected'
    );

    // Truncated ciphertext (shorter than auth tag)
    const truncatedPayload = { ...encrypted, ciphertext: '0011' };
    assert.throws(
      () => decryptVaultSecret(truncatedPayload, PASSPHRASE),
      /Invalid ciphertext length/i,
      'Truncated ciphertext must be rejected'
    );
  });

  // Test 9: Security Policy & In-App Guidance Enforcement
  it('9. validateSecretPolicy allows safe contextual notes and rejects raw banking PINs', () => {
    // Allowed contextual notes
    const valid1 = validateSecretPolicy('Side Gate Code', 'Code is 8492');
    const valid2 = validateSecretPolicy('Emergency Medical Note', 'Allergic to penicillin');
    const valid3 = validateSecretPolicy('Luggage Lock Combo', 'Dial 3-8-1');

    assert.equal(valid1.valid, true);
    assert.equal(valid2.valid, true);
    assert.equal(valid3.valid, true);

    // Prohibited raw financial PINs / master passwords per architectural guidance
    const invalid1 = validateSecretPolicy('Bank PIN', '4920');
    const invalid2 = validateSecretPolicy('Debit PIN', '1234');
    const invalid3 = validateSecretPolicy('Master Password', 'SuperSecret123');

    assert.equal(invalid1.valid, false);
    assert.ok(invalid1.reason?.includes('Prohibited label'));
    assert.equal(invalid2.valid, false);
    assert.equal(invalid3.valid, false);
  });

  // Test 10: Vault Envelope Import/Export Round-Trip
  it('10. exportVaultEnvelope and importVaultEnvelope correctly round-trip without leaking unencrypted data', () => {
    const secrets = [
      { label: 'Farm boundary gate', value: 'Combo 7391' },
      { label: 'Water pump shed', value: 'Key taped under eaves' }
    ];

    const envelope = exportVaultEnvelope(secrets, PASSPHRASE);

    assert.equal(envelope.version, '2.1');
    assert.equal(envelope.metadata.recordCount, 2);
    assert.deepEqual(envelope.metadata.labels, ['Farm boundary gate', 'Water pump shed']);
    assert.ok(!JSON.stringify(envelope).includes('Combo 7391'), 'Envelope must not contain plaintext values');

    const restored = importVaultEnvelope(envelope, PASSPHRASE);
    assert.deepEqual(restored, secrets, 'Restored secrets must match original inputs');
  });

  // Test 11: Vector Store Isolation Guarantee
  it('11. isVectorStoreIsolated enforces that vault secrets are never embedded in vector stores', () => {
    const validSecretRecord: VaultSecretRecord = {
      userId: 'sovereign_user',
      label: 'Workshop Door Code',
      ciphertext: 'deadbeef1234',
      nonce: '112233445566',
      salt: 'aabbccddeeff0011',
      embedding: null
    };

    const violatedRecord: any = {
      ...validSecretRecord,
      embedding: [0.12, 0.45, -0.89] // Prohibited: Secrets must never be vectorized
    };

    assert.equal(isVectorStoreIsolated(validSecretRecord), true, 'Record with null embedding must pass isolation check');
    assert.equal(isVectorStoreIsolated(violatedRecord), false, 'Record with vector embedding must be flagged as non-isolated');
  });
});
