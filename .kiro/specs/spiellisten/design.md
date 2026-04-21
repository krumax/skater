# Design-Dokument: Spiellisten

## Übersicht

Das Spiellisten-Feature erweitert die bestehende Skat-App um benannte Spielserien
(„Listen") innerhalb eines Tisches. Eine Liste gruppiert eine feste Anzahl
aufeinanderfolgender Runden und ermittelt am Ende einen Listensieger nach
Seeger-Fabian-Punkten (vorrangig) und Rohpunkten (nachrangig).

Das Feature integriert sich nahtlos in die bestehende Architektur:
- `gameReducer.js` erhält neue Actions für Listen-Zustandsänderungen
- `syncService.js` übernimmt alle DB-Operationen inkl. camelCase↔snake_case-Mapping
- `useSyncActions.js` erhält neue async Actions mit optimistischem Update-Muster
- `GameContext.jsx` stellt Listen-State und -Actions app-weit bereit
- Neue UI-Komponenten und eine neue Route `/spiellisten` für die Listenübersicht

Das Spielen ohne Liste bleibt der Normalfall; Listen sind optional.

---

## Architektur

### Datenfluss

```
User Action
    │
    ▼
useSyncActions (async)
    │  optimistic dispatch
    ├──────────────────────► gameReducer (sync, pure)
    │                              │
    │                              ▼
    │                        GameContext state
    │                              │
    │                              ▼
    │                         UI re-render
    │
    │  async DB sync
    └──────────────────────► syncService.js
                                   │
                                   ▼
                              Supabase (PostgreSQL)
```

### Neue Reducer-Actions

```
LOAD_SESSION          (erweitert: lädt spiellisten + activeSpiellisteId)
ADD_SPIELLISTE        (neue Liste anlegen)
SET_ACTIVE_SPIELLISTE (zuletzt aktive Liste setzen / deselektieren)
CLOSE_SPIELLISTE      (Status → abgeschlossen, Sieger setzen)
ADD_ROUND             (erweitert: setzt spiellisteId aus activeSpiellisteId)
```

### Automatischer Listenabschluss

Der automatische Abschluss wird im Reducer bei `ADD_ROUND` geprüft:
Wenn nach dem Hinzufügen einer Runde die Anzahl der Listenrunden die
`roundCount` der aktiven Liste erreicht, wird die Liste sofort auf
`abgeschlossen` gesetzt und der Sieger berechnet.

---

## Komponenten und Interfaces

### Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/lib/spiellistenUtils.js` | Pure Hilfsfunktionen: Sieger-Berechnung, Validierung, Statistik |
| `src/pages/SpiellistenPage.jsx` | Route `/spiellisten` - Listenübersicht + Drill-down |
| `src/components/SpiellistenSelector.jsx` | Dropdown/Modal zur Listenauswahl in „Aktuelle Runde" |
| `src/components/ListenFortschritt.jsx` | Fortschrittsanzeige „Runde X von Y" in GameScoringEntry |
| `supabase/migrations/YYYYMMDD_spiellisten.sql` | DB-Migration |

### Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `src/lib/gameReducer.js` | Neuer State-Slice `spiellisten`, `activeSpiellisteId`; erweiterte Actions |
| `src/lib/syncService.js` | CRUD für `spiellisten`-Tabelle; `insertRound` mit `spielliste_id` |
| `src/hooks/useSyncActions.js` | `createSpielliste`, `setActiveSpielliste`, `closeSpielliste` |
| `src/context/GameContext.jsx` | Neue State-Felder und Actions exponieren |
| `src/pages/GameScoringEntry.jsx` | `ListenFortschritt` + `SpiellistenSelector` einbinden |
| `src/pages/StatistikenCharts.jsx` | Listen-Übersicht + Drill-down ergänzen |
| `src/components/Sidebar.jsx` | Navigationseintrag „Spiellisten" |

### `spiellistenUtils.js` - Public API

```js
// Validierung
validateSpiellisteName(name: string): { valid: boolean, error?: string }
validateRoundCount(n: number): { valid: boolean, error?: string }
generateDefaultName(existingCount: number): string  // "Liste N"

// Sieger-Berechnung (pure)
computeListWinner(players: string[], listRounds: Round[]): string[]
  // Gibt Array zurück (mehrere Sieger bei Gleichstand)

// Statistik (pure)
computeListStats(players: string[], listRounds: Round[]): {
  seegerTotals: Record<string, number>,
  rawTotals:    Record<string, number>,
  sortedPlayers: Array<{ name, seeger, raw }>,
  playedRounds:  number,
}

// Fortschritt (pure)
computeListProgress(spielliste: Spielliste, listRounds: Round[]): {
  current: number,
  total:   number,
} | null
```

### `SpiellistenSelector` - Props

```jsx
<SpiellistenSelector
  spiellisten={Spielliste[]}       // alle aktiven Listen des Tisches
  activeId={string | null}         // aktuell aktive Liste
  onSelect={(id: string | null) => void}
  onCreateNew={() => void}
/>
```

### `ListenFortschritt` - Props

```jsx
<ListenFortschritt
  spielliste={Spielliste | null}
  listRounds={Round[]}
/>
// Rendert nichts wenn spielliste === null
```

---

## Datenmodelle

### App-State (camelCase)

```ts
// Neuer Slice im gameReducer-State
interface Spielliste {
  id:            string;          // UUID
  sessionId:     string;          // FK → sessions.id
  name:          string;          // max. 40 Zeichen
  roundCount:    number;          // 3–36, Vielfaches von 3
  status:        'aktiv' | 'abgeschlossen';
  winner:        string[] | null; // null solange aktiv
  lastTouchedAt: string;          // ISO timestamp
  createdAt:     string;          // ISO timestamp
}

// Erweiterung des gameReducer initialState
interface GameState {
  // ... bestehende Felder ...
  spiellisten:        Spielliste[];
  activeSpiellisteId: string | null;
}

// Erweiterung des Round-Objekts
interface Round {
  // ... bestehende Felder ...
  spiellisteId: string | null;    // null = listenlose Runde
}
```

### Datenbank (snake_case)

```sql
-- Neue Tabelle
CREATE TABLE spiellisten (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (char_length(name) <= 40),
  round_count     INTEGER NOT NULL CHECK (round_count >= 3 AND round_count <= 36
                                          AND round_count % 3 = 0),
  status          TEXT NOT NULL DEFAULT 'aktiv'
                  CHECK (status IN ('aktiv', 'abgeschlossen')),
  winner          TEXT[] DEFAULT NULL,
  last_touched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id         UUID REFERENCES auth.users(id)
);

-- Erweiterung der rounds-Tabelle
ALTER TABLE rounds
  ADD COLUMN spielliste_id UUID REFERENCES spiellisten(id) ON DELETE SET NULL;

-- Index für häufige Abfragen
CREATE INDEX idx_spiellisten_session_id ON spiellisten(session_id);
CREATE INDEX idx_rounds_spielliste_id   ON rounds(spielliste_id);
```

### camelCase ↔ snake_case Mapping (ausschließlich in syncService.js)

| App (camelCase) | DB (snake_case) |
|-----------------|-----------------|
| `sessionId` | `session_id` |
| `roundCount` | `round_count` |
| `lastTouchedAt` | `last_touched_at` |
| `createdAt` | `created_at` |
| `spiellisteId` | `spielliste_id` |
| `userId` | `user_id` |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system - essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Erstellte Liste hat korrekte Felder und wird aktiv gesetzt

*For any* gültigen Namen (1–40 Zeichen) und gültiger Rundenzahl (Vielfaches von 3 im Bereich 3–36), muss eine neu erstellte Spielliste den Status `aktiv` haben, den übergebenen Namen und die übergebene Rundenzahl enthalten - und die `activeSpiellisteId` im State muss auf die neue Liste zeigen.

**Validates: Requirements 1.1, 1.2**

---

### Property 2: Ungültige Rundenzahlen werden abgelehnt

*For any* ganzzahligen Wert, der kein Vielfaches von 3 ist oder außerhalb des Bereichs [3, 36] liegt, muss `validateRoundCount` einen Fehler zurückgeben.

**Validates: Requirements 1.3**

---

### Property 3: Standardname folgt dem Schema „Liste N"

*For any* Anzahl N bereits vorhandener Listen am Tisch, muss `generateDefaultName(N)` den String `"Liste " + (N + 1)` zurückgeben.

**Validates: Requirements 1.4**

---

### Property 4: Rundenzuordnung folgt dem aktiven Listen-State

*For any* Spielzustand, muss eine neu hinzugefügte Runde genau dann eine `spiellisteId` erhalten, wenn `activeSpiellisteId` nicht null ist - und der Wert muss gleich `activeSpiellisteId` sein.

**Validates: Requirements 2.1, 2.2**

---

### Property 5: Listenabschluss setzt activeSpiellisteId auf null

*For any* Spielzustand, in dem die aktive Liste nach dem Hinzufügen einer Runde ihre `roundCount` erreicht (automatischer Abschluss) oder manuell geschlossen wird, muss `activeSpiellisteId` danach null sein.

**Validates: Requirements 5.3, 6.2**

---

### Property 6: Automatischer Abschluss bei Erreichen der Rundenzahl

*For any* aktive Liste mit `roundCount` R, muss nach dem Hinzufügen der R-ten Listenrunde der Status der Liste `abgeschlossen` sein.

**Validates: Requirements 5.1**

---

### Property 7: Listensieger ist der Spieler mit den höchsten Seeger-Fabian-Punkten

*For any* Menge von Listenrunden mit eindeutigen Seeger-Fabian-Gesamtpunkten pro Spieler, muss `computeListWinner` genau den Spieler mit dem höchsten Seeger-Fabian-Gesamtwert zurückgeben.

**Validates: Requirements 7.1, 7.2**

---

### Property 8: Rohpunkte als Tiebreaker bei Seeger-Fabian-Gleichstand

*For any* Menge von Listenrunden, bei der zwei oder mehr Spieler identische Seeger-Fabian-Gesamtpunkte haben, muss `computeListWinner` den Spieler mit den höchsten Rohpunkten als Sieger zurückgeben.

**Validates: Requirements 7.3**

---

### Property 9: Mehrere Sieger bei vollständigem Gleichstand

*For any* Menge von Listenrunden, bei der zwei oder mehr Spieler sowohl identische Seeger-Fabian-Punkte als auch identische Rohpunkte haben, muss `computeListWinner` alle gleichauf liegenden Spieler zurückgeben.

**Validates: Requirements 7.4**

---

### Property 10: Listenstatistik filtert korrekt nach spiellisteId

*For any* Menge von Runden mit gemischten `spiellisteId`-Werten, muss `computeListStats` für eine gegebene Liste ausschließlich die Runden berücksichtigen, deren `spiellisteId` mit der Listen-ID übereinstimmt - und die Seeger-Fabian- sowie Rohpunkte korrekt summieren.

**Validates: Requirements 8.1, 8.3**

---

### Property 11: Fortschrittsberechnung ist korrekt

*For any* aktive Liste mit `roundCount` Y und einer Menge von N ihr zugeordneten Runden (N < Y), muss `computeListProgress` `{ current: N, total: Y }` zurückgeben.

**Validates: Requirements 4.1**

---

### Property 12: getActiveSpiellistenForSession gibt nur aktive Listen zurück

*For any* Menge von Listen mit gemischten Status-Werten, muss eine Filterfunktion über `spiellisten` ausschließlich Listen mit Status `aktiv` zurückgeben.

**Validates: Requirements 3.4**

---

## Fehlerbehandlung

### Validierungsfehler (client-seitig)

| Fehlerfall | Fehlermeldung (Deutsch) |
|------------|------------------------|
| Name leer → Standardname | *(kein Fehler, Standardname wird vergeben)* |
| Name > 40 Zeichen | „Der Name darf maximal 40 Zeichen lang sein." |
| Rundenzahl kein Vielfaches von 3 | „Die Rundenzahl muss ein Vielfaches von 3 sein." |
| Rundenzahl < 3 oder > 36 | „Die Rundenzahl muss zwischen 3 und 36 liegen." |

### Sync-Fehler (Supabase)

- Alle Listen-Operationen folgen dem bestehenden `setSyncStatus`/`setSyncError`-Muster
- Offline-Operationen werden in die bestehende `skat_offline_queue` eingereiht
- Neue Queue-Actions: `createSpielliste`, `closeSpielliste`, `setActiveSpielliste`
- Bei Fehler bleibt der optimistisch gesetzte lokale State erhalten; der Nutzer sieht den `syncStatus === 'error'`-Indikator

### Edge Cases

- **Session ohne Spieler**: Liste kann nicht erstellt werden (Guard in `useSyncActions`)
- **Liste bereits abgeschlossen**: `setActiveSpielliste` ignoriert abgeschlossene Listen-IDs
- **Runde löschen aus Listenrunde**: `spiellisteId` der Runde wird mitgelöscht; kein automatisches Re-Öffnen der Liste
- **Offline-Erstellung + sofortiger Abschluss**: Beide Queue-Einträge werden in Reihenfolge verarbeitet

---

## Testing-Strategie

### Dual Testing Approach

Das Feature verwendet sowohl Unit-/Beispiel-Tests als auch Property-Based Tests (PBT).

**Unit-Tests** (`spiellistenUtils.test.js`, `gameReducer.test.js` erweitert):
- Konkrete Beispiele für Sieger-Berechnung (2 Spieler, 3 Spieler, Gleichstand)
- Validierungsfehler mit spezifischen Grenzwerten (3, 36, 37, 2, 0)
- Reducer-Actions mit konkreten Payloads
- Offline-Queue-Verhalten (mock `navigator.onLine`)

**Property-Based Tests** (`spiellistenUtils.property.test.js`):
- Library: **fast-check** (bereits im Projekt vorhanden)
- Mindestens **100 Iterationen** pro Property-Test
- Jeder Test referenziert die Design-Property im Kommentar

**Tag-Format:**
```js
// Feature: spiellisten, Property 7: Listensieger ist der Spieler mit den höchsten Seeger-Fabian-Punkten
```

### Property-Test-Generatoren

```js
// Gültige Rundenzahl: Vielfaches von 3 im Bereich [3, 36]
const validRoundCount = fc.integer({ min: 1, max: 12 }).map(n => n * 3);

// Ungültige Rundenzahl
const invalidRoundCount = fc.oneof(
  fc.integer({ min: -100, max: 2 }),           // zu klein
  fc.integer({ min: 37, max: 200 }),           // zu groß
  fc.integer({ min: 1, max: 100 })             // nicht Vielfaches von 3
    .filter(n => n % 3 !== 0)
);

// Spieler-Namen (3–4 Spieler)
const playerNames = fc.uniqueArray(
  fc.string({ minLength: 1, maxLength: 20 }),
  { minLength: 3, maxLength: 4 }
);

// Listenrunde (vereinfacht, mit spiellisteId)
const listRound = (players, spiellisteId) =>
  fc.record({
    player:      fc.constantFrom(...players),
    gameValue:   fc.integer({ min: -240, max: 240 }),
    won:         fc.boolean(),
    seegerScores: fc.constant({}), // wird in Tests manuell gesetzt
    spiellisteId: fc.constant(spiellisteId),
  });
```

### Integrationstests (`syncService.test.js` erweitert)

- `loadSession` gibt `spiellisten`-Array zurück
- `insertRound` mit `spielliste_id` wird korrekt gemappt
- Offline-Queue verarbeitet `createSpielliste`-Einträge in Reihenfolge
- Session-Wechsel lädt Listen des neuen Tisches

### Snapshot-Tests

- `ListenFortschritt` rendert „Runde X von Y" korrekt
- `SpiellistenSelector` zeigt nur aktive Listen
- Abgeschlossene Liste zeigt keine Bearbeitungsaktionen
