import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { calculateSeegerFabian } from '../lib/skatScoring';

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
      const round = {
        id: state.rounds.length + 1,
        ...action.payload,
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

    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const currentRoles = getRoles(state.seating, state.geberIndex);

  const addRound = useCallback((roundData) => {
    dispatch({ type: 'ADD_ROUND', payload: roundData });
  }, []);

  const resetSession = useCallback(() => {
    dispatch({ type: 'RESET_SESSION' });
  }, []);

  const addPlayer = useCallback((name) => {
    dispatch({ type: 'ADD_PLAYER', payload: name });
  }, []);

  const removePlayer = useCallback((name) => {
    dispatch({ type: 'REMOVE_PLAYER', payload: name });
  }, []);

  const renamePlayer = useCallback((oldName, newName) => {
    dispatch({ type: 'RENAME_PLAYER', payload: { oldName, newName } });
  }, []);

  const reorderSeating = useCallback((fromIndex, toIndex) => {
    dispatch({ type: 'REORDER_SEATING', payload: { fromIndex, toIndex } });
  }, []);

  // ── Standard totals ──
  const getPlayerTotals = useCallback(() => {
    const totals = {};
    state.seating.forEach(p => { totals[p] = 0; });
    state.rounds.forEach(r => {
      totals[r.player] = (totals[r.player] || 0) + r.gameValue;
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

    return {
      totalGames, wins, losses, winRate,
      totalPoints, avgPoints, seegerTotal,
      typeDistribution, rounds: playerRounds,
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
      currentRoles,
      // Actions
      addRound,
      resetSession,
      addPlayer,
      removePlayer,
      renamePlayer,
      reorderSeating,
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
