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
- [ ] Grundkarte OpenFreeMap
- [ ] swisstopo (Landeskarte, Wanderkarte, Vektor) mit Layer-Umschalter, Vorschlag in der Schweiz
- [ ] Overlay Wanderwege (Waymarked Trails), schaltbar
- [ ] Relief/Hillshade
- [ ] Massstab, eigener Standort
- [ ] Ortssuche mit Autocomplete (Photon)

## Phase 2 – Routenplanung
- [ ] Wegpunkte setzen, verschieben, löschen, Rückgängig/Wiederholen
- [ ] Routing über BRouter (austauschbares Modul, Debounce, Cache)
- [ ] Distanz, Auf-/Abstieg, Wanderzeit (Schweizer Formel)
- [ ] Interaktives Höhenprofil
- [ ] Wegbeschaffenheit und SAC-Schwierigkeit
- [ ] GPX-Import und -Export

## Phase 3 – Fernwanderwege
- [ ] Suche/Laden von OSM-Routenrelationen (Overpass, gecacht)
- [ ] Kuratierte Startliste Europa
- [ ] Etappenplaner (km / Hm / Gehzeit), verschiebbare Etappenenden, Etappenübersicht
- [ ] POIs im Korridor mit Filter und Abstand, Übernachtungsvorschläge pro Etappe

## Phase 4 – Konto und Cloud (Supabase)
- [ ] Magic-Link-Login
- [ ] Offline-first-Sync (Touren, Etappenpläne, Sammlungen)
- [ ] RLS für alle Tabellen, öffentliches Teilen per Link
- [ ] SQL-Migrationen im Repo
- [ ] Geplante Action gegen Pausieren

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
