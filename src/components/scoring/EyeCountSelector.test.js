import { describe, it, expect } from 'vitest';

// Spiegelt die Clamp-Logik aus EyeCountSelector
function clampEyeCount(raw) {
  return Math.min(120, Math.max(0, parseInt(raw) || 0));
}

// Spiegelt die aktiven Chip-Zustände
function getActiveChip(eyeCount) {
  if (eyeCount >= 120)             return 'schwarz';
  if (eyeCount >= 90)              return 'schneider';
  if (eyeCount >= 61)              return 'gewonnen';
  return 'verloren';
}

describe('EyeCountSelector – Clamp-Logik', () => {
  it('klemmt Werte unter 0 auf 0', () => {
    expect(clampEyeCount(-5)).toBe(0);
  });

  it('klemmt Werte über 120 auf 120', () => {
    expect(clampEyeCount(150)).toBe(120);
  });

  it('lässt gültige Werte unverändert', () => {
    expect(clampEyeCount(61)).toBe(61);
    expect(clampEyeCount(0)).toBe(0);
    expect(clampEyeCount(120)).toBe(120);
  });

  it('behandelt NaN als 0', () => {
    expect(clampEyeCount('abc')).toBe(0);
  });
});

describe('EyeCountSelector – Schnellauswahl-Chips', () => {
  it('61 → gewonnen-Chip aktiv', () => {
    expect(getActiveChip(61)).toBe('gewonnen');
  });

  it('89 → gewonnen-Chip aktiv (noch kein Schneider)', () => {
    expect(getActiveChip(89)).toBe('gewonnen');
  });

  it('90 → schneider-Chip aktiv', () => {
    expect(getActiveChip(90)).toBe('schneider');
  });

  it('120 → schwarz-Chip aktiv', () => {
    expect(getActiveChip(120)).toBe('schwarz');
  });

  it('30 → verloren-Chip aktiv', () => {
    expect(getActiveChip(30)).toBe('verloren');
  });

  it('0 → verloren-Chip aktiv', () => {
    expect(getActiveChip(0)).toBe('verloren');
  });
});
