CREATE TABLE "attachment" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'sovereign_user' NOT NULL,
	"memory_id" bigint,
	"file_path" text DEFAULT 'attachment' NOT NULL,
	"mime_type" text DEFAULT 'image/jpeg' NOT NULL,
	"ocr_text" text,
	"visual_summary" text,
	"embedding" vector(768),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "checkin" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'sovereign_user' NOT NULL,
	"at" timestamp with time zone DEFAULT now(),
	"note" text DEFAULT 'Heartbeat verified'
);
--> statement-breakpoint
CREATE TABLE "checkin_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'sovereign_user' NOT NULL,
	"note" text DEFAULT 'all good',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "circle_member" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'sovereign_user' NOT NULL,
	"name" text NOT NULL,
	"relation" text DEFAULT 'Trusted' NOT NULL,
	"email" text DEFAULT '',
	"phone" text DEFAULT '',
	"webhook_url" text DEFAULT '',
	"is_escalation" boolean DEFAULT false,
	"status" text DEFAULT 'SYNCED',
	"last_contact_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_pulse" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'sovereign_user' NOT NULL,
	"pulse_date" timestamp with time zone DEFAULT now(),
	"summary" text NOT NULL,
	"priorities" text[] DEFAULT '{}',
	"med_status" text DEFAULT 'All Active Items' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entity" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'sovereign_user' NOT NULL,
	"name" text NOT NULL,
	"entity_type" text DEFAULT 'person' NOT NULL,
	"etype" text DEFAULT 'person' NOT NULL,
	"aka" text[] DEFAULT '{}',
	"notes" text DEFAULT '',
	"embedding" vector(768),
	"meta" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "entity_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "link" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'sovereign_user' NOT NULL,
	"source_memory_id" bigint,
	"target_memory_id" bigint,
	"target_entity_id" integer,
	"relationship" text DEFAULT 'mentions' NOT NULL,
	"relation" text DEFAULT 'mentions' NOT NULL,
	"confidence" real DEFAULT 0.85,
	"source_type" text DEFAULT 'auto',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "medication" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'sovereign_user' NOT NULL,
	"name" text NOT NULL,
	"dose" text DEFAULT '',
	"times" text[] DEFAULT '{}',
	"stopped_on" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "memory" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'sovereign_user' NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"kind" text DEFAULT 'note' NOT NULL,
	"salience" real DEFAULT 0.5 NOT NULL,
	"source" text DEFAULT 'web',
	"pinned" boolean DEFAULT false,
	"is_archived" boolean DEFAULT false,
	"embedding" vector(768),
	"meta" jsonb DEFAULT '{}'::jsonb,
	"occurred_at" timestamp with time zone DEFAULT now(),
	"captured_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "secret" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT 'sovereign_user' NOT NULL,
	"label" text NOT NULL,
	"ciphertext" text NOT NULL,
	"salt" text NOT NULL,
	"nonce" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "secret_label_unique" UNIQUE("label")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_memory_id_memory_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_source_memory_id_memory_id_fk" FOREIGN KEY ("source_memory_id") REFERENCES "public"."memory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_target_memory_id_memory_id_fk" FOREIGN KEY ("target_memory_id") REFERENCES "public"."memory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_target_entity_id_entity_id_fk" FOREIGN KEY ("target_entity_id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE no action;