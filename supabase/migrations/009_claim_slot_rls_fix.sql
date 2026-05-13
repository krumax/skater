-- Migration: 009_claim_slot_rls_fix
-- Adds an RLS policy that allows any authenticated user to UPDATE a session_players
-- row where user_id IS NULL, setting it to their own auth.uid().
-- This is needed for the claim flow: the row may have been pre-created by the
-- session creator with user_id = NULL, and the claiming user needs to set it.

CREATE POLICY "Auth claim unclaimed session_players slot"
  ON session_players FOR UPDATE TO authenticated
  USING (
    user_id IS NULL
  )
  WITH CHECK (
    user_id = auth.uid()
  );
