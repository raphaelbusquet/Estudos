import { useEffect, useState } from 'react'

export interface PlaybackState {
  currentTime: number
  duration: number
  playing: boolean
}

/** Tracks an <audio> element's clock at display refresh rate while playing. */
export function usePlaybackTime(audio: HTMLAudioElement): PlaybackState {
  const [state, setState] = useState<PlaybackState>(() => read(audio))

  useEffect(() => {
    let frame = 0
    const sync = () => setState(read(audio))
    const tick = () => {
      sync()
      if (!audio.paused) frame = requestAnimationFrame(tick)
    }
    const onPlay = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(tick)
    }

    const events = ['pause', 'seeked', 'loadedmetadata', 'durationchange', 'ended', 'emptied'] as const
    events.forEach((e) => audio.addEventListener(e, sync))
    audio.addEventListener('play', onPlay)
    if (!audio.paused) onPlay()

    return () => {
      cancelAnimationFrame(frame)
      events.forEach((e) => audio.removeEventListener(e, sync))
      audio.removeEventListener('play', onPlay)
    }
  }, [audio])

  return state
}

function read(audio: HTMLAudioElement): PlaybackState {
  return { currentTime: audio.currentTime, duration: audio.duration, playing: !audio.paused }
}
