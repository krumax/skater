import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import {
  BASE_VALUES,
  calculateMultiplier,
} from './skatScoring.js';
import {
  COLOR_TRUMP_ORDER,
  GRAND_TRUMP_ORDER,
  MAX_TRAINER_SPITZEN,
  TRAINER_GAME_TYPES,
  calculateTrainerGameValue,
  createDeck,
  createTrainerPuzzle,
  evaluateSelection,
  getSpitzen,
  getSpitzenForGame,
} from './reizwertTrainer.js';

const NUM_RUNS = 100;
const HAND_SIZE = 10;
const DRAW_RANDOM_CALLS = 31;
const NON_NULL_GAME_TYPES = ['club', 'spade', 'heart', 'diamond', 'grand'];
const COLOR_GAME_TYPES = ['club', 'spade', 'heart', 'diamond'];
const DECK_CARD_IDS = createDeck().map((card) => card.id);
const TRUMP_ORDERS = [
  ...Object.values(COLOR_TRUMP_ORDER),
  GRAND_TRUMP_ORDER,
];

const arbitraryRandomSequence = fc
  .array(fc.integer({ min: 0, max: 999_999 }), {
    minLength: DRAW_RANDOM_CALLS,
    maxLength: DRAW_RANDOM_CALLS,
  })
  .map((values) => values.map((value) => value / 1_000_000));

const arbitraryTrumpOrder = fc.constantFrom(...TRUMP_ORDERS);

function sequenceRandom(values) {
  let index = 0;
  return () => {
    const value = values[index];
    index += 1;
    return value ?? 0;
  };
}

function expectedSpitzen(hand, trumpOrder) {
  const handIds = new Set(hand);
  const firstTrumpIsPresent = handIds.has(trumpOrder[0]);
  let spitzen = 0;

  while (
    spitzen < trumpOrder.length
    && handIds.has(trumpOrder[spitzen]) === firstTrumpIsPresent
  ) {
    spitzen += 1;
  }

  return {
    mitOhne: firstTrumpIsPresent ? 'mit' : 'ohne',
    spitzen,
  };
}

describe('Property 1: Jede Aufgabe enthält zehn eindeutige Karten im Trainerbereich', () => {
  it('erzeugt für jede gültige Zufallsquelle genau zehn unterschiedliche Karten mit höchstens vier Farbspiel-Spitzen', () => {
    fc.assert(
      fc.property(arbitraryRandomSequence, (randomValues) => {
        const puzzle = createTrainerPuzzle({ random: sequenceRandom(randomValues) });
        const cardIds = puzzle.hand.map((card) => card.id);

        expect(puzzle.hand).toHaveLength(HAND_SIZE);
        expect(new Set(cardIds).size).toBe(HAND_SIZE);
        expect(cardIds.every((cardId) => DECK_CARD_IDS.includes(cardId))).toBe(true);
        COLOR_GAME_TYPES.forEach((gameType) => {
          expect(getSpitzenForGame(puzzle.hand, gameType).spitzen)
            .toBeLessThanOrEqual(MAX_TRAINER_SPITZEN);
        });
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

describe('Property 2: Spitzenberechnung folgt der Trumpfreihenfolge', () => {
  it('zählt die zusammenhängende vorhandene oder fehlende Präfixfolge', () => {
    const arbitraryCardHand = fc.uniqueArray(
      fc.constantFrom(...DECK_CARD_IDS),
      { minLength: 0, maxLength: DECK_CARD_IDS.length },
    );

    fc.assert(
      fc.property(
        arbitraryCardHand,
        arbitraryTrumpOrder,
        (hand, trumpOrder) => {
          expect(getSpitzen(hand, trumpOrder)).toEqual(
            expectedSpitzen(hand, trumpOrder),
          );
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

describe('Property 3: Auswahlwerte verwenden die zentrale Formel im Bereich 1–4', () => {
  it('verwendet Grundwert und Spitzenformel ohne Sonderstufen', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...NON_NULL_GAME_TYPES),
        fc.integer({ min: 1, max: MAX_TRAINER_SPITZEN }),
        (gameType, spitzen) => {
          expect(calculateTrainerGameValue(gameType, spitzen)).toBe(
            BASE_VALUES[gameType] * calculateMultiplier(spitzen, {}),
          );
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

describe('Property 4: Erwartete Ansage wird korrekt geprüft', () => {
  it('akzeptiert für jede Aufgabe eine korrekte Auswahl', () => {
    fc.assert(
      fc.property(
        arbitraryRandomSequence,
        fc.constantFrom(...TRAINER_GAME_TYPES),
        (randomValues, gameType) => {
          const puzzle = createTrainerPuzzle({ random: sequenceRandom(randomValues) });
          const expected = getSpitzenForGame(puzzle.hand, gameType);
          const selection = gameType === 'null'
            ? { gameType, mitOhne: 'mit', spitzen: null, reizwert: 23 }
            : {
              gameType,
              mitOhne: expected.mitOhne,
              spitzen: expected.spitzen,
              reizwert: calculateTrainerGameValue(gameType, expected.spitzen),
            };

          expect(evaluateSelection(selection, puzzle).status).toBe('correct');
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

describe('Property 5: Spielwert und Ansage werden getrennt bewertet', () => {
  it('unterscheidet einen falschen Wert von einer falschen Ansage', () => {
    fc.assert(
      fc.property(
        arbitraryRandomSequence,
        fc.constantFrom(...NON_NULL_GAME_TYPES),
        (randomValues, gameType) => {
          const puzzle = createTrainerPuzzle({ random: sequenceRandom(randomValues) });
          const expected = getSpitzenForGame(puzzle.hand, gameType);
          const correctValue = calculateTrainerGameValue(gameType, expected.spitzen);
          const wrongValue = correctValue + 1;
          const wrongMitOhne = expected.mitOhne === 'mit' ? 'ohne' : 'mit';

          const wrongValueResult = evaluateSelection({
            gameType,
            mitOhne: expected.mitOhne,
            spitzen: expected.spitzen,
            reizwert: wrongValue,
          }, puzzle);
          const wrongAnnouncementResult = evaluateSelection({
            gameType,
            mitOhne: wrongMitOhne,
            spitzen: expected.spitzen,
            reizwert: correctValue,
          }, puzzle);

          expect(wrongValueResult).toMatchObject({
            status: 'incorrect',
            gameValueCorrect: false,
            spitzenCorrect: true,
          });
          expect(wrongAnnouncementResult).toMatchObject({
            status: 'incorrect',
            gameValueCorrect: true,
            spitzenCorrect: false,
          });
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

describe('Property 6: Null hat keine Spitzen', () => {
  it('liefert für jede Kartenhand keine Spitzen und den festen Wert 23', () => {
    fc.assert(
      fc.property(arbitraryRandomSequence, (randomValues) => {
        const puzzle = createTrainerPuzzle({ random: sequenceRandom(randomValues) });

        expect(getSpitzenForGame(puzzle.hand, 'null')).toBeNull();
        expect(evaluateSelection({
          gameType: 'null',
          mitOhne: 'mit',
          spitzen: null,
          reizwert: 23,
        }, puzzle)).toMatchObject({
          status: 'correct',
          expected: null,
          expectedGameValue: 23,
          spitzenCorrect: null,
        });
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
