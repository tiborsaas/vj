import { useRef, useEffect, useCallback } from 'react'
import { useGlobalStore, audioRefs } from '../engine/store'
import '../ui/ui.css'

const BAND_LABELS = ['BASS', 'LOW', 'MID', 'HIGH', 'TREBLE']

/**
 * AudioMonitor — floating panel showing EQ bars, waveform, beat indicators,
 * and a draggable beat threshold slider.
 */
export function AudioMonitor() {
    const audioMonitorOpen = useGlobalStore((s) => s.audioMonitorOpen)
    const toggleAudioMonitor = useGlobalStore((s) => s.toggleAudioMonitor)
    const beatSensitivity = useGlobalStore((s) => s.beatSensitivity)
    const setBeatSensitivity = useGlobalStore((s) => s.setBeatSensitivity)
    const audioGain = useGlobalStore((s) => s.audioGain)
    const setAudioGain = useGlobalStore((s) => s.setAudioGain)

    const bandsRef = useRef<HTMLDivElement>(null)
    const waveformCanvasRef = useRef<HTMLCanvasElement>(null)
    const beatDotRef = useRef<HTMLSpanElement>(null)
    const kickDotRef = useRef<HTMLSpanElement>(null)
    const hihatDotRef = useRef<HTMLSpanElement>(null)
    const ampRef = useRef<HTMLSpanElement>(null)
    const bandEls = useRef<HTMLDivElement[]>([])
    const rafRef = useRef<number>(0)

    // Animation loop for real-time updates (DOM reads from audioRefs)
    const animate = useCallback(() => {
        // Update band bars
        for (let i = 0; i < 5; i++) {
            const el = bandEls.current[i]
            if (el) {
                const h = Math.min(audioRefs.bands[i] * 100, 100)
                el.style.height = `${h}%`
                if (audioRefs.beat && i === 0) {
                    el.classList.add('audio-monitor__band--beat')
                } else {
                    el.classList.remove('audio-monitor__band--beat')
                }
            }
        }

        // Update beat indicators
        if (beatDotRef.current) {
            beatDotRef.current.className = `audio-monitor__dot ${audioRefs.beat ? 'audio-monitor__dot--active' : ''}`
        }
        if (kickDotRef.current) {
            kickDotRef.current.className = `audio-monitor__dot ${audioRefs.kick ? 'audio-monitor__dot--kick' : ''}`
        }
        if (hihatDotRef.current) {
            hihatDotRef.current.className = `audio-monitor__dot ${audioRefs.hihat ? 'audio-monitor__dot--hihat' : ''}`
        }

        // Update amplitude text
        if (ampRef.current) {
            ampRef.current.textContent = audioRefs.amplitude.toFixed(2)
        }

        // Draw waveform
        const canvas = waveformCanvasRef.current
        if (canvas) {
            const ctx = canvas.getContext('2d')
            if (ctx) {
                const w = canvas.width
                const h = canvas.height
                ctx.clearRect(0, 0, w, h)
                ctx.strokeStyle = 'rgba(123, 92, 255, 0.7)'
                ctx.lineWidth = 1
                ctx.beginPath()
                const step = 256 / w
                for (let x = 0; x < w; x++) {
                    const idx = Math.floor(x * step)
                    const y = (audioRefs.waveform[idx] + 1) * 0.5 * h
                    if (x === 0) ctx.moveTo(x, y)
                    else ctx.lineTo(x, y)
                }
                ctx.stroke()
            }
        }

        rafRef.current = requestAnimationFrame(animate)
    }, [])

    useEffect(() => {
        if (audioMonitorOpen) {
            rafRef.current = requestAnimationFrame(animate)
        }
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [audioMonitorOpen, animate])

    if (!audioMonitorOpen) return null

    return (
        <div className="audio-monitor">
            <div className="audio-monitor__header">
                <span>♫ Audio</span>
                <button className="audio-monitor__close" onClick={toggleAudioMonitor}>✕</button>
            </div>
            <div className="audio-monitor__body">
                {/* EQ Bands */}
                <div className="audio-monitor__bands" ref={bandsRef}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div
                            key={i}
                            className="audio-monitor__band"
                            ref={(el) => { if (el) bandEls.current[i] = el }}
                            style={{ height: '2%' }}
                        />
                    ))}
                </div>
                <div className="audio-monitor__labels">
                    {BAND_LABELS.map((label) => (
                        <span key={label} className="audio-monitor__label">{label}</span>
                    ))}
                </div>

                {/* Waveform */}
                <div className="audio-monitor__waveform">
                    <canvas ref={waveformCanvasRef} width={200} height={30} />
                </div>

                {/* Beat Indicators */}
                <div className="audio-monitor__indicators">
                    <div className="audio-monitor__indicator">
                        <span className="audio-monitor__dot" ref={beatDotRef} />
                        BEAT
                    </div>
                    <div className="audio-monitor__indicator">
                        <span className="audio-monitor__dot" ref={kickDotRef} />
                        KICK
                    </div>
                    <div className="audio-monitor__indicator">
                        <span className="audio-monitor__dot" ref={hihatDotRef} />
                        HH
                    </div>
                    <div className="audio-monitor__indicator">
                        AMP: <span ref={ampRef}>0.00</span>
                    </div>
                </div>

                {/* Beat Threshold */}
                <div className="audio-monitor__threshold">
                    <span className="audio-monitor__threshold-label">Threshold</span>
                    <input
                        type="range"
                        className="param-slider"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={beatSensitivity}
                        onChange={(e) => setBeatSensitivity(parseFloat(e.target.value))}
                    />
                    <span className="param-value">{beatSensitivity.toFixed(2)}</span>
                </div>

                {/* Gain */}
                <div className="audio-monitor__threshold" style={{ marginTop: '4px' }}>
                    <span className="audio-monitor__threshold-label">Gain</span>
                    <input
                        type="range"
                        className="param-slider"
                        min="0"
                        max="5"
                        step="0.1"
                        value={audioGain}
                        onChange={(e) => setAudioGain(parseFloat(e.target.value))}
                    />
                    <span className="param-value">{audioGain.toFixed(1)}</span>
                </div>
            </div>
        </div>
    )
}
