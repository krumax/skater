import { BASE_VALUES, NULL_VALUES, calculateMultiplier } from './skatScoring.js';

/**
 * Pure data and card-drawing helpers for the Reizwert-Trainer.
 *
 * The trainer uses the 32-card German Skat deck. Cards carry stable IDs so
 * hands can be compared without depending on object identity.
 */

export const DECK_RANKS = Object.freeze([
  'seven',
  'eight',
  'nine',
  'ten',
  'jack',
  'queen',
  'king',
  'ace',
]);

export const DECK_SUITS = Object.freeze([
  'club',
  'spade',
  'heart',
  'diamond',
]);

export const DECK_RANK_LABELS = Object.freeze({
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  jack: 'Bube',
  queen: 'Dame',
  king: 'König',
  ace: 'Ass',
});

export const DECK_SUIT_LABELS = Object.freeze({
  club: 'Kreuz',
  spade: 'Pik',
  heart: 'Herz',
  diamond: 'Karo',
});

/**
 * Trump order for each suit game, from the highest to the lowest trump.
 * The four jacks precede the eleven cards of the selected suit.
 */
export const COLOR_TRUMP_ORDER = Object.freeze({
  club: Object.freeze([
    'club-jack',
    'spade-jack',
    'heart-jack',
    'diamond-jack',
    'club-ace',
    'club-ten',
    'club-king',
    'club-queen',
    'club-nine',
    'club-eight',
    'club-seven',
  ]),
  spade: Object.freeze([
    'club-jack',
    'spade-jack',
    'heart-jack',
    'diamond-jack',
    'spade-ace',
    'spade-ten',
    'spade-king',
    'spade-queen',
    'spade-nine',
    'spade-eight',
    'spade-seven',
  ]),
  heart: Object.freeze([
    'club-jack',
    'spade-jack',
    'heart-jack',
    'diamond-jack',
    'heart-ace',
    'heart-ten',
    'heart-king',
    'heart-queen',
    'heart-nine',
    'heart-eight',
    'heart-seven',
  ]),
  diamond: Object.freeze([
    'club-jack',
    'spade-jack',
    'heart-jack',
    'diamond-jack',
    'diamond-ace',
    'diamond-ten',
    'diamond-king',
    'diamond-queen',
    'diamond-nine',
    'diamond-eight',
    'diamond-seven',
  ]),
});

/** The four jacks are the only trumps in a Grand. */
export const GRAND_TRUMP_ORDER = Object.freeze([
  'club-jack',
  'spade-jack',
  'heart-jack',
  'diamond-jack',
]);

const HAND_SIZE = 10;
const MAX_TRAINER_PUZZLE_ATTEMPTS = 1000;

const TRAINER_COLOR_GAME_TYPES = Object.freeze([
  'club',
  'spade',
  'heart',
  'diamond',
]);

export const MAX_TRAINER_SPITZEN = 4;

export const TRAINER_GAME_TYPES = Object.freeze([
  ...TRAINER_COLOR_GAME_TYPES,
  'grand',
  'null',
]);

const MAX_SPITZEN_BY_GAME_TYPE = Object.freeze({
  club: MAX_TRAINER_SPITZEN,
  spade: MAX_TRAINER_SPITZEN,
  heart: MAX_TRAINER_SPITZEN,
  diamond: MAX_TRAINER_SPITZEN,
  grand: MAX_TRAINER_SPITZEN,
  null: 0,
});

const VALID_CARD_IDS = new Set(
  DECK_SUITS.flatMap((suit) => DECK_RANKS.map((rank) => `${suit}-${rank}`)),
);

function getHandCardId(card, index) {
  const cardId = typeof card === 'string' ? card : card?.id;
  if (typeof cardId !== 'string' || cardId.length === 0) {
    throw new TypeError(`Die Hand enthält an Position ${index} keine gültige Karte mit Karten-ID.`);
  }
  return cardId;
}

/**
 * Validates a trainer hand. The generator supplies ten cards, while the
 * lower-level Spitzen helper can intentionally work with partial hands.
 *
 * @param {Array<{id: string}|string>} hand
 * @param {{exactSize?: boolean}} options
 */
function validateHand(hand, { exactSize = false } = {}) {
  if (!Array.isArray(hand)) {
    throw new TypeError('Der Trainer erwartet eine Kartenhand als Array.');
  }
  if (exactSize && hand.length !== HAND_SIZE) {
    throw new RangeError(`Eine Traineraufgabe muss genau ${HAND_SIZE} Karten enthalten.`);
  }

  const seen = new Set();
  hand.forEach((card, index) => {
    const cardId = getHandCardId(card, index);
    if (!VALID_CARD_IDS.has(cardId)) {
      throw new Error(`Die Hand enthält an Position ${index} die unbekannte Karte ${cardId}.`);
    }
    if (seen.has(cardId)) {
      throw new Error(`Die Hand enthält die Karte ${cardId} doppelt.`);
    }
    seen.add(cardId);
  });
}

function validateTrainerPuzzle(puzzle) {
  if (!puzzle || typeof puzzle !== 'object' || Array.isArray(puzzle)) {
    throw new TypeError('evaluateSelection erwartet ein gültiges Puzzle-Objekt.');
  }
  validateHand(puzzle.hand, { exactSize: true });
  if (!hasTrainerSpitzenScope(puzzle.hand)) {
    throw new RangeError(
      'Das Puzzle liegt außerhalb des vereinfachten Trainerbereichs: Tatsächliche Spitzen über 4 werden im Trainer nicht bewertet.',
    );
  }
}

function hasTrainerSpitzenScope(hand) {
  return TRAINER_COLOR_GAME_TYPES.every((gameType) => (
    getSpitzenForGame(hand, gameType).spitzen <= MAX_TRAINER_SPITZEN
  ));
}

/**
 * Checks whether a complete hand can be used by the simplified trainer.
 * Official Spitzen values above four remain available through getSpitzenForGame;
 * this scope helper only decides whether a hand is suitable for a puzzle.
 *
 * @param {Array<{id: string}|string>} hand
 * @returns {boolean}
 */
export function isTrainerHandInScope(hand) {
  validateHand(hand, { exactSize: true });
  return hasTrainerSpitzenScope(hand);
}

function validateTrumpOrder(trumpOrder) {
  if (!Array.isArray(trumpOrder) || trumpOrder.length === 0) {
    throw new TypeError('getSpitzen erwartet eine nicht-leere Trumpfreihenfolge.');
  }

  const seen = new Set();
  trumpOrder.forEach((cardId, index) => {
    if (typeof cardId !== 'string' || cardId.length === 0) {
      throw new TypeError(`Die Trumpfreihenfolge enthält an Position ${index} keine gültige Karten-ID.`);
    }
    if (seen.has(cardId)) {
      throw new Error(`Die Trumpfreihenfolge enthält die Karte ${cardId} doppelt.`);
    }
    seen.add(cardId);
  });
}

/**
 * Creates a fresh, complete German 32-card Skat deck.
 *
 * @returns {Array<{
 *   id: string,
 *   rank: string,
 *   rankLabel: string,
 *   suit: string,
 *   suitLabel: string,
 * }>}
 */
export function createDeck() {
  return DECK_SUITS.flatMap((suit) => DECK_RANKS.map((rank) => ({
    id: `${suit}-${rank}`,
    rank,
    rankLabel: DECK_RANK_LABELS[rank],
    suit,
    suitLabel: DECK_SUIT_LABELS[suit],
  })));
}

/**
 * Draws ten unique cards from a fresh deck using an injectable random source.
 * The random source follows the Math.random contract and returns a value in
 * the interval [0, 1) for each call.
 *
 * @param {() => number} random
 * @returns {ReturnType<typeof createDeck>}
 */
export function drawHand(random = Math.random) {
  if (typeof random !== 'function') {
    throw new TypeError('drawHand erwartet eine Zufallsfunktion.');
  }

  const deck = createDeck();

  // Fisher-Yates keeps the draw unbiased while mutating only this fresh copy.
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const randomValue = random();
    if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
      throw new RangeError('Die Zufallsfunktion muss Werte von 0 (inklusive) bis 1 (exklusive) liefern.');
    }

    const swapIndex = Math.floor(randomValue * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  return deck.slice(0, HAND_SIZE);
}

/**
 * Counts the contiguous trump prefix and reports whether it is "mit" or
 * "ohne". Cards can be supplied as the objects returned by createDeck();
 * accepting IDs as well keeps this pure helper convenient for callers that
 * already normalized their hand.
 *
 * @param {Array<{id: string}|string>} hand
 * @param {string[]} trumpOrder highest trump first
 * @returns {{mitOhne: 'mit'|'ohne', spitzen: number}}
 */
export function getSpitzen(hand, trumpOrder) {
  if (!Array.isArray(hand)) {
    throw new TypeError('getSpitzen erwartet eine Kartenhand als Array.');
  }
  validateTrumpOrder(trumpOrder);

  const handIds = new Set(hand.map(getHandCardId));
  const firstTrumpIsPresent = handIds.has(trumpOrder[0]);
  let spitzen = 0;

  if (firstTrumpIsPresent) {
    while (spitzen < trumpOrder.length && handIds.has(trumpOrder[spitzen])) {
      spitzen += 1;
    }
    return { mitOhne: 'mit', spitzen };
  }

  while (spitzen < trumpOrder.length && !handIds.has(trumpOrder[spitzen])) {
    spitzen += 1;
  }
  return { mitOhne: 'ohne', spitzen };
}

function getTrumpOrderForGame(gameType) {
  if (gameType === 'grand') return GRAND_TRUMP_ORDER;
  if (['club', 'spade', 'heart', 'diamond'].includes(gameType)) {
    return COLOR_TRUMP_ORDER[gameType];
  }
  throw new Error(`Die Spielart ${String(gameType)} unterstützt keine Spitzenberechnung.`);
}

/**
 * Returns the highest selectable Spitzen number for a game type.
 * Null has no Spitzen.
 *
 * @param {'club'|'spade'|'heart'|'diamond'|'grand'|'null'} gameType
 * @returns {number}
 */
export function getMaxSpitzen(gameType) {
  if (!TRAINER_GAME_TYPES.includes(gameType)) {
    throw new Error(`Für die Spielart ${String(gameType)} ist keine Spitzenzahl definiert.`);
  }

  return MAX_SPITZEN_BY_GAME_TYPE[gameType];
}

/**
 * Calculates the Mit/Ohne result for one selected game type.
 * Null returns null because Null has no trumps and therefore no Spitzen.
 *
 * @param {Array<{id: string}|string>} hand
 * @param {'club'|'spade'|'heart'|'diamond'|'grand'|'null'} gameType
 * @returns {{mitOhne: 'mit'|'ohne', spitzen: number}|null}
 */
export function getSpitzenForGame(hand, gameType) {
  if (!TRAINER_GAME_TYPES.includes(gameType)) {
    throw new Error(`Die Spielart ${String(gameType)} wird im Trainer nicht unterstützt.`);
  }
  if (gameType === 'null') return null;

  return getSpitzen(hand, getTrumpOrderForGame(gameType));
}

/**
 * Calculates the basic game value for one trainer selection.
 * Null uses its fixed basic value; suit and Grand games use only
 * Grundwert × (Spitzen + 1), without Hand or outcome modifiers.
 *
 * @param {'club'|'spade'|'heart'|'diamond'|'grand'|'null'} gameType
 * @param {number|null} spitzen
 * @returns {number}
 */
export function calculateTrainerGameValue(gameType, spitzen) {
  if (!TRAINER_GAME_TYPES.includes(gameType)) {
    throw new Error(`Die Spielart ${String(gameType)} wird im Trainer nicht unterstützt.`);
  }
  if (gameType === 'null') {
    if (spitzen !== null && spitzen !== undefined) {
      throw new RangeError('Beim Nullspiel gibt es keine Spitzen.');
    }
    return NULL_VALUES.null;
  }

  const maxSpitzen = getMaxSpitzen(gameType);
  if (!Number.isInteger(spitzen) || spitzen < 1 || spitzen > maxSpitzen) {
    throw new RangeError(`Die Spitzenzahl muss für ${gameType} zwischen 1 und ${maxSpitzen} liegen.`);
  }

  return BASE_VALUES[gameType] * calculateMultiplier(spitzen, {});
}

/**
 * Creates a hand-only puzzle for the selection-based trainer.
 * Expected announcement and game value are calculated only for the selected
 * game type during evaluation.
 *
 * @param {{random?: () => number}} options
 * @returns {{hand: Array<object>}}
 */
export function createTrainerPuzzle({ random = Math.random } = {}) {
  for (let attempt = 0; attempt < MAX_TRAINER_PUZZLE_ATTEMPTS; attempt += 1) {
    const hand = drawHand(random);
    if (hasTrainerSpitzenScope(hand)) {
      return { hand };
    }
  }

  throw new Error(
    `Nach ${MAX_TRAINER_PUZZLE_ATTEMPTS} Versuchen konnte keine Trainerhand im Spitzenbereich von 1 bis 4 erzeugt werden.`,
  );
}

/**
 * Evaluates the submitted game value and the Mit/Ohne/Spitzen selection.
 * The game value is checked against the learner's selected combination;
 * the card hand is checked independently for the correct announcement.
 *
 * @param {{gameType: string, mitOhne: string, spitzen: number|null, reizwert: number}} selection
 * @param {{hand: Array<object>}} puzzle
 * @returns {{
 *   status: 'correct'|'incorrect',
 *   gameType: string,
 *   submitted: object,
 *   expected: object|null,
 *   expectedGameValue: number,
 *   calculatedGameValue: number,
 *   gameValueCorrect: boolean,
 *   spitzenCorrect: boolean|null,
 * }}
 */
export function evaluateSelection(selection, puzzle) {
  if (!selection || typeof selection !== 'object' || Array.isArray(selection)) {
    throw new TypeError('evaluateSelection erwartet eine Auswahl aus Spielart, Ansage und Reizwert.');
  }

  validateTrainerPuzzle(puzzle);

  const { gameType, mitOhne, spitzen, reizwert } = selection;
  if (!TRAINER_GAME_TYPES.includes(gameType)) {
    throw new Error(`Die Spielart ${String(gameType)} wird im Trainer nicht unterstützt.`);
  }
  if (!Number.isInteger(reizwert)) {
    throw new TypeError('Der Reizwert muss eine ganze Zahl sein.');
  }

  const submitted = { gameType, mitOhne, spitzen, reizwert };
  if (gameType === 'null') {
    const expectedGameValue = calculateTrainerGameValue(gameType, null);
    const gameValueCorrect = reizwert === expectedGameValue;
    if (spitzen !== null && spitzen !== undefined) {
      throw new RangeError('Beim Nullspiel gibt es keine Spitzen.');
    }

    return {
      status: gameValueCorrect ? 'correct' : 'incorrect',
      gameType,
      submitted,
      expected: null,
      expectedGameValue,
      calculatedGameValue: expectedGameValue,
      gameValueCorrect,
      spitzenCorrect: null,
    };
  }

  const maxSpitzen = getMaxSpitzen(gameType);
  if (mitOhne !== 'mit' && mitOhne !== 'ohne') {
    throw new Error('Die Ansage muss "mit" oder "ohne" sein.');
  }
  if (!Number.isInteger(spitzen) || spitzen < 1 || spitzen > maxSpitzen) {
    throw new RangeError(`Die Spitzenzahl muss für ${gameType} zwischen 1 und ${maxSpitzen} liegen.`);
  }

  const expected = getSpitzenForGame(puzzle.hand, gameType);
  const calculatedGameValue = calculateTrainerGameValue(gameType, spitzen);
  const expectedGameValue = calculateTrainerGameValue(gameType, expected.spitzen);
  const gameValueCorrect = reizwert === calculatedGameValue;
  const spitzenCorrect = expected.mitOhne === mitOhne && expected.spitzen === spitzen;

  return {
    status: gameValueCorrect && spitzenCorrect ? 'correct' : 'incorrect',
    gameType,
    submitted,
    expected,
    expectedGameValue,
    calculatedGameValue,
    gameValueCorrect,
    spitzenCorrect,
  };
}
