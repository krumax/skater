# Implementation Plan: landing-page-routing

## Overview

Verschiebt die React SPA von `/` nach `/app` und platziert die statische Landing Page auf `/`. Die Änderungen erfolgen in dieser Reihenfolge: Konfiguration → Build-Infrastruktur → Content → Strukturmigration → Cleanup.

## Tasks

- [x] 1. Konfigurationsänderungen (vite.config.js, App.jsx, AuthGate.jsx)
  - [x] 1.1 `vite.config.js` anpassen: `base: '/app/'` und `build.outDir: 'dist/app'` setzen
    - `base` und `build.outDir` in `defineConfig` ergänzen, alle anderen Einstellungen unverändert lassen
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 1.2 `src/App.jsx` anpassen: `BrowserRouter` erhält `basename="/app"`
    - Nur das `basename`-Attribut hinzufügen, Route-Definitionen bleiben unverändert
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 1.3 `src/components/AuthGate.jsx` anpassen: `redirectTo` auf `window.location.origin + '/app'` setzen
    - In `handleGoogle` den `redirectTo`-Wert in `signInWithOAuth` aktualisieren
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 2. Checkpoint — Konfiguration prüfen
  - Sicherstellen dass `vite.config.js`, `App.jsx` und `AuthGate.jsx` korrekt geändert sind. Bei Fragen nachfragen.

- [x] 3. Build-Infrastruktur (copy-landing.js, package.json, _redirects)
  - [x] 3.1 `scripts/copy-landing.js` erstellen
    - `copyLanding(srcDir, destDir)` Funktion implementieren, die `fs.cpSync(src, dest, { recursive: true })` nutzt
    - Fehler mit Meldung `'Landing-Page-Quellverzeichnis nicht gefunden: <pfad>'` werfen, wenn `srcDir` nicht existiert (via `fs.existsSync`)
    - Funktion als named export exportieren (`export { copyLanding }`)
    - Script-Einstiegspunkt: wenn direkt ausgeführt (`import.meta.url === pathToFileURL(process.argv[1]).href`), `copyLanding('public/landing', 'dist')` aufrufen
    - _Requirements: 5.1, 5.3, 5.4, 5.5_

  - [ ]* 3.2 Property-Test für `copyLanding` schreiben (`scripts/copy-landing.test.js`)
    - **Property 1: Rekursives Kopieren erhält Verzeichnisstruktur**
    - Beliebige Verzeichnisbäume mit `fast-check` generieren (`fc.array` von Pfad/Inhalt-Paaren mit Unterverzeichnissen)
    - Für jeden generierten Baum: in temporäres `src`-Verzeichnis schreiben, `copyLanding(src, dest)` ausführen, jede Datei in `dest` auf Existenz und Inhalt prüfen
    - Cleanup: temporäre Verzeichnisse nach jedem Run löschen (`fs.rmSync(..., { recursive: true, force: true })`)
    - **Validates: Requirements 5.1, 5.5**

  - [ ]* 3.3 Unit-Tests für Fehlerfall und Überschreiben schreiben (`scripts/copy-landing.test.js`)
    - Test: `copyLanding('/nicht/vorhanden', tmpDest)` wirft Fehler mit Text `'Landing-Page-Quellverzeichnis nicht gefunden'`
    - Test: vorhandene `dest/index.html` wird durch Landing-Page-Inhalt überschrieben
    - _Requirements: 5.3, 5.4_

  - [x] 3.4 `package.json`: `"postbuild": "node scripts/copy-landing.js"` zu `scripts` hinzufügen
    - _Requirements: 5.2_

  - [x] 3.5 `public/_redirects`: Catch-All-Regel ersetzen durch `/app/*  /app/index.html  200`
    - Bestehende `/*  /index.html  200`-Regel entfernen, neue Regel eintragen
    - _Requirements: 1.3, 1.4, 1.5_

- [x] 4. Checkpoint — Build-Infrastruktur prüfen
  - Sicherstellen dass `npm run build` durchläuft, `dist/app/index.html` erzeugt wird und `dist/index.html` die Landing Page enthält. Bei Fragen nachfragen.

- [x] 5. Content-Änderungen (public/landing/index.html)
  - [x] 5.1 `public/landing/index.html`: alle `href="/"` CTA-Links auf `href="/app"` aktualisieren
    - Nav-Link „App starten →", Hero-CTA „Sabbel nich - Teil aus! ↗", finaler CTA „Jetzt kostenlos starten ↗", Footer-Link „App öffnen" — alle vier Stellen ändern
    - Footer-Link `href="/info"` → `href="/app/info"` aktualisieren
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 6. Strukturmigration (landing/ Top-Level-Ordner)
  - [x] 6.1 Neuen Top-Level-Ordner `landing/` anlegen und Dateien von `public/landing/` dorthin verschieben
    - `landing/index.html`, `landing/css/main.css`, `landing/css/carousel.css`, `landing/js/carousel.js` erstellen (Inhalt aus `public/landing/` übernehmen)
    - `public/landing/` Dateien löschen (Ordner `public/landing/` entfernen)
    - _Requirements: 8.1_

  - [x] 6.2 `scripts/copy-landing.js`: Quellverzeichnis von `'public/landing'` auf `'landing'` umstellen
    - Einstiegspunkt-Aufruf auf `copyLanding('landing', 'dist')` ändern
    - _Requirements: 8.2, 8.3_

- [x] 7. Cleanup (netlify.toml löschen)
  - [x] 7.1 `netlify.toml` aus dem Repository löschen
    - Datei entfernen, da Deployment auf Cloudflare Pages erfolgt

- [x] 8. Finaler Checkpoint — Alle Tests bestehen
  - Sicherstellen dass alle Tests bestehen (`npm test`). Bei Fragen nachfragen.

## Notes

- Tasks mit `*` sind optional und können für schnelleres MVP übersprungen werden
- Die Reihenfolge ist wichtig: Konfiguration vor Build-Infrastruktur vor Content vor Migration vor Cleanup
- `copy-landing.js` nutzt ESM (`export`), da `package.json` `"type": "module"` hat
- Property-Test (3.2) und Unit-Tests (3.3) können in dieselbe Datei `scripts/copy-landing.test.js` geschrieben werden
- Vitest läuft mit `environment: 'node'` — Node.js `fs`-Operationen in Tests sind direkt nutzbar
