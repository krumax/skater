// Feature: inline-style-refactoring, Property 4: tokens.js Symmetrie
import { describe, test, expect } from 'vitest';
import { SUIT_COLORS, SUIT_TEXT_COLORS } from './tokens';

const KNOWN_TYPES = ['club', 'spade', 'heart', 'diamond', 'grand', 'null', 'passed'];

describe('tokens.js Symmetrie-Invariante', () => {
  test('SUIT_COLORS und SUIT_TEXT_COLORS haben identische Schlüssel', () => {
    const colorKeys = Object.keys(SUIT_COLORS).sort();
    const textKeys  = Object.keys(SUIT_TEXT_COLORS).sort();
    expect(colorKeys).toEqual(textKeys);
  });

  test('Alle bekannten Spieltypen sind in SUIT_COLORS vorhanden', () => {
    KNOWN_TYPES.forEach(type => {
      expect(SUIT_COLORS).toHaveProperty(type);
    });
  });

  test('Alle bekannten Spieltypen sind in SUIT_TEXT_COLORS vorhanden', () => {
    KNOWN_TYPES.forEach(type => {
      expect(SUIT_TEXT_COLORS).toHaveProperty(type);
    });
  });
});
