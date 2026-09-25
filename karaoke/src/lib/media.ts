export type RecordingMode = 'audio' | 'video'

const CANDIDATES: Record<RecordingMode, string[]> = {
  // Safari only records MP4; Chromium/Firefox prefer WebM.
  video: [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ],
  audio: ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'],
}

/** First container/codec the browser's MediaRecorder supports, or '' to let it decide. */
export function pickMimeType(mode: RecordingMode): string {
  if (typeof MediaRecorder === 'undefined') return ''
  return CANDIDATES[mode].find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

export function fileExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

export function isRecordingSupported(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  )
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
