// Minimaler Client für MCP-Server über HTTP (JSON-RPC, Antwort als JSON oder Server-Sent Events).
const UA = 'deal-radar/0.1 (privater Preiswecker; github.com/Thcjk/map)'

export class McpClient {
  constructor(url) {
    this.url = url
    this.session = null
    this.nextId = 1
  }

  async #post(body) {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'User-Agent': UA }
    if (this.session) headers['Mcp-Session-Id'] = this.session
    const res = await fetch(this.url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(30_000) })
    if (res.headers.get('mcp-session-id')) this.session = res.headers.get('mcp-session-id')
    const text = await res.text()
    if (!res.ok) throw new Error(`MCP ${res.status}: ${text.slice(0, 200)}`)
    if (!body.id) return null
    const line = text.split('\n').find((l) => l.startsWith('data: '))
    const json = JSON.parse(line ? line.slice(6) : text)
    if (json.error) throw new Error(`MCP-Fehler: ${json.error.message}`)
    return json.result
  }

  async connect() {
    await this.#post({ jsonrpc: '2.0', id: this.nextId++, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'deal-radar', version: '0.1' } } })
    await this.#post({ jsonrpc: '2.0', method: 'notifications/initialized' })
  }

  async call(name, args) {
    const result = await this.#post({ jsonrpc: '2.0', id: this.nextId++, method: 'tools/call', params: { name, arguments: args } })
    if (result?.isError) throw new Error(result.content?.map((c) => c.text).join(' ') ?? 'Werkzeugfehler')
    return result
  }
}
