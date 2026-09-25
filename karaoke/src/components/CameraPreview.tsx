import { useEffect, useRef } from 'react'

export function CameraPreview({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream
  }, [stream])

  // Muted: the mic must never be played back through the speakers.
  return <video ref={ref} className="camera" autoPlay playsInline muted />
}
