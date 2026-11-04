import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createVault, unlockWithPassphrase, unlockWithRecoveryCode, changePassphrase,
  consumeRecoveryCode, putSecret, getSecret, listSecretLabels, wipe,
} from './vault.ts';

const PASS = 'correct horse battery staple';

test('create, unlock with passphrase, read a secret', () => {
  const { vault, masterKey } = createVault(PASS);
  const v = putSecret(vault, masterKey, 'Gate code', '4417');
  const key = unlockWithPassphrase(v, PASS);
  assert.equal(getSecret(v, key, 'Gate code'), '4417');
  wipe(key); wipe(masterKey);
});

test('wrong passphrase is rejected with a generic error', () => {
  const { vault } = createVault(PASS);
  assert.throws(() => unlockWithPassphrase(vault, 'wrong passphrase here'), /could not be unlocked/);
});

test('short passphrase is refused at creation', () => {
  assert.throws(() => createVault('short'), /at least 12/);
});

test('recovery code unlocks the same master key', () => {
  const { vault, recoveryCodes, masterKey } = createVault(PASS);
  const v = putSecret(vault, masterKey, 'PIN', '1234');
  const { masterKey: key, usedId } = unlockWithRecoveryCode(v, recoveryCodes[3]);
  assert.equal(getSecret(v, key, 'PIN'), '1234');
  assert.equal(usedId, 'rc-4');
});

test('recovery codes accept spacing and case differences', () => {
  const { vault, recoveryCodes } = createVault(PASS);
  const messy = ' ' + recoveryCodes[0].toUpperCase().replace(/-/g, ' ') + ' ';
  assert.doesNotThrow(() => unlockWithRecoveryCode(vault, messy));
});

test('a wrong recovery code is rejected', () => {
  const { vault } = createVault(PASS);
  assert.throws(() => unlockWithRecoveryCode(vault, '0000-0000-0000-0000-0000-0000-0000-0000'), /could not be unlocked/);
  assert.throws(() => unlockWithRecoveryCode(vault, 'not a code'), /could not be unlocked/);
});

test('a used recovery code can be removed', () => {
  const { vault, recoveryCodes } = createVault(PASS);
  const { usedId } = unlockWithRecoveryCode(vault, recoveryCodes[0]);
  const after = consumeRecoveryCode(vault, usedId);
  assert.equal(after.recoveryWraps.length, vault.recoveryWraps.length - 1);
  assert.throws(() => unlockWithRecoveryCode(after, recoveryCodes[0]), /could not be unlocked/);
});

test('changing the passphrase keeps secrets and recovery codes working', () => {
  const { vault, recoveryCodes, masterKey } = createVault(PASS);
  const v = putSecret(vault, masterKey, 'Note', 'hello');
  const v2 = changePassphrase(v, masterKey, 'a brand new passphrase');
  assert.throws(() => unlockWithPassphrase(v2, PASS), /could not be unlocked/);
  const key = unlockWithPassphrase(v2, 'a brand new passphrase');
  assert.equal(getSecret(v2, key, 'Note'), 'hello');
  const rk = unlockWithRecoveryCode(v2, recoveryCodes[1]).masterKey;
  assert.equal(getSecret(v2, rk, 'Note'), 'hello');
});

test('tampered ciphertext fails to decrypt', () => {
  const { vault, masterKey } = createVault(PASS);
  const v = putSecret(vault, masterKey, 'Card', 'ending 1234');
  v.secrets[0].ciphertext[0] ^= 1;
  assert.throws(() => getSecret(v, masterKey, 'Card'), /could not be decrypted/);
});

test('a secret cannot be moved under a different label', () => {
  const { vault, masterKey } = createVault(PASS);
  const v = putSecret(vault, masterKey, 'Real label', 'value');
  const swapped = { ...v, secrets: [{ ...v.secrets[0], label: 'Other label' }] };
  assert.throws(() => getSecret(swapped, masterKey, 'Other label'), /could not be decrypted/);
});

test('labels are listed without decrypting', () => {
  const { vault, masterKey } = createVault(PASS);
  let v = putSecret(vault, masterKey, 'A', '1');
  v = putSecret(v, masterKey, 'B', '2');
  assert.deepEqual(listSecretLabels(v), ['A', 'B']);
});

test('stored record contains no plaintext secret or passphrase', () => {
  const { vault, masterKey } = createVault(PASS);
  const v = putSecret(vault, masterKey, 'Gate', 'SECRET-VALUE-9999');
  const json = JSON.stringify(v, (_k, val) => (val instanceof Uint8Array ? Array.from(val) : val));
  assert.ok(!json.includes('SECRET-VALUE-9999'));
  assert.ok(!json.includes(PASS));
});
