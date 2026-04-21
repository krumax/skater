# Implementierungsplan: Spiellisten

## Übersicht

Schrittweise Implementierung des Spiellisten-Features: DB-Migration → pure Logik → Reducer-Erweiterung → Sync-Schicht → Hooks → Context → UI-Komponenten → Routing → Integration.

## Tasks

- [x] 1. DB-Migration erstellen
  - Neue Datei `supabase/migrations/YYYYMMDD_spiellisten.sql` anlegen
  - Tabelle `spiellisten` mit allen Spalten (`id`, `session_id`, `name`, `round_count`, `status`, `winner`, `last_touched_at`, `created_at`, `user_id`) und CHECK-Constraints erstellen
  - `ALTER TABLE rounds ADD COLUMN spielliste_id UUID REFERENCES spiellisten(id) ON DELETE SET NULL` hinzufügen
  - Indizes `idx_spiellisten_session_id` und `idx_rounds_spielliste_id` anlegen
  - RLS-Policies analog zu bestehenden Tabellen ergänzen
  - _Requirements: 1.1, 1.5, 11.3_

- [x] 2. Pure Hilfsfunktionen in `src/lib/spiellistenUtils.js` implementieren
  - [x] 2.1 Validierungs- und Hilfsfunktionen schreiben
    - `validateSpiellisteName(name)` - leer → kein Fehler (Standardname), > 40 Zeichen → Fehlermeldung auf Deutsch
    - `validateRoundCount(n)` - kein Vielfaches von 3 oder außerhalb [3, 36] → Fehlermeldung auf Deutsch
    - `generateDefaultName(existingCount)` - gibt `"Liste " + (existingCount + 1)` zurück
    - _Requirements: 1.3, 1.4_

  - [ ]* 2.2 Property-Test für `validateRoundCount` schreiben
    - **Property 2: Ungültige Rundenzahlen werden abgelehnt**
    - **Validates: Requirements 1.3**

  - [ ]* 2.3 Property-Test für `generateDefaultName` schreiben
    - **Property 3: Standardname folgt dem Schema „Liste N"**
    - **Validates: Requirements 1.4**

  - [x] 2.4 `computeListWinner(players, listRounds)` implementieren
    - Seeger-Fabian-Punkte pro Spieler summieren (aus `round.seegerScores`)
    - Rohpunkte als Tiebreaker (aus `round.gameValue`)
    - Bei vollständigem Gleichstand alle gleichauf liegenden Spieler zurückgeben
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 2.5 Property-Tests für `computeListWinner` schreiben
    - **Property 7: Listensieger ist der Spieler mit den höchsten Seeger-Fabian-Punkten**
    - **Validates: Requirements 7.1, 7.2**
    - **Property 8: Rohpunkte als Tiebreaker bei Seeger-Fabian-Gleichstand**
    - **Validates: Requirements 7.3**
    - **Property 9: Mehrere Sieger bei vollständigem Gleichstand**
    - **Validates: Requirements 7.4**

  - [x] 2.6 `computeListStats(players, listRounds)` implementieren
    - Seeger-Fabian-Summen und Rohpunkt-Summen pro Spieler berechnen
    - `sortedPlayers` nach Seeger-Fabian (primär) und Rohpunkten (sekundär) absteigend sortieren
    - `playedRounds` zählen
    - _Requirements: 8.1, 8.3, 8.4_

  - [ ]* 2.7 Property-Test für `computeListStats` schreiben
    - **Property 10: Listenstatistik filtert korrekt nach spiellisteId**
    - **Validates: Requirements 8.1, 8.3**

  - [x] 2.8 `computeListProgress(spielliste, listRounds)` implementieren
    - Gibt `{ current: N, total: Y }` zurück wenn Liste aktiv, sonst `null`
    - _Requirements: 4.1_

  - [ ]* 2.9 Property-Test für `computeListProgress` schreiben
    - **Property 11: Fortschrittsberechnung ist korrekt**
    - **Validates: Requirements 4.1**

- [x] 3. Checkpoint - Alle Tests für `spiellistenUtils.js` müssen grün sein
  - Alle Tests ausführen, bei Fragen den Nutzer ansprechen.

- [x] 4. `gameReducer.js` um Spiellisten-State erweitern
  - [x] 4.1 `initialState` um `spiellisten: []` und `activeSpiellisteId: null` ergänzen
    - _Requirements: 2.1, 2.2_

  - [x] 4.2 `LOAD_SESSION`-Action erweitern
    - `spiellisten` und `activeSpiellisteId` aus `action.payload` laden
    - _Requirements: 10.2, 10.3, 11.3_

  - [x] 4.3 `ADD_SPIELLISTE`-Action implementieren
    - Neue Liste in `state.spiellisten` einfügen
    - `activeSpiellisteId` auf die neue Listen-ID setzen
    - _Requirements: 1.1, 1.2_

  - [ ]* 4.4 Property-Test für `ADD_SPIELLISTE` schreiben
    - **Property 1: Erstellte Liste hat korrekte Felder und wird aktiv gesetzt**
    - **Validates: Requirements 1.1, 1.2**

  - [x] 4.5 `SET_ACTIVE_SPIELLISTE`-Action implementieren
    - `activeSpiellisteId` auf übergebene ID setzen (null = kein Liste aktiv)
    - Abgeschlossene Listen-IDs ignorieren (Guard)
    - `last_touched_at` der Liste aktualisieren
    - _Requirements: 3.1, 3.2_

  - [x] 4.6 `CLOSE_SPIELLISTE`-Action implementieren
    - Status der Liste auf `abgeschlossen` setzen
    - `winner` via `computeListWinner` berechnen und setzen
    - Falls die geschlossene Liste die aktive war: `activeSpiellisteId` auf `null` setzen
    - _Requirements: 6.1, 6.2, 7.1–7.4_

  - [x] 4.7 `ADD_ROUND`-Action erweitern
    - `spiellisteId` aus `state.activeSpiellisteId` in die neue Runde schreiben
    - `last_touched_at` der aktiven Liste aktualisieren
    - Nach dem Hinzufügen prüfen: Wenn Listenrunden-Anzahl === `roundCount` → automatisch `CLOSE_SPIELLISTE`-Logik inline ausführen
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3_

  - [ ]* 4.8 Property-Tests für `ADD_ROUND`-Erweiterung schreiben
    - **Property 4: Rundenzuordnung folgt dem aktiven Listen-State**
    - **Validates: Requirements 2.1, 2.2**
    - **Property 5: Listenabschluss setzt activeSpiellisteId auf null**
    - **Validates: Requirements 5.3, 6.2**
    - **Property 6: Automatischer Abschluss bei Erreichen der Rundenzahl**
    - **Validates: Requirements 5.1**

  - [ ]* 4.9 Property-Test für `getActiveSpiellistenForSession` schreiben
    - **Property 12: getActiveSpiellistenForSession gibt nur aktive Listen zurück**
    - **Validates: Requirements 3.4**

- [x] 5. Checkpoint - Alle Reducer-Tests müssen grün sein
  - Alle Tests ausführen, bei Fragen den Nutzer ansprechen.

- [x] 6. `syncService.js` um Spiellisten-Operationen erweitern
  - [x] 6.1 `loadSession` erweitern: `spiellisten`-Tabelle für die Session laden und camelCase-gemappt zurückgeben
    - Mapping: `session_id→sessionId`, `round_count→roundCount`, `last_touched_at→lastTouchedAt`, `created_at→createdAt`, `user_id→userId`
    - `activeSpiellisteId` aus der zuletzt berührten aktiven Liste ableiten (`last_touched_at` DESC, Status `aktiv`)
    - _Requirements: 11.3, 11.4_

  - [x] 6.2 `insertRound` erweitern: `spielliste_id` aus `round.spiellisteId` mappen und in DB schreiben
    - Offline-Queue-Eintrag ebenfalls mit `spielliste_id` befüllen
    - _Requirements: 2.1, 11.1, 11.4_

  - [x] 6.3 `createSpielliste(spielliste, sessionId)` implementieren
    - camelCase → snake_case mappen und in `spiellisten`-Tabelle einfügen
    - Offline-Queue-Action `createSpielliste` unterstützen
    - _Requirements: 1.1, 11.1, 11.2_

  - [x] 6.4 `closeSpielliste(spiellisteId, winner)` implementieren
    - `status = 'abgeschlossen'`, `winner` in DB schreiben
    - Offline-Queue-Action `closeSpielliste` unterstützen
    - _Requirements: 5.1, 5.2, 6.1, 11.1, 11.2_

  - [x] 6.5 `setActiveSpiellisteTimestamp(spiellisteId)` implementieren
    - `last_touched_at = now()` in DB schreiben
    - Offline-Queue-Action `setActiveSpielliste` unterstützen
    - _Requirements: 2.4, 3.1, 11.1_

  - [x] 6.6 `processOfflineQueue` um neue Actions erweitern
    - Cases für `createSpielliste`, `closeSpielliste`, `setActiveSpielliste` hinzufügen
    - _Requirements: 11.2_

- [x] 7. `useSyncActions.js` um Spiellisten-Actions erweitern
  - [x] 7.1 `createSpielliste(name, roundCount)` implementieren
    - Guard: Session muss Spieler haben
    - Standardname via `generateDefaultName` wenn Name leer
    - Validierung via `validateSpiellisteName` und `validateRoundCount`
    - Optimistisch `ADD_SPIELLISTE` dispatchen, dann `syncService.createSpielliste` aufrufen
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 7.2 `setActiveSpielliste(id)` implementieren
    - Optimistisch `SET_ACTIVE_SPIELLISTE` dispatchen, dann `syncService.setActiveSpiellisteTimestamp` aufrufen
    - `id === null` → keine Liste aktiv (listenlose Runden)
    - _Requirements: 3.1, 3.2_

  - [x] 7.3 `closeSpielliste(spiellisteId)` implementieren
    - Listenrunden aus State filtern, `computeListWinner` aufrufen
    - Optimistisch `CLOSE_SPIELLISTE` dispatchen, dann `syncService.closeSpielliste` aufrufen
    - _Requirements: 6.1, 6.2_

  - [x] 7.4 `addRound` anpassen: `spiellisteId` aus `state.activeSpiellisteId` in Payload aufnehmen und an `syncService.insertRound` weitergeben
    - _Requirements: 2.1, 2.2_

- [x] 8. `GameContext.jsx` erweitern
  - Neue State-Felder `spiellisten` und `activeSpiellisteId` aus Reducer-State exponieren
  - Neue Actions `createSpielliste`, `setActiveSpielliste`, `closeSpielliste` aus `useSyncActions` exponieren
  - Abgeleitete Hilfsfunktion `getActiveSpiellistenForSession()` hinzufügen (filtert `spiellisten` nach Status `aktiv`)
  - _Requirements: 3.3, 3.4_

- [x] 9. UI-Komponenten implementieren
  - [x] 9.1 `src/components/ListenFortschritt.jsx` erstellen
    - Props: `spielliste`, `listRounds`
    - Rendert nichts wenn `spielliste === null`
    - Zeigt „Runde X von Y" via `computeListProgress`
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 9.2 Snapshot-Test für `ListenFortschritt` schreiben
    - Rendert „Runde X von Y" korrekt
    - Rendert nichts bei `spielliste === null`
    - _Requirements: 4.1, 4.2_

  - [x] 9.3 `src/components/SpiellistenSelector.jsx` erstellen
    - Props: `spiellisten`, `activeId`, `onSelect`, `onCreateNew`
    - Zeigt nur aktive Listen zur Auswahl
    - Option „Ohne Liste weiterspielen" (setzt `activeId` auf `null`)
    - Button „Neue Liste" ruft `onCreateNew` auf
    - _Requirements: 3.2, 3.3, 3.4_

  - [ ]* 9.4 Snapshot-Test für `SpiellistenSelector` schreiben
    - Zeigt nur aktive Listen
    - Abgeschlossene Liste zeigt keine Bearbeitungsaktionen
    - _Requirements: 3.4, 6.3_

- [x] 10. `GameScoringEntry.jsx` integrieren
  - `ListenFortschritt` importieren und unterhalb des Page-Headers einbinden
  - `SpiellistenSelector` importieren und in der Seite einbinden (zeigt aktive Liste + Wechsel-Option)
  - `spiellisten`, `activeSpiellisteId`, `setActiveSpielliste`, `createSpielliste` aus `useGame()` beziehen
  - Listenrunden via `rounds.filter(r => r.spiellisteId === activeSpiellisteId)` für `ListenFortschritt` berechnen
  - _Requirements: 3.3, 4.1, 4.2, 4.3_

- [x] 11. `src/pages/SpiellistenPage.jsx` und Route erstellen
  - [x] 11.1 `SpiellistenPage.jsx` implementieren
    - Listenübersicht: alle Listen des aktuellen Tisches (Name, Status, Rundenzahl, Sieger)
    - Drill-down: Listenstatistik via `computeListStats` anzeigen (Seeger-Fabian + Rohpunkte pro Spieler, sortiert)
    - Abgeschlossene Liste: Sieger hervorheben
    - Aktive Liste: Fortschritt anzeigen, Button „Liste abschließen" (ruft `closeSpielliste` auf)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.2, 9.3_

  - [x] 11.2 Route `/spiellisten` in `src/App.jsx` registrieren
    - _Requirements: 9.2_

- [x] 12. `Sidebar.jsx` um Navigationseintrag „Spiellisten" erweitern
  - Eintrag mit Icon und Label „Spiellisten" zur Route `/spiellisten` hinzufügen
  - _Requirements: 9.2_

- [x] 13. `StatistikenCharts.jsx` um Listen-Übersicht erweitern
  - Wenn Tisch mindestens eine Liste hat: Tabelle aller Listen (Name, Status, Rundenzahl, Sieger) anzeigen
  - Klick auf Liste öffnet Drill-down mit `computeListStats`-Ergebnis
  - Gesamtübersicht bleibt unverändert (alle Runden inkl. Listenrunden)
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 14. Finaler Checkpoint - Alle Tests müssen grün sein
  - `npm test` ausführen, alle Fehler beheben, bei Fragen den Nutzer ansprechen.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelles MVP übersprungen werden
- Jeder Task referenziert die zugehörigen Anforderungen für Rückverfolgbarkeit
- Property-Tests referenzieren die Design-Properties mit Nummer und Titel
- camelCase↔snake_case-Mapping ausschließlich in `syncService.js`
- Alle UI-Strings auf Deutsch
