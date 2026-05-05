# Skatastrophe

Skatastrophe ist eine moderne Web-App für Skat-Runden am echten Kartentisch. Sie ersetzt Stift und Papier durch regelkonforme Punkteberechnung, Cloud-Synchronisierung und detaillierte Spieleranalysen.

---

## Was kann die App?

### 🧮 Punkteberechnung
Alle Spieltypen (Kreuz, Pik, Herz, Karo, Grand, Null, Eingepasst) werden vollständig unterstützt - inklusive Spitzen (Mit/Ohne), Hand, Schneider, Schwarz, Ouvert und Bockrunden. Neben der Standardwertung berechnet die App automatisch das **Seeger-Fabian-Turniersystem** (+50/−50 für den Alleinspieler, +40 für Gegenspieler bei Niederlage).

### 👥 Tischverwaltung
- Sitzordnung mit 3 oder 4 Spielern, automatische Geber-Rotation
- Spieler hinzufügen, umbenennen, umsortieren
- Runden nachträglich bearbeiten oder löschen
- Mehrere Sessions verwalten und wechseln
- **Spiellisten**: Definierte Rundenblöcke (3–36 Runden) mit Fortschrittsanzeige, Sieger-Ermittlung und Abschluss-Funktion
- **Kartensymbole**: Wahl zwischen Französischem Blatt (♣ ♠ ♥ ♦) und Altenburger Blatt (Eichel, Grün, Rot, Schellen) – Einstellung wird persistent gespeichert und gilt app-weit

### 📊 Statistiken
- **Tischstatistik:** Punkteentwicklung über Zeit, Spieltypen-Verteilung, Gewinnrate-Heatmap, Führungswechsel, längste Serien
- **Spielerstatistik:** Gewinnraten, Durchschnittspunkte, Sieges-/Verlustserien, Brot & Baguette-Zähler, Spieltyp-Verteilung
- **Ranking-System:** Kategorie-basierte Ränge (Bronze → Legende) für Farbspiel, Null und Grand

### 🏆 Achievements
Jeder Spieler füllt eine persönliche Erfolgsmatrix - für Angriff (als Alleinspieler) und Abwehr (als Gegenspieler). Neue Kombinationen werden mit einem Konfetti-Popup gefeiert. Ein Level-System (Anfänger → Unsterblicher) motiviert langfristig.

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
| `001_initial_schema.sql` | Tabellen `sessions`, `spiellisten` und `rounds` mit RLS-Policies |
| `002_historical_import.sql` | Optionale Testdaten |
| `003` – `006` | Erweiterungen (Bock-Feld, Mit/Ohne, Ansagen, Tischname) |
| `20260418_spiellisten.sql` | Spiellisten-Tabelle + `spielliste_id` auf `rounds` |

#### Umgebungsvariablen setzen

```bash
cp .env.local.example .env.local
```

Trage deine Supabase-Zugangsdaten in `.env.local` ein (wird via `.gitignore` ignoriert).

### 3. Edge Functions deployen

Die Funktion `delete-account` ermöglicht Nutzern das Löschen ihres Accounts aus der App heraus (DSGVO / Google Play Anforderung).

```bash
npx supabase login
npx supabase functions deploy delete-account
```

> **Wichtig:** Nach dem Deploy im Supabase Dashboard unter **Edge Functions → delete-account → Settings** die Option **"Verify JWT" deaktivieren**. Die Funktion verifiziert das JWT selbst - die doppelte Gateway-Verifikation schlägt wegen eines Algorithmus-Konflikts (ES256) fehl.

### 4. App starten

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

## Google Play Release (TWA)

Die Android-App ist eine TWA (Trusted Web Activity) und wird mit [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) gebaut.

### Neuen Release erstellen

```bash
bubblewrap update   # aktualisiert TWA-Konfiguration + inkrementiert appVersionCode
bubblewrap build    # erzeugt app-release-signed.aab
```

> `bubblewrap build` alleine reicht **nicht** - es baut immer mit der Versionsnummer aus `twa-manifest.json` ohne sie zu erhöhen. Immer zuerst `update` ausführen, sonst lehnt die Play Console die AAB mit "Versionscode wurde bereits verwendet" ab.

Die fertige AAB unter **Play Console → Testen → Geschlossener Test → Neuen Release erstellen** hochladen.

---

## Tech Stack

- **React 19** + Vite 8
- **React Router v7**
- **Recharts** für Charts
- **Supabase** (PostgreSQL + RLS)
- **Vitest** + fast-check für Tests
- **Husky** für automatisches Versions-Bumping bei jedem Commit
