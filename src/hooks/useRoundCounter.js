/**
 * useRoundCounter — lokaler Orientierungszähler für die Sitzordnung.
 *
 * Rein localStorage-basiert, keinerlei Verbindung zur DB oder Spiellogik.
 * Wird NUR durch expliziten increment(seatingSize)-Aufruf weitergeschaltet.
 *
 * Bockrunden: triggerBock(n) startet n Bockrunden, decrementBock() zählt nach
 * jedem gespeicherten Spiel einen herunter.
 */

import { useState } from 'react';

const STORAGE_KEY      = 'skatRoundCounter';
const BOCK_STORAGE_KEY = 'skatBockRoundsLeft';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { step: 0, deals: 0 };
}

function loadBock() {
  try {
    const raw = localStorage.getItem(BOCK_STORAGE_KEY);
    if (raw !== null) return Math.max(0, parseInt(raw, 10));
  } catch {}
  return 0;
}

function save(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function saveBock(n) {
  try { localStorage.setItem(BOCK_STORAGE_KEY, String(n)); } catch {}
}

export function useRoundCounter() {
  const [state, setState]           = useState(load);
  const [bockRoundsLeft, setBockRaw] = useState(loadBock);

  function setBockRoundsLeft(n) {
    const clamped = Math.max(0, n);
    saveBock(clamped);
    setBockRaw(clamped);
  }

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
    setBockRoundsLeft(0);
  }

  function completedRounds(seatingSize) {
    return Math.floor(state.deals / (seatingSize || 3));
  }

  /** Startet n Bockrunden (addiert zu eventuell noch laufenden). */
  function triggerBock(n) {
    setBockRoundsLeft(bockRoundsLeft + n);
  }

  /** Zählt nach einem gespeicherten Spiel einen Bockrunden-Counter herunter. */
  function decrementBock() {
    setBockRoundsLeft(bockRoundsLeft - 1);
  }

  return {
    step: state.step,
    totalDeals: state.deals,
    completedRounds,
    increment,
    reset,
    bockRoundsLeft,
    triggerBock,
    decrementBock,
  };
}
