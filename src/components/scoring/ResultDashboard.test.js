import { describe, it, expect } from 'vitest';
import { formatScore } from './ResultDashboard';

describe('formatScore', () => {
  it('zeigt positiven Wert mit + Prefix', () => {
    expect(formatScore(18, false)).toBe('+18');
  });

  it('zeigt negativen Wert ohne + Prefix', () => {
    expect(formatScore(-36, false)).toBe('-36');
  });

  it('verdoppelt den Wert bei Bockrunde', () => {
    expect(formatScore(18, true)).toBe('+36');
  });

  it('verdoppelt negativen Wert bei Bockrunde', () => {
    expect(formatScore(-36, true)).toBe('-72');
  });

  it('zeigt 0 ohne + Prefix', () => {
    expect(formatScore(0, false)).toBe('0');
  });

  it('zeigt 0 bei Bock ohne + Prefix', () => {
    expect(formatScore(0, true)).toBe('0');
  });
});
