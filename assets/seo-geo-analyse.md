# SEO & GEO Analyse — Skatastrophe

> Stand: April 2026  
> Erstellt als Grundlage für die Planung einer Landing-Page und Content-Strategie.

---

## Was ist GEO?

**Generative Engine Optimization (GEO)** ist die Praxis, Inhalte so zu strukturieren, dass KI-gestützte Suchsysteme (ChatGPT, Google AI Overviews, Perplexity, Gemini, Copilot) sie als vertrauenswürdige Quelle erkennen, zitieren und in generierten Antworten verwenden. Während klassisches SEO auf Ranking in Linklisten zielt, zielt GEO darauf, *in der Antwort selbst* zu erscheinen.

---

## 1. Technische Indexierbarkeit

### 1.1 Passwortschutz blockiert alles

**Problem:** Der `PasswordGate`-Wrapper schützt die gesamte App. Google sieht ausschließlich den Login-Screen — keinen Inhalt, keine H1, keine Meta-Tags.

**Empfehlung:**
- Eine öffentliche Landing-Page (`/`) ohne Passwortschutz erstellen
- Die eigentliche App unter `/app` oder einem Subdomain (`app.skatastrophe.de`) betreiben
- Alternativ: `/info` (Regelwerk) aus dem Passwortschutz herausnehmen — das ist der einzige Inhalt mit echtem redaktionellem Wert

---

### 1.2 Kein `robots.txt`

**Problem:** Google weiß nicht, was gecrawlt werden soll und was nicht.

**Empfehlung:** `public/robots.txt` erstellen:

```
User-agent: *
Allow: /
Disallow: /app/
Sitemap: https://skatastrophe.de/sitemap.xml
```

---

### 1.3 Kein `sitemap.xml`

**Problem:** Ohne Sitemap findet Google neue Seiten langsamer oder gar nicht.

**Empfehlung:** `public/sitemap.xml` erstellen (statisch, da SPA):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://skatastrophe.de/</loc><priority>1.0</priority></url>
  <url><loc>https://skatastrophe.de/info</loc><priority>0.8</priority></url>
</urlset>
```

---

### 1.4 Statischer `<title>` für alle Routen

**Problem:** `index.html` hat `<title>Skatastrophe</title>` — identisch für alle Seiten. Google sieht `/analytics` und `/history` mit demselben Titel.

**Empfehlung:** React Helmet oder `document.title` per Route setzen:

```jsx
// In jeder Page-Komponente:
useEffect(() => {
  document.title = 'Spielerstatistik — Skatastrophe';
}, []);
```

Oder besser: `react-helmet-async` installieren und pro Seite `<title>` + `<meta name="description">` setzen.

---

### 1.5 Keine Meta-Description

**Problem:** Fehlt komplett. Google generiert dann selbst einen Snippet — meist suboptimal.

**Empfehlung:** Pro Seite eine Meta-Description setzen (150–160 Zeichen):

| Seite | Vorschlag |
|-------|-----------|
| Landing | "Skatastrophe: Die digitale Skat-Zählapp. Regelkonforme Punkteberechnung, Seeger-Fabian, Cloud-Sync und Spielerstatistiken für deinen Spielabend." |
| /info | "Alle Skat-Regeln auf einen Blick: Spieltypen, Punkteberechnung, Seeger-Fabian-System und Reiztabelle — kompakt erklärt." |

---

### 1.6 Keine Open Graph / Social Meta Tags

**Problem:** Beim Teilen in WhatsApp, Twitter, LinkedIn erscheint kein Vorschaubild, kein Titel, keine Beschreibung.

**Empfehlung:** In `index.html` ergänzen:

```html
<meta property="og:title" content="Skatastrophe — Digitale Skat-Zählapp" />
<meta property="og:description" content="Regelkonforme Punkteberechnung, Seeger-Fabian, Cloud-Sync und Spielerstatistiken." />
<meta property="og:image" content="https://skatastrophe.de/og-image.png" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
```

---

### 1.7 SPA-Rendering (JavaScript-abhängig)

**Problem:** Google kann React-Apps crawlen, aber mit Verzögerung (2nd wave indexing). Inhalte die erst nach JS-Ausführung sichtbar sind, werden schlechter indexiert.

**Empfehlung:** Für die Landing-Page statisches HTML verwenden (kein React-Rendering nötig). Die App selbst kann SPA bleiben.

---

## 2. Keyword-Intent

Google rankt keine Keywords, sondern **Suchintentionen**. Für Skatastrophe gibt es drei relevante Intent-Typen:

### Haupt-Intent
> *"Ich spiele regelmäßig Skat und will nicht mehr mit Stift und Papier zählen"*

Das ist ein **Tool-Intent** — jemand sucht ein Werkzeug, kein Wissen. Google rankt dafür Seiten, die das Tool direkt anbieten oder klar beschreiben.

### Nebenintents
1. **Informations-Intent:** *"Wie funktioniert Seeger-Fabian?"* → führt zur App über den Regelwerk-Inhalt
2. **Tool-Intent:** *"Skat Punkterechner online"* → direkter Einstieg
3. **Feature-Intent:** *"Skat Statistiken führen"* → Spieler die ihre Entwicklung tracken wollen

---

### Empfohlene Landing-Page-Struktur

```
H1: Skat digital zählen — regelkonform, ohne Papier
H2: Was Skatastrophe kann
  H3: Alle Spieltypen automatisch berechnet (Grand, Null, Kreuz, Pik, Herz, Karo)
  H3: Seeger-Fabian-Turnierwertung inklusive
  H3: Spielerstatistiken und Achievements
H2: Für wen ist die App?
  H3: Stammtisch-Runden mit 3 oder 4 Spielern
  H3: Turnierspieler mit Seeger-Fabian-Wertung
H2: Jetzt kostenlos starten
```

**Wichtig:** H1 beschreibt das **Problem** (Papier-Zählen ist mühsam), H2 die **Lösung**, H3 die **Details**.

---

### Keyword-Cluster (Vorschläge)

| Cluster | Keywords | Intent |
|---------|----------|--------|
| Tool | "Skat zählen App", "Skat Punkterechner", "Skat online zählen" | Tool |
| Regelwerk | "Seeger-Fabian Berechnung", "Skat Punkteberechnung", "Skat Regeln Grand" | Info |
| Statistik | "Skat Statistiken führen", "Skat Gewinnrate berechnen" | Feature |
| Vergleich | "Skat App kostenlos", "beste Skat App" | Kommerziell |

---

## 3. Interne Verlinkung

### Aktueller Zustand (innerhalb der App)
Die App hat bereits gute interne Verlinkung für eingeloggte Nutzer:
- Sidebar → alle Seiten
- RolesBar → `/players`
- Spielernamen in Sidebar → `/analytics?player=Name`
- Tischname → `/statistiken`

**Problem:** Für Google existiert diese Verlinkung nicht, da sie hinter dem Passwortschutz liegt.

### Empfehlungen für öffentliche Verlinkung

1. **Landing-Page → `/info`** (Regelwerk): "Alle Skat-Regeln erklärt →"
2. **`/info` → Landing-Page**: "Jetzt kostenlos zählen →"
3. **Breadcrumb-Schema** für `/info` damit Google die Seitenstruktur versteht
4. **Anchor-Texte** beschreibend wählen: nicht "hier klicken", sondern "Seeger-Fabian erklärt"

---

## 4. Topical Authority (Content-Cluster)

**Topical Authority** bedeutet: Google vertraut einer Domain als Experte für ein Thema, wenn sie *mehrere zusammenhängende Seiten* zu diesem Thema hat — nicht nur eine einzelne.

### Aktueller Zustand
Keine öffentlichen Inhalte → keine Topical Authority.

### Potenzial-Cluster für "Skat"

```
Skat (Kern-Thema)
├── Regelwerk                    ← /info existiert bereits (hinter Passwort)
├── Punkteberechnung erklärt     ← fehlt (Blogpost / statische Seite)
├── Seeger-Fabian System         ← fehlt (sehr spezifisch, wenig Konkurrenz)
├── Spieltypen im Detail         ← fehlt (Grand, Null, Farbspiele)
├── Strategie & Tipps            ← fehlt
└── Skat-App (Tool)              ← Landing-Page
```

### Empfehlungen

1. **`/info` öffentlich machen** — das ist der wertvollste bestehende Inhalt
2. **Einen Blogpost zu Seeger-Fabian** schreiben — sehr spezifisches Thema, kaum Konkurrenz, hohe Relevanz für die Zielgruppe
3. **FAQ-Sektion** auf der Landing-Page mit strukturierten Daten (`FAQPage` Schema) — das ist ein direkter GEO-Hebel

---

## 5. GEO-spezifische Maßnahmen

GEO zielt darauf, in KI-generierten Antworten (ChatGPT, Perplexity, Google AI Overviews) zitiert zu werden.

### Was KI-Systeme bevorzugen

| Signal | Maßnahme |
|--------|----------|
| **Strukturierte Daten** | JSON-LD Schema für `SoftwareApplication`, `FAQPage` |
| **Zitierbare Fakten** | Konkrete Zahlen: "Unterstützt alle 7 Spieltypen", "Seeger-Fabian nach §X" |
| **Klare Definitionen** | Glossar-Abschnitt: "Was ist Seeger-Fabian?" mit präziser Antwort |
| **Autorität-Signale** | Quellenangaben, Verlinkung auf offizielle Skat-Regelwerke (DSkV) |
| **Antwort-Format** | Inhalte als direkte Antworten formulieren: "Skatastrophe berechnet..." |

### JSON-LD Vorschlag für Landing-Page

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Skatastrophe",
  "applicationCategory": "GameApplication",
  "operatingSystem": "Web",
  "description": "Digitale Skat-Zählapp mit regelkonformer Punkteberechnung, Seeger-Fabian-System und Spielerstatistiken.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "EUR"
  }
}
```

---

## Priorisierte Maßnahmenliste

| Priorität | Maßnahme | Aufwand | Impact |
|-----------|----------|---------|--------|
| 🔴 Kritisch | Landing-Page ohne Passwortschutz | mittel | sehr hoch |
| 🔴 Kritisch | `robots.txt` + `sitemap.xml` | gering | hoch |
| 🟡 Wichtig | Dynamische `<title>` + Meta-Description pro Route | gering | hoch |
| 🟡 Wichtig | Open Graph Tags | gering | mittel |
| 🟡 Wichtig | `/info` aus Passwortschutz herausnehmen | gering | hoch |
| 🟡 Wichtig | JSON-LD `SoftwareApplication` Schema | gering | mittel (GEO) |
| 🟢 Optional | FAQ-Sektion mit `FAQPage` Schema | mittel | mittel (GEO) |
| 🟢 Optional | Blogpost "Seeger-Fabian erklärt" | hoch | hoch (Topical Authority) |
| 🟢 Optional | Verlinkung auf DSkV / offizielle Regelwerke | gering | mittel (GEO) |

---

*Content was rephrased for compliance with licensing restrictions.*
