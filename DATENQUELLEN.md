# Datenquellen, Lizenzen und Attribution

Massgeblich für den Code ist `src/data/sources.ts` (daraus entstehen die Seite
«Quellen & Lizenzen» und die Attribution auf der Karte). Diese Datei ergänzt die
Nutzungsbedingungen.

| Quelle | Verwendung | Lizenz | Pflicht-Attribution | Bedingungen |
|---|---|---|---|---|
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Basisdaten für Karte, Wege, Routing, Suche, POIs | ODbL 1.0 | «© OpenStreetMap-Mitwirkende» mit Link | Share-Alike für abgeleitete Datenbanken |
| [OpenFreeMap](https://openfreemap.org/) | Vektor-Grundkarte | Frei, Daten ODbL, OpenMapTiles CC-BY | «OpenFreeMap © OpenMapTiles Daten von © OpenStreetMap-Mitwirkende» | Gratis, kein Key, keine Limits genannt; fairer Umgang |
| [swisstopo / geo.admin.ch](https://www.geo.admin.ch/de/allgemeine-nutzungsbedingungen-geoadminch) | Landeskarte, Wanderwege, Vektor, Relief CH | OGD Schweiz | «© swisstopo» | Fair Use; keine systematischen Massendownloads |
| [Waymarked Trails](https://hiking.waymarkedtrails.org/#help-legal) | Overlay markierte Wanderwege | CC BY-SA 3.0 | «© waymarkedtrails.org (CC BY-SA)» | Moderate Nutzung |
| [Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) | Höhenmodell / Relief, Höhen für OSM-Fernwege | Offene DEM-Quellen | «Mapzen Terrain Tiles» mit [Quellenliste](https://github.com/tilezen/joerd/blob/master/docs/attribution.md) | Frei über AWS Open Data |
| [BRouter](https://brouter.de/brouter/) | Routing (Profil hiking-mountain) | Software MIT, Daten ODbL | «Routing: BRouter, Daten © OpenStreetMap-Mitwirkende» | Freiwillig betriebene, kostenlose Instanz ohne SLA: nur pro Teilstück anfragen, Debounce 400 ms, Cache, nacheinander statt parallel |
| [Overpass API](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html) | Fernwege (Relationen), POIs im Korridor | Daten ODbL | «© OpenStreetMap-Mitwirkende» | Richtwert < 10 000 Abfragen und < 1 GB pro Tag und Nutzer; nur auf Nutzeraktion, Ergebnisse in IndexedDB (Wege 30 Tage), POIs abschnittweise nacheinander |
| [Photon](https://photon.komoot.io/) | Ortssuche, Autocomplete | Daten ODbL | «© OpenStreetMap-Mitwirkende» | Öffentliche Instanz nur für moderate Nutzung; Debounce, keine Massenabfragen |

App-Icon: Europa-Umriss aus [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/)
(1:110 Mio., via Paket `world-atlas`), gemeinfrei, keine Attribution nötig. Eigene Gestaltung.

Nicht verwendet: **Nominatim** für Autocomplete – laut
[Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) verboten.

## Offline-Download: was erlaubt ist (Stand November 2026)

| Dienst | Offline-Download | Begründung |
|---|---|---|
| Terrain Tiles (AWS Open Data) | **Ja** | Offene Daten, frei nutzbar; Quellenangabe bleibt Pflicht. |
| OpenFreeMap (Vektorkacheln, Schriften) | **Ja, zurückhaltend** | Die [Terms of Service](https://openfreemap.org/tos/) enthalten keine Regel zu Bulk-/Offline-Nutzung; der Dienst nennt keine Anfrage-Limits. Entscheid des Nutzers (privater Eigengebrauch): nur Korridor um die Route, max. 4000 Kacheln pro Download, 4 parallele Anfragen. Bei breiterer Nutzung beim Betreiber nachfragen oder auf einen eigenen PMTiles-Ausschnitt wechseln. |
| swisstopo (WMTS, Vektortiles) | **Nein** | Die [Nutzungsbedingungen](https://www.geo.admin.ch/en/general-terms-of-use-fsdi) verlangen für Offline-Systeme den Download-Dienst statt der Webdienste; Fair Use gilt. Alternative: offizielle swisstopo-App (Offline-Karten gratis) oder Datenbezug über den Download-Dienst. |
| Waymarked Trails (Overlay) | **Nein** | Keine Erlaubnis für Vorab-Downloads gefunden; freiwillig betriebener Dienst. Alternative: Route/Fernweg ist als Linie ohnehin offline gespeichert. |
| BRouter, Overpass, Photon | entfällt | Abfragedienste; ihre Ergebnisse (Route, Fernwege, POIs) werden lokal gespeichert. |
