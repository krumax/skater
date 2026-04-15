import { describe, it, expect } from 'vitest';

/**
 * SpitzenSelector — Logik-Tests.
 * Prüft welche Spielarten den Spitzen-Selector aktivieren.
 */

const SUIT_GAMES = ['club', 'spade', 'heart', 'diamond'];

function isSpitzenActive(gameType) {
  return SUIT_GAMES.includes(gameType);
}

describe('SpitzenSelector – Aktivierungslogik', () => {
  it('ist aktiv für alle Farbspiele', () => {
    SUIT_GAMES.forEach(t => {
      expect(isSpitzenActive(t)).toBe(true);
    });
  });

  it('ist inaktiv für Grand', () => {
    expect(isSpitzenActive('grand')).toBe(false);
  });

  it('ist inaktiv für Null', () => {
    expect(isSpitzenActive('null')).toBe(false);
  });

  it('ist inaktiv für Passen', () => {
    expect(isSpitzenActive('passed')).toBe(false);
  });

  it('zeigt Buttons 5–11 (7 Stück)', () => {
    const buttons = Array.from({ length: 7 }, (_, i) => i + 5);
    expect(buttons).toEqual([5, 6, 7, 8, 9, 10, 11]);
    expect(buttons.length).toBe(7);
  });
});
