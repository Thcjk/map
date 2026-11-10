/**
 * Alle Karten- und Datenquellen der App mit Lizenz und Pflicht-Attribution.
 * Diese Liste ist die einzige Quelle der Wahrheit: Die Seite «Quellen & Lizenzen»
 * und die Karten-Attribution werden daraus erzeugt. Siehe auch DATENQUELLEN.md.
 */
export interface DataSource {
  id: string
  name: string
  usage: string
  license: string
  licenseUrl: string
  /** Attribution als HTML, so wie sie auf der Karte erscheint. */
  attribution: string
  url: string
}

export const OSM_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap-Mitwirkende</a>'

export const SOURCES: DataSource[] = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    usage: 'Grundlage für Karte, Wanderwege, Routing, Ortssuche und POIs',
    license: 'Open Database License (ODbL) 1.0',
    licenseUrl: 'https://www.openstreetmap.org/copyright',
    attribution: OSM_ATTRIBUTION,
    url: 'https://www.openstreetmap.org',
  },
  {
    id: 'openfreemap',
    name: 'OpenFreeMap',
    usage: 'Vektor-Grundkarte (weltweit)',
    license: 'Kartenstil und Tiles frei nutzbar; Daten ODbL, Schema OpenMapTiles (CC-BY 4.0)',
    licenseUrl: 'https://openfreemap.org/',
    attribution:
      '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> Daten von ' +
      OSM_ATTRIBUTION,
    url: 'https://openfreemap.org',
  },
  {
    id: 'swisstopo',
    name: 'swisstopo (Bundesamt für Landestopografie)',
    usage: 'Landeskarte, Wanderwege, Vektorkarte und Relief in der Schweiz',
    license: 'Open Government Data (OGD) der Schweiz, freie Nutzung mit Quellenangabe; Fair-Use bei den Geodiensten',
    licenseUrl: 'https://www.geo.admin.ch/de/allgemeine-nutzungsbedingungen-geoadminch',
    attribution: '<a href="https://www.swisstopo.admin.ch/" target="_blank" rel="noopener">© swisstopo</a>',
    url: 'https://www.swisstopo.admin.ch',
  },
  {
    id: 'waymarkedtrails',
    name: 'Waymarked Trails',
    usage: 'Overlay der markierten Wanderwege',
    license: 'CC BY-SA 3.0 (Overlay), Daten ODbL',
    licenseUrl: 'https://hiking.waymarkedtrails.org/#help-legal',
    attribution:
      'Wanderwege: <a href="https://hiking.waymarkedtrails.org" target="_blank" rel="noopener">© waymarkedtrails.org</a> (CC BY-SA)',
    url: 'https://hiking.waymarkedtrails.org',
  },
  {
    id: 'terrarium',
    name: 'Terrain Tiles (AWS Open Data / Mapzen)',
    usage: 'Höhenmodell für Relief ausserhalb der Schweiz',
    license: 'Diverse offene Quellen (u. a. SRTM, EU-DEM, GMTED), Quellenangabe Pflicht',
    licenseUrl: 'https://github.com/tilezen/joerd/blob/master/docs/attribution.md',
    attribution:
      'Relief: <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener">Mapzen Terrain Tiles</a>',
    url: 'https://registry.opendata.aws/terrain-tiles/',
  },
  {
    id: 'photon',
    name: 'Photon (öffentliche Instanz)',
    usage: 'Ortssuche mit Autovervollständigung',
    license: 'Daten ODbL; öffentliche API nur für moderate Nutzung (Fair Use)',
    licenseUrl: 'https://photon.komoot.io/',
    attribution: 'Suche: Photon, Daten ' + OSM_ATTRIBUTION,
    url: 'https://github.com/komoot/photon',
  },
]
