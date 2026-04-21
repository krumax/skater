# Project Structure

## Top-Level Layout

```
src/
  lib/          # Pure logic - no React, fully unit-testable
  hooks/        # Custom React hooks
  context/      # React context providers
  components/   # Reusable UI components
  pages/        # Route-level page components
  App.jsx       # Router setup, provider tree
  main.jsx      # Entry point
supabase/
  migrations/   # SQL migration files (run manually in Supabase dashboard)
assets/         # Static CSV data files
public/         # Static assets served as-is
```

## `src/lib/` - Core Logic

| File | Purpose |
|------|---------|
| `skatScoring.js` | Scoring engine: game value, multiplier, Seeger-Fabian calculation |
| `gameReducer.js` | Pure reducer for all game state mutations |
| `playerStats.js` | Derived stats: totals, streaks, Brot/Baguette, achievement unlocks |
| `playerRanking.js` | Player ranking helpers |
| `playerLevel.js` | Achievement-based level computation |
| `achievementConfig.js` | Achievement matrix row/column definitions |
| `syncService.js` | All Supabase DB operations (camelCase ↔ snake_case mapping) |
| `supabaseClient.js` | Supabase client singleton |
| `skatSprueche.js` | Skat quote data |
| `tokens.js` | Design token constants |

## `src/hooks/`

| File | Purpose |
|------|---------|
| `useSyncActions.js` | All async game actions (optimistic dispatch → DB sync) |
| `useSessionInit.js` | Session loading on mount |
| `useGameForm.js` | Form state for scoring entry |
| `useRoundCounter.js` | Geber rotation counter |
| `useDefenseData.js` | Defense matrix data derivation |
| `useMatrixData.js` | Achievement matrix data derivation |

## `src/context/`
- `GameContext.jsx` - single app-wide context; combines `gameReducer` + `useSyncActions` + derived data helpers (`getPlayerTotals`, `getSeegerTotals`, `getPlayerRank`, `getPlayerStats`)

## `src/components/`
- `scoring/` - sub-components for the game entry form (PlayerSelector, GameTypeSelector, ModifierChips, etc.)
- `analytics/` - chart and analytics card components (Recharts-based)
- Top-level: Sidebar, PasswordGate, AchievementWatcher, AchievementCelebration, SkatSpruchToast, ScoreDistributionChart, GameTypeEditor

## `src/pages/` - Routes

| Route | File |
|-------|------|
| `/` | `GameScoringEntry.jsx` |
| `/analytics` | `PlayerAnalytics.jsx` |
| `/history` | `SkatScoreList.jsx` |
| `/statistiken` | `StatistikenCharts.jsx` |
| `/players` | `PlayerSettings.jsx` |
| `/info` | `SkatInfo.jsx` |

## Key Conventions

- **Pure logic in `src/lib/`** - no React imports, no side effects; makes unit and property testing straightforward
- **Optimistic updates** - `useSyncActions` dispatches to the reducer immediately, then syncs to Supabase asynchronously
- **DB field mapping** - `syncService.js` is the only place that translates between `camelCase` (app) and `snake_case` (DB)
- **Test co-location** - test files live next to the source file they test
- **Property tests** use `fast-check` and are in `*.property.test.jsx` files; they validate invariants of the scoring engine and reducer
- **CSS** uses CSS custom properties (`var(--token-name)`) defined in `src/index.css`; inline styles use these tokens for dynamic values
- **German UI strings** - all user-visible text is in German; code identifiers and comments are in English
