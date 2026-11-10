# CLAUDE.md – Projektregeln für die Wander-App

Diese Datei ist der Einstieg für jede neue Session. Zusammen mit `ROADMAP.md`
(Fortschritt) und `DATENQUELLEN.md` (Lizenzen) beschreibt sie den aktuellen Stand.
**Beide Dateien nach jeder Änderung aktuell halten.**

## Ziel
Eigene, kostenlose Wander-App (PWA) mit Fokus auf Fernwanderwege, zuerst Europa.
Gehostet über GitHub Pages: https://thcjk.github.io/map/

## Regeln
- **Nur Gratis-Dienste** ohne Kreditkarte. Erlaubt ein Dienst eine Funktion nicht:
  nicht tricksen, sondern Alternativen dokumentieren und dem Nutzer vorschlagen.
- **Eigene Marke**: keine Namen, Logos, Texte oder Daten von Komoot übernehmen, nichts scrapen.
  App-Name ist ein Platzhalter (`APP_NAME` in `src/config.ts`, plus `index.html`
  und Manifest in `vite.config.ts`), bis der Nutzer einen Namen gewählt hat.
- **UI-Sprache Deutsch, Schweizer Schreibweise**: immer «ss», nie «ß». Code-Bezeichner Englisch.
- **Mobile-first**, funktioniert auch auf dem Desktop. Touch-Flächen min. 44–48 px.
- **Design «Outdoor-Tech»**: dunkles UI, Akzentfarbe Signal-Orange `#ff7a1a`, Daten
  (km, Hm, Zeit) gross und mit `tabular`-Ziffern, Karte bekommt maximalen Platz.
  Farben als Tailwind-Theme-Tokens in `src/index.css` (`bg`, `surface`, `line`, `text`,
  `muted`, `accent`, `danger`).
- **Attribution**: Jede Quelle steht in `src/data/sources.ts` und `DATENQUELLEN.md`.
  Neue Quelle ⇒ beide Stellen ergänzen, Attribution auf der Karte anzeigen.
- Kleine, saubere Commits. Kein toter Code, keine ungenutzten Pakete.
- Nach jeder Phase: `npm test`, `npm run build`, committen, pushen, ROADMAP abhaken.

## Stack
- Vite + React 19 + TypeScript (strict), Tailwind CSS v4 (`@tailwindcss/vite`)
- MapLibre GL JS (Karte), Dexie (IndexedDB, lokale Daten), react-router (BrowserRouter
  mit `basename = import.meta.env.BASE_URL`)
- vite-plugin-pwa (generateSW, autoUpdate), Vitest (+ fake-indexeddb für DB-Tests)

## Befehle
- `npm run dev` – Entwicklungsserver
- `npm test` – Unit-Tests (Vitest)
- `npm run build` – Typecheck + Produktions-Build
- Build für Pages lokal nachstellen: `BASE_PATH=/map/ npm run build`

## Deployment
- `.github/workflows/deploy.yml` baut bei Push auf `main` oder
  `claude/wander-app-pwa-x1ezcd` und deployt auf GitHub Pages
  (Settings > Pages > Source: «GitHub Actions»).
- `BASE_PATH=/<repo>/` setzt Vites `base`. SPA-Routing: `index.html` wird als
  `404.html` kopiert, damit Neuladen auf Unterseiten funktioniert; der Service Worker
  nutzt zusätzlich `navigateFallback`.

## Architektur
```
src/
  main.tsx, App.tsx      Einstieg, Routen
  config.ts              App-Name (Platzhalter)
  index.css              Tailwind + Design-Tokens
  components/            UI-Bausteine (Layout = Seitengerüst mit unterer Navigation)
  pages/                 Seiten (Karte, Quellen, 404)
  data/sources.ts        Quellen, Lizenzen, Attribution (Single Source of Truth)
  lib/db.ts              Dexie-Datenbank (Tabelle settings)
  lib/useSetting.ts      React-Hook für persistente Einstellungen
  lib/photon.ts          Ortssuche (Photon), mit Cache
  map/MapView.tsx        MapLibre-Karte, Controls, Grundkarte/Overlays synchron halten
  map/MapContext.ts      useMap() für Kinder-Komponenten
  map/layers.ts          Grundkarten + Overlays; syncLayers() ist idempotent
  map/switzerland.ts     Vereinfachte CH-Grenze (swisstopo-Vorschlag)
```

### Karten-Ebenen
- Grundkarten (`BASE_MAPS`): Vektorstil + optionale swisstopo-Rasterebenen (mit `bounds` CH).
- Ebenen mit Präfix `base-` verwaltet `syncLayers` (Relief, swisstopo-Raster, Wanderwege).
- Eigene App-Ebenen (Route, POIs …) bekommen das Präfix `app-` und liegen immer
  darüber. Wer App-Ebenen hinzufügt, muss sie nach `style.load` neu anlegen
  (Stilwechsel löscht alle Ebenen).
- MapLibre 6 braucht `setWorkerUrl` (Worker via `?url`-Import), sonst «Worker failed to load».

## Verwendete Dienste und Nutzungsbedingungen
Details und Links in `DATENQUELLEN.md`. Kurzfassung der Pflichten:
| Dienst | Pflichten |
|---|---|
| OpenFreeMap | Gratis, ohne Key. Attribution «OpenFreeMap © OpenMapTiles Daten von © OpenStreetMap-Mitwirkende». |
| swisstopo (wmts.geo.admin.ch, vectortiles.geo.admin.ch) | OGD, Quellenangabe «© swisstopo». Fair Use: keine Massendownloads, kein Abgrasen ganzer Gebiete. |
| Waymarked Trails | Overlay CC BY-SA 3.0, Attribution Pflicht, moderate Nutzung. |
| Terrain Tiles (AWS) | Frei, Quellenangabe der DEM-Quellen. |
| Photon (photon.komoot.io) | Nur moderate Nutzung, kein Bulk. Debounce, min. 3 Zeichen, Abbruch alter Anfragen. |
| Nominatim | **Nicht für Autocomplete** erlaubt (Usage Policy) – deshalb Photon. |
