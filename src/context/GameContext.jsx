import React, { createContext, useContext, useReducer, useCallback } from 'react';

const GameContext = createContext();

const DEFAULT_PLAYERS = ['Christian', 'Elena', 'Marcus'];

const initialState = {
  players: DEFAULT_PLAYERS,
  rounds: [],
  currentRound: 1,
  sessionId: Date.now(),
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'ADD_ROUND': {
      const round = {
        id: state.rounds.length + 1,
        ...action.payload,
        timestamp: new Date().toISOString(),
      };

      // Calculate running totals for each player
      const newRounds = [...state.rounds, round];
      const totals = {};
      state.players.forEach(p => { totals[p] = 0; });
      newRounds.forEach(r => {
        // The declarer gets/loses their gameValue
        totals[r.player] = (totals[r.player] || 0) + r.gameValue;
      });
      round.runningTotals = { ...totals };

      return {
        ...state,
        rounds: newRounds,
        currentRound: state.currentRound + 1,
      };
    }

    case 'RESET_SESSION':
      return {
        ...initialState,
        sessionId: Date.now(),
      };

    case 'SET_PLAYERS':
      return {
        ...state,
        players: action.payload,
      };

    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const addRound = useCallback((roundData) => {
    dispatch({ type: 'ADD_ROUND', payload: roundData });
  }, []);

  const resetSession = useCallback(() => {
    dispatch({ type: 'RESET_SESSION' });
  }, []);

  const getPlayerTotals = useCallback(() => {
    const totals = {};
    state.players.forEach(p => { totals[p] = 0; });
    state.rounds.forEach(r => {
      totals[r.player] = (totals[r.player] || 0) + r.gameValue;
    });
    return totals;
  }, [state.players, state.rounds]);

  const getPlayerRank = useCallback(() => {
    const totals = getPlayerTotals();
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .map(([name, score], index) => ({ name, score, rank: index + 1 }));
  }, [getPlayerTotals]);

  return (
    <GameContext.Provider value={{
      ...state,
      addRound,
      resetSession,
      getPlayerTotals,
      getPlayerRank,
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
