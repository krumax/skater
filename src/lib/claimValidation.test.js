import { describe, it, expect } from 'vitest';
import { resolveTokenTarget } from './claimValidation.js';

describe('resolveTokenTarget', () => {
  const seating = ['Konrad', 'Max', 'Oma'];
  const ERROR_MSG = 'Ungültiger Einladungslink.';

  it('returns display_name directly when set (new-style token)', () => {
    const tokenRow = { display_name: 'Konrad', slot_index: null };
    const result = resolveTokenTarget(tokenRow, seating);
    expect(result).toEqual({ displayName: 'Konrad' });
  });

  it('prefers display_name over slot_index when both are set', () => {
    const tokenRow = { display_name: 'Max', slot_index: 0 };
    const result = resolveTokenTarget(tokenRow, seating);
    expect(result).toEqual({ displayName: 'Max' });
  });

  it('falls back to seating[slot_index] for legacy tokens', () => {
    const tokenRow = { display_name: null, slot_index: 1 };
    const result = resolveTokenTarget(tokenRow, seating);
    expect(result).toEqual({ displayName: 'Max' });
  });

  it('resolves slot_index 0 correctly for legacy tokens', () => {
    const tokenRow = { display_name: null, slot_index: 0 };
    const result = resolveTokenTarget(tokenRow, seating);
    expect(result).toEqual({ displayName: 'Konrad' });
  });

  it('resolves last slot_index correctly for legacy tokens', () => {
    const tokenRow = { display_name: null, slot_index: 2 };
    const result = resolveTokenTarget(tokenRow, seating);
    expect(result).toEqual({ displayName: 'Oma' });
  });

  it('returns error when slot_index is out of bounds', () => {
    const tokenRow = { display_name: null, slot_index: 5 };
    const result = resolveTokenTarget(tokenRow, seating);
    expect(result).toEqual({ error: ERROR_MSG });
  });

  it('returns error when both display_name and slot_index are null', () => {
    const tokenRow = { display_name: null, slot_index: null };
    const result = resolveTokenTarget(tokenRow, seating);
    expect(result).toEqual({ error: ERROR_MSG });
  });

  it('returns error when display_name is empty and slot_index is null', () => {
    const tokenRow = { display_name: '', slot_index: null };
    const result = resolveTokenTarget(tokenRow, seating);
    expect(result).toEqual({ error: ERROR_MSG });
  });

  it('returns error when slot_index points to undefined in seating', () => {
    const tokenRow = { display_name: null, slot_index: 3 };
    const result = resolveTokenTarget(tokenRow, seating);
    expect(result).toEqual({ error: ERROR_MSG });
  });

  it('handles empty seating array with slot_index', () => {
    const tokenRow = { display_name: null, slot_index: 0 };
    const result = resolveTokenTarget(tokenRow, []);
    expect(result).toEqual({ error: ERROR_MSG });
  });

  it('returns error for negative slot_index', () => {
    const tokenRow = { display_name: null, slot_index: -1 };
    const result = resolveTokenTarget(tokenRow, seating);
    expect(result).toEqual({ error: ERROR_MSG });
  });
});
