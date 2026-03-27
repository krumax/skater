import { supabase } from './supabaseClient';

/**
 * Creates a new session in Supabase.
 * @param {string[]} seating - Array of player names in seating order
 * @returns {{ data: session, error }}
 */
export async function createSession(seating) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ seating, geber_index: 0, current_round: 1 })
    .select()
    .single();
  return { data, error };
}

/**
 * Loads a session and all its rounds from Supabase.
 * @param {string} sessionId - UUID of the session
 * @returns {{ data: { session, rounds }, error }}
 */
export async function loadSession(sessionId) {
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError) return { data: null, error: sessionError };

  const { data: rawRounds, error: roundsError } = await supabase
    .from('rounds')
    .select('*')
    .eq('session_id', sessionId)
    .order('round_number', { ascending: true });

  if (roundsError) return { data: null, error: roundsError };

  // Map snake_case DB columns → camelCase fields expected by the UI
  const rounds = rawRounds.map(r => ({
    id:           r.round_number,
    player:       r.player,
    gameType:     r.game_type,
    typeLabel:    r.type_label,
    gameValue:    r.game_value,
    baseValue:    r.base_value,
    multiplier:   r.multiplier,
    won:          r.won,
    eyeCount:     r.eye_count,
    spitzen:      r.spitzen,
    hand:         r.hand,
    schneider:    r.schneider,
    schwarz:      r.schwarz,
    ouvert:       r.ouvert,
    roles:        r.roles,
    seegerScores: r.seeger_scores,
    timestamp:    r.timestamp,
    // keep the DB id available if needed
    _dbId:        r.id,
    session_id:   r.session_id,
  }));

  return { data: { session, rounds }, error: null };
}

/**
 * Inserts a round record into Supabase, mapping camelCase fields to snake_case columns.
 * @param {object} round - Round object from local state
 * @param {string} sessionId - UUID of the session
 * @returns {{ data, error }}
 */
export async function insertRound(round, sessionId) {
  const { data, error } = await supabase
    .from('rounds')
    .insert({
      session_id:   sessionId,
      round_number: round.id,
      player:       round.player,
      game_type:    round.gameType,
      type_label:   round.typeLabel,
      game_value:   round.gameValue,
      base_value:   round.baseValue,
      multiplier:   round.multiplier,
      won:          round.won,
      eye_count:    round.eyeCount ?? 0,
      spitzen:      round.spitzen ?? 1,
      hand:         round.hand ?? false,
      schneider:    round.schneider ?? false,
      schwarz:      round.schwarz ?? false,
      ouvert:       round.ouvert ?? false,
      roles:        round.roles ?? null,
      seeger_scores: round.seegerScores ?? null,
      timestamp:    round.timestamp ?? new Date().toISOString(),
    })
    .select()
    .single();
  return { data, error };
}

/**
 * Updates a session record with the given patch object.
 * @param {string} sessionId - UUID of the session
 * @param {object} patch - Fields to update (snake_case)
 * @returns {{ data, error }}
 */
export async function updateSession(sessionId, patch) {
  const { data, error } = await supabase
    .from('sessions')
    .update(patch)
    .eq('id', sessionId)
    .select()
    .single();
  return { data, error };
}

/**
 * Updates the seating array for a session in Supabase.
 * @param {string} sessionId - UUID of the session
 * @param {string[]} seating - New seating order
 * @returns {{ data, error }}
 */
export async function updateSeating(sessionId, seating) {
  const { data, error } = await supabase
    .from('sessions')
    .update({ seating })
    .eq('id', sessionId)
    .select()
    .single();
  return { data, error };
}

/**
 * Lists all sessions ordered by creation date (newest first).
 * @returns {{ data: session[], error }}
 */
export async function listSessions() {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, seating, geber_index, current_round, created_at')
    .order('created_at', { ascending: false });
  return { data, error };
}

/**
 * Updates only the game-type-related fields of a round.
 * @param {string} roundDbId - The UUID of the round row (r._dbId)
 * @param {object} patch - { game_type, type_label, hand, ouvert, schneider, schwarz, spitzen }
 * @returns {{ data, error }}
 */
export async function updateRound(roundDbId, patch) {
  const allowed = ['game_type', 'type_label', 'hand', 'ouvert', 'schneider', 'schwarz', 'spitzen'];
  const safePatch = Object.fromEntries(
    Object.entries(patch).filter(([k]) => allowed.includes(k))
  );
  const { data, error } = await supabase
    .from('rounds')
    .update(safePatch)
    .eq('id', roundDbId)
    .select()
    .single();
  return { data, error };
}

/**
 * Deletes a single round by its DB UUID.
 * @param {string} roundDbId - The UUID of the round row (r._dbId)
 * @returns {{ error }}
 */
export async function deleteRound(roundDbId) {
  const { error } = await supabase
    .from('rounds')
    .delete()
    .eq('id', roundDbId);
  return { error };
}

/**
 * Deletes a session and all its rounds (ON DELETE CASCADE) from Supabase.
 * @param {string} sessionId
 * @returns {{ error }}
 */
export async function deleteSession(sessionId) {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId);
  return { error };
}
