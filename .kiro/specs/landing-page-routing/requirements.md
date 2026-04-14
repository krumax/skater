# Requirements Document

## Introduction

Skatastrophe ist eine React/Vite SPA, die aktuell auf der Root-URL `/` läuft. Ziel dieses Features ist es, eine statische Landing Page auf `/` zu platzieren und die React-App unter `/app` zu betreiben. Das Routing wird über Cloudflare Pages (`public/_redirects`) gesteuert. Die Landing Page existiert bereits als statisches HTML unter `public/landing/` und muss nach dem Build in das `dist/`-Verzeichnis kopiert werden. Alle internen Links, OAuth-Redirects und der Vite-Build-Pfad müssen auf den neuen `/app`-Basispfad angepasst werden.

## Glossary

- **Landing_Page**: Die statische HTML-Seite unter `public/landing/index.html`, die auf der Root-URL `/` ausgeliefert wird.
- **React_App**: Die Vite/React SPA, die nach der Migration unter dem Pfad `/app` und allen Unterpfaden `/app/*` erreichbar ist.
- **Cloudflare_Pages**: Der Hosting-Dienst, der das `dist/`-Verzeichnis ausliefert und Routing-Regeln aus `public/_redirects` liest.
- **Build_Script**: Das Node.js-Postbuild-Script `scripts/copy-landing.js`, das Landing-Page-Dateien nach dem Vite-Build in `dist/` kopiert.
- **AuthGate**: Die React-Komponente `src/components/AuthGate.jsx`, die den Login-Screen rendert und OAuth-Redirects steuert.
- **BrowserRouter**: Die React-Router-Komponente in `src/App.jsx`, die das clientseitige Routing der React_App verwaltet.
- **Vite_Config**: Die Datei `vite.config.js`, die den Build-Basispfad der React_App definiert.
- **Redirects_File**: Die Datei `public/_redirects`, die Cloudflare_Pages-Routing-Regeln enthält.

---

## Requirements

### Requirement 1: URL-Routing — Landing Page auf Root, React App unter /app

**User Story:** Als Besucher von skatastrophe.de möchte ich auf der Root-URL `/` die Landing Page sehen und die React-App unter `/app` aufrufen können, damit ich einen klaren Einstiegspunkt zur App habe.

#### Acceptance Criteria

1. WHEN eine HTTP-Anfrage an `https://skatastrophe.de/` eingeht, THEN THE Cloudflare_Pages SHALL die `dist/index.html` der Landing_Page ausliefern.
2. WHEN eine HTTP-Anfrage an `https://skatastrophe.de/app` eingeht, THEN THE Cloudflare_Pages SHALL die `dist/app/index.html` der React_App ausliefern.
3. WHEN eine HTTP-Anfrage an einen Pfad unter `https://skatastrophe.de/app/*` eingeht, THEN THE Cloudflare_Pages SHALL die `dist/app/index.html` der React_App als SPA-Fallback ausliefern.
4. THE Redirects_File SHALL eine Regel enthalten, die alle Anfragen unter `/app/*` auf `/app/index.html` mit HTTP-Status 200 weiterleitet.
5. THE Redirects_File SHALL keine Regel enthalten, die Anfragen an `/` auf die React_App weiterleitet.

---

### Requirement 2: Vite Build-Basispfad

**User Story:** Als Entwickler möchte ich, dass der Vite-Build alle Assets der React_App unter dem Pfad `/app/` bündelt, damit die App korrekt unter `/app` geladen wird.

#### Acceptance Criteria

1. THE Vite_Config SHALL den Wert `base` auf `'/app/'` setzen.
2. WHEN `npm run build` ausgeführt wird, THEN THE Vite_Config SHALL alle generierten Asset-Pfade der React_App relativ zu `/app/` ausgeben.
3. WHEN `npm run build` ausgeführt wird, THEN THE Vite_Config SHALL die React_App-Ausgabe in das Verzeichnis `dist/app/` schreiben.

---

### Requirement 3: React Router Basispfad

**User Story:** Als Entwickler möchte ich, dass der BrowserRouter den Basispfad `/app` kennt, damit interne Navigation innerhalb der React_App korrekt funktioniert.

#### Acceptance Criteria

1. THE BrowserRouter SHALL das Attribut `basename` mit dem Wert `"/app"` gesetzt haben.
2. WHEN ein Nutzer innerhalb der React_App zu einer internen Route navigiert (z. B. `/analytics`, `/history`), THEN THE BrowserRouter SHALL die URL als `/app/analytics` bzw. `/app/history` im Browser darstellen.
3. WHEN ein Nutzer die URL `/app/history` direkt im Browser aufruft, THEN THE React_App SHALL die korrekte Route rendern, ohne einen 404-Fehler zu erzeugen.

---

### Requirement 4: OAuth-Redirect nach /app

**User Story:** Als eingeloggter Nutzer möchte ich nach einer Google-OAuth-Authentifizierung auf die React_App unter `/app` weitergeleitet werden, damit ich direkt mit der App interagieren kann.

#### Acceptance Criteria

1. WHEN ein Nutzer die Google-OAuth-Anmeldung in AuthGate initiiert, THEN THE AuthGate SHALL den `redirectTo`-Parameter auf `window.location.origin + '/app'` setzen.
2. WHEN die OAuth-Authentifizierung erfolgreich abgeschlossen ist, THEN THE AuthGate SHALL den Nutzer auf den Pfad `/app` weiterleiten.
3. IF der `redirectTo`-Parameter auf `window.location.origin` (ohne `/app`) gesetzt ist, THEN THE AuthGate SHALL den Nutzer auf die Landing_Page statt auf die React_App weiterleiten — dieser Zustand ist unerwünscht und muss verhindert werden.

---

### Requirement 5: Post-Build-Script — Landing Page in dist/ kopieren

**User Story:** Als Entwickler möchte ich, dass die Landing-Page-Dateien nach jedem Build automatisch in das `dist/`-Verzeichnis kopiert werden, damit Cloudflare_Pages die Landing_Page auf `/` ausliefern kann.

#### Acceptance Criteria

1. THE Build_Script SHALL alle Dateien aus `public/landing/` rekursiv in das Verzeichnis `dist/` kopieren.
2. WHEN `npm run build` ausgeführt wird, THEN THE Build_Script SHALL automatisch nach dem Vite-Build ausgeführt werden (via `postbuild`-Script in `package.json`).
3. WHEN das Build_Script ausgeführt wird, THEN THE Build_Script SHALL die Datei `dist/index.html` mit dem Inhalt der Landing_Page überschreiben.
4. IF das Verzeichnis `public/landing/` nicht existiert, THEN THE Build_Script SHALL mit einer verständlichen Fehlermeldung abbrechen.
5. WHEN das Build_Script ausgeführt wird, THEN THE Build_Script SHALL Unterverzeichnisse (z. B. `css/`, `js/`) aus `public/landing/` erhalten und in `dist/` spiegeln.

---

### Requirement 6: Landing Page CTA-Links auf /app aktualisieren

**User Story:** Als Besucher der Landing Page möchte ich über CTA-Buttons direkt zur React_App unter `/app` gelangen, damit ich die App ohne Umwege starten kann.

#### Acceptance Criteria

1. THE Landing_Page SHALL alle CTA-Links, die bisher auf `href="/"` zeigen, auf `href="/app"` aktualisiert haben.
2. THE Landing_Page SHALL den Navigations-Link „App starten →" mit `href="/app"` verlinken.
3. THE Landing_Page SHALL den Hero-CTA-Button „Sabbel nich - Teil aus! ↗" mit `href="/app"` verlinken.
4. THE Landing_Page SHALL den finalen CTA-Button „Jetzt kostenlos starten ↗" mit `href="/app"` verlinken.
5. THE Landing_Page SHALL den Footer-Link „App öffnen" mit `href="/app"` verlinken.
6. WHEN ein Nutzer auf einen CTA-Link klickt, THEN THE Landing_Page SHALL den Nutzer auf `https://skatastrophe.de/app` weiterleiten.

---

### Requirement 8: Landing Page als eigenständiger Ordner

**User Story:** Als Entwickler möchte ich die Landing-Page-Quelldateien in einem dedizierten Top-Level-Ordner `landing/` außerhalb von `src/` und `public/` ablegen, damit eine klare Trennung zwischen statischen Landing-Page-Assets und der React_App besteht.

#### Acceptance Criteria

1. THE Repository SHALL einen Ordner `landing/` im Root-Verzeichnis enthalten, der die Landing-Page-Quelldateien (`index.html`, `css/`, `js/`) enthält.
2. THE Build_Script SHALL Dateien aus `landing/` (nicht aus `public/landing/`) in `dist/` kopieren, sobald die Migration abgeschlossen ist.
3. WHILE die Migration läuft, THE Build_Script SHALL Dateien aus `public/landing/` lesen, bis der Ordner `landing/` angelegt ist.
