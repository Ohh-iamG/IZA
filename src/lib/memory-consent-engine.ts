/**
 * IZA MEMORY CONFIDENCE & CONSENT PROTOCOL (SYSTEM SPEC 3.0)
 * 
 * CORE LAWS:
 * MEM-CORE-001: Every persistent memory MUST belong to exactly one authenticated user_id.
 * MEM-CORE-002: Content, Confidence, Consent, Sensitivity, Temporal state, Provenance,
 *               Lifecycle state, and Permitted uses are represented independently.
 * MEM-CORE-003: High confidence MUST NOT override restrictive consent.
 * MEM-CORE-004: Memory retrieval and memory disclosure MUST be separate operations.
 * MEM-CORE-005: Information in the Continuity Vault MUST remain outside vector embeddings,
 *               prompts, and ordinary conversational recall.
 */

export type MemoryConfidenceState =
  | 'confirmed'
  | 'supported'
  | 'tentative'
  | 'conflicted'
  | 'stale'
  | 'unknown';

export type MemoryConsentState =
  | 'session_only'
  | 'remember'
  | 'restricted'
  | 'vault'
  | 'pending_confirmation'
  | 'forget_requested'
  | 'deleted';

export type MemorySensitivityState =
  | 'ordinary'
  | 'personal'
  | 'sensitive'
  | 'highly_sensitive'
  | 'secret_prohibited';

export type MemoryTemporalState =
  | 'current'
  | 'historical'
  | 'time_limited'
  | 'needs_reconfirmation'
  | 'superseded';

export type MemoryLifecycleState =
  | 'candidate'
  | 'active'
  | 'restricted'
  | 'suppressed'
  | 'scheduled_for_deletion'
  | 'deleted';

export type MemoryOriginType =
  | 'user_statement'
  | 'user_entry'
  | 'uploaded_document'
  | 'voice_transcript'
  | 'image_ocr'
  | 'system_observation'
  | 'agent_inference'
  | 'external_source'
  | 'user_correction';

export interface MemoryRecord {
  id: string | number;
  userId: string;
  domain?: 'personal' | 'health' | 'work' | 'study';
  content: string;
  summary?: string;
  confidenceState: MemoryConfidenceState;
  confidenceScore?: number;
  consentState: MemoryConsentState;
  sensitivityState: MemorySensitivityState;
  temporalState: MemoryTemporalState;
  lifecycleState: MemoryLifecycleState;
  originType?: MemoryOriginType;
  validUntil?: Date | string | null;
  salienceScore?: number;
  isCurrentSession?: boolean;
}

export interface MemoryConsentPolicy {
  memoryId: string | number;
  userId: string;
  allowPersistentStorage: boolean;
  allowConversationalRecall: boolean;
  allowProactiveSurface: boolean;
  allowVoiceSurface: boolean;
  allowNotificationSurface: boolean;
  allowAgentAccess: boolean;
  allowExternalProcessing: boolean;
  allowRelationshipLinking: boolean;
  permittedDomains?: string[];
  permittedAgentIds?: string[];
  blockedAgentIds?: string[];
  requiresPrivateContext?: boolean;
  requiresFreshAuth?: boolean;
  requiresConfirmationBeforeSurface?: boolean;
  expiresAt?: Date | string | null;
}

export interface MemoryUseContext {
  userId: string;
  agentId?: string;
  channel: 'text' | 'voice' | 'notification' | 'export';
  purpose:
    | 'direct_answer'
    | 'proactive_follow_up'
    | 'recommendation'
    | 'agent_handoff'
    | 'private_export';
  privateContextConfirmed?: boolean;
  freshAuthentication?: boolean;
  directlyRequestedByUser?: boolean;
}

export interface MemoryDecision {
  allowed: boolean;
  mode:
    | 'use_naturally'
    | 'ask_confirmation'
    | 'use_with_uncertainty'
    | 'historical_only'
    | 'do_not_surface';
  reasonCode: string;
  authorisedContent?: string;
}

export const DEFAULT_CONSENT_POLICY: MemoryConsentPolicy = {
  memoryId: 0,
  userId: 'sovereign_user',
  allowPersistentStorage: true,
  allowConversationalRecall: true,
  allowProactiveSurface: true,
  allowVoiceSurface: true,
  allowNotificationSurface: true,
  allowAgentAccess: true,
  allowExternalProcessing: false,
  allowRelationshipLinking: true,
  permittedDomains: ['personal', 'health', 'work', 'study'],
  permittedAgentIds: ['iza_master', 'iza_doctor', 'iza_bio', 'iza_ceo', 'iza_research'],
  blockedAgentIds: [],
  requiresPrivateContext: false,
  requiresFreshAuth: false,
  requiresConfirmationBeforeSurface: false,
};

/**
 * Authorises whether a candidate memory may influence an AI response or be spoken aloud.
 * Runs BEFORE prompt construction, not after the model sees the memory.
 */
export function authoriseMemoryUse(
  memory: MemoryRecord,
  policy: MemoryConsentPolicy = DEFAULT_CONSENT_POLICY,
  context: MemoryUseContext
): MemoryDecision {
  // 1. Lifecycle and Deletion Boundary (MEM-CORE-004)
  if (
    memory.lifecycleState === 'deleted' ||
    memory.lifecycleState === 'scheduled_for_deletion' ||
    memory.consentState === 'deleted' ||
    memory.consentState === 'forget_requested'
  ) {
    return {
      allowed: false,
      mode: 'do_not_surface',
      reasonCode: 'MEMORY_REMOVED'
    };
  }

  // 2. Prohibited Secrets Boundary (MEM-INGEST-003)
  if (memory.sensitivityState === 'secret_prohibited') {
    return {
      allowed: false,
      mode: 'do_not_surface',
      reasonCode: 'PROHIBITED_SECRET'
    };
  }

  // 3. Vault Isolation (MEM-CORE-005)
  if (memory.consentState === 'vault') {
    return {
      allowed: false,
      mode: 'do_not_surface',
      reasonCode: 'VAULT_ISOLATION'
    };
  }

  // 4. Session-Only Boundary
  if (memory.consentState === 'session_only' && !memory.isCurrentSession) {
    return {
      allowed: false,
      mode: 'do_not_surface',
      reasonCode: 'SESSION_EXPIRED'
    };
  }

  // 5. Channel: Voice Surface Permission
  if (context.channel === 'voice' && !policy.allowVoiceSurface) {
    return {
      allowed: false,
      mode: 'do_not_surface',
      reasonCode: 'VOICE_NOT_ALLOWED'
    };
  }

  // 6. Channel: Proactive Surface Permission
  if (context.purpose === 'proactive_follow_up' && !policy.allowProactiveSurface) {
    return {
      allowed: false,
      mode: 'do_not_surface',
      reasonCode: 'PROACTIVE_USE_NOT_ALLOWED'
    };
  }

  // 7. Agent Isolation Boundary
  if (context.agentId) {
    if (policy.blockedAgentIds && policy.blockedAgentIds.includes(context.agentId)) {
      return {
        allowed: false,
        mode: 'do_not_surface',
        reasonCode: 'AGENT_ACCESS_BLOCKED'
      };
    }
    if (
      policy.permittedAgentIds &&
      policy.permittedAgentIds.length > 0 &&
      !policy.permittedAgentIds.includes(context.agentId)
    ) {
      return {
        allowed: false,
        mode: 'do_not_surface',
        reasonCode: 'AGENT_NOT_AUTHORISED'
      };
    }
  }

  // 8. Privacy Context Requirement (e.g. public voice turn vs sensitive health)
  if (policy.requiresPrivateContext && !context.privateContextConfirmed) {
    return {
      allowed: false,
      mode: 'ask_confirmation',
      reasonCode: 'PRIVATE_CONTEXT_REQUIRED'
    };
  }

  // 9. Fresh Authentication Requirement
  if (policy.requiresFreshAuth && !context.freshAuthentication) {
    return {
      allowed: false,
      mode: 'ask_confirmation',
      reasonCode: 'FRESH_AUTH_REQUIRED'
    };
  }

  // 10. Temporal Expiration Check
  if (memory.validUntil) {
    const expiry = new Date(memory.validUntil).getTime();
    if (Date.now() > expiry) {
      return {
        allowed: false,
        mode: 'do_not_surface',
        reasonCode: 'TEMPORAL_CONSENT_EXPIRED'
      };
    }
  }

  // 11. Uncertainty / Tentative Confidence (TEST-MEM-004)
  if (memory.confidenceState === 'tentative' || memory.confidenceState === 'unknown') {
    return {
      allowed: true,
      mode: 'use_with_uncertainty',
      reasonCode: 'LOW_CONFIDENCE',
      authorisedContent: memory.content
    };
  }

  // 12. Conflicted Records (Requires Confirmation)
  if (memory.confidenceState === 'conflicted') {
    return {
      allowed: false,
      mode: 'ask_confirmation',
      reasonCode: 'CONFLICT_REQUIRES_RESOLUTION'
    };
  }

  // 13. Stale / Superseded Temporal State (THEN ≠ NOW)
  if (
    memory.confidenceState === 'stale' ||
    memory.temporalState === 'needs_reconfirmation' ||
    memory.temporalState === 'superseded' ||
    memory.temporalState === 'historical'
  ) {
    return {
      allowed: true,
      mode: 'historical_only',
      reasonCode: 'CURRENT_STATUS_UNCONFIRMED',
      authorisedContent: memory.content
    };
  }

  // 14. Full Authorisation
  return {
    allowed: true,
    mode: 'use_naturally',
    reasonCode: 'AUTHORISED',
    authorisedContent: memory.content
  };
}

/**
 * Filter memories against consent rules before generating AI system prompt.
 * Only memories with an authorised decision may enter an AI prompt (MEM-PROMPT-001).
 */
export function filterAuthorisedMemoriesForPrompt(
  memories: MemoryRecord[],
  context: MemoryUseContext,
  policies: Record<string | number, MemoryConsentPolicy> = {}
): Array<{
  memory: MemoryRecord;
  decision: MemoryDecision;
  instruction: string;
}> {
  const authorisedList: Array<{
    memory: MemoryRecord;
    decision: MemoryDecision;
    instruction: string;
  }> = [];

  for (const memory of memories) {
    const policy = policies[memory.id] || DEFAULT_CONSENT_POLICY;
    const decision = authoriseMemoryUse(memory, policy, context);

    if (!decision.allowed) {
      continue;
    }

    let instruction = '';
    if (decision.mode === 'use_with_uncertainty') {
      instruction = 'Tentative context: Use with conversational curiosity/uncertainty, not as an absolute fact.';
    } else if (decision.mode === 'historical_only') {
      instruction = 'Historical context (THEN ≠ NOW): This reflects past state; do not assume it represents current fact today.';
    } else {
      instruction = 'Authorised context: Speak or refer naturally if relevant. Do not narrate database retrieval.';
    }

    authorisedList.push({
      memory,
      decision,
      instruction
    });
  }

  return authorisedList;
}
