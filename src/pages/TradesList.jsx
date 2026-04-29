import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, SlidersHorizontal, X, ChevronDown,
  BarChart2, Target, TrendingUp, TrendingDown, Clock,
  ChevronLeft, ChevronRight, Calendar, List,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid, Cell
} from 'recharts'
import { useTrades } from '../hooks/useTrades'
import { fmtDate, MARKETS, calcWinRate, calcPnl } from '../utils'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

const RESULTS_OPTIONS = [
  { value: 'tp',     label: 'Take Profit', color: '#2EA043' },
  { value: 'sl',     label: 'Stop Loss',   color: '#F85149' },
  { value: 'be',     label: 'Breakeven',   color: '#58a6ff' },
  { value: 'missed', label: 'Missed',      color: '#8B949E' },
]
const TYPE_OPTIONS = [
  { value: 'buy',  label: '↑ BUY',  color: '#2EA043' },
  { value: 'sell', label: '↓ SELL', color: '#F85149' },
]
const SORT_OPTIONS = [
  { value: 'date_desc',       label: 'Date (récent)'     },
  { value: 'date_asc',        label: 'Date (ancien)'     },
  { value: 'rr_desc',         label: 'RR (élevé)'        },
  { value: 'discipline_desc', label: 'Discipline (élevé)'},
]
const CHART_MODES = [
  { value: 'equity',  label: 'Courbe'    },
  { value: 'rr',      label: 'RR / Trade'},
  { value: 'results', label: 'Résultats' },
]
const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

// ── StatCard ──────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color, icon: Icon, glow }) => (
  <div className="card flex flex-col gap-1 relative overflow-hidden"
    style={{ borderColor: glow ? `${glow}33` : undefined }}>
    {glow && (
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(ellipse at top left, ${glow}, transparent 70%)` }} />
    )}
    <div className="flex items-center justify-between mb-1">
      <p className="label mb-0">{label}</p>
      {Icon && <Icon size={13} style={{ color: glow || '#8B949E', opacity: 0.7 }} />}
    </div>
    <p className={`text-2xl font-mono font-semibold leading-none ${color || 'text-white'}`}>{value}</p>
    {sub && <p className="text-[11px] text-forge-muted mt-0.5">{sub}</p>}
  </div>
)

const Badge = ({ result }) => {
  const map    = { tp: 'badge-tp', sl: 'badge-sl', be: 'badge-be', missed: 'badge-missed' }
  const labels = { tp: 'TP', sl: 'SL', be: 'BE', missed: 'Missed' }
  return <span className={map[result] || 'badge-missed'}>{labels[result]}</span>
}

const PillToggle = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(opt => {
      const active = value === opt.value
      return (
        <button key={opt.value} type="button"
          onClick={() => onChange(active ? '' : opt.value)}
          className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-all active:scale-95"
          style={active
            ? { background: `${opt.color}22`, color: opt.color, borderColor: `${opt.color}66`, boxShadow: `0 0 8px ${opt.color}33` }
            : { background: 'rgba(255,255,255,0.04)', color: '#8B949E', borderColor: 'rgba(255,255,255,0.1)' }
          }>
          {opt.label}
        </button>
      )
    })}
  </div>
)

const ActiveFilterChip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border"
    style={{ background: 'rgba(247,183,49,0.12)', color: '#F7B731', borderColor: 'rgba(247,183,49,0.35)' }}>
    {label}
    <button onClick={onRemove} className="hover:opacity-70 transition-opacity"><X size={10} /></button>
  </span>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div className="rounded-xl px-3 py-2 text-xs"
      style={{ background: '#161B22', border: '1px solid rgba(247,183,49,0.2)', backdropFilter: 'blur(12px)' }}>
      <p className="text-forge-muted mb-0.5">{label}</p>
      <p className="font-mono font-semibold" style={{ color: val >= 0 ? '#2EA043' : '#F85149' }}>
        {val >= 0 ? '+' : ''}{typeof val === 'number' ? val.toFixed(2) : val}R
      </p>
    </div>
  )
}

const ResultsTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2 text-xs"
      style={{ background: '#161B22', border: '1px solid rgba(247,183,49,0.2)' }}>
      <p className="text-forge-muted mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

// ── Calendrier amélioré ───────────────────────────────────────
function TradeCalendar({ trades, onDayClick }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd   = endOfMonth(currentMonth)
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDow   = getDay(monthStart)
  const blanks     = Array(startDow).fill(null)

  const byDate = useMemo(() => {
    const map = {}
    trades.forEach(t => {
      if (!map[t.date]) map[t.date] = []
      map[t.date].push(t)
    })
    return map
  }, [trades])

  const getDayProfit = (ts) => {
    if (!ts?.length) return null
    return +ts.reduce((acc, t) => acc + calcPnl(t), 0).toFixed(2)
  }

  const weeks = useMemo(() => {
    const all = [...blanks.map(() => null), ...days]
    const result = []
    for (let i = 0; i < all.length; i += 7) {
      const chunk = all.slice(i, i + 7).filter(Boolean)
      if (!chunk.length) continue
      let profit = 0, count = 0
      chunk.forEach(d => {
        const ts = byDate[format(d, 'yyyy-MM-dd')] || []
        ts.forEach(t => { count++; profit += calcPnl(t) })
      })
      result.push({ profit: +profit.toFixed(2), count })
    }
    return result
  }, [days, byDate, blanks.length])

  const monthStats = useMemo(() => {
    const ts = trades.filter(t => t.date.startsWith(format(currentMonth, 'yyyy-MM')))
    const profit = ts.reduce((acc, t) => acc + calcPnl(t), 0)
    return {
      count: ts.length,
      profit: +profit.toFixed(2),
      days: new Set(ts.map(t => t.date)).size,
      winRate: calcWinRate(ts),
    }
  }, [trades, currentMonth])

  const today    = format(new Date(), 'yyyy-MM-dd')
  const allCells = [...blanks, ...days]
  const weekRows = []
  for (let i = 0; i < allCells.length; i += 7) weekRows.push(allCells.slice(i, i + 7))

  return (
    <div className="mb-4 rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(10,13,20,0.98)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>

      {/* Header navigation */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(d => subMonths(d, 1))}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <ChevronLeft size={16} style={{ color: '#8B949E' }} />
          </button>
          <p className="text-base font-bold capitalize text-white tracking-wide">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </p>
          <button onClick={() => setCurrentMonth(d => addMonths(d, 1))}
            disabled={isSameMonth(currentMonth, new Date())}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 hover:bg-white/5 disabled:opacity-20"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <ChevronRight size={16} style={{ color: '#8B949E' }} />
          </button>
        </div>

        {/* Stats mois */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Trades',   value: monthStats.count || '—', color: '#fff' },
            { label: 'Jours',    value: monthStats.days  || '—', color: '#fff' },
            { label: 'Win Rate',
              value: monthStats.count ? `${monthStats.winRate}%` : '—',
              color: !monthStats.count ? '#8B949E' : monthStats.winRate >= 50 ? '#2EA043' : '#F85149' },
            { label: 'P&L',
              value: monthStats.count ? `${monthStats.profit >= 0 ? '+' : ''}${monthStats.profit}R` : '—',
              color: !monthStats.count ? '#8B949E' : monthStats.profit >= 0 ? '#2EA043' : '#F85149' },
          ].map(s => (
            <div key={s.label} className="text-center rounded-xl py-2.5 px-1"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[9px] font-medium uppercase tracking-widest mb-1.5"
                style={{ color: 'rgba(139,148,158,0.6)' }}>{s.label}</p>
              <p className="text-sm font-mono font-black leading-none" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Corps calendrier */}
      <div className="p-3">
        <div className="flex gap-2">

          {/* Grille principale */}
          <div className="flex-1 min-w-0">

            {/* En-têtes */}
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {DAYS_FR.map((d, i) => (
                <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider py-2 rounded-lg"
                  style={{
                    color: i === 0 ? 'rgba(247,183,49,0.8)' : 'rgba(139,148,158,0.5)',
                    background: i === 0 ? 'rgba(247,183,49,0.06)' : 'transparent',
                    letterSpacing: '0.08em',
                  }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Semaines */}
            {weekRows.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1.5 mb-1.5">
                {week.map((day, di) => {
                  if (!day) return <div key={di} className="rounded-xl" style={{ aspectRatio: '1', background: 'rgba(255,255,255,0.01)' }} />

                  const iso      = format(day, 'yyyy-MM-dd')
                  const ts       = byDate[iso]
                  const profit   = getDayProfit(ts)
                  const isToday  = iso === today
                  const hasTrade = ts?.length > 0
                  const isPos    = profit !== null && profit > 0
                  const isNeg    = profit !== null && profit < 0
                  const isBreak  = profit !== null && profit === 0 && hasTrade
                  const isSun    = di === 0
                  const dayWr    = hasTrade ? calcWinRate(ts) : null

                  return (
                    <button key={di}
                      onClick={() => hasTrade && onDayClick(ts)}
                      className="relative rounded-xl flex flex-col overflow-hidden transition-all"
                      style={{
                        aspectRatio: '1',
                        cursor: hasTrade ? 'pointer' : 'default',
                        padding: '7px 6px 6px',
                        background: isPos   ? 'linear-gradient(145deg, rgba(46,160,67,0.22) 0%, rgba(46,160,67,0.08) 100%)'
                          : isNeg   ? 'linear-gradient(145deg, rgba(248,81,73,0.22) 0%, rgba(248,81,73,0.08) 100%)'
                          : isBreak ? 'linear-gradient(145deg, rgba(88,166,255,0.15) 0%, rgba(88,166,255,0.05) 100%)'
                          : isToday ? 'rgba(247,183,49,0.06)'
                          : isSun   ? 'rgba(247,183,49,0.02)'
                          : 'rgba(255,255,255,0.025)',
                        border: `1px solid ${
                          isToday  ? 'rgba(247,183,49,0.6)'
                          : isPos  ? 'rgba(46,160,67,0.4)'
                          : isNeg  ? 'rgba(248,81,73,0.4)'
                          : isBreak ? 'rgba(88,166,255,0.3)'
                          : isSun  ? 'rgba(247,183,49,0.1)'
                          : 'rgba(255,255,255,0.05)'
                        }`,
                        boxShadow: isPos ? 'inset 0 1px 0 rgba(46,160,67,0.15)'
                          : isNeg ? 'inset 0 1px 0 rgba(248,81,73,0.15)'
                          : isToday ? '0 0 0 1px rgba(247,183,49,0.2)'
                          : 'none',
                        transform: hasTrade ? undefined : undefined,
                      }}>

{/* Numéro jour — haut droite */}
<div className="flex justify-end mb-1">
  <span className="text-[11px] font-bold leading-none"
    style={{
      color: isToday  ? '#F7B731'
        : hasTrade ? (isPos ? 'rgba(46,160,67,0.9)' : isNeg ? 'rgba(248,81,73,0.9)' : 'rgba(88,166,255,0.9)')
        : 'rgba(139,148,158,0.3)',
    }}>
    {format(day, 'd')}
  </span>
</div>

{/* Contenu trade — caché sur mobile */}
{hasTrade && profit !== null && (
  <div className="hidden sm:flex flex-col items-center justify-center flex-1 gap-0.5">
    <span className="text-[12px] font-mono font-black leading-none text-center"
      style={{ color: isPos ? '#3fb950' : isNeg ? '#ff6b6b' : '#79c0ff' }}>
      {profit > 0 ? '+' : ''}{profit.toFixed(1)}R
    </span>
    <span className="text-[8px] font-medium leading-none text-center"
      style={{ color: 'rgba(139,148,158,0.55)' }}>
      {ts.length} trade{ts.length > 1 ? 's' : ''}
    </span>
    {dayWr !== null && (
      <span className="text-[8px] font-mono font-semibold leading-none"
        style={{ color: dayWr >= 50 ? 'rgba(46,160,67,0.7)' : 'rgba(248,81,73,0.7)' }}>
        {dayWr}%
      </span>
    )}
  </div>
)}

                      {/* Barre colorée en bas */}
                      {hasTrade && (
                        <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-xl"
                          style={{
                            background: isPos ? 'linear-gradient(90deg, #2EA043, #3fb950)'
                              : isNeg ? 'linear-gradient(90deg, #F85149, #ff6b6b)'
                              : 'linear-gradient(90deg, #58a6ff, #79c0ff)',
                            opacity: 0.8,
                          }} />
                      )}

                      {/* Dot aujourd'hui sans trade */}
                      {isToday && !hasTrade && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                          style={{ background: '#F7B731', boxShadow: '0 0 4px rgba(247,183,49,0.6)' }} />
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Colonne semaines */}
          <div className="hidden sm:flex flex-col w-[54px] flex-shrink-0 gap-1.5">
            <div className="text-[9px] font-bold uppercase tracking-wider text-center py-2 rounded-lg mb-0"
              style={{ color: 'rgba(139,148,158,0.4)' }}>Sem</div>
            {weeks.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-center rounded-xl transition-all"
                style={{
                  minHeight: '44px',
                  background: w.count === 0 ? 'rgba(255,255,255,0.02)'
                    : w.profit > 0 ? 'linear-gradient(145deg, rgba(46,160,67,0.14), rgba(46,160,67,0.05))'
                    : w.profit < 0 ? 'linear-gradient(145deg, rgba(248,81,73,0.14), rgba(248,81,73,0.05))'
                    : 'rgba(88,166,255,0.07)',
                  border: `1px solid ${
                    w.count === 0 ? 'rgba(255,255,255,0.04)'
                    : w.profit > 0 ? 'rgba(46,160,67,0.25)'
                    : w.profit < 0 ? 'rgba(248,81,73,0.25)'
                    : 'rgba(88,166,255,0.2)'
                  }`,
                }}>
                {w.count > 0 ? (
                  <>
                    <span className="text-[11px] font-mono font-black leading-none"
  style={{ color: w.profit > 0 ? '#3fb950' : w.profit < 0 ? '#ff6b6b' : '#79c0ff' }}>
  {w.profit > 0 ? '+' : ''}{w.profit}R
</span>
<span className="text-[9px] mt-1 font-medium"
  style={{ color: 'rgba(139,148,158,0.45)' }}>
  {w.count}t
</span>
                  </>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.05)', fontSize: 8 }}>—</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal trades du jour ──────────────────────────────────────
function DayTradesModal({ trades, onClose, navigate }) {
  if (!trades?.length) return null
  const date = trades[0].date

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'rgba(14,18,26,0.99)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 24px 64px rgba(0,0,0,0.7)', maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div>
            <p className="text-sm font-semibold text-white">{fmtDate(date)}</p>
            <p className="text-[10px] text-forge-muted mt-0.5">{trades.length} trade{trades.length > 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-forge-muted hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto p-3 space-y-2" style={{ maxHeight: 'calc(80vh - 60px)' }}>
          {trades.map(t => {
            const colors = { tp: '#2EA043', sl: '#F85149', be: '#58a6ff', missed: '#8B949E' }
            const color  = colors[t.result] || '#8B949E'
            return (
              <button key={t.id}
                onClick={() => { onClose(); navigate(`/trades/${t.id}`) }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.98] hover:bg-white/5"
                style={{ border: `1px solid ${color}25`, background: `${color}08` }}>
                <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{t.market}</span>
                    <span className="text-xs font-mono" style={{ color: t.type === 'buy' ? '#2EA043' : '#F85149' }}>
                      {t.type?.toUpperCase()}
                    </span>
                  </div>
                  {t.session && <p className="text-[10px] text-forge-muted mt-0.5">{t.session}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                    style={{ background: `${color}20`, color }}>
                    {t.result?.toUpperCase()}
                  </span>
                  {t.rr_won != null && (
                    <p className="text-xs font-mono mt-0.5" style={{ color }}>
                      {t.rr_won >= 0 ? '+' : ''}{t.rr_won}R
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── Page principale ───────────────────────────────────────────
export default function TradesList() {
  const navigate = useNavigate()
  const { trades, loading } = useTrades()

  const [search, setSearch]                 = useState('')
  const [filterResult, setFilterResult]     = useState('')
  const [filterMarket, setFilterMarket]     = useState('')
  const [filterType, setFilterType]         = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo]     = useState('')
  const [filterMonth, setFilterMonth]       = useState('')
  const [sortBy, setSortBy]                 = useState('date_desc')
  const [panelOpen, setPanelOpen]           = useState(false)
  const [chartMode, setChartMode]           = useState('equity')
  const [viewMode, setViewMode]             = useState('calendar') // 'calendar' | 'list'
  const [dayTrades, setDayTrades]           = useState(null)

  const filtered = useMemo(() => {
    let list = trades.filter(t => {
      if (filterResult && t.result !== filterResult) return false
      if (filterMarket && t.market !== filterMarket) return false
      if (filterType   && t.type   !== filterType)   return false
      if (filterMonth  && !t.date.startsWith(filterMonth)) return false
      if (filterDateFrom && t.date < filterDateFrom) return false
      if (filterDateTo   && t.date > filterDateTo)   return false
      if (search && !t.market.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    switch (sortBy) {
      case 'date_asc':        list = [...list].sort((a, b) => a.date.localeCompare(b.date)); break
      case 'rr_desc':         list = [...list].sort((a, b) => (b.rr_won || 0) - (a.rr_won || 0)); break
      case 'discipline_desc': list = [...list].sort((a, b) => (b.discipline_score || 0) - (a.discipline_score || 0)); break
      default: break
    }
    return list
  }, [trades, filterResult, filterMarket, filterType, filterMonth, filterDateFrom, filterDateTo, search, sortBy])

  const chartData = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date))
    if (chartMode === 'equity') {
      let cum = 0
      return sorted.map(t => {
        const pnl = t.result === 'tp' ? (t.rr_won || 0) : t.result === 'sl' ? (t.rr_won || -1) : 0
        cum += pnl
        return { label: format(parseISO(t.date), 'dd/MM'), equity: +cum.toFixed(2) }
      })
    }
    if (chartMode === 'rr') {
      return sorted.map((t, i) => ({
        label: `#${i + 1}`,
        rr: t.result === 'tp' ? (t.rr_won || 0) : t.result === 'sl' ? (t.rr_won || -1) : 0,
        result: t.result,
      }))
    }
    if (chartMode === 'results') {
      const byMonth = {}
      sorted.forEach(t => {
        const m = t.date.slice(0, 7)
        if (!byMonth[m]) byMonth[m] = { label: format(parseISO(m + '-01'), 'MMM yy'), tp: 0, sl: 0, be: 0, missed: 0 }
        if (t.result) byMonth[m][t.result] = (byMonth[m][t.result] || 0) + 1
      })
      return Object.values(byMonth)
    }
    return []
  }, [filtered, chartMode])

  const kpis = useMemo(() => {
    const total = filtered.length
    if (total === 0) return null
    const tp      = filtered.filter(t => t.result === 'tp').length
    const sl      = filtered.filter(t => t.result === 'sl').length
    const be      = filtered.filter(t => t.result === 'be').length
    const missed  = filtered.filter(t => t.result === 'missed').length
    const winRate = calcWinRate(filtered)
    const profit  = +filtered.reduce((sum, t) => {
      if (t.result === 'tp') return sum + (t.rr_won || 0)
      if (t.result === 'sl') return sum + (t.rr_won || -1)
      return sum
    }, 0).toFixed(2)
    const avgRR = tp > 0
      ? +(filtered.filter(t => t.result === 'tp').reduce((s, t) => s + (t.rr_won || 0), 0) / tp).toFixed(2)
      : 0
    const sessionMap = {}
    filtered.forEach(t => {
      if (!t.session) return
      if (!sessionMap[t.session]) sessionMap[t.session] = 0
      sessionMap[t.session] += (t.rr_won || 0)
    })
    const bestSession = Object.entries(sessionMap).sort((a, b) => b[1] - a[1])[0]
    return { total, tp, sl, be, missed, winRate, profit, avgRR, bestSession: bestSession?.[0] || null }
  }, [filtered])

  const lastEquity = chartMode === 'equity' && chartData.length ? chartData[chartData.length - 1].equity : 0
  const isUp = lastEquity >= 0

  const activeFilters = [
    filterResult   && { label: RESULTS_OPTIONS.find(r => r.value === filterResult)?.label, clear: () => setFilterResult('') },
    filterMarket   && { label: filterMarket,          clear: () => setFilterMarket('')   },
    filterType     && { label: filterType.toUpperCase(), clear: () => setFilterType('')  },
    filterMonth    && { label: filterMonth,            clear: () => setFilterMonth('')    },
    filterDateFrom && { label: `Depuis ${filterDateFrom}`,    clear: () => setFilterDateFrom('') },
    filterDateTo   && { label: `Jusqu'au ${filterDateTo}`,   clear: () => setFilterDateTo('')   },
  ].filter(Boolean)

  const hasFilters = activeFilters.length > 0 || search

  const clearAll = () => {
    setFilterResult(''); setFilterMarket(''); setFilterType('')
    setFilterMonth(''); setFilterDateFrom(''); setFilterDateTo('')
    setSearch('')
  }

  if (loading) return (
    <div className="page flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-forge-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="page">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-medium">Trades</h1>
        <button onClick={() => navigate('/trades/new')} className="btn-primary flex items-center gap-1.5">
          <Plus size={15} /> Nouveau
        </button>
      </div>

      {/* Search + filtres */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-forge-muted pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un marché..." className="w-full pl-8" />
        </div>
        <button onClick={() => setPanelOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all active:scale-95"
          style={panelOpen || activeFilters.length > 0
            ? { background: 'rgba(247,183,49,0.12)', color: '#F7B731', borderColor: 'rgba(247,183,49,0.4)' }
            : { background: 'rgba(255,255,255,0.04)', color: '#8B949E', borderColor: 'rgba(255,255,255,0.1)' }
          }>
          <SlidersHorizontal size={14} />
          Filtres
          {activeFilters.length > 0 && (
            <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ background: '#F7B731', color: '#070A0F' }}>
              {activeFilters.length}
            </span>
          )}
        </button>
      </div>

      {/* Chips filtres actifs */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {activeFilters.map((f, i) => (
            <ActiveFilterChip key={i} label={f.label} onRemove={f.clear} />
          ))}
          <button onClick={clearAll} className="text-xs text-forge-muted hover:text-white transition-colors px-1">
            Tout effacer
          </button>
        </div>
      )}

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard label="Win Rate" value={`${kpis.winRate}%`} sub={`${kpis.tp} TP / ${kpis.sl} SL`}
            color={kpis.winRate >= 50 ? 'text-forge-green' : 'text-forge-red'}
            icon={Target} glow={kpis.winRate >= 50 ? '#2EA043' : '#F85149'} />
          <StatCard label="Profit total"
            value={kpis.profit >= 0 ? `+${kpis.profit}R` : `${kpis.profit}R`}
            sub={`${kpis.total} trade${kpis.total !== 1 ? 's' : ''}${hasFilters ? ` / ${trades.length}` : ''}`}
            color={kpis.profit >= 0 ? 'text-forge-green' : 'text-forge-red'}
            icon={kpis.profit >= 0 ? TrendingUp : TrendingDown}
            glow={kpis.profit >= 0 ? '#2EA043' : '#F85149'} />
          <StatCard label="RR Moyen" value={kpis.avgRR > 0 ? `${kpis.avgRR}R` : '—'}
            sub="sur trades gagnants" icon={BarChart2} />
          <StatCard label="Meilleure session"
            value={kpis.bestSession ? kpis.bestSession.split(' ')[0] : '—'}
            sub={kpis.bestSession || 'Aucune donnée'} color="text-forge-accent"
            icon={Clock} glow="#F7B731" />
        </div>
      )}

      {/* Graphique */}
      {filtered.length > 1 && (
        <div className="card mb-4"
          style={{ borderColor: chartMode === 'equity' ? (isUp ? 'rgba(46,160,67,0.2)' : 'rgba(248,81,73,0.2)') : 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart2 size={13} className="text-forge-accent" />
              <p className="text-xs font-medium text-forge-muted uppercase tracking-wide">Graphique</p>
            </div>
            <div className="flex gap-1">
              {CHART_MODES.map(m => (
                <button key={m.value} onClick={() => setChartMode(m.value)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all"
                  style={chartMode === m.value
                    ? { background: 'rgba(247,183,49,0.15)', color: '#F7B731', borderColor: 'rgba(247,183,49,0.4)' }
                    : { background: 'rgba(255,255,255,0.03)', color: '#8B949E', borderColor: 'rgba(255,255,255,0.08)' }
                  }>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {chartMode === 'equity' && (
            <>
              <div className="flex items-baseline gap-2 mb-3">
                <p className="text-2xl font-mono font-bold" style={{ color: isUp ? '#2EA043' : '#F85149' }}>
                  {lastEquity >= 0 ? '+' : ''}{lastEquity.toFixed(2)}R
                </p>
                <span className="text-xs text-forge-muted">cumulé sur {filtered.length} trades</span>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eqUp2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2EA043" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#2EA043" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="eqDown2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F85149" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#F85149" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" tick={{ fill: '#8B949E', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#8B949E', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}R`} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="equity" stroke={isUp ? '#2EA043' : '#F85149'}
                    strokeWidth={2} fill={isUp ? 'url(#eqUp2)' : 'url(#eqDown2)'}
                    dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: isUp ? '#2EA043' : '#F85149' }} />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}

          {chartMode === 'rr' && (
            <>
              <p className="text-xs text-forge-muted mb-3">RR réalisé par trade</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={chartData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" tick={{ fill: '#8B949E', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#8B949E', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}R`} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="rr" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.rr >= 0 ? '#2EA043' : '#F85149'} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}

          {chartMode === 'results' && (
            <>
              <p className="text-xs text-forge-muted mb-3">Distribution des résultats par mois</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={chartData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" tick={{ fill: '#8B949E', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8B949E', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ResultsTooltip />} />
                  <Bar dataKey="tp"     name="TP"     stackId="a" fill="#2EA043" fillOpacity={0.85} />
                  <Bar dataKey="sl"     name="SL"     stackId="a" fill="#F85149" fillOpacity={0.85} />
                  <Bar dataKey="be"     name="BE"     stackId="a" fill="#58a6ff" fillOpacity={0.85} />
                  <Bar dataKey="missed" name="Missed" stackId="a" fill="#8B949E" fillOpacity={0.85} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-3 mt-2 justify-center">
                {[['TP','#2EA043'],['SL','#F85149'],['BE','#58a6ff'],['Missed','#8B949E']].map(([l,c]) => (
                  <div key={l} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm" style={{ background: c }} />
                    <span className="text-[10px] text-forge-muted">{l}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Toggle vue calendrier / liste */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-forge-muted">
          {filtered.length} trade{filtered.length !== 1 ? 's' : ''}
          {hasFilters ? ` sur ${trades.length}` : ''}
        </p>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={() => setViewMode('calendar')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={viewMode === 'calendar'
              ? { background: 'rgba(247,183,49,0.15)', color: '#F7B731' }
              : { color: '#8B949E' }
            }>
            <Calendar size={12} /> Calendrier
          </button>
          <button onClick={() => setViewMode('list')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={viewMode === 'list'
              ? { background: 'rgba(247,183,49,0.15)', color: '#F7B731' }
              : { color: '#8B949E' }
            }>
            <List size={12} /> Liste
          </button>
        </div>
      </div>

      {/* Panneau filtres */}
      {panelOpen && (
        <div className="card mb-4 space-y-5"
          style={{ border: '1px solid rgba(247,183,49,0.15)', background: 'rgba(16,20,28,0.9)' }}>
          <div>
            <p className="section-title mb-2">Résultat</p>
            <PillToggle options={RESULTS_OPTIONS} value={filterResult} onChange={setFilterResult} />
          </div>
          <div>
            <p className="section-title mb-2">Direction</p>
            <PillToggle options={TYPE_OPTIONS} value={filterType} onChange={setFilterType} />
          </div>
          <div>
            <p className="section-title mb-2">Marché</p>
            <div className="flex flex-wrap gap-2">
              {MARKETS.map(m => {
                const active = filterMarket === m
                return (
                  <button key={m} type="button" onClick={() => setFilterMarket(active ? '' : m)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-all active:scale-95"
                    style={active
                      ? { background: 'rgba(247,183,49,0.15)', color: '#F7B731', borderColor: 'rgba(247,183,49,0.5)' }
                      : { background: 'rgba(255,255,255,0.04)', color: '#8B949E', borderColor: 'rgba(255,255,255,0.1)' }
                    }>
                    {m}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <p className="section-title mb-2">Période</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="label">Du</label>
                <input type="date" value={filterDateFrom}
                  onChange={e => { setFilterDateFrom(e.target.value); setFilterMonth('') }}
                  className="w-full text-xs" />
              </div>
              <div>
                <label className="label">Au</label>
                <input type="date" value={filterDateTo}
                  onChange={e => { setFilterDateTo(e.target.value); setFilterMonth('') }}
                  className="w-full text-xs" />
              </div>
            </div>
            <div>
              <label className="label">Ou par mois</label>
              <input type="month" value={filterMonth}
                onChange={e => { setFilterMonth(e.target.value); setFilterDateFrom(''); setFilterDateTo('') }}
                className="w-full text-xs" />
            </div>
          </div>
          <div>
            <p className="section-title mb-2">Trier par</p>
            <div className="relative">
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full pr-8 appearance-none">
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-forge-muted pointer-events-none" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <button onClick={clearAll} className="text-xs text-forge-muted hover:text-white transition-colors">
              Réinitialiser
            </button>
            <button onClick={() => setPanelOpen(false)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all active:scale-95"
              style={{ background: 'rgba(247,183,49,0.15)', color: '#F7B731' }}>
              Voir {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* Vue Calendrier */}
      {viewMode === 'calendar' && filtered.length > 0 && (
        <TradeCalendar trades={filtered} onDayClick={setDayTrades} />
      )}

      {/* Vue Liste */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-forge-muted text-sm">
                {trades.length === 0 ? 'Aucun trade. Ajoutez votre premier !' : 'Aucun résultat pour ces filtres.'}
              </p>
              {hasFilters && trades.length > 0 && (
                <button onClick={clearAll} className="mt-2 text-xs text-forge-accent hover:underline">
                  Effacer les filtres
                </button>
              )}
            </div>
          )}
          {filtered.map(t => (
            <div key={t.id} onClick={() => navigate(`/trades/${t.id}`)}
              className="card flex items-center gap-3 cursor-pointer hover:border-forge-muted/30 active:scale-[0.99] transition-all">
              <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${
                t.result === 'tp' ? 'bg-forge-green'
                : t.result === 'sl' ? 'bg-forge-red'
                : t.result === 'be' ? 'bg-blue-400'
                : 'bg-forge-muted'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{t.market}</p>
                  <span className={`text-xs font-mono ${t.type === 'buy' ? 'text-forge-green' : 'text-forge-red'}`}>
                    {t.type?.toUpperCase()}
                  </span>
                  {t.session && <span className="text-[10px] text-forge-muted hidden sm:inline">{t.session}</span>}
                </div>
                <p className="text-xs text-forge-muted">{fmtDate(t.date)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <Badge result={t.result} />
                {t.rr_won != null && (
                  <p className="text-xs mt-0.5 font-mono"
                    style={{ color: t.rr_won >= 0 ? '#2EA043' : '#F85149' }}>
                    {t.rr_won >= 0 ? '+' : ''}{t.rr_won}R
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state calendrier */}
      {viewMode === 'calendar' && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-forge-muted text-sm">
            {trades.length === 0 ? 'Aucun trade. Ajoutez votre premier !' : 'Aucun résultat pour ces filtres.'}
          </p>
          {hasFilters && trades.length > 0 && (
            <button onClick={clearAll} className="mt-2 text-xs text-forge-accent hover:underline">
              Effacer les filtres
            </button>
          )}
        </div>
      )}

      {/* Modal trades du jour */}
      {dayTrades && (
        <DayTradesModal
          trades={dayTrades}
          onClose={() => setDayTrades(null)}
          navigate={navigate}
        />
      )}
    </div>
  )
}