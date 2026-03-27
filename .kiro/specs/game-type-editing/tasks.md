# Implementierungsplan: Spieltyp-Bearbeitung (game-type-editing)

## Übersicht

Implementierung der nachträglichen Bearbeitung von Spieltyp-Feldern in der Skatliste.
Der Datenfluss folgt dem bestehenden Muster: `GameTypeEditor` → `GameContext.updateRound` → `syncService.updateRound` → Supabase.

## Aufgaben

- [x] 1. `syncService.updateRound` implementieren
  - Neue Funktion `updateRound(roundDbId, patch)` in `src/lib/syncService.js` ergänzen
  - Führt ein Supabase-UPDATE auf der `rounds`-Tabelle durch, beschränkt auf die Felder `game_type`, `type_label`, `hand`, `ouvert`, `schneider`, `schwarz`, `spitzen`
  - Gibt `{ data, error }` zurück (analog zu `deleteRound`)
  - _Anforderungen: 3.1, 4.1_

  - [x] 1.1 Unit-Tests für `updateRound` in `src/lib/syncService.test.js` ergänzen
    - Test: Patch-Objekt enthält ausschließlich die erlaubten Felder
    - Test: `game_value` wird nicht verändert
    - _Anforderungen: 3.1, 4.1_

- [x] 2. `UPDATE_ROUND`-Action und `updateRound`-Funktion im GameContext implementieren
  - `UPDATE_ROUND`-Case im `gameReducer` in `src/context/GameContext.jsx` ergänzen: aktualisiert nur die Runde mit passender `id`, alle anderen Runden bleiben unverändert
  - `updateRound`-Callback mit `useCallback` hinzufügen: ruft `syncService.updateRound` auf, dispatcht `UPDATE_ROUND` nur bei Erfolg, gibt `{ error }` zurück
  - `updateRound` im Context-Value-Objekt exportieren
  - _Anforderungen: 3.2, 3.3, 3.5_

  - [ ]* 2.1 Unit-Tests für den `UPDATE_ROUND`-Reducer in `src/context/GameContext.test.js`
    - Test: Nur die bearbeitete Runde wird aktualisiert, alle anderen bleiben unverändert
    - Test: `game_value` bleibt nach `UPDATE_ROUND` unverändert
    - _Anforderungen: 3.2, 4.3_

  - [ ]* 2.2 Property-Test: `game_value` bleibt nach Speichern unverändert (Property 6)
    - **Property 6: game_value bleibt nach Speichern unverändert**
    - **Validates: Anforderungen 3.2, 4.3**
    - Datei: `src/components/GameTypeEditor.property.test.jsx`
    - `fc.property(arbitraryRound, arbitraryValidPatch, ...)` – wendet `UPDATE_ROUND`-Reducer an und prüft `game_value`
    - Mindestens 100 Iterationen

- [x] 3. Hilfsfunktion `buildTypeLabel` und Spieltyp-Konstanten bereitstellen
  - Funktion `buildTypeLabel(gameType, { hand, ouvert })` in `src/components/GameTypeEditor.jsx` definieren (nutzt `SUIT_LABELS` aus `skatScoring.js`)
  - Spitzen-Validierungsbereiche als Konstante definieren: Farbe 1–11, Grand 1–4
  - _Anforderungen: 2.3, 2.4, 2.6_

- [x] 4. `GameTypeEditor`-Komponente implementieren
  - Neue Datei `src/components/GameTypeEditor.jsx` erstellen
  - Props: `round`, `onClose`, `onSaved`
  - Interner State: `gameType`, `hand`, `ouvert`, `schneider`, `schwarz`, `spitzen`, `errors`, `saving`
  - Formular mit Spieltyp-Auswahl (alle 6 Typen), Checkboxen (Hand, Ouvert, Schneider, Schwarz), Spitzen-Eingabefeld
  - Feldanzeige abhängig vom Spieltyp: bei `null` nur Hand/Ouvert, bei Farbe/Grand zusätzlich Spitzen
  - Vorauswahl aus `round`-Prop beim Öffnen
  - Inline-Validierung für Spitzen-Bereich
  - Speichern-Button: ruft `updateRound` aus GameContext auf, zeigt Fehler im Dialog, ruft `onSaved` bei Erfolg
  - Schließen bei Escape-Taste und Overlay-Klick (ohne Speichern)
  - _Anforderungen: 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.6, 3.2, 3.5_

  - [x] 4.1 Unit-Tests für `GameTypeEditor` in `src/components/GameTypeEditor.test.jsx`
    - Test: Dialog öffnet sich mit korrekten Vorauswahl-Werten
    - Test: Alle 6 Spieltypen sind in der Auswahl vorhanden
    - Test: Null-Spieltyp – Spitzen-Feld nicht sichtbar
    - Test: Farb-Spieltyp – Spitzen-Feld sichtbar
    - Test: Speichern-Button bei ungültigem Spitzen-Wert deaktiviert
    - Test: Escape schließt Dialog ohne Speichern
    - Test: Fehlermeldung bei simuliertem DB-Fehler
    - _Anforderungen: 1.4, 2.1, 2.2, 2.3, 2.4, 2.6, 3.5_

  - [x] 4.2 Property-Test: Dialog öffnet korrekte Runde (Property 2)
    - **Property 2: Dialog öffnet korrekte Runde**
    - **Validates: Anforderungen 1.2, 2.1**
    - Datei: `src/components/GameTypeEditor.property.test.jsx`
    - `fc.property(arbitraryRound, ...)` – rendert `GameTypeEditor`, prüft Formularfelder gegen `round`-Werte
    - Mindestens 100 Iterationen

  - [ ]* 4.3 Property-Test: Feldanzeige abhängig vom Spieltyp (Property 4)
    - **Property 4: Feldanzeige abhängig vom Spieltyp**
    - **Validates: Anforderungen 2.3, 2.4**
    - Datei: `src/components/GameTypeEditor.property.test.jsx`
    - `fc.property(fc.constantFrom('null','club','spade','heart','diamond','grand'), ...)` – prüft Sichtbarkeit der Felder
    - Mindestens 100 Iterationen

  - [ ]* 4.4 Property-Test: Validierung ungültiger Eingaben blockiert Speichern (Property 5)
    - **Property 5: Validierung ungültiger Eingaben blockiert Speichern**
    - **Validates: Anforderungen 2.6, 2.7**
    - Datei: `src/components/GameTypeEditor.property.test.jsx`
    - `fc.property(arbitraryInvalidSpitzen, ...)` – prüft deaktivierten Button und sichtbare Fehlermeldung
    - Mindestens 100 Iterationen

- [x] 5. Checkpoint – Bisherige Tests prüfen
  - Sicherstellen, dass alle bisherigen Tests bestehen. Bei Fragen den Benutzer ansprechen.

- [x] 6. `SkatScoreList` und `RoundRow` um Bearbeitungsfunktion erweitern
  - `editingRound`-State (`null | RoundObject`) in `SkatScoreList` hinzufügen
  - `onEdit`-Prop zu `RoundRow` ergänzen; Stift-Icon (`edit` aus Material Symbols) in jeder Zeile rendern
  - `GameTypeEditor` als Modal in `SkatScoreList` einbinden: wird gerendert wenn `editingRound !== null`
  - `onClose`/`onSaved`-Handler: setzen `editingRound` zurück auf `null`
  - `updateRound` aus `useGame()` beziehen
  - _Anforderungen: 1.1, 1.2, 1.3, 1.4, 3.4_

  - [ ]* 6.1 Property-Test: Nur erlaubte Felder werden aktualisiert (Property 7)
    - **Property 7: Nur erlaubte Felder werden aktualisiert**
    - **Validates: Anforderungen 3.1, 4.1**
    - Datei: `src/components/GameTypeEditor.property.test.jsx`
    - `fc.property(arbitraryRound, arbitraryValidPatch, ...)` – mockt Supabase, prüft gesendetes Patch-Objekt
    - Mindestens 100 Iterationen

  - [ ]* 6.2 Property-Test: Round-Trip-Konsistenz (Property 8)
    - **Property 8: Lokaler Zustand spiegelt gespeicherte Werte wider (Round-Trip)**
    - **Validates: Anforderungen 3.3, 3.4, 4.2**
    - Datei: `src/components/GameTypeEditor.property.test.jsx`
    - `fc.property(arbitraryRound, arbitraryValidPatch, ...)` – speichert, lädt neu, vergleicht `game_type` und `type_label`
    - Mindestens 100 Iterationen

  - [ ]* 6.3 Property-Test: Fehlerbehandlung bei DB-Fehler (Property 9)
    - **Property 9: Fehlerbehandlung bei DB-Fehler**
    - **Validates: Anforderungen 3.5**
    - Datei: `src/components/GameTypeEditor.property.test.jsx`
    - `fc.property(arbitraryRound, arbitraryValidPatch, ...)` – mockt DB-Fehler, prüft unveränderter lokaler Zustand und sichtbare Fehlermeldung
    - Mindestens 100 Iterationen

- [x] 7. Abschluss-Checkpoint – Alle Tests bestehen
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen den Benutzer ansprechen.

## Hinweise

- Aufgaben mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jede Aufgabe referenziert die zugehörigen Anforderungen für Rückverfolgbarkeit
- Property-Tests nutzen **fast-check** mit mindestens 100 Iterationen pro Property
- Der `game_value` wird bei keiner Bearbeitungsaktion verändert oder neu berechnet
- Fehler beim Speichern bleiben im Dialog-State isoliert (kein globaler `syncError`)
