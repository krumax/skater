// Unit tests for loadSessionForClaimedPlayer (Req 5.1, 5.2, 5.5, 5.6)
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── In-memory store ──────────────────────────────────────────────────────────
let _sessions = {};
let _rounds = {};
let _session_players = {};
let _spiellisten = {};

function makeBuilder(table) {
  const storeMap = {
    sessions: _sessions,
    rounds: _rounds,
    session_players: _session_players,
    spiellisten: _spiellisten,
  };
  const store = storeMap[table] || {};
  let _filters = {};
  let _insertData = null;
  let _orderField = null;
  let _orderAsc = true;
  let _isSingle = false;
  let _isMaybeSingle = false;

  const builder = {
    insert(data) { _insertData = data; return builder; },
    select() { return builder; },
    eq(field, value) { _filters[field] = value; return builder; },
    not() { return builder; },
    order(field, opts) { _orderField = field; _orderAsc = opts?.ascending !== false; return builder; },
    single() { _isSingle = true; return builder; },
    maybeSingle() { _isMaybeSingle = true; return builder; },
    then(resolve) {
      let result;
      try {
        if (_insertData !== null) {
          const id = crypto.randomUUID();
          const row = { id, ..._insertData };
          store[id] = row;
          result = { data: (_isSingle || _isMaybeSingle) ? row : [row], error: null };
        } else {
          // SELECT
          let rows = Object.values(store);
          for (const [k, v] of Object.entries(_filters)) {
            rows = rows.filter(r => r[k] === v);
          }
          if (_orderField) {
            rows.sort((a, b) => {
              const av = a[_orderField], bv = b[_orderField];
              if (typeof av === 'string') return _orderAsc ? av.localeCompare(bv) : bv.localeCompare(av);
              return _orderAsc ? av - bv : bv - av;
            });
          }
          if (_isSingle) {
            result = rows.length > 0
              ? { data: rows[0], error: null }
              : { data: null, error: { message: 'not found' } };
          } else if (_isMaybeSingle) {
            result = rows.length > 0
              ? { data: rows[0], error: null }
              : { data: null, error: null };
          } else {
            result = { data: rows, error: null };
          }
        }
      } catch (e) {
        result = { data: null, error: { message: e.message } };
      }
      return resolve(result);
    },
  };
  return builder;
}

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: (table) => makeBuilder(table),
    auth: {
      getSession: async () => ({ data: { session: null } }),
    },
  },
}));

// ── Import after mock ────────────────────────────────────────────────────────
const { loadSessionForClaimedPlayer } = await import('./syncService.js');

// ── Tests ────────────────────────────────────────────────────────────────────
describe('loadSessionForClaimedPlayer', () => {
  const SESSION_ID = 'session-123';
  const USER_ID = 'user-456';

  beforeEach(() => {
    _sessions = {};
    _rounds = {};
    _session_players = {};
    _spiellisten = {};
  });

  it('returns session data with isReadOnly: true when user has a session_players row', async () => {
    // Seed session
    _sessions[SESSION_ID] = {
      id: SESSION_ID,
      seating: ['Alice', 'Bob', 'Charlie'],
      geber_index: 0,
      current_round: 1,
      table_name: 'Stammtisch',
      user_id: 'host-user',
    };

    // Seed session_players row linking user to this session
    _session_players['sp-1'] = {
      id: 'sp-1',
      session_id: SESSION_ID,
      user_id: USER_ID,
      display_name: 'Bob',
      slot_index: 1,
    };

    // Seed a round
    _rounds['r-1'] = {
      id: 'r-1',
      session_id: SESSION_ID,
      round_number: 1,
      player: 'Alice',
      game_type: 'club',
      type_label: 'Kreuz',
      game_value: 48,
      base_value: 12,
      multiplier: 4,
      won: true,
      eye_count: 80,
      spitzen: 2,
      hand: false,
      schneider: false,
      schneider_announced: false,
      schwarz: false,
      schwarz_announced: false,
      ouvert: false,
      roles: null,
      seeger_scores: null,
      timestamp: '2024-01-01T12:00:00Z',
      is_bock: false,
      mit_ohne: 'mit',
      spielliste_id: null,
    };

    const { data, error } = await loadSessionForClaimedPlayer(SESSION_ID, USER_ID);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data.isReadOnly).toBe(true);
    expect(data.session).toBeDefined();
    expect(data.rounds).toHaveLength(1);
    expect(data.spiellisten).toBeDefined();
    expect(data.activeSpiellisteId).toBeDefined();
  });

  it('returns access denied error when user has no session_players row', async () => {
    // Seed session but no session_players row for this user
    _sessions[SESSION_ID] = {
      id: SESSION_ID,
      seating: ['Alice', 'Bob', 'Charlie'],
      geber_index: 0,
      current_round: 1,
      table_name: 'Stammtisch',
      user_id: 'host-user',
    };

    const { data, error } = await loadSessionForClaimedPlayer(SESSION_ID, USER_ID);

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error.message).toBe('Zugriff verweigert.');
  });

  it('returns access denied error when session does not exist (RLS denial)', async () => {
    // User has a session_players row but session doesn't exist (simulates RLS denial)
    _session_players['sp-1'] = {
      id: 'sp-1',
      session_id: SESSION_ID,
      user_id: USER_ID,
      display_name: 'Bob',
      slot_index: 1,
    };

    const { data, error } = await loadSessionForClaimedPlayer(SESSION_ID, USER_ID);

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error.message).toBe('Zugriff verweigert.');
  });

  it('includes all rounds from the session regardless of player name', async () => {
    // Seed session
    _sessions[SESSION_ID] = {
      id: SESSION_ID,
      seating: ['Alice', 'Bob', 'Charlie'],
      geber_index: 0,
      current_round: 3,
      table_name: null,
      user_id: 'host-user',
    };

    // Seed session_players row
    _session_players['sp-1'] = {
      id: 'sp-1',
      session_id: SESSION_ID,
      user_id: USER_ID,
      display_name: 'Bob',
      slot_index: 1,
    };

    // Seed multiple rounds by different players
    _rounds['r-1'] = {
      id: 'r-1', session_id: SESSION_ID, round_number: 1, player: 'Alice',
      game_type: 'club', type_label: 'Kreuz', game_value: 48, base_value: 12,
      multiplier: 4, won: true, eye_count: 80, spitzen: 2, hand: false,
      schneider: false, schneider_announced: false, schwarz: false,
      schwarz_announced: false, ouvert: false, roles: null, seeger_scores: null,
      timestamp: '2024-01-01T12:00:00Z', is_bock: false, mit_ohne: 'mit', spielliste_id: null,
    };
    _rounds['r-2'] = {
      id: 'r-2', session_id: SESSION_ID, round_number: 2, player: 'Bob',
      game_type: 'grand', type_label: 'Grand', game_value: 96, base_value: 24,
      multiplier: 4, won: true, eye_count: 90, spitzen: 3, hand: false,
      schneider: false, schneider_announced: false, schwarz: false,
      schwarz_announced: false, ouvert: false, roles: null, seeger_scores: null,
      timestamp: '2024-01-01T12:30:00Z', is_bock: false, mit_ohne: 'mit', spielliste_id: null,
    };
    _rounds['r-3'] = {
      id: 'r-3', session_id: SESSION_ID, round_number: 3, player: 'Charlie',
      game_type: 'heart', type_label: 'Herz', game_value: 30, base_value: 10,
      multiplier: 3, won: false, eye_count: 50, spitzen: 1, hand: false,
      schneider: false, schneider_announced: false, schwarz: false,
      schwarz_announced: false, ouvert: false, roles: null, seeger_scores: null,
      timestamp: '2024-01-01T13:00:00Z', is_bock: false, mit_ohne: 'mit', spielliste_id: null,
    };

    const { data, error } = await loadSessionForClaimedPlayer(SESSION_ID, USER_ID);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    // All 3 rounds should be returned (Req 5.1 - full Skatliste)
    expect(data.rounds).toHaveLength(3);
    expect(data.isReadOnly).toBe(true);
  });
});
