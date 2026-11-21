// Deal-Check: bewertet ein Produkt nach den Regeln in data/rules.json.
// Wird von der App und vom Scraper benutzt. Reine Funktionen, darum gut testbar.
//
// Ergebnis: { verdict: 'good' | 'check' | 'bad', reasons: [{ level, text }], specs }
//   good  = ✅ empfehlenswert, check = ⚠️ prüfen, bad = ❌ nicht kaufen

const ORDER = { good: 0, check: 1, bad: 2 }
const worst = (a, b) => (ORDER[a] >= ORDER[b] ? a : b)

/** Text vereinheitlichen: Kleinbuchstaben, «8845 HS» → «8845hs», mehrfache Leerzeichen weg. */
export const normalize = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/(\d{4})\s+(h|hs|hx|u|g|ge)\b/g, '$1$2')
    .replace(/\s+/g, ' ')

/** Grobe Kategorie aus dem Text erkennen. */
export function detectCategory(text) {
  const t = normalize(text)
  if (/\bmonitor\b|\bbildschirm\b|\bdisplay\b|\b\d{2}(\.\d)?\s?("|zoll|inch)/.test(t) && !/mini[- ]?pc/.test(t)) return 'monitor'
  if (/mini[- ]?pc|\bnuc\b|barebone|desktop|ryzen|intel n\d{3}/.test(t)) return 'miniPc'
  return 'unknown'
}

/** Technische Daten aus Titel/Beschreibung/Specs herauslesen (so gut es geht). */
export function extractSpecs(text) {
  const t = normalize(text)
  const specs = {}

  // RAM: «32 GB», «16GB DDR5», «2 x 8 GB»
  const ramModules = t.match(/(\d)\s?x\s?(\d{1,2})\s?gb/)
  if (ramModules) {
    specs.ramModules = Number(ramModules[1])
    specs.ramGb = Number(ramModules[1]) * Number(ramModules[2])
  } else {
    const ram = t.match(/(\d{1,3})\s?gb\s?(ram|ddr\d|lpddr\d|arbeitsspeicher)/) ?? t.match(/(ram|arbeitsspeicher)[^0-9]{0,15}(\d{1,3})\s?gb/)
    if (ram) specs.ramGb = Number(ram[1].match(/\d/) ? ram[1] : ram[2])
  }
  if (/single[- ]?channel|1\s?x\s?16\s?gb/.test(t)) specs.ramModules = 1
  if (/barebone|ohne (ram|arbeitsspeicher|ssd|speicher)|without (ram|memory)/.test(t)) specs.barebone = true

  // Monitor
  const size = t.match(/(\d{2}(?:[.,]\d)?)\s?("|”|zoll|inch|-inch)/)
  if (size) specs.sizeInch = Number(size[1].replace(',', '.'))
  const res = t.match(/(\d{4})\s?x\s?(\d{3,4})/)
  if (res) specs.resolution = `${res[1]}x${res[2]}`
  else if (/\b(4k|uhd|2160p)\b/.test(t)) specs.resolution = '3840x2160'
  else if (/\b(wqhd|qhd|1440p)\b/.test(t)) specs.resolution = '2560x1440'
  const hz = [...t.matchAll(/(\d{2,3})\s?hz/g)].map((m) => Number(m[1])).filter((n) => n >= 50 && n <= 600)
  if (hz.length) specs.hz = Math.max(...hz)
  if (/\boled\b/.test(t)) specs.panel = 'OLED'
  else if (/mini[- ]?led/.test(t)) specs.panel = 'Mini-LED'
  else if (/\bips\b/.test(t)) specs.panel = 'IPS'
  else if (/\bva\b/.test(t)) specs.panel = 'VA'
  else if (/\btn\b/.test(t)) specs.panel = 'TN'
  if (/displayport|\bdp\b|dp 1\.\d/.test(t)) specs.displayPort = true

  return specs
}

/** CPU/GPU-Regel finden, die zum Text passt. */
export function matchGpu(text, rules) {
  const t = normalize(text)
  for (const gpu of rules.miniPc.gpus) {
    const cpu = gpu.cpus.find((c) => new RegExp(`\\b${normalize(c).replace(/ /g, '\\s?')}\\b`).test(t))
    if (cpu) return { ...gpu, matchedCpu: cpu }
    if (gpu.cpuPattern) {
      const m = t.match(new RegExp(gpu.cpuPattern, 'i'))
      if (m) return { ...gpu, matchedCpu: m[0].toUpperCase() }
    }
    if (t.includes(normalize(gpu.name))) return { ...gpu, matchedCpu: null }
  }
  return null
}

const chf = (n) => `CHF ${Number(n).toFixed(0)}`

export function evaluateMiniPc(text, price, rules) {
  const r = rules.miniPc
  const reasons = []
  let verdict = 'good'
  const add = (level, msg) => {
    reasons.push({ level, text: msg })
    verdict = worst(verdict, level)
  }
  const specs = extractSpecs(text)
  const gpu = matchGpu(text, rules)
  const t = normalize(text)

  if (r.badText.some((b) => t.includes(normalize(b)))) add('bad', '«Onboard Graphics» ohne genaue Angabe: für Spiele zu schwach.')
  if (!gpu) add('check', 'CPU/Grafik nicht erkannt. Bitte in den technischen Daten nachsehen.')
  else if (gpu.verdict === 'bad') add('bad', `${gpu.matchedCpu ?? ''} → ${gpu.name}: für Spiele zu schwach.`.trim())
  else {
    reasons.push({ level: 'good', text: `${gpu.matchedCpu ? `${gpu.matchedCpu} → ` : ''}${gpu.name}: gute Grafik für einen Mini-PC.` })
    if (gpu.maxPrice && price != null) {
      if (price <= gpu.maxPrice) reasons.push({ level: 'good', text: `Preis ${chf(price)} liegt unter deinem Ziel von ${chf(gpu.maxPrice)} für ${gpu.name}.` })
      else add('check', `Preis ${chf(price)} liegt über deinem Ziel von ${chf(gpu.maxPrice)} für ${gpu.name}.`)
    }
  }

  if (specs.barebone) add(r.barebone.verdict, `Barebone (ohne RAM/SSD): rechne mit zusätzlich ${r.barebone.extraCost}.`)
  else if (specs.ramGb == null) add('check', 'RAM-Grösse nicht erkannt.')
  else if (specs.ramGb < r.minRamGb) add('bad', `Nur ${specs.ramGb} GB RAM: mindestens ${r.minRamGb} GB nötig.`)
  else reasons.push({ level: 'good', text: `${specs.ramGb} GB RAM.` })

  if (r.warnSingleChannel && specs.ramGb === 16 && specs.ramModules === 1)
    add('check', '16 GB als ein Riegel (Single-Channel): Die Grafik ist dann spürbar langsamer. Besser 2 × 8 GB.')

  return { verdict, reasons, specs: { ...specs, gpu: gpu?.name ?? null, cpu: gpu?.matchedCpu ?? null } }
}

export function evaluateMonitor(text, price, rules) {
  const r = rules.monitor
  const reasons = []
  let verdict = 'good'
  const add = (level, msg) => {
    reasons.push({ level, text: msg })
    verdict = worst(verdict, level)
  }
  const s = extractSpecs(text)

  if (s.sizeInch == null) add('check', 'Bildschirmgrösse nicht erkannt.')
  else if (Math.round(s.sizeInch) !== r.sizeInch) add('check', `${s.sizeInch}" statt der gesuchten ${r.sizeInch}".`)
  else reasons.push({ level: 'good', text: `${s.sizeInch}".` })

  if (s.resolution == null) add('check', 'Auflösung nicht erkannt.')
  else if (s.resolution === r.resolution) reasons.push({ level: 'good', text: `${s.resolution} (WQHD).` })
  else {
    const [w] = s.resolution.split('x').map(Number)
    if (w >= 3440) add('check', `${s.resolution}: ${r.warnTooBig}`)
    else add('check', `${s.resolution} statt ${r.resolution}.`)
  }

  if (s.hz == null) add('check', 'Bildwiederholrate nicht erkannt.')
  else if (s.hz < r.warnBelowHz) add('check', `Nur ${s.hz} Hz (unter ${r.warnBelowHz} Hz).`)
  else if (s.hz < r.minHz) add('check', `${s.hz} Hz, gesucht sind mindestens ${r.minHz} Hz.`)
  else reasons.push({ level: 'good', text: `${s.hz} Hz.` })

  if (s.panel === 'OLED') add('check', r.warnOled)
  else if (s.panel && r.panels.includes(s.panel)) reasons.push({ level: 'good', text: `${s.panel}-Panel.` })
  else if (s.panel) add('check', `${s.panel}-Panel statt ${r.panels.join(' oder ')}.`)
  else add('check', 'Panel-Typ nicht erkannt.')

  if (r.needDisplayPort) {
    if (s.displayPort) reasons.push({ level: 'good', text: 'DisplayPort vorhanden.' })
    else add('check', 'DisplayPort nicht erkannt.')
  }
  return { verdict, reasons, specs: s }
}

/**
 * «Statt»-Preis prüfen. history: [{ t: ISO-Zeit, price }] (eigene Messungen).
 * Liefert null, wenn nichts zu sagen ist.
 */
export function judgeStrikePrice(price, strikePrice, history, rules, now = Date.now()) {
  if (!strikePrice || !price || strikePrice <= price) return null
  const discount = Math.round((1 - price / strikePrice) * 100)
  const since = now - rules.fakeDiscount.lookbackDays * 86_400_000
  const recent = (history ?? []).filter((h) => h.price != null && Date.parse(h.t) >= since)
  if (!recent.length)
    return { level: 'check', text: `«Statt ${chf(strikePrice)}» (−${discount} %): noch kein eigener Preisverlauf, Rabatt nicht überprüfbar.` }
  const low = Math.min(...recent.map((h) => h.price))
  const high = Math.max(...recent.map((h) => h.price))
  if (low <= price)
    return { level: 'check', text: `«Statt ${chf(strikePrice)}» wirkt aufgeblasen: In den letzten ${rules.fakeDiscount.lookbackDays} Tagen kostete es schon ${chf(low)}.` }
  if (strikePrice > high * 1.05)
    return { level: 'check', text: `«Statt ${chf(strikePrice)}» lag nie so hoch: gemessen höchstens ${chf(high)}. Echter Rabatt: −${Math.round((1 - price / high) * 100)} %.` }
  return { level: 'good', text: `Echter Rabatt: −${Math.round((1 - price / high) * 100)} % gegenüber dem bisherigen Preis.` }
}

/** Gesamturteil für ein Produkt. */
export function evaluate({ text, price, strikePrice, history, category }, rules, now) {
  const cat = category ?? detectCategory(text)
  const base =
    cat === 'miniPc'
      ? evaluateMiniPc(text, price, rules)
      : cat === 'monitor'
        ? evaluateMonitor(text, price, rules)
        : { verdict: 'check', reasons: [{ level: 'check', text: 'Produktart nicht erkannt (weder Mini-PC noch Monitor).' }], specs: {} }
  const strike = judgeStrikePrice(price, strikePrice, history, rules, now)
  if (strike) {
    base.reasons.push(strike)
    base.verdict = worst(base.verdict, strike.level)
  }
  return { ...base, category: cat }
}

export const VERDICT_LABELS = { good: '✅ empfehlenswert', check: '⚠️ prüfen', bad: '❌ nicht kaufen' }
