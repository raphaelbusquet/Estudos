/**
 * Renders a short royalty-free backing track (I–V–vi–IV pad + bass + click)
 * so the app can be tried without bringing your own instrumental.
 */
const BPM = 96
const BEAT = 60 / BPM
const BAR = BEAT * 4
const INTRO_BARS = 2
const PROGRESSION = [
  [60, 64, 67], // C
  [55, 59, 62], // G
  [57, 60, 64], // Am
  [53, 57, 60], // F
]
const LOOPS = 3

const midiToHz = (note: number) => 440 * 2 ** ((note - 69) / 12)

export const DEMO_DURATION = BAR * (INTRO_BARS + PROGRESSION.length * LOOPS) + 1

function lrcTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = (seconds % 60).toFixed(2).padStart(5, '0')
  return `[${m.toString().padStart(2, '0')}:${s}]`
}

const DEMO_LINES = [
  'Liga o microfone, a noite vai começar',
  'Cada verso na tela te ensina a cantar',
  'Segue a luz da letra, não precisa decorar',
  'Respira no compasso e deixa a voz soltar',
  'Canta pra câmera, canta pro seu quarto',
  'O palco é seu, mesmo sem holofote',
  'Grava esse momento, aperta o play de novo',
  'Hoje você é a estrela do show',
  'Uô-ô, uô-ô',
  'Hoje você é a estrela do show',
  '',
  'Fim ♪',
]

/** Two lines per bar-pair, starting after the intro. */
export const DEMO_LYRICS = [
  '[ti:Estrela do Show (demo)]',
  ...DEMO_LINES.map((text, i) => `${lrcTime(INTRO_BARS * BAR + i * BAR)} ${text}`),
].join('\n')

export async function renderDemoTrack(): Promise<Blob> {
  const sampleRate = 44100
  const ctx = new OfflineAudioContext(2, Math.ceil(DEMO_DURATION * sampleRate), sampleRate)
  const master = ctx.createGain()
  master.gain.value = 0.5
  master.connect(ctx.destination)

  const tone = (freq: number, start: number, length: number, type: OscillatorType, peak: number) => {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    env.gain.setValueAtTime(0, start)
    env.gain.linearRampToValueAtTime(peak, start + 0.02)
    env.gain.exponentialRampToValueAtTime(0.001, start + length)
    osc.connect(env).connect(master)
    osc.start(start)
    osc.stop(start + length + 0.05)
  }

  // Count-in clicks during the intro, then chords.
  for (let beat = 0; beat < INTRO_BARS * 4; beat++) {
    tone(beat % 4 === 0 ? 1760 : 1320, beat * BEAT, 0.08, 'square', 0.15)
  }

  for (let loop = 0; loop < LOOPS; loop++) {
    PROGRESSION.forEach((chord, i) => {
      const barStart = (INTRO_BARS + loop * PROGRESSION.length + i) * BAR
      chord.forEach((note) => tone(midiToHz(note), barStart, BAR * 0.95, 'triangle', 0.12))
      for (let beat = 0; beat < 4; beat++) {
        tone(midiToHz(chord[0] - 24), barStart + beat * BEAT, BEAT * 0.9, 'sawtooth', 0.08)
      }
    })
  }

  return encodeWav(await ctx.startRendering())
}

function encodeWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels
  const length = buffer.length * channels * 2
  const view = new DataView(new ArrayBuffer(44 + length))
  const writeString = (offset: number, s: string) =>
    [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + length, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, buffer.sampleRate, true)
  view.setUint32(28, buffer.sampleRate * channels * 2, true)
  view.setUint16(32, channels * 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, length, true)

  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c))
  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < channels; c++) {
      const sample = Math.max(-1, Math.min(1, data[c][i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }
  return new Blob([view], { type: 'audio/wav' })
}
