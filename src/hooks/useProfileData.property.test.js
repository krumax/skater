// Feature: claim-table-refactor, Property 10: Cross-table profile stats aggregate only declarer rounds
// Validates: Requirements 6.4

/**
 * Property-based test for cross-table profile stats aggregation.
 *
 * Strategy:
 *   Generate a mix of declarer rounds (player === playerName) and non-declarer
 *   rounds (player !== playerName). Verify that computeProfileStats:
 *     1. Counts only declarer rounds in totalDeclarerGames
 *     2. Computes winRate from declarer rounds only
 *     3. Computes totalPoints from declarer rounds only
 *     4. Produces a pointsOverTime series that is monotonically-timestamped
 *        (sorted by time) with correct cumulative sums from declarer rounds only
 *
 *   This validates that non-declarer rounds (where the user was a defender)
 *   are excluded from the profile aggregation.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeProfileStats } from '../lib/playerStats.js';

// ── Arbitraries ───────────────────────────────────────────────────────────────

const PLAYER_NAME = 'Konrad';
const OTHER_PLAYERS = ['Max', 'Oma', 'Fritz'];

// Generate a valid ISO timestamp between 2020 and 2030
const arbitraryTimestamp = fc.integer({
  min: new Date('2020-01-01T00:00:00Z').getTime(),
  max: new Date('2030-01-01T00:00:00Z').getTime(),
}).map(ms => new Date(ms).toISOString());

// A declarer round: player === playerName (user was Alleinspieler)
const arbitraryDeclarerRound = fc.record({
  gameValue: fc.integer({ min: -240, max: 240 }).filter(v => v !== 0),
  won: fc.boolean(),
  gameType: fc.constantFrom('club', 'spade', 'heart', 'diamond', 'grand', 'null'),
  timestamp: arbitraryTimestamp,
}).map(r => ({
  ...r,
  player: PLAYER_NAME,
  playerName: PLAYER_NAME,
}));

// A non-declarer round: player !== playerName (someone else was Alleinspieler)
const arbitraryNonDeclarerRound = fc.record({
  player: fc.constantFrom(...OTHER_PLAYERS),
  gameValue: fc.integer({ min: -240, max: 240 }).filter(v => v !== 0),
  won: fc.boolean(),
  gameType: fc.constantFrom('club', 'spade', 'heart', 'diamond', 'grand', 'null'),
  timestamp: arbitraryTimestamp,
}).map(r => ({
  ...r,
  playerName: PLAYER_NAME,
}));

// Mixed array: at least 1 declarer round and at least 1 non-declarer round
const arbitraryMixedRounds = fc.tuple(
  fc.array(arbitraryDeclarerRound, { minLength: 1, maxLength: 30 }),
  fc.array(arbitraryNonDeclarerRound, { minLength: 1, maxLength: 30 })
).chain(([declarerRounds, nonDeclarerRounds]) =>
  // Shuffle the combined array to avoid ordering bias
  fc.shuffledSubarray([...declarerRounds, ...nonDeclarerRounds], {
    minLength: declarerRounds.length + nonDeclarerRounds.length,
    maxLength: declarerRounds.length + nonDeclarerRounds.length,
  })
);

// ── Property 10: Cross-table profile stats aggregate only declarer rounds ────

describe(
  'Feature: claim-table-refactor, Property 10: Cross-table profile stats aggregate only declarer rounds',
  () => {
    /**
     * **Validates: Requirements 6.4**
     */
    it(
      'only counts rounds where player === playerName as declarer games, ' +
      'excluding all non-declarer rounds from stats',
      { timeout: 30000 },
      () => {
        fc.assert(
          fc.property(
            arbitraryMixedRounds,
            (rounds) => {
              const result = computeProfileStats(rounds);

              // Manually compute expected values from declarer rounds only
              const declarerRounds = rounds.filter(r => r.player === r.playerName);
              const nonDeclarerRounds = rounds.filter(r => r.player !== r.playerName);

              // Precondition: we have both types of rounds
              expect(declarerRounds.length).toBeGreaterThan(0);
              expect(nonDeclarerRounds.length).toBeGreaterThan(0);

              // totalDeclarerGames counts only declarer rounds
              expect(result.totalDeclarerGames).toBe(declarerRounds.length);

              // totalPoints sums only declarer round gameValues
              const expectedTotalPoints = declarerRounds.reduce((sum, r) => sum + r.gameValue, 0);
              expect(result.totalPoints).toBe(expectedTotalPoints);

              // winRate computed from declarer rounds only
              const wins = declarerRounds.filter(r => r.won).length;
              const expectedWinRate = parseFloat(
                ((wins / declarerRounds.length) * 100).toFixed(1)
              );
              expect(result.winRate).toBe(expectedWinRate);
            }
          ),
          { numRuns: 100 }
        );
      }
    );

    it(
      'pointsOverTime series is monotonically-timestamped with correct cumulative sums from declarer rounds only',
      { timeout: 30000 },
      () => {
        fc.assert(
          fc.property(
            arbitraryMixedRounds,
            (rounds) => {
              const result = computeProfileStats(rounds);

              // Only declarer rounds contribute to pointsOverTime
              const declarerRounds = rounds.filter(r => r.player === r.playerName);

              // pointsOverTime length matches declarer round count
              expect(result.pointsOverTime.length).toBe(declarerRounds.length);

              // Verify monotonically non-decreasing timestamps
              for (let i = 1; i < result.pointsOverTime.length; i++) {
                const prevTime = new Date(result.pointsOverTime[i - 1].timestamp).getTime();
                const currTime = new Date(result.pointsOverTime[i].timestamp).getTime();
                expect(currTime).toBeGreaterThanOrEqual(prevTime);
              }

              // Verify cumulative sums are correct
              const sorted = [...declarerRounds].sort((a, b) => {
                const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                return ta - tb;
              });
              let cumulative = 0;
              sorted.forEach((r, i) => {
                cumulative += r.gameValue;
                expect(result.pointsOverTime[i].cumulativePoints).toBe(cumulative);
              });
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);
