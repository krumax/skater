# Anforderungsdokument: Inline-Style-Refactoring

## Einleitung

Die Skatastrophe-App leidet unter massiver, inkonsistenter Nutzung von Inline-Styles in JSX-Dateien.
Dieselben Style-Objekte werden 3–10× dupliziert, Farbwerte werden außerhalb des Design-Token-Systems
(`src/lib/tokens.js`, `src/index.css`) hardcoded, und wiederkehrende JSX-Muster (Stat-Kacheln,
Ranking-Zeilen, Spieltyp-Badges) existieren mehrfach in leicht abweichenden Varianten.

Dieses Refactoring konsolidiert diese Muster ohne das visuelle Erscheinungsbild zu verändern.
Es werden keine neuen Features eingeführt. Der gewählte Ansatz ist **moderat**: Utility-CSS-Klassen
in `src/index.css` + Extraktion kleiner Hilfskomponenten + `tokens.js` als einzige JS-Farbquelle.

---

## Glossar

- **Design_Token_System**: Das zweiteilige System aus CSS Custom Properties in `src/index.css` (`:root`)
  und JS-Konstanten in `src/lib/tokens.js`. Ersteres ist die Laufzeit-Quelle für CSS-Kontexte,
  letzteres spiegelt die Suit/Spieltyp-Farben für SVG-, Canvas- und Inline-Style-Kontexte.
- **Inline_Style**: Ein React-`style`-Prop mit einem JS-Objekt, das direkt im JSX definiert ist.
- **Utility_Klasse**: Eine CSS-Klasse in `src/index.css`, die ein einzelnes, wiederverwendbares
  Style-Muster kapselt (z. B. `.stat-label`, `.stat-value`).
- **Hilfskomponente**: Eine kleine, zustandslose React-Komponente, die ein wiederkehrendes JSX-Muster
  kapselt (z. B. `<SuitBadge>`, `<RankingRow>`).
- **Hardcoded_Farbwert**: Ein Hex-Wert oder RGB-Wert, der direkt im JSX oder in einem Style-Objekt
  steht, anstatt aus `tokens.js` oder einer CSS Custom Property zu stammen.
- **SUIT_COLORS**: Das Objekt in `src/lib/tokens.js`, das Hintergrundfarben pro Spieltyp definiert.
- **GAME_TYPE_DISPLAY**: Ein lokales Objekt in `SkatScoreList.jsx`, das Farben und Symbole pro
  Spieltyp definiert - aktuell eine Duplikation von `SUIT_COLORS`.
- **statLabel_Muster**: Das Style-Objekt `{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)' }`, das in 5 Dateien dupliziert ist.
- **statValue_Muster**: Das Style-Objekt `{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif" }`, das in 3 Dateien dupliziert ist.

---

## Ist-Zustand (Problembeschreibung)

### Duplizierte Style-Objekte

| Muster | Vorkommen | Betroffene Dateien |
|---|---|---|
| `statLabel` | 5× | `StatistikenCharts.jsx`, `PlayerAnalytics.jsx`, `SkatScoreList.jsx`, `ResultDashboard.jsx`, `PlayerSettings.jsx` |
| `statValue` | 3× | `StatistikenCharts.jsx`, `PlayerAnalytics.jsx`, `SkatScoreList.jsx` |
| Ranking-Zeile (Badge + Name + Score) | 3× | `SkatScoreList.jsx` (Standardwertung, Seeger-Fabian, Kombiniert) |
| Spieltyp-Badge | 2× | `ResultDashboard.jsx` (`SuitBadge`), `SkatScoreList.jsx` (`GameTypeIcon`) |

### Token-Duplizierung und Inkonsistenz

- `GameTypeEditor.jsx` verwendet ein vollständig eigenes Farbsystem mit Hardcoded-Hex-Werten
  (`#7c3aed`, `#1a1a2e`, `#166534`, `#991b1b`, `#c0c0d0`) - diese Farben existieren nicht im
  Design-Token-System und weichen vom Rest der App ab.
- `ResultDashboard.jsx` definiert ein lokales `SUIT_COLORS`-Objekt mit leicht abweichenden Werten
  gegenüber `tokens.js` (z. B. `spade: '#3d4040'` vs. `'#414944'`).
- `SkatScoreList.jsx` definiert `GAME_TYPE_DISPLAY` mit eigenen Hex-Werten, die `SUIT_COLORS` aus
  `tokens.js` duplizieren.

### Betroffene Dateien

- `src/pages/SkatScoreList.jsx` - sehr stark betroffen
- `src/pages/StatistikenCharts.jsx` - stark betroffen
- `src/pages/PlayerAnalytics.jsx` - stark betroffen
- `src/pages/PlayerSettings.jsx` - stark betroffen
- `src/pages/GameScoringEntry.jsx` - moderat betroffen
- `src/components/Sidebar.jsx` - moderat betroffen
- `src/components/scoring/ResultDashboard.jsx` - stark betroffen
- `src/components/GameTypeEditor.jsx` - stark betroffen, eigenes Farbsystem

---

## Ziele

1. Duplizierte Style-Muster (`statLabel`, `statValue`) als Utility-CSS-Klassen in `src/index.css` definieren.
2. Duplizierte JSX-Muster (Ranking-Zeile, Spieltyp-Badge) als Hilfskomponenten extrahieren.
3. `tokens.js` zur einzigen Quelle für JS-Farbwerte machen - keine lokalen Farbduplikate mehr.
4. `GameTypeEditor.jsx` ins Design-Token-System integrieren.
5. Die visuelle Darstellung der App bleibt nach dem Refactoring identisch.

## Nicht-Ziele (Abgrenzung)

- **Kein CSS Modules** - alle Styles bleiben in `src/index.css` oder als Inline-Styles.
- **Kein Tailwind** oder andere Utility-CSS-Frameworks.
- **Keine neuen Features** - ausschließlich strukturelle Verbesserungen.
- **Keine Änderung der Spiellogik** - `src/lib/` bleibt unberührt.
- **Einmalige Layout-Inline-Styles dürfen bleiben** - `gridTemplateColumns`, spezifische `margin`-
  und `padding`-Werte, die nur einmal vorkommen und keinen Sinn als Klasse ergeben.
- **Keine Änderung der Datenbankschicht** - `syncService.js` und Supabase-Migrationen sind nicht betroffen.
- **Keine Änderung der Testlogik** - bestehende Tests müssen weiterhin bestehen, aber ihre Assertions
  werden nicht inhaltlich verändert.

---

## Anforderungen

### Anforderung 1: Utility-Klassen für duplizierte Typografie-Muster

**User Story:** Als Entwickler möchte ich, dass wiederkehrende Typografie-Muster als CSS-Klassen
definiert sind, damit ich Style-Objekte nicht mehr manuell duplizieren muss.

#### Akzeptanzkriterien

1. THE `index.css` SHALL eine Klasse `.stat-label` definieren, die das `statLabel`-Muster kapselt
   (`font-size: 0.65rem`, `font-weight: 700`, `text-transform: uppercase`, `letter-spacing: 0.1em`,
   `color: var(--outline)`).
2. THE `index.css` SHALL eine Klasse `.stat-value` definieren, die das `statValue`-Muster kapselt
   (`font-size: 1.75rem`, `font-weight: 800`, `font-family: 'Manrope', sans-serif`).
3. WHEN die Klasse `.stat-label` in einer Komponente verwendet wird, THE `Komponente` SHALL kein
   lokales `statLabel`-Style-Objekt mehr definieren.
4. WHEN die Klasse `.stat-value` in einer Komponente verwendet wird, THE `Komponente` SHALL kein
   lokales `statValue`-Style-Objekt mehr definieren.
5. THE `StatistikenCharts.jsx` SHALL die Klassen `.stat-label` und `.stat-value` anstelle der
   lokalen Konstanten `statLabel` und `statValue` verwenden.
6. THE `PlayerAnalytics.jsx` SHALL die Klassen `.stat-label` und `.stat-value` anstelle der
   lokalen Konstanten `statLabel` und `statValue` verwenden.
7. THE `SkatScoreList.jsx` SHALL die Klasse `.stat-label` für alle Stat-Kachel-Labels verwenden.
8. THE `ResultDashboard.jsx` SHALL die Klasse `.stat-label` für alle Beschriftungen im
   `statLabel`-Muster verwenden.

---

### Anforderung 2: Konsolidierung der Spieltyp-Badge-Komponente

**User Story:** Als Entwickler möchte ich eine einzige, kanonische `SuitBadge`-Komponente haben,
damit Spieltyp-Badges nicht mehr in mehreren Dateien separat implementiert werden.

#### Akzeptanzkriterien

1. THE `Codebase` SHALL eine einzige `SuitBadge`-Komponente enthalten, die für alle Spieltypen
   (`club`, `spade`, `heart`, `diamond`, `grand`, `null`, `passed`) ein korrektes Badge rendert.
2. WHEN `SuitBadge` mit einem bekannten `gameType` aufgerufen wird, THE `SuitBadge` SHALL
   Hintergrundfarbe und Vordergrundfarbe aus `SUIT_COLORS` bzw. `SUIT_TEXT_COLORS` aus `tokens.js`
   beziehen.
3. WHEN `SuitBadge` mit einem unbekannten `gameType` aufgerufen wird, THE `SuitBadge` SHALL
   einen definierten Fallback rendern (Fragezeichen-Symbol, `var(--surface-high)` als Hintergrund).
4. THE `ResultDashboard.jsx` SHALL die konsolidierte `SuitBadge`-Komponente verwenden und das
   lokale `SUIT_COLORS`-Objekt entfernen.
5. THE `SkatScoreList.jsx` SHALL die konsolidierte `SuitBadge`-Komponente anstelle von
   `GameTypeIcon` verwenden und das lokale `GAME_TYPE_DISPLAY`-Objekt entfernen.
6. THE `SuitBadge`-Komponente SHALL in `src/components/SuitBadge.jsx` definiert sein, damit sie
   von mehreren Seiten importiert werden kann.

---

### Anforderung 3: Extraktion der RankingRow-Hilfskomponente

**User Story:** Als Entwickler möchte ich, dass das Ranking-Zeilen-Muster (Badge + Name + Score)
als Hilfskomponente existiert, damit es nicht dreimal fast identisch in `SkatScoreList.jsx` steht.

#### Akzeptanzkriterien

1. THE `SkatScoreList.jsx` SHALL eine `RankingRow`-Komponente definieren oder importieren, die
   `rank`, `name` und `score` als Props akzeptiert.
2. WHEN `score >= 0`, THE `RankingRow` SHALL den Score in `var(--primary)` darstellen.
3. WHEN `score < 0`, THE `RankingRow` SHALL den Score in `var(--secondary)` darstellen.
4. WHEN `rank === 1`, THE `RankingRow` SHALL den Badge mit `var(--tertiary-container)` als
   Hintergrund darstellen.
5. WHEN `rank > 1`, THE `RankingRow` SHALL den Badge mit `var(--surface-high)` als Hintergrund
   darstellen.
6. THE drei Ranking-Karten (Standardwertung, Seeger-Fabian, Kombiniert) in `SkatScoreList.jsx`
   SHALL alle dieselbe `RankingRow`-Komponente verwenden.

---

### Anforderung 4: tokens.js als Single Source of Truth für JS-Farbwerte

**User Story:** Als Entwickler möchte ich, dass alle JS-seitigen Farbwerte aus `tokens.js` stammen,
damit Farbinkonsistenzen zwischen Komponenten ausgeschlossen sind.

#### Akzeptanzkriterien

1. THE `tokens.js` SHALL die einzige Datei in `src/` sein, die Spieltyp-Farbwerte als JS-Konstanten
   definiert.
2. THE `ResultDashboard.jsx` SHALL das lokale `SUIT_COLORS`-Objekt entfernen und stattdessen
   `SUIT_COLORS` aus `tokens.js` importieren.
3. THE `SkatScoreList.jsx` SHALL das lokale `GAME_TYPE_DISPLAY`-Objekt entfernen; Farbwerte
   SHALL aus `SUIT_COLORS` und `SUIT_TEXT_COLORS` aus `tokens.js` bezogen werden.
4. IF eine Komponente einen Spieltyp-Farbwert benötigt, THEN THE `Komponente` SHALL diesen Wert
   aus `tokens.js` importieren, nicht lokal definieren.
5. THE `tokens.js` SHALL alle Spieltypen abdecken, die in der App vorkommen: `club`, `spade`,
   `heart`, `diamond`, `grand`, `null`, `passed`.

---

### Anforderung 5: Integration von GameTypeEditor ins Design-Token-System

**User Story:** Als Entwickler möchte ich, dass `GameTypeEditor.jsx` dieselben Design-Tokens
verwendet wie der Rest der App, damit der Editor visuell konsistent ist.

#### Akzeptanzkriterien

1. THE `GameTypeEditor.jsx` SHALL keine Hardcoded-Hex-Werte mehr enthalten, die außerhalb des
   Design-Token-Systems liegen (`#7c3aed`, `#1a1a2e`, `#166534`, `#991b1b`, `#c0c0d0`).
2. THE `GameTypeEditor.jsx` SHALL für den aktiven Zustand von Chips und Buttons CSS Custom
   Properties aus `src/index.css` verwenden (z. B. `var(--primary)`, `var(--secondary)`,
   `var(--tertiary)`).
3. THE `GameTypeEditor.jsx` SHALL für Spieltyp-Buttons die Farben aus `SUIT_COLORS` und
   `SUIT_TEXT_COLORS` aus `tokens.js` verwenden.
4. THE `GameTypeEditor.jsx` SHALL für Gewonnen/Verloren-Buttons `var(--primary)` bzw.
   `var(--secondary)` verwenden.
5. THE `GameTypeEditor.jsx` SHALL für den Dialog-Hintergrund `var(--surface)` und für den
   Overlay-Hintergrund `rgba(0, 0, 0, 0.55)` verwenden (letzteres ist kein Token-Wert und darf
   als Inline-Style bleiben).
6. THE `GameTypeEditor.jsx` SHALL für Textfarben `var(--on-surface)` und `var(--outline)`
   verwenden anstelle von `#1a1a2e` und `#555577`.

---

### Anforderung 6: Visuelle Regression - Keine sichtbaren Änderungen

**User Story:** Als Nutzer möchte ich, dass die App nach dem Refactoring exakt gleich aussieht,
damit das Refactoring keine unbeabsichtigten visuellen Änderungen einführt.

#### Akzeptanzkriterien

1. WHEN das Refactoring abgeschlossen ist, THE `App` SHALL in allen betroffenen Seiten
   (`SkatScoreList`, `StatistikenCharts`, `PlayerAnalytics`, `PlayerSettings`, `GameScoringEntry`,
   `ResultDashboard`) visuell identisch zur Vorversion aussehen.
2. THE `App` SHALL nach dem Refactoring alle bestehenden Tests (`npm test`) ohne Fehler bestehen.
3. WHEN eine CSS-Klasse einen Inline-Style ersetzt, THE `Klasse` SHALL dieselben berechneten
   CSS-Werte erzeugen wie der ersetzte Inline-Style.

---

## Korrektheitseigenschaften (Property-Based Tests)

Die folgenden Eigenschaften sind als Property-Based Tests mit `fast-check` zu implementieren.
Sie validieren Invarianten des Refactorings, die für beliebige Eingaben gelten müssen.

### Eigenschaft 1: Farbkonsistenz zwischen tokens.js und SuitBadge

**Invariante:** Für alle gültigen `gameType`-Werte muss `SuitBadge` dieselbe Hintergrundfarbe
verwenden wie `SUIT_COLORS[gameType]` aus `tokens.js`.

```
∀ gameType ∈ { 'club', 'spade', 'heart', 'diamond', 'grand', 'null', 'passed' }:
  SuitBadge(gameType).backgroundColor === SUIT_COLORS[gameType]
```

**Testdatei:** `src/components/SuitBadge.property.test.jsx`

### Eigenschaft 2: RankingRow - Score-Farb-Invariante

**Invariante:** Für beliebige ganzzahlige Score-Werte muss `RankingRow` die korrekte Farbe
verwenden - unabhängig vom konkreten Wert.

```
∀ score ∈ Integer:
  score >= 0 → RankingRow rendert Score mit var(--primary)
  score < 0  → RankingRow rendert Score mit var(--secondary)
```

**Testdatei:** `src/pages/SkatScoreList.property.test.jsx` (oder neben der extrahierten Komponente)

### Eigenschaft 3: RankingRow - Badge-Farb-Invariante

**Invariante:** Für beliebige Rang-Werte muss `RankingRow` den Badge korrekt einfärben.

```
∀ rank ∈ PositiveInteger:
  rank === 1 → Badge-Hintergrund ist var(--tertiary-container)
  rank > 1   → Badge-Hintergrund ist var(--surface-high)
```

### Eigenschaft 4: SuitBadge - Vollständigkeit der Spieltypen

**Invariante:** `SuitBadge` darf für keinen der definierten Spieltypen den Fallback-Zustand
(Fragezeichen) rendern.

```
∀ gameType ∈ Object.keys(SUIT_COLORS):
  SuitBadge(gameType) rendert KEIN Fragezeichen-Fallback
```

### Eigenschaft 5: tokens.js - Symmetrie zwischen SUIT_COLORS und SUIT_TEXT_COLORS

**Invariante:** Für jeden Schlüssel in `SUIT_COLORS` muss ein entsprechender Schlüssel in
`SUIT_TEXT_COLORS` existieren (und umgekehrt).

```
∀ key ∈ Object.keys(SUIT_COLORS):
  key ∈ Object.keys(SUIT_TEXT_COLORS)

∀ key ∈ Object.keys(SUIT_TEXT_COLORS):
  key ∈ Object.keys(SUIT_COLORS)
```

**Testdatei:** `src/lib/tokens.property.test.js`

---

## Abgrenzungen (Was wird NICHT gemacht)

| Thema | Begründung |
|---|---|
| CSS Modules einführen | Erhöht Komplexität ohne klaren Mehrwert für dieses Projekt |
| Tailwind oder andere Utility-Frameworks | Nicht im Tech-Stack, würde Build-Konfiguration ändern |
| Spiellogik in `src/lib/` anfassen | Außerhalb des Scope; Logik ist bereits gut isoliert |
| Einmalige Layout-Styles entfernen | `gridTemplateColumns`, spezifische Margins - kein Duplikationsproblem |
| Visuelle Änderungen am Design | Refactoring, kein Redesign |
| Neue Komponenten für Seiten ohne Duplikation | Nur Dateien mit nachgewiesener Duplikation werden angefasst |
| Supabase-Schema oder Migrationen | Nicht betroffen |
| Bestehende Tests inhaltlich ändern | Tests müssen weiterhin bestehen, aber ihre Assertions bleiben unverändert |
| `src/components/analytics/`-Komponenten | Diese Komponenten sind moderat betroffen, aber nicht priorisiert |
