import { describe, it, expect } from 'vitest';
import {
  computePlayerTotals,
  computeSeegerTotals,
  computePlayerRank,
  computePlayerStats,
} from './playerStats';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const seating = ['Alice', 'Bob', 'Carol'];

function makeRound(overrides) {
  return {
    player: 'Alice',
    gameType: 'spade',
    gameValue: 18,
    won: true,
    seegerScores: { Alice: 68, Bob: -40, Carol: -40 },
    ...overrides,
  };
}

// ── computePlayerTotals ───────────────────────────────────────────────────────

describe('computePlayerTotals', () => {
  it('returns zero totals for empty rounds', () => {
    const totals = computePlayerTotals(seating, []);
    expect(totals).toEqual({ Alice: 0, Bob: 0, Carol: 0 });
  });

  it('accumulates game values per player', () => {
    const rounds = [
      makeRound({ player: 'Alice', gameValue: 18 }),
      makeRound({ player: 'Bob',   gameValue: -36 }),
      makeRound({ player: 'Alice', gameValue: 24 }),
    ];
    const totals = computePlayerTotals(seating, rounds);
    expect(totals.Alice).toBe(42);
    expect(totals.Bob).toBe(-36);
    expect(totals.Carol).toBe(0);
  });

  it('ignores placeholder "-" players', () => {
    const rounds = [makeRound({ player: '-', gameValue: 18 })];
    const totals = computePlayerTotals(seating, rounds);
    expect(totals['-']).toBeUndefined();
  });
});

// ── computeSeegerTotals ───────────────────────────────────────────────────────

describe('computeSeegerTotals', () => {
  it('sums seegerScores across rounds', () => {
    const rounds = [
      makeRound({ seegerScores: { Alice: 68, Bob: -40, Carol: -40 } }),
      makeRound({ seegerScores: { Alice: -86, Bob: 40, Carol: 40 } }),
    ];
    const totals = computeSeegerTotals(seating, rounds);
    expect(totals.Alice).toBe(-18);
    expect(totals.Bob).toBe(0);
    expect(totals.Carol).toBe(0);
  });

  it('handles rounds without seegerScores gracefully', () => {
    const rounds = [makeRound({ seegerScores: null })];
    const totals = computeSeegerTotals(seating, rounds);
    expect(totals).toEqual({ Alice: 0, Bob: 0, Carol: 0 });
  });
});

// ── computePlayerRank ─────────────────────────────────────────────────────────

describe('computePlayerRank', () => {
  it('ranks players by standard score descending', () => {
    const rounds = [
      makeRound({ player: 'Bob',   gameValue: 100 }),
      makeRound({ player: 'Alice', gameValue: 50 }),
    ];
    const rank = computePlayerRank(seating, rounds, false);
    expect(rank[0].name).toBe('Bob');
    expect(rank[0].rank).toBe(1);
    expect(rank[1].name).toBe('Alice');
    expect(rank[2].name).toBe('Carol');
    expect(rank[2].score).toBe(0);
  });
});

// ── computePlayerStats ────────────────────────────────────────────────────────

describe('computePlayerStats', () => {
  it('returns zero stats for player with no rounds', () => {
    const stats = computePlayerStats([], 'Alice');
    expect(stats.totalGames).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.brote).toBe(0);
    expect(stats.baguettes).toBe(0);
    expect(stats.bestWin).toBeNull();
    expect(stats.worstLoss).toBeNull();
  });

  it('counts wins and losses correctly', () => {
    const rounds = [
      makeRound({ player: 'Alice', won: true,  gameValue: 18 }),
      makeRound({ player: 'Alice', won: false, gameValue: -36 }),
      makeRound({ player: 'Alice', won: true,  gameValue: 24 }),
    ];
    const stats = computePlayerStats(rounds, 'Alice');
    expect(stats.totalGames).toBe(3);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.bestWin).toBe(24);
    expect(stats.worstLoss).toBe(-36);
  });

  it('calculates win rate as percentage string', () => {
    const rounds = [
      makeRound({ player: 'Alice', won: true }),
      makeRound({ player: 'Alice', won: true }),
      makeRound({ player: 'Alice', won: false }),
      makeRound({ player: 'Alice', won: false }),
    ];
    const stats = computePlayerStats(rounds, 'Alice');
    expect(stats.winRate).toBe('50.0');
  });

  it('detects a Brot after 3 consecutive non-playing rounds', () => {
    const rounds = [
      makeRound({ player: 'Bob',   won: true }),
      makeRound({ player: 'Carol', won: true }),
      makeRound({ player: 'Bob',   won: true }),
    ];
    const stats = computePlayerStats(rounds, 'Alice');
    expect(stats.brote).toBe(1);
    expect(stats.baguettes).toBe(0);
  });

  it('detects a Baguette after 6 consecutive non-playing rounds', () => {
    const rounds = Array.from({ length: 6 }, () => makeRound({ player: 'Bob', won: true }));
    const stats = computePlayerStats(rounds, 'Alice');
    expect(stats.brote).toBe(2);
    expect(stats.baguettes).toBe(1);
  });

  it('resets Brot streak when player plays', () => {
    const rounds = [
      makeRound({ player: 'Bob',   won: true }),
      makeRound({ player: 'Bob',   won: true }),
      makeRound({ player: 'Alice', won: true }), // Alice plays — resets streak
      makeRound({ player: 'Bob',   won: true }),
      makeRound({ player: 'Bob',   won: true }),
      makeRound({ player: 'Bob',   won: true }),
    ];
    const stats = computePlayerStats(rounds, 'Alice');
    expect(stats.brote).toBe(1); // only the second block of 3
    expect(stats.baguettes).toBe(0);
  });

  it('calculates longest win streak', () => {
    const rounds = [
      makeRound({ player: 'Alice', won: true }),
      makeRound({ player: 'Alice', won: true }),
      makeRound({ player: 'Alice', won: true }),
      makeRound({ player: 'Alice', won: false }),
      makeRound({ player: 'Alice', won: true }),
    ];
    const stats = computePlayerStats(rounds, 'Alice');
    expect(stats.longestWinStreak).toBe(3);
  });

  it('calculates longest loss streak', () => {
    const rounds = [
      makeRound({ player: 'Alice', won: false }),
      makeRound({ player: 'Alice', won: false }),
      makeRound({ player: 'Alice', won: true }),
    ];
    const stats = computePlayerStats(rounds, 'Alice');
    expect(stats.longestLossStreak).toBe(2);
  });

  it('win streak is broken by another player playing', () => {
    const rounds = [
      makeRound({ player: 'Alice', won: true }),
      makeRound({ player: 'Bob',   won: true }), // breaks Alice's streak
      makeRound({ player: 'Alice', won: true }),
    ];
    const stats = computePlayerStats(rounds, 'Alice');
    expect(stats.longestWinStreak).toBe(1);
  });

  it('accumulates seeger total from all rounds', () => {
    const rounds = [
      makeRound({ seegerScores: { Alice: 68, Bob: -40, Carol: -40 } }),
      makeRound({ seegerScores: { Alice: -86, Bob: 40, Carol: 40 } }),
    ];
    const stats = computePlayerStats(rounds, 'Alice');
    expect(stats.seegerTotal).toBe(-18);
  });
});
