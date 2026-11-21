// Preisverlauf mit Chart.js. Nur die benötigten Teile laden, damit die App klein bleibt.
import { Chart, Filler, LinearScale, LineController, LineElement, PointElement, Tooltip } from 'chart.js'

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Filler)

const dateFmt = new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit' })
const fullFmt = new Intl.DateTimeFormat('de-CH', { dateStyle: 'short', timeStyle: 'short' })
let current = null

export function drawHistory(canvas, history, targetPrice) {
  current?.destroy()
  const points = history.filter((h) => h.price != null).map((h) => ({ x: Date.parse(h.t), y: h.price }))
  if (!points.length) return
  const datasets = [
    { label: 'Preis', data: points, borderColor: '#0f62fe', backgroundColor: 'rgba(15,98,254,.08)', fill: true, stepped: true, pointRadius: 2, borderWidth: 2 },
  ]
  if (targetPrice)
    datasets.push({
      label: 'Ziel',
      data: [{ x: points[0].x, y: targetPrice }, { x: points.at(-1).x, y: targetPrice }],
      borderColor: '#198038',
      borderDash: [6, 4],
      pointRadius: 0,
      borderWidth: 1.5,
    })
  current = new Chart(canvas, {
    type: 'line',
    data: { datasets },
    options: {
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { type: 'linear', ticks: { callback: (v) => dateFmt.format(v), maxTicksLimit: 6 } },
        y: { ticks: { callback: (v) => `${v}.–` } },
      },
      plugins: { tooltip: { callbacks: { title: (items) => fullFmt.format(items[0].parsed.x), label: (i) => `${i.dataset.label}: CHF ${i.parsed.y}` } } },
    },
  })
}
