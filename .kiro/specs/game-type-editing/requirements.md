# Anforderungsdokument: Spieltyp-Bearbeitung (game-type-editing)

## Einleitung

Die Skat-Scoring-App enthält eine "Skatliste" mit über 300 importierten historischen Spielen,
bei denen der Spieltyp (`game_type`, `type_label`) nicht bekannt war und daher als Platzhalter
(z. B. "Import") gespeichert wurde. Dieses Feature ermöglicht es dem Benutzer, den Spieltyp
und zugehörige Attribute (z. B. Hand, Ouvert) für einzelne Runden nachträglich manuell zu
ergänzen. Es handelt sich ausschließlich um das Hinzufügen von Kontextinformationen –
der numerische Spielwert (`game_value`) bleibt unverändert und wird nicht neu berechnet.
Änderungen werden sofort in der Supabase-Datenbank persistiert.

---

## Glossar

- **Skatliste**: Die Seite `SkatScoreList`, die alle Runden einer Session tabellarisch anzeigt.
- **Runde**: Ein einzelner Spieleintrag in der Tabelle `rounds` der Datenbank, repräsentiert durch ein Round-Objekt im Frontend.
- **Spieltyp**: Das Feld `game_type` einer Runde (z. B. `null`, `club`, `spade`, `heart`, `diamond`, `grand`).
- **Typ-Label**: Das Feld `type_label` einer Runde, das den lesbaren Namen des Spieltyps enthält (z. B. "Null Ouvert", "Kreuz").
- **Spielwert**: Das Feld `game_value` einer Runde, berechnet nach den offiziellen Skatregeln.
- **Bearbeitungsdialog**: Ein modales UI-Element, das dem Benutzer die Felder zur Bearbeitung einer Runde anzeigt.
- **Spieltyp-Editor**: Die Komponente, die den Bearbeitungsdialog rendert und die Eingaben verwaltet.
- **SyncService**: Das Modul `src/lib/syncService.js`, das die Kommunikation mit Supabase kapselt.
- **GameContext**: Der React-Kontext `src/context/GameContext.jsx`, der den globalen Spielzustand verwaltet.
- **Null-Spiel**: Ein Skat-Spieltyp mit festen Werten (Null: 23, Null Hand: 35, Null Ouvert: 46, Null Ouvert Hand: 59).
- **Farb-/Grand-Spiel**: Ein Skat-Spieltyp mit variablem Spielwert (Kreuz, Pik, Herz, Karo, Grand).

---

## Anforderungen

### Anforderung 1: Bearbeitungsmodus in der Skatliste aktivieren

**User Story:** Als Benutzer möchte ich in der Skatliste eine Runde zur Bearbeitung auswählen können, damit ich den Spieltyp nachträglich korrigieren kann.

#### Akzeptanzkriterien

1. THE Skatliste SHALL für jede Runde ein Bearbeitungs-Icon (Stift-Symbol) in der Tabellenzeile anzeigen.
2. WHEN der Benutzer auf das Bearbeitungs-Icon einer Runde klickt, THE Spieltyp-Editor SHALL den Bearbeitungsdialog für genau diese Runde öffnen.
3. WHILE der Bearbeitungsdialog geöffnet ist, THE Skatliste SHALL den Hintergrund visuell abdunkeln (Overlay).
4. WHEN der Benutzer außerhalb des Bearbeitungsdialogs klickt oder die Escape-Taste drückt, THE Spieltyp-Editor SHALL den Bearbeitungsdialog schließen, ohne Änderungen zu speichern.

---

### Anforderung 2: Spieltyp und Attribute im Dialog bearbeiten

**User Story:** Als Benutzer möchte ich im Bearbeitungsdialog den Spieltyp und die zugehörigen Attribute einer Runde auswählen können, damit die Daten korrekt erfasst werden.

#### Akzeptanzkriterien

1. THE Bearbeitungsdialog SHALL die aktuellen Werte der Runde (Spieltyp, Hand, Ouvert, Schneider, Schwarz, Spitzen) als Vorauswahl anzeigen.
2. THE Bearbeitungsdialog SHALL alle gültigen Skatspieltypen zur Auswahl anbieten: `null`, `club`, `spade`, `heart`, `diamond`, `grand`.
3. WHEN der Benutzer den Spieltyp `null` auswählt, THE Bearbeitungsdialog SHALL die Optionen "Hand" und "Ouvert" als Checkboxen anzeigen und die Felder "Spitzen" und "Augenzahl" ausblenden.
4. WHEN der Benutzer einen Farb- oder Grand-Spieltyp auswählt, THE Bearbeitungsdialog SHALL die Felder "Spitzen" (1–11 für Farbe, 1–4 für Grand) und "Augenzahl" (0–120) anzeigen.
5. THE Bearbeitungsdialog SHALL den berechneten Spielwert in Echtzeit aktualisieren, sobald der Benutzer eine Eingabe ändert.
6. IF der Benutzer einen ungültigen Wert für "Spitzen" (außerhalb des gültigen Bereichs) eingibt, THEN THE Bearbeitungsdialog SHALL eine Fehlermeldung anzeigen und die Speichern-Schaltfläche deaktivieren.
7. IF der Benutzer einen ungültigen Wert für "Augenzahl" (außerhalb 0–120) eingibt, THEN THE Bearbeitungsdialog SHALL eine Fehlermeldung anzeigen und die Speichern-Schaltfläche deaktivieren.

---

### Anforderung 3: Änderungen speichern

**User Story:** Als Benutzer möchte ich die bearbeiteten Kontextinformationen speichern können, damit der Spieltyp korrekt in der Liste angezeigt wird.

#### Akzeptanzkriterien

1. WHEN der Benutzer auf "Speichern" klickt, THE SyncService SHALL ausschließlich die Felder `game_type`, `type_label`, `hand`, `ouvert`, `schneider`, `schwarz`, `spitzen` der betreffenden Runde in der Datenbank aktualisieren.
2. THE Spieltyp-Editor SHALL beim Speichern den Wert des Feldes `game_value` nicht verändern und keine Neuberechnung des Spielwerts durchführen.
3. WHEN der SyncService die Datenbank erfolgreich aktualisiert hat, THE GameContext SHALL den lokalen Zustand der Runde mit den neuen Feldwerten ersetzen.
4. WHEN der GameContext den lokalen Zustand aktualisiert hat, THE Skatliste SHALL das aktualisierte Typ-Label sofort anzeigen, ohne die Seite neu zu laden.
5. IF der SyncService beim Speichern einen Datenbankfehler zurückgibt, THEN THE Spieltyp-Editor SHALL eine Fehlermeldung anzeigen und den lokalen Zustand unverändert lassen.

---

### Anforderung 4: Datenintegrität und Rundenkonsistenz

**User Story:** Als Benutzer möchte ich sicher sein, dass nach einer Bearbeitung die gespeicherten Felder konsistent in der Liste angezeigt werden, damit keine widersprüchlichen Werte erscheinen.

#### Akzeptanzkriterien

1. THE SyncService SHALL beim Aktualisieren einer Runde ausschließlich die bearbeiteten Felder (`game_type`, `type_label`, `hand`, `ouvert`, `schneider`, `schwarz`, `spitzen`) überschreiben und alle anderen Felder (z. B. `game_value`, `player`, `round_number`, `roles`, `timestamp`) unverändert lassen.
2. FOR ALL Runden: WHEN eine Runde bearbeitet und gespeichert wird, THE Skatliste SHALL dieselben Werte für `game_type` und `type_label` anzeigen wie nach einem vollständigen Neuladen der Seite (Konsistenz-Eigenschaft).
3. WHEN eine Runde gespeichert wird, THE GameContext SHALL sicherstellen, dass der angezeigte `game_value` identisch mit dem Wert vor der Bearbeitung ist.
