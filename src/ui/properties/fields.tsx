// ─── Shared Property Field Primitives ────────────────────────────────────────
// Used by all type-specific blocks inside PropertiesPanel.

import type { ShaderUniformDef } from '../../types/layers'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}

interface Vec2Props {
  label: string
  value: [number, number]
  min?: number
  max?: number
  step?: number
  labels?: [string, string]
  onChange: (v: [number, number]) => void
}

interface Vec3Props {
  label: string
  value: [number, number, number]
  min?: number
  max?: number
  step?: number
  labels?: [string, string, string]
  onChange: (v: [number, number, number]) => void
}

interface ColorProps {
  label: string
  value: string
  onChange: (v: string) => void
}

interface ToggleProps {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}

interface SelectProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}

interface NumberInputProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
}

interface UniformsEditorProps {
  label?: string
  uniforms: Record<string, ShaderUniformDef>
  onChange: (key: string, value: number) => void
}

// ─── SectionTitle ────────────────────────────────────────────────────────────

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="prop-section-title">{children}</div>
}

// ─── SliderField ─────────────────────────────────────────────────────────────

export function SliderField({ label, value, min, max, step = 0.01, onChange }: SliderProps) {
  const decimals = step < 0.1 ? 3 : step < 1 ? 2 : 1
  return (
    <div className="param-row">
      <span className="param-label">{label}</span>
      <input
        type="range"
        className="param-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span className="param-value">{value.toFixed(decimals)}</span>
    </div>
  )
}

// ─── Vec2Field ───────────────────────────────────────────────────────────────

export function Vec2Field({ label, value, min = -10, max = 10, step = 0.01, labels = ['X', 'Y'], onChange }: Vec2Props) {
  return (
    <div className="param-group">
      <div className="param-group-label">{label}</div>
      {([0, 1] as const).map((i) => (
        <div key={i} className="param-row">
          <span className="param-label param-label--indent">{labels[i]}</span>
          <input
            type="range"
            className="param-slider"
            min={min}
            max={max}
            step={step}
            value={value[i]}
            onChange={(e) => {
              const next = [...value] as [number, number]
              next[i] = parseFloat(e.target.value)
              onChange(next)
            }}
          />
          <span className="param-value">{value[i].toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Vec3Field ───────────────────────────────────────────────────────────────

export function Vec3Field({ label, value, min = -10, max = 10, step = 0.01, labels = ['X', 'Y', 'Z'], onChange }: Vec3Props) {
  return (
    <div className="param-group">
      <div className="param-group-label">{label}</div>
      {([0, 1, 2] as const).map((i) => (
        <div key={i} className="param-row">
          <span className="param-label param-label--indent">{labels[i]}</span>
          <input
            type="range"
            className="param-slider"
            min={min}
            max={max}
            step={step}
            value={value[i]}
            onChange={(e) => {
              const next = [...value] as [number, number, number]
              next[i] = parseFloat(e.target.value)
              onChange(next)
            }}
          />
          <span className="param-value">{value[i].toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── ColorField ──────────────────────────────────────────────────────────────

export function ColorField({ label, value, onChange }: ColorProps) {
  return (
    <div className="param-row">
      <span className="param-label">{label}</span>
      <div className="param-color-wrap">
        <input
          type="color"
          className="param-color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="param-value">{value}</span>
      </div>
    </div>
  )
}

// ─── ToggleField ─────────────────────────────────────────────────────────────

export function ToggleField({ label, value, onChange }: ToggleProps) {
  return (
    <div className="param-row">
      <span className="param-label">{label}</span>
      <button
        className={`param-toggle ${value ? 'param-toggle--on' : ''}`}
        onClick={() => onChange(!value)}
        aria-label={label}
      />
    </div>
  )
}

// ─── SelectField ─────────────────────────────────────────────────────────────

export function SelectField<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  return (
    <div className="param-row">
      <span className="param-label">{label}</span>
      <select
        className="param-select"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ─── NumberField ─────────────────────────────────────────────────────────────

export function NumberField({ label, value, min, max, step = 1, onChange }: NumberInputProps) {
  return (
    <div className="param-row">
      <span className="param-label">{label}</span>
      <input
        type="number"
        className="param-number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}

// ─── TextareaField ───────────────────────────────────────────────────────────

export function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="param-col">
      <span className="param-label">{label}</span>
      <textarea
        className="param-textarea"
        value={value}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

// ─── TextInputField ──────────────────────────────────────────────────────────

export function TextInputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="param-row">
      <span className="param-label">{label}</span>
      <input
        type="text"
        className="param-text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

// ─── UniformsEditor ─────────────────────────────────────────────────────────
// Auto-generates sliders from a Record<string, ShaderUniformDef>.
// Only renders numeric uniforms (number type with min/max).

export function UniformsEditor({ label, uniforms, onChange }: UniformsEditorProps) {
  const entries = Object.entries(uniforms).filter(
    ([, def]) => typeof def.value === 'number' && def.min !== undefined && def.max !== undefined,
  )

  if (entries.length === 0) return null

  return (
    <div className="param-group">
      {label && <div className="param-group-label">{label}</div>}
      {entries.map(([key, def]) => (
        <SliderField
          key={key}
          label={def.label ?? key}
          value={def.value as number}
          min={def.min!}
          max={def.max!}
          step={def.step ?? 0.01}
          onChange={(v) => onChange(key, v)}
        />
      ))}
    </div>
  )
}
