# Implementierungsplan: Inline-Style-Refactoring

## Übersicht

Schrittweise Konsolidierung duplizierter Inline-Styles und Farbdefinitionen in der Skatastrophe-App.
Fundament zuerst, dann neue Komponente, dann Konsumenten, zuletzt der isolierte `GameTypeEditor`.

## Tasks

- [x] 1. Fundament legen — `tokens.js` und `index.css` erweitern
  - [x] 1.1 `SUIT_SYMBOLS` und `SUIT_MAT_ICONS` in `src/lib/tokens.js` ergänzen
    - `SUIT_SYMBOLS` exportieren: `{ club: '♣', spade: '♠', heart: '♥', diamond: '♦' }`
    - `SUIT_MAT_ICONS` exportieren: `{ grand: 'stars', null: 'block', passed: 'skip_next' }`
    - Hinweis: `SUIT_SYMBOLS` in `skatScoring.js` bleibt unberührt — andere Zwecke, andere Werte
    - _Anforderungen: 4.1, 4.5_

  - [x] 1.2 Utility-Klassen `.stat-label` und `.stat-value` in `src/index.css` hinzufügen
    - Abschnitt `/* ── Refactoring: Utility-Klassen für duplizierte Typografie-Muster ── */` einfügen
    - `.stat-label`: `font-size: 0.65rem`, `font-weight: 700`, `text-transform: uppercase`, `letter-spacing: 0.1em`, `color: var(--outline)`
    - `.stat-value`: `font-size: 1.75rem`, `font-weight: 800`, `font-family: 'Manrope', sans-serif`
    - _Anforderungen: 1.1, 1.2_

- [x] 2. `SuitBadge`-Komponente erstellen
  - [x] 2.1 `src/components/SuitBadge.jsx` implementieren
    - Props: `gameType` (string), `size?: 'sm' | 'md' | 'lg'` (default `'md'`), `className?` (string)
    - Größen-Mapping: `sm` → 1.25rem × 1.25rem, Icon 0.75rem, border-radius 0.25rem; `md` → 2rem × 2rem, Icon 1rem, border-radius 0.4rem; `lg` → 2.5rem × 2.5rem, Icon 1.25rem, border-radius 0.5rem
    - Farben aus `SUIT_COLORS` / `SUIT_TEXT_COLORS` aus `tokens.js`; Fallback: `var(--surface-high)` / `var(--outline)`
    - Icon-Logik: `gameType` in `SUIT_SYMBOLS` → Unicode-Zeichen; `gameType` in `SUIT_MAT_ICONS` → `<span className="material-symbols-outlined">`; unbekannt → `'?'`
    - _Anforderungen: 2.1, 2.2, 2.3, 2.6_

  - [ ]* 2.2 Property-Test für `SuitBadge` — Property 1: Farbkonsistenz
    - **Property 1: SuitBadge verwendet `SUIT_COLORS[gameType]` als `backgroundColor` für alle bekannten Spieltypen**
    - Datei: `src/components/SuitBadge.property.test.jsx`
    - `fc.constantFrom(...Object.keys(SUIT_COLORS))` → render → `container.firstChild.style.backgroundColor === SUIT_COLORS[gameType]`
    - Tag: `// Feature: inline-style-refactoring, Property 1: SuitBadge Farbkonsistenz`
    - **Validates: Anforderungen 2.2, 4.1, 4.5**

  - [ ]* 2.3 Property-Test für `SuitBadge` — Property 2: Fallback für unbekannte Spieltypen
    - **Property 2: Für jeden String außerhalb `Object.keys(SUIT_COLORS)` rendert `SuitBadge` `'?'` und `var(--surface-high)` als Hintergrund**
    - Datei: `src/components/SuitBadge.property.test.jsx` (gleiche Datei wie 2.2)
    - `fc.string().filter(s => !KNOWN_TYPES.includes(s))` → render → `textContent === '?'` und `backgroundColor === 'var(--surface-high)'`
    - Tag: `// Feature: inline-style-refactoring, Property 2: SuitBadge Fallback`
    - **Validates: Anforderung 2.3**

- [x] 3. Checkpoint — Fundament und SuitBadge verifizieren
  - Sicherstellen dass alle bisherigen Tests grün sind, bei Fragen den Nutzer ansprechen.

- [x] 4. `ResultDashboard.jsx` migrieren
  - [x] 4.1 Lokales `SUIT_COLORS`-Objekt aus `src/components/scoring/ResultDashboard.jsx` entfernen
    - `import { SUIT_COLORS, SUIT_TEXT_COLORS } from '../../lib/tokens'` ergänzen (falls noch nicht vorhanden)
    - Lokale `SuitBadge`-Funktion durch Import der neuen Komponente ersetzen: `import SuitBadge from '../SuitBadge'`
    - Alle `<SuitBadge gameType={...} />` Aufrufe auf `size="sm"` setzen (war 1.25rem × 1.25rem)
    - _Anforderungen: 2.4, 4.2_

  - [x] 4.2 `statLabel`-Muster in `ResultDashboard.jsx` durch `.stat-label`-Klasse ersetzen
    - Alle `<p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)' }}>` → `<p className="stat-label">`
    - Kontextabhängige Ergänzungen (z. B. `marginBottom`) als verbleibender Inline-Style beibehalten
    - _Anforderungen: 1.8_

- [x] 5. `SkatScoreList.jsx` migrieren
  - [x] 5.1 `GAME_TYPE_DISPLAY`-Objekt und `GameTypeIcon`-Komponente entfernen, `SuitBadge` importieren
    - `import SuitBadge from '../components/SuitBadge'` hinzufügen
    - `GameTypeIcon`-Verwendungen in `RoundRow` durch `<SuitBadge gameType={r.gameType} size="md" />` ersetzen
    - `GAME_TYPE_DISPLAY`-Konstante und `GameTypeIcon`-Funktion löschen
    - _Anforderungen: 2.5, 4.3_

  - [x] 5.2 `RankingRow`-Hilfskomponente lokal in `SkatScoreList.jsx` extrahieren
    - `RankingRow`-Komponente mit Props `rank`, `name`, `score` definieren (lokal in der Datei, kein separates File)
    - Badge-Hintergrund: `rank === 1` → `var(--tertiary-container)`, sonst → `var(--surface-high)`
    - Score-Farbe: `score >= 0` → `var(--primary)`, `score < 0` → `var(--secondary)`
    - Score-Anzeige: `score >= 0` → `+{score}`, `score < 0` → `{score}`
    - Alle drei Ranking-Karten (Standardwertung, Seeger-Fabian, Kombiniert) auf `RankingRow` umstellen
    - _Anforderungen: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 5.3 Property-Test für `RankingRow` — Property 3: Score-Farb-Invariante
    - **Property 3: Für beliebige ganzzahlige Scores rendert `RankingRow` `var(--primary)` bei `score >= 0` und `var(--secondary)` bei `score < 0`**
    - Datei: `src/pages/SkatScoreList.property.test.jsx`
    - `fc.integer()` → render `<RankingRow rank={1} name="Test" score={n} />` → Score-Element-Farbe prüfen
    - Tag: `// Feature: inline-style-refactoring, Property 3: RankingRow Score-Farb-Invariante`
    - **Validates: Anforderungen 3.2, 3.3**

  - [x] 5.4 `statLabel`-Muster in `SkatScoreList.jsx` durch `.stat-label`-Klasse ersetzen
    - Alle vier Stat-Kachel-Labels (`Runden gesamt`, `Gewonnen`, `Verloren`, `Eingepasst`) auf `className="stat-label"` umstellen
    - Kontextabhängige Inline-Styles (z. B. Farbe des `statValue`) beibehalten
    - _Anforderungen: 1.7_

- [x] 6. `StatistikenCharts.jsx` migrieren
  - [x] 6.1 Lokale `statLabel`/`statValue`-Konstanten entfernen und CSS-Klassen verwenden
    - Alle `style={statLabel}` → `className="stat-label"` ersetzen
    - Alle `style={statValue}` → `className="stat-value"` ersetzen
    - Farbüberschreibungen (z. B. auf farbigen Highlight-Kacheln) als verbleibender Inline-Style beibehalten: `className="stat-label" style={{ color: '#1b1c1c', opacity: 0.65 }}`
    - Kontextabhängige `marginBottom`-Werte als Inline-Style beibehalten
    - Lokale `statLabel`- und `statValue`-Konstantendefinitionen löschen
    - _Anforderungen: 1.3, 1.4, 1.5_

- [x] 7. `PlayerAnalytics.jsx` migrieren
  - [x] 7.1 Lokale `statLabel`/`statValue`-Konstanten entfernen und CSS-Klassen verwenden
    - Gleiche Vorgehensweise wie Task 6.1
    - Alle `style={statLabel}` → `className="stat-label"`, alle `style={statValue}` → `className="stat-value"`
    - Farbüberschreibungen und kontextabhängige Margins als Inline-Style beibehalten
    - Lokale Konstantendefinitionen löschen
    - _Anforderungen: 1.3, 1.4, 1.6_

- [x] 8. `PlayerSettings.jsx` migrieren
  - [x] 8.1 `statLabel`-Muster in `PlayerSettings.jsx` durch `.stat-label`-Klasse ersetzen
    - Alle Vorkommen des `statLabel`-Style-Objekts auf `className="stat-label"` umstellen
    - Kontextabhängige Ergänzungen als Inline-Style beibehalten
    - _Anforderungen: 1.3, 1.8_

- [x] 9. Checkpoint — Konsumenten-Migration verifizieren
  - Sicherstellen dass alle bisherigen Tests grün sind, bei Fragen den Nutzer ansprechen.

- [x] 10. `GameTypeEditor.jsx` ins Design-Token-System integrieren
  - [x] 10.1 Hardcoded Hex-Werte in Style-Konstanten durch CSS Custom Properties ersetzen
    - `dialogStyle.background`: `'#ffffff'` → `'var(--surface)'`
    - `dialogStyle.color`: `'#1a1a2e'` → `'var(--on-surface)'`
    - `labelStyle.color`: `'#555577'` → `'var(--outline)'`
    - `chipStyle.borderColor`: `'#c0c0d0'` → `'var(--outline-variant)'`
    - `chipStyle.color`: `'#1a1a2e'` → `'var(--on-surface)'`
    - `chipActiveStyle.background` und `chipActiveStyle.borderColor`: `'#7c3aed'` → `'var(--primary)'`
    - `cancelBtnStyle.borderColor`: `'#c0c0d0'` → `'var(--outline-variant)'`
    - `cancelBtnStyle.color`: `'#1a1a2e'` → `'var(--on-surface)'`
    - `saveBtnStyle.background`: `'#7c3aed'` → `'var(--primary)'`
    - `gameTypeChipStyle.borderColor`: `'#c0c0d0'` → `'var(--outline-variant)'`
    - `gameTypeChipStyle.color`: `'#1a1a2e'` → `'var(--on-surface)'`
    - `gameTypeChipActiveStyle.background` und `gameTypeChipActiveStyle.borderColor`: `'#7c3aed'` → `'var(--primary)'`
    - `spitzenBtnStyle.borderColor`: `'#c0c0d0'` → `'var(--outline-variant)'`
    - `spitzenBtnStyle.color`: `'#1a1a2e'` → `'var(--on-surface)'`
    - `spitzenBtnActiveStyle.background` und `spitzenBtnActiveStyle.borderColor`: `'#7c3aed'` → `'var(--primary)'`
    - `CheckboxField` label-color: `'#1a1a2e'` → `'var(--on-surface)'`
    - `h2` color: `'#1a1a2e'` → `'var(--on-surface)'`; Runden-Span color: `'#555577'` → `'var(--outline)'`
    - _Anforderungen: 5.1, 5.2, 5.6_

  - [x] 10.2 Gewonnen/Verloren-Buttons auf `var(--win-color)` / `var(--loss-color)` umstellen
    - Gewonnen-Button `borderColor`: `won ? '#16a34a' : '#c0c0d0'` → `won ? 'var(--win-color)' : 'var(--outline-variant)'`
    - Gewonnen-Button `backgroundColor`: `won ? '#f0fdf4' : 'transparent'` → `won ? 'color-mix(in srgb, var(--win-color) 10%, transparent)' : 'transparent'`
    - Gewonnen-Button `color`: `won ? '#16a34a' : '#1a1a2e'` → `won ? 'var(--win-color)' : 'var(--on-surface)'`
    - Verloren-Button analog mit `var(--loss-color)` und `var(--outline-variant)`
    - _Anforderungen: 5.1, 5.4_

  - [x] 10.3 Spielwert-Vorschau-Box auf Design-Tokens umstellen
    - `backgroundColor`: `previewResult.won ? '#f0fdf4' : '#fff1f0'` → `color-mix(in srgb, var(--win-color) 10%, transparent)` / `color-mix(in srgb, var(--loss-color) 10%, transparent)`
    - `borderColor`: `previewResult.won ? '#86efac' : '#fca5a5'` → `color-mix(in srgb, var(--win-color) 50%, transparent)` / `color-mix(in srgb, var(--loss-color) 50%, transparent)`
    - Label-Farbe: `previewResult.won ? '#166534' : '#991b1b'` → `previewResult.won ? 'var(--win-color)' : 'var(--loss-color)'`
    - Wert-Farbe: `previewResult.won ? '#166534' : '#991b1b'` → `previewResult.won ? 'var(--win-color)' : 'var(--loss-color)'`
    - Formel-Farbe: `'#555577'` → `'var(--outline)'`
    - _Anforderungen: 5.1, 5.4_

  - [x] 10.4 Spieltyp-Buttons auf `SUIT_COLORS` / `SUIT_TEXT_COLORS` aus `tokens.js` umstellen
    - `import { SUIT_COLORS, SUIT_TEXT_COLORS } from '../lib/tokens'` hinzufügen
    - Spieltyp-Button-Array: `color`-Prop entfernen; im aktiven Zustand `SUIT_COLORS[key]` als `background` und `SUIT_TEXT_COLORS[key]` als `color` verwenden
    - Im inaktiven Zustand `SUIT_COLORS[key]` als Icon-Farbe verwenden (Vorschau-Effekt)
    - `gameTypeChipActiveStyle` wird damit spieltyp-spezifisch (inline im `.map()` berechnet)
    - _Anforderungen: 5.3_

- [x] 11. Property-Tests für `tokens.js` erstellen
  - [x] 11.1 `src/lib/tokens.property.test.js` erstellen — Property 4: Symmetrie-Invariante
    - **Property 4: `Object.keys(SUIT_COLORS).sort()` === `Object.keys(SUIT_TEXT_COLORS).sort()`**
    - Alle sieben bekannten Spieltypen (`club`, `spade`, `heart`, `diamond`, `grand`, `null`, `passed`) sind in beiden Objekten vorhanden
    - Tag: `// Feature: inline-style-refactoring, Property 4: tokens.js Symmetrie`
    - **Validates: Anforderung 4.5**

- [x] 12. Abschluss-Checkpoint — Alle Tests grün
  - `npm test` ausführen und sicherstellen dass alle Tests (bestehende + neue) ohne Fehler durchlaufen.
  - Bei Fehlern in bestehenden Tests (`GameTypeEditor.test.jsx`, `ResultDashboard.test.js` etc.) prüfen ob Assertions durch Token-Änderungen betroffen sind; bei Fragen den Nutzer ansprechen.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen für Rückverfolgbarkeit
- Die Migrationsreihenfolge (Fundament → SuitBadge → Konsumenten → GameTypeEditor) stellt sicher, dass keine hängenden Abhängigkeiten entstehen
- `rgba(0, 0, 0, 0.55)` im Overlay von `GameTypeEditor` bleibt als Inline-Style — kein Token-Wert
- Einmalige Layout-Styles (`gridTemplateColumns`, spezifische `margin`/`padding`) bleiben als Inline-Styles
