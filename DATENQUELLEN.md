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
| [Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) | Höhenmodell / Relief | Offene DEM-Quellen | «Mapzen Terrain Tiles» mit [Quellenliste](https://github.com/tilezen/joerd/blob/master/docs/attribution.md) | Frei über AWS Open Data |
| [Photon](https://photon.komoot.io/) | Ortssuche, Autocomplete | Daten ODbL | «© OpenStreetMap-Mitwirkende» | Öffentliche Instanz nur für moderate Nutzung; Debounce, keine Massenabfragen |

Nicht verwendet: **Nominatim** für Autocomplete – laut
[Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) verboten.
