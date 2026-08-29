import { useUIStore } from '../store/useUIStore'
import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Brain, TrendingUp, TrendingDown, Target, Zap, BarChart2, LayoutDashboard, X, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid
} from 'recharts'
import { useTrades } from '../hooks/useTrades'
import {
  calcWinRate, calcAvgRR, calcTotalProfit, calcDisciplineScore,
  getTopErrors, detectPatterns, calcPnl, fmtDate
} from '../utils'
import {
  format, subDays, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { SkeletonCard } from '../components/Skeleton'

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

// ── Custom tooltip ──────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div className="rounded-xl px-3 py-2 text-xs"
      style={{ background: 'var(--modal-bg)', border: '1px solid rgba(247,183,49,0.25)', backdropFilter: 'blur(12px)' }}>
      <p className="text-forge-muted mb-0.5">{label}</p>
      <p className="font-mono font-semibold" style={{ color: val >= 0 ? '#2EA043' : '#F85149' }}>
        {val >= 0 ? '+' : ''}{val.toFixed(2)}R
      </p>
    </div>
  )
}

const StatCard = ({ label, value, sub, color, icon: Icon, glow, t }) => {
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
      {t}
    </div>
  )
}

// ── Calendrier de trades ────────────────────────────────────
function TradeCalendar({ trades, allTrades, onDayClick }) {
  const { calendarMonth } = useUIStore(s => s.dashboard)
const setDashboardState = useUIStore(s => s.setDashboardState)
const [currentMonth, setCurrentMonth] = useState(
  calendarMonth ? new Date(calendarMonth) : new Date()
)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd   = endOfMonth(currentMonth)
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDow   = getDay(monthStart)

  const byDate = useMemo(() => {
    const map = {}
    trades.forEach(t => {
      if (!map[t.date]) map[t.date] = []
      map[t.date].push(t)
    })
    return map
  }, [trades])

  const byDateAll = useMemo(() => {
    const map = {}
    allTrades.forEach(t => {
      if (!map[t.date]) map[t.date] = []
      map[t.date].push(t)
    })
    return map
  }, [allTrades])

  const getDayProfit = (ts) => {
    if (!ts?.length) return null
    return +ts.reduce((acc, t) => acc + calcPnl(t), 0).toFixed(2)
  }

  const weeks = useMemo(() => {
    const allCellDates = []
    for (let i = 0; i < startDow; i++) {
      const d = new Date(monthStart)
      d.setDate(d.getDate() - (startDow - i))
      allCellDates.push(d)
    }
    days.forEach(d => allCellDates.push(d))
    const remainder = allCellDates.length % 7
    if (remainder !== 0) {
      const lastDay = days[days.length - 1]
      for (let i = 1; i <= 7 - remainder; i++) {
        const d = new Date(lastDay)
        d.setDate(d.getDate() + i)
        allCellDates.push(d)
      }
    }
    const result = []
    for (let i = 0; i < allCellDates.length; i += 7) {
      const chunk = allCellDates.slice(i, i + 7)
      let profit = 0, count = 0
      chunk.forEach(d => {
        const iso = format(d, 'yyyy-MM-dd')
        const ts = byDateAll[iso] || []
        ts.forEach(t => { count++; profit += calcPnl(t) })
      })
      result.push({ profit: +profit.toFixed(2), count })
    }
    return result
  }, [days, byDateAll, startDow, monthStart])

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
  const allCells = [...Array(startDow).fill(null), ...days]
  const weekRows = []
  for (let i = 0; i < allCells.length; i += 7) weekRows.push(allCells.slice(i, i + 7))

  return (
    <div className="mb-4 rounded-2xl overflow-hidden"
      style={{
        background: 'var(--calendar-bg)',
        border: '1px solid var(--surface-6)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--surface-4)' }}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(d => {
  const next = subMonths(d, 1)
  setDashboardState({ calendarMonth: next.toISOString() })
  return next
})}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 hover:bg-[var(--surface-6)]"
            style={{ border: '1px solid var(--surface-8)' }}>
            <ChevronLeft size={16} style={{ color: '#8B949E' }} />
          </button>
          <p className="text-base font-bold capitalize tracking-wide" style={{ color: 'var(--text-primary)' }}>
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </p>
          <button onClick={() => setCurrentMonth(d => {
  const next = addMonths(d, 1)
  setDashboardState({ calendarMonth: next.toISOString() })
  return next
})}
            disabled={isSameMonth(currentMonth, new Date())}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 hover:bg-[var(--surface-6)] disabled:opacity-20"
            style={{ border: '1px solid var(--surface-8)' }}>
            <ChevronRight size={16} style={{ color: '#8B949E' }} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Trades',   value: monthStats.count || '—', color: 'var(--text-primary)' },
            { label: 'Jours',    value: monthStats.days  || '—', color: 'var(--text-primary)' },
            { label: 'Win Rate',
              value: monthStats.count ? `${monthStats.winRate}%` : '—',
              color: !monthStats.count ? '#8B949E' : monthStats.winRate >= 50 ? '#2EA043' : '#F85149' },
            { label: 'P&L',
              value: monthStats.count ? `${monthStats.profit >= 0 ? '+' : ''}${monthStats.profit}R` : '—',
              color: !monthStats.count ? '#8B949E' : monthStats.profit >= 0 ? '#2EA043' : '#F85149' },
          ].map(s => (
            <div key={s.label} className="text-center rounded-xl py-2.5 px-1"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-5)' }}>
              <p className="text-[9px] font-medium uppercase tracking-widest mb-1.5"
                style={{ color: 'rgba(139,148,158,0.6)' }}>{s.label}</p>
              <p className="text-sm font-mono font-black leading-none" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3">
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {DAYS_FR.map((d, i) => (
                <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider py-2 rounded-lg"
                  style={{
                    color: i === 0 ? 'rgba(247,183,49,0.8)' : 'rgba(139,148,158,0.5)',
                    background: i === 0 ? 'rgba(247,183,49,0.06)' : 'transparent',
                  }}>
                  {d}
                </div>
              ))}
            </div>
            {weekRows.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1.5 mb-1.5">
                {week.map((day, di) => {
                  if (!day) return <div key={di} className="rounded-xl" style={{ aspectRatio: '1', background: 'var(--calendar-empty-cell)' }} />
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
                        aspectRatio: '1', cursor: hasTrade ? 'pointer' : 'default', padding: '7px 6px 6px',
                        background: isPos ? 'linear-gradient(145deg,rgba(46,160,67,0.22),rgba(46,160,67,0.08))'
                          : isNeg   ? 'linear-gradient(145deg,rgba(248,81,73,0.22),rgba(248,81,73,0.08))'
                          : isBreak ? 'linear-gradient(145deg,rgba(88,166,255,0.15),rgba(88,166,255,0.05))'
                          : isToday ? 'rgba(247,183,49,0.06)' : isSun ? 'rgba(247,183,49,0.02)' : 'var(--surface-1)',
                        border: `1px solid ${isToday ? 'rgba(247,183,49,0.6)' : isPos ? 'rgba(46,160,67,0.4)' : isNeg ? 'rgba(248,81,73,0.4)' : isBreak ? 'rgba(88,166,255,0.3)' : isSun ? 'rgba(247,183,49,0.1)' : 'var(--surface-4)'}`,
                      }}>
                      <div className="flex justify-end mb-1">
                        <span className="text-[11px] font-bold leading-none"
                          style={{ color: isToday ? '#F7B731' : hasTrade ? (isPos ? 'rgba(46,160,67,0.9)' : isNeg ? 'rgba(248,81,73,0.9)' : 'rgba(88,166,255,0.9)') : 'rgba(139,148,158,0.3)' }}>
                          {format(day, 'd')}
                        </span>
                      </div>
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
                      {hasTrade && (
                        <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-xl"
                          style={{ background: isPos ? 'linear-gradient(90deg,#2EA043,#3fb950)' : isNeg ? 'linear-gradient(90deg,#F85149,#ff6b6b)' : 'linear-gradient(90deg,#58a6ff,#79c0ff)', opacity: 0.8 }} />
                      )}
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

          <div className="hidden sm:flex flex-col w-[54px] flex-shrink-0 gap-1.5">
            <div className="text-[9px] font-bold uppercase tracking-wider text-center py-2 rounded-lg"
              style={{ color: 'rgba(139,148,158,0.4)' }}>Sem</div>
            {weeks.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-center rounded-xl transition-all"
                style={{
                  minHeight: '44px',
                  background: w.count === 0 ? 'var(--surface-1)' : w.profit > 0 ? 'linear-gradient(145deg,rgba(46,160,67,0.14),rgba(46,160,67,0.05))' : w.profit < 0 ? 'linear-gradient(145deg,rgba(248,81,73,0.14),rgba(248,81,73,0.05))' : 'rgba(88,166,255,0.07)',
                  border: `1px solid ${w.count === 0 ? 'var(--surface-3)' : w.profit > 0 ? 'rgba(46,160,67,0.25)' : w.profit < 0 ? 'rgba(248,81,73,0.25)' : 'rgba(88,166,255,0.2)'}`,
                }}>
                {w.count > 0 ? (
                  <>
                    <span className="text-[11px] font-mono font-black leading-none"
                      style={{ color: w.profit > 0 ? '#3fb950' : w.profit < 0 ? '#ff6b6b' : '#79c0ff' }}>
                      {w.profit > 0 ? '+' : ''}{w.profit}R
                    </span>
                    <span className="text-[9px] mt-1 font-medium" style={{ color: 'rgba(139,148,158,0.45)' }}>
                      {w.count}t
                    </span>
                  </>
                ) : (
                  <span style={{ color: 'var(--surface-4)', fontSize: 8 }}>—</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal trades du jour ────────────────────────────────────
function DayTradesModal({ trades, onClose, navigate }) {
  if (!trades?.length) return null
  const date = trades[0].date
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'var(--modal-overlay)' }} />
      <div onClick={e => e.stopPropagation()}
        className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden"
        style={{ background: 'var(--modal-bg)', border: '1px solid var(--surface-12)', boxShadow: '0 24px 64px rgba(0,0,0,0.7)', maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b" style={{ borderColor: 'var(--surface-6)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtDate(date)}</p>
            <p className="text-[10px] text-forge-muted mt-0.5">{trades.length} trade{trades.length > 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-forge-muted hover-text-primary transition-colors"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto p-3 space-y-2" style={{ maxHeight: 'calc(80vh - 60px)' }}>
          {trades.map(t => {
            const colors = { tp: '#2EA043', sl: '#F85149', be: '#58a6ff', missed: '#8B949E', manual_exit: '#F79009' }
            const color  = colors[t.result] || '#8B949E'
            return (
              <button key={t.id}
                onClick={() => { onClose(); navigate(`/app/trades/${t.id}`) }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.98] hover:bg-[var(--surface-6)]"
                style={{ border: `1px solid ${color}25`, background: `${color}08` }}>
                <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.market}</span>
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
    </div>,
    document.body
  )
}

// ── Page principale ─────────────────────────────────────────
export default function Dashboard() {
  const { trades, loading, error, refresh } = useTrades()
  const navigate = useNavigate()
  const [dayTrades, setDayTrades] = useState(null)

  // ── Fenêtre 30 jours ──────────────────────────────────────
  const cutoff30 = format(subDays(new Date(), 29), 'yyyy-MM-dd')
  const trades30 = useMemo(
    () => trades.filter(t => t.date >= cutoff30),
    [trades, cutoff30]
  )

  if (loading) return (
    <div className="page space-y-4">
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-1.5">
          <div className="h-6 w-32 rounded-lg animate-pulse" style={{ background: 'var(--surface-6)' }} />
          <div className="h-3 w-24 rounded-lg animate-pulse" style={{ background: 'var(--surface-3)' }} />
        </div>
        <div className="h-4 w-16 rounded-lg animate-pulse" style={{ background: 'var(--surface-3)' }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
      <div className="rounded-2xl animate-pulse" style={{ background: 'var(--surface-3)', height: '200px' }} />
      <SkeletonCard />
      <div className="rounded-2xl animate-pulse" style={{ background: 'var(--surface-3)', height: '340px' }} />
    </div>
  )

  // ── KPIs sur 30j ─────────────────────────────────────────
  const winRate   = calcWinRate(trades30)
  const avgRR     = calcAvgRR(trades30)
  const profit    = calcTotalProfit(trades30)
  const discScore = calcDisciplineScore(trades30)
  const topErrors = getTopErrors(trades30)
  const patterns  = detectPatterns(trades30)

  const tp         = trades30.filter(t => t.result === 'tp').length
  const sl         = trades30.filter(t => t.result === 'sl').length
  const be         = trades30.filter(t => t.result === 'be').length
  const missed     = trades30.filter(t => t.result === 'missed').length
  const manualExit = trades30.filter(t => t.result === 'manual_exit').length
  const total30    = trades30.length

  // ── Equity curve 30j ─────────────────────────────────────
  let cum = 0
  const equityData = [...Array(30)].map((_, i) => {
    const d   = subDays(new Date(), 29 - i)
    const iso = format(d, 'yyyy-MM-dd')
    const pnl = trades.filter(t => t.date === iso).reduce((acc, t) => acc + calcPnl(t), 0)
    cum += pnl
    return { label: format(d, 'dd/MM'), equity: +cum.toFixed(2) }
  })

  const minEquity  = Math.min(...equityData.map(d => d.equity))
  const maxEquity  = Math.max(...equityData.map(d => d.equity))
  const lastEquity = equityData[equityData.length - 1]?.equity || 0
  const isUp       = lastEquity >= 0

  const totalAll = trades.length

  const hour = new Date().getHours()
  const greeting = hour < 6 ? 'Bonne nuit' : hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div className="page animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between mb-5" style={{ gap: 12 }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(247,183,49,0.25), rgba(247,183,49,0.08))',
                border: '1px solid rgba(247,183,49,0.35)',
                boxShadow: '0 4px 16px -6px rgba(247,183,49,0.5)',
              }}>
              <LayoutDashboard size={17} className="text-forge-accent" />
              <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full blur-lg opacity-40" style={{ background: '#F7B731' }} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                {greeting}, trader
              </h1>
              <p className="text-[11px] text-forge-muted truncate">
                {totalAll} trade{totalAll !== 1 ? 's' : ''} au total
              </p>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-full whitespace-nowrap"
            style={{
              background: 'var(--surface-4)',
              border: `1px solid ${error ? 'rgba(248,81,73,0.35)' : 'rgba(46,160,67,0.35)'}`,
              color: error ? '#F85149' : 'var(--forge-muted)',
            }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
              style={{
                background: error ? '#F85149' : '#2EA043',
                boxShadow: error ? '0 0 6px #F85149' : '0 0 6px #2EA043',
              }} />
            {error ? 'Hors ligne' : 'En ligne'}
          </div>
        </div>
      </div>

      {/* Erreur de chargement + retry */}
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

      {/* Bandeau période */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl text-xs"
        style={{ background: 'rgba(247,183,49,0.07)', border: '1px solid rgba(247,183,49,0.15)' }}>
        <span style={{ color: '#F7B731', fontWeight: 600 }}>30 derniers jours</span>
        <span style={{ color: 'var(--text-tertiary)' }}>·</span>
        <span style={{ color: 'var(--text-tertiary)' }}>
          {total30} trade{total30 !== 1 ? 's' : ''}
          {total30 < totalAll && ` sur ${totalAll} au total`}
        </span>
      </div>

      {/* Stats grid — 30j */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Win Rate"
          value={total30 ? `${winRate}%` : '—'}
          sub={total30 ? `${tp} TP / ${sl} SL` : 'Aucun trade'}
          color={!total30 ? '' : winRate >= 50 ? 'text-forge-green' : 'text-forge-red'}
          icon={Target}
          glow={!total30 ? undefined : winRate >= 50 ? '#2EA043' : '#F85149'}
        />
        <StatCard
          label="Profit 30j"
          value={total30 ? (profit >= 0 ? `+${profit.toFixed(1)}R` : `${profit.toFixed(1)}R`) : '—'}
          sub="cumul 30 jours"
          color={!total30 ? '' : profit >= 0 ? 'text-forge-green' : 'text-forge-red'}
          icon={profit >= 0 ? TrendingUp : TrendingDown}
          glow={!total30 ? undefined : profit >= 0 ? '#2EA043' : '#F85149'}
        />
        <StatCard
          label="RR Moyen"
          value={avgRR > 0 ? `${avgRR}R` : '—'}
          sub="sur trades gagnants"
          icon={BarChart2}
        />
        <StatCard
          label="Discipline"
          value={total30 ? `${discScore}/10` : '—'}
          sub={!total30 ? 'Aucun trade' : discScore >= 7 ? 'Solide 💪' : discScore >= 5 ? 'À améliorer' : 'Attention ⚠️'}
          color={!total30 ? '' : discScore >= 7 ? 'text-forge-green' : discScore >= 5 ? 'text-forge-accent' : 'text-forge-red'}
          icon={Zap}
          glow={!total30 ? undefined : discScore >= 7 ? '#2EA043' : discScore >= 5 ? '#F7B731' : '#F85149'}
        />
      </div>

      {/* Equity chart */}
      {totalAll > 0 && (
        <div className="card mb-5" style={{ borderColor: isUp ? 'rgba(46,160,67,0.2)' : 'rgba(248,81,73,0.2)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-title mb-0">Courbe de performance</p>
              <p className="text-[11px] text-forge-muted">30 derniers jours</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-lg font-semibold leading-none"
                style={{ color: lastEquity >= 0 ? '#2EA043' : '#F85149' }}>
                {lastEquity >= 0 ? '+' : ''}{lastEquity.toFixed(2)}R
              </p>
              <p className="text-[10px] text-forge-muted mt-0.5">cumulé</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={equityData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="eqUp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2EA043" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2EA043" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="eqDown" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F85149" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#F85149" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--surface-3)" />
              <XAxis dataKey="label" tick={{ fill: '#8B949E', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
              <YAxis tick={{ fill: '#8B949E', fontSize: 10 }} axisLine={false} tickLine={false}
                domain={[Math.floor(minEquity) - 1, Math.ceil(maxEquity) + 1]}
                tickFormatter={v => `${v}R`} />
              <ReferenceLine y={0} stroke="var(--surface-12)" strokeDasharray="4 4" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="equity"
                stroke={isUp ? '#2EA043' : '#F85149'} strokeWidth={2}
                fill={isUp ? 'url(#eqUp)' : 'url(#eqDown)'}
                dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: isUp ? '#2EA043' : '#F85149' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Distribution résultats — 30j */}
      {total30 > 0 && (
        <div className="card mb-5">
          <p className="section-title">Distribution des résultats · 30j</p>
          <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-3">
            {tp > 0         && <div style={{ flex: tp,         background: '#2EA043' }} />}
            {sl > 0         && <div style={{ flex: sl,         background: '#F85149' }} />}
            {be > 0         && <div style={{ flex: be,         background: '#58a6ff' }} />}
            {missed > 0     && <div style={{ flex: missed,     background: '#8B949E' }} />}
            {manualExit > 0 && <div style={{ flex: manualExit, background: '#F79009' }} />}
          </div>
          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { label: 'TP',     count: tp,         color: '#2EA043' },
              { label: 'SL',     count: sl,         color: '#F85149' },
              { label: 'BE',     count: be,         color: '#58a6ff' },
              { label: 'Missed', count: missed,     color: '#8B949E' },
              { label: 'Manuel', count: manualExit, color: '#F79009' },
            ].map(({ label, count, color }) => (
              <div key={label}>
                <p className="text-xl font-mono font-semibold" style={{ color }}>{count}</p>
                <p className="text-[10px] text-forge-muted">{label}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                  {total30 ? Math.round((count / total30) * 100) : 0}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IA Insights + Top erreurs — 30j */}
      <div className={`mb-5 ${patterns.length > 0 && topErrors.length > 0 ? 'lg:grid lg:grid-cols-2 lg:gap-4' : ''}`}>
        {patterns.length > 0 && (
          <div className="mb-5">
            <p className="section-title flex items-center gap-1.5">
              <Brain size={12} /> IA Insights · 30j
            </p>
            <div className="space-y-2">
              {patterns.map((p, i) => (
                <div key={i} className="card border-l-2 py-3"
                  style={{ borderLeftColor: p.type === 'success' ? '#2EA043' : '#F7B731' }}>
                  <p className={`text-xs font-semibold mb-0.5 ${p.type === 'success' ? 'text-forge-green' : 'text-forge-accent'}`}>
                    {p.title}
                  </p>
                  <p className="text-xs text-forge-muted">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {topErrors.length > 0 && (
          <div className="mb-5">
            <p className="section-title">Top erreurs · 30j</p>
            <div className="card space-y-3">
              {topErrors.map(({ label, count }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-forge-muted">{label}</span>
                    <span className="font-mono text-xs text-forge-muted">{count}×</span>
                  </div>
                  <div className="h-1.5 bg-forge-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((count / total30) * 100 * 3, 100)}%`,
                        background: 'linear-gradient(90deg,rgba(247,183,49,0.8),rgba(247,183,49,0.4))',
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Calendrier — sur tous les trades, desktop only */}
      {totalAll > 0 && (
        <div className="hidden sm:block">
          <p className="section-title mb-3">Calendrier — tous les trades</p>
          <TradeCalendar trades={trades} allTrades={trades} onDayClick={setDayTrades} />
        </div>
      )}

      {/* Trades récents — mobile only, tous les trades */}
      {totalAll > 0 && (
        <div className="sm:hidden mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="section-title mb-0">Trades récents</p>
            <button onClick={() => navigate('/app/trades')}
              className="text-xs font-medium transition-colors"
              style={{ color: '#F7B731' }}>
              Voir tous →
            </button>
          </div>
          <div className="space-y-2">
            {[...trades]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map(t => {
                const colors = { tp: '#2EA043', sl: '#F85149', be: '#58a6ff', missed: '#8B949E', manual_exit: '#F79009' }
                const labels = { tp: 'TP', sl: 'SL', be: 'BE', missed: 'Missed', manual_exit: 'Manuel' }
                const color = colors[t.result] || '#8B949E'
                return (
                  <button key={t.id} onClick={() => navigate(`/app/trades/${t.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all active:scale-[0.99]"
                    style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-6)' }}>
                    <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.market}</span>
                        <span className="text-xs font-mono" style={{ color: t.type === 'buy' ? '#2EA043' : '#F85149' }}>
                          {t.type?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] text-forge-muted">{fmtDate(t.date)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                        style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
                        {labels[t.result] || t.result}
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
          <button onClick={() => navigate('/app/trades')}
            className="w-full mt-3 py-3 rounded-2xl text-sm font-medium transition-all active:scale-[0.99]"
            style={{ background: 'rgba(247,183,49,0.07)', border: '1px solid rgba(247,183,49,0.2)', color: '#F7B731' }}>
            Voir tous les trades →
          </button>
        </div>
      )}

      {/* Empty state */}
      {totalAll === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(247,183,49,0.1)', border: '1px solid rgba(247,183,49,0.2)' }}>
            <BarChart2 size={28} className="text-forge-accent" />
          </div>
          <p className="text-forge-muted text-sm mb-1">Aucun trade pour l'instant.</p>
          <p className="text-forge-muted/50 text-xs">Commencez par journaliser votre première position.</p>
        </div>
      )}

      {dayTrades && (
        <DayTradesModal trades={dayTrades} onClose={() => setDayTrades(null)} navigate={navigate} />
      )}
    </div>
  )
}