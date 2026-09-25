import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchLyrics, type LyricsSearchResult } from './lrclib'

const result = (over: Partial<LyricsSearchResult>): LyricsSearchResult => ({
  id: 1,
  trackName: 'Song',
  artistName: 'Artist',
  albumName: null,
  duration: 180,
  instrumental: false,
  plainLyrics: 'la la',
  syncedLyrics: null,
  ...over,
})

afterEach(() => vi.unstubAllGlobals())

describe('searchLyrics', () => {
  it('builds the query, drops instrumentals and ranks synced results first', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          result({ id: 1 }),
          result({ id: 2, instrumental: true, plainLyrics: null }),
          result({ id: 3, syncedLyrics: '[00:01.00] la' }),
        ]),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const results = await searchLyrics({ track: ' Song ', artist: 'Artist' })

    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.pathname).toBe('/api/search')
    expect(url.searchParams.get('track_name')).toBe('Song')
    expect(url.searchParams.get('artist_name')).toBe('Artist')
    expect(results.map((r) => r.id)).toEqual([3, 1])
  })

  it('throws on HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })))
    await expect(searchLyrics({ track: 'x' })).rejects.toThrow('HTTP 500')
  })
})
