# Implementation Plan: Reizwert-Trainer

## Overview

Der Reizwert-Trainer wird als lokales Lernmodul im Auswahlmodus in die bestehende Regelwerk-Seite integriert. Der Nutzer sieht zehn Karten, wählt eine Spielart sowie die dazugehörige Ansage und prüft den Reizwert dieser konkreten Kombination.

Der MVP verändert weder Supabase-Schema noch `GameContext`, `syncService` oder Spielhistorie. Es gibt keine persistente Lernstatistik und keine Runde-, Treffer- oder Serienanzeige.

## Tasks

- [x] 1. Phase 1: Pure Trainerlogik und Datenmodelle
  - [x] 1.1 `src/lib/reizwertTrainer.js` anlegen
    - Deutsche 32-Karten-Deck-Konstanten mit acht Rängen und vier Farben definieren
    - Kartenobjekt mit stabiler `id`, Rang- und Farblabels definieren
    - `createDeck()` als pure Funktion implementieren
    - `drawHand(random)` mit injizierbarer Zufallsfunktion implementieren
    - Genau zehn eindeutige Karten pro Aufgabe sicherstellen
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 1.2 Trumpfreihenfolgen und Spitzenberechnung implementieren
    - `COLOR_TRUMP_ORDER` für Kreuz, Pik, Herz und Karo mit jeweils elf Trumpfkarten definieren
    - `GRAND_TRUMP_ORDER` mit den vier Buben definieren
    - `getSpitzen(hand, trumpOrder)` sowie `getSpitzenForGame(hand, gameType)` implementieren
    - Fälle „mit lückenloser Präfixfolge“, „ohne fehlendem ersten Trumpf“ und Null ohne Spitzen abdecken
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 7.4_

  - [x] 1.3 Auswahl-Spielwerte implementieren
    - Zentrale `BASE_VALUES`, `NULL_VALUES` und `calculateMultiplier` aus `src/lib/skatScoring.js` verwenden
    - `getMaxSpitzen(gameType)` für den vereinfachten Trainerbereich implementieren: Farbspiele und Grand maximal 4, Null 0
    - `calculateTrainerGameValue(gameType, spitzen)` für die Auswahlrechnung implementieren und Spitzen über 4 abweisen
    - Offizielle Rohberechnung höherer Spitzen getrennt von der Trainergrenze erhalten
    - Keine globale Maximalwert-, Kandidaten- oder Gleichstands-API im MVP vorsehen
    - _Requirements: 2.3, 2.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 1.4 Puzzle-Erzeugung und Auswahlprüfung implementieren
    - `createTrainerPuzzle({ random })` als lokale pure Funktion implementieren
    - Rejection Sampling verwenden: Hände mit tatsächlichen Spitzen über 4 in mindestens einem Farbspiel verwerfen
    - Maximale Versuchsanzahl und beschreibenden Fehler für pathologische Zufallsquellen vorsehen
    - `evaluateSelection(selection, puzzle)` für Spielwert und Ansage getrennt implementieren und Out-of-Scope-Puzzles abweisen
    - Null mit festem Wert 23 und ohne Spitzen behandeln
    - Ungültige Spieltypen, Kartenhände, Ansagen, Spitzen und Eingaben mit beschreibendem Fehler behandeln
    - _Requirements: 3.5, 6.1–6.5, 7.1–7.4_

  - [x] 1.5 Unit-Tests für `reizwertTrainer.js` schreiben
    - Deckgröße und Karten-Eindeutigkeit prüfen
    - feste `mit`- und `ohne`-Beispiele prüfen
    - Farbspiel- und Grand-Trumpfreihenfolgen prüfen
    - Spielwerte, Nullwert und Auswahlprüfung prüfen
    - Trainergrenze 1–4 prüfen und höhere Roh-Spitzenwerte separat weiter abdecken
    - Rejection Sampling und beschreibenden Fehler nach zu vielen erfolglosen Versuchen prüfen
    - Out-of-Scope-Puzzles mit tatsächlichen Spitzen über 4 abweisen
    - getrenntes Feedback für Spielwert und Ansage prüfen
    - _Requirements: 2.3, 2.4, 3.1–3.3, 4.1–4.8, 6.1–6.5, 7.2, 7.4_

  - [x] 1.6 Property-Based-Tests für die pure Logik schreiben
    - `src/lib/reizwertTrainer.property.test.js` anlegen
    - Property 1: Jede Aufgabe enthält zehn eindeutige Karten und liegt im Spitzenbereich 1–4
    - Property 2: Spitzenberechnung folgt der Trumpfreihenfolge einschließlich offizieller Rohwerte über 4
    - Property 3: Auswahlwerte verwenden die zentrale Formel innerhalb der Trainergrenze 1–4
    - Property 4: Erwartete Ansage wird korrekt geprüft
    - Property 5: Spielwert und Ansage werden getrennt bewertet
    - Property 6: Null hat keine Spitzen
    - fast-check mit mindestens 100 Iterationen pro Property
    - _Requirements: 3.1–4.7, 6.3, 7.2, 7.4_

- [x] 2. Checkpoint – Pure Logik validieren
  - Feature-Unit- und Property-Tests im Run-Modus ausführen
  - Sicherstellen, dass die zentrale Scoring-Logik unverändert verwendet wird

- [x] 3. Phase 2: Karten- und Trainerkomponenten
  - [x] 3.1 `src/components/rules/PlayingCard.jsx` anlegen
    - Rang und Farbe einer Karte sichtbar darstellen
    - `SuitIcon` für die Farbvisualisierung verwenden
    - zugänglichen Namen wie „Kreuz-Bube“ bereitstellen
    - Größenvarianten für Desktop und Mobile vorsehen
    - Keine Hover-Interaktion als einzige Informationsquelle verwenden
    - _Requirements: 5.1, 5.2, 5.5, 9.3, 9.6_

  - [x] 3.2 `src/components/rules/ReizwertTrainer.jsx` anlegen
    - Beim Mount ein Puzzle erzeugen
    - Trainer-Kopf mit „Auswahlmodus“ und Scope-Hinweis rendern
    - zehn Karten in stabiler, lernfreundlicher Sortierung rendern
    - Spielart, Mit/Ohne, Spitzen 1–4 und Reizwert anbieten
    - leere und ungültige Eingaben validieren
    - sichtbaren Hinweis anzeigen, dass höhere, eigentlich korrekte Spitzenberechnungen bewusst außerhalb des Trainers liegen
    - `idle`, `correct` und `incorrect` UI-Zustände verwalten
    - Spielwert und Spitzen getrennt im Feedback anzeigen
    - Button „Neue Aufgabe“ implementieren
    - keine globale oder persistente Speicherung verwenden
    - _Requirements: 2.1–2.5, 5.1–5.4, 6.1–6.6, 7.1–7.6_

  - [x] 3.3 Temporären Aufgabenstatus implementieren
    - Auswahl, Eingabe, Feedback und Sperrstatus lokal halten
    - falsche Antworten korrigierbar lassen
    - richtige Aufgabe bis „Neue Aufgabe“ sperren
    - „Neue Aufgabe“ setzt Auswahl, Eingabe und Feedback zurück
    - keine Runde-, Treffer- oder Serienstatistik einführen
    - _Requirements: 6.4, 7.5, 7.6, 8.1–8.3_

  - [x] 3.4 Trainerkomponenten testen
    - zehn Karten und Auswahlmodus-Hinweis prüfen
    - Validierung bei fehlender Auswahl und ungültiger Eingabe prüfen
    - richtiges und falsches getrenntes Feedback prüfen
    - Null ohne Spitzen prüfen
    - „Neue Aufgabe“ und Sperrstatus prüfen
    - bei Bedarf `@vitest-environment jsdom` verwenden
    - _Requirements: 2.1, 2.2, 2.4, 5.1, 6.1–6.5, 7.1–7.6, 8.1–8.3_

- [x] 4. Phase 3: Regelwerk-Integration
  - [x] 4.1 Statische Sektion „Reizen verstehen“ in `src/pages/SkatInfo.jsx` ergänzen
    - `id="reizen"` setzen
    - Grundidee von Reizen, Sager/Hörer, „Ja“/„Weg“ und Alleinspieler erklären
    - Reizwert und Spielwert ausdrücklich unterscheiden
    - den Auswahlmodus und seine fehlende taktische Empfehlung erklären
    - _Requirements: 1.1, 1.2, 1.4, 2.2_

  - [x] 4.2 `ReizwertTrainer` in `SkatInfo.jsx` zwischen Reizen-Erklärung und Reiztabelle rendern
    - `id="reizen-uebung"` am umgebenden Abschnitt setzen
    - bestehende Seite weiterhin als einheitliches Regelwerk gestalten
    - Reiztabelle unterhalb des Trainers belassen
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 4.3 Link aus `src/pages/GameScoringEntry.jsx` aktualisieren
    - vorhandenen Regelwerk-Link auf `/info#reizen` setzen
    - keine zusätzliche globale Navigation einführen
    - _Requirements: 1.6, 1.7_

  - [x] 4.4 Regelwerk-Integrations- und Reihenfolge-Tests ergänzen
    - Reizen-Erklärung, Trainer und Reiztabelle in der korrekten Reihenfolge prüfen
    - Fragment-Anker prüfen
    - Linkziel aus der Spielerfassung prüfen
    - _Requirements: 1.1–1.7_

- [x] 5. Phase 4: Styling, Responsive, Accessibility und Navigation
  - [x] 5.1 Relevante CSS-Klassen in `src/index.css` ergänzen oder bestehende Tokens verwenden
    - Trainerkarte, Kartenblatt, Auswahl, Eingabe und Feedback gestalten
    - vorhandene Design Tokens verwenden
    - _Requirements: 1.1, 5.3, 9.3_

  - [x] 5.2 Mobile Layout implementieren
    - Kartenblatt auf kleinen Viewports vollständig und ohne Seiten-Overflow darstellen
    - Eingabe und Buttons stapeln, falls die verfügbare Breite nicht reicht
    - interaktive Ziele mindestens 44 Pixel groß halten
    - _Requirements: 5.3, 9.1, 9.2_

  - [x] 5.3 Accessibility-Abnahme umsetzen
    - sichtbare Labels und Fokuszustände prüfen
    - Feedback als `role="status"` oder `aria-live="polite"` auszeichnen
    - Richtig/Falsch zusätzlich mit Text und Symbol kennzeichnen
    - Karten mit zugänglichen Namen versehen
    - Bedienung vollständig per Tastatur ermöglichen
    - _Requirements: 5.5, 6.1, 6.6, 7.1, 7.2, 9.3–9.6_

  - [x] 5.4 SPA-Hash-Navigation absichern
    - `/info#reizen` bei React-Router-Navigation zum vorhandenen Anker scrollen
    - Hash-Navigation mit stabilem Verhalten bei initialem Laden und Route-Wechsel unterstützen
    - _Requirements: 1.4, 1.6_

  - [x] 5.5 PWA-Precache für Trainer-Assets ergänzen
    - gebündelte WebP-Assets im Service Worker precachen
    - Offline-Auslieferung der Reizen-Infografik sicherstellen
    - _Requirements: 1.1, 5.3_

- [x] 6. Finaler Checkpoint – Feature validieren
  - Feature-Tests im Run-Modus ausführen
  - gezielten ESLint-Lauf für alle neuen und geänderten JS/JSX-Dateien ausführen
  - `npm run build` ausführen und sicherstellen, dass die App unter `/app/` gebaut wird
  - generierten Service Worker auf das WebP-Asset prüfen
  - keine Datenbank-, Sync-, `GameContext`- oder `localStorage`-Änderungen einführen
  - die Auswahlmodus-Requirements gegen die Implementierung prüfen

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5", "1.6", "3.1"] },
    { "id": 3, "tasks": ["2", "3.2", "3.3"] },
    { "id": 4, "tasks": ["3.4", "4.1", "4.2", "4.3"] },
    { "id": 5, "tasks": ["4.4", "5.1", "5.2", "5.3", "5.4", "5.5"] },
    { "id": 6, "tasks": ["6"] }
  ]
}
```

## Notes

- Alle sichtbaren Texte bleiben deutsch; Code- und Testbezeichner bleiben englisch.
- Der Auswahlmodus bewertet die gewählte Spielart und Ansage, nicht den global höchsten möglichen Wert.
- Der Trainer bewertet aus Vereinfachungsgründen nur Spitzen 1 bis 4. Höhere, eigentlich korrekt berechenbare Spitzenwerte werden nicht gekappt, sondern bleiben außerhalb des Trainers.
- Null ist bewusst enthalten und hat den festen zentralen Wert 23 ohne Spitzen.
- Die vorhandene `SuitIcon`-Komponente soll verwendet werden, damit der Trainer mit dem Französischen und Altenburger Iconset funktioniert.
- Die bestehende zentrale Scoring-Logik in `src/lib/skatScoring.js` bleibt die Quelle für Grundwerte und Multiplikatorverhalten.
- Es ist keine neue Supabase-Migration erforderlich.
