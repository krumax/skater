import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import AchievementCelebration from './AchievementCelebration';

/* ── Matrix config (duplicated from PlayerAnalytics for independence) ── */
const matrixConfig = [
  { type: 'grand', name: 'Grand', suit: null, matIcon: 'stars' },
  { type: 'club', name: 'Kreuz', suit: '♣', matIcon: null },
  { type: 'spade', name: 'Pik', suit: '♠', matIcon: null },
  { type: 'heart', name: 'Herz', suit: '♥', matIcon: null },
  { type: 'diamond', name: 'Karo', suit: '♦', matIcon: null },
  { type: 'null', name: 'Null', suit: null, matIcon: 'block' },
];

const colSpecs = [
  { id: 'mit_1', label: '+1', check: (r) => r.mitOhne === 'mit' && r.spitzen === 1 },
  { id: 'mit_2', label: '+2', check: (r) => r.mitOhne === 'mit' && r.spitzen === 2 },
  { id: 'mit_3', label: '+3', check: (r) => r.mitOhne === 'mit' && r.spitzen === 3 },
  { id: 'mit_4', label: '+4', check: (r) => r.mitOhne === 'mit' && r.spitzen === 4 },
  { id: 'ohne_1', label: '−1', check: (r) => r.mitOhne === 'ohne' && r.spitzen === 1 },
  { id: 'ohne_2', label: '−2', check: (r) => r.mitOhne === 'ohne' && r.spitzen === 2 },
  { id: 'ohne_3', label: '−3', check: (r) => r.mitOhne === 'ohne' && r.spitzen === 3 },
  { id: 'ohne_4', label: '−4', check: (r) => r.mitOhne === 'ohne' && r.spitzen === 4 },
  { id: 'hand', label: 'Hand', isSpecial: true, check: (r) => r.hand },
  { id: 'schneider', label: 'Schneid', isSpecial: true, check: (r) => r.schneider || r.schneiderAnsagt },
  { id: 'schwarz', label: 'Schwarz', isSpecial: true, check: (r) => r.schwarz || r.schwarzAnsagt },
  { id: 'ouvert', label: 'Ouvert', isSpecial: true, check: (r) => r.ouvert },
];

function computeUnlockedKeys(rounds, player) {
  const keys = new Set();
  let count = 0;
  let total = 0;

  matrixConfig.forEach(row => {
    const wonGames = rounds.filter(r => r.player === player && r.won && r.gameType === row.type);

    colSpecs.forEach((col, idx) => {
      if (row.type === 'null') {
        if (idx < 8) return;
        if (col.id === 'schneider' || col.id === 'schwarz') return;
      }
      total++;
      const matched = wonGames.filter(col.check);
      if (matched.length > 0) {
        count++;
        keys.add(`${row.type}::${col.id}`);
      }
    });
  });

  return { keys, count, total };
}

/**
 * AchievementWatcher sits at App-level, outside of any route.
 * It watches `rounds` and detects newly unlocked achievements
 * for the player of the most recently added round.
 */
const AchievementWatcher = () => {
  const { rounds, players } = useGame();
  const [celebration, setCelebration] = useState(null);

  // Snapshot of all players' unlocked keys — updated after each detection cycle
  const snapshotRef = useRef(null);
  const prevRoundCountRef = useRef(rounds.length);

  // Build initial snapshot on mount (or when players change)
  useEffect(() => {
    if (snapshotRef.current === null) {
      const snap = {};
      players.forEach(p => {
        const { keys } = computeUnlockedKeys(rounds, p);
        snap[p] = keys;
      });
      snapshotRef.current = snap;
      prevRoundCountRef.current = rounds.length;
    }
  }, [rounds, players]);

  // Detect new achievements whenever rounds grow (new round added)
  useEffect(() => {
    if (snapshotRef.current === null) return;
    if (rounds.length <= prevRoundCountRef.current) {
      // Rounds didn't grow (deletion, reset, or unchanged) — just update ref
      prevRoundCountRef.current = rounds.length;
      return;
    }

    // A new round was added — find the player of the latest round
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
      const rowCfg = matrixConfig.find(r => r.type === gameType);
      const colCfg = colSpecs.find(c => c.id === colId);
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

    // Update snapshot for this player
    snapshotRef.current = {
      ...snapshotRef.current,
      [player]: currentKeys,
    };
    prevRoundCountRef.current = rounds.length;
  }, [rounds, players]);

  return (
    <AchievementCelebration
      achievement={celebration}
      onClose={() => setCelebration(null)}
    />
  );
};

export default AchievementWatcher;
