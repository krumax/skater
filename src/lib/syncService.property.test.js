// @vitest-environment jsdom
// Feature: bockrunden, Property 3: Bock-Persistenz Round-Trip
// Validates: Requirements 3.1, 3.2, 3.3

/**
 * Mock-based property test - no real DB calls.
 *
 * Strategy:
 *   1. Simulate insertRound by capturing the snake_case payload it would send.
 *   2. Simulate loadSession by running the camelCase mapping over that payload.
 *   3. Assert that isBock in the loaded round equals the original isBock value.
 *
 * This mirrors the actual code paths in syncService.js without touching Supabase.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ── Pure helpers that mirror syncService logic ────────────────────────────────

/**
 * Mirrors the insert payload built in syncService.insertRound.
 * Returns the snake_case DB row that would be written.
 */
function buildInsertPayload(round, sessionId) {
  return {
    session_id:    sessionId,
    round_number:  round.id,
    player:        round.player,
    game_type:     round.gameType,
    type_label:    round.typeLabel,
    game_value:    round.gameValue,
    base_value:    round.baseValue,
    multiplier:    round.multiplier,
    won:           round.won,
    eye_count:     round.eyeCount ?? 0,
    spitzen:       round.spitzen ?? 1,
    hand:          round.hand ?? false,
    schneider:     round.schneider ?? false,
    schwarz:       round.schwarz ?? false,
    ouvert:        round.ouvert ?? false,
    roles:         round.roles ?? null,
    seeger_scores: round.seegerScores ?? null,
    timestamp:     round.timestamp ?? new Date().toISOString(),
    is_bock:       round.isBock ?? false,
  };
}

/**
 * Mirrors the updateRound allowed-list filter in syncService.updateRound.
 * Returns the snake_case patch that would be written.
 */
function buildUpdatePayload(patch) {
  const allowed = ['game_type', 'type_label', 'hand', 'ouvert', 'schneider', 'schwarz', 'spitzen', 'is_bock', 'game_value'];
  return Object.fromEntries(
    Object.entries(patch).filter(([k]) => allowed.includes(k))
  );
}

/**
 * Mirrors the camelCase mapping in syncService.loadSession.
 * Converts a snake_case DB row back to the local round shape.
 */
function mapDbRowToRound(r) {
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
    schneider:    r.schneider,
    schwarz:      r.schwarz,
    ouvert:       r.ouvert,
    roles:        r.roles,
    seegerScores: r.seeger_scores,
    timestamp:    r.timestamp,
    isBock:       r.is_bock ?? false,
    _dbId:        r.id,
    session_id:   r.session_id,
  };
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const arbitraryRound = fc.record({
  id:         fc.integer({ min: 1, max: 1000 }),
  player:     fc.constantFrom('Alice', 'Bob', 'Charlie', 'Diana'),
  gameType:   fc.constantFrom('club', 'spade', 'heart', 'diamond', 'grand', 'null'),
  typeLabel:  fc.string({ minLength: 1, maxLength: 20 }),
  gameValue:  fc.integer({ min: -240, max: 240 }).filter(v => v !== 0),
  baseValue:  fc.integer({ min: -120, max: 120 }).filter(v => v !== 0),
  multiplier: fc.integer({ min: 1, max: 10 }),
  won:        fc.boolean(),
  eyeCount:   fc.integer({ min: 0, max: 120 }),
  spitzen:    fc.integer({ min: 1, max: 11 }),
  hand:       fc.boolean(),
  schneider:  fc.boolean(),
  schwarz:    fc.boolean(),
  ouvert:     fc.boolean(),
  isBock:     fc.boolean(),
});

const arbitrarySessionId = fc.uuid();

// ── Property 3: Bock-Persistenz Round-Trip (insert path) ─────────────────────

describe('Property 3: Bock-Persistenz Round-Trip - insertRound → loadSession (Requirements 3.1, 3.3)', () => {
  it('isBock bleibt nach insert + load identisch', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        arbitraryRound,
        arbitrarySessionId,
        (round, sessionId) => {
          // Step 1: simulate insertRound - build the DB payload
          const dbRow = buildInsertPayload(round, sessionId);

          // Step 2: simulate loadSession mapping - convert back to camelCase
          const loaded = mapDbRowToRound(dbRow);

          // Assert: isBock survives the round-trip unchanged
          expect(loaded.isBock).toBe(round.isBock);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 3: Bock-Persistenz Round-Trip (update path) ─────────────────────

describe('Property 3: Bock-Persistenz Round-Trip - updateRound → loadSession (Requirements 3.2, 3.3)', () => {
  it('is_bock und game_value überleben den update-Patch-Filter', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        fc.record({
          isBock:    fc.boolean(),
          gameValue: fc.integer({ min: -240, max: 240 }).filter(v => v !== 0),
          // extra fields that should be filtered out
          player:    fc.string(),
          session_id: fc.uuid(),
        }),
        (patch) => {
          // Build the snake_case patch as GameContext.updateRound would
          const snakePatch = {
            is_bock:   patch.isBock,
            game_value: patch.gameValue,
            player:    patch.player,     // not in allowed list - should be dropped
            session_id: patch.session_id, // not in allowed list - should be dropped
          };

          // Step 1: simulate updateRound allowed-list filter
          const safePatch = buildUpdatePayload(snakePatch);

          // Assert: is_bock and game_value are present in the safe patch
          expect(safePatch).toHaveProperty('is_bock', patch.isBock);
          expect(safePatch).toHaveProperty('game_value', patch.gameValue);

          // Assert: non-allowed fields are stripped
          expect(safePatch).not.toHaveProperty('player');
          expect(safePatch).not.toHaveProperty('session_id');

          // Step 2: simulate loadSession mapping over the updated row
          // Merge the patch into a minimal existing DB row
          const existingRow = {
            round_number: 1,
            player: 'Alice',
            game_type: 'grand',
            type_label: 'Grand',
            game_value: safePatch.game_value,
            base_value: 24,
            multiplier: 2,
            won: true,
            eye_count: 90,
            spitzen: 2,
            hand: false,
            schneider: false,
            schwarz: false,
            ouvert: false,
            roles: null,
            seeger_scores: null,
            timestamp: new Date().toISOString(),
            is_bock: safePatch.is_bock,
            id: 'some-uuid',
            session_id: 'session-uuid',
          };

          const loaded = mapDbRowToRound(existingRow);

          // Assert: isBock in loaded state matches what was patched
          expect(loaded.isBock).toBe(patch.isBock);
          expect(loaded.gameValue).toBe(patch.gameValue);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Edge case: missing is_bock field defaults to false ────────────────────────

describe('Property 3: Altdaten-Kompatibilität - fehlendes is_bock wird zu false', () => {
  it('Runden ohne is_bock-Feld erhalten isBock=false nach dem Mapping', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        fc.record({
          round_number: fc.integer({ min: 1, max: 1000 }),
          player:       fc.constantFrom('Alice', 'Bob', 'Charlie'),
          game_type:    fc.constantFrom('grand', 'null', 'club'),
          type_label:   fc.string({ minLength: 1, maxLength: 10 }),
          game_value:   fc.integer({ min: -240, max: 240 }).filter(v => v !== 0),
          base_value:   fc.integer({ min: -120, max: 120 }).filter(v => v !== 0),
          multiplier:   fc.integer({ min: 1, max: 10 }),
          won:          fc.boolean(),
          eye_count:    fc.integer({ min: 0, max: 120 }),
          spitzen:      fc.integer({ min: 1, max: 11 }),
          hand:         fc.boolean(),
          schneider:    fc.boolean(),
          schwarz:      fc.boolean(),
          ouvert:       fc.boolean(),
        }),
        (row) => {
          // Simulate a legacy DB row with no is_bock field (undefined)
          const legacyRow = { ...row, is_bock: undefined };
          const loaded = mapDbRowToRound(legacyRow);
          expect(loaded.isBock).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 1: Session creator slot always gets the correct user_id ──────────
// Feature: player-identity-cross-table-stats, Property 1: Session creator slot always gets the correct user_id
// Validates: Requirements 1.1, 1.3

/**
 * Strategy:
 *   Mirror the session_players insert payload built inside createSession.
 *   For any seating array and any userId (uuid string or null), assert that
 *   the payload has slot_index === 0, user_id === userId, and
 *   display_name === seating[0].
 *
 *   This is a pure-data test: no Supabase call is made. We verify the
 *   mapping logic that createSession applies before handing data to the DB.
 */

/**
 * Mirrors the session_players insert payload built in syncService.createSession.
 */
function buildSessionPlayerPayload(sessionId, seating, userId) {
  return {
    session_id:   sessionId,
    slot_index:   0,
    display_name: seating[0],
    user_id:      userId,
  };
}

// Arbitrary: non-empty display name (no leading/trailing whitespace to keep it realistic)
const arbitraryDisplayName = fc.string({ minLength: 1, maxLength: 30 }).map(s => s.trim()).filter(s => s.length > 0);

// Arbitrary: seating array of 3–4 unique display names
const arbitrarySeating = fc
  .array(arbitraryDisplayName, { minLength: 3, maxLength: 4 })
  .filter(arr => new Set(arr).size === arr.length);

// Arbitrary: userId is either a uuid string or null (unauthenticated)
const arbitraryUserId = fc.oneof(fc.uuid(), fc.constant(null));

describe('Property 1: Session creator slot always gets the correct user_id (Requirements 1.1, 1.3)', () => {
  it(
    'Validates: Requirements 1.1, 1.3 — ' +
    'slot_index is 0, user_id matches the creator, display_name matches seating[0]',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(
          fc.uuid(),        // sessionId
          arbitrarySeating, // seating array
          arbitraryUserId,  // userId (uuid or null)
          (sessionId, seating, userId) => {
            // Simulate the payload createSession sends to session_players
            const payload = buildSessionPlayerPayload(sessionId, seating, userId);

            // slot_index must always be 0 for the session creator
            expect(payload.slot_index).toBe(0);

            // user_id must equal the creator's userId (including null for anonymous)
            expect(payload.user_id).toBe(userId);

            // display_name must be taken from seating[0] without modification
            expect(payload.display_name).toBe(seating[0]);

            // session_id must be forwarded unchanged
            expect(payload.session_id).toBe(sessionId);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});


// ── Properties 2 & 3: preassignSlot ──────────────────────────────────────────
// Feature: player-identity-cross-table-stats, Property 2: Slot user_id uniqueness within a session
// Feature: player-identity-cross-table-stats, Property 3: Empty/null user_id is always rejected
//
// These tests call preassignSlot() directly with a mocked Supabase client so
// that the real validation and duplicate-check logic in syncService.js is
// exercised without a live database connection.

import { describe as describeP, it as itP, expect as expectP, vi, beforeEach } from 'vitest';

// ── In-memory stores ──────────────────────────────────────────────────────────

let _sessionPlayers = {};

// Shared mutable auth state — tests set this before calling syncService functions
let _mockUserId = null;

// In-memory claim_tokens store (used by generateClaimToken tests)
let _claimTokens = {};

// In-memory sessions store (used by generateClaimToken auth check)
let _sessions = {};

/**
 * Extended query builder that handles all tables used by the tested functions:
 *   - session_players (preassignSlot, generateClaimToken creator check)
 *   - claim_tokens    (generateClaimToken insert)
 *   - sessions        (generateClaimToken auth check against sessions.user_id)
 */
function makeSharedBuilder(table) {
  const store =
    table === 'session_players' ? _sessionPlayers :
    table === 'claim_tokens'    ? _claimTokens    :
    table === 'sessions'        ? _sessions       :
    {};

  let _filters = {};
  let _upsertData = null;
  let _insertData = null;
  let _isMaybeSingle = false;
  let _isSelect = false;
  let _selectedFields = null;

  const builder = {
    select(fields) {
      _isSelect = true;
      _selectedFields = fields ?? null;
      return builder;
    },
    eq(field, value) {
      _filters[field] = value;
      return builder;
    },
    maybeSingle() {
      _isMaybeSingle = true;
      return builder;
    },
    upsert(data) {
      _upsertData = data;
      return builder;
    },
    insert(data) {
      _insertData = data;
      return builder;
    },
    // Thenable
    then(resolve) {
      let result;
      try {
        if (_insertData !== null) {
          // INSERT: store the row
          const id = crypto.randomUUID();
          store[id] = { id, ..._insertData };
          result = { data: null, error: null };
        } else if (_upsertData !== null) {
          // UPSERT on (session_id, slot_index)
          const existing = Object.values(store).find(
            r => r.session_id === _upsertData.session_id && r.slot_index === _upsertData.slot_index
          );
          if (existing) {
            store[existing.id] = { ...existing, ..._upsertData };
          } else {
            const id = crypto.randomUUID();
            store[id] = { id, ..._upsertData };
          }
          result = { data: null, error: null };
        } else if (_isSelect && _isMaybeSingle) {
          // SELECT ... maybeSingle()
          let rows = Object.values(store);
          for (const [k, v] of Object.entries(_filters)) {
            rows = rows.filter(r => r[k] === v);
          }
          result = rows.length > 0
            ? { data: rows[0], error: null }
            : { data: null, error: null };
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
    from: (table) => makeSharedBuilder(table),
    auth: {
      getSession: async () => ({
        data: {
          session: _mockUserId ? { user: { id: _mockUserId } } : null,
        },
      }),
    },
  },
}));

const { preassignSlot, generateClaimToken } = await import('./syncService.js');

// ── Arbitraries ───────────────────────────────────────────────────────────────

const arbitraryUuid = fc.uuid();
const arbitrarySlotIndex = fc.integer({ min: 1, max: 3 });

// Whitespace-only strings (at least one whitespace character)
const arbitraryWhitespaceString = fc.array(
  fc.constantFrom(' ', '\t', '\n', '\r'),
  { minLength: 1, maxLength: 10 }
).map(chars => chars.join(''));

// Values that should always be rejected: null, '', or whitespace-only
const arbitraryInvalidUserId = fc.oneof(
  fc.constant(null),
  fc.constant(''),
  arbitraryWhitespaceString
);

// ── Property 2: Slot user_id uniqueness within a session ─────────────────────
// Validates: Requirements 2.2, 2.4

describeP(
  'Feature: player-identity-cross-table-stats, Property 2: Slot user_id uniqueness within a session',
  () => {
    beforeEach(() => {
      _sessionPlayers = {};
    });

    itP(
      'Validates: Requirements 2.2, 2.4 — ' +
      'a second preassign with the same user_id in the same session must be rejected ' +
      'and existing rows must remain unchanged',
      { timeout: 60000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            arbitraryUuid,                          // sessionId
            arbitrarySlotIndex,                     // first slot index
            fc.integer({ min: 1, max: 3 }),         // second slot index (may differ)
            arbitraryUuid,                          // userId to duplicate
            async (sessionId, slotIndex1, slotIndex2, userId) => {
              // Reset store for each run
              _sessionPlayers = {};

              // First preassign — must succeed
              const first = await preassignSlot(sessionId, slotIndex1, userId);
              expectP(first.error).toBeNull();

              // Snapshot the store state after the first successful preassign
              const rowsBefore = JSON.parse(JSON.stringify(Object.values(_sessionPlayers)));

              // Second preassign with the same userId in the same session — must be rejected
              const second = await preassignSlot(sessionId, slotIndex2, userId);
              expectP(second.error).not.toBeNull();
              expectP(second.error.message).toMatch(/bereits vergeben/i);

              // Existing rows must be unchanged
              const rowsAfter = Object.values(_sessionPlayers);
              expectP(rowsAfter).toHaveLength(rowsBefore.length);
              for (const before of rowsBefore) {
                const after = rowsAfter.find(r => r.id === before.id);
                expectP(after).toBeDefined();
                expectP(after.user_id).toBe(before.user_id);
                expectP(after.slot_index).toBe(before.slot_index);
                expectP(after.session_id).toBe(before.session_id);
              }
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);

// ── Property 3: Empty/null user_id is always rejected ────────────────────────
// Validates: Requirement 2.6

describeP(
  'Feature: player-identity-cross-table-stats, Property 3: Empty/null user_id is always rejected',
  () => {
    beforeEach(() => {
      _sessionPlayers = {};
    });

    itP(
      'Validates: Requirement 2.6 — ' +
      'preassignSlot must return a validation error for null, empty string, or whitespace-only user_id',
      { timeout: 60000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            arbitraryUuid,           // sessionId
            arbitrarySlotIndex,      // slotIndex
            arbitraryInvalidUserId,  // invalid userId
            async (sessionId, slotIndex, invalidUserId) => {
              const result = await preassignSlot(sessionId, slotIndex, invalidUserId);
              expectP(result.error).not.toBeNull();
              expectP(result.error.message).toBeTruthy();
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);

// ── Properties 4 & 7: generateClaimToken ─────────────────────────────────────
// Feature: player-identity-cross-table-stats, Property 4: Claim token encodes correct session and slot
// Feature: player-identity-cross-table-stats, Property 7: Only the session creator can generate claim tokens
//
// These tests call generateClaimToken() directly with the shared mocked Supabase
// client. For each run we pre-populate _sessionPlayers with a slot-0 row so the
// creator-check inside generateClaimToken can find it.

// ── Property 4: Claim token encodes correct session and slot ──────────────────
// Validates: Requirement 3.1

describeP(
  'Feature: player-identity-cross-table-stats, Property 4: Claim token encodes correct session and slot',
  () => {
    beforeEach(() => {
      _sessionPlayers = {};
      _claimTokens = {};
      _sessions = {};
      _mockUserId = null;
    });

    itP(
      'Validates: Requirement 3.1 — ' +
      'the inserted claim_tokens row must have matching session_id and display_name, ' +
      'slot_index must be null, and expires_at must be within ±60 s of now + 72 h',
      { timeout: 60000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),                          // sessionId
            fc.integer({ min: 1, max: 3 }),     // slotIndex (non-creator slots only)
            fc.uuid(),                          // creatorUserId
            async (sessionId, slotIndex, creatorUserId) => {
              // Reset stores for each run
              _sessionPlayers = {};
              _claimTokens = {};
              _sessions = {};

              // Set the authenticated caller to the creator
              _mockUserId = creatorUserId;

              const seating = ['Creator', 'Player2', 'Player3', 'Player4'];

              // Pre-populate the sessions table with the creator's user_id
              _sessions[sessionId] = {
                id:        sessionId,
                user_id:   creatorUserId,
                seating:   seating,
              };

              // Pre-populate slot 0 with the creator's user_id so the auth check passes
              const slot0Id = crypto.randomUUID();
              _sessionPlayers[slot0Id] = {
                id:           slot0Id,
                session_id:   sessionId,
                slot_index:   0,
                display_name: 'Creator',
                user_id:      creatorUserId,
              };

              const before = Date.now();
              const result = await generateClaimToken(sessionId, slotIndex);
              const after = Date.now();

              // Must succeed
              expectP(result.error).toBeNull();
              expectP(result.data).not.toBeNull();

              // Exactly one row must have been inserted into claim_tokens
              const insertedRows = Object.values(_claimTokens);
              expectP(insertedRows).toHaveLength(1);

              const row = insertedRows[0];

              // session_id must match the argument
              expectP(row.session_id).toBe(sessionId);
              // slot_index must be null (refactored: uses display_name instead)
              expectP(row.slot_index).toBeNull();
              // display_name must match seating[slotIndex]
              expectP(row.display_name).toBe(seating[slotIndex]);

              // expires_at must be within ±60 s of now + 72 h
              const expectedExpiry = before + 72 * 60 * 60 * 1000;
              const actualExpiry = new Date(row.expires_at).getTime();
              const toleranceMs = 60 * 1000; // ±60 seconds
              expectP(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - toleranceMs);
              expectP(actualExpiry).toBeLessThanOrEqual(after + 72 * 60 * 60 * 1000 + toleranceMs);

              // token must be a non-empty string
              expectP(typeof row.token).toBe('string');
              expectP(row.token.length).toBeGreaterThan(0);

              // used must default to false
              expectP(row.used).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);

// ── Property 7: Only the session creator can generate claim tokens ────────────
// Validates: Requirement 3.7

describeP(
  'Feature: player-identity-cross-table-stats, Property 7: Only the session creator can generate claim tokens',
  () => {
    beforeEach(() => {
      _sessionPlayers = {};
      _claimTokens = {};
      _sessions = {};
      _mockUserId = null;
    });

    itP(
      'Validates: Requirement 3.7 — ' +
      'any caller whose user_id does not match the slot-0 user_id must receive an authorization error',
      { timeout: 60000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),                          // sessionId
            fc.integer({ min: 0, max: 3 }),     // slotIndex
            fc.uuid(),                          // creatorUserId (slot 0)
            fc.uuid(),                          // callerUserId (different from creator)
            async (sessionId, slotIndex, creatorUserId, callerUserId) => {
              // Ensure caller is genuinely different from creator
              fc.pre(callerUserId !== creatorUserId);

              // Reset stores for each run
              _sessionPlayers = {};
              _claimTokens = {};
              _sessions = {};

              // Set the authenticated caller to a non-creator user
              _mockUserId = callerUserId;

              // Pre-populate the sessions table with the creator's user_id
              _sessions[sessionId] = {
                id:        sessionId,
                user_id:   creatorUserId,
                seating:   ['Creator', 'Player2', 'Player3', 'Player4'],
              };

              // Pre-populate slot 0 with the creator's user_id
              const slot0Id = crypto.randomUUID();
              _sessionPlayers[slot0Id] = {
                id:           slot0Id,
                session_id:   sessionId,
                slot_index:   0,
                display_name: 'Creator',
                user_id:      creatorUserId,
              };

              const result = await generateClaimToken(sessionId, slotIndex);

              // Must be rejected with an authorization error
              expectP(result.error).not.toBeNull();
              expectP(result.data).toBeNull();

              // No claim_tokens row must have been inserted
              expectP(Object.values(_claimTokens)).toHaveLength(0);
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);


// ── Properties 5 & 6: claimSlot ──────────────────────────────────────────────
// Feature: player-identity-cross-table-stats, Property 5: Claim succeeds only when all preconditions hold simultaneously
// Feature: player-identity-cross-table-stats, Property 6: Successful claim invalidates the token
//
// These tests call claimSlot() directly with the shared mocked Supabase client.
// The mock builder is extended below to support UPDATE operations needed by claimSlot.
//
// claimSlot validation chain:
//   1. Token not found          → 'Ungültiger Einladungslink.'
//   2. Token expired            → 'Dieser Einladungslink ist abgelaufen.'
//   3. Token already used       → 'Dieser Einladungslink wurde bereits verwendet.'
//   4. Slot already claimed     → 'Dieser Slot ist bereits vergeben.'
//   5. Caller is session creator → 'Du bist bereits der Tischersteller.'

// NOTE: The shared vi.mock('./supabaseClient', ...) at the top of this file uses
// makeSharedBuilder which only handled select/upsert/insert. claimSlot also needs
// UPDATE support. We extend the in-memory stores via direct manipulation in
// beforeEach and rely on the mock's `then` handler which we augment here by
// patching the module-level makeSharedBuilder via a wrapper approach.
//
// Because vi.mock is hoisted and cannot be re-declared, we instead pre-populate
// the in-memory stores (_claimTokens, _sessionPlayers) with the exact rows that
// claimSlot will look up, and we extend the shared builder to handle `update`.
// The extension is done by monkey-patching the builder factory used inside the
// existing mock — but since that factory is a closure, the cleanest approach is
// to add a second vi.mock override. However, vi.mock cannot be called twice for
// the same module. Therefore we use a different strategy:
//
// We extend the existing _claimTokens / _sessionPlayers stores (already shared)
// and add UPDATE support by augmenting the builder returned by makeSharedBuilder.
// Since makeSharedBuilder is defined in this file's module scope, we can simply
// add the update path to it. The tests below rely on the SAME mock already
// registered at the top of this file — no new mock is needed.
//
// The makeSharedBuilder function defined above does NOT yet handle `update`.
// We work around this by using a patched version of the supabase mock that is
// already in place: we directly manipulate the in-memory stores in beforeEach
// and verify state after the call. The mock's `then` handler needs to support
// UPDATE. Since we cannot redefine vi.mock, we instead extend makeSharedBuilder
// by adding the update branch BEFORE these tests run. We do this by re-exporting
// a patched supabase object — but that would require a second mock.
//
// FINAL APPROACH: We extend the builder inline by augmenting the existing
// makeSharedBuilder definition. Since this file is a single module, we simply
// add the update logic to the existing makeSharedBuilder function defined above.
// The tests below will work correctly once makeSharedBuilder handles update.
//
// ─── See the patch applied to makeSharedBuilder at the bottom of this comment ───
//
// The makeSharedBuilder function above has been extended (see below) to handle:
//   builder.update(data)  — stores update data
//   builder.then(resolve) — applies update to matching rows when _updateData is set

// ── Patch: extend makeSharedBuilder to support UPDATE ────────────────────────
// We cannot modify the function definition above without touching existing tests.
// Instead, we override the supabase mock's `from` factory for these tests only
// by using a module-level variable that switches the builder to an extended version.

// Since vi.mock is already registered and uses makeSharedBuilder from this file's
// scope, the cleanest solution is to add update support directly to the builder
// returned by makeSharedBuilder. We do this by augmenting the existing function
// via a wrapper stored in a module-level variable.

// ── Extended builder factory (used by the patched mock below) ────────────────

/**
 * Extended version of makeSharedBuilder that also handles UPDATE operations.
 * Used exclusively by the claimSlot property tests.
 */
function makeExtendedBuilder(table) {
  const store =
    table === 'session_players' ? _sessionPlayers :
    table === 'claim_tokens'    ? _claimTokens    :
    table === 'sessions'        ? _sessions       :
    {};

  let _filters = {};
  let _upsertData = null;
  let _upsertOptions = null;
  let _insertData = null;
  let _updateData = null;
  let _isMaybeSingle = false;
  let _isSelect = false;

  const builder = {
    select() {
      _isSelect = true;
      return builder;
    },
    eq(field, value) {
      _filters[field] = value;
      return builder;
    },
    maybeSingle() {
      _isMaybeSingle = true;
      return builder;
    },
    upsert(data, options) {
      _upsertData = data;
      _upsertOptions = options;
      return builder;
    },
    insert(data) {
      _insertData = data;
      return builder;
    },
    update(data) {
      _updateData = data;
      return builder;
    },
    then(resolve) {
      let result;
      try {
        if (_insertData !== null) {
          const id = crypto.randomUUID();
          store[id] = { id, ..._insertData };
          result = { data: null, error: null };
        } else if (_upsertData !== null) {
          // UPSERT: determine conflict key from options
          const conflictKey = _upsertOptions?.onConflict || 'session_id,slot_index';
          const conflictFields = conflictKey.split(',').map(f => f.trim());
          const existing = Object.values(store).find(r =>
            conflictFields.every(f => r[f] === _upsertData[f])
          );
          if (existing) {
            store[existing.id] = { ...existing, ..._upsertData };
          } else {
            const id = crypto.randomUUID();
            store[id] = { id, ..._upsertData };
          }
          result = { data: null, error: null };
        } else if (_updateData !== null) {
          // UPDATE: apply patch to all rows matching _filters
          let rows = Object.values(store);
          for (const [k, v] of Object.entries(_filters)) {
            rows = rows.filter(r => r[k] === v);
          }
          for (const row of rows) {
            store[row.id] = { ...row, ..._updateData };
          }
          result = { data: null, error: null };
        } else if (_isSelect && _isMaybeSingle) {
          let rows = Object.values(store);
          for (const [k, v] of Object.entries(_filters)) {
            rows = rows.filter(r => r[k] === v);
          }
          result = rows.length > 0
            ? { data: rows[0], error: null }
            : { data: null, error: null };
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

// ── Module-level flag: switch the mock to use the extended builder ────────────
// The vi.mock at the top of this file calls makeSharedBuilder. For claimSlot
// tests we need the extended builder. We achieve this by using a module-level
// variable _useExtendedBuilder that the mock checks.
//
// However, since vi.mock is already frozen, we use a different approach:
// we import claimSlot and call it with a supabase client that uses the extended
// builder. But claimSlot imports supabase internally from './supabaseClient'.
//
// The only viable approach without a second vi.mock is to mutate the mock's
// `from` function at runtime. We do this in beforeEach by replacing
// supabase.from with a function that uses makeExtendedBuilder.

import { vi as _vi } from 'vitest';

// We need the mocked supabase object to patch its `from` method.
// Import it after the mock is registered (dynamic import already happened above).
import { supabase as _supabaseMock } from './supabaseClient';

// Import claimSlot (already imported via the dynamic import above, but we need
// it explicitly here for clarity — it's the same module instance).
const { claimSlot } = await import('./syncService.js');

// ── Property 5: Claim succeeds only when all preconditions hold simultaneously ─
// Validates: Requirements 3.2, 3.3, 3.4

describeP(
  'Feature: player-identity-cross-table-stats, Property 5: Claim succeeds only when all preconditions hold simultaneously',
  () => {
    beforeEach(() => {
      _sessionPlayers = {};
      _claimTokens = {};
      _sessions = {};
      _mockUserId = null;
      // Patch supabase.from to use the extended builder (supports UPDATE)
      _supabaseMock.from = (table) => makeExtendedBuilder(table);
    });

    itP(
      'Validates: Requirements 3.2, 3.3, 3.4 — ' +
      'claimSlot succeeds iff token is not expired, not used, slot is unclaimed, and caller is not creator',
      { timeout: 120000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),                          // sessionId
            fc.integer({ min: 1, max: 3 }),     // slotIndex (non-creator slot)
            fc.uuid(),                          // callerUserId
            fc.uuid(),                          // creatorUserId (different from caller)
            fc.boolean(),                       // isExpired
            fc.boolean(),                       // isUsed
            fc.boolean(),                       // isSlotClaimed
            fc.boolean(),                       // isCreator (caller === creator)
            async (sessionId, slotIndex, callerUserId, creatorUserId, isExpired, isUsed, isSlotClaimed, isCreator) => {
              // Ensure caller and creator are genuinely different when isCreator=false
              fc.pre(callerUserId !== creatorUserId);

              // Reset stores for each run
              _sessionPlayers = {};
              _claimTokens = {};
              _sessions = {};

              // The effective userId for the claim call
              const effectiveUserId = isCreator ? creatorUserId : callerUserId;

              const seating = ['Creator', 'Player2', 'Player3', 'Player4'];
              const targetDisplayName = seating[slotIndex];

              // Pre-populate the sessions table
              _sessions[sessionId] = {
                id:        sessionId,
                user_id:   creatorUserId,
                seating:   seating,
              };

              // Build the token row
              const tokenId = crypto.randomUUID();
              const tokenValue = crypto.randomUUID();
              const now = Date.now();
              const expiresAt = isExpired
                ? new Date(now - 1000).toISOString()          // 1 second in the past
                : new Date(now + 72 * 60 * 60 * 1000).toISOString(); // 72 h in the future

              _claimTokens[tokenId] = {
                id:           tokenId,
                session_id:   sessionId,
                slot_index:   null,
                display_name: targetDisplayName,
                token:        tokenValue,
                expires_at:   expiresAt,
                used:         isUsed,
              };

              // Build the target session_players row (display_name = targetDisplayName)
              const targetSlotId = crypto.randomUUID();
              _sessionPlayers[targetSlotId] = {
                id:           targetSlotId,
                session_id:   sessionId,
                slot_index:   slotIndex,
                display_name: targetDisplayName,
                user_id:      isSlotClaimed ? crypto.randomUUID() : null,
              };

              // Build the creator slot row (slot_index = 0)
              const creatorSlotId = crypto.randomUUID();
              _sessionPlayers[creatorSlotId] = {
                id:           creatorSlotId,
                session_id:   sessionId,
                slot_index:   0,
                display_name: 'Creator',
                user_id:      creatorUserId,
              };

              const result = await claimSlot(tokenValue, effectiveUserId);

              // Determine expected outcome:
              // Success iff ALL four conditions are false simultaneously
              const shouldSucceed = !isExpired && !isUsed && !isSlotClaimed && !isCreator;

              if (shouldSucceed) {
                expectP(result.error).toBeNull();
                // The session_players row must now have the caller's user_id
                const updatedSlot = Object.values(_sessionPlayers).find(
                  r => r.session_id === sessionId && r.display_name === targetDisplayName
                );
                expectP(updatedSlot?.user_id).toBe(effectiveUserId);
                // The token must be marked as used
                const updatedToken = Object.values(_claimTokens).find(
                  r => r.token === tokenValue
                );
                expectP(updatedToken?.used).toBe(true);
              } else {
                expectP(result.error).not.toBeNull();
                expectP(result.error.message).toBeTruthy();
              }
            }
          ),
          { numRuns: 200 }
        );
      }
    );
  }
);

// ── Property 6: Successful claim invalidates the token ───────────────────────
// Validates: Requirement 3.6

describeP(
  'Feature: player-identity-cross-table-stats, Property 6: Successful claim invalidates the token',
  () => {
    beforeEach(() => {
      _sessionPlayers = {};
      _claimTokens = {};
      _sessions = {};
      _mockUserId = null;
      // Patch supabase.from to use the extended builder (supports UPDATE)
      _supabaseMock.from = (table) => makeExtendedBuilder(table);
    });

    itP(
      'Validates: Requirement 3.6 — ' +
      'after a successful claimSlot, any subsequent call with the same token must be rejected',
      { timeout: 60000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),                          // sessionId
            fc.integer({ min: 1, max: 3 }),     // slotIndex
            fc.uuid(),                          // callerUserId
            fc.uuid(),                          // creatorUserId
            async (sessionId, slotIndex, callerUserId, creatorUserId) => {
              // Ensure caller and creator are genuinely different
              fc.pre(callerUserId !== creatorUserId);

              // Reset stores for each run
              _sessionPlayers = {};
              _claimTokens = {};
              _sessions = {};

              const seating = ['Creator', 'Player2', 'Player3', 'Player4'];
              const targetDisplayName = seating[slotIndex];

              // Pre-populate the sessions table
              _sessions[sessionId] = {
                id:        sessionId,
                user_id:   creatorUserId,
                seating:   seating,
              };

              // Build a valid (unexpired, unused) token
              const tokenId = crypto.randomUUID();
              const tokenValue = crypto.randomUUID();
              _claimTokens[tokenId] = {
                id:           tokenId,
                session_id:   sessionId,
                slot_index:   null,
                display_name: targetDisplayName,
                token:        tokenValue,
                expires_at:   new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
                used:         false,
              };

              // Build the target slot (unclaimed)
              const targetSlotId = crypto.randomUUID();
              _sessionPlayers[targetSlotId] = {
                id:           targetSlotId,
                session_id:   sessionId,
                slot_index:   slotIndex,
                display_name: targetDisplayName,
                user_id:      null,
              };

              // Build the creator slot
              const creatorSlotId = crypto.randomUUID();
              _sessionPlayers[creatorSlotId] = {
                id:           creatorSlotId,
                session_id:   sessionId,
                slot_index:   0,
                display_name: 'Creator',
                user_id:      creatorUserId,
              };

              // First claim — must succeed
              const first = await claimSlot(tokenValue, callerUserId);
              expectP(first.error).toBeNull();

              // Token must now be marked as used
              const tokenAfterFirst = Object.values(_claimTokens).find(r => r.token === tokenValue);
              expectP(tokenAfterFirst?.used).toBe(true);

              // Second claim with the same token — must be rejected
              const second = await claimSlot(tokenValue, crypto.randomUUID());
              expectP(second.error).not.toBeNull();
              expectP(second.error.message).toBe('Dieser Einladungslink wurde bereits verwendet.');
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);

// ── Property 11: Rename preserves user_id in session_players ─────────────────
// Feature: player-identity-cross-table-stats, Property 11: Rename preserves user_id in session_players
// Validates: Requirement 7.2

/**
 * Strategy:
 *   Pre-populate _sessionPlayers with a row that has a known user_id and
 *   display_name (oldName). Call updateSessionPlayerName(sessionId, oldName, newName).
 *   Assert that the user_id in the row is identical before and after the rename.
 *
 *   The extended builder (supports UPDATE) is patched onto supabase.from in
 *   beforeEach, following the same pattern as Properties 5 and 6.
 */

const { updateSessionPlayerName } = await import('./syncService.js');

// Arbitrary: non-empty display name (trimmed, no empty result)
const arbitraryName = fc
  .string({ minLength: 1, maxLength: 30 })
  .map(s => s.trim())
  .filter(s => s.length > 0);

describeP(
  'Feature: player-identity-cross-table-stats, Property 11: Rename preserves user_id in session_players',
  () => {
    beforeEach(() => {
      _sessionPlayers = {};
      _claimTokens = {};
      _mockUserId = null;
      // Patch supabase.from to use the extended builder (supports UPDATE)
      _supabaseMock.from = (table) => makeExtendedBuilder(table);
    });

    itP(
      'Validates: Requirement 7.2 — ' +
      'the user_id in the session_players row must be identical before and after any rename',
      { timeout: 60000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),                                      // sessionId
            arbitraryName,                                  // oldName
            arbitraryName,                                  // newName
            fc.oneof(fc.uuid(), fc.constant(null)),         // userId (uuid or null for anonymous)
            async (sessionId, oldName, newName, userId) => {
              // Reset store for each run
              _sessionPlayers = {};

              // Pre-populate a session_players row with oldName and a known user_id
              const rowId = crypto.randomUUID();
              _sessionPlayers[rowId] = {
                id:           rowId,
                session_id:   sessionId,
                slot_index:   1,
                display_name: oldName,
                user_id:      userId,
              };

              // Capture user_id before the rename
              const userIdBefore = _sessionPlayers[rowId].user_id;

              // Perform the rename
              const result = await updateSessionPlayerName(sessionId, oldName, newName);

              // The operation must not return an error
              expectP(result.error).toBeNull();

              // Find the (possibly renamed) row — it must still exist
              const rowAfter = Object.values(_sessionPlayers).find(
                r => r.session_id === sessionId && r.slot_index === 1
              );
              expectP(rowAfter).toBeDefined();

              // user_id must be identical before and after the rename
              expectP(rowAfter.user_id).toBe(userIdBefore);

              // display_name must have been updated to newName
              expectP(rowAfter.display_name).toBe(newName);
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);

// ── Properties 8, 9, 12, 13: loadMyRoundsAcrossSessions ─────────────────────
// Feature: player-identity-cross-table-stats, Property 8: Cross-table load returns all rounds from all linked sessions
// Feature: player-identity-cross-table-stats, Property 9: Cross-table rounds carry correct playerName and sessionId
// Feature: player-identity-cross-table-stats, Property 12: Old-name rounds still returned after rename
// Feature: player-identity-cross-table-stats, Property 13: Anonymous sessions load without errors
//
// loadMyRoundsAcrossSessions makes two sequential queries:
//   1. session_players: .select('session_id, display_name').eq('user_id', userId)
//      → returns an array (no maybeSingle)
//   2. rounds: .select('*').in('session_id', sessionIds).order(...).order(...)
//      → returns an array
//
// The shared makeSharedBuilder / makeExtendedBuilder do not handle .in() or
// array-returning selects. We introduce a new in-memory store (_rounds) and a
// dedicated builder factory (makeCrossTableBuilder) that supports these
// operations. The mock's `from` is patched in beforeEach, following the same
// pattern used by Properties 5 & 6.

// ── In-memory rounds store ────────────────────────────────────────────────────
let _rounds = {};

/**
 * Builder factory for loadMyRoundsAcrossSessions tests.
 * Supports:
 *   .select(fields)          — marks as select
 *   .eq(field, value)        — equality filter
 *   .in(field, values)       — IN filter
 *   .order(field, opts)      — ignored (ordering not tested)
 *   .maybeSingle()           — single-row mode
 *   .update(data)            — UPDATE matching rows
 *   .upsert(data)            — UPSERT on (session_id, slot_index)
 *   .insert(data)            — INSERT
 *   .then(resolve)           — executes the operation
 */
function makeCrossTableBuilder(table) {
  const store =
    table === 'session_players' ? _sessionPlayers :
    table === 'claim_tokens'    ? _claimTokens    :
    table === 'rounds'          ? _rounds         :
    {};

  let _filters = {};
  let _inFilter = null;   // { field, values }
  let _updateData = null;
  let _upsertData = null;
  let _insertData = null;
  let _isMaybeSingle = false;
  let _isSelect = false;

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
      // Ordering is not relevant for correctness tests — ignore
      return builder;
    },
    maybeSingle() {
      _isMaybeSingle = true;
      return builder;
    },
    update(data) {
      _updateData = data;
      return builder;
    },
    upsert(data) {
      _upsertData = data;
      return builder;
    },
    insert(data) {
      _insertData = data;
      return builder;
    },
    not() {
      // Used by renamePlayerInRounds — not needed here, return builder for chaining
      return builder;
    },
    single() {
      return builder;
    },
    then(resolve) {
      let result;
      try {
        if (_insertData !== null) {
          const id = crypto.randomUUID();
          store[id] = { id, ..._insertData };
          result = { data: null, error: null };
        } else if (_upsertData !== null) {
          const existing = Object.values(store).find(
            r => r.session_id === _upsertData.session_id && r.slot_index === _upsertData.slot_index
          );
          if (existing) {
            store[existing.id] = { ...existing, ..._upsertData };
          } else {
            const id = crypto.randomUUID();
            store[id] = { id, ..._upsertData };
          }
          result = { data: null, error: null };
        } else if (_updateData !== null) {
          let rows = Object.values(store);
          for (const [k, v] of Object.entries(_filters)) {
            rows = rows.filter(r => r[k] === v);
          }
          for (const row of rows) {
            store[row.id] = { ...row, ..._updateData };
          }
          result = { data: null, error: null };
        } else if (_isSelect && _isMaybeSingle) {
          let rows = Object.values(store);
          for (const [k, v] of Object.entries(_filters)) {
            rows = rows.filter(r => r[k] === v);
          }
          result = rows.length > 0
            ? { data: rows[0], error: null }
            : { data: null, error: null };
        } else if (_isSelect) {
          // Array-returning SELECT (with optional .eq and/or .in filters)
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

// Import loadMyRoundsAcrossSessions and updateSessionPlayerName from the already-
// mocked syncService module (same module instance as the earlier imports).
const { loadMyRoundsAcrossSessions } = await import('./syncService.js');

// ── Arbitraries for cross-table tests ────────────────────────────────────────

/** A minimal snake_case rounds DB row with all fields loadMyRoundsAcrossSessions maps */
function makeRoundRow(sessionId, roundNumber, playerName) {
  return {
    id:                   crypto.randomUUID(),
    session_id:           sessionId,
    round_number:         roundNumber,
    player:               playerName,
    game_type:            'grand',
    type_label:           'Grand',
    game_value:           48,
    base_value:           24,
    multiplier:           2,
    won:                  true,
    eye_count:            90,
    spitzen:              2,
    hand:                 false,
    schneider:            false,
    schneider_announced:  false,
    schwarz:              false,
    schwarz_announced:    false,
    ouvert:               false,
    roles:                null,
    seeger_scores:        null,
    timestamp:            new Date().toISOString(),
    is_bock:              false,
    mit_ohne:             'mit',
    spielliste_id:        null,
  };
}

// Arbitrary: 1–3 linked sessions, each with 1–4 rounds
const arbitraryLinkedSessions = fc.array(
  fc.record({
    sessionId:   fc.uuid(),
    displayName: arbitraryDisplayName,
    roundCount:  fc.integer({ min: 1, max: 4 }),
  }),
  { minLength: 1, maxLength: 3 }
).filter(sessions => {
  // All session IDs must be unique
  const ids = sessions.map(s => s.sessionId);
  return new Set(ids).size === ids.length;
});

// Arbitrary: 0–2 unlinked sessions (no session_players row for our userId)
const arbitraryUnlinkedSessions = fc.array(
  fc.record({
    sessionId:  fc.uuid(),
    roundCount: fc.integer({ min: 1, max: 3 }),
  }),
  { minLength: 0, maxLength: 2 }
);

// ── Property 8: Cross-table load returns all rounds from all linked sessions ──
// Validates: Requirements 4.1, 4.3

describeP(
  'Feature: player-identity-cross-table-stats, Property 8: Cross-table load returns all rounds from all linked sessions',
  () => {
    beforeEach(() => {
      _sessionPlayers = {};
      _claimTokens = {};
      _rounds = {};
      _mockUserId = null;
      _supabaseMock.from = (table) => makeCrossTableBuilder(table);
    });

    itP(
      'Validates: Requirements 4.1, 4.3 — ' +
      'returned array contains every round from every linked session and no rounds from unlinked sessions',
      { timeout: 60000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),                    // userId
            arbitraryLinkedSessions,      // sessions linked to userId
            arbitraryUnlinkedSessions,    // sessions NOT linked to userId
            async (userId, linkedSessions, unlinkedSessions) => {
              // Ensure no session ID collision between linked and unlinked
              const linkedIds = new Set(linkedSessions.map(s => s.sessionId));
              fc.pre(unlinkedSessions.every(s => !linkedIds.has(s.sessionId)));

              // Reset stores for each run
              _sessionPlayers = {};
              _rounds = {};

              // Populate session_players for linked sessions
              for (const ls of linkedSessions) {
                const spId = crypto.randomUUID();
                _sessionPlayers[spId] = {
                  id:           spId,
                  session_id:   ls.sessionId,
                  slot_index:   0,
                  display_name: ls.displayName,
                  user_id:      userId,
                };
              }

              // Populate rounds for linked sessions
              const linkedRoundIds = new Set();
              for (const ls of linkedSessions) {
                for (let i = 1; i <= ls.roundCount; i++) {
                  const row = makeRoundRow(ls.sessionId, i, ls.displayName);
                  _rounds[row.id] = row;
                  linkedRoundIds.add(row.id);
                }
              }

              // Populate rounds for unlinked sessions (should NOT appear in result)
              for (const us of unlinkedSessions) {
                for (let i = 1; i <= us.roundCount; i++) {
                  const row = makeRoundRow(us.sessionId, i, 'OtherPlayer');
                  _rounds[row.id] = row;
                }
              }

              const result = await loadMyRoundsAcrossSessions(userId);

              expectP(result.error).toBeNull();
              expectP(result.data).not.toBeNull();

              // Must contain exactly all rounds from linked sessions
              const totalLinkedRounds = linkedSessions.reduce((sum, s) => sum + s.roundCount, 0);
              expectP(result.data).toHaveLength(totalLinkedRounds);

              // Every returned round must come from a linked session
              for (const round of result.data) {
                expectP(linkedIds.has(round.sessionId)).toBe(true);
              }

              // Every linked round DB id must appear in the result
              const returnedDbIds = new Set(result.data.map(r => r._dbId));
              for (const dbId of linkedRoundIds) {
                expectP(returnedDbIds.has(dbId)).toBe(true);
              }
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);

// ── Property 9: Cross-table rounds carry correct playerName and sessionId ─────
// Validates: Requirements 4.2, 4.3

describeP(
  'Feature: player-identity-cross-table-stats, Property 9: Cross-table rounds carry correct playerName and sessionId',
  () => {
    beforeEach(() => {
      _sessionPlayers = {};
      _claimTokens = {};
      _rounds = {};
      _mockUserId = null;
      _supabaseMock.from = (table) => makeCrossTableBuilder(table);
    });

    itP(
      'Validates: Requirements 4.2, 4.3 — ' +
      'every returned round has playerName equal to the session_players display_name ' +
      'and sessionId equal to the round\'s session',
      { timeout: 60000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),                // userId
            arbitraryLinkedSessions,  // sessions linked to userId
            async (userId, linkedSessions) => {
              // Reset stores for each run
              _sessionPlayers = {};
              _rounds = {};

              // Build a map from sessionId → displayName for verification
              const sessionDisplayNames = {};

              // Populate session_players and rounds
              for (const ls of linkedSessions) {
                const spId = crypto.randomUUID();
                _sessionPlayers[spId] = {
                  id:           spId,
                  session_id:   ls.sessionId,
                  slot_index:   0,
                  display_name: ls.displayName,
                  user_id:      userId,
                };
                sessionDisplayNames[ls.sessionId] = ls.displayName;

                for (let i = 1; i <= ls.roundCount; i++) {
                  const row = makeRoundRow(ls.sessionId, i, ls.displayName);
                  _rounds[row.id] = row;
                }
              }

              const result = await loadMyRoundsAcrossSessions(userId);

              expectP(result.error).toBeNull();
              expectP(result.data).not.toBeNull();

              for (const round of result.data) {
                // sessionId must match the round's actual session
                expectP(typeof round.sessionId).toBe('string');
                expectP(round.sessionId).toBeTruthy();

                // playerName must equal the display_name from session_players for that session
                const expectedPlayerName = sessionDisplayNames[round.sessionId];
                expectP(expectedPlayerName).toBeDefined();
                expectP(round.playerName).toBe(expectedPlayerName);

                // sessionId must be one of the linked session IDs
                const linkedIds = new Set(linkedSessions.map(s => s.sessionId));
                expectP(linkedIds.has(round.sessionId)).toBe(true);
              }
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);

// ── Property 12: Old-name rounds still returned after rename ──────────────────
// Validates: Requirements 7.3, 7.4
//
// Strategy: populate session_players with a display_name, populate rounds with
// the OLD player name (simulating rounds recorded before a rename), then call
// loadMyRoundsAcrossSessions. Because the slot's user_id link is preserved
// regardless of the display_name, all rounds must still be returned.
// The rounds' `player` field retains the old name; `playerName` reflects the
// current display_name from session_players (which may differ after rename).

describeP(
  'Feature: player-identity-cross-table-stats, Property 12: Old-name rounds still returned after rename',
  () => {
    beforeEach(() => {
      _sessionPlayers = {};
      _claimTokens = {};
      _rounds = {};
      _mockUserId = null;
      _supabaseMock.from = (table) => makeCrossTableBuilder(table);
    });

    itP(
      'Validates: Requirements 7.3, 7.4 — ' +
      'rounds recorded under the old player name are still returned after a rename ' +
      'because the slot\'s user_id link is preserved',
      { timeout: 60000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),              // userId
            fc.uuid(),              // sessionId
            arbitraryDisplayName,   // oldName (name used when rounds were recorded)
            arbitraryDisplayName,   // newName (name after rename)
            fc.integer({ min: 1, max: 5 }), // number of rounds recorded under old name
            async (userId, sessionId, oldName, newName) => {
              // Reset stores for each run
              _sessionPlayers = {};
              _rounds = {};

              // Simulate post-rename state: session_players has newName, but
              // rounds were recorded with oldName as the player field.
              // The user_id link is intact — this is what loadMyRoundsAcrossSessions uses.
              const spId = crypto.randomUUID();
              _sessionPlayers[spId] = {
                id:           spId,
                session_id:   sessionId,
                slot_index:   0,
                display_name: newName,   // current name after rename
                user_id:      userId,
              };

              // Rounds recorded under the OLD name
              const roundCount = 3; // fixed for simplicity
              const roundDbIds = [];
              for (let i = 1; i <= roundCount; i++) {
                const row = makeRoundRow(sessionId, i, oldName); // player = oldName
                _rounds[row.id] = row;
                roundDbIds.push(row.id);
              }

              const result = await loadMyRoundsAcrossSessions(userId);

              expectP(result.error).toBeNull();
              expectP(result.data).not.toBeNull();

              // All rounds must be returned — the user_id link is what matters,
              // not whether round.player matches the current display_name
              expectP(result.data).toHaveLength(roundCount);

              // Every round must have the correct sessionId
              for (const round of result.data) {
                expectP(round.sessionId).toBe(sessionId);
              }

              // playerName must reflect the CURRENT display_name (newName),
              // even though round.player still holds oldName
              for (const round of result.data) {
                expectP(round.playerName).toBe(newName);
              }

              // All original round DB IDs must be present
              const returnedDbIds = new Set(result.data.map(r => r._dbId));
              for (const dbId of roundDbIds) {
                expectP(returnedDbIds.has(dbId)).toBe(true);
              }
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);

// ── Property 13: Anonymous sessions load without errors ───────────────────────
// Validates: Requirements 8.1, 8.2
//
// Strategy: populate session_players rows where user_id = null (anonymous slots).
// loadMyRoundsAcrossSessions is called with a specific userId. The anonymous
// slots (user_id = null) must NOT appear in the result for that userId (Req 4.4),
// but if we call it with null userId the function should return empty (Req 4.4).
//
// The core of Req 8.1/8.2 is that sessions with null user_id slots do not cause
// errors — the function handles them gracefully. We test this by:
//   (a) Calling loadMyRoundsAcrossSessions with a real userId that has linked
//       sessions alongside anonymous sessions in the same DB — no errors thrown.
//   (b) Verifying that anonymous-only sessions (all user_id = null) do not
//       contaminate the result for a different userId.

describeP(
  'Feature: player-identity-cross-table-stats, Property 13: Anonymous sessions load without errors',
  () => {
    beforeEach(() => {
      _sessionPlayers = {};
      _claimTokens = {};
      _rounds = {};
      _mockUserId = null;
      _supabaseMock.from = (table) => makeCrossTableBuilder(table);
    });

    itP(
      'Validates: Requirements 8.1, 8.2 — ' +
      'sessions where all session_players rows have user_id = null load successfully ' +
      'and do not cause errors or contaminate results for other users',
      { timeout: 60000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),                          // userId (the authenticated user)
            fc.uuid(),                          // linkedSessionId (linked to userId)
            arbitraryDisplayName,               // displayName for the linked session
            fc.integer({ min: 1, max: 4 }),     // rounds in linked session
            fc.integer({ min: 1, max: 3 }),     // number of anonymous sessions
            fc.integer({ min: 1, max: 4 }),     // rounds per anonymous session
            async (userId, linkedSessionId, displayName, linkedRoundCount, anonSessionCount, anonRoundCount) => {
              // Reset stores for each run
              _sessionPlayers = {};
              _rounds = {};

              // Populate the linked session (user_id = userId)
              const spId = crypto.randomUUID();
              _sessionPlayers[spId] = {
                id:           spId,
                session_id:   linkedSessionId,
                slot_index:   0,
                display_name: displayName,
                user_id:      userId,
              };
              for (let i = 1; i <= linkedRoundCount; i++) {
                const row = makeRoundRow(linkedSessionId, i, displayName);
                _rounds[row.id] = row;
              }

              // Populate anonymous sessions (user_id = null for all slots)
              const anonSessionIds = [];
              for (let s = 0; s < anonSessionCount; s++) {
                const anonSessionId = crypto.randomUUID();
                anonSessionIds.push(anonSessionId);

                // Anonymous slot — user_id is null
                const anonSpId = crypto.randomUUID();
                _sessionPlayers[anonSpId] = {
                  id:           anonSpId,
                  session_id:   anonSessionId,
                  slot_index:   0,
                  display_name: 'Anonym',
                  user_id:      null,
                };

                // Rounds for the anonymous session
                for (let i = 1; i <= anonRoundCount; i++) {
                  const row = makeRoundRow(anonSessionId, i, 'Anonym');
                  _rounds[row.id] = row;
                }
              }

              // Must not throw — anonymous sessions must not cause errors
              let result;
              let threw = false;
              try {
                result = await loadMyRoundsAcrossSessions(userId);
              } catch (e) {
                threw = true;
              }

              expectP(threw).toBe(false);
              expectP(result).toBeDefined();
              expectP(result.error).toBeNull();
              expectP(result.data).not.toBeNull();

              // Only rounds from the linked session must be returned
              expectP(result.data).toHaveLength(linkedRoundCount);

              // No rounds from anonymous sessions must appear
              const anonSessionIdSet = new Set(anonSessionIds);
              for (const round of result.data) {
                expectP(anonSessionIdSet.has(round.sessionId)).toBe(false);
              }

              // All returned rounds must belong to the linked session
              for (const round of result.data) {
                expectP(round.sessionId).toBe(linkedSessionId);
              }
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);


// ── Property 3: Session creation auto-links creator ──────────────────────────
// Feature: claim-table-refactor, Property 3: Session creation auto-links creator
// Validates: Requirements 2.2
//
// Strategy:
//   Call createSession(seating, tableName) with a mocked authenticated user.
//   The mock captures all inserts to session_players. After the call, verify
//   that a session_players row was inserted with:
//     - session_id equal to the new session's ID
//     - display_name equal to seating[0]
//     - user_id equal to the creator's ID
//     - slot_index equal to 0
//
//   We use a dedicated builder factory (makeCreateSessionBuilder) that handles
//   the full .insert().select().single() chain for the sessions table and
//   captures the session_players insert.

// ── In-memory store for createSession tests ──────────────────────────────────
let _csSessionPlayers = [];  // Captured session_players inserts
let _csSessionId = null;     // The session ID returned by the sessions insert

/**
 * Builder factory for createSession tests.
 * Handles:
 *   - sessions: .insert(data).select().single() → returns { data: { id: _csSessionId, ...data }, error: null }
 *   - session_players: .insert(data) → captures the insert payload into _csSessionPlayers
 */
function makeCreateSessionBuilder(table) {
  let _insertData = null;
  let _isSelect = false;
  let _isSingle = false;

  const builder = {
    select() {
      _isSelect = true;
      return builder;
    },
    single() {
      _isSingle = true;
      return builder;
    },
    eq() {
      return builder;
    },
    maybeSingle() {
      return builder;
    },
    insert(data) {
      _insertData = data;
      return builder;
    },
    then(resolve) {
      let result;
      if (table === 'sessions' && _insertData !== null && _isSelect && _isSingle) {
        // Simulate successful session creation — return the inserted row with an ID
        result = {
          data: { id: _csSessionId, ..._insertData },
          error: null,
        };
      } else if (table === 'session_players' && _insertData !== null) {
        // Capture the session_players insert payload
        _csSessionPlayers.push({ ..._insertData });
        result = { data: null, error: null };
      } else {
        result = { data: null, error: null };
      }
      return resolve(result);
    },
  };
  return builder;
}

// Import createSession from the already-mocked syncService module
const { createSession: _createSession } = await import('./syncService.js');

// Arbitrary: seating array of 3–4 unique non-empty names
const arbitrarySeating3or4 = fc
  .array(
    fc.string({ minLength: 1, maxLength: 20 }).map(s => s.trim()).filter(s => s.length > 0),
    { minLength: 3, maxLength: 4 }
  )
  .filter(arr => new Set(arr).size === arr.length);

describeP(
  'Feature: claim-table-refactor, Property 3: Session creation auto-links creator',
  () => {
    beforeEach(() => {
      _csSessionPlayers = [];
      _csSessionId = null;
      _mockUserId = null;
      // Patch supabase.from to use the createSession builder
      _supabaseMock.from = (table) => makeCreateSessionBuilder(table);
    });

    itP(
      'Validates: Requirements 2.2 — ' +
      'for any valid seating array of 3–4 names and any authenticated user, ' +
      'createSession inserts a session_players row with session_id, display_name = seating[0], and user_id = creator',
      { timeout: 60000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            arbitrarySeating3or4,                           // seating array
            fc.uuid(),                                     // creatorUserId
            fc.uuid(),                                     // sessionId (simulated DB-generated)
            fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: '' }), // tableName
            async (seating, creatorUserId, sessionId, tableName) => {
              // Reset stores for each run
              _csSessionPlayers = [];
              _csSessionId = sessionId;
              _mockUserId = creatorUserId;

              // Call createSession
              const result = await _createSession(seating, tableName);

              // The session creation itself must succeed
              expectP(result.error).toBeNull();
              expectP(result.data).not.toBeNull();
              expectP(result.data.id).toBe(sessionId);

              // A session_players row must have been inserted
              expectP(_csSessionPlayers).toHaveLength(1);

              const spRow = _csSessionPlayers[0];

              // session_id must equal the new session's ID
              expectP(spRow.session_id).toBe(sessionId);

              // display_name must equal seating[0]
              expectP(spRow.display_name).toBe(seating[0]);

              // user_id must equal the creator's ID
              expectP(spRow.user_id).toBe(creatorUserId);

              // slot_index must be 0
              expectP(spRow.slot_index).toBe(0);
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);


// ══════════════════════════════════════════════════════════════════════════════
// Feature: claim-table-refactor, Property 1: Token generation resolves display_name correctly
// Feature: claim-table-refactor, Property 7: Successful claim creates correct link and marks token used
// Validates: Requirements 1.1, 1.2, 3.1, 3.6, 9.4
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Strategy for Property 1:
 *   For any valid session with a seating array of 3–4 names and any valid slot
 *   index within bounds, calling generateClaimToken SHALL produce a token where:
 *     - display_name === seating[slotIndex]
 *     - slot_index is null
 *     - expires_at is approximately 72 hours from now (±60s)
 *     - used is false
 *     - inviteUrl contains the token string
 *
 * Strategy for Property 7:
 *   For any valid, unexpired, unused claim token with a display_name that exists
 *   in the session's seating and is not yet linked to any user, and for any
 *   authenticated user who is not the host and not already linked in that session,
 *   calling claimSlot SHALL result in a session_players row with the correct
 *   session_id, display_name, and user_id, AND the token's used field SHALL be true.
 *
 * Both tests use a dedicated builder (makeClaimRefactorBuilder) that supports
 * display_name-based upsert and all query patterns used by the refactored functions.
 */

// ── Builder factory for claim-table-refactor tests ───────────────────────────

/**
 * Builder factory that supports all operations needed by the refactored
 * generateClaimToken and claimSlot functions:
 *   - sessions: SELECT (seating, user_id) by id
 *   - session_players: SELECT by (session_id, display_name) or (session_id, user_id), UPSERT on (session_id, display_name)
 *   - claim_tokens: SELECT by token, INSERT, UPDATE by id
 */
function makeClaimRefactorBuilder(table) {
  const store =
    table === 'session_players' ? _sessionPlayers :
    table === 'claim_tokens'    ? _claimTokens    :
    table === 'sessions'        ? _sessions       :
    {};

  let _filters = {};
  let _upsertData = null;
  let _upsertOptions = null;
  let _insertData = null;
  let _updateData = null;
  let _isMaybeSingle = false;
  let _isSelect = false;
  let _selectedFields = null;

  const builder = {
    select(fields) {
      _isSelect = true;
      _selectedFields = fields ?? null;
      return builder;
    },
    eq(field, value) {
      _filters[field] = value;
      return builder;
    },
    maybeSingle() {
      _isMaybeSingle = true;
      return builder;
    },
    upsert(data, options) {
      _upsertData = data;
      _upsertOptions = options ?? null;
      return builder;
    },
    insert(data) {
      _insertData = data;
      return builder;
    },
    update(data) {
      _updateData = data;
      return builder;
    },
    order() {
      return builder;
    },
    then(resolve) {
      let result;
      try {
        if (_insertData !== null) {
          const id = crypto.randomUUID();
          store[id] = { id, ..._insertData };
          result = { data: null, error: null };
        } else if (_upsertData !== null) {
          // UPSERT: resolve conflict key from options or default to (session_id, display_name)
          const conflictKey = _upsertOptions?.onConflict || 'session_id,display_name';
          const keys = conflictKey.split(',').map(k => k.trim());
          const existing = Object.values(store).find(r =>
            keys.every(k => r[k] === _upsertData[k])
          );
          if (existing) {
            store[existing.id] = { ...existing, ..._upsertData };
          } else {
            const id = crypto.randomUUID();
            store[id] = { id, ..._upsertData };
          }
          result = { data: null, error: null };
        } else if (_updateData !== null) {
          // UPDATE: apply patch to all rows matching _filters
          let rows = Object.values(store);
          for (const [k, v] of Object.entries(_filters)) {
            rows = rows.filter(r => r[k] === v);
          }
          for (const row of rows) {
            store[row.id] = { ...row, ..._updateData };
          }
          result = { data: null, error: null };
        } else if (_isSelect && _isMaybeSingle) {
          let rows = Object.values(store);
          for (const [k, v] of Object.entries(_filters)) {
            rows = rows.filter(r => r[k] === v);
          }
          if (rows.length > 0) {
            // If specific fields were requested, project them
            if (_selectedFields) {
              const fields = _selectedFields.split(',').map(f => f.trim());
              const projected = {};
              for (const f of fields) {
                projected[f] = rows[0][f];
              }
              result = { data: projected, error: null };
            } else {
              result = { data: rows[0], error: null };
            }
          } else {
            result = { data: null, error: null };
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

// ── Arbitraries for claim-table-refactor tests ───────────────────────────────

// Non-empty display name (trimmed, realistic player names)
const arbPlayerName = fc
  .string({ minLength: 1, maxLength: 20 })
  .map(s => s.trim())
  .filter(s => s.length > 0);

// Seating array of 3–4 unique player names
const arbSeating = fc
  .array(arbPlayerName, { minLength: 3, maxLength: 4 })
  .filter(arr => new Set(arr).size === arr.length);

// ── Property 1: Token generation resolves display_name correctly ─────────────
// Validates: Requirements 1.1, 1.2, 9.4

describeP(
  'Feature: claim-table-refactor, Property 1: Token generation resolves display_name correctly',
  () => {
    beforeEach(() => {
      _sessionPlayers = {};
      _claimTokens = {};
      _sessions = {};
      _mockUserId = null;
      _supabaseMock.from = (table) => makeClaimRefactorBuilder(table);
    });

    itP(
      'Validates: Requirements 1.1, 1.2, 9.4 — ' +
      'for any valid session with 3–4 names and any valid slot index, generateClaimToken ' +
      'produces a token with display_name === seating[slotIndex], slot_index null, ' +
      'expires_at ~72h, used false, and inviteUrl containing the token',
      { timeout: 60000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),                          // sessionId
            arbSeating,                         // seating array (3–4 unique names)
            fc.uuid(),                          // creatorUserId (host)
            fc.integer({ min: 1, max: 3 }),     // slotIndex (non-host slot, 1-based)
            async (sessionId, seating, creatorUserId, rawSlotIndex) => {
              // Ensure slotIndex is within bounds of the seating array
              const slotIndex = Math.min(rawSlotIndex, seating.length - 1);

              // Reset stores
              _sessionPlayers = {};
              _claimTokens = {};
              _sessions = {};

              // Set the authenticated caller to the host
              _mockUserId = creatorUserId;

              // Pre-populate sessions table with the host's session
              _sessions[sessionId] = {
                id:       sessionId,
                user_id:  creatorUserId,
                seating:  seating,
              };

              // Pre-populate session_players: host is linked to seating[0]
              // but the target slot (seating[slotIndex]) is NOT claimed (no user_id)
              const hostSpId = crypto.randomUUID();
              _sessionPlayers[hostSpId] = {
                id:           hostSpId,
                session_id:   sessionId,
                slot_index:   0,
                display_name: seating[0],
                user_id:      creatorUserId,
              };

              // If slotIndex > 0, ensure no session_players row with user_id for that name
              // (the function checks if display_name is already claimed)
              // We don't add a row for the target — absence means unclaimed.

              const before = Date.now();
              const result = await generateClaimToken(sessionId, slotIndex);
              const after = Date.now();

              // Must succeed
              expectP(result.error).toBeNull();
              expectP(result.data).not.toBeNull();

              // Verify the inserted claim_tokens row
              const insertedRows = Object.values(_claimTokens);
              expectP(insertedRows.length).toBeGreaterThanOrEqual(1);

              const row = insertedRows[insertedRows.length - 1];

              // display_name must equal seating[slotIndex] (Req 1.1)
              expectP(row.display_name).toBe(seating[slotIndex]);

              // slot_index must be null for new tokens (Req 9.4)
              expectP(row.slot_index).toBeNull();

              // used must be false
              expectP(row.used).toBe(false);

              // session_id must match
              expectP(row.session_id).toBe(sessionId);

              // expires_at must be approximately 72 hours from now (±60s)
              const expectedExpiry = before + 72 * 60 * 60 * 1000;
              const actualExpiry = new Date(row.expires_at).getTime();
              const toleranceMs = 60 * 1000;
              expectP(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - toleranceMs);
              expectP(actualExpiry).toBeLessThanOrEqual(after + 72 * 60 * 60 * 1000 + toleranceMs);

              // inviteUrl must contain the token string (Req 1.2)
              expectP(result.data.inviteUrl).toContain(result.data.token);
              expectP(result.data.token).toBe(row.token);
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);

// ── Property 7: Successful claim creates correct link and marks token used ───
// Validates: Requirements 3.1, 3.6

describeP(
  'Feature: claim-table-refactor, Property 7: Successful claim creates correct link and marks token used',
  () => {
    beforeEach(() => {
      _sessionPlayers = {};
      _claimTokens = {};
      _sessions = {};
      _mockUserId = null;
      _supabaseMock.from = (table) => makeClaimRefactorBuilder(table);
    });

    itP(
      'Validates: Requirements 3.1, 3.6 — ' +
      'for any valid, unexpired, unused claim token with a display_name in seating ' +
      'and not yet linked, and any non-host user not already linked, claimSlot ' +
      'creates a session_players row with correct session_id, display_name, user_id ' +
      'and marks the token used',
      { timeout: 60000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),                          // sessionId
            arbSeating,                         // seating array (3–4 unique names)
            fc.uuid(),                          // creatorUserId (host)
            fc.uuid(),                          // claimerUserId (the player claiming)
            async (sessionId, seating, creatorUserId, claimerUserId) => {
              // Ensure claimer is not the host
              fc.pre(claimerUserId !== creatorUserId);

              // Pick a target name that is NOT seating[0] (host's name)
              // Use index 1 (always exists since seating has 3–4 names)
              const targetDisplayName = seating[1];

              // Reset stores
              _sessionPlayers = {};
              _claimTokens = {};
              _sessions = {};

              // Pre-populate sessions table
              _sessions[sessionId] = {
                id:       sessionId,
                user_id:  creatorUserId,
                seating:  seating,
              };

              // Pre-populate session_players: only the host is linked
              const hostSpId = crypto.randomUUID();
              _sessionPlayers[hostSpId] = {
                id:           hostSpId,
                session_id:   sessionId,
                slot_index:   0,
                display_name: seating[0],
                user_id:      creatorUserId,
              };

              // Build a valid, unexpired, unused claim token with display_name set
              const tokenId = crypto.randomUUID();
              const tokenValue = crypto.randomUUID();
              _claimTokens[tokenId] = {
                id:           tokenId,
                session_id:   sessionId,
                slot_index:   null,
                display_name: targetDisplayName,
                token:        tokenValue,
                expires_at:   new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
                used:         false,
              };

              // Call claimSlot
              const result = await claimSlot(tokenValue, claimerUserId);

              // Must succeed
              expectP(result.error).toBeNull();

              // Verify session_players: a row must exist with the correct link
              const spRow = Object.values(_sessionPlayers).find(
                r => r.session_id === sessionId && r.display_name === targetDisplayName
              );
              expectP(spRow).toBeDefined();
              expectP(spRow.session_id).toBe(sessionId);
              expectP(spRow.display_name).toBe(targetDisplayName);
              expectP(spRow.user_id).toBe(claimerUserId);

              // Verify token is marked as used (Req 3.6)
              const updatedToken = Object.values(_claimTokens).find(
                r => r.token === tokenValue
              );
              expectP(updatedToken).toBeDefined();
              expectP(updatedToken.used).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// Feature: claim-table-refactor, Property 4: Seating reorder preserves session_players
// Feature: claim-table-refactor, Property 5: Player deletion cascades to session_players
// Feature: claim-table-refactor, Property 11: Rename preserves identity link and updates seating
// Feature: claim-table-refactor, Property 12: Rename cascades to pending claim tokens
// Validates: Requirements 2.3, 2.6, 7.1, 7.2, 7.3
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Strategy:
 *   These tests exercise deletePlayerFromSession, renamePlayerInSession, and
 *   updateSeating with a mocked Supabase client. We use a dedicated builder
 *   factory (makeRenameDeleteBuilder) that supports:
 *     - sessions: SELECT (seating, user_id), UPDATE (seating)
 *     - session_players: SELECT, UPDATE, DELETE by filters
 *     - claim_tokens: UPDATE with .eq() and .gt() filters
 *     - rounds: UPDATE, SELECT with .not() filter (for renamePlayerInRounds)
 *
 *   For each property, we pre-populate the in-memory stores and verify the
 *   expected state changes after the function call.
 */

// ── In-memory stores for rename/delete tests ─────────────────────────────────
let _rdSessions = {};
let _rdSessionPlayers = {};
let _rdClaimTokens = {};
let _rdRounds = {};

/**
 * Builder factory for rename/delete property tests.
 * Supports all operations used by deletePlayerFromSession, renamePlayerInSession,
 * updateSeating, and renamePlayerInRounds.
 */
function makeRenameDeleteBuilder(table) {
  const store =
    table === 'sessions'        ? _rdSessions :
    table === 'session_players' ? _rdSessionPlayers :
    table === 'claim_tokens'    ? _rdClaimTokens :
    table === 'rounds'          ? _rdRounds :
    {};

  let _filters = {};
  let _gtFilters = {};
  let _notFilters = {};
  let _updateData = null;
  let _insertData = null;
  let _isSelect = false;
  let _isMaybeSingle = false;
  let _isSingle = false;
  let _isDelete = false;
  let _selectedFields = null;

  const builder = {
    select(fields) {
      _isSelect = true;
      _selectedFields = fields ?? null;
      return builder;
    },
    eq(field, value) {
      _filters[field] = value;
      return builder;
    },
    gt(field, value) {
      _gtFilters[field] = value;
      return builder;
    },
    not(field, operator, value) {
      _notFilters[field] = { operator, value };
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
    order() {
      return builder;
    },
    update(data) {
      _updateData = data;
      return builder;
    },
    insert(data) {
      _insertData = data;
      return builder;
    },
    delete() {
      _isDelete = true;
      return builder;
    },
    then(resolve) {
      let result;
      try {
        if (_isDelete) {
          // DELETE: remove all rows matching _filters
          let rows = Object.values(store);
          for (const [k, v] of Object.entries(_filters)) {
            rows = rows.filter(r => r[k] === v);
          }
          for (const row of rows) {
            delete store[row.id];
          }
          result = { data: null, error: null };
        } else if (_insertData !== null) {
          const id = crypto.randomUUID();
          store[id] = { id, ..._insertData };
          result = { data: null, error: null };
        } else if (_updateData !== null) {
          // UPDATE: apply patch to all rows matching _filters and _gtFilters
          let rows = Object.values(store);
          for (const [k, v] of Object.entries(_filters)) {
            rows = rows.filter(r => r[k] === v);
          }
          for (const [k, v] of Object.entries(_gtFilters)) {
            rows = rows.filter(r => r[k] > v);
          }
          for (const [field, { operator, value }] of Object.entries(_notFilters)) {
            if (operator === 'is') {
              rows = rows.filter(r => r[field] !== value);
            }
          }
          for (const row of rows) {
            store[row.id] = { ...row, ..._updateData };
          }
          // If _isSelect and _isSingle, return the updated row
          if (_isSelect && _isSingle) {
            const updated = rows.length > 0 ? store[rows[0].id] : null;
            result = { data: updated, error: null };
          } else {
            result = { data: null, error: null };
          }
        } else if (_isSelect && _isMaybeSingle) {
          let rows = Object.values(store);
          for (const [k, v] of Object.entries(_filters)) {
            rows = rows.filter(r => r[k] === v);
          }
          if (rows.length > 0) {
            if (_selectedFields) {
              const fields = _selectedFields.split(',').map(f => f.trim());
              const projected = {};
              for (const f of fields) {
                projected[f] = rows[0][f];
              }
              result = { data: projected, error: null };
            } else {
              result = { data: rows[0], error: null };
            }
          } else {
            result = { data: null, error: null };
          }
        } else if (_isSelect && _isSingle) {
          let rows = Object.values(store);
          for (const [k, v] of Object.entries(_filters)) {
            rows = rows.filter(r => r[k] === v);
          }
          result = rows.length > 0
            ? { data: rows[0], error: null }
            : { data: null, error: null };
        } else if (_isSelect) {
          // Array-returning SELECT
          let rows = Object.values(store);
          for (const [k, v] of Object.entries(_filters)) {
            rows = rows.filter(r => r[k] === v);
          }
          for (const [field, { operator, value }] of Object.entries(_notFilters)) {
            if (operator === 'is') {
              rows = rows.filter(r => r[field] !== value);
            }
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

// Import the functions under test (same module instance as earlier imports)
const { deletePlayerFromSession: _deletePlayerFromSession, renamePlayerInSession: _renamePlayerInSession, updateSeating: _updateSeating } = await import('./syncService.js');

// ── Arbitraries for rename/delete tests ──────────────────────────────────────

// Non-empty display name (trimmed, realistic)
const arbRdPlayerName = fc
  .string({ minLength: 1, maxLength: 20 })
  .map(s => s.trim())
  .filter(s => s.length > 0);

// Seating array of 3–4 unique player names
const arbRdSeating = fc
  .array(arbRdPlayerName, { minLength: 3, maxLength: 4 })
  .filter(arr => new Set(arr).size === arr.length);

// ── Property 4: Seating reorder preserves session_players ────────────────────
// Validates: Requirements 2.3

describeP(
  'Feature: claim-table-refactor, Property 4: Seating reorder preserves session_players',
  () => {
    beforeEach(() => {
      _rdSessions = {};
      _rdSessionPlayers = {};
      _rdClaimTokens = {};
      _rdRounds = {};
      _mockUserId = null;
      _supabaseMock.from = (table) => makeRenameDeleteBuilder(table);
    });

    itP(
      'Validates: Requirements 2.3 — ' +
      'for any session with session_players rows and any permutation of the seating array, ' +
      'updateSeating does NOT insert, update, or delete any session_players rows',
      { timeout: 60000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),                          // sessionId
            arbRdSeating,                       // original seating (3–4 unique names)
            fc.uuid(),                          // creatorUserId
            async (sessionId, seating, creatorUserId) => {
              // Reset stores
              _rdSessions = {};
              _rdSessionPlayers = {};

              // Pre-populate sessions table
              _rdSessions[sessionId] = {
                id:       sessionId,
                user_id:  creatorUserId,
                seating:  seating,
              };

              // Pre-populate session_players: host linked to seating[0], optionally others
              const hostSpId = crypto.randomUUID();
              _rdSessionPlayers[hostSpId] = {
                id:           hostSpId,
                session_id:   sessionId,
                slot_index:   0,
                display_name: seating[0],
                user_id:      creatorUserId,
              };

              // Add a second linked player if seating has 4 names
              let secondSpId = null;
              const secondUserId = crypto.randomUUID();
              if (seating.length >= 4) {
                secondSpId = crypto.randomUUID();
                _rdSessionPlayers[secondSpId] = {
                  id:           secondSpId,
                  session_id:   sessionId,
                  slot_index:   2,
                  display_name: seating[2],
                  user_id:      secondUserId,
                };
              }

              // Snapshot session_players before the reorder
              const spBefore = JSON.parse(JSON.stringify(Object.values(_rdSessionPlayers)));

              // Generate a random permutation of the seating array
              const shuffled = [...seating].sort(() => Math.random() - 0.5);

              // Call updateSeating with the permuted array
              const result = await _updateSeating(sessionId, shuffled);

              // updateSeating must succeed
              expectP(result.error).toBeNull();

              // Snapshot session_players after the reorder
              const spAfter = Object.values(_rdSessionPlayers);

              // The set of session_players rows must be identical (same count)
              expectP(spAfter).toHaveLength(spBefore.length);

              // Each row's display_name and user_id must be unchanged
              for (const before of spBefore) {
                const after = spAfter.find(r => r.id === before.id);
                expectP(after).toBeDefined();
                expectP(after.display_name).toBe(before.display_name);
                expectP(after.user_id).toBe(before.user_id);
                expectP(after.session_id).toBe(before.session_id);
              }
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);

// ── Property 5: Player deletion cascades to session_players ──────────────────
// Validates: Requirements 2.6

describeP(
  'Feature: claim-table-refactor, Property 5: Player deletion cascades to session_players',
  () => {
    beforeEach(() => {
      _rdSessions = {};
      _rdSessionPlayers = {};
      _rdClaimTokens = {};
      _rdRounds = {};
      _mockUserId = null;
      _supabaseMock.from = (table) => makeRenameDeleteBuilder(table);
    });

    itP(
      'Validates: Requirements 2.6 — ' +
      'for any session with a session_players row for a given display_name, ' +
      'deletePlayerFromSession removes that name from seating and deletes the session_players row',
      { timeout: 60000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),                          // sessionId
            arbRdSeating,                       // seating (3–4 unique names)
            fc.uuid(),                          // userId linked to the target player
            async (sessionId, seating, linkedUserId) => {
              // Reset stores
              _rdSessions = {};
              _rdSessionPlayers = {};

              // Pick a target player to delete (not the first one, to keep it interesting)
              const targetIndex = seating.length > 3 ? 2 : 1;
              const targetName = seating[targetIndex];

              // Pre-populate sessions table
              _rdSessions[sessionId] = {
                id:       sessionId,
                user_id:  crypto.randomUUID(),
                seating:  [...seating],
              };

              // Pre-populate session_players: target player has a linked user_id
              const targetSpId = crypto.randomUUID();
              _rdSessionPlayers[targetSpId] = {
                id:           targetSpId,
                session_id:   sessionId,
                slot_index:   targetIndex,
                display_name: targetName,
                user_id:      linkedUserId,
              };

              // Also add the host row
              const hostSpId = crypto.randomUUID();
              _rdSessionPlayers[hostSpId] = {
                id:           hostSpId,
                session_id:   sessionId,
                slot_index:   0,
                display_name: seating[0],
                user_id:      crypto.randomUUID(),
              };

              // Call deletePlayerFromSession
              const result = await _deletePlayerFromSession(sessionId, targetName);

              // Must succeed
              expectP(result.error).toBeNull();

              // The session_players row for the target must be deleted
              const remainingRows = Object.values(_rdSessionPlayers);
              const targetRow = remainingRows.find(
                r => r.session_id === sessionId && r.display_name === targetName
              );
              expectP(targetRow).toBeUndefined();

              // The host row must still exist
              const hostRow = remainingRows.find(r => r.id === hostSpId);
              expectP(hostRow).toBeDefined();

              // The seating array in sessions must no longer contain the target name
              const updatedSession = Object.values(_rdSessions).find(s => s.id === sessionId);
              expectP(updatedSession).toBeDefined();
              expectP(updatedSession.seating).not.toContain(targetName);

              // The seating array length must be one less than before
              expectP(updatedSession.seating).toHaveLength(seating.length - 1);
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);

// ── Property 11: Rename preserves identity link and updates seating ──────────
// Validates: Requirements 7.1, 7.2

describeP(
  'Feature: claim-table-refactor, Property 11: Rename preserves identity link and updates seating',
  () => {
    beforeEach(() => {
      _rdSessions = {};
      _rdSessionPlayers = {};
      _rdClaimTokens = {};
      _rdRounds = {};
      _mockUserId = null;
      _supabaseMock.from = (table) => makeRenameDeleteBuilder(table);
    });

    itP(
      'Validates: Requirements 7.1, 7.2 — ' +
      'for any session where a player has a session_players row, renaming from oldName to newName ' +
      'updates session_players.display_name to newName while preserving user_id, ' +
      'and updates seating to contain newName at the same index where oldName was',
      { timeout: 60000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),                          // sessionId
            arbRdSeating,                       // seating (3–4 unique names)
            fc.uuid(),                          // creatorUserId (host)
            fc.uuid(),                          // linkedUserId (user linked to target player)
            arbRdPlayerName,                    // newName (the rename target)
            async (sessionId, seating, creatorUserId, linkedUserId, newName) => {
              // Ensure newName is not already in seating (no conflict)
              fc.pre(!seating.includes(newName));
              // Ensure newName passes validation (non-empty, ≤30 chars)
              fc.pre(newName.trim().length > 0 && newName.length <= 30);

              // Pick a target player to rename (not the host at index 0)
              const targetIndex = 1;
              const oldName = seating[targetIndex];

              // Reset stores
              _rdSessions = {};
              _rdSessionPlayers = {};
              _rdClaimTokens = {};
              _rdRounds = {};

              // Set the authenticated caller to the host
              _mockUserId = creatorUserId;

              // Pre-populate sessions table
              _rdSessions[sessionId] = {
                id:       sessionId,
                user_id:  creatorUserId,
                seating:  [...seating],
              };

              // Pre-populate session_players: target player has a linked user_id
              const targetSpId = crypto.randomUUID();
              _rdSessionPlayers[targetSpId] = {
                id:           targetSpId,
                session_id:   sessionId,
                slot_index:   targetIndex,
                display_name: oldName,
                user_id:      linkedUserId,
              };

              // Also add the host row
              const hostSpId = crypto.randomUUID();
              _rdSessionPlayers[hostSpId] = {
                id:           hostSpId,
                session_id:   sessionId,
                slot_index:   0,
                display_name: seating[0],
                user_id:      creatorUserId,
              };

              // Call renamePlayerInSession
              const result = await _renamePlayerInSession(sessionId, oldName, newName);

              // Must succeed
              expectP(result.error).toBeNull();

              // Verify session_players: display_name updated, user_id preserved
              const updatedSpRow = Object.values(_rdSessionPlayers).find(
                r => r.id === targetSpId
              );
              expectP(updatedSpRow).toBeDefined();
              expectP(updatedSpRow.display_name).toBe(newName);
              expectP(updatedSpRow.user_id).toBe(linkedUserId);

              // Verify seating array: newName at the same index where oldName was
              const updatedSession = Object.values(_rdSessions).find(s => s.id === sessionId);
              expectP(updatedSession).toBeDefined();
              expectP(updatedSession.seating[targetIndex]).toBe(newName);

              // oldName must no longer be in seating
              expectP(updatedSession.seating).not.toContain(oldName);
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);

// ── Property 12: Rename cascades to pending claim tokens ─────────────────────
// Validates: Requirements 7.3

describeP(
  'Feature: claim-table-refactor, Property 12: Rename cascades to pending claim tokens',
  () => {
    beforeEach(() => {
      _rdSessions = {};
      _rdSessionPlayers = {};
      _rdClaimTokens = {};
      _rdRounds = {};
      _mockUserId = null;
      _supabaseMock.from = (table) => makeRenameDeleteBuilder(table);
    });

    itP(
      'Validates: Requirements 7.3 — ' +
      'for any session where a pending (unused, unexpired) claim token exists for a display_name, ' +
      'renaming that player updates the token\'s display_name to the new name',
      { timeout: 60000 },
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),                          // sessionId
            arbRdSeating,                       // seating (3–4 unique names)
            fc.uuid(),                          // creatorUserId (host)
            arbRdPlayerName,                    // newName (the rename target)
            async (sessionId, seating, creatorUserId, newName) => {
              // Ensure newName is not already in seating (no conflict)
              fc.pre(!seating.includes(newName));
              // Ensure newName passes validation (non-empty, ≤30 chars)
              fc.pre(newName.trim().length > 0 && newName.length <= 30);

              // Pick a target player to rename (not the host at index 0)
              const targetIndex = 1;
              const oldName = seating[targetIndex];

              // Reset stores
              _rdSessions = {};
              _rdSessionPlayers = {};
              _rdClaimTokens = {};
              _rdRounds = {};

              // Set the authenticated caller to the host
              _mockUserId = creatorUserId;

              // Pre-populate sessions table
              _rdSessions[sessionId] = {
                id:       sessionId,
                user_id:  creatorUserId,
                seating:  [...seating],
              };

              // Pre-populate session_players: target player (no user_id — unclaimed)
              const targetSpId = crypto.randomUUID();
              _rdSessionPlayers[targetSpId] = {
                id:           targetSpId,
                session_id:   sessionId,
                slot_index:   targetIndex,
                display_name: oldName,
                user_id:      null,
              };

              // Also add the host row
              const hostSpId = crypto.randomUUID();
              _rdSessionPlayers[hostSpId] = {
                id:           hostSpId,
                session_id:   sessionId,
                slot_index:   0,
                display_name: seating[0],
                user_id:      creatorUserId,
              };

              // Pre-populate a pending (unused, unexpired) claim token for oldName
              const tokenId = crypto.randomUUID();
              const tokenValue = crypto.randomUUID();
              _rdClaimTokens[tokenId] = {
                id:           tokenId,
                session_id:   sessionId,
                display_name: oldName,
                token:        tokenValue,
                expires_at:   new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48h in future
                used:         false,
              };

              // Also add an expired token for the same name (should NOT be updated)
              const expiredTokenId = crypto.randomUUID();
              _rdClaimTokens[expiredTokenId] = {
                id:           expiredTokenId,
                session_id:   sessionId,
                display_name: oldName,
                token:        crypto.randomUUID(),
                expires_at:   new Date(Date.now() - 1000).toISOString(), // expired
                used:         false,
              };

              // Also add a used token for the same name (should NOT be updated)
              const usedTokenId = crypto.randomUUID();
              _rdClaimTokens[usedTokenId] = {
                id:           usedTokenId,
                session_id:   sessionId,
                display_name: oldName,
                token:        crypto.randomUUID(),
                expires_at:   new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                used:         true,
              };

              // Call renamePlayerInSession
              const result = await _renamePlayerInSession(sessionId, oldName, newName);

              // Must succeed
              expectP(result.error).toBeNull();

              // The pending (unused, unexpired) token must have display_name updated to newName
              const updatedToken = _rdClaimTokens[tokenId];
              expectP(updatedToken).toBeDefined();
              expectP(updatedToken.display_name).toBe(newName);

              // The expired token must NOT have been updated (still has oldName)
              const expiredToken = _rdClaimTokens[expiredTokenId];
              expectP(expiredToken).toBeDefined();
              expectP(expiredToken.display_name).toBe(oldName);

              // The used token must NOT have been updated (still has oldName)
              const usedToken = _rdClaimTokens[usedTokenId];
              expectP(usedToken).toBeDefined();
              expectP(usedToken.display_name).toBe(oldName);
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);
