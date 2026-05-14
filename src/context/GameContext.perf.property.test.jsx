// @vitest-environment jsdom
// Property 1: Context value referential stability
// **Validates: Requirements 1.1, 1.2**
// Property 2: Derived data correctness
// **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { render, act, cleanup } from '@testing-library/react';
import { useState, useEffect } from 'react';
import { GameProvider, useGame } from './GameContext';
import { getRoles } from '../lib/gameReducer';
import { useSessionInit } from '../hooks/useSessionInit';
import {
  computePlayerTotals,
  computeSeegerTotals,
  computePlayerRank,
} from '../lib/playerStats';
import { calculateSeegerFabian } from '../lib/skatScoring';

// Mock useSessionInit to prevent real DB calls on mount
vi.mock('../hooks/useSessionInit', () => ({
  useSessionInit: vi.fn(),
  SESSION_STORAGE_KEY: 'skatSessionId',
}));

// Mock syncService to prevent real DB calls from useSyncActions
vi.mock('../lib/syncService', () => ({
  insertRound: vi.fn().mockResolvedValue({ error: null }),
  updateSession: vi.fn().mockResolvedValue({ error: null }),
  deleteRound: vi.fn().mockResolvedValue({ error: null }),
  createSession: vi.fn().mockResolvedValue({ data: { id: 'test-session' }, error: null }),
  loadSession: vi.fn().mockResolvedValue({ data: null, error: null }),
  listSessions: vi.fn().mockResolvedValue({ data: [], error: null }),
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
 * A consumer component that captures the context value reference across renders.
 * It stores references in the provided array ref for assertion.
 */
function ContextCapture({ capturesRef }) {
  const contextValue = useGame();
  capturesRef.current.push(contextValue);
  return null;
}

/**
 * A wrapper that exposes a trigger function to force re-renders of the tree
 * without changing any GameProvider state.
 */
function RerenderWrapper({ children, triggerRef }) {
  const [, setTick] = useState(0);

  triggerRef.current = () => setTick(t => t + 1);

  return children;
}

describe('Property 1: Context value referential stability (Requirements 1.1, 1.2)', () => {
  it('contextValue reference remains identical across re-renders when state is unchanged', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        // Generate a random number of re-renders to trigger (1-5)
        fc.integer({ min: 1, max: 5 }),
        (rerenderCount) => {
          const capturesRef = { current: [] };
          const triggerRef = { current: null };

          render(
            <RerenderWrapper triggerRef={triggerRef}>
              <GameProvider>
                <ContextCapture capturesRef={capturesRef} />
              </GameProvider>
            </RerenderWrapper>
          );

          // Initial render produces the first capture
          expect(capturesRef.current.length).toBeGreaterThanOrEqual(1);
          const initialRef = capturesRef.current[capturesRef.current.length - 1];

          // Force re-renders by calling the trigger function inside act()
          for (let i = 0; i < rerenderCount; i++) {
            act(() => {
              triggerRef.current();
            });
          }

          // All captures after the initial should be the same reference
          // because no state, syncStatus, syncError, sessionLoaded, or
          // derived values have changed
          for (let i = 1; i < capturesRef.current.length; i++) {
            expect(capturesRef.current[i]).toBe(initialRef);
          }

          // Clean up DOM between fast-check iterations
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 3: Derived data referential stability ────────────────────────────

/**
 * **Validates: Requirements 2.5**
 *
 * Property 3: For any two consecutive renders where seating and rounds references
 * have not changed, the playerTotals, seegerTotals, playerRankStandard, and
 * playerRankSeeger values SHALL be the identical references.
 */
describe('Property 3: Derived data referential stability (Requirements 2.5)', () => {
  // Generator for player names (3-4 unique names, no '-')
  const arbitraryPlayers = fc.uniqueArray(
    fc.constantFrom('Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'),
    { minLength: 3, maxLength: 4 }
  );

  // Generator for a single round entry (minimal shape needed by computePlayerTotals etc.)
  const arbitraryRound = (players) =>
    fc.record({
      id: fc.integer({ min: 1, max: 1000 }),
      player: fc.constantFrom(...players),
      gameType: fc.constantFrom('Kreuz', 'Pik', 'Herz', 'Karo', 'Grand', 'Null'),
      gameValue: fc.integer({ min: 18, max: 216 }),
      won: fc.boolean(),
      isBock: fc.constant(false),
      mitOhne: fc.constantFrom('mit', 'ohne'),
      sppielen: fc.constant(1),
      seegerScores: fc.constant({}),
      roles: fc.constant({ geber: players[0], hoeren: players[1], sagen: players[2] }),
      timestamp: fc.constant(new Date().toISOString()),
      spiellisteId: fc.constant(null),
    });

  // Generator for a state configuration (seating + rounds)
  const arbitraryStateConfig = arbitraryPlayers.chain(players =>
    fc.record({
      seating: fc.constant(players),
      rounds: fc.array(arbitraryRound(players), { minLength: 0, maxLength: 10 }),
    })
  );

  /**
   * Consumer that captures specific derived value references across renders.
   */
  function DerivedCapture({ capturesRef }) {
    const { playerTotals, seegerTotals, playerRankStandard, playerRankSeeger } = useGame();
    capturesRef.current.push({ playerTotals, seegerTotals, playerRankStandard, playerRankSeeger });
    return null;
  }

  it('derived data references remain identical when seating and rounds are unchanged', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        arbitraryStateConfig,
        fc.integer({ min: 1, max: 3 }),
        ({ seating, rounds }, rerenderCount) => {
          const capturesRef = { current: [] };
          const triggerRef = { current: null };

          // Mock useSessionInit to dispatch LOAD_SESSION with generated state
          useSessionInit.mockImplementation((dispatch) => {
            useEffect(() => {
              dispatch({
                type: 'LOAD_SESSION',
                payload: {
                  session: {
                    id: 'test-session-1',
                    seating,
                    geber_index: 0,
                    current_round: rounds.length,
                    table_name: 'Test Table',
                  },
                  rounds,
                  spiellisten: [],
                  activeSpiellisteId: null,
                },
              });
            }, []);
          });

          render(
            <RerenderWrapper triggerRef={triggerRef}>
              <GameProvider>
                <DerivedCapture capturesRef={capturesRef} />
              </GameProvider>
            </RerenderWrapper>
          );

          // Wait for initial render + LOAD_SESSION effect to settle
          expect(capturesRef.current.length).toBeGreaterThanOrEqual(1);
          const lastAfterLoad = capturesRef.current[capturesRef.current.length - 1];

          // Force re-renders without changing state
          for (let i = 0; i < rerenderCount; i++) {
            act(() => {
              triggerRef.current();
            });
          }

          // All captures after the load should have identical references
          const afterRerender = capturesRef.current[capturesRef.current.length - 1];

          expect(Object.is(afterRerender.playerTotals, lastAfterLoad.playerTotals)).toBe(true);
          expect(Object.is(afterRerender.seegerTotals, lastAfterLoad.seegerTotals)).toBe(true);
          expect(Object.is(afterRerender.playerRankStandard, lastAfterLoad.playerRankStandard)).toBe(true);
          expect(Object.is(afterRerender.playerRankSeeger, lastAfterLoad.playerRankSeeger)).toBe(true);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 7: Players array excludes placeholder entries ────────────────────

/**
 * **Validates: Requirements 5.3**
 *
 * Property 7: For any seating array (including arrays containing '-' entries),
 * the players value exposed on the context SHALL never contain the string '-'.
 */
describe('Property 7: Players array excludes placeholder entries (Requirements 5.3)', () => {
  // Generator for seating arrays that mix real player names with '-' placeholders.
  // Uses SET_SEATING which stores the array directly (including '-' entries),
  // so the players useMemo filter is what removes them.
  const arbitrarySeatingWithPlaceholders = fc.array(
    fc.oneof(
      fc.constantFrom('Alice', 'Bob', 'Charlie', 'Diana', 'Eve'),
      fc.constant('-')
    ),
    { minLength: 1, maxLength: 6 }
  );

  it('players array never contains the placeholder string "-"', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        arbitrarySeatingWithPlaceholders,
        (seating) => {
          let captured = null;

          function Consumer() {
            captured = useGame();
            return null;
          }

          // Mock useSessionInit to dispatch SET_SEATING inside useEffect
          // (mirrors real hook behavior which dispatches in useEffect)
          useSessionInit.mockImplementation((dispatch) => {
            useEffect(() => {
              dispatch({ type: 'SET_SEATING', payload: seating });
            }, []);
          });

          act(() => {
            render(
              <GameProvider>
                <Consumer />
              </GameProvider>
            );
          });

          expect(captured).not.toBeNull();

          // Assert: players never contains '-'
          expect(captured.players).not.toContain('-');

          // Also verify that all non-placeholder entries are preserved
          const expectedPlayers = seating.filter(p => p !== '-');
          expect(captured.players).toEqual(expectedPlayers);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ── Property 8: currentRoles computation correctness ──────────────────────────

/**
 * **Validates: Requirements 6.1**
 *
 * Property 8: For any valid seating array (length >= 1) and geberIndex
 * (0 <= geberIndex < seating.length), the memoized currentRoles SHALL
 * deep-equal getRoles(seating, geberIndex).
 */
describe('Property 8: currentRoles computation correctness (Requirements 6.1)', () => {
  // Generator for seating arrays of 3-4 unique player names
  const arbitrarySeating = fc.uniqueArray(
    fc.constantFrom('Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'),
    { minLength: 3, maxLength: 4 }
  );

  // Generator for valid seating + geberIndex combinations
  const arbitrarySeatingAndGeber = arbitrarySeating.chain((seating) =>
    fc.integer({ min: 0, max: seating.length - 1 }).map((geberIndex) => ({
      seating,
      geberIndex,
    }))
  );

  it('memoized currentRoles deep-equals getRoles(seating, geberIndex)', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        arbitrarySeatingAndGeber,
        ({ seating, geberIndex }) => {
          let captured = null;

          function Consumer() {
            captured = useGame();
            return null;
          }

          // Mock useSessionInit to dispatch SET_SEATING and SET_GEBER_INDEX
          useSessionInit.mockImplementation((dispatch) => {
            useEffect(() => {
              dispatch({ type: 'SET_SEATING', payload: seating });
              dispatch({ type: 'SET_GEBER_INDEX', payload: geberIndex });
            }, []);
          });

          act(() => {
            render(
              <GameProvider>
                <Consumer />
              </GameProvider>
            );
          });

          expect(captured).not.toBeNull();

          // Compute expected roles directly
          const expected = getRoles(seating, geberIndex);

          // Assert memoized currentRoles deep-equals the direct computation
          expect(captured.currentRoles).toEqual(expected);

          // Verify shape: { geber, hoeren, sagen, activePlayers }
          expect(captured.currentRoles).toHaveProperty('geber');
          expect(captured.currentRoles).toHaveProperty('hoeren');
          expect(captured.currentRoles).toHaveProperty('sagen');
          expect(captured.currentRoles).toHaveProperty('activePlayers');

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ── Property 2: Derived data correctness ──────────────────────────────────────

/**
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 *
 * Property 2: For any valid seating array and rounds array, the pre-computed
 * context values SHALL satisfy:
 * - playerTotals equals computePlayerTotals(seating, rounds)
 * - seegerTotals equals computeSeegerTotals(seating, rounds)
 * - playerRankStandard deep-equals computePlayerRank(seating, rounds, false)
 * - playerRankSeeger deep-equals computePlayerRank(seating, rounds, true)
 */
describe('Property 2: Derived data correctness (Requirements 2.1, 2.2, 2.3, 2.4)', () => {
  const PLAYER_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana'];
  const GAME_TYPES = ['club', 'spade', 'heart', 'diamond', 'grand', 'null'];

  // Generator for a seating array of 3-4 unique player names
  const arbitrarySeating = fc.integer({ min: 3, max: 4 }).chain(count =>
    fc.shuffledSubarray(PLAYER_NAMES, { minLength: count, maxLength: count })
  );

  // Generator for a single round object with all required fields
  const arbitraryRound = (seating) => fc.record({
    id: fc.integer({ min: 1, max: 10000 }),
    player: fc.constantFrom(...seating),
    gameValue: fc.integer({ min: -200, max: 200 }),
    won: fc.boolean(),
    isBock: fc.boolean(),
    gameType: fc.constantFrom(...GAME_TYPES),
  }).map(round => {
    // Compute seegerScores based on the round data and seating
    const seegerScores = calculateSeegerFabian({
      declarer: round.player,
      allPlayers: seating,
      gameValue: round.gameValue,
      won: round.won,
    });
    return { ...round, seegerScores };
  });

  // Generator for a rounds array (0-10 rounds)
  const arbitraryRounds = (seating) =>
    fc.array(arbitraryRound(seating), { minLength: 0, maxLength: 10 });

  // Combined generator: seating + rounds
  const arbitrarySessionData = arbitrarySeating.chain(seating =>
    arbitraryRounds(seating).map(rounds => ({ seating, rounds }))
  );

  it('pre-computed derived values match direct computation from playerStats', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        arbitrarySessionData,
        ({ seating, rounds }) => {
          let captured = null;

          function Consumer() {
            captured = useGame();
            return null;
          }

          // Mock useSessionInit to dispatch LOAD_SESSION with our generated data
          useSessionInit.mockImplementation((dispatch) => {
            useEffect(() => {
              dispatch({
                type: 'LOAD_SESSION',
                payload: {
                  session: {
                    id: 'test-session-id',
                    seating,
                    geber_index: 0,
                    current_round: rounds.length + 1,
                    table_name: 'Test Table',
                  },
                  rounds,
                  spiellisten: [],
                  activeSpiellisteId: null,
                },
              });
            }, []);
          });

          act(() => {
            render(
              <GameProvider>
                <Consumer />
              </GameProvider>
            );
          });

          expect(captured).not.toBeNull();

          // Compute expected values directly
          const expectedPlayerTotals = computePlayerTotals(seating, rounds);
          const expectedSeegerTotals = computeSeegerTotals(seating, rounds);
          const expectedRankStandard = computePlayerRank(seating, rounds, false);
          const expectedRankSeeger = computePlayerRank(seating, rounds, true);

          // Assert: playerTotals equals computePlayerTotals(seating, rounds)
          expect(captured.playerTotals).toEqual(expectedPlayerTotals);

          // Assert: seegerTotals equals computeSeegerTotals(seating, rounds)
          expect(captured.seegerTotals).toEqual(expectedSeegerTotals);

          // Assert: playerRankStandard deep-equals computePlayerRank(seating, rounds, false)
          expect(captured.playerRankStandard).toEqual(expectedRankStandard);

          // Assert: playerRankSeeger deep-equals computePlayerRank(seating, rounds, true)
          expect(captured.playerRankSeeger).toEqual(expectedRankSeeger);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});
