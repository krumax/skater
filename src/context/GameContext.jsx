import React, { createContext, useContext, useReducer, useCallback, useState, useEffect } from 'react';
import * as syncService from '../lib/syncService';
import { gameReducer, initialState, getRoles } from '../lib/gameReducer';
import {
  computePlayerTotals,
  computeSeegerTotals,
  computePlayerRank,
  computePlayerStats,
} from '../lib/playerStats';

const SESSION_STORAGE_KEY = 'skatSessionId';

const GameContext = createContext();

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncError, setSyncError] = useState(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Initialization — load session on mount, never auto-create
  useEffect(() => {
    function loadDispatch(payload) {
      dispatch({ type: 'LOAD_SESSION', payload });
      setSessionLoaded(true);
    }

    async function initSession() {
      setSyncStatus('syncing');
      const storedId = localStorage.getItem(SESSION_STORAGE_KEY);
      if (storedId) {
        const { data, error } = await syncService.loadSession(storedId);
        if (!error && data) {
          loadDispatch(data);
          setSyncStatus('synced');
          return;
        }
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
      const { data: sessions, error: listError } = await syncService.listSessions();
      if (listError || !sessions?.length) {
        // No sessions at all — mark as loaded but don't create a session with empty players.
        // The user must create a new table via the wizard first.
        setSessionLoaded(true);
        setSyncStatus('synced');
        return;
      }
      // Load the most recent existing session
      const latest = sessions[0];
      const { data, error } = await syncService.loadSession(latest.id);
      if (error || !data) {
        setSyncStatus('error');
        setSyncError(error?.message ?? 'Fehler beim Laden der Session');
        return;
      }
      localStorage.setItem(SESSION_STORAGE_KEY, latest.id);
      loadDispatch(data);
      setSyncStatus('synced');
    }
    initSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentRoles = getRoles(state.seating, state.geberIndex);

  // Task 4.4: addRound with sync (optimistic update first)
  const addRound = useCallback(async (roundData) => {
    dispatch({ type: 'ADD_ROUND', payload: roundData });
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) return;
    setSyncStatus('syncing');
    // Build the round object as the reducer would (id = rounds.length + 1 before dispatch)
    // We pass roundData; insertRound uses round.id which will be set by the reducer.
    // To get the correct id we read state after dispatch — but since dispatch is async in React,
    // we compute it here the same way the reducer does.
    const roundWithId = {
      id: state.rounds.length + 1,
      ...roundData,
      gameValue: roundData.isBock ? roundData.gameValue * 2 : roundData.gameValue,
      isBock: roundData.isBock ?? false,
      timestamp: new Date().toISOString(),
    };
    const { error: insertError } = await syncService.insertRound(roundWithId, sessionId);
    if (insertError) {
      console.error('insertRound fehlgeschlagen:', insertError);
      setSyncStatus('error');
      setSyncError(insertError.message);
      return;
    }
    const newGeberIndex = (state.geberIndex + 1) % state.seating.length;
    const newCurrentRound = state.currentRound + 1;
    const { error: updateError } = await syncService.updateSession(sessionId, {
      geber_index: newGeberIndex,
      current_round: newCurrentRound,
    });
    if (updateError) {
      console.error('updateSession fehlgeschlagen:', updateError);
      // Don't block — round was saved
    }
    setSyncStatus('synced');
    setSyncError(null);
  }, [state.rounds.length, state.geberIndex, state.seating.length, state.currentRound]);

  // Task 4.6: resetSession with sync
  const resetSession = useCallback(async () => {
    dispatch({ type: 'RESET_SESSION' });
    setSyncStatus('syncing');
    const { data: newSession, error } = await syncService.createSession(state.seating);
    if (error || !newSession) {
      console.error('createSession fehlgeschlagen:', error);
      setSyncStatus('error');
      setSyncError(error?.message ?? 'Fehler beim Erstellen der Session');
      return;
    }
    localStorage.setItem(SESSION_STORAGE_KEY, newSession.id);
    setSyncStatus('synced');
    setSyncError(null);
  }, [state.seating]);

  // Task 4.7: player actions with seating sync
  const addPlayer = useCallback(async (name) => {
    dispatch({ type: 'ADD_PLAYER', payload: name });
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) return;
    const newSeating = state.seating.includes(name) || state.seating.length >= 4
      ? state.seating
      : [...state.seating, name];
    const { error } = await syncService.updateSeating(sessionId, newSeating);
    if (error) console.error('updateSeating (addPlayer) fehlgeschlagen:', error);
  }, [state.seating]);

  const removePlayer = useCallback(async (name) => {
    dispatch({ type: 'REMOVE_PLAYER', payload: name });
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId || (state.seating.length <= 3 && name !== '-')) return;
    const newSeating = state.seating.filter(p => p !== name);
    const { error } = await syncService.updateSeating(sessionId, newSeating);
    if (error) console.error('updateSeating (removePlayer) fehlgeschlagen:', error);
  }, [state.seating]);

  const renamePlayer = useCallback(async (oldName, newName) => {
    dispatch({ type: 'RENAME_PLAYER', payload: { oldName, newName } });
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) return;
    const newSeating = state.seating.map(p => p === oldName ? newName : p);
    const { error } = await syncService.updateSeating(sessionId, newSeating);
    if (error) console.error('updateSeating (renamePlayer) fehlgeschlagen:', error);
  }, [state.seating]);

  const reorderSeating = useCallback(async (fromIndex, toIndex) => {
    // Compute new seating from current state before dispatch (closure is fresh here)
    const newSeating = [...state.seating];
    const [moved] = newSeating.splice(fromIndex, 1);
    newSeating.splice(toIndex, 0, moved);

    dispatch({ type: 'REORDER_SEATING', payload: { fromIndex, toIndex } });

    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) return;

    // Persist both the new seating order and the reset geber_index (reducer sets it to 0)
    const { error } = await syncService.updateSeating(sessionId, newSeating);
    if (error) console.error('updateSeating (reorderSeating) fehlgeschlagen:', error);
    const { error: geberError } = await syncService.updateSession(sessionId, { geber_index: 0 });
    if (geberError) console.error('updateSession (reorderSeating geber_index) fehlgeschlagen:', geberError);
  }, [state.seating]);

  const setGeberIndex = useCallback(async (index) => {
    dispatch({ type: 'SET_GEBER_INDEX', payload: index });
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) return;
    const { error } = await syncService.updateSession(sessionId, { geber_index: index });
    if (error) console.error('updateSession (setGeberIndex) fehlgeschlagen:', error);
  }, []);

  const deleteRound = useCallback(async (round) => {
    // Optimistic local removal
    dispatch({ type: 'DELETE_ROUND', payload: round.id });
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) return;
    setSyncStatus('syncing');
    // Delete from DB using the stored DB UUID
    const dbId = round._dbId ?? round.id;
    const { error } = await syncService.deleteRound(dbId);
    if (error) {
      console.error('deleteRound fehlgeschlagen:', error);
      setSyncStatus('error');
      setSyncError(error.message);
      return;
    }
    // Update session counters to match new state
    const newRoundCount = state.rounds.length - 1; // after removal
    const newGeberIndex = newRoundCount % state.seating.length;
    await syncService.updateSession(sessionId, {
      current_round: newRoundCount + 1,
      geber_index: newGeberIndex,
    });
    setSyncStatus('synced');
    setSyncError(null);
  }, [state.rounds.length, state.seating.length]);

  const updateRound = useCallback(async (round, patch) => {
    // Convert camelCase patch to snake_case for Supabase
    const snakePatch = {
      ...(patch.gameType   !== undefined && { game_type:  patch.gameType }),
      ...(patch.typeLabel  !== undefined && { type_label: patch.typeLabel }),
      ...(patch.hand       !== undefined && { hand:       patch.hand }),
      ...(patch.ouvert     !== undefined && { ouvert:     patch.ouvert }),
      ...(patch.schneider  !== undefined && { schneider:            patch.schneider }),
      ...(patch.schneiderAnnounced !== undefined && { schneider_announced: patch.schneiderAnnounced }),
      ...(patch.schwarz    !== undefined && { schwarz:              patch.schwarz }),
      ...(patch.schwarzAnnounced !== undefined && { schwarz_announced:   patch.schwarzAnnounced }),
      ...(patch.spitzen    !== undefined && { spitzen:    patch.spitzen }),
      ...(patch.isBock     !== undefined && { is_bock:    patch.isBock }),
      ...(patch.gameValue  !== undefined && { game_value: patch.gameValue }),
      ...(patch.mitOhne    !== undefined && { mit_ohne:   patch.mitOhne }),
      ...(patch.won        !== undefined && { won:        patch.won }),
    };
    const { error } = await syncService.updateRound(round._dbId, snakePatch);
    if (error) return { error };
    dispatch({ type: 'UPDATE_ROUND', payload: { id: round.id, patch } });
    return { error: null };
  }, []);

  // Task 4.8: refreshFromDB
  const refreshFromDB = useCallback(async () => {
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) return;
    setSyncStatus('syncing');
    const { data, error } = await syncService.loadSession(sessionId);
    if (error || !data) {
      console.error('loadSession fehlgeschlagen:', error);
      setSyncStatus('error');
      setSyncError(error?.message ?? 'Fehler beim Laden der Session');
      return;
    }
    dispatch({ type: 'LOAD_SESSION', payload: data });
    setSyncStatus('synced');
    setSyncError(null);
  }, []);

  // Switch to an existing session by ID
  const switchSession = useCallback(async (sessionId) => {
    setSyncStatus('syncing');
    const { data, error } = await syncService.loadSession(sessionId);
    if (error || !data) {
      console.error('switchSession fehlgeschlagen:', error);
      setSyncStatus('error');
      setSyncError(error?.message ?? 'Fehler beim Laden der Session');
      return;
    }
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    dispatch({ type: 'LOAD_SESSION', payload: data });
    setSyncStatus('synced');
    setSyncError(null);
  }, []);

  // Create a brand-new session with a given seating and switch to it
  const createNewTable = useCallback(async (seating, tableName = '') => {
    setSyncStatus('syncing');
    const { data: newSession, error } = await syncService.createSession(seating, tableName);
    if (error || !newSession) {
      console.error('createNewTable fehlgeschlagen:', error);
      setSyncStatus('error');
      setSyncError(error?.message ?? 'Fehler beim Erstellen des Tisches');
      return;
    }
    localStorage.setItem(SESSION_STORAGE_KEY, newSession.id);
    dispatch({ type: 'LOAD_SESSION', payload: { session: newSession, rounds: [] } });
    setSyncStatus('synced');
    setSyncError(null);
  }, []);

  const renameTable = useCallback(async (name) => {
    dispatch({ type: 'SET_TABLE_NAME', payload: name });
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) return;
    const { error } = await syncService.updateSession(sessionId, { table_name: name || null });
    if (error) console.error('renameTable fehlgeschlagen:', error);
  }, []);

  // ── Standard totals ──
  const getPlayerTotals = useCallback(() =>
    computePlayerTotals(state.seating, state.rounds),
  [state.seating, state.rounds]);

  // ── Seeger-Fabian totals ──
  const getSeegerTotals = useCallback(() =>
    computeSeegerTotals(state.seating, state.rounds),
  [state.seating, state.rounds]);

  const getPlayerRank = useCallback((useSeeger = false) =>
    computePlayerRank(state.seating, state.rounds, useSeeger),
  [state.seating, state.rounds]);

  // ── Per-player stats ──
  const getPlayerStats = useCallback((playerName) =>
    computePlayerStats(state.rounds, playerName),
  [state.rounds]);

  return (
    <GameContext.Provider value={{
      // State
      seating: state.seating,
      players: state.seating, // backward compat alias
      rounds: state.rounds,
      currentRound: state.currentRound,
      sessionId: state.sessionId,
      geberIndex: state.geberIndex,
      tableName: state.tableName,
      currentRoles,
      // Sync
      syncStatus,
      syncError,
      sessionLoaded,
      // Actions
      addRound,
      resetSession,
      addPlayer,
      removePlayer,
      renamePlayer,
      reorderSeating,
      setGeberIndex,
      deleteRound,
      updateRound,
      refreshFromDB,
      switchSession,
      createNewTable,
      renameTable,
      // Derived
      getPlayerTotals,
      getSeegerTotals,
      getPlayerRank,
      getPlayerStats,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
