# Anforderungsdokument: Supabase-Persistenz-Integration

## Einleitung

Die Skat-Scoring-App speichert aktuell alle Daten ausschließlich im React-State (In-Memory). Beim Neuladen der Seite oder beim Wechsel des Geräts gehen alle Spielrunden und Einstellungen verloren. Ziel dieser Integration ist es, alle relevanten Daten über Supabase (PostgreSQL) persistent zu speichern, sodass mehrere Geräte dieselbe aktuelle Spielsitzung teilen können. Da niemals zwei Geräte gleichzeitig aktiv sind, genügt ein manueller Refresh-Mechanismus statt Echtzeit-Synchronisation.

## Glossar

- **Supabase_Client**: Die JavaScript-Bibliothek `@supabase/supabase-js`, die die Verbindung zur Supabase-Datenbank herstellt.
- **Session**: Eine zusammenhängende Spielsitzung mit einer festen Sitzordnung und einer Folge von Runden. Entspricht dem aktuellen `sessionId` im `GameContext`.
- **Round**: Ein einzelnes Spielergebnis innerhalb einer Session (entspricht einem Eintrag im `rounds`-Array).
- **Seating**: Die geordnete Liste der Spielernamen am Tisch (entspricht `seating` im `GameContext`).
- **GameContext**: Der zentrale React-Kontext, der den gesamten Spielzustand verwaltet.
- **Sync_Service**: Das neue Modul, das die Kommunikation zwischen `GameContext` und Supabase kapselt.
- **Optimistic_Update**: Eine UI-Technik, bei der der lokale State sofort aktualisiert wird, bevor die Datenbankoperation abgeschlossen ist.

---

## Anforderungen

### Anforderung 1: Datenbankschema und Initialisierung

**User Story:** Als Entwickler möchte ich ein klar definiertes Datenbankschema in Supabase, damit alle App-Daten strukturiert und konsistent gespeichert werden können.

#### Akzeptanzkriterien

1. THE Sync_Service SHALL eine `sessions`-Tabelle mit den Feldern `id` (UUID), `seating` (JSON-Array), `geber_index` (Integer), `current_round` (Integer) und `created_at` (Timestamp) verwenden.
2. THE Sync_Service SHALL eine `rounds`-Tabelle mit den Feldern `id` (UUID), `session_id` (UUID, Fremdschlüssel), `round_number` (Integer), `player` (Text), `game_type` (Text), `type_label` (Text), `game_value` (Integer), `base_value` (Integer), `multiplier` (Integer), `won` (Boolean), `eye_count` (Integer), `spitzen` (Integer), `hand` (Boolean), `schneider` (Boolean), `schwarz` (Boolean), `ouvert` (Boolean), `roles` (JSON), `seeger_scores` (JSON) und `timestamp` (Timestamp) verwenden.
3. WHEN die App zum ersten Mal gestartet wird, THE Sync_Service SHALL prüfen, ob eine aktive Session-ID im lokalen Speicher (`localStorage`) vorhanden ist.
4. IF eine Session-ID im lokalen Speicher vorhanden ist, THEN THE Sync_Service SHALL die zugehörige Session und alle Runden aus Supabase laden.
5. IF keine Session-ID im lokalen Speicher vorhanden ist, THEN THE Sync_Service SHALL eine neue Session in Supabase anlegen und deren ID im lokalen Speicher speichern.

---

### Anforderung 2: Session-Persistenz beim Commit

**User Story:** Als Spieler möchte ich, dass beim Speichern eines Spielergebnisses auch der aktuelle Session-Zustand (Sitzordnung, Geberindex) in der Datenbank aktualisiert wird, damit ein anderes Gerät nach einem manuellen Refresh den korrekten Stand sieht.

#### Akzeptanzkriterien

1. WHEN eine neue Runde über `addRound` gespeichert wird, THE Sync_Service SHALL gleichzeitig den Session-Datensatz (insbesondere `geber_index` und `current_round`) in Supabase aktualisieren.
2. WHEN eine neue Session gestartet wird (`RESET_SESSION`), THE Sync_Service SHALL einen neuen Session-Datensatz in Supabase anlegen und die neue Session-ID im lokalen Speicher speichern.
3. IF das Aktualisieren des Session-Datensatzes fehlschlägt, THEN THE Sync_Service SHALL den Fehler protokollieren, ohne die Runden-Speicherung zu blockieren.

---

### Anforderung 3: Runden-Persistenz

**User Story:** Als Spieler möchte ich, dass jede gespielte Runde sofort in der Datenbank gespeichert wird, damit kein Ergebnis verloren geht.

#### Akzeptanzkriterien

1. WHEN eine neue Runde über `addRound` hinzugefügt wird, THE Sync_Service SHALL den Runden-Datensatz sofort in Supabase einfügen.
2. THE GameContext SHALL den lokalen State per Optimistic_Update sofort aktualisieren, bevor die Datenbankoperation abgeschlossen ist.
3. IF das Einfügen einer Runde in Supabase fehlschlägt, THEN THE Sync_Service SHALL den Fehler in der Konsole protokollieren und eine Fehlerbenachrichtigung im UI anzeigen.

---

### Anforderung 4: Manueller Refresh

**User Story:** Als Spieler möchte ich die aktuellen Daten von einem anderen Gerät manuell laden können, ohne die gesamte Seite neu laden zu müssen.

#### Akzeptanzkriterien

1. THE Sidebar SHALL einen Refresh-Button anzeigen, über den der Benutzer die aktuellen Daten manuell aus Supabase laden kann.
2. WHEN der Refresh-Button gedrückt wird, THE Sync_Service SHALL die aktuelle Session und alle zugehörigen Runden aus Supabase neu laden und den `GameContext` aktualisieren.
3. WHILE ein Refresh-Vorgang läuft, THE Sync_Service SHALL den `syncStatus` auf `syncing` setzen und den Refresh-Button deaktivieren.
4. IF der Refresh-Vorgang fehlschlägt, THEN THE Sync_Service SHALL den `syncStatus` auf `error` setzen und eine lesbare Fehlermeldung anzeigen.

---

### Anforderung 5: Spieler-Einstellungen-Persistenz

**User Story:** Als Spieler möchte ich, dass Änderungen an der Sitzordnung (Hinzufügen, Entfernen, Umbenennen, Umsortieren von Spielern) sofort gespeichert werden.

#### Akzeptanzkriterien

1. WHEN ein Spieler hinzugefügt wird (`addPlayer`), THE Sync_Service SHALL die aktualisierte Sitzordnung in Supabase speichern.
2. WHEN ein Spieler entfernt wird (`removePlayer`), THE Sync_Service SHALL die aktualisierte Sitzordnung in Supabase speichern.
3. WHEN ein Spieler umbenannt wird (`renamePlayer`), THE Sync_Service SHALL die aktualisierte Sitzordnung in Supabase speichern.
4. WHEN die Sitzordnung umsortiert wird (`reorderSeating`), THE Sync_Service SHALL die neue Reihenfolge in Supabase speichern.

---

### Anforderung 6: Verbindungsstatus und Fehlerbehandlung

**User Story:** Als Spieler möchte ich jederzeit wissen, ob die App mit der Datenbank verbunden ist, damit ich einschätzen kann, ob meine Daten gespeichert werden.

#### Akzeptanzkriterien

1. THE GameContext SHALL einen `syncStatus`-Wert bereitstellen, der einen der Zustände `idle`, `syncing`, `synced` oder `error` annehmen kann.
2. WHEN eine Datenbankoperation gestartet wird, THE Sync_Service SHALL den `syncStatus` auf `syncing` setzen.
3. WHEN eine Datenbankoperation erfolgreich abgeschlossen wird, THE Sync_Service SHALL den `syncStatus` auf `synced` setzen.
4. IF eine Datenbankoperation fehlschlägt, THEN THE Sync_Service SHALL den `syncStatus` auf `error` setzen und eine lesbare Fehlermeldung bereitstellen.
5. THE Sidebar SHALL den aktuellen `syncStatus` als kleines Statusindikator-Icon anzeigen.
6. IF die Verbindung zu Supabase nicht hergestellt werden kann, THEN THE Sync_Service SHALL die App im Offline-Modus mit lokalem State weiter betreiben.

---

### Anforderung 7: Konfiguration und Sicherheit

**User Story:** Als Entwickler möchte ich, dass die Supabase-Zugangsdaten sicher über Umgebungsvariablen konfiguriert werden, damit keine sensiblen Daten im Quellcode landen.

#### Akzeptanzkriterien

1. THE Supabase_Client SHALL ausschließlich über die Umgebungsvariablen `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` konfiguriert werden.
2. THE Sync_Service SHALL ausschließlich den öffentlichen Anon-Key verwenden, da keine Benutzerauthentifizierung erforderlich ist.
3. THE Supabase_Client SHALL als Singleton-Instanz in `src/lib/supabaseClient.js` exportiert werden.
4. WHERE Row Level Security (RLS) in Supabase aktiviert ist, THE Sync_Service SHALL sicherstellen, dass die RLS-Policies anonymen Lese- und Schreibzugriff auf `sessions` und `rounds` erlauben.
