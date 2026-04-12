/**
 * useRoundCounter — lokaler Orientierungszähler für die Sitzordnung.
 *
 * Rein localStorage-basiert, keinerlei Verbindung zur DB oder Spiellogik.
 * Wird NUR durch expliziten increment(seatingSize)-Aufruf weitergeschaltet.
 */

import { useState } from 'react';

const STORAGE_KEY = 'skatRoundCounter';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { step: 0, deals: 0 };
}

function save(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

export function useRoundCounter() {
  const [state, setState] = useState(load);

  function increment(seatingSize) {
    const n = seatingSize || 3;
    setState(s => {
      const next = { step: (s.step + 1) % n, deals: s.deals + 1 };
      save(next);
      return next;
    });
  }

  function reset() {
    const fresh = { step: 0, deals: 0 };
    save(fresh);
    setState(fresh);
  }

  function completedRounds(seatingSize) {
    return Math.floor(state.deals / (seatingSize || 3));
  }

  return { step: state.step, totalDeals: state.deals, completedRounds, increment, reset };
}
