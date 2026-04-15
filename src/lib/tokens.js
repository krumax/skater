/**
 * tokens.js — Design tokens for JS/JSX usage.
 *
 * CSS variables (defined in index.css :root) are the source of truth for
 * runtime theming. These JS constants mirror the suit/game-type colors
 * that are used in SVG, canvas, and inline-style contexts where CSS
 * variables cannot be used directly.
 *
 * For all other colors, prefer var(--token-name) in inline styles.
 */

/** Background color per game type — used in badges, matrix cells, charts */
export const SUIT_COLORS = {
  grand:   '#0b3d2e',
  club:    '#1b1c1c',
  spade:   '#414944',
  heart:   '#b52619',
  diamond: '#d0a600',
  null:    '#717974',
  passed:  '#9e9e9e',
};

/** Foreground (text) color on top of SUIT_COLORS backgrounds */
export const SUIT_TEXT_COLORS = {
  grand:   '#ffffff',
  club:    '#ffffff',
  spade:   '#ffffff',
  heart:   '#ffffff',
  diamond: '#1b1c1c',
  null:    '#ffffff',
  passed:  '#1b1c1c',
};

/** Semantic outcome colors — used in charts and win/loss indicators */
export const WIN_COLOR  = '#2e7d32';
export const LOSS_COLOR = '#d84315';

/** Sync status indicator colors */
export const SYNC_COLORS = {
  idle:    '#4caf50',
  synced:  '#4caf50',
  syncing: '#9e9e9e',
  error:   '#f44336',
};

/** Player avatar colors (up to 6 players) */
export const PLAYER_COLORS = [
  '#0b3d2e', '#b52619', '#745b00',
  '#396756', '#ff5c47', '#d0a600',
];

/** Unicode suit symbols — used in game type badges and labels */
export const SUIT_SYMBOLS = {
  club:    '♣',
  spade:   '♠',
  heart:   '♥',
  diamond: '♦',
};

/** Material Icons icon names for special game types */
export const SUIT_MAT_ICONS = {
  grand:  'stars',
  null:   'block',
  passed: 'skip_next',
};
