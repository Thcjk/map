// Einmaliger Test: Was erlauben die Shops, und welche Wege funktionieren aus GitHub Actions?
// Läuft mit: node scraper/probe.js  (Node 22, keine Abhängigkeiten)

const UA = 'deal-radar/0.1 (privater Preiswecker; github.com/Thcjk/map)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function get(url, opts = {}) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: opts.accept ?? 'text/html,application/json', ...(opts.headers ?? {}) }, method: opts.method ?? 'GET', body: opts.body, signal: AbortSignal.timeout(30_000) })
    const text = await res.text()
    return { status: res.status, headers: Object.fromEntries(res.headers), text }
  } catch (e) {
    return { status: 0, error: e.message, text: '' }
  }
}

const SHOPS = {
  digitec: 'https://www.digitec.ch',
  galaxus: 'https://www.galaxus.ch',
  brack: 'https://www.brack.ch',
  conrad: 'https://www.conrad.ch',
  mediamarkt: 'https://www.mediamarkt.ch',
  interdiscount: 'https://www.interdiscount.ch',
  amazon: 'https://www.amazon.de',
}

console.log('==== 1. robots.txt ====')
for (const [name, base] of Object.entries(SHOPS)) {
  const r = await get(`${base}/robots.txt`, { accept: 'text/plain' })
  console.log(`\n--- ${name}: HTTP ${r.status} ${r.error ?? ''} (${r.text.length} Zeichen)`)
  // nur die Blöcke für * und die Zeilen zu Produkten/Suche zeigen
  const lines = r.text.split('\n').map((l) => l.trim())
  let inStar = false
  for (const l of lines) {
    if (/^user-agent:/i.test(l)) inStar = /^user-agent:\s*\*\s*$/i.test(l)
    if (inStar || /crawl-delay|ai|gpt|claude/i.test(l)) console.log('  ', l.slice(0, 120))
  }
  await sleep(1500)
}

console.log('\n==== 2. Galaxus MCP ====')
const MCP_CANDIDATES = ['https://mcp.galaxus.ch/mcp', 'https://mcp.galaxus.ch/', 'https://mcp.galaxus.ch/sse', 'https://www.galaxus.ch/mcp']
let mcpUrl = null
let session = null
const rpc = async (url, method, params, id = 1) => {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }
  if (session) headers['Mcp-Session-Id'] = session
  const r = await get(url, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }), accept: 'application/json, text/event-stream' })
  if (r.headers?.['mcp-session-id']) session = r.headers['mcp-session-id']
  // SSE-Antwort: «data: {...}»
  const m = r.text.match(/^data: (.*)$/m)
  let json = null
  try {
    json = JSON.parse(m ? m[1] : r.text)
  } catch {}
  return { ...r, json }
}
for (const url of MCP_CANDIDATES) {
  session = null
  const r = await rpc(url, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'deal-radar-probe', version: '0.1' } })
  console.log(`${url}: HTTP ${r.status} ${r.error ?? ''} ${r.text.slice(0, 200).replace(/\s+/g, ' ')}`)
  if (r.json?.result) {
    mcpUrl = url
    break
  }
  await sleep(1000)
}
if (mcpUrl) {
  await rpc(mcpUrl, 'notifications/initialized', {})
  const tools = await rpc(mcpUrl, 'tools/list', {}, 2)
  for (const t of tools.json?.result?.tools ?? []) console.log(`TOOL ${t.name}: ${(t.description ?? '').slice(0, 160)}\n   input: ${JSON.stringify(t.inputSchema?.properties ?? {}).slice(0, 300)}`)
  const search = (tools.json?.result?.tools ?? []).find((t) => /search/i.test(t.name))
  if (search) {
    const queryKey = Object.keys(search.inputSchema?.properties ?? { query: 1 })[0]
    for (const q of ['Geekom A6', 'GMKtec M6 Ultra', 'Beelink SER8', 'Philips Evnia 27M2N3500PF', 'ASUS TUF VG27AQ5A']) {
      const r = await rpc(mcpUrl, 'tools/call', { name: search.name, arguments: { [queryKey]: q } }, 3)
      console.log(`\nSUCHE «${q}»: HTTP ${r.status}`)
      console.log(JSON.stringify(r.json?.result ?? r.json ?? r.text).slice(0, 1500))
      await sleep(2000)
    }
  }
}

console.log('\n==== 3. Produktseiten / JSON-LD ====')
const PAGES = [
  ['digitec Suche', 'https://www.digitec.ch/de/search?q=Beelink%20SER8'],
  ['brack Suche', 'https://www.brack.ch/search?query=Beelink%20SER8'],
  ['interdiscount Suche', 'https://www.interdiscount.ch/de/search?search=asus%20vg27aq5a'],
  ['mediamarkt Suche', 'https://www.mediamarkt.ch/de/search.html?query=asus%20vg27aq5a'],
  ['conrad Suche', 'https://www.conrad.ch/de/search.html?search=beelink'],
]
for (const [label, url] of PAGES) {
  const r = await get(url)
  const ld = (r.text.match(/application\/ld\+json/g) ?? []).length
  console.log(`${label}: HTTP ${r.status} ${r.error ?? ''} · ${r.text.length} Zeichen · JSON-LD-Blöcke: ${ld} · Server: ${r.headers?.server ?? '?'} · ${/akamai|captcha|access denied|cloudflare/i.test(r.text) ? 'BOT-SCHUTZ-HINWEIS' : ''}`)
  await sleep(3000)
}
