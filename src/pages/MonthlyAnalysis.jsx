import { useUIStore } from '../store/useUIStore'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Target, Pencil, Check, X, Trash2, TrendingUp, TrendingDown, Sparkles, BarChart2, Zap, Trophy } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid, ReferenceLine
} from 'recharts'
import { useTrades } from '../hooks/useTrades'
import { useMonthlyGoal } from '../hooks/useMonthlyGoal'
import { getMonthlyStats, generateFeedback, fmtMonth, calcDisciplineScore, calcAvgRR, calcWinRate } from '../utils'
import { format, addMonths, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import AIAssistant from '../components/AIAssistant'
import { SkeletonCard } from '../components/Skeleton'

// ── Helpers ─────────────────────────────────────────────────
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const pct   = (value, goal) => goal ? clamp(Math.round((value / goal) * 100), 0, 100) : 0

// ── Custom tooltip ───────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs"
      style={{
        background: 'var(--modal-bg)',
        border: '1px solid rgba(247,183,49,0.2)',
        backdropFilter: 'blur(12px)',
        color: 'var(--text-primary)',
      }}
    >
      <p className="mb-0.5" style={{ color: 'var(--forge-muted)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono font-semibold" style={{ color: p.color || p.fill }}>
          {p.name === 'winRate' ? `${p.value}%` : p.name === 'profit' ? `${p.value > 0 ? '+' : ''}${p.value}R` : p.value}
        </p>
      ))}
    </div>
  )
}

// ── Cercle de progression SVG ────────────────────────────────
const CircleProgress = ({ pct: p, size = 76, color = '#F7B731', label, sublabel }) => {
  const r    = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const dash = (p / 100) * circ
  const done = p >= 100
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-8)" strokeWidth={8} />
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={done ? '#2EA043' : color}
            strokeWidth={8}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dasharray 0.8s ease',
              filter: done ? 'drop-shadow(0 0 4px #2EA043)' : `drop-shadow(0 0 3px ${color}88)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-mono font-bold" style={{ color: done ? '#2EA043' : color }}>
            {done ? '✓' : `${p}%`}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-center leading-tight font-medium" style={{ color: 'var(--forge-muted)' }}>{label}</p>
      {sublabel && <p className="text-[10px] text-center" style={{ color: 'var(--text-faint)' }}>{sublabel}</p>}
    </div>
  )
}

// ── Barre de progression linéaire ────────────────────────────
const LinearProgress = ({ label, current, goal, unit = '', color = '#F7B731' }) => {
  const p    = pct(current, goal)
  const done = p >= 100
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs" style={{ color: 'var(--forge-muted)' }}>{label}</span>
        <span className="text-xs font-mono" style={{ color: done ? '#2EA043' : color }}>
          {current}{unit}
          <span className="ml-1" style={{ color: 'var(--text-faint)' }}>/ {goal}{unit}</span>
          {done && <span className="ml-1">✓</span>}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-8)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${p}%`,
            background: done ? '#2EA043' : color,
            boxShadow: done ? '0 0 6px rgba(46,160,67,0.5)' : `0 0 4px ${color}55`,
          }}
        />
      </div>
    </div>
  )
}

// ── Input objectif ───────────────────────────────────────────
const GoalInput = ({ label, value, onChange, unit = '', min = 0, max = 999, placeholder }) => (
  <div>
    <label className="label">{label}</label>
    <div className="relative">
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(e.target.value === '' ? '' : +e.target.value)}
        placeholder={placeholder}
        className="w-full pr-8"
      />
      {unit && (
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
          style={{ color: 'var(--forge-muted)' }}
        >
          {unit}
        </span>
      )}
    </div>
  </div>
)

// ── StatCard ─────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color, icon: Icon, glow }) => (
  <div
    className="rounded-2xl p-3 relative overflow-hidden"
    style={{
      background: 'var(--surface-card)',
      border: `1px solid ${glow ? `${glow}25` : 'var(--border-soft)'}`,
    }}
  >
    {glow && (
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(ellipse at top left, ${glow}, transparent 70%)` }}
      />
    )}
    <div className="flex items-center justify-between mb-1">
      <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--forge-muted)' }}>{label}</p>
      {Icon && <Icon size={12} style={{ color: glow || 'var(--forge-muted)', opacity: 0.6 }} />}
    </div>
    <p className={`text-xl font-mono font-semibold leading-none ${color || ''}`} style={!color ? { color: 'var(--text-primary)' } : {}}>{value}</p>
    {sub && <p className="text-[10px] mt-1" style={{ color: 'var(--forge-muted)' }}>{sub}</p>}
  </div>
)

// ── Main ─────────────────────────────────────────────────────
export default function MonthlyAnalysis() {
  const { trades, loading: tradesLoading } = useTrades()
  const setMonthlyState  = useUIStore(s => s.setMonthlyState)
  // On part toujours du mois courant à l'arrivée sur la page
  // (le store garde le mois de navigation, mais ne réinjecte pas l'ancien au montage)
  const [current, setCurrent] = useState(new Date())
  const [editing, setEditing] = useState(false)
  const [showAI, setShowAI]   = useState(false)

  const year  = current.getFullYear()
  const month = current.getMonth() + 1

  const { goal, loading: goalLoading, saving, save, remove } = useMonthlyGoal(year, month)
  const [form, setForm] = useState({ goal_trades: '', goal_winrate: '', goal_profit: '', goal_discipline: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openEdit = () => {
    setForm({
      goal_trades:     goal?.goal_trades     ?? '',
      goal_winrate:    goal?.goal_winrate    ?? '',
      goal_profit:     goal?.goal_profit     ?? '',
      goal_discipline: goal?.goal_discipline ?? '',
    })
    setEditing(true)
  }

  const handleSave = async () => {
    const payload = {}
    if (form.goal_trades     !== '') payload.goal_trades     = +form.goal_trades
    if (form.goal_winrate    !== '') payload.goal_winrate    = +form.goal_winrate
    if (form.goal_profit     !== '') payload.goal_profit     = +form.goal_profit
    if (form.goal_discipline !== '') payload.goal_discipline = +form.goal_discipline
    try {
      await save(payload)
      setEditing(false)
    } catch (e) {
      console.error('Erreur sauvegarde objectif', e)
      alert('Erreur: ' + (e.message || "Impossible d'enregistrer l'objectif"))
    }
  }

  // ── Stats ────────────────────────────────────────────────
  const stats = useMemo(
    () => (trades.length ? getMonthlyStats(trades, year, month) : null),
    [trades, year, month]
  )

  const disciplineAvg = useMemo(
    () => stats?.trades?.length ? calcDisciplineScore(stats.trades) : 0,
    [stats]
  )

  const dayStats = useMemo(() => {
    if (!stats?.trades?.length) return []
    const map = {}
    stats.trades.forEach(t => {
      if (!t.day) return
      if (!map[t.day]) map[t.day] = { wins: 0, total: 0, profit: 0, trades: [] }
      map[t.day].total++
      map[t.day].trades.push(t)
      if (t.result === 'tp') map[t.day].profit += (t.rr_won || 0)
      if (t.result === 'sl') map[t.day].profit += (t.rr_won ?? -1)
      if (t.result === 'manual_exit') map[t.day].profit += (t.rr_won || 0)
    })
    return Object.entries(map).map(([day, d]) => ({
      name: day.slice(0, 3),
      winRate: calcWinRate(d.trades),
      profit: +d.profit.toFixed(2),
      total: d.total,
    })).sort((a, b) => b.profit - a.profit)
  }, [stats])

  const sessionStats = useMemo(() => {
    if (!stats?.trades?.length) return []
    const map = {}
    stats.trades.forEach(t => {
      if (!t.session) return
      if (!map[t.session]) map[t.session] = { wins: 0, total: 0, profit: 0, trades: [] }
      map[t.session].trades.push(t)
      map[t.session].total++
      if (t.result === 'tp') { map[t.session].wins++; map[t.session].profit += (t.rr_won || 0) }
      if (t.result === 'sl') map[t.session].profit += (t.rr_won ?? -1)
      if (t.result === 'manual_exit') map[t.session].profit += (t.rr_won || 0)
    })
    return Object.entries(map)
      .map(([s, d]) => ({ name: s, wr: calcWinRate(d.trades), profit: +d.profit.toFixed(2), total: d.total }))
      .sort((a, b) => b.profit - a.profit)
  }, [stats])

  const monthlyTrend = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(current, 5 - i)
      const y = d.getFullYear(), m = d.getMonth() + 1
      const s = getMonthlyStats(trades, y, m)
      return {
        name: format(d, 'MMM', { locale: fr }),
        winRate: s.winRate,
        profit: +(s.profit || 0).toFixed(2),
        isCurrentMonth: y === year && m === month,
      }
    })
  }, [trades, current, year, month])

  const progressItems = goal ? [
    goal.goal_trades     && { label: 'Trades',     current: stats?.total ?? 0,   goal: goal.goal_trades,     unit: '',    color: '#58a6ff' },
    goal.goal_winrate    && { label: 'Win Rate',    current: stats?.winRate ?? 0, goal: goal.goal_winrate,    unit: '%',   color: '#F7B731' },
    goal.goal_profit     && { label: 'Profit',      current: stats?.profit ?? 0,  goal: goal.goal_profit,     unit: 'R',   color: '#2EA043' },
    goal.goal_discipline && { label: 'Discipline',  current: disciplineAvg,        goal: goal.goal_discipline, unit: '/10', color: '#a78bfa' },
  ].filter(Boolean) : []

  const feedback = useMemo(
    () => stats?.trades?.length >= 5 ? generateFeedback(stats.trades) : null,
    [stats]
  )

  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth() + 1

  const aiContext = useMemo(() => ({
    market: `Analyse mensuelle ${fmtMonth(year, month)}`,
    type: null, result: null, rr_planned: null, rr_won: null,
    emotion: null, discipline_score: disciplineAvg,
    _monthlyContext: true,
    _stats: stats,
    _goal: goal,
  }), [stats, goal, disciplineAvg, year, month])

  const goToPrevMonth = () => {
    const next = subMonths(current, 1)
    setCurrent(next)
    setMonthlyState({ currentMonth: next.toISOString() })
    setEditing(false)
  }

  const goToNextMonth = () => {
    const next = addMonths(current, 1)
    setCurrent(next)
    setMonthlyState({ currentMonth: next.toISOString() })
    setEditing(false)
  }

  if (tradesLoading || goalLoading) return (
    <div className="page space-y-4">
      <div className="flex items-center justify-between mb-5">
        <div className="w-9 h-9 rounded-xl animate-pulse" style={{ background: 'var(--skeleton-bg-soft)' }} />
        <div className="h-5 w-36 rounded-lg animate-pulse" style={{ background: 'var(--skeleton-bg-soft)' }} />
        <div className="w-9 h-9 rounded-xl animate-pulse" style={{ background: 'var(--skeleton-bg-soft)' }} />
      </div>
      <div className="rounded-2xl animate-pulse" style={{ background: 'var(--skeleton-bg-soft)', height: '180px' }} />
      <div className="grid grid-cols-2 gap-2">
        <SkeletonCard /><SkeletonCard />
        <SkeletonCard /><SkeletonCard />
      </div>
      <div className="rounded-2xl animate-pulse" style={{ background: 'var(--skeleton-bg-soft)', height: '160px' }} />
      <SkeletonCard />
    </div>
  )

  return (
    <div className="page">

      {/* ── Sélecteur de mois ── */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={goToPrevMonth}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 hover-text-primary"
          style={{ border: '1px solid var(--border-soft)', color: 'var(--forge-muted)' }}
        >
          <ChevronLeft size={18} />
        </button>

        <div className="text-center">
          <h1 className="text-base font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
            {fmtMonth(year, month)}
          </h1>
          {isCurrentMonth && (
            <span className="text-[10px] text-forge-accent font-mono">● mois en cours</span>
          )}
        </div>

        <button
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 hover-text-primary disabled:opacity-30"
          style={{ border: '1px solid var(--border-soft)', color: 'var(--forge-muted)' }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── Objectifs ── */}
      {!editing ? (
        <div
          className="rounded-2xl p-4 mb-5"
          style={{
            background: 'var(--surface-card)',
            border: goal ? '1px solid rgba(247,183,49,0.2)' : '1px solid var(--border-soft)',
            boxShadow: goal ? '0 0 24px rgba(247,183,49,0.04)' : 'none',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(247,183,49,0.12)' }}>
                <Target size={12} className="text-forge-accent" />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Objectifs du mois</p>
            </div>
            <button
              onClick={openEdit}
              className="flex items-center gap-1 text-xs transition-colors hover-text-primary"
              style={{ color: goal ? '#F7B731' : 'var(--forge-muted)' }}
            >
              <Pencil size={11} />
              {goal ? 'Modifier' : 'Définir'}
            </button>
          </div>

          {!goal ? (
            <div className="text-center py-5">
              <p className="text-sm mb-2" style={{ color: 'var(--forge-muted)' }}>Aucun objectif pour ce mois</p>
              <button
                onClick={openEdit}
                className="text-xs px-4 py-2 rounded-xl transition-all active:scale-95"
                style={{ background: 'rgba(247,183,49,0.1)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.2)' }}
              >
                Définir des objectifs →
              </button>
            </div>
          ) : progressItems.length === 0 ? (
            <p className="text-sm text-center py-2" style={{ color: 'var(--forge-muted)' }}>Objectifs sans valeurs définies.</p>
          ) : (
            <>
              <div className={`grid gap-4 mb-4 ${progressItems.length <= 2 ? 'grid-cols-2' : 'grid-cols-4'}`}>
                {progressItems.map((item, i) => (
                  <CircleProgress
                    key={i}
                    pct={pct(item.current, item.goal)}
                    color={item.color}
                    label={item.label}
                    sublabel={`${item.current}${item.unit} / ${item.goal}${item.unit}`}
                  />
                ))}
              </div>
              <div className="space-y-3 pt-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                {progressItems.map((item, i) => (
                  <LinearProgress key={i} {...item} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div
          className="rounded-2xl p-4 mb-5"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid rgba(247,183,49,0.25)',
            boxShadow: '0 0 24px rgba(247,183,49,0.06)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-forge-accent" />
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Objectifs du mois</p>
            </div>
            <button
              onClick={() => setEditing(false)}
              className="transition-colors hover-text-primary"
              style={{ color: 'var(--forge-muted)' }}
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <GoalInput label="Nombre de trades"  value={form.goal_trades}      onChange={v => set('goal_trades', v)}      min={1}   max={200} placeholder="ex: 20" />
            <GoalInput label="Win Rate"           value={form.goal_winrate}     onChange={v => set('goal_winrate', v)}     min={1}   max={100} unit="%" placeholder="ex: 55" />
            <GoalInput label="Profit"             value={form.goal_profit}      onChange={v => set('goal_profit', v)}      min={-99} max={999} unit="R" placeholder="ex: 10" />
            <GoalInput label="Discipline moy."    value={form.goal_discipline}  onChange={v => set('goal_discipline', v)}  min={1}   max={10}  placeholder="ex: 8" />
          </div>
          <p className="text-[11px] mb-3" style={{ color: 'var(--forge-muted)' }}>Laissez vide les objectifs à ne pas suivre.</p>
          <div className="flex gap-2">
            {goal && (
              <button
                onClick={async () => { await remove(); setEditing(false) }}
                className="flex items-center gap-1 text-xs text-forge-red hover:opacity-80 transition-opacity px-2"
              >
                <Trash2 size={12} /> Supprimer
              </button>
            )}
            <div className="flex-1" />
            <button onClick={() => setEditing(false)} className="btn-ghost text-xs py-2 px-4">Annuler</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check size={13} />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* ── Pas de trades ── */}
      {(!stats || stats.total === 0) ? (
        <div className="text-center py-16">
          <BarChart2 size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--forge-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--forge-muted)' }}>Aucun trade ce mois-ci.</p>
        </div>
      ) : (
        <>
          {/* ── KPIs principaux ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <StatCard label="Trades"     value={stats.total}   sub={`${stats.tp} TP · ${stats.sl} SL`} icon={BarChart2} />
            <StatCard label="Win Rate"   value={`${stats.winRate}%`}
              color={stats.winRate >= 50 ? 'text-forge-green' : 'text-forge-red'}
              glow={stats.winRate >= 50 ? '#2EA043' : '#F85149'}
              icon={stats.winRate >= 50 ? TrendingUp : TrendingDown} />
            <StatCard label="Profit"
              value={stats.profit >= 0 ? `+${stats.profit}R` : `${stats.profit}R`}
              color={stats.profit >= 0 ? 'text-forge-green' : 'text-forge-red'}
              glow={stats.profit >= 0 ? '#2EA043' : '#F85149'}
              icon={stats.profit >= 0 ? TrendingUp : TrendingDown} />
            <StatCard label="Discipline" value={`${disciplineAvg}/10`}
              color={disciplineAvg >= 7 ? 'text-forge-green' : disciplineAvg >= 5 ? 'text-forge-accent' : 'text-forge-red'}
              glow={disciplineAvg >= 7 ? '#2EA043' : disciplineAvg >= 5 ? '#F7B731' : '#F85149'}
              icon={Zap} />
          </div>

          {/* ── Distribution résultats ── */}
          <div
            className="rounded-2xl p-4 mb-4"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)' }}
          >
            <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--forge-muted)' }}>Distribution</p>
            <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-3">
              {stats.tp     > 0 && <div style={{ flex: stats.tp,     background: '#2EA043' }} />}
              {stats.sl     > 0 && <div style={{ flex: stats.sl,     background: '#F85149' }} />}
              {stats.be     > 0 && <div style={{ flex: stats.be,     background: '#58a6ff' }} />}
              {stats.missed > 0 && <div style={{ flex: stats.missed, background: '#8B949E' }} />}
              {(stats.trades?.filter(t => t.result === 'manual_exit').length > 0) && (
                <div style={{ flex: stats.trades.filter(t => t.result === 'manual_exit').length, background: '#F79009' }} />
              )}
            </div>
            <div className="grid grid-cols-5 gap-1 text-center">
              {[
                { label: 'TP',     count: stats.tp,     color: '#2EA043' },
                { label: 'SL',     count: stats.sl,     color: '#F85149' },
                { label: 'BE',     count: stats.be,     color: '#58a6ff' },
                { label: 'Missed', count: stats.missed, color: '#8B949E' },
                { label: 'Manuel', count: stats.trades?.filter(t => t.result === 'manual_exit').length ?? 0, color: '#F79009' },
              ].map(({ label, count, color }) => (
                <div key={label}>
                  <p className="text-lg font-mono font-semibold" style={{ color }}>{count}</p>
                  <p className="text-[10px]" style={{ color: 'var(--forge-muted)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Tendance 6 mois ── */}
          <div
            className="rounded-2xl p-4 mb-4"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--forge-muted)' }}>Tendance 6 mois</p>
              <div className="flex gap-3 text-[10px]" style={{ color: 'var(--forge-muted)' }}>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-forge-accent inline-block" />Win Rate
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={monthlyTrend} barSize={28} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-soft)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--forge-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--forge-muted)', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <ReferenceLine y={50} stroke="var(--border-medium)" strokeDasharray="4 4" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                  {monthlyTrend.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.isCurrentMonth ? '#F7B731' : entry.winRate >= 50 ? '#2EA043' : '#F85149'}
                      opacity={entry.isCurrentMonth ? 1 : 0.75}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Perf par jour de semaine ── */}
          {dayStats.length > 0 && (
            <div
              className="rounded-2xl p-4 mb-4"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)' }}
            >
              <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--forge-muted)' }}>Performance par jour</p>
              <div className="space-y-2">
                {dayStats.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 w-16 flex-shrink-0">
                      {i === 0 && <Trophy size={10} className="text-forge-accent" />}
                      <span className="text-xs" style={{ color: 'var(--forge-muted)' }}>{d.name}</span>
                    </div>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-8)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${d.winRate}%`, background: d.winRate >= 50 ? '#2EA043' : '#F85149' }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] w-20 text-right flex-shrink-0">
                      <span style={{ color: d.winRate >= 50 ? '#2EA043' : '#F85149' }}>{d.winRate}%</span>
                      <span className="font-mono" style={{ color: d.profit >= 0 ? '#2EA043' : '#F85149' }}>
                        {d.profit >= 0 ? '+' : ''}{d.profit}R
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Perf par session ── */}
          {sessionStats.length > 0 && (
            <div
              className="rounded-2xl p-4 mb-4"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)' }}
            >
              <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--forge-muted)' }}>Performance par session</p>
              <div className="grid grid-cols-2 gap-2">
                {sessionStats.map((s, i) => (
                  <div
                    key={s.name}
                    className="rounded-xl p-3"
                    style={{
                      background: i === 0 ? 'rgba(247,183,49,0.06)' : 'var(--surface-3)',
                      border: `1px solid ${i === 0 ? 'rgba(247,183,49,0.2)' : 'var(--border-soft)'}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                      {i === 0 && <Trophy size={10} className="text-forge-accent flex-shrink-0" />}
                    </div>
                    <p className="text-sm font-mono font-semibold" style={{ color: s.profit >= 0 ? '#2EA043' : '#F85149' }}>
                      {s.profit >= 0 ? '+' : ''}{s.profit}R
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--forge-muted)' }}>{s.wr}% · {s.total} trades</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Coach IA ── */}
          <button
            onClick={() => setShowAI(true)}
            className="w-full rounded-2xl p-4 mb-4 flex items-center gap-3 text-left transition-all active:scale-[0.99]"
            style={{
              background: 'rgba(247,183,49,0.05)',
              border: '1px solid rgba(247,183,49,0.18)',
              boxShadow: '0 0 20px rgba(247,183,49,0.03)',
            }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(247,183,49,0.12)' }}>
              <Sparkles size={18} className="text-forge-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-forge-accent">Analyse IA du mois</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--forge-muted)' }}>
                {stats.winRate}% win rate · {stats.total} trades · {stats.profit >= 0 ? '+' : ''}{stats.profit}R
              </p>
            </div>
            <ChevronRight size={15} style={{ color: 'var(--forge-muted)' }} />
          </button>

          {/* ── Feedback textuel ── */}
          {feedback && (
            <div
              className="rounded-2xl p-4 mb-4"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)' }}
            >
              <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--forge-muted)' }}>Conclusions</p>
              <div className="space-y-2">
                {feedback.split('\n').map((line, i) => {
                  const isGood = line.startsWith('✅')
                  const isWarn = line.startsWith('⚠️')
                  const isBad  = line.startsWith('❌')
                  const color  = isGood ? '#2EA043' : isWarn ? '#F7B731' : isBad ? '#F85149' : 'var(--forge-muted)'
                  const clean  = line.replace(/^[✅⚠️❌]\s*/, '')
                  const dot    = isGood ? '✓' : isWarn ? '!' : isBad ? '✗' : '·'
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl"
                      style={{ background: `${color}0D`, border: `1px solid ${color}20` }}
                    >
                      <span
                        className="text-xs font-bold flex-shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: `${color}20`, color }}
                      >
                        {dot}
                      </span>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{clean}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {showAI && <AIAssistant trade={aiContext} onClose={() => setShowAI(false)} />}
    </div>
  )
}