import { describe, it, expect } from 'vitest';

/**
 * Spiegelt die Disabled-Logik aus ModifierChips.jsx.
 * Jede Modifier-Regel als pure Funktion testbar.
 */
function getDisabledState({ gameType, hand }) {
  const isPassed = gameType === 'passed';
  const isNull   = gameType === 'null';
  return {
    hand:               isPassed,
    schneider:          isPassed || isNull,
    schneiderAnnounced: isPassed || isNull || !hand,
    schwarz:            isPassed || isNull,
    schwarzAnnounced:   isPassed || isNull || !hand,
    ouvert:             isPassed,
    isBock:             isPassed,
  };
}

describe('ModifierChips – Disabled-Logik', () => {
  it('alles aktiv bei normalem Farbspiel mit Hand', () => {
    const d = getDisabledState({ gameType: 'spade', hand: true });
    expect(d.hand).toBe(false);
    expect(d.schneider).toBe(false);
    expect(d.schneiderAnnounced).toBe(false);
    expect(d.schwarz).toBe(false);
    expect(d.schwarzAnnounced).toBe(false);
    expect(d.ouvert).toBe(false);
    expect(d.isBock).toBe(false);
  });

  it('schneiderAnnounced und schwarzAnnounced disabled ohne Hand', () => {
    const d = getDisabledState({ gameType: 'heart', hand: false });
    expect(d.schneiderAnnounced).toBe(true);
    expect(d.schwarzAnnounced).toBe(true);
    expect(d.schneider).toBe(false);
    expect(d.schwarz).toBe(false);
  });

  it('bei Null: schneider/schwarz/schneiderAnnounced/schwarzAnnounced disabled', () => {
    const d = getDisabledState({ gameType: 'null', hand: true });
    expect(d.schneider).toBe(true);
    expect(d.schwarz).toBe(true);
    expect(d.schneiderAnnounced).toBe(true);
    expect(d.schwarzAnnounced).toBe(true);
    expect(d.hand).toBe(false);
    expect(d.ouvert).toBe(false);
  });

  it('bei Passen: alles disabled', () => {
    const d = getDisabledState({ gameType: 'passed', hand: false });
    expect(Object.values(d).every(v => v === true)).toBe(true);
  });

  it('bei Grand ohne Hand: Ansagen disabled', () => {
    const d = getDisabledState({ gameType: 'grand', hand: false });
    expect(d.schneiderAnnounced).toBe(true);
    expect(d.schwarzAnnounced).toBe(true);
    expect(d.schneider).toBe(false);
  });
});
