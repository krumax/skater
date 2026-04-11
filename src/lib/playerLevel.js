import { MATRIX_ROWS, NULL_ROWS, COL_SPECS } from './achievementConfig';

// Level-Definitionen: [minAchievements, label, emoji]
export const LEVELS = [
  [0,   'Anfänger',          '🃏'],
  [5,   'Lehrling',          '📖'],
  [10,  'Geselle',           '🎯'],
  [20,  'Fortgeschrittener', '⚔️'],
  [35,  'Experte',           '🏅'],
  [50,  'Meister',           '🏆'],
  [70,  'Großmeister',       '👑'],
  [90,  'Skatlegende',       '⭐'],
  [110, 'Unsterblicher',     '🌟'],
];

export function getLevel(count) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (count >= l[0]) current = l;
    else break;
  }
  const idx = LEVELS.indexOf(current);
  const nextArr = LEVELS[idx + 1] ?? null;
  const next = nextArr ? { min: nextArr[0], label: nextArr[1], emoji: nextArr[2] } : null;
  return { min: current[0], label: current[1], emoji: current[2], idx, next };
}

/**
 * Berechnet den Achievement-Count (Angriff + Abwehr) für einen Spieler
 * und gibt das aktuelle Level zurück.
 */
export function computePlayerLevel(rounds, player) {
  // Angriff
  const unlockedKeys = new Set();
  MATRIX_ROWS.forEach(({ type }) => {
    const wonGames = rounds.filter(r => r.player === player && r.won && r.gameType === type);
    COL_SPECS.forEach((col, i) => {
      if (wonGames.some(col.check)) unlockedKeys.add(`${type}::${i}`);
    });
  });
  const wonNull = rounds.filter(r => r.player === player && r.won && r.gameType === 'null');
  NULL_ROWS.forEach(nr => {
    if (wonNull.some(nr.check)) unlockedKeys.add(`null::${nr.id}`);
  });

  // Abwehr
  const defenseKeys = new Set();
  const defenseWins = rounds.filter(r => r.player !== player && !r.won && r.gameType !== 'passed');
  MATRIX_ROWS.forEach(({ type }) => {
    const relevant = defenseWins.filter(r => r.gameType === type);
    COL_SPECS.forEach((col, i) => {
      if (relevant.some(col.check)) defenseKeys.add(`${type}::${i}`);
    });
  });
  const nullDefense = defenseWins.filter(r => r.gameType === 'null');
  NULL_ROWS.forEach(nr => {
    if (nullDefense.some(nr.check)) defenseKeys.add(`null::${nr.id}`);
  });

  return getLevel(unlockedKeys.size + defenseKeys.size);
}
