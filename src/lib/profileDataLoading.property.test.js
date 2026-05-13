// Feature: claim-table-refactor, Property 9: Linked session list is ordered by most recent round and contains correct metadata
// Feature: claim-table-refactor, Property 13: After rename, loadMyRoundsAcrossSessions returns all session rounds
// Validates: Requirements 6.1, 6.2, 7.6

/**
 * Mock-based property tests for profile data loading functions.
 *
 * Strategy:
 *   Property 9: For any user linked to multiple sessions via session_players,
 *   loadLinkedSessions SHALL return sessions ordered by the timestamp of their
 *   most recently played round (descending), and each entry SHALL contain the
 *   correct tableName (or null), the user's displayName, and the total number
 *   of rounds across all players.
 *
 *   Property 13: After a rename, loadMyRoundsAcrossSessions SHALL return ALL
 *   rounds from the linked session (including rounds recorded under both the
 *   old and new names), because the query is based on user_id linkage and loads
 *   the full session.
 *
 * Both tests use an in-memory Supabase mock that supports the query patterns
 * used by loadLinkedSessions and loadMyRoundsAcrossSessions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ── In-memory stores ──────────────────────────────────────────────────────────

let _sessions = {};
let _rounds = {};
let _sessionPlayers = {};

// ── Builder factory for profile data loading tests ────────────────────────────

/**
 * Builder factory that supports all operations needed by loadLinkedSessions
 * and loadMyRoundsAcrossSessions:
 *   - session_players: SELECT with .eq('user_id', ...) → array
 *   - sessions: SELECT with .in('id', [...]) → array
 *   - rounds: SELECT with .in('session_id', [...]) → array, .order() chaining
 */
function makeProfileBuilder(table) {
  const store =
    table === 'session_players' ? _sessionPlayers :
    table === 'sessions'        ? _sessions       :
    table === 'rounds'          ? _rounds         :
    {};

  let _filters = {};
  let _inFilter = null;
  let _isSelect = false;
  let _isMaybeSingle = false;

  const builder = {
    select() {
      _isSelect = true;
      return builder;
    },
    eq(field, value) {
      _filters[field] = value;
      return builder;
    },
    in(field, values) {
      _inFilter = { field, values };
      return builder;
    },
    order() {
      return builder;
    },
    maybeSingle() {
      _isMaybeSingle = true;
      return builder;
    },
    not() {
      return builder;
    },
    single() {
      _isMaybeSingle = true;
      return builder;
    },
    then(resolve) {
      let result;
      try {
        if (_isSelect && _isMaybeSingle) {
          let rows = Object.values(store);
          for (const [k, v] of Object.entries(_filters)) {
            rows = rows.filter(r => r[k] === v);
          }
          if (_inFilter) {
            rows = rows.filter(r => _inFilter.values.includes(r[_inFilter.field]));
          }
          result = rows.length > 0
            ? { data: rows[0], error: null }
            : { data: null, error: null };
        } else if (_isSelect) {
          let rows = Object.values(store);
          for (const [k, v] of Object.entries(_filters)) {
            rows = rows.filter(r => r[k] === v);
          }
          if (_inFilter) {
            rows = rows.filter(r => _inFilter.values.includes(r[_inFilter.field]));
          }
          result = { data: rows, error: null };
        } else {
          result = { data: [], error: null };
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
    from: (table) => makeProfileBuilder(table),
    auth: {
      getSession: async () => ({ data: { session: null } }),
    },
  },
}));

// ── Import after mock ────────────────────────────────────────────────────────
const { loadLinkedSessions, loadMyRoundsAcrossSessions } = await import('./syncService.js');

// ── Helpers ──────────────────────────────────────────────────────────────────

function seedSession(id, tableName = null) {
  _sessions[id] = { id, table_name: tableName };
}

function seedSessionPlayer(sessionId, displayName, userId) {
  const id = crypto.randomUUID();
  _sessionPlayers[id] = { id, session_id: sessionId, display_name: displayName, user_id: userId };
}

function seedRound(sessionId, timestamp, playerName = 'SomePlayer') {
  const id = crypto.randomUUID();
  _rounds[id] = {
    id,
    session_id:          sessionId,
    round_number:        Object.values(_rounds).filter(r => r.session_id === sessionId).length + 1,
    player:              playerName,
    game_type:           'grand',
    type_label:          'Grand',
    game_value:          48,
    base_value:          24,
    multiplier:          2,
    won:                 true,
    eye_count:           90,
    spitzen:             2,
    hand:                false,
    schneider:           false,
    schneider_announced: false,
    schwarz:             false,
    schwarz_announced:   false,
    ouvert:              false,
    roles:               null,
    seeger_scores:       null,
    timestamp,
    is_bock:             false,
    mit_ohne:            'mit',
    spielliste_id:       null,
  };
  return id;
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const arbitraryDisplayName = fc
  .string({ minLength: 1, maxLength: 20 })
  .map(s => s.trim())
  .filter(s => s.length > 0);

const arbitraryTableName = fc.oneof(
  fc.constant(null),
  fc.string({ minLength: 1, maxLength: 30 }).map(s => s.trim()).filter(s => s.length > 0)
);

// Generate a timestamp string in ISO format within a reasonable range
const arbitraryTimestamp = fc
  .integer({ min: 1609459200000, max: 1735689600000 }) // 2021-01-01 to 2025-01-01
  .map(ms => new Date(ms).toISOString());

// A linked session with metadata and round timestamps
const arbitraryLinkedSession = fc.record({
  sessionId:   fc.uuid(),
  displayName: arbitraryDisplayName,
  tableName:   arbitraryTableName,
  timestamps:  fc.array(arbitraryTimestamp, { minLength: 0, maxLength: 6 }),
});

// Multiple linked sessions (2–5) with unique session IDs
const arbitraryLinkedSessions = fc
  .array(arbitraryLinkedSession, { minLength: 2, maxLength: 5 })
  .filter(sessions => {
    const ids = sessions.map(s => s.sessionId);
    return new Set(ids).size === ids.length;
  });

// ── Property 9: Linked session list is ordered by most recent round and contains correct metadata ──

describe(
  'Feature: claim-table-refactor, Property 9: Linked session list is ordered by most recent round and contains correct metadata',
  () => {
    beforeEach(() => {
      _sessions = {};
      _rounds = {};
      _sessionPlayers = {};
    });

    it(
      'Validates: Requirements 6.1, 6.2 — ' +
      'loadLinkedSessions returns sessions ordered by most recent round descending, ' +
      'with correct tableName, displayName, and totalRounds',
      { timeout: 30000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),              // userId
            arbitraryLinkedSessions, // sessions linked to userId
            async (userId, linkedSessions) => {
              // Reset stores for each run
              _sessions = {};
              _rounds = {};
              _sessionPlayers = {};

              // Populate stores
              for (const ls of linkedSessions) {
                seedSession(ls.sessionId, ls.tableName);
                seedSessionPlayer(ls.sessionId, ls.displayName, userId);
                for (const ts of ls.timestamps) {
                  seedRound(ls.sessionId, ts);
                }
              }

              const { data, error } = await loadLinkedSessions(userId);

              expect(error).toBeNull();
              expect(data).not.toBeNull();
              expect(data).toHaveLength(linkedSessions.length);

              // Verify metadata for each returned session
              for (const entry of data) {
                const source = linkedSessions.find(s => s.sessionId === entry.sessionId);
                expect(source).toBeDefined();

                // tableName must match (null if not set)
                expect(entry.tableName).toBe(source.tableName);

                // displayName must match the user's display_name in that session
                expect(entry.displayName).toBe(source.displayName);

                // totalRounds must equal the number of rounds seeded for that session
                expect(entry.totalRounds).toBe(source.timestamps.length);

                // lastPlayedAt must be the maximum timestamp (or null if no rounds)
                if (source.timestamps.length === 0) {
                  expect(entry.lastPlayedAt).toBeNull();
                } else {
                  const maxTimestamp = [...source.timestamps].sort().reverse()[0];
                  expect(entry.lastPlayedAt).toBe(maxTimestamp);
                }
              }

              // Verify ordering: sessions must be sorted by lastPlayedAt descending
              // Sessions with no rounds (lastPlayedAt = null) come last
              for (let i = 0; i < data.length - 1; i++) {
                const a = data[i];
                const b = data[i + 1];

                if (a.lastPlayedAt === null && b.lastPlayedAt === null) {
                  // Both null — order is arbitrary, no constraint
                  continue;
                }
                if (a.lastPlayedAt === null) {
                  // a has no rounds but b does — this violates ordering (nulls should be last)
                  expect(b.lastPlayedAt).toBeNull();
                }
                if (b.lastPlayedAt === null) {
                  // b has no rounds, a has rounds — correct (nulls last)
                  continue;
                }
                // Both have rounds — a.lastPlayedAt >= b.lastPlayedAt (descending)
                expect(a.lastPlayedAt >= b.lastPlayedAt).toBe(true);
              }
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);

// ── Property 13: After rename, loadMyRoundsAcrossSessions returns all session rounds ──

describe(
  'Feature: claim-table-refactor, Property 13: After rename, loadMyRoundsAcrossSessions returns all session rounds',
  () => {
    beforeEach(() => {
      _sessions = {};
      _rounds = {};
      _sessionPlayers = {};
    });

    it(
      'Validates: Requirements 6.1, 6.2, 7.6 — ' +
      'after a rename, loadMyRoundsAcrossSessions returns ALL rounds from the linked session ' +
      '(both old-name and new-name rounds), because the query is based on user_id linkage',
      { timeout: 30000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),            // userId
            fc.uuid(),            // sessionId
            arbitraryDisplayName, // oldName (name used for some rounds)
            arbitraryDisplayName, // newName (current name after rename)
            fc.integer({ min: 1, max: 4 }), // rounds recorded under oldName
            fc.integer({ min: 1, max: 4 }), // rounds recorded under newName
            async (userId, sessionId, oldName, newName, oldRoundCount, newRoundCount) => {
              // Reset stores for each run
              _sessions = {};
              _rounds = {};
              _sessionPlayers = {};

              // Simulate post-rename state:
              // session_players has the NEW display_name, but rounds exist under both names
              seedSession(sessionId, 'Test Tisch');
              seedSessionPlayer(sessionId, newName, userId);

              // Seed rounds under the OLD name (recorded before rename)
              const allRoundIds = [];
              for (let i = 0; i < oldRoundCount; i++) {
                const ts = new Date(2024, 0, 1 + i).toISOString();
                const id = seedRound(sessionId, ts, oldName);
                allRoundIds.push(id);
              }

              // Seed rounds under the NEW name (recorded after rename)
              for (let i = 0; i < newRoundCount; i++) {
                const ts = new Date(2024, 6, 1 + i).toISOString();
                const id = seedRound(sessionId, ts, newName);
                allRoundIds.push(id);
              }

              const totalExpected = oldRoundCount + newRoundCount;

              const { data, error } = await loadMyRoundsAcrossSessions(userId);

              expect(error).toBeNull();
              expect(data).not.toBeNull();

              // ALL rounds from the session must be returned (both old and new name)
              expect(data).toHaveLength(totalExpected);

              // Every round must belong to the correct session
              for (const round of data) {
                expect(round.sessionId).toBe(sessionId);
              }

              // All original round DB IDs must be present
              const returnedDbIds = new Set(data.map(r => r._dbId));
              for (const dbId of allRoundIds) {
                expect(returnedDbIds.has(dbId)).toBe(true);
              }

              // playerName must reflect the CURRENT display_name (newName)
              // because session_players has the post-rename name
              for (const round of data) {
                expect(round.playerName).toBe(newName);
              }
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);
