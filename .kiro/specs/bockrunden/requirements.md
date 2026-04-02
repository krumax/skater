# Requirements Document

## Introduction

Dieses Feature ergänzt die Skat-Scoring-App um die Unterstützung von **Bockrunden**. Eine Bockrunde ist eine besondere Spielsituation im Skat, bei der der Spielwert verdoppelt wird – sowohl bei Sieg (positiver Wert ×2) als auch bei Niederlage (negativer Wert ×2). Die Bockrunde wird nicht automatisch erkannt, sondern vom Nutzer manuell per Checkbox/Toggle aktiviert – sowohl beim Erfassen neuer Spielergebnisse als auch beim nachträglichen Bearbeiten einer Runde.

---

## Glossary

- **Bockrunde**: Eine Spielrunde im Skat, bei der der berechnete Spielwert verdoppelt wird. Wird durch besondere Spielereignisse ausgelöst (z. B. Nullspiel, Ramsch, Herz-Spiel), die Erkennung liegt beim Nutzer.
- **Bock-Faktor**: Der Multiplikator, der bei einer Bockrunde auf den Spielwert angewendet wird. Wert: 2.
- **Spielwert (game_value)**: Der berechnete Punktwert einer Runde, positiv bei Sieg, negativ bei Niederlage.
- **Bock-Spielwert**: Der finale Spielwert nach Anwendung des Bock-Faktors: `bock_game_value = game_value × 2`.
- **GameScoringEntry**: Die Seite zur Erfassung neuer Spielergebnisse (`src/pages/GameScoringEntry.jsx`).
- **GameTypeEditor**: Der modale Dialog zur nachträglichen Bearbeitung von Spieltyp-Feldern einer Runde (`src/components/GameTypeEditor.jsx`).
- **GameContext**: Der globale React-Kontext, der den App-State verwaltet und Aktionen wie `addRound` und `updateRound` bereitstellt (`src/context/GameContext.jsx`).
- **SyncService**: Der Dienst zur Kommunikation mit der Supabase-Datenbank (`src/lib/syncService.js`).
- **rounds-Tabelle**: Die Supabase-Datenbanktabelle, in der Spielrunden gespeichert werden.

---

## Requirements

### Requirement 1: Bockrunden-Toggle bei der Spielerfassung

**User Story:** Als Nutzer möchte ich beim Erfassen eines neuen Spielergebnisses eine Bockrunde markieren können, damit der Spielwert korrekt verdoppelt wird.

#### Acceptance Criteria

1. THE GameScoringEntry SHALL einen Bockrunden-Toggle (Checkbox oder Chip) im Formular anzeigen.
2. WHEN der Nutzer den Bockrunden-Toggle aktiviert, THE GameScoringEntry SHALL den angezeigten Spielwert als `game_value × 2` berechnen und darstellen.
3. WHEN der Nutzer den Bockrunden-Toggle deaktiviert, THE GameScoringEntry SHALL den angezeigten Spielwert ohne Bock-Faktor darstellen.
4. WHEN der Nutzer das Ergebnis speichert und der Bockrunden-Toggle aktiv ist, THE GameContext SHALL die Runde mit `is_bock = true` und dem verdoppelten `game_value` persistieren.
5. WHEN der Nutzer das Ergebnis speichert und der Bockrunden-Toggle inaktiv ist, THE GameContext SHALL die Runde mit `is_bock = false` und dem unverdoppelten `game_value` persistieren.
6. WHEN der Nutzer das Formular zurücksetzt, THE GameScoringEntry SHALL den Bockrunden-Toggle auf inaktiv zurücksetzen.

---

### Requirement 2: Bockrunden-Toggle im Bearbeitungsdialog

**User Story:** Als Nutzer möchte ich beim nachträglichen Bearbeiten einer Runde den Bockrunden-Status ändern können, damit ich Fehler korrigieren kann.

#### Acceptance Criteria

1. THE GameTypeEditor SHALL einen Bockrunden-Toggle (Checkbox) im Bearbeitungsdialog anzeigen, vorbelegt mit dem gespeicherten `is_bock`-Wert der Runde.
2. WHEN der Nutzer den Bockrunden-Toggle im GameTypeEditor ändert und speichert, THE GameContext SHALL `updateRound` mit dem neuen `is_bock`-Wert und dem neu berechneten `game_value` aufrufen.
3. WHEN `is_bock` auf `true` gesetzt wird, THE GameContext SHALL den `game_value` der Runde als `base_game_value × 2` aktualisieren.
4. WHEN `is_bock` auf `false` gesetzt wird, THE GameContext SHALL den `game_value` der Runde auf den ursprünglichen `base_game_value` zurücksetzen.
5. IF beim Speichern ein Fehler auftritt, THEN THE GameTypeEditor SHALL eine Fehlermeldung anzeigen und den Dialog geöffnet lassen.

---

### Requirement 3: Datenpersistenz für Bockrunden

**User Story:** Als Nutzer möchte ich, dass der Bockrunden-Status einer Runde dauerhaft gespeichert wird, damit er nach einem Neuladen der App erhalten bleibt.

#### Acceptance Criteria

1. THE SyncService SHALL beim Einfügen einer neuen Runde das Feld `is_bock` (Boolean) in die rounds-Tabelle schreiben.
2. THE SyncService SHALL beim Aktualisieren einer Runde das Feld `is_bock` und den aktualisierten `game_value` in die rounds-Tabelle schreiben.
3. WHEN eine Session geladen wird, THE SyncService SHALL das Feld `is_bock` aus der rounds-Tabelle lesen und im lokalen State als `isBock` (camelCase) bereitstellen.
4. THE rounds-Tabelle SHALL ein Feld `is_bock` vom Typ Boolean mit Standardwert `false` enthalten.

---

### Requirement 4: Korrekte Darstellung des Bock-Spielwerts

**User Story:** Als Nutzer möchte ich in der Spielliste und im Ergebnis-Dashboard erkennen können, ob eine Runde eine Bockrunde war, damit ich die Punkteentwicklung nachvollziehen kann.

#### Acceptance Criteria

1. WHEN eine Runde mit `is_bock = true` in der Spielliste (SkatScoreList) angezeigt wird, THE SkatScoreList SHALL einen visuellen Hinweis (z. B. Label oder Icon) neben dem Spielwert darstellen.
2. WHEN das Ergebnis-Dashboard in GameScoringEntry den Bock-Spielwert anzeigt, THE GameScoringEntry SHALL in der Aufschlüsselung (Breakdown) eine Zeile „Bockrunde ×2" darstellen.
3. THE GameScoringEntry SHALL den Bock-Spielwert in der Vorschau korrekt als `game_value × 2` anzeigen, bevor das Ergebnis gespeichert wird.

---

### Requirement 5: Konsistenz der Gesamtpunktstände

**User Story:** Als Nutzer möchte ich, dass die Gesamtpunktstände aller Spieler den Bock-Spielwert korrekt berücksichtigen, damit die Rangliste stimmt.

#### Acceptance Criteria

1. WHEN `getPlayerTotals` aufgerufen wird, THE GameContext SHALL den gespeicherten `game_value` (der bei Bockrunden bereits verdoppelt ist) für die Summenbildung verwenden.
2. WHEN `getSeegerTotals` aufgerufen wird, THE GameContext SHALL die Seeger-Fabian-Punkte auf Basis des Bock-Spielwerts berechnen.
3. FOR ALL Runden mit `is_bock = true` gilt: Der in der rounds-Tabelle gespeicherte `game_value` entspricht dem verdoppelten Wert, sodass alle bestehenden Berechnungen ohne Änderung korrekt bleiben.
