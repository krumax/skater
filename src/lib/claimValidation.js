/**
 * Pure validation functions for the claim system.
 * No React imports, no side effects — fully unit-testable.
 */

/**
 * Resolves the target display_name from a claim token row.
 * Handles both new-style (display_name set) and legacy (slot_index only) tokens.
 *
 * @param {object} tokenRow - { display_name, slot_index }
 * @param {string[]} seating - Session's seating array
 * @returns {{ displayName: string } | { error: string }}
 */
export function resolveTokenTarget(tokenRow, seating) {
  // New-style token: display_name is set directly
  if (tokenRow.display_name != null && tokenRow.display_name !== '') {
    return { displayName: tokenRow.display_name };
  }

  // Legacy token: resolve via slot_index
  if (tokenRow.slot_index != null && tokenRow.slot_index >= 0 && tokenRow.slot_index < seating.length) {
    return { displayName: seating[tokenRow.slot_index] };
  }

  return { error: 'Ungültiger Einladungslink.' };
}

/**
 * Validates a display_name for use in session_players or claim_tokens.
 * Rules: non-empty, not whitespace-only, max 30 chars for rename / max 50 chars for storage.
 *
 * @param {string} name - The name to validate
 * @param {object} options - { maxLength: number }
 * @returns {{ valid: true } | { valid: false, error: string }}
 */
export function validateDisplayName(name, options = { maxLength: 30 }) {
  const { maxLength } = options;

  if (typeof name !== 'string' || name === '') {
    return { valid: false, error: 'Ungültiger Spielername.' };
  }

  if (name.trim() === '') {
    return { valid: false, error: 'Ungültiger Spielername.' };
  }

  if (name.length > maxLength) {
    return { valid: false, error: 'Ungültiger Spielername.' };
  }

  return { valid: true };
}

/**
 * Checks if a display_name is available (not already in seating).
 *
 * @param {string} name - The proposed name
 * @param {string[]} seating - Current seating array
 * @param {string} excludeName - Name to exclude from conflict check (the old name during rename)
 * @returns {boolean} true if the name is NOT in seating (or is the excludeName), false otherwise
 */
export function isNameAvailable(name, seating, excludeName = '') {
  return !seating.some((seat) => seat === name && seat !== excludeName);
}
