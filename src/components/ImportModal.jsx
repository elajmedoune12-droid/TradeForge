import { useState } from 'react'
import {
  X, Upload, Image as ImageIcon, Link as LinkIcon,
  ExternalLink, Check, Loader2, AlertTriangle,
} from 'lucide-react'
import { uploadImage } from '../services/supabase'

/**
 * ImportModal
 * ────────────────────────────────────────────────────────────
 * Modale d'import simple pour TradeDetail : ajoute une image ou
 * un lien (TradingView, etc.) directement au trade, sans repasser
 * par "Modifier". Même pattern que les panneaux existants dans
 * AddTrade.jsx / AfterTrade.jsx.
 *
 * Props :
 *  - tradeId    : id du trade courant
 *  - userId     : id de l'utilisateur (pour le chemin de storage)
 *  - timeframes : liste des timeframes dispo
 *  - onClose    : () => void
 *  - onAttach   : (attachment) => Promise<void>
 *      attachment = { url, timeframe, label, isLink, path? }
 *      → à pousser dans trade.images existant côté parent
 */

const DEFAULT_TIMEFRAMES = ['Monthly', 'Weekly', 'Daily', 'H4', 'H2', 'H1', 'M30', 'M15', 'M5', 'M3', 'M1']

export default function ImportModal({
  tradeId,
  userId,
  timeframes = DEFAULT_TIMEFRAMES,
  onClose,
  onAttach,
}) {
  const [mode, setMode] = useState('image') // 'image' | 'link'
  const [tf, setTf]     = useState('Daily')
  const [file, setFile] = useState(null)
  const [url, setUrl]   = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const handlePickFile = (f) => {
    if (!f) return
    setFile(f)
    if (!label) setLabel(f.name.replace(/\.[^/.]+$/, ''))
  }

  const handleSubmit = async () => {
    setError('')
    if (mode === 'image' && !file) return
    if (mode === 'link' && !url.trim()) return

    setBusy(true)
    try {
      if (mode === 'image') {
        const ext  = file.name.split('.').pop()
        const path = `${userId}/${tradeId}/import_${tf}_${Date.now()}.${ext}`
        const uploadedUrl = await uploadImage(file, path)
        await onAttach({ url: uploadedUrl, timeframe: tf, label: label || file.name, path, isLink: false })
      } else {
        await onAttach({ url: url.trim(), timeframe: tf, label: label || tf, isLink: true })
      }
      setToast('Élément attaché au trade.')
      setFile(null)
      setUrl('')
      setLabel('')
      setTimeout(() => { setToast(null); onClose() }, 1100)
    } catch (e) {
      setError(e.message || "Erreur lors de l'import.")
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = mode === 'image' ? !!file : !!url.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col"
        style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm font-semibold text-white">Importer dans ce trade</p>
          <button onClick={onClose} className="text-forge-muted hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 overflow-y-auto flex-1 space-y-3">

          {/* Mode toggle */}
          <div className="flex gap-1">
            {[['image', 'Image', ImageIcon], ['link', 'Lien', LinkIcon]].map(([v, l, Icon]) => (
              <button key={v} type="button" onClick={() => { setMode(v); setError('') }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all"
                style={mode === v
                  ? { background: 'rgba(247,183,49,0.12)', color: '#F7B731', borderColor: 'rgba(247,183,49,0.3)' }
                  : { background: 'rgba(255,255,255,0.03)', color: '#8B949E', borderColor: 'rgba(255,255,255,0.08)' }
                }>
                <Icon size={13} /> {l}
              </button>
            ))}
          </div>

          {/* Timeframe */}
          <div>
            <p className="text-[10px] text-forge-muted mb-1">Timeframe</p>
            <select value={tf} onChange={e => setTf(e.target.value)} className="w-full text-sm">
              {timeframes.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {mode === 'image' ? (
            <>
              {!file ? (
                <label className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl cursor-pointer text-forge-muted hover:text-white transition-colors"
                  style={{ border: '2px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)' }}>
                  <Upload size={20} />
                  <span className="text-sm font-medium">Choisir une image</span>
                  <span className="text-[11px] text-forge-muted">PNG, JPG</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => handlePickFile(e.target.files?.[0])} />
                </label>
              ) : (
                <div className="rounded-xl p-3 flex items-center gap-3"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <img src={URL.createObjectURL(file)} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{file.name}</p>
                    <p className="text-[11px] text-forge-muted">{(file.size / 1024).toFixed(0)} Ko</p>
                  </div>
                  <button onClick={() => setFile(null)} className="text-forge-muted hover:text-forge-red transition-colors">
                    <X size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <input value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://www.tradingview.com/chart/..."
                className="w-full text-sm" />
              {url.trim() && (
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(88,166,255,0.08)', border: '1px solid rgba(88,166,255,0.2)' }}>
                  <ExternalLink size={13} style={{ color: '#58a6ff', flexShrink: 0 }} />
                  <p className="text-xs truncate" style={{ color: '#58a6ff' }}>{url.trim()}</p>
                </div>
              )}
            </div>
          )}

          {/* Label */}
          {canSubmit && (
            <div>
              <p className="text-[10px] text-forge-muted mb-1">Label</p>
              <input value={label} onChange={e => setLabel(e.target.value)}
                placeholder={mode === 'image' ? 'Ex: Entrée H4' : 'Ex: Analyse TradingView'}
                className="w-full text-sm" />
            </div>
          )}

          {error && (
            <p className="text-xs flex items-start gap-1.5" style={{ color: '#F85149' }}>
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" /> {error}
            </p>
          )}

          <button onClick={handleSubmit} disabled={!canSubmit || busy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'rgba(247,183,49,0.12)', border: '1px solid rgba(247,183,49,0.3)', color: '#F7B731' }}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {busy ? 'Import en cours...' : 'Attacher au trade'}
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="px-4 py-2.5 flex-shrink-0 text-xs font-medium"
            style={{ background: 'rgba(46,160,67,0.12)', color: '#2EA043', borderTop: '1px solid rgba(46,160,67,0.25)' }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}