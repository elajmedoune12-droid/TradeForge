import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Info, ChevronRight, BarChart2, Bell, BellOff } from 'lucide-react'
import { signOut } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'

export default function Settings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [beMode, setBeMode] = useState(() => localStorage.getItem('winrate_be_mode') || 'neutral')
  const { permission, subscribed, loading: notifLoading, subscribe, unsubscribe } = useNotifications()

  useEffect(() => {
    localStorage.setItem('winrate_be_mode', beMode)
    window.dispatchEvent(new Event('winrate_setting_changed'))
  }, [beMode])

  const handleLogout = async () => {
    setLoggingOut(true)
    await signOut()
    navigate('/login')
  }

  const meta        = user?.user_metadata || {}
  const avatarUrl   = meta.avatar_url || null
  const username    = meta.username || null
  const displayName = username || user?.email?.split('@')[0] || 'Trader'

  const notifSupported = 'serviceWorker' in navigator && 'PushManager' in window

  return (
    <div className="page">
      <h1 className="text-lg font-medium mb-6">Réglages</h1>

      {/* Profile card */}
      <div
        className="card mb-4 cursor-pointer hover:border-forge-muted/30 active:scale-[0.99] transition-all"
        onClick={() => navigate('/profile')}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(247,183,49,0.15)', border: '2px solid rgba(247,183,49,0.3)' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-forge-accent">
                {displayName[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            {username && <p className="text-xs text-forge-muted truncate">@{username}</p>}
            <p className="text-xs text-forge-muted truncate">{user?.email}</p>
          </div>
          <ChevronRight size={15} className="text-forge-muted flex-shrink-0" />
        </div>
      </div>

      {/* Notifications */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={14} className="text-forge-accent" />
          <p className="text-sm font-medium">Notifications Push</p>
        </div>

        {!notifSupported ? (
          <p className="text-xs text-forge-muted">
            Non supporté sur ce navigateur. Utilise Safari sur iPhone (iOS 16.4+) ou Chrome.
          </p>
        ) : permission === 'denied' ? (
          <p className="text-xs text-forge-red">
            Notifications bloquées. Autorise-les dans les réglages de ton navigateur.
          </p>
        ) : (
          <>
            <p className="text-xs text-forge-muted mb-3">
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
          <p className="text-sm font-medium">Calcul du Win Rate</p>
        </div>
        <p className="text-sm text-white mb-2">Compter les BE comme</p>
        <div className="flex gap-2">
          {[
            { value: 'loss', label: 'Perte' },
            { value: 'neutral', label: 'Neutre' },
            { value: 'win', label: 'Victoire' },
          ].map(opt => (
            <button key={opt.value} onClick={() => setBeMode(opt.value)}
              className="flex-1 py-2 rounded-xl text-xs font-medium border transition-all"
              style={beMode === opt.value
                ? { background: 'rgba(247,183,49,0.15)', color: '#F7B731', borderColor: 'rgba(247,183,49,0.4)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#8B949E', borderColor: 'rgba(255,255,255,0.08)' }
              }>
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-forge-muted mt-2">
          {beMode === 'win' ? 'Formule : (TP + BE) / (TP + SL + BE)'
            : beMode === 'loss' ? 'Formule : TP / (TP + SL + BE) — BE = perte'
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
            <p className="text-xs text-forge-muted leading-relaxed">
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
          <div className="flex justify-between text-sm">
            <span className="text-forge-muted">Version</span>
            <span className="font-mono">2.1.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-forge-muted">Stack</span>
            <span className="font-mono text-xs">React + Supabase</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-forge-muted">IA Coach</span>
            <span className="font-mono text-xs">Groq / Llama 3.3</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-forge-red/30 text-forge-red hover:bg-forge-red/10 transition-colors text-sm font-medium"
      >
        <LogOut size={16} />
        {loggingOut ? 'Déconnexion...' : 'Se déconnecter'}
      </button>
    </div>
  )
}