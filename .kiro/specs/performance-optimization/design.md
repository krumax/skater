# Technical Design Document

## Overview

This document describes the architecture for eliminating unnecessary re-renders and expensive recomputations in Skatastrophe's React component tree. The optimization targets a single `GameContext` provider that serves 430+ rounds across 3–4 players. The strategy applies `useMemo` memoization at multiple levels—context value, derived data, actions object, players array, and roles—without splitting the context or introducing Web Workers.

## Architecture

The optimization operates on four layers within the existing single-context architecture:

```
┌─────────────────────────────────────────────────────────┐
│  GameProvider                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Layer 1: Memoized Derived Data (useMemo)         │  │
│  │  playerTotals, seegerTotals, playerRankStandard,  │  │
│  │  playerRankSeeger, players, currentRoles          │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Layer 2: Stable Actions Object (useMemo)         │  │
│  │  useSyncActions returns memoized object           │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Layer 3: Memoized Context Value (useMemo)        │  │
│  │  Single object combining state + derived + actions│  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Layer 4: Incremental AchievementWatcher          │  │
│  │  Single-player eval on +1 round, deferred rebuild │  │
│  │  on bulk changes                                  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. GameContext Provider (Modified)

**File:** `src/context/GameContext.jsx`

The provider replaces getter callback functions with pre-computed `useMemo` values and wraps the entire context value in `useMemo`.

```jsx
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
  const [syncError, setSyncError] = useState(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useSessionInit(dispatch, setSyncStatus, setSyncError, setSessionLoaded);

  // Layer 2: Stable actions object
  const actions = useSyncActions(state, dispatch, setSyncStatus, setSyncError);

  // Layer 1: Pre-computed derived data
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

  // Layer 3: Memoized context value
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
    // Actions
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
```

### 2. useSyncActions Hook (Modified)

**File:** `src/hooks/useSyncActions.js`

The hook wraps its return value in `useMemo` so the actions object reference is stable when no callback dependency changes. Individual callbacks already use `useCallback`; the outer `useMemo` prevents the object literal from creating a new reference on every render.

```javascript
export function useSyncActions(state, dispatch, setSyncStatus, setSyncError) {
  // ... all useCallback definitions remain unchanged ...

  const addRound = useCallback(async (roundData) => { /* ... */ }, [/* deps */]);
  const deleteRound = useCallback(async (round) => { /* ... */ }, [/* deps */]);
  // ... etc ...

  // Stable return object
  return useMemo(() => ({
    addRound, deleteRound, updateRound,
    resetSession, createNewTable, switchSession, refreshFromDB, clearSession,
    addPlayer, removePlayer, renamePlayer, reorderSeating, setGeberIndex, renameTable,
    createSpielliste, setActiveSpielliste, closeSpielliste,
  }), [
    addRound, deleteRound, updateRound,
    resetSession, createNewTable, switchSession, refreshFromDB, clearSession,
    addPlayer, removePlayer, renamePlayer, reorderSeating, setGeberIndex, renameTable,
    createSpielliste, setActiveSpielliste, closeSpielliste,
  ]);
}
```

### 3. AchievementWatcher (Modified)

**File:** `src/components/AchievementWatcher.jsx`

The component applies two strategies based on the delta size:

- **Single round added (+1):** Compute achievements and rank only for `latestRound.player` (existing behavior, already correct).
- **Bulk change (session load, >1 round delta):** Rebuild all snapshots using `requestIdleCallback` (or `setTimeout(fn, 0)` fallback) to avoid blocking the main thread. During rebuild, a `rebuildingRef` flag suppresses celebration triggers.

```jsx
const AchievementWatcher = () => {
  const { rounds, players, sessionId } = useGame();
  const [celebration, setCelebration] = useState(null);
  const [spruch, setSpruch] = useState(null);
  const [spruchWon, setSpruchWon] = useState(true);

  const snapshotRef = useRef(null);
  const rankSnapshotRef = useRef(null);
  const prevRoundCountRef = useRef(rounds.length);
  const prevSessionIdRef = useRef(sessionId);
  const rebuildingRef = useRef(false);

  useEffect(() => {
    // Bulk change: session switch or multi-round delta
    if (
      snapshotRef.current === null ||
      sessionId !== prevSessionIdRef.current ||
      rounds.length > prevRoundCountRef.current + 1
    ) {
      rebuildingRef.current = true;
      prevRoundCountRef.current = rounds.length;
      prevSessionIdRef.current = sessionId;

      const scheduleRebuild = window.requestIdleCallback || ((cb) => setTimeout(cb, 0));
      scheduleRebuild(() => {
        const snap = {};
        const rankSnap = {};
        players.forEach(p => {
          const { keys } = computeUnlockedKeys(rounds, p);
          snap[p] = keys;
          rankSnap[p] = computeRankSnapshot(rounds, p);
        });
        snapshotRef.current = snap;
        rankSnapshotRef.current = rankSnap;
        rebuildingRef.current = false;
      });
      return;
    }

    // Deletion or no change
    if (rounds.length <= prevRoundCountRef.current) {
      prevRoundCountRef.current = rounds.length;
      return;
    }

    // Guard: don't fire during rebuild
    if (rebuildingRef.current) {
      prevRoundCountRef.current = rounds.length;
      return;
    }

    // Exactly ONE round added — evaluate only that player
    const latestRound = rounds[rounds.length - 1];
    if (!latestRound) return;

    const player = latestRound.player;
    // ... existing single-player achievement detection logic ...

    prevRoundCountRef.current = rounds.length;
    prevSessionIdRef.current = sessionId;
  }, [rounds, players, sessionId]);

  // ... render ...
};
```

### 4. Consumer Migration (SkatScoreList Example)

**File:** `src/pages/SkatScoreList.jsx`

Consumers switch from calling getter functions to reading pre-computed values:

```jsx
// Before (breaking API)
const { rounds, players: allPlayers, getPlayerTotals, getSeegerTotals, getPlayerRank } = useGame();
const players = allPlayers.filter(p => p !== '-');
const standardTotals = getPlayerTotals();
const seegerTotals = getSeegerTotals();
const standardRank = getPlayerRank(false).filter(e => e.name !== '-');
const seegerRank = getPlayerRank(true).filter(e => e.name !== '-');

// After
const { rounds, players, playerTotals, seegerTotals, playerRankStandard, playerRankSeeger } = useGame();
const standardRank = playerRankStandard.filter(e => e.name !== '-');
const seegerRank = playerRankSeeger.filter(e => e.name !== '-');
```

### Context Value Shape (Post-Migration)

```typescript
interface GameContextValue {
  // State (unchanged)
  seating: string[];
  players: string[];              // filtered, memoized (no '-')
  rounds: Round[];
  currentRound: number;
  sessionId: string | number;
  geberIndex: number;
  tableName: string;
  currentRoles: CurrentRoles;     // memoized
  spiellisten: Spielliste[];
  activeSpiellisteId: string | null;

  // Sync (unchanged)
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncError: string | null;
  sessionLoaded: boolean;

  // Actions (stable reference via useMemo)
  addRound: (roundData: RoundData) => Promise<void>;
  deleteRound: (round: Round) => Promise<void>;
  updateRound: (round: Round, patch: Partial<Round>) => Promise<{ error: any }>;
  resetSession: () => Promise<void>;
  createNewTable: (seating: string[], tableName?: string) => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
  refreshFromDB: () => Promise<void>;
  clearSession: () => void;
  addPlayer: (name: string) => Promise<void>;
  removePlayer: (name: string) => Promise<void>;
  renamePlayer: (oldName: string, newName: string) => Promise<void>;
  reorderSeating: (fromIndex: number, toIndex: number) => Promise<void>;
  setGeberIndex: (index: number) => Promise<void>;
  renameTable: (name: string) => Promise<void>;
  createSpielliste: (name: string, roundCount: number) => Promise<void>;
  setActiveSpielliste: (id: string | null) => Promise<void>;
  closeSpielliste: (spiellisteId: string) => Promise<void>;

  // Derived (pre-computed, BREAKING CHANGE)
  playerTotals: Record<string, number>;
  seegerTotals: Record<string, number>;
  playerRankStandard: RankEntry[];
  playerRankSeeger: RankEntry[];
  getPlayerStats: (playerName: string) => PlayerStats;
  getActiveSpiellistenForSession: () => Spielliste[];
}

interface CurrentRoles {
  geber: string;
  hoeren: string;
  sagen: string;
  activePlayers: string[];
}

interface RankEntry {
  name: string;
  score: number;
  rank: number;
}
```

### Removed API (Breaking Change)

```typescript
// These are REMOVED from the context value:
getPlayerTotals: () => Record<string, number>;    // replaced by playerTotals
getSeegerTotals: () => Record<string, number>;    // replaced by seegerTotals
getPlayerRank: (useSeeger: boolean) => RankEntry[]; // replaced by playerRankStandard / playerRankSeeger
```

## Data Models

No data model changes. The optimization is purely a computation/memoization layer over existing state shapes (`seating: string[]`, `rounds: Round[]`, `geberIndex: number`).

## Error Handling

- **requestIdleCallback unavailability:** Falls back to `setTimeout(fn, 0)` for environments without `requestIdleCallback` support.
- **Celebration suppression during rebuild:** The `rebuildingRef` flag prevents false-positive achievement celebrations while the deferred snapshot rebuild is in progress. Once the rebuild completes, the flag is cleared and normal detection resumes.
- **Empty seating/rounds:** All `useMemo` computations handle empty arrays gracefully (the underlying pure functions in `playerStats.js` already return empty objects/arrays for empty inputs).

## Testing Strategy

- **Property-based tests** (fast-check, `*.property.test.jsx`): Validate referential stability and computation correctness by generating random seating arrays, round sequences, and geberIndex values. Minimum 100 iterations per property.
- **Unit tests** (Vitest, `*.test.js`): Verify the breaking API change (removed getters), the shape of the context value, and specific edge cases (empty seating, zero rounds).
- **Integration tests** (`*.test.jsx`): Render `GameProvider` with `@testing-library/react`, trigger state changes, and assert that consumers receive stable references when inputs are unchanged.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Context value referential stability

*For any* sequence of renders where `state`, `syncStatus`, `syncError`, `sessionLoaded`, and all derived values remain unchanged, the `contextValue` object returned by `GameProvider` SHALL be the identical reference (Object.is equality).

**Validates: Requirements 1.1, 1.2**

### Property 2: Derived data correctness

*For any* valid `seating` array and `rounds` array, the pre-computed context values SHALL satisfy:
- `playerTotals` equals `computePlayerTotals(seating, rounds)`
- `seegerTotals` equals `computeSeegerTotals(seating, rounds)`
- `playerRankStandard` deep-equals `computePlayerRank(seating, rounds, false)`
- `playerRankSeeger` deep-equals `computePlayerRank(seating, rounds, true)`

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 3: Derived data referential stability

*For any* two consecutive renders where `seating` and `rounds` references have not changed, the `playerTotals`, `seegerTotals`, `playerRankStandard`, and `playerRankSeeger` values SHALL be the identical references.

**Validates: Requirements 2.5**

### Property 4: Incremental achievement detection targets only the active player

*For any* game state and any single newly added round, the AchievementWatcher SHALL invoke `computeUnlockedKeys` and `computeRankSnapshot` only for `latestRound.player`, not for any other player in the session.

**Validates: Requirements 3.1**

### Property 5: Bulk-load suppresses achievement celebrations

*For any* round count delta greater than 1 (session load, multi-round sync), the AchievementWatcher SHALL not set any celebration state until the deferred snapshot rebuild has completed.

**Validates: Requirements 3.4**

### Property 6: Actions object referential stability

*For any* render where no `useCallback` dependency within `useSyncActions` has changed, the returned actions object SHALL be the identical reference, even if the `state` parameter itself is a new object.

**Validates: Requirements 4.1, 4.2**

### Property 7: Players array excludes placeholder entries

*For any* `seating` array (including arrays containing `'-'` entries), the `players` value exposed on the context SHALL never contain the string `'-'`.

**Validates: Requirements 5.3**

### Property 8: currentRoles computation correctness

*For any* valid `seating` array (length ≥ 1) and `geberIndex` (0 ≤ geberIndex < seating.length), the memoized `currentRoles` SHALL deep-equal `getRoles(seating, geberIndex)`.

**Validates: Requirements 6.1**
