import { pickMimeType, type RecordingMode } from './media'

export interface Recording {
  url: string
  blob: Blob
  mimeType: string
  mode: RecordingMode
  durationSeconds: number
  createdAt: number
}

export interface MixSettings {
  /** Backing track volume in the headphones/speakers (0..1). */
  monitorVolume: number
  /** Include the backing track in the recorded file. */
  includeTrack: boolean
  /** Backing track level inside the recording (0..1). */
  trackLevel: number
  /** Voice level inside the recording (0..2). */
  voiceLevel: number
  /**
   * Round-trip latency compensation. The mic hears the singer later than the
   * track was sent to the output, so the track is delayed by this amount in
   * the recording to keep voice and instrumental aligned.
   */
  latencyMs: number
}

export const DEFAULT_MIX: MixSettings = {
  monitorVolume: 0.9,
  includeTrack: true,
  trackLevel: 0.6,
  voiceLevel: 1,
  latencyMs: 120,
}

const MAX_LATENCY_S = 1

/**
 * Owns the Web Audio graph and the MediaRecorder:
 *
 *   <audio> ─ trackSource ─┬─ monitorGain ──────────────────────▶ speakers
 *                          └─ trackDelay ─ trackMixGain ─┐
 *   mic ─── micSource ──────────────────── voiceGain ────┴─▶ recordDest ─▶ MediaRecorder
 *   camera (video mode) ─────────────────────────────────────────────────▶ MediaRecorder
 *
 * The mic is never routed to the speakers, avoiding feedback.
 */
export class KaraokeEngine {
  readonly audio: HTMLAudioElement

  private ctx: AudioContext | null = null
  private monitorGain: GainNode | null = null
  private trackDelay: DelayNode | null = null
  private trackMixGain: GainNode | null = null
  private voiceGain: GainNode | null = null
  private recordDest: MediaStreamAudioDestinationNode | null = null

  private input: MediaStream | null = null
  private inputMode: RecordingMode | null = null
  private micSource: MediaStreamAudioSourceNode | null = null

  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private recordStartedAt = 0

  private mix: MixSettings = { ...DEFAULT_MIX }

  constructor() {
    this.audio = new Audio()
    this.audio.preload = 'auto'
  }

  loadTrack(url: string) {
    this.audio.pause()
    this.audio.src = url
    this.audio.load()
  }

  /** Must be called from a user gesture (autoplay policy). */
  async ensureContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const ctx = new AudioContext({ latencyHint: 'interactive' })
      const trackSource = ctx.createMediaElementSource(this.audio)

      this.monitorGain = ctx.createGain()
      this.trackDelay = ctx.createDelay(MAX_LATENCY_S)
      this.trackMixGain = ctx.createGain()
      this.voiceGain = ctx.createGain()
      this.recordDest = ctx.createMediaStreamDestination()

      trackSource.connect(this.monitorGain).connect(ctx.destination)
      trackSource.connect(this.trackDelay).connect(this.trackMixGain).connect(this.recordDest)
      this.voiceGain.connect(this.recordDest)

      this.ctx = ctx
      this.applyMix()
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume()
    return this.ctx
  }

  /** Browser-reported output latency, a reasonable starting point for `latencyMs`. */
  estimateLatencyMs(): number | null {
    if (!this.ctx) return null
    // `latency` is Chromium-only and not yet in lib.dom.
    const settings = this.input?.getAudioTracks()[0]?.getSettings() as { latency?: number } | undefined
    const trackLatency = settings?.latency ?? 0
    const seconds = (this.ctx.outputLatency || 0) + this.ctx.baseLatency + trackLatency
    return seconds > 0 ? Math.round(seconds * 1000) : null
  }

  setMix(partial: Partial<MixSettings>) {
    this.mix = { ...this.mix, ...partial }
    this.applyMix()
  }

  private applyMix() {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    const ramp = (param: AudioParam, value: number) => param.setTargetAtTime(value, now, 0.02)
    ramp(this.monitorGain!.gain, this.mix.monitorVolume)
    ramp(this.trackMixGain!.gain, this.mix.includeTrack ? this.mix.trackLevel : 0)
    ramp(this.voiceGain!.gain, this.mix.voiceLevel)
    this.trackDelay!.delayTime.value = Math.min(MAX_LATENCY_S, Math.max(0, this.mix.latencyMs / 1000))
  }

  /** Opens the microphone (and camera in video mode). Returns the stream for previewing. */
  async openInput(mode: RecordingMode): Promise<MediaStream> {
    if (this.input && this.inputMode === mode) return this.input
    this.closeInput()
    const ctx = await this.ensureContext()

    const stream = await navigator.mediaDevices.getUserMedia({
      // Processing meant for calls hurts singing: AGC pumps, noise suppression
      // eats sustained notes, and echo cancellation fights the backing track.
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      video:
        mode === 'video'
          ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
          : false,
    })

    this.input = stream
    this.inputMode = mode
    this.micSource = ctx.createMediaStreamSource(stream)
    this.micSource.connect(this.voiceGain!)
    return stream
  }

  closeInput() {
    this.micSource?.disconnect()
    this.micSource = null
    this.input?.getTracks().forEach((t) => t.stop())
    this.input = null
    this.inputMode = null
  }

  get isRecording() {
    return this.recorder?.state === 'recording'
  }

  /** Starts recording and plays the backing track from the beginning. */
  async startRecording(): Promise<void> {
    if (!this.input || !this.inputMode || !this.recordDest) {
      throw new Error('Input not open. Call openInput() first.')
    }
    if (this.isRecording) return
    await this.ensureContext()

    const tracks = [...this.recordDest.stream.getAudioTracks()]
    if (this.inputMode === 'video') tracks.push(...this.input.getVideoTracks())
    const stream = new MediaStream(tracks)

    const mimeType = pickMimeType(this.inputMode)
    this.recorder = new MediaRecorder(stream, {
      ...(mimeType && { mimeType }),
      audioBitsPerSecond: 192_000,
      ...(this.inputMode === 'video' && { videoBitsPerSecond: 4_000_000 }),
    })
    this.chunks = []
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }

    this.audio.currentTime = 0
    this.recorder.start(1000)
    this.recordStartedAt = performance.now()
    await this.audio.play()
  }

  /** Stops recording and playback, resolving with the recorded file. */
  stopRecording(): Promise<Recording> {
    const recorder = this.recorder
    const mode = this.inputMode
    if (!recorder || recorder.state === 'inactive' || !mode) {
      return Promise.reject(new Error('Not recording.'))
    }
    this.audio.pause()

    return new Promise((resolve, reject) => {
      recorder.onerror = () => reject(new Error('Recording failed.'))
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || pickMimeType(mode) || `${mode}/webm`
        const blob = new Blob(this.chunks, { type: mimeType })
        this.chunks = []
        this.recorder = null
        resolve({
          blob,
          mimeType,
          mode,
          url: URL.createObjectURL(blob),
          durationSeconds: (performance.now() - this.recordStartedAt) / 1000,
          createdAt: Date.now(),
        })
      }
      recorder.stop()
    })
  }

  async play() {
    await this.ensureContext()
    await this.audio.play()
  }

  pause() {
    this.audio.pause()
  }

  seek(seconds: number) {
    this.audio.currentTime = seconds
  }

  dispose() {
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop()
    this.recorder = null
    this.closeInput()
    this.audio.pause()
    this.audio.removeAttribute('src')
    void this.ctx?.close()
    this.ctx = null
  }
}
