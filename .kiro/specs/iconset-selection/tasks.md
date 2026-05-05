# Implementation Plan: Iconset Selection

## Overview

Implement a user-selectable iconset for Skat card suit symbols. The feature introduces a React Context (`IconsetProvider`), a centralized `SuitIcon` component, and migrates all existing suit-symbol rendering across the app to use it. The user can switch between the French deck (Unicode symbols) and the Altenburg deck (PNG images from `assets/icon_altenburg_einfach/`) in the settings page. The choice is persisted in `localStorage`.

Implementation follows the four phases from the design: Foundation → Component Migration → Page-Level Integration → Property-Based Tests.

## Tasks

- [x] 1. Phase 1: Foundation – Context and SuitIcon component
  - [x] 1.1 Create `src/context/IconsetContext.jsx`
    - Implement `IconsetProvider` with `useState` initializer that reads `localStorage.getItem('skatIconset')` with `try/catch` fallback to `'french'`
    - Implement `setIconset(value)` that updates state and writes to `localStorage` with `try/catch` (silent fail)
    - Implement `useIconset()` hook that throws `'useIconset must be used within IconsetProvider'` when called outside the provider
    - Export `IconsetProvider` and `useIconset`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.3, 5.4_

  - [x] 1.2 Create `src/components/SuitIcon.jsx`
    - Define `ALTENBURG_ICONS` mapping: `club → /assets/icon_altenburg_einfach/eichel_icon_einfach.png`, `spade → gruen_icon_einfach.png`, `heart → rot_icon_einfach.png`, `diamond → schellen_icon_einfach.png`
    - Define `ALTENBURG_LABELS` mapping: `club → 'Eichel'`, `spade → 'Grün'`, `heart → 'Rot'`, `diamond → 'Schellen'`
    - Define `SIZE_MAP` for `sm` / `md` / `lg` sizes
    - For `grand`, `null`, `passed`: always render `<span className="material-symbols-outlined">` with the correct Material Icon, independent of iconset
    - For suit types with `iconset === 'altenburg'` and no image error: render `<img src={...} alt={ALTENBURG_LABELS[gameType]} onError={() => setImgError(true)} />`
    - For suit types with `iconset === 'french'` or on image error: render Unicode symbol from `SUIT_SYMBOLS`
    - Accept props: `gameType`, `size` (default `'md'`), `className`
    - _Requirements: 3.1, 3.7, 4.1, 4.2, 4.3, 4.4, 5.5_

  - [x] 1.3 Register `IconsetProvider` in `App.jsx`
    - Import `IconsetProvider` from `./context/IconsetContext`
    - Wrap the existing `<AuthGate>` / `<GameProvider>` tree so that `IconsetProvider` is the outermost provider, giving all routes access to `useIconset()`
    - _Requirements: 5.2_

  - [x] 1.4 Write unit tests for `IconsetContext` (`src/context/IconsetContext.test.jsx`)
    - Test default initialization to `'french'` when `localStorage` is empty
    - Test initialization from `localStorage` when a valid value is stored
    - Test that `setIconset` updates context state
    - Test that `setIconset` writes to `localStorage`
    - Test error handling when `localStorage` throws on read and on write
    - Test that `useIconset` throws when called outside `IconsetProvider`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.3, 5.4_

  - [x] 1.5 Write unit tests for `SuitIcon` (`src/components/SuitIcon.test.jsx`)
    - Test that `grand`, `null`, `passed` always render a `material-symbols-outlined` span regardless of iconset
    - Test that suit types render a Unicode symbol when `iconset === 'french'`
    - Test that suit types render an `<img>` when `iconset === 'altenburg'`
    - Test that the `<img>` has the correct `alt` attribute (German suit name)
    - Test that an image load error causes fallback to Unicode symbol
    - Test that `size` prop maps to the correct font-size / image dimensions
    - _Requirements: 3.7, 4.3, 4.4, 5.5_

- [ ] 2. Checkpoint – Phase 1 complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Phase 2: Component Migration – SuitBadge, GameTypeSelector, PlayerSettings
  - [x] 3.1 Update `src/components/SuitBadge.jsx` to use `<SuitIcon>`
    - Remove direct imports of `SUIT_SYMBOLS` and `SUIT_MAT_ICONS` (they are now handled inside `SuitIcon`)
    - Replace the `let icon; if (gameType in SUIT_SYMBOLS) ...` block with `<SuitIcon gameType={gameType} size={size} />`
    - Keep `SUIT_COLORS` and `SUIT_TEXT_COLORS` for the badge background/foreground styling
    - _Requirements: 3.1_

  - [x] 3.2 Update `src/components/scoring/GameTypeSelector.jsx` to use `<SuitIcon>`
    - Import `SuitIcon` from `'../SuitIcon'`
    - Replace the `{suit.icon ? <span className="game-suit-icon">{suit.icon}</span> : <span className="material-symbols-outlined">...</span>}` block with `<SuitIcon gameType={suit.key} size="lg" className="game-suit-icon" />`
    - The `SUIT_OPTIONS` array can keep its `icon` / `matIcon` fields for reference but they are no longer used for rendering
    - _Requirements: 3.2_

  - [x] 3.3 Add iconset selector UI to `src/pages/PlayerSettings.jsx`
    - Import `useIconset` from `'../context/IconsetContext'` and `SuitIcon` from `'../components/SuitIcon'`
    - Add `const { iconset, setIconset } = useIconset()` inside the component
    - Define `ICONSET_OPTIONS` array with `french` (labels: Kreuz, Pik, Herz, Karo) and `altenburg` (labels: Eichel, Grün, Rot, Schellen) entries
    - Render a new `<section className="form-section">` with heading „Kartensymbole" after the existing seating section
    - Each option is a `<button>` with active border/background using `var(--primary)` / `var(--primary-container)` when selected
    - Each option shows a preview row of four `<SuitIcon>` components with their German/French labels below
    - Active option shows a `check_circle` Material Icon
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 3.4 Write unit tests for the updated `PlayerSettings` iconset section (`src/pages/PlayerSettings.test.jsx`)
    - Test that the „Kartensymbole" section is rendered
    - Test that both iconset options are displayed
    - Test that the active option is visually highlighted (active class / border)
    - Test that clicking an option calls `setIconset` with the correct value
    - Test that the preview shows exactly 4 suit symbols per option
    - Test that French option shows labels Kreuz/Pik/Herz/Karo and Altenburg option shows Eichel/Grün/Rot/Schellen
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_

- [ ] 4. Checkpoint – Phase 2 complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Phase 3: Page-Level Integration
  - [x] 5.1 Update `src/pages/SkatScoreList.jsx` to use `<SuitIcon>` in round rows
    - `SkatScoreList` already uses `<SuitBadge>` for the `Typ` column in `RoundRow` — this is automatically covered by task 3.1
    - Verify no remaining direct `SUIT_SYMBOLS` references exist in this file; if any are found, replace them with `<SuitIcon>`
    - _Requirements: 3.3_

  - [x] 5.2 Update `src/pages/PlayerAnalytics.jsx` to use `<SuitIcon>`
    - In `StreakCard`: replace the inline badge rendering (the `sym` / `matIcon` logic inside the `.map()`) with `<SuitIcon gameType={r.gameType} size="sm" />`; remove the local `matIcon` / `sym` variables and the `SUIT_SYMBOLS` / `SUIT_COLORS` / `SUIT_TEXT_COLORS` inline logic for the icon itself (keep background color for the badge wrapper)
    - In `HighlightCard`: replace the `{['grand','null','passed'].includes(round.gameType) ? <span className="material-symbols-outlined">...</span> : SUIT_SYMBOLS[round.gameType]}` expression with `<SuitIcon gameType={round.gameType} size="md" />`
    - Remove the `SUIT_SYMBOLS` import if it is no longer used after the replacements
    - _Requirements: 3.4_

  - [x] 5.3 Update `src/pages/StatistikenCharts.jsx` to use `<SuitIcon>`
    - In the „↑ Spiel" highlight card: replace the `{['grand','null','passed'].includes(kpis.best.type) ? <span className="material-symbols-outlined">...</span> : SUIT_SYMBOLS[kpis.best.type]}` expression with `<SuitIcon gameType={kpis.best.type} size="md" />`
    - Apply the same replacement in the „↓ Niederlage" highlight card for `kpis.worst.type`
    - Remove the `SUIT_SYMBOLS` import from `'../lib/skatScoring'` if it is no longer used after the replacements
    - _Requirements: 3.5_

  - [~] 5.4 Update `src/components/analytics/GameTypeHeatmap.jsx` to use `<SuitIcon>`
    - In the `<thead>` column headers: replace the `{type === 'grand' || type === 'null' ? <span className="material-symbols-outlined">...</span> : SUIT_SYMBOLS[type]}` expression with `<SuitIcon gameType={type} size="sm" />`
    - Remove the `SUIT_SYMBOLS` import from `'../../lib/skatScoring'` if it is no longer used
    - _Requirements: 3.6_

  - [~] 5.5 Write integration tests for cross-component iconset switching
    - Mount the full app tree (with `IconsetProvider`, `GameProvider`, `MemoryRouter`) in a test
    - Render `PlayerSettings` and simulate clicking „Altenburger Blatt"
    - Verify `localStorage.getItem('skatIconset')` equals `'altenburg'`
    - Render `SuitBadge` with `iconset === 'altenburg'` and verify an `<img>` element is present
    - Render `GameTypeSelector` with `iconset === 'altenburg'` and verify suit buttons contain `<img>` elements
    - _Requirements: 3.8_

- [ ] 6. Checkpoint – Phase 3 complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Phase 4: Property-Based Tests
  - [~] 7.1 Write property test – Property 1: Iconset persistence round-trip (`src/context/IconsetContext.property.test.jsx`)
    - **Property 1: Iconset persistence round-trip**
    - For any valid iconset value in `{'french', 'altenburg'}`, when `setIconset(value)` is called, `localStorage.getItem('skatIconset')` SHALL equal `value`
    - Use `fc.constantFrom('french', 'altenburg')` as the arbitrary
    - Tag: `Feature: iconset-selection, Property 1: Iconset persistence round-trip`
    - Minimum 100 iterations
    - **Validates: Requirements 2.1**

  - [~] 7.2 Write property test – Property 2: Iconset initialization from localStorage (`src/context/IconsetContext.property.test.jsx`)
    - **Property 2: Iconset initialization from localStorage**
    - For any valid iconset value stored in `localStorage` under key `'skatIconset'`, when `IconsetProvider` mounts, the context SHALL initialize with `iconset` equal to that stored value
    - Use `fc.constantFrom('french', 'altenburg')` as the arbitrary
    - Tag: `Feature: iconset-selection, Property 2: Iconset initialization from localStorage`
    - Minimum 100 iterations
    - **Validates: Requirements 2.2**

  - [~] 7.3 Write property test – Property 3: SuitIcon renders correct representation for suit types (`src/components/SuitIcon.property.test.jsx`)
    - **Property 3: SuitIcon renders correct representation for suit types**
    - For any suit type in `{club, spade, heart, diamond}` and any iconset in `{'french', 'altenburg'}`, `SuitIcon` SHALL render an `<img>` when `iconset === 'altenburg'` (no error) and a Unicode symbol when `iconset === 'french'` or on image error
    - Use `fc.constantFrom('club', 'spade', 'heart', 'diamond')` and `fc.constantFrom('french', 'altenburg')` as arbitraries
    - Tag: `Feature: iconset-selection, Property 3: SuitIcon renders correct representation for suit types`
    - Minimum 100 iterations
    - **Validates: Requirements 3.1, 3.2, 5.5**

  - [~] 7.4 Write property test – Property 4: SuitIcon always renders Material Icons for special types (`src/components/SuitIcon.property.test.jsx`)
    - **Property 4: SuitIcon always renders Material Icons for special types**
    - For any iconset in `{'french', 'altenburg'}` and any special game type in `{grand, null, passed}`, `SuitIcon` SHALL render a `<span>` with class `material-symbols-outlined`, never an `<img>`
    - Use `fc.constantFrom('grand', 'null', 'passed')` and `fc.constantFrom('french', 'altenburg')` as arbitraries
    - Tag: `Feature: iconset-selection, Property 4: SuitIcon always renders Material Icons for special types`
    - Minimum 100 iterations
    - **Validates: Requirements 3.7**

  - [~] 7.5 Write property test – Property 5: Altenburg icon mapping correctness (`src/components/SuitIcon.property.test.jsx`)
    - **Property 5: Altenburg icon mapping correctness**
    - For any suit key in `{club, spade, heart, diamond}`, the `ALTENBURG_ICONS` mapping SHALL return a path string containing `'icon_altenburg_einfach'` and the corresponding German suit filename segment (`eichel`, `gruen`, `rot`, `schellen`)
    - Use `fc.constantFrom('club', 'spade', 'heart', 'diamond')` as the arbitrary
    - Tag: `Feature: iconset-selection, Property 5: Altenburg icon mapping correctness`
    - Minimum 100 iterations
    - **Validates: Requirements 4.1, 4.2**

  - [~] 7.6 Write property test – Property 6: Altenburg icons have accessibility attributes (`src/components/SuitIcon.property.test.jsx`)
    - **Property 6: Altenburg icons have accessibility attributes**
    - For any suit type in `{club, spade, heart, diamond}`, when `iconset === 'altenburg'` and `SuitIcon` renders an `<img>`, that element SHALL have a non-empty `alt` attribute containing the German suit name
    - Use `fc.constantFrom('club', 'spade', 'heart', 'diamond')` as the arbitrary
    - Tag: `Feature: iconset-selection, Property 6: Altenburg icons have accessibility attributes`
    - Minimum 100 iterations
    - **Validates: Requirements 4.3**

  - [~] 7.7 Write property test – Property 7: Iconset preview completeness (`src/pages/PlayerSettings.property.test.jsx`)
    - **Property 7: Iconset preview completeness**
    - For any iconset option rendered in the `PlayerSettings` UI, the preview SHALL display exactly 4 suit symbols corresponding to `{club, spade, heart, diamond}`
    - Use `fc.constantFrom('french', 'altenburg')` as the arbitrary for the active iconset
    - Tag: `Feature: iconset-selection, Property 7: Iconset preview completeness`
    - Minimum 100 iterations
    - **Validates: Requirements 1.4**

  - [~] 7.8 Write property test – Property 8: Context reactivity (`src/context/IconsetContext.property.test.jsx`)
    - **Property 8: Context reactivity**
    - For any valid iconset value, when `setIconset(value)` is called within a mounted `IconsetProvider`, all components consuming `useIconset()` SHALL re-render and reflect the new iconset value without requiring a page reload
    - Use `fc.constantFrom('french', 'altenburg')` as the arbitrary
    - Tag: `Feature: iconset-selection, Property 8: Context reactivity`
    - Minimum 100 iterations
    - **Validates: Requirements 3.8**

- [ ] 8. Final Checkpoint – All phases complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- PNG files are already present in `assets/icon_altenburg_einfach/` — no file copying needed
- The design uses `/assets/...` paths (served from the `public/` folder via Vite). The PNG files currently live in `assets/` at the project root, not in `public/`. Before or during task 1.2, copy the four PNG files from `assets/icon_altenburg_einfach/` into `public/assets/icon_altenburg_einfach/` so Vite serves them at the `/assets/...` URL. Alternatively, import them as Vite static assets using `import eichelIcon from '../../assets/icon_altenburg_einfach/eichel_icon_einfach.png'` — confirm the approach with the user if unclear.
- `SkatScoreList` already uses `<SuitBadge>` for suit rendering, so task 5.1 is largely covered by task 3.1
- Each property test MUST explicitly reference its property number from the design document
- All user-visible strings remain in German; code identifiers and comments in English
