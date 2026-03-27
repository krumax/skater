# Design-Dokument: Spieltyp-Bearbeitung (game-type-editing)

## Übersicht

Das Feature ermöglicht es, den Spieltyp (`game_type`, `type_label`) und zugehörige Attribute
(`hand`, `ouvert`, `schneider`, `schwarz`, `spitzen`) einer bereits gespeicherten Runde
nachträglich zu bearbeiten. Der numerische Spielwert (`game_value`) bleibt dabei unverändert –
es werden ausschließlich Kontextinformationen ergänzt oder korrigiert.

Auslöser ist die Skatliste (`SkatScoreList`), in der über 300 historisch importierte Runden
mit Platzhalter-Spieltypen (z. B. "Import") vorhanden sind. Der Benutzer soll diese Daten
direkt in der Liste korrigieren können, ohne die Seite neu zu laden.

---

## Architektur

Das Feature folgt dem bestehenden Muster der App:

```
SkatScoreList (View)
  └── RoundRow (pro Zeile)
        └── Stift-Icon → öffnet GameTypeEditor
              └── GameTypeEditor (Modal-Komponente)
                    ├── liest: round (prop)
                    ├── schreibt: updateRound (GameContext-Action)
                    └── ruft auf: syncService.updateRound(...)
```

Datenfluss beim Speichern:

```
Benutzer klickt "Speichern"
  → GameTypeEditor validiert Eingaben
  → syncService.updateRound(roundDbId, patch) → Supabase UPDATE
  → bei Erfolg: dispatch({ type: 'UPDATE_ROUND', payload: { id, patch } })
  → GameContext aktualisiert rounds-Array
  → SkatScoreList re-rendert mit neuem typeLabel
```

---

## Komponenten und Schnittstellen

### Neue Komponente: `GameTypeEditor`

Datei: `src/components/GameTypeEditor.jsx`

Props:
```js
{
  round: RoundObject,       // die zu bearbeitende Runde
  onClose: () => void,      // schließt den Dialog ohne Speichern
  onSaved: () => void,      // wird nach erfolgreichem Speichern aufgerufen
}
```

Interner Zustand:
```js
{
  gameType: string,         // 'null' | 'club' | 'spade' | 'heart' | 'diamond' | 'grand'
  hand: boolean,
  ouvert: boolean,
  schneider: boolean,
  schwarz: boolean,
  spitzen: number,          // 1–11 (Farbe) oder 1–4 (Grand)
  errors: { spitzen?: string, general?: string },
  saving: boolean,
}
```

Verhalten:
- Vorbelegt mit den aktuellen Werten der übergebenen `round`
- Zeigt bei `gameType === 'null'`: Checkboxen Hand, Ouvert; blendet Spitzen aus
- Zeigt bei Farb-/Grand-Spieltyp: Eingabefeld Spitzen (mit Bereichsvalidierung)
- Berechnet `type_label` aus `gameType` + Attributen (Hilfsfunktion `buildTypeLabel`)
- Schließt bei Klick auf Overlay oder Escape-Taste (ohne Speichern)

### Änderungen an `SkatScoreList` / `RoundRow`

- `RoundRow` erhält zusätzlichen Prop `onEdit: (round) => void`
- Stift-Icon (`edit`-Symbol aus Material Symbols) wird in jeder Zeile gerendert
- `SkatScoreList` verwaltet `editingRound`-State und rendert `GameTypeEditor` als Modal

### Neue Funktion im `SyncService`

Datei: `src/lib/syncService.js`

```js
/**
 * Aktualisiert ausschließlich die Spieltyp-Felder einer Runde.
 * @param {string} roundDbId - UUID der Runde (_dbId)
 * @param {object} patch - { game_type, type_label, hand, ouvert, schneider, schwarz, spitzen }
 * @returns {{ data, error }}
 */
export async function updateRound(roundDbId, patch) { ... }
```

Das `patch`-Objekt enthält ausschließlich:
`game_type`, `type_label`, `hand`, `ouvert`, `schneider`, `schwarz`, `spitzen`

### Neue Action im `GameContext`

```js
case 'UPDATE_ROUND': {
  const { id, patch } = action.payload;
  return {
    ...state,
    rounds: state.rounds.map(r =>
      r.id === id ? { ...r, ...patch } : r
    ),
  };
}
```

Neue Context-Funktion `updateRound`:
```js
const updateRound = useCallback(async (round, patch) => {
  const { error } = await syncService.updateRound(round._dbId, toSnakeCase(patch));
  if (error) return { error };
  dispatch({ type: 'UPDATE_ROUND', payload: { id: round.id, patch } });
  return { error: null };
}, []);
```

---

## Datenmodelle

### Patch-Objekt (camelCase, Frontend)

```ts
interface RoundPatch {
  gameType:  'null' | 'club' | 'spade' | 'heart' | 'diamond' | 'grand';
  typeLabel: string;
  hand:      boolean;
  ouvert:    boolean;
  schneider: boolean;
  schwarz:   boolean;
  spitzen:   number;
}
```

### DB-Update (snake_case, Supabase)

```ts
interface RoundDbPatch {
  game_type:  string;
  type_label: string;
  hand:       boolean;
  ouvert:     boolean;
  schneider:  boolean;
  schwarz:    boolean;
  spitzen:    number;
}
```

Felder, die beim Update **nicht** berührt werden:
`game_value`, `base_value`, `multiplier`, `won`, `eye_count`, `player`,
`round_number`, `roles`, `seeger_scores`, `timestamp`, `session_id`

### Hilfsfunktion `buildTypeLabel`

```js
// Gibt den lesbaren Typ-Label zurück, z. B. "Kreuz Hand" oder "Null Ouvert Hand"
function buildTypeLabel(gameType, { hand, ouvert }) {
  const base = SUIT_LABELS[gameType]; // aus skatScoring.js
  const suffixes = [];
  if (hand)   suffixes.push('Hand');
  if (ouvert) suffixes.push('Ouvert');
  return [base, ...suffixes].join(' ');
}
```

### Spitzen-Validierungsbereiche

| Spieltyp | Min | Max |
|----------|-----|-----|
| club, spade, heart, diamond | 1 | 11 |
| grand | 1 | 4 |
| null | – | – (kein Spitzen-Feld) |

---

## Correctness Properties

*Eine Property ist eine Eigenschaft oder ein Verhalten, das für alle gültigen Ausführungen eines Systems gelten soll – im Wesentlichen eine formale Aussage darüber, was das System tun soll. Properties bilden die Brücke zwischen menschlich lesbaren Spezifikationen und maschinell verifizierbaren Korrektheitsnachweisen.*


### Property 1: Bearbeitungs-Icon für jede Runde vorhanden

*Für alle* Runden-Arrays mit mindestens einem Eintrag gilt: jede gerenderte Tabellenzeile enthält genau ein Element mit der Rolle "Bearbeiten" (Edit-Icon).

**Validates: Requirements 1.1**

### Property 2: Dialog öffnet korrekte Runde

*Für jede* Runde in der Liste gilt: nach einem Klick auf das zugehörige Bearbeitungs-Icon ist der Dialog geöffnet und die angezeigten Formularfelder entsprechen den Werten genau dieser Runde (gameType, hand, ouvert, schneider, schwarz, spitzen).

**Validates: Requirements 1.2, 2.1**

### Property 3: Dialog schließt ohne Speichern bei Abbruch

*Für jeden* geöffneten Bearbeitungsdialog gilt: nach einem Escape-Tastendruck oder einem Klick auf das Overlay ist der Dialog geschlossen und der SyncService wurde nicht aufgerufen.

**Validates: Requirements 1.4**

### Property 4: Feldanzeige abhängig vom Spieltyp

*Für jeden* Spieltyp gilt: bei Auswahl von `null` sind ausschließlich die Felder Hand und Ouvert sichtbar (Spitzen ist ausgeblendet); bei Auswahl eines Farb- oder Grand-Spieltyps ist das Spitzen-Feld sichtbar.

**Validates: Requirements 2.3, 2.4**

### Property 5: Validierung ungültiger Eingaben blockiert Speichern

*Für alle* Eingaben, bei denen der Spitzen-Wert außerhalb des gültigen Bereichs liegt (< 1 oder > 11 bei Farbe, > 4 bei Grand), gilt: die Speichern-Schaltfläche ist deaktiviert und eine Fehlermeldung ist sichtbar.

**Validates: Requirements 2.6, 2.7**

### Property 6: game_value bleibt nach Speichern unverändert

*Für jede* Runde gilt: nach einer Bearbeitung und erfolgreichem Speichern ist der `game_value` im lokalen GameContext-Zustand identisch mit dem Wert vor der Bearbeitung.

**Validates: Requirements 3.2, 4.3**

### Property 7: Nur erlaubte Felder werden aktualisiert

*Für jeden* SyncService-Aufruf `updateRound` gilt: das an Supabase gesendete Patch-Objekt enthält ausschließlich die Felder `game_type`, `type_label`, `hand`, `ouvert`, `schneider`, `schwarz`, `spitzen` und keine weiteren Felder.

**Validates: Requirements 3.1, 4.1**

### Property 8: Lokaler Zustand spiegelt gespeicherte Werte wider (Round-Trip)

*Für jede* Runde gilt: nach erfolgreichem Speichern und anschließendem Neuladen der Session aus der Datenbank sind `game_type` und `type_label` im lokalen Zustand identisch mit den in Supabase gespeicherten Werten.

**Validates: Requirements 3.3, 3.4, 4.2**

### Property 9: Fehlerbehandlung bei DB-Fehler

*Für jeden* simulierten Datenbankfehler beim `updateRound`-Aufruf gilt: der lokale GameContext-Zustand bleibt unverändert (kein `UPDATE_ROUND`-Dispatch) und eine Fehlermeldung wird im Dialog angezeigt.

**Validates: Requirements 3.5**

---

## Fehlerbehandlung

| Fehlerfall | Verhalten |
|---|---|
| Supabase gibt Fehler beim UPDATE zurück | Dialog zeigt Fehlermeldung, lokaler Zustand bleibt unverändert |
| Ungültiger Spitzen-Wert | Inline-Fehlermeldung, Speichern-Button deaktiviert |
| Netzwerkfehler während des Speicherns | Fehlermeldung im Dialog, kein Dispatch |
| `round._dbId` fehlt (z. B. lokale Runde ohne DB-Sync) | Speichern-Button deaktiviert, Hinweistext |

Fehler werden nicht als globaler `syncError` im GameContext gesetzt, da es sich um eine lokale Bearbeitungsaktion handelt. Der Fehler bleibt im Dialog-State isoliert.

---

## Teststrategie

### Dualer Testansatz

Beide Testarten sind komplementär und notwendig:

- **Unit-Tests**: Spezifische Beispiele, Randfälle und Fehlerbedingungen
- **Property-Tests**: Universelle Eigenschaften über alle möglichen Eingaben

### Unit-Tests (Beispiele und Randfälle)

Datei: `src/components/GameTypeEditor.test.jsx`

- Dialog öffnet sich mit korrekten Vorauswahl-Werten für eine konkrete Runde
- Alle 6 Spieltypen sind in der Auswahl vorhanden (Anforderung 2.2)
- Null-Spieltyp: Spitzen-Feld ist nicht sichtbar
- Farb-Spieltyp: Spitzen-Feld ist sichtbar
- Speichern-Button ist bei ungültigem Spitzen-Wert deaktiviert
- Escape schließt den Dialog ohne Speichern
- Fehlermeldung bei simuliertem DB-Fehler

Datei: `src/lib/syncService.test.js` (Erweiterung)

- `updateRound` sendet nur die erlaubten Felder
- `updateRound` verändert `game_value` nicht

Datei: `src/context/GameContext.test.js`

- `UPDATE_ROUND`-Reducer: nur die angegebene Runde wird aktualisiert
- `UPDATE_ROUND`-Reducer: `game_value` bleibt unverändert

### Property-Tests

Bibliothek: **fast-check** (bereits im JS/React-Ökosystem etabliert, kein zusätzlicher Setup-Aufwand)

Konfiguration: Mindestens **100 Iterationen** pro Property-Test.

Jeder Property-Test wird mit einem Kommentar annotiert:

```
// Feature: game-type-editing, Property N: <property_text>
```

Datei: `src/components/GameTypeEditor.property.test.jsx`

```js
// Feature: game-type-editing, Property 2: Dialog öffnet korrekte Runde
fc.assert(fc.property(arbitraryRound, (round) => {
  // render SkatScoreList mit round, klicke Edit-Icon, prüfe Formularwerte
}), { numRuns: 100 });

// Feature: game-type-editing, Property 4: Feldanzeige abhängig vom Spieltyp
fc.assert(fc.property(fc.constantFrom('null','club','spade','heart','diamond','grand'), (gameType) => {
  // render GameTypeEditor, wähle gameType, prüfe Sichtbarkeit der Felder
}), { numRuns: 100 });

// Feature: game-type-editing, Property 5: Validierung ungültiger Eingaben
fc.assert(fc.property(arbitraryInvalidSpitzen, (spitzen) => {
  // render GameTypeEditor, setze ungültigen Spitzen-Wert, prüfe Button + Fehlermeldung
}), { numRuns: 100 });

// Feature: game-type-editing, Property 6: game_value bleibt unverändert
fc.assert(fc.property(arbitraryRound, arbitraryValidPatch, (round, patch) => {
  // wende UPDATE_ROUND-Reducer an, prüfe game_value
}), { numRuns: 100 });

// Feature: game-type-editing, Property 7: Nur erlaubte Felder werden aktualisiert
fc.assert(fc.property(arbitraryRound, arbitraryValidPatch, (round, patch) => {
  // mocke supabase, rufe updateRound auf, prüfe gesendetes Objekt
}), { numRuns: 100 });

// Feature: game-type-editing, Property 8: Round-Trip Konsistenz
fc.assert(fc.property(arbitraryRound, arbitraryValidPatch, async (round, patch) => {
  // speichere, lade neu, vergleiche game_type und type_label
}), { numRuns: 100 });

// Feature: game-type-editing, Property 9: Fehlerbehandlung bei DB-Fehler
fc.assert(fc.property(arbitraryRound, arbitraryValidPatch, async (round, patch) => {
  // mocke DB-Fehler, prüfe lokaler Zustand unverändert + Fehlermeldung sichtbar
}), { numRuns: 100 });
```
