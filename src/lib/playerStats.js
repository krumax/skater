/**
 * playerStats.js — Pure player statistics calculations.
 *
 * All functions are pure: they take rounds/seating as input and return
 * derived data. No React, no side effects, easy to unit-test.
 */

// ── Standard totals ──────────────────────────────────────────────────────────

export function computePlayerTotals(seating, rounds) {
  const totals = {};
  seating.filter(p => p !== '-').forEach(p => { totals[p] = 0; });
  rounds.forEach(r => {
    if (r.player && r.player !== '-') {
      totals[r.player] = (totals[r.player] || 0) + r.gameValue;
    }
  });
  return totals;
}

// ── Seeger-Fabian totals ─────────────────────────────────────────────────────

export function computeSeegerTotals(seating, rounds) {
  const totals = {};
  seating.filter(p => p !== '-').forEach(p => { totals[p] = 0; });
  rounds.forEach(r => {
    if (r.seegerScores) {
      seating.filter(p => p !== '-').forEach(p => {
        totals[p] = (totals[p] || 0) + (r.seegerScores[p] || 0);
      });
    }
  });
  return totals;
}

// ── Player rank ──────────────────────────────────────────────────────────────

export function computePlayerRank(seating, rounds, useSeeger = false) {
  const totals = useSeeger
    ? computeSeegerTotals(seating, rounds)
    : computePlayerTotals(seating, rounds);
  return Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .map(([name, score], index) => ({ name, score, rank: index + 1 }));
}

// ── Per-player stats ─────────────────────────────────────────────────────────

export function computePlayerStats(rounds, playerName) {
  const playerRounds = rounds.filter(r => r.player === playerName);
  const totalGames = playerRounds.length;
  const wins = playerRounds.filter(r => r.won).length;
  const losses = totalGames - wins;
  const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;
  const totalPoints = playerRounds.reduce((sum, r) => sum + r.gameValue, 0);
  const avgPoints = totalGames > 0 ? (totalPoints / totalGames).toFixed(1) : 0;

  const wonRounds  = playerRounds.filter(r => r.won);
  const lostRounds = playerRounds.filter(r => !r.won);
  const bestWin    = wonRounds.length  > 0 ? Math.max(...wonRounds.map(r => r.gameValue))  : null;
  const worstLoss  = lostRounds.length > 0 ? Math.min(...lostRounds.map(r => r.gameValue)) : null;

  const typeCounts = {};
  playerRounds.forEach(r => {
    const t = r.gameType || 'unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const typeDistribution = Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count, pct: ((count / totalGames) * 100).toFixed(0) }))
    .sort((a, b) => b.count - a.count);

  const seegerTotal = rounds.reduce((sum, r) => {
    return sum + (r.seegerScores?.[playerName] || 0);
  }, 0);

  // ── Streak calculations ──────────────────────────────────────────────────
  let longestWinStreak = 0, currentWinStreak = 0;
  let longestLossStreak = 0, currentLossStreak = 0;

  rounds.forEach(r => {
    if (r.player === playerName && r.won) {
      currentWinStreak += 1;
      if (currentWinStreak > longestWinStreak) longestWinStreak = currentWinStreak;
      currentLossStreak = 0;
    } else if (r.player === playerName && !r.won) {
      currentLossStreak += 1;
      if (currentLossStreak > longestLossStreak) longestLossStreak = currentLossStreak;
      currentWinStreak = 0;
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
  });

  // ── Brot / Baguette detection ────────────────────────────────────────────
  // A "Brot" = 3 consecutive rounds where the player was not Alleinspieler.
  // A "Baguette" = 2 consecutive Brote (6 rounds).
  let consecutiveNonPlaying = 0;
  let brote = 0, baguettes = 0, currentBrotStreak = 0;

  rounds.forEach(r => {
    if (r.player === playerName) {
      consecutiveNonPlaying = 0;
      currentBrotStreak = 0;
    } else {
      consecutiveNonPlaying += 1;
      if (consecutiveNonPlaying % 3 === 0) {
        brote += 1;
        currentBrotStreak += 1;
        if (currentBrotStreak === 2) {
          baguettes += 1;
          currentBrotStreak = 0;
        }
      }
    }
  });

  return {
    totalGames, wins, losses, winRate,
    totalPoints, avgPoints, seegerTotal,
    typeDistribution, rounds: playerRounds,
    brote, baguettes, currentStreak: consecutiveNonPlaying,
    longestWinStreak, longestLossStreak,
    bestWin, worstLoss,
  };
}
