import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import AchievementCelebration from './AchievementCelebration';
import SkatSpruchToast from './SkatSpruchToast';
import { MATRIX_ROWS, NULL_ROWS, COL_SPECS } from '../lib/achievementConfig';
import { getSkatSpruch } from '../lib/skatSprueche';
import { computeCategoryWins, computeCategoryRank, RANK_TIERS, CATEGORY_META } from '../lib/playerRanking';

function computeUnlockedKeys(rounds, player) {
  const keys = new Set();
  let count = 0;
  let total = 0;

  // Farb-/Trumpf-Spiele (ohne Null)
  MATRIX_ROWS.forEach(row => {
    const wonGames = rounds.filter(r => r.player === player && r.won && r.gameType === row.type);
    COL_SPECS.forEach(col => {
      total++;
      if (wonGames.some(col.check)) { count++; keys.add(`${row.type}::${col.id}`); }
    });
  });

  // Null-Varianten
  const wonNull = rounds.filter(r => r.player === player && r.won && r.gameType === 'null');
  NULL_ROWS.forEach(nr => {
    total++;
    if (wonNull.some(nr.check)) { count++; keys.add(`null::${nr.id}`); }
  });

  return { keys, count, total };
}

/** Returns a map of { category -> tierId | null } for a player */
function computeRankSnapshot(rounds, player) {
  const wins = computeCategoryWins(rounds, player);
  const snap = {};
  for (const cat of ['farbspiel', 'null', 'grand', 'gesamt']) {
    const rank = computeCategoryRank(wins[cat], cat);
    snap[cat] = rank.currentTier?.id ?? null;
  }
  return snap;
}

/**
 * AchievementWatcher sits at App-level, outside of any route.
 * It watches `rounds` and detects newly unlocked achievements
 * and rank-up events for the player of the most recently added round.
 */
const AchievementWatcher = () => {
  const { rounds, players, sessionId } = useGame();
  const [celebration, setCelebration] = useState(null);
  const [spruch, setSpruch] = useState(null);
  const [spruchWon, setSpruchWon] = useState(true);

  // Snapshot of all players' unlocked keys - updated after each detection cycle
  const snapshotRef = useRef(null);
  const rankSnapshotRef = useRef(null);
  const prevRoundCountRef = useRef(rounds.length);
  const prevSessionIdRef = useRef(sessionId);

  useEffect(() => {
    // 1. If initializing OR session changed OR completely out of sync (bulk load)
    if (
      snapshotRef.current === null ||
      sessionId !== prevSessionIdRef.current ||
      rounds.length > prevRoundCountRef.current + 1
    ) {
      const snap = {};
      const rankSnap = {};
      players.forEach(p => {
        const { keys } = computeUnlockedKeys(rounds, p);
        snap[p] = keys;
        rankSnap[p] = computeRankSnapshot(rounds, p);
      });
      snapshotRef.current = snap;
      rankSnapshotRef.current = rankSnap;
      prevRoundCountRef.current = rounds.length;
      prevSessionIdRef.current = sessionId;
      return;
    }

    // 2. If rounds didn't grow (deletion, reset, or unchanged)
    if (rounds.length <= prevRoundCountRef.current) {
      prevRoundCountRef.current = rounds.length;
      return;
    }

    // 3. Exactly ONE round was added. Safe to evaluate!
    const latestRound = rounds[rounds.length - 1];
    if (!latestRound) return;

    const player = latestRound.player;
    const prevKeys = snapshotRef.current[player] || new Set();
    const { keys: currentKeys, count: newCount, total: totalPossible } = computeUnlockedKeys(rounds, player);

    // Find newly unlocked achievements
    const newAchievements = [];
    for (const key of currentKeys) {
      if (!prevKeys.has(key)) newAchievements.push(key);
    }

    // Check for rank-ups across all 4 categories
    const prevRanks = rankSnapshotRef.current[player] || {};
    const newRanks = computeRankSnapshot(rounds, player);
    let rankUpEvent = null;
    for (const cat of ['farbspiel', 'null', 'grand', 'gesamt']) {
      if (newRanks[cat] !== prevRanks[cat] && newRanks[cat] !== null) {
        const newTierObj = RANK_TIERS.find(t => t.id === newRanks[cat]);
        const oldTierObj = prevRanks[cat] ? RANK_TIERS.find(t => t.id === prevRanks[cat]) : null;
        const wins = computeCategoryWins(rounds, player);
        rankUpEvent = {
          isRankUp: true,
          playerName: player,
          rankCategory: CATEGORY_META[cat].label,
          oldTier: oldTierObj?.label ?? '–',
          newTier: newTierObj?.label ?? '',
          tierColor: newTierObj?.color ?? '#d0a600',
          tierIcon: newTierObj?.icon ?? '🏅',
          rankWins: wins[cat],
        };
        break; // show one at a time
      }
    }

    if (newAchievements.length > 0) {
      const [gameType, colId] = newAchievements[0].split('::');
      const rowCfg = MATRIX_ROWS.find(r => r.type === gameType) ?? NULL_ROWS.find(r => r.id === gameType);
      const colCfg = COL_SPECS.find(c => c.id === colId);
      const oldCount = prevKeys.size;
      const oldLevel = Math.floor(oldCount / 3) + 1;
      const newLevel = Math.floor(newCount / 3) + 1;
      const newPercent = totalPossible > 0 ? Math.round((newCount / totalPossible) * 100) : 0;

      setCelebration({
        playerName: player,
        gameTypeName: rowCfg?.name || gameType,
        gameTypeIcon: rowCfg?.matIcon || null,
        gameTypeSuit: rowCfg?.suit || null,
        colLabel: colCfg?.label || colId,
        isSpecial: colCfg?.isSpecial || false,
        isLevelUp: newLevel > oldLevel,
        oldLevel,
        newLevel,
        oldCount,
        newCount,
        totalPossible,
        newPercent,
      });
    } else if (rankUpEvent) {
      setCelebration(rankUpEvent);
    }

    // Update snapshots
    snapshotRef.current = { ...snapshotRef.current, [player]: currentKeys };
    rankSnapshotRef.current = { ...rankSnapshotRef.current, [player]: newRanks };
    prevRoundCountRef.current = rounds.length;
    prevSessionIdRef.current = sessionId;

    // Skatspruch - nur wenn kein Achievement/Rang-Popup erscheint und kein Eingepasst
    if (newAchievements.length === 0 && !rankUpEvent && latestRound.gameType !== 'passed') {
      const text = getSkatSpruch(latestRound, rounds);
      if (text) {
        setSpruch(text);
        setSpruchWon(latestRound.won);
      }
    }
  }, [rounds, players, sessionId]);

  return (
    <>
      <AchievementCelebration
        achievement={celebration}
        onClose={() => setCelebration(null)}
      />
      <SkatSpruchToast
        spruch={spruch}
        won={spruchWon}
        onDone={() => setSpruch(null)}
      />
    </>
  );
};

export default AchievementWatcher;
