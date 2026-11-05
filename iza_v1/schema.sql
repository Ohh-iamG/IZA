-- ============================================================================
--  IZA VAULT v1 - schema
--  Postgres 14+ with pgvector. Local Docker, Railway, or Supabase.
--  Idempotent: safe to run again. Applied by `iza init`.
--
--  Vector dimension is fixed to the embedding model (768 = bge-base-en-v1.5).
--  Changing model dimension: change every vector(768), run `iza init`,
--  then `iza reembed`. Raw text is kept forever, so nothing is lost.
-- ============================================================================

create extension if not exists vector;
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists iza_meta (
    key   text primary key,
    value text not null
);

-- ---------------------------------------------------------------------------
--  shared trigger: keep updated_at honest
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end $$;

-- ---------------------------------------------------------------------------
--  memory : the atom. Raw text is immutable (enforced by trigger).
--  pinned = never fades with time (medical facts, identity anchors).
-- ---------------------------------------------------------------------------
create table if not exists memory (
    id           uuid primary key default gen_random_uuid(),
    kind         text not null default 'note',
    content      text not null check (length(btrim(content)) > 0),
    summary      text,
    embedding    vector(768),
    occurred_at  timestamptz,
    captured_at  timestamptz not null default now(),
    source       text not null default 'manual',
    salience     real not null default 0.5 check (salience between 0 and 1),
    pinned       boolean not null default false,
    meta         jsonb not null default '{}'::jsonb,
    is_archived  boolean not null default false
);

create or replace function protect_memory_content() returns trigger
language plpgsql as $$
begin
    if new.content is distinct from old.content then
        raise exception 'memory.content is immutable (capture a new memory instead)';
    end if;
    return new;
end $$;

drop trigger if exists memory_content_immutable on memory;
create trigger memory_content_immutable before update on memory
    for each row execute function protect_memory_content();

-- ---------------------------------------------------------------------------
--  entity : people, places, things, orgs, clinicians.
-- ---------------------------------------------------------------------------
create table if not exists entity (
    id          uuid primary key default gen_random_uuid(),
    etype       text not null default 'person',
    name        text not null,
    aka         text[] not null default '{}',
    embedding   vector(768),
    notes       text,
    meta        jsonb not null default '{}'::jsonb,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

drop trigger if exists entity_touch on entity;
create trigger entity_touch before update on entity
    for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
--  link : memory -> exactly one of (memory | entity). Approved by you.
-- ---------------------------------------------------------------------------
create table if not exists link (
    id          uuid primary key default gen_random_uuid(),
    src_memory  uuid not null references memory(id) on delete cascade,
    dst_memory  uuid references memory(id) on delete cascade,
    entity      uuid references entity(id) on delete cascade,
    relation    text not null default 'mentions',
    confidence  real check (confidence between 0 and 1),
    approved    boolean not null default true,
    created_at  timestamptz not null default now(),
    constraint one_target check ((dst_memory is not null)::int + (entity is not null)::int = 1)
);

create unique index if not exists link_unique
    on link (src_memory, coalesce(dst_memory, entity), relation);

-- ---------------------------------------------------------------------------
--  attachment : images / audio / scanned letters tied to a memory.
-- ---------------------------------------------------------------------------
create table if not exists attachment (
    id          uuid primary key default gen_random_uuid(),
    memory      uuid not null references memory(id) on delete cascade,
    media_type  text not null,
    uri         text,
    bytes       bytea,
    meta        jsonb not null default '{}'::jsonb,
    created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  vault_key : one row. A random master key, wrapped by your passphrase.
--  Recovery shares (2-of-3) rebuild the master key if the passphrase is lost.
--  backup_pk lets backups run unattended; only the master key can open them.
-- ---------------------------------------------------------------------------
create table if not exists vault_key (
    id               int primary key default 1 check (id = 1),
    kdf_salt         bytea not null,
    wrapped_master   bytea not null,
    master_check     bytea not null,
    backup_pk        bytea not null,
    wrapped_backup_sk bytea not null,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

drop trigger if exists vault_key_touch on vault_key;
create trigger vault_key_touch before update on vault_key
    for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
--  secret : continuity vault. CIPHERTEXT ONLY. No embedding column.
--           No path into recall(). Keep it that way.
-- ---------------------------------------------------------------------------
create table if not exists secret (
    id          uuid primary key default gen_random_uuid(),
    label       text not null unique,
    category    text not null default 'credential',
    ciphertext  bytea not null,
    hint        text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

drop trigger if exists secret_touch on secret;
create trigger secret_touch before update on secret
    for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
--  MEDICAL LAYER. Plaintext on purpose: must open in an emergency, offline,
--  without the passphrase. Never put credentials here.
-- ---------------------------------------------------------------------------
create table if not exists health_fact (
    id          uuid primary key default gen_random_uuid(),
    category    text not null check (category in
                  ('allergy','condition','blood_group','contact','clinician','directive','note')),
    label       text not null,
    detail      text,
    severity    text,
    active      boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

drop trigger if exists health_fact_touch on health_fact;
create trigger health_fact_touch before update on health_fact
    for each row execute function touch_updated_at();

create table if not exists medication (
    id            uuid primary key default gen_random_uuid(),
    name          text not null,
    dose          text not null,
    times         text[] not null default '{}',   -- 'HH:MM' local time
    instructions  text,
    prescriber    text,
    started_on    date not null default current_date,
    stopped_on    date,
    stop_reason   text,
    supply_until  date,
    notes         text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    check (stopped_on is null or stopped_on >= started_on)
);

create unique index if not exists medication_one_active
    on medication (lower(name)) where stopped_on is null;

drop trigger if exists medication_touch on medication;
create trigger medication_touch before update on medication
    for each row execute function touch_updated_at();

create table if not exists dose_log (
    id             uuid primary key default gen_random_uuid(),
    medication     uuid not null references medication(id) on delete cascade,
    slot           text,                          -- the 'HH:MM' it satisfies
    for_date       date not null default current_date,
    status         text not null default 'taken' check (status in ('taken','skipped')),
    logged_at      timestamptz not null default now(),
    note           text
);

create unique index if not exists dose_log_slot
    on dose_log (medication, for_date, slot) where slot is not null;

-- ---------------------------------------------------------------------------
--  Indexes
-- ---------------------------------------------------------------------------
create index if not exists memory_embedding_hnsw on memory using hnsw (embedding vector_cosine_ops);
create index if not exists entity_embedding_hnsw on entity using hnsw (embedding vector_cosine_ops);
create index if not exists memory_when_idx       on memory ((coalesce(occurred_at, captured_at)) desc);
create index if not exists memory_kind_idx       on memory (kind);
create index if not exists memory_pending_idx    on memory (captured_at) where embedding is null;
create index if not exists memory_meta_gin       on memory using gin (meta);
create index if not exists entity_name_trgm      on entity using gin (name gin_trgm_ops);
create index if not exists link_entity_idx       on link (entity);
create index if not exists link_src_idx          on link (src_memory);
create index if not exists dose_log_date_idx     on dose_log (for_date desc);

-- ---------------------------------------------------------------------------
--  recall() : similarity + recency + salience.
--  recency = exp(-age / 180 days)  -> halves roughly every 125 days.
--  pinned memories always score recency 1.0 (medical facts never fade).
--  Full scan by design: fine for a personal vault into the hundreds of
--  thousands of rows; exact, and respects every filter.
-- ---------------------------------------------------------------------------
create or replace function recall(
    q_embedding    vector(768),
    q_limit        int          default 12,
    filter_kind    text         default null,
    filter_entity  uuid         default null,
    after_ts       timestamptz  default null,
    before_ts      timestamptz  default null,
    w_sim          real         default 0.60,
    w_recency      real         default 0.25,
    w_salience     real         default 0.15
)
returns table (
    id          uuid,
    kind        text,
    content     text,
    summary     text,
    occurred_at timestamptz,
    captured_at timestamptz,
    pinned      boolean,
    similarity  real,
    score       real
)
language sql stable as $$
    with base as (
        select
            m.id, m.kind, m.content, m.summary, m.occurred_at, m.captured_at,
            m.pinned, m.salience,
            (1 - (m.embedding <=> q_embedding))::real as similarity,
            case when m.pinned then 1.0
                 else exp( - greatest(extract(epoch from (now() - coalesce(m.occurred_at, m.captured_at))), 0)
                           / (180 * 86400.0))
            end::real as recency
        from memory m
        where m.embedding is not null
          and not m.is_archived
          and (filter_kind   is null or m.kind = filter_kind)
          and (after_ts      is null or coalesce(m.occurred_at, m.captured_at) >= after_ts)
          and (before_ts     is null or coalesce(m.occurred_at, m.captured_at) <  before_ts)
          and (filter_entity is null or exists (
                 select 1 from link l
                 where l.src_memory = m.id and l.entity = filter_entity and l.approved))
    )
    select b.id, b.kind, b.content, b.summary, b.occurred_at, b.captured_at, b.pinned,
           b.similarity,
           (w_sim * b.similarity + w_recency * b.recency + w_salience * b.salience)::real as score
    from base b
    order by score desc
    limit q_limit;
$$;

-- ---------------------------------------------------------------------------
--  resolve_entity() : candidates only. The app NEVER auto-merges;
--  you confirm. Medication/clinician names are never fuzzy-merged.
-- ---------------------------------------------------------------------------
create or replace function resolve_entity(q_name text, q_limit int default 5)
returns table (id uuid, etype text, name text, sim real)
language sql stable as $$
    select e.id, e.etype, e.name,
           greatest(
               similarity(e.name, q_name),
               coalesce((select max(similarity(a, q_name)) from unnest(e.aka) a), 0)
           )::real as sim
    from entity e
    where e.name % q_name
       or lower(e.name) = lower(q_name)
       or exists (select 1 from unnest(e.aka) a where a % q_name or lower(a) = lower(q_name))
    order by sim desc
    limit q_limit;
$$;

-- ---------------------------------------------------------------------------
--  CONFIDANT : conversation threads. Raw dialogue, separate from the curated
--  vault. Things worth keeping are promoted into memory with /save.
-- ---------------------------------------------------------------------------
create table if not exists conversation (
    id          uuid primary key default gen_random_uuid(),
    title       text,
    summary     text,
    started_at  timestamptz not null default now(),
    last_at     timestamptz not null default now()
);

create table if not exists turn (
    id            uuid primary key default gen_random_uuid(),
    conversation  uuid not null references conversation(id) on delete cascade,
    role          text not null check (role in ('user','assistant')),
    content       text not null,
    embedding     vector(768),
    created_at    timestamptz not null default now()
);

create index if not exists turn_embedding_hnsw on turn using hnsw (embedding vector_cosine_ops);
create index if not exists turn_convo_idx       on turn (conversation, created_at);

create or replace function recall_turns(
    q_embedding           vector(768),
    q_limit               int   default 6,
    exclude_conversation  uuid  default null,
    w_sim                 real  default 0.70,
    w_recency             real  default 0.30
)
returns table (id uuid, conversation uuid, role text, content text,
               created_at timestamptz, score real)
language sql stable as $$
    select t.id, t.conversation, t.role, t.content, t.created_at,
           ( w_sim * (1 - (t.embedding <=> q_embedding))
             + w_recency * exp( - greatest(extract(epoch from (now() - t.created_at)), 0)
                                  / (90 * 86400.0)) )::real as score
    from turn t
    where t.embedding is not null
      and (exclude_conversation is null or t.conversation <> exclude_conversation)
    order by score desc
    limit q_limit;
$$;

-- ---------------------------------------------------------------------------
--  CIRCLE : your people, real contact, check-ins and escalation rules.
-- ---------------------------------------------------------------------------
create table if not exists circle_member (
    id                 uuid primary key default gen_random_uuid(),
    name               text not null unique,
    relation           text,
    email              text,
    webhook            text,           -- ntfy topic URL, Discord/Slack webhook
    phone              text,           -- shown on the emergency card; not used to send
    escalations        boolean not null default false,
    contact_every_days int,            -- nudge if longer than this without contact
    last_contact       timestamptz,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

drop trigger if exists circle_member_touch on circle_member;
create trigger circle_member_touch before update on circle_member
    for each row execute function touch_updated_at();

create table if not exists checkin (
    id     uuid primary key default gen_random_uuid(),
    at     timestamptz not null default now(),
    note   text
);

create index if not exists checkin_at_idx on checkin (at desc);

create table if not exists rule (
    id          uuid primary key default gen_random_uuid(),
    name        text not null unique,
    trigger     text not null check (trigger in ('no_checkin','missed_dose')),
    hours       real not null check (hours > 0),
    message     text not null,
    enabled     boolean not null default true,
    last_fired  timestamptz,
    created_at  timestamptz not null default now()
);

create table if not exists alert_log (
    id        uuid primary key default gen_random_uuid(),
    at        timestamptz not null default now(),
    kind      text not null,          -- sos | rule | test | reminder
    message   text not null,
    results   jsonb not null default '[]'::jsonb
);

-- ---------------------------------------------------------------------------
--  Row Level Security ON, with no policies.
--  On Supabase this blocks the public REST API (anon/authenticated keys)
--  from every table. Your direct connection as the table owner still works.
-- ---------------------------------------------------------------------------
alter table iza_meta     enable row level security;
alter table memory       enable row level security;
alter table entity       enable row level security;
alter table link         enable row level security;
alter table attachment   enable row level security;
alter table vault_key    enable row level security;
alter table secret       enable row level security;
alter table health_fact  enable row level security;
alter table medication   enable row level security;
alter table dose_log     enable row level security;
alter table conversation enable row level security;
alter table turn         enable row level security;
alter table circle_member enable row level security;
alter table checkin      enable row level security;
alter table rule         enable row level security;
alter table alert_log    enable row level security;

insert into iza_meta (key, value) values ('schema_version', '1')
    on conflict (key) do update set value = excluded.value;
