-- Add optional table name to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS table_name text;
