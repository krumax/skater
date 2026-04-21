# Requirements-Dokument: Spiellisten

## Einleitung

Das Spiellisten-Feature ermöglicht es, innerhalb eines Tisches benannte Spielserien
(„Listen") mit einer festen Rundenzahl zu verwalten. Eine Liste gruppiert eine
definierte Anzahl aufeinanderfolgender Runden und ermittelt am Ende einen Listensieger
nach Seeger-Fabian-Punkten (vorrangig) und Rohpunkten (nachrangig). Mehrere Listen
können gleichzeitig aktiv sein; neue Runden werden automatisch der zuletzt
gestarteten/angefassten Liste zugeordnet. Das Spielen ohne Liste bleibt der Normalfall.

---

## Glossar

- **Tisch (Session)**: Eine Spielsitzung mit 3–4 Spielern, abgebildet als `sessions`-Zeile in der DB.
- **Liste (Spielliste)**: Eine benannte Spielserie innerhalb eines Tisches mit einer festen Rundenzahl (3–36, Vielfaches von 3). Abgebildet als `spiellisten`-Zeile in der DB.
- **Aktive Liste**: Eine Liste mit Status `aktiv`, der noch Runden zugeordnet werden können.
- **Abgeschlossene Liste**: Eine Liste mit Status `abgeschlossen`; read-only.
- **Zuletzt aktive Liste**: Die Liste, die zuletzt gestartet oder durch eine Nutzeraktion als aktiv markiert wurde (Zeitstempel `last_touched_at`).
- **Listenrunde**: Eine Runde, die einer Liste zugeordnet ist (Fremdschlüssel `spielliste_id` in `rounds`).
- **Listenlose Runde**: Eine Runde ohne `spielliste_id`; gehört direkt zum Tisch.
- **Listensieger**: Der Spieler mit den meisten Seeger-Fabian-Punkten innerhalb der Liste; bei Gleichstand entscheiden die Rohpunkte.
- **Seeger-Fabian-Punkte**: Turnierwertung (+50/−50 für Alleinspieler, +40 für Gegenspieler bei Niederlage des Alleinspielers).
- **Rohpunkte**: Standardspielwert ohne Seeger-Fabian-Bonus.
- **Fortschrittsanzeige**: UI-Element in „Aktuelle Runde", das den Stand der aktiven Liste zeigt (z. B. „Runde 7 von 12").
- **SyncService**: `src/lib/syncService.js` - einzige Schicht für Supabase-Operationen.
- **GameReducer**: `src/lib/gameReducer.js` - reiner Reducer für den Spielzustand.
- **GameContext**: `src/context/GameContext.jsx` - App-weiter Zustandskontext.

---

## Anforderungen

### Anforderung 1: Liste erstellen

**User Story:** Als Spieler möchte ich eine neue Liste mit einem Namen und einer Rundenzahl starten, damit ich eine definierte Spielserie verfolgen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer eine neue Liste erstellt, THE System SHALL die Liste mit einem Namen (max. 40 Zeichen), einer Rundenzahl (3–36, Vielfaches von 3) und dem Status `aktiv` in der Datenbank speichern.
2. WHEN der Nutzer eine neue Liste erstellt, THE System SHALL die neue Liste als zuletzt aktive Liste des aktuellen Tisches setzen.
3. IF der Nutzer eine Rundenzahl eingibt, die kein Vielfaches von 3 oder außerhalb des Bereichs 3–36 ist, THEN THE System SHALL die Eingabe ablehnen und eine Fehlermeldung auf Deutsch anzeigen.
4. IF der Nutzer keinen Namen eingibt, THEN THE System SHALL einen Standardnamen in der Form „Liste N" vergeben, wobei N die fortlaufende Listennummer des Tisches ist.
5. THE System SHALL eine Liste immer genau einem Tisch zuordnen.

---

### Anforderung 2: Automatische Rundenzuordnung

**User Story:** Als Spieler möchte ich, dass neue Runden automatisch der zuletzt aktiven Liste zugeordnet werden, damit ich nicht nach jeder Runde manuell eine Liste auswählen muss.

#### Akzeptanzkriterien

1. WHEN eine neue Runde gespeichert wird UND eine zuletzt aktive Liste am aktuellen Tisch existiert, THE System SHALL die Runde dieser Liste zuordnen.
2. WHEN eine neue Runde gespeichert wird UND keine zuletzt aktive Liste am aktuellen Tisch existiert, THE System SHALL die Runde ohne Listenzuordnung speichern.
3. WHILE eine Liste den Status `abgeschlossen` hat, THE System SHALL dieser Liste keine weiteren Runden zuordnen.
4. THE System SHALL den Zeitstempel `last_touched_at` einer Liste aktualisieren, sobald ihr eine Runde zugeordnet wird.

---

### Anforderung 3: Aktive Liste wechseln

**User Story:** Als Spieler möchte ich während einer Sitzung zwischen mehreren aktiven Listen wechseln können, damit ich parallele Spielserien an verschiedenen Tischen verwalten kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer eine andere aktive Liste auswählt, THE System SHALL diese Liste als zuletzt aktive Liste setzen und `last_touched_at` aktualisieren.
2. WHEN der Nutzer „Ohne Liste weiterspielen" wählt, THE System SHALL keine Liste als zuletzt aktiv markieren, sodass nachfolgende Runden listenlos gespeichert werden.
3. THE System SHALL in der UI „Aktuelle Runde" jederzeit anzeigen, welche Liste aktuell aktiv ist (oder dass keine Liste aktiv ist).
4. THE System SHALL alle aktiven Listen des aktuellen Tisches zur Auswahl anbieten.

---

### Anforderung 4: Fortschrittsanzeige

**User Story:** Als Spieler möchte ich während einer aktiven Liste den aktuellen Rundenfortschritt sehen, damit ich weiß, wie viele Runden noch verbleiben.

#### Akzeptanzkriterien

1. WHILE eine aktive Liste am aktuellen Tisch existiert, THE System SHALL in der Ansicht „Aktuelle Runde" eine Fortschrittsanzeige mit dem Text „Runde X von Y" anzeigen, wobei X die Anzahl der bisher gespielten Listenrunden und Y die Gesamtrundenzahl der Liste ist.
2. WHILE keine aktive Liste am aktuellen Tisch existiert, THE System SHALL keine Fortschrittsanzeige anzeigen.
3. THE System SHALL die Fortschrittsanzeige nach jeder neu gespeicherten Listenrunde aktualisieren.

---

### Anforderung 5: Automatischer Listenabschluss

**User Story:** Als Spieler möchte ich, dass eine Liste automatisch abgeschlossen wird, wenn die letzte Runde gespielt wurde, damit ich nicht manuell eingreifen muss.

#### Akzeptanzkriterien

1. WHEN die Anzahl der einer Liste zugeordneten Runden die Gesamtrundenzahl der Liste erreicht, THE System SHALL den Status der Liste auf `abgeschlossen` setzen.
2. WHEN eine Liste automatisch abgeschlossen wird, THE System SHALL den Listensieger berechnen und in der Liste speichern.
3. WHEN eine Liste automatisch abgeschlossen wird UND diese Liste die zuletzt aktive Liste war, THE System SHALL keine Liste mehr als zuletzt aktiv markieren.

---

### Anforderung 6: Manueller Listenabschluss

**User Story:** Als Spieler möchte ich eine aktive Liste jederzeit manuell abschließen können, damit ich eine Serie vorzeitig beenden kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer eine aktive Liste manuell abschließt, THE System SHALL den Status der Liste auf `abgeschlossen` setzen und den Listensieger berechnen.
2. WHEN der Nutzer eine aktive Liste manuell abschließt UND diese Liste die zuletzt aktive Liste war, THE System SHALL keine Liste mehr als zuletzt aktiv markieren.
3. WHILE eine Liste den Status `abgeschlossen` hat, THE System SHALL keine Bearbeitungsaktionen für diese Liste anbieten (read-only).

---

### Anforderung 7: Listensieger-Berechnung

**User Story:** Als Spieler möchte ich nach Abschluss einer Liste den Sieger angezeigt bekommen, damit das Ergebnis der Spielserie klar ist.

#### Akzeptanzkriterien

1. WHEN eine Liste abgeschlossen wird, THE System SHALL die Seeger-Fabian-Punkte aller Spieler über alle Listenrunden summieren.
2. WHEN eine Liste abgeschlossen wird, THE System SHALL den Spieler mit den höchsten Seeger-Fabian-Punkten als Listensieger bestimmen.
3. IF zwei oder mehr Spieler dieselben Seeger-Fabian-Punkte haben, THEN THE System SHALL den Spieler mit den höchsten Rohpunkten als Listensieger bestimmen.
4. IF zwei oder mehr Spieler nach Seeger-Fabian-Punkten und Rohpunkten gleichauf liegen, THEN THE System SHALL alle gleichauf liegenden Spieler als gemeinsame Listensieger ausweisen.
5. THE System SHALL den Listensieger persistent in der Liste speichern.

---

### Anforderung 8: Listenstatistik

**User Story:** Als Spieler möchte ich die Ergebnisse einer abgeschlossenen oder laufenden Liste einsehen können, damit ich den Spielstand der Serie nachvollziehen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer eine Liste öffnet, THE System SHALL für jeden Spieler die Seeger-Fabian-Punkte und die Rohpunkte über alle Listenrunden anzeigen.
2. WHEN der Nutzer eine abgeschlossene Liste öffnet, THE System SHALL den Listensieger hervorheben.
3. THE System SHALL die Spieler in der Listenstatistik primär nach Seeger-Fabian-Punkten und sekundär nach Rohpunkten absteigend sortieren.
4. THE System SHALL in der Listenstatistik die Anzahl der gespielten Runden und die Gesamtrundenzahl der Liste anzeigen.

---

### Anforderung 9: Tischstatistik mit Listen-Drill-down

**User Story:** Als Spieler möchte ich in der Tischstatistik sowohl die Gesamtübersicht als auch eine Aufschlüsselung nach Listen sehen, damit ich Gesamtperformance und Listenergebnisse vergleichen kann.

#### Akzeptanzkriterien

1. THE System SHALL in der Tischstatistik alle Runden (Listenrunden und listenlose Runden) in der Gesamtübersicht berücksichtigen.
2. WHEN der Tisch mindestens eine Liste hat, THE System SHALL in der Tischstatistik eine Übersicht aller Listen (Name, Status, Rundenzahl, Listensieger) anzeigen.
3. WHEN der Nutzer eine Liste in der Tischstatistik auswählt, THE System SHALL die Listenstatistik dieser Liste anzeigen (Drill-down).

---

### Anforderung 10: Session-Wechsel und Listen

**User Story:** Als Spieler möchte ich, dass beim Wechsel zu einem anderen Tisch die Listen des neuen Tisches korrekt übernommen werden, damit ich nahtlos weiterspielen kann.

#### Akzeptanzkriterien

1. WHEN der Nutzer zu einem anderen Tisch wechselt, THE System SHALL alle offenen Listen des vorherigen Tisches offen lassen.
2. WHEN der Nutzer zu einem anderen Tisch wechselt UND der neue Tisch eine zuletzt aktive Liste hat, THE System SHALL neue Runden automatisch dieser Liste zuordnen.
3. WHEN der Nutzer zu einem anderen Tisch wechselt UND der neue Tisch keine zuletzt aktive Liste hat, THE System SHALL neue Runden ohne Listenzuordnung speichern.

---

### Anforderung 11: Datenpersistenz und Offline-Unterstützung

**User Story:** Als Spieler möchte ich, dass Listen-Aktionen auch offline funktionieren und beim nächsten Online-Gang synchronisiert werden, damit ich nicht auf eine Internetverbindung angewiesen bin.

#### Akzeptanzkriterien

1. WHEN der Nutzer offline ist UND eine Liste erstellt oder abschließt, THE System SHALL die Aktion in der Offline-Queue speichern und lokal sofort anwenden.
2. WHEN die Internetverbindung wiederhergestellt wird, THE System SHALL alle ausstehenden Listen-Aktionen aus der Offline-Queue in der Reihenfolge ihrer Entstehung an Supabase übertragen.
3. THE System SHALL Listen-Daten beim Laden einer Session aus Supabase abrufen und im App-Zustand bereitstellen.
4. THE System SHALL das camelCase-/snake_case-Mapping für Listen-Felder ausschließlich im SyncService durchführen.
