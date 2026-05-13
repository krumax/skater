-- Migration: 014_spiellisten_rls_claimed_players
-- Allows authenticated users to READ spiellisten from sessions where they have
-- a claimed slot (session_players row with their user_id).
-- This policy grants SELECT-only access — no INSERT/UPDATE/DELETE.
--
-- Note: Existing RLS policies on `rounds` (010) and `sessions` (011) already
-- grant SELECT to claimed players using the same pattern. This migration
-- extends that pattern to `spiellisten` for consistency.

CREATE POLICY "Claimed players can read spiellisten"
  ON spiellisten FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_players sp
      WHERE sp.session_id = spiellisten.session_id
        AND sp.user_id = auth.uid()
    )
  );
