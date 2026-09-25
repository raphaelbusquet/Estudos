import { fileExtension, formatTime } from '../lib/media'
import type { Recording } from '../lib/KaraokeEngine'

interface Props {
  recording: Recording
  title: string
  onDiscard: () => void
}

export function RecordingResult({ recording, title, onDiscard }: Props) {
  const filename = `${slugify(title) || 'karaoke'}-${recording.createdAt}.${fileExtension(recording.mimeType)}`

  const share = async () => {
    const file = new File([recording.blob], filename, { type: recording.mimeType })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title }).catch(() => {})
    }
  }
  const canShare = typeof navigator.canShare === 'function'

  return (
    <section className="result">
      <h2>Sua gravação · {formatTime(recording.durationSeconds)}</h2>
      {recording.mode === 'video' ? (
        <video className="result__media" src={recording.url} controls playsInline />
      ) : (
        <audio className="result__media" src={recording.url} controls />
      )}
      <div className="row">
        <a className="btn btn--primary" href={recording.url} download={filename}>
          Baixar
        </a>
        {canShare && (
          <button className="btn" onClick={share}>
            Compartilhar
          </button>
        )}
        <button className="btn btn--ghost" onClick={onDiscard}>
          Descartar
        </button>
      </div>
    </section>
  )
}

function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
