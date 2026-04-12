/**
 * playerRanking.js — Kategorie-basiertes Ranking-System.
 *
 * Drei Kategorien: Farbspiel (Kreuz/Pik/Herz/Karo), Null, Grand.
 * Jede Kategorie hat 6 Ränge basierend auf gewonnenen Spielen.
 */

export const RANK_TIERS = [
  { id: 'bronze',  label: 'Bronze',  color: '#cd7f32', icon: '🥉' },
  { id: 'silber',  label: 'Silber',  color: '#9e9e9e', icon: '🥈' },
  { id: 'gold',    label: 'Gold',    color: '#d0a600', icon: '🥇' },
  { id: 'platin',  label: 'Platin',  color: '#5b8fa8', icon: '💠' },
  { id: 'diamant', label: 'Diamant', color: '#b9f2ff', icon: '💎' },
  { id: 'legende', label: 'Legende', color: '#e040fb', icon: '👑' },
];

export const RANK_THRESHOLDS = {
  farbspiel: [
    { tier: 'bronze',  wins: 25 },
    { tier: 'silber',  wins: 75 },
    { tier: 'gold',    wins: 150 },
    { tier: 'platin',  wins: 300 },
    { tier: 'diamant', wins: 600 },
    { tier: 'legende', wins: 1200 },
  ],
  null: [
    { tier: 'bronze',  wins: 10 },
    { tier: 'silber',  wins: 25 },
    { tier: 'gold',    wins: 50 },
    { tier: 'platin',  wins: 100 },
    { tier: 'diamant', wins: 200 },
    { tier: 'legende', wins: 400 },
  ],
  grand: [
    { tier: 'bronze',  wins: 10 },
    { tier: 'silber',  wins: 25 },
    { tier: 'gold',    wins: 50 },
    { tier: 'platin',  wins: 100 },
    { tier: 'diamant', wins: 200 },
    { tier: 'legende', wins: 400 },
  ],
};

export const CATEGORY_META = {
  farbspiel: {
    label: 'Farbspiel',
    subtitle: 'Meisterschaft der Farbspiele',
    color: '#0b3d2e',
    matIcon: 'style',
    gameTypes: ['club', 'spade', 'heart', 'diamond'],
  },
  null: {
    label: 'Null',
    subtitle: 'Die Kunst des Stichvermeidens',
    color: '#5b8fa8',
    matIcon: 'block',
    gameTypes: ['null'],
  },
  grand: {
    label: 'Grand',
    subtitle: 'Der Gipfel der Strategie',
    color: '#d0a600',
    matIcon: 'stars',
    gameTypes: ['grand'],
  },
};

/**
 * Berechnet den aktuellen Rang eines Spielers in einer Kategorie.
 *
 * @param {number} wins       - Gewonnene Spiele in der Kategorie
 * @param {string} category   - 'farbspiel' | 'null' | 'grand'
 * @returns {{
 *   currentTier: object|null,
 *   nextTier: object|null,
 *   currentWins: number,
 *   winsForCurrent: number,
 *   winsForNext: number,
 *   progressPct: number,
 *   label: string,
 * }}
 */
export function computeCategoryRank(wins, category) {
  const thresholds = RANK_THRESHOLDS[category];

  let currentTierIdx = -1;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (wins >= thresholds[i].wins) { currentTierIdx = i; break; }
  }

  const currentThreshold = currentTierIdx >= 0 ? thresholds[currentTierIdx] : null;
  const nextThreshold     = thresholds[currentTierIdx + 1] ?? null;
  const currentTier       = currentThreshold ? RANK_TIERS.find(t => t.id === currentThreshold.tier) : null;
  const nextTier          = nextThreshold    ? RANK_TIERS.find(t => t.id === nextThreshold.tier)    : null;

  const winsForCurrent = currentThreshold?.wins ?? 0;
  const winsForNext    = nextThreshold?.wins ?? null;

  let progressPct = 0;
  if (winsForNext !== null) {
    progressPct = Math.min(100, Math.round(((wins - winsForCurrent) / (winsForNext - winsForCurrent)) * 100));
  } else {
    progressPct = 100; // Legende erreicht
  }

  return {
    currentTier,
    nextTier,
    currentWins: wins,
    winsForCurrent,
    winsForNext,
    progressPct,
  };
}

/**
 * Zählt gewonnene Spiele eines Spielers pro Kategorie.
 */
export function computeCategoryWins(rounds, playerName) {
  const won = rounds.filter(r => r.player === playerName && r.won);
  return {
    farbspiel: won.filter(r => ['club', 'spade', 'heart', 'diamond'].includes(r.gameType)).length,
    null:      won.filter(r => r.gameType === 'null').length,
    grand:     won.filter(r => r.gameType === 'grand').length,
  };
}
