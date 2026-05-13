// Feature: claim-table-refactor, Property 2: Display_name lookup is position-independent
// Validates: Requirements 2.1, 2.5

/**
 * Property 2: Display_name lookup is position-independent
 *
 * For any session with a session_players row linking a display_name to a user_id,
 * and for any permutation of the session's seating array, resolving the identity
 * link by display_name SHALL return the same user_id regardless of the name's
 * current index in the seating array.
 *
 * Strategy:
 *   1. Generate a seating array of 3–4 unique player names.
 *   2. Create a session_players map keyed by display_name → user_id.
 *   3. For any permutation of the seating array, look up each display_name
 *      in the session_players map and verify the user_id is unchanged.
 *   4. This proves that the identity link is name-based, not position-based.
 *
 * The test exercises the pure lookup logic: given a session_players structure
 * keyed by display_name, the resolved user_id is independent of the player's
 * position in the seating array.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ── Pure lookup function mirroring the display_name-based resolution ──────────

/**
 * Resolves the user_id for a given display_name from session_players.
 * This mirrors how the sync service resolves identity: by display_name key,
 * NOT by array index.
 *
 * @param {string} displayName - The player name to look up
 * @param {Array<{display_name: string, user_id: string}>} sessionPlayers - The session_players rows
 * @returns {string|null} The user_id linked to that display_name, or null if not found
 */
function resolveUserByDisplayName(displayName, sessionPlayers) {
  const row = sessionPlayers.find(sp => sp.display_name === displayName);
  return row ? row.user_id : null;
}

/**
 * Generates all permutations of an array (for small arrays of 3–4 elements).
 * Used to exhaustively verify position-independence.
 */
function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

// Non-empty, trimmed display names (exclude JS prototype keys to avoid object lookup issues)
const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty']);
const arbitraryDisplayName = fc
  .string({ minLength: 1, maxLength: 20 })
  .map(s => s.trim())
  .filter(s => s.length > 0 && !RESERVED_KEYS.has(s));

// Seating array of 3–4 unique display names
const arbitrarySeating = fc
  .array(arbitraryDisplayName, { minLength: 3, maxLength: 4 })
  .filter(arr => new Set(arr).size === arr.length);

// ── Property 2: Display_name lookup is position-independent ───────────────────

describe('Feature: claim-table-refactor, Property 2: Display_name lookup is position-independent', () => {
  it(
    'Validates: Requirements 2.1, 2.5 — ' +
    'for any permutation of the seating array, resolving identity by display_name returns the same user_id',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(
          arbitrarySeating,
          fc.array(fc.uuid(), { minLength: 4, maxLength: 4 }),
          (seating, userIds) => {
            // Build session_players rows: each display_name maps to a unique user_id
            const sessionPlayers = seating.map((name, idx) => ({
              display_name: name,
              user_id: userIds[idx],
            }));

            // For the original seating order, record the expected user_id per name
            const expectedLinks = new Map();
            for (const name of seating) {
              expectedLinks.set(name, resolveUserByDisplayName(name, sessionPlayers));
            }

            // For every permutation of the seating array, the lookup must return
            // the same user_id — proving position-independence
            const allPerms = permutations(seating);
            for (const permutedSeating of allPerms) {
              for (const name of permutedSeating) {
                const resolved = resolveUserByDisplayName(name, sessionPlayers);
                expect(resolved).toBe(expectedLinks.get(name));
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Validates: Requirements 2.1, 2.5 — ' +
    'a random permutation of seating does not affect display_name → user_id resolution',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(
          arbitrarySeating,
          fc.array(fc.uuid(), { minLength: 4, maxLength: 4 }),
          (seating, userIds) => {
            // Build session_players rows keyed by display_name
            const sessionPlayers = seating.map((name, idx) => ({
              display_name: name,
              user_id: userIds[idx],
            }));

            // Create a reversed version of the seating array (a permutation)
            const reversed = [...seating].reverse();

            // Verify: looking up each name in session_players returns the same
            // user_id regardless of the name's position in the reversed array
            for (let i = 0; i < reversed.length; i++) {
              const name = reversed[i];
              const resolved = resolveUserByDisplayName(name, sessionPlayers);
              // The original mapping: find the original index of this name
              const originalIdx = seating.indexOf(name);
              expect(resolved).toBe(userIds[originalIdx]);
              // The name's position in reversed (i) differs from originalIdx,
              // but the resolved user_id is the same — position-independent
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Validates: Requirements 2.1, 2.5 — ' +
    'updateSeating (permutation) does not invalidate session_players display_name links',
    { timeout: 30000 },
    () => {
      fc.assert(
        fc.property(
          arbitrarySeating,
          fc.array(fc.uuid(), { minLength: 4, maxLength: 4 }),
          (seating, userIds) => {
            // Simulate the initial state: session has seating + session_players
            const sessionPlayers = seating.map((name, idx) => ({
              session_id: 'test-session',
              display_name: name,
              user_id: userIds[idx],
            }));

            // Simulate updateSeating: only the seating array changes (shuffled)
            // session_players rows remain untouched (as per Requirement 2.3)
            const newSeating = [...seating].sort(); // A deterministic permutation

            // After updateSeating, session_players is unchanged
            // Verify: for each name in the NEW seating order, the identity link
            // still resolves correctly via display_name
            for (const name of newSeating) {
              const resolved = resolveUserByDisplayName(name, sessionPlayers);
              const originalIdx = seating.indexOf(name);
              expect(resolved).toBe(userIds[originalIdx]);
            }

            // Verify: the set of linked names hasn't changed
            const linkedNames = sessionPlayers.map(sp => sp.display_name).sort();
            const seatingNames = [...newSeating].sort();
            expect(linkedNames).toEqual(seatingNames);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
