/**
 * useSyncActions - all async Supabase sync operations for game state.
 *
 * Each action follows the pattern: optimistic local dispatch → sync to DB.
 * Sync status is surfaced via setSyncStatus / setSyncError.
 *
 * @param {object}   state          - current gameReducer state
 * @param {function} dispatch       - gameReducer dispatch
 * @param {function} setSyncStatus  - setter for sync status string
 * @param {function} setSyncError   - setter for sync error message
 * @returns {object} action handlers
 */

import { useCallback, useMemo } from 'react';
import * as syncService from '../lib/syncService';
import { SESSION_STORAGE_KEY } from './useSessionInit';
import { validateSpiellisteName, validateRoundCount, generateDefaultName, computeListWinner } from '../lib/spiellistenUtils';

function toNonNegativeInteger(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : fallback;
}

function getRoundCounterState(state) {
  const seatingSize = state.seating.length || 3;
  const source = state.roundCounter ?? {};
  return {
    deals: toNonNegativeInteger(source.deals, state.rounds.length),
    step: toNonNegativeInteger(source.step, state.geberIndex) % seatingSize,
    bockRoundsLeft: toNonNegativeInteger(source.bockRoundsLeft, 0),
  };
}

function getNextRoundCounter(state, bockRoundsLeft) {
  const current = getRoundCounterState(state);
  const seatingSize = state.seating.length || 3;
  return {
    deals: current.deals + 1,
    step: (current.step + 1) % seatingSize,
    bockRoundsLeft: bockRoundsLeft === undefined
      ? current.bockRoundsLeft
      : toNonNegativeInteger(bockRoundsLeft, current.bockRoundsLeft),
  };
}

export function useSyncActions(state, dispatch, setSyncStatus, setSyncError) {

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getSessionId() {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  }

  function syncOk()  { setSyncStatus('synced');  setSyncError(null); }
  function syncFail(label, error) {
    console.error(`${label} fehlgeschlagen:`, error);
    setSyncStatus('error');
    setSyncError(error?.message ?? label);
  }

  // ── Round actions ──────────────────────────────────────────────────────────

  const addRound = useCallback(async (roundData, requestedCounter = null) => {
    // Capture spielliste state before dispatch (reducer will mutate it)
    const activeId = state.activeSpiellisteId;
    const activeListe = activeId ? state.spiellisten.find(l => l.id === activeId) : null;
    const listRoundsCountBefore = activeId
      ? state.rounds.filter(r => r.spiellisteId === activeId).length
      : 0;

    const defaultNextCounter = getNextRoundCounter(state);
    const nextRoundCounter = requestedCounter
      ? {
          deals: toNonNegativeInteger(requestedCounter.deals, defaultNextCounter.deals),
          step: toNonNegativeInteger(requestedCounter.step, defaultNextCounter.step) % (state.seating.length || 3),
          bockRoundsLeft: toNonNegativeInteger(requestedCounter.bockRoundsLeft, defaultNextCounter.bockRoundsLeft),
        }
      : defaultNextCounter;

    dispatch({ type: 'ADD_ROUND', payload: roundData });
    dispatch({ type: 'SET_ROUND_COUNTER', payload: nextRoundCounter });
    const sessionId = getSessionId();
    if (!sessionId) return { error: null };

    setSyncStatus('syncing');

    // Mirror the reducer's id assignment (rounds.length + 1 before dispatch)
    const roundWithId = {
      id: state.rounds.length + 1,
      ...roundData,
      gameValue: roundData.isBock ? roundData.gameValue * 2 : roundData.gameValue,
      isBock: roundData.isBock ?? false,
      timestamp: new Date().toISOString(),
      spiellisteId: activeId,
    };

    const { data: insertedRow, error: insertError } = await syncService.insertRound(roundWithId, sessionId);
    if (insertError) {
      syncFail('insertRound', insertError);
      return { error: insertError };
    }

    // Write the DB-generated UUID back into local state so edits can reference it
    if (insertedRow?.id) {
      dispatch({ type: 'UPDATE_ROUND', payload: { id: roundWithId.id, patch: { _dbId: insertedRow.id } } });
    }

    const { error: updateError } = await syncService.updateSessionRoundState(sessionId, {
      geberIndex:   (state.geberIndex + 1) % state.seating.length,
      currentRound: state.currentRound + 1,
      counter:      nextRoundCounter,
    });
    if (updateError) syncFail('updateSessionRoundState', updateError);

    // Auto-close list in DB if round count reached
    if (activeListe && (listRoundsCountBefore + 1) >= activeListe.roundCount) {
      const allRounds = [...state.rounds, roundWithId];
      const listRounds = allRounds.filter(r => r.spiellisteId === activeId);
      const winner = computeListWinner(state.seating, listRounds);
      const { error: closeError } = await syncService.closeSpielliste(activeId, winner);
      if (closeError) console.error('closeSpielliste (auto) fehlgeschlagen:', closeError);
    }

    if (!updateError) syncOk();
    return { error: updateError ?? null };
  }, [state.rounds, state.geberIndex, state.seating, state.currentRound, state.activeSpiellisteId, state.spiellisten, state.roundCounter]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteRound = useCallback(async (round) => {
    const currentCounter = getRoundCounterState(state);
    const seatingSize = state.seating.length || 3;
    const nextDeals = Math.max(0, currentCounter.deals - 1);
    const nextRoundCounter = {
      ...currentCounter,
      deals: nextDeals,
      step: nextDeals === 0 ? 0 : (currentCounter.step + seatingSize - 1) % seatingSize,
    };

    dispatch({ type: 'DELETE_ROUND', payload: round.id });
    dispatch({ type: 'SET_ROUND_COUNTER', payload: nextRoundCounter });
    const sessionId = getSessionId();
    if (!sessionId) return { error: null };

    setSyncStatus('syncing');
    const { error } = await syncService.deleteRound(round._dbId ?? round.id);
    if (error) {
      syncFail('deleteRound', error);
      return { error };
    }

    const newRoundCount = state.rounds.length - 1;
    const { error: updateError } = await syncService.updateSessionRoundState(sessionId, {
      currentRound: newRoundCount + 1,
      geberIndex:   newRoundCount % state.seating.length,
      counter:      nextRoundCounter,
    });
    if (updateError) {
      syncFail('updateSessionRoundState', updateError);
      return { error: updateError };
    }

    syncOk();
    return { error: null };
  }, [state.rounds.length, state.seating.length, state.roundCounter]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateRound = useCallback(async (round, patch) => {
    const dbId = round._dbId ?? round.id;
    if (!dbId || dbId === 'undefined') {
      return { error: { message: 'Runde hat keine gültige Datenbank-ID.' } };
    }
    const snakePatch = {
      ...(patch.player              !== undefined && { player:               patch.player }),
      ...(patch.gameType            !== undefined && { game_type:            patch.gameType }),
      ...(patch.typeLabel           !== undefined && { type_label:           patch.typeLabel }),
      ...(patch.hand                !== undefined && { hand:                 patch.hand }),
      ...(patch.ouvert              !== undefined && { ouvert:               patch.ouvert }),
      ...(patch.schneider           !== undefined && { schneider:            patch.schneider }),
      ...(patch.schneiderAnnounced  !== undefined && { schneider_announced:  patch.schneiderAnnounced }),
      ...(patch.schwarz             !== undefined && { schwarz:              patch.schwarz }),
      ...(patch.schwarzAnnounced    !== undefined && { schwarz_announced:    patch.schwarzAnnounced }),
      ...(patch.spitzen             !== undefined && { spitzen:              patch.spitzen }),
      ...(patch.isBock              !== undefined && { is_bock:              patch.isBock }),
      ...(patch.gameValue           !== undefined && { game_value:           patch.gameValue }),
      ...(patch.mitOhne             !== undefined && { mit_ohne:             patch.mitOhne }),
      ...(patch.won                 !== undefined && { won:                  patch.won }),
    };
    const { error } = await syncService.updateRound(dbId, snakePatch);
    if (error) return { error };
    dispatch({ type: 'UPDATE_ROUND', payload: { id: round.id, patch } });
    return { error: null };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetRoundCounter = useCallback(async () => {
    const previousCounter = getRoundCounterState(state);
    const nextCounter = { deals: 0, step: 0, bockRoundsLeft: 0 };
    dispatch({ type: 'SET_ROUND_COUNTER', payload: nextCounter });

    const sessionId = getSessionId();
    if (!sessionId) return { error: null };

    setSyncStatus('syncing');
    const { error } = await syncService.updateRoundCounter(sessionId, nextCounter);
    if (error) {
      dispatch({ type: 'SET_ROUND_COUNTER', payload: previousCounter });
      syncFail('updateRoundCounter', error);
      return { error };
    }

    syncOk();
    return { error: null };
  }, [state.roundCounter, state.rounds.length, state.seating.length, state.geberIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session actions ────────────────────────────────────────────────────────

  const resetSession = useCallback(async () => {
    dispatch({ type: 'RESET_SESSION' });
    setSyncStatus('syncing');
    const { data: newSession, error } = await syncService.createSession(state.seating);
    if (error || !newSession) { syncFail('createSession', error); return; }
    localStorage.setItem(SESSION_STORAGE_KEY, newSession.id);
    syncOk();
  }, [state.seating]); // eslint-disable-line react-hooks/exhaustive-deps

  const createNewTable = useCallback(async (seating, tableName = '') => {
    setSyncStatus('syncing');
    const { data: newSession, error } = await syncService.createSession(seating, tableName);
    if (error || !newSession) { syncFail('createNewTable', error ?? new Error('Fehler beim Erstellen des Tisches')); return; }
    localStorage.setItem(SESSION_STORAGE_KEY, newSession.id);
    dispatch({ type: 'LOAD_SESSION', payload: { session: newSession, rounds: [] } });
    syncOk();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchSession = useCallback(async (sessionId) => {
    setSyncStatus('syncing');
    const { data, error } = await syncService.loadSession(sessionId);
    if (error || !data) { syncFail('switchSession', error); return; }
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    dispatch({ type: 'LOAD_SESSION', payload: data });
    syncOk();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshFromDB = useCallback(async () => {
    const sessionId = getSessionId();
    if (!sessionId) return;
    setSyncStatus('syncing');
    const { data, error } = await syncService.loadSession(sessionId);
    if (error || !data) { syncFail('refreshFromDB', error); return; }
    dispatch({ type: 'LOAD_SESSION', payload: data });
    syncOk();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    dispatch({ type: 'CLEAR_SESSION' });
    setSyncStatus('idle');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Seating actions ────────────────────────────────────────────────────────

  const addPlayer = useCallback(async (name) => {
    dispatch({ type: 'ADD_PLAYER', payload: name });
    const sessionId = getSessionId();
    if (!sessionId) return;
    const newSeating = state.seating.includes(name) || state.seating.length >= 4
      ? state.seating
      : [...state.seating, name];
    const { error } = await syncService.updateSeating(sessionId, newSeating);
    if (error) console.error('updateSeating (addPlayer) fehlgeschlagen:', error);
  }, [state.seating]); // eslint-disable-line react-hooks/exhaustive-deps

  const removePlayer = useCallback(async (name) => {
    dispatch({ type: 'REMOVE_PLAYER', payload: name });
    const sessionId = getSessionId();
    if (!sessionId || (state.seating.length <= 3 && name !== '-')) return;
    const newSeating = state.seating.filter(p => p !== name);
    const { error } = await syncService.updateSeating(sessionId, newSeating);
    if (error) console.error('updateSeating (removePlayer) fehlgeschlagen:', error);

    const nextRoundCounter = {
      ...getRoundCounterState(state),
      step: getRoundCounterState(state).step % Math.max(newSeating.length, 1),
    };
    const { error: counterError } = await syncService.updateRoundCounter(sessionId, nextRoundCounter);
    if (counterError) console.error('updateRoundCounter (removePlayer) fehlgeschlagen:', counterError);
  }, [state.seating, state.roundCounter, state.rounds.length, state.geberIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const renamePlayer = useCallback(async (oldName, newName) => {
    dispatch({ type: 'RENAME_PLAYER', payload: { oldName, newName } });
    const sessionId = getSessionId();
    if (!sessionId) return;
    const newSeating = state.seating.map(p => p === oldName ? newName : p);
    const { error } = await syncService.updateSeating(sessionId, newSeating);
    if (error) console.error('updateSeating (renamePlayer) fehlgeschlagen:', error);
    // Update all rounds in DB that reference the old player name
    const { error: roundsError } = await syncService.renamePlayerInRounds(sessionId, oldName, newName);
    if (roundsError) console.error('renamePlayerInRounds fehlgeschlagen:', roundsError);
    // Update display_name in session_players (does not touch user_id)
    const { error: spError } = await syncService.updateSessionPlayerName(sessionId, oldName, newName);
    if (spError) console.error('updateSessionPlayerName fehlgeschlagen:', spError);
  }, [state.seating]); // eslint-disable-line react-hooks/exhaustive-deps

  const reorderSeating = useCallback(async (fromIndex, toIndex) => {
    const newSeating = [...state.seating];
    const [moved] = newSeating.splice(fromIndex, 1);
    const nextRoundCounter = { ...getRoundCounterState(state), step: 0 };
    dispatch({ type: 'REORDER_SEATING', payload: { fromIndex, toIndex } });
    dispatch({ type: 'SET_ROUND_COUNTER', payload: nextRoundCounter });
    const sessionId = getSessionId();
    if (!sessionId) return;
    const { error } = await syncService.updateSeating(sessionId, newSeating);
    if (error) console.error('updateSeating (reorderSeating) fehlgeschlagen:', error);
    const { error: geberError } = await syncService.updateSessionRoundState(sessionId, {
      geberIndex: 0,
      counter: nextRoundCounter,
    });
    if (geberError) console.error('updateSessionRoundState (reorderSeating) fehlgeschlagen:', geberError);
  }, [state.seating, state.roundCounter, state.rounds.length, state.geberIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const setGeberIndex = useCallback(async (index) => {
    const seatingSize = state.seating.length || 1;
    const nextIndex = index % seatingSize;
    const nextRoundCounter = { ...getRoundCounterState(state), step: nextIndex % (state.seating.length || 3) };
    dispatch({ type: 'SET_GEBER_INDEX', payload: nextIndex });
    dispatch({ type: 'SET_ROUND_COUNTER', payload: nextRoundCounter });
    const sessionId = getSessionId();
    if (!sessionId) return;
    const { error } = await syncService.updateSessionRoundState(sessionId, {
      geberIndex: nextIndex,
      counter: nextRoundCounter,
    });
    if (error) console.error('updateSessionRoundState (setGeberIndex) fehlgeschlagen:', error);
  }, [state.seating.length, state.roundCounter, state.rounds.length, state.geberIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const renameTable = useCallback(async (name) => {
    dispatch({ type: 'SET_TABLE_NAME', payload: name });
    const sessionId = getSessionId();
    if (!sessionId) return;
    const { error } = await syncService.updateSession(sessionId, { table_name: name || null });
    if (error) console.error('renameTable fehlgeschlagen:', error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Spiellisten actions ────────────────────────────────────────────────────

  const createSpielliste = useCallback(async (name, roundCount) => {
    // Guard: session must have players
    if (state.seating.length === 0) return;

    // Validate
    const nameValidation = validateSpiellisteName(name);
    if (!nameValidation.valid) {
      setSyncError(nameValidation.error);
      return;
    }
    const countValidation = validateRoundCount(roundCount);
    if (!countValidation.valid) {
      setSyncError(countValidation.error);
      return;
    }

    const sessionId = getSessionId();
    if (!sessionId) return;

    // Use default name if empty
    const finalName = (!name || name.trim() === '')
      ? generateDefaultName(state.spiellisten.length)
      : name.trim();

    const now = new Date().toISOString();
    const newSpielliste = {
      id: crypto.randomUUID(),
      sessionId,
      name: finalName,
      roundCount,
      status: 'aktiv',
      winner: null,
      lastTouchedAt: now,
      createdAt: now,
    };

    // Optimistic dispatch
    dispatch({ type: 'ADD_SPIELLISTE', payload: newSpielliste });
    setSyncStatus('syncing');

    const { error } = await syncService.createSpielliste(newSpielliste, sessionId);
    if (error) { syncFail('createSpielliste', error); return; }
    syncOk();
  }, [state.seating, state.spiellisten]); // eslint-disable-line react-hooks/exhaustive-deps

  const setActiveSpielliste = useCallback(async (id) => {
    dispatch({ type: 'SET_ACTIVE_SPIELLISTE', payload: id });

    if (id === null) return; // No DB call needed when deselecting

    setSyncStatus('syncing');
    const { error } = await syncService.setActiveSpiellisteTimestamp(id);
    if (error) { syncFail('setActiveSpielliste', error); return; }
    syncOk();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const closeSpielliste = useCallback(async (spiellisteId) => {
    // Compute winner from current state
    const listRounds = state.rounds.filter(r => r.spiellisteId === spiellisteId);
    const winner = computeListWinner(state.seating, listRounds);

    // Optimistic dispatch
    dispatch({ type: 'CLOSE_SPIELLISTE', payload: spiellisteId });
    setSyncStatus('syncing');

    const { error } = await syncService.closeSpielliste(spiellisteId, winner);
    if (error) { syncFail('closeSpielliste', error); return; }
    syncOk();
  }, [state.rounds, state.seating]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteSpielliste = useCallback(async (spiellisteId) => {
    // Guard: only allow deleting abgeschlossene (completed) lists
    const liste = state.spiellisten.find(l => l.id === spiellisteId);
    if (!liste || liste.status !== 'abgeschlossen') return;

    // Optimistic dispatch
    dispatch({ type: 'DELETE_SPIELLISTE', payload: spiellisteId });
    setSyncStatus('syncing');

    const { error } = await syncService.deleteSpielliste(spiellisteId);
    if (error) { syncFail('deleteSpielliste', error); return; }
    syncOk();
  }, [state.spiellisten]); // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(() => ({
    addRound, deleteRound, updateRound,
    resetRoundCounter,
    resetSession, createNewTable, switchSession, refreshFromDB, clearSession,
    addPlayer, removePlayer, renamePlayer, reorderSeating, setGeberIndex, renameTable,
    createSpielliste, setActiveSpielliste, closeSpielliste, deleteSpielliste,
  }), [
    addRound, deleteRound, updateRound,
    resetRoundCounter,
    resetSession, createNewTable, switchSession, refreshFromDB, clearSession,
    addPlayer, removePlayer, renamePlayer, reorderSeating, setGeberIndex, renameTable,
    createSpielliste, setActiveSpielliste, closeSpielliste, deleteSpielliste,
  ]);
}
