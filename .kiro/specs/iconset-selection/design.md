# Design Document: Iconset Selection

## Overview

This feature adds the ability for users to choose between two iconsets for displaying card suit symbols throughout the Skatastrophe app:

1. **Französisches Blatt** (French deck): Unicode symbols ♣ ♠ ♥ ♦ (default)
2. **Altenburger Blatt** (Altenburg deck): PNG images from `assets/icon_altenburg_einfach/`

The selected iconset applies globally across all components that display suit symbols (badges, selectors, charts, analytics). The choice is persisted in `localStorage` and managed via a React Context provider.

### Key Design Decisions

- **React Context for global state**: Avoids prop drilling and ensures all components can access the active iconset
- **Centralized SuitIcon component**: Single source of truth for rendering suit symbols, eliminating direct dependencies on `SUIT_SYMBOLS` from `tokens.js` or `skatScoring.js`
- **Graceful fallback**: If PNG images fail to load, the component falls back to Unicode symbols
- **Persistent preference**: User choice is stored in `localStorage` under key `skatIconset`
- **No breaking changes**: Existing components continue to work; we introduce a new abstraction layer

---

## Architecture

### Component Hierarchy

```
App.jsx
  └─ IconsetProvider (new)
       ├─ GameProvider (existing)
       └─ BrowserRouter
            └─ Routes
                 ├─ GameScoringEntry
                 │    └─ GameTypeSelector → uses SuitIcon
                 ├─ PlayerAnalytics → uses SuitIcon
                 ├─ SkatScoreList → uses SuitIcon
                 ├─ StatistikenCharts → uses SuitIcon
                 ├─ PlayerSettings (new iconset selector UI)
                 └─ ...
```

### Data Flow

1. **Initialization**: `IconsetProvider` reads `localStorage.getItem('skatIconset')` on mount
2. **User selection**: User clicks an iconset option in PlayerSettings
3. **State update**: `setIconset('altenburg')` is called
4. **Persistence**: Context writes to `localStorage.setItem('skatIconset', 'altenburg')`
5. **Re-render**: All components consuming `useIconset()` re-render with the new value
6. **Icon rendering**: `SuitIcon` components render PNG images instead of Unicode symbols

---

## Components and Interfaces

### 1. IconsetContext (new)

**File**: `src/context/IconsetContext.jsx`

**Purpose**: Provides global iconset state and setter function.

**API**:
```javascript
// Context value shape
{
  iconset: 'french' | 'altenburg',
  setIconset: (value: 'french' | 'altenburg') => void
}
```

**Implementation**:
```javascript
import { createContext, useContext, useState, useEffect } from 'react';

const IconsetContext = createContext(null);

export function IconsetProvider({ children }) {
  const [iconset, setIconsetState] = useState(() => {
    try {
      return localStorage.getItem('skatIconset') || 'french';
    } catch {
      return 'french';
    }
  });

  const setIconset = (value) => {
    setIconsetState(value);
    try {
      localStorage.setItem('skatIconset', value);
    } catch {
      // Silently fail if localStorage is unavailable
    }
  };

  return (
    <IconsetContext.Provider value={{ iconset, setIconset }}>
      {children}
    </IconsetContext.Provider>
  );
}

export function useIconset() {
  const context = useContext(IconsetContext);
  if (!context) {
    throw new Error('useIconset must be used within IconsetProvider');
  }
  return context;
}
```

---

### 2. SuitIcon (new)

**File**: `src/components/SuitIcon.jsx`

**Purpose**: Centralized component for rendering suit symbols. Replaces direct usage of `SUIT_SYMBOLS` from `tokens.js`.

**Props**:
```javascript
{
  gameType: 'club' | 'spade' | 'heart' | 'diamond' | 'grand' | 'null' | 'passed',
  size?: 'sm' | 'md' | 'lg',  // optional, defaults to 'md'
  className?: string           // optional
}
```

**Behavior**:
- For `grand`, `null`, `passed`: Always renders Material Icon (independent of iconset)
- For suit types (`club`, `spade`, `heart`, `diamond`):
  - If `iconset === 'french'`: Renders Unicode symbol from `SUIT_SYMBOLS`
  - If `iconset === 'altenburg'`: Renders `<img>` with PNG from `ALTENBURG_ICONS` mapping
  - If image fails to load: Falls back to Unicode symbol

**Implementation**:
```javascript
import { useIconset } from '../context/IconsetContext';
import { SUIT_SYMBOLS, SUIT_MAT_ICONS } from '../lib/tokens';
import { useState } from 'react';

const ALTENBURG_ICONS = {
  club:    '/assets/icon_altenburg_einfach/eichel_icon_einfach.png',
  spade:   '/assets/icon_altenburg_einfach/gruen_icon_einfach.png',
  heart:   '/assets/icon_altenburg_einfach/rot_icon_einfach.png',
  diamond: '/assets/icon_altenburg_einfach/schellen_icon_einfach.png',
};

const ALTENBURG_LABELS = {
  club:    'Eichel',
  spade:   'Grün',
  heart:   'Rot',
  diamond: 'Schellen',
};

const SIZE_MAP = {
  sm: '0.875rem',
  md: '1rem',
  lg: '1.25rem',
};

export default function SuitIcon({ gameType, size = 'md', className }) {
  const { iconset } = useIconset();
  const [imgError, setImgError] = useState(false);
  const fontSize = SIZE_MAP[size] || SIZE_MAP.md;

  // Special game types always use Material Icons
  if (gameType in SUIT_MAT_ICONS) {
    return (
      <span
        className={`material-symbols-outlined ${className || ''}`}
        style={{ fontSize, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {SUIT_MAT_ICONS[gameType]}
      </span>
    );
  }

  // Suit types: check iconset
  if (iconset === 'altenburg' && gameType in ALTENBURG_ICONS && !imgError) {
    return (
      <img
        src={ALTENBURG_ICONS[gameType]}
        alt={ALTENBURG_LABELS[gameType]}
        onError={() => setImgError(true)}
        className={className}
        style={{ width: fontSize, height: fontSize, display: 'inline-block', verticalAlign: 'middle' }}
      />
    );
  }

  // Fallback: Unicode symbol
  return (
    <span className={className} style={{ fontSize, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {SUIT_SYMBOLS[gameType] || '?'}
    </span>
  );
}
```

---

### 3. SuitBadge (modified)

**File**: `src/components/SuitBadge.jsx`

**Changes**: Replace direct usage of `SUIT_SYMBOLS` with `<SuitIcon>`.

**Before**:
```javascript
let icon;
if (gameType in SUIT_SYMBOLS) {
  icon = SUIT_SYMBOLS[gameType];
} else if (gameType in SUIT_MAT_ICONS) {
  icon = <span className="material-symbols-outlined">{SUIT_MAT_ICONS[gameType]}</span>;
}
```

**After**:
```javascript
import SuitIcon from './SuitIcon';

// Inside render:
<SuitIcon gameType={gameType} size={size} />
```

---

### 4. GameTypeSelector (modified)

**File**: `src/components/scoring/GameTypeSelector.jsx`

**Changes**: Replace inline suit symbols with `<SuitIcon>`.

**Before**:
```javascript
{suit.icon
  ? <span className="game-suit-icon">{suit.icon}</span>
  : <span className="material-symbols-outlined">{suit.matIcon}</span>
}
```

**After**:
```javascript
import SuitIcon from '../SuitIcon';

// Inside render:
<SuitIcon gameType={suit.key} size="lg" className="game-suit-icon" />
```

---

### 5. PlayerSettings (modified)

**File**: `src/pages/PlayerSettings.jsx`

**Changes**: Add new section "Kartensymbole" with iconset selector UI.

**New Section**:
```javascript
import { useIconset } from '../context/IconsetContext';
import SuitIcon from '../components/SuitIcon';

// Inside PlayerSettings component:
const { iconset, setIconset } = useIconset();

const ICONSET_OPTIONS = [
  {
    key: 'french',
    label: 'Französisches Blatt',
    suits: [
      { type: 'club', label: 'Kreuz' },
      { type: 'spade', label: 'Pik' },
      { type: 'heart', label: 'Herz' },
      { type: 'diamond', label: 'Karo' },
    ],
  },
  {
    key: 'altenburg',
    label: 'Altenburger Blatt',
    suits: [
      { type: 'club', label: 'Eichel' },
      { type: 'spade', label: 'Grün' },
      { type: 'heart', label: 'Rot' },
      { type: 'diamond', label: 'Schellen' },
    ],
  },
];

// Render:
<section className="form-section" style={{ marginTop: '2rem' }}>
  <label className="section-label">Kartensymbole</label>
  <p style={{ fontSize: '0.8125rem', color: 'var(--outline)', marginBottom: '1rem' }}>
    Wähle zwischen dem Französischen Blatt (♣ ♠ ♥ ♦) und dem Altenburger Blatt (Eichel, Grün, Rot, Schellen).
  </p>
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
    {ICONSET_OPTIONS.map(option => {
      const isActive = iconset === option.key;
      return (
        <button
          key={option.key}
          onClick={() => setIconset(option.key)}
          style={{
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
            padding: '1rem 1.25rem', borderRadius: '0.75rem',
            border: `2px solid ${isActive ? 'var(--primary)' : 'var(--outline-variant)'}`,
            backgroundColor: isActive ? 'var(--primary-container)' : 'var(--surface-low)',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: isActive ? 'var(--primary)' : 'var(--on-surface)' }}>
              {option.label}
            </span>
            {isActive && (
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '1.25rem' }}>
                check_circle
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {option.suits.map(suit => (
              <div key={suit.type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '2rem', height: '2rem', borderRadius: '0.375rem',
                  backgroundColor: 'var(--surface-high)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <SuitIcon gameType={suit.type} size="md" />
                </div>
                <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                  {suit.label}
                </span>
              </div>
            ))}
          </div>
        </button>
      );
    })}
  </div>
</section>
```

---

### 6. Other Components (modified)

The following components need to replace direct `SUIT_SYMBOLS` usage with `<SuitIcon>`:

- `src/pages/SkatScoreList.jsx` (in round row rendering)
- `src/pages/PlayerAnalytics.jsx` (in StreakCard, HighlightCard)
- `src/pages/StatistikenCharts.jsx` (in highlight cards)
- `src/components/analytics/GameTypeHeatmap.jsx` (in table headers)

**Pattern**: Replace any inline rendering of `SUIT_SYMBOLS[gameType]` or Material Icons with:
```javascript
<SuitIcon gameType={gameType} size="sm|md|lg" />
```

---

## Data Models

### IconsetContext State

```typescript
type Iconset = 'french' | 'altenburg';

interface IconsetContextValue {
  iconset: Iconset;
  setIconset: (value: Iconset) => void;
}
```

### localStorage Schema

```
Key: 'skatIconset'
Value: 'french' | 'altenburg'
```

### Altenburg Icon Mapping

```javascript
const ALTENBURG_ICONS = {
  club:    '/assets/icon_altenburg_einfach/eichel_icon_einfach.png',
  spade:   '/assets/icon_altenburg_einfach/gruen_icon_einfach.png',
  heart:   '/assets/icon_altenburg_einfach/rot_icon_einfach.png',
  diamond: '/assets/icon_altenburg_einfach/schellen_icon_einfach.png',
};

const ALTENBURG_LABELS = {
  club:    'Eichel',
  spade:   'Grün',
  heart:   'Rot',
  diamond: 'Schellen',
};
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Iconset persistence round-trip

*For any* valid iconset value ('french' or 'altenburg'), when `setIconset(value)` is called, then `localStorage.getItem('skatIconset')` SHALL equal `value`.

**Validates: Requirements 2.1**

### Property 2: Iconset initialization from localStorage

*For any* valid iconset value ('french' or 'altenburg') stored in `localStorage` under key 'skatIconset', when the `IconsetProvider` mounts, the context SHALL initialize with `iconset` equal to that stored value.

**Validates: Requirements 2.2**

### Property 3: SuitIcon renders correct representation for suit types

*For any* suit type in {club, spade, heart, diamond} and any iconset in {'french', 'altenburg'}, `SuitIcon` SHALL render:
- An `<img>` element when `iconset === 'altenburg'` and no image load error has occurred
- A Unicode symbol when `iconset === 'french'` or when an image load error has occurred

**Validates: Requirements 3.1, 3.2, 5.5**

### Property 4: SuitIcon always renders Material Icons for special types

*For any* iconset in {'french', 'altenburg'} and any special game type in {grand, null, passed}, `SuitIcon` SHALL render a `<span>` element with class `material-symbols-outlined`, never an `<img>` element.

**Validates: Requirements 3.7**

### Property 5: Altenburg icon mapping correctness

*For any* suit key in {club, spade, heart, diamond}, the `ALTENBURG_ICONS` mapping SHALL return a path string containing 'icon_altenburg_einfach' and the corresponding German suit name (eichel, gruen, rot, schellen).

**Validates: Requirements 4.1, 4.2**

### Property 6: Altenburg icons have accessibility attributes

*For any* suit type in {club, spade, heart, diamond}, when `iconset === 'altenburg'` and `SuitIcon` renders an `<img>` element, that element SHALL have a non-empty `alt` attribute containing the German suit name.

**Validates: Requirements 4.3**

### Property 7: Iconset preview completeness

*For any* iconset option rendered in the PlayerSettings UI, the preview SHALL display exactly 4 suit symbols corresponding to {club, spade, heart, diamond}.

**Validates: Requirements 1.4**

### Property 8: Context reactivity

*For any* valid iconset value, when `setIconset(value)` is called within a mounted `IconsetProvider`, all components consuming `useIconset()` SHALL re-render and reflect the new iconset value without requiring a page reload.

**Validates: Requirements 3.8**

---

## Error Handling

### localStorage Access Errors

**Scenario**: `localStorage` is unavailable (e.g., private browsing mode, quota exceeded, browser restrictions)

**Handling**:
- On read: Return default value `'french'`
- On write: Silently fail (no error thrown to user)
- Rationale: Iconset selection is a non-critical preference; the app should remain functional even if persistence fails

**Implementation**:
```javascript
try {
  localStorage.setItem('skatIconset', value);
} catch (error) {
  // Silently fail - iconset will reset on next page load
  console.warn('Failed to persist iconset preference:', error);
}
```

### Image Load Errors

**Scenario**: PNG image fails to load (404, network error, CORS issue)

**Handling**:
- `SuitIcon` maintains internal `imgError` state
- On `<img onError>`: Set `imgError = true`
- Component re-renders with Unicode fallback
- Rationale: Graceful degradation ensures suit symbols are always visible

**Implementation**:
```javascript
const [imgError, setImgError] = useState(false);

<img
  src={ALTENBURG_ICONS[gameType]}
  onError={() => setImgError(true)}
  // ...
/>

// Fallback rendering when imgError === true
```

### useIconset Outside Provider

**Scenario**: `useIconset()` is called in a component not wrapped by `IconsetProvider`

**Handling**:
- Throw descriptive error: `'useIconset must be used within IconsetProvider'`
- Rationale: This is a developer error that should be caught during development

**Implementation**:
```javascript
export function useIconset() {
  const context = useContext(IconsetContext);
  if (!context) {
    throw new Error('useIconset must be used within IconsetProvider');
  }
  return context;
}
```

---

## Testing Strategy

### Unit Tests

**IconsetContext** (`src/context/IconsetContext.test.jsx`):
- Default initialization to 'french' when localStorage is empty
- Initialization from localStorage when value is present
- `setIconset` updates context state
- `setIconset` writes to localStorage
- Error handling when localStorage throws
- `useIconset` throws when used outside provider

**SuitIcon** (`src/components/SuitIcon.test.jsx`):
- Renders Material Icon for grand/null/passed (independent of iconset)
- Renders Unicode symbol when iconset='french'
- Renders `<img>` when iconset='altenburg'
- Falls back to Unicode on image load error
- Applies correct size classes
- Sets correct alt attribute for Altenburg images

**PlayerSettings** (`src/pages/PlayerSettings.test.jsx`):
- Renders iconset selector section
- Displays both iconset options
- Highlights active option
- Calls `setIconset` when option is clicked
- Shows correct preview symbols for each option
- Shows correct labels (French vs. Altenburg names)

### Property-Based Tests

**IconsetContext** (`src/context/IconsetContext.property.test.jsx`):
- Property 1: Persistence round-trip
- Property 2: Initialization from localStorage

**SuitIcon** (`src/components/SuitIcon.property.test.jsx`):
- Property 3: Correct representation for suit types
- Property 4: Material Icons for special types
- Property 5: Altenburg mapping correctness
- Property 6: Accessibility attributes
- Property 8: Context reactivity

**PlayerSettings** (`src/pages/PlayerSettings.property.test.jsx`):
- Property 7: Preview completeness

**Configuration**:
- Minimum 100 iterations per property test
- Tag format: `Feature: iconset-selection, Property {number}: {property_text}`

### Integration Tests

**End-to-end iconset switching**:
- Mount full app with IconsetProvider
- Navigate to PlayerSettings
- Select Altenburger Blatt
- Navigate to PlayerAnalytics
- Verify SuitIcon components render PNG images
- Navigate to SkatScoreList
- Verify suit symbols in round rows are PNG images
- Verify localStorage contains 'altenburg'

**Cross-component consistency**:
- Verify all pages (GameScoringEntry, PlayerAnalytics, SkatScoreList, StatistikenCharts) render the same iconset
- Verify switching iconset updates all pages without reload

---

## Migration Plan

### Phase 1: Foundation (No Breaking Changes)

1. Create `src/context/IconsetContext.jsx`
2. Create `src/components/SuitIcon.jsx`
3. Add `IconsetProvider` to `App.jsx` (wraps existing providers)
4. Write unit tests for IconsetContext and SuitIcon

### Phase 2: Component Migration

1. Update `SuitBadge.jsx` to use `<SuitIcon>`
2. Update `GameTypeSelector.jsx` to use `<SuitIcon>`
3. Update `PlayerSettings.jsx` to add iconset selector UI
4. Write unit tests for modified components

### Phase 3: Page-Level Integration

1. Update `SkatScoreList.jsx` to use `<SuitIcon>`
2. Update `PlayerAnalytics.jsx` to use `<SuitIcon>`
3. Update `StatistikenCharts.jsx` to use `<SuitIcon>`
4. Update `GameTypeHeatmap.jsx` to use `<SuitIcon>`
5. Write integration tests

### Phase 4: Property-Based Testing

1. Write property tests for IconsetContext
2. Write property tests for SuitIcon
3. Write property tests for PlayerSettings
4. Run full test suite (minimum 100 iterations per property)

### Rollback Strategy

If issues arise, the feature can be rolled back by:
1. Removing `IconsetProvider` from `App.jsx`
2. Reverting component changes (SuitBadge, GameTypeSelector, etc.) to use `SUIT_SYMBOLS` directly
3. Removing the iconset selector UI from PlayerSettings

The feature is designed to be non-breaking: if `IconsetProvider` is not present, components will fail fast with a clear error message during development.

---

## Performance Considerations

### Image Loading

- PNG images are small (~2-5 KB each)
- Images are loaded on-demand (only when iconset='altenburg')
- Browser caching applies (images loaded once per session)
- No performance impact on default 'french' iconset

### Context Re-renders

- `IconsetProvider` uses a single state value
- Only components consuming `useIconset()` re-render on change
- Re-renders are intentional and necessary for UI updates
- No performance concerns (typical app has <50 SuitIcon instances per page)

### localStorage Access

- Read once on mount (synchronous, <1ms)
- Write on user action (synchronous, <1ms)
- No polling or repeated reads
- Graceful degradation if unavailable

---

## Accessibility

### Keyboard Navigation

- Iconset selector buttons are keyboard-accessible (native `<button>` elements)
- Tab order follows visual order
- Enter/Space activates selection

### Screen Readers

- Altenburg PNG images have descriptive `alt` attributes (e.g., "Eichel", "Grün")
- Iconset selector buttons have clear labels ("Französisches Blatt", "Altenburger Blatt")
- Active state is announced via visual indicator (check icon)

### Color Contrast

- Iconset selector uses existing design tokens
- Active state uses `var(--primary)` with sufficient contrast
- Preview symbols use existing `SUIT_COLORS` (already WCAG AA compliant)

---

## Future Enhancements

### Additional Iconsets

The architecture supports adding more iconsets in the future:
1. Add new key to `Iconset` type (e.g., `'bavarian'`)
2. Add new mapping to `ALTENBURG_ICONS` (or create `BAVARIAN_ICONS`)
3. Add new option to `ICONSET_OPTIONS` in PlayerSettings
4. No changes needed to `SuitIcon` or `IconsetProvider`

### Animated Icons

If animated suit symbols are desired:
1. Replace PNG with SVG or animated GIF
2. Update `ALTENBURG_ICONS` paths
3. No changes needed to component logic

### Per-Player Iconset Preferences

If users want different iconsets per player (e.g., in multiplayer mode):
1. Move iconset state from global context to player-specific state
2. Update `SuitIcon` to accept `player` prop
3. Lookup iconset from player preferences instead of global context

This would require significant refactoring and is not in scope for the current feature.
