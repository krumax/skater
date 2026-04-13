# Skatastrophe

Skatastrophe ist eine moderne Web-App für Skat-Runden am echten Kartentisch. Sie ersetzt Stift und Papier durch regelkonforme Punkteberechnung, Cloud-Synchronisierung und detaillierte Spieleranalysen.

---

## Was kann die App?

### 🧮 Punkteberechnung
Alle Spieltypen (Kreuz, Pik, Herz, Karo, Grand, Null, Eingepasst) werden vollständig unterstützt — inklusive Spitzen (Mit/Ohne), Hand, Schneider, Schwarz, Ouvert und Bockrunden. Neben der Standardwertung berechnet die App automatisch das **Seeger-Fabian-Turniersystem** (+50/−50 für den Alleinspieler, +40 für Gegenspieler bei Niederlage).

### 👥 Tischverwaltung
- Sitzordnung mit 3 oder 4 Spielern, automatische Geber-Rotation
- Spieler hinzufügen, umbenennen, umsortieren
- Runden nachträglich bearbeiten oder löschen
- Mehrere Sessions verwalten und wechseln

### 📊 Statistiken
- **Tischstatistik:** Punkteentwicklung über Zeit, Spieltypen-Verteilung, Gewinnrate-Heatmap, Führungswechsel, längste Serien
- **Spielerstatistik:** Gewinnraten, Durchschnittspunkte, Sieges-/Verlustserien, Brot & Baguette-Zähler, Spieltyp-Verteilung
- **Ranking-System:** Kategorie-basierte Ränge (Bronze → Legende) für Farbspiel, Null und Grand

### 🏆 Achievements
Jeder Spieler füllt eine persönliche Erfolgsmatrix — für Angriff (als Alleinspieler) und Abwehr (als Gegenspieler). Neue Kombinationen werden mit einem Konfetti-Popup gefeiert. Ein Level-System (Anfänger → Unsterblicher) motiviert langfristig.

### ☁️ Cloud-Sync
Alle Daten werden in Echtzeit über **Supabase** (PostgreSQL) synchronisiert. Jedes Gerät am Tisch kann die Session im Browser öffnen und mitverfolgen.

---

## Setup

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Supabase konfigurieren

Erstelle ein kostenloses Projekt auf [supabase.com](https://supabase.com) und notiere **Project URL** und **anon public key** (*Project Settings → API*).

#### Datenbank einrichten

Die SQL-Migrationsdateien liegen unter [`supabase/migrations/`](./supabase/migrations/). Führe sie der Reihe nach im **SQL Editor** des Supabase-Dashboards aus:

| Datei | Inhalt |
|-------|--------|
| `001_initial_schema.sql` | Tabellen `sessions` und `rounds` mit RLS-Policies |
| `002_historical_import.sql` | Optionale Testdaten |
| `003` – `006` | Erweiterungen (Bock-Feld, Mit/Ohne, Ansagen, Tischname) |

#### Umgebungsvariablen setzen

```bash
cp .env.local.example .env.local
```

Trage deine Supabase-Zugangsdaten in `.env.local` ein (wird via `.gitignore` ignoriert).

### 3. App starten

```bash
npm run dev
```

---

## Tests

```bash
npx vitest run        # einmaliger Run
npm test              # Watch-Modus
```

---

## Tech Stack

- **React 19** + Vite 8
- **React Router v7**
- **Recharts** für Charts
- **Supabase** (PostgreSQL + RLS)
- **Vitest** + fast-check für Tests
- **Husky** für automatisches Versions-Bumping bei jedem Commit
