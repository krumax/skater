ALTER TABLE rounds ADD COLUMN IF NOT EXISTS schneider_announced boolean NOT NULL DEFAULT false;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS schwarz_announced boolean NOT NULL DEFAULT false;
