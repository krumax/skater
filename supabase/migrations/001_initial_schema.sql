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

-- session_players (008: optionale Spieleridentität, 013: UNIQUE display_name)
CREATE TABLE IF NOT EXISTS session_players (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  slot_index   integer     NOT NULL CHECK (slot_index >= 0 AND slot_index <= 3),
  display_name text        NOT NULL,
  user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, slot_index),
  UNIQUE (session_id, user_id),
  CONSTRAINT session_players_session_display_name_unique UNIQUE (session_id, display_name)  -- 013
);

-- claim_tokens (008: Einladungslinks für Slot-Claiming, 012: display_name statt slot_index)
CREATE TABLE IF NOT EXISTS claim_tokens (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  slot_index   integer,                                       -- 012: nullable (legacy)
  display_name text,                                          -- 012: Ziel-Spielername
  token        text        NOT NULL UNIQUE,
  expires_at   timestamptz NOT NULL,
  used         boolean     NOT NULL DEFAULT false,
  created_by   uuid        REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT claim_tokens_has_target
    CHECK (display_name IS NOT NULL OR slot_index IS NOT NULL),
  CONSTRAINT claim_tokens_display_name_length
    CHECK (display_name IS NULL OR char_length(display_name) <= 50)
);

-- RLS aktivieren
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE spiellisten ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_tokens ENABLE ROW LEVEL SECURITY;

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

-- 014: Claimed players can read spiellisten for their linked sessions
CREATE POLICY "Claimed players can read spiellisten"
  ON spiellisten FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_players sp
      WHERE sp.session_id = spiellisten.session_id
        AND sp.user_id = auth.uid()
    )
  );

-- Policies für session_players (008)
CREATE POLICY "Auth read session_players"
  ON session_players FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Auth insert own session_players"
  ON session_players FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Auth creator insert session_players"
  ON session_players FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM session_players sp0
      WHERE sp0.session_id = session_players.session_id
        AND sp0.slot_index = 0
        AND sp0.user_id = auth.uid()
    )
  );

CREATE POLICY "Auth update own or creator session_players"
  ON session_players FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM session_players sp0
      WHERE sp0.session_id = session_players.session_id
        AND sp0.slot_index = 0
        AND sp0.user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM session_players sp0
      WHERE sp0.session_id = session_players.session_id
        AND sp0.slot_index = 0
        AND sp0.user_id = auth.uid()
    )
  );

-- Policies für claim_tokens (008)
CREATE POLICY "Auth read claim_tokens by token"
  ON claim_tokens FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Auth insert claim_tokens"
  ON claim_tokens FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Auth update claim_tokens used"
  ON claim_tokens FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_spiellisten_session_id ON spiellisten(session_id);
CREATE INDEX IF NOT EXISTS idx_rounds_spielliste_id ON rounds(spielliste_id);
CREATE INDEX IF NOT EXISTS idx_session_players_session_id ON session_players(session_id);
CREATE INDEX IF NOT EXISTS idx_session_players_user_id    ON session_players(user_id);
CREATE INDEX IF NOT EXISTS idx_session_players_display_name ON session_players(session_id, display_name);  -- 013
CREATE INDEX IF NOT EXISTS idx_claim_tokens_token         ON claim_tokens(token);
CREATE INDEX IF NOT EXISTS idx_claim_tokens_session_id    ON claim_tokens(session_id);
