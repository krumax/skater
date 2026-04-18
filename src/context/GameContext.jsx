import { createContext, useContext, useReducer, useCallback, useState } from 'react';
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

  const currentRoles = getRoles(state.seating, state.geberIndex);

  // ── Derived data helpers ──────────────────────────────────────────────────

  const getPlayerTotals = useCallback(() =>
    computePlayerTotals(state.seating, state.rounds),
  [state.seating, state.rounds]);

  const getSeegerTotals = useCallback(() =>
    computeSeegerTotals(state.seating, state.rounds),
  [state.seating, state.rounds]);

  const getPlayerRank = useCallback((useSeeger = false) =>
    computePlayerRank(state.seating, state.rounds, useSeeger),
  [state.seating, state.rounds]);

  const getPlayerStats = useCallback((playerName) =>
    computePlayerStats(state.rounds, playerName),
  [state.rounds]);

  const getActiveSpiellistenForSession = useCallback(() =>
    state.spiellisten.filter(l => l.status === 'aktiv'),
  [state.spiellisten]);

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
      spiellisten: state.spiellisten,
      activeSpiellisteId: state.activeSpiellisteId,
      // Sync
      syncStatus,
      syncError,
      sessionLoaded,
      // Actions (from useSyncActions)
      ...actions,
      // Derived
      getPlayerTotals,
      getSeegerTotals,
      getPlayerRank,
      getPlayerStats,
      getActiveSpiellistenForSession,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
}
