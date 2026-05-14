import { createContext, useContext, useReducer, useMemo, useState } from 'react';
import { gameReducer, initialState, getRoles } from '../lib/gameReducer';
import {
  computePlayerTotals,
  computeSeegerTotals,
  computePlayerRank,
  computePlayerStats,
} from '../lib/playerStats';
import { useSessionInit } from '../hooks/useSessionInit';
import { useSyncActions } from '../hooks/useSyncActions';

const GameContext = createContext();

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncError, setSyncError]   = useState(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Session loading on mount
  useSessionInit(dispatch, setSyncStatus, setSyncError, setSessionLoaded);

  // All async Supabase operations
  const actions = useSyncActions(state, dispatch, setSyncStatus, setSyncError);

  // ── Layer 1: Pre-computed derived data ─────────────────────────────────────

  const players = useMemo(
    () => state.seating.filter(p => p !== '-'),
    [state.seating]
  );

  const currentRoles = useMemo(
    () => getRoles(state.seating, state.geberIndex),
    [state.seating, state.geberIndex]
  );

  const playerTotals = useMemo(
    () => computePlayerTotals(state.seating, state.rounds),
    [state.seating, state.rounds]
  );

  const seegerTotals = useMemo(
    () => computeSeegerTotals(state.seating, state.rounds),
    [state.seating, state.rounds]
  );

  const playerRankStandard = useMemo(
    () => computePlayerRank(state.seating, state.rounds, false),
    [state.seating, state.rounds]
  );

  const playerRankSeeger = useMemo(
    () => computePlayerRank(state.seating, state.rounds, true),
    [state.seating, state.rounds]
  );

  const getPlayerStats = useMemo(
    () => (playerName) => computePlayerStats(state.rounds, playerName),
    [state.rounds]
  );

  const getActiveSpiellistenForSession = useMemo(
    () => () => state.spiellisten.filter(l => l.status === 'aktiv'),
    [state.spiellisten]
  );

  // ── Layer 3: Memoized context value ───────────────────────────────────────

  const contextValue = useMemo(() => ({
    // State
    seating: state.seating,
    players,
    rounds: state.rounds,
    currentRound: state.currentRound,
    sessionId: state.sessionId,
    geberIndex: state.geberIndex,
    tableName: state.tableName,
    currentRoles,
    spiellisten: state.spiellisten,
    activeSpiellisteId: state.activeSpiellisteId,
    // Sync
    syncStatus,
    syncError,
    sessionLoaded,
    // Actions (from useSyncActions)
    ...actions,
    // Derived (pre-computed, breaking API change)
    playerTotals,
    seegerTotals,
    playerRankStandard,
    playerRankSeeger,
    getPlayerStats,
    getActiveSpiellistenForSession,
  }), [
    state.seating, players, state.rounds, state.currentRound,
    state.sessionId, state.geberIndex, state.tableName, currentRoles,
    state.spiellisten, state.activeSpiellisteId,
    syncStatus, syncError, sessionLoaded,
    actions,
    playerTotals, seegerTotals, playerRankStandard, playerRankSeeger,
    getPlayerStats, getActiveSpiellistenForSession,
  ]);

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
}
