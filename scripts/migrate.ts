import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const pool = new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_ADMIN_USER || process.env.SQL_USER,
    password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
  });
  console.log(`Connecting to Cloud SQL as ${process.env.SQL_ADMIN_USER || process.env.SQL_USER}...`);

  const ddlStatements = [
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
    `CREATE EXTENSION IF NOT EXISTS vector;`,

    // 1. Daily Pulse table
    `CREATE TABLE IF NOT EXISTS daily_pulse (
      id          text primary key default gen_random_uuid()::text,
      pulse_date  date not null default current_date,
      summary     text not null,
      priorities  text[] not null default '{}',
      med_status  text not null default 'All Active Items',
      created_at  timestamptz not null default now()
    );`,
    `ALTER TABLE daily_pulse ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;`,

    // 2. Memory enhancements (summary, is_archived, source, pinned)
    `ALTER TABLE memory
      ADD COLUMN IF NOT EXISTS summary text,
      ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS source text DEFAULT 'web',
      ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;`,

    // 3. Attachment enhancements (ocr_text, visual_summary, embedding)
    `ALTER TABLE attachment 
      ADD COLUMN IF NOT EXISTS ocr_text text,
      ADD COLUMN IF NOT EXISTS visual_summary text,
      ADD COLUMN IF NOT EXISTS embedding vector(768);`,

    `CREATE INDEX IF NOT EXISTS attachment_embedding_hnsw 
      ON attachment USING hnsw (embedding vector_cosine_ops);`,

    // 4. Link table enhancements (source_type, relation, confidence, entity, src_memory)
    `ALTER TABLE link 
      ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'auto',
      ADD COLUMN IF NOT EXISTS relation text DEFAULT 'mentions',
      ADD COLUMN IF NOT EXISTS confidence real DEFAULT 0.85,
      ADD COLUMN IF NOT EXISTS entity integer,
      ADD COLUMN IF NOT EXISTS src_memory integer;`,

    // Sync foreign key alias columns if null
    `UPDATE link SET entity = target_entity_id WHERE entity IS NULL AND target_entity_id IS NOT NULL;`,
    `UPDATE link SET src_memory = source_memory_id WHERE src_memory IS NULL AND source_memory_id IS NOT NULL;`,

    // 5. Entity enhancements (etype alias)
    `ALTER TABLE entity
      ADD COLUMN IF NOT EXISTS etype text DEFAULT 'person';`,
    `UPDATE entity SET etype = entity_type WHERE etype IS NULL OR etype = 'person';`,

    // 6. Medication table
    `CREATE TABLE IF NOT EXISTS medication (
      id serial primary key,
      name text not null,
      dose text default '',
      times text[] default '{}',
      stopped_on timestamptz,
      created_at timestamptz not null default now()
    );`,

    // 7. Checkin table
    `CREATE TABLE IF NOT EXISTS checkin (
      id serial primary key,
      at timestamptz not null default now(),
      note text default 'Heartbeat verified'
    );`,

    // 8. User ownership columns (user_id) for Per-User Data Isolation
    `ALTER TABLE memory ADD COLUMN IF NOT EXISTS user_id text DEFAULT 'sovereign_user' NOT NULL;`,
    `ALTER TABLE daily_pulse ADD COLUMN IF NOT EXISTS user_id text DEFAULT 'sovereign_user' NOT NULL;`,
    `ALTER TABLE entity ADD COLUMN IF NOT EXISTS user_id text DEFAULT 'sovereign_user' NOT NULL;`,
    `ALTER TABLE link ADD COLUMN IF NOT EXISTS user_id text DEFAULT 'sovereign_user' NOT NULL;`,
    `ALTER TABLE attachment ADD COLUMN IF NOT EXISTS user_id text DEFAULT 'sovereign_user' NOT NULL;`,
    `ALTER TABLE medication ADD COLUMN IF NOT EXISTS user_id text DEFAULT 'sovereign_user' NOT NULL;`,
    `ALTER TABLE checkin ADD COLUMN IF NOT EXISTS user_id text DEFAULT 'sovereign_user' NOT NULL;`,
    `ALTER TABLE secret ADD COLUMN IF NOT EXISTS user_id text DEFAULT 'sovereign_user' NOT NULL;`,
    `ALTER TABLE circle_member ADD COLUMN IF NOT EXISTS user_id text DEFAULT 'sovereign_user' NOT NULL;`,
    `ALTER TABLE checkin_log ADD COLUMN IF NOT EXISTS user_id text DEFAULT 'sovereign_user' NOT NULL;`,

    // User ownership indexes
    `CREATE INDEX IF NOT EXISTS idx_memory_user_id ON memory(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_daily_pulse_user_id ON daily_pulse(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_entity_user_id ON entity(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_attachment_user_id ON attachment(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_secret_user_id ON secret(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_circle_member_user_id ON circle_member(user_id);`,

    // 9. Enable Row-Level Security (RLS) on user-scoped tables
    `ALTER TABLE memory ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE daily_pulse ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE entity ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE link ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE attachment ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE medication ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE checkin ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE secret ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE circle_member ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE checkin_log ENABLE ROW LEVEL SECURITY;`,

    // 10. Create RLS Isolation Policies
    `DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'memory' AND policyname = 'user_isolation_policy') THEN
        CREATE POLICY user_isolation_policy ON memory
          FOR ALL
          USING (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          )
          WITH CHECK (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          );
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_pulse' AND policyname = 'user_isolation_policy') THEN
        CREATE POLICY user_isolation_policy ON daily_pulse
          FOR ALL
          USING (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          )
          WITH CHECK (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          );
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'entity' AND policyname = 'user_isolation_policy') THEN
        CREATE POLICY user_isolation_policy ON entity
          FOR ALL
          USING (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          )
          WITH CHECK (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          );
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'secret' AND policyname = 'user_isolation_policy') THEN
        CREATE POLICY user_isolation_policy ON secret
          FOR ALL
          USING (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          )
          WITH CHECK (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          );
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'circle_member' AND policyname = 'user_isolation_policy') THEN
        CREATE POLICY user_isolation_policy ON circle_member
          FOR ALL
          USING (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          )
          WITH CHECK (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          );
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attachment' AND policyname = 'user_isolation_policy') THEN
        CREATE POLICY user_isolation_policy ON attachment
          FOR ALL
          USING (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          )
          WITH CHECK (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          );
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'link' AND policyname = 'user_isolation_policy') THEN
        CREATE POLICY user_isolation_policy ON link
          FOR ALL
          USING (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          )
          WITH CHECK (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          );
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'medication' AND policyname = 'user_isolation_policy') THEN
        CREATE POLICY user_isolation_policy ON medication
          FOR ALL
          USING (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          )
          WITH CHECK (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          );
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'checkin' AND policyname = 'user_isolation_policy') THEN
        CREATE POLICY user_isolation_policy ON checkin
          FOR ALL
          USING (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          )
          WITH CHECK (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          );
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'checkin_log' AND policyname = 'user_isolation_policy') THEN
        CREATE POLICY user_isolation_policy ON checkin_log
          FOR ALL
          USING (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          )
          WITH CHECK (
            user_id = NULLIF(current_setting('app.current_user_id', true), '')
            OR user_id = 'sovereign_user'
            OR current_setting('app.current_user_id', true) IS NULL
          );
      END IF;
    END $$;`,

    // Entity per-user unique index to support ON CONFLICT (user_id, name)
    `ALTER TABLE entity DROP CONSTRAINT IF EXISTS entity_name_key CASCADE;`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_user_id_name ON entity(user_id, name);`,

    // Vector Search Function recall() strictly scoped to p_user_id
    `CREATE OR REPLACE FUNCTION recall(
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
    $$;`,

    // Grant schema and table access to app user
    `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${process.env.SQL_USER || 'ai_studio_app_user'};`,
    `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${process.env.SQL_USER || 'ai_studio_app_user'};`,
  ];

  for (const sql of ddlStatements) {
    try {
      await pool.query(sql);
      console.log('Executed:', sql.trim().split('\n')[0]);
    } catch (err: any) {
      console.warn('Notice executing SQL:', err.message);
    }
  }

  console.log('All migrations applied successfully.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
