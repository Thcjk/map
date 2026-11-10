/** Seitenverhältnis erhalten, längste Kante höchstens `max`. */
export function fitSize(w: number, h: number, max: number): [number, number] {
  const scale = Math.min(1, max / Math.max(w, h))
  return [Math.round(w * scale), Math.round(h * scale)]
}

/** Foto verkleinern (JPEG), damit der lokale Speicher nicht vollläuft. */
export async function resizePhoto(file: Blob, max = 1600, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const [w, h] = fitSize(bmp.width, bmp.height, max)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Das Foto konnte nicht verarbeitet werden.'))), 'image/jpeg', quality),
  )
}
