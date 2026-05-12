// Feature: player-identity-cross-table-stats, Property 10: Profile stats win rate is correctly computed
// Validates: Requirements 5.2

/**
 * Property-based test for computeProfileStats.
 *
 * Strategy:
 *   Generate arbitrary arrays of "declarer rounds" (where round.player === round.playerName)
 *   and verify that:
 *     1. winRate === (wins / totalDeclarerGames * 100) rounded to 1 decimal place
 *     2. totalPoints === sum of all gameValue fields
 *
 *   This is a pure-data test: computeProfileStats has no side effects and
 *   requires no mocking.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeProfileStats } from './playerStats.js';

// ── Arbitraries ───────────────────────────────────────────────────────────────

// A single declarer round: player === playerName so it is counted as a declarer round
const arbitraryDeclarerRound = fc.record({
  player:     fc.constantFrom('Alice', 'Bob', 'Charlie', 'Diana'),
  gameValue:  fc.integer({ min: -240, max: 240 }).filter(v => v !== 0),
  won:        fc.boolean(),
  gameType:   fc.constantFrom('club', 'spade', 'heart', 'diamond', 'grand', 'null'),
  timestamp:  fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') })
                .map(d => d.toISOString()),
}).map(r => ({
  ...r,
  // Ensure player === playerName so this round is treated as a declarer round
  playerName: r.player,
}));

// Non-empty array of declarer rounds (1–50 rounds)
const arbitraryDeclarerRounds = fc.array(arbitraryDeclarerRound, { minLength: 1, maxLength: 50 });

// ── Property 10: Profile stats win rate is correctly computed ─────────────────

describe(
  'Feature: player-identity-cross-table-stats, Property 10: Profile stats win rate is correctly computed',
  () => {
    it(
      'Validates: Requirement 5.2 — ' +
      'winRate equals (wins / totalDeclarerGames * 100) rounded to 1 decimal, ' +
      'totalPoints equals sum of all gameValue fields',
      { timeout: 30000 },
      () => {
        fc.assert(
          fc.property(
            arbitraryDeclarerRounds,
            (rounds) => {
              const result = computeProfileStats(rounds);

              // ── totalPoints must equal the sum of all gameValue fields ──────
              const expectedTotalPoints = rounds.reduce((sum, r) => sum + r.gameValue, 0);
              expect(result.totalPoints).toBe(expectedTotalPoints);

              // ── winRate must equal (wins / totalDeclarerGames * 100) ────────
              // rounded to 1 decimal place
              const wins = rounds.filter(r => r.won).length;
              const totalDeclarerGames = rounds.length;
              const expectedWinRate = parseFloat(
                ((wins / totalDeclarerGames) * 100).toFixed(1)
              );
              expect(result.winRate).toBe(expectedWinRate);

              // ── totalDeclarerGames must equal the number of rounds ──────────
              expect(result.totalDeclarerGames).toBe(totalDeclarerGames);
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  }
);
