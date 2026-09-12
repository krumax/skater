# Requirements Document

## Introduction

Die Regelwerk-Seite der Skatastrophe-App soll um eine interaktive Lernübung erweitert werden. Der **Reizwert-Trainer** zeigt dem Nutzer ein zufällig erzeugtes 10-Karten-Blatt und lässt ihn für eine selbst gewählte Spielart die passende Ansage und den daraus entstehenden Reizwert ermitteln.

Die erste Version ist bewusst ein klar abgegrenzter **Auswahlmodus**. Der Lernende wählt Farbspiel, Grand oder Null, bestimmt bei Farbspiel und Grand Mit/Ohne sowie 1 bis 4 Spitzen und gibt anschließend den Reizwert dieser Kombination ein. Die Prüfung bewertet die gewählte Kombination und die dazugehörige Spitzenberechnung. Sie gibt keine taktische Reizempfehlung und sucht nicht den global höchsten möglichen Wert des Blattes. Die eigentlich korrekte Berechnung von Spitzen über 4 bleibt der Einfachheit halber bewusst außerhalb dieses Trainers; solche Hände werden nicht erzeugt und nicht auf 4 gekappt.

Der unbekannte Skat, Hand, Schneider, Schwarz, Ouvert, Bock und Seeger-Fabian-Wertung sind nicht Bestandteil dieses Modus. Null ist als festes Nullspiel mit dem zentralen Wert 23 enthalten; Null hat keine Spitzen. Der Trainer speichert weder Aufgaben noch Antworten oder Lernstatistiken in Supabase, im globalen `GameContext` oder im `localStorage`.

Der Trainer wird in die bestehende Route `/info` integriert.

## Glossary

- **Reizwert-Trainer**: Interaktives Lernmodul auf der Regelwerk-Seite, das eine selbst gewählte Spielwertkombination aus einem Kartenblatt prüft.
- **Auswahlmodus**: Erste Übungsstufe mit zehn Karten, Farbspielen, Grand und Null. Die Spielart ist Teil der Antwort.
- **Kartenblatt**: Zehn unterschiedliche Karten aus einem vollständigen deutschen 32-Karten-Skatblatt.
- **Spitzen / Matadoren**: Lückenlose Folge der obersten Trümpfe einer Spielart. Bei Farbspielen umfasst die Folge elf Trümpfe, bei Grand die vier Buben.
- **Mit/Ohne**: Kennzeichnet, ob die Trumpffolge beim Kreuz-Buben beginnt (`mit`) oder mit dem ersten fehlenden Trumpf beginnt (`ohne`).
- **Farbspiel**: Spielart Kreuz, Pik, Herz oder Karo mit der jeweiligen elfteiligen Trumpffolge.
- **Grand**: Spielart, bei der nur die vier Buben Trumpf sind und der Grundwert 24 beträgt.
- **Auswahl**: Kombination aus Spielart, Mit/Ohne, Spitzenzahl und eingegebenem Reizwert. Beim Nullspiel gibt es keine Spitzen.
- **Erwartete Ansage**: Die aus dem angezeigten Kartenblatt für die gewählte Spielart berechnete Mit/Ohne- und Spitzenkombination.
- **Spielwert**: Der aus Grundwert und Spitzenzahl berechnete Wert der gewählten Kombination. Für Farbspiele und Grand gilt `Grundwert × (Spitzen + 1)`; Null hat den festen Wert 23.
- **Aufgabenstatus**: Lokaler React-Zustand der aktuellen Aufgabe mit Eingabe, Auswahl, Feedback und dem Zustand „richtig beantwortet“.

## Requirements

### Requirement 1: Integration in das Regelwerk

**User Story:** Als Nutzer möchte ich die Übung direkt im Regelwerk finden, damit ich die Erklärung des Reizens unmittelbar anwenden kann.

#### Acceptance Criteria

1. THE `SkatInfo` page SHALL eine sichtbare Sektion mit der Überschrift „Reizen verstehen“ zwischen dem allgemeinen Skat-Hintergrund und der bestehenden „Reiztabelle“ anzeigen.
2. THE `SkatInfo` page SHALL in der Sektion „Reizen verstehen“ den Unterschied zwischen Reizwert und Spielwert sowie den Ablauf von Sager, Hörer, „Ja“ und „Weg“ in deutscher Sprache erklären.
3. THE `SkatInfo` page SHALL den `Reizwert-Trainer` nach der Erklärung des Reizens und vor der bestehenden Reiztabelle anzeigen.
4. THE Reizen-Sektion SHALL einen stabilen Fragment-Anker `reizen` und der Trainer SHALL einen stabilen Fragment-Anker `reizen-uebung` besitzen, damit beide Bereiche direkt verlinkt werden können.
5. THE existing Reiztabelle SHALL weiterhin als eigenständiges Nachschlagewerk unterhalb des Trainers angezeigt werden.
6. THE link from the scoring entry page to the Regelwerk SHALL auf den Reizen-Anker `/info#reizen` zeigen oder auf gleichwertige Weise direkt zum Reizen-Inhalt führen.
7. THE integration SHALL keinen zusätzlichen globalen Navigationspunkt und keine neue Route für den Trainer benötigen.

### Requirement 2: Verständlicher und abgegrenzter Auswahlmodus

**User Story:** Als Lernender möchte ich verstehen, welche Auswahl geprüft wird, damit ich Reizwert, Spielwert und Spitzen nicht verwechsle.

#### Acceptance Criteria

1. THE Reizwert-Trainer SHALL sichtbar als „Auswahlmodus“ kennzeichnen, dass zehn Karten sowie Farbspiele, Grand und Null unterstützt werden und im vereinfachten Trainer höchstens 1 bis 4 Spitzen bewertet werden.
2. THE Reizwert-Trainer SHALL sichtbar erklären, dass die Aufgabe die ausgewählte Spielart und Ansage rechnerisch prüft und keine taktische Reizempfehlung darstellt.
3. THE Auswahlmodus SHALL den unbekannten Skat, Hand, Schneider, Schneider angesagt, Schwarz, Schwarz angesagt, Ouvert, Bock und Seeger-Fabian-Wertung aus der Berechnung ausschließen.
4. THE Nullspiel SHALL als auswählbare Spielart mit festem Reizwert 23 und ohne Spitzen behandelt werden.
5. THE Reizwert-Trainer SHALL keine Datenbank-, Supabase-, `GameContext`- oder `localStorage`-Persistenz für Aufgaben, Antworten oder Lernstatistiken verwenden.

### Requirement 3: Erzeugung gültiger Aufgaben

**User Story:** Als Lernender möchte ich in jeder Aufgabe ein gültiges und abwechslungsreiches Blatt erhalten, damit ich wiederholt üben kann.

#### Acceptance Criteria

1. THE puzzle generator SHALL Karten aus einem deutschen 32-Karten-Deck mit den Rängen 7, 8, 9, 10, Bube, Dame, König und Ass sowie den Farben Kreuz, Pik, Herz und Karo erzeugen.
2. THE puzzle generator SHALL für jede Aufgabe genau zehn Karten aus dem Deck ziehen.
3. THE puzzle generator SHALL innerhalb einer Aufgabe keine Karte doppelt anzeigen.
4. WHEN eine neue Aufgabe gestartet wird, THE Reizwert-Trainer SHALL ein neues Blatt erzeugen oder ein deterministisch übergebenes Testblatt verwenden.
5. THE puzzle SHALL ausschließlich die Kartenhand als Aufgabenbasis enthalten; die erwartete Ansage wird bei der Prüfung für die gewählte Spielart aus dieser Hand berechnet.
6. THE puzzle generator SHALL jede Hand verwerfen, deren offizielle Spitzenberechnung für mindestens ein Farbspiel über 4 liegt, damit jede auswählbare Farbspielaufgabe im Trainerbereich bleibt.
7. THE puzzle generation SHALL ohne Netzwerkzugriff funktionieren.

### Requirement 4: Korrekte Spitzen- und Spielwertberechnung

**User Story:** Als Lernender möchte ich, dass die Auflösung den offiziellen Grundwerten und Trumpfreihenfolgen entspricht, damit ich eine verlässliche Regelhilfe erhalte.

#### Acceptance Criteria

1. THE calculation logic SHALL für jedes Farbspiel die Trumpfreihenfolge `Kreuz-Bube, Pik-Bube, Herz-Bube, Karo-Bube, Ass der Farbe, 10 der Farbe, König der Farbe, Dame der Farbe, 9 der Farbe, 8 der Farbe, 7 der Farbe` verwenden.
2. THE calculation logic SHALL für Grand die Trumpfreihenfolge `Kreuz-Bube, Pik-Bube, Herz-Bube, Karo-Bube` verwenden.
3. WHEN der erste Trumpf der jeweiligen Reihenfolge im Blatt vorhanden ist, THE calculation logic SHALL die zusammenhängende vorhandene Folge als `mit`-Spitzen zählen.
4. WHEN der erste Trumpf der jeweiligen Reihenfolge im Blatt nicht vorhanden ist, THE calculation logic SHALL die zusammenhängende fehlende Folge vom Anfang der Reihenfolge als `ohne`-Spitzen zählen.
5. THE calculation logic SHALL die zentralen Grundwerte der App verwenden: Karo 9, Herz 10, Pik 11, Kreuz 12 und Grand 24.
6. THE calculation logic SHALL den Wert eines Farbspiels oder Grand als `Grundwert × (Spitzen + 1)` berechnen.
7. THE calculation logic SHALL den Wert eines Nullspiels aus `NULL_VALUES.null` der zentralen Scoring-Logik beziehen.
8. THE calculation logic SHALL die offizielle Rohberechnung von Spitzen über 4 für Farbspiele weiterhin erkennen können, diese Werte im Trainer aber nicht als Auswahl anbieten oder bewerten; sie SHALL höhere Werte nicht auf 4 kappen.
9. THE calculation logic SHALL keine Augen, Gewinn-/Verlustentscheidung oder Seeger-Fabian-Punkte für die Aufgabenbewertung verwenden.

### Requirement 5: Karten- und Aufgabenanzeige

**User Story:** Als Nutzer möchte ich das Blatt schnell erfassen können, damit ich mich auf die Trumpfreihenfolge konzentrieren kann.

#### Acceptance Criteria

1. THE Reizwert-Trainer SHALL alle zehn Karten mit Rang und Farbe sichtbar anzeigen.
2. THE card display SHALL für die Farbdarstellung die bestehende `SuitIcon`-Komponente oder eine gleichwertige iconset-bewusste Darstellung verwenden, damit die Einstellung Französisches/Altenburger Blatt respektiert wird.
3. THE card display SHALL die Karten auf Desktop und Mobilgeräten vollständig anzeigen, ohne dass Karteninhalte abgeschnitten werden.
4. THE card display SHALL eine stabile, lernfreundliche Sortierung oder Gruppierung verwenden, die die zehn Karten eindeutig erkennbar lässt.
5. THE card display SHALL Kartenfarben nicht ausschließlich durch Farbe unterscheiden, sondern zusätzlich Rang und Symbol beziehungsweise zugänglichen Text anzeigen.

### Requirement 6: Auswahl, Antwort und Prüfung

**User Story:** Als Lernender möchte ich eine Spielart und Ansage auswählen und unmittelbar prüfen lassen, ob die Kombination rechnerisch stimmt.

#### Acceptance Criteria

1. THE Reizwert-Trainer SHALL Auswahlmöglichkeiten für Spielart, Mit/Ohne und – soweit anwendbar – die Spitzen 1 bis 4 sowie ein beschriftetes Eingabefeld für einen ganzzahligen Reizwert anzeigen.
2. WHEN eine erforderliche Auswahl fehlt oder das Eingabefeld leer ist oder keine ganze Zahl enthält, THEN THE Reizwert-Trainer SHALL eine verständliche deutsche Validierung anzeigen und keine Prüfung als abgeschlossen markieren.
3. WHEN der Nutzer „Prüfen“ aktiviert und eine gültige Auswahl sowie Zahl eingegeben hat, THE Reizwert-Trainer SHALL den Reizwert gegen die gewählte Kombination und Mit/Ohne-/Spitzen-Auswahl gegen die Kartenhand prüfen.
4. WHEN eine Prüfung falsch ist, THE Reizwert-Trainer SHALL die Korrektur der Auswahl oder Eingabe ermöglichen. WHEN eine Prüfung richtig ist, THE Reizwert-Trainer SHALL die aktuelle Aufgabe bis zum Start der nächsten Aufgabe sperren.
5. THE Antwortprüfung SHALL bewusst die gewählte Spielart und Ansage bewerten; sie SHALL keine globale Rangfolge oder taktische Empfehlung aus dem Blatt ableiten.
6. THE Reizwert-Trainer SHALL das Prüfen per Tastatur und per Touch bedienen lassen.

### Requirement 7: Erklärendes Feedback und nächste Aufgabe

**User Story:** Als Lernender möchte ich nach meiner Auswahl nachvollziehen können, welche Teilentscheidung richtig oder falsch war.

#### Acceptance Criteria

1. WHEN die Auswahl vollständig richtig ist, THEN THE Reizwert-Trainer SHALL eine positive deutsche Rückmeldung für die gewählte Spielart und Ansage anzeigen.
2. WHEN die Auswahl falsch ist, THEN THE Reizwert-Trainer SHALL verständlich getrennt anzeigen, ob der eingegebene Spielwert und die Spitzen-/Mit-Ohne-Auswahl stimmen.
3. AFTER jeder Prüfung, THE Reizwert-Trainer SHALL den erwarteten Reizwert und die erwartete Ansage für die gewählte Spielart entweder direkt oder über die Aktion „Richtige Lösung anzeigen“ zugänglich machen.
4. THE Feedback SHALL beim Nullspiel ausdrücklich darauf hinweisen, dass es keine Spitzen gibt.
5. AFTER eine Aufgabe geprüft wurde, THE Reizwert-Trainer SHALL eine Aktion „Neue Aufgabe“ anbieten.
6. WHEN „Neue Aufgabe“ aktiviert wird, THEN THE Reizwert-Trainer SHALL ein neues Blatt laden sowie Auswahl, Eingabe und Feedback zurücksetzen.

### Requirement 8: Temporärer Aufgabenstatus

**User Story:** Als Lernender möchte ich die aktuelle Aufgabe bearbeiten können, ohne dass Lernversuche in meine Spielstatistik einfließen.

#### Acceptance Criteria

1. THE Reizwert-Trainer SHALL Auswahl, Eingabe, Feedback und den Sperrstatus ausschließlich im lokalen React-Zustand halten.
2. WHEN der Nutzer die Regelwerk-Seite verlässt oder neu lädt, THE Reizwert-Trainer SHALL den Aufgabenstatus zurücksetzen dürfen.
3. THE Aufgabenwerte SHALL nicht in Spielhistorie, Spielerstatistiken, Achievements, `GameContext`, `localStorage` oder Supabase persistiert werden.

### Requirement 9: Responsive und zugängliche Bedienung

**User Story:** Als Nutzer am Smartphone möchte ich die Übung bequem bedienen können, damit sie auch direkt am Spieltisch funktioniert.

#### Acceptance Criteria

1. THE Reizwert-Trainer SHALL auf Viewports bis einschließlich 768 Pixel ohne horizontales Seiten-Scrolling funktionieren.
2. THE interactive controls SHALL eine ausreichend große Touch-Fläche von mindestens 44 Pixeln besitzen.
3. THE feedback SHALL sowohl durch Text als auch durch ein nicht ausschließlich farbabhängiges Symbol oder Label erkennbar sein.
4. THE input SHALL einen sichtbaren Label-Text, einen erreichbaren Fokuszustand und eine deutsche Fehlermeldung besitzen.
5. THE result feedback SHALL für assistive Technologien als zusammenhängender Statusbereich beziehungsweise `aria-live`-Bereich angekündigt werden.
6. THE Reizwert-Trainer SHALL keine zwingende Hover-Interaktion voraussetzen.

## Scope Boundaries

Die folgenden Erweiterungen sind nicht Bestandteil dieser Auswahlmodus-Spec und können später als eigene Lernstufen spezifiziert werden:

- Ermittlung des global höchsten rechnerischen Reizwerts aus allen Spielarten
- Anzeige und Bewertung mehrerer gleichwertiger Spielarten
- temporäre Treffer-, Serien- oder Rundenzähler
- Berücksichtigung eines aufgenommenen oder unbekannten Skats
- Reizen mit Hand
- Schneider, Schwarz, Ouvert und angesagte Spielstufen
- Bockrunden und Seeger-Fabian-Wertung
- taktische Empfehlungen, ob ein Spieler ein Blatt tatsächlich reizen sollte
- Bewertung von tatsächlichen Spitzen über 4 im vereinfachten Trainer; diese fachlich korrekten höheren Werte bleiben für eine spätere Lernstufe außerhalb des Scopes
- persistente Lernstatistiken oder Achievement-Integration
