# Implementierungsplan: Bockrunden

## Übersicht

Schrittweise Integration des Bockrunden-Features in die bestehende Skat-Scoring-App. Der Bock-Faktor wird einmalig beim Speichern auf den `game_value` angewendet; alle nachgelagerten Berechnungen bleiben unverändert.

## Tasks

- [x] 1. Datenbankschema erweitern
  - Neue Migrationsdatei `supabase/migrations/003_add_bock_field.sql` erstellen
  - `ALTER TABLE rounds ADD COLUMN IF NOT EXISTS is_bock boolean NOT NULL DEFAULT false;`
  - _Requirements: 3.4_

- [x] 2. SyncService um `is_bock` erweitern
  - [x] 2.1 `insertRound` in `src/lib/syncService.js` um `is_bock: round.isBock ?? false` ergänzen
    - _Requirements: 3.1_
  - [x] 2.2 `updateRound` in `src/lib/syncService.js`: `is_bock` und `game_value` zur `allowed`-Liste hinzufügen
    - _Requirements: 3.2_
  - [x] 2.3 `loadSession` in `src/lib/syncService.js`: Mapping `isBock: r.is_bock ?? false` im rounds-Map ergänzen
    - _Requirements: 3.3_
  - [x] 2.4 Property-Test für Bock-Persistenz Round-Trip schreiben
    - **Property 3: Bock-Persistenz Round-Trip**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Mock-basiert (kein echter DB-Aufruf), fast-check, mind. 100 Iterationen
    - `// Feature: bockrunden, Property 3: Bock-Persistenz Round-Trip`

- [x] 3. GameContext: Bock-Verdopplung in `ADD_ROUND` und `updateRound`
  - [x] 3.1 Reducer `ADD_ROUND` in `src/context/GameContext.jsx` anpassen
    - `finalGameValue = isBock ? gameValue * 2 : gameValue` vor dem Erstellen des round-Objekts
    - `isBock: action.payload.isBock ?? false` im round-Objekt speichern
    - _Requirements: 1.4, 1.5, 5.3_
  - [x] 3.2 Property-Test: Bock-Verdopplung ist korrekt
    - **Property 1: Bock-Verdopplung ist korrekt**
    - **Validates: Requirements 1.2, 1.4, 2.3, 5.3**
    - Generator: zufällige gültige Spielkonfigurationen; Assertion: gespeicherter `game_value === calculateGameValue(config).gameValue * 2`
    - `// Feature: bockrunden, Property 1: Bock-Verdopplung ist korrekt`
  - [x] 3.3 Property-Test: Kein Bock bedeutet unveränderter Spielwert
    - **Property 2: Kein Bock bedeutet unveränderter Spielwert**
    - **Validates: Requirements 1.3, 1.5, 2.4**
    - `// Feature: bockrunden, Property 2: Kein Bock bedeutet unveränderter Spielwert`
  - [x] 3.4 `updateRound` in `src/context/GameContext.jsx` anpassen
    - `isBock` → `is_bock` und `gameValue` → `game_value` im `snakePatch` ergänzen
    - _Requirements: 2.2, 2.3, 2.4_
  - [x] 3.5 Property-Test: Gesamtpunkte berücksichtigen Bock-Spielwert korrekt
    - **Property 7: Gesamtpunkte berücksichtigen Bock-Spielwert korrekt**
    - **Validates: Requirements 5.1, 5.2**
    - Generator: zufällige Mengen von Runden mit und ohne Bock; Assertion: `getPlayerTotals()` = Summe aller gespeicherten `game_value`-Felder
    - `// Feature: bockrunden, Property 7: Gesamtpunkte berücksichtigen Bock-Spielwert korrekt`

- [x] 4. Checkpoint - Alle Tests ausführen
  - Sicherstellen, dass alle bisherigen Tests weiterhin grün sind. Bei Fragen den Nutzer ansprechen.

- [x] 5. GameScoringEntry: Bockrunden-Toggle und Vorschau
  - [x] 5.1 Lokalen State `isBock` und Toggle-Chip „Bockrunde" in `src/pages/GameScoringEntry.jsx` hinzufügen
    - Toggle in der Spielstufe-Sektion als Chip (analog zu Hand/Schneider/Schwarz/Ouvert)
    - `resetForm` setzt `isBock` auf `false`
    - _Requirements: 1.1, 1.6_
  - [x] 5.2 Property-Test: Formular-Reset setzt Bock-Toggle zurück
    - **Property 4: Formular-Reset setzt Bock-Toggle zurück**
    - **Validates: Requirements 1.6**
    - `// Feature: bockrunden, Property 4: Formular-Reset setzt Bock-Toggle zurück`
  - [x] 5.3 Ergebnis-Dashboard in `GameScoringEntry` anpassen
    - Wenn `isBock`, Breakdown-Zeile „Bockrunde ×2" anzeigen
    - Angezeigter Spielwert = `result.gameValue × 2` in der Vorschau
    - _Requirements: 1.2, 1.3, 4.2, 4.3_
  - [x] 5.4 `handleCommit` übergibt `isBock` an `addRound`
    - _Requirements: 1.4, 1.5_

- [x] 6. GameTypeEditor: Bockrunden-Toggle im Bearbeitungsdialog
  - [x] 6.1 Lokalen State `isBock` und `CheckboxField` „Bockrunde" in `src/components/GameTypeEditor.jsx` hinzufügen
    - Initialisierung: `useState(round?.isBock ?? false)`
    - _Requirements: 2.1_
  - [x] 6.2 Property-Test: GameTypeEditor-Vorbeleg ist korrekt
    - **Property 5: GameTypeEditor-Vorbeleg ist korrekt**
    - **Validates: Requirements 2.1**
    - Generator: zufällige Runden mit `isBock` true/false; Assertion: initialer State des Editors entspricht `round.isBock`
    - `// Feature: bockrunden, Property 5: GameTypeEditor-Vorbeleg ist korrekt`
  - [x] 6.3 `handleSave` in `GameTypeEditor` um `isBock` und neu berechneten `gameValue` erweitern
    - `patch` enthält `isBock` und `gameValue` (base × 2 wenn isBock, sonst base)
    - Fehlermeldung bei Speicherfehler bleibt erhalten (Requirement 2.5)
    - _Requirements: 2.2, 2.3, 2.4, 2.5_
  - [x] 6.4 Unit-Test: Fehlermeldung bei Speicherfehler im GameTypeEditor
    - Testet, dass der Dialog bei Fehler geöffnet bleibt und eine Fehlermeldung anzeigt
    - _Requirements: 2.5_

- [x] 7. SkatScoreList: Bock-Badge anzeigen
  - [x] 7.1 In `src/pages/SkatScoreList.jsx` in der `RoundRow`-Komponente ein Bock-Badge neben dem Spielwert rendern, wenn `r.isBock === true`
    - _Requirements: 4.1_
  - [ ]* 7.2 Property-Test: Bock-Badge wird für alle Bockrunden gerendert
    - **Property 6: Bock-Badge wird für alle Bockrunden gerendert**
    - **Validates: Requirements 4.1**
    - Generator: zufällige Listen von Runden mit gemischten `isBock`-Werten; Assertion: Badge genau bei `isBock = true`
    - `// Feature: bockrunden, Property 6: Bock-Badge wird für alle Bockrunden gerendert`

- [x] 8. Finaler Checkpoint - Alle Tests ausführen
  - Sicherstellen, dass alle Tests grün sind. Bei Fragen den Nutzer ansprechen.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelles MVP übersprungen werden
- Jeder Task referenziert spezifische Requirements für Rückverfolgbarkeit
- Property-Tests verwenden **fast-check** mit mind. 100 Iterationen
- Der gespeicherte `game_value` bei Bockrunden ist bereits verdoppelt - alle bestehenden Berechnungen bleiben unverändert
