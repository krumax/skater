import { describe, it, expect } from 'vitest';
import {
  validateSpiellisteName,
  validateRoundCount,
  generateDefaultName,
  computeListWinner,
  computeListStats,
  computeListProgress,
} from './spiellistenUtils.js';

// ─── validateSpiellisteName ───

describe('validateSpiellisteName', () => {
  it('accepts a valid name', () => {
    expect(validateSpiellisteName('Meine Liste')).toEqual({ valid: true });
  });

  it('accepts an empty name', () => {
    expect(validateSpiellisteName('')).toEqual({ valid: true });
  });

  it('accepts a name of exactly 40 characters', () => {
    const name = 'A'.repeat(40);
    expect(validateSpiellisteName(name)).toEqual({ valid: true });
  });

  it('rejects a name longer than 40 characters', () => {
    const name = 'A'.repeat(41);
    const result = validateSpiellisteName(name);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// ─── validateRoundCount ───

describe('validateRoundCount', () => {
  it('accepts 3 (minimum valid)', () => {
    expect(validateRoundCount(3)).toEqual({ valid: true });
  });

  it('accepts 12 (valid multiple of 3)', () => {
    expect(validateRoundCount(12)).toEqual({ valid: true });
  });

  it('accepts 36 (maximum valid)', () => {
    expect(validateRoundCount(36)).toEqual({ valid: true });
  });

  it('rejects 2 (below minimum)', () => {
    const result = validateRoundCount(2);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects 37 (above maximum)', () => {
    const result = validateRoundCount(37);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects 5 (not a multiple of 3)', () => {
    const result = validateRoundCount(5);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects 7 (not a multiple of 3)', () => {
    const result = validateRoundCount(7);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// ─── generateDefaultName ───

describe('generateDefaultName', () => {
  it('returns "Liste 1" when no lists exist', () => {
    expect(generateDefaultName(0)).toBe('Liste 1');
  });

  it('returns "Liste 2" when one list exists', () => {
    expect(generateDefaultName(1)).toBe('Liste 2');
  });

  it('returns "Liste N+1" for any count N', () => {
    expect(generateDefaultName(5)).toBe('Liste 6');
    expect(generateDefaultName(10)).toBe('Liste 11');
  });
});

// ─── computeListWinner ───

describe('computeListWinner', () => {
  const players = ['Alice', 'Bob', 'Carol'];

  it('returns the player with the highest Seeger-Fabian total', () => {
    const rounds = [
      { seegerScores: { Alice: 50, Bob: -50, Carol: 40 }, player: 'Alice', gameValue: 18 },
      { seegerScores: { Alice: 50, Bob: -50, Carol: 40 }, player: 'Alice', gameValue: 18 },
    ];
    expect(computeListWinner(players, rounds)).toEqual(['Alice']);
  });

  it('uses raw points as tiebreaker when Seeger-Fabian is tied', () => {
    const rounds = [
      // Alice and Bob tied on Seeger, but Alice has more raw points
      { seegerScores: { Alice: 50, Bob: 50, Carol: -50 }, player: 'Alice', gameValue: 24 },
      { seegerScores: { Alice: 0, Bob: 0, Carol: 0 }, player: 'Bob', gameValue: 10 },
    ];
    const winners = computeListWinner(players, rounds);
    expect(winners).toEqual(['Alice']);
  });

  it('returns multiple winners when fully tied', () => {
    const rounds = [
      { seegerScores: { Alice: 50, Bob: 50, Carol: -50 }, player: 'Alice', gameValue: 18 },
      { seegerScores: { Alice: 0, Bob: 0, Carol: 0 }, player: 'Bob', gameValue: 18 },
    ];
    const winners = computeListWinner(players, rounds);
    expect(winners).toHaveLength(2);
    expect(winners).toContain('Alice');
    expect(winners).toContain('Bob');
  });

  it('returns all players when no rounds played', () => {
    expect(computeListWinner(players, [])).toEqual(players);
  });

  it('returns empty array for empty players', () => {
    expect(computeListWinner([], [])).toEqual([]);
  });
});

// ─── computeListStats ───

describe('computeListStats', () => {
  const players = ['Alice', 'Bob', 'Carol'];

  it('computes correct Seeger-Fabian and raw totals', () => {
    const rounds = [
      { seegerScores: { Alice: 50, Bob: -50, Carol: 40 }, player: 'Alice', gameValue: 18 },
      { seegerScores: { Alice: -50, Bob: 50, Carol: 40 }, player: 'Bob', gameValue: 24 },
    ];
    const stats = computeListStats(players, rounds);
    expect(stats.seegerTotals.Alice).toBe(0);
    expect(stats.seegerTotals.Bob).toBe(0);
    expect(stats.seegerTotals.Carol).toBe(80);
    expect(stats.rawTotals.Alice).toBe(18);
    expect(stats.rawTotals.Bob).toBe(24);
    expect(stats.rawTotals.Carol).toBe(0);
    expect(stats.playedRounds).toBe(2);
  });

  it('sorts players by Seeger-Fabian descending, then raw descending', () => {
    const rounds = [
      { seegerScores: { Alice: 50, Bob: -50, Carol: 40 }, player: 'Alice', gameValue: 18 },
    ];
    const stats = computeListStats(players, rounds);
    expect(stats.sortedPlayers[0].name).toBe('Alice');
    expect(stats.sortedPlayers[1].name).toBe('Carol');
    expect(stats.sortedPlayers[2].name).toBe('Bob');
  });

  it('handles empty rounds', () => {
    const stats = computeListStats(players, []);
    expect(stats.playedRounds).toBe(0);
    players.forEach(p => {
      expect(stats.seegerTotals[p]).toBe(0);
      expect(stats.rawTotals[p]).toBe(0);
    });
  });
});

// ─── computeListProgress ───

describe('computeListProgress', () => {
  it('returns progress for an active list', () => {
    const spielliste = { roundCount: 12, status: 'aktiv' };
    const rounds = [{}, {}, {}]; // 3 rounds played
    expect(computeListProgress(spielliste, rounds)).toEqual({ current: 3, total: 12 });
  });

  it('returns null for null spielliste', () => {
    expect(computeListProgress(null, [])).toBeNull();
  });

  it('returns null for an abgeschlossen list', () => {
    const spielliste = { roundCount: 12, status: 'abgeschlossen' };
    expect(computeListProgress(spielliste, [{}, {}])).toBeNull();
  });

  it('returns current: 0 when no rounds played yet', () => {
    const spielliste = { roundCount: 36, status: 'aktiv' };
    expect(computeListProgress(spielliste, [])).toEqual({ current: 0, total: 36 });
  });
});
