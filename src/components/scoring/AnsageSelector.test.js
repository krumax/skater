import { describe, it, expect } from 'vitest';

/**
 * maxSpitzen-Logik aus useGameForm — hier als pure Funktion testbar.
 */
function getMaxSpitzen(gameType) {
  if (['club', 'spade', 'heart', 'diamond'].includes(gameType)) return 11;
  if (gameType === 'grand') return 4;
  return 0;
}

describe('AnsageSelector – maxSpitzen', () => {
  it('Farbspiele erlauben bis zu 11 Spitzen', () => {
    ['club', 'spade', 'heart', 'diamond'].forEach(t => {
      expect(getMaxSpitzen(t)).toBe(11);
    });
  });

  it('Grand erlaubt bis zu 4 Spitzen', () => {
    expect(getMaxSpitzen('grand')).toBe(4);
  });

  it('Null hat 0 Spitzen (Ansage deaktiviert)', () => {
    expect(getMaxSpitzen('null')).toBe(0);
  });

  it('Passen hat 0 Spitzen (Ansage deaktiviert)', () => {
    expect(getMaxSpitzen('passed')).toBe(0);
  });

  it('Spitzen-Buttons 1–4 sind disabled wenn num > maxSpitzen', () => {
    const max = getMaxSpitzen('grand'); // 4
    const disabled = [1, 2, 3, 4].map(n => n > max);
    expect(disabled).toEqual([false, false, false, false]);
  });

  it('alle Spitzen-Buttons disabled bei Null', () => {
    const max = getMaxSpitzen('null'); // 0
    const disabled = [1, 2, 3, 4].map(n => n > max);
    expect(disabled).toEqual([true, true, true, true]);
  });
});
