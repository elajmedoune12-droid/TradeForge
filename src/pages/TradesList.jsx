import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, SlidersHorizontal, X, ChevronDown,
  BarChart2, Target, TrendingUp, TrendingDown, Clock, List,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid, Cell
} from 'recharts'
import { useTrades } from '../hooks/useTrades'
import { fmtDate, calcWinRate } from '../utils'
import { format, parseISO } from 'date-fns'
import { SkeletonCard, SkeletonList } from '../components/Skeleton'
import { useUIStore } from '../store/useUIStore'

const RESULTS_OPTIONS = [
  { value: 'tp',          label: 'TP',      color: '#2EA043' },
  { value: 'sl',          label: 'SL',      color: '#F85149' },
  { value: 'be',          label: 'BE',      color: '#58a6ff' },
  { value: 'missed',      label: 'Missed',  color: '#8B949E' },
  { value: 'manual_exit', label: 'Manuel',  color: '#F79009' },
]
const TYPE_OPTIONS = [
  { value: 'buy',  label: '↑ BUY',  color: '#2EA043' },
  { value: 'sell', label: '↓ SELL', color: '#F85149' },
]
const SORT_OPTIONS = [
  { value: 'date_desc',       label: 'Date (récent)'      },
  { value: 'date_asc',        label: 'Date (ancien)'      },
  { value: 'rr_desc',         label: 'RR (élevé)'         },
  { value: 'discipline_desc', label: 'Discipline (élevé)' },
]
const CHART_MODES = [
  { value: 'equity',  label: 'Courbe'     },
  { value: 'rr',      label: 'RR / Trade' },
  { value: 'results', label: 'Résultats'  },
]

const toggle = (arr, val) =>
  arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]

const StatCard = ({ label, value, sub, color, icon: Icon, glow }) => {
  const c = glow || '#8B949E'
  return (
    <div
      className="group relative overflow-hidden rounded-2xl p-4 flex flex-col gap-1 transition-transform duration-200 hover:-translate-y-0.5"
      style={{
        background: 'linear-gradient(145deg, var(--surface-card), var(--surface-4))',
        border: `1px solid ${c}26`,
        boxShadow: `0 6px 24px -12px ${c}55, inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(ellipse at top left, ${c}, transparent 75%)` }} />
      <div className="absolute -top-8 -right-6 w-24 h-24 rounded-full pointer-events-none opacity-20 blur-2xl"
        style={{ background: c }} />
      <div className="flex items-center justify-between mb-1.5 relative">
        <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--forge-muted)' }}>{label}</p>
        {Icon && (
          <div className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: `${c}1f`, color: c, border: `1px solid ${c}30` }}>
            <Icon size={14} />
          </div>
        )}
      </div>
      <p className="text-[26px] font-mono font-semibold leading-none relative"
        style={color ? { color: c } : { color: 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="text-[11px] text-forge-muted mt-1 relative">{sub}</p>}
    </div>
  )
}

const Badge = ({ result }) => {
  const map    = { tp: 'badge-tp', sl: 'badge-sl', be: 'badge-be', missed: 'badge-missed', manual_exit: 'badge-manual' }
  const labels = { tp: 'TP', sl: 'SL', be: 'BE', missed: 'Missed', manual_exit: 'Manuel' }
  return <span className={map[result] || 'badge-missed'}>{labels[result] ?? result}</span>
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div className="rounded-xl px-3 py-2 text-xs"
      style={{ background: 'var(--modal-bg)', border: '1px solid rgba(247,183,49,0.2)', backdropFilter: 'blur(12px)' }}>
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

export default function TradesList() {
  const navigate = useNavigate()
  const { trades, loading, error, refresh } = useTrades()

  const {
    search, filterResults, filterMarkets, filterTypes,
    filterDateFrom, filterDateTo, filterMonth,
    sortBy, panelOpen, chartMode,
  } = useUIStore(s => s.trades)
  const setS         = useUIStore(s => s.setTradesState)
  const resetFilters = useUIStore(s => s.resetTradesFilters)

  const availableMarkets = useMemo(
    () => [...new Set(trades.map(t => t.market).filter(Boolean))].sort(),
    [trades]
  )

  const filtered = useMemo(() => {
    let list = trades.filter(t => {
      if (filterResults.length  && !filterResults.includes(t.result))  return false
      if (filterMarkets.length  && !filterMarkets.includes(t.market))  return false
      if (filterTypes.length    && !filterTypes.includes(t.type))      return false
      if (filterMonth    && !t.date.startsWith(filterMonth))           return false
      if (filterDateFrom && t.date < filterDateFrom)                   return false
      if (filterDateTo   && t.date > filterDateTo)                     return false
      if (search && !t.market?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    switch (sortBy) {
      case 'date_asc':        list = [...list].sort((a,b) => a.date.localeCompare(b.date)); break
      case 'rr_desc':         list = [...list].sort((a,b) => (b.rr_won||0)-(a.rr_won||0)); break
      case 'discipline_desc': list = [...list].sort((a,b) => (b.discipline_score||0)-(a.discipline_score||0)); break
      default: break
    }
    return list
  }, [trades, filterResults, filterMarkets, filterTypes, filterMonth, filterDateFrom, filterDateTo, search, sortBy])

  const stats = useMemo(() => {
    const total      = filtered.length
    const tp         = filtered.filter(t => t.result === 'tp').length
    const sl         = filtered.filter(t => t.result === 'sl').length
    const be         = filtered.filter(t => t.result === 'be').length
    const missed     = filtered.filter(t => t.result === 'missed').length
    const manualExit = filtered.filter(t => t.result === 'manual_exit').length
    const winRate    = calcWinRate(filtered)
    const profit     = +filtered.reduce((s, t) => {
      if (t.result === 'tp') return s + (t.rr_won || 0)
      if (t.result === 'sl') return s + (t.rr_won ?? -1)
      if (t.result === 'manual_exit') return s + (t.rr_won || 0)
      return s
    }, 0).toFixed(2)
    const winners = filtered.filter(t => t.result === 'tp' || (t.result === 'manual_exit' && t.rr_won > 0))
    const avgRR   = winners.length
      ? +(winners.reduce((s,t) => s+(t.rr_won||0),0)/winners.length).toFixed(2)
      : 0
    const sessionMap = {}
    filtered.forEach(t => {
      if (!t.session) return
      sessionMap[t.session] = (sessionMap[t.session]||0) + (t.rr_won||0)
    })
    const bestSession = Object.entries(sessionMap).sort((a,b)=>b[1]-a[1])[0]
    return { total, tp, sl, be, missed, manualExit, winRate, profit, avgRR, bestSession: bestSession?.[0]||null }
  }, [filtered])

  const chartData = useMemo(() => {
    const sorted = [...filtered].sort((a,b)=>a.date.localeCompare(b.date))
    if (chartMode === 'equity') {
      let cum = 0
      return sorted.map(t => {
        const pnl = t.result==='tp'?(t.rr_won||0):t.result==='sl'?(t.rr_won??-1):t.result==='manual_exit'?(t.rr_won||0):0
        cum += pnl
        return { label: format(parseISO(t.date),'dd/MM'), equity: +cum.toFixed(2) }
      })
    }
    if (chartMode === 'rr') {
      return sorted.map((t,i) => ({
        label:`#${i+1}`,
        rr: t.result==='tp'?(t.rr_won||0):t.result==='sl'?(t.rr_won??-1):t.result==='manual_exit'?(t.rr_won||0):0,
        result: t.result,
      }))
    }
    if (chartMode === 'results') {
      const byMonth = {}
      sorted.forEach(t => {
        const m = t.date.slice(0,7)
        if (!byMonth[m]) byMonth[m] = { label:format(parseISO(m+'-01'),'MMM yy'), tp:0, sl:0, be:0, missed:0, manual_exit:0 }
        if (t.result) byMonth[m][t.result] = (byMonth[m][t.result]||0)+1
      })
      return Object.values(byMonth)
    }
    return []
  }, [filtered, chartMode])

  const lastEquity = chartMode==='equity' && chartData.length ? chartData[chartData.length-1].equity : 0
  const isUp = lastEquity >= 0

  const hasFilters = filterResults.length||filterMarkets.length||filterTypes.length||
    filterMonth||filterDateFrom||filterDateTo||search

  const activeCount = filterResults.length+filterMarkets.length+filterTypes.length+
    (filterMonth?1:0)+(filterDateFrom?1:0)+(filterDateTo?1:0)

  return (
    <div className="page">

      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(247,183,49,0.25), rgba(247,183,49,0.08))',
                border: '1px solid rgba(247,183,49,0.35)',
                boxShadow: '0 4px 16px -6px rgba(247,183,49,0.5)',
              }}>
              <List size={17} className="text-forge-accent" />
              <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full blur-lg opacity-40" style={{ background: '#F7B731' }} />
            </div>
            <div>
              <h1 className="text-xl font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>Trades</h1>
              <p className="text-[11px] text-forge-muted">{trades.length} trade{trades.length!==1?'s':''} au total</p>
            </div>
          </div>
        </div>
        <button onClick={() => navigate('/app/trades/new')}
          className="relative overflow-hidden btn-primary flex items-center gap-1.5">
          <Plus size={15} /> Nouveau
          <div className="absolute inset-0 opacity-30 pointer-events-none rounded-xl" style={{ background: 'radial-gradient(circle at 80% -40%, #fff3, transparent 60%)' }} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs mb-4"
          style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.25)' }}>
          <span style={{ color: '#F85149' }}>⚠️</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Impossible de charger tes trades. {error}
          </span>
          <button
            onClick={() => refresh()}
            className="ml-auto btn-primary"
            style={{ padding: '5px 12px', fontSize: 11 }}
          >
            Réessayer
          </button>
        </div>
      )}

      {loading ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[...Array(4)].map((_,i) => <SkeletonCard key={i} />)}
          </div>
          <SkeletonList />
        </>
      ) : (
        <>
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-forge-muted pointer-events-none" />
              <input value={search} onChange={e => setS({ search: e.target.value })}
                placeholder="Rechercher un marché..." className="w-full pl-8" />
            </div>
            <button onClick={() => setS({ panelOpen: !panelOpen })}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all active:scale-95"
              style={panelOpen||activeCount>0
                ? { background:'rgba(247,183,49,0.12)', color:'#F7B731', borderColor:'rgba(247,183,49,0.4)' }
                : { background:'var(--surface-3)', color:'var(--forge-muted)', borderColor:'var(--surface-10)' }
              }>
              <SlidersHorizontal size={14} />
              Filtres
              {activeCount>0 && (
                <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background:'#F7B731', color:'#070A0F' }}>
                  {activeCount}
                </span>
              )}
            </button>
          </div>

          {(filterMarkets.length>0||filterResults.length>0||filterTypes.length>0||filterMonth||filterDateFrom||filterDateTo) && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {filterMarkets.map(m => (
                <span key={m} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border"
                  style={{ background:'rgba(247,183,49,0.12)', color:'#F7B731', borderColor:'rgba(247,183,49,0.35)' }}>
                  {m}
                  <button onClick={() => setS({ filterMarkets: filterMarkets.filter(x=>x!==m) })}><X size={10}/></button>
                </span>
              ))}
              {filterResults.map(r => {
                const opt = RESULTS_OPTIONS.find(o=>o.value===r)
                return (
                  <span key={r} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border"
                    style={{ background:`${opt.color}18`, color:opt.color, borderColor:`${opt.color}40` }}>
                    {opt.label}
                    <button onClick={() => setS({ filterResults: filterResults.filter(x=>x!==r) })}><X size={10}/></button>
                  </span>
                )
              })}
              {filterTypes.map(t => (
                <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border"
                  style={{ background:t==='buy'?'rgba(46,160,67,0.12)':'rgba(248,81,73,0.12)', color:t==='buy'?'#2EA043':'#F85149', borderColor:t==='buy'?'rgba(46,160,67,0.35)':'rgba(248,81,73,0.35)' }}>
                  {t.toUpperCase()}
                  <button onClick={() => setS({ filterTypes: filterTypes.filter(x=>x!==t) })}><X size={10}/></button>
                </span>
              ))}
              {filterMonth && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border"
                  style={{ background:'rgba(247,183,49,0.12)', color:'#F7B731', borderColor:'rgba(247,183,49,0.35)' }}>
                  {filterMonth}
                  <button onClick={() => setS({ filterMonth: '' })}><X size={10}/></button>
                </span>
              )}
              {(filterDateFrom||filterDateTo) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border"
                  style={{ background:'rgba(247,183,49,0.12)', color:'#F7B731', borderColor:'rgba(247,183,49,0.35)' }}>
                  {filterDateFrom||'…'} → {filterDateTo||'…'}
                  <button onClick={() => setS({ filterDateFrom: '', filterDateTo: '' })}><X size={10}/></button>
                </span>
              )}
              <button onClick={resetFilters} className="text-xs text-forge-muted hover-text-primary transition-colors px-1">
                Tout effacer
              </button>
            </div>
          )}

          {stats.total > 0 && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <StatCard label="Win Rate" value={`${stats.winRate}%`} sub={`${stats.tp} TP / ${stats.sl} SL`}
                  color={stats.winRate >= 50 ? 'text-forge-green' : 'text-forge-red'}
                  icon={Target} glow={stats.winRate >= 50 ? '#2EA043' : '#F85149'} />
                <StatCard label="Profit total"
                  value={stats.profit >= 0 ? `+${stats.profit}R` : `${stats.profit}R`}
                  sub={`${stats.total} trade${stats.total !== 1 ? 's' : ''}${hasFilters ? ` / ${trades.length}` : ''}`}
                  color={stats.profit >= 0 ? 'text-forge-green' : 'text-forge-red'}
                  icon={stats.profit >= 0 ? TrendingUp : TrendingDown}
                  glow={stats.profit >= 0 ? '#2EA043' : '#F85149'} />
                <StatCard label="RR Moyen" value={stats.avgRR > 0 ? `${stats.avgRR}R` : '—'}
                  sub="sur trades gagnants" icon={BarChart2} />
                <StatCard label="Meilleure session"
                  value={stats.bestSession ? stats.bestSession.split(' ')[0] : '—'}
                  sub={stats.bestSession || 'Aucune donnée'} color="text-forge-accent"
                  icon={Clock} glow="#F7B731" />
              </div>

              <div className="rounded-2xl p-4 mb-4"
                style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)' }}>
                <div className="flex gap-0.5 h-2 rounded-full overflow-hidden mb-3">
                  {stats.tp > 0         && <div style={{ flex: stats.tp,         background: '#2EA043' }} />}
                  {stats.sl > 0         && <div style={{ flex: stats.sl,         background: '#F85149' }} />}
                  {stats.be > 0         && <div style={{ flex: stats.be,         background: '#58a6ff' }} />}
                  {stats.missed > 0     && <div style={{ flex: stats.missed,     background: '#8B949E' }} />}
                  {stats.manualExit > 0 && <div style={{ flex: stats.manualExit, background: '#F79009' }} />}
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { label: 'TP',     count: stats.tp,         color: '#2EA043' },
                    { label: 'SL',     count: stats.sl,         color: '#F85149' },
                    { label: 'BE',     count: stats.be,         color: '#58a6ff' },
                    { label: 'Missed', count: stats.missed,     color: '#8B949E' },
                    { label: 'Manuel', count: stats.manualExit, color: '#F79009' },
                  ].map(({ label, count, color }) => (
                    <div key={label} className="text-center rounded-xl py-2"
                      style={{ background: `${color}0A`, border: `1px solid ${color}20` }}>
                      <p className="text-base font-mono font-bold" style={{ color }}>{count}</p>
                      <p className="text-[9px] font-medium uppercase tracking-wide mt-0.5"
                        style={{ color: 'var(--forge-muted)' }}>{label}</p>
                      <p className="text-[9px]" style={{ color: 'var(--text-faint)' }}>
                        {stats.total ? Math.round((count / stats.total) * 100) : 0}%
                      </p>
                    </div>
                  ))}
                </div>
                {hasFilters && (
                  <p className="text-[10px] text-center mt-3" style={{ color: 'var(--forge-muted)' }}>
                    {stats.total} trade{stats.total !== 1 ? 's' : ''} filtrés sur {trades.length} au total
                  </p>
                )}
              </div>
            </>
          )}

          {filtered.length > 1 && (
            <div className="card mb-4"
              style={{ borderColor: chartMode==='equity'?(isUp?'rgba(46,160,67,0.2)':'rgba(248,81,73,0.2)'):'var(--surface-6)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 size={13} className="text-forge-accent" />
                  <p className="text-xs font-medium text-forge-muted uppercase tracking-wide">Graphique</p>
                </div>
                <div className="flex gap-1">
                  {CHART_MODES.map(m => (
                    <button key={m.value} onClick={() => setS({ chartMode: m.value })}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all"
                      style={chartMode===m.value
                        ? { background:'rgba(247,183,49,0.15)', color:'#F7B731', borderColor:'rgba(247,183,49,0.4)' }
                        : { background:'var(--surface-2)', color:'var(--forge-muted)', borderColor:'var(--surface-8)' }
                      }>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {chartMode==='equity' && (
                <>
                  <div className="flex items-baseline gap-2 mb-3">
                    <p className="text-2xl font-mono font-bold" style={{ color:isUp?'#2EA043':'#F85149' }}>
                      {lastEquity>=0?'+':''}{lastEquity.toFixed(2)}R
                    </p>
                    <span className="text-xs text-forge-muted">cumulé sur {filtered.length} trades</span>
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={chartData} margin={{ top:4,right:0,left:-28,bottom:0 }}>
                      <defs>
                        <linearGradient id="eqUp2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2EA043" stopOpacity={0.3}/>
                          <stop offset="100%" stopColor="#2EA043" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="eqDown2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F85149" stopOpacity={0.3}/>
                          <stop offset="100%" stopColor="#F85149" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="var(--surface-3)"/>
                      <XAxis dataKey="label" tick={{fill:'var(--forge-muted)',fontSize:9}} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
                      <YAxis tick={{fill:'var(--forge-muted)',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}R`}/>
                      <ReferenceLine y={0} stroke="var(--surface-12)" strokeDasharray="4 4"/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Area type="monotone" dataKey="equity" stroke={isUp?'#2EA043':'#F85149'} strokeWidth={2}
                        fill={isUp?'url(#eqUp2)':'url(#eqDown2)'} dot={false}
                        activeDot={{r:4,strokeWidth:0,fill:isUp?'#2EA043':'#F85149'}}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </>
              )}

              {chartMode==='rr' && (
                <>
                  <p className="text-xs text-forge-muted mb-3">RR réalisé par trade</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={chartData} margin={{top:4,right:0,left:-28,bottom:0}}>
                      <CartesianGrid vertical={false} stroke="var(--surface-3)"/>
                      <XAxis dataKey="label" tick={{fill:'var(--forge-muted)',fontSize:9}} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
                      <YAxis tick={{fill:'var(--forge-muted)',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}R`}/>
                      <ReferenceLine y={0} stroke="var(--surface-12)"/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Bar dataKey="rr" radius={[3,3,0,0]}>
                        {chartData.map((entry,i) => (
                          <Cell key={i} fill={entry.rr>=0?'#2EA043':'#F85149'} fillOpacity={0.8}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}

              {chartMode==='results' && (
                <>
                  <p className="text-xs text-forge-muted mb-3">Distribution par mois</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={chartData} margin={{top:4,right:0,left:-28,bottom:0}}>
                      <CartesianGrid vertical={false} stroke="var(--surface-3)"/>
                      <XAxis dataKey="label" tick={{fill:'var(--forge-muted)',fontSize:9}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:'var(--forge-muted)',fontSize:9}} axisLine={false} tickLine={false} allowDecimals={false}/>
                      <Tooltip content={<ResultsTooltip/>}/>
                      <Bar dataKey="tp"          name="TP"     stackId="a" fill="#2EA043" fillOpacity={0.85}/>
                      <Bar dataKey="sl"          name="SL"     stackId="a" fill="#F85149" fillOpacity={0.85}/>
                      <Bar dataKey="be"          name="BE"     stackId="a" fill="#58a6ff" fillOpacity={0.85}/>
                      <Bar dataKey="missed"      name="Missed" stackId="a" fill="#8B949E" fillOpacity={0.85}/>
                      <Bar dataKey="manual_exit" name="Manuel" stackId="a" fill="#F79009" fillOpacity={0.85} radius={[3,3,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-3 mt-2 justify-center flex-wrap">
                    {[['TP','#2EA043'],['SL','#F85149'],['BE','#58a6ff'],['Missed','#8B949E'],['Manuel','#F79009']].map(([l,c]) => (
                      <div key={l} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm" style={{background:c}}/>
                        <span className="text-[10px] text-forge-muted">{l}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {panelOpen && (
            <div className="card mb-4 space-y-5"
              style={{ border:'1px solid rgba(247,183,49,0.15)', background:'var(--surface-card)' }}>
              <div>
                <p className="section-title mb-2">Résultat <span className="normal-case font-normal text-forge-muted">(multi-sélection)</span></p>
                <div className="flex flex-wrap gap-2">
                  {RESULTS_OPTIONS.map(opt => {
                    const active = filterResults.includes(opt.value)
                    return (
                      <button key={opt.value} type="button"
                        onClick={() => setS({ filterResults: toggle(filterResults, opt.value) })}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-all active:scale-95"
                        style={active
                          ? { background:`${opt.color}22`, color:opt.color, borderColor:`${opt.color}66`, boxShadow:`0 0 8px ${opt.color}33` }
                          : { background:'var(--surface-3)', color:'var(--forge-muted)', borderColor:'var(--surface-10)' }
                        }>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="section-title mb-2">Direction</p>
                <div className="flex gap-2">
                  {TYPE_OPTIONS.map(opt => {
                    const active = filterTypes.includes(opt.value)
                    return (
                      <button key={opt.value} type="button"
                        onClick={() => setS({ filterTypes: toggle(filterTypes, opt.value) })}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-all active:scale-95"
                        style={active
                          ? { background:`${opt.color}22`, color:opt.color, borderColor:`${opt.color}66` }
                          : { background:'var(--surface-3)', color:'var(--forge-muted)', borderColor:'var(--surface-10)' }
                        }>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="section-title mb-2">Marché <span className="normal-case font-normal text-forge-muted">({availableMarkets.length} disponibles)</span></p>
                {availableMarkets.length === 0 ? (
                  <p className="text-xs" style={{ color:'var(--forge-muted)' }}>Aucun trade enregistré.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableMarkets.map(m => {
                      const active = filterMarkets.includes(m)
                      const count  = trades.filter(t=>t.market===m).length
                      return (
                        <button key={m} type="button"
                          onClick={() => setS({ filterMarkets: toggle(filterMarkets, m) })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all active:scale-95"
                          style={active
                            ? { background:'rgba(247,183,49,0.15)', color:'#F7B731', borderColor:'rgba(247,183,49,0.5)' }
                            : { background:'var(--surface-3)', color:'var(--forge-muted)', borderColor:'var(--surface-10)' }
                          }>
                          {m}
                          <span className="opacity-50 text-[10px]">{count}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <div>
                <p className="section-title mb-2">Période</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="label">Du</label>
                    <input type="date" value={filterDateFrom}
                      onChange={e => setS({ filterDateFrom: e.target.value, filterMonth: '' })}
                      className="w-full text-xs"/>
                  </div>
                  <div>
                    <label className="label">Au</label>
                    <input type="date" value={filterDateTo}
                      onChange={e => setS({ filterDateTo: e.target.value, filterMonth: '' })}
                      className="w-full text-xs"/>
                  </div>
                </div>
                <div>
                  <label className="label">Ou par mois</label>
                  <input type="month" value={filterMonth}
                    onChange={e => setS({ filterMonth: e.target.value, filterDateFrom: '', filterDateTo: '' })}
                    className="w-full text-xs"/>
                </div>
              </div>
              <div>
                <p className="section-title mb-2">Trier par</p>
                <div className="relative">
                  <select value={sortBy} onChange={e => setS({ sortBy: e.target.value })} className="w-full pr-8 appearance-none">
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-forge-muted pointer-events-none"/>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor:'var(--surface-5)' }}>
                <button onClick={resetFilters} className="text-xs text-forge-muted hover-text-primary transition-colors">
                  Réinitialiser
                </button>
                <button onClick={() => setS({ panelOpen: false })}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all active:scale-95"
                  style={{ background:'rgba(247,183,49,0.15)', color:'#F7B731' }}>
                  Voir {filtered.length} résultat{filtered.length!==1?'s':''}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-forge-muted text-sm">
                  {trades.length===0?'Aucun trade. Ajoutez votre premier !':'Aucun résultat pour ces filtres.'}
                </p>
                {hasFilters && trades.length>0 && (
                  <button onClick={resetFilters} className="mt-2 text-xs text-forge-accent hover:underline">
                    Effacer les filtres
                  </button>
                )}
              </div>
            )}
            {filtered.map(t => {
              const resultColor = {tp:'#2EA043',sl:'#F85149',be:'#58a6ff',missed:'#8B949E',manual_exit:'#F79009'}[t.result]||'#8B949E'
              return (
                <div key={t.id} onClick={() => navigate(`/app/trades/${t.id}`)}
                  className="card cursor-pointer hover:border-forge-muted/30 active:scale-[0.99] transition-all"
                  style={{ borderLeft:`3px solid ${resultColor}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color:'var(--text-primary)' }}>{t.market}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
                        style={{
                          background:t.type==='buy'?'rgba(46,160,67,0.15)':'rgba(248,81,73,0.15)',
                          color:t.type==='buy'?'#2EA043':'#F85149',
                          border:`1px solid ${t.type==='buy'?'rgba(46,160,67,0.3)':'rgba(248,81,73,0.3)'}`,
                        }}>
                        {t.type==='buy'?'↑ BUY':'↓ SELL'}
                      </span>
                      {t.session && (
                        <span className="text-[10px] px-2 py-0.5 rounded-lg flex-shrink-0 hidden sm:inline"
                          style={{ background:'var(--surface-4)', color:'var(--forge-muted)', border:'1px solid var(--border-soft)' }}>
                          {t.session}
                        </span>
                      )}
                    </div>
                    <Badge result={t.result}/>
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs" style={{ color:'var(--forge-muted)' }}>{fmtDate(t.date)}</p>
                    <div className="flex items-center gap-2">
                      {t.rr_planned!=null && (
                        <span className="text-[10px] font-mono" style={{ color:'var(--forge-muted)' }}>Plan {t.rr_planned}R</span>
                      )}
                      {t.rr_won!=null && (
                        <span className="text-xs font-mono font-semibold" style={{ color:resultColor }}>
                          {t.rr_won>=0?'+':''}{t.rr_won}R
                        </span>
                      )}
                    </div>
                  </div>
                  {(t.emotion||t.discipline_score!=null||t.respect_plan!=null||t.session) && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {t.session && (
                        <span className="text-[10px] px-2 py-0.5 rounded-lg sm:hidden"
                          style={{ background:'var(--surface-4)', color:'var(--forge-muted)', border:'1px solid var(--border-soft)' }}>
                          {t.session}
                        </span>
                      )}
                      {t.emotion && t.emotion!=='Neutre' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-lg"
                          style={{ background:'rgba(247,183,49,0.08)', color:'#F7B731', border:'1px solid rgba(247,183,49,0.2)' }}>
                          {t.emotion}
                        </span>
                      )}
                      {t.discipline_score!=null && (
                        <span className="text-[10px] px-2 py-0.5 rounded-lg font-mono"
                          style={{
                            background:t.discipline_score>=7?'rgba(46,160,67,0.08)':t.discipline_score>=5?'rgba(247,183,49,0.08)':'rgba(248,81,73,0.08)',
                            color:t.discipline_score>=7?'#2EA043':t.discipline_score>=5?'#F7B731':'#F85149',
                            border:`1px solid ${t.discipline_score>=7?'rgba(46,160,67,0.2)':t.discipline_score>=5?'rgba(247,183,49,0.2)':'rgba(248,81,73,0.2)'}`,
                          }}>
                          {t.discipline_score}/10
                        </span>
                      )}
                      {t.respect_plan!=null && (
                        <span className="text-[10px] px-2 py-0.5 rounded-lg"
                          style={{
                            background:t.respect_plan?'rgba(46,160,67,0.08)':'rgba(248,81,73,0.08)',
                            color:t.respect_plan?'#2EA043':'#F85149',
                            border:`1px solid ${t.respect_plan?'rgba(46,160,67,0.2)':'rgba(248,81,73,0.2)'}`,
                          }}>
                          {t.respect_plan?'✓ Plan':'✗ Plan'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}