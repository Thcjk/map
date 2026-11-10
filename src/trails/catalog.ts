/**
 * Kuratierte Startliste bekannter Fernwanderwege in Europa.
 * Bewusst ohne fest eingetragene OSM-IDs: Jeder Eintrag beschreibt eine Overpass-Suche
 * (Name/Ref im Gebiet). So bleiben die Daten aktuell und nichts ist ungeprüft übernommen.
 */
export interface CatalogTrail {
  id: string
  name: string
  region: string
  description: string
  /** Regex auf die OSM-Tags name bzw. ref (Gross-/Kleinschreibung egal). */
  nameRegex?: string
  refRegex?: string
  /** [west, süd, ost, nord] */
  bbox: [number, number, number, number]
}

export const CATALOG: CatalogTrail[] = [
  {
    id: 'fishermens-trail',
    name: "Rota Vicentina – Fishermen's Trail",
    region: 'Portugal',
    description: 'Küstenpfad an der Algarve- und Alentejo-Küste, viel Sand, Klippen und Fischerdörfer.',
    nameRegex: 'Pescadores|Fishermen',
    bbox: [-9.0, 37.0, -8.6, 37.95],
  },
  {
    id: 'historical-way',
    name: 'Rota Vicentina – Historical Way',
    region: 'Portugal',
    description: 'Landeinwärts durch Dörfer, Korkeichenwälder und Hügel.',
    nameRegex: 'Caminho Hist|Historical Way',
    bbox: [-9.0, 37.0, -8.4, 38.1],
  },
  {
    id: 'via-alpina',
    name: 'Via Alpina',
    region: 'Alpen (8 Länder)',
    description: 'Fünf Wege quer durch die Alpen von Triest bis Monaco. Die Suche zeigt alle Teilwege.',
    nameRegex: 'Via Alpina',
    bbox: [5.0, 43.6, 16.5, 48.4],
  },
  {
    id: 'tmb',
    name: 'Tour du Mont Blanc',
    region: 'Frankreich, Italien, Schweiz',
    description: 'Klassische Rundwanderung um das Mont-Blanc-Massiv, rund 170 km.',
    nameRegex: 'Tour du Mont[ -]Blanc',
    bbox: [6.6, 45.6, 7.3, 46.15],
  },
  {
    id: 'gr20',
    name: 'GR 20',
    region: 'Korsika',
    description: 'Anspruchsvolle Nord-Süd-Durchquerung Korsikas über die Berge.',
    refRegex: '^GR ?20$',
    bbox: [8.5, 41.3, 9.6, 42.7],
  },
  {
    id: 'camino-frances',
    name: 'Camino Francés',
    region: 'Spanien',
    description: 'Der bekannteste Jakobsweg von den Pyrenäen nach Santiago de Compostela.',
    nameRegex: 'Camino Franc',
    bbox: [-8.7, 42.0, -1.2, 43.2],
  },
  {
    id: 'camino-portugues',
    name: 'Camino Portugués',
    region: 'Portugal, Spanien',
    description: 'Jakobsweg von Lissabon bzw. Porto nach Santiago, inkl. Küstenvariante.',
    nameRegex: 'Camino Portugu|Caminho Portugu',
    bbox: [-9.3, 38.6, -8.3, 42.95],
  },
  {
    id: 'camino-norte',
    name: 'Camino del Norte',
    region: 'Spanien',
    description: 'Jakobsweg entlang der nordspanischen Küste.',
    nameRegex: 'Camino del Norte',
    bbox: [-8.7, 42.8, -1.7, 43.7],
  },
  {
    id: 'kungsleden',
    name: 'Kungsleden',
    region: 'Schweden',
    description: 'Der «Königsweg» durch Lappland, rund 440 km Fjäll.',
    nameRegex: 'Kungsleden',
    bbox: [13.0, 61.0, 19.2, 68.5],
  },
  {
    id: 'west-highland-way',
    name: 'West Highland Way',
    region: 'Schottland',
    description: 'Von Milngavie bei Glasgow nach Fort William, rund 150 km.',
    nameRegex: 'West Highland Way',
    bbox: [-5.3, 55.85, -4.2, 56.85],
  },
  {
    id: 'ch-national',
    name: 'Schweizer Nationalrouten',
    region: 'Schweiz',
    description: 'Die nationalen Wanderrouten 1–7, z. B. Via Alpina, Trans Swiss Trail, Jura-Höhenweg, ViaGottardo.',
    nameRegex: 'Via Alpina|Trans Swiss Trail|Alpenpanorama|Via Jacobi|Jura-H|Alpenpässe|ViaGottardo',
    bbox: [5.95, 45.8, 10.5, 47.8],
  },
]
