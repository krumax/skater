# StichOverflow

Eine moderne, minimale React/Vite-Anwendung zum bequemen und fehlerfreien Zählen von Skat-Runden am echten Kartentisch. Die App kümmert sich um die teils komplexe Punkteberechnung, speichert den Verlauf sicher in der Cloud, bietet detaillierte Statistiken und motiviert die Spieler durch visuelle Auszeichnungen (Achievements).

## Wozu setzt man die App ein?
Statt Stift und Papier zu bemühen und am Ende des Abends mühsam Punkte zusammenzurechnen, übernimmt StichOverflow die komplette Verwaltung eines Spieleabends. Sie richtet sich an Skat-Runden, die gerne klassisch oder nach der erweiterten (Seeger-Fabian) Wertung spielen und gleichzeitig detaillierte Statistiken über ihr Spielverhalten (Gewinnrate, Pechsträhnen, gespielte Typen) sammeln möchten.

## 🚀 Kernfunktionen (Features)

### 🧮 Intelligente Punkteberechnung
* **Regelkonform:** Erfassung aller Spieltypen (Kreuz, Pik, Herz, Karo, Grand, Null) inklusive aller gängigen Ansagen und Modifikatoren (Mit/Ohne Spitzen, Hand, Schneider, Schwarz, Ouvert).
* **Seeger-Fabian-System:** Neben der Reizwert- bzw. Standardwertung wird automatisch das erweiterte Turniersystem nach Seeger-Fabian berechnet (+50 für Gewinner, -50 für Verlierer, +40 für Gegenspieler bei Verlust des Alleinspielers).
* **Bockrunden:** Unterstützt doppelte Punktwertung bei entsprechenden Runden.

### 👥 Tischlogik & Management
* **Geben-Hören-Sagen:** Die App berechnet anhand der Sitzordnung automatisch, wer an der Reihe ist zu geben, wer Vorhand (Hören) und wer Mittelhand (Sagen) ist.
* **Dynamische Runden:** Nahtloses Hinzufügen, Umbenennen oder Verschieben von Spielern. Bei 4 Spielern setzt der Geber z. B. automatisch im Hintergrund aus.
* **Spielverlauf editieren:** Nachträgliches Ändern oder Löschen von fehlerhaft eingetragenen Spielen.

### 📊 Statistiken & Analytics
* **Diagramme:** Übersichtliche Auswertung des kumulierten Punktestands über Zeit.
* **Spieler-KPIs:** Analyse von Gewinnraten, Durchschnittspunkten, höchsten Gewinnen, verheerendsten Verlusten sowie Auswertung von Sieges- und Pechsträhnen.
* **"Brot & Baguette"-Zähler:** Ein ironisches Feature für Runden, bei denen Spieler über komplette Geberrunden hinweg komplett passiv bleiben.

### 🏆 Achievements (Erfolge)
* **Erfolgsmatrix:** Wer zum ersten Mal z.B. einen "Grand mit 4" oder einen "Null Ouvert" gewinnt, füllt langsam seine persönliche Skat-Erfolgsmatrix.
* **Live-Celebration:** Das Freischalten von neuen Kombinationen wird mit einem responsiven Trophäen-Popup inklusive Konfetti-Effekt gefeiert.
* **Spieler-Level:** Für mehr Motivation gibt es bei ausreichend freigeschalteten Achievements regelmäßige Level-Ups für die Spieler.

### ☁️ Cloud-Synchronisierung
* Eine Anbindung via Supabase (PostgreSQL) sorgt dafür, dass die gesamte Tisch-Session mitsamt Spielern, Scores und Historie cloudbasiert gesichert wird.
* Jedes verbundene Gerät kann nahtlos (und synchron) im Browser geöffnet werden, um die Runde fortzuführen.

---

## Setup

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Supabase konfigurieren

#### 2.1 Supabase Projekt anlegen

Gehe auf [supabase.com](https://supabase.com), erstelle ein kostenloses Projekt und notiere dir die **Project URL** sowie den **anon public key** (unter *Project Settings → API*).

#### 2.2 Datenbank-Migration ausführen

Öffne den **SQL Editor** im Supabase-Dashboard und führe das folgende Skript aus:

```sql
-- sessions
CREATE TABLE sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seating       jsonb NOT NULL,
  geber_index   integer NOT NULL DEFAULT 0,
  current_round integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- rounds
CREATE TABLE rounds (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  player       text NOT NULL,
  game_type    text NOT NULL,
  type_label   text NOT NULL,
  game_value   integer NOT NULL,
  base_value   integer NOT NULL,
  multiplier   integer NOT NULL,
  won          boolean NOT NULL,
  eye_count    integer NOT NULL DEFAULT 0,
  spitzen      integer NOT NULL DEFAULT 1,
  hand         boolean NOT NULL DEFAULT false,
  schneider    boolean NOT NULL DEFAULT false,
  schwarz      boolean NOT NULL DEFAULT false,
  ouvert       boolean NOT NULL DEFAULT false,
  roles        jsonb,
  seeger_scores jsonb,
  timestamp    timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security — allow anonymous read/write
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon read/write sessions" ON sessions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon read/write rounds" ON rounds FOR ALL TO anon USING (true) WITH CHECK (true);
```

#### 2.3 Historische Daten importieren (Optional)

Möchtest du eine vorhandene Historie laden (z.B. Testdaten), führe das zweite Skript aus:
`supabase/migrations/002_historical_import.sql`

Hiermit wird eine feste Session-ID (`a0000000-0000-0000-0000-000000000001`) angelegt. Um diese in der App zu verbinden, setze in der Entwicklerkonsole des Browsers:
```js
localStorage.setItem('skatSessionId', 'a0000000-0000-0000-0000-000000000001')
```
Anschließend die App neu laden.

#### 2.4 Variablen setzen

Kopiere die Beispiel-Datei:
```bash
cp .env.local.example .env.local
```
und fülle sie mit deinen Supabase-Zugangsdaten. (Diese Datei wird via `.gitignore` ignoriert).

### 3. App starten

```bash
npm run dev
```

---

## Tests

```bash
# Watch-Modus
npm test

# Einmaliger Run
npx vitest run
```
