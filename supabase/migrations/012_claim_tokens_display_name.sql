-- Migration: 012_claim_tokens_display_name
-- Adds display_name column to claim_tokens and makes slot_index nullable.
-- This enables name-based claiming instead of position-based claiming.
-- All changes are additive — existing rows and RLS policies remain intact.

-- Add display_name column (nullable, max 50 chars)
ALTER TABLE claim_tokens ADD COLUMN display_name text;

ALTER TABLE claim_tokens ADD CONSTRAINT claim_tokens_display_name_length
  CHECK (display_name IS NULL OR char_length(display_name) <= 50);

-- Make slot_index nullable (was NOT NULL)
ALTER TABLE claim_tokens ALTER COLUMN slot_index DROP NOT NULL;

-- Ensure at least one of display_name or slot_index is set
ALTER TABLE claim_tokens ADD CONSTRAINT claim_tokens_has_target
  CHECK (display_name IS NOT NULL OR slot_index IS NOT NULL);
