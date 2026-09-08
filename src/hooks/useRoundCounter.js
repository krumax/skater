/**
 * useRoundCounter - derives the table counter shown above the scoring form.
 *
 * The values are part of the active session state. This hook intentionally has
 * no localStorage side effects: loading and persisting the counter belongs to
 * the GameContext/sync layer so every device uses the same table values.
 */

function toNonNegativeInteger(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : fallback;
}

export function useRoundCounter(roundCounter = {}, seatingSize = 3, onReset = () => {}) {
  const totalDeals = toNonNegativeInteger(roundCounter.deals, 0);
  const safeSeatingSize = seatingSize || 3;
  const step = toNonNegativeInteger(roundCounter.step, 0) % safeSeatingSize;
  const bockRoundsLeft = toNonNegativeInteger(roundCounter.bockRoundsLeft, 0);

  function completedRounds(size = safeSeatingSize) {
    return Math.floor(totalDeals / (size || 3));
  }

  return {
    step,
    totalDeals,
    completedRounds,
    bockRoundsLeft,
    reset: onReset,
  };
}
