import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, SlidersHorizontal, X, ChevronDown,
  BarChart2, Target, TrendingUp, TrendingDown, Clock,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid, Cell
} from 'recharts'
import { useTrades } from '../hooks/useTrades'
import { fmtDate, MARKETS, calcWinRate } from '../utils'
import { format, parseISO } from 'date-fns'

const RESULTS_OPTIONS = [
  { value: 'tp',          label: 'Take Profit',     color: '#2EA043' },
  { value: 'sl',          label: 'Stop Loss',       color: '#F85149' },
  { value: 'be',          label: 'Breakeven',       color: '#58a6ff' },
  { value: 'missed',      label: 'Missed',          color: '#8B949E' },
  { value: 'manual_exit', label: 'Sortie manuelle', color: '#F79009' },
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
    <p className={`text-2xl font-mono font-semibold leading-none ${color || ''}`} style={color ? {} : { color: 'var(--text-primary)' }}>{value}</p>
    {sub && <p className="text-[11px] text-forge-muted mt-0.5">{sub}</p>}
  </div>
)

const Badge = ({ result }) => {
  const map    = { tp: 'badge-tp', sl: 'badge-sl', be: 'badge-be', missed: 'badge-missed', manual_exit: 'badge-manual' }
  const labels = { tp: 'TP', sl: 'SL', be: 'BE', missed: 'Missed', manual_exit: 'Manuel' }
  return <span className={map[result] || 'badge-missed'}>{labels[result] ?? result}</span>
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
            : { background: 'var(--surface-3)', color: '#8B949E', borderColor: 'var(--surface-10)' }
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
      style={{ background: 'var(--modal-bg)', border: '1px solid rgba(247,183,49,0.2)' }}>
      <p className="text-forge-muted mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
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
    const pnl = t.result === 'tp' ? (t.rr_won || 0)
      : t.result === 'sl' ? (t.rr_won ?? -1)
      : t.result === 'manual_exit' ? (t.rr_won || 0)
      : 0
    cum += pnl
    return { label: format(parseISO(t.date), 'dd/MM'), equity: +cum.toFixed(2) }
  })
}
if (chartMode === 'rr') {
  return sorted.map((t, i) => ({
    label: `#${i + 1}`,
    rr: t.result === 'tp' ? (t.rr_won || 0)
      : t.result === 'sl' ? (t.rr_won ?? -1)
      : t.result === 'manual_exit' ? (t.rr_won || 0)
      : 0,
    result: t.result,
  }))
}
if (chartMode === 'results') {
  const byMonth = {}
  sorted.forEach(t => {
    const m = t.date.slice(0, 7)
    if (!byMonth[m]) byMonth[m] = { label: format(parseISO(m + '-01'), 'MMM yy'), tp: 0, sl: 0, be: 0, missed: 0, manual_exit: 0 }
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
      if (t.result === 'manual_exit') return sum + (t.rr_won || 0)
      return sum
    }, 0).toFixed(2)
    const winningTrades = filtered.filter(t => 
  (t.result === 'tp') || (t.result === 'manual_exit' && t.rr_won > 0)
)
const avgRR = winningTrades.length > 0
  ? +(winningTrades.reduce((s, t) => s + (t.rr_won || 0), 0) / winningTrades.length).toFixed(2)
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
    <div className="page animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-medium">Trades</h1>
        <button onClick={() => navigate('/app/trades/new')} className="btn-primary flex items-center gap-1.5">
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
            : { background: 'var(--surface-3)', color: '#8B949E', borderColor: 'var(--surface-10)' }
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
          <button onClick={clearAll} className="text-xs text-forge-muted hover-text-primary transition-colors px-1">
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
          style={{ borderColor: chartMode === 'equity' ? (isUp ? 'rgba(46,160,67,0.2)' : 'rgba(248,81,73,0.2)') : 'var(--surface-6)' }}>
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
                    : { background: 'var(--surface-2)', color: '#8B949E', borderColor: 'var(--surface-8)' }
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
                  <CartesianGrid vertical={false} stroke="var(--surface-3)" />
                  <XAxis dataKey="label" tick={{ fill: '#8B949E', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#8B949E', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}R`} />
                  <ReferenceLine y={0} stroke="var(--surface-12)" strokeDasharray="4 4" />
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
                  <CartesianGrid vertical={false} stroke="var(--surface-3)" />
                  <XAxis dataKey="label" tick={{ fill: '#8B949E', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#8B949E', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}R`} />
                  <ReferenceLine y={0} stroke="var(--surface-12)" />
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
        <CartesianGrid vertical={false} stroke="var(--surface-3)" />
        <XAxis dataKey="label" tick={{ fill: '#8B949E', fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#8B949E', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<ResultsTooltip />} />
        <Bar dataKey="tp"          name="TP"     stackId="a" fill="#2EA043" fillOpacity={0.85} />
        <Bar dataKey="sl"          name="SL"     stackId="a" fill="#F85149" fillOpacity={0.85} />
        <Bar dataKey="be"          name="BE"     stackId="a" fill="#58a6ff" fillOpacity={0.85} />
        <Bar dataKey="missed"      name="Missed" stackId="a" fill="#8B949E" fillOpacity={0.85} />
        <Bar dataKey="manual_exit" name="Manuel" stackId="a" fill="#F79009" fillOpacity={0.85} radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
    <div className="flex gap-3 mt-2 justify-center flex-wrap">
      {[['TP','#2EA043'],['SL','#F85149'],['BE','#58a6ff'],['Missed','#8B949E'],['Manuel','#F79009']].map(([l,c]) => (
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

      {/* Compteur */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-forge-muted">
          {filtered.length} trade{filtered.length !== 1 ? 's' : ''}
          {hasFilters ? ` sur ${trades.length}` : ''}
        </p>
      </div>

      {/* Panneau filtres */}
      {panelOpen && (
        <div className="card mb-4 space-y-5"
          style={{ border: '1px solid rgba(247,183,49,0.15)', background: 'var(--surface-card)' }}>
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
                      : { background: 'var(--surface-3)', color: '#8B949E', borderColor: 'var(--surface-10)' }
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
          <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: 'var(--surface-5)' }}>
            <button onClick={clearAll} className="text-xs text-forge-muted hover-text-primary transition-colors">
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

      {/* Liste complète des trades */}
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
          <div key={t.id} onClick={() => navigate(`/app/trades/${t.id}`)}
            className="card flex items-center gap-3 cursor-pointer hover:border-forge-muted/30 active:scale-[0.99] transition-all">
            <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${
  t.result === 'tp' ? 'bg-forge-green'
  : t.result === 'sl' ? 'bg-forge-red'
  : t.result === 'be' ? 'bg-blue-400'
  : t.result === 'manual_exit' ? 'bg-orange-400'
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
    </div>
  )
}