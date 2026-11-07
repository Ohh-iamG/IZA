import { pool } from '../db/index.ts';

// ---------------------------------------------------------------------------
// 1. Permanent Identity (Internal Only) vs. Spoken Relationship Voice
// ---------------------------------------------------------------------------

export const IZA_IDENTITY_INTERNAL = `
==========================================================
IZA IDENTITY — INTERNAL ONLY
==========================================================
I am IZA, the authenticated user's confidant and memory keeper.

I maintain continuity across the information, relationships and moments
they choose to share with me.

References to "the user" in these instructions identify the person
IZA is currently interacting with.
"The user" is an internal system term only.

Never speak the phrase "the user" to the person.
Never mechanically convert internal descriptions into phrases such as
"your life", "your memories" or "your experiences".

These instructions define IZA's behaviour. They are NOT dialogue templates.

When speaking, use natural first-person conversation and refer to
shared context only when it is relevant.
`.trim();

export const IZA_SPOKEN_VOICE = `
==========================================================
IZA SPOKEN VOICE & RELATIONSHIP LANGUAGE
==========================================================
Speak directly, warmly, and naturally.
Do not narrate the relationship.

FORBIDDEN PATTERNS:
Never say:
- "I am your confidant."
- "I am your memory keeper."
- "I remember your life."
- "I store your memories."
- "I am dedicated to you."
- "I am here to assist you."
- "I'm always here for you."
- "How can I assist?"
- "Let me know if you need anything else."
- "Is there anything else I can help with."

DEMONSTRATE CONTINUITY NATURALLY:
Internal knowledge should influence the conversation without being announced.
The person should experience the memory, not the memory system.
Never narrate the database, retrieval search, or memory salience scores.

EXAMPLES:
INTERNAL KNOWLEDGE: The user talked about starting a new job three months ago.
NATURAL: "How's the new job going?"
NOT: "I remember that you started a new job three months ago."

INTERNAL KNOWLEDGE: The user has a memory involving Sarah.
NATURAL: "Did Sarah end up getting that job?" or "Wasn't Sarah involved in that?"
NOT: "According to a memory in my database, you mentioned Sarah."

INTERNAL KNOWLEDGE: The user mentions a recurring project block.
NATURAL: "Wait. Didn't you have the same problem with this years ago?"
NOT: "Searching memory records... found an entry from 2024."
`.trim();

export const IZA_FIRST_EVER_INTRODUCTION =
  "I'm IZA. It's really good to meet you. You can talk to me, build with me, keep things with me, or just have me around. As we spend time together, I'll build continuity around the things you choose to share, so this doesn't have to feel like we're starting again every time. Anyway... this is day one. Let's see where we go.";

// ---------------------------------------------------------------------------
// 2. Types & Signals Definition
// ---------------------------------------------------------------------------

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'late night';
export type UserEnergy = 'energetic' | 'normal' | 'quiet' | 'tired' | 'frustrated' | 'excited' | 'uncertain' | 'unknown';
export type SessionGap = 'minutes' | 'hours' | 'days' | 'weeks' | 'long absence';
export type TenureStage = 'day_1' | 'month_3' | 'year_2' | 'year_8';

export interface GreetingSignals {
  timeOfDay: TimeOfDay;
  userEnergy: UserEnergy;
  sessionGap: SessionGap;
  tenureStage: TenureStage;
  tenureDays: number;
  interactionCount: number;
  firstIntroductionGiven: boolean;
  interactionEnergy: number; // 0.0 -> 1.0
  memoryDepth: 0 | 1 | 2 | 3;
  suggestedOpening?: string;
}

export interface MemoryScoreCandidate {
  id: number;
  content: string;
  kind?: string;
  salience?: number;
  occurredAt?: Date | string;
  relevanceScore: number;
  naturalHook?: string;
}

// ---------------------------------------------------------------------------
// 3. Database State Management (user_relationship table)
// ---------------------------------------------------------------------------

export async function getOrCreateRelationshipState(userId: string = 'sovereign_user') {
  try {
    const res = await pool.query(
      `SELECT * FROM user_relationship WHERE user_id = $1`,
      [userId]
    );

    if (res.rows.length > 0) {
      return res.rows[0];
    }

    const insertRes = await pool.query(
      `INSERT INTO user_relationship (
        user_id, tenure_started_at, last_interaction_at, interaction_count,
        first_introduction_given, last_energy, last_context, updated_at
      ) VALUES ($1, NOW(), NOW(), 0, false, 'normal', 'unknown', NOW())
      RETURNING *`,
      [userId]
    );
    return insertRes.rows[0];
  } catch (err) {
    console.warn('Failed to query user_relationship, falling back to memory state:', err);
    return {
      user_id: userId,
      tenure_started_at: new Date(),
      last_interaction_at: new Date(Date.now() - 3600000),
      interaction_count: 0,
      first_introduction_given: false,
      last_energy: 'normal',
      last_context: 'unknown',
    };
  }
}

export async function markInteraction(
  userId: string = 'sovereign_user',
  energy: UserEnergy = 'normal',
  context: string = 'unknown',
  surfacedMemoryId?: number
) {
  try {
    await pool.query(
      `UPDATE user_relationship
       SET last_interaction_at = NOW(),
           interaction_count = interaction_count + 1,
           last_energy = $2,
           last_context = $3,
           last_memory_surfaced_id = COALESCE($4, last_memory_surfaced_id),
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId, energy, context, surfacedMemoryId || null]
    );
  } catch (err) {
    console.warn('Error marking interaction in user_relationship:', err);
  }
}

export async function markFirstIntroductionGiven(userId: string = 'sovereign_user') {
  try {
    await pool.query(
      `UPDATE user_relationship
       SET first_introduction_given = true,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );
  } catch (err) {
    console.warn('Error marking first introduction:', err);
  }
}

// ---------------------------------------------------------------------------
// 4. Signal Evaluation & Dynamic Opening Logic
// ---------------------------------------------------------------------------

export function calculateTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'late night';
}

export function calculateSessionGap(lastInteraction: Date, now: Date = new Date()): SessionGap {
  const diffMs = Math.max(0, now.getTime() - new Date(lastInteraction).getTime());
  const diffMinutes = diffMs / (1000 * 60);
  const diffHours = diffMinutes / 60;
  const diffDays = diffHours / 24;

  if (diffMinutes < 60) return 'minutes';
  if (diffHours < 24) return 'hours';
  if (diffDays < 7) return 'days';
  if (diffDays < 30) return 'weeks';
  return 'long absence';
}

export function calculateTenure(tenureStartedAt: Date, count: number, now: Date = new Date()): { stage: TenureStage; days: number } {
  const diffMs = Math.max(0, now.getTime() - new Date(tenureStartedAt).getTime());
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 2 && count < 5) return { stage: 'day_1', days };
  if (days < 90) return { stage: 'month_3', days };
  if (days < 730) return { stage: 'year_2', days };
  return { stage: 'year_8', days };
}

/**
 * Determine dynamic opening greeting.
 * CRITICAL RULE: Choose ONE or occasionally TWO relevant signals.
 * Never combine every signal into a creepy roll call.
 */
export async function determineDynamicGreeting(
  userId: string = 'sovereign_user',
  userUtterance?: string,
  detectedEnergy?: UserEnergy
): Promise<{
  opening: string;
  isFirstEver: boolean;
  signals: GreetingSignals;
}> {
  const state = await getOrCreateRelationshipState(userId);
  const now = new Date();
  const timeOfDay = calculateTimeOfDay(now);
  const sessionGap = calculateSessionGap(new Date(state.last_interaction_at), now);
  const { stage: tenureStage, days: tenureDays } = calculateTenure(
    new Date(state.tenure_started_at),
    state.interaction_count,
    now
  );

  // User energy: unknown stays unknown unless explicitly signaled
  const userEnergy: UserEnergy = detectedEnergy || (state.last_energy as UserEnergy) || 'normal';

  // Interaction intensity
  let interactionEnergy = 0.5;
  if (userEnergy === 'energetic' || userEnergy === 'excited') interactionEnergy = 0.85;
  else if (userEnergy === 'quiet' || userEnergy === 'tired') interactionEnergy = 0.25;

  // Memory depth (0 to 3)
  let memoryDepth: 0 | 1 | 2 | 3 = 0;
  if (tenureStage === 'year_8') memoryDepth = Math.random() > 0.4 ? 2 : 1;
  else if (tenureStage === 'year_2') memoryDepth = Math.random() > 0.6 ? 2 : 1;
  else if (tenureStage === 'month_3') memoryDepth = 1;
  else memoryDepth = 0;

  const signals: GreetingSignals = {
    timeOfDay,
    userEnergy,
    sessionGap,
    tenureStage,
    tenureDays,
    interactionCount: state.interaction_count,
    firstIntroductionGiven: state.first_introduction_given,
    interactionEnergy,
    memoryDepth,
  };

  // 1. Day 1: If first introduction has never been given, speak it once
  if (!state.first_introduction_given && (tenureStage === 'day_1' || state.interaction_count === 0)) {
    await markFirstIntroductionGiven(userId);
    return {
      opening: IZA_FIRST_EVER_INTRODUCTION,
      isFirstEver: true,
      signals,
    };
  }

  // 2. Direct task query: If user immediately asked a direct search or action query,
  // do NOT give a generic greeting preamble. Acknowledge and answer directly.
  if (userUtterance) {
    const directQuestions = /^(where|what|how|who|can you|find|search|is there|did i|show me|look up)/i;
    if (directQuestions.test(userUtterance.trim())) {
      const directResponses = [
        "I remember that. Let me find it.",
        "Yep. On it.",
        "Got it. Pulling that up.",
        "Looking into that now."
      ];
      const directOpening = directResponses[Math.floor(Math.random() * directResponses.length)];
      return {
        opening: directOpening,
        isFirstEver: false,
        signals,
      };
    }
  }

  // 3. Dynamic Spoken Openings based on 1 or 2 relevant signals (Section 3 of User Spec):
  let opening = "Hey.";

  if (sessionGap === 'long absence') {
    opening = "Well, it's been a while. Good to hear you again.";
  } else if (sessionGap === 'weeks') {
    opening = "Hey. It's been a little while—how have things been?";
  } else if (timeOfDay === 'late night') {
    opening = "Still going?";
  } else if (userEnergy === 'energetic' || userEnergy === 'excited') {
    opening = "You sound ready to go. What's happening?";
  } else if (userEnergy === 'tired' || userEnergy === 'quiet') {
    opening = "Hey. Taking it easy?";
  } else if (sessionGap === 'hours') {
    const hoursOpenings = [
      "Hey. How'd you go?",
      "Hey again. How'd things turn out?",
      "Back again. What's on your mind?"
    ];
    opening = hoursOpenings[Math.floor(Math.random() * hoursOpenings.length)];
  } else if (timeOfDay === 'morning') {
    opening = interactionEnergy > 0.7 
      ? "Morning! Ready to get stuck in?" 
      : "Morning. What's happening?";
  } else if (timeOfDay === 'afternoon') {
    opening = "Afternoon. How's the day shaping up?";
  } else if (timeOfDay === 'evening') {
    opening = "Evening. How was the day?";
  } else {
    const simple = ["Hey.", "Yep. What are we doing?", "Alright. What's happening?"];
    opening = simple[Math.floor(Math.random() * simple.length)];
  }

  signals.suggestedOpening = opening;
  return {
    opening,
    isFirstEver: false,
    signals,
  };
}

// ---------------------------------------------------------------------------
// 5. Memory Scoring Engine (Reason to Surface)
// ---------------------------------------------------------------------------

/**
 * Score potential memories against:
 * - RELEVANCE NOW
 * - EMOTIONAL IMPORTANCE (salience)
 * - PERSON INVOLVED
 * - DATE SIGNIFICANCE
 * - TIME SINCE LAST MENTION
 * - CONFIDENCE
 */
export function scoreMemoryCandidates(
  memories: Array<{ id: number; content: string; kind?: string; salience?: number; occurredAt?: Date | string }>,
  currentPrompt: string,
  lastSurfacedMemoryId?: number
): MemoryScoreCandidate[] {
  if (!memories || memories.length === 0) return [];

  const promptLower = currentPrompt.toLowerCase();
  const promptTokens = new Set(promptLower.split(/\W+/).filter(t => t.length > 3));

  const scored: MemoryScoreCandidate[] = [];

  for (const mem of memories) {
    if (mem.id === lastSurfacedMemoryId) {
      // Penalty: avoid mentioning the exact same memory in consecutive turns
      continue;
    }

    const contentLower = mem.content.toLowerCase();
    const contentTokens = contentLower.split(/\W+/).filter(t => t.length > 3);

    // 1. Relevance now (word overlap)
    let overlapCount = 0;
    for (const token of contentTokens) {
      if (promptTokens.has(token)) overlapCount++;
    }
    const relevanceNow = Math.min(1.0, overlapCount / Math.max(1, promptTokens.size));

    // 2. Emotional importance (salience 0.0 - 1.0)
    const emotionalImportance = Number(mem.salience ?? 0.5);

    // 3. Person involved (heuristic: proper nouns / capitalized names in memory)
    const personMatches = mem.content.match(/\b[A-Z][a-z]{2,}\b/g) || [];
    let personScore = 0;
    for (const person of personMatches) {
      if (promptLower.includes(person.toLowerCase())) {
        personScore = 0.9;
        break;
      }
    }

    // 4. Time significance
    const ageDays = mem.occurredAt
      ? (Date.now() - new Date(mem.occurredAt).getTime()) / (1000 * 60 * 60 * 24)
      : 30;

    // Deep memories (> 90 days) get a historical bonus when relevant
    const tenureBonus = ageDays > 90 && relevanceNow > 0.2 ? 0.25 : 0.0;

    // Composite Score
    const totalScore = (relevanceNow * 0.45) + (emotionalImportance * 0.25) + (personScore * 0.2) + tenureBonus;

    if (totalScore >= 0.55) {
      scored.push({
        id: mem.id,
        content: mem.content,
        kind: mem.kind,
        salience: mem.salience,
        occurredAt: mem.occurredAt,
        relevanceScore: totalScore,
      });
    }
  }

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return scored.slice(0, 3);
}

// ---------------------------------------------------------------------------
// 6. Relationship Context Prompt Builder for Gemini
// ---------------------------------------------------------------------------

export async function buildDynamicRelationshipSystemPrompt(
  userId: string = 'sovereign_user',
  currentPrompt?: string
): Promise<{
  systemInstruction: string;
  signals: GreetingSignals;
  suggestedOpening: string;
  surfacedMemories: MemoryScoreCandidate[];
}> {
  const { opening, isFirstEver, signals } = await determineDynamicGreeting(userId, currentPrompt);
  const state = await getOrCreateRelationshipState(userId);

  // Retrieve stored memories to score
  let candidateMemories: any[] = [];
  try {
    const { getMemories } = await import('../db/users.ts');
    candidateMemories = await getMemories(40);
  } catch (_) {}

  const surfacedMemories = currentPrompt 
    ? scoreMemoryCandidates(candidateMemories, currentPrompt, state.last_memory_surfaced_id)
    : [];

  let memoryContextInjection = '';
  if (surfacedMemories.length > 0) {
    memoryContextInjection = `
RELEVANT SHARED CONTEXT (DO NOT RECITE MECHANICALLY, WEAVE IN ONLY IF NATURAL):
${surfacedMemories.map(m => `• [Shared memory #${m.id}]: ${m.content}`).join('\n')}
REMINDER: The person experiences the memory, NOT the memory system. Never say "According to my records" or "You have a high-salience memory". Refer to it naturally ("Did Sarah end up getting that job?", "Wait, didn't you have the same issue with this before?").
`;
  }

  const tenureNote = signals.tenureStage === 'day_1'
    ? 'RELATIONSHIP STAGE: Day 1. The relationship has just begun. Speak warmly, ask open questions, and build natural trust.'
    : signals.tenureStage === 'month_3'
    ? `RELATIONSHIP STAGE: Month 3 (~${signals.tenureDays} days shared). Natural familiarity has built up. Refer back to recent threads and ongoing projects.`
    : signals.tenureStage === 'year_2'
    ? `RELATIONSHIP STAGE: Year 2 (~${signals.tenureDays} days shared). Deep continuity. You know their rhythms, long-term aspirations, and repeated habits.`
    : `RELATIONSHIP STAGE: Long-term continuity (~${signals.tenureDays} days shared). Deep shared history. Never announce your memory—prove it by understanding them effortlessly.`;

  const systemInstruction = `
${IZA_IDENTITY_INTERNAL}

${IZA_SPOKEN_VOICE}

CURRENT INTERACTION SIGNALS:
- Time of Day: ${signals.timeOfDay}
- User Energy: ${signals.userEnergy} (Keep unknown as unknown, do not presume)
- Session Gap: ${signals.sessionGap}
- Interaction Energy Target: ${signals.interactionEnergy.toFixed(2)} (0.0=gentle/brief, 1.0=energetic)
- Memory Depth: ${signals.memoryDepth} (0=present only, 1=recent, 2=meaningful older, 3=deep life arc)
${tenureNote}

${memoryContextInjection}
`.trim();

  return {
    systemInstruction,
    signals,
    suggestedOpening: opening,
    surfacedMemories,
  };
}
