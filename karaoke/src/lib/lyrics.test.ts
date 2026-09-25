import { describe, expect, it } from 'vitest'
import { findActiveLine, lineProgress, parseLyrics } from './lyrics'

describe('parseLyrics', () => {
  it('parses LRC timestamps, sorting lines and ignoring metadata', () => {
    const lyrics = parseLyrics(`[ar:Someone]
[ti:Song]
[00:05.50] Second
[00:01.00] First
[01:02.123] Third`)
    expect(lyrics.kind).toBe('synced')
    expect(lyrics.lines).toEqual([
      { time: 1, text: 'First' },
      { time: 5.5, text: 'Second' },
      { time: 62.123, text: 'Third' },
    ])
  })

  it('expands lines with multiple timestamps (repeated chorus)', () => {
    const lyrics = parseLyrics('[00:10.00][00:30.00] Chorus\n[00:20.00] Verse')
    expect(lyrics.lines.map((l) => [l.time, l.text])).toEqual([
      [10, 'Chorus'],
      [20, 'Verse'],
      [30, 'Chorus'],
    ])
  })

  it('applies the [offset:] tag (positive = earlier) and clamps at zero', () => {
    const lyrics = parseLyrics('[offset:+500]\n[00:00.20] A\n[00:02.00] B')
    expect(lyrics.lines.map((l) => l.time)).toEqual([0, 1.5])
  })

  it('handles CRLF and keeps empty timed lines as instrumental breaks', () => {
    const lyrics = parseLyrics('[00:01.00] A\r\n[00:03.00]\r\n[00:05.00] B')
    expect(lyrics.lines.map((l) => l.text)).toEqual(['A', '', 'B'])
  })

  it('falls back to plain lyrics, collapsing repeated blank lines', () => {
    const lyrics = parseLyrics('Line one\nLine two\n\n\n\nLine three')
    expect(lyrics.kind).toBe('plain')
    expect(lyrics.lines.map((l) => l.text)).toEqual(['Line one', 'Line two', '', 'Line three'])
    expect(lyrics.lines.every((l) => l.time === null)).toBe(true)
  })
})

describe('findActiveLine', () => {
  const { lines } = parseLyrics('[00:01.00] A\n[00:03.00] B\n[00:05.00] C')

  it.each([
    [0, -1],
    [1, 0],
    [2.99, 0],
    [3, 1],
    [100, 2],
  ])('at %ss → %i', (time, expected) => {
    expect(findActiveLine(lines, time)).toBe(expected)
  })
})

describe('lineProgress', () => {
  const { lines } = parseLyrics('[00:02.00] A\n[00:04.00] B')

  it('interpolates between the line start and the next line', () => {
    expect(lineProgress(lines, 0, 3, 10)).toBeCloseTo(0.5)
  })

  it('uses the track duration for the last line', () => {
    expect(lineProgress(lines, 1, 7, 10)).toBeCloseTo(0.5)
  })

  it('returns 0 before the first line', () => {
    expect(lineProgress(lines, -1, 0, 10)).toBe(0)
  })
})
