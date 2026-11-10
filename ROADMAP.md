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
- [ ] Nutzer: App-Namen wählen

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
- [ ] GPS-Aufzeichnung mit Pause/Weiter, Statistik, Wake Lock, ehrlicher iOS-Hinweis
- [ ] Navigation auf geplanter Route mit Abweichungswarnung
- [ ] Erledigte Touren speichern, GPX-Import

## Phase 6 – Offline
- [ ] Nutzungsbedingungen prüfen und dokumentieren
- [ ] Karten-Download für Korridor (wo erlaubt), Speicheranzeige, Löschen
- [ ] navigator.storage.persist(), Routen und POIs offline

## Phase 7 – Sticker und Erinnerungen
- [ ] Markierungsfarben recherchieren und dokumentieren
- [ ] SVG-Sticker je Fernweg + Meilensteine
- [ ] Freischalten nach Abdeckung (≥ 90 %), Animation
- [ ] Teilen als Bild
- [ ] Highlights (Fotos/Notizen)

## Phase 8 – Feinschliff
- [ ] Performance, Barrierefreiheit, Fehlerzustände
- [ ] Unit-Tests Routing/Etappen/Zeit, Playwright-Smoke-Test
