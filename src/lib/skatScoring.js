/**
 * Skat Scoring Engine
 * Implements the official Skat scoring rules (Skatordnung).
 *
 * Game Value = Base Value × Multiplier
 *
 * Base Values:
 *   ♣ Kreuz (Clubs/Eichel) = 12
 *   ♠ Pik   (Spades/Grün)  = 11
 *   ♥ Herz  (Hearts/Rot)   = 10
 *   ♦ Karo  (Diamonds/Schellen) = 9
 *   Grand                   = 24
 *   Null (special, fixed values)
 *
 * Multiplier = Spitzen + 1 (game level) + modifiers
 *   Modifiers: Hand (+1), Schneider (+1), Schneider angesagt (+1),
 *              Schwarz (+1), Schwarz angesagt (+1), Ouvert (+1)
 *
 * Null fixed values:
 *   Null         = 23
 *   Null Hand    = 35
 *   Null Ouvert  = 46
 *   Null Ouvert Hand = 59
 */

// ─── Base Values ───

export const BASE_VALUES = {
  club:    12, // Kreuz / Eichel
  spade:   11, // Pik / Grün
  heart:   10, // Herz / Rot
  diamond:  9, // Karo / Schellen
  grand:   24,
};

export const NULL_VALUES = {
  null:           23,
  nullHand:       35,
  nullOuvert:     46,
  nullOuvertHand: 59,
};

export const SUIT_LABELS = {
  club:    'Kreuz',
  spade:   'Pik',
  heart:   'Herz',
  diamond: 'Karo',
  grand:   'Grand',
  null:    'Null',
};

export const SUIT_SYMBOLS = {
  club:    '♣',
  spade:   '♠',
  heart:   '♥',
  diamond: '♦',
  grand:   '★',
  null:    '∅',
};

// ─── Multiplier Calculation ───

/**
 * Calculates the multiplier level for a suit/grand game.
 * @param {number} spitzen  – number of Spitzen (1–11 for suit, 1–4 for grand)
 * @param {object} modifiers – { hand, schneider, schneiderAnnounced, schwarz, schwarzAnnounced, ouvert }
 * @returns {number} total multiplier
 */
export function calculateMultiplier(spitzen, modifiers = {}) {
  let level = spitzen + 1; // Spitzen + 1 (game level)

  if (modifiers.hand)               level += 1;
  if (modifiers.schneider)          level += 1;
  if (modifiers.schneiderAnnounced) level += 1;
  if (modifiers.schwarz)            level += 1;
  if (modifiers.schwarzAnnounced)   level += 1;
  if (modifiers.ouvert)             level += 1;

  return level;
}

// ─── Game Value Calculation ───

/**
 * Calculates the value of a Skat game.
 * @param {object} params
 * @param {string} params.gameType    – 'club'|'spade'|'heart'|'diamond'|'grand'|'null'
 * @param {number} params.spitzen     – number of Spitzen (matadors) (1–11 for suit, 1–4 for grand)
 * @param {boolean} params.mitOhne    – true = "Mit" (with), false = "Ohne" (without)
 * @param {boolean} params.hand       – played Hand?
 * @param {boolean} params.schneider  – Schneider achieved?
 * @param {boolean} params.schneiderAnnounced – Schneider announced?
 * @param {boolean} params.schwarz    – Schwarz achieved?
 * @param {boolean} params.schwarzAnnounced – Schwarz announced?
 * @param {boolean} params.ouvert     – played Ouvert?
 * @param {number}  params.eyeCount   – declarers eye count (0-120)
 * @param {boolean} params.won        – did the declarer win?
 * @returns {object} { gameValue, multiplier, baseValue, won, details }
 */
export function calculateGameValue({
  gameType,
  spitzen = 1,
  hand = false,
  schneider = false,
  schneiderAnnounced = false,
  schwarz = false,
  schwarzAnnounced = false,
  ouvert = false,
  eyeCount = 0,
}) {
  // ── Null games have fixed values ──
  if (gameType === 'null') {
    let value;
    if (ouvert && hand) {
      value = NULL_VALUES.nullOuvertHand;
    } else if (ouvert) {
      value = NULL_VALUES.nullOuvert;
    } else if (hand) {
      value = NULL_VALUES.nullHand;
    } else {
      value = NULL_VALUES.null;
    }
    // In Null, you win if you take 0 tricks (0 eyes)
    const won = eyeCount === 0;
    return {
      gameValue: won ? value : -2 * value,
      baseValue: value,
      multiplier: 1,
      won,
      details: {
        type: 'Null' + (hand ? ' Hand' : '') + (ouvert ? ' Ouvert' : ''),
      },
    };
  }

  // ── Suit / Grand games ──
  const baseValue = BASE_VALUES[gameType];
  if (baseValue === undefined) {
    throw new Error(`Unknown game type: ${gameType}`);
  }

  // Determine Schneider/Schwarz from eye count
  const actualSchneider = schneider || eyeCount >= 90;
  const actualSchwarz = schwarz || eyeCount >= 120;

  const modifiers = {
    hand,
    schneider: actualSchneider,
    schneiderAnnounced,
    schwarz: actualSchwarz,
    schwarzAnnounced,
    ouvert,
  };

  const multiplier = calculateMultiplier(spitzen, modifiers);
  const rawGameValue = baseValue * multiplier;

  // Win determination: declarer needs ≥ 61 eyes
  const won = eyeCount >= 61;

  // If lost, the value is doubled and negative
  const gameValue = won ? rawGameValue : -2 * rawGameValue;

  return {
    gameValue,
    baseValue,
    multiplier,
    won,
    details: {
      type: SUIT_LABELS[gameType],
      symbol: SUIT_SYMBOLS[gameType],
      spitzen,
      hand,
      schneider: actualSchneider,
      schneiderAnnounced,
      schwarz: actualSchwarz,
      schwarzAnnounced,
      ouvert,
      eyeCount,
    },
  };
}

/**
 * Determines eye-count based outcome label.
 */
export function getOutcomeLabel(eyeCount) {
  if (eyeCount >= 120) return 'Schwarz';
  if (eyeCount >= 90)  return 'Schneider';
  if (eyeCount >= 61)  return 'Gewonnen';
  if (eyeCount >= 31)  return 'Verloren';
  if (eyeCount > 0)    return 'Schneider (verloren)';
  return 'Schwarz (verloren)';
}
