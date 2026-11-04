-- 001_per_user_scope
-- Adds an owner (Firebase uid) to every user-data table so each user only sees their own data.
--
-- Rows that exist before this migration have user_id NULL. They are hidden from every user
-- until they are claimed. To claim legacy rows for one account, run (replace the uid):
--   UPDATE memory SET user_id = 'FIREBASE_UID' WHERE user_id IS NULL;
-- and the same for each table below.

BEGIN;

ALTER TABLE memory        ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE entity        ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE link          ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE attachment    ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE checkin_log   ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE secret        ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE circle_member ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE daily_pulse   ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE medication    ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE checkin       ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_memory_user_id        ON memory (user_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_user_id        ON entity (user_id);
CREATE INDEX IF NOT EXISTS idx_link_user_id          ON link (user_id);
CREATE INDEX IF NOT EXISTS idx_attachment_user_id    ON attachment (user_id);
CREATE INDEX IF NOT EXISTS idx_checkin_log_user_id   ON checkin_log (user_id);
CREATE INDEX IF NOT EXISTS idx_secret_user_id        ON secret (user_id);
CREATE INDEX IF NOT EXISTS idx_circle_member_user_id ON circle_member (user_id);
CREATE INDEX IF NOT EXISTS idx_medication_user_id ON medication (user_id);
CREATE INDEX IF NOT EXISTS idx_checkin_user_id ON checkin (user_id);

-- Names and labels are unique per user, not across the whole database.
-- The application must use ON CONFLICT (user_id, name) and (user_id, label) after this runs.
ALTER TABLE entity DROP CONSTRAINT IF EXISTS entity_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS entity_user_name ON entity (user_id, name);
ALTER TABLE secret DROP CONSTRAINT IF EXISTS secret_label_key;
CREATE UNIQUE INDEX IF NOT EXISTS secret_user_label ON secret (user_id, label);

-- One daily pulse per user per day, instead of one for the whole database.
ALTER TABLE daily_pulse DROP CONSTRAINT IF EXISTS daily_pulse_pulse_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS daily_pulse_user_date ON daily_pulse (user_id, pulse_date);

COMMIT;
