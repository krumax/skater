// Feature: supabase-persistence, Property 2: Runden-Persistenz-Round-Trip
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ── Supabase mock ────────────────────────────────────────────────────────────
// We simulate an in-memory Supabase so the round-trip tests real mapping logic
// without needing a live database connection.

let _sessions = {};
let _rounds = {};
let _session_players = {};
let _lastUpdatePatch = null;

function makeBuilder(table) {
  const store = table === 'sessions' ? _sessions : table === 'session_players' ? _session_players : _rounds;
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
      _lastUpdatePatch = data;
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
    // Thenable - resolves when awaited
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
    auth: {
      getSession: async () => ({ data: { session: null } }),
    },
  },
}));

// ── Import after mock is set up ──────────────────────────────────────────────
const { createSession, insertRound, loadSession, updateRound } = await import('./syncService.js');

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
    _session_players = {};
    _lastUpdatePatch = null;
  });

  it(
    'Validates: Anforderungen 3.1, 4.2 - ' +
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
            // loadSession maps snake_case DB columns to camelCase fields
            expect(r.id).toBe(round.id);
            expect(r.player).toBe(round.player);
            expect(r.gameType).toBe(round.gameType);
            expect(r.typeLabel).toBe(round.typeLabel);
            expect(r.gameValue).toBe(round.gameValue);
            expect(r.baseValue).toBe(round.baseValue);
            expect(r.multiplier).toBe(round.multiplier);
            expect(r.won).toBe(round.won);
            expect(r.eyeCount).toBe(round.eyeCount);
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

// ── Unit-Tests: updateRound ──────────────────────────────────────────────────
describe('updateRound – Anforderungen 3.1, 4.1', () => {
  // is_bock and game_value were added in Task 2.2 (bockrunden feature)
  const ALLOWED_FIELDS = ['player', 'game_type', 'type_label', 'hand', 'ouvert', 'schneider', 'schneider_announced', 'schwarz', 'schwarz_announced', 'spitzen', 'is_bock', 'game_value', 'mit_ohne', 'won'];

  beforeEach(() => {
    _sessions = {};
    _rounds = {};
    _session_players = {};
    _lastUpdatePatch = null;
  });

  it('Patch-Objekt enthält ausschließlich die erlaubten Felder', async () => {
    // Seed a round so the update finds a row
    const roundId = crypto.randomUUID();
    _rounds[roundId] = {
      id: roundId,
      game_type: 'club',
      type_label: 'Kreuz',
      hand: false,
      ouvert: false,
      schneider: false,
      schwarz: false,
      spitzen: 2,
      game_value: 48,
      is_bock: false,
      player: 'Alice',
      round_number: 1,
    };

    // Pass a patch that includes allowed fields including game_value and is_bock (bockrunden)
    // and a forbidden field (player) that must be stripped
    const patch = {
      game_type: 'grand',
      type_label: 'Grand Hand',
      hand: true,
      ouvert: false,
      schneider: false,
      schwarz: false,
      spitzen: 3,
      is_bock: true,
      game_value: 96,  // allowed since bockrunden feature (Task 2.2)
      player: 'Bob',   // must be stripped - not in allowed list
    };

    await updateRound(roundId, patch);

    expect(_lastUpdatePatch).not.toBeNull();
    const sentKeys = Object.keys(_lastUpdatePatch);

    // Every sent key must be in the allowed list
    sentKeys.forEach(key => {
      expect(ALLOWED_FIELDS).toContain(key);
    });

    // Forbidden fields must not be present
    // Note: 'player' IS in the allowed list since the "Spieler ändern" feature
    expect(sentKeys).not.toContain('base_value');
    expect(sentKeys).not.toContain('multiplier');
    expect(sentKeys).not.toContain('won');
    expect(sentKeys).not.toContain('round_number');
    expect(sentKeys).not.toContain('timestamp');
    expect(sentKeys).not.toContain('session_id');

    // Allowed bockrunden fields must be present
    expect(sentKeys).toContain('game_value');
    expect(sentKeys).toContain('is_bock');
  });

  it('game_value kann aktualisiert werden (Bockrunden-Feature, Anforderung 3.2)', async () => {
    // Since Task 2.2 (bockrunden), game_value is in the allowed list so it CAN be updated.
    const originalGameValue = 48;
    const newGameValue = 96; // doubled for a Bockrunde
    const roundId = crypto.randomUUID();
    _rounds[roundId] = {
      id: roundId,
      game_type: 'club',
      type_label: 'Kreuz',
      hand: false,
      ouvert: false,
      schneider: false,
      schwarz: false,
      spitzen: 2,
      game_value: originalGameValue,
      is_bock: false,
      player: 'Alice',
      round_number: 1,
    };

    const patch = {
      game_type: 'club',
      type_label: 'Kreuz',
      hand: false,
      ouvert: false,
      schneider: false,
      schwarz: false,
      spitzen: 2,
      is_bock: true,
      game_value: newGameValue, // allowed since bockrunden feature
    };

    await updateRound(roundId, patch);

    // game_value must be updated to the new value
    expect(_rounds[roundId].game_value).toBe(newGameValue);
    expect(_rounds[roundId].is_bock).toBe(true);

    // The patch sent to Supabase must contain game_value and is_bock
    expect(_lastUpdatePatch).toHaveProperty('game_value', newGameValue);
    expect(_lastUpdatePatch).toHaveProperty('is_bock', true);
  });
});
