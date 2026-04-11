import { useMemo } from 'react';
import { MATRIX_ROWS, NULL_ROWS, COL_SPECS, formatDate } from '../lib/achievementConfig';

/**
 * Berechnet die Angriffs-Achievement-Matrix für einen Spieler.
 *
 * @param {Array} rounds - Alle Runden der Session
 * @param {string} player - Name des Spielers
 * @returns {{ map, unlockedCount, totalPossible, unlockedKeys, percent }}
 */
export function useMatrixData(rounds, player) {
  return useMemo(() => {
    let unlockedCount = 0;
    let totalPossible = 0;
    const map = {};
    const unlockedKeys = new Set();

    // Farb-/Trumpf-Spiele
    MATRIX_ROWS.forEach(row => {
      map[row.type] = {};
      const wonGames = rounds.filter(r => r.player === player && r.won && r.gameType === row.type);

      COL_SPECS.forEach(col => {
        totalPossible++;
        const unlockedGames = wonGames.filter(col.check);
        if (unlockedGames.length > 0) {
          unlockedCount++;
          const maxScore = Math.max(...unlockedGames.map(g => g.gameValue));
          const firstGame = unlockedGames.reduce((a, b) =>
            new Date(a.timestamp) < new Date(b.timestamp) ? a : b
          );
          map[row.type][col.id] = {
            value: maxScore,
            date: formatDate(firstGame.timestamp),
            count: unlockedGames.length,
          };
          unlockedKeys.add(`${row.type}::${col.id}`);
        }
      });
    });

    // Null-Varianten
    map['null'] = {};
    const wonNullGames = rounds.filter(r => r.player === player && r.won && r.gameType === 'null');
    NULL_ROWS.forEach(nr => {
      totalPossible++;
      const unlockedGames = wonNullGames.filter(nr.check);
      if (unlockedGames.length > 0) {
        unlockedCount++;
        const maxScore = Math.max(...unlockedGames.map(g => g.gameValue));
        const firstGame = unlockedGames.reduce((a, b) =>
          new Date(a.timestamp) < new Date(b.timestamp) ? a : b
        );
        map['null'][nr.id] = {
          value: maxScore,
          date: formatDate(firstGame.timestamp),
          count: unlockedGames.length,
        };
        unlockedKeys.add(`null::${nr.id}`);
      }
    });

    return {
      map,
      unlockedCount,
      totalPossible,
      unlockedKeys,
      percent: totalPossible > 0 ? Math.round((unlockedCount / totalPossible) * 100) : 0,
    };
  }, [rounds, player]);
}
