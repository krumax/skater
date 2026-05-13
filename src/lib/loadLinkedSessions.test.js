import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── In-memory Supabase mock ──────────────────────────────────────────────────
let _sessions = {};
let _rounds = {};
let _session_players = {};

function makeBuilder(table) {
  const storeMap = {
    sessions: () => _sessions,
    rounds: () => _rounds,
    session_players: () => _session_players,
  };
  const getStore = storeMap[table] || (() => ({}));

  let _filters = {};
  let _inFilters = {};
  let _insertData = null;
  let _orderField = null;
  let _orderAsc = true;
  let _isSingle = false;

  const builder = {
    insert(data) { _insertData = data; return builder; },
    select() { return builder; },
    eq(field, value) { _filters[field] = value; return builder; },
    in(field, values) { _inFilters[field] = values; return builder; },
    order(field, opts) { _orderField = field; _orderAsc = opts?.ascending !== false; return builder; },
    single() { _isSingle = true; return builder; },
    maybeSingle() { _isSingle = true; return builder; },
    then(resolve) {
      const store = getStore();
      let result;
      try {
        if (_insertData !== null) {
          const id = _insertData.id || crypto.randomUUID();
          const row = { id, ..._insertData };
          store[id] = row;
          result = { data: _isSingle ? row : [row], error: null };
        } else {
          // SELECT
          let rows = Object.values(store);
          for (const [k, v] of Object.entries(_filters)) {
            rows = rows.filter(r => r[k] === v);
          }
          for (const [k, values] of Object.entries(_inFilters)) {
            rows = rows.filter(r => values.includes(r[k]));
          }
          if (_orderField) {
            rows.sort((a, b) => {
              const av = a[_orderField] ?? '';
              const bv = b[_orderField] ?? '';
              return _orderAsc
                ? String(av).localeCompare(String(bv))
                : String(bv).localeCompare(String(av));
            });
          }
          if (_isSingle) {
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
const { loadLinkedSessions } = await import('./syncService.js');

// ── Helpers ──────────────────────────────────────────────────────────────────
function seedSession(id, tableName = null) {
  _sessions[id] = { id, table_name: tableName };
}

function seedSessionPlayer(sessionId, displayName, userId) {
  const id = crypto.randomUUID();
  _session_players[id] = { id, session_id: sessionId, display_name: displayName, user_id: userId };
}

function seedRound(sessionId, timestamp) {
  const id = crypto.randomUUID();
  _rounds[id] = { id, session_id: sessionId, timestamp };
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('loadLinkedSessions', () => {
  beforeEach(() => {
    _sessions = {};
    _rounds = {};
    _session_players = {};
  });

  it('returns empty array when user has no linked sessions', async () => {
    const { data, error } = await loadLinkedSessions('user-1');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('returns correct metadata for a single linked session', async () => {
    const sessionId = 'sess-1';
    const userId = 'user-1';

    seedSession(sessionId, 'Stammtisch');
    seedSessionPlayer(sessionId, 'Konrad', userId);
    seedRound(sessionId, '2024-01-15T10:00:00Z');
    seedRound(sessionId, '2024-01-15T11:00:00Z');
    seedRound(sessionId, '2024-01-15T09:00:00Z');

    const { data, error } = await loadLinkedSessions(userId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0]).toEqual({
      sessionId: 'sess-1',
      tableName: 'Stammtisch',
      displayName: 'Konrad',
      totalRounds: 3,
      lastPlayedAt: '2024-01-15T11:00:00Z',
    });
  });

  it('returns null for tableName when session has no table_name', async () => {
    const sessionId = 'sess-no-name';
    const userId = 'user-2';

    seedSession(sessionId, null);
    seedSessionPlayer(sessionId, 'Max', userId);
    seedRound(sessionId, '2024-02-01T12:00:00Z');

    const { data, error } = await loadLinkedSessions(userId);

    expect(error).toBeNull();
    expect(data[0].tableName).toBeNull();
  });

  it('orders sessions by most recent round descending', async () => {
    const userId = 'user-3';

    seedSession('sess-old', 'Alter Tisch');
    seedSession('sess-new', 'Neuer Tisch');

    seedSessionPlayer('sess-old', 'Anna', userId);
    seedSessionPlayer('sess-new', 'Anna', userId);

    seedRound('sess-old', '2024-01-01T10:00:00Z');
    seedRound('sess-new', '2024-06-15T20:00:00Z');

    const { data, error } = await loadLinkedSessions(userId);

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data[0].sessionId).toBe('sess-new');
    expect(data[1].sessionId).toBe('sess-old');
  });

  it('sessions with no rounds have totalRounds 0 and lastPlayedAt null, sorted last', async () => {
    const userId = 'user-4';

    seedSession('sess-empty', 'Leerer Tisch');
    seedSession('sess-active', 'Aktiver Tisch');

    seedSessionPlayer('sess-empty', 'Fritz', userId);
    seedSessionPlayer('sess-active', 'Fritz', userId);

    seedRound('sess-active', '2024-03-10T15:00:00Z');

    const { data, error } = await loadLinkedSessions(userId);

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    // Active session first (has rounds)
    expect(data[0].sessionId).toBe('sess-active');
    expect(data[0].totalRounds).toBe(1);
    // Empty session last
    expect(data[1].sessionId).toBe('sess-empty');
    expect(data[1].totalRounds).toBe(0);
    expect(data[1].lastPlayedAt).toBeNull();
  });

  it('counts all rounds in a session (not just user rounds)', async () => {
    const userId = 'user-5';
    const sessionId = 'sess-multi';

    seedSession(sessionId, 'Großer Tisch');
    seedSessionPlayer(sessionId, 'Konrad', userId);

    // 5 rounds total in the session (from various players)
    seedRound(sessionId, '2024-04-01T10:00:00Z');
    seedRound(sessionId, '2024-04-01T10:05:00Z');
    seedRound(sessionId, '2024-04-01T10:10:00Z');
    seedRound(sessionId, '2024-04-01T10:15:00Z');
    seedRound(sessionId, '2024-04-01T10:20:00Z');

    const { data, error } = await loadLinkedSessions(userId);

    expect(error).toBeNull();
    expect(data[0].totalRounds).toBe(5);
  });
});
