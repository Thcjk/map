// Welcher Shop ist für einen Wunschlisten-Eintrag zuständig? Pro Shop ein Modul,
// damit sich jeder einzeln reparieren oder austauschen lässt.
import * as galaxus from './galaxus.js'
import * as blocked from './blocked.js'

export function shopFor(item) {
  const host = item.url ? new URL(item.url).hostname.replace(/^www\./, '') : null
  if (!host || galaxus.hosts.some((h) => host.endsWith(h))) return { name: galaxus.name, check: galaxus.check }
  const blockedName = Object.entries(blocked.SHOPS).find(([h]) => host.endsWith(h))?.[1]
  if (blockedName) return { name: blockedName, check: (item) => blocked.check(item, blockedName) }
  return { name: host, check: () => ({ status: 'error', error: `Shop ${host} wird nicht unterstützt.` }) }
}
