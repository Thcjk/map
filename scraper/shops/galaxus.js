// Digitec und Galaxus über die offizielle Galaxus-Schnittstelle für KI-Assistenten (MCP).
// Kein Scraping: Die Schnittstelle liefert Preis, «Statt»-Preis und Verfügbarkeit direkt.
// Digitec und Galaxus gehören zusammen und nutzen dieselben Produkt-IDs und Preise.
import { McpClient } from '../lib/mcp.js'

const MCP_URL = 'https://mcp.galaxus.ch/'
// Pflichtangabe der Schnittstelle («nur für Statistik»): ehrlich, wer hier fragt.
const AGENT_INFO = 'deal-radar: private price watcher, rule-based, no LLM (github.com/Thcjk/map)'

export const name = 'Digitec/Galaxus'
export const hosts = ['digitec.ch', 'galaxus.ch']

/** Produkt-ID aus einer Digitec- oder Galaxus-Adresse («…-59382254» oder «…/59382254»). */
export function productIdFromUrl(url) {
  const m = String(url ?? '').match(/(?:-|\/)(\d{5,})(?:[/?#]|$)/)
  return m ? Number(m[1]) : null
}

/** Verfügbarkeit: bekannte Werte deuten, unbekannte als «unbekannt» melden statt raten. */
const AVAILABLE = new Set(['TICK', 'FULL', 'PARTIAL', 'FEW'])
const NOT_AVAILABLE = new Set(['NONE', 'NOT_AVAILABLE', 'SOLD_OUT', 'UNAVAILABLE', 'CROSS'])
export function availabilityOf(classification, price) {
  if (price == null) return false
  if (AVAILABLE.has(classification)) return true
  if (NOT_AVAILABLE.has(classification)) return false
  return null
}

/** Antwort der Schnittstelle in eine einfache Produktliste umwandeln. */
export function parseSearch(result) {
  const edges = result?._meta?.response?.data?.serverToolShopSearch?.products?.edges
  if (edges) {
    return edges.map(({ node }) => ({
      productId: node.trackingId,
      name: node.nameWithProperties ?? node.name,
      brand: node.brand?.name ?? null,
      type: node.productType?.name ?? null,
      description: node.description ?? '',
      price: node.price?.amountInclusive ?? null,
      strikePrice: node.insteadOfPrice?.price?.amountInclusive ?? node.insteadOfPrice?.amountInclusive ?? null,
      availability: node.availability?.availabilityClassification ?? null,
      url: node.relativeUrl ? `https://www.galaxus.ch${node.relativeUrl}` : null,
    }))
  }
  // dokumentierte Form: {products: [{id, name, priceIfAvailable, pageUrl, …}]}
  const text = result?.content?.find((c) => c.type === 'text')?.text
  const json = result?.structuredContent ?? (text ? JSON.parse(text) : null)
  return (json?.products ?? []).map((p) => ({
    productId: Number(String(p.pageUrl ?? '').match(/-(\d{5,})(?:[/?#]|$)/)?.[1] ?? p.id),
    name: p.name,
    brand: p.brand?.name ?? p.brand ?? null,
    type: p.productType?.name ?? p.productType ?? null,
    description: p.description ?? '',
    price: p.priceIfAvailable?.amountInclusive ?? p.priceIfAvailable ?? null,
    strikePrice: null,
    availability: null,
    url: p.pageUrl ?? null,
  }))
}

/** Bester Treffer für eine Suche ohne bekannte ID: alle Wörter der Suche müssen im Namen vorkommen. */
export function bestMatch(products, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return products.find((p) => words.every((w) => `${p.brand ?? ''} ${p.name}`.toLowerCase().includes(w))) ?? null
}

let client = null
async function connect() {
  if (!client) {
    client = new McpClient(MCP_URL)
    await client.connect()
  }
  return client
}

export async function search(query, first = 20) {
  const c = await connect()
  return parseSearch(await c.call('search_products', { query, agentInfo: AGENT_INFO, language: 'de', first }))
}

/**
 * Aktuellen Stand eines Wunschlisten-Eintrags holen.
 * Mit bekannter productId wird genau dieses Produkt gesucht; sonst der beste Treffer zur Suche.
 */
export async function check(item) {
  const productId = item.productId ?? productIdFromUrl(item.url)
  const query = item.query ?? item.name
  const results = await search(query, 30)
  const hit = productId ? results.find((p) => p.productId === productId) : bestMatch(results, query)
  if (!hit) {
    return {
      status: 'error',
      error: productId
        ? `Produkt ${productId} nicht unter den Suchtreffern für «${query}». Suchbegriff in der Wunschliste anpassen.`
        : `Kein passender Treffer für «${query}». Bitte den Produktlink eintragen.`,
    }
  }
  return {
    status: 'ok',
    productId: hit.productId,
    matchedName: hit.name,
    url: hit.url,
    price: hit.price,
    strikePrice: hit.strikePrice,
    available: availabilityOf(hit.availability, hit.price),
    availabilityRaw: hit.availability,
    specsText: `${hit.brand ?? ''} ${hit.name} ${hit.type ?? ''} ${hit.description}`,
  }
}
