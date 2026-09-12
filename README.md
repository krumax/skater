# Skatastrophe

Skatastrophe ist eine deutschsprachige progressive Web-App (PWA) für Skat-Runden am echten Kartentisch. Sie ersetzt Stift und Papier durch regelkonforme Punkteberechnung, Cloud-Synchronisierung, detaillierte Spieleranalysen und ein integriertes Regelwerk.

Die statische Landingpage liegt unter `/`, die React-App wird unter `/app/` ausgeliefert. Die App ist für 3- oder 4-Spieler-Tische ausgelegt und kann als PWA installiert werden.

---

## Was kann die App?

### 🧮 Punkteberechnung
Alle Spieltypen (Kreuz, Pik, Herz, Karo, Grand, Null und Eingepasst) werden vollständig unterstützt – inklusive Spitzen (Mit/Ohne), Hand, Schneider, Schwarz, Ouvert und Bockrunden. Neben der Standardwertung berechnet die App automatisch das **Seeger-Fabian-Turniersystem** (+50/−50 für den Alleinspieler, +40 für Gegenspieler bei Niederlage).

### 🧠 Reizwert-Trainer
Das Regelwerk enthält ein interaktives Lernmodul für die rechnerische Reizwertbestimmung:
- zehn Karten aus einem deutschen 32-Karten-Skatblatt
- freie Auswahl von Farbspiel, Grand oder Null
- Mit/Ohne-, Spitzen- und Reizwertprüfung für die gewählte Spielart
- vereinfachter Trainerumfang: Bei Farbspielen und Grand werden nur 1–4 Spitzen bewertet; die eigentlich korrekte Berechnung höherer Spitzen bleibt bewusst außerhalb des Trainers und wird nicht auf 4 gekappt
- Null mit festem Reizwert 23 und ohne Spitzen
- keine taktische Reizempfehlung und keine Berücksichtigung von Hand, Skat, Schneider, Schwarz, Ouvert, Bock oder Seeger-Fabian
- lokale Aufgaben- und Antwortzustände ohne Lernstatistik oder Persistenz

Der Trainer ist unter `/app/info#reizen-uebung` eingebettet. Die vollständige Reiztabelle bleibt als Nachschlagewerk unterhalb der Übung verfügbar.

### 👥 Tischverwaltung
- Sitzordnung mit 3 oder 4 Spielern und automatische Geber-Rotation
- Spieler hinzufügen, umbenennen und umsortieren
- Runden nachträglich bearbeiten oder löschen
- mehrere Sessions verwalten und wechseln
- **Spiellisten**: definierte Rundenblöcke (3–36 Runden) mit Fortschrittsanzeige, Sieger-Ermittlung und Abschluss-Funktion
- **Spieleridentität**: Spieler-Slots über die Claim-Funktion sitzungsübergreifend beanspruchen
- **Kartensymbole**: Wahl zwischen Französischem Blatt (♣ ♠ ♥ ♦) und Altenburger Blatt (Eichel, Grün, Rot, Schellen) – die Einstellung wird persistent gespeichert und gilt app-weit

### 📊 Statistiken und Profile
- **Tischstatistik:** Punkteentwicklung über Zeit, Spieltypen-Verteilung, Gewinnrate-Heatmap, Führungswechsel, längste Serien
- **Spielerstatistik:** Gewinnraten, Durchschnittspunkte, Sieges-/Verlustserien, Brot & Baguette-Zähler, Spieltyp-Verteilung
- **Ranking-System:** Kategorie-basierte Ränge (Bronze → Legende) für Farbspiel, Null und Grand
- **Mein Profil:** persönliche Spielstatistiken über verknüpfte Sessions hinweg

### 🏆 Achievements und Vitrine
Jeder Spieler füllt eine persönliche Erfolgsmatrix – für Angriff (als Alleinspieler) und Abwehr (als Gegenspieler). Neue Kombinationen werden mit einem Konfetti-Popup gefeiert. Das Level-System (Anfänger → Unsterblicher) und die **Vitrine** stellen Fortschritt und Trophäen sichtbar aus.

### ☁️ Cloud-Sync
Alle Daten werden in Echtzeit über **Supabase** (PostgreSQL mit Row Level Security) synchronisiert. Jedes Gerät am Tisch kann die Session im Browser öffnen und mitverfolgen.

---

### Wichtige Routen

| Route | Inhalt |
|-------|--------|
| `/` | Statische Landingpage |
| `/app/` | Aktuelle Rundenerfassung |
| `/app/analytics` | Spieler- und Tischanalysen |
| `/app/history` | Spielhistorie / Skatliste |
| `/app/statistiken` | Statistik-Charts |
| `/app/players` | Spielerverwaltung |
| `/app/info` | Regelwerk, Reiztabelle und Reizwert-Trainer (`#reizen`, `#reizen-uebung`) |
| `/app/vitrine` | Trophäen- und Achievement-Vitrine |
| `/app/mein-profil` | Persönliches Profil |
| `/app/claim` | Spieleridentität / Slot beanspruchen |

---

## Setup

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Supabase und Auth konfigurieren

Erstelle ein kostenloses Projekt auf [supabase.com](https://supabase.com) und notiere **Project URL** und **anon public key** (*Project Settings → API Keys*).

```bash
cp .env.local.example .env.local
```

Trage danach die folgenden Werte in `.env.local` ein. Die Datei wird durch `.gitignore` nicht versioniert:

```dotenv
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

`VITE_GOOGLE_CLIENT_ID` wird für Google Identity Services verwendet und ist für die übrigen Supabase-Funktionen optional.

#### Datenbank einrichten

Die SQL-Dateien liegen unter [`supabase/migrations/`](./supabase/migrations/).

- **Frische Datenbank:** `001_initial_schema.sql` enthält das konsolidierte Grundschema inklusive der benötigten Tabellen und RLS-Policies.
- **Bestehende Datenbank:** Führe nur die noch fehlenden inkrementellen Migrationen in ihrer fachlichen Reihenfolge aus. Dazu gehören `002_historical_import.sql`, `003_add_bock_field.sql` bis `006_add_table_name.sql`, die Claim-/Identitätsmigrationen `008_player_identity.sql` bis `013_session_players_unique_display_name.sql`, die Spiellisten-/RLS-Erweiterungen `014_spiellisten_rls_claimed_players.sql` und `20260418_spiellisten.sql` sowie `015_persist_round_counters.sql`.
- `002_historical_import.sql` enthält optionale historische Testdaten und sollte nicht automatisch auf einer Produktivdatenbank ausgeführt werden.

Führe Migrationen im SQL Editor des Supabase-Dashboards aus und prüfe vor jeder Migration den aktuellen Stand deiner Datenbank. Die Dateien sind nicht als vollständig automatischer CLI-Migrationsworkflow dokumentiert.

### 3. Edge Functions deployen

Die Funktion `delete-account` ermöglicht Nutzern das Löschen ihres Accounts aus der App heraus (DSGVO / Google-Play-Anforderung).

```bash
npx supabase login
npx supabase functions deploy delete-account
```

> **Wichtig:** Nach dem Deploy im Supabase Dashboard unter **Edge Functions → delete-account → Settings** die Option **„Verify JWT“ deaktivieren**. Die Funktion verifiziert das JWT selbst; die doppelte Gateway-Verifikation schlägt wegen eines Algorithmus-Konflikts (ES256) fehl.

### 4. App starten

```bash
npm run dev
```

Die Entwicklungs-App ist anschließend unter `/app/` erreichbar. Die Landingpage wird separat unter `/` ausgeliefert.

---

## Tests und Qualitätssicherung

```bash
npm test              # einmaliger Vitest-Lauf (vitest --run)
npx vitest run        # einmaliger Lauf, z. B. für CI oder einzelne Dateien
npm run lint          # ESLint 9 über das Repository
```

Für einzelne Tests können konkrete Dateien angegeben werden, zum Beispiel:

```bash
npx vitest run src/lib/reizwertTrainer.test.js
```

Die Tests verwenden Vitest, React Testing Library und fast-check für Property-Based-Tests. Die pure Reizwert-Trainerlogik wird separat von den React-Komponenten getestet.

---

## Build und Web-Deployment

```bash
npm run build
npm run preview
```

`npm run build` erzeugt die React-App in `dist/app/`. Das anschließende `postbuild`-Script kopiert `landing/` nach `dist/landing/`, übernimmt Hosting-Dateien wie `_redirects` und `_headers`, kopiert vorhandene `.well-known`-Dateien und legt `dist/404.html` als SPA-Fallback an. Die fertige Struktur kann anschließend auf einem statischen Hosting wie Cloudflare Pages bereitgestellt werden.

---

## Google Play Release (TWA)

Die Android-App ist eine TWA (Trusted Web Activity) und wird mit [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) gebaut. Die Bubblewrap-Konfiguration ist ein externes Release-Artefakt und liegt nicht als `twa-manifest.json` im Repository.

### Neuen Release erstellen

```bash
bubblewrap update
bubblewrap build
```

> `bubblewrap build` alleine reicht **nicht** – zuerst `update` ausführen, damit der Versionscode erhöht wird. Sonst lehnt die Play Console die AAB mit „Versionscode wurde bereits verwendet“ ab.

Die fertige AAB unter **Play Console → Testen → Geschlossener Test → Neuen Release erstellen** hochladen.

---

## Tech Stack

- **React 19** + **JSX**
- **Vite 8** mit Basis `/app/` und Ausgabe nach `dist/app/`
- **React Router v7**
- **Recharts 3** für Charts
- **Supabase** (PostgreSQL + RLS)
- **vite-plugin-pwa** für installierbare/offline-fähige PWA und Update-Prompt
- **vite-plugin-webfont-dl** für lokal eingebundene Google Fonts
- **Vitest 4** + React Testing Library + fast-check
- **ESLint 9** und **Husky 9**

## Lizenz und Hinweise

Die Landingpage und die React-App sind getrennte Auslieferungseinheiten. Änderungen an `landing/` wirken erst nach einem neuen Build im veröffentlichten Root-Bereich; Änderungen unter `src/` betreffen die App unter `/app/`.
