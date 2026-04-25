import { supabase } from './supabaseClient';
import { calculateSeegerFabian } from './skatScoring';

// --- OFFLINE QUEUE LOGIC ---
const QUEUE_KEY = 'skat_offline_queue';

export function getOfflineQueue() {
  if (typeof localStorage === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } 
  catch(e) { return []; }
}
function setOfflineQueue(q) { 
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); 
  }
}
function enqueueAction(action, payload) {
  const q = getOfflineQueue();
  q.push({ id: Date.now().toString() + Math.random().toString(), action, payload, timestamp: Date.now() });
  setOfflineQueue(q);
}

export async function processOfflineQueue() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const q = getOfflineQueue();
  if (q.length === 0) return;

  console.log(`Processing ${q.length} offline actions...`);
  const remaining = [];
  let failed = false;

  for (const item of q) {
    if (failed) { remaining.push(item); continue; }
    try {
      let err = null;
      if (item.action === 'insertRound') {
        const { error } = await _doInsertRound(item.payload.round, item.payload.sessionId);
        err = error;
      } else if (item.action === 'updateRound') {
        // Skip updates on temporary offline items
        if (item.payload.roundDbId.startsWith('offline_')) continue;
        const { error } = await _doUpdateRound(item.payload.roundDbId, item.payload.patch);
        err = error;
      } else if (item.action === 'deleteRound') {
        if (item.payload.roundDbId.startsWith('offline_')) continue;
        const { error } = await _doDeleteRound(item.payload.roundDbId);
        err = error;
      } else if (item.action === 'updateSession') {
        const { error } = await _doUpdateSession(item.payload.sessionId, item.payload.patch);
        err = error;
      } else if (item.action === 'updateSeating') {
        const { error } = await _doUpdateSeating(item.payload.sessionId, item.payload.seating);
        err = error;
      } else if (item.action === 'createSpielliste') {
        const { error } = await _doCreateSpielliste(item.payload.spielliste, item.payload.sessionId);
        err = error;
      } else if (item.action === 'closeSpielliste') {
        const { error } = await _doCloseSpielliste(item.payload.spiellisteId, item.payload.winner);
        err = error;
      } else if (item.action === 'setActiveSpielliste') {
        const { error } = await _doSetActiveSpiellisteTimestamp(item.payload.spiellisteId);
        err = error;
      }

      if (err && err.message && (err.message.toLowerCase().includes('fetch') || err.message.toLowerCase().includes('network'))) {
        failed = true;
        remaining.push(item);
      }
    } catch(err) {
      failed = true;
      remaining.push(item);
    }
  }
  setOfflineQueue(remaining);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', processOfflineQueue);
  // Try to process once on boot
  setTimeout(processOfflineQueue, 2000);
}
// ---------------------------

/** Holt die user_id der aktuellen Session - null wenn nicht eingeloggt */
async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

/**
 * Creates a new session in Supabase.
 */
export async function createSession(seating, tableName = '') {
  // Session creation requires internet
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('sessions')
    .insert({ seating, geber_index: 0, current_round: 1, table_name: tableName || null, user_id })
    .select()
    .single();

  if (error && error.message?.includes('table_name')) {
    return await supabase
      .from('sessions')
      .insert({ seating, geber_index: 0, current_round: 1, user_id })
      .select()
      .single();
  }

  return { data, error };
}

/**
 * Loads a session and all its rounds from Supabase.
 */
export async function loadSession(sessionId) {
  // Loading also requires internet
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

  const rounds = rawRounds.map(r => {
    const recomputedSeeger = calculateSeegerFabian({
      declarer:   r.player,
      allPlayers: session.seating ?? [],
      gameValue:  r.game_value,
      won:        r.won,
    });
    return {
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
      schneider:            r.schneider,
      schneiderAnnounced:   r.schneider_announced ?? false,
      schwarz:              r.schwarz,
      schwarzAnnounced:     r.schwarz_announced ?? false,
      ouvert:       r.ouvert,
      roles:        r.roles,
      seegerScores: recomputedSeeger,
      timestamp:    r.timestamp,
      isBock:       r.is_bock ?? false,
      mitOhne:      r.mit_ohne ?? 'mit',
      _dbId:        r.id,
      session_id:   r.session_id,
      spiellisteId: r.spielliste_id ?? null,
    };
  });

  // Load spiellisten for this session
  const { data: rawSpiellisten, error: spiellistenError } = await supabase
    .from('spiellisten')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (spiellistenError) return { data: null, error: spiellistenError };

  const spiellisten = (rawSpiellisten || []).map(s => ({
    id:            s.id,
    sessionId:     s.session_id,
    name:          s.name,
    roundCount:    s.round_count,
    status:        s.status,
    winner:        s.winner ?? null,
    lastTouchedAt: s.last_touched_at,
    createdAt:     s.created_at,
    userId:        s.user_id,
  }));

  // Derive activeSpiellisteId: most recently touched active list
  const activeListen = spiellisten
    .filter(l => l.status === 'aktiv')
    .sort((a, b) => new Date(b.lastTouchedAt) - new Date(a.lastTouchedAt));
  const activeSpiellisteId = activeListen.length > 0 ? activeListen[0].id : null;

  return { data: { session, rounds, spiellisten, activeSpiellisteId }, error: null };
}

/**
 * Inserts a round record into Supabase (Offline-safeguarded)
 */
export async function insertRound(round, sessionId) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    enqueueAction('insertRound', { round: { ...round, spiellisteId: round.spiellisteId ?? null }, sessionId });
    return { data: { ...round, session_id: sessionId, _dbId: 'offline_' + Date.now() }, error: null };
  }
  return await _doInsertRound(round, sessionId);
}

export async function _doInsertRound(round, sessionId) {
  const user_id = await getUserId();
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
      schneider_announced: round.schneiderAnnounced ?? false,
      schwarz:      round.schwarz ?? false,
      schwarz_announced: round.schwarzAnnounced ?? false,
      ouvert:       round.ouvert ?? false,
      roles:        round.roles ?? null,
      seeger_scores: round.seegerScores ?? null,
      timestamp:    round.timestamp ?? new Date().toISOString(),
      is_bock:      round.isBock ?? false,
      mit_ohne:     round.mitOhne ?? 'mit',
      spielliste_id: round.spiellisteId ?? null,
      user_id,
    })
    .select()
    .single();
  return { data, error };
}

/**
 * Updates a session record (Offline-safeguarded)
 */
export async function updateSession(sessionId, patch) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    enqueueAction('updateSession', { sessionId, patch });
    return { data: patch, error: null };
  }
  return await _doUpdateSession(sessionId, patch);
}

export async function _doUpdateSession(sessionId, patch) {
  const { data, error } = await supabase
    .from('sessions')
    .update(patch)
    .eq('id', sessionId)
    .select()
    .single();
  return { data, error };
}

/**
 * Updates the seating array (Offline-safeguarded)
 */
export async function updateSeating(sessionId, seating) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    enqueueAction('updateSeating', { sessionId, seating });
    return { data: { seating }, error: null };
  }
  return await _doUpdateSeating(sessionId, seating);
}

export async function _doUpdateSeating(sessionId, seating) {
  const { data, error } = await supabase
    .from('sessions')
    .update({ seating })
    .eq('id', sessionId)
    .select()
    .single();
  return { data, error };
}

/**
 * Lists all sessions
 */
export async function listSessions() {
  const user_id = await getUserId();
  if (!user_id) return { data: [], error: null };

  const query = supabase
    .from('sessions')
    .select('id, seating, geber_index, current_round, created_at, table_name')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error && error.message?.includes('table_name')) {
    const { data: fallback, error: fallbackError } = await supabase
      .from('sessions')
      .select('id, seating, geber_index, current_round, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });
    return { data: fallback, error: fallbackError };
  }

  return { data, error };
}

/**
 * Updates a round (Offline-safeguarded)
 */
export async function updateRound(roundDbId, patch) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    enqueueAction('updateRound', { roundDbId, patch });
    return { data: patch, error: null };
  }
  return await _doUpdateRound(roundDbId, patch);
}

export async function _doUpdateRound(roundDbId, patch) {
  const allowed = ['player', 'game_type', 'type_label', 'hand', 'ouvert', 'schneider', 'schneider_announced', 'schwarz', 'schwarz_announced', 'spitzen', 'is_bock', 'game_value', 'mit_ohne', 'won'];
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
 * Deletes a round (Offline-safeguarded)
 */
export async function deleteRound(roundDbId) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    enqueueAction('deleteRound', { roundDbId });
    return { error: null };
  }
  return await _doDeleteRound(roundDbId);
}

export async function _doDeleteRound(roundDbId) {
  const { error } = await supabase
    .from('rounds')
    .delete()
    .eq('id', roundDbId);
  return { error };
}

/**
 * Creates a new Spielliste (Offline-safeguarded)
 */
export async function createSpielliste(spielliste, sessionId) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    enqueueAction('createSpielliste', { spielliste, sessionId });
    return { data: spielliste, error: null };
  }
  return await _doCreateSpielliste(spielliste, sessionId);
}

export async function _doCreateSpielliste(spielliste, sessionId) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('spiellisten')
    .insert({
      id:              spielliste.id,
      session_id:      sessionId,
      name:            spielliste.name,
      round_count:     spielliste.roundCount,
      status:          spielliste.status ?? 'aktiv',
      winner:          spielliste.winner ?? null,
      last_touched_at: spielliste.lastTouchedAt ?? new Date().toISOString(),
      created_at:      spielliste.createdAt ?? new Date().toISOString(),
      user_id,
    })
    .select()
    .single();
  return { data, error };
}

/**
 * Closes a Spielliste with a winner (Offline-safeguarded)
 */
export async function closeSpielliste(spiellisteId, winner) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    enqueueAction('closeSpielliste', { spiellisteId, winner });
    return { data: { spiellisteId, winner }, error: null };
  }
  return await _doCloseSpielliste(spiellisteId, winner);
}

export async function _doCloseSpielliste(spiellisteId, winner) {
  const { data, error } = await supabase
    .from('spiellisten')
    .update({ status: 'abgeschlossen', winner })
    .eq('id', spiellisteId)
    .select()
    .single();
  return { data, error };
}

/**
 * Updates last_touched_at for the active Spielliste (Offline-safeguarded)
 */
export async function setActiveSpiellisteTimestamp(spiellisteId) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    enqueueAction('setActiveSpielliste', { spiellisteId });
    return { data: { spiellisteId }, error: null };
  }
  return await _doSetActiveSpiellisteTimestamp(spiellisteId);
}

export async function _doSetActiveSpiellisteTimestamp(spiellisteId) {
  const { data, error } = await supabase
    .from('spiellisten')
    .update({ last_touched_at: new Date().toISOString() })
    .eq('id', spiellisteId)
    .select()
    .single();
  return { data, error };
}

/**
 * Renames a player in all rounds of a session (player field + roles JSON)
 */
export async function renamePlayerInRounds(sessionId, oldName, newName) {
  // 1. Update rounds where player = oldName
  const { error: playerError } = await supabase
    .from('rounds')
    .update({ player: newName })
    .eq('session_id', sessionId)
    .eq('player', oldName);
  if (playerError) return { error: playerError };

  // 2. Fetch all rounds with roles referencing oldName
  const { data: affectedRounds, error: fetchError } = await supabase
    .from('rounds')
    .select('id, roles')
    .eq('session_id', sessionId)
    .not('roles', 'is', null);
  if (fetchError) return { error: fetchError };

  // 3. Update roles JSON for each affected round
  const toUpdate = (affectedRounds || []).filter(r =>
    r.roles && (r.roles.geber === oldName || r.roles.hoeren === oldName || r.roles.sagen === oldName)
  );
  for (const r of toUpdate) {
    const newRoles = {
      geber:  r.roles.geber  === oldName ? newName : r.roles.geber,
      hoeren: r.roles.hoeren === oldName ? newName : r.roles.hoeren,
      sagen:  r.roles.sagen  === oldName ? newName : r.roles.sagen,
    };
    const { error } = await supabase.from('rounds').update({ roles: newRoles }).eq('id', r.id);
    if (error) return { error };
  }

  return { error: null };
}

/**
 * Deletes a session (No offline safeguard as this implies strong intent/sync)
 */
export async function deleteSession(sessionId) {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId);
  return { error };
}
