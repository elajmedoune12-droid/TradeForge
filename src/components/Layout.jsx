import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import {
  LayoutDashboard, List, TrendingUp, Shield,
  Plus, BarChart2, BookMarked, X, Bell, LogOut, User, SlidersHorizontal,
  Calendar, CheckCheck, Zap, Clock, AlertCircle, Trash2,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTrades } from '../hooks/useTrades'

const navItems = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/trades',          icon: List,            label: 'Trades'     },
  { to: '/hindsights',      icon: BookMarked,      label: 'Hindsights' },
  { to: '/monthly',         icon: TrendingUp,      label: 'Mensuel'    },
  { to: '/rules',           icon: Shield,          label: 'Discipline' },
  { to: '/weekly-forecast', icon: Calendar,        label: 'Forecast'   },
]
const mobileLeft  = navItems.slice(0, 3)
const mobileRight = navItems.slice(3, 6)

// ── Notifications ─────────────────────────────────────────────
function buildNotifications(trades) {
  if (!trades?.length) return []
  const notifs = []
  const today = new Date().toISOString().slice(0, 10)

  const todayTrades = trades.filter(t => t.date === today)
  if (todayTrades.length > 0) {
    const wins = todayTrades.filter(t => t.result === 'tp').length
    notifs.push({
      id: 'today', icon: 'chart', color: '#F7B731',
      title: `${todayTrades.length} trade${todayTrades.length > 1 ? 's' : ''} aujourd'hui`,
      body: `${wins} TP · ${todayTrades.length - wins} autre${todayTrades.length - wins !== 1 ? 's' : ''}`,
    })
  }

  const last5 = trades.slice(0, 5)
  const slStreak = last5.filter(t => t.result === 'sl').length
  if (slStreak >= 3) {
    notifs.push({
      id: 'sl_streak', icon: 'warning', color: '#F85149',
      title: `${slStreak} SL consécutifs`,
      body: 'Prenez une pause et revoyez votre plan de trading.',
    })
  }

  const last10 = trades.slice(0, 10)
  if (last10.length >= 5) {
    const wr = Math.round((last10.filter(t => t.result === 'tp').length / last10.length) * 100)
    if (wr >= 60) {
      notifs.push({
        id: 'wr_good', icon: 'fire', color: '#2EA043',
        title: `🔥 ${wr}% win rate sur 10 trades`,
        body: 'Excellent ! Continuez à respecter votre plan.',
      })
    }
  }

  const recentLowDisc = trades.slice(0, 5).filter(t => t.discipline_score != null && t.discipline_score <= 4)
  if (recentLowDisc.length >= 2) {
    notifs.push({
      id: 'low_disc', icon: 'disc', color: '#F7B731',
      title: 'Discipline en baisse',
      body: `${recentLowDisc.length} trades récents avec score ≤ 4/10.`,
    })
  }

  if (trades.length > 0) {
    const diffDays = Math.floor((new Date() - new Date(trades[0].date)) / (1000 * 60 * 60 * 24))
    if (diffDays >= 3) {
      notifs.push({
        id: 'inactive', icon: 'clock', color: '#8B949E',
        title: `${diffDays} jours sans trade`,
        body: "N'oubliez pas de journaliser vos positions.",
      })
    }
  }

  const noHindsight = trades.slice(0, 10).filter(t => !t.hindsight?.length)
  if (noHindsight.length >= 3) {
    notifs.push({
      id: 'no_hindsight', icon: 'book', color: '#58a6ff',
      title: `${noHindsight.length} trades sans After Trade`,
      body: 'Analysez vos trades pour progresser plus vite.',
    })
  }

  return notifs
}

function NotifIcon({ type, color }) {
  const s = { color, width: 15, height: 15 }
  if (type === 'warning') return <AlertCircle style={s} />
  if (type === 'disc')    return <Zap style={s} />
  if (type === 'clock')   return <Clock style={s} />
  if (type === 'book')    return <BookMarked style={s} />
  return <BarChart2 style={s} />
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ user, profile, size = 'sm', onClick, asDiv = false }) {
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  const txt = size === 'sm' ? 'text-sm' : 'text-base'
  const Tag = asDiv ? 'div' : 'button'
  if (profile?.avatar_url) {
    return (
      <Tag onClick={onClick}
        className={`${dim} rounded-full overflow-hidden flex-shrink-0 border-2 transition-all active:scale-95`}
        style={{ borderColor: 'rgba(247,183,49,0.4)' }}>
        <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
      </Tag>
    )
  }
  return (
    <Tag onClick={onClick}
      className={`${dim} rounded-full flex items-center justify-center flex-shrink-0 font-bold ${txt} transition-all active:scale-95`}
      style={{ background: 'rgba(247,183,49,0.15)', border: '2px solid rgba(247,183,49,0.35)', color: '#F7B731' }}>
      {(profile?.username || user?.email)?.[0]?.toUpperCase() || '?'}
    </Tag>
  )
}

// ── Bell ──────────────────────────────────────────────────────
function NotifBell({ onClick, count }) {
  return (
    <button onClick={onClick}
      className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95 hover:bg-white/5"
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <Bell size={15} className="text-forge-muted" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center"
          style={{ background: '#F7B731', color: '#070A0F', boxShadow: '0 0 6px rgba(247,183,49,0.7)' }}>
          {count}
        </span>
      )}
    </button>
  )
}

// ── Notifications panel ───────────────────────────────────────
function NotifPanel({ onClose, notifications, onRead, onDismiss, onDismissAll, anchor }) {
  const posStyle = anchor === 'top-right'
    ? { top: '56px', right: '16px' }
    : { top: 'calc(env(safe-area-inset-top) + 56px)', right: '16px' }

  const unread = notifications.filter(n => !n.read)
  const read   = notifications.filter(n => n.read)

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed z-50 rounded-2xl border overflow-hidden"
        style={{
          ...posStyle,
          width: '310px',
          maxWidth: 'calc(100vw - 32px)',
          background: 'rgba(12,16,22,0.98)',
          borderColor: 'rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(24px)',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <Bell size={13} className="text-forge-accent" />
            <span className="text-xs font-semibold text-white uppercase tracking-widest">Notifications</span>
            {unread.length > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(247,183,49,0.2)', color: '#F7B731' }}>
                {unread.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unread.length > 0 && (
              <button onClick={onRead}
                className="flex items-center gap-1 text-[10px] text-forge-muted hover:text-forge-accent transition-colors">
                <CheckCheck size={11} /> Tout lire
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={onDismissAll}
                className="flex items-center gap-1 text-[10px] text-forge-muted hover:text-forge-red transition-colors">
                <Trash2 size={11} /> Tout effacer
              </button>
            )}
            <button onClick={onClose} className="text-forge-muted hover:text-white transition-colors ml-1">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Bell size={16} className="text-forge-muted opacity-40" />
              </div>
              <p className="text-xs text-forge-muted">Tout est calme ici</p>
              <p className="text-[10px] text-forge-muted/50 mt-1">Les alertes apparaîtront ici</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {unread.length > 0 && (
                <>
                  <p className="text-[9px] text-forge-muted uppercase tracking-widest px-1 pt-1">Nouvelles</p>
                  {unread.map(n => (
                    <div key={n.id} className="group flex items-start gap-3 p-3 rounded-xl transition-all"
                      style={{ background: `${n.color}0D`, border: `1px solid ${n.color}25` }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${n.color}18` }}>
                        <NotifIcon type={n.icon} color={n.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white leading-tight">{n.title}</p>
                        <p className="text-[10px] text-forge-muted mt-0.5 leading-relaxed">{n.body}</p>
                      </div>
                      <button
                        onClick={() => onDismiss(n.id)}
                        className="opacity-0 group-hover:opacity-100 text-forge-muted hover:text-white transition-all flex-shrink-0 mt-0.5">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </>
              )}

              {read.length > 0 && (
                <>
                  <p className="text-[9px] text-forge-muted uppercase tracking-widest px-1 pt-2">Déjà lues</p>
                  {read.map(n => (
                    <div key={n.id} className="group flex items-start gap-3 p-3 rounded-xl opacity-50 hover:opacity-70 transition-all"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <NotifIcon type={n.icon} color="#8B949E" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-forge-muted leading-tight">{n.title}</p>
                        <p className="text-[10px] text-forge-muted/60 mt-0.5">{n.body}</p>
                      </div>
                      <button
                        onClick={() => onDismiss(n.id)}
                        className="opacity-0 group-hover:opacity-100 text-forge-muted hover:text-forge-red transition-all flex-shrink-0 mt-0.5">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Logout confirm ────────────────────────────────────────────
function LogoutConfirm({ onConfirm, onCancel }) {
  return (
    <>
      <div className="fixed inset-0 z-[60]"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
        onClick={onCancel} />
      <div className="fixed z-[70] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-2xl p-6"
        style={{ background: 'rgba(14,18,26,0.99)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
        <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.25)' }}>
          <LogOut size={20} style={{ color: '#F85149' }} />
        </div>
        <h3 className="text-base font-semibold text-white text-center mb-1">Se déconnecter ?</h3>
        <p className="text-xs text-forge-muted text-center mb-5">
          Vous devrez vous reconnecter pour accéder à votre journal.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#8B949E' }}>
            Annuler
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: 'rgba(248,81,73,0.15)', border: '1px solid rgba(248,81,73,0.35)', color: '#F85149' }}>
            Déconnexion
          </button>
        </div>
      </div>
    </>
  )
}

// ── User popup ────────────────────────────────────────────────
function UserPopup({ onClose, user, profile, displayName, navigate, onLogoutRequest, anchor = 'desktop' }) {
  const posStyle = anchor === 'mobile'
    ? { top: 'calc(env(safe-area-inset-top) + 56px)', right: '12px' }
    : { bottom: '80px', left: '12px' }
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed z-50 rounded-2xl border overflow-hidden"
        style={{ ...posStyle, width: '224px', background: 'rgba(14,18,26,0.98)', borderColor: 'rgba(255,255,255,0.12)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)' }}>
        <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <Avatar user={user} profile={profile} size="md" asDiv onClick={() => {}} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-[10px] text-forge-muted truncate">{user?.email}</p>
            </div>
          </div>
        </div>
        <div className="p-2 space-y-0.5">
          <button onClick={() => { onClose(); navigate('/profile') }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-forge-muted hover:text-white hover:bg-white/5 transition-all text-left">
            <User size={15} strokeWidth={1.5} /> Mon profil
          </button>
          <button onClick={() => { onClose(); navigate('/settings') }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-forge-muted hover:text-white hover:bg-white/5 transition-all text-left">
            <SlidersHorizontal size={15} strokeWidth={1.5} /> Réglages
          </button>
        </div>
        <div className="px-2 pb-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <button onClick={() => { onClose(); onLogoutRequest() }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left mt-2 hover:bg-forge-red/10"
            style={{ color: '#F85149' }}>
            <LogOut size={15} strokeWidth={1.5} /> Déconnexion
          </button>
        </div>
      </div>
    </>
  )
}

// ── New menu ──────────────────────────────────────────────────
function NewMenu({ onClose }) {
  const navigate = useNavigate()
  const go = (path) => { onClose(); navigate(path) }
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}
        style={{ background: 'rgba(7,10,15,0.6)', backdropFilter: 'blur(4px)' }} />
      <div className="fixed z-50 rounded-2xl border overflow-hidden"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)', left: '50%', transform: 'translateX(-50%)', width: '300px', maxWidth: 'calc(100vw - 32px)', background: 'rgba(14,18,26,0.98)', borderColor: 'rgba(255,255,255,0.12)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-xs text-forge-muted uppercase tracking-widest font-medium">Créer</span>
          <button onClick={onClose} className="text-forge-muted hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <div className="p-3 space-y-2">
          <button onClick={() => go('/trades/new')}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all active:scale-[0.98] text-left"
            style={{ border: '1px solid rgba(247,183,49,0.2)', background: 'rgba(247,183,49,0.04)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(247,183,49,0.15)' }}>
              <BarChart2 size={18} className="text-forge-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Trade</p>
              <p className="text-xs text-forge-muted mt-0.5">Journaliser une position</p>
            </div>
          </button>
          <button onClick={() => go('/hindsights/new')}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all active:scale-[0.98] text-left"
            style={{ border: '1px solid rgba(46,160,67,0.2)', background: 'rgba(46,160,67,0.04)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(46,160,67,0.15)' }}>
              <BookMarked size={18} className="text-forge-green" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Hindsight</p>
              <p className="text-xs text-forge-muted mt-0.5">Analyse libre de marché</p>
            </div>
          </button>
        </div>
        <div className="pb-3" />
      </div>
    </>
  )
}

// ── Layout ────────────────────────────────────────────────────
export default function Layout() {
  const [showMenu, setShowMenu]                   = useState(false)
  const [showNotif, setShowNotif]                 = useState(false)
  const [showUserPopup, setShowUserPopup]         = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [userPopupAnchor, setUserPopupAnchor]     = useState('desktop')
  const [notifAnchor, setNotifAnchor]             = useState('mobile')

  const [readIds, setReadIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tf_read_notifs') || '[]') } catch { return [] }
  })
  const [dismissedIds, setDismissedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tf_dismissed_notifs') || '[]') } catch { return [] }
  })

  const [profile, setProfile] = useState(null)
  const { user, signOut } = useAuth()
  const { trades } = useTrades()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    const meta = user.user_metadata || {}
    setProfile({ username: meta.username || null, avatar_url: meta.avatar_url || null })
  }, [user])

  const allNotifs = useMemo(() => buildNotifications(trades), [trades])

  const notifications = useMemo(() =>
    allNotifs
      .filter(n => !dismissedIds.includes(n.id))
      .map(n => ({ ...n, read: readIds.includes(n.id) })),
    [allNotifs, dismissedIds, readIds]
  )

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllRead = () => {
    const ids = allNotifs.map(n => n.id)
    setReadIds(ids)
    localStorage.setItem('tf_read_notifs', JSON.stringify(ids))
  }

  const dismissNotif = (id) => {
    const next = [...dismissedIds, id]
    setDismissedIds(next)
    localStorage.setItem('tf_dismissed_notifs', JSON.stringify(next))
  }

  const dismissAll = () => {
    const ids = allNotifs.map(n => n.id)
    setDismissedIds(ids)
    localStorage.setItem('tf_dismissed_notifs', JSON.stringify(ids))
  }

  const handleBell = (anchor) => { setNotifAnchor(anchor); setShowNotif(v => !v) }
  const handleLogoutConfirmed = () => { setShowLogoutConfirm(false); signOut?.() }

  const displayName = profile?.username || profile?.full_name || 'Trader'

  return (
    <div className="min-h-screen">

      {/* Cloche desktop */}
      <div className="hidden lg:flex fixed top-4 right-4 z-50">
        <NotifBell onClick={() => handleBell('top-right')} count={unreadCount} />
      </div>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-56 z-40 flex-col"
        style={{ background: 'rgba(10,14,20,0.85)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="px-5 py-5 mb-2">
          <span className="font-mono text-lg font-semibold tracking-tight">
            <span className="text-forge-accent">TRADE</span><span className="text-white">FORGE</span>
          </span>
          <p className="text-[10px] text-forge-muted mt-0.5 font-mono">Journal avancé</p>
        </div>
        <div className="px-3 mb-4">
          <button onClick={() => setShowMenu(v => !v)} className="btn-primary w-full flex items-center justify-center gap-2">
            <Plus size={15} /> Nouveau
          </button>
        </div>
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                  isActive ? 'text-forge-accent bg-forge-accent/10 border border-forge-accent/20' : 'text-forge-muted hover:text-white hover:bg-white/5'
                }`}>
              <Icon size={16} strokeWidth={1.5} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-5 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div role="button" tabIndex={0}
            onClick={() => { setUserPopupAnchor('desktop'); setShowUserPopup(v => !v) }}
            onKeyDown={e => e.key === 'Enter' && (setUserPopupAnchor('desktop'), setShowUserPopup(v => !v))}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all hover:bg-white/5 active:scale-[0.98] cursor-pointer"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <Avatar user={user} profile={profile} size="sm" asDiv onClick={() => {}} />
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-medium truncate text-white">{displayName}</p>
              <p className="text-[10px] text-forge-muted truncate">{user?.email}</p>
            </div>
            <div className="text-forge-muted opacity-40">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40"
        style={{ background: 'rgba(7,10,15,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="h-12 px-4 flex items-center justify-between max-w-lg mx-auto">
          <span className="font-mono text-sm font-semibold">
            <span className="text-forge-accent">TRADE</span><span className="text-white">FORGE</span>
          </span>
          <div className="flex items-center gap-2">
            <NotifBell onClick={() => handleBell('mobile')} count={unreadCount} />
            <Avatar user={user} profile={profile} size="sm"
              onClick={() => { setUserPopupAnchor('mobile'); setShowUserPopup(v => !v) }} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="lg:pl-56"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 64px)' }}>
        <Outlet />
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
        style={{ background: 'rgba(7,10,15,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around px-1 py-1.5 max-w-lg mx-auto">
          {mobileLeft.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all min-w-[48px] ${
                  isActive ? 'text-forge-accent' : 'text-forge-muted hover:text-white'
                }`}>
              <Icon size={18} strokeWidth={1.5} />
              <span className="text-[9px] font-medium">{label}</span>
            </NavLink>
          ))}
          <button onClick={() => setShowMenu(v => !v)}
            className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all ${
              showMenu ? 'bg-forge-accent/20 text-forge-accent' : 'bg-forge-accent text-forge-bg shadow-[0_0_20px_rgba(247,183,49,0.4)]'
            }`}>
            <Plus size={20} strokeWidth={2} className={`transition-transform duration-200 ${showMenu ? 'rotate-45 text-forge-accent' : ''}`} />
          </button>
          {mobileRight.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all min-w-[48px] ${
                  isActive ? 'text-forge-accent' : 'text-forge-muted hover:text-white'
                }`}>
              <Icon size={18} strokeWidth={1.5} />
              <span className="text-[9px] font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Modals */}
      {showMenu && <NewMenu onClose={() => setShowMenu(false)} />}

      {showNotif && (
        <NotifPanel
          onClose={() => setShowNotif(false)}
          notifications={notifications}
          onRead={markAllRead}
          onDismiss={dismissNotif}
          onDismissAll={dismissAll}
          anchor={notifAnchor}
        />
      )}

      {showUserPopup && (
        <UserPopup
          onClose={() => setShowUserPopup(false)}
          user={user} profile={profile} displayName={displayName}
          navigate={(path) => { setShowUserPopup(false); navigate(path) }}
          onLogoutRequest={() => { setShowUserPopup(false); setShowLogoutConfirm(true) }}
          anchor={userPopupAnchor}
        />
      )}

      {showLogoutConfirm && (
        <LogoutConfirm
          onConfirm={handleLogoutConfirmed}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </div>
  )
}