import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_MIX, KaraokeEngine, type MixSettings, type Recording } from '../lib/KaraokeEngine'
import { parseLyrics } from '../lib/lyrics'
import { formatTime, isRecordingSupported, type RecordingMode } from '../lib/media'
import { usePlaybackTime } from '../hooks/usePlaybackTime'
import { CameraPreview } from './CameraPreview'
import { MixPanel } from './MixPanel'
import { RecordingResult } from './RecordingResult'
import { Teleprompter } from './Teleprompter'
import type { SongSource } from './SetupPanel'

type Status = 'idle' | 'countdown' | 'recording' | 'finishing'

const COUNTDOWN_SECONDS = 3

interface StageProps {
  song: SongSource
  onExit: () => void
}

/**
 * Owns the engine lifecycle. Created inside an effect (not useMemo) because an
 * <audio> element can be bound to a MediaElementSourceNode only once, and
 * StrictMode mounts effects twice.
 */
export function Stage(props: StageProps) {
  const [engine, setEngine] = useState<KaraokeEngine | null>(null)

  useEffect(() => {
    const instance = new KaraokeEngine()
    instance.loadTrack(props.song.trackUrl)
    // Syncing with an external resource (Web Audio graph) — setState here is intended.
    // oxlint-disable-next-line react/set-state-in-effect
    setEngine(instance)
    return () => instance.dispose()
  }, [props.song.trackUrl])

  return engine ? <StageView {...props} engine={engine} /> : null
}

function StageView({ song, onExit, engine }: StageProps & { engine: KaraokeEngine }) {
  const lyrics = useMemo(() => parseLyrics(song.lyricsText), [song.lyricsText])
  const { currentTime, duration, playing } = usePlaybackTime(engine.audio)

  const [mode, setMode] = useState<RecordingMode>('audio')
  const [inputStream, setInputStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [countdown, setCountdown] = useState(0)
  const [recording, setRecording] = useState<Recording | null>(null)
  const [mix, setMix] = useState<MixSettings>(DEFAULT_MIX)
  const [estimatedLatency, setEstimatedLatency] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancelCountdown = useRef<() => void>(() => {})

  useEffect(() => () => cancelCountdown.current(), [])

  useEffect(() => () => void (recording && URL.revokeObjectURL(recording.url)), [recording])

  const updateMix = (partial: Partial<MixSettings>) => {
    setMix((m) => ({ ...m, ...partial }))
    engine.setMix(partial)
  }

  const openInput = async (next: RecordingMode) => {
    setError(null)
    try {
      const stream = await engine.openInput(next)
      setMode(next)
      setInputStream(stream)
      setEstimatedLatency(engine.estimateLatencyMs())
      return true
    } catch (e) {
      setInputStream(null)
      setError(describeMediaError(e))
      return false
    }
  }

  const finish = useCallback(async () => {
    if (!engine.isRecording) return
    setStatus('finishing')
    try {
      // Let the latency-delayed tail of the voice reach the recorder.
      await new Promise((r) => setTimeout(r, mix.latencyMs))
      setRecording(await engine.stopRecording())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setStatus('idle')
    }
  }, [engine, mix.latencyMs])

  useEffect(() => {
    engine.audio.addEventListener('ended', finish)
    return () => engine.audio.removeEventListener('ended', finish)
  }, [engine, finish])

  const record = async () => {
    if (!inputStream && !(await openInput(mode))) return
    engine.pause()
    engine.seek(0)
    setRecording(null)
    setStatus('countdown')

    let remaining = COUNTDOWN_SECONDS
    setCountdown(remaining)
    const timer = setInterval(async () => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining > 0) return
      clearInterval(timer)
      try {
        await engine.startRecording()
        setStatus('recording')
      } catch (e) {
        setError(describeMediaError(e))
        setStatus('idle')
      }
    }, 1000)
    cancelCountdown.current = () => {
      clearInterval(timer)
      setStatus('idle')
    }
  }

  const togglePractice = async () => {
    setError(null)
    if (playing) return engine.pause()
    try {
      await engine.play()
    } catch (e) {
      setError(describeMediaError(e))
    }
  }

  const busy = status !== 'idle'
  const showCamera = mode === 'video' && inputStream

  return (
    <section className="stage">
      <header className="stage__header">
        <button className="btn btn--ghost btn--small" disabled={busy} onClick={onExit}>
          ← Trocar música
        </button>
        <h2>{song.title}</h2>
        <div className="segmented" role="radiogroup" aria-label="Tipo de gravação">
          {(['audio', 'video'] as const).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={mode === m}
              className={mode === m ? 'is-selected' : ''}
              disabled={busy}
              onClick={() => void openInput(m)}
            >
              {m === 'audio' ? '🎤 Áudio' : '🎥 Vídeo'}
            </button>
          ))}
        </div>
      </header>

      <div className={`screen${showCamera ? ' screen--video' : ''}`}>
        {showCamera && <CameraPreview stream={inputStream} />}
        <Teleprompter lyrics={lyrics} currentTime={currentTime} duration={duration} overlay={!!showCamera} />
        {status === 'countdown' && <div className="countdown">{countdown}</div>}
        {status === 'recording' && <div className="rec-badge">● REC</div>}
      </div>

      <div className="transport">
        <span className="time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <input
          className="seek"
          type="range"
          min={0}
          max={Number.isFinite(duration) ? duration : 0}
          step={0.1}
          value={currentTime}
          disabled={busy}
          onChange={(e) => engine.seek(Number(e.target.value))}
          aria-label="Posição"
        />
      </div>

      <div className="row row--center">
        {status === 'idle' && (
          <>
            <button className="btn" onClick={togglePractice}>
              {playing ? '⏸ Pausar' : '▶ Ensaiar'}
            </button>
            <button className="btn btn--record" disabled={!isRecordingSupported()} onClick={record}>
              ● Gravar {mode === 'video' ? 'vídeo' : 'áudio'}
            </button>
          </>
        )}
        {status === 'countdown' && (
          <button className="btn" onClick={() => cancelCountdown.current()}>
            Cancelar
          </button>
        )}
        {status === 'recording' && (
          <button className="btn btn--record" onClick={finish}>
            ■ Parar gravação
          </button>
        )}
        {status === 'finishing' && <span className="hint">Finalizando…</span>}
      </div>

      {!isRecordingSupported() && <p className="error">Este navegador não suporta gravação.</p>}
      {error && <p className="error">{error}</p>}
      <p className="hint">🎧 Use fone de ouvido: sem ele o microfone capta o instrumental e a gravação fica com eco.</p>

      <MixPanel mix={mix} estimatedLatencyMs={estimatedLatency} onChange={updateMix} />

      {recording && <RecordingResult recording={recording} title={song.title} onDiscard={() => setRecording(null)} />}
    </section>
  )
}

function describeMediaError(e: unknown): string {
  if (e instanceof DOMException) {
    if (e.name === 'NotAllowedError') return 'Permissão negada. Libere o microfone/câmera nas configurações do navegador.'
    if (e.name === 'NotFoundError') return 'Nenhum microfone ou câmera encontrado.'
    if (e.name === 'NotReadableError') return 'O dispositivo está em uso por outro app.'
    if (e.name === 'SecurityError') return 'Gravação exige HTTPS (ou localhost).'
  }
  return e instanceof Error ? e.message : String(e)
}
