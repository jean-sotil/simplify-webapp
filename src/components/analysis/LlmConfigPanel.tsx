'use client'

import { useState, useEffect } from 'react'

export interface LlmConfig {
  model: string
  temperature: number
  strictness: 'strict' | 'balanced' | 'permissive'
}

const DEFAULT_CONFIG: LlmConfig = {
  model: 'openai/gpt-4o',
  temperature: 0,
  strictness: 'balanced',
}

const MODELS = [
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'anthropic/claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
]

interface Props {
  projectId: string
  isAdmin: boolean
}

export function LlmConfigPanel({ projectId, isAdmin }: Props) {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<LlmConfig>(DEFAULT_CONFIG)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/llm-config?projectId=${projectId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.config) setConfig({ ...DEFAULT_CONFIG, ...data.config })
        }
      } catch { /* use defaults */ }
    }
    load()
  }, [projectId])

  if (!isAdmin) return null

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/llm-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, config }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ }
    setSaving(false)
  }

  function handleReset() {
    setConfig(DEFAULT_CONFIG)
  }

  return (
    <section className="border rounded-md" style={{ borderColor: 'var(--color-hairline)' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
        style={{ color: 'var(--color-ink)' }}
      >
        <span className="flex items-center gap-2">
          <span>⚙️</span>
          <span>LLM Configuration</span>
        </span>
        <span className="text-xs" style={{ color: 'var(--color-mute)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t" style={{ borderColor: 'var(--color-hairline)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {/* Model */}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-mute)' }}>
                Model
              </label>
              <select
                value={config.model}
                onChange={e => setConfig({ ...config, model: e.target.value })}
                className="w-full border rounded-sm px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
              >
                {MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Temperature */}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-mute)' }}>
                Temperature: {config.temperature.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={config.temperature}
                onChange={e => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-mute)' }}>
                <span>Deterministic</span>
                <span>Creative</span>
              </div>
            </div>

            {/* Strictness */}
            <div className="sm:col-span-2">
              <label className="text-xs font-medium block mb-2" style={{ color: 'var(--color-mute)' }}>
                Strictness
              </label>
              <div className="flex gap-2 flex-wrap">
                {([
                  { value: 'strict', label: 'Strict', desc: 'Only clear & explicit evidence' },
                  { value: 'balanced', label: 'Balanced', desc: 'Reasonable demonstration' },
                  { value: 'permissive', label: 'Permissive', desc: 'Any reasonable indication' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setConfig({ ...config, strictness: opt.value })}
                    className={`flex-1 border rounded-sm px-3 py-2 text-xs transition-colors ${
                      config.strictness === opt.value ? 'border-[var(--color-primary)] bg-blue-50' : ''
                    }`}
                    style={{
                      borderColor: config.strictness === opt.value ? 'var(--color-primary)' : 'var(--color-hairline)',
                      color: 'var(--color-ink)',
                    }}
                  >
                    <div className="font-medium">{opt.label}</div>
                    <div className="mt-0.5" style={{ color: 'var(--color-mute)' }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t" style={{ borderColor: 'var(--color-hairline)' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="text-xs px-4 py-2 rounded-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs px-4 py-2 rounded-sm border hover:bg-gray-50"
              style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-ink)' }}
            >
              Reset defaults
            </button>
            {saved && (
              <span className="text-xs" style={{ color: 'var(--color-accent-green)' }}>✓ Saved</span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
