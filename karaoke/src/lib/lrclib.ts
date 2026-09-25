/**
 * Client for LRCLIB (https://lrclib.net), a free, open database of
 * time-synced lyrics. Requests go straight from the user's browser.
 */
export interface LyricsSearchResult {
  id: number
  trackName: string
  artistName: string
  albumName: string | null
  duration: number
  instrumental: boolean
  plainLyrics: string | null
  syncedLyrics: string | null
}

const BASE_URL = 'https://lrclib.net/api'

export async function searchLyrics(
  { track, artist }: { track: string; artist?: string },
  signal?: AbortSignal,
): Promise<LyricsSearchResult[]> {
  const params = new URLSearchParams({ track_name: track.trim() })
  if (artist?.trim()) params.set('artist_name', artist.trim())

  const res = await fetch(`${BASE_URL}/search?${params}`, { signal })
  if (!res.ok) throw new Error(`Falha na busca de letras (HTTP ${res.status}).`)
  const results = (await res.json()) as LyricsSearchResult[]

  // Synced lyrics first: they're what drives the teleprompter.
  return results
    .filter((r) => !r.instrumental && (r.syncedLyrics || r.plainLyrics))
    .sort((a, b) => Number(!!b.syncedLyrics) - Number(!!a.syncedLyrics))
}
