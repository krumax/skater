// Feature: claim-table-refactor, Property 6: Display_name validation rejects invalid names
// Feature: claim-table-refactor, Property 14: Backward compatibility — old-style tokens resolve via seating index
// Validates: Requirements 2.7, 7.5, 9.2, 9.3

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateDisplayName, resolveTokenTarget } from './claimValidation.js';

// ── Arbitraries ───────────────────────────────────────────────────────────────

// Non-empty, non-whitespace-only strings within a given max length.
// Strategy: generate a letter prefix + optional suffix, ensuring at least one visible char.
const arbitraryValidName = (maxLength) =>
  fc.tuple(
    fc.constantFrom('A', 'B', 'C', 'x', 'y', 'z', '1', '2', 'ä', 'ö'), // guaranteed visible char
    fc.string({ minLength: 0, maxLength: Math.max(0, maxLength - 1) })
  ).map(([prefix, rest]) => (prefix + rest).slice(0, maxLength));

// Empty string
const arbitraryEmptyString = fc.constant('');

// Whitespace-only strings (at least one whitespace character)
const arbitraryWhitespaceOnly = fc
  .array(fc.constantFrom(' ', '\t', '\n', '\r', '\u00A0'), { minLength: 1, maxLength: 30 })
  .map(chars => chars.join(''));

// Strings that exceed a given max length (non-empty, may contain non-whitespace)
const arbitraryTooLongString = (maxLength) =>
  fc.string({ minLength: maxLength + 1, maxLength: maxLength + 50 })
    .filter(s => s.length > maxLength);

// Display names for seating arrays (short, non-empty, trimmed)
const arbitraryDisplayName = fc
  .string({ minLength: 1, maxLength: 20 })
  .map(s => s.trim())
  .filter(s => s.length > 0);

// Seating array of 3–4 unique display names
const arbitrarySeating = fc
  .array(arbitraryDisplayName, { minLength: 3, maxLength: 4 })
  .filter(arr => new Set(arr).size === arr.length);

// Valid slot index within a seating array
const arbitrarySlotIndex = (seating) =>
  fc.integer({ min: 0, max: seating.length - 1 });

// ── Property 6: Display_name validation rejects invalid names ─────────────────
// Validates: Requirements 2.7, 7.5

describe('Feature: claim-table-refactor, Property 6: Display_name validation rejects invalid names', () => {
  it(
    'Validates: Requirements 2.7, 7.5 — ' +
    'empty strings are rejected',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(
          fc.constantFrom(30, 50), // maxLength options
          (maxLength) => {
            const result = validateDisplayName('', { maxLength });
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Validates: Requirements 2.7, 7.5 — ' +
    'whitespace-only strings are rejected',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(
          arbitraryWhitespaceOnly,
          fc.constantFrom(30, 50),
          (name, maxLength) => {
            const result = validateDisplayName(name, { maxLength });
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Validates: Requirements 2.7, 7.5 — ' +
    'strings exceeding maxLength (30 for rename) are rejected',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(
          arbitraryTooLongString(30),
          (name) => {
            const result = validateDisplayName(name, { maxLength: 30 });
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Validates: Requirements 2.7, 7.5 — ' +
    'strings exceeding maxLength (50 for storage) are rejected',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(
          arbitraryTooLongString(50),
          (name) => {
            const result = validateDisplayName(name, { maxLength: 50 });
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Validates: Requirements 2.7, 7.5 — ' +
    'non-empty, non-whitespace strings within maxLength=30 are accepted',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(
          arbitraryValidName(30),
          (name) => {
            const result = validateDisplayName(name, { maxLength: 30 });
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Validates: Requirements 2.7, 7.5 — ' +
    'non-empty, non-whitespace strings within maxLength=50 are accepted',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(
          arbitraryValidName(50),
          (name) => {
            const result = validateDisplayName(name, { maxLength: 50 });
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ── Property 14: Backward compatibility — old-style tokens resolve via seating index ──
// Validates: Requirements 9.2, 9.3

describe('Feature: claim-table-refactor, Property 14: Backward compatibility — old-style tokens resolve via seating index', () => {
  it(
    'Validates: Requirements 9.2, 9.3 — ' +
    'legacy tokens with slot_index set and display_name null resolve to seating[slot_index]',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(
          arbitrarySeating,
          fc.integer({ min: 0, max: 3 }),
          (seating, rawSlotIndex) => {
            // Ensure slot_index is within bounds of the generated seating
            const slotIndex = rawSlotIndex % seating.length;

            const tokenRow = {
              display_name: null,
              slot_index: slotIndex,
            };

            const result = resolveTokenTarget(tokenRow, seating);

            // Must resolve successfully
            expect(result).toHaveProperty('displayName');
            expect(result).not.toHaveProperty('error');

            // Must return the display_name at the given seating index
            expect(result.displayName).toBe(seating[slotIndex]);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Validates: Requirements 9.2, 9.3 — ' +
    'new-style tokens with display_name set are returned directly (not via seating index)',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(
          arbitraryDisplayName,
          arbitrarySeating,
          (displayName, seating) => {
            const tokenRow = {
              display_name: displayName,
              slot_index: null,
            };

            const result = resolveTokenTarget(tokenRow, seating);

            // Must resolve successfully
            expect(result).toHaveProperty('displayName');
            expect(result).not.toHaveProperty('error');

            // Must return the display_name from the token directly
            expect(result.displayName).toBe(displayName);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Validates: Requirements 9.2, 9.3 — ' +
    'tokens with neither display_name nor valid slot_index return an error',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(
          arbitrarySeating,
          fc.oneof(
            // slot_index out of bounds (negative)
            fc.integer({ min: -100, max: -1 }),
            // slot_index out of bounds (too large)
            fc.integer({ min: 4, max: 100 })
          ),
          (seating, invalidSlotIndex) => {
            const tokenRow = {
              display_name: null,
              slot_index: invalidSlotIndex,
            };

            const result = resolveTokenTarget(tokenRow, seating);

            // Must return an error
            expect(result).toHaveProperty('error');
            expect(result).not.toHaveProperty('displayName');
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Validates: Requirements 9.2, 9.3 — ' +
    'tokens with both null display_name and null slot_index return an error',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(
          arbitrarySeating,
          (seating) => {
            const tokenRow = {
              display_name: null,
              slot_index: null,
            };

            const result = resolveTokenTarget(tokenRow, seating);

            // Must return an error
            expect(result).toHaveProperty('error');
            expect(result).not.toHaveProperty('displayName');
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
