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
landing/        # Static landing page (HTML/CSS/JS), served at root /
scripts/        # Build scripts (copy-landing.js)
supabase/
  migrations/   # SQL migration files (run manually in Supabase dashboard)
assets/         # Static assets (icons, analysis docs)
public/         # Static assets served as-is (favicons, screenshots, sitemap)
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
| `claimValidation.js` | Validation logic for player identity claim system |
| `spiellistenUtils.js` | Utilities for Spiellisten (game list) feature |
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
| `useDefeatData.js` | Defeat matrix data derivation |
| `useMatrixData.js` | Achievement matrix data derivation |
| `useProfileData.js` | Profile data for MeinProfil page |
| `useSuitLabel.js` | Suit label/display logic (iconset-aware) |
| `useTrophyData.js` | Trophy showcase data derivation |

## `src/context/`

| File | Purpose |
|------|---------|
| `GameContext.jsx` | App-wide game state; combines `gameReducer` + `useSyncActions` + derived data helpers (`getPlayerTotals`, `getSeegerTotals`, `getPlayerRank`, `getPlayerStats`) |
| `IconsetContext.jsx` | Provides icon set selection (Altenburg card suit icon variants) |

## `src/components/`

### Top-level components
- `Sidebar` - navigation sidebar
- `AuthGate` - password/auth protection gate
- `AchievementWatcher` - monitors state for achievement unlocks
- `AchievementCelebration` - celebration animation on unlock
- `SkatSpruchToast` - random Skat quote toast
- `ScoreDistributionChart` - score distribution visualization
- `GameTypeEditor` - edit game type of existing rounds
- `UpdatePrompt` - PWA service worker update notification
- `ListenFortschritt` - progress indicator for Spiellisten
- `SpiellistenSelector` - Spiellisten selection UI
- `SuitBadge` - suit badge display
- `SuitIcon` - suit icon component (iconset-aware)

### `scoring/` - Game entry form sub-components
- `PlayerSelector`, `GameTypeSelector`, `ModifierChips`, `SpitzenSelector`
- `AnsageSelector`, `EyeCountSelector`, `NullOutcomeSelector`
- `ResultDashboard`, `RolesBar`

### `analytics/` - Charts and analytics cards (Recharts-based)
- `AchievementCompletionCard`, `AchievementMatrix`, `AchievementMatrixPanel`
- `DefenseMatrix`, `DefeatMatrix`
- `GameTypeHeatmap`, `GameTypePieChart`
- `GameValueBoxplot`, `GameValueHistogram`
- `LevelGauge`, `MatrixCell`
- `PlayerRankingCard`, `WinRateTrendChart`
- `TrophyCard`, `TrophyShowcase`, `trophyData.js`

## `src/pages/` - Routes

| Route | File | Description |
|-------|------|-------------|
| `/` | `GameScoringEntry.jsx` | Main scoring entry |
| `/analytics` | `PlayerAnalytics.jsx` | Player analytics dashboard |
| `/history` | `SkatScoreList.jsx` | Game history list |
| `/statistiken` | `StatistikenCharts.jsx` | Statistics charts |
| `/players` | `PlayerSettings.jsx` | Player management |
| `/info` | `SkatInfo.jsx` | Rules and info |
| `/vitrine` | `TrophyShowcasePage.jsx` | Trophy showcase |
| `/mein-profil` | `MeinProfil.jsx` | Personal player profile |
| `/claim` | `ClaimSlot.jsx` | Player identity claim |

Additional page (not routed in App.jsx): `SpiellistenPage.jsx`

## Provider Tree (App.jsx)

```
IconsetProvider
  └─ AuthGate
       └─ GameProvider
            └─ BrowserRouter (basename="/app")
                 └─ AppShell (Sidebar + Routes)
                 └─ AchievementWatcher
                 └─ UpdatePrompt
```

## Key Conventions

- **Pure logic in `src/lib/`** - no React imports, no side effects; makes unit and property testing straightforward
- **Optimistic updates** - `useSyncActions` dispatches to the reducer immediately, then syncs to Supabase asynchronously
- **DB field mapping** - `syncService.js` is the only place that translates between `camelCase` (app) and `snake_case` (DB)
- **Test co-location** - test files live next to the source file they test
- **Property tests** use `fast-check` and are in `*.property.test.js` / `*.property.test.jsx` files; they validate invariants of the scoring engine, reducer, and hooks
- **CSS** uses CSS custom properties (`var(--token-name)`) defined in `src/index.css`; inline styles use these tokens for dynamic values
- **German UI strings** - all user-visible text is in German; code identifiers and comments are in English
- **App base path** - the React app is served under `/app/`; the static landing page is served at root `/`
