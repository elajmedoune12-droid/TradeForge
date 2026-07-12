import { useUIStore } from '../store/useUIStore'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  LayoutDashboard, List, TrendingUp, Shield,
  Plus, BarChart2, BookMarked, X, Bell, LogOut, User, SlidersHorizontal,
  Calendar, CheckCheck, Zap, Clock, AlertCircle, Trash2,
  Target, Award, ChevronRight, ChevronLeft,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTrades } from '../hooks/useTrades'
import { supabase } from '../services/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Nav config — TOUS les chemins préfixés /app/
// ─────────────────────────────────────────────────────────────────────────────
const navItems = [
  { to: '/app/dashboard',       icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/app/trades',          icon: List,            label: 'Trades'     },
  { to: '/app/hindsights',      icon: BookMarked,      label: 'Hindsights' },
  { to: '/app/monthly',         icon: TrendingUp,      label: 'Mensuel'    },
  { to: '/app/rules',           icon: Shield,          label: 'Discipline' },
  { to: '/app/weekly-forecast', icon: Calendar,        label: 'Forecast'   },
]
const mobileLeft  = navItems.slice(0, 3)
const mobileRight = navItems.slice(3, 6)

// ─────────────────────────────────────────────────────────────────────────────
// Notifications builder
// ─────────────────────────────────────────────────────────────────────────────
const PERSISTENT_IDS = [
  'backtest_gap','no_forecast','inactive','no_hindsight',
  'low_disc','no_plan','low_rr','missed_streak','fomo_detected','overtrading','hors_session',
]
function buildNotifications(trades, backtestDone, backtestHours, lastBacktestDate, hasWeeklyForecast) {
  const notifs    = []
  const today     = new Date().toISOString().slice(0, 10)
  const todayDate = new Date()
  const last5     = trades.slice(0, 5)
  const last3     = trades.slice(0, 3)
  const last10    = trades.slice(0, 10)

  // ── URGENT ─────────────────────────────────────────────────────────────────
  const slStreak = last5.filter(t => t.result === 'sl').length
  if (slStreak >= 3) notifs.push({
    id: 'sl_streak', priority: 'urgent', icon: 'warning', color: '#F85149',
    title: `${slStreak} pertes consécutives`,
    body: 'Stoppez le trading maintenant. Revoyez votre plan et votre état psychologique.',
    action: '/app/trades', actionLabel: 'Voir trades',
  })

  const horsSession = last3.filter(t => t.session === 'Hors session').length
  if (horsSession >= 2) notifs.push({
    id: 'hors_session', priority: 'urgent', icon: 'warning', color: '#F85149',
    title: `${horsSession} trades hors session`,
    body: 'Vous tradez en dehors des sessions optimales. Risque élevé de pertes.',
    action: '/app/rules', actionLabel: 'Voir règles',
  })

  if (trades.length > 0) {
    const todayTrades = trades.filter(t => t.date === today)
    const dailyLoss   = todayTrades.reduce((acc, t) => {
      if (t.result === 'sl') return acc - 1
      if (t.result === 'tp') return acc + (t.rr_won || 0)
      return acc
    }, 0)
    if (dailyLoss <= -2) notifs.push({
      id: 'daily_loss_limit', priority: 'urgent', icon: 'warning', color: '#F85149',
      title: `${Math.abs(dailyLoss).toFixed(1)}R perdus aujourd'hui`,
      body: "Limite de perte journalière atteinte. Arrêtez de trader pour aujourd'hui.",
      action: '/app/trades', actionLabel: 'Voir trades',
    })
  }

  // ── ALERTE ─────────────────────────────────────────────────────────────────
  const recentLowDisc = last5.filter(t => t.discipline_score != null && t.discipline_score <= 4)
  if (recentLowDisc.length >= 2) notifs.push({
    id: 'low_disc', priority: 'warning', icon: 'disc', color: '#F7B731',
    title: 'Discipline en chute libre',
    body: `Score moyen de ${Math.round(recentLowDisc.reduce((a, t) => a + t.discipline_score, 0) / recentLowDisc.length)}/10 sur vos ${recentLowDisc.length} derniers trades.`,
    action: '/app/rules', actionLabel: 'Analyser',
  })

  const noplan = last5.filter(t => t.respect_plan === false).length
  if (noplan >= 3) notifs.push({
    id: 'no_plan', priority: 'warning', icon: 'warning', color: '#F7B731',
    title: 'Plan non respecté x' + noplan,
    body: 'Vous avez ignoré votre plan trading plusieurs fois. Relisez vos règles.',
    action: '/app/rules', actionLabel: 'Mes règles',
  })

  const revenge = last5.filter(t => t.emotion === 'Revenge').length
  if (revenge >= 2) notifs.push({
    id: 'revenge', priority: 'warning', icon: 'disc', color: '#F7B731',
    title: 'Revenge trading détecté',
    body: `${revenge} trades sous émotion "Revenge". Faites une pause.`,
    action: '/app/trades', actionLabel: 'Voir trades',
  })

  const last5tp = trades.slice(0, 10).filter(t => t.result === 'tp' && t.rr_won != null)
  if (last5tp.length >= 3) {
    const avgRR = last5tp.reduce((a, t) => a + t.rr_won, 0) / last5tp.length
    if (avgRR < 1) notifs.push({
      id: 'low_rr', priority: 'warning', icon: 'disc', color: '#F7B731',
      title: `RR moyen de ${avgRR.toFixed(2)} sur trades gagnants`,
      body: 'Votre RR est trop faible. Visez de meilleures cibles ou coupez vos pertes plus tôt.',
      action: '/app/trades', actionLabel: 'Voir trades',
    })
  }

  const missedStreak = last5.filter(t => t.result === 'missed').length
  if (missedStreak >= 3) notifs.push({
    id: 'missed_streak', priority: 'warning', icon: 'clock', color: '#F7B731',
    title: `${missedStreak} setups ratés récemment`,
    body: "Vous manquez trop de setups. Revoyez vos critères d'entrée.",
    action: '/app/trades', actionLabel: 'Voir trades',
  })

  const fomo = last5.filter(t => t.emotion === 'FOMO').length
  if (fomo >= 2) notifs.push({
    id: 'fomo_detected', priority: 'warning', icon: 'warning', color: '#F7B731',
    title: 'FOMO détecté',
    body: `${fomo} trades récents sous émotion FOMO. Attendez le prochain setup.`,
    action: '/app/trades', actionLabel: 'Voir trades',
  })

  if (trades.length > 0) {
    const todayCount = trades.filter(t => t.date === today).length
    if (todayCount >= 5) notifs.push({
      id: 'overtrading', priority: 'warning', icon: 'warning', color: '#F7B731',
      title: `${todayCount} trades aujourd'hui`,
      body: "Attention à l'overtrading. Qualité > quantité.",
      action: '/app/trades', actionLabel: 'Voir trades',
    })
  }

  // ── SUCCÈS ─────────────────────────────────────────────────────────────────
  if (last10.length >= 5) {
    const tp10     = last10.filter(t => t.result === 'tp').length
    const active10 = last10.filter(t => ['tp','sl','be'].includes(t.result)).length
    const wr       = active10 ? Math.round((tp10 / active10) * 100) : 0
    if (wr >= 65) notifs.push({
      id: 'wr_good', priority: 'success', icon: 'fire', color: '#2EA043',
      title: `${wr}% win rate sur 10 trades`,
      body: 'Performance excellente ! Restez discipliné.',
      action: '/app/monthly', actionLabel: 'Voir stats',
    })
  }

  if (backtestDone && backtestHours) notifs.push({
    id: 'backtest_done', priority: 'success', icon: 'trophy', color: '#2EA043',
    title: 'Objectif backtest atteint !',
    body: `${backtestHours}h complétées ! Lancez un nouveau cycle.`,
    action: '/app/rules', actionLabel: 'Nouveau cycle',
  })

  const respectStreak = trades.slice(0, 7).filter(t => t.respect_plan === true).length
  if (respectStreak >= 5) notifs.push({
    id: 'respect_streak', priority: 'success', icon: 'award', color: '#2EA043',
    title: `${respectStreak} trades respectant le plan`,
    body: 'Excellente discipline ! Vous êtes dans la bonne dynamique.',
  })

  if (trades.length > 0) {
    const dateProfit = {}
    trades.forEach(t => {
      if (!dateProfit[t.date]) dateProfit[t.date] = 0
      if (t.result === 'tp') dateProfit[t.date] += (t.rr_won || 0)
      if (t.result === 'sl') dateProfit[t.date] -= 1
    })
    const sortedDates = Object.keys(dateProfit).sort((a, b) => b.localeCompare(a))
    let streak = 0
    for (const d of sortedDates) { if (dateProfit[d] > 0) streak++; else break }
    if (streak >= 3) notifs.push({
      id: 'best_session_streak', priority: 'success', icon: 'fire', color: '#2EA043',
      title: `${streak} jours consécutifs profitables`,
      body: 'Belle série ! Continuez à respecter votre plan.',
      action: '/app/monthly', actionLabel: 'Voir stats',
    })
  }

  const last5disc = trades.slice(0, 5).filter(t => t.discipline_score != null)
  if (last5disc.length >= 3) {
    const avgDisc = last5disc.reduce((a, t) => a + t.discipline_score, 0) / last5disc.length
    if (avgDisc >= 8) notifs.push({
      id: 'discipline_high', priority: 'success', icon: 'award', color: '#2EA043',
      title: `Discipline ${avgDisc.toFixed(1)}/10 sur 5 trades`,
      body: 'Score de discipline excellent ! Votre rigueur paie.',
    })
  }

  if (last10.length >= 5) {
    const tpTrades = last10.filter(t => t.result === 'tp' && t.rr_won != null)
    if (tpTrades.length >= 3) {
      const avgRR = tpTrades.reduce((a, t) => a + t.rr_won, 0) / tpTrades.length
      if (avgRR >= 2.5) notifs.push({
        id: 'rr_excellent', priority: 'success', icon: 'fire', color: '#2EA043',
        title: `RR moyen de ${avgRR.toFixed(2)} sur 10 trades`,
        body: 'Excellent ratio risque/récompense ! Vous gérez parfaitement vos sorties.',
        action: '/app/monthly', actionLabel: 'Voir stats',
      })
    }
  }

  // ── INFO ───────────────────────────────────────────────────────────────────
  if (trades.length > 0) {
    const noHindsight = trades.slice(0, 10).filter(t => !t.hindsight?.length)
    if (noHindsight.length >= 3) notifs.push({
      id: 'no_hindsight', priority: 'info', icon: 'book', color: '#58a6ff',
      title: `${noHindsight.length} trades sans After Trade`,
      body: "L'analyse post-trade est essentielle pour progresser.",
      action: '/app/trades', actionLabel: 'Voir trades',
    })
  }

  if (trades.length > 0) {
    const todayTrades = trades.filter(t => t.date === today)
    if (todayTrades.length > 0) {
      const wins   = todayTrades.filter(t => t.result === 'tp').length
      const profit = todayTrades.reduce((acc, t) => {
        if (t.result === 'tp') return acc + (t.rr_won || 0)
        if (t.result === 'sl') return acc - 1
        return acc
      }, 0)
      notifs.push({
        id: 'today', priority: 'info', icon: 'chart', color: '#58a6ff',
        title: `${todayTrades.length} trade${todayTrades.length > 1 ? 's' : ''} aujourd'hui`,
        body: `${wins} TP · ${todayTrades.length - wins} autres · P&L : ${profit >= 0 ? '+' : ''}${profit.toFixed(1)}R`,
        action: '/app/trades', actionLabel: 'Voir',
      })
    }
  }

  if (todayDate.getDay() === 1 && trades.length > 0) {
    const oneWeekAgo = new Date(todayDate)
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const weekISO    = oneWeekAgo.toISOString().slice(0, 10)
    const weekTrades = trades.filter(t => t.date >= weekISO && t.date <= today)
    if (weekTrades.length > 0) {
      const weekProfit = weekTrades.reduce((acc, t) => {
        if (t.result === 'tp') return acc + (t.rr_won || 0)
        if (t.result === 'sl') return acc - 1
        return acc
      }, 0)
      notifs.push({
        id: 'weekly_summary', priority: 'info', icon: 'chart', color: '#58a6ff',
        title: `Semaine : ${weekTrades.length} trades`,
        body: `P&L : ${weekProfit >= 0 ? '+' : ''}${weekProfit.toFixed(1)}R · ${weekTrades.filter(t => t.result === 'tp').length} TP · ${weekTrades.filter(t => t.result === 'sl').length} SL`,
        action: '/app/monthly', actionLabel: 'Voir stats',
      })
    }
  }

  if (lastBacktestDate) {
    const diffDays = Math.floor((todayDate - new Date(lastBacktestDate)) / (1000 * 60 * 60 * 24))
    if (diffDays >= 2) notifs.push({
      id: 'backtest_gap', priority: 'info', icon: 'clock', color: '#8B949E',
      title: `${diffDays} jours sans backtest`,
      body: 'Reprenez votre session de backtest pour maintenir votre progression.',
      action: '/app/rules', actionLabel: 'Backtest',
    })
  }

  if (!hasWeeklyForecast) notifs.push({
    id: 'no_forecast', priority: 'info', icon: 'chart', color: '#58a6ff',
    title: 'Pas de prévision cette semaine',
    body: 'Préparez votre analyse hebdomadaire avant de trader.',
    action: '/app/weekly-forecast', actionLabel: 'Créer',
  })

  if (trades.length > 0) {
    const diffDays = Math.floor((todayDate - new Date(trades[0].date)) / (1000 * 60 * 60 * 24))
    if (diffDays >= 5) notifs.push({
      id: 'inactive', priority: 'info', icon: 'clock', color: '#8B949E',
      title: `${diffDays} jours sans trade`,
      body: "N'oubliez pas de journaliser vos positions.",
      action: '/app/trades/new', actionLabel: 'Ajouter',
    })
  }

  const order = { urgent: 0, warning: 1, success: 2, info: 3 }
  return notifs.sort((a, b) => order[a.priority] - order[b.priority])
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function NotifIcon({ type, color }) {
  const s = { color, width: 15, height: 15 }
  if (type === 'warning') return <AlertCircle style={s} />
  if (type === 'disc')    return <Zap style={s} />
  if (type === 'clock')   return <Clock style={s} />
  if (type === 'book')    return <BookMarked style={s} />
  if (type === 'fire')    return <TrendingUp style={s} />
  if (type === 'trophy')  return <Award style={s} />
  if (type === 'award')   return <Target style={s} />
  return <BarChart2 style={s} />
}

const PRIORITY_LABELS = {
  urgent:  { label: 'Urgent', bg: 'rgba(248,81,73,0.15)',  color: '#F85149' },
  warning: { label: 'Alerte', bg: 'rgba(247,183,49,0.15)', color: '#F7B731' },
  success: { label: 'Succès', bg: 'rgba(46,160,67,0.15)',  color: '#2EA043' },
  info:    { label: 'Info',   bg: 'rgba(88,166,255,0.15)', color: '#58a6ff' },
}

// ── Modal centré (sans conflit avec animate-slide-up) ────────────────────────
// On utilise un wrapper fixed inset-0 flex pour centrer proprement
function ModalCenter({ children, zIndex = 50 }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex }}
    >
      {children}
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user, profile, size = 'sm', onClick, asDiv = false }) {
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  const txt = size === 'sm' ? 'text-sm'  : 'text-base'
  const Tag = asDiv ? 'div' : 'button'

  if (profile?.avatar_url) {
    return (
      <Tag onClick={onClick}
        className={`${dim} rounded-full overflow-hidden flex-shrink-0 transition-all active:scale-95`}
        style={{ border: '2px solid rgba(247,183,49,0.4)' }}>
        <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
      </Tag>
    )
  }
  return (
    <Tag onClick={onClick}
      className={`${dim} rounded-full flex items-center justify-center flex-shrink-0 font-bold ${txt} transition-all active:scale-95 cursor-pointer`}
      style={{ background: 'rgba(247,183,49,0.15)', border: '2px solid rgba(247,183,49,0.35)', color: '#F7B731' }}>
      {(profile?.username || user?.email)?.[0]?.toUpperCase() || '?'}
    </Tag>
  )
}

// ── Bell ──────────────────────────────────────────────────────────────────────
function NotifBell({ onClick, count, urgentCount }) {
  return (
    <button
      onClick={onClick}
      aria-label={`Notifications${count > 0 ? ` (${count})` : ''}`}
      className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95"
      style={{
        border: '1px solid var(--border-medium)',
        background: urgentCount > 0 ? 'rgba(248,81,73,0.08)' : 'transparent',
      }}>
      <Bell size={15} style={{ color: urgentCount > 0 ? '#F85149' : 'var(--forge-muted)' }} />
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center"
          style={{
            background: urgentCount > 0 ? '#F85149' : '#F7B731',
            color: '#070A0F',
            boxShadow: urgentCount > 0 ? '0 0 6px rgba(248,81,73,0.7)' : '0 0 6px rgba(247,183,49,0.7)',
          }}>
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}

// ── Notifications panel ───────────────────────────────────────────────────────
function NotifPanel({ onClose, notifications, onRead, onDismiss, onDismissAll, onReadOne, anchor, navigate }) {
  const posStyle = anchor === 'top-right'
    ? { top: '60px', right: '16px' }
    : { top: 'calc(env(safe-area-inset-top) + 56px)', right: '16px' }

  const unread = notifications.filter(n => !n.read)
  const read   = notifications.filter(n =>  n.read)

  const handleAction = (n) => {
  if (!n.action) return
  onReadOne(n.id)
  onClose()
  setTimeout(() => navigate(n.action), 0)
}

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 rounded-2xl overflow-hidden animate-slide-up"
        style={{
          ...posStyle,
          width: '320px',
          maxWidth: 'calc(100vw - 32px)',
          background: 'var(--modal-bg)',
          border: '1px solid var(--border-strong)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(24px)',
        }}>

        <div className="flex items-center justify-between px-4 pt-4 pb-3"
          style={{ borderBottom: '1px solid var(--border-soft)' }}>
          <div className="flex items-center gap-2">
            <Bell size={13} className="text-forge-accent" />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
              Notifications
            </span>
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
                className="flex items-center gap-1 text-[10px] transition-colors"
                style={{ color: 'var(--forge-muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#F7B731'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}>
                <CheckCheck size={11} /> Tout lire
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={onDismissAll}
                className="flex items-center gap-1 text-[10px] transition-colors"
                style={{ color: 'var(--forge-muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#F85149'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}>
                <Trash2 size={11} /> Effacer
              </button>
            )}
            <button onClick={onClose}
              className="transition-colors ml-1"
              style={{ color: 'var(--forge-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="max-h-[480px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: 'var(--surface-4)', border: '1px solid var(--border-soft)' }}>
                <Bell size={16} style={{ color: 'var(--forge-muted)', opacity: 0.4 }} />
              </div>
              <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>Tout est calme</p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>Les alertes apparaîtront ici</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {unread.length > 0 && (
                <>
                  <p className="text-[9px] uppercase tracking-widest px-1 pt-1" style={{ color: 'var(--forge-muted)' }}>
                    Nouvelles
                  </p>
                  {unread.map(n => {
                    const prio = PRIORITY_LABELS[n.priority]
                    return (
                      <div key={n.id} className="group flex items-start gap-3 p-3 rounded-xl transition-all"
                        style={{ background: `${n.color}0D`, border: `1px solid ${n.color}25` }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${n.color}18` }}>
                          <NotifIcon type={n.icon} color={n.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                              {n.title}
                            </p>
                            {(n.priority === 'urgent' || n.priority === 'warning') && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: prio.bg, color: prio.color }}>
                                {prio.label}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] leading-relaxed mb-2" style={{ color: 'var(--forge-muted)' }}>
                            {n.body}
                          </p>
                          {n.action && (
                            <button onClick={() => handleAction(n)}
                              className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-lg transition-all active:scale-95"
                              style={{ background: `${n.color}18`, color: n.color, border: `1px solid ${n.color}30` }}>
                              {n.actionLabel} <ChevronRight size={10} />
                            </button>
                          )}
                        </div>
                        <button onClick={() => onDismiss(n.id)}
                          className="opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-0.5"
                          style={{ color: 'var(--forge-muted)' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}>
                          <X size={12} />
                        </button>
                      </div>
                    )
                  })}
                </>
              )}

              {read.length > 0 && (
                <>
                  <p className="text-[9px] uppercase tracking-widest px-1 pt-2" style={{ color: 'var(--forge-muted)' }}>
                    Déjà lues
                  </p>
                  {read.map(n => (
                    <div key={n.id} className="group flex items-start gap-3 p-3 rounded-xl transition-all"
                      style={{ background: 'var(--surface-3)', border: '1px solid var(--border-soft)', opacity: 0.5 }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--surface-5)' }}>
                        <NotifIcon type={n.icon} color="var(--forge-muted)" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-tight" style={{ color: 'var(--forge-muted)' }}>
                          {n.title}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>{n.body}</p>
                      </div>
                      <button onClick={() => onDismiss(n.id)}
                        className="opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-0.5"
                        style={{ color: 'var(--forge-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#F85149'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}>
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

// ── Logout confirm ────────────────────────────────────────────────────────────
function LogoutConfirm({ onConfirm, onCancel }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: 'var(--modal-overlay)', backdropFilter: 'blur(6px)' }}
        onClick={onCancel}
      />
      {/* Modal — centré via flexbox, pas de translate conflict */}
      <ModalCenter zIndex={70}>
        <div
          className="w-80 rounded-2xl p-6 animate-slide-up"
          style={{
            background: 'var(--modal-bg)',
            border: '1px solid var(--border-strong)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            maxWidth: 'calc(100vw - 32px)',
          }}>
          <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.25)' }}>
            <LogOut size={20} style={{ color: '#F85149' }} />
          </div>
          <h3 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--text-primary)' }}>
            Se déconnecter ?
          </h3>
          <p className="text-xs text-center mb-5" style={{ color: 'var(--forge-muted)' }}>
            Vous devrez vous reconnecter pour accéder à votre journal.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
              style={{
                background: 'var(--surface-5)',
                border: '1px solid var(--border-medium)',
                color: 'var(--forge-muted)',
              }}>
              Annuler
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{
                background: 'rgba(248,81,73,0.15)',
                border: '1px solid rgba(248,81,73,0.35)',
                color: '#F85149',
              }}>
              Déconnexion
            </button>
          </div>
        </div>
      </ModalCenter>
    </>
  )
}

// ── User popup ────────────────────────────────────────────────────────────────
function UserPopup({ onClose, user, profile, displayName, navigate, onLogoutRequest, anchor = 'desktop' }) {
  const posStyle = anchor === 'mobile'
    ? { top: 'calc(env(safe-area-inset-top) + 56px)', right: '12px' }
    : { bottom: '80px', left: '12px' }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 rounded-2xl overflow-hidden animate-slide-up"
        style={{
          ...posStyle,
          width: '224px',
          background: 'var(--modal-bg)',
          border: '1px solid var(--border-strong)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(20px)',
        }}>

        <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border-soft)' }}>
          <div className="flex items-center gap-3">
            <Avatar user={user} profile={profile} size="md" asDiv onClick={() => {}} />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {displayName}
              </p>
              <p className="text-[10px] truncate" style={{ color: 'var(--forge-muted)' }}>{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="p-2 space-y-0.5">
          {[
            { icon: User,              label: 'Mon profil', path: '/app/profile'   },
            { icon: SlidersHorizontal, label: 'Réglages',  path: '/app/settings'  },
          ].map(({ icon: Icon, label, path }) => (
            <button
              key={path}
              onClick={() => { onClose(); navigate(path) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
              style={{ color: 'var(--forge-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--surface-6)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--forge-muted)';   e.currentTarget.style.background = 'transparent' }}>
              <Icon size={15} strokeWidth={1.5} /> {label}
            </button>
          ))}
        </div>

        <div className="px-2 pb-2" style={{ borderTop: '1px solid var(--border-soft)' }}>
          <button
            onClick={() => { onClose(); onLogoutRequest() }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left mt-2"
            style={{ color: '#F85149' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,81,73,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <LogOut size={15} strokeWidth={1.5} /> Déconnexion
          </button>
        </div>
      </div>
    </>
  )
}

// ── New menu ──────────────────────────────────────────────────────────────────
function NewMenu({ onClose }) {
  const navigate = useNavigate()
  const go = (path) => { onClose(); navigate(path) }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'var(--modal-overlay)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      {/* Modal — centré via flexbox, sans conflit transform */}
      <ModalCenter zIndex={50}>
        <div
          className="rounded-2xl overflow-hidden animate-slide-up"
          style={{
            width: '300px',
            maxWidth: 'calc(100vw - 32px)',
            background: 'var(--modal-bg)',
            border: '1px solid var(--border-strong)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--forge-muted)' }}>
              Créer
            </span>
            <button
              onClick={onClose}
              className="transition-colors"
              style={{ color: 'var(--forge-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}>
              <X size={16} />
            </button>
          </div>
          <div className="p-3 space-y-2 pb-5">
            <button
              onClick={() => go('/app/trades/new')}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all active:scale-[0.98] text-left"
              style={{ border: '1px solid rgba(247,183,49,0.2)', background: 'rgba(247,183,49,0.04)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(247,183,49,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(247,183,49,0.04)'}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(247,183,49,0.15)' }}>
                <BarChart2 size={18} className="text-forge-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Trade</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--forge-muted)' }}>Journaliser une position</p>
              </div>
            </button>

            <button
              onClick={() => go('/app/hindsights/new')}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all active:scale-[0.98] text-left"
              style={{ border: '1px solid rgba(46,160,67,0.2)', background: 'rgba(46,160,67,0.04)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(46,160,67,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(46,160,67,0.04)'}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(46,160,67,0.15)' }}>
                <BookMarked size={18} className="text-forge-green" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Hindsight</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--forge-muted)' }}>Analyse libre de marché</p>
              </div>
            </button>
          </div>
        </div>
      </ModalCenter>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout principal
// ─────────────────────────────────────────────────────────────────────────────
export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()

  const [sidebarOpen,       setSidebarOpen]       = useState(() => localStorage.getItem('sidebar_open') !== 'false')
  const [showMenu,          setShowMenu]          = useState(false)
  const [showNotif,         setShowNotif]         = useState(false)
  const [showUserPopup,     setShowUserPopup]     = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [userPopupAnchor,   setUserPopupAnchor]   = useState('desktop')
  const [notifAnchor,       setNotifAnchor]       = useState('mobile')

  const [backtestDone,      setBacktestDone]      = useState(false)
  const [backtestHours,     setBacktestHours]     = useState(null)
  const [lastBacktestDate,  setLastBacktestDate]  = useState(null)
  const [hasWeeklyForecast, setHasWeeklyForecast] = useState(false)

  const [readIds, setReadIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tf_read_notifs') || '[]') } catch { return [] }
  })

const [dismissedIds, setDismissedIds] = useState(() => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const saved = JSON.parse(localStorage.getItem('tf_dismissed_notifs') || '{}')
    const persistent = saved.persistentIds || []
    const daily      = saved.date === today ? (saved.dailyIds || []) : []
    return [...persistent, ...daily]
  } catch { return [] }
})

  const [profile, setProfile] = useState(null)
  const { user, signOut }     = useAuth()
  const resetAll = useUIStore(s => s.resetAll)
  const { trades }            = useTrades()
  const contentRef            = useRef(null)

  useEffect(() => { localStorage.setItem('sidebar_open', sidebarOpen) }, [sidebarOpen])

  useEffect(() => {
    if (!user) return
    const meta = user.user_metadata || {}
    setProfile({ username: meta.username || null, avatar_url: meta.avatar_url || null })
  }, [user])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await supabase
        .from('backtest_cycles')
        .select('*, backtest_sessions(*)')
        .eq('user_id', user.id)
        .is('ended_at', null)
        .single()

      if (data) {
        const totalMin = (data.backtest_sessions || []).reduce((a, s) => a + s.minutes, 0)
        if (totalMin >= data.goal_hours * 60) {
          setBacktestDone(true)
          setBacktestHours(data.goal_hours)
        }
      }

      const { data: lastSession } = await supabase
        .from('backtest_sessions')
        .select('date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .single()
      if (lastSession) setLastBacktestDate(lastSession.date)

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
      const { data: forecast } = await supabase
        .from('weekly_forecasts')
        .select('id')
        .eq('user_id', user.id)
        .eq('week_start', weekStart.toISOString().slice(0, 10))
        .maybeSingle()
      setHasWeeklyForecast(!!forecast)
    }
    load()
  }, [user?.id])

  useEffect(() => {
    if (!user || !trades.length) return
    const sentKey = `tf_sent_notifs_${new Date().toISOString().slice(0, 10)}`
    const sent    = JSON.parse(localStorage.getItem(sentKey) || '[]')

    const sendPush = async (id, title, body, url = '/') => {
  if (sent.includes(id)) return
  if (!user?.id) return
  try {
        await fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, title, body, url }),
        })
      } catch {}
      const next = [...sent, id]
      localStorage.setItem(sentKey, JSON.stringify(next))
      sent.push(id)
    }

    const last5  = trades.slice(0, 5)
    const last10 = trades.slice(0, 10)

    if (last5.filter(t => t.result === 'sl').length >= 3)
      sendPush('sl_streak', '⚠️ 3 pertes consécutives', 'Arrêtez de trader. Revoyez votre plan.', '/app/trades')
    if (last5.filter(t => t.session === 'Hors session').length >= 2)
      sendPush('hors_session', '⚠️ Trades hors session', 'Vous tradez en dehors des sessions optimales.', '/app/rules')
    if (last5.filter(t => t.discipline_score != null && t.discipline_score <= 4).length >= 2)
      sendPush('low_disc', '📉 Discipline en baisse', 'Score moyen faible sur vos derniers trades.', '/app/rules')
    if (last5.filter(t => t.respect_plan === false).length >= 3)
      sendPush('no_plan', '❌ Plan non respecté', 'Relisez vos règles avant chaque trade.', '/app/rules')
    if (last5.filter(t => t.emotion === 'Revenge').length >= 2)
      sendPush('revenge', '😤 Revenge trading', 'Détecté sur vos derniers trades. Faites une pause.', '/app/trades')
    if (last10.length >= 5 && Math.round((last10.filter(t => t.result === 'tp').length / last10.length) * 100) >= 65)
      sendPush('wr_good', '🔥 Excellent win rate', `${Math.round((last10.filter(t => t.result === 'tp').length / last10.length) * 100)}% sur vos 10 derniers trades !`, '/app/monthly')
    if (trades.slice(0, 7).filter(t => t.respect_plan === true).length >= 5)
      sendPush('respect_streak', '✅ Super discipline', `${trades.slice(0,7).filter(t=>t.respect_plan).length} trades avec plan respecté !`, '/app/rules')
    if (trades.slice(0, 10).filter(t => !t.hindsight?.length).length >= 3)
      sendPush('no_hindsight', '📝 After Trade manquant', `${trades.slice(0,10).filter(t=>!t.hindsight?.length).length} trades sans analyse post-trade.`, '/app/hindsights')
    if (backtestDone && backtestHours)
      sendPush('backtest_done', '🎯 Objectif backtest atteint', `${backtestHours}h complétées ! Lancez un nouveau cycle.`, '/app/rules')
    if (Math.floor((new Date() - new Date(trades[0].date)) / (1000 * 60 * 60 * 24)) >= 5)
      sendPush('inactive', '💤 Inactivité détectée', `${Math.floor((new Date() - new Date(trades[0].date)) / (1000 * 60 * 60 * 24))} jours sans trade journalisé.`, '/app/trades/new')
  }, [trades, user, backtestDone, backtestHours])

  useEffect(() => {
    const update = () => {
      if (!contentRef.current) return
      contentRef.current.style.paddingLeft =
        window.innerWidth >= 1024 ? `${sidebarOpen ? 224 : 64}px` : '0px'
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [sidebarOpen])

  useEffect(() => {
    setShowMenu(false)
    setShowNotif(false)
    setShowUserPopup(false)
  }, [location.pathname])

  const allNotifs = useMemo(
    () => buildNotifications(trades, backtestDone, backtestHours, lastBacktestDate, hasWeeklyForecast),
    [trades, backtestDone, backtestHours, lastBacktestDate, hasWeeklyForecast]
  )
  const notifications = useMemo(() =>
    allNotifs
      .filter(n => !dismissedIds.includes(n.id))
      .map(n => ({ ...n, read: readIds.includes(n.id) })),
    [allNotifs, dismissedIds, readIds]
  )

  const unreadCount = notifications.filter(n => !n.read).length
  const urgentCount = notifications.filter(n => !n.read && n.priority === 'urgent').length

  const markAllRead = useCallback(() => {
    const ids = allNotifs.map(n => n.id)
    setReadIds(ids)
    localStorage.setItem('tf_read_notifs', JSON.stringify(ids))
  }, [allNotifs])

  const markOneRead = useCallback((id) => {
    const next = [...readIds, id]
    setReadIds(next)
    localStorage.setItem('tf_read_notifs', JSON.stringify(next))
  }, [readIds])

  const dismissNotif = useCallback((id) => {
  const next  = [...dismissedIds, id]
  const today = new Date().toISOString().slice(0, 10)
  setDismissedIds(next)
  const saved       = (() => { try { return JSON.parse(localStorage.getItem('tf_dismissed_notifs') || '{}') } catch { return {} } })()
  const persistentIds = PERSISTENT_IDS.includes(id) ? [...new Set([...(saved.persistentIds||[]), id])] : (saved.persistentIds||[])
  const dailyIds      = !PERSISTENT_IDS.includes(id) ? [...new Set([...(saved.date===today?(saved.dailyIds||[]):[]), id])] : (saved.date===today?(saved.dailyIds||[]):[])
  localStorage.setItem('tf_dismissed_notifs', JSON.stringify({ date: today, persistentIds, dailyIds }))
}, [dismissedIds])

  const dismissAll = useCallback(() => {
  const ids   = allNotifs.map(n => n.id)
  const today = new Date().toISOString().slice(0, 10)
  setDismissedIds(ids)
  const persistentIds = ids.filter(id => PERSISTENT_IDS.includes(id))
  const dailyIds      = ids.filter(id => !PERSISTENT_IDS.includes(id))
  localStorage.setItem('tf_dismissed_notifs', JSON.stringify({ date: today, persistentIds, dailyIds }))
}, [allNotifs])

  const handleBell = (anchor) => {
    setNotifAnchor(anchor)
    setShowNotif(v => !v)
    setShowUserPopup(false)
  }

  const handleAvatarClick = (anchor) => {
    setUserPopupAnchor(anchor)
    setShowUserPopup(v => !v)
    setShowNotif(false)
  }

  const handleLogoutConfirmed = async () => {
  setShowLogoutConfirm(false)
  resetAll()
  const theme = localStorage.getItem('tradeforge_theme')
  localStorage.clear()
  sessionStorage.clear()          // ← vide lastRoute
  if (theme) localStorage.setItem('tradeforge_theme', theme)
  await signOut?.()
  window.location.href = '/'
}

  const displayName = profile?.username || profile?.full_name || 'Trader'

  // ── Theme-aware nav surface ─────────────────────────────────────────────────
  // Utilise une variable CSS pour s'adapter au thème clair/sombre
  const navSurface = {
    background: 'var(--surface-card)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  }

  return (
    <div className="min-h-screen">

      {/* ── Desktop bell ──────────────────────────────────────────────────── */}
      <div className="hidden lg:flex fixed top-4 right-4 z-50">
        <NotifBell onClick={() => handleBell('top-right')} count={unreadCount} urgentCount={urgentCount} />
      </div>

      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col transition-all duration-300"
        style={{
          width: sidebarOpen ? '224px' : '64px',
          ...navSurface,
          borderRight: '1px solid var(--border-soft)',
        }}>

        {/* Logo + toggle */}
        <div className="px-3 py-5 mb-2 flex items-center justify-between overflow-hidden">
          {sidebarOpen && (
            <div>
              <span className="font-mono text-lg font-semibold tracking-tight whitespace-nowrap">
                <span className="text-forge-accent">TRADE</span>
                <span style={{ color: 'var(--text-primary)' }}>FORGE</span>
              </span>
              <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--forge-muted)' }}>
                Journal avancé
              </p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            aria-label={sidebarOpen ? 'Réduire' : 'Élargir'}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              border: '1px solid var(--border-medium)',
              marginLeft: sidebarOpen ? '0' : 'auto',
              color: 'var(--forge-muted)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-6)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {sidebarOpen ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>

        {/* Nouveau */}
        <div className="px-3 mb-4">
          {sidebarOpen ? (
            <button onClick={() => setShowMenu(v => !v)} className="btn-primary w-full flex items-center justify-center gap-2">
              <Plus size={15} /> Nouveau
            </button>
          ) : (
            <button
              onClick={() => setShowMenu(v => !v)}
              aria-label="Créer"
              className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all active:scale-95"
              style={{ background: '#F7B731', color: '#070A0F', boxShadow: '0 0 16px rgba(247,183,49,0.35)' }}>
              <Plus size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={!sidebarOpen ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium overflow-hidden ${
                  isActive
                    ? 'text-forge-accent bg-forge-accent/10 border border-forge-accent/20'
                    : 'border border-transparent'
                }`
              }
              style={({ isActive }) => isActive ? {} : { color: 'var(--forge-muted)' }}
              onMouseEnter={e => {
                if (!e.currentTarget.classList.contains('text-forge-accent')) {
                  e.currentTarget.style.color = 'var(--text-primary)'
                  e.currentTarget.style.background = 'var(--surface-6)'
                }
              }}
              onMouseLeave={e => {
                if (!e.currentTarget.classList.contains('text-forge-accent')) {
                  e.currentTarget.style.color = 'var(--forge-muted)'
                  e.currentTarget.style.background = 'transparent'
                }
              }}>
              <Icon size={16} strokeWidth={1.5} className="flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 pb-5 pt-2" style={{ borderTop: '1px solid var(--border-soft)' }}>
          {sidebarOpen ? (
            <div
              role="button" tabIndex={0}
              onClick={() => handleAvatarClick('desktop')}
              onKeyDown={e => e.key === 'Enter' && handleAvatarClick('desktop')}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] cursor-pointer"
              style={{ border: '1px solid var(--border-soft)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-5)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Avatar user={user} profile={profile} size="sm" asDiv onClick={() => {}} />
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--forge-muted)' }}>{user?.email}</p>
              </div>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--forge-muted)', opacity: 0.4 }}>
                <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Avatar user={user} profile={profile} size="sm" onClick={() => handleAvatarClick('desktop')} />
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile top bar ────────────────────────────────────────────────── */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-40"
        style={{
          ...navSurface,
          borderBottom: '1px solid var(--border-soft)',
          paddingTop: 'env(safe-area-inset-top)',
        }}>
        <div className="h-12 px-4 flex items-center justify-between max-w-lg mx-auto">
          <span className="font-mono text-sm font-semibold">
            <span className="text-forge-accent">TRADE</span>
            <span style={{ color: 'var(--text-primary)' }}>FORGE</span>
          </span>
          <div className="flex items-center gap-2">
            <NotifBell onClick={() => handleBell('mobile')} count={unreadCount} urgentCount={urgentCount} />
            <Avatar user={user} profile={profile} size="sm" onClick={() => handleAvatarClick('mobile')} />
          </div>
        </div>
      </div>

      {/* ── Desktop header (sidebar collapsed) ───────────────────────────── */}
      {!sidebarOpen && (
        <div
          className="hidden lg:flex fixed top-0 left-16 right-0 h-14 z-30 items-center justify-center"
          style={{ ...navSurface, borderBottom: '1px solid var(--border-soft)' }}>
          <span className="font-mono text-lg font-bold tracking-tight">
            <span className="text-forge-accent">TRADE</span>
            <span style={{ color: 'var(--text-primary)' }}>FORGE</span>
          </span>
        </div>
      )}

      {/* ── Page content ──────────────────────────────────────────────────── */}
      <div
        className="transition-all duration-300"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 48px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 64px)',
        }}>
        <div ref={contentRef} className="transition-all duration-300">
          <Outlet />
        </div>
      </div>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
        style={{
          ...navSurface,
          borderTop: '1px solid var(--border-soft)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
        <div className="flex items-center justify-around px-1 py-1.5 max-w-lg mx-auto">
          {mobileLeft.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all min-w-[48px] ${isActive ? 'text-forge-accent' : ''}`
              }
              style={({ isActive }) => isActive ? {} : { color: 'var(--forge-muted)' }}>
              <Icon size={18} strokeWidth={1.5} />
              <span className="text-[9px] font-medium">{label}</span>
            </NavLink>
          ))}

          <button
            onClick={() => setShowMenu(v => !v)}
            aria-label="Créer"
            className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all ${
              showMenu
                ? 'bg-forge-accent/20 text-forge-accent'
                : 'bg-forge-accent text-forge-bg shadow-[0_0_20px_rgba(247,183,49,0.4)]'
            }`}>
            <Plus
              size={20} strokeWidth={2}
              className={`transition-transform duration-200 ${showMenu ? 'rotate-45 text-forge-accent' : ''}`}
            />
          </button>

          {mobileRight.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all min-w-[48px] ${isActive ? 'text-forge-accent' : ''}`
              }
              style={({ isActive }) => isActive ? {} : { color: 'var(--forge-muted)' }}>
              <Icon size={18} strokeWidth={1.5} />
              <span className="text-[9px] font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ── Overlays ──────────────────────────────────────────────────────── */}
      {showMenu && <NewMenu onClose={() => setShowMenu(false)} />}

      {showNotif && (
        <NotifPanel
          onClose={() => setShowNotif(false)}
          notifications={notifications}
          onRead={markAllRead}
          onDismiss={dismissNotif}
          onDismissAll={dismissAll}
          onReadOne={markOneRead}
          anchor={notifAnchor}
          navigate={navigate}
        />
      )}

      {showUserPopup && (
        <UserPopup
          onClose={() => setShowUserPopup(false)}
          user={user}
          profile={profile}
          displayName={displayName}
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