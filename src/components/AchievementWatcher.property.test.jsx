// @vitest-environment jsdom
// Property 4: Incremental achievement detection targets only the active player
// **Validates: Requirements 3.1**
// Property 5: Bulk-load suppresses achievement celebrations
// **Validates: Requirements 3.4**

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, act, cleanup } from '@testing-library/react';
import { useState, useRef } from 'react';

// Track which players computeCategoryWins is called for
const categoryWinsCalls = [];
const originalComputeCategoryWins = vi.fn((rounds, playerName) => {
  categoryWinsCalls.push(playerName);
  const won = rounds.filter(r => r.player === playerName && r.won);
  return {
    farbspiel: won.filter(r => ['club', 'spade', 'heart', 'diamond'].includes(r.gameType)).length,
    null: won.filter(r => r.gameType === 'null').length,
    grand: won.filter(r => r.gameType === 'grand').length,
    gesamt: rounds.filter(r => r.player === playerName && r.gameType !== 'passed').length,
  };
});

// Mock playerRanking to track calls
vi.mock('../lib/playerRanking', () => ({
  computeCategoryWins: (...args) => originalComputeCategoryWins(...args),
  computeCategoryRank: (wins, category) => ({
    currentTier: null,
    nextTier: null,
    currentWins: wins,
    winsForCurrent: 0,
    winsForNext: null,
    progressPct: 0,
  }),
  RANK_TIERS: [
    { id: 'bronze', label: 'Bronze', color: '#cd7f32', icon: '🥉' },
    { id: 'silber', label: 'Silber', color: '#9e9e9e', icon: '🥈' },
  ],
  CATEGORY_META: {
    farbspiel: { label: 'Farbspiel' },
    null: { label: 'Null' },
    grand: { label: 'Grand' },
    gesamt: { label: 'Gesamt' },
  },
}));

// Mock sub-components to avoid rendering complexity
vi.mock('./AchievementCelebration', () => ({
  default: ({ achievement }) => achievement ? <div data-testid="celebration" /> : null,
}));

vi.mock('./SkatSpruchToast', () => ({
  default: () => null,
}));

vi.mock('../lib/skatSprueche', () => ({
  getSkatSpruch: () => null,
}));

// We need a controllable useGame mock
let mockGameState = { rounds: [], players: [], sessionId: 'test-session' };

vi.mock('../context/GameContext', () => ({
  useGame: () => mockGameState,
}));

// Import AchievementWatcher AFTER mocks are set up
import AchievementWatcher from './AchievementWatcher';

beforeEach(() => {
  vi.useFakeTimers();
  // Mock requestIdleCallback to use setTimeout for testability
  vi.stubGlobal('requestIdleCallback', (cb) => setTimeout(cb, 0));
  vi.stubGlobal('cancelIdleCallback', (id) => clearTimeout(id));

  categoryWinsCalls.length = 0;
  originalComputeCategoryWins.mockClear();
  mockGameState = { rounds: [], players: [], sessionId: 'test-session' };
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  cleanup();
});

/**
 * **Validates: Requirements 3.1**
 *
 * Property 4: For any game state and any single newly added round,
 * the AchievementWatcher SHALL invoke computeUnlockedKeys and computeRankSnapshot
 * only for the active player of the newly added round, not for any other player
 * in the session.
 */
describe('Property 4: Incremental achievement detection targets only the active player (Requirements 3.1)', () => {
  const PLAYER_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana'];
  const GAME_TYPES = ['club', 'spade', 'heart', 'diamond', 'grand', 'null'];

  // Generator for a seating array of 3-4 unique player names
  const arbitraryPlayers = fc.uniqueArray(
    fc.constantFrom(...PLAYER_NAMES),
    { minLength: 3, maxLength: 4 }
  );

  // Generator for a single round
  const arbitraryRound = (players) =>
    fc.record({
      id: fc.integer({ min: 1, max: 10000 }),
      player: fc.constantFrom(...players),
      gameType: fc.constantFrom(...GAME_TYPES),
      gameValue: fc.integer({ min: 18, max: 216 }),
      won: fc.boolean(),
      hand: fc.boolean(),
      ouvert: fc.boolean(),
      schneider: fc.boolean(),
      schwarz: fc.boolean(),
      schneiderAnnounced: fc.boolean(),
      schwarzAnnounced: fc.boolean(),
      mitOhne: fc.constantFrom('mit', 'ohne'),
      spitzen: fc.integer({ min: 1, max: 4 }),
      isBock: fc.constant(false),
    });

  // Generator for existing rounds (the "base" state before adding one more)
  const arbitraryExistingRounds = (players) =>
    fc.array(arbitraryRound(players), { minLength: 1, maxLength: 8 });

  // Combined generator: players + existing rounds + one new round
  const arbitraryScenario = arbitraryPlayers.chain(players =>
    arbitraryExistingRounds(players).chain(existingRounds =>
      arbitraryRound(players).map(newRound => ({
        players,
        existingRounds,
        newRound: { ...newRound, id: existingRounds.length + 1 },
      }))
    )
  );

  it('on +1 round, computeRankSnapshot is invoked only for the active player', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        arbitraryScenario,
        ({ players, existingRounds, newRound }) => {
          // Clear tracking
          categoryWinsCalls.length = 0;

          // Wrapper component that allows us to control the game state
          // and trigger re-renders with updated rounds
          function TestHarness() {
            const [rounds, setRounds] = useState(existingRounds);
            const addRoundRef = useRef(null);

            addRoundRef.current = () => {
              setRounds(prev => [...prev, newRound]);
            };

            // Expose the addRound function via a global for test control
            window.__testAddRound = addRoundRef.current;

            // Update the mock game state for AchievementWatcher to consume
            mockGameState = { rounds, players, sessionId: 'test-session' };

            return <AchievementWatcher />;
          }

          // Initial render with existing rounds - this triggers the bulk rebuild
          act(() => {
            render(<TestHarness />);
          });

          // Wait for requestIdleCallback/setTimeout to fire for initial rebuild
          act(() => {
            vi.runAllTimers();
          });

          // Clear tracking after initial rebuild (which evaluates all players)
          categoryWinsCalls.length = 0;

          // Now add exactly one round - this should trigger incremental detection
          act(() => {
            window.__testAddRound();
          });

          // After adding one round, computeCategoryWins (called by computeRankSnapshot)
          // should only be called for the active player of the new round
          const activePlayer = newRound.player;
          const otherPlayers = players.filter(p => p !== activePlayer);

          // computeCategoryWins should ONLY be called for the active player
          for (const otherPlayer of otherPlayers) {
            expect(categoryWinsCalls).not.toContain(otherPlayer);
          }

          // The active player should have been evaluated
          const activePlayerCalls = categoryWinsCalls.filter(p => p === activePlayer);
          expect(activePlayerCalls.length).toBeGreaterThan(0);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Validates: Requirements 3.4**
 *
 * Property 5: For any round count delta greater than 1 (session load, multi-round sync),
 * the AchievementWatcher SHALL not set any celebration state until the deferred snapshot
 * rebuild has completed.
 *
 * Test approach:
 * 1. Render AchievementWatcher with initial rounds (e.g., 5 rounds)
 * 2. Re-render with a bulk addition (e.g., 10 rounds — delta > 1)
 * 3. Before the idle callback fires, verify no celebration is shown
 * 4. After the idle callback fires, verify still no celebration (rebuild doesn't trigger celebrations)
 */
describe('Property 5: Bulk-load suppresses achievement celebrations (Requirements 3.4)', () => {
  const PLAYER_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana'];
  const GAME_TYPES = ['club', 'spade', 'heart', 'diamond', 'grand', 'null'];

  // Generator for player names
  const arbitraryPlayers = fc.uniqueArray(
    fc.constantFrom(...PLAYER_NAMES),
    { minLength: 3, maxLength: 4 }
  );

  // Generator for initial round count and bulk delta
  const arbitraryBulkScenario = arbitraryPlayers.chain(players =>
    fc.record({
      players: fc.constant(players),
      initialCount: fc.integer({ min: 1, max: 20 }),
      bulkDelta: fc.integer({ min: 2, max: 15 }), // delta > 1 to trigger bulk path
    })
  );

  it('no celebration state is set during or after bulk-load rebuild', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        arbitraryBulkScenario,
        ({ players, initialCount, bulkDelta }) => {
          // Generate initial rounds
          const initialRounds = [];
          for (let i = 0; i < initialCount; i++) {
            initialRounds.push({
              id: i + 1,
              player: players[i % players.length],
              gameType: GAME_TYPES[i % GAME_TYPES.length],
              gameValue: 36,
              won: true,
              hand: false,
              ouvert: false,
              schneider: false,
              schwarz: false,
              schneiderAnnounced: false,
              schwarzAnnounced: false,
              mitOhne: 'mit',
              spitzen: 1,
              isBock: false,
            });
          }

          // Generate bulk rounds (delta > 1)
          const bulkRounds = [...initialRounds];
          for (let i = 0; i < bulkDelta; i++) {
            bulkRounds.push({
              id: initialCount + i + 1,
              player: players[(initialCount + i) % players.length],
              gameType: GAME_TYPES[(initialCount + i) % GAME_TYPES.length],
              gameValue: 48,
              won: true,
              hand: true,
              ouvert: false,
              schneider: false,
              schwarz: false,
              schneiderAnnounced: false,
              schwarzAnnounced: false,
              mitOhne: 'mit',
              spitzen: 2,
              isBock: false,
            });
          }

          // Wrapper component that allows controlled state transitions
          function TestHarness() {
            const [rounds, setRounds] = useState(initialRounds);

            window.__testSetBulkRounds = () => {
              setRounds(bulkRounds);
            };

            // Update the mock game state for AchievementWatcher to consume
            mockGameState = { rounds, players, sessionId: 'test-session' };

            return <AchievementWatcher />;
          }

          // Render with initial state - triggers initial bulk rebuild (snapshotRef is null)
          const { container } = render(<TestHarness />);

          // Let the initial rebuild complete
          act(() => {
            vi.runAllTimers();
          });

          // Now simulate bulk addition (delta > 1)
          act(() => {
            window.__testSetBulkRounds();
          });

          // BEFORE idle callback fires: verify no celebration is shown
          // AchievementCelebration renders a div with data-testid="celebration" only when achievement is non-null
          const celebrationBeforeTimer = container.querySelector('[data-testid="celebration"]');
          expect(celebrationBeforeTimer).toBeNull();

          // Now advance timers to let the idle callback (setTimeout(fn, 0)) fire
          act(() => {
            vi.runAllTimers();
          });

          // AFTER idle callback fires: verify STILL no celebration
          // The rebuild should NOT trigger any celebrations
          const celebrationAfterTimer = container.querySelector('[data-testid="celebration"]');
          expect(celebrationAfterTimer).toBeNull();

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});
