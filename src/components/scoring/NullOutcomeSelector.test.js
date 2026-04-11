import { describe, it, expect } from 'vitest';

// Spiegelt die Gewonnen/Verloren-Logik für Null-Spiele
function getNullOutcome(eyeCount) {
  return eyeCount === 0 ? 'gewonnen' : 'verloren';
}

function isNullSelectorActive(gameType) {
  return gameType === 'null';
}

describe('NullOutcomeSelector – Outcome-Logik', () => {
  it('eyeCount 0 → gewonnen', () => {
    expect(getNullOutcome(0)).toBe('gewonnen');
  });

  it('eyeCount 1 → verloren', () => {
    expect(getNullOutcome(1)).toBe('verloren');
  });

  it('jeder Wert > 0 → verloren', () => {
    [1, 10, 30, 60].forEach(v => {
      expect(getNullOutcome(v)).toBe('verloren');
    });
  });
});

describe('NullOutcomeSelector – Aktivierungszustand', () => {
  it('nur bei gameType null aktiv', () => {
    expect(isNullSelectorActive('null')).toBe(true);
  });

  it('bei allen anderen Spielarten inaktiv', () => {
    ['club', 'spade', 'heart', 'diamond', 'grand', 'passed'].forEach(t => {
      expect(isNullSelectorActive(t)).toBe(false);
    });
  });
});
