// Test 2: Galaxus-/Digitec-MCP genauer ansehen und eine Digitec-Produktseite auslesen.
const UA = 'deal-radar/0.1 (privater Preiswecker; github.com/Thcjk/map)'
const AGENT = 'deal-radar price watcher (personal use), rule-based, no LLM'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function post(url, body, session) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'User-Agent': UA }
  if (session) headers['Mcp-Session-Id'] = session
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(30_000) })
  const text = await res.text()
  const m = text.match(/^data: (.*)$/m)
  let json = null
  try { json = JSON.parse(m ? m[1] : text) } catch {}
  return { status: res.status, session: res.headers.get('mcp-session-id'), text, json }
}

async function mcp(url) {
  console.log(`\n######## ${url}`)
  let r
  try {
    r = await post(url, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'deal-radar', version: '0.1' } } })
  } catch (e) {
    console.log('Fehler:', e.message)
    return
  }
  console.log('init:', r.status, r.text.slice(0, 600).replace(/\s+/g, ' '))
  if (!r.json?.result) return
  const session = r.session
  await post(url, { jsonrpc: '2.0', method: 'notifications/initialized' }, session)
  const tools = await post(url, { jsonrpc: '2.0', id: 2, method: 'tools/list' }, session)
  for (const t of tools.json?.result?.tools ?? []) console.log(`\nTOOL ${t.name}\n  ${t.description}\n  schema: ${JSON.stringify(t.inputSchema)}`)
  const res = await post(url, { jsonrpc: '2.0', id: 3, method: 'resources/list' }, session)
  console.log('\nresources:', JSON.stringify(res.json?.result ?? res.text).slice(0, 800))
  for (const q of ['Beelink SER8', 'ASUS TUF Gaming VG27AQ5A']) {
    const s = await post(url, { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'search_products', arguments: { query: q, agentInfo: AGENT, language: 'de' } } }, session)
    console.log(`\nSUCHE «${q}»:\n${JSON.stringify(s.json?.result ?? s.text).slice(0, 4000)}`)
    await sleep(2000)
  }
  return session
}

await mcp('https://mcp.galaxus.ch/')
await sleep(2000)
await mcp('https://mcp.digitec.ch/')

console.log('\n######## Digitec robots.txt (Anfang)')
const robots = await (await fetch('https://www.digitec.ch/robots.txt', { headers: { 'User-Agent': UA } })).text()
console.log(robots.split('\n').slice(0, 40).join('\n'))

console.log('\n######## Digitec Suche: JSON-LD-Inhalt')
const html = await (await fetch('https://www.digitec.ch/de/search?q=Beelink%20SER8', { headers: { 'User-Agent': UA, Accept: 'text/html' } })).text()
for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) console.log(m[1].slice(0, 1500))
const link = html.match(/href="(\/de\/s1\/product\/[^"]+)"/)
console.log('Erster Produktlink:', link?.[1])
if (link) {
  await sleep(3000)
  const p = await fetch(`https://www.digitec.ch${link[1]}`, { headers: { 'User-Agent': UA, Accept: 'text/html' } })
  const ph = await p.text()
  console.log(`Produktseite: HTTP ${p.status}, ${ph.length} Zeichen`)
  for (const m of ph.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) console.log(m[1].slice(0, 3000))
}
