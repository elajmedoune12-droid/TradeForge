import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Info, ChevronRight, BarChart2, Bell, BellOff, Sun, Moon, SunMoon, SlidersHorizontal } from 'lucide-react'
import { signOut } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import { PageHeader } from '../components/PageHeader'
import { useTheme } from '../hooks/useTheme'

export default function Settings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [beMode, setBeMode] = useState(() => localStorage.getItem('winrate_be_mode') || 'neutral')
  const { permission, subscribed, loading: notifLoading, subscribe, unsubscribe } = useNotifications()
  const { mode, theme, setThemeMode, isDark, isAuto } = useTheme()

  useEffect(() => {
    localStorage.setItem('winrate_be_mode', beMode)
    window.dispatchEvent(new Event('winrate_setting_changed'))
  }, [beMode])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await signOut()
      navigate('/login')
    } catch (e) {
      console.error('Erreur déconnexion', e)
      setLoggingOut(false)
    }
  }

  const meta        = user?.user_metadata || {}
  const avatarUrl   = meta.avatar_url || null
  const username    = meta.username || null
  const displayName = username || user?.email?.split('@')[0] || 'Trader'

  const notifSupported = 'serviceWorker' in navigator && 'PushManager' in window

  // Icône active selon mode courant
  const ActiveIcon = mode === 'auto' ? SunMoon : isDark ? Moon : Sun

  const THEME_OPTIONS = [
    { value: 'dark',  label: 'Sombre',     icon: Moon    },
    { value: 'light', label: 'Clair',      icon: Sun     },
    { value: 'auto',  label: 'Automatique', icon: SunMoon },
  ]

  return (
    <div className="page">
      <PageHeader title="Réglages" subtitle="Préférences, notifications & compte" icon={SlidersHorizontal} />

      {/* Profile card */}
      <div
        className="card mb-4 cursor-pointer active:scale-[0.99] transition-all"
        onClick={() => navigate('/app/profile')}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-medium)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = ''}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(247,183,49,0.15)', border: '2px solid rgba(247,183,49,0.3)' }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-forge-accent">
                {displayName[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
            {username && <p className="text-xs truncate" style={{ color: 'var(--forge-muted)' }}>@{username}</p>}
            <p className="text-xs truncate" style={{ color: 'var(--forge-muted)' }}>{user?.email}</p>
          </div>
          <ChevronRight size={15} className="flex-shrink-0" style={{ color: 'var(--forge-muted)' }} />
        </div>
      </div>

      {/* Apparence */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-3">
          <ActiveIcon size={14} className="text-forge-accent" />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Apparence</p>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--forge-muted)' }}>
          Choisis le thème visuel de TradeForge.
          {isAuto && (
            <span className="ml-1">
              (actuellement <span className="text-forge-accent font-medium">{isDark ? 'sombre' : 'clair'}</span> · jour 7h–20h)
            </span>
          )}
        </p>
        <div className="flex gap-2">
          {THEME_OPTIONS.map(opt => {
            const Icon   = opt.icon
            const active = mode === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setThemeMode(opt.value)}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-medium border transition-all active:scale-95"
                style={active
                  ? { background: 'rgba(247,183,49,0.15)', color: '#F7B731', borderColor: 'rgba(247,183,49,0.4)' }
                  : { background: 'var(--surface-4)', color: 'var(--forge-muted)', borderColor: 'var(--border-soft)' }
                }
              >
                <Icon size={14} />
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Notifications */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={14} className="text-forge-accent" />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Notifications Push</p>
        </div>

        {!notifSupported ? (
          <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>
            Non supporté sur ce navigateur. Utilise Safari sur iPhone (iOS 16.4+) ou Chrome.
          </p>
        ) : permission === 'denied' ? (
          <p className="text-xs text-forge-red">
            Notifications bloquées. Autorise-les dans les réglages de ton navigateur.
          </p>
        ) : (
          <>
            <p className="text-xs mb-3" style={{ color: 'var(--forge-muted)' }}>
              {subscribed
                ? 'Tu recevras des rappels pour journaliser tes trades.'
                : 'Active les notifications pour recevoir des rappels trading.'}
            </p>
            <button
              onClick={subscribed ? unsubscribe : subscribe}
              disabled={notifLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={subscribed
                ? { background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', color: '#F85149' }
                : { background: 'rgba(247,183,49,0.1)', border: '1px solid rgba(247,183,49,0.3)', color: '#F7B731' }
              }
            >
              {notifLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : subscribed ? (
                <><BellOff size={15} /> Désactiver les notifications</>
              ) : (
                <><Bell size={15} /> Activer les notifications</>
              )}
            </button>
          </>
        )}
      </div>

      {/* Calcul Win Rate */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 size={14} className="text-forge-accent" />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Calcul du Win Rate</p>
        </div>
        <p className="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>Compter les BE comme</p>
        <div className="flex gap-2">
          {[
            { value: 'loss',    label: 'Perte'    },
            { value: 'neutral', label: 'Neutre'   },
            { value: 'win',     label: 'Victoire' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setBeMode(opt.value)}
              className="flex-1 py-2 rounded-xl text-xs font-medium border transition-all active:scale-95"
              style={beMode === opt.value
                ? { background: 'rgba(247,183,49,0.15)', color: '#F7B731', borderColor: 'rgba(247,183,49,0.4)' }
                : { background: 'var(--surface-4)', color: 'var(--forge-muted)', borderColor: 'var(--border-soft)' }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] mt-2" style={{ color: 'var(--forge-muted)' }}>
          {beMode === 'win'
            ? 'Formule : (TP + BE) / (TP + SL + BE)'
            : beMode === 'loss'
            ? 'Formule : TP / (TP + SL + BE) — BE = perte'
            : 'Formule : TP / (TP + SL) — BE exclu'}
          {' '}— Missed toujours exclus.
        </p>
      </div>

      {/* Supabase config */}
      <div className="card mb-4 border-forge-accent/20">
        <div className="flex gap-3">
          <Info size={16} className="text-forge-accent flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-forge-accent mb-1">Configuration Supabase</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--forge-muted)' }}>
              Configurez votre fichier <code className="text-forge-accent">.env</code> avec vos clés Supabase.
              Consultez le README pour les instructions.
            </p>
          </div>
        </div>
      </div>

      {/* App info */}
      <div className="card mb-6">
        <p className="section-title">Application</p>
        <div className="space-y-3">
          {[
            { label: 'Version',  value: '2.1.0',            mono: true },
            { label: 'Stack',    value: 'React + Supabase',  mono: true, small: true },
            { label: 'IA Coach', value: 'Groq / Llama 3.3',  mono: true, small: true },
          ].map(({ label, value, mono, small }) => (
            <div key={label} className="flex justify-between text-sm">
              <span style={{ color: 'var(--forge-muted)' }}>{label}</span>
              <span className={`${mono ? 'font-mono' : ''} ${small ? 'text-xs' : ''}`} style={{ color: 'var(--text-primary)' }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-forge-red/30 text-forge-red transition-colors text-sm font-medium"
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,81,73,0.08)'}
        onMouseLeave={e => e.currentTarget.style.background = ''}
      >
        <LogOut size={16} />
        {loggingOut ? 'Déconnexion...' : 'Se déconnecter'}
      </button>
    </div>
  )
}