# Implementation Plan: Performance Optimization

## Overview

Eliminate unnecessary re-renders and expensive recomputations in the React component tree by applying `useMemo` memoization at multiple levels within the existing single-context `GameProvider`. This is a breaking API change: getter functions (`getPlayerTotals`, `getSeegerTotals`, `getPlayerRank`) are replaced with pre-computed values, and all consumers must be migrated.

## Tasks

- [x] 1. Memoize useSyncActions return value
  - [x] 1.1 Wrap useSyncActions return object in useMemo
    - Import `useMemo` in `src/hooks/useSyncActions.js`
    - Wrap the returned object literal in `useMemo` with all action callbacks as dependencies
    - The individual `useCallback` definitions remain unchanged
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 1.2 Write property test for actions object referential stability
    - **Property 6: Actions object referential stability**
    - **Validates: Requirements 4.1, 4.2**
    - Create `src/hooks/useSyncActions.property.test.jsx`
    - Use fast-check to verify the returned object reference is stable across re-renders when no callback dependency changes

- [x] 2. Refactor GameContext provider with useMemo derived data
  - [x] 2.1 Replace getter functions with pre-computed useMemo values in GameContext
    - Modify `src/context/GameContext.jsx`
    - Import `useMemo` (replace `useCallback` usage for derived data)
    - Add `useMemo` for `players` (filter out `'-'` from `state.seating`, dep: `[state.seating]`)
    - Add `useMemo` for `currentRoles` (call `getRoles(state.seating, state.geberIndex)`, deps: `[state.seating, state.geberIndex]`)
    - Add `useMemo` for `playerTotals` (call `computePlayerTotals`, deps: `[state.seating, state.rounds]`)
    - Add `useMemo` for `seegerTotals` (call `computeSeegerTotals`, deps: `[state.seating, state.rounds]`)
    - Add `useMemo` for `playerRankStandard` (call `computePlayerRank(seating, rounds, false)`, deps: `[state.seating, state.rounds]`)
    - Add `useMemo` for `playerRankSeeger` (call `computePlayerRank(seating, rounds, true)`, deps: `[state.seating, state.rounds]`)
    - Keep `getPlayerStats` as a memoized factory function (deps: `[state.rounds]`)
    - Keep `getActiveSpiellistenForSession` as a memoized factory function (deps: `[state.spiellisten]`)
    - Remove `getPlayerTotals`, `getSeegerTotals`, `getPlayerRank` callback definitions
    - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3_

  - [x] 2.2 Wrap the context value object in useMemo
    - Wrap the `<GameContext.Provider value={...}>` object in `useMemo`
    - Include all state fields, sync status, actions, and derived values as dependencies
    - Expose `players` (filtered, no `'-'`) instead of raw `state.seating` as the `players` property
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.3 Write property test for context value referential stability
    - **Property 1: Context value referential stability**
    - **Validates: Requirements 1.1, 1.2**
    - Create `src/context/GameContext.perf.property.test.jsx`
    - Use `@testing-library/react` + fast-check to render GameProvider and verify contextValue reference stability across re-renders with unchanged state

  - [x] 2.4 Write property test for derived data correctness
    - **Property 2: Derived data correctness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
    - In `src/context/GameContext.perf.property.test.jsx`
    - Generate random seating arrays and round sequences with fast-check
    - Assert `playerTotals === computePlayerTotals(seating, rounds)` and same for seeger/rank values

  - [x] 2.5 Write property test for derived data referential stability
    - **Property 3: Derived data referential stability**
    - **Validates: Requirements 2.5**
    - In `src/context/GameContext.perf.property.test.jsx`
    - Verify that when seating and rounds references are unchanged, derived value references remain identical

  - [x] 2.6 Write property test for players array filtering
    - **Property 7: Players array excludes placeholder entries**
    - **Validates: Requirements 5.3**
    - In `src/context/GameContext.perf.property.test.jsx`
    - Generate seating arrays containing `'-'` entries and verify `players` never contains `'-'`

  - [x] 2.7 Write property test for currentRoles computation
    - **Property 8: currentRoles computation correctness**
    - **Validates: Requirements 6.1**
    - In `src/context/GameContext.perf.property.test.jsx`
    - Generate valid seating/geberIndex combinations and verify memoized `currentRoles` deep-equals `getRoles(seating, geberIndex)`

- [x] 3. Migrate consumers of breaking API change
  - [x] 3.1 Migrate SkatScoreList to use pre-computed values
    - Modify `src/pages/SkatScoreList.jsx`
    - Replace `getPlayerTotals, getSeegerTotals, getPlayerRank` destructuring with `playerTotals, seegerTotals, playerRankStandard, playerRankSeeger`
    - Replace `players: allPlayers` with `players` (already filtered)
    - Remove `allPlayers.filter(p => p !== '-')` line
    - Replace `getPlayerTotals()` call with `playerTotals`
    - Replace `getSeegerTotals()` call with `seegerTotals`
    - Replace `getPlayerRank(false).filter(...)` with `playerRankStandard.filter(...)`
    - Replace `getPlayerRank(true).filter(...)` with `playerRankSeeger.filter(...)`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [x] 3.2 Migrate GameScoringEntry to use pre-computed values
    - Modify `src/pages/GameScoringEntry.jsx`
    - Replace `getPlayerRank, getPlayerTotals, getSeegerTotals` destructuring with `playerTotals, seegerTotals, playerRankStandard`
    - Replace `getPlayerTotals()` call with `playerTotals`
    - Replace `getSeegerTotals()` call with `seegerTotals`
    - Replace `getPlayerRank()` call with `playerRankStandard`
    - Note: `players` is already destructured directly (no `allPlayers` pattern here)
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [x] 3.3 Migrate Sidebar to use pre-computed values
    - Modify `src/components/Sidebar.jsx`
    - Replace `getPlayerTotals` destructuring with `playerTotals`
    - Remove `const totals = getPlayerTotals()` line, use `playerTotals` directly
    - _Requirements: 2.1, 2.6_

  - [x] 3.4 Migrate ScoreDistributionChart to use pre-computed values
    - Modify `src/components/ScoreDistributionChart.jsx`
    - Replace `getPlayerTotals, getSeegerTotals` destructuring with `playerTotals, seegerTotals`
    - Replace `getPlayerTotals()` call with `playerTotals`
    - Replace `getSeegerTotals()` call with `seegerTotals`
    - _Requirements: 2.1, 2.2, 2.6_

  - [x] 3.5 Migrate remaining consumers using `players: allPlayers` pattern
    - Modify `src/pages/StatistikenCharts.jsx`: replace `players: allPlayers` with `players`, remove filter line
    - Modify `src/pages/SpiellistenPage.jsx`: replace `players: allPlayers` with `players`, remove filter line
    - Modify `src/pages/TrophyShowcasePage.jsx`: replace `players: allPlayers` with `players`, remove filter line
    - Modify `src/pages/PlayerAnalytics.jsx`: replace `players: allPlayers` with `players`, remove filter line
    - Modify `src/components/GameTypeEditor.jsx`: replace `players: allPlayers` with `players`, remove filter line
    - _Requirements: 5.1, 5.3_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Optimize AchievementWatcher for incremental updates
  - [x] 5.1 Add deferred rebuild with requestIdleCallback for bulk changes
    - Modify `src/components/AchievementWatcher.jsx`
    - Add `rebuildingRef` (useRef, initialized to `false`)
    - In the bulk-change branch (session switch, multi-round delta, initial load): set `rebuildingRef.current = true`, use `requestIdleCallback` (with `setTimeout(fn, 0)` fallback) to rebuild snapshots for all players, then set `rebuildingRef.current = false`
    - Add guard: if `rebuildingRef.current` is true, skip celebration triggers and update `prevRoundCountRef` only
    - The single-round-added branch remains unchanged (already evaluates only `latestRound.player`)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 5.2 Write property test for incremental achievement detection
    - **Property 4: Incremental achievement detection targets only the active player**
    - **Validates: Requirements 3.1**
    - Create `src/components/AchievementWatcher.property.test.jsx`
    - Use fast-check to generate game states and verify that on +1 round, only the active player's achievements are computed

  - [x] 5.3 Write property test for bulk-load celebration suppression
    - **Property 5: Bulk-load suppresses achievement celebrations**
    - **Validates: Requirements 3.4**
    - In `src/components/AchievementWatcher.property.test.jsx`
    - Verify that when round count delta > 1, no celebration state is set until rebuild completes

- [x] 6. Update existing property test file
  - [x] 6.1 Update GameContext.property.test.jsx references
    - Modify `src/context/GameContext.property.test.jsx`
    - Update any references to `getPlayerTotals` in test descriptions/comments to reflect the new `playerTotals` API
    - Ensure existing property tests still pass with the new context shape
    - _Requirements: 2.6_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The breaking API change (Requirement 2.6) means tasks 2.1 and 3.x must be deployed together — consumers will break if only one side is updated
- The `players` property changes semantics: it was `state.seating` (including `'-'`), now it's filtered (excluding `'-'`)
- `getPlayerStats` and `getActiveSpiellistenForSession` remain as memoized factory functions (not pre-computed values) because they take parameters or return filtered subsets

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "2.5", "2.6", "2.7", "3.1", "3.2", "3.3", "3.4", "3.5"] },
    { "id": 4, "tasks": ["5.1", "6.1"] },
    { "id": 5, "tasks": ["5.2", "5.3"] }
  ]
}
```
