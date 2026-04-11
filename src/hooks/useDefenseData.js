import { useMemo } from 'react';
import { MATRIX_ROWS, NULL_ROWS, COL_SPECS, formatDate } from '../lib/achievementConfig';

/**
 * Berechnet die Abwehr-Achievement-Matrix für einen Spieler.
 * Zählt Runden, in denen der Spieler NICHT Alleinspieler war
 * und der Alleinspieler verloren hat.
 *
 * @param {Array} rounds - Alle Runden der Session
 * @param {string} player - Name des Spielers
 * @returns {{ map }}
 */
export function useDefenseData(rounds, player) {
  return useMemo(() => {
    const defenseWins = rounds.filter(
      r => r.player !== player && !r.won && r.gameType !== 'passed'
    );
    const map = {};

    // Farb-/Trumpf-Spiele
    MATRIX_ROWS.forEach(row => {
      map[row.type] = {};
      const relevant = defenseWins.filter(r => r.gameType === row.type);
      COL_SPECS.forEach(col => {
        const matched = relevant.filter(col.check);
        if (matched.length > 0) {
          const firstGame = matched.reduce((a, b) =>
            new Date(a.timestamp) < new Date(b.timestamp) ? a : b
          );
          map[row.type][col.id] = {
            count: matched.length,
            date: formatDate(firstGame.timestamp),
          };
        }
      });
    });

    // Null-Varianten
    map['null'] = {};
    const nullDefense = defenseWins.filter(r => r.gameType === 'null');
    NULL_ROWS.forEach(nr => {
      const matched = nullDefense.filter(nr.check);
      if (matched.length > 0) {
        const firstGame = matched.reduce((a, b) =>
          new Date(a.timestamp) < new Date(b.timestamp) ? a : b
        );
        map['null'][nr.id] = {
          count: matched.length,
          date: formatDate(firstGame.timestamp),
        };
      }
    });

    return { map };
  }, [rounds, player]);
}
