import { useEffect, useState } from 'react'
import { SetupPanel, type SongSource } from './components/SetupPanel'
import { Stage } from './components/Stage'

export default function App() {
  const [song, setSong] = useState<SongSource | null>(null)

  useEffect(() => () => void (song && URL.revokeObjectURL(song.trackUrl)), [song])

  return (
    <main className="app">
      <h1 className="brand">Karaokê</h1>
      {song ? <Stage key={song.trackUrl} song={song} onExit={() => setSong(null)} /> : <SetupPanel onReady={setSong} />}
    </main>
  )
}
