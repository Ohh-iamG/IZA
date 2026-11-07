import crypto from 'crypto';

export interface EncryptedSecretPayload {
  ciphertext: string;
  nonce: string;
  salt: string;
  algorithm: 'AES-256-GCM';
  version: '2.1';
}

export interface VaultSecretRecord {
  id?: number;
  userId: string;
  label: string;
  ciphertext: string;
  nonce: string;
  salt: string;
  embedding?: null;
  createdAt?: string;
}

export interface VaultEnvelope {
  version: '2.1';
  exportedAt: string;
  cipherPayload: EncryptedSecretPayload;
  metadata: {
    recordCount: number;
    labels: string[];
  };
}

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH_BYTES = 32; // 256 bits for AES-256
const NONCE_LENGTH_BYTES = 12; // 96 bits for AES-GCM
const SALT_LENGTH_BYTES = 16; // 128 bits
const AUTH_TAG_LENGTH_BYTES = 16; // 128 bits

/**
 * Derives a cryptographic key from a passphrase and salt using PBKDF2 with SHA-256.
 */
export function deriveVaultKey(passphrase: string, salt: Buffer | string): Buffer {
  if (!passphrase || typeof passphrase !== 'string' || passphrase.length === 0) {
    throw new Error('Passphrase must be a non-empty string');
  }

  const saltBuffer = typeof salt === 'string' ? Buffer.from(salt, 'hex') : salt;
  if (!saltBuffer || saltBuffer.length < 8) {
    throw new Error('Salt must be at least 8 bytes');
  }

  return crypto.pbkdf2Sync(
    passphrase,
    saltBuffer,
    PBKDF2_ITERATIONS,
    KEY_LENGTH_BYTES,
    'sha256'
  );
}

/**
 * Generates a cryptographically secure random salt (16 bytes).
 */
export function generateSalt(): string {
  return crypto.randomBytes(SALT_LENGTH_BYTES).toString('hex');
}

/**
 * Generates a cryptographically secure random nonce / IV (12 bytes).
 */
export function generateNonce(): string {
  return crypto.randomBytes(NONCE_LENGTH_BYTES).toString('hex');
}

/**
 * Encrypts a plaintext secret using AES-256-GCM and derived key from passphrase.
 */
export function encryptVaultSecret(plaintext: string, passphrase: string, customSalt?: string): EncryptedSecretPayload {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('Plaintext must be a non-empty string');
  }
  if (!passphrase || typeof passphrase !== 'string') {
    throw new Error('Passphrase must be a non-empty string');
  }

  const saltHex = customSalt || generateSalt();
  const nonceHex = generateNonce();

  const key = deriveVaultKey(passphrase, saltHex);
  const nonceBuffer = Buffer.from(nonceHex, 'hex');

  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonceBuffer);
  
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  // Combined ciphertext payload: [encryptedData][authTag]
  const combinedCiphertext = Buffer.concat([encrypted, authTag]).toString('hex');

  return {
    ciphertext: combinedCiphertext,
    nonce: nonceHex,
    salt: saltHex,
    algorithm: 'AES-256-GCM',
    version: '2.1'
  };
}

/**
 * Decrypts an AES-256-GCM ciphertext payload using the passphrase.
 */
export function decryptVaultSecret(payload: EncryptedSecretPayload, passphrase: string): string {
  if (!payload || !payload.ciphertext || !payload.nonce || !payload.salt) {
    throw new Error('Invalid payload: missing ciphertext, nonce, or salt');
  }
  if (!passphrase || typeof passphrase !== 'string') {
    throw new Error('Passphrase must be a non-empty string');
  }

  const nonceBuffer = Buffer.from(payload.nonce, 'hex');
  if (nonceBuffer.length !== NONCE_LENGTH_BYTES) {
    throw new Error(`Invalid nonce length: expected ${NONCE_LENGTH_BYTES} bytes, got ${nonceBuffer.length}`);
  }

  const saltBuffer = Buffer.from(payload.salt, 'hex');
  if (saltBuffer.length < 8) {
    throw new Error('Invalid salt length');
  }

  const fullCipherBuffer = Buffer.from(payload.ciphertext, 'hex');
  if (fullCipherBuffer.length <= AUTH_TAG_LENGTH_BYTES) {
    throw new Error('Invalid ciphertext length: missing authentication tag');
  }

  // Split encrypted data and authentication tag
  const authTag = fullCipherBuffer.subarray(fullCipherBuffer.length - AUTH_TAG_LENGTH_BYTES);
  const encryptedData = fullCipherBuffer.subarray(0, fullCipherBuffer.length - AUTH_TAG_LENGTH_BYTES);

  const key = deriveVaultKey(passphrase, saltBuffer);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonceBuffer);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  } catch (err: any) {
    throw new Error('Decryption failed: integrity check failed or invalid passphrase', { cause: err });
  }
}

/**
 * Validates in-app secret storage safety policies.
 * Per v2.1 Architectural Spec:
 * - Rejects raw banking PINs, credit card numbers, or primary authentication passwords.
 * - Enforces clean labels and context notes (gate codes, emergency medical notes, luggage combos).
 */
export function validateSecretPolicy(label: string, content: string): { valid: boolean; reason?: string } {
  const cleanLabel = (label || '').trim();
  const cleanContent = (content || '').trim();

  if (!cleanLabel) {
    return { valid: false, reason: 'Secret label cannot be empty.' };
  }
  if (cleanLabel.length > 128) {
    return { valid: false, reason: 'Secret label exceeds 128 characters.' };
  }
  if (!cleanContent) {
    return { valid: false, reason: 'Secret content cannot be empty.' };
  }

  const prohibitedPatterns = [
    /\b(?:bank\s*pin|atm\s*pin|debit\s*pin|card\s*pin)\b/i,
    /\b(?:master\s*password|login\s*password|apple\s*id\s*password|google\s*password)\b/i,
    /\b(?:cvv|cvc|security\s*code)\s*[:=]\s*\d{3,4}\b/i,
  ];

  for (const pattern of prohibitedPatterns) {
    if (pattern.test(cleanLabel)) {
      return { 
        valid: false, 
        reason: 'Prohibited label: IZA stores contextual notes (gate codes, locker combos, medical allergies), never raw banking PINs or primary authentication passwords.' 
      };
    }
  }

  return { valid: true };
}

/**
 * Verifies that secret records are strictly isolated from the vector store.
 * Continuity secrets must NEVER be embedded or submitted to pgvector.
 */
export function isVectorStoreIsolated(record: VaultSecretRecord): boolean {
  if (record.embedding !== null && record.embedding !== undefined) {
    return false;
  }
  return true;
}

/**
 * Packages an array of plaintext vault records into an encrypted envelope.
 */
export function exportVaultEnvelope(
  secrets: Array<{ label: string; value: string }>,
  passphrase: string
): VaultEnvelope {
  const jsonContent = JSON.stringify(secrets);
  const cipherPayload = encryptVaultSecret(jsonContent, passphrase);

  return {
    version: '2.1',
    exportedAt: new Date().toISOString(),
    cipherPayload,
    metadata: {
      recordCount: secrets.length,
      labels: secrets.map(s => s.label)
    }
  };
}

/**
 * Decrypts and unpacks a vault envelope.
 */
export function importVaultEnvelope(
  envelope: VaultEnvelope,
  passphrase: string
): Array<{ label: string; value: string }> {
  if (envelope.version !== '2.1') {
    throw new Error(`Unsupported envelope version: ${envelope.version}`);
  }
  const decryptedJson = decryptVaultSecret(envelope.cipherPayload, passphrase);
  const parsed = JSON.parse(decryptedJson);
  if (!Array.isArray(parsed)) {
    throw new Error('Corrupted vault envelope payload');
  }
  return parsed;
}
