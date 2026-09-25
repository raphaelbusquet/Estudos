import type { MixSettings } from '../lib/KaraokeEngine'

interface Props {
  mix: MixSettings
  estimatedLatencyMs: number | null
  onChange: (partial: Partial<MixSettings>) => void
}

export function MixPanel({ mix, estimatedLatencyMs, onChange }: Props) {
  return (
    <details className="mix">
      <summary>Ajustes de áudio</summary>
      <Slider
        label="Volume do instrumental (fone)"
        value={mix.monitorVolume}
        max={1}
        onChange={(v) => onChange({ monitorVolume: v })}
      />
      <label className="field field--inline">
        <input
          type="checkbox"
          checked={mix.includeTrack}
          onChange={(e) => onChange({ includeTrack: e.target.checked })}
        />
        <span>Incluir instrumental na gravação</span>
      </label>
      {mix.includeTrack && (
        <Slider
          label="Instrumental na gravação"
          value={mix.trackLevel}
          max={1}
          onChange={(v) => onChange({ trackLevel: v })}
        />
      )}
      <Slider label="Voz na gravação" value={mix.voiceLevel} max={2} onChange={(v) => onChange({ voiceLevel: v })} />
      <Slider
        label={`Compensação de latência: ${mix.latencyMs} ms`}
        value={mix.latencyMs}
        max={500}
        step={5}
        onChange={(v) => onChange({ latencyMs: v })}
        format={false}
      />
      {estimatedLatencyMs !== null && (
        <button className="btn btn--small btn--ghost" onClick={() => onChange({ latencyMs: estimatedLatencyMs })}>
          Usar estimativa do dispositivo ({estimatedLatencyMs} ms)
        </button>
      )}
      <p className="hint">Se a voz ficar atrasada em relação ao instrumental na gravação, aumente a compensação.</p>
    </details>
  )
}

interface SliderProps {
  label: string
  value: number
  max: number
  step?: number
  format?: boolean
  onChange: (value: number) => void
}

function Slider({ label, value, max, step = 0.01, format = true, onChange }: SliderProps) {
  return (
    <label className="field">
      <span>
        {label}
        {format && ` · ${Math.round(value * 100)}%`}
      </span>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
