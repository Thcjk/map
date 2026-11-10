/**
 * Vereinfachte Landesgrenze der Schweiz (lon, lat). Genau genug, um zu erkennen,
 * ob die Kartenmitte in der Schweiz liegt und swisstopo vorgeschlagen werden soll.
 */
const CH_OUTLINE: [number, number][] = [
  [7.59, 47.59], [8.23, 47.62], [8.57, 47.81], [8.87, 47.7], [9.18, 47.66], [9.56, 47.54],
  [9.53, 47.27], [9.6, 47.06], [9.87, 47.0], [10.13, 46.85], [10.47, 46.87], [10.49, 46.62],
  [10.45, 46.55], [10.05, 46.45], [10.16, 46.25], [9.95, 46.38], [9.45, 46.5], [9.28, 46.5],
  [9.03, 45.83], [8.86, 45.99], [8.71, 46.1], [8.45, 46.25], [8.08, 46.26], [7.86, 45.92],
  [7.04, 45.93], [6.8, 46.13], [6.79, 46.4], [6.31, 46.25], [6.15, 46.15], [5.96, 46.13],
  [5.96, 46.21], [6.07, 46.46], [6.37, 46.71], [6.48, 46.9], [6.84, 47.09], [6.96, 47.24],
  [7.01, 47.49], [7.13, 47.5], [7.45, 47.45], [7.59, 47.59],
]

/** Grob umschliessendes Rechteck, z. B. als `bounds` für swisstopo-Quellen. */
export const CH_BOUNDS: [number, number, number, number] = [5.9, 45.8, 10.6, 47.85]

export function isInSwitzerland(lng: number, lat: number): boolean {
  let inside = false
  for (let i = 0, j = CH_OUTLINE.length - 1; i < CH_OUTLINE.length; j = i++) {
    const [xi, yi] = CH_OUTLINE[i]
    const [xj, yj] = CH_OUTLINE[j]
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
