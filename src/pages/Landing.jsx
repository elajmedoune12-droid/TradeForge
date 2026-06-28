import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sun, Moon, BarChart2, TrendingUp, TrendingDown,
  Shield, Brain, Calendar, BookMarked, ChevronRight,
  Target, Zap, CheckCircle2, ArrowRight,
} from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

/* ─── Mock data : copie fidèle des structures Dashboard ─── */
const MOCK_EQUITY = [
  { label: '01/06', equity: 0    },
  { label: '03/06', equity: -0.8 },
  { label: '05/06', equity: 0.4  },
  { label: '07/06', equity: 1.9  },
  { label: '09/06', equity: 1.2  },
  { label: '11/06', equity: 3.1  },
  { label: '13/06', equity: 2.4  },
  { label: '15/06', equity: 4.7  },
  { label: '17/06', equity: 3.8  },
  { label: '19/06', equity: 5.6  },
  { label: '21/06', equity: 6.2  },
  { label: '23/06', equity: 5.1  },
  { label: '25/06', equity: 7.4  },
  { label: '27/06', equity: 8.1  },
]

const MOCK_TRADES = [
  { market: 'EUR/USD', type: 'buy',  result: 'tp', rr: '+2.4R', color: '#2EA043' },
  { market: 'GBP/JPY', type: 'sell', result: 'sl', rr: '-1R',   color: '#F85149' },
  { market: 'NAS100',  type: 'buy',  result: 'tp', rr: '+3.1R', color: '#2EA043' },
  { market: 'XAU/USD', type: 'sell', result: 'be', rr: '0R',    color: '#58a6ff' },
]

const MOCK_CALENDAR = [
  // [day, profit, trades]
  [1,  null,  0], [2, null, 0], [3, 1.2, 2], [4, null, 0], [5, -0.8, 1], [6, null, 0], [7, null, 0],
  [8,  2.4,   1], [9, null, 0], [10, 0,  1], [11, 3.1, 2], [12, null,0], [13, null, 0], [14, null, 0],
  [15, -1,    1], [16, 1.5, 1], [17, null,0], [18, 2.8,2], [19, null,0], [20, null, 0], [21, null, 0],
  [22, 4.2,   2], [23, null,0], [24, -0.6,1], [25, 0,  1], [26, 1.9,2], [27, null, 0], [28, null, 0],
]

const INSIGHTS = [
  { type: 'success', title: '🔥 Meilleur setup : BOS + FVG',     desc: '74% win rate sur cette combinaison (17 trades).' },
  { type: 'warning', title: '⚠️ Attention aux trades 14h–16h',  desc: 'RR moyen de 0.6 pendant cette fenêtre horaire.' },
  { type: 'success', title: '📈 Sessions London très profitables', desc: '+5.2R sur les 10 derniers trades London.' },
]

const FEATURES = [
  { icon: BarChart2,   label: 'Dashboard',  desc: 'KPIs, courbe de performance et calendrier mensuel.' },
  { icon: BookMarked,  label: 'Hindsights', desc: 'Analyse post-trade structurée pour chaque position.' },
  { icon: Brain,       label: 'IA Coach',   desc: 'Détecte tes patterns gagnants et tes erreurs récurrentes.' },
  { icon: TrendingUp,  label: 'Mensuel',    desc: 'Vue mois par mois de ta progression et tes stats.' },
  { icon: Shield,      label: 'Discipline', desc: 'Règles de trading personnalisées avec score de respect.' },
  { icon: Calendar,    label: 'Forecast',   desc: 'Prépare ta semaine et pose tes biais directionnels.' },
]

/* ─── Mini sparkline SVG (pas de recharts pour éviter l'import) ─ */
function Sparkline({ data, color, height = 64, width = 280 }) {
  const min = Math.min(...data.map(d => d.equity))
  const max = Math.max(...data.map(d => d.equity))
  const range = max - min || 1
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((d.equity - min) / range) * (height - 8) - 4
    return `${x},${y}`
  }).join(' ')

  const areaPath = `M${data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((d.equity - min) / range) * (height - 8) - 4
    return `${x},${y}`
  }).join(' L')} L${width},${height} L0,${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: height, overflow: 'visible' }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* last dot */}
      {(() => {
        const last = data[data.length - 1]
        const x = width
        const y = height - ((last.equity - min) / range) * (height - 8) - 4
        return <circle cx={x} cy={y} r="4" fill={color} />
      })()}
    </svg>
  )
}

/* ─── Mini calendar preview ────────────────────────────────── */
function CalendarPreview({ isDark }) {
  const surface = isDark ? 'rgba(22,27,34,0.9)' : 'rgba(255,255,255,0.95)'
  const border  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(20,16,8,0.09)'

  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      background: surface, border: `1px solid ${border}`,
      padding: '14px 14px 10px',
    }}>
      {/* mini header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>Juin 2026</span>
        <div style={{ display: 'flex', gap: 12, fontSize: 10 }}>
          {[
            { label: '18 trades', color: 'var(--text-tertiary)' },
            { label: '+8.1R', color: '#2EA043' },
          ].map(s => (
            <span key={s.label} style={{ color: s.color, fontWeight: 600 }}>{s.label}</span>
          ))}
        </div>
      </div>

      {/* days header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 3 }}>
        {['D','L','M','M','J','V','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 8, fontWeight: 700,
            color: i === 0 ? 'rgba(247,183,49,0.8)' : 'rgba(139,148,158,0.45)',
            paddingBottom: 2 }}>{d}</div>
        ))}
      </div>

      {/* cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
        {/* blank = Sunday offset */}
        <div style={{ borderRadius: 6, aspectRatio: '1', background: 'transparent' }} />
        {MOCK_CALENDAR.map(([day, profit, count]) => {
          const isPos   = profit !== null && profit > 0
          const isNeg   = profit !== null && profit < 0
          const isBe    = profit !== null && profit === 0 && count > 0
          const isEmpty = profit === null

          const bg = isPos  ? 'rgba(46,160,67,0.2)'
                   : isNeg  ? 'rgba(248,81,73,0.2)'
                   : isBe   ? 'rgba(88,166,255,0.15)'
                   : 'var(--surface-2)'
          const borderColor = isPos ? 'rgba(46,160,67,0.35)'
                            : isNeg ? 'rgba(248,81,73,0.35)'
                            : isBe  ? 'rgba(88,166,255,0.25)'
                            : 'var(--surface-3)'
          const textColor = isPos ? '#3fb950' : isNeg ? '#ff6b6b' : isBe ? '#79c0ff' : 'rgba(139,148,158,0.3)'

          return (
            <div key={day} style={{
              borderRadius: 6, aspectRatio: '1',
              background: bg, border: `1px solid ${borderColor}`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              <span style={{ fontSize: 7, fontWeight: 700, color: textColor, lineHeight: 1 }}>{day}</span>
              {!isEmpty && profit !== null && (
                <span style={{ fontSize: 6, fontWeight: 800, color: textColor, lineHeight: 1, marginTop: 1 }}>
                  {profit > 0 ? '+' : ''}{profit}R
                </span>
              )}
              {!isEmpty && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, borderRadius: '0 0 6px 6px',
                  background: isPos ? '#2EA043' : isNeg ? '#F85149' : '#58a6ff',
                  opacity: 0.7,
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Animated counter ─────────────────────────────────────── */
function Counter({ target, suffix = '', duration = 1800 }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1)
          const ease = 1 - Math.pow(1 - p, 3)
          setVal(Math.round(ease * target))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  return <span ref={ref}>{val}{suffix}</span>
}

/* ─── Main component ───────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()

  const goSignup = () => navigate('/login?mode=signup')
  const goLogin  = () => navigate('/login')

  const card = {
    background: isDark ? 'rgba(22,27,34,0.8)' : 'rgba(255,255,255,0.9)',
    border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(20,16,8,0.09)',
    backdropFilter: 'blur(12px)',
  }

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ══ NAV ══════════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: isDark ? 'rgba(7,10,15,0.92)' : 'rgba(247,245,240,0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(20,16,8,0.08)',
        transition: 'background 0.25s',
        /* La nav englobe la safe area + la barre de 56px */
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        {/* Barre de navigation réelle sous la safe area */}
        <div style={{
          height: 56,
          display: 'flex', alignItems: 'center',
          padding: '0 clamp(1rem,5vw,2.5rem)',
        }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg,#F7B731,#e0a020)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart2 size={14} color="#070A0F" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>
            <span style={{ color: '#F7B731' }}>TRADE</span>
            <span style={{ color: 'var(--text-primary)' }}>FORGE</span>
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Toggle thème */}
          <button onClick={toggleTheme} aria-label="Thème"
            style={{
              width: 34, height: 34, borderRadius: 9, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(20,16,8,0.12)',
              color: 'var(--forge-muted)', transition: 'all 0.2s',
            }}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Connexion — desktop seulement */}
          <button onClick={goLogin}
            className="hidden sm:block"
            style={{
              height: 34, padding: '0 14px', borderRadius: 9, cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: 'transparent', color: 'var(--text-secondary)',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(20,16,8,0.12)',
              transition: 'all 0.2s',
            }}>
            Connexion
          </button>

          <button onClick={goSignup}
            style={{
              height: 34, padding: '0 16px', borderRadius: 9, cursor: 'pointer',
              fontSize: 13, fontWeight: 700,
              background: '#F7B731', color: '#070A0F', border: 'none',
              boxShadow: '0 0 16px rgba(247,183,49,0.35)',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.88'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}>
            Commencer
          </button>
        </div>
        </div>{/* end inner row */}
      </nav>

      {/* ══ HERO ═════════════════════════════════════════════ */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        paddingTop: 'calc(env(safe-area-inset-top) + 56px + clamp(2.5rem,6vw,4rem))',
        paddingLeft: 'clamp(1rem,5vw,2.5rem)',
        paddingRight: 'clamp(1rem,5vw,2.5rem)',
        paddingBottom: 'clamp(2rem,5vw,4rem)',
        textAlign: 'center',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', borderRadius: 999, marginBottom: 28,
          background: 'rgba(247,183,49,0.1)', border: '1px solid rgba(247,183,49,0.25)',
          fontSize: 11, fontWeight: 700, color: '#F7B731', letterSpacing: '0.04em',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F7B731', display: 'inline-block' }} />
          Journal de trading avancé
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(2.2rem,6.5vw,4.8rem)',
          fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.035em',
          color: 'var(--text-primary)',
          maxWidth: 860, marginBottom: 20,
        }}>
          Comprends{' '}
          <span style={{ color: '#F7B731', textShadow: isDark ? '0 0 48px rgba(247,183,49,0.25)' : 'none' }}>
            pourquoi
          </span>{' '}
          tu gagnes — ou tu perds.
        </h1>

        <p style={{
          fontSize: 'clamp(1rem,2vw,1.15rem)', lineHeight: 1.7,
          color: 'var(--text-tertiary)', maxWidth: 500, marginBottom: 40,
        }}>
          TradeForge journalise chaque trade, détecte tes patterns avec l'IA et te donne les chiffres qui comptent vraiment.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 64 }}>
          <button onClick={goSignup}
            style={{
              height: 48, padding: '0 28px', borderRadius: 13,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              background: '#F7B731', color: '#070A0F', border: 'none',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 0 32px rgba(247,183,49,0.4)', transition: 'all 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.boxShadow = '0 0 48px rgba(247,183,49,0.6)'}
            onMouseOut={e => e.currentTarget.style.boxShadow = '0 0 32px rgba(247,183,49,0.4)'}>
            Créer mon compte gratuitement <ArrowRight size={15} />
          </button>
          <button onClick={goLogin}
            style={{
              height: 48, padding: '0 22px', borderRadius: 13,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              background: 'transparent', color: 'var(--text-secondary)',
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(20,16,8,0.14)',
            }}>
            J'ai déjà un compte
          </button>
        </div>

        {/* ─── App preview : Dashboard card ─── */}
        <div style={{
          width: 'min(720px, 92vw)',
          borderRadius: 20,
          ...card,
          boxShadow: isDark ? '0 32px 96px rgba(0,0,0,0.6)' : '0 32px 72px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}>
          {/* Fake window bar */}
          <div style={{
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6,
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(20,16,8,0.07)',
            background: isDark ? 'rgba(12,16,24,0.6)' : 'rgba(248,246,242,0.8)',
          }}>
            {['#F85149','#F7B731','#2EA043'].map(c => (
              <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.9 }} />
            ))}
            <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
              tradeforge.app/dashboard
            </span>
          </div>

          <div style={{ padding: '20px 20px 16px' }}>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Win Rate',      value: '68%',    sub: '17 TP / 8 SL',         color: '#2EA043' },
                { label: 'Profit total',  value: '+8.1R',  sub: 'cumul 30 jours',         color: '#2EA043' },
                { label: 'RR Moyen',      value: '2.3R',   sub: 'trades gagnants',        color: 'var(--text-primary)' },
                { label: 'Discipline',    value: '8.2/10', sub: 'Solide 💪',              color: '#2EA043' },
              ].map(s => (
                <div key={s.label} style={{
                  borderRadius: 12, padding: '10px 12px',
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(20,16,8,0.03)',
                  border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(20,16,8,0.07)',
                }}>
                  <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: 'var(--forge-muted)', marginBottom: 4 }}>{s.label}</p>
                  <p style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace',
                    color: s.color, lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 3 }}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Equity sparkline */}
            <div style={{
              borderRadius: 14, padding: '14px 14px 8px',
              background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(20,16,8,0.025)',
              border: 'rgba(46,160,67,0.2) 1px solid',
              marginBottom: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--forge-muted)' }}>
                    Courbe de performance · 30j
                  </p>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: '#2EA043' }}>+8.1R</span>
              </div>
              <Sparkline data={MOCK_EQUITY} color="#2EA043" height={56} />
            </div>

            {/* Trade list preview (3 rows) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {MOCK_TRADES.slice(0, 3).map((t, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 10,
                  background: isDark ? `${t.color}0A` : `${t.color}08`,
                  border: `1px solid ${t.color}22`,
                }}>
                  <div style={{ width: 3, height: 28, borderRadius: 2, background: t.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{t.market}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, marginLeft: 8,
                      color: t.type === 'buy' ? '#2EA043' : '#F85149' }}>
                      {t.type.toUpperCase()}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: t.color }}>{t.rr}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                    background: `${t.color}20`, color: t.color, border: `1px solid ${t.color}30` }}>
                    {t.result.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ STATS BAND ═══════════════════════════════════════ */}
      <section style={{
        padding: 'clamp(2rem,5vw,3.5rem) clamp(1rem,5vw,2.5rem)',
        borderTop: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(20,16,8,0.07)',
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(20,16,8,0.07)',
      }}>
        <div style={{
          maxWidth: 800, margin: '0 auto',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 'clamp(2rem,8vw,6rem)', flexWrap: 'wrap',
        }}>
          {[
            { target: 68, suffix: '%',    label: 'win rate moyen constaté' },
            { target: 2,  suffix: ' min', label: 'pour logger un trade'    },
            { target: 6,  suffix: '+',    label: 'modules intégrés'        },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900,
                fontFamily: 'JetBrains Mono, monospace',
                color: '#F7B731', lineHeight: 1,
                textShadow: isDark ? '0 0 32px rgba(247,183,49,0.3)' : 'none',
              }}>
                <Counter target={s.target} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ FEATURES + CALENDAR PREVIEW ══════════════════════ */}
      <section style={{ padding: 'clamp(3rem,8vw,6rem) clamp(1rem,5vw,2.5rem)', maxWidth: 1080, margin: '0 auto' }}>
        {/* Section title */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em',
            color: '#F7B731', fontWeight: 700, marginBottom: 10 }}>Modules</p>
          <h2 style={{
            fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800,
            color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1.15,
          }}>
            Tout est dans le même outil.
          </h2>
        </div>

        {/* 2-col layout: features left, calendar right */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,440px),1fr))',
          gap: 32, alignItems: 'start',
        }}>
          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
                <div key={f.label} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 14,
                  ...card,
                  transition: 'transform 0.18s',
                }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateX(4px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateX(0)'}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(247,183,49,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={16} color="#F7B731" />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{f.label}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{f.desc}</p>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--forge-muted)', marginLeft: 'auto', flexShrink: 0 }} />
                </div>
              )
            })}
          </div>

          {/* Calendar preview + insights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <CalendarPreview isDark={isDark} />

            {/* IA Insights preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
                color: 'var(--forge-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Brain size={11} color="#F7B731" /> IA Insights
              </p>
              {INSIGHTS.map((ins, i) => (
                <div key={i} style={{
                  padding: '10px 14px', borderRadius: 12,
                  background: card.background,
                  backdropFilter: card.backdropFilter,
                  borderTop:    isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(20,16,8,0.09)',
                  borderRight:  isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(20,16,8,0.09)',
                  borderBottom: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(20,16,8,0.09)',
                  borderLeft:   `3px solid ${ins.type === 'success' ? '#2EA043' : '#F7B731'}`,
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 2,
                    color: ins.type === 'success' ? '#2EA043' : '#F7B731' }}>{ins.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{ins.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ DISCIPLINE PREVIEW SECTION ═══════════════════════ */}
      <section style={{
        padding: 'clamp(2rem,6vw,4rem) clamp(1rem,5vw,2.5rem)',
        background: isDark ? 'rgba(247,183,49,0.03)' : 'rgba(247,183,49,0.05)',
        borderTop: '1px solid rgba(247,183,49,0.1)',
        borderBottom: '1px solid rgba(247,183,49,0.1)',
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,380px),1fr))',
          gap: 32, alignItems: 'center' }}>
          {/* Text */}
          <div>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em',
              color: '#F7B731', fontWeight: 700, marginBottom: 12 }}>Discipline</p>
            <h2 style={{ fontSize: 'clamp(1.5rem,3.5vw,2.2rem)', fontWeight: 800,
              color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1.2, marginBottom: 16 }}>
              Tes règles.<br />Ton score. Ta progression.
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.7, marginBottom: 20 }}>
              Définis tes règles de trading personnalisées. TradeForge calcule ton score de discipline à chaque trade et te montre exactement où tu dérapes.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Score de discipline calculé automatiquement',
                'Détection des trades hors règles',
                'Suivi du respect du plan semaine par semaine',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={14} color="#2EA043" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Discipline card mock */}
          <div style={{ borderRadius: 16, padding: '20px', ...card,
            boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.4)' : '0 16px 36px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9,
                background: 'rgba(247,183,49,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={15} color="#F7B731" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Mes règles</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px',
                borderRadius: 6, background: 'rgba(46,160,67,0.15)', color: '#2EA043',
                border: '1px solid rgba(46,160,67,0.25)' }}>8.2 / 10</span>
            </div>
            {[
              { rule: 'Ne trader qu\'en session London / NY', ok: true  },
              { rule: 'Attendre 3 confirmations minimum',     ok: true  },
              { rule: 'Stop loss obligatoire avant entrée',   ok: true  },
              { rule: 'Max 3 trades par jour',                ok: false },
              { rule: 'Respecter le plan de trading',         ok: true  },
            ].map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                borderBottom: i < 4 ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(20,16,8,0.06)'}` : 'none',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                  background: r.ok ? '#2EA043' : '#F85149',
                  boxShadow: r.ok ? '0 0 5px rgba(46,160,67,0.6)' : '0 0 5px rgba(248,81,73,0.6)' }} />
                <span style={{ fontSize: 11, color: r.ok ? 'var(--text-secondary)' : 'var(--forge-muted)',
                  flex: 1, lineHeight: 1.4 }}>{r.rule}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 5,
                  background: r.ok ? 'rgba(46,160,67,0.1)' : 'rgba(248,81,73,0.1)',
                  color: r.ok ? '#2EA043' : '#F85149',
                  border: `1px solid ${r.ok ? 'rgba(46,160,67,0.2)' : 'rgba(248,81,73,0.2)'}` }}>
                  {r.ok ? 'OK' : 'RATÉ'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ════════════════════════════════════════ */}
      <section style={{
        padding: 'clamp(3rem,8vw,6rem) clamp(1rem,5vw,2.5rem)',
        maxWidth: 640, margin: '0 auto', textAlign: 'center',
      }}>
        <div style={{
          padding: 'clamp(2rem,5vw,3rem)',
          borderRadius: 24,
          ...card,
          border: '1px solid rgba(247,183,49,0.2)',
          boxShadow: '0 0 60px rgba(247,183,49,0.07)',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 13, margin: '0 auto 18px',
            background: 'linear-gradient(135deg,#F7B731,#e0a020)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart2 size={22} color="#070A0F" strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 800,
            color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 10 }}>
            Prêt à forger ton edge ?
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 28, lineHeight: 1.65 }}>
            Rejoins TradeForge et commence à comprendre vraiment ce qui fonctionne dans ton trading.
          </p>
          <button onClick={goSignup}
            style={{
              width: '100%', maxWidth: 300, height: 48,
              borderRadius: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              background: '#F7B731', color: '#070A0F', border: 'none',
              boxShadow: '0 0 28px rgba(247,183,49,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, margin: '0 auto',
              transition: 'box-shadow 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.boxShadow = '0 0 44px rgba(247,183,49,0.55)'}
            onMouseOut={e => e.currentTarget.style.boxShadow = '0 0 28px rgba(247,183,49,0.35)'}>
            Commencer maintenant <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════ */}
      <footer style={{
        padding: '20px clamp(1rem,5vw,2.5rem)',
        borderTop: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(20,16,8,0.07)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>© 2026 TradeForge. Tous droits réservés.</p>
      </footer>
    </div>
  )
}