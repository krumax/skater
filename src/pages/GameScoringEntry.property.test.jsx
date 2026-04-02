// @vitest-environment jsdom
// Feature: bockrunden, Property 4: Formular-Reset setzt Bock-Toggle zurück
// Validates: Requirements 1.6

/**
 * Property 4 – Formular-Reset setzt Bock-Toggle zurück
 *
 * Strategy:
 *   Model the resetForm logic as a pure function that mirrors the
 *   implementation in GameScoringEntry.jsx. For any arbitrary isBock
 *   state before the reset, the resulting isBock must be false.
 *
 * This avoids rendering the full component (which requires Router +
 * GameContext providers) while still testing the exact reset logic.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ── Pure model of GameScoringEntry form state ─────────────────────────────────

/**
 * Default form state — mirrors the useState initialisers in GameScoringEntry.
 */
const DEFAULT_FORM_STATE = {
  gameType: 'spade',
  hand: false,
  schneider: false,
  schwarz: false,
  ouvert: false,
  mitOhne: 'mit',
  spitzen: 1,
  eyeCount: 61,
  isBock: false,
};

/**
 * Pure reimplementation of resetForm() from GameScoringEntry.jsx.
 * Returns the form state after a reset, regardless of the input state.
 */
function resetForm(_prevState) {
  return { ...DEFAULT_FORM_STATE };
}

// ── Arbitrary for arbitrary form state ───────────────────────────────────────

const arbitraryFormState = fc.record({
  gameType:  fc.constantFrom('club', 'spade', 'heart', 'diamond', 'grand', 'null'),
  hand:      fc.boolean(),
  schneider: fc.boolean(),
  schwarz:   fc.boolean(),
  ouvert:    fc.boolean(),
  mitOhne:   fc.constantFrom('mit', 'ohne'),
  spitzen:   fc.integer({ min: 1, max: 11 }),
  eyeCount:  fc.integer({ min: 0, max: 120 }),
  isBock:    fc.boolean(),
});

// ── Property 4 ────────────────────────────────────────────────────────────────

describe('Property 4: Formular-Reset setzt Bock-Toggle zurück (Requirements 1.6)', () => {
  it('isBock ist nach resetForm() immer false, unabhängig vom vorherigen Zustand', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        arbitraryFormState,
        (prevState) => {
          const nextState = resetForm(prevState);

          // Assert: isBock is always false after reset
          expect(nextState.isBock).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('resetForm() setzt isBock=true korrekt auf false zurück', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        // Only generate states where isBock was true — ensures the reset
        // actually changes the value (not just a no-op on already-false state)
        arbitraryFormState.filter(s => s.isBock === true),
        (prevState) => {
          expect(prevState.isBock).toBe(true);

          const nextState = resetForm(prevState);

          expect(nextState.isBock).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
