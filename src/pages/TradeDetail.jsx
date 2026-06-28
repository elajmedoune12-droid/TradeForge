import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ChevronLeft, Edit2, Trash2, BookOpen, X,
  ChevronLeft as Prev, ChevronRight as Next,
  Sparkles, ExternalLink, Download, Upload,
  Brain, BarChart2, Shield, Calendar, Plus,
  AlertTriangle, FileText,
} from 'lucide-react'
import { getTradeById, deleteTrade, updateTrade } from '../services/supabase'
import { fmtDate } from '../utils'
import { useAuth } from '../hooks/useAuth'
import AIAssistant from '../components/AIAssistant'
import ImportModal from '../components/ImportModal'
import ExportModal from '../components/ExportModal'

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
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 12 }}
        onClick={e => e.stopPropagation()}
      >
        <span className="text-sm font-mono" style={{ color: 'var(--forge-muted)' }}>{images[idx]?.timeframe}</span>
        <span className="text-xs" style={{ color: 'var(--forge-muted)' }}>{idx + 1} / {images.length}</span>
        <button onClick={onClose} className="transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center px-4" onClick={e => e.stopPropagation()}>
        <img src={images[idx]?.url} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
      </div>
      <div className="flex items-center justify-between px-4 py-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setIdx(i => Math.max(i - 1, 0))}
          disabled={idx === 0}
          className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
        >
          <Prev size={18} />
        </button>
        <div className="flex gap-2 overflow-x-auto max-w-[60vw] px-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="flex-shrink-0 rounded-lg overflow-hidden transition-all"
              style={{ border: `2px solid ${i === idx ? '#F7B731' : 'transparent'}`, opacity: i === idx ? 1 : 0.5 }}
            >
              <img src={img.url} alt="" className="w-12 h-12 object-cover" />
            </button>
          ))}
        </div>
        <button
          onClick={() => setIdx(i => Math.min(i + 1, images.length - 1))}
          disabled={idx === images.length - 1}
          className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
        >
          <Next size={18} />
        </button>
      </div>
    </div>
  )
}

// ── InfoRow ───────────────────────────────────────────────────
const InfoRow = ({ label, value, mono, color }) => (
  <div
    className="flex justify-between items-center py-2.5 border-b last:border-0"
    style={{ borderColor: 'var(--border-soft)' }}
  >
    <span className="text-xs" style={{ color: 'var(--forge-muted)' }}>{label}</span>
    <span
      className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}
      style={color ? { color } : { color: 'var(--text-primary)' }}
    >
      {value ?? '—'}
    </span>
  </div>
)

// ── AfterTradeSection ─────────────────────────────────────────
function AfterTradeSection({ hindsight, tradeId, navigate }) {
  const [lightbox, setLightbox] = useState(null)

  const h = Array.isArray(hindsight) ? hindsight[0] : hindsight
  const hasAfterTrade = !!(h && h.main_error)

  const hImages = (h?.images || []).filter(img => img.url && !img.isLink && img.path)
  const hLinks  = (h?.images || []).filter(img => img.url && (img.isLink || !img.path))

  if (!hasAfterTrade) {
    return (
      <div
        className="rounded-2xl p-5 mb-4"
        style={{
          background: 'var(--surface-card)',
          border: '1px dashed rgba(247,183,49,0.3)',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(247,183,49,0.1)', border: '1px solid rgba(247,183,49,0.2)' }}
          >
            <BookOpen size={14} className="text-forge-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>After Trade</p>
            <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>Analyse post-trade non remplie</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/app/trades/${tradeId}/after-trade`)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
          style={{ background: 'rgba(247,183,49,0.1)', border: '1px solid rgba(247,183,49,0.3)', color: '#F7B731' }}
        >
          <Plus size={15} /> Remplir l'After Trade
        </button>
      </div>
    )
  }

  return (
    <>
      {lightbox && (
        <Lightbox images={lightbox.images} startIndex={lightbox.startIndex} onClose={() => setLightbox(null)} />
      )}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid rgba(247,183,49,0.2)',
          borderLeft: '3px solid #F7B731',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={13} className="text-forge-accent" />
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--forge-muted)' }}>After Trade</p>
          </div>
          <button
            onClick={() => navigate(`/app/trades/${tradeId}/after-trade`)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95"
            style={{
              background: 'var(--surface-4)',
              border: '1px solid var(--border-soft)',
              color: 'var(--forge-muted)',
            }}
          >
            <Edit2 size={10} /> Modifier
          </button>
        </div>

        {/* Erreur */}
        {h.main_error && (
          <div
            className="rounded-xl p-3 mb-3"
            style={{ background: 'rgba(248,81,73,0.07)', border: '1px solid rgba(248,81,73,0.15)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle size={11} style={{ color: '#F85149' }} />
              <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: '#F85149' }}>Erreur principale</p>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{h.main_error}</p>
          </div>
        )}

        {/* Leçon */}
        {h.lesson && (
          <div
            className="rounded-xl p-3 mb-3"
            style={{ background: 'rgba(88,166,255,0.07)', border: '1px solid rgba(88,166,255,0.15)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <FileText size={11} style={{ color: '#58a6ff' }} />
              <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: '#58a6ff' }}>Leçon tirée</p>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{h.lesson}</p>
          </div>
        )}

        {/* Règle */}
        {h.rule && (
          <div
            className="rounded-xl p-3 mb-3"
            style={{ background: 'rgba(46,160,67,0.07)', border: '1px solid rgba(46,160,67,0.15)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Shield size={11} style={{ color: '#2EA043' }} />
              <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: '#2EA043' }}>Règle à appliquer</p>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{h.rule}</p>
          </div>
        )}

        {/* Notes */}
        {h.notes && (
          <div className="pt-2 pb-1 mb-2 border-t" style={{ borderColor: 'var(--border-soft)' }}>
            <p className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: 'var(--forge-muted)' }}>Notes</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{h.notes}</p>
          </div>
        )}

        {/* Tags */}
        {h.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {h.tags.map(tag => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(247,183,49,0.1)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.2)' }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Captures */}
        {(hImages.length > 0 || hLinks.length > 0) && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
            <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--forge-muted)' }}>Captures hindsight</p>
            {hImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {hImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setLightbox({ images: hImages, startIndex: i })}
                    className="aspect-square rounded-xl overflow-hidden border transition-all hover:scale-[1.02] active:scale-95"
                    style={{ borderColor: 'var(--border-medium)' }}
                  >
                    <img src={img.url} alt={img.timeframe} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {hLinks.length > 0 && (
              <div className="space-y-1.5">
                {hLinks.map((lnk, i) => (
                  <a
                    key={i}
                    href={lnk.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all hover:scale-[1.01] active:scale-95"
                    style={{ background: 'rgba(88,166,255,0.08)', border: '1px solid rgba(88,166,255,0.2)' }}
                  >
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
  const location = useLocation()
  const { user } = useAuth()

  const [trade, setTrade]           = useState(null)
  const [loading, setLoading]       = useState(true)
  const [lightbox, setLightbox]     = useState(null)
  const [deleting, setDeleting]     = useState(false)
  const [showAI, setShowAI]         = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showExport, setShowExport] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setTrade(null)
    getTradeById(id)
      .then(setTrade)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!confirm('Supprimer ce trade ?')) return
    setDeleting(true)
    await deleteTrade(id)
    navigate('/app/trades')
  }

  const refreshTrade = async () => {
    const updated = await getTradeById(id)
    setTrade(updated)
  }

  const handleAttachImport = async (attachment) => {
    const currentImages = trade.images || []
    const nextImages = [...currentImages, attachment]
    await updateTrade(id, { images: nextImages })
    await refreshTrade()
  }

  if (loading) return (
    <div className="page flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-forge-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!trade) return (
    <div className="page text-center py-16" style={{ color: 'var(--forge-muted)' }}>Trade introuvable.</div>
  )

  const allImages = (trade.images || [])
  const imgOnly   = allImages.filter(img => !img.isLink)

  const byTF = {}
  allImages.forEach(img => {
    if (!byTF[img.timeframe]) byTF[img.timeframe] = []
    byTF[img.timeframe].push(img)
  })

  const rc = RESULT_CONFIG[trade.result] || RESULT_CONFIG.missed
  const rrColor = trade.result === 'tp'
    ? '#2EA043'
    : trade.result === 'sl'
    ? '#F85149'
    : trade.result === 'manual_exit'
    ? (trade.rr_won >= 0 ? '#2EA043' : '#F85149')
    : '#8B949E'
  const rrValue = trade.result === 'tp'
    ? `+${trade.rr_won ?? 0}R`
    : trade.result === 'sl'
    ? `${trade.rr_won ?? -1}R`
    : trade.rr_won != null
    ? `${trade.rr_won >= 0 ? '+' : ''}${trade.rr_won}R`
    : null

  return (
    <div className="page">
      {lightbox && (
        <Lightbox images={lightbox.images} startIndex={lightbox.startIndex} onClose={() => setLightbox(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-2">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 hover-text-primary"
          style={{
            border: '1px solid var(--border-soft)',
            background: 'var(--surface-2)',
            color: 'var(--forge-muted)',
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex gap-1.5 flex-wrap justify-end">
          <button
            onClick={() => setShowImport(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{ background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.25)', color: '#58a6ff' }}
            title="Importer"
          >
            <Download size={14} />
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{ background: 'rgba(46,160,67,0.1)', border: '1px solid rgba(46,160,67,0.25)', color: '#2EA043' }}
            title="Exporter"
          >
            <Upload size={14} />
          </button>
          <button
            onClick={() => setShowAI(true)}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-medium transition-all active:scale-95"
            style={{ background: 'rgba(247,183,49,0.1)', border: '1px solid rgba(247,183,49,0.25)', color: '#F7B731' }}
          >
            <Sparkles size={12} /> <span className="hidden sm:inline">Coach</span> IA
          </button>
          <button
            onClick={() => navigate(`/app/trades/${id}/edit`)}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-medium transition-all active:scale-95"
            style={{
              background: 'var(--surface-4)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
            }}
          >
            <Edit2 size={12} /> <span className="hidden sm:inline">Modifier</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{
              border: '1px solid var(--border-soft)',
              background: 'var(--surface-2)',
              color: 'var(--forge-muted)',
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Hero */}
      <div
        className="rounded-2xl p-5 mb-4 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${rc.bg}, var(--surface-card))`,
          border: `1px solid ${rc.border}`,
          boxShadow: `0 0 40px ${rc.glow}`,
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ background: `radial-gradient(ellipse at top right, ${rc.color}, transparent 60%)` }}
        />
        <div className="relative">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{trade.market}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-sm font-mono font-semibold px-2 py-0.5 rounded-lg"
                  style={{
                    background: trade.type === 'buy' ? 'rgba(46,160,67,0.2)' : 'rgba(248,81,73,0.2)',
                    color: trade.type === 'buy' ? '#2EA043' : '#F85149',
                  }}
                >
                  {trade.type?.toUpperCase()}
                </span>
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--forge-muted)' }}>
                  <Calendar size={10} /> {fmtDate(trade.date)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span
                className="text-sm font-semibold px-3 py-1.5 rounded-xl"
                style={{ background: rc.bg, color: rc.color, border: `1px solid ${rc.border}` }}
              >
                {rc.label}
              </span>
              {rrValue && (
                <p className="text-3xl font-mono font-bold mt-2" style={{ color: rrColor }}>{rrValue}</p>
              )}
            </div>
          </div>
          <div
            className="flex items-center gap-3 pt-3 border-t"
            style={{ borderColor: 'var(--border-soft)' }}
          >
            {trade.rr_planned && (
              <div className="text-center">
                <p className="text-[10px]" style={{ color: 'var(--forge-muted)' }}>RR Prévu</p>
                <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{trade.rr_planned}R</p>
              </div>
            )}
            {trade.discipline_score && (
              <div className="text-center">
                <p className="text-[10px]" style={{ color: 'var(--forge-muted)' }}>Discipline</p>
                <p
                  className="text-sm font-mono font-semibold"
                  style={{ color: trade.discipline_score >= 7 ? '#2EA043' : trade.discipline_score >= 5 ? '#F7B731' : '#F85149' }}
                >
                  {trade.discipline_score}/10
                </p>
              </div>
            )}
            {trade.session && (
              <div className="text-center">
                <p className="text-[10px]" style={{ color: 'var(--forge-muted)' }}>Session</p>
                <p className="text-xs font-medium truncate max-w-[80px]" style={{ color: 'var(--text-primary)' }}>{trade.session}</p>
              </div>
            )}
            {trade.day && (
              <div className="text-center">
                <p className="text-[10px]" style={{ color: 'var(--forge-muted)' }}>Jour</p>
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{trade.day}</p>
              </div>
            )}
            {trade.trend && (
              <div className="text-center">
                <p className="text-[10px]" style={{ color: 'var(--forge-muted)' }}>Tendance</p>
                <p className="text-xs font-semibold" style={{ color: TREND_COLORS[trade.trend] || '#8B949E' }}>
                  {TREND_LABELS[trade.trend] || trade.trend}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contexte de marché */}
      {(trade.trend || trade.session || trade.day || trade.style || trade.market_structure) && (
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={13} className="text-forge-accent" />
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--forge-muted)' }}>Contexte de marché</p>
          </div>
          {trade.trend            && <InfoRow label="Tendance"  value={TREND_LABELS[trade.trend] || trade.trend} color={TREND_COLORS[trade.trend]} />}
          {trade.market_structure && <InfoRow label="Structure" value={trade.market_structure} />}
          {trade.session          && <InfoRow label="Session"   value={trade.session} />}
          {trade.day              && <InfoRow label="Jour"      value={trade.day} />}
          {trade.style            && <InfoRow label="Style"     value={trade.style} />}
        </div>
      )}

      {/* Psychologie */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Brain size={13} className="text-forge-accent" />
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--forge-muted)' }}>Psychologie</p>
        </div>
        <InfoRow label="Émotion" value={trade.emotion} />
        <InfoRow
          label="Respect du plan"
          value={trade.respect_plan ? '✓ Respecté' : '✗ Non respecté'}
          color={trade.respect_plan ? '#2EA043' : '#F85149'}
        />
        <InfoRow
          label="Discipline"
          value={trade.discipline_score ? `${trade.discipline_score}/10` : null}
          mono
          color={trade.discipline_score >= 7 ? '#2EA043' : trade.discipline_score >= 5 ? '#F7B731' : '#F85149'}
        />
        {trade.notes && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
            <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--forge-muted)' }}>Notes</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{trade.notes}</p>
          </div>
        )}
      </div>

      {/* Analyses multi-timeframe */}
      {Object.keys(byTF).length > 0 && (
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={13} className="text-forge-accent" />
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--forge-muted)' }}>Analyses multi-timeframe</p>
          </div>
          {Object.entries(byTF).map(([tf, items]) => (
            <div key={tf} className="mb-4 last:mb-0">
              <p className="text-[10px] font-mono text-forge-accent mb-2 uppercase tracking-widest">{tf}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {items.map((img, i) => (
                  img.isLink ? (
                    <a
                      key={i}
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all hover:scale-[1.01] active:scale-95 col-span-3"
                      style={{ background: 'rgba(88,166,255,0.08)', border: '1px solid rgba(88,166,255,0.2)' }}
                    >
                      <ExternalLink size={13} style={{ color: '#58a6ff', flexShrink: 0 }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px]" style={{ color: 'var(--forge-muted)' }}>{img.timeframe}</p>
                        <p className="text-xs truncate" style={{ color: '#58a6ff' }}>{img.label || img.url}</p>
                      </div>
                    </a>
                  ) : (
                    <button
                      key={i}
                      onClick={() => setLightbox({ images: imgOnly, startIndex: imgOnly.indexOf(img) })}
                      className="rounded-lg overflow-hidden border transition-all hover:scale-[1.02] active:scale-95"
                      style={{ borderColor: 'var(--border-medium)', aspectRatio: '16/9', height: '60px' }}
                    >
                      <img src={img.url} alt={tf} className="w-full h-full object-cover" />
                    </button>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* After Trade */}
      <AfterTradeSection
        hindsight={trade.hindsight}
        tradeId={id}
        navigate={navigate}
      />

      {showAI && <AIAssistant trade={trade} onClose={() => setShowAI(false)} />}

      {showImport && (
        <ImportModal
          tradeId={id}
          userId={user.id}
          onClose={() => setShowImport(false)}
          onAttach={handleAttachImport}
        />
      )}

      {showExport && (
        <ExportModal
          trade={trade}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}