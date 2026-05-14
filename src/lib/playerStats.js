/**
 * playerStats.js - Pure player statistics calculations.
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
  const bestWinRound  = bestWin  !== null ? wonRounds.find(r => r.gameValue === bestWin)   : null;
  const worstLossRound = worstLoss !== null ? lostRounds.find(r => r.gameValue === worstLoss) : null;

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
  let longestWinRounds = [], longestLossRounds = [];
  let currentWinRounds = [], currentLossRounds = [];

  rounds.forEach(r => {
    if (r.player === playerName && r.won) {
      currentWinStreak += 1;
      currentWinRounds.push(r);
      if (currentWinStreak > longestWinStreak) {
        longestWinStreak = currentWinStreak;
        longestWinRounds = [...currentWinRounds];
      }
      currentLossStreak = 0;
      currentLossRounds = [];
    } else if (r.player === playerName && !r.won) {
      currentLossStreak += 1;
      currentLossRounds.push(r);
      if (currentLossStreak > longestLossStreak) {
        longestLossStreak = currentLossStreak;
        longestLossRounds = [...currentLossRounds];
      }
      currentWinStreak = 0;
      currentWinRounds = [];
    } else {
      currentWinStreak = 0;
      currentWinRounds = [];
      currentLossStreak = 0;
      currentLossRounds = [];
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
    longestWinStreak,  longestWinRounds,
    longestLossStreak, longestLossRounds,
    bestWin, bestWinRound,
    worstLoss, worstLossRound,
  };
}

// ── Running totals ────────────────────────────────────────────────────────────

/**
 * Computes cumulative standard and Seeger-Fabian scores after each round.
 *
 * @param {string[]} players - Active player names (no "-")
 * @param {Array}    rounds  - All rounds in order
 * @returns {{ runningStd: object[], runningSF: object[] }}
 *   Each entry is a snapshot of all player totals after that round index.
 */
export function computeRunningTotals(players, rounds) {
  const runningStd = [];
  const runningSF  = [];

  rounds.forEach((r, idx) => {
    const std = idx === 0 ? {} : { ...runningStd[idx - 1] };
    const sf  = idx === 0 ? {} : { ...runningSF[idx - 1] };

    players.forEach(p => {
      if (std[p] === undefined) std[p] = 0;
      if (sf[p]  === undefined) sf[p]  = 0;
    });

    std[r.player] = (std[r.player] || 0) + r.gameValue;

    if (r.seegerScores) {
      players.forEach(p => {
        sf[p] = (sf[p] || 0) + (r.seegerScores[p] || 0);
      });
    }

    runningStd.push(std);
    runningSF.push(sf);
  });

  return { runningStd, runningSF };
}

// ── Per-session stats (cross-table profile) ──────────────────────────────────

/**
 * Groups cross-table rounds by sessionId and computes per-session stats.
 * Pure function — no side effects.
 *
 * @param {CrossTableRound[]} rounds - flat array from loadMyRoundsAcrossSessions
 *   Each round has: sessionId, playerName (user's display_name in that session),
 *   tableName, player (the declarer), won, gameValue
 * @returns {SessionSummary[]}
 */
export function computePerSessionStats(rounds) {
  // Group rounds by sessionId
  const groups = {};
  rounds.forEach(r => {
    if (!groups[r.sessionId]) {
      groups[r.sessionId] = [];
    }
    groups[r.sessionId].push(r);
  });

  return Object.entries(groups).map(([sessionId, sessionRounds]) => {
    // Carry through tableName and displayName from the first round in the group
    const first = sessionRounds[0];
    const tableName = first.tableName ?? null;
    const displayName = first.playerName ?? '';

    // Total rounds at this table (all rounds including passed)
    const totalRounds = sessionRounds.length;

    // Declarer rounds: rounds where the user was the declarer
    const declarerRounds = sessionRounds.filter(r => r.player === r.playerName);
    const roundCount = declarerRounds.length;

    const wins = declarerRounds.filter(r => r.won).length;
    const winRate = roundCount > 0
      ? parseFloat(((wins / roundCount) * 100).toFixed(1))
      : 0.0;

    // Declarer share: how often the user was Alleinspieler relative to total rounds
    const declarerShare = totalRounds > 0
      ? parseFloat(((roundCount / totalRounds) * 100).toFixed(1))
      : 0.0;

    // Compute per-player stats (raw points + seeger) for the ranking detail
    // Collect all players from both declarer field and seegerScores keys
    const playerSet = new Set();
    sessionRounds.forEach(r => {
      if (r.player && r.player !== '-') playerSet.add(r.player);
      if (r.seegerScores) {
        Object.keys(r.seegerScores).forEach(p => {
          if (p && p !== '-') playerSet.add(p);
        });
      }
      // Also collect from roles if available
      if (r.roles) {
        ['geber', 'hoeren', 'sagen'].forEach(role => {
          const p = r.roles[role];
          if (p && p !== '-') playerSet.add(p);
        });
      }
    });
    const allPlayers = [...playerSet];
    const rawTotals = {};
    const seegerTotals = {};
    allPlayers.forEach(p => { rawTotals[p] = 0; seegerTotals[p] = 0; });

    // Determine opponent bonus based on active player count (excluding '-')
    const opponentBonus = allPlayers.length <= 3 ? 40 : 30;

    sessionRounds.forEach(r => {
      // Raw points: only for non-passed rounds, only for the declarer
      if (r.gameType !== 'passed' && r.gameValue !== undefined && r.player && rawTotals[r.player] !== undefined) {
        rawTotals[r.player] += r.gameValue;
      }

      // Seeger-Fabian: compute deterministically from round data
      if (r.gameType === 'passed' || !r.player || r.player === '-' || r.gameValue === 0) {
        // No Seeger points for passed rounds or zero-value rounds
      } else if (r.won) {
        // Declarer won: +50
        if (seegerTotals[r.player] !== undefined) {
          seegerTotals[r.player] += 50;
        }
      } else {
        // Declarer lost: -50, opponents get bonus
        if (seegerTotals[r.player] !== undefined) {
          seegerTotals[r.player] -= 50;
        }
        allPlayers.forEach(p => {
          if (p !== r.player) {
            seegerTotals[p] += opponentBonus;
          }
        });
      }
    });

    // Sort players by combined score (seeger + raw) descending
    const sortedPlayers = allPlayers
      .map(p => ({ name: p, seeger: seegerTotals[p], raw: rawTotals[p] }))
      .sort((a, b) => {
        const totalB = b.seeger + b.raw;
        const totalA = a.seeger + a.raw;
        if (totalB !== totalA) return totalB - totalA;
        return b.raw - a.raw;
      });

    const leaderName = sortedPlayers.length > 0 ? sortedPlayers[0].name : null;

    return { sessionId, tableName, displayName, totalRounds, roundCount, wins, winRate, declarerShare, leaderName, sortedPlayers };
  });
}

// ── Profile stats (cross-table) ──────────────────────────────────────────────

/**
 * Computes aggregated profile statistics from cross-table rounds.
 * Pure function — no side effects.
 *
 * A "declarer round" is one where round.player === round.playerName,
 * i.e. the user was the Alleinspieler in that round.
 *
 * @param {Array} rounds - flat array from loadMyRoundsAcrossSessions
 *   Each round has: player, playerName, gameValue, won, gameType, timestamp
 * @returns {ProfileStats}
 */
export function computeProfileStats(rounds) {
  // Total rounds where the player was present (all rounds including passed)
  const totalRounds = rounds.length;

  // Filter to declarer rounds only
  const declarerRounds = rounds.filter(r => r.player === r.playerName);

  const totalDeclarerGames = declarerRounds.length;
  const totalPoints = declarerRounds.reduce((sum, r) => sum + r.gameValue, 0);
  const wins = declarerRounds.filter(r => r.won).length;
  const winRate = totalDeclarerGames > 0
    ? parseFloat(((wins / totalDeclarerGames) * 100).toFixed(1))
    : 0.0;

  // Declarer share: how often the user was Alleinspieler relative to total rounds
  const declarerShare = totalRounds > 0
    ? parseFloat(((totalDeclarerGames / totalRounds) * 100).toFixed(1))
    : 0.0;

  // typeDistribution — same shape as computePlayerStats
  const typeCounts = {};
  declarerRounds.forEach(r => {
    const t = r.gameType || 'unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const typeDistribution = totalDeclarerGames > 0
    ? Object.entries(typeCounts)
        .map(([type, count]) => ({
          type,
          count,
          pct: ((count / totalDeclarerGames) * 100).toFixed(0),
        }))
        .sort((a, b) => b.count - a.count)
    : [];

  // pointsOverTime — cumulative gameValue sorted by timestamp
  const sorted = [...declarerRounds].sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return ta - tb;
  });
  let cumulative = 0;
  const pointsOverTime = sorted.map(r => {
    cumulative += r.gameValue;
    return { timestamp: r.timestamp, cumulativePoints: cumulative };
  });

  return {
    totalRounds,
    totalDeclarerGames,
    totalPoints,
    winRate,
    declarerShare,
    typeDistribution,
    pointsOverTime,
  };
}

// ── Achievement first-unlock indices ─────────────────────────────────────────

import { MATRIX_ROWS, NULL_ROWS, COL_SPECS } from './achievementConfig';

/**
 * Berechnet für jeden Spieler die Runden-Indizes (0-basiert) an denen
 * ein Achievement zum ersten Mal freigeschaltet wurde (Angriff + Abwehr).
 *
 * @param {string[]} players - Aktive Spielernamen
 * @param {Array}    rounds  - Alle Runden in Reihenfolge
 * @returns {Array<{ roundIndex: number, player: string, label: string }>}
 */
export function computeAchievementUnlocks(players, rounds) {
  // Pro Spieler: Set der bereits gesehenen Achievement-Keys
  const seen = Object.fromEntries(players.map(p => [p, new Set()]));
  const unlocks = [];

  rounds.forEach((r, idx) => {
    players.forEach(player => {
      // ── Angriff ──
      if (r.player === player && r.won) {
        const checkRows = r.gameType === 'null'
          ? NULL_ROWS.filter(nr => nr.check(r)).map(nr => ({ key: `null::${nr.id}`, label: `${nr.name}` }))
          : MATRIX_ROWS.filter(row => row.type === r.gameType).flatMap(row =>
              COL_SPECS.filter(col => col.check(r)).map(col => ({
                key: `${row.type}::${col.id}`,
                label: `${row.name} ${col.label}${col.label2 ? '+' + col.label2 : ''}`,
              }))
            );

        checkRows.forEach(({ key, label }) => {
          if (!seen[player].has(key)) {
            seen[player].add(key);
            unlocks.push({ roundIndex: idx, player, label: `⚔️ ${label}` });
          }
        });
      }

      // ── Abwehr ──
      if (r.player !== player && !r.won && r.gameType !== 'passed') {
        const checkRows = r.gameType === 'null'
          ? NULL_ROWS.filter(nr => nr.check(r)).map(nr => ({ key: `def::null::${nr.id}`, label: `${nr.name}` }))
          : MATRIX_ROWS.filter(row => row.type === r.gameType).flatMap(row =>
              COL_SPECS.filter(col => col.check(r)).map(col => ({
                key: `def::${row.type}::${col.id}`,
                label: `${row.name} ${col.label}${col.label2 ? '+' + col.label2 : ''}`,
              }))
            );

        checkRows.forEach(({ key, label }) => {
          if (!seen[player].has(key)) {
            seen[player].add(key);
            unlocks.push({ roundIndex: idx, player, label: `🛡️ ${label}` });
          }
        });
      }
    });
  });

  return unlocks;
}
