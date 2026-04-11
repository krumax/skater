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

// Matrix-Konfiguration (gespiegelt aus PlayerAnalytics)
const matrixConfig = [
  { type: 'grand' }, { type: 'club' }, { type: 'spade' },
  { type: 'heart' }, { type: 'diamond' },
];
const nullRows = [
  { id: 'null',             check: (r) => !r.hand && !r.ouvert },
  { id: 'null_hand',        check: (r) =>  r.hand && !r.ouvert },
  { id: 'null_ouvert',      check: (r) => !r.hand &&  r.ouvert },
  { id: 'null_hand_ouvert', check: (r) =>  r.hand &&  r.ouvert },
];
const colSpecs = [
  { check: (r) => r.mitOhne === 'mit'  && r.spitzen === 1 },
  { check: (r) => r.mitOhne === 'mit'  && r.spitzen === 2 },
  { check: (r) => r.mitOhne === 'mit'  && r.spitzen === 3 },
  { check: (r) => r.mitOhne === 'mit'  && r.spitzen === 4 },
  { check: (r) => r.mitOhne === 'ohne' && r.spitzen === 1 },
  { check: (r) => r.mitOhne === 'ohne' && r.spitzen === 2 },
  { check: (r) => r.mitOhne === 'ohne' && r.spitzen === 3 },
  { check: (r) => r.mitOhne === 'ohne' && r.spitzen === 4 },
  { check: (r) =>  r.hand && !r.schneider && !r.schwarz },
  { check: (r) =>  r.hand &&  r.schneider && !r.schwarz },
  { check: (r) =>  r.hand &&  r.schwarz },
  { check: (r) => !r.hand && (r.schneider || r.schneiderAnsagt) },
  { check: (r) =>  r.schneiderAnnounced },
  { check: (r) => !r.hand && (r.schwarz  || r.schwarzAnsagt) },
  { check: (r) =>  r.schwarzAnnounced },
  { check: (r) =>  r.ouvert },
];

/**
 * Berechnet den Achievement-Count (Angriff + Abwehr) für einen Spieler
 * und gibt das aktuelle Level zurück.
 */
export function computePlayerLevel(rounds, player) {
  // Angriff: gewonnene Spiele als Alleinspieler
  const unlockedKeys = new Set();
  matrixConfig.forEach(({ type }) => {
    const wonGames = rounds.filter(r => r.player === player && r.won && r.gameType === type);
    colSpecs.forEach((col, i) => {
      if (wonGames.some(col.check)) unlockedKeys.add(`${type}::${i}`);
    });
  });
  const wonNull = rounds.filter(r => r.player === player && r.won && r.gameType === 'null');
  nullRows.forEach(nr => {
    if (wonNull.some(nr.check)) unlockedKeys.add(`null::${nr.id}`);
  });

  // Abwehr: Runden wo Alleinspieler verloren hat und dieser Spieler NICHT Alleinspieler war
  const defenseKeys = new Set();
  const defenseWins = rounds.filter(r => r.player !== player && !r.won && r.gameType !== 'passed');
  matrixConfig.forEach(({ type }) => {
    const relevant = defenseWins.filter(r => r.gameType === type);
    colSpecs.forEach((col, i) => {
      if (relevant.some(col.check)) defenseKeys.add(`${type}::${i}`);
    });
  });
  const nullDefense = defenseWins.filter(r => r.gameType === 'null');
  nullRows.forEach(nr => {
    if (nullDefense.some(nr.check)) defenseKeys.add(`null::${nr.id}`);
  });

  const combined = unlockedKeys.size + defenseKeys.size;
  return getLevel(combined);
}
