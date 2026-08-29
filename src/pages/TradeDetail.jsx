import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Edit2, Trash2, BookOpen, X,
  ChevronLeft as Prev, ChevronRight as Next,
  Sparkles, ExternalLink, Upload,
  Brain, BarChart2, Shield, Calendar, Plus,
  AlertTriangle, FileText, Zap, Target, Clock,
  TrendingUp,
} from 'lucide-react'
import { getTradeById, deleteTrade } from '../services/supabase'
import { fmtDate } from '../utils'
import { useAuth } from '../hooks/useAuth'
import AIAssistant from '../components/AIAssistant'
import ExportModal from '../components/ExportModal'
import { useUIStore } from '../store/useUIStore'

const RESULT_CONFIG = {
  tp:          { label: 'Take Profit',     bg: 'rgba(46,160,67,0.12)',   color: '#2EA043', border: 'rgba(46,160,67,0.3)',   glow: 'rgba(46,160,67,0.15)'  },
  sl:          { label: 'Stop Loss',       bg: 'rgba(248,81,73,0.12)',   color: '#F85149', border: 'rgba(248,81,73,0.3)',   glow: 'rgba(248,81,73,0.15)'  },
  be:          { label: 'Breakeven',       bg: 'rgba(88,166,255,0.12)',  color: '#58a6ff', border: 'rgba(88,166,255,0.3)',  glow: 'rgba(88,166,255,0.15)' },
  missed:      { label: 'Missed',          bg: 'rgba(139,148,158,0.12)', color: '#8B949E', border: 'rgba(139,148,158,0.3)', glow: 'rgba(139,148,158,0.1)' },
  manual_exit: { label: 'Sortie manuelle', bg: 'rgba(247,144,9,0.12)',   color: '#F79009', border: 'rgba(247,144,9,0.3)',   glow: 'rgba(247,144,9,0.15)'  },
}

const TREND_LABELS = { bullish: '▲ Bullish', bearish: '▼ Bearish', neutre: '— Neutre' }
const TREND_COLORS = { bullish: '#2EA043', bearish: '#F85149', neutre: '#8B949E' }

// ── Lightbox ──────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex)
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, images.length - 1))
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [images.length, onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 12 }}
        onClick={e => e.stopPropagation()}>
        <span className="text-sm font-mono" style={{ color: 'var(--forge-muted)' }}>{images[idx]?.timeframe}</span>
        <span className="text-xs" style={{ color: 'var(--forge-muted)' }}>{idx + 1} / {images.length}</span>
        <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.6)' }}><X size={20} /></button>
      </div>
      <div className="flex-1 flex items-center justify-center px-4" onClick={e => e.stopPropagation()}>
        <img src={images[idx]?.url} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
      </div>
      <div className="flex items-center justify-between px-4 py-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={() => setIdx(i => Math.max(i - 1, 0))} disabled={idx === 0}
          className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
          <Prev size={18} />
        </button>
        <div className="flex gap-2 overflow-x-auto max-w-[60vw] px-1">
          {images.map((img, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className="flex-shrink-0 rounded-lg overflow-hidden transition-all"
              style={{ border: `2px solid ${i === idx ? '#F7B731' : 'transparent'}`, opacity: i === idx ? 1 : 0.5 }}>
              <img src={img.url} alt="" className="w-12 h-12 object-cover" />
            </button>
          ))}
        </div>
        <button onClick={() => setIdx(i => Math.min(i + 1, images.length - 1))} disabled={idx === images.length - 1}
          className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
          <Next size={18} />
        </button>
      </div>
    </div>
  )
}

// ── Section collapsible ───────────────────────────────────────
function Section({ title, icon: Icon, color, defaultOpen = true, children, badge }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl mb-3 overflow-hidden"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)' }}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 transition-opacity hover:opacity-80">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={13} style={{ color: color || '#F7B731' }} />}
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--forge-muted)' }}>{title}</span>
          {badge != null && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
              style={{ background: 'rgba(247,183,49,0.15)', color: '#F7B731' }}>{badge}</span>
          )}
        </div>
        <ChevronRight size={13} className="transition-transform duration-200"
          style={{ color: 'var(--forge-muted)', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

// ── InfoRow ───────────────────────────────────────────────────
const InfoRow = ({ label, value, mono, color, icon: Icon }) => (
  <div className="flex justify-between items-center py-2.5 border-b last:border-0"
    style={{ borderColor: 'var(--border-soft)' }}>
    <div className="flex items-center gap-1.5">
      {Icon && <Icon size={11} style={{ color: 'var(--forge-muted)' }} />}
      <span className="text-xs" style={{ color: 'var(--forge-muted)' }}>{label}</span>
    </div>
    <span className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}
      style={color ? { color } : { color: 'var(--text-primary)' }}>
      {value ?? '—'}
    </span>
  </div>
)

// ── DisciplineBar ─────────────────────────────────────────────
function DisciplineBar({ score }) {
  if (score == null) return (
    <div className="flex items-center justify-end">
      <span className="text-sm" style={{ color: 'var(--forge-muted)' }}>—</span>
    </div>
  )
  const color = score >= 7 ? '#2EA043' : score >= 5 ? '#F7B731' : '#F85149'
  const label = score >= 7 ? 'Solide 💪' : score >= 5 ? 'Moyen' : 'Faible ⚠️'
  return (
    <div className="flex items-center gap-2 flex-1 justify-end flex-wrap">
      <div className="flex gap-0.5">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="rounded-sm transition-all"
            style={{
              width: 10, height: 10,
              background: i < score ? color : 'var(--surface-6)',
              opacity: i < score ? 1 : 0.25,
            }} />
        ))}
      </div>
      <span className="text-sm font-mono font-bold" style={{ color }}>{score}/10</span>
      <span className="text-[10px] px-1.5 py-0.5 rounded-lg hidden sm:inline"
        style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>{label}</span>
    </div>
  )
}

// ── AfterTradeSection ─────────────────────────────────────────
function AfterTradeSection({ hindsight, tradeId, navigate }) {
  const [lightbox, setLightbox] = useState(null)
  const h = Array.isArray(hindsight) ? hindsight[0] : hindsight
  const hasAfterTrade = !!(h && h.main_error)
  const hImages = (h?.images || []).filter(img => img.url && !img.isLink && img.path)
  const hLinks  = (h?.images || []).filter(img => img.url && (img.isLink || !img.path))

  if (!hasAfterTrade) {
    return (
      <div className="rounded-2xl p-5 mb-3"
        style={{ background: 'var(--surface-card)', border: '1px dashed rgba(247,183,49,0.3)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(247,183,49,0.1)', border: '1px solid rgba(247,183,49,0.2)' }}>
            <BookOpen size={16} className="text-forge-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>After Trade</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--forge-muted)' }}>Aucune analyse post-trade remplie</p>
          </div>
        </div>
        <button onClick={() => navigate(`/app/trades/${tradeId}/after-trade`)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: 'rgba(247,183,49,0.1)', border: '1px solid rgba(247,183,49,0.3)', color: '#F7B731' }}>
          <Plus size={15} /> Remplir l'After Trade
        </button>
      </div>
    )
  }

  return (
    <>
      {lightbox && <Lightbox images={lightbox.images} startIndex={lightbox.startIndex} onClose={() => setLightbox(null)} />}
      <div className="rounded-2xl p-4 mb-3"
        style={{ background: 'var(--surface-card)', border: '1px solid rgba(247,183,49,0.2)', borderLeft: '3px solid #F7B731' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={13} className="text-forge-accent" />
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--forge-muted)' }}>After Trade</p>
          </div>
          <button onClick={() => navigate(`/app/trades/${tradeId}/after-trade`)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95"
            style={{ background: 'var(--surface-4)', border: '1px solid var(--border-soft)', color: 'var(--forge-muted)' }}>
            <Edit2 size={10} /> Modifier
          </button>
        </div>

        <div className="space-y-2">
          {h.main_error && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(248,81,73,0.07)', border: '1px solid rgba(248,81,73,0.15)' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle size={11} style={{ color: '#F85149' }} />
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#F85149' }}>Erreur principale</p>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{h.main_error}</p>
            </div>
          )}
          {h.lesson && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(88,166,255,0.07)', border: '1px solid rgba(88,166,255,0.15)' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <FileText size={11} style={{ color: '#58a6ff' }} />
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#58a6ff' }}>Leçon tirée</p>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{h.lesson}</p>
            </div>
          )}
          {h.rule && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(46,160,67,0.07)', border: '1px solid rgba(46,160,67,0.15)' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield size={11} style={{ color: '#2EA043' }} />
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#2EA043' }}>Règle à appliquer</p>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{h.rule}</p>
            </div>
          )}
        </div>

        {h.notes && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
            <p className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: 'var(--forge-muted)' }}>Notes</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{h.notes}</p>
          </div>
        )}

        {h.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {h.tags.map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(247,183,49,0.1)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.2)' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {(hImages.length > 0 || hLinks.length > 0) && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
            <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--forge-muted)' }}>Captures hindsight</p>
            {hImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {hImages.map((img, i) => (
                  <button key={i} onClick={() => setLightbox({ images: hImages, startIndex: i })}
                    className="aspect-square rounded-xl overflow-hidden border transition-all hover:scale-[1.02] active:scale-95"
                    style={{ borderColor: 'var(--border-medium)' }}>
                    <img src={img.url} alt={img.timeframe} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {hLinks.length > 0 && (
              <div className="space-y-1.5">
                {hLinks.map((lnk, i) => (
                  <a key={i} href={lnk.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all hover:scale-[1.01] active:scale-95"
                    style={{ background: 'rgba(88,166,255,0.08)', border: '1px solid rgba(88,166,255,0.2)' }}>
                    <ExternalLink size={13} style={{ color: '#58a6ff', flexShrink: 0 }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px]" style={{ color: 'var(--forge-muted)' }}>{lnk.timeframe}</p>
                      <p className="text-xs truncate" style={{ color: '#58a6ff' }}>{lnk.label || lnk.url}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── Page ─────────────────────────────────────────────────────
export default function TradeDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const tradeCache       = useUIStore(s => s.tradeCache)
  const setTradeCache    = useUIStore(s => s.setTradeCache)
  const clearCache       = useUIStore(s => s.clearTradeCache)
  const setLastTradeId   = useUIStore(s => s.setLastTradeId)
  const clearLastTradeId = useUIStore(s => s.clearLastTradeId)

  const [trade, setTrade]           = useState(tradeCache[id] || null)
  const [loading, setLoading]       = useState(!tradeCache[id])
  const [loadError, setLoadError]   = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [lightbox, setLightbox]     = useState(null)
  const [deleting, setDeleting]     = useState(false)
  const [showAI, setShowAI]         = useState(false)
  const [showExport, setShowExport] = useState(false)

  // Charge le trade avec garde anti-race (évite qu'un fetch A→B
  // écrase les données par un résultat en retard).
  useEffect(() => {
    if (!id) return
    let ignore = false
    setLoadError('')

    const load = () => {
      getTradeById(id)
        .then(t => {
          if (ignore) return
          setTrade(t)
          setTradeCache(id, t)
          setLastTradeId(id)
        })
        .catch(e => {
          if (ignore) return
          setLoadError(e.message || "Impossible de charger ce trade.")
        })
        .finally(() => { if (!ignore) setLoading(false) })
    }

    if (tradeCache[id]) {
      setTrade(tradeCache[id])
      setLoading(false)
      setLastTradeId(id)
      load() // rafraîchit en arrière-plan
    } else {
      setLoading(true)
      setTrade(null)
      load()
    }

    return () => { ignore = true }
  }, [id])

  const handleDelete = async () => {
    if (!window.confirm('Supprimer ce trade ?')) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteTrade(id)
      clearCache(id)
      clearLastTradeId()
      navigate('/app/trades')
    } catch (e) {
      setDeleteError(e.message || "Impossible de supprimer ce trade.")
    } finally {
      setDeleting(false)
    }
  }

  // ── Loading skeleton ──────────────────────────────────────
  if (loading) return (
    <div className="page">
      <div className="flex items-center justify-between mb-5">
        <div className="w-9 h-9 rounded-xl animate-pulse" style={{ background: 'var(--surface-6)' }} />
        <div className="flex gap-1.5">
          {[...Array(4)].map((_, i) => <div key={i} className="w-9 h-9 rounded-xl animate-pulse" style={{ background: 'var(--surface-4)' }} />)}
        </div>
      </div>
      <div className="rounded-2xl animate-pulse mb-4" style={{ background: 'var(--surface-card)', height: 180 }} />
      <div className="rounded-2xl animate-pulse mb-3" style={{ background: 'var(--surface-card)', height: 130 }} />
      <div className="rounded-2xl animate-pulse mb-3" style={{ background: 'var(--surface-card)', height: 100 }} />
      <div className="rounded-2xl animate-pulse mb-3" style={{ background: 'var(--surface-card)', height: 150 }} />
    </div>
  )

  if (!trade) return (
    <div className="page text-center py-20">
      <p className="text-sm" style={{ color: 'var(--forge-muted)' }}>
        {loadError || 'Trade introuvable.'}
      </p>
      {loadError && loadError !== 'Trade introuvable.' && (
        <button
          onClick={() => { setLoadError(''); setLoading(true); setTrade(null); getTradeById(id).then(t => { setTrade(t); setTradeCache(id, t); setLastTradeId(id) }).finally(() => setLoading(false)) }}
          className="mt-3 btn-primary mx-auto"
          style={{ padding: '8px 16px', fontSize: 12 }}
        >
          Réessayer
        </button>
      )}
      <button onClick={() => navigate('/app/trades')} className="mt-4 text-xs text-forge-accent hover:underline">
        ← Retour aux trades
      </button>
    </div>
  )

  const allImages = trade.images || []
  const imgOnly   = allImages.filter(img => !img.isLink)
  const byTF = {}
  allImages.forEach(img => {
    if (!byTF[img.timeframe]) byTF[img.timeframe] = []
    byTF[img.timeframe].push(img)
  })

  const rc = RESULT_CONFIG[trade.result] || RESULT_CONFIG.missed
  const rrColor = trade.result === 'tp' ? '#2EA043'
    : trade.result === 'sl' ? '#F85149'
    : trade.result === 'manual_exit' ? (trade.rr_won >= 0 ? '#2EA043' : '#F85149')
    : '#8B949E'
  const rrValue = trade.result === 'tp' ? `+${trade.rr_won ?? 0}R`
    : trade.result === 'sl' ? `${trade.rr_won ?? -1}R`
    : trade.rr_won != null ? `${trade.rr_won >= 0 ? '+' : ''}${trade.rr_won}R`
    : null

  const hasAfterTrade = !!(trade.hindsight && (Array.isArray(trade.hindsight) ? trade.hindsight[0] : trade.hindsight)?.main_error)

  return (
    <div className="page">
      {lightbox && <Lightbox images={lightbox.images} startIndex={lightbox.startIndex} onClose={() => setLightbox(null)} />}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4" style={{ gap: 12 }}>
        <div className="flex items-center min-w-0" style={{ gap: 12 }}>
          <button onClick={() => navigate('/app/trades')}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 hover-text-primary"
            style={{ background: 'var(--surface-4)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)', boxShadow: '0 2px 8px -4px rgba(0,0,0,0.2)' }}>
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold min-w-0 truncate" style={{ color: 'var(--text-primary)' }}>
            Détail du trade
          </h1>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => setShowExport(true)} title="Exporter"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{ background: 'rgba(46,160,67,0.1)', border: '1px solid rgba(46,160,67,0.25)', color: '#2EA043' }}>
            <Upload size={14} />
          </button>
              <button onClick={() => setShowAI(true)}
                className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold transition-all active:scale-95"
                style={{ background: 'rgba(247,183,49,0.1)', border: '1px solid rgba(247,183,49,0.25)', color: '#F7B731' }}>
                <Sparkles size={12} />
                <span className="hidden sm:inline">Coach IA</span>
                <span className="sm:hidden">IA</span>
              </button>
              <button onClick={() => navigate(`/app/trades/${id}/edit`)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
                style={{ background: 'var(--surface-4)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                <Edit2 size={14} />
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                style={{ border: '1px solid var(--border-soft)', background: 'var(--surface-2)', color: 'var(--forge-muted)' }}>
                <Trash2 size={14} />
              </button>
            </div>
        </div>

      {/* Erreur de suppression */}
      {deleteError && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs mb-4"
          style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.25)' }}>
          <span style={{ color: '#F85149' }}>⚠️</span>
          <span style={{ color: 'var(--text-secondary)' }}>{deleteError}</span>
        </div>
      )}

      {/* ── Hero ── */}
      <div className="rounded-2xl p-5 mb-4 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${rc.bg}, var(--surface-card))`,
          border: `1px solid ${rc.border}`,
          boxShadow: `0 0 60px ${rc.glow}`,
        }}>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top right, ${rc.color}, transparent 60%)` }} />
        <div className="relative">
          <div className="flex items-start justify-between mb-4 gap-2">
            <div className="min-w-0">
              <h1 className="text-3xl font-black tracking-tight leading-none mb-2" style={{ color: 'var(--text-primary)' }}>
                {trade.market}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                  style={{
                    background: trade.type === 'buy' ? 'rgba(46,160,67,0.2)' : 'rgba(248,81,73,0.2)',
                    color: trade.type === 'buy' ? '#2EA043' : '#F85149',
                  }}>
                  {trade.type === 'buy' ? '↑ BUY' : '↓ SELL'}
                </span>
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--forge-muted)' }}>
                  <Calendar size={10} /> {fmtDate(trade.date)}
                </span>
                {trade.session && (
                  <span className="text-xs px-2 py-0.5 rounded-lg hidden sm:inline"
                    style={{ background: 'var(--surface-4)', color: 'var(--forge-muted)', border: '1px solid var(--border-soft)' }}>
                    {trade.session}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl inline-block mb-2"
                style={{ background: rc.bg, color: rc.color, border: `1px solid ${rc.border}` }}>
                {rc.label}
              </span>
              {rrValue && (
                <p className="text-4xl font-mono font-black leading-none" style={{ color: rrColor }}>{rrValue}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {[
              { label: 'RR Prévu',    value: trade.rr_planned ? `${trade.rr_planned}R` : null, color: 'var(--text-primary)', icon: Target },
              { label: 'Discipline',  value: trade.discipline_score ? `${trade.discipline_score}/10` : null, color: trade.discipline_score >= 7 ? '#2EA043' : trade.discipline_score >= 5 ? '#F7B731' : '#F85149', icon: Zap },
              { label: 'Tendance',    value: trade.trend ? TREND_LABELS[trade.trend] : null, color: trade.trend ? TREND_COLORS[trade.trend] : 'var(--forge-muted)', icon: TrendingUp },
              { label: 'After Trade', value: hasAfterTrade ? '✓ Rempli' : '✗ Vide', color: hasAfterTrade ? '#2EA043' : '#8B949E', icon: BookOpen },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="rounded-xl px-3 py-2.5 text-center"
                style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Icon size={9} style={{ color: 'rgba(139,148,158,0.5)' }} />
                  <p className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(139,148,158,0.6)' }}>{label}</p>
                </div>
                <p className="text-xs font-mono font-bold" style={{ color: color || 'var(--text-primary)' }}>
                  {value || '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Psychologie ── */}
      <Section title="Psychologie" icon={Brain} color="#58a6ff">
        <div className="flex justify-between items-center py-2.5 border-b" style={{ borderColor: 'var(--border-soft)' }}>
          <div className="flex items-center gap-1.5">
            <Zap size={11} style={{ color: 'var(--forge-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--forge-muted)' }}>Discipline</span>
          </div>
          <DisciplineBar score={trade.discipline_score} />
        </div>
        <InfoRow label="Émotion" value={trade.emotion} icon={Brain} />
        <InfoRow
          label="Respect du plan"
          value={trade.respect_plan != null ? (trade.respect_plan ? '✓ Respecté' : '✗ Non respecté') : null}
          color={trade.respect_plan ? '#2EA043' : trade.respect_plan === false ? '#F85149' : undefined}
          icon={Shield}
        />
        {trade.notes && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
            <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--forge-muted)' }}>Notes</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{trade.notes}</p>
          </div>
        )}
      </Section>

      {/* ── Contexte de marché ── */}
      {(trade.trend || trade.session || trade.day || trade.style || trade.market_structure) && (
        <Section title="Contexte de marché" icon={BarChart2} color="#F7B731">
          {trade.trend            && <InfoRow label="Tendance"  value={TREND_LABELS[trade.trend] || trade.trend} color={TREND_COLORS[trade.trend]} icon={TrendingUp} />}
          {trade.market_structure && <InfoRow label="Structure" value={trade.market_structure} icon={BarChart2} />}
          {trade.session          && <InfoRow label="Session"   value={trade.session} icon={Clock} />}
          {trade.day              && <InfoRow label="Jour"      value={trade.day} icon={Calendar} />}
          {trade.style            && <InfoRow label="Style"     value={trade.style} />}
        </Section>
      )}

      {/* ── Analyses multi-timeframe ── */}
      {Object.keys(byTF).length > 0 && (
        <Section title="Analyses" icon={BarChart2} color="#8B949E" badge={allImages.length}>
          {Object.entries(byTF).map(([tf, items]) => (
            <div key={tf} className="mb-4 last:mb-0">
              <p className="text-[10px] font-mono font-bold mb-2 uppercase tracking-widest" style={{ color: '#F7B731' }}>{tf}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {items.map((img, i) => (
                  img.isLink ? (
                    <a key={i} href={img.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all col-span-4 active:scale-95"
                      style={{ background: 'rgba(88,166,255,0.08)', border: '1px solid rgba(88,166,255,0.2)' }}>
                      <ExternalLink size={13} style={{ color: '#58a6ff', flexShrink: 0 }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px]" style={{ color: 'var(--forge-muted)' }}>{img.timeframe}</p>
                        <p className="text-xs truncate" style={{ color: '#58a6ff' }}>{img.label || img.url}</p>
                      </div>
                    </a>
                  ) : (
                    <button key={i}
                      onClick={() => setLightbox({ images: imgOnly, startIndex: imgOnly.indexOf(img) })}
                      className="rounded-xl overflow-hidden border transition-all hover:scale-[1.02] active:scale-95"
                      style={{ borderColor: 'var(--border-medium)', aspectRatio: '16/9', height: '64px' }}>
                      <img src={img.url} alt={tf} className="w-full h-full object-cover" />
                    </button>
                  )
                ))}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* ── After Trade ── */}
      <AfterTradeSection hindsight={trade.hindsight} tradeId={id} navigate={navigate} />

      {showAI     && <AIAssistant trade={trade} onClose={() => setShowAI(false)} />}
      {showExport && <ExportModal trade={trade} onClose={() => setShowExport(false)} />}
    </div>
  )
}