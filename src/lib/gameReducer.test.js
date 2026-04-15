import { describe, it, expect } from 'vitest';
import { gameReducer, initialState, getRoles } from './gameReducer';

// ── getRoles ──────────────────────────────────────────────────────────────────

describe('getRoles', () => {
  it('returns empty roles for empty seating', () => {
    const roles = getRoles([], 0);
    expect(roles.geber).toBe('');
    expect(roles.activePlayers).toEqual([]);
  });

  it('assigns roles correctly for 3 players', () => {
    const roles = getRoles(['Alice', 'Bob', 'Carol'], 0);
    expect(roles.geber).toBe('Alice');
    expect(roles.hoeren).toBe('Bob');
    expect(roles.sagen).toBe('Carol');
    expect(roles.activePlayers).toEqual(['Alice', 'Bob', 'Carol']);
  });

  it('rotates roles with geberIndex', () => {
    const roles = getRoles(['Alice', 'Bob', 'Carol'], 1);
    expect(roles.geber).toBe('Bob');
    expect(roles.hoeren).toBe('Carol');
    expect(roles.sagen).toBe('Alice');
  });

  it('geber sits out with 4 players', () => {
    const roles = getRoles(['Alice', 'Bob', 'Carol', 'Dave'], 0);
    expect(roles.geber).toBe('Alice');
    expect(roles.activePlayers).not.toContain('Alice');
    expect(roles.activePlayers).toHaveLength(3);
  });
});

// ── ADD_ROUND ─────────────────────────────────────────────────────────────────

describe('ADD_ROUND', () => {
  const state = {
    ...initialState,
    seating: ['Alice', 'Bob', 'Carol'],
    geberIndex: 0,
    rounds: [],
    currentRound: 1,
  };

  it('appends a round and increments currentRound', () => {
    const next = gameReducer(state, {
      type: 'ADD_ROUND',
      payload: { player: 'Alice', gameType: 'spade', gameValue: 18, won: true, isBock: false },
    });
    expect(next.rounds).toHaveLength(1);
    expect(next.currentRound).toBe(2);
  });

  it('doubles gameValue when isBock is true', () => {
    const next = gameReducer(state, {
      type: 'ADD_ROUND',
      payload: { player: 'Alice', gameType: 'spade', gameValue: 18, won: true, isBock: true },
    });
    expect(next.rounds[0].gameValue).toBe(36);
  });

  it('rotates geberIndex after each round', () => {
    const next = gameReducer(state, {
      type: 'ADD_ROUND',
      payload: { player: 'Alice', gameType: 'spade', gameValue: 18, won: true, isBock: false },
    });
    expect(next.geberIndex).toBe(1);
  });

  it('wraps geberIndex around seating length', () => {
    const s = { ...state, geberIndex: 2 };
    const next = gameReducer(s, {
      type: 'ADD_ROUND',
      payload: { player: 'Carol', gameType: 'spade', gameValue: 18, won: true, isBock: false },
    });
    expect(next.geberIndex).toBe(0);
  });
});

// ── REMOVE_PLAYER ─────────────────────────────────────────────────────────────

describe('REMOVE_PLAYER', () => {
  it('does not remove when seating has exactly 3 real players', () => {
    const state = { ...initialState, seating: ['Alice', 'Bob', 'Carol'] };
    const next = gameReducer(state, { type: 'REMOVE_PLAYER', payload: 'Alice' });
    expect(next.seating).toHaveLength(3);
  });

  it('removes a 4th player', () => {
    const state = { ...initialState, seating: ['Alice', 'Bob', 'Carol', 'Dave'] };
    const next = gameReducer(state, { type: 'REMOVE_PLAYER', payload: 'Dave' });
    expect(next.seating).toHaveLength(3);
    expect(next.seating).not.toContain('Dave');
  });

  it('always removes placeholder "-" regardless of seating size', () => {
    // REMOVE_PLAYER filters ALL entries matching the name.
    // With 3 "-" entries, all 3 get removed (filter removes all matches).
    const state = { ...initialState, seating: ['-', 'Bob', 'Carol'] };
    const next = gameReducer(state, { type: 'REMOVE_PLAYER', payload: '-' });
    expect(next.seating).toHaveLength(2);
    expect(next.seating).not.toContain('-');
  });
});

// ── RENAME_PLAYER ─────────────────────────────────────────────────────────────

describe('RENAME_PLAYER', () => {
  it('renames player in seating and rounds', () => {
    const state = {
      ...initialState,
      seating: ['Alice', 'Bob', 'Carol'],
      rounds: [{ id: 1, player: 'Alice', roles: { geber: 'Alice', hoeren: 'Bob', sagen: 'Carol' }, seegerScores: { Alice: 50, Bob: -40, Carol: -40 } }],
    };
    const next = gameReducer(state, { type: 'RENAME_PLAYER', payload: { oldName: 'Alice', newName: 'Anna' } });
    expect(next.seating).toContain('Anna');
    expect(next.seating).not.toContain('Alice');
    expect(next.rounds[0].player).toBe('Anna');
    expect(next.rounds[0].roles.geber).toBe('Anna');
    expect(next.rounds[0].seegerScores['Anna']).toBe(50);
    expect(next.rounds[0].seegerScores['Alice']).toBeUndefined();
  });

  it('does not rename if newName already exists', () => {
    const state = { ...initialState, seating: ['Alice', 'Bob', 'Carol'], rounds: [] };
    const next = gameReducer(state, { type: 'RENAME_PLAYER', payload: { oldName: 'Alice', newName: 'Bob' } });
    expect(next.seating).toContain('Alice');
  });
});

// ── DELETE_ROUND ──────────────────────────────────────────────────────────────

describe('DELETE_ROUND', () => {
  it('removes the round and recalculates counters', () => {
    const state = {
      ...initialState,
      seating: ['Alice', 'Bob', 'Carol'],
      rounds: [
        { id: 1, player: 'Alice' },
        { id: 2, player: 'Bob' },
      ],
      currentRound: 3,
    };
    const next = gameReducer(state, { type: 'DELETE_ROUND', payload: 1 });
    expect(next.rounds).toHaveLength(1);
    expect(next.currentRound).toBe(2);
  });
});

// ── RESET_SESSION ─────────────────────────────────────────────────────────────

describe('RESET_SESSION', () => {
  it('clears rounds but keeps seating', () => {
    const state = {
      ...initialState,
      seating: ['Alice', 'Bob', 'Carol'],
      rounds: [{ id: 1 }],
      currentRound: 2,
    };
    const next = gameReducer(state, { type: 'RESET_SESSION' });
    expect(next.rounds).toHaveLength(0);
    expect(next.seating).toEqual(['Alice', 'Bob', 'Carol']);
    expect(next.currentRound).toBe(1);
  });
});

// ── REORDER_SEATING ───────────────────────────────────────────────────────────

describe('REORDER_SEATING', () => {
  const state = {
    ...initialState,
    seating: ['Alice', 'Bob', 'Carol'],
    geberIndex: 2,
  };

  it('verschiebt einen Spieler von Index 0 nach Index 1 (nach unten)', () => {
    const next = gameReducer(state, {
      type: 'REORDER_SEATING',
      payload: { fromIndex: 0, toIndex: 1 },
    });
    expect(next.seating).toEqual(['Bob', 'Alice', 'Carol']);
  });

  it('verschiebt einen Spieler von Index 2 nach Index 1 (nach oben)', () => {
    const next = gameReducer(state, {
      type: 'REORDER_SEATING',
      payload: { fromIndex: 2, toIndex: 1 },
    });
    expect(next.seating).toEqual(['Alice', 'Carol', 'Bob']);
  });

  it('setzt geberIndex auf 0 nach Umsortierung', () => {
    const next = gameReducer(state, {
      type: 'REORDER_SEATING',
      payload: { fromIndex: 0, toIndex: 2 },
    });
    expect(next.geberIndex).toBe(0);
  });

  it('Up-Button-Logik: i > 0 → reorderSeating(i, i-1)', () => {
    // Simuliert: Spieler an Position 1 nach oben
    const next = gameReducer(state, {
      type: 'REORDER_SEATING',
      payload: { fromIndex: 1, toIndex: 0 },
    });
    expect(next.seating[0]).toBe('Bob');
    expect(next.seating[1]).toBe('Alice');
  });

  it('Down-Button-Logik: i < length-1 → reorderSeating(i, i+1)', () => {
    // Simuliert: Spieler an Position 1 nach unten
    const next = gameReducer(state, {
      type: 'REORDER_SEATING',
      payload: { fromIndex: 1, toIndex: 2 },
    });
    expect(next.seating[1]).toBe('Carol');
    expect(next.seating[2]).toBe('Bob');
  });

  it('4-Spieler: Umsortierung funktioniert korrekt', () => {
    const s4 = { ...initialState, seating: ['Alice', 'Bob', 'Carol', 'Dave'] };
    const next = gameReducer(s4, {
      type: 'REORDER_SEATING',
      payload: { fromIndex: 3, toIndex: 0 },
    });
    expect(next.seating).toEqual(['Dave', 'Alice', 'Bob', 'Carol']);
  });
});
