/**
 * spiellistenUtils.js
 * Pure helper functions for the Spiellisten feature.
 * No React imports, no side effects - fully unit-testable.
 */

// ─── Validation ───

/**
 * Validates a Spielliste name.
 * Empty name is valid (a default name will be assigned).
 * Names longer than 40 characters are rejected.
 *
 * @param {string} name
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSpiellisteName(name) {
  if (name && name.length > 40) {
    return { valid: false, error: 'Der Name darf maximal 40 Zeichen lang sein.' };
  }
  return { valid: true };
}

/**
 * Validates a round count for a Spielliste.
 * Must be a multiple of 3 and within [3, 36].
 *
 * @param {number} n
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateRoundCount(n) {
  if (n < 3 || n > 36) {
    return { valid: false, error: 'Die Rundenzahl muss zwischen 3 und 36 liegen.' };
  }
  if (n % 3 !== 0) {
    return { valid: false, error: 'Die Rundenzahl muss ein Vielfaches von 3 sein.' };
  }
  return { valid: true };
}

/**
 * Generates a default name for a new Spielliste.
 *
 * @param {number} existingCount – number of lists already in the session
 * @returns {string} e.g. "Liste 1", "Liste 2", …
 */
export function generateDefaultName(existingCount) {
  return 'Liste ' + (existingCount + 1);
}

// ─── Winner Calculation ───

/**
 * Computes the winner(s) of a Spielliste.
 *
 * Primary criterion:  highest Seeger-Fabian total (from round.seegerScores)
 * Secondary criterion: highest raw points total (from round.gameValue)
 * If fully tied on both: all tied players are returned.
 *
 * @param {string[]} players   – player names
 * @param {object[]} listRounds – rounds belonging to this list
 * @returns {string[]} array of winner name(s)
 */
export function computeListWinner(players, listRounds) {
  if (!players || players.length === 0) return [];
  if (!listRounds || listRounds.length === 0) return players.slice();

  // Sum Seeger-Fabian points and raw points per player
  const seegerTotals = {};
  const rawTotals = {};
  players.forEach(p => {
    seegerTotals[p] = 0;
    rawTotals[p] = 0;
  });

  listRounds.forEach(round => {
    // Seeger-Fabian scores: { "PlayerA": 50, "PlayerB": -50, ... }
    if (round.seegerScores) {
      players.forEach(p => {
        if (round.seegerScores[p] !== undefined) {
          seegerTotals[p] += round.seegerScores[p];
        }
      });
    }
    // Raw points: gameValue is the numeric game value for the declarer;
    // for list stats we accumulate gameValue per player (declarer gets signed value,
    // opponents get 0 from gameValue - seegerScores handles their bonus separately).
    // For tiebreaker we use the same raw accumulation as computeListStats.
    if (round.gameValue !== undefined && round.player) {
      if (rawTotals[round.player] !== undefined) {
        rawTotals[round.player] += round.gameValue;
      }
    }
  });

  // Find the maximum Seeger-Fabian total
  const maxSeeger = Math.max(...players.map(p => seegerTotals[p]));

  // Players tied at the top by Seeger-Fabian
  const seegerLeaders = players.filter(p => seegerTotals[p] === maxSeeger);

  if (seegerLeaders.length === 1) {
    return seegerLeaders;
  }

  // Tiebreaker: highest raw points among the leaders
  const maxRaw = Math.max(...seegerLeaders.map(p => rawTotals[p]));
  const winners = seegerLeaders.filter(p => rawTotals[p] === maxRaw);

  return winners;
}

// ─── Statistics ───

/**
 * Computes statistics for a Spielliste.
 *
 * @param {string[]} players   – player names
 * @param {object[]} listRounds – rounds belonging to this list
 * @returns {{
 *   seegerTotals: Record<string, number>,
 *   rawTotals:    Record<string, number>,
 *   sortedPlayers: Array<{ name: string, seeger: number, raw: number }>,
 *   playedRounds:  number,
 * }}
 */
export function computeListStats(players, listRounds) {
  const seegerTotals = {};
  const rawTotals = {};

  players.forEach(p => {
    seegerTotals[p] = 0;
    rawTotals[p] = 0;
  });

  const rounds = listRounds || [];

  rounds.forEach(round => {
    if (round.seegerScores) {
      players.forEach(p => {
        if (round.seegerScores[p] !== undefined) {
          seegerTotals[p] += round.seegerScores[p];
        }
      });
    }
    if (round.gameValue !== undefined && round.player) {
      if (rawTotals[round.player] !== undefined) {
        rawTotals[round.player] += round.gameValue;
      }
    }
  });

  // Sort players: primary by Seeger-Fabian descending, secondary by raw points descending
  const sortedPlayers = players
    .map(p => ({ name: p, seeger: seegerTotals[p], raw: rawTotals[p] }))
    .sort((a, b) => {
      if (b.seeger !== a.seeger) return b.seeger - a.seeger;
      return b.raw - a.raw;
    });

  return {
    seegerTotals,
    rawTotals,
    sortedPlayers,
    playedRounds: rounds.length,
  };
}

// ─── Progress ───

/**
 * Computes the current progress of an active Spielliste.
 *
 * @param {object|null} spielliste – the Spielliste object (must have roundCount and status)
 * @param {object[]}    listRounds – rounds belonging to this list
 * @returns {{ current: number, total: number } | null}
 */
export function computeListProgress(spielliste, listRounds) {
  if (!spielliste) return null;
  if (spielliste.status === 'abgeschlossen') return null;

  return {
    current: (listRounds || []).length,
    total: spielliste.roundCount,
  };
}
