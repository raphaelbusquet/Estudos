import { useState, type ChangeEvent } from 'react'
import { DEMO_LYRICS, renderDemoTrack } from '../lib/demoTrack'

export interface SongSource {
  title: string
  trackUrl: string
  lyricsText: string
}

interface Props {
  onReady: (song: SongSource) => void
}

export function SetupPanel({ onReady }: Props) {
  const [trackFile, setTrackFile] = useState<File | null>(null)
  const [lyricsText, setLyricsText] = useState('')
  const [loadingDemo, setLoadingDemo] = useState(false)

  const onLyricsFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setLyricsText(await file.text())
  }

  const start = () => {
    if (!trackFile) return
    onReady({
      title: trackFile.name.replace(/\.[^.]+$/, ''),
      trackUrl: URL.createObjectURL(trackFile),
      lyricsText,
    })
  }

  const startDemo = async () => {
    setLoadingDemo(true)
    try {
      const blob = await renderDemoTrack()
      onReady({ title: 'Estrela do Show', trackUrl: URL.createObjectURL(blob), lyricsText: DEMO_LYRICS })
    } finally {
      setLoadingDemo(false)
    }
  }

  return (
    <section className="setup">
      <p className="lead">
        Escolha o instrumental e cole a letra. Use o formato <strong>LRC</strong> (<code>[00:12.30] verso</code>)
        para a letra acompanhar a música linha a linha; texto simples rola em velocidade constante.
      </p>

      <label className="field">
        <span>Instrumental (MP3, M4A, WAV…)</span>
        <input type="file" accept="audio/*" onChange={(e) => setTrackFile(e.target.files?.[0] ?? null)} />
      </label>

      <label className="field">
        <span>Letra</span>
        <textarea
          rows={10}
          value={lyricsText}
          onChange={(e) => setLyricsText(e.target.value)}
          placeholder={'[00:05.00] Primeira linha\n[00:09.50] Segunda linha'}
        />
      </label>

      <label className="field field--inline">
        <span>ou carregar arquivo .lrc / .txt</span>
        <input type="file" accept=".lrc,.txt,text/plain" onChange={onLyricsFile} />
      </label>

      <div className="row">
        <button className="btn btn--primary" disabled={!trackFile || !lyricsText.trim()} onClick={start}>
          Ir para o palco
        </button>
        <button className="btn" disabled={loadingDemo} onClick={startDemo}>
          {loadingDemo ? 'Gerando…' : 'Testar com música demo'}
        </button>
      </div>
    </section>
  )
}
