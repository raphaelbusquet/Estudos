import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { findActiveLine, lineProgress, type Lyrics } from '../lib/lyrics'

interface Props {
  lyrics: Lyrics
  currentTime: number
  duration: number
  overlay?: boolean
}

/** Keeps the active line centered; plain lyrics scroll linearly with the track. */
export function Teleprompter({ lyrics, currentTime, duration, overlay = false }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const [offset, setOffset] = useState(0)

  const synced = lyrics.kind === 'synced'
  const active = synced ? findActiveLine(lyrics.lines, currentTime) : -1
  const progress = synced ? lineProgress(lyrics.lines, active, currentTime, duration) : 0

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const list = listRef.current
    if (!viewport || !list) return
    const center = viewport.clientHeight / 2

    if (synced) {
      const el = list.children[Math.max(0, active)] as HTMLElement | undefined
      if (el) setOffset(center - (el.offsetTop + el.offsetHeight / 2))
      return
    }
    const ratio = Number.isFinite(duration) && duration > 0 ? currentTime / duration : 0
    setOffset(center - ratio * list.scrollHeight)
  }, [synced, active, currentTime, duration])

  return (
    <div ref={viewportRef} className={`teleprompter${overlay ? ' teleprompter--overlay' : ''}`}>
      <ol
        ref={listRef}
        className="teleprompter__lines"
        style={{ transform: `translateY(${offset}px)` }}
        aria-live="off"
      >
        {lyrics.lines.map((line, i) => {
          const state = !synced ? '' : i === active ? 'is-active' : i < active ? 'is-past' : ''
          return (
            <li
              key={i}
              className={`teleprompter__line ${state}`}
              style={i === active ? ({ '--progress': `${progress * 100}%` } as CSSProperties) : undefined}
            >
              {line.text || '♪'}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
