/**
 * useSyncActions — all async Supabase sync operations for game state.
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

import { useCallback } from 'react';
import * as syncService from '../lib/syncService';
import { SESSION_STORAGE_KEY } from './useSessionInit';

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

  const addRound = useCallback(async (roundData) => {
    dispatch({ type: 'ADD_ROUND', payload: roundData });
    const sessionId = getSessionId();
    if (!sessionId) return;

    setSyncStatus('syncing');

    // Mirror the reducer's id assignment (rounds.length + 1 before dispatch)
    const roundWithId = {
      id: state.rounds.length + 1,
      ...roundData,
      gameValue: roundData.isBock ? roundData.gameValue * 2 : roundData.gameValue,
      isBock: roundData.isBock ?? false,
      timestamp: new Date().toISOString(),
    };

    const { error: insertError } = await syncService.insertRound(roundWithId, sessionId);
    if (insertError) { syncFail('insertRound', insertError); return; }

    const { error: updateError } = await syncService.updateSession(sessionId, {
      geber_index:   (state.geberIndex + 1) % state.seating.length,
      current_round: state.currentRound + 1,
    });
    if (updateError) console.error('updateSession fehlgeschlagen:', updateError);

    syncOk();
  }, [state.rounds.length, state.geberIndex, state.seating.length, state.currentRound]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteRound = useCallback(async (round) => {
    dispatch({ type: 'DELETE_ROUND', payload: round.id });
    const sessionId = getSessionId();
    if (!sessionId) return;

    setSyncStatus('syncing');
    const { error } = await syncService.deleteRound(round._dbId ?? round.id);
    if (error) { syncFail('deleteRound', error); return; }

    const newRoundCount = state.rounds.length - 1;
    await syncService.updateSession(sessionId, {
      current_round: newRoundCount + 1,
      geber_index:   newRoundCount % state.seating.length,
    });

    syncOk();
  }, [state.rounds.length, state.seating.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateRound = useCallback(async (round, patch) => {
    const snakePatch = {
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
    const { error } = await syncService.updateRound(round._dbId, snakePatch);
    if (error) return { error };
    dispatch({ type: 'UPDATE_ROUND', payload: { id: round.id, patch } });
    return { error: null };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [state.seating]); // eslint-disable-line react-hooks/exhaustive-deps

  const renamePlayer = useCallback(async (oldName, newName) => {
    dispatch({ type: 'RENAME_PLAYER', payload: { oldName, newName } });
    const sessionId = getSessionId();
    if (!sessionId) return;
    const newSeating = state.seating.map(p => p === oldName ? newName : p);
    const { error } = await syncService.updateSeating(sessionId, newSeating);
    if (error) console.error('updateSeating (renamePlayer) fehlgeschlagen:', error);
  }, [state.seating]); // eslint-disable-line react-hooks/exhaustive-deps

  const reorderSeating = useCallback(async (fromIndex, toIndex) => {
    const newSeating = [...state.seating];
    const [moved] = newSeating.splice(fromIndex, 1);
    newSeating.splice(toIndex, 0, moved);
    dispatch({ type: 'REORDER_SEATING', payload: { fromIndex, toIndex } });
    const sessionId = getSessionId();
    if (!sessionId) return;
    const { error } = await syncService.updateSeating(sessionId, newSeating);
    if (error) console.error('updateSeating (reorderSeating) fehlgeschlagen:', error);
    const { error: geberError } = await syncService.updateSession(sessionId, { geber_index: 0 });
    if (geberError) console.error('updateSession (reorderSeating geber_index) fehlgeschlagen:', geberError);
  }, [state.seating]); // eslint-disable-line react-hooks/exhaustive-deps

  const setGeberIndex = useCallback(async (index) => {
    dispatch({ type: 'SET_GEBER_INDEX', payload: index });
    const sessionId = getSessionId();
    if (!sessionId) return;
    const { error } = await syncService.updateSession(sessionId, { geber_index: index });
    if (error) console.error('updateSession (setGeberIndex) fehlgeschlagen:', error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renameTable = useCallback(async (name) => {
    dispatch({ type: 'SET_TABLE_NAME', payload: name });
    const sessionId = getSessionId();
    if (!sessionId) return;
    const { error } = await syncService.updateSession(sessionId, { table_name: name || null });
    if (error) console.error('renameTable fehlgeschlagen:', error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    addRound, deleteRound, updateRound,
    resetSession, createNewTable, switchSession, refreshFromDB,
    addPlayer, removePlayer, renamePlayer, reorderSeating, setGeberIndex, renameTable,
  };
}
