import { useNavigate } from 'react-router-dom'
import { Brain, TrendingUp, TrendingDown, Target, Zap, BarChart2 } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid
} from 'recharts'
import { useTrades } from '../hooks/useTrades'
import {
  calcWinRate, calcAvgRR, calcTotalProfit, calcDisciplineScore,
  getTopErrors, detectPatterns, fmtDate
} from '../utils'
import { format, subDays } from 'date-fns'

// ── Custom tooltip ──────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div className="rounded-xl px-3 py-2 text-xs"
      style={{ background: '#161B22', border: '1px solid rgba(247,183,49,0.25)', backdropFilter: 'blur(12px)' }}>
      <p className="text-forge-muted mb-0.5">{label}</p>
      <p className="font-mono font-semibold" style={{ color: val >= 0 ? '#2EA043' : '#F85149' }}>
        {val >= 0 ? '+' : ''}{val.toFixed(2)}R
      </p>
    </div>
  )
}

const ResultBadge = ({ result }) => {
  const map = { tp: 'badge-tp', sl: 'badge-sl', be: 'badge-be', missed: 'badge-missed' }
  const labels = { tp: 'TP', sl: 'SL', be: 'BE', missed: 'Missed' }
  return <span className={map[result] || 'badge-missed'}>{labels[result] || result}</span>
}

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

export default function Dashboard() {
  const { trades, loading } = useTrades()
  const navigate = useNavigate()

  if (loading) return (
    <div className="page flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-forge-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const winRate   = calcWinRate(trades)
  const avgRR     = calcAvgRR(trades)
  const profit    = calcTotalProfit(trades)
  const discScore = calcDisciplineScore(trades)
  const topErrors = getTopErrors(trades)
  const patterns  = detectPatterns(trades)

  // Equity curve 30j
  const last30 = [...Array(30)].map((_, i) => {
    const d = subDays(new Date(), 29 - i)
    const label = format(d, 'dd/MM')
    const dayTrades = trades.filter(t => t.date === format(d, 'yyyy-MM-dd'))
    const pnl = dayTrades.reduce((acc, t) => {
      if (t.result === 'tp') return acc + (t.rr_won || 0)
      if (t.result === 'sl') return acc - 1
      return acc
    }, 0)
    return { label, pnl }
  })

  let cum = 0
  const equityData = last30.map(d => {
    cum += d.pnl
    return { label: d.label, equity: +cum.toFixed(2) }
  })

  const minEquity  = Math.min(...equityData.map(d => d.equity))
  const maxEquity  = Math.max(...equityData.map(d => d.equity))
  const lastEquity = equityData[equityData.length - 1]?.equity || 0
  const isUp       = lastEquity >= 0

  const tp     = trades.filter(t => t.result === 'tp').length
  const sl     = trades.filter(t => t.result === 'sl').length
  const be     = trades.filter(t => t.result === 'be').length
  const missed = trades.filter(t => t.result === 'missed').length
  const total  = trades.length

  const recentTrades = trades.slice(0, 5)

  return (
    <div className="page animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-xs text-forge-muted">
            {total} trade{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-forge-muted">
          <span className="w-2 h-2 rounded-full bg-forge-green inline-block" style={{ boxShadow: '0 0 6px #2EA043' }} />
          En ligne
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Win Rate"
          value={`${winRate}%`}
          sub={`${tp} TP / ${sl} SL`}
          color={winRate >= 50 ? 'text-forge-green' : 'text-forge-red'}
          icon={Target}
          glow={winRate >= 50 ? '#2EA043' : '#F85149'}
        />
        <StatCard
          label="Profit total"
          value={profit >= 0 ? `+${profit.toFixed(1)}R` : `${profit.toFixed(1)}R`}
          sub="cumul toutes sessions"
          color={profit >= 0 ? 'text-forge-green' : 'text-forge-red'}
          icon={profit >= 0 ? TrendingUp : TrendingDown}
          glow={profit >= 0 ? '#2EA043' : '#F85149'}
        />
        <StatCard
          label="RR Moyen"
          value={avgRR > 0 ? `${avgRR}R` : '—'}
          sub="sur trades gagnants"
          icon={BarChart2}
        />
        <StatCard
          label="Discipline"
          value={`${discScore}/10`}
          sub={discScore >= 7 ? 'Solide 💪' : discScore >= 5 ? 'À améliorer' : 'Attention ⚠️'}
          color={discScore >= 7 ? 'text-forge-green' : discScore >= 5 ? 'text-forge-accent' : 'text-forge-red'}
          icon={Zap}
          glow={discScore >= 7 ? '#2EA043' : discScore >= 5 ? '#F7B731' : '#F85149'}
        />
      </div>

      {/* Equity chart */}
      {trades.length > 0 && (
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
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#8B949E', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fill: '#8B949E', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={[Math.floor(minEquity) - 1, Math.ceil(maxEquity) + 1]}
                tickFormatter={v => `${v}R`}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="equity"
                stroke={isUp ? '#2EA043' : '#F85149'}
                strokeWidth={2}
                fill={isUp ? 'url(#eqUp)' : 'url(#eqDown)'}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: isUp ? '#2EA043' : '#F85149' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Distribution résultats */}
      {total > 0 && (
        <div className="card mb-5">
          <p className="section-title">Distribution des résultats</p>
          <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-3">
            {tp > 0     && <div style={{ flex: tp,     background: '#2EA043' }} />}
            {sl > 0     && <div style={{ flex: sl,     background: '#F85149' }} />}
            {be > 0     && <div style={{ flex: be,     background: '#58a6ff' }} />}
            {missed > 0 && <div style={{ flex: missed, background: '#8B949E' }} />}
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'TP',     count: tp,     color: '#2EA043' },
              { label: 'SL',     count: sl,     color: '#F85149' },
              { label: 'BE',     count: be,     color: '#58a6ff' },
              { label: 'Missed', count: missed, color: '#8B949E' },
            ].map(({ label, count, color }) => (
              <div key={label}>
                <p className="text-xl font-mono font-semibold" style={{ color }}>{count}</p>
                <p className="text-[10px] text-forge-muted">{label}</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {total ? Math.round((count / total) * 100) : 0}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IA Insights + Top erreurs */}
      <div className={`mb-5 ${patterns.length > 0 && topErrors.length > 0 ? 'lg:grid lg:grid-cols-2 lg:gap-4' : ''}`}>
        {patterns.length > 0 && (
          <div className="mb-5">
            <p className="section-title flex items-center gap-1.5">
              <Brain size={12} /> IA Insights
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
            <p className="section-title">Top erreurs psychologiques</p>
            <div className="card space-y-3">
              {topErrors.map(({ label, count }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-forge-muted">{label}</span>
                    <span className="font-mono text-xs text-forge-muted">{count}×</span>
                  </div>
                  <div className="h-1.5 bg-forge-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((count / total) * 100 * 3, 100)}%`,
                        background: 'linear-gradient(90deg, rgba(247,183,49,0.8), rgba(247,183,49,0.4))',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Trades récents */}
      {recentTrades.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="section-title mb-0">Trades récents</p>
            <button onClick={() => navigate('/trades')} className="text-xs text-forge-accent hover:underline">
              Voir tout
            </button>
          </div>
          <div className="space-y-2">
            {recentTrades.map(t => (
              <div
                key={t.id}
                onClick={() => navigate(`/trades/${t.id}`)}
                className="card-hover flex items-center gap-3 active:scale-[0.99] cursor-pointer"
              >
                <div className="w-1.5 h-9 rounded-full flex-shrink-0" style={{
                  background: t.result === 'tp' ? '#2EA043' : t.result === 'sl' ? '#F85149' : t.result === 'be' ? '#58a6ff' : '#8B949E',
                  boxShadow: t.result === 'tp' ? '0 0 8px rgba(46,160,67,0.5)' : t.result === 'sl' ? '0 0 8px rgba(248,81,73,0.5)' : 'none',
                }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{t.market}</p>
                    <span className={`text-xs font-mono ${t.type === 'buy' ? 'text-forge-green' : 'text-forge-red'}`}>
                      {t.type?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-forge-muted">{fmtDate(t.date)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <ResultBadge result={t.result} />
                  {t.rr_won != null && (
                    <p className="text-xs text-forge-muted mt-0.5 font-mono">{t.rr_won}R</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {total === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(247,183,49,0.1)', border: '1px solid rgba(247,183,49,0.2)' }}>
            <BarChart2 size={28} className="text-forge-accent" />
          </div>
          <p className="text-forge-muted text-sm mb-1">Aucun trade pour l'instant.</p>
          <p className="text-forge-muted/50 text-xs">Commencez par journaliser votre première position.</p>
        </div>
      )}
    </div>
  )
}