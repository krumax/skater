// @vitest-environment jsdom
// Property 6: Actions object referential stability
// Validates: Requirements 4.1, 4.2

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { renderHook } from '@testing-library/react';
import { useSyncActions } from './useSyncActions';

// Mock syncService to prevent real DB calls
vi.mock('../lib/syncService', () => ({
  insertRound: vi.fn().mockResolvedValue({ error: null }),
  updateSession: vi.fn().mockResolvedValue({ error: null }),
  deleteRound: vi.fn().mockResolvedValue({ error: null }),
  createSession: vi.fn().mockResolvedValue({ data: { id: 'test-session' }, error: null }),
  loadSession: vi.fn().mockResolvedValue({ data: null, error: null }),
  updateSeating: vi.fn().mockResolvedValue({ error: null }),
  renamePlayerInRounds: vi.fn().mockResolvedValue({ error: null }),
  updateSessionPlayerName: vi.fn().mockResolvedValue({ error: null }),
  closeSpielliste: vi.fn().mockResolvedValue({ error: null }),
  createSpielliste: vi.fn().mockResolvedValue({ error: null }),
  setActiveSpiellisteTimestamp: vi.fn().mockResolvedValue({ error: null }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * **Validates: Requirements 4.1, 4.2**
 *
 * Property 6: For any render where no useCallback dependency within useSyncActions
 * has changed, the returned actions object SHALL be the identical reference,
 * even if the state parameter itself is a new object.
 */
describe('Property 6: Actions object referential stability (Requirements 4.1, 4.2)', () => {
  // Generator for a valid state object with the fields that useSyncActions depends on
  const arbitraryState = fc.record({
    seating: fc.uniqueArray(fc.constantFrom('Alice', 'Bob', 'Charlie', 'Diana'), { minLength: 3, maxLength: 4 }),
    rounds: fc.array(
      fc.record({
        id: fc.integer({ min: 1, max: 100 }),
        player: fc.constantFrom('Alice', 'Bob', 'Charlie', 'Diana'),
        gameValue: fc.integer({ min: -120, max: 120 }),
        isBock: fc.boolean(),
        spiellisteId: fc.option(fc.string(), { nil: null }),
      }),
      { minLength: 0, maxLength: 10 }
    ),
    geberIndex: fc.integer({ min: 0, max: 3 }),
    currentRound: fc.integer({ min: 1, max: 50 }),
    activeSpiellisteId: fc.option(fc.string(), { nil: null }),
    spiellisten: fc.array(
      fc.record({
        id: fc.string(),
        name: fc.string(),
        roundCount: fc.integer({ min: 1, max: 20 }),
        status: fc.constantFrom('aktiv', 'geschlossen'),
        winner: fc.option(fc.string(), { nil: null }),
      }),
      { minLength: 0, maxLength: 3 }
    ),
  });

  it('returns the same actions reference when re-rendered with a new state object that has identical dependency values', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        arbitraryState,
        (stateTemplate) => {
          const dispatch = vi.fn();
          const setSyncStatus = vi.fn();
          const setSyncError = vi.fn();

          // Create the initial state object
          const state1 = { ...stateTemplate };

          const { result, rerender } = renderHook(
            ({ state }) => useSyncActions(state, dispatch, setSyncStatus, setSyncError),
            { initialProps: { state: state1 } }
          );

          const actionsRef1 = result.current;

          // Create a NEW state object (different outer reference) but keep
          // the same inner field references. The useCallback deps reference
          // state.seating, state.rounds, etc. — as long as those references
          // are identical, no callback is recreated and the useMemo returns
          // the same actions object.
          const state2 = { ...state1 };

          // state2 !== state1 (new object), but state2.seating === state1.seating etc.
          rerender({ state: state2 });

          const actionsRef2 = result.current;

          // The actions object reference should be identical (Object.is)
          // because no useCallback dependency actually changed
          expect(actionsRef2).toBe(actionsRef1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
