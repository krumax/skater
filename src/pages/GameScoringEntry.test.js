// Tests: Placeholder-Spieler ("-") sollen nicht in der Spielerauswahl erscheinen
import { describe, it, expect } from 'vitest';

// Spiegelt die Filter-Logik aus GameScoringEntry.jsx
function getVisiblePlayers(activePlayers) {
  return activePlayers.filter(name => name !== '-');
}

describe('GameScoringEntry – Spielerauswahl', () => {
  it('blendet Platzhalter-Spieler "-" aus', () => {
    const result = getVisiblePlayers(['-', '-', '-']);
    expect(result).toHaveLength(0);
  });

  it('zeigt echte Spieler an', () => {
    const result = getVisiblePlayers(['Konrad', 'Max', 'Oma']);
    expect(result).toEqual(['Konrad', 'Max', 'Oma']);
  });

  it('filtert nur "-" heraus, behält echte Spieler', () => {
    const result = getVisiblePlayers(['-', 'Max', '-']);
    expect(result).toEqual(['Max']);
  });

  it('gibt leeres Array zurück wenn alle Platzhalter sind', () => {
    expect(getVisiblePlayers(['-', '-'])).toHaveLength(0);
  });
});
