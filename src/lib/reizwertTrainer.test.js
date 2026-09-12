import { describe, expect, it } from 'vitest';
import { BASE_VALUES, NULL_VALUES, calculateMultiplier } from './skatScoring.js';
import {
  COLOR_TRUMP_ORDER,
  DECK_RANKS,
  DECK_SUITS,
  GRAND_TRUMP_ORDER,
  MAX_TRAINER_SPITZEN,
  TRAINER_GAME_TYPES,
  calculateTrainerGameValue,
  createDeck,
  createTrainerPuzzle,
  drawHand,
  evaluateSelection,
  getMaxSpitzen,
  getSpitzen,
  getSpitzenForGame,
  isTrainerHandInScope,
} from './reizwertTrainer.js';

const JACKS = [
  'club-jack',
  'spade-jack',
  'heart-jack',
  'diamond-jack',
];

const COLOR_RANKS = ['ace', 'ten', 'king', 'queen', 'nine', 'eight', 'seven'];

const TEN_CARD_CLUB_HAND = [
  ...JACKS,
  'club-ace',
  'club-ten',
  'club-king',
  'club-queen',
  'club-nine',
  'club-eight',
];

const TRAINER_SCOPE_HAND = [
  'club-eight',
  'club-nine',
  'club-ten',
  'club-jack',
  'club-queen',
  'club-king',
  'club-ace',
  'spade-seven',
  'spade-eight',
  'spade-nine',
];

const DRAW_RANDOM_CALLS = 31;

function createOutOfScopeRandom() {
  let state = 3;
  let callCount = 0;

  return () => {
    if (callCount % DRAW_RANDOM_CALLS === 0) state = 3;
    state = (state * 1103515245 + 12345) % 2147483648;
    callCount += 1;
    return state / 2147483648;
  };
}

describe('createDeck and drawHand', () => {
  it('creates all 32 unique cards with the expected rank and suit combinations', () => {
    const deck = createDeck();
    const cardIds = deck.map((card) => card.id);
    const expectedCardIds = DECK_SUITS.flatMap((suit) => (
      DECK_RANKS.map((rank) => `${suit}-${rank}`)
    ));

    expect(deck).toHaveLength(32);
    expect(new Set(cardIds).size).toBe(32);
    expect(cardIds.sort()).toEqual(expectedCardIds.sort());
    expect(deck.every((card) => (
      card.rankLabel && card.suitLabel && card.id === `${card.suit}-${card.rank}`
    ))).toBe(true);
    expect(deck.find((card) => card.id === 'club-jack')).toMatchObject({
      rank: 'jack',
      rankLabel: 'Bube',
      suit: 'club',
      suitLabel: 'Kreuz',
    });
  });

  it('draws exactly ten unique cards using an injected random source', () => {
    const hand = drawHand(() => 0.5);

    expect(hand).toHaveLength(10);
    expect(new Set(hand.map((card) => card.id)).size).toBe(10);
    expect(hand.every((card) => card.id)).toBe(true);
  });
});

describe('trump orders', () => {
  it('defines the complete eleven-card order for every color game', () => {
    const expectedOrders = {
      club: [...JACKS, ...COLOR_RANKS.map((rank) => `club-${rank}`)],
      spade: [...JACKS, ...COLOR_RANKS.map((rank) => `spade-${rank}`)],
      heart: [...JACKS, ...COLOR_RANKS.map((rank) => `heart-${rank}`)],
      diamond: [...JACKS, ...COLOR_RANKS.map((rank) => `diamond-${rank}`)],
    };

    expect(COLOR_TRUMP_ORDER).toEqual(expectedOrders);
    Object.values(COLOR_TRUMP_ORDER).forEach((order) => {
      expect(order).toHaveLength(11);
      expect(new Set(order).size).toBe(11);
    });
  });

  it('defines Grand with only the four jacks as trumps', () => {
    expect(GRAND_TRUMP_ORDER).toEqual(JACKS);
    expect(new Set(GRAND_TRUMP_ORDER).size).toBe(4);
  });
});

describe('getSpitzen', () => {
  it('counts a contiguous present prefix as mit', () => {
    expect(getSpitzen(
      ['club-jack', 'spade-jack', 'heart-jack', 'diamond-jack'],
      COLOR_TRUMP_ORDER.club,
    )).toEqual({ mitOhne: 'mit', spitzen: 4 });
  });

  it('stops a mit count at the first missing trump', () => {
    expect(getSpitzen(
      ['club-jack', 'spade-jack', 'diamond-jack'],
      COLOR_TRUMP_ORDER.club,
    )).toEqual({ mitOhne: 'mit', spitzen: 2 });
  });

  it('counts a contiguous missing prefix as ohne', () => {
    expect(getSpitzen(['spade-jack'], COLOR_TRUMP_ORDER.club)).toEqual({
      mitOhne: 'ohne',
      spitzen: 1,
    });
    expect(getSpitzen(['heart-jack'], COLOR_TRUMP_ORDER.club)).toEqual({
      mitOhne: 'ohne',
      spitzen: 2,
    });
  });

  it('counts a completely missing trump sequence as ohne', () => {
    expect(getSpitzen([], COLOR_TRUMP_ORDER.club)).toEqual({
      mitOhne: 'ohne',
      spitzen: 11,
    });
    expect(getSpitzen([], GRAND_TRUMP_ORDER)).toEqual({
      mitOhne: 'ohne',
      spitzen: 4,
    });
  });
});

describe('selection trainer', () => {
  it('exposes only the supported selection game types', () => {
    expect(TRAINER_GAME_TYPES).toEqual([
      'club',
      'spade',
      'heart',
      'diamond',
      'grand',
      'null',
    ]);
  });

  it('creates a hand-only puzzle with ten unique cards inside the trainer scope', () => {
    const puzzle = createTrainerPuzzle({ random: () => 0 });

    expect(puzzle.hand).toHaveLength(10);
    expect(new Set(puzzle.hand.map((card) => card.id)).size).toBe(10);
    expect(isTrainerHandInScope(puzzle.hand)).toBe(true);
    expect(['club', 'spade', 'heart', 'diamond'].every((gameType) => (
      getSpitzenForGame(puzzle.hand, gameType).spitzen <= MAX_TRAINER_SPITZEN
    ))).toBe(true);
    expect(puzzle).not.toHaveProperty('maxValue');
    expect(puzzle).not.toHaveProperty('candidates');
    expect(puzzle).not.toHaveProperty('solutions');
  });

  it('stops after too many out-of-scope puzzle attempts', () => {
    expect(() => createTrainerPuzzle({ random: createOutOfScopeRandom() })).toThrow(
      /1000 Versuchen.*1 bis 4/,
    );
  });

  it('keeps official raw Spitzen values separate from the trainer scope', () => {
    expect(getSpitzenForGame(TEN_CARD_CLUB_HAND, 'club')).toEqual({
      mitOhne: 'mit',
      spitzen: 10,
    });
    expect(getSpitzenForGame(TEN_CARD_CLUB_HAND, 'grand')).toEqual({
      mitOhne: 'mit',
      spitzen: 4,
    });
    expect(getSpitzenForGame(TEN_CARD_CLUB_HAND, 'null')).toBeNull();
    expect(isTrainerHandInScope(TEN_CARD_CLUB_HAND)).toBe(false);
    expect(isTrainerHandInScope(TRAINER_SCOPE_HAND)).toBe(true);
  });

  it('uses central base values and the basic multiplier formula up to four Spitzen', () => {
    expect(calculateTrainerGameValue('club', 4)).toBe(
      BASE_VALUES.club * calculateMultiplier(4, {}),
    );
    expect(calculateTrainerGameValue('grand', 4)).toBe(
      BASE_VALUES.grand * calculateMultiplier(4, {}),
    );
    expect(calculateTrainerGameValue('null', null)).toBe(NULL_VALUES.null);
    expect(getMaxSpitzen('club')).toBe(MAX_TRAINER_SPITZEN);
    expect(getMaxSpitzen('grand')).toBe(MAX_TRAINER_SPITZEN);
    expect(getMaxSpitzen('null')).toBe(0);
    expect(() => calculateTrainerGameValue('club', MAX_TRAINER_SPITZEN + 1)).toThrow(/Spitzenzahl/);
  });

  it('evaluates the selected game value and announcement independently', () => {
    const puzzle = { hand: TRAINER_SCOPE_HAND };
    const expected = getSpitzenForGame(TRAINER_SCOPE_HAND, 'club');
    const correctValue = calculateTrainerGameValue('club', expected.spitzen);

    expect(evaluateSelection({
      gameType: 'club',
      mitOhne: expected.mitOhne,
      spitzen: expected.spitzen,
      reizwert: correctValue,
    }, puzzle)).toEqual({
      status: 'correct',
      gameType: 'club',
      submitted: {
        gameType: 'club',
        mitOhne: expected.mitOhne,
        spitzen: expected.spitzen,
        reizwert: correctValue,
      },
      expected,
      expectedGameValue: correctValue,
      calculatedGameValue: correctValue,
      gameValueCorrect: true,
      spitzenCorrect: true,
    });

    const wrongMitOhne = expected.mitOhne === 'mit' ? 'ohne' : 'mit';
    expect(evaluateSelection({
      gameType: 'club',
      mitOhne: wrongMitOhne,
      spitzen: expected.spitzen,
      reizwert: correctValue,
    }, puzzle)).toMatchObject({
      status: 'incorrect',
      gameType: 'club',
      gameValueCorrect: true,
      spitzenCorrect: false,
    });

    expect(evaluateSelection({
      gameType: 'club',
      mitOhne: expected.mitOhne,
      spitzen: expected.spitzen,
      reizwert: correctValue + 1,
    }, puzzle)).toMatchObject({
      status: 'incorrect',
      gameValueCorrect: false,
      spitzenCorrect: true,
    });
  });

  it('rejects a puzzle whose official Spitzen exceed the simplified scope', () => {
    expect(() => evaluateSelection({
      gameType: 'club',
      mitOhne: 'mit',
      spitzen: 4,
      reizwert: 60,
    }, { hand: TEN_CARD_CLUB_HAND })).toThrow(/außerhalb.*Trainerbereich.*über 4/i);
  });

  it('treats Null as a fixed-value game without Spitzen', () => {
    expect(evaluateSelection({
      gameType: 'null',
      mitOhne: 'mit',
      spitzen: null,
      reizwert: 23,
    }, { hand: TRAINER_SCOPE_HAND })).toMatchObject({
      status: 'correct',
      gameType: 'null',
      expected: null,
      expectedGameValue: 23,
      calculatedGameValue: 23,
      gameValueCorrect: true,
      spitzenCorrect: null,
    });
  });
});

describe('input validation', () => {
  it('rejects invalid random sources and random values', () => {
    expect(() => drawHand('not a function')).toThrow(/Zufallsfunktion/);
    expect(() => drawHand(() => 1)).toThrow(/Zufallsfunktion/);
  });

  it('rejects invalid hands and trump orders', () => {
    expect(() => getSpitzen(null, GRAND_TRUMP_ORDER)).toThrow(/Kartenhand/);
    expect(() => getSpitzen([], [])).toThrow(/Trumpfreihenfolge/);
    expect(() => getSpitzen(['club-jack', 'club-jack'], GRAND_TRUMP_ORDER)).not.toThrow();
    expect(() => evaluateSelection({
      gameType: 'club',
      mitOhne: 'mit',
      spitzen: 1,
      reizwert: 12,
    }, { hand: ['club-jack'] })).toThrow(/genau 10 Karten/);
    expect(() => evaluateSelection({
      gameType: 'club',
      mitOhne: 'mit',
      spitzen: 1,
      reizwert: 12,
    }, { hand: ['unknown-card'] })).toThrow(/genau 10 Karten|unbekannte Karte/);
  });

  it('rejects invalid selections', () => {
    const puzzle = { hand: TRAINER_SCOPE_HAND };

    expect(() => getSpitzenForGame(TEN_CARD_CLUB_HAND, 'unknown')).toThrow(/nicht unterstützt/);
    expect(() => calculateTrainerGameValue('club', 0)).toThrow(/Spitzenzahl/);
    expect(() => evaluateSelection({
      gameType: 'club',
      mitOhne: 'maybe',
      spitzen: 1,
      reizwert: 12,
    }, puzzle)).toThrow(/Mit|ohne/);
    expect(() => evaluateSelection({
      gameType: 'null',
      mitOhne: 'mit',
      spitzen: 1,
      reizwert: 23,
    }, puzzle)).toThrow(/keine Spitzen/);
    expect(() => evaluateSelection({
      gameType: 'club',
      mitOhne: 'mit',
      spitzen: 1,
      reizwert: '12',
    }, puzzle)).toThrow(/ganze Zahl/);
  });
});
