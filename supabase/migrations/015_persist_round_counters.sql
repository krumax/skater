-- 015: Persist round counters per table/session.
-- The counters are intentionally separate from the rounds history because the
-- UI reset starts a new counting series without deleting recorded games.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS round_counter_deals integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS round_counter_step integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bock_rounds_left integer NOT NULL DEFAULT 0;

-- Existing localStorage counters cannot be assigned safely to a session. The
-- number of recorded rounds is the only reliable value for existing tables.
UPDATE sessions AS s
SET round_counter_deals = counts.deal_count,
    round_counter_step = COALESCE(s.geber_index, 0)
FROM (
  SELECT session_id, COUNT(*)::integer AS deal_count
  FROM rounds
  GROUP BY session_id
) AS counts
WHERE s.id = counts.session_id;

-- Empty/legacy sessions still get a sensible position from the persisted
-- dealer index. The Bock counter remains at its safe default of zero because
-- the old browser-only value cannot be attributed to a specific table.
UPDATE sessions
SET round_counter_step = COALESCE(geber_index, 0)
WHERE round_counter_deals = 0;
