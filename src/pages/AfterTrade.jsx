import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Upload, X, Link, Image, ExternalLink, Check } from 'lucide-react'
import { getTradeById, upsertHindsight, uploadImage } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'
import { TIMEFRAMES } from '../utils'

// ── Field wrapper ────────────────────────────────────────
const Field = ({ label, required, children }) => (
  <div>
    <label className="label">
      {label}
      {required && <span className="text-forge-red ml-0.5">*</span>}
    </label>
    {children}
  </div>
)

// ── Tag pill ─────────────────────────────────────────────
function TagPill({ tag, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border"
      style={{
        background: 'rgba(247,183,49,0.10)',
        color: '#F7B731',
        borderColor: 'rgba(247,183,49,0.3)',
      }}
    >
      #{tag}
      <button
        type="button"
        onClick={onRemove}
        className="transition-colors hover:text-forge-red"
        style={{ color: 'var(--forge-muted)' }}
      >
        <X size={10} />
      </button>
    </span>
  )
}

// ── CaptureItem ──────────────────────────────────────────
function CaptureItem({ cap, onRemove, onTimeframeChange }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl p-2"
      style={{ background: 'var(--surface-4)', border: '1px solid var(--border-soft)' }}
    >
      {cap.type === 'link' ? (
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.2)' }}
        >
          <ExternalLink size={16} style={{ color: '#58a6ff' }} />
        </div>
      ) : (
        <img
          src={cap.preview || cap.url}
          alt=""
          className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        {cap.type === 'link' && (
          <a
            href={cap.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs truncate block mb-1 hover:underline"
            style={{ color: '#58a6ff' }}
          >
            {cap.label || cap.url}
          </a>
        )}
        <select
          value={cap.timeframe}
          onChange={e => onTimeframeChange(e.target.value)}
          className="w-full text-xs py-1.5"
        >
          {TIMEFRAMES.map(tf => <option key={tf}>{tf}</option>)}
        </select>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="transition-colors flex-shrink-0 hover:text-forge-red"
        style={{ color: 'var(--forge-muted)' }}
      >
        <X size={16} />
      </button>
    </div>
  )
}

// ── AddCapturePanel ──────────────────────────────────────
function AddCapturePanel({ onAdd }) {
  const [mode, setMode]   = useState('image')
  const [url, setUrl]     = useState('')
  const [label, setLabel] = useState('')
  const [tf, setTf]       = useState('Daily')

  const handleAddLink = () => {
    if (!url.trim()) return
    onAdd({ type: 'link', url: url.trim(), label: label.trim() || tf, timeframe: tf })
    setUrl('')
    setLabel('')
  }

  return (
    <div
      className="rounded-xl p-3 space-y-2 mb-2"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-soft)' }}
    >
      {/* Mode toggle */}
      <div className="flex gap-1">
        {[['image', 'Image'], ['link', 'Lien TradingView']].map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setMode(v)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all"
            style={mode === v
              ? { background: 'rgba(247,183,49,0.12)', color: '#F7B731', borderColor: 'rgba(247,183,49,0.3)' }
              : { background: 'var(--surface-3)', color: 'var(--forge-muted)', borderColor: 'var(--border-soft)' }
            }
          >
            {l}
          </button>
        ))}
      </div>

      {/* Timeframe */}
      <div>
        <p className="text-[10px] mb-1" style={{ color: 'var(--forge-muted)' }}>Timeframe</p>
        <select value={tf} onChange={e => setTf(e.target.value)} className="w-full text-xs py-1.5">
          {TIMEFRAMES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {mode === 'image' ? (
        <label
          className="flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer text-xs transition-colors hover-text-primary"
          style={{
            border: '2px dashed var(--border-medium)',
            background: 'var(--surface-1)',
            color: 'var(--forge-muted)',
          }}
        >
          <Upload size={13} /> Choisir une image
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => {
              Array.from(e.target.files).forEach(file => {
                onAdd({ type: 'file', file, preview: URL.createObjectURL(file), timeframe: tf })
              })
              e.target.value = ''
            }}
          />
        </label>
      ) : (
        <div className="space-y-2">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.tradingview.com/chart/..."
            className="w-full text-xs"
          />
          <div className="flex gap-2">
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Label (ex: Entrée H4)"
              className="flex-1 text-xs"
            />
            <button
              type="button"
              onClick={handleAddLink}
              disabled={!url.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
              style={{ background: 'rgba(247,183,49,0.12)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.25)' }}
            >
              <Check size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────
export default function AfterTrade() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [trade, setTrade]             = useState(null)
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)

  const [form, setForm] = useState({
    main_error: '',
    lesson: '',
    rule: '',
    notes: '',
  })

  const [captures, setCaptures]         = useState([])
  const [existingCaps, setExistingCaps] = useState([])
  const [removedCaps, setRemovedCaps]   = useState([])
  const [showAddPanel, setShowAddPanel] = useState(false)

  const [tagInput, setTagInput] = useState('')
  const [tags, setTags]         = useState([])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── Load ─────────────────────────────────────────────
  useEffect(() => {
    getTradeById(id).then(t => {
      setTrade(t)
      if (t.hindsight?.[0]) {
        const h = t.hindsight[0]
        setForm({
          main_error: h.main_error || '',
          lesson:     h.lesson     || '',
          rule:       h.rule       || '',
          notes:      h.notes      || '',
        })
        if (h.tags?.length) setTags(h.tags)
        if (h.images?.length) {
          setExistingCaps(h.images.map(img => ({
            type:      img.path ? 'file' : 'link',
            url:       img.url,
            preview:   img.url,
            timeframe: img.timeframe || 'Daily',
            label:     img.label || '',
            path:      img.path || null,
          })))
        }
      }
    }).finally(() => setLoading(false))
  }, [id])

  // ── Captures handlers ────────────────────────────────
  const addCapture = (cap) => { setCaptures(c => [...c, cap]); setShowAddPanel(false) }
  const removeNew  = (i)   => setCaptures(c => c.filter((_, idx) => idx !== i))
  const removeExisting = (cap) => {
    setExistingCaps(c => c.filter(x => x.url !== cap.url))
    if (cap.path) setRemovedCaps(r => [...r, cap.path])
  }
  const updateNew      = (i, tf) => setCaptures(c => c.map((cap, idx) => idx === i ? { ...cap, timeframe: tf } : cap))
  const updateExisting = (i, tf) => setExistingCaps(c => c.map((cap, idx) => idx === i ? { ...cap, timeframe: tf } : cap))

  // ── Tags ─────────────────────────────────────────────
  const handleTagKey = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const t = tagInput.trim().replace(/,$/, '')
      if (!tags.includes(t)) setTags(ts => [...ts, t])
      setTagInput('')
    }
  }

  // ── Save ─────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.main_error || !form.lesson || !form.rule) {
      alert('Les champs Erreur, Leçon et Règle sont obligatoires.')
      return
    }
    setSaving(true)
    try {
      const newUploaded = []
      for (const cap of captures) {
        if (cap.type === 'file' && cap.file) {
          const path = `${user.id}/hindsight/${id}/${cap.timeframe}_${Date.now()}_${cap.file.name}`
          const url = await uploadImage(cap.file, path)
          newUploaded.push({ url, timeframe: cap.timeframe, path, label: cap.label || '' })
        } else if (cap.type === 'link') {
          newUploaded.push({ url: cap.url, timeframe: cap.timeframe, label: cap.label || cap.timeframe })
        }
      }

      const finalImages = [
        ...existingCaps.map(c => ({
          url: c.url,
          timeframe: c.timeframe,
          label: c.label || '',
          ...(c.path ? { path: c.path } : {}),
        })),
        ...newUploaded,
      ]

      await upsertHindsight({
        trade_id:   id,
        user_id:    user.id,
        main_error: form.main_error,
        lesson:     form.lesson,
        rule:       form.rule,
        notes:      form.notes || null,
        tags,
        images:     finalImages,
      })

      navigate(-1)
    } catch (err) {
      alert('Erreur: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="page flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-forge-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="page">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="transition-colors hover-text-primary"
          style={{ color: 'var(--forge-muted)' }}
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>After Trade</h1>
      </div>

      {trade && (
        <p className="text-xs mb-4 -mt-4 ml-9" style={{ color: 'var(--forge-muted)' }}>
          {trade.market} · {trade.date}
        </p>
      )}

      <p className="text-xs mb-4" style={{ color: 'var(--forge-muted)' }}>
        Les champs marqués <span className="text-forge-red">*</span> sont obligatoires.
      </p>

      <form onSubmit={handleSave} className="space-y-4">

        {/* ── 1. Analyse ── */}
        <div className="card space-y-4">
          <p className="section-title mb-0">Analyse</p>

          <Field label="Erreur principale" required>
            <input
              value={form.main_error}
              onChange={e => set('main_error', e.target.value)}
              placeholder="Ex: Entrée prématurée sans confirmation"
              className="w-full"
              required
            />
          </Field>

          <Field label="Leçon tirée" required>
            <textarea
              value={form.lesson}
              onChange={e => set('lesson', e.target.value)}
              placeholder="Ex: Attendre la clôture de bougie avant d'entrer"
              className="w-full resize-none"
              style={{ minHeight: 80 }}
              required
            />
          </Field>

          <Field label="Règle à appliquer" required>
            <input
              value={form.rule}
              onChange={e => set('rule', e.target.value)}
              placeholder="Ex: Je n'entre jamais avant la clôture H4"
              className="w-full"
              required
            />
          </Field>
        </div>

        {/* ── 2. Notes ── */}
        <div className="card">
          <p className="section-title mb-3">
            Notes{' '}
            <span className="normal-case tracking-normal font-normal" style={{ color: 'var(--forge-muted)' }}>
              (optionnel)
            </span>
          </p>
          <Field label="Contexte libre">
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Contexte supplémentaire, analyse approfondie, émotions..."
              className="w-full resize-none"
              style={{ minHeight: 80 }}
            />
          </Field>
        </div>

        {/* ── 3. Tags ── */}
        <div className="card">
          <p className="section-title mb-3">
            Tags{' '}
            <span className="normal-case tracking-normal font-normal" style={{ color: 'var(--forge-muted)' }}>
              (optionnel)
            </span>
          </p>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map(tag => (
                <TagPill key={tag} tag={tag} onRemove={() => setTags(ts => ts.filter(x => x !== tag))} />
              ))}
            </div>
          )}

          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleTagKey}
            placeholder="fomo, sl, gestion… (Entrée pour valider)"
            className="w-full"
          />
        </div>

        {/* ── 4. Captures ── */}
        <div className="card">
          <p className="section-title mb-3">
            Captures & liens{' '}
            <span className="normal-case tracking-normal font-normal" style={{ color: 'var(--forge-muted)' }}>
              (optionnel)
            </span>
          </p>

          {existingCaps.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>Enregistrées</p>
              {existingCaps.map((cap, i) => (
                <CaptureItem
                  key={i}
                  cap={cap}
                  onRemove={() => removeExisting(cap)}
                  onTimeframeChange={tf => updateExisting(i, tf)}
                />
              ))}
            </div>
          )}

          {captures.length > 0 && (
            <div className="space-y-2 mb-3">
              {existingCaps.length > 0 && (
                <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>Nouvelles</p>
              )}
              {captures.map((cap, i) => (
                <CaptureItem
                  key={i}
                  cap={cap}
                  onRemove={() => removeNew(i)}
                  onTimeframeChange={tf => updateNew(i, tf)}
                />
              ))}
            </div>
          )}

          {showAddPanel && <AddCapturePanel onAdd={addCapture} />}

          <button
            type="button"
            onClick={() => setShowAddPanel(v => !v)}
            className="w-full flex items-center justify-center gap-2 rounded-xl p-3.5 transition-all text-sm hover-text-primary"
            style={{
              border: `2px dashed ${showAddPanel ? 'rgba(247,183,49,0.3)' : 'var(--border-medium)'}`,
              background: 'var(--surface-1)',
              color: 'var(--forge-muted)',
            }}
          >
            {showAddPanel ? <X size={15} /> : <Upload size={15} />}
            {showAddPanel ? 'Fermer' : 'Ajouter image ou lien'}
          </button>
        </div>

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full py-3.5 text-base disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Enregistrement...' : "Sauvegarder l'After Trade"}
        </button>

      </form>
    </div>
  )
}