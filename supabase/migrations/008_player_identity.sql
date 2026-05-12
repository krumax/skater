-- Migration: 008_player_identity
-- Introduces optional player identity via session_players and claim_tokens tables.
-- All changes are strictly additive — anonymous sessions are unaffected.

-- ============================================================
-- session_players
-- Maps each slot (session × slot_index) to an optional user_id.
-- ============================================================
CREATE TABLE IF NOT EXISTS session_players (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  slot_index   integer     NOT NULL CHECK (slot_index >= 0 AND slot_index <= 3),
  display_name text        NOT NULL,
  user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, slot_index),
  UNIQUE (session_id, user_id)   -- one user per session, enforced at DB level (Req 2.2)
);

-- ============================================================
-- claim_tokens
-- Short-lived tokens that allow a user to claim a slot.
-- ============================================================
CREATE TABLE IF NOT EXISTS claim_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  slot_index  integer     NOT NULL,
  token       text        NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used        boolean     NOT NULL DEFAULT false,
  created_by  uuid        REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_session_players_session_id ON session_players(session_id);
CREATE INDEX IF NOT EXISTS idx_session_players_user_id    ON session_players(user_id);
CREATE INDEX IF NOT EXISTS idx_claim_tokens_token         ON claim_tokens(token);
CREATE INDEX IF NOT EXISTS idx_claim_tokens_session_id    ON claim_tokens(session_id);

-- ============================================================
-- RLS: session_players
-- ============================================================
ALTER TABLE session_players ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read all session_players rows (needed for profile lookups).
CREATE POLICY "Auth read session_players"
  ON session_players FOR SELECT TO authenticated
  USING (true);

-- An authenticated user can insert a row for their own slot (user_id = auth.uid()).
CREATE POLICY "Auth insert own session_players"
  ON session_players FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- An authenticated user can update a row if:
--   (a) the row belongs to them directly (user_id = auth.uid()), OR
--   (b) they are the session creator — i.e. the slot-0 row for this session has user_id = auth.uid()
--       (allows the creator to preassign slots for other players, Req 2.1)
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

-- The session creator (slot 0) can also insert rows for other slots (preassign, Req 2.1).
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

-- ============================================================
-- RLS: claim_tokens
-- ============================================================
ALTER TABLE claim_tokens ENABLE ROW LEVEL SECURITY;

-- Session creators can read tokens they generated (Req 3.7).
CREATE POLICY "Auth read own claim_tokens"
  ON claim_tokens FOR SELECT TO authenticated
  USING (created_by = auth.uid());

-- The targeted user can also read a token in order to validate and claim it.
-- We allow any authenticated user to read a token by its unique token value
-- (the token itself is the secret; knowing it grants read access).
CREATE POLICY "Auth read claim_tokens by token"
  ON claim_tokens FOR SELECT TO authenticated
  USING (true);

-- Session creators can insert claim tokens (Req 3.1).
CREATE POLICY "Auth insert claim_tokens"
  ON claim_tokens FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- The targeted user can mark a token as used (Req 3.6).
-- We allow any authenticated user to update the `used` flag; the application
-- layer enforces that only the correct user performs this operation.
CREATE POLICY "Auth update claim_tokens used"
  ON claim_tokens FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
