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

  const { data: rounds, error: roundsError } = await supabase
    .from('rounds')
    .select('*')
    .eq('session_id', sessionId)
    .order('round_number', { ascending: true });

  if (roundsError) return { data: null, error: roundsError };

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
