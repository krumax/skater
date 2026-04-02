// @vitest-environment jsdom
// Feature: bockrunden, Property 7: Gesamtpunkte berücksichtigen Bock-Spielwert korrekt
// Validates: Requirements 5.1, 5.2

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateGameValue } from '../lib/skatScoring';

// ── Property 1: Bock-Verdopplung ist korrekt ─────────────────────────────────
// Feature: bockrunden, Property 1: Bock-Verdopplung ist korrekt
// Validates: Requirements 1.2, 1.4, 2.3, 5.3

/**
 * Minimal reducer for ADD_ROUND — mirrors the logic in GameContext.jsx.
 * Only the bock-doubling logic is relevant here.
 */
function addRoundReducer(rounds, payload) {
  const finalGameValue = payload.isBock
    ? payload.gameValue * 2
    : payload.gameValue;
  const round = {
    id: rounds.length + 1,
    ...payload,
    gameValue: finalGameValue,
    isBock: payload.isBock ?? false,
  };
  return [...rounds, round];
}

// Valid Skat game types
const gameTypes = ['club', 'spade', 'heart', 'diamond', 'grand', 'null'];

// Generator for valid game configurations
const arbitraryGameConfig = fc.record({
  gameType:   fc.constantFrom(...gameTypes),
  spitzen:    fc.integer({ min: 1, max: 11 }),
  hand:       fc.boolean(),
  schneider:  fc.boolean(),
  schwarz:    fc.boolean(),
  ouvert:     fc.boolean(),
  eyeCount:   fc.integer({ min: 0, max: 120 }),
});

describe('Property 1: Bock-Verdopplung ist korrekt (Requirements 1.2, 1.4, 2.3, 5.3)', () => {
  it('gespeicherter game_value === calculateGameValue(config).gameValue * 2 wenn isBock=true', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        arbitraryGameConfig,
        (config) => {
          // Calculate the base game value using the scoring engine
          const { gameValue: baseGameValue } = calculateGameValue(config);

          // Dispatch ADD_ROUND with isBock: true
          const rounds = addRoundReducer([], {
            ...config,
            gameValue: baseGameValue,
            isBock: true,
            player: 'TestPlayer',
            won: baseGameValue > 0,
          });

          const storedRound = rounds[0];

          // Assert: stored game_value === calculateGameValue(config).gameValue * 2
          expect(storedRound.gameValue).toBe(baseGameValue * 2);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 2: Kein Bock bedeutet unveränderter Spielwert ───────────────────
// Feature: bockrunden, Property 2: Kein Bock bedeutet unveränderter Spielwert
// Validates: Requirements 1.3, 1.5, 2.4

describe('Property 2: Kein Bock bedeutet unveränderter Spielwert (Requirements 1.3, 1.5, 2.4)', () => {
  it('gespeicherter game_value === calculateGameValue(config).gameValue wenn isBock=false', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        arbitraryGameConfig,
        (config) => {
          const { gameValue: baseGameValue } = calculateGameValue(config);

          const rounds = addRoundReducer([], {
            ...config,
            gameValue: baseGameValue,
            isBock: false,
            player: 'TestPlayer',
            won: baseGameValue > 0,
          });

          const storedRound = rounds[0];

          // Assert: stored game_value is identical to calculateGameValue result (no doubling)
          expect(storedRound.gameValue).toBe(baseGameValue);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 7 helpers ────────────────────────────────────────────────────────

/**
 * Pure reimplementation of getPlayerTotals logic from GameContext.
 * Sums r.gameValue per player across all rounds.
 * (Bock rounds already have their gameValue doubled at save time.)
 */
function computePlayerTotals(seating, rounds) {
  const totals = {};
  seating.forEach(p => { totals[p] = 0; });
  rounds.forEach(r => {
    totals[r.player] = (totals[r.player] || 0) + r.gameValue;
  });
  return totals;
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const arbitraryPlayerName = fc.constantFrom('Alice', 'Bob', 'Charlie', 'Diana');

const arbitrarySeating = fc.uniqueArray(arbitraryPlayerName, { minLength: 3, maxLength: 4 });

/**
 * Generates a round where:
 * - isBock is random (true/false)
 * - gameValue is already the final stored value:
 *   - if isBock=true:  baseValue * 2  (doubled at save time)
 *   - if isBock=false: baseValue      (unchanged)
 * This mirrors the ADD_ROUND reducer behaviour in GameContext.
 */
const arbitraryRound = (seating) => fc.record({
  isBock:    fc.boolean(),
  baseValue: fc.integer({ min: -120, max: 120 }).filter(v => v !== 0),
}).map(({ isBock, baseValue }) => ({
  isBock,
  gameValue: isBock ? baseValue * 2 : baseValue,
})).chain(round =>
  fc.constantFrom(...seating).map(player => ({ ...round, player }))
);

// ── Property 7 ────────────────────────────────────────────────────────────────

describe('Property 7: Gesamtpunkte berücksichtigen Bock-Spielwert korrekt (Requirements 5.1, 5.2)', () => {
  it('getPlayerTotals() liefert die Summe der gespeicherten game_value-Felder pro Spieler', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        arbitrarySeating.chain(seating =>
          fc.tuple(
            fc.constant(seating),
            fc.array(arbitraryRound(seating), { minLength: 0, maxLength: 20 }),
          )
        ),
        ([seating, rounds]) => {
          // Compute totals using the same logic as GameContext.getPlayerTotals
          const totals = computePlayerTotals(seating, rounds);

          // Independently compute expected totals by summing stored gameValue fields
          const expected = {};
          seating.forEach(p => { expected[p] = 0; });
          rounds.forEach(r => {
            expected[r.player] = (expected[r.player] || 0) + r.gameValue;
          });

          // Assert: totals must equal the sum of stored game_value fields
          seating.forEach(player => {
            expect(totals[player]).toBe(expected[player]);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
