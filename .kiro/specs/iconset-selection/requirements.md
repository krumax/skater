# Requirements Document

## Introduction

Die Skatastrophe-App soll auf der Einstellungsseite eine Auswahl zwischen zwei Iconsets für die Kartenfarben anbieten. Aktuell werden ausschließlich Unicode-Symbole des Französischen Blatts (♣ ♠ ♥ ♦) verwendet. Mit diesem Feature kann der Benutzer stattdessen das Altenburger Blatt wählen, dessen Symbole (Eichel, Grün, Rot, Schellen) als PNG-Icons bereits im Repository vorliegen. Die gewählte Einstellung gilt global für alle Stellen in der App, an denen Kartenfarben dargestellt werden, und wird persistent im `localStorage` gespeichert.

## Glossary

- **Iconset**: Eine vollständige Sammlung von Symbolen für die vier Kartenfarben (club, spade, heart, diamond).
- **Französisches Blatt**: Das Standard-Iconset mit Unicode-Symbolen ♣ (Kreuz), ♠ (Pik), ♥ (Herz), ♦ (Karo).
- **Altenburger Blatt**: Das alternative Iconset mit PNG-Bilddateien: Eichel (≙ Kreuz), Grün (≙ Pik), Rot (≙ Herz), Schellen (≙ Karo).
- **IconsetProvider**: Der React-Context, der die aktive Iconset-Einstellung app-weit bereitstellt.
- **SuitIcon**: Die neue, iconset-bewusste Komponente, die ein einzelnes Farbsymbol rendert.
- **SuitBadge**: Die bestehende Komponente, die ein farbiges Badge mit Farbsymbol rendert.
- **GameTypeSelector**: Die bestehende Komponente in der Spielerfassung, die die Spielart-Auswahl rendert.
- **localStorage**: Der browserseitige Schlüssel-Wert-Speicher; Schlüssel für die Iconset-Einstellung: `skatIconset`.

---

## Requirements

### Requirement 1: Iconset-Auswahl in den Einstellungen

**User Story:** Als Spieler möchte ich auf der Einstellungsseite zwischen dem Französischen Blatt und dem Altenburger Blatt wählen können, damit die App die mir vertrauten Kartensymbole anzeigt.

#### Acceptance Criteria

1. THE Einstellungsseite SHALL einen Abschnitt „Kartensymbole" mit zwei auswählbaren Optionen anzeigen: „Französisches Blatt" und „Altenburger Blatt".
2. WHEN der Benutzer eine Option auswählt, THE IconsetProvider SHALL das aktive Iconset sofort auf den neuen Wert setzen.
3. WHEN der Benutzer eine Option auswählt, THE Einstellungsseite SHALL die gewählte Option visuell als aktiv hervorheben.
4. THE Einstellungsseite SHALL für jede Option eine Vorschau der vier Farbsymbole anzeigen, damit der Benutzer die Optionen unterscheiden kann.
5. WHEN das Altenburger Blatt aktiv ist, THE Einstellungsseite SHALL die Altenburger Bezeichnungen „Eichel, Grün, Rot, Schellen" als Beschriftung der Vorschau anzeigen.
6. WHEN das Französische Blatt aktiv ist, THE Einstellungsseite SHALL die Bezeichnungen „Kreuz, Pik, Herz, Karo" als Beschriftung der Vorschau anzeigen.

---

### Requirement 2: Persistenz der Iconset-Einstellung

**User Story:** Als Spieler möchte ich, dass meine Iconset-Wahl nach einem Seitenneustart erhalten bleibt, damit ich die Einstellung nicht bei jedem Besuch erneut vornehmen muss.

#### Acceptance Criteria

1. WHEN der Benutzer ein Iconset auswählt, THE IconsetProvider SHALL die Wahl unter dem Schlüssel `skatIconset` im `localStorage` speichern.
2. WHEN die App gestartet wird, THE IconsetProvider SHALL den Wert unter `skatIconset` aus dem `localStorage` lesen und als initiales Iconset setzen.
3. IF kein Wert unter `skatIconset` im `localStorage` vorhanden ist, THEN THE IconsetProvider SHALL das Französische Blatt als Standard-Iconset verwenden.
4. IF der `localStorage`-Zugriff einen Fehler wirft, THEN THE IconsetProvider SHALL das Französische Blatt als Fallback verwenden und keinen Fehler an den Benutzer weitergeben.

---

### Requirement 3: Globale Anwendung des Iconsets

**User Story:** Als Spieler möchte ich, dass das gewählte Iconset überall in der App verwendet wird, wo Kartenfarben dargestellt werden, damit die Darstellung konsistent ist.

#### Acceptance Criteria

1. WHILE das Altenburger Blatt aktiv ist, THE SuitBadge SHALL für die Farben club, spade, heart und diamond das entsprechende Altenburger PNG-Icon anstelle des Unicode-Symbols anzeigen.
2. WHILE das Altenburger Blatt aktiv ist, THE GameTypeSelector SHALL für die Farben club, spade, heart und diamond das entsprechende Altenburger PNG-Icon anstelle des Unicode-Symbols anzeigen.
3. WHILE das Altenburger Blatt aktiv ist, THE SkatScoreList SHALL für die Farben club, spade, heart und diamond das entsprechende Altenburger PNG-Icon anstelle des Unicode-Symbols anzeigen.
4. WHILE das Altenburger Blatt aktiv ist, THE PlayerAnalytics SHALL für die Farben club, spade, heart und diamond das entsprechende Altenburger PNG-Icon anstelle des Unicode-Symbols anzeigen.
5. WHILE das Altenburger Blatt aktiv ist, THE StatistikenCharts SHALL für die Farben club, spade, heart und diamond das entsprechende Altenburger PNG-Icon anstelle des Unicode-Symbols anzeigen.
6. WHILE das Altenburger Blatt aktiv ist, THE GameTypeHeatmap SHALL für die Farben club, spade, heart und diamond das entsprechende Altenburger PNG-Icon anstelle des Unicode-Symbols anzeigen.
7. THE SuitIcon SHALL für die Spieltypen grand, null und passed stets die bestehenden Material-Icons (stars, block, skip_next) anzeigen, unabhängig vom aktiven Iconset.
8. WHEN das Iconset gewechselt wird, THE App SHALL alle betroffenen Komponenten ohne Seitenneustart aktualisieren.

---

### Requirement 4: Altenburger Iconset – Bilddateien und Zuordnung

**User Story:** Als Entwickler möchte ich eine klare, wartbare Zuordnung zwischen den Spieltyp-Schlüsseln der App und den Altenburger PNG-Dateien haben, damit die Icons korrekt und konsistent eingebunden werden.

#### Acceptance Criteria

1. THE App SHALL die PNG-Dateien aus dem Ordner `assets/icon_altenburg_einfach/` für das Altenburger Iconset verwenden.
2. THE IconsetProvider SHALL die folgende Zuordnung verwenden: `club` → `eichel_icon_einfach.png`, `spade` → `gruen_icon_einfach.png`, `heart` → `rot_icon_einfach.png`, `diamond` → `schellen_icon_einfach.png`.
3. THE SuitIcon SHALL Altenburger PNG-Icons mit einem `alt`-Attribut versehen, das den deutschen Namen der Farbe enthält (Eichel, Grün, Rot, Schellen), um Barrierefreiheit zu gewährleisten.
4. IF eine PNG-Datei nicht geladen werden kann, THEN THE SuitIcon SHALL das entsprechende Unicode-Symbol des Französischen Blatts als Fallback anzeigen.

---

### Requirement 5: Iconset-Context und Architektur

**User Story:** Als Entwickler möchte ich, dass die Iconset-Einstellung über einen zentralen React-Context bereitgestellt wird, damit alle Komponenten einheitlich darauf zugreifen können, ohne Prop-Drilling.

#### Acceptance Criteria

1. THE App SHALL einen `IconsetProvider` bereitstellen, der den aktiven Iconset-Wert (`'french'` oder `'altenburg'`) und eine Setter-Funktion über React-Context exponiert.
2. THE `IconsetProvider` SHALL in `App.jsx` in den Provider-Baum eingebunden werden, sodass alle Routen und Komponenten Zugriff haben.
3. THE App SHALL einen `useIconset`-Hook bereitstellen, über den Komponenten das aktive Iconset und die Setter-Funktion abrufen können.
4. IF `useIconset` außerhalb des `IconsetProvider` aufgerufen wird, THEN THE Hook SHALL einen Fehler mit einer beschreibenden Meldung werfen.
5. THE App SHALL eine zentrale `SuitIcon`-Komponente bereitstellen, die anhand des aktiven Iconsets entweder das Unicode-Symbol oder das PNG-Icon rendert, sodass keine Komponente direkt auf `SUIT_SYMBOLS` aus `tokens.js` oder `skatScoring.js` zugreifen muss, um ein Farbsymbol darzustellen.
