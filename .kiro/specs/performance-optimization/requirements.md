# Requirements Document

## Introduction

This feature eliminates the Chrome "Tab verlangsamt den Browser" popup in Skatastrophe by reducing unnecessary re-renders and expensive recomputations in the React component tree. The app handles sessions with 430+ rounds and 3–4 players; the current architecture recomputes derived data on every render and creates unstable object references that cascade re-renders through the entire tree. This optimization keeps the single-context architecture but applies targeted memoization and computation strategies.

## Glossary

- **GameContext**: The single React context provider (`GameContext.jsx`) that holds all game state, sync status, actions, and derived data for the application.
- **Context_Value**: The object passed to `GameContext.Provider`'s `value` prop, consumed by all components via `useGame()`.
- **Derived_Data**: Pre-computed statistics and rankings calculated from `seating` and `rounds` state (player totals, Seeger totals, player rank).
- **useSyncActions**: The custom hook (`useSyncActions.js`) that returns an object of async action handlers for Supabase synchronization.
- **AchievementWatcher**: The app-level component that monitors round additions and detects newly unlocked achievements and rank-up events.
- **Players_Array**: The `seating` array exposed as `players` on the context, consumed by SkatScoreList and other components.
- **currentRoles**: The object computed by `getRoles(seating, geberIndex)` containing geber, hoeren, sagen, and activePlayers for the current round.

## Requirements

### Requirement 1: Memoize Context Value Object

**User Story:** As a player using Skatastrophe during a long session, I want the app to remain responsive, so that I do not see browser slowdown warnings.

#### Acceptance Criteria

1. THE GameContext SHALL wrap the Context_Value object in `useMemo` so that a new object reference is produced only when at least one of its constituent values changes.
2. WHEN no state, sync status, or derived data has changed between renders, THE GameContext SHALL provide the identical Context_Value reference to consumers.
3. THE GameContext SHALL maintain a single unsplit context provider architecture.

### Requirement 2: Pre-compute Derived Data with useMemo

**User Story:** As a developer, I want derived statistics to be computed once per state change rather than on every consumer render, so that expensive iterations over 430+ rounds happen only when necessary.

#### Acceptance Criteria

1. THE GameContext SHALL expose `playerTotals` as a pre-computed `useMemo` value derived from `seating` and `rounds`, replacing the `getPlayerTotals` callback function.
2. THE GameContext SHALL expose `seegerTotals` as a pre-computed `useMemo` value derived from `seating` and `rounds`, replacing the `getSeegerTotals` callback function.
3. THE GameContext SHALL expose `playerRankStandard` as a pre-computed `useMemo` value containing the standard ranking array, replacing the `getPlayerRank(false)` callback invocation.
4. THE GameContext SHALL expose `playerRankSeeger` as a pre-computed `useMemo` value containing the Seeger-Fabian ranking array, replacing the `getPlayerRank(true)` callback invocation.
5. WHEN `seating` or `rounds` have not changed, THE GameContext SHALL return the same object references for `playerTotals`, `seegerTotals`, `playerRankStandard`, and `playerRankSeeger`.
6. THE GameContext SHALL remove the `getPlayerTotals`, `getSeegerTotals`, and `getPlayerRank` callback functions from the Context_Value, constituting a breaking API change for consumers.

### Requirement 3: Optimize AchievementWatcher for Incremental Updates

**User Story:** As a player adding a round, I want achievement detection to evaluate only the active player rather than all players, so that the computation completes without blocking the UI.

#### Acceptance Criteria

1. WHEN exactly one round is added, THE AchievementWatcher SHALL compute unlocked achievements and rank snapshots only for the player of the newly added round.
2. WHEN a session is loaded or rounds change by more than one entry, THE AchievementWatcher SHALL rebuild the full snapshot for all players using a deferred or batched strategy that does not block the main thread.
3. THE AchievementWatcher SHALL maintain the existing component architecture without introducing a Web Worker.
4. WHILE the full snapshot rebuild is in progress, THE AchievementWatcher SHALL not trigger false-positive achievement celebrations.

### Requirement 4: Memoize useSyncActions Return Value

**User Story:** As a developer, I want the actions object from `useSyncActions` to maintain a stable reference, so that it does not cause the Context_Value to change on every render.

#### Acceptance Criteria

1. THE useSyncActions hook SHALL return a memoized object whose reference remains stable when none of its constituent action callbacks have changed.
2. WHEN the `state` parameter changes but no action callback dependency has changed, THE useSyncActions hook SHALL return the same object reference.
3. THE useSyncActions hook SHALL continue to provide all existing action handlers (addRound, deleteRound, updateRound, resetSession, createNewTable, switchSession, refreshFromDB, clearSession, addPlayer, removePlayer, renamePlayer, reorderSeating, setGeberIndex, renameTable, createSpielliste, setActiveSpielliste, closeSpielliste).

### Requirement 5: Stabilize Players Array Reference

**User Story:** As a developer, I want the `players` array on the context to maintain a stable reference when the seating has not changed, so that consumers like SkatScoreList do not re-render unnecessarily.

#### Acceptance Criteria

1. THE GameContext SHALL expose the `players` property as a memoized reference that changes only when the `seating` array content changes.
2. WHEN the `seating` array content is identical between renders, THE GameContext SHALL provide the same `players` array reference.
3. THE GameContext SHALL filter out placeholder entries (the `'-'` string) from the `players` array before exposing it to consumers.

### Requirement 6: Memoize currentRoles Computation

**User Story:** As a developer, I want the `currentRoles` object to maintain a stable reference when seating and geberIndex have not changed, so that it does not trigger unnecessary re-renders in consuming components.

#### Acceptance Criteria

1. THE GameContext SHALL compute `currentRoles` using `useMemo` with `seating` and `geberIndex` as dependencies.
2. WHEN `seating` and `geberIndex` have not changed, THE GameContext SHALL return the same `currentRoles` object reference.
3. THE GameContext SHALL continue to expose `currentRoles` with the same shape: `{ geber, hoeren, sagen, activePlayers }`.
