# Implementierungsplan: Supabase-Persistenz-Integration

## Übersicht

Die Implementierung erfolgt in 5 Schritten: Zuerst wird die Infrastruktur (Supabase-Client, Datenbankschema) aufgebaut, dann der Sync-Service implementiert, anschließend der GameContext erweitert, die Sidebar angepasst und abschließend alles verdrahtet und getestet.

## Aufgaben

- [ ] 1. Supabase-Abhängigkeit installieren und Client einrichten
  - `@supabase/supabase-js` als Abhängigkeit hinzufügen
  - Datei `src/lib/supabaseClient.js` erstellen mit Singleton-Export über `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`
  - `.env.local`-Beispieldatei `.env.local.example` mit Platzhaltern anlegen
  - _Anforderungen: 7.1, 7.2, 7.3_

- [ ] 2. Datenbankschema in Supabase anlegen
  - [ ] 2.1 SQL-Migrationsskript ausführen
    - `sessions`-Tabelle anlegen (id, seating, geber_index, current_round, created_at)
    - `rounds`-Tabelle anlegen mit allen Feldern aus dem Design-Dokument und Fremdschlüssel auf `sessions`
    - RLS aktivieren und Policies für anonymen Lese-/Schreibzugriff erstellen
    - Das SQL-Skript aus dem Design-Dokument im Supabase SQL-Editor ausführen
    - _Anforderungen: 1.1, 1.2, 7.4_

- [ ] 3. Sync-Service implementieren
  - [ ] 3.1 `src/lib/syncService.js` erstellen mit `createSession`-Funktion
    - Funktion nimmt `seating`-Array entgegen und legt einen neuen Session-Datensatz in Supabase an
    - Gibt `{ data: session, error }` zurück
    - _Anforderungen: 1.5, 2.2_

  - [ ] 3.2 `loadSession`-Funktion implementieren
    - Funktion nimmt `sessionId` entgegen, lädt Session und alle zugehörigen Runden aus Supabase
    - Runden werden nach `round_number` sortiert zurückgegeben
    - Gibt `{ data: { session, rounds }, error }` zurück
    - _Anforderungen: 1.4_

  - [ ]* 3.3 Property-Test für Session-Lade-Round-Trip schreiben
    - **Eigenschaft 1: Session-Lade-Round-Trip**
    - **Validates: Anforderungen 1.3, 1.4, 4.2**
    - Mit fast-check: zufällige Sitzordnungen und Runden generieren, speichern, laden, Gleichheit prüfen

  - [ ] 3.4 `insertRound`-Funktion implementieren
    - Funktion nimmt `round`-Objekt und `sessionId` entgegen und fügt einen Runden-Datensatz in Supabase ein
    - Mappt die lokalen Felder (camelCase) auf die DB-Spalten (snake_case)
    - Gibt `{ data, error }` zurück
    - _Anforderungen: 3.1_

  - [ ]* 3.5 Property-Test für Runden-Persistenz-Round-Trip schreiben
    - **Eigenschaft 2: Runden-Persistenz-Round-Trip**
    - **Validates: Anforderungen 3.1, 4.2**
    - Mit fast-check: zufällige Rundendaten generieren, einfügen, laden, Gleichheit prüfen

  - [ ] 3.6 `updateSession`-Funktion implementieren
    - Funktion nimmt `sessionId` und ein Patch-Objekt entgegen und aktualisiert den Session-Datensatz
    - _Anforderungen: 2.1, 2.3_

  - [ ] 3.7 `updateSeating`-Funktion implementieren
    - Funktion nimmt `sessionId` und neues `seating`-Array entgegen und aktualisiert die Sitzordnung in Supabase
    - _Anforderungen: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 3.8 Property-Test für Sitzordnungs-Persistenz schreiben
    - **Eigenschaft 3: Sitzordnungs-Persistenz**
    - **Validates: Anforderungen 5.1, 5.2, 5.3, 5.4**
    - Mit fast-check: zufällige Sitzordnungsänderungen generieren und Konsistenz zwischen lokalem State und DB prüfen

- [ ] 4. GameContext erweitern
  - [ ] 4.1 `LOAD_SESSION`-Reducer-Case hinzufügen
    - Neuer Case in `gameReducer`, der `seating`, `geberIndex`, `currentRound`, `rounds` und `sessionId` aus dem Payload übernimmt
    - _Anforderungen: 1.4, 4.2_

  - [ ] 4.2 `syncStatus`-State und Initialisierungslogik implementieren
    - `syncStatus`-State (`'idle' | 'syncing' | 'synced' | 'error'`) und `syncError` zum `GameProvider` hinzufügen
    - Beim Mount: localStorage nach Session-ID prüfen, `loadSession` oder `createSession` aufrufen
    - Session-ID im localStorage speichern
    - `syncStatus` und `syncError` über den Context bereitstellen
    - _Anforderungen: 1.3, 1.4, 1.5, 6.1_

  - [ ]* 4.3 Unit-Test für syncStatus-Zustandsübergänge schreiben
    - **Eigenschaft 4: syncStatus-Zustandsübergänge**
    - **Validates: Anforderungen 6.1, 6.2, 6.3, 6.4**
    - Testen: syncing während Operation, synced nach Erfolg, error nach Fehler

  - [ ] 4.4 `addRound` mit Sync-Service verdrahten
    - `addRound` führt zuerst lokalen `dispatch(ADD_ROUND)` durch (Optimistic Update)
    - Danach `syncService.insertRound` und `syncService.updateSession` aufrufen
    - `syncStatus` entsprechend setzen
    - _Anforderungen: 2.1, 3.1, 3.2, 3.3_

  - [ ]* 4.5 Unit-Test für Optimistic Update schreiben
    - **Eigenschaft 5: Optimistic Update Konsistenz**
    - **Validates: Anforderung 3.2**
    - Prüfen, dass der lokale State sofort nach `addRound` die neue Runde enthält (vor DB-Abschluss)

  - [ ] 4.6 `resetSession` mit Sync-Service verdrahten
    - `resetSession` ruft `syncService.createSession` auf und speichert neue Session-ID im localStorage
    - _Anforderungen: 2.2_

  - [ ] 4.7 Spieler-Aktionen mit Sync-Service verdrahten
    - `addPlayer`, `removePlayer`, `renamePlayer`, `reorderSeating` rufen nach dem lokalen `dispatch` jeweils `syncService.updateSeating` auf
    - _Anforderungen: 5.1, 5.2, 5.3, 5.4_

  - [ ] 4.8 `refreshFromDB`-Funktion implementieren
    - Neue Funktion im `GameProvider`, die `syncService.loadSession` aufruft und `dispatch(LOAD_SESSION)` auslöst
    - Setzt `syncStatus` auf `syncing` während des Ladens
    - _Anforderungen: 4.2, 4.3, 4.4_

- [ ] 5. Checkpoint – Alle Tests ausführen
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen oder Problemen den Benutzer informieren.

- [ ] 6. Sidebar erweitern
  - [ ] 6.1 Sync-Status-Icon in der Sidebar anzeigen
    - `syncStatus` aus dem `GameContext` lesen
    - Material Symbol `cloud_done` (synced), `sync` (syncing, animiert), `cloud_off` (error) anzeigen
    - _Anforderungen: 6.5_

  - [ ] 6.2 Refresh-Button in der Sidebar implementieren
    - Button mit `refresh`-Icon hinzufügen, der `refreshFromDB` aufruft
    - Button während `syncStatus === 'syncing'` deaktivieren
    - _Anforderungen: 4.1, 4.3_

  - [ ]* 6.3 Render-Tests für Sidebar schreiben
    - Prüfen, dass Refresh-Button vorhanden ist
    - Prüfen, dass Status-Icon je nach `syncStatus` korrekt gerendert wird
    - _Anforderungen: 4.1, 6.5_

- [ ] 7. Finaler Checkpoint – Alle Tests ausführen und Integration prüfen
  - Sicherstellen, dass alle Tests bestehen. Bei Fragen oder Problemen den Benutzer informieren.

## Hinweise

- Aufgaben mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jede Aufgabe referenziert spezifische Anforderungen zur Rückverfolgbarkeit
- Property-Tests verwenden fast-check mit mindestens 100 Iterationen pro Test
- Das SQL-Migrationsskript aus dem Design-Dokument muss manuell im Supabase SQL-Editor ausgeführt werden
