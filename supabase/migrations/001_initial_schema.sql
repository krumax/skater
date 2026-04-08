-- Migration: 001_initial_schema
-- Vollständiges Schema inkl. aller späteren Erweiterungen (003–006).
-- Für eine Neuinstallation reicht es, nur dieses Skript auszuführen.
-- Führe es im Supabase SQL-Editor aus.

-- sessions
CREATE TABLE IF NOT EXISTS sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seating       jsonb NOT NULL,
  geber_index   integer NOT NULL DEFAULT 0,
  current_round integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  table_name    text                                  -- 006: optionaler Tischname
);

-- rounds
CREATE TABLE IF NOT EXISTS rounds (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  round_number         integer NOT NULL,
  player               text NOT NULL,
  game_type            text NOT NULL,
  type_label           text NOT NULL,
  game_value           integer NOT NULL,
  base_value           integer NOT NULL,
  multiplier           integer NOT NULL,
  won                  boolean NOT NULL,
  eye_count            integer NOT NULL DEFAULT 0,
  spitzen              integer NOT NULL DEFAULT 1,
  hand                 boolean NOT NULL DEFAULT false,
  schneider            boolean NOT NULL DEFAULT false,
  schneider_announced  boolean NOT NULL DEFAULT false, -- 005
  schwarz              boolean NOT NULL DEFAULT false,
  schwarz_announced    boolean NOT NULL DEFAULT false, -- 005
  ouvert               boolean NOT NULL DEFAULT false,
  is_bock              boolean NOT NULL DEFAULT false, -- 003
  mit_ohne             text    NOT NULL DEFAULT 'mit', -- 004
  roles                jsonb,
  seeger_scores        jsonb,
  timestamp            timestamptz NOT NULL DEFAULT now()
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
