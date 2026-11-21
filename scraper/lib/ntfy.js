// Push-Benachrichtigung über ntfy.sh. Das «Topic» (der Kanalname) ist geheim und kommt aus
// dem GitHub-Secret NTFY_TOPIC: Wer es kennt, kann dir Nachrichten schicken bzw. mitlesen.
export async function notify({ title, body, priority = 3, tags = [], click }) {
  const topic = process.env.NTFY_TOPIC
  if (!topic) {
    console.log(`(ohne NTFY_TOPIC, nicht gesendet) ${title} – ${body}`)
    return false
  }
  const res = await fetch(process.env.NTFY_SERVER ?? 'https://ntfy.sh/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // JSON statt Header: so funktionieren Umlaute und Emojis im Titel
    body: JSON.stringify({ topic, title, message: body, priority, tags, ...(click ? { click } : {}) }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`ntfy ${res.status}: ${await res.text()}`)
  return true
}
