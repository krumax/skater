# Anforderungsdokument: Spieleridentität und tischübergreifende Statistiken

## Einleitung

Skatastrophe verwaltet aktuell mehrere Tische (Sessions), identifiziert Spieler aber ausschließlich über ihren Anzeigenamen. Derselbe Spieler kann an verschiedenen Tischen unter unterschiedlichen Namen auftreten ("Max", "Maximilian"), was eine tischübergreifende Auswertung unmöglich macht.

Dieses Feature führt eine optionale Spieleridentität ein: Eingeloggte Nutzer können ihren Spielerslot an einem Tisch mit ihrem Account verknüpfen. Dadurch entsteht eine persönliche Profilseite (`/mein-profil`), die alle Runden des Nutzers über alle Tische hinweg aggregiert und auswertet. Spieler ohne Account bleiben vollständig anonym – es gibt keinen Rückschritt in der bestehenden Nutzererfahrung.

## Glossar

- **Session**: Ein Skattisch mit 3–4 Spielerslots, gespeichert in der Tabelle `sessions`.
- **Session_Player**: Ein Spielerslot an einem Tisch, gespeichert in der Tabelle `session_players`. Enthält `display_name`, `user_id` (nullable) und `slot_index`.
- **Tischersteller**: Der eingeloggte Nutzer, der eine neue Session anlegt. Sein Slot wird automatisch mit seiner `user_id` verknüpft.
- **Claim**: Der Vorgang, durch den ein eingeloggter Nutzer einen Spielerslot mit seiner `user_id` verknüpft.
- **Einladungslink**: Ein URL mit einem signierten Token, der einem Mitspieler erlaubt, einen bestimmten Slot zu claimen.
- **Profil**: Die persönliche Statistikseite eines eingeloggten Nutzers unter `/mein-profil`.
- **Aggregierte_Statistik**: Statistikdaten, die über mehrere Sessions hinweg zusammengeführt wurden.
- **Display_Name**: Der frei wählbare Anzeigename eines Spielers an einem Tisch (z. B. "Max", "Maximilian"). Bleibt unverändert.
- **Sync_Service**: Das Modul `syncService.js`, das als einziger Ort für Supabase-Datenbankoperationen dient.
- **Player_Stats**: Das Modul `playerStats.js`, das reine Statistikberechnungen ohne Seiteneffekte enthält.
- **Claim_Token**: Ein kurzlebiges, signiertes Token, das einen bestimmten Slot in einer Session identifiziert und zum Claimen berechtigt.

---

## Anforderungen

### Anforderung 1: Automatische Slot-Verknüpfung beim Tischerstellen

**User Story:** Als Tischersteller möchte ich, dass mein Spielerslot automatisch mit meinem Account verknüpft wird, damit meine Runden ohne manuellen Aufwand in meinem Profil erscheinen.

#### Akzeptanzkriterien

1. WHEN ein eingeloggter Nutzer eine neue Session erstellt, THE Sync_Service SHALL einen `session_players`-Eintrag für slot_index 0 anlegen, dessen `user_id` auf die `user_id` des eingeloggten Nutzers gesetzt ist.
2. WHEN ein nicht eingeloggter Nutzer eine neue Session erstellt, THE Sync_Service SHALL einen `session_players`-Eintrag für slot_index 0 anlegen, dessen `user_id` auf `null` gesetzt ist, sodass der Slot für spätere Abfragen in Anforderung 4 korrekt als anonym behandelt wird.
3. WHEN ein eingeloggter Nutzer eine neue Session erstellt, THE Sync_Service SHALL den `display_name` des slot_index-0-Eintrags aus `seating[0]` des übergebenen Session-Objekts übernehmen, ohne ihn zu verändern.
4. IF beim Anlegen des `session_players`-Eintrags ein Datenbankfehler auftritt, THEN THE Sync_Service SHALL den Fehler protokollieren, keinen `session_players`-Eintrag in der Datenbank hinterlassen und die Session-Erstellung dennoch abschließen, sodass der Tisch ohne Profilverknüpfung nutzbar bleibt.

---

### Anforderung 2: Slot-Vorbelegen durch den Tischersteller

**User Story:** Als Tischersteller möchte ich beim Einrichten des Tisches einen Slot mit der `user_id` eines bekannten Mitspielers vorbelegen können, damit dieser Mitspieler sofort erkannt wird.

#### Akzeptanzkriterien

1. WHEN der Tischersteller beim Einrichten einen Slot (slot_index 1–3) mit einer nicht-leeren `user_id` vorbelegt, THE Sync_Service SHALL diesen Slot in `session_players` mit der angegebenen `user_id` speichern.
2. IF der Tischersteller versucht, einen Slot mit einer `user_id` vorzubelegen, die bereits einem anderen Slot derselben Session zugewiesen ist, THEN THE Sync_Service SHALL die Vorbelegen-Operation ablehnen und keinen `session_players`-Eintrag für diesen Slot anlegen oder verändern.
3. IF die Vorbelegen-Operation abgelehnt wird, THEN THE Sync_Service SHALL einen Fehler mit dem Hinweis zurückgeben, dass die `user_id` in dieser Session bereits vergeben ist.
4. IF der Tischersteller versucht, einen Slot mit einer `user_id` vorzubelegen, die bereits einem anderen Slot derselben Session zugewiesen ist, THEN THE Sync_Service SHALL die bestehenden Slot-Zuweisungen der Session unverändert lassen.
5. IF der Tischersteller versucht, einen Slot mit einer `user_id` vorzubelegen, die bereits einem anderen Slot derselben Session zugewiesen ist, aber eine andere `user_id` als die des Tischerstellers hat, THEN THE Sync_Service SHALL die Vorbelegen-Operation ebenfalls ablehnen und einen Fehler zurückgeben.
6. IF der Tischersteller versucht, einen Slot mit einer leeren oder `null`-`user_id` vorzubelegen, THEN THE Sync_Service SHALL die Vorbelegen-Operation ablehnen und einen Validierungsfehler zurückgeben.

---

### Anforderung 3: Nachträgliches Claimen eines Slots per Einladungslink

**User Story:** Als Mitspieler möchte ich meinen Slot an einem fremden Tisch nachträglich claimen können, damit meine Runden in meinem Profil erscheinen.

#### Akzeptanzkriterien

1. WHEN der Tischersteller einen Einladungslink für einen Slot generiert, THE Sync_Service SHALL einen Claim_Token erstellen, der die `session_id` und den `slot_index` kodiert und nach 72 Stunden abläuft.
2. WHEN ein eingeloggter Nutzer einen Einladungslink aufruft, THE Sync_Service SHALL den entsprechenden Slot mit der `user_id` des Nutzers verknüpfen, sofern alle folgenden Bedingungen erfüllt sind: der Token ist nicht abgelaufen, der Token wurde noch nicht verwendet, der `slot_index` existiert in der Session, und der Slot ist noch nicht mit einer `user_id` verknüpft.
3. IF ein Einladungslink abgelaufen ist, THEN THE Sync_Service SHALL die Claim-Operation ablehnen und eine Fehlermeldung zurückgeben.
4. IF der Slot bereits mit einer anderen `user_id` verknüpft ist oder die `user_id` des aufrufenden Nutzers mit der `user_id` des Tischerstellers (slot_index 0) übereinstimmt, THEN THE Sync_Service SHALL die Claim-Operation ablehnen und eine Fehlermeldung zurückgeben.
5. IF der Nutzer nicht eingeloggt ist und einen Einladungslink aufruft, THEN THE Sync_Service SHALL den Nutzer zur Anmeldeseite weiterleiten; IF der Token zum Zeitpunkt des abgeschlossenen Logins noch gültig ist, THEN THE Sync_Service SHALL den Claim automatisch abschließen; IF der Token zwischenzeitlich abgelaufen ist, THEN THE Sync_Service SHALL die Claim-Operation ablehnen und eine Fehlermeldung anzeigen.
6. WHEN ein Slot erfolgreich geclaimed wurde, THE Sync_Service SHALL den Claim_Token ungültig machen, sodass er nicht erneut verwendet werden kann.
7. IF ein Nutzer versucht, einen Einladungslink für eine Session zu generieren, deren Tischersteller er nicht ist, THEN THE Sync_Service SHALL die Token-Generierung ablehnen und einen Autorisierungsfehler zurückgeben.

---

### Anforderung 4: Laden aller Runden eines Nutzers über alle Sessions

**User Story:** Als eingeloggter Nutzer möchte ich alle meine Runden aus allen Tischen abrufen können, damit meine tischübergreifende Statistik berechnet werden kann.

#### Akzeptanzkriterien

1. WHEN `loadMyRoundsAcrossSessions(user_id)` aufgerufen wird, THE Sync_Service SHALL alle Runden aus allen Sessions laden, in denen mindestens ein `session_players`-Eintrag mit der angegebenen `user_id` existiert.
2. THE Sync_Service SHALL für jede geladene Runde den `display_name` aus dem `session_players`-Eintrag der jeweiligen Session übernehmen, der mit der `user_id` verknüpft ist, und ihn als `playerName`-Feld im zurückgegebenen Rundenobjekt bereitstellen.
3. THE Sync_Service SHALL die geladenen Runden als flaches Array von Rundenobjekten zurückgeben, wobei jedes Objekt zusätzlich ein `sessionId`-Feld enthält, damit `Player_Stats` die Runden ohne Anpassung verarbeiten und nach Tisch gruppieren kann.
4. IF keine `session_players`-Einträge mit der angegebenen `user_id` existieren, THEN THE Sync_Service SHALL ein leeres Array zurückgeben.
5. IF beim Laden ein Netzwerk- oder Datenbankfehler auftritt, THEN THE Sync_Service SHALL den Fehler als abgelehntes Promise zurückgeben und kein teilweise befülltes Array liefern.
6. THE Sync_Service SHALL alle Runden laden, bei denen der `player`-Wert der Runde mit dem `display_name` des verknüpften `session_players`-Eintrags zum Zeitpunkt der Rundenerfassung übereinstimmt; Runden, bei denen der Name nachträglich geändert wurde, werden gemäß Anforderung 7 Kriterium 4 dennoch eingeschlossen.

---

### Anforderung 5: Persönliche Profilseite `/mein-profil`

**User Story:** Als eingeloggter Nutzer möchte ich eine persönliche Profilseite sehen, die meine tischübergreifende Gesamtstatistik übersichtlich darstellt.

#### Akzeptanzkriterien

1. WHEN ein eingeloggter Nutzer `/mein-profil` aufruft, THE Profil_Seite SHALL die aggregierten Statistiken des Nutzers über alle verknüpften Sessions anzeigen.
2. WHEN die Daten vollständig geladen sind und mindestens eine Runde als Ansager vorliegt, THE Profil_Seite SHALL folgende Gesamtkennzahlen anzeigen: Gesamtanzahl der Runden als Ansager, Gesamtpunkte, Gewinnrate als Ansager in Prozent (auf eine Nachkommastelle gerundet); IF keine Runden als Ansager vorliegen, THE Profil_Seite SHALL die Gewinnrate als "0,0 %" anzeigen.
3. THE Profil_Seite SHALL eine Aufschlüsselung pro Tisch als aufklappbare Karte anzeigen, wobei jede Karte den Tischnamen, die Anzahl der Runden des Nutzers an diesem Tisch und seine Gewinnrate an diesem Tisch enthält.
4. THE Profil_Seite SHALL für die aggregierten Daten aller verknüpften Sessions mindestens folgende Diagrammtypen anzeigen: Spieltyp-Verteilung (Kreisdiagramm) und Punkteverlauf über die Zeit (Liniendiagramm).
5. WHILE die Daten geladen werden, THE Profil_Seite SHALL einen Ladezustand anzeigen.
6. IF der Nutzer keine verknüpften Sessions hat, THEN THE Profil_Seite SHALL einen Hinweistext anzeigen, der erklärt, wie Slots geclaimt werden können.
7. WHEN ein nicht eingeloggter Nutzer `/mein-profil` aufruft, THE Profil_Seite SHALL den Nutzer zur Anmeldeseite weiterleiten und nach erfolgreicher Anmeldung zurück zu `/mein-profil` navigieren.
8. IF beim Laden der tischübergreifenden Daten ein Fehler auftritt, THEN THE Profil_Seite SHALL eine Fehlermeldung anzeigen und dem Nutzer die Möglichkeit geben, den Ladevorgang zu wiederholen.

---

### Anforderung 6: Navigation zur Profilseite

**User Story:** Als eingeloggter Nutzer möchte ich die Profilseite über die Sidebar erreichen können, damit ich schnell auf meine Statistiken zugreifen kann.

#### Akzeptanzkriterien

1. WHILE ein Nutzer eingeloggt ist, THE Sidebar SHALL einen Navigationseintrag "Mein Profil" mit einem Icon aus der `material-symbols-outlined`-Bibliothek anzeigen.
2. WHILE kein Nutzer eingeloggt ist, THE Sidebar SHALL keinen Navigationseintrag "Mein Profil" rendern, da die gesamte App-Shell einschließlich Sidebar hinter der AuthGate-Komponente liegt und für nicht eingeloggte Nutzer nicht sichtbar ist.
3. WHEN der Nutzer auf "Mein Profil" klickt, THE Sidebar SHALL zur Route `/mein-profil` navigieren.
4. THE Sidebar SHALL den Eintrag "Mein Profil" mit denselben CSS-Klassen wie die übrigen NavLink-Einträge rendern und ihn im aktiven Zustand visuell hervorheben, wenn die aktuelle Route `/mein-profil` ist.

---

### Anforderung 7: Datenkonsistenz bei Spielerumbenennung

**User Story:** Als Nutzer möchte ich, dass eine Umbenennung eines Spielers am Tisch die Verknüpfung zwischen Slot und Account nicht beschädigt, damit meine Profilstatistik korrekt bleibt.

#### Akzeptanzkriterien

1. WHEN ein Spieler am Tisch umbenannt wird, THE Sync_Service SHALL den `display_name` im `session_players`-Eintrag in der Datenbank aktualisieren.
2. WHEN ein Spieler am Tisch umbenannt wird, THE Sync_Service SHALL die `user_id`-Spalte des betroffenen `session_players`-Eintrags unverändert lassen.
3. WHEN `loadMyRoundsAcrossSessions(user_id)` aufgerufen wird, THE Sync_Service SHALL alle Runden einschließen, deren `player`-Feld mit einem früheren `display_name` des verknüpften Slots übereinstimmt, sofern der Slot zum Zeitpunkt der Rundenerfassung mit der `user_id` verknüpft war.
4. IF eine Runde einen `player`-Wert enthält, der nicht mit dem aktuellen `display_name` des verknüpften Slots übereinstimmt, THEN THE Sync_Service SHALL diese Runde dennoch laden und dem Nutzer zuordnen, sofern der Slot mit der `user_id` verknüpft ist.
5. IF beim Aktualisieren des `display_name` ein Datenbankfehler auftritt, THEN THE Sync_Service SHALL den Fehler zurückgeben und den `display_name` im `session_players`-Eintrag unverändert lassen.

---

### Anforderung 8: Anonyme Spieler bleiben unverändert

**User Story:** Als Spieler ohne Account möchte ich den Tisch weiterhin ohne Einschränkungen nutzen können, damit das Feature keine Rückschritte in der bestehenden Nutzererfahrung verursacht.

#### Akzeptanzkriterien

1. THE Sync_Service SHALL beim Anlegen eines `session_players`-Eintrags ohne `user_id` keinen Validierungsfehler auslösen, kein neues Pflichtfeld prüfen und keine Datenbankoperation ablehnen.
2. WHEN eine Session mit `session_players`-Einträgen geladen wird, bei denen `user_id` null ist, THE Sync_Service SHALL alle Runden dieser Session vollständig laden, unabhängig davon, ob andere Slots in derselben Session mit einer `user_id` verknüpft sind.
3. IF ein nicht eingeloggter Nutzer versucht, `/mein-profil` aufzurufen, THEN THE Profil_Seite SHALL den Nutzer zur Anmeldeseite weiterleiten und keinen Profilinhalt rendern.
4. WHILE kein Nutzer eingeloggt ist, THE Sidebar SHALL den Navigationseintrag "Mein Profil" nicht anzeigen.
