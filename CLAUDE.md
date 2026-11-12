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
  App-Name: **Etappa** (`APP_NAME` in `src/config.ts`, `index.html`, Manifest in
  `vite.config.ts`). Die IndexedDB heisst weiterhin `wanderapp` (nicht umbenennen, sonst
  gehen lokale Daten verloren).
- **UI-Sprache Deutsch, Schweizer Schreibweise**: immer «ss», nie «ß». Code-Bezeichner Englisch.
- **Mobile-first**, funktioniert auch auf dem Desktop. Touch-Flächen min. 44–48 px.
- **Design «Vermessungsblatt»** (verbindliche Vorlage des Nutzers: ein Topo-Kartenblatt in
  Papier-Creme und Grünstufen). Regeln:
  - Papiergrund `#e9e8da`, Flächen `#f3f2e7`, Tinte `#17241a`, Grünstufen `green-1…6`,
    Akzent = Waldgrün `#2c4a31`. **Kein Orange, kein Blau.** Gewässer entsättigtes Graugrün.
  - Rot (`mark` `#b3261e`) nur als feine Markierung: Route, Fadenkreuz, Fokus, Warnung.
  - Schrift: Archivo (breit, h1 klein geschrieben) für Titel/Text, IBM Plex Mono für
    Zahlen (`.tabular`) und Beschriftungen (`.label`: Versalien, gesperrt).
  - Feine 1-px-Linien in Tinte, kaum Rundungen (Radius-Tokens 2–6 px), keine Schlagschatten.
  - Tokens in `src/index.css`, dieselben Farben für Karte/SVG in `src/theme.ts`.
  - Keine Namen, Logos oder Slogans aus der Vorlage übernehmen, nur die Stilrichtung.
  - Karte: eigener Stil `src/map/topoStyle.ts` auf OpenFreeMap-Vektordaten, Relief grün
    eingefärbt, Höhenlinien aus `maplibre-contour` (`src/map/dem.ts`).
- **Attribution**: Jede Quelle steht in `src/data/sources.ts` und `DATENQUELLEN.md`.
  Neue Quelle ⇒ beide Stellen ergänzen, Attribution auf der Karte anzeigen.
- Kleine, saubere Commits. Kein toter Code, keine ungenutzten Pakete.
- Nach jeder Phase: `npm test`, `npm run build`, committen, pushen, ROADMAP abhaken.

## Stack
- Vite + React 19 + TypeScript (strict), Tailwind CSS v4 (`@tailwindcss/vite`)
- MapLibre GL JS (Karte), Dexie (IndexedDB, lokale Daten), react-router (BrowserRouter
  mit `basename = import.meta.env.BASE_URL`)
- vite-plugin-pwa (generateSW, autoUpdate), Vitest (+ fake-indexeddb für DB-Tests),
  Playwright für den Smoke-Test
- Seiten sind `lazy` (src/App.tsx); `ErrorBoundary` und Offline-Balken im Seitengerüst

## Befehle
- `npm run dev` – Entwicklungsserver
- `npm test` – Unit-Tests (Vitest)
- `npm run build` – Typecheck + Produktions-Build
- `npm run test:e2e` – Playwright-Smoke-Test (`e2e/`, baut selbst; Dienste sind nachgebildet)
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
  main.tsx, App.tsx      Einstieg, Routen (Seiten lazy)
  components/Layout.tsx  Gerüst: Karte (MapScreen) bleibt IMMER geladen; Seiten legen sich darüber.
                         Untere Navigation: Karte · Fernwege · Touren · Mehr. Fokus-Modus blendet sie aus.
  components/            Dialog, Sheet (aufziehbares Panel), PageFrame (Blatt-Rahmen), icons, ShellContext
  data/sources.ts        Quellen, Lizenzen, Attribution (Single Source of Truth)
  data/trailCatalog.json Fernweg-Katalog (von scripts/build-trail-catalog.mjs, Action trail-catalog.yml)
  theme.ts               Farben für Karte/SVG
  map/MapScreen.tsx      Karte + Planner
  map/MapView.tsx        MapLibre-Karte, Controls (Ebenen-Knopf als eigenes Control), Grundkarte/Overlays
  map/topoStyle.ts       Eigener Kartenstil + gezeichnete Kartenzeichen (Gipfel, Hütten, Wasser …)
  map/layers.ts          Grundkarten + Overlays (Relief multidirektional grün, Höhenlinien); syncLayers()
  map/dem.ts             Höhenlinien (maplibre-contour), gemeinsame DEM-Quelle
  map/SearchBox, LayerSwitcher, CoordinateReadout, SwissSuggestion, Highlights (Notiz/Foto am Ort)
  planner/usePlan.ts     Zustand + Aktionen der Planung (Wegpunkte, Route, Etappen, POIs, Speichern, GPX)
  planner/Planner.tsx    Bedienung der Karte, 4 Zustände: frei · Planen · Route · Aufzeichnen
  planner/PlanPanels     StartActions, PointCard (Punkt antippen/Suchtreffer), PlanningBar
  planner/RouteSheet     Fertige Route: Kennzahlen, Starten/Speichern; aufziehbar: Profil/Etappen/Unterwegs/Offline
  planner/…              plannerState (Undo/Redo), useRoute, RouteLayer, ElevationProfile, RouteStats,
                         stages, StagesPanel, PoiPanel, ExtrasLayer
  routing/               Provider-Schnittstelle, BRouter, Cache, Route + Kennzahlen, OSM-Tags → Belag/SAC
  trails/                Overpass, Suche, Relation zusammensetzen, Laden + Höhen + Cache, POIs im Korridor
  track/                 Aufzeichnung (Reducer, useTracker, Wake Lock), Navigation, Tracker-Leiste
  offline/               Korridor-Kacheln, Download/Löschen, Protokoll etappa-omt://, OfflinePanel
  cloud/                 Supabase (optional), Abgleich
  lib/                   db (Dexie), geo, elevation, hikingTime, format, gpx, tours, activities, …
  pages/                 TrailsPage (Katalog mit Fotos), ToursPage (+ActivitiesList), MorePage (Konto,
                         Offline-Karten, Quellen), SourcesPage, SharedTourPage, NotFoundPage
scripts/build-trail-catalog.mjs   OSM + Wikidata + Commons + Wikipedia → trailCatalog.json
public/fonts/          Kartenschrift IBM Plex Mono als MapLibre-Glyphen (erzeugt mit fontnik)
```

### Zahlen müssen stimmen (Grundsatz)
- Auf-/Abstieg heissen **«Bergauf/Bergab»** und werden in **Hm** angezeigt (Summe aller Anstiege),
  nie als «m» – sonst liest man 9'844 m als Gipfelhöhe. Höhen über Meer: «m» / «m ü. M.».
- Höhenmeter mit Hysterese **10 m** (`ELEVATION_THRESHOLD_M`), GPS-Spuren 15 m; auf 10 Hm gerundet.
- Gehzeit = reine Gehzeit ohne Pausen; ab 24 h nur ganze Stunden, mit Hinweis auf Tage.
- Katalogdaten nur aus Quellen (OSM/Wikidata/Wikipedia), nie geraten; Quelle wird angezeigt.
- Fehlt eine Angabe (z. B. SAC), sagen wir das, statt «leicht» anzunehmen.

### Datenbank (Dexie, `wanderapp`)
v1 settings · v2 tours (inkl. Geometrie + Etappenplan) · v3 trails, pois (Cache) ·
v4 Index `dirty` auf tours, Tabelle collections · v5 activities · v6 offlineRegions · v7 highlights.
(Die Spalte `catalogId` in trails existiert nicht mehr; ältere Einträge stören nicht.)
Neue Felder nur additiv; neue Tabellen über eine neue `db.version(n)`.

### Konto und Cloud (Supabase, optional)
- `src/cloud/client.ts`: Client nur, wenn `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
  gesetzt sind (GitHub-Secrets, im Deploy-Workflow als Env). Lazy geladen.
  **Niemals den service_role-Key ins Frontend.**
- Offline-first: Alles wird zuerst in IndexedDB gespeichert (`dirty: 1`). Löschen = Markierung
  `deleted` bis zum Abgleich. `syncAll` (src/cloud/sync.ts): erst holen (Cursor
  `server_updated_at`), zusammenführen nach «letzte Änderung gewinnt» (`client_updated_at`),
  dann `dirty` hochladen. Auslöser: Login, Start, Änderung (3 s Debounce), online, alle 5 min.
- Migrationen: `supabase/migrations/*.sql`, RLS auf allen Tabellen. Öffentliche Touren nur per
  `rpc/get_public_tour(id)` (kein Auflisten möglich). Einrichtung: `docs/SUPABASE.md`.
- Keep-alive: `.github/workflows/supabase-keepalive.yml` (alle 3 Tage `rpc/keepalive`).

### Offline
- Vektorkacheln laufen immer über das Protokoll `etappa-omt://{z}/{x}/{y}`: Schlüssel z/x/y im
  Cache `offline-omt`, weil die echte OpenFreeMap-URL eine wöchentlich wechselnde Version trägt.
- Höhen-Kacheln (`dem-tiles`), Kartenschriften (`map-fonts`, eigene Dateien) und Katalogfotos
  (`trail-photos`) cached der Service Worker (CacheFirst, `vite.config.ts`).
- Was heruntergeladen werden darf, steht in `DATENQUELLEN.md`. **swisstopo und Waymarked Trails
  nie vorab herunterladen.**

### Wanderzeit
Aktuell die Leistungskilometer-Faustformel (4 km/h, +15 min/100 Hm bergauf,
+15 min/200 Hm bergab), segmentweise auf geglätteten Höhen. Die offizielle
Polynom-Formel ist vorbereitet (`segmentMinutes` austauschen), aber deren Koeffizienten
müssen zuerst aus einer Primärquelle (Schweizer Wanderwege / swisstopo) verifiziert werden.

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
| OpenFreeMap | Gratis, ohne Key. Wir nutzen Vektortiles + Schriften mit eigenem Stil. Attribution «OpenFreeMap © OpenMapTiles Daten von © OpenStreetMap-Mitwirkende». |
| swisstopo (wmts.geo.admin.ch, vectortiles.geo.admin.ch) | OGD, Quellenangabe «© swisstopo». Fair Use: keine Massendownloads, kein Abgrasen ganzer Gebiete. |
| Waymarked Trails | Overlay CC BY-SA 3.0, Attribution Pflicht, moderate Nutzung. |
| Terrain Tiles (AWS) | Frei, Quellenangabe der DEM-Quellen. |
| BRouter (brouter.de) | Kostenlos, ohne Garantie. Pro Teilstück anfragen, debounced, gecacht, sequenziell. |
| Overpass API | Nur auf Nutzeraktion, gecacht (IndexedDB), sequenziell, Timeout gesetzt, Ausweich-Instanz bei 429/504. |
| Supabase (Free Tier) | 500 MB DB, Auth-Mails stark limitiert, Pausieren nach 7 Tagen Inaktivität (Keep-alive-Action). |
| Photon (photon.komoot.io) | Nur moderate Nutzung, kein Bulk. Debounce, min. 3 Zeichen, Abbruch alter Anfragen. |
| Nominatim | **Nicht für Autocomplete** erlaubt (Usage Policy) – deshalb Photon. |
