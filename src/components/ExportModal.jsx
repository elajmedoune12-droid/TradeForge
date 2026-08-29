import { useState, useRef } from 'react'
import {
  X, FileText, Sheet, BookOpen as NotionIcon, Download,
  Check, Loader2, Sun, Moon, Copy, ExternalLink, AlertTriangle,
} from 'lucide-react'
import { fmtDate } from '../utils'

const TABS = [
  { id: 'pdf',    label: 'PDF',           icon: FileText },
  { id: 'excel',  label: 'Excel',         icon: Sheet },
  { id: 'sheets', label: 'Google Sheets', icon: ExternalLink },
  { id: 'notion', label: 'Notion',        icon: NotionIcon },
]

const RESULT_LABELS = { tp: 'Take Profit', sl: 'Stop Loss', be: 'Breakeven', missed: 'Missed' }
const TREND_LABELS  = { bullish: 'Bullish', bearish: 'Bearish', neutre: 'Neutre' }

function slugify(str) {
  return (str || 'trade')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function getHindsight(trade) {
  const h = Array.isArray(trade.hindsight) ? trade.hindsight[0] : trade.hindsight
  return h && h.main_error ? h : null
}

async function loadJsPDF() {
  const mod = await import('jspdf')
  return mod.jsPDF || mod.default
}
async function loadXLSX() {
  const mod = await import('xlsx')
  return mod
}

function buildTradeRows(trade) {
  const h = getHindsight(trade)
  const rows = [
    ['Champ', 'Valeur'],
    ['Marché', trade.market || ''],
    ['Direction', trade.type === 'buy' ? 'BUY' : trade.type === 'sell' ? 'SELL' : ''],
    ['Date', fmtDate(trade.date)],
    ['Jour', trade.day || ''],
    ['Résultat', RESULT_LABELS[trade.result] || ''],
    ['RR Prévu', trade.rr_planned ?? ''],
    ['RR Gagné', trade.rr_won ?? ''],
    ['Tendance', TREND_LABELS[trade.trend] || trade.trend || ''],
    ['Structure de marché', trade.market_structure || ''],
    ['Session', trade.session || ''],
    ['Style', trade.style || ''],
    ['Émotion', trade.emotion || ''],
    ['Respect du plan', trade.respect_plan ? 'Oui' : 'Non'],
    ['Discipline', trade.discipline_score != null ? `${trade.discipline_score}/10` : ''],
    ['Notes', trade.notes || ''],
  ]
  if (h) {
    rows.push(
      ['— After Trade —', ''],
      ['Erreur principale', h.main_error || ''],
      ['Leçon tirée', h.lesson || ''],
      ['Règle à appliquer', h.rule || ''],
      ['Notes After Trade', h.notes || ''],
      ['Tags', (h.tags || []).join(', ')],
    )
  }
  const links = [
    ...(trade.images || []).filter(i => i.isLink),
    ...((h?.images || []).filter(i => i.isLink || !i.path)),
  ]
  links.forEach((lnk, i) => rows.push([`Lien ${i + 1} (${lnk.timeframe || ''})`, lnk.url]))
  return rows
}

// ── Shared modal surface styles ──────────────────────────────
const modalStyle = {
  background: 'var(--modal-bg)',
  border: '1px solid var(--border-soft)',
}
const modalHeaderStyle = {
  borderBottom: '1px solid var(--border-soft)',
}
const tabInactiveStyle = {
  background: 'var(--surface-3)',
  color: 'var(--forge-muted)',
  borderColor: 'var(--border-soft)',
}
const tabActiveStyle = {
  background: 'rgba(247,183,49,0.12)',
  color: '#F7B731',
  borderColor: 'rgba(247,183,49,0.3)',
}

// ── Onglet PDF ───────────────────────────────────────────────

function PdfTab({ trade, busy, setBusy, onDone }) {
  const [theme, setTheme] = useState('dark')
  const [error, setError] = useState('')

  const handleExport = async () => {
    setError('')
    setBusy(true)
    try {
      const jsPDF = await loadJsPDF()
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()
      const margin = 40
      let y = 0

      const dark = theme === 'dark'
      const bg     = dark ? [10, 11, 13]    : [255, 255, 255]
      const card   = dark ? [22, 27, 34]    : [245, 246, 248]
      const text   = dark ? [240, 240, 240] : [20, 20, 20]
      const muted  = dark ? [139, 148, 158] : [110, 110, 110]
      const accent = [247, 183, 49]
      const green  = [46, 160, 67]
      const red    = [248, 81, 73]
      const blue   = [88, 166, 255]

      const pageBg = () => {
        doc.setFillColor(...bg)
        doc.rect(0, 0, W, doc.internal.pageSize.getHeight(), 'F')
      }
      const ensureSpace = (h) => {
        if (y + h > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage(); pageBg(); y = margin
        }
      }
      const sectionTitle = (label) => {
        ensureSpace(28)
        doc.setTextColor(...accent)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(label.toUpperCase(), margin, y)
        y += 14
        doc.setDrawColor(...muted)
        doc.setLineWidth(0.5)
        doc.line(margin, y, W - margin, y)
        y += 14
      }
      const row = (label, value, color) => {
        if (!value) return
        ensureSpace(20)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...muted)
        doc.text(String(label), margin, y)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...(color || text))
        const maxW = W - margin * 2 - 160
        const lines = doc.splitTextToSize(String(value), maxW)
        doc.text(lines, margin + 160, y)
        y += 16 * Math.max(1, lines.length)
      }
      const paragraph = (label, value, boxColor) => {
        if (!value) return
        const lines = doc.splitTextToSize(String(value), W - margin * 2 - 20)
        const h = 22 + lines.length * 13
        ensureSpace(h + 10)
        doc.setFillColor(...(boxColor || card))
        doc.roundedRect(margin, y, W - margin * 2, h, 4, 4, 'F')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...accent)
        doc.text(label.toUpperCase(), margin + 10, y + 14)
        doc.setFontSize(9.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...text)
        doc.text(lines, margin + 10, y + 28)
        y += h + 10
      }

      pageBg()
      y = margin

      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...text)
      doc.text(trade.market || 'Trade', margin, y)

      const rc = trade.result === 'tp' ? green : trade.result === 'sl' ? red : trade.result === 'be' ? blue : muted
      doc.setFontSize(10)
      doc.setTextColor(...rc)
      doc.text(RESULT_LABELS[trade.result] || '—', W - margin, y, { align: 'right' })
      y += 18

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...muted)
      doc.text(`${trade.type === 'buy' ? 'BUY' : 'SELL'} · ${fmtDate(trade.date)}`, margin, y)
      y += 22

      doc.setDrawColor(...accent)
      doc.setLineWidth(1)
      doc.line(margin, y, W - margin, y)
      y += 20

      sectionTitle('Résultat')
      row('RR Prévu', trade.rr_planned != null ? `${trade.rr_planned}R` : null)
      row('RR Gagné', trade.rr_won != null ? `${trade.rr_won}R` : null, rc)
      y += 6

      sectionTitle('Contexte de marché')
      row('Tendance', TREND_LABELS[trade.trend] || trade.trend)
      row('Structure', trade.market_structure)
      row('Session', trade.session)
      row('Jour', trade.day)
      row('Style', trade.style)
      y += 6

      sectionTitle('Psychologie')
      row('Émotion', trade.emotion)
      row('Respect du plan', trade.respect_plan ? 'Respecté' : 'Non respecté', trade.respect_plan ? green : red)
      row('Discipline', trade.discipline_score != null ? `${trade.discipline_score}/10` : null)
      y += 6
      if (trade.notes) paragraph('Notes', trade.notes)

      const h = getHindsight(trade)
      if (h) {
        y += 6
        sectionTitle('After Trade')
        paragraph('Erreur principale', h.main_error, dark ? [40, 20, 20] : [253, 235, 235])
        paragraph('Leçon tirée', h.lesson, dark ? [18, 28, 38] : [232, 242, 253])
        paragraph('Règle à appliquer', h.rule, dark ? [18, 33, 22] : [232, 248, 235])
        if (h.notes) paragraph('Notes', h.notes)
        if (h.tags?.length) {
          ensureSpace(20)
          doc.setFontSize(8.5)
          doc.setTextColor(...accent)
          doc.text(h.tags.map(t => `#${t}`).join('   '), margin, y)
          y += 18
        }
      }

      const allLinks = [
        ...(trade.images || []).filter(i => i.isLink),
        ...((h?.images || []).filter(i => i.isLink || !i.path)),
      ]
      if (allLinks.length) {
        y += 6
        sectionTitle('Liens')
        allLinks.forEach(lnk => {
          ensureSpace(16)
          doc.setFontSize(9)
          doc.setTextColor(...blue)
          doc.textWithLink(`${lnk.timeframe || ''} — ${lnk.label || lnk.url}`, margin, y, { url: lnk.url })
          y += 15
        })
      }

      const allImages = [
        ...(trade.images || []).filter(i => !i.isLink && i.url),
        ...((h?.images || []).filter(i => i.path && i.url)),
      ]
      if (allImages.length) {
        for (const img of allImages) {
          try {
            const dataUrl = await new Promise((resolve, reject) => {
              const im = new Image()
              im.crossOrigin = 'anonymous'
              im.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = im.naturalWidth
                canvas.height = im.naturalHeight
                const ctx = canvas.getContext('2d')
                ctx.drawImage(im, 0, 0)
                resolve(canvas.toDataURL('image/jpeg', 0.85))
              }
              im.onerror = reject
              im.src = img.url
            })
            const imgProps = doc.getImageProperties(dataUrl)
            const maxW = W - margin * 2
            const ratio = imgProps.height / imgProps.width
            const imgW = maxW
            const imgH = imgW * ratio
            ensureSpace(imgH + 30)
            doc.setFontSize(8.5)
            doc.setTextColor(...muted)
            doc.text(img.timeframe || 'Capture', margin, y)
            y += 8
            doc.addImage(dataUrl, 'JPEG', margin, y, imgW, Math.min(imgH, 320))
            y += Math.min(imgH, 320) + 14
          } catch {
            // CORS — ignoré silencieusement
          }
        }
      }

      const pageCount = doc.internal.getNumberOfPages()
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p)
        doc.setFontSize(8)
        doc.setTextColor(...muted)
        doc.text(`TradeForge · ${p}/${pageCount}`, W - margin, doc.internal.pageSize.getHeight() - 20, { align: 'right' })
      }

      doc.save(`trade-${slugify(trade.market)}-${trade.date}.pdf`)
      onDone()
    } catch (e) {
      console.error(e)
      setError(e.message || 'Erreur lors de la génération du PDF.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>
        Génère un rapport PDF complet : données du trade, contexte, psychologie, After Trade, captures et liens.
      </p>

      {/* Thème PDF — ces boutons contrôlent le thème du PDF généré, pas de l'UI */}
      <div className="flex gap-2">
        {[['dark', 'Sombre', Moon], ['light', 'Clair', Sun]].map(([v, l, Icon]) => (
          <button
            key={v}
            onClick={() => setTheme(v)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium border transition-all"
            style={theme === v ? tabActiveStyle : tabInactiveStyle}
          >
            <Icon size={13} /> {l}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs flex items-start gap-1.5" style={{ color: '#F85149' }}>
          <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" /> {error}
        </p>
      )}

      <button
        onClick={handleExport}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
        style={{ background: 'rgba(247,183,49,0.12)', border: '1px solid rgba(247,183,49,0.3)', color: '#F7B731' }}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        {busy ? 'Génération en cours...' : 'Télécharger le PDF'}
      </button>
    </div>
  )
}

// ── Onglet Excel ─────────────────────────────────────────────

function ExcelTab({ trade, busy, setBusy, onDone, mode = 'excel' }) {
  const [error, setError] = useState('')

  const buildWorkbook = async () => {
    const XLSX = await loadXLSX()
    const rows = buildTradeRows(trade)
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 26 }, { wch: 60 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Trade')
    return { XLSX, wb }
  }

  const handleDownload = async () => {
    setError('')
    setBusy(true)
    try {
      const { XLSX, wb } = await buildWorkbook()
      XLSX.writeFile(wb, `trade-${slugify(trade.market)}-${trade.date}.xlsx`)
      onDone()
    } catch (e) {
      console.error(e)
      setError(e.message || 'Erreur lors de la génération du fichier Excel.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>
        {mode === 'excel'
          ? 'Exporte toutes les données de ce trade (et son After Trade) dans un fichier Excel structuré.'
          : 'Télécharge le fichier, puis ouvre Google Sheets pour l\'importer en 2 clics (Fichier → Importer).'}
      </p>

      {error && (
        <p className="text-xs flex items-start gap-1.5" style={{ color: '#F85149' }}>
          <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" /> {error}
        </p>
      )}

      <button
        onClick={handleDownload}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
        style={{ background: 'rgba(46,160,67,0.12)', border: '1px solid rgba(46,160,67,0.3)', color: '#2EA043' }}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        {busy ? 'Génération...' : 'Télécharger le .xlsx'}
      </button>

      {mode === 'sheets' && (
        <a
          href="https://sheets.new"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
          style={{ background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.3)', color: '#58a6ff' }}
        >
          <ExternalLink size={14} /> Ouvrir Google Sheets
        </a>
      )}

      {mode === 'sheets' && (
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--forge-muted)' }}>
          Dans Google Sheets :{' '}
          <span style={{ color: 'var(--text-secondary)' }}>
            Fichier → Importer → Importer le fichier téléchargé
          </span>.
          Une connexion directe (sans téléchargement manuel) sera proposée prochainement via Google OAuth.
        </p>
      )}
    </div>
  )
}

// ── Onglet Notion ────────────────────────────────────────────

function buildNotionMarkdown(trade) {
  const h = getHindsight(trade)
  const lines = []
  lines.push(`# ${trade.market || 'Trade'} — ${fmtDate(trade.date)}`)
  lines.push('')
  lines.push(`**Direction:** ${trade.type === 'buy' ? 'BUY' : 'SELL'}  `)
  lines.push(`**Résultat:** ${RESULT_LABELS[trade.result] || '—'}  `)
  if (trade.rr_planned != null) lines.push(`**RR Prévu:** ${trade.rr_planned}R  `)
  if (trade.rr_won != null)     lines.push(`**RR Gagné:** ${trade.rr_won}R  `)
  lines.push('')
  lines.push('## Contexte de marché')
  if (trade.trend)            lines.push(`- **Tendance:** ${TREND_LABELS[trade.trend] || trade.trend}`)
  if (trade.market_structure) lines.push(`- **Structure:** ${trade.market_structure}`)
  if (trade.session)          lines.push(`- **Session:** ${trade.session}`)
  if (trade.day)              lines.push(`- **Jour:** ${trade.day}`)
  if (trade.style)            lines.push(`- **Style:** ${trade.style}`)
  lines.push('')
  lines.push('## Psychologie')
  if (trade.emotion)               lines.push(`- **Émotion:** ${trade.emotion}`)
  lines.push(`- **Respect du plan:** ${trade.respect_plan ? 'Respecté' : 'Non respecté'}`)
  if (trade.discipline_score != null) lines.push(`- **Discipline:** ${trade.discipline_score}/10`)
  if (trade.notes) {
    lines.push('')
    lines.push(`> ${trade.notes.replace(/\n/g, '\n> ')}`)
  }
  if (h) {
    lines.push('')
    lines.push('## After Trade')
    lines.push('')
    lines.push(`**Erreur principale**`)
    lines.push(`${h.main_error}`)
    lines.push('')
    lines.push(`**Leçon tirée**`)
    lines.push(`${h.lesson}`)
    lines.push('')
    lines.push(`**Règle à appliquer**`)
    lines.push(`${h.rule}`)
    if (h.notes) { lines.push(''); lines.push(`**Notes**`); lines.push(h.notes) }
    if (h.tags?.length) { lines.push(''); lines.push(h.tags.map(t => `\`#${t}\``).join(' ')) }
  }
  const allLinks = [
    ...(trade.images || []).filter(i => i.isLink),
    ...((h?.images || []).filter(i => i.isLink || !i.path)),
  ]
  if (allLinks.length) {
    lines.push('')
    lines.push('## Liens')
    allLinks.forEach(lnk => lines.push(`- [${lnk.label || lnk.timeframe || 'Lien'}](${lnk.url})`))
  }
  return lines.join('\n')
}

function NotionTab({ trade }) {
  const [copied, setCopied] = useState(false)
  const md = buildNotionMarkdown(trade)
  const taRef = useRef(null)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(md)
    } catch {
      taRef.current?.select()
      document.execCommand('copy')
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>
        Copie ce texte formaté puis colle-le directement dans une page Notion vide —
        Notion convertit automatiquement le Markdown en titres, listes et citations.
      </p>

      <textarea
        ref={taRef}
        readOnly
        value={md}
        className="w-full text-[11px] font-mono resize-none rounded-xl p-3"
        style={{
          height: 180,
          background: 'var(--surface-3)',
          border: '1px solid var(--border-soft)',
          color: 'var(--forge-muted)',
        }}
      />

      <button
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
        style={copied
          ? { background: 'rgba(46,160,67,0.15)', border: '1px solid rgba(46,160,67,0.35)', color: '#2EA043' }
          : { background: 'var(--surface-5)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }
        }
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Copié !' : 'Copier le texte formaté'}
      </button>
    </div>
  )
}

// ── Modale principale ───────────────────────────────────────

export default function ExportModal({ trade, onClose }) {
  const [active, setActive] = useState('pdf')
  const [busy, setBusy]     = useState(false)
  const [toast, setToast]   = useState(null)

  const handleDone = () => {
    setToast('Export terminé.')
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm"
      style={{ background: 'var(--modal-overlay)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col"
        style={{ ...modalStyle, maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
          style={modalHeaderStyle}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Exporter ce trade
          </p>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: 'var(--forge-muted)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-4 gap-1.5 px-4 pt-3 flex-shrink-0">
          {TABS.map(t => {
            const Icon = t.icon
            const isActive = active === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-medium border transition-all"
                style={isActive ? tabActiveStyle : tabInactiveStyle}
              >
                <Icon size={14} /> {t.label}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div className="px-4 py-4 overflow-y-auto flex-1">
          {active === 'pdf'    && <PdfTab   trade={trade} busy={busy} setBusy={setBusy} onDone={handleDone} />}
          {active === 'excel'  && <ExcelTab trade={trade} busy={busy} setBusy={setBusy} onDone={handleDone} mode="excel" />}
          {active === 'sheets' && <ExcelTab trade={trade} busy={busy} setBusy={setBusy} onDone={handleDone} mode="sheets" />}
          {active === 'notion' && <NotionTab trade={trade} />}
        </div>

        {/* Toast */}
        {toast && (
          <div
            className="px-4 py-2.5 flex-shrink-0 text-xs font-medium"
            style={{
              background: 'rgba(46,160,67,0.12)',
              color: '#2EA043',
              borderTop: '1px solid rgba(46,160,67,0.25)',
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}