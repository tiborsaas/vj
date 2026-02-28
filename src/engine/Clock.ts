import { clockRefs } from './store'

/**
 * Clock — high-resolution musical time tracking.
 * Updated every frame, reads from clockRefs (mutable, no re-renders).
 */
export class Clock {
  private bpm = 130
  private startTime = 0
  private totalElapsed = 0

  constructor(bpm = 130) {
    this.bpm = bpm
    this.startTime = performance.now() / 1000
  }

  setBPM(bpm: number) {
    this.bpm = bpm
  }

  /**
   * Call every frame with delta time.
   * Updates clockRefs in place.
   */
  update(delta: number, speed: number = 1.0): void {
    this.totalElapsed += delta * speed

    const beatsPerSecond = this.bpm / 60
    const totalBeats = this.totalElapsed * beatsPerSecond

    clockRefs.elapsed = this.totalElapsed
    clockRefs.delta = delta
    clockRefs.beat = Math.floor(totalBeats)
    clockRefs.bar = Math.floor(totalBeats / 4)
    clockRefs.phrase = Math.floor(totalBeats / 32)
    clockRefs.beatProgress = totalBeats % 1.0
  }

  reset(): void {
    this.totalElapsed = 0
    this.startTime = performance.now() / 1000
  }
}

export const clock = new Clock()
