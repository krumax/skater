-- Migration: Add UNIQUE constraint on (session_id, display_name) to session_players
-- This ensures each player name maps to at most one row per session.
-- Preserves existing constraints: UNIQUE(session_id, slot_index), UNIQUE(session_id, user_id)

-- Add UNIQUE constraint on (session_id, display_name)
ALTER TABLE session_players ADD CONSTRAINT session_players_session_display_name_unique
  UNIQUE (session_id, display_name);

-- Add index for display_name lookups
CREATE INDEX IF NOT EXISTS idx_session_players_display_name
  ON session_players(session_id, display_name);
