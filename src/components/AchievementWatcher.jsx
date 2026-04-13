import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import AchievementCelebration from './AchievementCelebration';
import SkatSpruchToast from './SkatSpruchToast';
import { MATRIX_ROWS, NULL_ROWS, COL_SPECS } from '../lib/achievementConfig';
import { getSkatSpruch } from '../lib/skatSprueche';

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

/**
 * AchievementWatcher sits at App-level, outside of any route.
 * It watches `rounds` and detects newly unlocked achievements
 * for the player of the most recently added round.
 */
const AchievementWatcher = () => {
  const { rounds, players, sessionId } = useGame();
  const [celebration, setCelebration] = useState(null);
  const [spruch, setSpruch] = useState(null);
  const [spruchWon, setSpruchWon] = useState(true);

  // Snapshot of all players' unlocked keys — updated after each detection cycle
  const snapshotRef = useRef(null);
  const prevRoundCountRef = useRef(rounds.length);
  const prevSessionIdRef = useRef(sessionId);

  // We only need one combined effect to watch for changes
  useEffect(() => {
    // 1. If initializing OR session changed OR completely out of sync (bulk load)
    if (
      snapshotRef.current === null ||
      sessionId !== prevSessionIdRef.current ||
      rounds.length > prevRoundCountRef.current + 1
    ) {
      // Rebuild snapshot silently
      const snap = {};
      players.forEach(p => {
        const { keys } = computeUnlockedKeys(rounds, p);
        snap[p] = keys;
      });
      snapshotRef.current = snap;
      prevRoundCountRef.current = rounds.length;
      prevSessionIdRef.current = sessionId;
      return;
    }

    // 2. If rounds didn't grow (deletion, reset, or unchanged)
    if (rounds.length <= prevRoundCountRef.current) {
      // Just update ref
      prevRoundCountRef.current = rounds.length;
      return;
    }

    // 3. Exactly ONE round was added. Safe to evaluate!
    const latestRound = rounds[rounds.length - 1];
    if (!latestRound) return;

    const player = latestRound.player;
    const prevKeys = snapshotRef.current[player] || new Set();
    const { keys: currentKeys, count: newCount, total: totalPossible } = computeUnlockedKeys(rounds, player);

    // Find newly unlocked
    const newAchievements = [];
    for (const key of currentKeys) {
      if (!prevKeys.has(key)) newAchievements.push(key);
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
    }

    // Update snapshot and refs
    snapshotRef.current = {
      ...snapshotRef.current,
      [player]: currentKeys,
    };
    prevRoundCountRef.current = rounds.length;
    prevSessionIdRef.current = sessionId;

    // Skatspruch — nur wenn kein Achievement-Popup erscheint und kein Eingepasst
    if (newAchievements.length === 0 && latestRound.gameType !== 'passed') {
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
