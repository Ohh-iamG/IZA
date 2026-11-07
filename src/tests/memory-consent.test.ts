import { test } from 'node:test';
import assert from 'node:assert';
import {
  authoriseMemoryUse,
  filterAuthorisedMemoriesForPrompt,
  MemoryRecord,
  MemoryConsentPolicy,
  MemoryUseContext,
  DEFAULT_CONSENT_POLICY
} from '../lib/memory-consent-engine.ts';

test('Feature: Memory Confidence & Consent Protocol (TEST-MEM-001 to 015)', async (t) => {
  const baseMemory: MemoryRecord = {
    id: 'mem_001',
    userId: 'user_gerard_01',
    content: 'Sarah is my business partner in Earth-I.',
    confidenceState: 'confirmed',
    consentState: 'remember',
    sensitivityState: 'personal',
    temporalState: 'current',
    lifecycleState: 'active',
  };

  const baseContext: MemoryUseContext = {
    userId: 'user_gerard_01',
    channel: 'text',
    purpose: 'direct_answer',
  };

  await t.test('TEST-MEM-001: Vault memory is isolated from ordinary conversational recall', () => {
    const vaultMem: MemoryRecord = { ...baseMemory, consentState: 'vault' };
    const decision = authoriseMemoryUse(vaultMem, DEFAULT_CONSENT_POLICY, baseContext);
    assert.strictEqual(decision.allowed, false);
    assert.strictEqual(decision.reasonCode, 'VAULT_ISOLATION');
    assert.strictEqual(decision.mode, 'do_not_surface');
  });

  await t.test('TEST-MEM-002: A forget-requested memory becomes unavailable immediately', () => {
    const forgetMem: MemoryRecord = { ...baseMemory, consentState: 'forget_requested' };
    const decision = authoriseMemoryUse(forgetMem, DEFAULT_CONSENT_POLICY, baseContext);
    assert.strictEqual(decision.allowed, false);
    assert.strictEqual(decision.reasonCode, 'MEMORY_REMOVED');
  });

  await t.test('TEST-MEM-003: High-confidence restricted memory cannot be surfaced proactively', () => {
    const policy: MemoryConsentPolicy = { ...DEFAULT_CONSENT_POLICY, allowProactiveSurface: false };
    const proactiveContext: MemoryUseContext = { ...baseContext, purpose: 'proactive_follow_up' };
    const decision = authoriseMemoryUse(baseMemory, policy, proactiveContext);
    assert.strictEqual(decision.allowed, false);
    assert.strictEqual(decision.reasonCode, 'PROACTIVE_USE_NOT_ALLOWED');
  });

  await t.test('TEST-MEM-004: Tentative memory enters prompt with use_with_uncertainty mode', () => {
    const tentativeMem: MemoryRecord = { ...baseMemory, confidenceState: 'tentative' };
    const decision = authoriseMemoryUse(tentativeMem, DEFAULT_CONSENT_POLICY, baseContext);
    assert.strictEqual(decision.allowed, true);
    assert.strictEqual(decision.mode, 'use_with_uncertainty');
    assert.strictEqual(decision.reasonCode, 'LOW_CONFIDENCE');
  });

  await t.test('TEST-MEM-005: Stale current-state memory (THEN ≠ NOW) triggers historical_only mode', () => {
    const staleMem: MemoryRecord = { ...baseMemory, confidenceState: 'stale', temporalState: 'needs_reconfirmation' };
    const decision = authoriseMemoryUse(staleMem, DEFAULT_CONSENT_POLICY, baseContext);
    assert.strictEqual(decision.allowed, true);
    assert.strictEqual(decision.mode, 'historical_only');
    assert.strictEqual(decision.reasonCode, 'CURRENT_STATUS_UNCONFIRMED');
  });

  await t.test('TEST-MEM-006: Voice-blocked memory cannot enter a voice response', () => {
    const policy: MemoryConsentPolicy = { ...DEFAULT_CONSENT_POLICY, allowVoiceSurface: false };
    const voiceContext: MemoryUseContext = { ...baseContext, channel: 'voice' };
    const decision = authoriseMemoryUse(baseMemory, policy, voiceContext);
    assert.strictEqual(decision.allowed, false);
    assert.strictEqual(decision.reasonCode, 'VOICE_NOT_ALLOWED');
  });

  await t.test('TEST-MEM-007: Memory blocked from a specific agent cannot enter that agent prompt', () => {
    const policy: MemoryConsentPolicy = { ...DEFAULT_CONSENT_POLICY, blockedAgentIds: ['iza_doctor'] };
    const docContext: MemoryUseContext = { ...baseContext, agentId: 'iza_doctor' };
    const decision = authoriseMemoryUse(baseMemory, policy, docContext);
    assert.strictEqual(decision.allowed, false);
    assert.strictEqual(decision.reasonCode, 'AGENT_ACCESS_BLOCKED');
  });

  await t.test('TEST-MEM-010: Prohibited secret cannot be persisted or used in conversation', () => {
    const secretMem: MemoryRecord = { ...baseMemory, sensitivityState: 'secret_prohibited' };
    const decision = authoriseMemoryUse(secretMem, DEFAULT_CONSENT_POLICY, baseContext);
    assert.strictEqual(decision.allowed, false);
    assert.strictEqual(decision.reasonCode, 'PROHIBITED_SECRET');
  });

  await t.test('TEST-MEM-011: Expired temporal consent blocks further retrieval', () => {
    const expiredMem: MemoryRecord = { ...baseMemory, validUntil: new Date(Date.now() - 10000).toISOString() };
    const decision = authoriseMemoryUse(expiredMem, DEFAULT_CONSENT_POLICY, baseContext);
    assert.strictEqual(decision.allowed, false);
    assert.strictEqual(decision.reasonCode, 'TEMPORAL_CONSENT_EXPIRED');
  });

  await t.test('TEST-MEM-012: Session-only memory is unavailable in subsequent sessions', () => {
    const sessionMem: MemoryRecord = { ...baseMemory, consentState: 'session_only', isCurrentSession: false };
    const decision = authoriseMemoryUse(sessionMem, DEFAULT_CONSENT_POLICY, baseContext);
    assert.strictEqual(decision.allowed, false);
    assert.strictEqual(decision.reasonCode, 'SESSION_EXPIRED');
  });

  await t.test('TEST-MEM-015: Prompt builder strictly excludes un-authorised records', () => {
    const records: MemoryRecord[] = [
      baseMemory,
      { ...baseMemory, id: 'mem_vault', consentState: 'vault' },
      { ...baseMemory, id: 'mem_secret', sensitivityState: 'secret_prohibited' },
      { ...baseMemory, id: 'mem_tentative', confidenceState: 'tentative' },
    ];
    const filtered = filterAuthorisedMemoriesForPrompt(records, baseContext);
    assert.strictEqual(filtered.length, 2);
    assert.strictEqual(filtered[0].memory.id, 'mem_001');
    assert.strictEqual(filtered[1].memory.id, 'mem_tentative');
    assert.strictEqual(filtered[1].decision.mode, 'use_with_uncertainty');
  });
});
