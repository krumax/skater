// Feature: supabase-persistence, Property 2: Runden-Persistenz-Round-Trip
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ── Supabase mock ────────────────────────────────────────────────────────────
// We simulate an in-memory Supabase so the round-trip tests real mapping logic
// without needing a live database connection.

let _sessions = {};
let _rounds = {};

function makeBuilder(table) {
  const store = table === 'sessions' ? _sessions : _rounds;
  let _filters = {};
  let _insertData = null;
  let _updateData = null;
  let _orderField = null;
  let _orderAsc = true;
  let _isSingle = false;

  const builder = {
    insert(data) {
      _insertData = data;
      return builder;
    },
    update(data) {
      _updateData = data;
      return builder;
    },
    select() {
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
    single() {
      _isSingle = true;
      return builder;
    },
    // Thenable — resolves when awaited
    then(resolve) {
      let result;
      try {
        if (_insertData !== null) {
          const id = crypto.randomUUID();
          const row = { id, ...(_insertData) };
          store[id] = row;
          result = { data: _isSingle ? row : [row], error: null };
        } else if (_updateData !== null) {
          const id = _filters['id'];
          if (!id || !store[id]) {
            result = { data: null, error: { message: 'not found' } };
          } else {
            store[id] = { ...store[id], ..._updateData };
            result = { data: _isSingle ? store[id] : [store[id]], error: null };
          }
        } else {
          // SELECT
          let rows = Object.values(store);
          for (const [k, v] of Object.entries(_filters)) {
            rows = rows.filter(r => r[k] === v);
          }
          if (_orderField) {
            rows.sort((a, b) => {
              const av = a[_orderField], bv = b[_orderField];
              return _orderAsc ? av - bv : bv - av;
            });
          }
          if (_isSingle) {
            result = rows.length > 0
              ? { data: rows[0], error: null }
              : { data: null, error: { message: 'not found' } };
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
  },
}));

// ── Import after mock is set up ──────────────────────────────────────────────
const { createSession, insertRound, loadSession } = await import('./syncService.js');

// ── Generators ───────────────────────────────────────────────────────────────
const playerName = fc.constantFrom('Alice', 'Bob', 'Charlie', 'Diana');
const gameType = fc.constantFrom('club', 'spade', 'heart', 'diamond', 'grand', 'null');

const roundArb = fc.record({
  id:          fc.integer({ min: 1, max: 100 }),
  player:      playerName,
  gameType:    gameType,
  typeLabel:   fc.string({ minLength: 1, maxLength: 20 }),
  gameValue:   fc.integer({ min: -200, max: 264 }),
  baseValue:   fc.integer({ min: 9, max: 24 }),
  multiplier:  fc.integer({ min: 1, max: 10 }),
  won:         fc.boolean(),
  eyeCount:    fc.integer({ min: 0, max: 120 }),
  spitzen:     fc.integer({ min: 1, max: 11 }),
  hand:        fc.boolean(),
  schneider:   fc.boolean(),
  schwarz:     fc.boolean(),
  ouvert:      fc.boolean(),
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe('Property 2: Runden-Persistenz-Round-Trip', () => {
  beforeEach(() => {
    _sessions = {};
    _rounds = {};
  });

  it(
    'Validates: Anforderungen 3.1, 4.2 — ' +
    'Für jede Runde: nach insertRound und loadSession ist die Runde im State vorhanden und inhaltlich identisch',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(playerName, { minLength: 3, maxLength: 4 }).filter(a => new Set(a).size === a.length),
          roundArb,
          async (seating, round) => {
            // 1. Create a session
            const { data: session, error: sessionError } = await createSession(seating);
            expect(sessionError).toBeNull();
            const sessionId = session.id;

            // 2. Insert the round (Anforderung 3.1)
            const { data: insertedRound, error: insertError } = await insertRound(round, sessionId);
            expect(insertError).toBeNull();
            expect(insertedRound).not.toBeNull();

            // 3. Load the session back (Anforderung 4.2)
            const { data: loaded, error: loadError } = await loadSession(sessionId);
            expect(loadError).toBeNull();
            expect(loaded).not.toBeNull();

            const { rounds: loadedRounds } = loaded;

            // 4. The round must be present
            expect(loadedRounds).toHaveLength(1);
            const r = loadedRounds[0];

            // 5. Core fields must be identical after the camelCase→snake_case→camelCase trip
            expect(r.round_number).toBe(round.id);
            expect(r.player).toBe(round.player);
            expect(r.game_type).toBe(round.gameType);
            expect(r.type_label).toBe(round.typeLabel);
            expect(r.game_value).toBe(round.gameValue);
            expect(r.base_value).toBe(round.baseValue);
            expect(r.multiplier).toBe(round.multiplier);
            expect(r.won).toBe(round.won);
            expect(r.eye_count).toBe(round.eyeCount);
            expect(r.spitzen).toBe(round.spitzen);
            expect(r.hand).toBe(round.hand);
            expect(r.schneider).toBe(round.schneider);
            expect(r.schwarz).toBe(round.schwarz);
            expect(r.ouvert).toBe(round.ouvert);
            expect(r.session_id).toBe(sessionId);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
