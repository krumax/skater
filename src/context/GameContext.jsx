import React, { createContext, useContext, useReducer, useCallback, useState, useEffect } from 'react';
import { calculateSeegerFabian } from '../lib/skatScoring';
import * as syncService from '../lib/syncService';

const SESSION_STORAGE_KEY = 'skatSessionId';

const GameContext = createContext();

const DEFAULT_PLAYERS = ['Christian', 'Elena', 'Marcus'];

/**
 * Table model:
 *   seating: array of player names in clockwise order around the table
 *   geberIndex: index into `seating` of the current Geber (dealer)
 *
 * Roles derived from geberIndex (always 3 active players):
 *   Geber  = seating[geberIndex]         — deals the cards
 *   Hören  = seating[(geberIndex+1) % n] — Vorhand, answers bids first
 *   Sagen  = seating[(geberIndex+2) % n] — Mittelhand, starts bidding
 *
 * With 4 players, the Geber sits out and the 3 active players play.
 * After each round, geberIndex shifts +1 (rotation to the left).
 */

const initialState = {
  seating: DEFAULT_PLAYERS,   // fixed seating order (3 or 4)
  geberIndex: 0,              // who is dealing this round
  rounds: [],
  currentRound: 1,
  sessionId: Date.now(),
  tableName: '',
};

function getRoles(seating, geberIndex) {
  const n = seating.length;
  const geber  = seating[geberIndex % n];
  const hoeren = seating[(geberIndex + 1) % n];
  const sagen  = seating[(geberIndex + 2) % n];
  // With 4 players, geber sits out; active players are the other three
  // With 3 players, geber also plays (standard home game)
  const activePlayers = n === 4
    ? [hoeren, sagen, seating[(geberIndex + 3) % n]]
    : seating;
  return { geber, hoeren, sagen, activePlayers };
}

function gameReducer(state, action) {
  switch (action.type) {
    case 'ADD_ROUND': {
      const finalGameValue = action.payload.isBock
        ? action.payload.gameValue * 2
        : action.payload.gameValue;
      const round = {
        id: state.rounds.length + 1,
        ...action.payload,
        gameValue: finalGameValue,
        isBock: action.payload.isBock ?? false,
        mitOhne: action.payload.mitOhne ?? 'mit',
        timestamp: new Date().toISOString(),
      };

      // Store the roles at time of this round
      const roles = getRoles(state.seating, state.geberIndex);
      round.roles = {
        geber: roles.geber,
        hoeren: roles.hoeren,
        sagen: roles.sagen,
      };

      // Calculate Seeger-Fabian scores for this round
      round.seegerScores = calculateSeegerFabian({
        declarer: round.player,
        allPlayers: state.seating,
        gameValue: round.gameValue,
        won: round.won,
      });

      const newRounds = [...state.rounds, round];
      return {
        ...state,
        rounds: newRounds,
        currentRound: state.currentRound + 1,
        // Rotate Geber to the left
        geberIndex: (state.geberIndex + 1) % state.seating.length,
      };
    }

    case 'LOAD_SESSION': {
      const { session, rounds } = action.payload;
      return {
        ...state,
        seating: session.seating,
        geberIndex: session.geber_index,
        currentRound: session.current_round,
        rounds: rounds,
        sessionId: session.id,
        tableName: session.table_name ?? '',
      };
    }

    case 'RESET_SESSION':
      return {
        ...initialState,
        seating: state.seating,
        geberIndex: 0,
        sessionId: Date.now(),
      };

    case 'SET_SEATING':
      return {
        ...state,
        seating: action.payload,
        geberIndex: 0,
      };

    case 'ADD_PLAYER': {
      if (state.seating.includes(action.payload)) return state;
      if (state.seating.length >= 4) return state; // max 4
      return {
        ...state,
        seating: [...state.seating, action.payload],
      };
    }

    case 'REMOVE_PLAYER': {
      if (state.seating.length <= 3) return state; // min 3
      const newSeating = state.seating.filter(p => p !== action.payload);
      return {
        ...state,
        seating: newSeating,
        geberIndex: state.geberIndex % newSeating.length,
      };
    }

    case 'RENAME_PLAYER': {
      const { oldName, newName } = action.payload;
      if (state.seating.includes(newName)) return state;
      return {
        ...state,
        seating: state.seating.map(p => p === oldName ? newName : p),
        rounds: state.rounds.map(r => ({
          ...r,
          player: r.player === oldName ? newName : r.player,
          roles: r.roles ? {
            geber: r.roles.geber === oldName ? newName : r.roles.geber,
            hoeren: r.roles.hoeren === oldName ? newName : r.roles.hoeren,
            sagen: r.roles.sagen === oldName ? newName : r.roles.sagen,
          } : r.roles,
          seegerScores: r.seegerScores
            ? Object.fromEntries(
                Object.entries(r.seegerScores).map(([k, v]) => [k === oldName ? newName : k, v])
              )
            : r.seegerScores,
        })),
      };
    }

    case 'REORDER_SEATING': {
      // payload: { fromIndex, toIndex }
      const { fromIndex, toIndex } = action.payload;
      const newSeating = [...state.seating];
      const [moved] = newSeating.splice(fromIndex, 1);
      newSeating.splice(toIndex, 0, moved);
      return {
        ...state,
        seating: newSeating,
        geberIndex: 0,
      };
    }

    case 'SET_GEBER_INDEX':
      return {
        ...state,
        geberIndex: action.payload % state.seating.length,
      };

    case 'UPDATE_ROUND': {
      const { id, patch } = action.payload;
      return {
        ...state,
        rounds: state.rounds.map(r =>
          r.id === id ? { ...r, ...patch } : r
        ),
      };
    }

    case 'DELETE_ROUND': {
      const roundId = action.payload; // local round id (r.id)
      const newRounds = state.rounds.filter(r => r.id !== roundId);
      // Recalculate currentRound and geberIndex from remaining rounds
      const newCurrentRound = newRounds.length + 1;
      const newGeberIndex = newRounds.length % state.seating.length;
      return {
        ...state,
        rounds: newRounds,
        currentRound: newCurrentRound,
        geberIndex: newGeberIndex,
      };
    }

    case 'SET_TABLE_NAME':
      return { ...state, tableName: action.payload };

    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
  const [syncError, setSyncError] = useState(null);

  // Initialization — load session on mount, never auto-create
  useEffect(() => {
    async function initSession() {
      setSyncStatus('syncing');
      const storedId = localStorage.getItem(SESSION_STORAGE_KEY);
      if (storedId) {
        const { data, error } = await syncService.loadSession(storedId);
        if (!error && data) {
          dispatch({ type: 'LOAD_SESSION', payload: data });
          setSyncStatus('synced');
          return;
        }
        // Stored session no longer exists — fall through to load latest
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
      // No stored session or it was invalid — load the most recent session from DB
      const { data: sessions, error: listError } = await syncService.listSessions();
      if (listError || !sessions?.length) {
        // No sessions at all — only now create one
        const { data: newSession, error: createError } = await syncService.createSession(initialState.seating);
        if (createError || !newSession) {
          setSyncStatus('error');
          setSyncError(createError?.message ?? 'Fehler beim Erstellen der Session');
          return;
        }
        localStorage.setItem(SESSION_STORAGE_KEY, newSession.id);
        dispatch({ type: 'LOAD_SESSION', payload: { session: newSession, rounds: [] } });
      } else {
        // Load the most recent existing session
        const latest = sessions[0];
        const { data, error } = await syncService.loadSession(latest.id);
        if (error || !data) {
          setSyncStatus('error');
          setSyncError(error?.message ?? 'Fehler beim Laden der Session');
          return;
        }
        localStorage.setItem(SESSION_STORAGE_KEY, latest.id);
        dispatch({ type: 'LOAD_SESSION', payload: data });
      }
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
    if (!sessionId || state.seating.length <= 3) return;
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
  const getPlayerTotals = useCallback(() => {
    const totals = {};
    state.seating.forEach(p => { totals[p] = 0; });
    state.rounds.forEach(r => {
      if (r.player && r.player !== '-') {
        totals[r.player] = (totals[r.player] || 0) + r.gameValue;
      }
    });
    return totals;
  }, [state.seating, state.rounds]);

  // ── Seeger-Fabian totals ──
  const getSeegerTotals = useCallback(() => {
    const totals = {};
    state.seating.forEach(p => { totals[p] = 0; });
    state.rounds.forEach(r => {
      if (r.seegerScores) {
        state.seating.forEach(p => {
          totals[p] = (totals[p] || 0) + (r.seegerScores[p] || 0);
        });
      }
    });
    return totals;
  }, [state.seating, state.rounds]);

  const getPlayerRank = useCallback((useSeeger = false) => {
    const totals = useSeeger ? getSeegerTotals() : getPlayerTotals();
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .map(([name, score], index) => ({ name, score, rank: index + 1 }));
  }, [getPlayerTotals, getSeegerTotals]);

  // ── Per-player stats ──
  const getPlayerStats = useCallback((playerName) => {
    const playerRounds = state.rounds.filter(r => r.player === playerName);
    const totalGames = playerRounds.length;
    const wins = playerRounds.filter(r => r.won).length;
    const losses = totalGames - wins;
    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;
    const totalPoints = playerRounds.reduce((sum, r) => sum + r.gameValue, 0);
    const avgPoints = totalGames > 0 ? (totalPoints / totalGames).toFixed(1) : 0;

    const wonRounds  = playerRounds.filter(r => r.won);
    const lostRounds = playerRounds.filter(r => !r.won);
    const bestWin    = wonRounds.length  > 0 ? Math.max(...wonRounds.map(r => r.gameValue))  : null;
    const worstLoss  = lostRounds.length > 0 ? Math.min(...lostRounds.map(r => r.gameValue)) : null;

    const typeCounts = {};
    playerRounds.forEach(r => {
      const t = r.gameType || 'unknown';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    const typeDistribution = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count, pct: ((count / totalGames) * 100).toFixed(0) }))
      .sort((a, b) => b.count - a.count);

    const seegerTotal = state.rounds.reduce((sum, r) => {
      return sum + (r.seegerScores?.[playerName] || 0);
    }, 0);

    // ── Brot / Baguette detection ──
    // A "Brot" is a full Geberrunde (3 consecutive rounds) where the player
    // was never Alleinspieler (i.e. scored 0 standard points in those 3 rounds).
    // A "Baguette" is 6 consecutive such rounds (two Brote in a row).
    // We scan all rounds and count consecutive non-scoring rounds in blocks of 3.
    let consecutiveNonPlaying = 0; // rounds in a row where player was not Alleinspieler
    let brote = 0;
    let baguettes = 0;
    let currentBrotStreak = 0; // how many consecutive Brote (for Baguette detection)

    // ── Longest win streak ──
    // Streak is broken by ANY round where another player wins,
    // or where this player loses. Only uninterrupted wins by this player count.
    let longestWinStreak = 0;
    let currentWinStreak = 0;

    // ── Longest loss streak ──
    // Only counts consecutive losses where this player was Alleinspieler.
    let longestLossStreak = 0;
    let currentLossStreak = 0;

    state.rounds.forEach(r => {
      if (r.player === playerName && r.won) {
        // This player won — extend win streak, reset loss streak
        currentWinStreak += 1;
        if (currentWinStreak > longestWinStreak) longestWinStreak = currentWinStreak;
        currentLossStreak = 0;
      } else if (r.player === playerName && !r.won) {
        // This player lost — extend loss streak, reset win streak
        currentLossStreak += 1;
        if (currentLossStreak > longestLossStreak) longestLossStreak = currentLossStreak;
        currentWinStreak = 0;
      } else {
        // Another player was Alleinspieler — breaks both streaks
        currentWinStreak = 0;
        currentLossStreak = 0;
      }
    });

    state.rounds.forEach(r => {
      if (r.player === playerName) {
        // Player was Alleinspieler — reset non-playing streak
        consecutiveNonPlaying = 0;
        currentBrotStreak = 0;
      } else {
        consecutiveNonPlaying += 1;
        if (consecutiveNonPlaying % 3 === 0) {
          // Completed another full Geberrunde without playing
          brote += 1;
          currentBrotStreak += 1;
          if (currentBrotStreak === 2) {
            // Two consecutive Brote = one Baguette
            baguettes += 1;
            currentBrotStreak = 0; // reset so next pair can form another Baguette
          }
        }
      }
    });

    // Current active streak (incomplete Geberrunde in progress)
    const currentStreak = consecutiveNonPlaying;

    return {
      totalGames, wins, losses, winRate,
      totalPoints, avgPoints, seegerTotal,
      typeDistribution, rounds: playerRounds,
      brote, baguettes, currentStreak, longestWinStreak, longestLossStreak,
      bestWin, worstLoss,
    };
  }, [state.rounds]);

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
