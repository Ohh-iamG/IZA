import { pgTable, serial, bigserial, bigint, text, real, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Custom vector type for pgvector in Drizzle
import { customType } from 'drizzle-orm/pg-core';

export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(768)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value.replace(/^{|}$/g, (m) => (m === '{' ? '[' : ']')));
  },
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const memory = pgTable('memory', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: text('user_id').notNull().default('sovereign_user'),
  content: text('content').notNull(),
  summary: text('summary'),
  kind: text('kind').notNull().default('note'),
  salience: real('salience').notNull().default(0.5),
  source: text('source').default('web'),
  pinned: boolean('pinned').default(false),
  isArchived: boolean('is_archived').default(false),
  embedding: vector('embedding'),
  meta: jsonb('meta').default({}),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow(),
});

export const entity = pgTable('entity', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default('sovereign_user'),
  name: text('name').notNull(),
  entityType: text('entity_type').notNull().default('person'),
  etype: text('etype').notNull().default('person'),
  aka: text('aka').array().default([]),
  notes: text('notes').default(''),
  embedding: vector('embedding'),
  meta: jsonb('meta').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const link = pgTable('link', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default('sovereign_user'),
  sourceMemoryId: bigint('source_memory_id', { mode: 'number' }).references(() => memory.id, { onDelete: 'cascade' }),
  targetMemoryId: bigint('target_memory_id', { mode: 'number' }).references(() => memory.id, { onDelete: 'cascade' }),
  targetEntityId: integer('target_entity_id').references(() => entity.id, { onDelete: 'cascade' }),
  relationship: text('relationship').notNull().default('mentions'),
  relation: text('relation').notNull().default('mentions'),
  confidence: real('confidence').default(0.85),
  sourceType: text('source_type').default('auto'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const attachment = pgTable('attachment', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default('sovereign_user'),
  memoryId: bigint('memory_id', { mode: 'number' }).references(() => memory.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull().default('attachment'),
  mimeType: text('mime_type').notNull().default('image/jpeg'),
  ocrText: text('ocr_text'),
  visualSummary: text('visual_summary'),
  embedding: vector('embedding'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const dailyPulse = pgTable('daily_pulse', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().default('sovereign_user'),
  pulseDate: timestamp('pulse_date', { withTimezone: true }).defaultNow(),
  summary: text('summary').notNull(),
  priorities: text('priorities').array().default([]),
  medStatus: text('med_status').notNull().default('All Active Items'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const medication = pgTable('medication', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().default('sovereign_user'),
  name: text('name').notNull(),
  dose: text('dose').default(''),
  times: text('times').array().default([]),
  stoppedOn: timestamp('stopped_on', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const checkin = pgTable('checkin', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().default('sovereign_user'),
  at: timestamp('at', { withTimezone: true }).defaultNow(),
  note: text('note').default('Heartbeat verified'),
});

export const secret = pgTable('secret', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default('sovereign_user'),
  label: text('label').notNull().unique(),
  ciphertext: text('ciphertext').notNull(),
  salt: text('salt').notNull(),
  nonce: text('nonce').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const circleMember = pgTable('circle_member', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default('sovereign_user'),
  name: text('name').notNull(),
  relation: text('relation').notNull().default('Trusted'),
  email: text('email').default(''),
  phone: text('phone').default(''),
  webhookUrl: text('webhook_url').default(''),
  isEscalation: boolean('is_escalation').default(false),
  status: text('status').default('SYNCED'),
  lastContactAt: timestamp('last_contact_at', { withTimezone: true }).defaultNow(),
});

export const checkinLog = pgTable('checkin_log', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default('sovereign_user'),
  note: text('note').default('all good'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const memoryRelations = relations(memory, ({ many }) => ({
  links: many(link),
  attachments: many(attachment),
}));

export const entityRelations = relations(entity, ({ many }) => ({
  links: many(link),
}));

export const apiUsage = pgTable('api_usage', {
  requestId: text('request_id').primaryKey(),
  userId: text('user_id').notNull().default('sovereign_user'),
  agentId: text('agent_id').notNull().default('iza_master'),
  keyId: text('key_id').notNull().default('iza_key_default'),
  provider: text('provider').notNull().default('google_gemini'),
  service: text('service').notNull().default('gemini-3.8-flash'),
  endpoint: text('endpoint').notNull().default('/api/gemini/chat'),
  action: text('action').notNull().default('generateContent'),
  status: text('status').notNull().default('success'),
  statusCode: integer('status_code').default(200),
  latencyMs: integer('latency_ms').notNull().default(0),
  inputUnits: integer('input_units').notNull().default(0),
  outputUnits: integer('output_units').notNull().default(0),
  providerCost: real('provider_cost').notNull().default(0),
  customerCharge: real('customer_charge').notNull().default(0),
  application: text('application').default('iza_os'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const rateLimitTier = pgTable('rate_limit_tier', {
  tier: text('tier').primaryKey(),
  name: text('name').notNull(),
  requestsPerDay: integer('requests_per_day').notNull(),
  requestsPerMonth: integer('requests_per_month').notNull(),
  costPerThousandTokens: real('cost_per_thousand_tokens').notNull().default(0.002),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const userRateLimit = pgTable('user_rate_limit', {
  userId: text('user_id').primaryKey(),
  tier: text('tier').notNull().default('personal'),
  customDailyLimit: integer('custom_daily_limit'),
  customMonthlyLimit: integer('custom_monthly_limit'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const userRelationship = pgTable('user_relationship', {
  userId: text('user_id').primaryKey(),
  tenureStartedAt: timestamp('tenure_started_at', { withTimezone: true }).defaultNow(),
  lastInteractionAt: timestamp('last_interaction_at', { withTimezone: true }).defaultNow(),
  interactionCount: integer('interaction_count').notNull().default(0),
  firstIntroductionGiven: boolean('first_introduction_given').notNull().default(false),
  lastEnergy: text('last_energy').default('normal'),
  lastContext: text('last_context').default('unknown'),
  lastMemorySurfacedId: bigint('last_memory_surfaced_id', { mode: 'number' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
