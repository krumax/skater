// Feature: claim-table-refactor, Property 8: Claimed player sees all session rounds with correct stats
// Validates: Requirements 5.1, 5.2

/**
 * Mock-based property test for loadSessionForClaimedPlayer.
 *
 * Strategy:
 *   For any session with N rounds played by various players, and for any
 *   claimed player linked to that session, loading the session detail SHALL
 *   return all N rounds, and computing Seeger-Fabian scores and player
 *   rankings from those rounds SHALL produce identical results to the host's
 *   view (i.e. calling loadSession directly).
 *
 *   The test uses an in-memory Supabase mock that supports the query patterns
 *   used by loadSessionForClaimedPlayer and loadSession.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { calculateSeegerFabian } from './skatScoring.js';

// ── In-memory stores ──────────────────────────────────────────────────────────

let _sessions = {};
let _rounds = {};
let _sessionPlayers = {};
let _spiellisten = {};

// ── Builder factory for claimed player session view tests ─────────────────────

/**
 * Builder factory that supports all operations needed by loadSessionForClaimedPlayer
 * and loadSession:
 *   - session_players: SELECT with .eq('session_id', ...).eq('user_id', ...).maybeSingle()
 *   - sessions: SELECT with .eq('id', ...).single()
 *   - rounds: SELECT with .eq('session_id', ...).order(...)
 *   - spiellisten: SELECT with .eq('session_id', ...).order(...)
 */
function makeBuilder(table) {
  const store =
    table === 'session_players' ? _sessionPlayers :
    table === 'sessions'        ? _sessions       :
    table === 'rounds'          ? _rounds         :
    table === 'spiellisten'     ? _spiellisten    :
    {};

  let _filters = {};
  let _isSelect = false;
  let _isMaybeSingle = false;
  let _isSingle = false;
  let _orderField = null;
  let _orderAsc = true;

  const builder = {
    select() {
      _isSelect = true;
      return builder;
    },
    eq(field, value) {
      _filters[field] = value;
      return builder;
    },
    order(field, opts) {
      _orderField = field;
      _orderAsc = opts?.ascending !== false;
      return builder;
    },
    maybeSingle() {
      _isMaybeSingle = true;
      return builder;
    },
    single() {
      _isSingle = true;
      return builder;
    },
    then(resolve) {
      let result;
      try {
        if (_isSelect) {
          let rows = Object.values(store);
          for (const [k, v] of Object.entries(_filters)) {
            rows = rows.filter(r => r[k] === v);
          }
          if (_orderField) {
            rows.sort((a, b) => {
              const aVal = a[_orderField];
              const bVal = b[_orderField];
              if (aVal < bVal) return _orderAsc ? -1 : 1;
              if (aVal > bVal) return _orderAsc ? 1 : -1;
              return 0;
            });
          }
          if (_isSingle || _isMaybeSingle) {
            result = rows.length > 0
              ? { data: rows[0], error: null }
              : _isSingle
                ? { data: null, error: { message: 'Row not found' } }
                : { data: null, error: null };
          } else {
            result = { data: rows, error: null };
          }
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
    from: (table) => makeBuilder(table),
    auth: {
      getSession: async () => ({ data: { session: null } }),
    },
  },
}));

// ── Import after mock ────────────────────────────────────────────────────────
const { loadSessionForClaimedPlayer, loadSession } = await import('./syncService.js');

// ── Helpers ──────────────────────────────────────────────────────────────────

function seedSession(id, seating, tableName = null) {
  _sessions[id] = { id, seating, table_name: tableName, user_id: 'host-user-id' };
}

function seedSessionPlayer(sessionId, displayName, userId) {
  const id = crypto.randomUUID();
  _sessionPlayers[id] = { id, session_id: sessionId, display_name: displayName, user_id: userId };
}

function seedRound(sessionId, roundNumber, player, seating, opts = {}) {
  const id = crypto.randomUUID();
  const gameValue = opts.gameValue ?? 48;
  const won = opts.won ?? true;
  const gameType = opts.gameType ?? 'grand';

  _rounds[id] = {
    id,
    session_id:          sessionId,
    round_number:        roundNumber,
    player,
    game_type:           gameType,
    type_label:          opts.typeLabel ?? 'Grand',
    game_value:          gameValue,
    base_value:          opts.baseValue ?? 24,
    multiplier:          opts.multiplier ?? 2,
    won,
    eye_count:           opts.eyeCount ?? (won ? 90 : 30),
    spitzen:             opts.spitzen ?? 2,
    hand:                opts.hand ?? false,
    schneider:           opts.schneider ?? false,
    schneider_announced: opts.schneiderAnnounced ?? false,
    schwarz:             opts.schwarz ?? false,
    schwarz_announced:   opts.schwarzAnnounced ?? false,
    ouvert:              opts.ouvert ?? false,
    roles:               opts.roles ?? null,
    timestamp:           opts.timestamp ?? new Date(2024, 0, roundNumber).toISOString(),
    is_bock:             opts.isBock ?? false,
    mit_ohne:            opts.mitOhne ?? 'mit',
    spielliste_id:       opts.spiellisteId ?? null,
  };
  return id;
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const arbitraryPlayerName = fc
  .string({ minLength: 1, maxLength: 15 })
  .map(s => s.trim())
  .filter(s => s.length > 0 && s !== '-');

// Seating of 3-4 unique player names
const arbitrarySeating = fc
  .array(arbitraryPlayerName, { minLength: 3, maxLength: 4 })
  .filter(arr => new Set(arr).size === arr.length);

const arbitraryGameType = fc.constantFrom('club', 'spade', 'heart', 'diamond', 'grand', 'null');

const arbitraryWon = fc.boolean();

// A round descriptor: which player is declarer, game type, won
const arbitraryRoundDescriptor = (seating) => fc.record({
  playerIndex: fc.integer({ min: 0, max: seating.length - 1 }),
  gameType:    arbitraryGameType,
  won:         arbitraryWon,
  gameValue:   fc.integer({ min: 1, max: 240 }),
});

// ── Property 8: Claimed player sees all session rounds with correct stats ────

describe(
  'Feature: claim-table-refactor, Property 8: Claimed player sees all session rounds with correct stats',
  () => {
    beforeEach(() => {
      _sessions = {};
      _rounds = {};
      _sessionPlayers = {};
      _spiellisten = {};
    });

    it(
      'Validates: Requirements 5.1, 5.2 — ' +
      'loadSessionForClaimedPlayer returns ALL N rounds from the session, ' +
      'and Seeger-Fabian scores computed from those rounds match the host view',
      { timeout: 30000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),          // sessionId
            fc.uuid(),          // claimedUserId
            arbitrarySeating,   // seating array (3-4 players)
            async (sessionId, claimedUserId, seating) => {
              // Generate round descriptors based on the seating
              const roundDescriptors = await fc.sample(
                fc.array(
                  fc.record({
                    playerIndex: fc.integer({ min: 0, max: seating.length - 1 }),
                    gameType:    arbitraryGameType,
                    won:         arbitraryWon,
                    gameValue:   fc.integer({ min: 1, max: 240 }),
                  }),
                  { minLength: 1, maxLength: 10 }
                ),
                1
              )[0];

              // Reset stores
              _sessions = {};
              _rounds = {};
              _sessionPlayers = {};
              _spiellisten = {};

              // Seed session
              seedSession(sessionId, seating);

              // Link the claimed player to one of the names in seating
              const claimedPlayerIndex = 1; // claimed player is the second player
              seedSessionPlayer(sessionId, seating[claimedPlayerIndex], claimedUserId);

              // Seed rounds played by various players
              for (let i = 0; i < roundDescriptors.length; i++) {
                const rd = roundDescriptors[i];
                const declarer = seating[rd.playerIndex];
                const signedGameValue = rd.won ? rd.gameValue : -2 * rd.gameValue;
                seedRound(sessionId, i + 1, declarer, seating, {
                  gameType: rd.gameType,
                  won: rd.won,
                  gameValue: signedGameValue,
                });
              }

              const totalRounds = roundDescriptors.length;

              // Call loadSessionForClaimedPlayer
              const claimedResult = await loadSessionForClaimedPlayer(sessionId, claimedUserId);

              // Must succeed
              expect(claimedResult.error).toBeNull();
              expect(claimedResult.data).not.toBeNull();

              // Must have isReadOnly flag
              expect(claimedResult.data.isReadOnly).toBe(true);

              // Must return ALL rounds from the session
              expect(claimedResult.data.rounds).toHaveLength(totalRounds);

              // Call loadSession directly (host view) for comparison
              const hostResult = await loadSession(sessionId);
              expect(hostResult.error).toBeNull();
              expect(hostResult.data).not.toBeNull();

              // Host view must also have all rounds
              expect(hostResult.data.rounds).toHaveLength(totalRounds);

              // Verify each round has correct player name and game value
              for (let i = 0; i < totalRounds; i++) {
                const claimedRound = claimedResult.data.rounds[i];
                const hostRound = hostResult.data.rounds[i];

                // Same player (declarer)
                expect(claimedRound.player).toBe(hostRound.player);

                // Same game value
                expect(claimedRound.gameValue).toBe(hostRound.gameValue);

                // Same game type
                expect(claimedRound.gameType).toBe(hostRound.gameType);

                // Same won status
                expect(claimedRound.won).toBe(hostRound.won);
              }

              // Verify Seeger-Fabian scores match between claimed and host views
              for (let i = 0; i < totalRounds; i++) {
                const claimedRound = claimedResult.data.rounds[i];
                const hostRound = hostResult.data.rounds[i];

                // seegerScores must be identical
                expect(claimedRound.seegerScores).toEqual(hostRound.seegerScores);

                // Verify seegerScores are correctly computed
                const expectedSeeger = calculateSeegerFabian({
                  declarer: claimedRound.player,
                  allPlayers: seating,
                  gameValue: claimedRound.gameValue,
                  won: claimedRound.won,
                });
                expect(claimedRound.seegerScores).toEqual(expectedSeeger);
              }

              // Verify cumulative Seeger-Fabian totals match
              const computeSeegerTotals = (rounds) => {
                const totals = {};
                for (const p of seating) totals[p] = 0;
                for (const r of rounds) {
                  if (r.seegerScores) {
                    for (const [name, score] of Object.entries(r.seegerScores)) {
                      totals[name] = (totals[name] || 0) + score;
                    }
                  }
                }
                return totals;
              };

              const claimedTotals = computeSeegerTotals(claimedResult.data.rounds);
              const hostTotals = computeSeegerTotals(hostResult.data.rounds);
              expect(claimedTotals).toEqual(hostTotals);
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);
