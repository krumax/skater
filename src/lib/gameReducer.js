/**
 * gameReducer.js — Pure reducer for game state.
 *
 * No React imports, no side effects — fully unit-testable.
 */
import { calculateSeegerFabian } from './skatScoring';
import { computeListWinner } from './spiellistenUtils';

export const initialState = {
  seating: [],
  geberIndex: 0,
  rounds: [],
  currentRound: 1,
  sessionId: Date.now(),
  tableName: '',
  spiellisten: [],
  activeSpiellisteId: null,
};

export function getRoles(seating, geberIndex) {
  const n = seating.length;
  if (n === 0) return { geber: '', hoeren: '', sagen: '', activePlayers: [] };
  const geber  = seating[geberIndex % n];
  const hoeren = seating[(geberIndex + 1) % n];
  const sagen  = seating[(geberIndex + 2) % n];
  // Bei 4 Spielern: Geber sitzt aus (Skat-Regel).
  // activePlayers in fester Sitzordnung damit die Reihenfolge in der UI stabil bleibt.
  const activePlayers = n === 4
    ? seating.filter(p => p !== geber)
    : seating;
  return { geber, hoeren, sagen, activePlayers };
}

export function gameReducer(state, action) {
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
        spiellisteId: state.activeSpiellisteId,
      };
      const roles = getRoles(state.seating, state.geberIndex);
      round.roles = { geber: roles.geber, hoeren: roles.hoeren, sagen: roles.sagen };
      round.seegerScores = calculateSeegerFabian({
        declarer: round.player,
        allPlayers: state.seating,
        gameValue: round.gameValue,
        won: round.won,
      });

      const newRounds = [...state.rounds, round];
      const now = new Date().toISOString();

      // Update lastTouchedAt of active list
      let newSpiellisten = state.spiellisten;
      let newActiveSpiellisteId = state.activeSpiellisteId;

      if (state.activeSpiellisteId) {
        const activeListe = state.spiellisten.find(l => l.id === state.activeSpiellisteId);
        if (activeListe) {
          const listRounds = newRounds.filter(r => r.spiellisteId === state.activeSpiellisteId);

          if (listRounds.length >= activeListe.roundCount) {
            // Auto-close the list
            const winner = computeListWinner(state.seating, listRounds);
            newSpiellisten = state.spiellisten.map(l =>
              l.id === state.activeSpiellisteId
                ? { ...l, status: 'abgeschlossen', winner, lastTouchedAt: now }
                : l
            );
            newActiveSpiellisteId = null;
          } else {
            // Just update lastTouchedAt
            newSpiellisten = state.spiellisten.map(l =>
              l.id === state.activeSpiellisteId
                ? { ...l, lastTouchedAt: now }
                : l
            );
          }
        }
      }

      return {
        ...state,
        rounds: newRounds,
        currentRound: state.currentRound + 1,
        geberIndex: (state.geberIndex + 1) % state.seating.length,
        spiellisten: newSpiellisten,
        activeSpiellisteId: newActiveSpiellisteId,
      };
    }

    case 'LOAD_SESSION': {
      const { session, rounds } = action.payload;
      const rawSeating = session.seating ?? [];
      const cleanSeating = rawSeating.filter(p => p !== '-');
      const seating = cleanSeating.length >= 1 ? cleanSeating : rawSeating;
      return {
        ...state,
        seating,
        geberIndex: session.geber_index,
        currentRound: session.current_round,
        rounds,
        sessionId: session.id,
        tableName: session.table_name ?? '',
        spiellisten: action.payload.spiellisten ?? [],
        activeSpiellisteId: action.payload.activeSpiellisteId ?? null,
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
      return { ...state, seating: action.payload, geberIndex: 0 };

    case 'ADD_PLAYER': {
      if (state.seating.includes(action.payload)) return state;
      if (state.seating.length >= 4) return state;
      return { ...state, seating: [...state.seating, action.payload] };
    }

    case 'REMOVE_PLAYER': {
      if (state.seating.length <= 3 && action.payload !== '-') return state;
      const newSeating = state.seating.filter(p => p !== action.payload);
      return {
        ...state,
        seating: newSeating,
        geberIndex: state.geberIndex % Math.max(newSeating.length, 1),
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
            geber:  r.roles.geber  === oldName ? newName : r.roles.geber,
            hoeren: r.roles.hoeren === oldName ? newName : r.roles.hoeren,
            sagen:  r.roles.sagen  === oldName ? newName : r.roles.sagen,
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
      const { fromIndex, toIndex } = action.payload;
      const newSeating = [...state.seating];
      const [moved] = newSeating.splice(fromIndex, 1);
      newSeating.splice(toIndex, 0, moved);
      return { ...state, seating: newSeating, geberIndex: 0 };
    }

    case 'SET_GEBER_INDEX':
      return { ...state, geberIndex: action.payload % state.seating.length };

    case 'UPDATE_ROUND': {
      const { id, patch } = action.payload;
      return {
        ...state,
        rounds: state.rounds.map(r => r.id === id ? { ...r, ...patch } : r),
      };
    }

    case 'DELETE_ROUND': {
      const newRounds = state.rounds.filter(r => r.id !== action.payload);
      return {
        ...state,
        rounds: newRounds,
        currentRound: newRounds.length + 1,
        geberIndex: newRounds.length % state.seating.length,
      };
    }

    case 'SET_TABLE_NAME':
      return { ...state, tableName: action.payload };

    case 'ADD_SPIELLISTE': {
      return {
        ...state,
        spiellisten: [...state.spiellisten, action.payload],
        activeSpiellisteId: action.payload.id,
      };
    }

    case 'SET_ACTIVE_SPIELLISTE': {
      const id = action.payload;
      if (id !== null) {
        const liste = state.spiellisten.find(l => l.id === id);
        if (!liste || liste.status === 'abgeschlossen') return state;
      }
      const now = new Date().toISOString();
      return {
        ...state,
        activeSpiellisteId: id,
        spiellisten: id === null ? state.spiellisten : state.spiellisten.map(l =>
          l.id === id ? { ...l, lastTouchedAt: now } : l
        ),
      };
    }

    case 'CLOSE_SPIELLISTE': {
      const spiellisteId = action.payload;
      const listRounds = state.rounds.filter(r => r.spiellisteId === spiellisteId);
      const winner = computeListWinner(state.seating, listRounds);
      return {
        ...state,
        spiellisten: state.spiellisten.map(l =>
          l.id === spiellisteId
            ? { ...l, status: 'abgeschlossen', winner }
            : l
        ),
        activeSpiellisteId: state.activeSpiellisteId === spiellisteId ? null : state.activeSpiellisteId,
      };
    }

    default:
      return state;
  }
}
