// Zugriff auf die JSON-Dateien im Repo.
// Lesen: ohne Token über raw.githubusercontent.com (öffentlich, bis ~5 Minuten zwischengespeichert),
//        mit Token über die GitHub-API (immer aktuell).
// Schreiben: nur mit Token. Der Token bleibt im Browser (localStorage) auf deinem Gerät.
import { REPO } from './config.js'

const TOKEN_KEY = 'deal-radar.token'
export const getToken = () => localStorage.getItem(TOKEN_KEY) || ''
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t.trim()) : localStorage.removeItem(TOKEN_KEY))

const api = (path) => `https://api.github.com/repos/${REPO.owner}/${REPO.name}/${path}`
const headers = () => ({
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
})

// Inhalte kommen als Base64; so bleiben Umlaute korrekt
const decode = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, '')), (c) => c.charCodeAt(0)))
const encode = (text) => btoa(String.fromCharCode(...new TextEncoder().encode(text)))

/** sha pro Datei: GitHub braucht ihn beim Speichern, um Überschreiben fremder Änderungen zu verhindern */
const shas = {}

export async function loadJson(name) {
  const path = `data/${name}.json`
  if (getToken()) {
    const res = await fetch(`${api(`contents/${path}`)}?ref=${encodeURIComponent(REPO.branch)}`, { headers: headers(), cache: 'no-store' })
    if (res.status === 401) throw new Error('Der GitHub-Token ist ungültig oder abgelaufen. Bitte unter «Einstellungen» neu eintragen.')
    if (!res.ok) throw new Error(`${path} konnte nicht geladen werden (${res.status}).`)
    const json = await res.json()
    shas[path] = json.sha
    return JSON.parse(decode(json.content))
  }
  const res = await fetch(`https://raw.githubusercontent.com/${REPO.owner}/${REPO.name}/${REPO.branch}/${path}?t=${Date.now()}`)
  if (!res.ok) throw new Error(`${path} konnte nicht geladen werden (${res.status}).`)
  return res.json()
}

export async function saveJson(name, data, message) {
  if (!getToken()) throw new Error('Zum Speichern braucht die App deinen GitHub-Token (siehe «Einstellungen»).')
  const path = `data/${name}.json`
  if (!shas[path]) await loadJson(name)
  const res = await fetch(api(`contents/${path}`), {
    method: 'PUT',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: encode(JSON.stringify(data, null, 1) + '\n'), sha: shas[path], branch: REPO.branch }),
  })
  if (res.status === 409 || res.status === 422)
    throw new Error('Die Datei wurde inzwischen geändert (z. B. von der Preisprüfung). Bitte neu laden und nochmals versuchen.')
  if (!res.ok) throw new Error(`Speichern fehlgeschlagen (${res.status}): ${(await res.json()).message ?? ''}`)
  shas[path] = (await res.json()).content.sha
}

/** Eine Action von Hand starten (z. B. «Jetzt prüfen»). Braucht Token mit Recht «Actions: Read and write». */
export async function runWorkflow(file, inputs = {}) {
  if (!getToken()) throw new Error('Dafür braucht die App deinen GitHub-Token.')
  const res = await fetch(api(`actions/workflows/${file}/dispatches`), {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: REPO.branch, inputs }),
  })
  if (!res.ok) throw new Error(`Start fehlgeschlagen (${res.status}). Hat der Token das Recht «Actions: Read and write»?`)
}
