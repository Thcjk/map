// Shops, die automatische Abfragen sperren (Test vom 21.11.2026 aus GitHub Actions):
// Interdiscount, MediaMarkt, Conrad: HTTP 403 (Bot-Schutz); Brack: keine Antwort.
// Wir umgehen keinen Bot-Schutz. Preise dieser Shops trägst du in der App von Hand ein.
export const SHOPS = {
  'brack.ch': 'Brack',
  'conrad.ch': 'Conrad',
  'mediamarkt.ch': 'MediaMarkt',
  'interdiscount.ch': 'Interdiscount',
  'amazon.de': 'Amazon',
  'amazon.com': 'Amazon',
}

export function check(item, shopName) {
  return {
    status: 'blocked',
    error: `${shopName} sperrt automatische Abfragen. Preis bitte in der App von Hand eintragen.`,
  }
}
