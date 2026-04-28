import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Plus, X, Upload, ExternalLink,
  Image, Link, TrendingUp, TrendingDown, BarChart2, Zap,
  Trophy, Newspaper, StickyNote, ChevronDown, ChevronUp,
  Save, Eye, Calendar, Check,
} from 'lucide-react'
import { useTrades } from '../hooks/useTrades'
import { useWeeklyForecast } from '../hooks/useWeeklyForecast'
import { uploadImage } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  format, startOfWeek, endOfWeek, addWeeks, subWeeks,
  isWithinInterval, parseISO,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { SkeletonCard } from '../components/Skeleton'

// ── Helpers ──────────────────────────────────────────────────
const wStart = (date) => startOfWeek(date, { weekStartsOn: 0 })
const wEnd   = (date) => endOfWeek(date,   { weekStartsOn: 0 })
const fmtDate = (d)   => format(d, 'd MMM yyyy', { locale: fr })
const fmtKey  = (date) => format(wStart(date), 'yyyy-MM-dd')

const getWeekTrades = (trades, date) => {
  const s = wStart(date), e = wEnd(date)
  return trades.filter(t => {
    try { return isWithinInterval(parseISO(t.date), { start: s, end: e }) }
    catch { return false }
  }).sort((a, b) => a.date.localeCompare(b.date))
}

const calcStats = (trades) => {
  const total  = trades.length
  const tp     = trades.filter(t => t.result === 'tp').length
  const sl     = trades.filter(t => t.result === 'sl').length
  const be     = trades.filter(t => t.result === 'be').length
  const missed = trades.filter(t => t.result === 'missed').length
  const activeTrades = trades.filter(t => t.result === 'tp' || t.result === 'sl' || t.result === 'be')
const winRate = activeTrades.length ? Math.round((tp / activeTrades.length) * 100) : 0
  const rr = +trades.reduce((acc, t) => {
    if (t.result === 'tp') return acc + (t.rr_won || 0)
    if (t.result === 'sl') return acc - 1
    return acc
  }, 0).toFixed(2)
  const disc = trades.length
    ? Math.round(trades.reduce((a, t) => a + (t.discipline_score || 0), 0) / trades.length)
    : 0
  return { total, tp, sl, be, missed, winRate, rr, disc }
}

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const RESULT_COLORS = { tp: '#2EA043', sl: '#F85149', be: '#58a6ff', missed: '#8B949E' }
const RESULT_LABELS = { tp: 'TP', sl: 'SL', be: 'BE', missed: 'Missed' }
const BIAS_OPTIONS  = ['Bullish', 'Bearish', 'Neutre', 'Indécis']
const BIAS_COLORS   = { Bullish: '#2EA043', Bearish: '#F85149', Neutre: '#8B949E', Indécis: '#F7B731' }
const MARKETS       = ['EUR/USD','GBP/USD','XAU/USD','NAS100','SP500','BTC/USD','USD/JPY','GBP/JPY','AUD/USD','DXY','Autre']
const TIMEFRAMES = ['Monthly', 'Weekly', 'Daily', 'H4', 'H2', 'H1', 'M30', 'M15', 'M5']
// ── StatCard ─────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color, glow, icon: Icon }) => (
  <div className="rounded-2xl p-3 relative overflow-hidden"
    style={{ background: 'rgba(22,27,34,0.8)', border: `1px solid ${glow ? `${glow}25` : 'rgba(255,255,255,0.07)'}` }}>
    {glow && <div className="absolute inset-0 opacity-[0.05] pointer-events-none rounded-2xl"
      style={{ background: `radial-gradient(ellipse at top left, ${glow}, transparent 70%)` }} />}
    <div className="flex items-center justify-between mb-1">
      <p className="text-[10px] text-forge-muted uppercase tracking-wide">{label}</p>
      {Icon && <Icon size={12} style={{ color: glow || '#8B949E', opacity: 0.6 }} />}
    </div>
    <p className={`text-xl font-mono font-semibold leading-none ${color || 'text-white'}`}>{value}</p>
    {sub && <p className="text-[10px] text-forge-muted mt-1">{sub}</p>}
  </div>
)

// ── Section collapsible ───────────────────────────────────────
function Section({ title, icon: Icon, defaultOpen = true, children, action }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl mb-4 overflow-hidden"
      style={{ background: 'rgba(16,20,28,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="w-full flex items-center justify-between px-4 py-3">
        <button onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity">
          {Icon && <Icon size={13} className="text-forge-accent" />}
          <span className="text-xs font-medium text-forge-muted uppercase tracking-wide">{title}</span>
          <span className="ml-1">
            {open ? <ChevronUp size={13} className="text-forge-muted" /> : <ChevronDown size={13} className="text-forge-muted" />}
          </span>
        </button>
        {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

// ── Lightbox ─────────────────────────────────────────────────
function Lightbox({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }} onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/60 hover:text-white" onClick={onClose}>
        <X size={24} />
      </button>
      <img src={src} alt="" className="max-w-[95vw] max-h-[90vh] rounded-xl object-contain"
        onClick={e => e.stopPropagation()} />
    </div>
  )
}

// ── AnalysisCard ─────────────────────────────────────────────
function AnalysisCard({ item, onRemove, onLightbox, editMode }) {
  return (
    <div className="relative rounded-xl overflow-hidden group"
      style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
      {item.isLink ? (
        <a href={item.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 p-3 hover:bg-white/5 transition-colors">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(88,166,255,0.15)' }}>
            <ExternalLink size={14} style={{ color: '#58a6ff' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white truncate">{item.pair} · {item.timeframe}</p>
            <p className="text-[10px] text-forge-muted truncate">{item.url}</p>
          </div>
        </a>
      ) : (
        <button onClick={() => onLightbox(item.url)} className="w-full block text-left">
          <img src={item.url} alt="" className="w-full h-28 object-cover" />
          <div className="px-2 py-1.5 flex items-center justify-between">
            <p className="text-[10px] text-forge-muted">{item.pair} · {item.timeframe}</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded"
              style={{
                background: item.type === 'forecast' ? 'rgba(247,183,49,0.15)' : 'rgba(46,160,67,0.15)',
                color: item.type === 'forecast' ? '#F7B731' : '#2EA043',
              }}>
              {item.type === 'forecast' ? 'Forecast' : 'Actuel'}
            </span>
          </div>
        </button>
      )}
      {editMode && (
        <button onClick={onRemove}
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(248,81,73,0.8)' }}>
          <X size={10} className="text-white" />
        </button>
      )}
    </div>
  )
}

// ── AddAnalysisForm ───────────────────────────────────────────
function AddAnalysisForm({ onAdd, onCancel, userId, weekKey }) {
  const [mode, setMode]   = useState('image')
  const [pair, setPair]   = useState('EUR/USD')
  const [tf, setTf]       = useState('Daily')
  const [type, setType]   = useState('forecast')
  const [url, setUrl]     = useState('')
  const [file, setFile]   = useState(null)
  const [busy, setBusy]   = useState(false)

  const canAdd = mode === 'link' ? url.trim() : file

  const handleAdd = async () => {
    if (mode === 'link') {
      onAdd({ pair, timeframe: tf, type, url: url.trim(), isLink: true })
      return
    }
    setBusy(true)
    try {
      const path = `${userId}/weekly/${weekKey}/analysis_${Date.now()}_${file.name}`
      const imgUrl = await uploadImage(file, path)
      onAdd({ pair, timeframe: tf, type, url: imgUrl, path, isLink: false })
    } catch (e) {
      alert('Erreur upload: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl p-3 mb-3 space-y-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex gap-1">
        {[['image', 'Image'], ['link', 'Lien TradingView']].map(([v, l]) => (
          <button key={v} onClick={() => setMode(v)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all"
            style={mode === v
              ? { background: 'rgba(247,183,49,0.12)', color: '#F7B731', borderColor: 'rgba(247,183,49,0.3)' }
              : { background: 'rgba(255,255,255,0.03)', color: '#8B949E', borderColor: 'rgba(255,255,255,0.08)' }
            }>
            {l}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] text-forge-muted mb-1">Paire</p>
          <select value={pair} onChange={e => setPair(e.target.value)} className="w-full text-xs py-1.5">
            {MARKETS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <p className="text-[10px] text-forge-muted mb-1">Timeframe</p>
          <select value={tf} onChange={e => setTf(e.target.value)} className="w-full text-xs py-1.5">
            {TIMEFRAMES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <p className="text-[10px] text-forge-muted mb-1">Type</p>
          <select value={type} onChange={e => setType(e.target.value)} className="w-full text-xs py-1.5">
            <option value="forecast">Forecast</option>
            <option value="actual">Actuel</option>
          </select>
        </div>
      </div>
      {mode === 'link' ? (
        <input value={url} onChange={e => setUrl(e.target.value)}
          placeholder="https://www.tradingview.com/chart/..."
          className="w-full text-xs" />
      ) : (
        <label className="flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer text-xs text-forge-muted hover:text-white transition-colors"
          style={{ border: '2px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
          {file ? <span className="text-forge-accent">{file.name}</span> : <><Upload size={13} /> Choisir une image</>}
          <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files[0])} />
        </label>
      )}
      <div className="flex gap-2">
        <button onClick={handleAdd} disabled={!canAdd || busy}
          className="btn-primary flex-1 text-xs py-2 disabled:opacity-40 flex items-center justify-center gap-1.5">
          {busy
            ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
            : <Check size={12} />}
          Ajouter
        </button>
        <button onClick={onCancel} className="btn-ghost text-xs py-2 px-3">Annuler</button>
      </div>
    </div>
  )
}

// ── BiasSelector ─────────────────────────────────────────────
function BiasSelector({ label, value, onChange }) {
  return (
    <div className="flex-1">
      <p className="text-[10px] text-forge-muted uppercase tracking-wide mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {BIAS_OPTIONS.map(opt => (
          <button key={opt} onClick={() => onChange(value === opt ? '' : opt)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-all active:scale-95"
            style={value === opt
              ? { background: `${BIAS_COLORS[opt]}20`, color: BIAS_COLORS[opt], borderColor: `${BIAS_COLORS[opt]}50` }
              : { background: 'rgba(255,255,255,0.04)', color: '#8B949E', borderColor: 'rgba(255,255,255,0.08)' }
            }>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── TradeRow ─────────────────────────────────────────────────
function TradeRow({ trade, onClick }) {
  const rr = trade.result === 'tp' ? `+${trade.rr_won ?? 0}R` : trade.result === 'sl' ? '-1R' : '0R'
  const rrColor = trade.result === 'tp' ? '#2EA043' : trade.result === 'sl' ? '#F85149' : '#8B949E'
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 py-2.5 border-b last:border-0 hover:bg-white/[0.02] transition-colors text-left"
      style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-white">{trade.market}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md"
            style={{ background: trade.type === 'buy' ? 'rgba(46,160,67,0.15)' : 'rgba(248,81,73,0.15)', color: trade.type === 'buy' ? '#2EA043' : '#F85149' }}>
            {trade.type?.toUpperCase()}
          </span>
        </div>
        {trade.session && <p className="text-[10px] text-forge-muted">{trade.session}</p>}
      </div>
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg flex-shrink-0"
        style={{ background: `${RESULT_COLORS[trade.result]}15`, color: RESULT_COLORS[trade.result], border: `1px solid ${RESULT_COLORS[trade.result]}30` }}>
        {RESULT_LABELS[trade.result] || trade.result}
      </span>
      <span className="text-xs font-mono w-10 text-right flex-shrink-0" style={{ color: rrColor }}>{rr}</span>
      <Eye size={11} className="text-forge-muted flex-shrink-0" />
    </button>
  )
}

// ── Page principale ───────────────────────────────────────────
export default function WeeklyForecast() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const { trades, loading: tradesLoading } = useTrades()

  const [current, setCurrent]           = useState(new Date())
  const [editMode, setEditMode]         = useState(false)
  const [lightbox, setLightbox]         = useState(null)
  const [showAddAnalysis, setShowAddAnalysis] = useState(false)
  const [saved, setSaved]               = useState(false)
  const newsRef = useRef()

  const weekKey   = fmtKey(current)
  const weekStart = wStart(current)
  const weekEnd   = wEnd(current)
  const isCurrentWeek = isWithinInterval(new Date(), { start: weekStart, end: weekEnd })

  const { forecast, loading: fcLoading, saving, save } = useWeeklyForecast(weekKey)

  // Form local
  const emptyForm = () => ({
    bias_forecast: forecast?.bias_forecast || '',
    bias_real:     forecast?.bias_real     || '',
    analyses:      forecast?.analyses      || [],
    news_images:   forecast?.news_images   || [],
    notes:         forecast?.notes         || '',
  })

  const [form, setForm] = useState(emptyForm)

  // Reset form when week or forecast changes
  useMemo(() => {
    if (!fcLoading) setForm({
      bias_forecast: forecast?.bias_forecast || '',
      bias_real:     forecast?.bias_real     || '',
      analyses:      forecast?.analyses      || [],
      news_images:   forecast?.news_images   || [],
      notes:         forecast?.notes         || '',
    })
  }, [forecast, fcLoading, weekKey])

  // Trades
  const weekTrades  = useMemo(() => getWeekTrades(trades, current), [trades, current])
  const stats       = useMemo(() => calcStats(weekTrades), [weekTrades])
  const tradesByDay = useMemo(() => {
    const map = {}
    weekTrades.forEach(t => {
      const day = DAYS_FR[parseISO(t.date).getDay()]
      if (!map[day]) map[day] = []
      map[day].push(t)
    })
    return map
  }, [weekTrades])

  // Display data
  const display = editMode ? form : {
    bias_forecast: forecast?.bias_forecast || '',
    bias_real:     forecast?.bias_real     || '',
    analyses:      forecast?.analyses      || [],
    news_images:   forecast?.news_images   || [],
    notes:         forecast?.notes         || '',
  }

  const analysesByPair = useMemo(() => {
    const map = {}
    display.analyses.forEach(a => {
      if (!map[a.pair]) map[a.pair] = []
      map[a.pair].push(a)
    })
    return map
  }, [display.analyses])

  // ── Handlers ────────────────────────────────────────────
  const handleAddAnalysis = (item) => {
    setForm(f => ({ ...f, analyses: [...f.analyses, item] }))
    setShowAddAnalysis(false)
  }

  const removeAnalysis = (url) =>
    setForm(f => ({ ...f, analyses: f.analyses.filter(a => a.url !== url) }))

  const handleNewsUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const path = `${user.id}/weekly/${weekKey}/news_${Date.now()}_${file.name}`
      const imgUrl = await uploadImage(file, path)
      setForm(f => ({ ...f, news_images: [...f.news_images, { url: imgUrl, path }] }))
    } catch (err) {
      alert('Erreur upload: ' + err.message)
    }
    e.target.value = ''
  }

  const removeNews = (i) =>
    setForm(f => ({ ...f, news_images: f.news_images.filter((_, idx) => idx !== i) }))

  const handleSave = async () => {
    try {
      await save({
        bias_forecast: form.bias_forecast || null,
        bias_real:     form.bias_real     || null,
        analyses:      form.analyses,
        news_images:   form.news_images,
        notes:         form.notes         || null,
      })
      setEditMode(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      alert('Erreur: ' + e.message)
    }
  }

if (tradesLoading || fcLoading) return (
  <div className="page space-y-4">
    {/* Nav */}
    <div className="flex items-center justify-between mb-5">
      <div className="w-9 h-9 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.07)' }} />
      <div className="h-5 w-48 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.07)' }} />
      <div className="w-9 h-9 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.07)' }} />
    </div>
    {/* Bouton */}
    <div className="h-10 rounded-xl animate-pulse mb-5" style={{ background: 'rgba(255,255,255,0.07)' }} />
    {/* Sections */}
    <SkeletonCard />
    <SkeletonCard />
    <div className="grid grid-cols-2 gap-2">
      <SkeletonCard /><SkeletonCard />
      <SkeletonCard /><SkeletonCard />
    </div>
  </div>
)

  return (
    <div className="page">

      {/* ── Nav ── */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => { setCurrent(d => subWeeks(d, 1)); setEditMode(false) }}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 hover:bg-white/5"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Calendar size={12} className="text-forge-accent" />
            <h1 className="text-sm font-semibold">{fmtDate(weekStart)} → {fmtDate(weekEnd)}</h1>
          </div>
          {isCurrentWeek && <span className="text-[10px] text-forge-accent font-mono">● semaine en cours</span>}
        </div>
        <button onClick={() => { setCurrent(d => addWeeks(d, 1)); setEditMode(false) }}
          disabled={isCurrentWeek}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 hover:bg-white/5 disabled:opacity-30"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── Bouton édition / save ── */}
      <div className="flex gap-2 mb-5">
        {editMode ? (
          <>
            <button onClick={handleSave} disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
              {saving
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : saved ? <><Check size={14} /> Sauvegardé</> : <><Save size={14} /> Enregistrer</>
              }
            </button>
            <button onClick={() => { setEditMode(false); setForm(emptyForm()) }}
              className="btn-ghost flex items-center gap-1.5">
              <X size={14} /> Annuler
            </button>
          </>
        ) : (
          <button onClick={() => setEditMode(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.99]"
            style={{ background: 'rgba(247,183,49,0.08)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.2)' }}>
            <Plus size={14} />
            {forecast ? 'Modifier le forecast' : 'Créer le forecast'}
          </button>
        )}
      </div>

      {/* ── Bias ── */}
      <Section title="Bias de la semaine" icon={TrendingUp} defaultOpen>
        <div className="flex gap-4">
          {editMode ? (
            <>
              <BiasSelector label="Forecast (DXY)" value={form.bias_forecast} onChange={v => setForm(f => ({ ...f, bias_forecast: v }))} />
              <BiasSelector label="Bias réel (DXY)" value={form.bias_real} onChange={v => setForm(f => ({ ...f, bias_real: v }))} />
            </>
          ) : (
            [['Forecast (DXY)', display.bias_forecast], ['Bias réel (DXY)', display.bias_real]].map(([label, val]) => (
              <div key={label} className="flex-1">
                <p className="text-[10px] text-forge-muted uppercase tracking-wide mb-2">{label}</p>
                {val
                  ? <span className="inline-block px-3 py-1.5 rounded-xl text-sm font-semibold"
                      style={{ background: `${BIAS_COLORS[val]}15`, color: BIAS_COLORS[val], border: `1px solid ${BIAS_COLORS[val]}30` }}>
                      {val}
                    </span>
                  : <span className="text-xs text-forge-muted/50 italic">—</span>
                }
              </div>
            ))
          )}
        </div>
      </Section>

      {/* ── Analyses ── */}
      <Section title="Analyses de marché" icon={BarChart2} defaultOpen
        action={editMode && (
          <button onClick={e => { e.stopPropagation(); setShowAddAnalysis(v => !v) }}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-all"
            style={{ background: 'rgba(247,183,49,0.1)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.2)' }}>
            <Plus size={10} /> Ajouter
          </button>
        )}>
        {editMode && showAddAnalysis && (
          <AddAnalysisForm
            onAdd={handleAddAnalysis}
            onCancel={() => setShowAddAnalysis(false)}
            userId={user?.id}
            weekKey={weekKey}
          />
        )}
        {display.analyses.length === 0
          ? <p className="text-xs text-forge-muted/50 italic py-2">Aucune analyse ajoutée.</p>
          : Object.entries(analysesByPair).map(([pair, items]) => (
            <div key={pair} className="mb-4 last:mb-0">
              <p className="text-xs font-semibold text-white mb-2">{pair}</p>
              <div className="grid grid-cols-2 gap-2">
                {items.map((item, i) => (
                  <AnalysisCard key={i} item={item} editMode={editMode}
                    onRemove={() => removeAnalysis(item.url)}
                    onLightbox={setLightbox} />
                ))}
              </div>
            </div>
          ))
        }
      </Section>

      {/* ── Stats auto ── */}
      {weekTrades.length > 0 && (
        <Section title="Performance de la semaine" icon={TrendingUp} defaultOpen>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <StatCard label="Trades"   value={stats.total} sub={`${stats.tp} TP · ${stats.sl} SL`} icon={BarChart2} />
            <StatCard label="Win Rate" value={`${stats.winRate}%`}
              color={stats.winRate >= 50 ? 'text-forge-green' : 'text-forge-red'}
              glow={stats.winRate >= 50 ? '#2EA043' : '#F85149'}
              icon={stats.winRate >= 50 ? TrendingUp : TrendingDown} />
            <StatCard label="P&L"
              value={stats.rr >= 0 ? `+${stats.rr}R` : `${stats.rr}R`}
              color={stats.rr >= 0 ? 'text-forge-green' : 'text-forge-red'}
              glow={stats.rr >= 0 ? '#2EA043' : '#F85149'}
              icon={stats.rr >= 0 ? TrendingUp : TrendingDown} />
            <StatCard label="Discipline" value={`${stats.disc}/10`}
              color={stats.disc >= 7 ? 'text-forge-green' : stats.disc >= 5 ? 'text-forge-accent' : 'text-forge-red'}
              glow={stats.disc >= 7 ? '#2EA043' : stats.disc >= 5 ? '#F7B731' : '#F85149'}
              icon={Zap} />
          </div>
          <div className="flex gap-1 h-1.5 rounded-full overflow-hidden">
            {stats.tp     > 0 && <div style={{ flex: stats.tp,     background: '#2EA043' }} />}
            {stats.sl     > 0 && <div style={{ flex: stats.sl,     background: '#F85149' }} />}
            {stats.be     > 0 && <div style={{ flex: stats.be,     background: '#58a6ff' }} />}
            {stats.missed > 0 && <div style={{ flex: stats.missed, background: '#8B949E' }} />}
          </div>
        </Section>
      )}

      {/* ── Trades par jour ── */}
      <Section title={`Trades · ${weekTrades.length}`} icon={BarChart2} defaultOpen>
        {weekTrades.length === 0
          ? <p className="text-xs text-forge-muted/50 italic py-2">Aucun trade cette semaine.</p>
          : Object.entries(tradesByDay).map(([day, dayTrades]) => (
            <div key={day} className="mb-4 last:mb-0">
              <p className="text-[10px] text-forge-muted uppercase tracking-widest mb-1 font-medium">{day}</p>
              {dayTrades.map(t => (
                <TradeRow key={t.id} trade={t} onClick={() => navigate(`/trades/${t.id}`)} />
              ))}
            </div>
          ))
        }
      </Section>

      {/* ── News ── */}
      <Section title="News de la semaine" icon={Newspaper} defaultOpen={false}
        action={editMode && (
          <label onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg cursor-pointer"
            style={{ background: 'rgba(247,183,49,0.1)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.2)' }}>
            <Upload size={10} /> Photo
            <input ref={newsRef} type="file" accept="image/*" className="hidden" onChange={handleNewsUpload} />
          </label>
        )}>
        {display.news_images.length === 0
          ? <p className="text-xs text-forge-muted/50 italic py-2">Aucune image news.</p>
          : (
            <div className="grid grid-cols-2 gap-2">
              {display.news_images.map((img, i) => (
                <div key={i} className="relative group">
                  <button onClick={() => setLightbox(img.url)} className="w-full block">
                    <img src={img.url} alt="" className="w-full h-28 object-cover rounded-xl" />
                  </button>
                  {editMode && (
                    <button onClick={() => removeNews(i)}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(248,81,73,0.8)' }}>
                      <X size={10} className="text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        }
      </Section>

      {/* ── Notes ── */}
      <Section title="Notes" icon={StickyNote} defaultOpen={false}>
        {editMode
          ? <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Observations, contexte macro, plan de la semaine..."
              className="w-full resize-none text-sm" rows={5} />
          : display.notes
            ? <p className="text-sm text-forge-muted leading-relaxed whitespace-pre-wrap">{display.notes}</p>
            : <p className="text-xs text-forge-muted/50 italic py-2">Aucune note.</p>
        }
      </Section>

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}