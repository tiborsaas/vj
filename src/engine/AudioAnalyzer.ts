import { audioRefs } from './store'

/**
 * AudioAnalyzer — Web Audio API wrapper for real-time frequency/beat analysis.
 * Designed to run outside React's render cycle for zero re-render overhead.
 */
export class AudioAnalyzer {
  private context: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaStreamAudioSourceNode | AudioBufferSourceNode | MediaElementAudioSourceNode | null = null
  private freqData: Uint8Array = new Uint8Array(0)
  private timeData: Uint8Array = new Uint8Array(0)
  private _isInitialized = false

  // Beat detection state
  private beatCooldown = 0
  private beatThreshold = 0.6
  private prevBassEnergy = 0
  private kickCooldown = 0
  private snareCooldown = 0
  private hihatCooldown = 0

  // Smoothing
  private smoothedBands = new Float32Array(5)
  private smoothing = 0.8
  private gain = 1.0

  get isInitialized() {
    return this._isInitialized
  }

  async initMicrophone(): Promise<void> {
    try {
      // Request mic first so the permission dialog fires before context creation
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })

      // AudioContext must be created and resumed; browsers suspend it when
      // created outside a direct user-gesture handler.
      this.context = new AudioContext()
      this.analyser = this.context.createAnalyser()
      this.analyser.fftSize = 2048
      this.analyser.smoothingTimeConstant = 0.0  // We do our own smoothing
      this.source = this.context.createMediaStreamSource(stream)
      this.source.connect(this.analyser)
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount)
      this.timeData = new Uint8Array(this.analyser.frequencyBinCount)
      this._isInitialized = true

      // Try to resume immediately — works if a user gesture already occurred
      if (this.context.state === 'suspended') {
        await this.context.resume().catch(() => {})
      }

      // Fallback: resume on the next user interaction if still suspended
      if (this.context.state === 'suspended') {
        const resume = () => {
          this.context?.resume()
          window.removeEventListener('click', resume)
          window.removeEventListener('keydown', resume)
          window.removeEventListener('touchstart', resume)
        }
        window.addEventListener('click', resume, { once: true })
        window.addEventListener('keydown', resume, { once: true })
        window.addEventListener('touchstart', resume, { once: true })
        console.info('VOID: AudioContext suspended — will resume on next interaction')
      }
    } catch (err) {
      console.warn('Microphone access denied, running in demo mode:', err)
      this._isInitialized = false
    }
  }

  async initAudioElement(audio: HTMLAudioElement): Promise<void> {
    this.context = new AudioContext()
    this.analyser = this.context.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.6
    this.source = this.context.createMediaElementSource(audio)
    this.source.connect(this.analyser)
    this.analyser.connect(this.context.destination)
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount)
    this.timeData = new Uint8Array(this.analyser.frequencyBinCount)
    this._isInitialized = true
  }

  setSmoothing(value: number) {
    this.smoothing = value
  }

  setGain(value: number) {
    this.gain = value
  }

  setBeatSensitivity(value: number) {
    this.beatThreshold = value
  }

  /**
   * Call this every frame (inside useFrame). 
   * Updates audioRefs directly — no React state involved.
   */
  analyze(delta: number): void {
    if (!this._isInitialized || !this.analyser) {
      // Demo mode: generate fake audio data from time
      this.analyzeDemoMode(delta)
      return
    }

    this.analyser.getByteFrequencyData(this.freqData as Uint8Array<ArrayBuffer>)
    this.analyser.getByteTimeDomainData(this.timeData as Uint8Array<ArrayBuffer>)

    const binCount = this.freqData.length
    const bandSize = Math.floor(binCount / 5)

    // Extract 5 frequency bands (0-1 normalized)
    for (let b = 0; b < 5; b++) {
      let sum = 0
      const start = b * bandSize
      const end = start + bandSize
      for (let i = start; i < end; i++) {
        sum += this.freqData[i]
      }
      const raw = (sum / bandSize / 255) * this.gain
      // Exponential smoothing
      this.smoothedBands[b] = this.smoothedBands[b] * this.smoothing + raw * (1 - this.smoothing)
    }

    // Copy to shared refs
    audioRefs.bands.set(this.smoothedBands)

    // Overall amplitude
    let ampSum = 0
    for (let i = 0; i < binCount; i++) {
      ampSum += this.freqData[i]
    }
    audioRefs.amplitude = (ampSum / binCount / 255) * this.gain

    // Waveform (downsample to 256)
    const step = Math.floor(this.timeData.length / 256)
    for (let i = 0; i < 256; i++) {
      audioRefs.waveform[i] = (this.timeData[i * step] - 128) / 128
    }

    // Beat detection on bass band
    const bassEnergy = this.smoothedBands[0]
    this.beatCooldown = Math.max(0, this.beatCooldown - delta)
    this.kickCooldown = Math.max(0, this.kickCooldown - delta)
    this.snareCooldown = Math.max(0, this.snareCooldown - delta)
    this.hihatCooldown = Math.max(0, this.hihatCooldown - delta)

    const bassRise = bassEnergy - this.prevBassEnergy
    audioRefs.beat = false
    audioRefs.kick = false
    audioRefs.snare = false
    audioRefs.hihat = false

    if (bassRise > this.beatThreshold * 0.3 && this.beatCooldown <= 0 && bassEnergy > this.beatThreshold * 0.5) {
      audioRefs.beat = true
      this.beatCooldown = 0.15
    }

    // Kick = strong bass transient
    if (bassRise > this.beatThreshold * 0.4 && this.kickCooldown <= 0 && bassEnergy > this.beatThreshold * 0.6) {
      audioRefs.kick = true
      this.kickCooldown = 0.12
    }

    // Snare = mid band spike
    const midEnergy = this.smoothedBands[2]
    if (midEnergy > this.beatThreshold * 0.7 && this.snareCooldown <= 0) {
      audioRefs.snare = true
      this.snareCooldown = 0.1
    }

    // Hihat = treble spike
    const trebleEnergy = this.smoothedBands[4]
    if (trebleEnergy > this.beatThreshold * 0.5 && this.hihatCooldown <= 0) {
      audioRefs.hihat = true
      this.hihatCooldown = 0.06
    }

    this.prevBassEnergy = bassEnergy
  }

  /**
   * Demo mode — synthetic audio data when no mic is available.
   * Creates rhythmic, evolving patterns to test visuals.
   */
  private demoTime = 0
  private analyzeDemoMode(delta: number): void {
    this.demoTime += delta

    const t = this.demoTime
    const bps = 130 / 60 // ~130 BPM typical techno

    // Synthetic bass pulse
    const beatPhase = (t * bps) % 1.0
    const kick = Math.pow(Math.max(0, 1.0 - beatPhase * 4.0), 3.0)

    // Offbeat hi-hat
    const hihatPhase = ((t * bps + 0.5) % 1.0)
    const hihat = Math.pow(Math.max(0, 1.0 - hihatPhase * 8.0), 5.0)

    // Slow-evolving mid
    const mid = 0.3 + 0.2 * Math.sin(t * 0.7) + 0.1 * Math.sin(t * 1.3)

    audioRefs.bands[0] = kick * 0.8 + 0.1 // bass
    audioRefs.bands[1] = mid * 0.6         // lowMid
    audioRefs.bands[2] = mid * 0.4 + kick * 0.2 // mid
    audioRefs.bands[3] = hihat * 0.3 + 0.1 // highMid
    audioRefs.bands[4] = hihat * 0.5        // treble

    audioRefs.amplitude = kick * 0.4 + mid * 0.3 + hihat * 0.1 + 0.1

    // Beat detection
    audioRefs.beat = beatPhase < 0.05
    audioRefs.kick = beatPhase < 0.03
    audioRefs.snare = false
    audioRefs.hihat = hihatPhase < 0.02

    // Synthetic waveform
    for (let i = 0; i < 256; i++) {
      const phase = i / 256.0
      audioRefs.waveform[i] = Math.sin(phase * Math.PI * 2 * 4 + t) * kick * 0.5
        + Math.sin(phase * Math.PI * 2 * 16 + t * 3) * hihat * 0.3
    }
  }

  dispose(): void {
    if (this.source) {
      this.source.disconnect()
    }
    if (this.context) {
      this.context.close()
    }
    this._isInitialized = false
  }
}

// Singleton instance
export const audioAnalyzer = new AudioAnalyzer()
