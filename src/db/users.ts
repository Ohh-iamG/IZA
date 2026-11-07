import { db } from './index.ts';
import { users, memory, secret, circleMember, entity, link, attachment, checkinLog } from './schema.ts';
import { eq, desc, ilike, sql, and } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('getOrCreateUser error:', error);
    throw new Error('Database operation failed.', { cause: error });
  }
}

// ---------------------------------------------------------------------------
// Memory Operations - Strictly Scoped to userId
// ---------------------------------------------------------------------------

export async function getMemories(firstArg: string | number = 'sovereign_user', secondArg = 50) {
  const userId = typeof firstArg === 'string' ? firstArg : 'sovereign_user';
  const limit = typeof firstArg === 'number' ? firstArg : secondArg;

  try {
    return await db
      .select()
      .from(memory)
      .where(eq(memory.userId, userId))
      .orderBy(desc(memory.capturedAt))
      .limit(limit);
  } catch (error) {
    console.error('getMemories error:', error);
    throw new Error('Database query failed.', { cause: error });
  }
}

export async function searchMemories(firstArg: string, secondArg?: string | number, thirdArg = 50) {
  // Support both (userId, query, limit) and (query, limit)
  let userId = 'sovereign_user';
  let query = '';
  let limit = 50;

  if (typeof secondArg === 'string') {
    userId = firstArg;
    query = secondArg;
    limit = thirdArg;
  } else {
    query = firstArg;
    limit = typeof secondArg === 'number' ? secondArg : 50;
  }

  try {
    return await db
      .select()
      .from(memory)
      .where(
        and(
          eq(memory.userId, userId),
          ilike(memory.content, `%${query}%`)
        )
      )
      .orderBy(desc(memory.capturedAt))
      .limit(limit);
  } catch (error) {
    console.error('searchMemories error:', error);
    throw new Error('Database search failed.', { cause: error });
  }
}

export async function insertMemory(
  first: string,
  second: string = 'note',
  third: string | number = 0.5,
  fourth: number | Record<string, any> = {},
  fifth?: Record<string, any>
) {
  let userId = 'sovereign_user';
  let content = first;
  let kind = 'note';
  let salience = 0.5;
  let meta: Record<string, any> = {};

  if (typeof fourth === 'number') {
    // Called as: insertMemory(userId, content, kind, salience, meta)
    userId = first;
    content = second;
    kind = String(third || 'note');
    salience = fourth;
    meta = fifth || {};
  } else if (typeof fifth === 'object') {
    userId = first;
    content = second;
    kind = String(third || 'note');
    salience = typeof fourth === 'number' ? fourth : 0.5;
    meta = fifth || {};
  } else if (typeof third === 'string' && typeof fourth === 'object') {
    // Called as: insertMemory(userId, content, kind, meta)
    userId = first;
    content = second;
    kind = third;
    salience = 0.5;
    meta = (fourth as Record<string, any>) || {};
  } else {
    // Called as legacy: insertMemory(content, kind, salience, meta)
    content = first;
    kind = second;
    salience = typeof third === 'number' ? third : 0.5;
    meta = (fourth as Record<string, any>) || {};
    if (meta.userId) {
      userId = meta.userId;
    }
  }

  try {
    const result = await db.insert(memory).values({
      userId,
      content,
      kind,
      salience,
      meta,
    }).returning();
    return result[0];
  } catch (error) {
    console.error('insertMemory error:', error);
    throw new Error('Failed to insert memory.', { cause: error });
  }
}

export async function insertBatchMemories(
  first: string | Array<{ content: string; kind?: string; salience?: number; meta?: any; capturedAt?: string }>,
  maybeItems?: Array<{ content: string; kind?: string; salience?: number; meta?: any; capturedAt?: string }>
) {
  const userId = typeof first === 'string' ? first : 'sovereign_user';
  const items = Array.isArray(first) ? first : (maybeItems || []);

  try {
    if (!items || items.length === 0) return [];
    const valuesToInsert = items.map(item => ({
      userId,
      content: item.content,
      kind: item.kind || 'note',
      salience: item.salience ?? 0.5,
      meta: item.meta || {},
      capturedAt: item.capturedAt ? new Date(item.capturedAt) : new Date(),
    }));
    return await db.insert(memory).values(valuesToInsert).returning();
  } catch (error) {
    console.error('insertBatchMemories error:', error);
    throw new Error('Failed to insert batch memories.', { cause: error });
  }
}

export async function deleteMemory(first: number | string, maybeId?: number) {
  const userId = typeof first === 'string' ? first : 'sovereign_user';
  const id = typeof first === 'number' ? first : maybeId;

  try {
    if (!id || isNaN(id) || !Number.isSafeInteger(id)) {
      return null;
    }
    const result = await db
      .delete(memory)
      .where(and(eq(memory.id, id), eq(memory.userId, userId)))
      .returning();
    return result[0] || null;
  } catch (error) {
    console.warn('deleteMemory warning:', error);
    return null;
  }
}

export async function deleteMemoriesByQuery(first: string, maybeQuery?: string) {
  const userId = maybeQuery ? first : 'sovereign_user';
  const query = maybeQuery ? maybeQuery : first;

  try {
    const clean = query.trim();
    if (!clean) return { count: 0, deleted: [] };
    const condition = and(
      eq(memory.userId, userId),
      ilike(memory.content, `%${clean}%`)
    );
    const deleted = await db
      .delete(memory)
      .where(condition)
      .returning({ id: memory.id, content: memory.content });
    return { count: deleted.length, deleted };
  } catch (error) {
    console.error('deleteMemoriesByQuery error:', error);
    throw new Error('Failed to delete memories by query.', { cause: error });
  }
}

// ---------------------------------------------------------------------------
// Memory Enrichment & Entity Knowledge Graph
// ---------------------------------------------------------------------------

export async function getUnenrichedMemories(userId = 'sovereign_user', limitCount = 20) {
  try {
    return await db
      .select()
      .from(memory)
      .where(
        and(
          eq(memory.userId, userId),
          sql`(${memory.meta}->>'enriched') IS NULL OR (${memory.meta}->>'enriched') = 'false'`
        )
      )
      .orderBy(desc(memory.capturedAt))
      .limit(limitCount);
  } catch (error) {
    console.error('getUnenrichedMemories error:', error);
    return [];
  }
}

export async function updateMemoryEnrichment(
  first: number | string,
  second: number | string,
  third?: string | number,
  fourth?: number | Record<string, any>,
  fifth?: Record<string, any>
) {
  let userId = 'sovereign_user';
  let id = 0;
  let summary = '';
  let salience = 0.75;
  let metaUpdates: Record<string, any> = {};

  if (typeof first === 'string' && typeof second === 'number') {
    userId = first;
    id = second;
    summary = String(third || '');
    salience = typeof fourth === 'number' ? fourth : 0.75;
    metaUpdates = fifth || {};
  } else {
    id = Number(first);
    summary = String(second || '');
    salience = typeof third === 'number' ? third : 0.75;
    metaUpdates = (fourth as Record<string, any>) || {};
  }

  try {
    const current = await db
      .select()
      .from(memory)
      .where(and(eq(memory.id, id), eq(memory.userId, userId)))
      .limit(1);

    if (current.length === 0) return null;

    const existingMeta = (current[0]?.meta as Record<string, any>) || {};
    const mergedMeta = {
      ...existingMeta,
      ...metaUpdates,
      summary,
      enriched: true,
      enrichedAt: new Date().toISOString(),
    };

    const result = await db
      .update(memory)
      .set({
        summary,
        salience,
        meta: mergedMeta,
      })
      .where(and(eq(memory.id, id), eq(memory.userId, userId)))
      .returning();

    return result[0];
  } catch (error) {
    console.error('updateMemoryEnrichment error:', error);
    throw error;
  }
}

export async function upsertEntity(
  first: string,
  second = 'concept',
  third: string[] | string = [],
  fourth: string = '',
  fifth: string = 'sovereign_user'
) {
  let userId = 'sovereign_user';
  let name = first;
  let entityType = second;
  let aka: string[] = Array.isArray(third) ? third : [];
  let notes = fourth;

  // Support (userId, name, entityType, aka, notes)
  if (typeof third === 'string' && !Array.isArray(third)) {
    userId = first;
    name = second;
    entityType = third;
    aka = Array.isArray(fourth) ? (fourth as any) : [];
    notes = fifth;
  } else if (fifth && fifth !== 'sovereign_user') {
    userId = fifth;
  }

  try {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const existing = await db
      .select()
      .from(entity)
      .where(and(eq(entity.userId, userId), ilike(entity.name, trimmed)))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const inserted = await db
      .insert(entity)
      .values({
        userId,
        name: trimmed,
        entityType,
        aka,
        notes,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('upsertEntity error:', error);
    return null;
  }
}

export async function createLink(
  first: number | string,
  second: number,
  third: string | number = 'mentions',
  fourth: string = 'sovereign_user'
) {
  let userId = 'sovereign_user';
  let sourceMemoryId = 0;
  let targetEntityId = 0;
  let relationship = 'mentions';

  if (typeof first === 'string') {
    userId = first;
    sourceMemoryId = second;
    targetEntityId = typeof third === 'number' ? third : 0;
    relationship = fourth;
  } else {
    sourceMemoryId = first;
    targetEntityId = second;
    relationship = typeof third === 'string' ? third : 'mentions';
    userId = fourth;
  }

  try {
    const inserted = await db
      .insert(link)
      .values({
        userId,
        sourceMemoryId,
        targetEntityId,
        relationship,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('createLink error:', error);
    return null;
  }
}

export async function getAllEntities(userId = 'sovereign_user') {
  try {
    return await db
      .select()
      .from(entity)
      .where(eq(entity.userId, userId))
      .orderBy(desc(entity.createdAt));
  } catch (error) {
    console.error('getAllEntities error:', error);
    return [];
  }
}

export async function getEntityTimeline(first: number | string, maybeId?: number) {
  const userId = typeof first === 'string' ? first : 'sovereign_user';
  const entityId = typeof first === 'number' ? first : maybeId!;

  try {
    const entityRecord = await db
      .select()
      .from(entity)
      .where(and(eq(entity.id, entityId), eq(entity.userId, userId)))
      .limit(1);

    if (entityRecord.length === 0) return { entity: null, timeline: [] };

    const links = await db
      .select()
      .from(link)
      .where(and(eq(link.targetEntityId, entityId), eq(link.userId, userId)));

    const memoryIds = links.map(l => l.sourceMemoryId).filter(Boolean) as number[];

    let linkedMemories: any[] = [];
    if (memoryIds.length > 0) {
      linkedMemories = await db
        .select()
        .from(memory)
        .where(
          and(
            eq(memory.userId, userId),
            sql`${memory.id} IN (${sql.join(memoryIds.map(id => sql`${id}`), sql`, `)})`
          )
        )
        .orderBy(desc(memory.capturedAt));
    }

    return {
      entity: entityRecord[0],
      timeline: linkedMemories.map(m => ({
        ...m,
        relationship: links.find(l => l.sourceMemoryId === m.id)?.relationship || 'mentions',
      })),
    };
  } catch (error) {
    console.error('getEntityTimeline error:', error);
    return { entity: null, timeline: [] };
  }
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export async function insertAttachment(
  first: number | string,
  second: number | string,
  third: string,
  fourth?: string
) {
  let userId = 'sovereign_user';
  let memoryId = 0;
  let filePath = '';
  let mimeType = 'image/jpeg';

  if (typeof first === 'string') {
    userId = first;
    memoryId = Number(second);
    filePath = third;
    mimeType = fourth || 'image/jpeg';
  } else {
    memoryId = first;
    filePath = String(second);
    mimeType = third;
    userId = fourth || 'sovereign_user';
  }

  try {
    const result = await db.insert(attachment).values({
      userId,
      memoryId,
      filePath,
      mimeType,
    }).returning();
    return result[0];
  } catch (error) {
    console.error('insertAttachment error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Daily Pulse Data & Health Check-ins
// ---------------------------------------------------------------------------

export async function getDailyPulseData(userId = 'sovereign_user') {
  try {
    const recentMemories = await db
      .select()
      .from(memory)
      .where(
        and(
          eq(memory.userId, userId),
          sql`${memory.capturedAt} >= NOW() - INTERVAL '24 hours'`
        )
      )
      .orderBy(desc(memory.capturedAt))
      .limit(20);

    const checkins = await db
      .select()
      .from(checkinLog)
      .where(
        and(
          eq(checkinLog.userId, userId),
          sql`${checkinLog.createdAt} >= NOW() - INTERVAL '24 hours'`
        )
      )
      .orderBy(desc(checkinLog.createdAt))
      .limit(5);

    const highSalience = await db
      .select()
      .from(memory)
      .where(
        and(
          eq(memory.userId, userId),
          sql`${memory.salience} >= 0.7`
        )
      )
      .orderBy(desc(memory.capturedAt))
      .limit(5);

    return {
      recentMemories,
      checkins,
      highSalience,
    };
  } catch (error) {
    console.error('getDailyPulseData error:', error);
    return {
      recentMemories: [],
      checkins: [],
      highSalience: [],
    };
  }
}

export async function insertCheckin(first = 'Heartbeat verified', maybeUser?: string) {
  const userId = maybeUser || (first.startsWith('demo_') || first.startsWith('usr_') || first.length > 25 ? first : 'sovereign_user');
  const note = maybeUser ? first : (userId === first ? 'Heartbeat verified' : first);

  try {
    const result = await db.insert(checkinLog).values({ userId, note }).returning();
    return result[0];
  } catch (error) {
    console.error('insertCheckin error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Secrets & Circle Members
// ---------------------------------------------------------------------------

export async function getSecrets(userId = 'sovereign_user') {
  try {
    return await db
      .select()
      .from(secret)
      .where(eq(secret.userId, userId))
      .orderBy(desc(secret.createdAt));
  } catch (error) {
    console.error('getSecrets error:', error);
    throw new Error('Failed to fetch secrets.', { cause: error });
  }
}

export async function resetVaultSecrets(userId = 'sovereign_user') {
  try {
    const deleted = await db
      .delete(secret)
      .where(eq(secret.userId, userId))
      .returning();
    return { success: true, count: deleted.length };
  } catch (error) {
    console.error('resetVaultSecrets error:', error);
    throw new Error('Failed to reset vault secrets.', { cause: error });
  }
}

// RLS Policy Enforcer for Circles & Contacts
export const VALID_CIRCLES = ['family', 'friends', 'care', 'work'] as const;
export type ValidCircle = typeof VALID_CIRCLES[number];

export function normalizeCircle(raw: string): ValidCircle {
  const lower = (raw || '').toLowerCase().trim();
  if (VALID_CIRCLES.includes(lower as ValidCircle)) {
    return lower as ValidCircle;
  }
  return 'friends';
}

export async function getCircleMembers(userId = 'sovereign_user') {
  try {
    return await db
      .select()
      .from(circleMember)
      .where(eq(circleMember.userId, userId))
      .orderBy(desc(circleMember.lastContactAt));
  } catch (error) {
    console.error('getCircleMembers error:', error);
    throw new Error('Failed to fetch circle members.', { cause: error });
  }
}

export async function insertCircleMember(
  userId = 'sovereign_user',
  name: string,
  relation: string = 'Trusted',
  circle: string = 'friends',
  extra?: { email?: string; phone?: string; webhookUrl?: string; isEscalation?: boolean }
) {
  try {
    const validatedCircle = normalizeCircle(circle);
    const [inserted] = await db
      .insert(circleMember)
      .values({
        userId,
        name: name.trim(),
        relation: relation.trim() || 'Trusted',
        email: extra?.email || '',
        phone: extra?.phone || '',
        webhookUrl: extra?.webhookUrl || '',
        isEscalation: extra?.isEscalation || false,
        status: validatedCircle.toUpperCase(),
      })
      .returning();
    return inserted;
  } catch (error) {
    console.error('insertCircleMember error:', error);
    throw new Error('Failed to insert circle member.', { cause: error });
  }
}

export async function removeCircleMember(userId = 'sovereign_user', memberId: number) {
  try {
    const [deleted] = await db
      .delete(circleMember)
      .where(and(eq(circleMember.userId, userId), eq(circleMember.id, memberId)))
      .returning();
    return deleted;
  } catch (error) {
    console.error('removeCircleMember error:', error);
    throw new Error('Failed to remove circle member.', { cause: error });
  }
}

// ---------------------------------------------------------------------------
// Snapshots & Document RAG
// ---------------------------------------------------------------------------

export interface SnapshotInput {
  title: string;
  content: string;
  domain: 'sanctuary' | 'carer' | 'machinery' | 'creative';
  mood?: string;
  confidence?: number;
  sourceChunk?: string;
  tags?: string[];
}

export async function createSnapshot(first: SnapshotInput | string, maybeInput?: SnapshotInput) {
  const userId = typeof first === 'string' ? first : 'sovereign_user';
  const input = typeof first === 'object' ? first : (maybeInput as SnapshotInput);

  try {
    const meta = {
      isSnapshot: true,
      userId,
      title: input.title,
      domain: input.domain || 'sanctuary',
      mood: input.mood || 'Focused & Grounded',
      confidence: input.confidence ?? 0.95,
      sourceChunk: input.sourceChunk || 'Sovereign Dialogue Session',
      tags: input.tags || [input.domain],
      spatialAnchor: getSpatialLabel(input.domain),
    };

    const formattedContent = `[${meta.spatialAnchor}]: ${input.title}\n${input.content}`;
    const result = await db.insert(memory).values({
      userId,
      content: formattedContent,
      summary: input.content.slice(0, 200),
      kind: 'snapshot',
      salience: 0.95,
      source: input.sourceChunk || 'snapshot_card',
      pinned: true,
      meta,
    }).returning();

    return result[0];
  } catch (error) {
    console.error('createSnapshot error:', error);
    throw new Error('Failed to create snapshot card.', { cause: error });
  }
}

function getSpatialLabel(domain: string): string {
  switch (domain) {
    case 'health':
    case 'carer': 
      return 'Carer & Support (Health & Care)';
    case 'work':
    case 'machinery': 
      return 'Work & Knowledge Store (Custom Document RAG)';
    case 'study':
    case 'creative': 
      return 'Study & Reference Files';
    case 'personal':
    case 'sanctuary':
    default: 
      return 'Personal Vault (Life & Reflection)';
  }
}

export async function getSnapshots(first?: string, second?: string) {
  let userId = 'sovereign_user';
  let domainFilter: string | undefined = undefined;

  if (second !== undefined) {
    userId = first || 'sovereign_user';
    domainFilter = second;
  } else {
    userId = first || 'sovereign_user';
  }

  try {
    const all = await db
      .select()
      .from(memory)
      .where(eq(memory.userId, userId))
      .orderBy(desc(memory.capturedAt))
      .limit(100);

    return all.filter((m) => {
      const meta = (m.meta || {}) as any;
      if (domainFilter && domainFilter !== 'all') {
        const normFilter = domainFilter === 'carer' ? 'health' : domainFilter === 'machinery' ? 'work' : domainFilter;
        const normDomain = meta.domain === 'carer' ? 'health' : meta.domain === 'machinery' ? 'work' : meta.domain === 'sanctuary' ? 'personal' : meta.domain;
        return normDomain === normFilter;
      }
      return meta.isSnapshot === true || m.kind === 'snapshot' || meta.domain !== undefined;
    });
  } catch (error) {
    console.error('getSnapshots error:', error);
    throw new Error('Failed to fetch snapshots.', { cause: error });
  }
}

export interface DocumentInput {
  title: string;
  content: string;
  domain: 'personal' | 'health' | 'work' | 'study';
  fileName?: string;
  chunkCount?: number;
  meta?: Record<string, any>;
}

export async function insertDocument(first: DocumentInput | string, maybeDoc?: DocumentInput) {
  const userId = typeof first === 'string' ? first : 'sovereign_user';
  const doc = typeof first === 'object' ? first : (maybeDoc as DocumentInput);

  try {
    const meta = {
      isDocument: true,
      userId,
      domain: doc.domain,
      fileName: doc.fileName || `${doc.title}.pdf`,
      chunkCount: doc.chunkCount || 1,
      sourceChunk: `${doc.fileName || doc.title} §1`,
      spatialAnchor: getSpatialLabel(doc.domain),
      ...(doc.meta || {}),
    };

    const formattedContent = `[${meta.spatialAnchor}]: ${doc.title}\n${doc.content}`;
    const result = await db.insert(memory).values({
      userId,
      content: formattedContent,
      summary: doc.content.slice(0, 250),
      kind: 'document',
      salience: 0.9,
      source: doc.fileName || 'custom_document_rag',
      pinned: false,
      meta,
    }).returning();

    return result[0];
  } catch (error) {
    console.error('insertDocument error:', error);
    throw new Error('Failed to insert document.', { cause: error });
  }
}

export async function searchUniversal(first: string, second = 'all', third?: string) {
  let userId = 'sovereign_user';
  let queryText = first;
  let domainFilter = second;

  if (third !== undefined) {
    userId = first;
    queryText = second;
    domainFilter = third;
  }

  try {
    const memories = await db
      .select()
      .from(memory)
      .where(eq(memory.userId, userId))
      .orderBy(desc(memory.capturedAt))
      .limit(100);

    const q = queryText.toLowerCase().trim();

    return memories.filter((m) => {
      const meta = (m.meta || {}) as any;
      const mDomain = meta.domain || (m.kind === 'document' ? 'work' : 'personal');

      if (domainFilter !== 'all') {
        const normFilter = domainFilter === 'carer' ? 'health' : domainFilter === 'machinery' ? 'work' : domainFilter;
        const normDomain = mDomain === 'carer' ? 'health' : mDomain === 'machinery' ? 'work' : mDomain === 'sanctuary' ? 'personal' : mDomain;
        if (normDomain !== normFilter) return false;
      }

      if (!q) return true;
      const content = m.content.toLowerCase();
      const title = (meta.title || '').toLowerCase();
      const source = (m.source || '').toLowerCase();
      return content.includes(q) || title.includes(q) || source.includes(q);
    }).map((m) => {
      const meta = (m.meta || {}) as any;
      const rawDomain = meta.domain || 'personal';
      const normDomain = (rawDomain === 'carer' ? 'health' : rawDomain === 'machinery' ? 'work' : rawDomain === 'sanctuary' ? 'personal' : rawDomain) as 'personal' | 'health' | 'work' | 'study';

      return {
        id: m.id,
        userId: m.userId,
        content: m.content,
        summary: m.summary || m.content.slice(0, 200),
        kind: m.kind,
        domain: normDomain,
        domainLabel: getSpatialLabel(normDomain),
        sourceChunk: meta.sourceChunk || m.source || 'Vault Chunk §1',
        confidence: meta.confidence || 0.95,
        title: meta.title || m.content.split('\n')[0].replace(/^\[.*?\]:\s*/, ''),
        capturedAt: m.capturedAt,
      };
    });
  } catch (error) {
    console.error('searchUniversal error:', error);
    throw new Error('Universal search failed.', { cause: error });
  }
}
