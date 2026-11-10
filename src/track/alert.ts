/** Warnung beim Abweichen von der Route: Vibration (wo unterstützt) und kurzer Doppelton. */
let audio: AudioContext | null = null

/** Muss einmal aus einer Nutzeraktion aufgerufen werden, sonst blockiert der Browser den Ton. */
export function unlockAudio() {
  try {
    audio ??= new AudioContext()
    void audio.resume()
  } catch {
    audio = null
  }
}

export function offRouteAlert() {
  // iOS Safari kennt navigator.vibrate nicht; dort bleibt nur der Ton.
  navigator.vibrate?.([300, 150, 300])
  if (!audio) return
  for (const [i, freq] of [660, 440].entries()) {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.frequency.value = freq
    gain.gain.value = 0.25
    osc.connect(gain).connect(audio.destination)
    osc.start(audio.currentTime + i * 0.28)
    osc.stop(audio.currentTime + i * 0.28 + 0.22)
  }
}
