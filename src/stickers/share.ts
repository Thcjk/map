import { APP_NAME } from '../config'

const W = 1080
const H = 1350
const PAPER = '#e9e8da'
const INK = '#17241a'

/**
 * Sticker als Bild (1080 × 1350, Hochformat für Instagram) mit Wegname, Datum und km.
 * Das SVG wird samt Filtern in ein Canvas gezeichnet; Text kommt mit den App-Schriften dazu.
 */
export async function renderShareImage(svg: SVGSVGElement, title: string, subtitle: string): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', '860')
  clone.setAttribute('height', '860')
  clone.removeAttribute('class')
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Das Bild konnte nicht erzeugt werden.'))
      img.src = url
    })
    await Promise.all([document.fonts.load("800 64px 'Archivo Variable'"), document.fonts.load("500 30px 'IBM Plex Mono'")])
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, W, H)
    // Passkreuze in den Ecken, wie auf einem Kartenblatt
    ctx.strokeStyle = INK
    ctx.lineWidth = 2
    for (const [x, y] of [[70, 70], [W - 70, 70], [70, H - 70], [W - 70, H - 70]]) {
      ctx.beginPath()
      ctx.moveTo(x - 18, y)
      ctx.lineTo(x + 18, y)
      ctx.moveTo(x, y - 18)
      ctx.lineTo(x, y + 18)
      ctx.stroke()
    }
    ctx.drawImage(img, (W - 860) / 2, 110, 860, 860)
    ctx.fillStyle = INK
    ctx.textAlign = 'center'
    let size = 76
    do {
      ctx.font = `800 ${size}px 'Archivo Variable', sans-serif`
      size -= 4
    } while (ctx.measureText(title.toLowerCase()).width > W - 160 && size > 36)
    ctx.fillText(title.toLowerCase(), W / 2, 1080)
    ctx.font = "500 34px 'IBM Plex Mono', monospace"
    ctx.letterSpacing = '4px'
    ctx.fillText(subtitle.toUpperCase(), W / 2, 1150)
    ctx.font = "500 26px 'IBM Plex Mono', monospace"
    ctx.fillText(APP_NAME.toUpperCase(), W / 2, H - 60)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Das Bild konnte nicht erzeugt werden.'))), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Über das Teilen-Menü des Geräts teilen; sonst herunterladen. */
export async function shareImage(blob: Blob, filename: string, title: string) {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title }).catch(() => undefined)
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
