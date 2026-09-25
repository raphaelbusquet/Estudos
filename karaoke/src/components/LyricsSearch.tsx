import { useState, type FormEvent } from 'react'
import { searchLyrics, type LyricsSearchResult } from '../lib/lrclib'
import { formatTime } from '../lib/media'

interface Props {
  onSelect: (lyrics: string) => void
}

export function LyricsSearch({ onSelect }: Props) {
  const [track, setTrack] = useState('')
  const [artist, setArtist] = useState('')
  const [results, setResults] = useState<LyricsSearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!track.trim()) return
    setLoading(true)
    setError(null)
    try {
      setResults(await searchLyrics({ track, artist }))
    } catch (err) {
      setResults(null)
      setError(err instanceof Error ? err.message : 'Falha na busca de letras.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <details className="search">
      <summary>Buscar letra sincronizada (LRCLIB)</summary>
      <form className="search__form" onSubmit={submit}>
        <input placeholder="Música" value={track} onChange={(e) => setTrack(e.target.value)} required />
        <input placeholder="Artista (opcional)" value={artist} onChange={(e) => setArtist(e.target.value)} />
        <button className="btn btn--small" disabled={loading}>
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {results?.length === 0 && <p className="hint">Nada encontrado.</p>}
      {results && results.length > 0 && (
        <ul className="search__results">
          {results.slice(0, 10).map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => onSelect(r.syncedLyrics ?? r.plainLyrics ?? '')}>
                <strong>{r.trackName}</strong> — {r.artistName}
                <span className="hint">
                  {' '}
                  · {formatTime(r.duration)} · {r.syncedLyrics ? '⏱ sincronizada' : 'texto simples'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="hint">Escolha a versão com a mesma duração do seu instrumental para a letra ficar no tempo.</p>
    </details>
  )
}
