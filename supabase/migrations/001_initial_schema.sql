-- Migration: 001_initial_schema
-- Führe dieses Skript im Supabase SQL-Editor aus.

-- sessions
CREATE TABLE IF NOT EXISTS sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seating       jsonb NOT NULL,
  geber_index   integer NOT NULL DEFAULT 0,
  current_round integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- rounds
CREATE TABLE IF NOT EXISTS rounds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  round_number  integer NOT NULL,
  player        text NOT NULL,
  game_type     text NOT NULL,
  type_label    text NOT NULL,
  game_value    integer NOT NULL,
  base_value    integer NOT NULL,
  multiplier    integer NOT NULL,
  won           boolean NOT NULL,
  eye_count     integer NOT NULL DEFAULT 0,
  spitzen       integer NOT NULL DEFAULT 1,
  hand          boolean NOT NULL DEFAULT false,
  schneider     boolean NOT NULL DEFAULT false,
  schwarz       boolean NOT NULL DEFAULT false,
  ouvert        boolean NOT NULL DEFAULT false,
  roles         jsonb,
  seeger_scores jsonb,
  timestamp     timestamptz NOT NULL DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;

-- Policies für anonymen Lese-/Schreibzugriff
CREATE POLICY "Anon read/write sessions"
  ON sessions FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon read/write rounds"
  ON rounds FOR ALL TO anon
  USING (true) WITH CHECK (true);
