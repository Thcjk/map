# ROADMAP

Status: `[x]` erledigt, `[ ]` offen. Nach jeder Änderung aktualisieren.

## Phase 0 – Repo aufräumen und Setup
- [x] Alten Stand als Tag `archiv-altes-projekt` sichern (Repo war leer: kein alter Stand vorhanden, kein Tag nötig)
- [x] Altes Projekt löschen (entfällt, Repo war leer)
- [x] Vite + React + TypeScript, Tailwind, MapLibre, vite-plugin-pwa, Dexie, Vitest
- [x] GitHub Action für GitHub Pages (base-Pfad, SPA-Routing über 404.html)
- [x] CLAUDE.md und ROADMAP.md
- [x] DATENQUELLEN.md + Quellen-Seite in der App
- [ ] Nutzer: Settings > Pages > Source auf «GitHub Actions» stellen
- [x] App-Name: Etappa

## Phase 1 – Karte
- [x] Grundkarte OpenFreeMap (eigener Stil)
- [x] swisstopo (Landeskarte, Wanderkarte, Vektor) mit Layer-Umschalter, Vorschlag in der Schweiz
- [x] Overlay Wanderwege (Waymarked Trails), schaltbar
- [x] Relief/Hillshade (Terrain Tiles)
- [x] Massstab, eigener Standort
- [x] Ortssuche mit Autocomplete (Photon, Debounce 350 ms, min. 3 Zeichen, Cache)
- [x] Letzte Ansicht, Grundkarte und Ebenen in IndexedDB gespeichert

## Design-Umbau «Vermessungsblatt» (nach Vorlage des Nutzers)
- [x] Farb- und Schriftsystem umgestellt (Papier, Grünstufen, Tinte, Mono-Labels), kein Orange/Blau
- [x] Eigener Kartenstil auf OpenFreeMap-Daten, grünes Relief, Höhenlinien, Fadenkreuz + Koordinaten
- [x] Icon in Papier/Waldgrün
- [ ] Kartenstil mit echten Vektortiles prüfen (Sandbox erreicht tiles.openfreemap.org nicht; Relief und Höhenlinien sind geprüft)

## Phase 2 – Routenplanung
- [x] Wegpunkte setzen, verschieben, einfügen (Tippen auf Linie), löschen, Rückgängig/Wiederholen (auch Ctrl+Z/Y)
- [x] Routing über BRouter (austauschbares Modul, Debounce, Cache, Luftlinie als Fallback)
- [x] Distanz, Auf-/Abstieg, Wanderzeit (Faustregel Schweizer Wanderwege)
- [ ] Offizielle Polynom-Formel der Schweizer Wanderwege – Koeffizienten aus Primärquelle verifizieren
- [x] Interaktives Höhenprofil (Tippen markiert Punkt auf der Karte)
- [x] Wegbeschaffenheit und SAC-Schwierigkeit aus OSM-Tags
- [x] GPX-Import und -Export
- [x] Touren speichern (IndexedDB), Tourenliste, Entwurf bleibt beim Neuladen erhalten

## Phase 3 – Fernwanderwege
- [x] Suche/Laden von OSM-Routenrelationen (Overpass, gecacht), Höhen aus Terrain Tiles
- [x] Kuratierte Startliste Europa (als Overpass-Suchen, ohne ungeprüfte IDs)
- [ ] Kuratierte Liste mit echten Overpass-Antworten prüfen (aus der Entwicklungs-Sandbox nicht erreichbar)
- [x] Etappenplaner (km / Hm / Gehzeit), verschiebbare Etappenenden (Karte + ±1 km), Etappenübersicht
- [x] POIs im Korridor (500 m / 1 km / 2 km) mit Filter und Abstand, Übernachtungsvorschläge pro Etappe, «An Übernachtung ausrichten»

## Phase 4 – Konto und Cloud (Supabase)
- [x] Magic-Link-Login (Code fertig, aktiv sobald Secrets gesetzt)
- [x] Offline-first-Sync (Touren, Etappenpläne, Sammlungen), Sammlungen-UI
- [x] RLS für alle Tabellen, öffentliches Teilen per Link (`/teilen/:id`)
- [x] SQL-Migrationen im Repo (`supabase/migrations`)
- [x] Geplante Action gegen Pausieren
- [ ] Nutzer: Supabase-Projekt anlegen, Migration ausführen, Secrets eintragen (docs/SUPABASE.md)
- [ ] Mit echtem Projekt testen (Login, Sync zwischen zwei Geräten, Teilen-Link)

## Phase 5 – Unterwegs
- [x] GPS-Aufzeichnung mit Pause/Weiter, Statistik (Zeit, Distanz, Aufstieg), Wake Lock, ehrlicher Hinweis zu gesperrtem Bildschirm/iOS
- [x] Laufende Aufzeichnung wird alle 15 s gesichert und nach Neuladen pausiert wiederhergestellt
- [x] Navigation auf geplanter Route: Rest-Distanz/-Höhenmeter/-Zeit, Warnung (Vibration + Ton, alle 60 s) ab ca. 40 m Abweichung
- [x] Erledigte Touren speichern (Tab «Erledigt»), GPX-Import (mehrere Dateien) und -Export mit Zeitstempeln
- [ ] Auf echtem Gerät im Freien testen (bisher nur mit simuliertem GPS)
- [ ] Erledigte Touren in die Cloud synchronisieren (braucht neue Migration; zusammen mit Phase 7)

## Phase 6 – Offline
- [x] Nutzungsbedingungen geprüft und dokumentiert (DATENQUELLEN.md, Abschnitt Offline)
- [x] Karten-Download für Korridor ±1/2/5 km: Topo-Vektorkacheln + Höhenmodell (Relief, Höhenlinien) + Schriften; Schätzung, Fortschritt, Abbrechen, Speicheranzeige, Löschen
- [x] swisstopo und Wanderwege-Overlay bewusst nicht herunterladbar (nicht erlaubt), Hinweis mit Alternative in der App
- [x] navigator.storage.persist(); Routen, Etappen, Fernwege und POIs liegen in IndexedDB, App-Hülle im Service Worker
- [ ] Mit echten OpenFreeMap-Kacheln prüfen (Sandbox: nur Höhen-Kacheln echt, Vektorkacheln nachgebildet)

## Phase 7 – Sticker und Erinnerungen
- [x] Markierungsfarben dokumentiert (docs/STICKER.md)
- [ ] Mit «zu prüfen» markierte Farben gegen offizielle Quellen prüfen (Historical Way, TMB, Kungsleden, West Highland Way)
- [x] SVG-Sticker für alle 11 kuratierten Fernwege, neutraler Sticker für andere geladene Wege, 5 Meilensteine
- [x] Filter für Fineline-Strich, Aquarell und Die-Cut-Rand
- [x] Freischalten nach Abdeckung (60 m Toleranz, ≥ 90 % = voll), einmalige Animation
- [x] Teilen als Bild (1080 × 1350) mit Name, Datum, km
- [x] Highlights: Foto und Notiz am Fadenkreuz, Marker auf der Karte (lokal)
- [ ] Sticker für einzelne Etappen; Alpinweg weiss-blau-weiss
- [ ] Highlights optional öffentlich teilen und erledigte Touren/Highlights in die Cloud (braucht Supabase-Projekt + Migration mit Storage)

## Phase 8 – Feinschliff
- [x] Performance: Seiten werden einzeln nachgeladen (Karte/MapLibre nur auf der Kartenseite), Höhenprofil zeichnet höchstens einen Punkt pro Pixel, POI-Liste begrenzt, Routing/Overpass gecacht
- [x] Fehlerzustände: Offline-Balken, Karte nicht erreichbar, Routing down (Luftlinie + «Erneut»), Suche/Overpass down, kein GPS / keine Erlaubnis, Absturz-Schutz (ErrorBoundary)
- [x] Barrierefreiheit: Beschriftungen (aria), Tastatur (Escape schliesst Dialoge, Ctrl+Z/Y, Pfeiltasten in der Suche), sichtbarer Fokus, Touch-Flächen ≥ 44 px, reduzierte Bewegung
- [x] Unit-Tests für Routing, Etappen, Wanderzeit, GPX, Sync, Aufzeichnung, Navigation, Offline, Sticker (75 Tests)
- [x] Playwright-Smoke-Test Planen > Speichern > Export (`npm run test:e2e`, läuft auch in der Deploy-Action)
- [ ] Mit Screenreader (VoiceOver/TalkBack) und auf einem echten, älteren Handy mit einer Route über 500 km prüfen
- [ ] Fokus beim Öffnen von Dialogen in den Dialog setzen und dort halten
