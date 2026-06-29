import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Upload, X, ExternalLink, Check } from 'lucide-react'
import { createTrade, updateTrade, getTradeById, uploadImage } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'
import { EMOTIONS, MARKETS } from '../utils'
import { format } from 'date-fns'

const SESSIONS = [
  'London Session',
  'New York Session',
  'London Close',
  'AM Session',
  'PM Session',
  'Hors session',
]

const STYLES = ['Day Trading', 'Scalping', 'Swing Trading']
const STRUCTURES = ['Consolidation', 'Expansion', 'Retracement', 'Reversal']

// Suggestions rapides pour le timeframe (non exhaustif)
const TF_SUGGESTIONS = ['M1', 'M3', 'M5', 'M15', 'M30', 'H1', 'H2', 'H4', 'Daily', 'Weekly', 'Monthly']

const TRENDS = [
  { value: 'bullish', label: '▲ Bullish', color: { active: { background: 'rgba(46,160,67,0.15)', color: '#2EA043', borderColor: 'rgba(46,160,67,0.5)' } } },
  { value: 'bearish', label: '▼ Bearish', color: { active: { background: 'rgba(248,81,73,0.15)', color: '#F85149', borderColor: 'rgba(248,81,73,0.5)' } } },
  { value: 'neutre',  label: '— Neutre',  color: { active: { background: 'rgba(139,148,158,0.15)', color: '#8B949E', borderColor: 'rgba(139,148,158,0.5)' } } },
]

const getEmptyForm = () => {
  const jours = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']
  const today = new Date()
  return {
    date: format(today, 'yyyy-MM-dd'),
    market: '',
    type: 'buy',
    rr_planned: '',
    rr_won: '',
    result: '',
    emotion: '',
    respect_plan: true,
    discipline_score: 7,
    notes: '',
    trend: '',
    day: jours[today.getDay()],
    session: '',
    style: '',
    market_structure: '',
  }
}

const getAllowedResults = (rr_won) => {
  if (rr_won === '' || rr_won === null || rr_won === undefined) return null
  const v = +rr_won
  if (v > 0)   return ['tp', 'sl', 'be', 'missed', 'manual_exit']
  if (v === 0) return ['missed', 'be', 'manual_exit']
  if (v < 0)   return ['sl', 'manual_exit']
  return null
}

const Field = ({ label, required, children }) => (
  <div>
    <label className="label">
      {label}
      {required && <span className="text-forge-red ml-0.5">*</span>}
    </label>
    {children}
  </div>
)

const SelectInput = ({ value, onChange, options, placeholder, required }) => (
  <select value={value} onChange={e => onChange(e.target.value)} className="w-full" required={required}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(o => (
      <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
    ))}
  </select>
)

const PillGroup = ({ options, value, onChange, size = 'md', disabledValues = [] }) => {
  const pad = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const v = opt.value || opt
        const label = opt.label || opt
        const isActive = value === v
        const isDisabled = disabledValues.includes(v)
        const activeStyle = opt.color?.active || {
          background: 'rgba(247,183,49,0.15)',
          color: '#F7B731',
          borderColor: 'rgba(247,183,49,0.45)',
        }
        return (
          <button
            key={v}
            type="button"
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(isActive ? '' : v)}
            className={`${pad} rounded-xl font-medium border transition-all select-none ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'}`}
            style={isActive && !isDisabled
              ? { ...activeStyle, boxShadow: `0 0 10px ${activeStyle.borderColor}` }
              : { background: 'var(--surface-4)', color: 'var(--forge-muted)', borderColor: 'var(--border-soft)' }
            }
            title={isDisabled ? 'Non compatible avec le RR gagné' : undefined}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

const RESULT_PILLS = [
  { value: 'tp',          label: 'Take Profit',     color: { active: { background: 'rgba(46,160,67,0.15)',   color: '#2EA043', borderColor: 'rgba(46,160,67,0.5)' } } },
  { value: 'sl',          label: 'Stop Loss',       color: { active: { background: 'rgba(248,81,73,0.15)',   color: '#F85149', borderColor: 'rgba(248,81,73,0.5)' } } },
  { value: 'be',          label: 'Breakeven',       color: { active: { background: 'rgba(88,166,255,0.15)',  color: '#58a6ff', borderColor: 'rgba(88,166,255,0.5)' } } },
  { value: 'missed',      label: 'Missed',          color: { active: { background: 'rgba(139,148,158,0.15)', color: '#8B949E', borderColor: 'rgba(139,148,158,0.5)' } } },
  { value: 'manual_exit', label: 'Sortie manuelle', color: { active: { background: 'rgba(247,144,9,0.15)',   color: '#F79009', borderColor: 'rgba(247,144,9,0.5)' } } },
]

const REQUIRED_FIELDS = ['date', 'market', 'type', 'rr_planned', 'emotion', 'discipline_score', 'trend', 'session', 'style', 'market_structure']

// ── TimeframeInput — champ libre + suggestions rapides ────────
function TimeframeInput({ value, onChange }) {
  return (
    <div className="space-y-1.5">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="ex: M30, H2, 122H, 7D…"
        className="w-full text-xs"
      />
      <div className="flex flex-wrap gap-1">
        {TF_SUGGESTIONS.map(tf => (
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

function ImageItem({ img, onRemove, onTimeframeChange }) {
  const isLink = img.isLink
  return (
    <div
      className="rounded-xl p-2.5 space-y-2"
      style={{ background: 'var(--surface-4)', border: '1px solid var(--border-soft)' }}
    >
      <div className="flex items-center gap-2">
        {isLink ? (
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.2)' }}
          >
            <ExternalLink size={16} style={{ color: '#58a6ff' }} />
          </div>
        ) : (
          <img src={img.preview || img.url} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {isLink && <p className="text-xs truncate mb-1" style={{ color: 'var(--forge-muted)' }}>{img.url}</p>}
          <p className="text-[10px] mb-1" style={{ color: 'var(--forge-muted)' }}>Timeframe</p>
          <TimeframeInput value={img.timeframe} onChange={onTimeframeChange} />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="transition-colors flex-shrink-0 self-start hover:text-forge-red"
          style={{ color: 'var(--forge-muted)' }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

function AddImagePanel({ onAdd }) {
  const [mode, setMode] = useState('image')
  const [url, setUrl]   = useState('')
  const [tf, setTf]     = useState('Daily')

  const handleAddLink = () => {
    if (!url.trim()) return
    onAdd({ isLink: true, url: url.trim(), timeframe: tf, preview: null })
    setUrl('')
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

      {/* Timeframe libre */}
      <div>
        <p className="text-[10px] mb-1.5" style={{ color: 'var(--forge-muted)' }}>Timeframe</p>
        <TimeframeInput value={tf} onChange={setTf} />
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
                onAdd({ isLink: false, file, preview: URL.createObjectURL(file), timeframe: tf || 'Daily' })
              })
              e.target.value = ''
            }}
          />
        </label>
      ) : (
        <div className="flex gap-2">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.tradingview.com/chart/..."
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
      )}
    </div>
  )
}

export default function AddTrade() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { user } = useAuth()

  const [loading, setLoading]               = useState(false)
  const [loadingTrade, setLoadingTrade]     = useState(isEdit)
  const [uploadProgress, setUploadProgress] = useState('')
  const [form, setForm]                     = useState(getEmptyForm)
  const [images, setImages]                 = useState([])
  const [existingImages, setExistingImages] = useState([])
  const [removedImages, setRemovedImages]   = useState([])
  const [errors, setErrors]                 = useState({})
  const [showAddPanel, setShowAddPanel]     = useState(false)

  useEffect(() => {
    if (!isEdit) return
    getTradeById(id)
      .then(trade => {
        setForm({
          date:             trade.date,
          market:           trade.market,
          type:             trade.type,
          rr_planned:       trade.rr_planned ?? '',
          rr_won:           trade.rr_won     ?? '',
          result:           trade.result,
          emotion:          trade.emotion    ?? '',
          respect_plan:     trade.respect_plan ?? true,
          discipline_score: trade.discipline_score ?? 7,
          notes:            trade.notes     ?? '',
          trend:            trade.trend     ?? '',
          day:              trade.day       ?? '',
          session:          trade.session   ?? '',
          style:            trade.style     ?? '',
          market_structure: trade.market_structure ?? '',
        })
        setExistingImages(trade.images || [])
      })
      .catch(e => alert('Erreur chargement: ' + e.message))
      .finally(() => setLoadingTrade(false))
  }, [id, isEdit])

  const set = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v }

      if (k === 'session' && v === 'Hors session') next.respect_plan = false

      if (k === 'rr_won') {
        const allowed = getAllowedResults(v)
        if (allowed && next.result && !allowed.includes(next.result)) next.result = ''
      }

      if (k === 'result' && v === 'sl') {
        if (next.rr_won === '' || +next.rr_won >= 0) next.rr_won = '-1'
      }

      if (k === 'date' && v) {
        const jours = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']
        next.day = jours[new Date(v + 'T12:00:00').getDay()]
      }

      if (k === 'result' && v === 'tp') {
        if (next.rr_won !== '' && +next.rr_won <= 0) next.rr_won = ''
      }

      if (k === 'result' && v === 'be') {
        next.rr_won = '0'
      }

      return next
    })
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  const validate = () => {
    const errs = {}
    REQUIRED_FIELDS.forEach(f => {
      if (form[f] === '' || form[f] === null || form[f] === undefined) errs[f] = true
    })

    if (form.result === 'tp') {
      if (form.rr_won === '' || +form.rr_won <= 0)
        errs.rr_won = 'Take Profit : le RR gagné doit être positif (> 0)'
    }
    if (form.result === 'sl') {
      if (form.rr_won === '' || +form.rr_won >= 0 || +form.rr_won < -1)
        errs.rr_won = 'Stop Loss : le RR gagné doit être entre -1 et 0 (ex: -1, -0.5)'
    }
    if (form.result === 'be') {
      if (form.rr_won === '' || +form.rr_won !== 0)
        errs.rr_won = 'Breakeven : le RR gagné doit être 0'
    }
    if (form.result === 'missed') {
      if (form.rr_won === '' || +form.rr_won !== 0)
        errs.rr_won = 'Missed : le RR gagné doit être 0'
    }
    if (form.result === 'manual_exit') {
      if (form.rr_won === '')
        errs.rr_won = 'Sortie manuelle : indiquez le RR réellement obtenu (positif ou négatif)'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const addItem = (item) => { setImages(imgs => [...imgs, item]); setShowAddPanel(false) }
  const removeNewImage = (i) => setImages(imgs => imgs.filter((_, idx) => idx !== i))
  const removeExistingImage = (img) => {
    setExistingImages(imgs => imgs.filter(im => im.url !== img.url))
    if (img.path) setRemovedImages(p => [...p, img.path])
  }
  const changeNewTimeframe = (i, tf) =>
    setImages(imgs => imgs.map((img, idx) => idx === i ? { ...img, timeframe: tf } : img))
  const changeExistingTimeframe = (i, tf) =>
    setExistingImages(imgs => imgs.map((img, idx) => idx === i ? { ...img, timeframe: tf } : img))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const tradeData = {
        date:             form.date,
        market:           form.market,
        type:             form.type,
        rr_planned:       form.rr_planned !== '' ? +form.rr_planned : null,
        rr_won:           form.rr_won     !== '' ? +form.rr_won     : null,
        result:           form.result || null,
        emotion:          form.emotion    || null,
        respect_plan:     form.respect_plan,
        discipline_score: +form.discipline_score,
        notes:            form.notes      || null,
        trend:            form.trend      || null,
        day:              form.day        || null,
        session:          form.session    || null,
        style:            form.style      || null,
        market_structure: form.market_structure || null,
      }

      let tradeId = id
      if (isEdit) {
        await updateTrade(id, tradeData)
      } else {
        tradeData.user_id = user.id
        tradeData.images  = []
        const trade = await createTrade(tradeData)
        tradeId = trade.id
      }

      const newUploaded = []
      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        if (img.isLink) {
          newUploaded.push({ url: img.url, timeframe: img.timeframe || 'Daily', isLink: true })
        } else {
          setUploadProgress(`Upload ${i + 1}/${images.length}...`)
          const path = `${user.id}/${tradeId}/${(img.timeframe || 'Daily')}_${Date.now()}_${img.file.name}`
          const url  = await uploadImage(img.file, path)
          newUploaded.push({ url, timeframe: img.timeframe || 'Daily', path, isLink: false })
        }
      }

      const finalImages = [...existingImages, ...newUploaded]
      if (images.length > 0 || removedImages.length > 0) {
        await updateTrade(tradeId, { images: finalImages })
      }

      navigate('/app/trades')
    } catch (err) {
      alert('Erreur: ' + err.message)
    } finally {
      setLoading(false)
      setUploadProgress('')
    }
  }

  const allowedResults  = getAllowedResults(form.rr_won)
  const disabledResults = allowedResults
    ? RESULT_PILLS.map(r => r.value).filter(v => !allowedResults.includes(v))
    : []

  const fieldError = (k) => errors[k]
    ? { borderColor: 'rgba(248,81,73,0.6)', boxShadow: '0 0 0 1px rgba(248,81,73,0.3)' }
    : {}

  const rrPlaceholder = form.result === 'sl'
    ? '-1.0'
    : form.result === 'be'
    ? '0'
    : form.result === 'manual_exit'
    ? '0.8 ou -0.4'
    : '1.8'

  if (loadingTrade) return (
    <div className="page flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-forge-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="page">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="transition-colors hover-text-primary"
          style={{ color: 'var(--forge-muted)' }}
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {isEdit ? 'Modifier le trade' : 'Nouveau Trade'}
        </h1>
      </div>

      <p className="text-xs mb-4" style={{ color: 'var(--forge-muted)' }}>
        Les champs marqués <span className="text-forge-red">*</span> sont obligatoires.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── 1. Informations ── */}
        <div className="card space-y-4">
          <p className="section-title mb-0">Informations</p>

          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2">
            <Field label="Date" required>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                className="w-full"
                style={fieldError('date')}
                required
              />
            </Field>
            <Field label="Direction" required>
              <div className="flex gap-2">
                {['buy', 'sell'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('type', t)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border"
                    style={form.type === t
                      ? t === 'buy'
                        ? { background: 'rgba(46,160,67,0.15)', color: '#2EA043', borderColor: 'rgba(46,160,67,0.5)', boxShadow: '0 0 10px rgba(46,160,67,0.2)' }
                        : { background: 'rgba(248,81,73,0.15)', color: '#F85149', borderColor: 'rgba(248,81,73,0.5)', boxShadow: '0 0 10px rgba(248,81,73,0.2)' }
                      : { background: 'var(--surface-4)', color: 'var(--forge-muted)', borderColor: 'var(--border-soft)' }
                    }
                  >
                    {t === 'buy' ? '↑ BUY' : '↓ SELL'}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <Field label="Marché" required>
            <SelectInput
              value={form.market}
              onChange={v => set('market', v)}
              options={MARKETS}
              placeholder="Choisir..."
              required
            />
            {errors.market && <p className="text-xs text-forge-red mt-1">Veuillez choisir un marché</p>}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="RR Prévu" required>
              <input
                type="number"
                step="0.1"
                value={form.rr_planned}
                onChange={e => set('rr_planned', e.target.value)}
                placeholder="2.5"
                className="w-full"
                style={fieldError('rr_planned')}
              />
            </Field>
            <Field label="RR Gagné">
              <input
                type="number"
                step="0.1"
                value={form.rr_won}
                onChange={e => set('rr_won', e.target.value)}
                placeholder={rrPlaceholder}
                className="w-full"
                style={fieldError('rr_won')}
              />
              {errors.rr_won && typeof errors.rr_won === 'string' && (
                <p className="text-xs text-forge-red mt-1">{errors.rr_won}</p>
              )}
            </Field>
          </div>

          {form.result === 'sl' && (
            <p className="text-xs rounded-lg px-3 py-2"
              style={{ background: 'rgba(248,81,73,0.08)', color: '#F85149', border: '1px solid rgba(248,81,73,0.2)' }}>
              ⚠️ Stop Loss — le RR gagné doit être négatif (ex: -1)
            </p>
          )}
          {form.result === 'tp' && (
            <p className="text-xs rounded-lg px-3 py-2"
              style={{ background: 'rgba(46,160,67,0.08)', color: '#2EA043', border: '1px solid rgba(46,160,67,0.2)' }}>
              ✅ Take Profit — le RR gagné doit être positif (ex: 2.5)
            </p>
          )}
          {form.result === 'manual_exit' && (
            <p className="text-xs rounded-lg px-3 py-2"
              style={{ background: 'rgba(247,144,9,0.08)', color: '#F79009', border: '1px solid rgba(247,144,9,0.2)' }}>
              ✋ Sortie manuelle — indiquez le RR réellement obtenu, positif ou négatif (ex: 0.8 ou -0.4)
            </p>
          )}
          {allowedResults && form.result !== 'sl' && form.result !== 'tp' && form.result !== 'manual_exit' && (
            <p className="text-xs rounded-lg px-3 py-2"
              style={{ background: 'rgba(247,183,49,0.08)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.2)' }}>
              {+form.rr_won < 0  && '⚠️ RR négatif — Stop Loss ou Sortie manuelle uniquement.'}
              {+form.rr_won === 0 && '⚠️ RR nul — Missed, Breakeven ou Sortie manuelle uniquement.'}
            </p>
          )}
        </div>

        {/* ── 2. Résultat ── */}
        <div className="card">
          <p className="section-title mb-3">
            Résultat <span className="normal-case text-xs font-normal" style={{ color: 'var(--forge-muted)' }}>(optionnel)</span>
          </p>
          <PillGroup
            options={RESULT_PILLS}
            value={form.result}
            onChange={v => set('result', v)}
            disabledValues={disabledResults}
          />
        </div>

        {/* ── 3. Contexte de marché ── */}
        <div className="card space-y-4">
          <p className="section-title mb-0">Contexte de marché</p>

          <Field label="Tendance" required>
            <PillGroup options={TRENDS} value={form.trend} onChange={v => set('trend', v)} />
            {errors.trend && <p className="text-xs text-forge-red mt-1">La tendance est obligatoire</p>}
          </Field>

          <Field label="Structure de marché" required>
            <PillGroup
              options={STRUCTURES}
              value={form.market_structure}
              onChange={v => set('market_structure', v)}
              size="sm"
            />
            {errors.market_structure && <p className="text-xs text-forge-red mt-1">La structure est obligatoire</p>}
          </Field>

          <Field label="Session" required>
            <SelectInput
              value={form.session}
              onChange={v => set('session', v)}
              options={SESSIONS}
              placeholder="Choisir une session..."
              required
            />
            {errors.session && <p className="text-xs text-forge-red mt-1">La session est obligatoire</p>}
            {form.session === 'Hors session' && (
              <p className="text-xs mt-1.5 px-2 py-1 rounded-lg"
                style={{ background: 'rgba(248,81,73,0.08)', color: '#F85149', border: '1px solid rgba(248,81,73,0.2)' }}>
                ⚠️ Vous avez tradé hors session
              </p>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Jour">
              <input
                value={form.day}
                readOnly
                className="w-full opacity-60 cursor-default"
                placeholder="Auto depuis la date"
              />
            </Field>
            <Field label="Style" required>
              <SelectInput
                value={form.style}
                onChange={v => set('style', v)}
                options={STYLES}
                placeholder="Style..."
                required
              />
              {errors.style && <p className="text-xs text-forge-red mt-1">Obligatoire</p>}
            </Field>
          </div>
        </div>

        {/* ── 4. Psychologie ── */}
        <div className="card space-y-4">
          <p className="section-title mb-0">Psychologie</p>

          <Field label="Émotion" required>
            <SelectInput
              value={form.emotion}
              onChange={v => set('emotion', v)}
              options={EMOTIONS}
              placeholder="Choisir..."
              required
            />
            {errors.emotion && <p className="text-xs text-forge-red mt-1">Obligatoire</p>}
          </Field>

          <div>
            <label className="label flex justify-between">
              <span>Discipline <span className="text-forge-red">*</span></span>
              <span className="font-mono text-forge-accent">{form.discipline_score}/10</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={form.discipline_score}
              onChange={e => set('discipline_score', e.target.value)}
              className="w-full accent-forge-accent"
            />
            <div className="flex justify-between mt-0.5">
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <span key={n} className="text-[9px] font-mono" style={{ color: 'var(--text-faint)' }}>{n}</span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="label mb-0">Respect du plan</label>
              {form.session === 'Hors session' && (
                <p className="text-[10px] text-forge-red mt-0.5">Vous avez tradé hors session</p>
              )}
            </div>
            <button
              type="button"
              disabled={form.session === 'Hors session'}
              onClick={() => form.session !== 'Hors session' && set('respect_plan', !form.respect_plan)}
              className="w-12 h-6 rounded-full transition-all relative flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: form.respect_plan && form.session !== 'Hors session'
                  ? '#2EA043'
                  : 'var(--surface-8)',
              }}
            >
              <div
                className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm"
                style={{ left: form.respect_plan && form.session !== 'Hors session' ? '28px' : '4px' }}
              />
            </button>
          </div>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Contexte du trade, observations... (optionnel)"
              className="w-full resize-none"
              style={{ minHeight: 80 }}
            />
          </Field>
        </div>

        {/* ── 5. Captures & liens ── */}
        <div className="card">
          <p className="section-title mb-3">
            Captures & liens
            <span className="normal-case tracking-normal font-normal ml-1" style={{ color: 'var(--forge-muted)' }}>
              (optionnel)
            </span>
          </p>

          {existingImages.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>Enregistrés</p>
              {existingImages.map((img, i) => (
                <ImageItem
                  key={i}
                  img={img}
                  onRemove={() => removeExistingImage(img)}
                  onTimeframeChange={tf => changeExistingTimeframe(i, tf)}
                />
              ))}
            </div>
          )}

          {images.length > 0 && (
            <div className="space-y-2 mb-3">
              {existingImages.length > 0 && (
                <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>Nouveaux</p>
              )}
              {images.map((img, i) => (
                <ImageItem
                  key={i}
                  img={img}
                  onRemove={() => removeNewImage(i)}
                  onTimeframeChange={tf => changeNewTimeframe(i, tf)}
                />
              ))}
            </div>
          )}

          {showAddPanel && <AddImagePanel onAdd={addItem} />}

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
        {Object.keys(errors).length > 0 && (
          <p className="text-xs text-forge-red text-center">
            ⚠️ Certains champs obligatoires sont manquants ou invalides.
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3.5 text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {loading
            ? (uploadProgress || 'Enregistrement...')
            : isEdit ? 'Enregistrer les modifications' : 'Enregistrer le trade'
          }
        </button>

      </form>
    </div>
  )
}