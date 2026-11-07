-- IZA Vault Phase 0 Schema
-- Sovereign Human Identity & Memory Blueprint

CREATE EXTENSION IF NOT EXISTS vector;

-- Users (Firebase Auth synchronization)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uid TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- The Atom: Memory
-- Raw text is never overwritten. Async embedding.
CREATE TABLE IF NOT EXISTS memory (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'sovereign_user',
    content TEXT NOT NULL,
    summary TEXT,
    kind TEXT NOT NULL DEFAULT 'note',
    salience REAL NOT NULL DEFAULT 0.5,
    source TEXT DEFAULT 'web',
    pinned BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    embedding VECTOR(768),
    meta JSONB DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    captured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS memory_user_idx ON memory (user_id);
CREATE INDEX IF NOT EXISTS memory_captured_idx ON memory (captured_at DESC);
CREATE INDEX IF NOT EXISTS memory_occurred_idx ON memory (occurred_at DESC);
CREATE INDEX IF NOT EXISTS memory_kind_idx ON memory (kind);

-- Entities: Durable recurring people, places, orgs, objects
CREATE TABLE IF NOT EXISTS entity (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'sovereign_user',
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL DEFAULT 'person',
    etype TEXT NOT NULL DEFAULT 'person',
    aka TEXT[] DEFAULT '{}',
    notes TEXT DEFAULT '',
    embedding VECTOR(768),
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS entity_user_idx ON entity (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_user_id_name ON entity(user_id, name);

-- Links: Lightweight graph edges (memory -> entity, memory -> memory)
CREATE TABLE IF NOT EXISTS link (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'sovereign_user',
    source_memory_id BIGINT REFERENCES memory(id) ON DELETE CASCADE,
    target_memory_id BIGINT REFERENCES memory(id) ON DELETE CASCADE,
    target_entity_id INT REFERENCES entity(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL DEFAULT 'mentions',
    relation TEXT NOT NULL DEFAULT 'mentions',
    confidence REAL DEFAULT 0.85,
    source_type TEXT DEFAULT 'auto',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS link_user_idx ON link (user_id);

-- Attachments: Binary/media tied to memories
CREATE TABLE IF NOT EXISTS attachment (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'sovereign_user',
    memory_id BIGINT REFERENCES memory(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL DEFAULT 'attachment',
    mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
    ocr_text TEXT,
    visual_summary TEXT,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS attachment_user_idx ON attachment (user_id);

-- Daily Pulse: Periodic reflection & time-of-day health/wellness state
CREATE TABLE IF NOT EXISTS daily_pulse (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL DEFAULT 'sovereign_user',
    pulse_date TIMESTAMPTZ DEFAULT NOW(),
    summary TEXT NOT NULL,
    priorities TEXT[] DEFAULT '{}',
    med_status TEXT NOT NULL DEFAULT 'All Active Items',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS daily_pulse_user_idx ON daily_pulse (user_id);

-- Continuity Secrets: PINs, cards, sensitive medical
-- CIPHERTEXT ONLY. Key derived via Argon2id. Never embedded in vector store.
CREATE TABLE IF NOT EXISTS secret (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'sovereign_user',
    label TEXT NOT NULL UNIQUE,
    ciphertext TEXT NOT NULL,
    salt TEXT NOT NULL,
    nonce TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS secret_user_idx ON secret (user_id);

-- The Circle: Trusted human support network
CREATE TABLE IF NOT EXISTS circle_member (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'sovereign_user',
    name TEXT NOT NULL,
    relation TEXT NOT NULL DEFAULT 'Trusted',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    webhook_url TEXT DEFAULT '',
    is_escalation BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'SYNCED',
    last_contact_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS circle_member_user_idx ON circle_member (user_id);

-- Heartbeat check-in logs
CREATE TABLE IF NOT EXISTS checkin_log (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'sovereign_user',
    note TEXT DEFAULT 'all good',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS checkin_log_user_idx ON checkin_log (user_id);

-- Row-Level Security (RLS) Enablement
ALTER TABLE memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_pulse ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity ENABLE ROW LEVEL SECURITY;
ALTER TABLE link ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachment ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_log ENABLE ROW LEVEL SECURITY;

-- Hybrid Recall function: score = w_sim * similarity + w_recency * recency + w_salience * salience
CREATE OR REPLACE FUNCTION recall(
    query_vector VECTOR(768),
    w_sim FLOAT DEFAULT 0.6,
    w_recency FLOAT DEFAULT 0.25,
    w_salience FLOAT DEFAULT 0.15,
    match_limit INT DEFAULT 10,
    p_user_id TEXT DEFAULT 'sovereign_user'
)
RETURNS TABLE (
    id BIGINT,
    content TEXT,
    kind TEXT,
    salience REAL,
    similarity FLOAT,
    recency FLOAT,
    total_score FLOAT,
    captured_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        m.id,
        m.content,
        m.kind,
        m.salience,
        (1.0 - (m.embedding <=> query_vector)) AS similarity,
        EXP(-EXTRACT(EPOCH FROM (NOW() - COALESCE(m.occurred_at, m.captured_at))) / (180.0 * 86400.0)) AS recency,
        (
            (w_sim * (1.0 - (m.embedding <=> query_vector))) +
            (w_recency * EXP(-EXTRACT(EPOCH FROM (NOW() - COALESCE(m.occurred_at, m.captured_at))) / (180.0 * 86400.0))) +
            (w_salience * m.salience)
        ) AS total_score,
        m.captured_at
    FROM memory m
    WHERE m.embedding IS NOT NULL
      AND m.user_id = p_user_id
    ORDER BY total_score DESC
    LIMIT match_limit;
$$;
