-- Migration: 010_rounds_read_for_claimed_players
-- Allows authenticated users to READ rounds from sessions where they have a
-- claimed slot (session_players row with their user_id).
-- Write access remains restricted to the session owner (existing policy).

CREATE POLICY "Claimed players can read rounds"
  ON rounds FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_players sp
      WHERE sp.session_id = rounds.session_id
        AND sp.user_id = auth.uid()
    )
  );
