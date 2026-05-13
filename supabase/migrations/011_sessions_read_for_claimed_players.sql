-- Migration: 011_sessions_read_for_claimed_players
-- Allows authenticated users to READ sessions where they have a claimed slot
-- OR where they hold a valid (unused, unexpired) claim token.
-- The token-based access is needed because during the claim flow, the
-- session_players row doesn't exist yet when we need to read the seating array.

CREATE POLICY "Claimed players can read sessions"
  ON sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_players sp
      WHERE sp.session_id = sessions.id
        AND sp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM claim_tokens ct
      WHERE ct.session_id = sessions.id
        AND ct.used = false
        AND ct.expires_at > now()
    )
  );
