-- Migration: 001_initial_schema
-- Vollständiges Schema inkl. aller späteren Erweiterungen (003–006, 20260418).
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

-- spiellisten (20260418: Spiellisten-Feature)
CREATE TABLE IF NOT EXISTS spiellisten (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (char_length(name) <= 40),
  round_count     INTEGER NOT NULL CHECK (round_count >= 3 AND round_count <= 36 AND round_count % 3 = 0),
  status          TEXT NOT NULL DEFAULT 'aktiv' CHECK (status IN ('aktiv', 'abgeschlossen')),
  winner          TEXT[] DEFAULT NULL,
  last_touched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id         UUID REFERENCES auth.users(id)
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
  timestamp            timestamptz NOT NULL DEFAULT now(),
  spielliste_id        uuid REFERENCES spiellisten(id) ON DELETE SET NULL -- 20260418
);

-- RLS aktivieren
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE spiellisten ENABLE ROW LEVEL SECURITY;

-- Policies für anonymen Lese-/Schreibzugriff
CREATE POLICY "Anon read/write sessions"
  ON sessions FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon read/write rounds"
  ON rounds FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon read/write spiellisten"
  ON spiellisten FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Auth read/write spiellisten"
  ON spiellisten FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_spiellisten_session_id ON spiellisten(session_id);
CREATE INDEX IF NOT EXISTS idx_rounds_spielliste_id ON rounds(spielliste_id);
