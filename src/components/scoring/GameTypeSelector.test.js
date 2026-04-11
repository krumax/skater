import { describe, it, expect } from 'vitest';
import { SUIT_OPTIONS } from './GameTypeSelector';

describe('SUIT_OPTIONS', () => {
  it('enthält alle 7 Spielarten', () => {
    const keys = SUIT_OPTIONS.map(s => s.key);
    expect(keys).toEqual(['club', 'spade', 'heart', 'diamond', 'grand', 'null', 'passed']);
  });

  it('jede Option hat key, label und color', () => {
    SUIT_OPTIONS.forEach(opt => {
      expect(opt.key).toBeTruthy();
      expect(opt.label).toBeTruthy();
      expect(opt.color).toMatch(/^#/);
    });
  });

  it('Farbspiele haben ein icon-Symbol', () => {
    const suitGames = SUIT_OPTIONS.filter(s => ['club', 'spade', 'heart', 'diamond'].includes(s.key));
    suitGames.forEach(s => expect(s.icon).toBeTruthy());
  });

  it('Grand/Null/Passen haben kein icon, aber matIcon', () => {
    const special = SUIT_OPTIONS.filter(s => ['grand', 'null', 'passed'].includes(s.key));
    special.forEach(s => {
      expect(s.icon).toBeNull();
      expect(s.matIcon).toBeTruthy();
    });
  });
});
