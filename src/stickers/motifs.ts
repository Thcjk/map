/**
 * Sticker-Motive: original gezeichnet, als Daten für <Sticker>. Zeichenfläche 200 × 200.
 * - silhouette: deckende Grundform (daraus entsteht der weisse Die-Cut-Rand)
 * - fills: Aquarellflächen in den Farben der echten Wegmarkierung (siehe docs/STICKER.md)
 * - lines: Fineline-Strich (dunkelgrau, wird per Filter leicht unregelmässig)
 */
export interface Motif {
  silhouette: string[]
  fills: { d: string; color: string; opacity?: number }[]
  lines: string[]
  /** Kurzer Text im Motiv (Meilensteine), z. B. «100». */
  text?: { value: string; x: number; y: number; size: number }
}

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`
const box = (x: number, y: number, w: number, h: number, r = 0) =>
  r
    ? `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}v${-(h - 2 * r)}a${r},${r} 0 0 1 ${r},${-r}Z`
    : `M${x},${y}h${w}v${h}h${-w}Z`

/** Markierungsfarben */
export const C = {
  green: '#3f9b57',
  blue: '#2f6fb5',
  red: '#d2322d',
  white: '#ffffff',
  yellow: '#f2c81e',
  caminoBlue: '#1f5aa8',
  thistle: '#8b5fa8',
  leaf: '#5d8f4e',
  stone: '#b9b7ad',
  forest: '#527549',
}

/** Sardine, Kopf links. */
function fish(x: number, y: number, len: number, h: number) {
  const body = `M${x},${y}C${x + len * 0.2},${y - h} ${x + len * 0.62},${y - h} ${x + len * 0.8},${y - 2}L${x + len},${y - h * 0.85}L${x + len * 0.94},${y}L${x + len},${y + h * 0.85}L${x + len * 0.8},${y + 2}C${x + len * 0.62},${y + h} ${x + len * 0.2},${y + h} ${x},${y}Z`
  const details = [
    `M${x + len * 0.2},${y - h * 0.7}Q${x + len * 0.27},${y} ${x + len * 0.2},${y + h * 0.7}`,
    circle(x + len * 0.1, y - h * 0.18, 2.2),
    `M${x + len * 0.3},${y}H${x + len * 0.72}`,
    `M${x + len * 0.42},${y - h * 0.88}l${len * 0.08},${-h * 0.45}l${len * 0.07},${h * 0.55}`,
  ]
  const fin = `M${x + len * 0.4},${y - h * 0.8}l${len * 0.1},${-h * 0.55}l${len * 0.09},${h * 0.6}Z`
  return { body, details, fin }
}

const f1 = fish(28, 78, 122, 21)
const f2 = fish(50, 128, 122, 21)
const sardines: Motif = {
  silhouette: [f1.body, f1.fin, f2.body, f2.fin],
  fills: [
    { d: f1.body, color: C.green },
    { d: f2.body, color: C.blue },
  ],
  lines: [f1.body, ...f1.details, f2.body, ...f2.details],
}

/** GR-Balken: weiss über rot. */
const blaze = (x: number, y: number, w: number, h: number) => ({
  top: box(x, y, w, h),
  bottom: box(x, y + h + 3, w, h),
})

const oakCrown = 'M100,30C128,24 152,40 150,62C168,72 164,100 142,104C134,116 112,118 100,108C88,118 66,116 58,104C36,100 32,72 50,62C48,40 72,24 100,30Z'
const oakTrunk = 'M90,104C92,128 88,150 80,170H120C112,150 108,128 110,104Z'
const corkOak: Motif = {
  silhouette: [oakCrown, oakTrunk],
  fills: [
    { d: oakCrown, color: C.red, opacity: 0.55 },
    { d: box(86, 128, 28, 9), color: C.white },
    { d: box(85, 140, 30, 9), color: C.red },
  ],
  lines: [oakCrown, oakTrunk, box(86, 128, 28, 9), box(85, 140, 30, 9), 'M70,70q10,-10 22,-2M108,62q12,-8 24,2M84,90q14,6 30,0'],
}

const ridge = 'M20,160L62,84L84,112L112,48L146,108L160,92L182,160Z'
const alpineBlaze = [box(64, 126, 72, 10), box(64, 136, 72, 12), box(64, 148, 72, 10)]
const alpina: Motif = {
  silhouette: [ridge],
  fills: [
    { d: 'M112,48L96,82L108,78L116,90L128,76Z', color: C.white },
    { d: alpineBlaze[0], color: C.white },
    { d: alpineBlaze[1], color: C.red },
    { d: alpineBlaze[2], color: C.white },
    { d: 'M20,160L62,84L84,112L72,160Z', color: C.red, opacity: 0.3 },
  ],
  lines: [ridge, 'M112,48L96,82L108,78L116,90L128,76', ...alpineBlaze, 'M62,84l6,22M146,108l-8,20'],
}

const dome = 'M18,158C40,150 52,92 84,70C96,60 108,60 118,72C128,62 142,66 150,82C164,108 170,150 184,158Z'
const tmbBlaze = blaze(74, 124, 54, 11)
const montBlanc: Motif = {
  silhouette: [dome],
  fills: [
    { d: 'M84,70C96,60 108,60 118,72C128,62 142,66 150,82L138,100L124,90L110,104L96,88L78,98Z', color: C.white },
    { d: tmbBlaze.top, color: C.white },
    { d: tmbBlaze.bottom, color: C.red },
    { d: 'M18,158C40,150 52,92 84,70L78,98L60,158Z', color: C.red, opacity: 0.25 },
  ],
  lines: [dome, 'M78,98L96,88L110,104L124,90L138,100', tmbBlaze.top, tmbBlaze.bottom, 'M44,140q10,-6 18,0M140,134q10,-6 20,2'],
}

const needles = 'M22,160L48,96L60,118L78,58L92,100L106,40L124,104L138,74L156,122L166,104L180,160Z'
const grBlaze = blaze(70, 120, 60, 12)
const gr20: Motif = {
  silhouette: [needles],
  fills: [
    { d: grBlaze.top, color: C.white },
    { d: grBlaze.bottom, color: C.red },
    { d: 'M106,40L124,104L138,74L156,122L166,104L180,160H120Z', color: C.red, opacity: 0.28 },
  ],
  lines: [needles, grBlaze.top, grBlaze.bottom, 'M78,58l4,30M106,40l-4,36M138,74l-2,26'],
}

const tile = box(34, 34, 132, 132, 14)
const arrow = (dx = 0, dy = 0) =>
  `M${58 + dx},${100 + dy}H${116 + dx}V${78 + dy}L${150 + dx},${104 + dy}L${116 + dx},${130 + dy}V${110 + dy}H${58 + dx}Z`
const camino = (extraLines: string[], dy = 0): Motif => ({
  silhouette: [tile],
  fills: [
    { d: tile, color: C.caminoBlue },
    { d: arrow(0, dy), color: C.yellow },
  ],
  lines: [tile, arrow(0, dy), ...extraLines],
})
const caminoFrances = camino(['M52,150h96'])
const caminoPortugues = camino(['M50,146q10,-8 20,0t20,0t20,0t20,0t20,0'], -8)
const caminoNorte = camino(['M50,152q16,-14 30,-4q14,-12 28,-2q16,-10 42,4', 'M52,56q10,-6 18,0'], -6)

const cairn = [
  'M52,164C50,148 66,142 84,144C104,142 148,146 148,164Z',
  'M66,144C64,130 76,124 96,126C116,124 136,130 134,144Z',
  'M78,126C78,114 88,108 100,110C112,108 122,114 122,126Z',
]
const pole = box(97, 44, 6, 66)
const cross = 'M78,52l8,-8l14,14l14,-14l8,8l-14,14l14,14l-8,8l-14,-14l-14,14l-8,-8l14,-14Z'
const kungsleden: Motif = {
  silhouette: [...cairn, pole, cross],
  fills: [
    { d: cross, color: C.red },
    ...cairn.map((d) => ({ d, color: C.stone, opacity: 0.5 })),
  ],
  lines: [...cairn, pole, cross],
}

const thistleHead = 'M100,30L106,52L118,34L116,56L132,44L124,64L140,58L128,74H72L60,58L76,64L68,44L84,56L82,34L94,52Z'
const thistleBulb = 'M72,74H128C134,96 124,112 100,114C76,112 66,96 72,74Z'
const thistleStem = 'M96,114H104L106,172H94Z'
const thistleLeaves = 'M96,140C80,134 62,138 52,126C68,124 84,122 96,130ZM104,150C120,144 138,148 148,136C132,134 116,132 104,140Z'
const thistle: Motif = {
  silhouette: [thistleHead, thistleBulb, thistleStem, thistleLeaves],
  fills: [
    { d: thistleHead, color: C.thistle },
    { d: thistleBulb, color: C.leaf },
    { d: thistleLeaves, color: C.leaf },
    { d: thistleStem, color: C.leaf, opacity: 0.7 },
  ],
  lines: [thistleHead, thistleBulb, thistleStem, thistleLeaves, 'M80,84l40,0M78,94l44,0M84,104l32,0M88,76l-6,34M100,76v36M112,76l6,34'],
}

const rhombus = 'M100,26L172,90L100,154L28,90Z'
const swissStripe = [box(60, 160, 26, 14), box(86, 160, 28, 14), box(114, 160, 26, 14)]
const swiss: Motif = {
  silhouette: [rhombus, box(60, 160, 80, 14)],
  fills: [
    { d: rhombus, color: C.yellow },
    { d: swissStripe[0], color: C.white },
    { d: swissStripe[1], color: C.red },
    { d: swissStripe[2], color: C.white },
  ],
  lines: [rhombus, ...swissStripe, 'M100,44L152,90L100,136L48,90Z'],
}

const post = box(94, 40, 12, 132)
const signR = 'M106,54H150L164,68L150,82H106Z'
const signL = 'M94,92H50L36,106L50,120H94Z'
const signpost: Motif = {
  silhouette: [post, signR, signL],
  fills: [
    { d: signR, color: C.forest },
    { d: signL, color: C.forest, opacity: 0.6 },
  ],
  lines: [post, signR, signL, 'M116,68h28M56,106h28', 'M80,172h40'],
}

const badge = circle(100, 100, 70)
const milestone = (value: string, color: string, size = 46): Motif => ({
  silhouette: [badge],
  fills: [
    { d: badge, color, opacity: 0.55 },
    { d: circle(100, 100, 52), color: C.white, opacity: 0.9 },
  ],
  lines: [badge, circle(100, 100, 52), 'M60,150l-14,24l18,-6l6,16l12,-26M140,150l14,24l-18,-6l-6,16l-12,-26'],
  text: { value, x: 100, y: 100 + size * 0.34, size },
})

export const MOTIFS = {
  sardines,
  corkOak,
  alpina,
  montBlanc,
  gr20,
  caminoFrances,
  caminoPortugues,
  caminoNorte,
  kungsleden,
  thistle,
  swiss,
  signpost,
  first: milestone('1', C.forest),
  km100: milestone('100', C.forest, 38),
  km500: milestone('500', C.red, 38),
  hm1000: milestone('1000↑', C.stone, 26),
  multiday: milestone('2+', C.yellow, 40),
} satisfies Record<string, Motif>

export type MotifId = keyof typeof MOTIFS
