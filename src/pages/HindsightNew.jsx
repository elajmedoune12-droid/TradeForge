import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Plus, Check, Upload, ChevronLeft, ExternalLink } from 'lucide-react'
import { uploadImage, supabase } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'

const DEFAULT_TIMEFRAMES = ['Monthly', 'Weekly', 'Daily', 'H4', 'H2', 'H1', 'M30', 'M15', 'M5', 'M3', 'M1']
const DEFAULT_MARKETS    = ['EURUSD', 'GBPUSD', 'DXY', 'NAS100', 'S&P 500', 'XAUUSD', 'XAGUSD', 'USDJPY']
const TF_KEY  = 'tf_custom'
const MKT_KEY = 'mkt_custom'

function loadExtra(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function saveExtra(key, arr) { localStorage.setItem(key, JSON.stringify(arr)) }

// ── Field wrapper ─────────────────────────────────────────
const Field = ({ label, children }) => (
  <div>
    {label && <label className="label">{label}</label>}
    {children}
  </div>
)

// ── TimeframeInput — champ libre + suggestions rapides ────
function TimeframeInput({ value, onChange }) {
  return (
    <div className="space-y-1.5">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="ex: M30, H2, H7, M45…"
        className="w-full text-xs"
      />
      <div className="flex flex-wrap gap-1">
        {DEFAULT_TIMEFRAMES.map(tf => (
          <button
            key={tf}
            type="button"
            onClick={() => onChange(tf)}
            className="px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all active:scale-95"
            style={value === tf
              ? { background: 'rgba(247,183,49,0.15)', color: '#F7B731', borderColor: 'rgba(247,183,49,0.4)' }
              : { background: 'var(--surface-4)', color: 'var(--forge-muted)', borderColor: 'var(--border-soft)' }
            }
          >
            {tf}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Tag group ─────────────────────────────────────────────
function TagGroup({ label, options, selected, onToggle, onAdd }) {
  const [adding, setAdding] = useState(false)
  const [input, setInput]   = useState('')

  const handleAdd = () => {
    const val = input.trim()
    if (val && !options.includes(val)) { onAdd(val); onToggle(val) }
    setInput(''); setAdding(false)
  }

  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const active = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-all select-none active:scale-95"
              style={active
                ? { background: 'rgba(247,183,49,0.15)', color: '#F7B731', borderColor: 'rgba(247,183,49,0.45)', boxShadow: '0 0 10px rgba(247,183,49,0.2)' }
                : { background: 'var(--surface-4)', color: 'var(--forge-muted)', borderColor: 'var(--border-soft)' }
              }
            >
              {active && <Check size={10} className="inline mr-1" />}{opt}
            </button>
          )
        })}

        {adding ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Ex: EURGBP"
              className="w-20 text-xs"
            />
            <button type="button" onClick={handleAdd} className="text-forge-accent"><Check size={13} /></button>
            <button type="button" onClick={() => setAdding(false)} className="text-forge-muted"><X size={13} /></button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium border border-dashed transition-all"
            style={{ borderColor: 'var(--border-medium)', color: 'var(--forge-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.color = 'var(--forge-muted)' }}
          >
            <Plus size={10} className="inline mr-1" />Autre
          </button>
        )}
      </div>
    </Field>
  )
}

// ── AddCapturePanel ───────────────────────────────────────
function AddCapturePanel({ onAdd }) {
  const [mode,  setMode]  = useState('image')
  const [url,   setUrl]   = useState('')
  const [label, setLabel] = useState('')
  const [tf,    setTf]    = useState('')

  const handleAddLink = () => {
    if (!url.trim()) return
    onAdd({ type: 'link', url: url.trim(), label: label.trim() || tf || 'TradingView', timeframe: tf })
    setUrl(''); setLabel('')
  }

  return (
    <div className="rounded-xl p-3 space-y-3 mb-2"
      style={{ background: 'var(--surface-3)', border: '1px solid var(--border-soft)' }}>

      {/* Mode toggle */}
      <div className="flex gap-1">
        {[['image', 'Image'], ['link', 'Lien TradingView']].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setMode(v)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all"
            style={mode === v
              ? { background: 'rgba(247,183,49,0.12)', color: '#F7B731', borderColor: 'rgba(247,183,49,0.3)' }
              : { background: 'var(--surface-3)', color: 'var(--forge-muted)', borderColor: 'var(--border-soft)' }
            }>
            {l}
          </button>
        ))}
      </div>

      {/* Timeframe libre */}
      <div>
        <p className="text-[10px] mb-1.5" style={{ color: 'var(--forge-muted)' }}>Timeframe</p>
        <TimeframeInput value={tf} onChange={setTf} />
      </div>

      {mode === 'image' ? (
        <label
          className="flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer text-xs transition-colors"
          style={{ border: '2px dashed var(--border-medium)', background: 'var(--surface-2)', color: 'var(--forge-muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}
        >
          <Upload size={13} /> Choisir une image
          <input type="file" accept="image/*" multiple className="hidden"
            onChange={e => {
              Array.from(e.target.files).forEach(file => {
                onAdd({ type: 'file', file, preview: URL.createObjectURL(file), timeframe: tf })
              })
              e.target.value = ''
            }} />
        </label>
      ) : (
        <div className="space-y-2">
          <input value={url} onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddLink())}
            placeholder="https://www.tradingview.com/chart/..."
            className="w-full text-xs" />
          <div className="flex gap-2">
            <input value={label} onChange={e => setLabel(e.target.value)}
              placeholder="Label (ex: Entrée H4)" className="flex-1 text-xs" />
            <button type="button" onClick={handleAddLink} disabled={!url.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
              style={{ background: 'rgba(247,183,49,0.12)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.25)' }}>
              <Check size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── CaptureItem ───────────────────────────────────────────
function CaptureItem({ cap, onRemove, onChangeTF }) {
  return (
    <div className="rounded-xl p-2.5 space-y-2"
      style={{ background: 'var(--surface-4)', border: '1px solid var(--border-soft)' }}>
      <div className="flex items-center gap-2">
        {cap.type === 'link' ? (
          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.2)' }}>
            <ExternalLink size={16} style={{ color: '#58a6ff' }} />
          </div>
        ) : (
          <img src={cap.preview || cap.url} alt=""
            className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {cap.type === 'link' && (
            <a href={cap.url} target="_blank" rel="noopener noreferrer"
              className="text-xs truncate block mb-1 hover:underline" style={{ color: '#58a6ff' }}>
              {cap.label || cap.url}
            </a>
          )}
          <p className="text-[10px] mb-1.5" style={{ color: 'var(--forge-muted)' }}>Timeframe</p>
          <TimeframeInput value={cap.timeframe || ''} onChange={onChangeTF} />
        </div>
        <button type="button" onClick={onRemove}
          className="text-forge-muted hover:text-forge-red transition-colors flex-shrink-0 self-start">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────
export default function HindsightNew() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [customMkt, setCustomMkt]       = useState(() => loadExtra(MKT_KEY))
  const allMkt = [...DEFAULT_MARKETS, ...customMkt]

  const [selectedMkt, setSelectedMkt]   = useState([])
  const [captures, setCaptures]         = useState([])
  const [notes, setNotes]               = useState('')
  const [saving, setSaving]             = useState(false)
  const [progress, setProgress]         = useState('')
  const [showAddPanel, setShowAddPanel] = useState(false)

  const toggleMkt = (m) => setSelectedMkt(s => s.includes(m) ? s.filter(x => x !== m) : [...s, m])
  const addMkt    = (m) => { const next = [...customMkt, m]; setCustomMkt(next); saveExtra(MKT_KEY, next) }

  const addCapture    = (cap) => { setCaptures(c => [...c, cap]); setShowAddPanel(false) }
  const removeCapture = (i)   => setCaptures(c => c.filter((_, idx) => idx !== i))
  const updateTF      = (i, tf) => setCaptures(c => c.map((cap, idx) => idx === i ? { ...cap, timeframe: tf } : cap))

  const handleSave = async () => {
    if (!captures.length && !notes.trim() && !selectedMkt.length) return
    setSaving(true)
    try {
      const uploadedImages = []
      for (let i = 0; i < captures.length; i++) {
        const cap = captures[i]
        if (cap.type === 'file') {
          setProgress(`Upload ${i + 1}/${captures.length}…`)
          const path = `${user.id}/hindsights/${Date.now()}_${i}_${cap.file.name}`
          const url  = await uploadImage(cap.file, path)
          uploadedImages.push({ url, path, timeframe: cap.timeframe || null })
        } else {
          uploadedImages.push({ url: cap.url, timeframe: cap.timeframe || null, label: cap.label || '', isLink: true })
        }
      }
      setProgress('Sauvegarde…')
      await supabase.from('hindsights_standalone').insert({
        user_id:    user.id,
        timeframes: [...new Set(uploadedImages.map(i => i.timeframe).filter(Boolean))],
        markets:    selectedMkt,
        notes:      notes.trim() || null,
        images:     uploadedImages,
      })
      navigate('/app/hindsights')
    } catch (err) {
      alert('Erreur: ' + err.message)
    } finally {
      setSaving(false); setProgress('')
    }
  }

  const isEmpty = !captures.length && !notes.trim() && !selectedMkt.length

  return (
    <div className="page">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="transition-colors"
          style={{ color: 'var(--forge-muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}>
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Nouveau Hindsight
        </h1>
      </div>

      <div className="space-y-4">

        {/* ── Marchés ── */}
        <div className="card">
          <p className="section-title mb-3">Marchés</p>
          <TagGroup label="" options={allMkt} selected={selectedMkt} onToggle={toggleMkt} onAdd={addMkt} />
        </div>

        {/* ── Captures & liens ── */}
        <div className="card">
          <p className="section-title mb-3">
            Captures & liens
            <span className="normal-case tracking-normal font-normal ml-1" style={{ color: 'var(--forge-muted)' }}>
              (optionnel)
            </span>
          </p>

          {captures.length > 0 && (
            <div className="space-y-2 mb-3">
              {captures.map((cap, i) => (
                <CaptureItem key={i} cap={cap}
                  onRemove={() => removeCapture(i)}
                  onChangeTF={tf => updateTF(i, tf)} />
              ))}
            </div>
          )}

          {showAddPanel && <AddCapturePanel onAdd={addCapture} />}

          <button type="button" onClick={() => setShowAddPanel(v => !v)}
            className="w-full flex items-center justify-center gap-2 rounded-xl p-3.5 transition-all text-sm"
            style={{
              border: `2px dashed ${showAddPanel ? 'rgba(247,183,49,0.3)' : 'var(--border-medium)'}`,
              background: 'var(--surface-2)', color: 'var(--forge-muted)',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}>
            {showAddPanel ? <X size={15} /> : <Upload size={15} />}
            {showAddPanel ? 'Fermer' : 'Ajouter image ou lien'}
          </button>
        </div>

        {/* ── Notes ── */}
        <div className="card">
          <p className="section-title mb-3">
            Notes libres
            <span className="normal-case tracking-normal font-normal ml-1" style={{ color: 'var(--forge-muted)' }}>
              (optionnel)
            </span>
          </p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Observations sur le marché, structure, biais, confluences…"
            className="w-full resize-none" style={{ minHeight: 120 }} />
        </div>

        {/* ── Submit ── */}
        <button onClick={handleSave} disabled={saving || isEmpty}
          className="btn-primary w-full py-3.5 text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none">
          {saving ? (progress || 'Enregistrement...') : 'Sauvegarder le Hindsight'}
        </button>

      </div>
    </div>
  )
}