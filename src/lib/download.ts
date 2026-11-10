/** Datei im Browser herunterladen. */
export function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Dateiname aus einem Tournamen («Via Alpina, Etappe 1» → «via-alpina-etappe-1»). */
export function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-') || 'tour'
  )
}
