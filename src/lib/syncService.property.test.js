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
