export interface LyricLine {
  /** Start time in seconds. `null` for unsynced (plain text) lyrics. */
  time: number | null
  text: string
}

export type Lyrics =
  | { kind: 'synced'; lines: LyricLine[] }
  | { kind: 'plain'; lines: LyricLine[] }

const TIMESTAMP = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g
const METADATA = /^\[([a-z]+):(.*)\]$/i

function toSeconds(min: string, sec: string, frac: string | undefined): number {
  const fraction = frac ? Number(frac) / 10 ** frac.length : 0
  return Number(min) * 60 + Number(sec) + fraction
}

/**
 * Parses lyrics in LRC format (`[mm:ss.xx] line`) into time-synced lines.
 * Text without any timestamp falls back to plain lyrics, which the
 * teleprompter scrolls at a constant speed across the track duration.
 */
export function parseLyrics(input: string): Lyrics {
  const rawLines = input.replace(/\r\n?/g, '\n').split('\n')
  const synced: LyricLine[] = []
  let offsetSeconds = 0
  let hasTimestamps = false

  for (const raw of rawLines) {
    const line = raw.trim()
    const meta = METADATA.exec(line)
    if (meta && !/^\d/.test(meta[1])) {
      if (meta[1].toLowerCase() === 'offset') {
        // LRC spec: positive offset shifts lyrics earlier, in milliseconds.
        const ms = Number(meta[2].trim())
        if (Number.isFinite(ms)) offsetSeconds = -ms / 1000
      }
      continue
    }

    const stamps = [...line.matchAll(TIMESTAMP)]
    if (stamps.length === 0) continue
    hasTimestamps = true

    const text = line.replace(TIMESTAMP, '').trim()
    for (const [, min, sec, frac] of stamps) {
      synced.push({ time: toSeconds(min, sec, frac), text })
    }
  }

  if (hasTimestamps) {
    const lines = synced
      .map((l) => ({ ...l, time: Math.max(0, (l.time ?? 0) + offsetSeconds) }))
      .sort((a, b) => a.time - b.time)
    return { kind: 'synced', lines }
  }

  const lines = rawLines
    .map((l) => l.trim())
    .filter((l, i, arr) => l !== '' || (i > 0 && arr[i - 1] !== ''))
    .map((text) => ({ time: null, text }))
  return { kind: 'plain', lines }
}

/** Index of the line being sung at `time`, or -1 before the first line. */
export function findActiveLine(lines: LyricLine[], time: number): number {
  let lo = 0
  let hi = lines.length - 1
  let result = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const t = lines[mid].time ?? 0
    if (t <= time) {
      result = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return result
}

/** Progress (0..1) through the active line, based on when the next line starts. */
export function lineProgress(lines: LyricLine[], index: number, time: number, duration: number): number {
  if (index < 0) return 0
  const start = lines[index].time ?? 0
  const end = lines[index + 1]?.time ?? (Number.isFinite(duration) && duration > start ? duration : start + 4)
  if (end <= start) return 1
  return Math.min(1, Math.max(0, (time - start) / (end - start)))
}
