import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useMemo, useRef } from 'react'
import {
  LayoutDashboard, List, TrendingUp, Shield,
  Plus, BarChart2, BookMarked, X, Bell, LogOut, User, SlidersHorizontal,
  Calendar, CheckCheck, Zap, Clock, AlertCircle, Trash2,
  TrendingDown, Target, Award, AlertTriangle, Timer, ChevronRight,
  ChevronLeft,  // ← ajoute ici
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTrades } from '../hooks/useTrades'
import { supabase } from '../services/supabase'

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

// ── Notifications builder ─────────────────────────────────────
function buildNotifications(trades, backtestDone, backtestHours, lastBacktestDate, hasWeeklyForecast) {
  const notifs = []
  const today = new Date().toISOString().slice(0, 10)
  const todayDate = new Date()

  // ── 🔴 URGENT ──────────────────────────────────────────

  // SL streak
  const last5 = trades.slice(0, 5)
  const slStreak = last5.filter(t => t.result === 'sl').length
  if (slStreak >= 3) notifs.push({
    id: 'sl_streak', priority: 'urgent', icon: 'warning', color: '#F85149',
    title: `${slStreak} pertes consécutives`,
    body: 'Stoppez le trading maintenant. Revoyez votre plan et votre état psychologique.',
    action: '/trades', actionLabel: 'Voir trades',
  })

  // Hors session streak
  const last3 = trades.slice(0, 3)
  const horsSession = last3.filter(t => t.session === 'Hors session').length
  if (horsSession >= 2) notifs.push({
    id: 'hors_session', priority: 'urgent', icon: 'warning', color: '#F85149',
    title: `${horsSession} trades hors session`,
    body: 'Vous tradez en dehors des sessions optimales. Risque élevé de pertes.',
    action: '/rules', actionLabel: 'Voir règles',
  })

  // Perte journalière ≥ 2R
  if (trades.length > 0) {
    const todayTrades = trades.filter(t => t.date === today)
    const dailyLoss = todayTrades.reduce((acc, t) => {
      if (t.result === 'sl') return acc - 1
      if (t.result === 'tp') return acc + (t.rr_won || 0)
      return acc
    }, 0)
    if (dailyLoss <= -2) notifs.push({
      id: 'daily_loss_limit', priority: 'urgent', icon: 'warning', color: '#F85149',
      title: `${Math.abs(dailyLoss).toFixed(1)}R perdus aujourd'hui`,
      body: "Limite de perte journalière atteinte. Arrêtez de trader pour aujourd'hui.",
      action: '/trades', actionLabel: 'Voir trades',
    })
  }

  // ── 🟡 ALERTE ──────────────────────────────────────────

  // Discipline en baisse
  const recentLowDisc = trades.slice(0, 5).filter(t => t.discipline_score != null && t.discipline_score <= 4)
  if (recentLowDisc.length >= 2) notifs.push({
    id: 'low_disc', priority: 'warning', icon: 'disc', color: '#F7B731',
    title: 'Discipline en chute libre',
    body: `Score moyen de ${Math.round(recentLowDisc.reduce((a, t) => a + t.discipline_score, 0) / recentLowDisc.length)}/10 sur vos ${recentLowDisc.length} derniers trades.`,
    action: '/rules', actionLabel: 'Analyser',
  })

  // Plan non respecté
  const noplan = trades.slice(0, 5).filter(t => t.respect_plan === false).length
  if (noplan >= 3) notifs.push({
    id: 'no_plan', priority: 'warning', icon: 'warning', color: '#F7B731',
    title: 'Plan non respecté x' + noplan,
    body: 'Vous avez ignoré votre plan trading plusieurs fois. Relisez vos règles.',
    action: '/rules', actionLabel: 'Mes règles',
  })

  // Revenge trading
  const revenge = trades.slice(0, 5).filter(t => t.emotion === 'Revenge').length
  if (revenge >= 2) notifs.push({
    id: 'revenge', priority: 'warning', icon: 'disc', color: '#F7B731',
    title: 'Revenge trading détecté',
    body: `${revenge} trades sous émotion "Revenge". Faites une pause.`,
    action: '/trades', actionLabel: 'Voir trades',
  })

  // RR moyen faible
  const last5tp = trades.slice(0, 10).filter(t => t.result === 'tp' && t.rr_won != null)
  if (last5tp.length >= 3) {
    const avgRR = last5tp.reduce((a, t) => a + t.rr_won, 0) / last5tp.length
    if (avgRR < 1) notifs.push({
      id: 'low_rr', priority: 'warning', icon: 'disc', color: '#F7B731',
      title: `RR moyen de ${avgRR.toFixed(2)} sur trades gagnants`,
      body: 'Votre RR est trop faible. Visez de meilleures cibles ou coupez vos pertes plus tôt.',
      action: '/trades', actionLabel: 'Voir trades',
    })
  }

  // Missed streak
  const missedStreak = trades.slice(0, 5).filter(t => t.result === 'missed').length
  if (missedStreak >= 3) notifs.push({
    id: 'missed_streak', priority: 'warning', icon: 'clock', color: '#F7B731',
    title: `${missedStreak} setups ratés récemment`,
    body: 'Vous manquez trop de setups. Revoyez vos critères d\'entrée.',
    action: '/trades', actionLabel: 'Voir trades',
  })

  // FOMO détecté
  const fomo = trades.slice(0, 5).filter(t => t.emotion === 'FOMO').length
  if (fomo >= 2) notifs.push({
    id: 'fomo_detected', priority: 'warning', icon: 'warning', color: '#F7B731',
    title: 'FOMO détecté',
    body: `${fomo} trades récents sous émotion FOMO. Attendez le prochain setup.`,
    action: '/trades', actionLabel: 'Voir trades',
  })

  // Overtrading
  if (trades.length > 0) {
    const todayCount = trades.filter(t => t.date === today).length
    if (todayCount >= 5) notifs.push({
      id: 'overtrading', priority: 'warning', icon: 'warning', color: '#F7B731',
      title: `${todayCount} trades aujourd'hui`,
      body: 'Attention à l\'overtrading. Qualité > quantité.',
      action: '/trades', actionLabel: 'Voir trades',
    })
  }

  // ── 🟢 SUCCÈS ──────────────────────────────────────────

  // Win rate élevé
  const last10 = trades.slice(0, 10)
  if (last10.length >= 5) {
    const tp10 = last10.filter(t => t.result === 'tp').length
    const active10 = last10.filter(t => ['tp','sl','be'].includes(t.result)).length
    const wr = active10 ? Math.round((tp10 / active10) * 100) : 0
    if (wr >= 65) notifs.push({
      id: 'wr_good', priority: 'success', icon: 'fire', color: '#2EA043',
      title: `${wr}% win rate sur 10 trades`,
      body: 'Performance excellente ! Restez discipliné.',
      action: '/monthly', actionLabel: 'Voir stats',
    })
  }

  // Backtest cycle atteint
  if (backtestDone && backtestHours) notifs.push({
    id: 'backtest_done', priority: 'success', icon: 'trophy', color: '#2EA043',
    title: 'Objectif backtest atteint !',
    body: `${backtestHours}h complétées ! Lancez un nouveau cycle.`,
    action: '/rules', actionLabel: 'Nouveau cycle',
  })

  // Streak trades respectés
  const respectStreak = trades.slice(0, 7).filter(t => t.respect_plan === true).length
  if (respectStreak >= 5) notifs.push({
    id: 'respect_streak', priority: 'success', icon: 'award', color: '#2EA043',
    title: `${respectStreak} trades respectant le plan`,
    body: 'Excellente discipline ! Vous êtes dans la bonne dynamique.',
  })

  // Jours consécutifs profitables
  if (trades.length > 0) {
    const dateProfit = {}
    trades.forEach(t => {
      if (!dateProfit[t.date]) dateProfit[t.date] = 0
      if (t.result === 'tp') dateProfit[t.date] += (t.rr_won || 0)
      if (t.result === 'sl') dateProfit[t.date] -= 1
    })
    const sortedDates = Object.keys(dateProfit).sort((a, b) => b.localeCompare(a))
    let streak = 0
    for (const d of sortedDates) {
      if (dateProfit[d] > 0) streak++
      else break
    }
    if (streak >= 3) notifs.push({
      id: 'best_session_streak', priority: 'success', icon: 'fire', color: '#2EA043',
      title: `${streak} jours consécutifs profitables`,
      body: 'Belle série ! Continuez à respecter votre plan.',
      action: '/monthly', actionLabel: 'Voir stats',
    })
  }

  // Discipline élevée
  const last5disc = trades.slice(0, 5).filter(t => t.discipline_score != null)
  if (last5disc.length >= 3) {
    const avgDisc = last5disc.reduce((a, t) => a + t.discipline_score, 0) / last5disc.length
    if (avgDisc >= 8) notifs.push({
      id: 'discipline_high', priority: 'success', icon: 'award', color: '#2EA043',
      title: `Discipline ${avgDisc.toFixed(1)}/10 sur 5 trades`,
      body: 'Score de discipline excellent ! Votre rigueur paie.',
    })
  }

  // RR excellent
  if (last10.length >= 5) {
    const tpTrades = last10.filter(t => t.result === 'tp' && t.rr_won != null)
    if (tpTrades.length >= 3) {
      const avgRR = tpTrades.reduce((a, t) => a + t.rr_won, 0) / tpTrades.length
      if (avgRR >= 2.5) notifs.push({
        id: 'rr_excellent', priority: 'success', icon: 'fire', color: '#2EA043',
        title: `RR moyen de ${avgRR.toFixed(2)} sur 10 trades`,
        body: 'Excellent ratio risque/récompense ! Vous gérez parfaitement vos sorties.',
        action: '/monthly', actionLabel: 'Voir stats',
      })
    }
  }

  // ── 🔵 INFO ────────────────────────────────────────────

  // Trades sans After Trade
  if (trades.length > 0) {
    const noHindsight = trades.slice(0, 10).filter(t => !t.hindsight?.length)
    if (noHindsight.length >= 3) notifs.push({
      id: 'no_hindsight', priority: 'info', icon: 'book', color: '#58a6ff',
      title: `${noHindsight.length} trades sans After Trade`,
      body: "L'analyse post-trade est essentielle pour progresser.",
      action: '/hindsights', actionLabel: 'Ajouter',
    })
  }

  // Trades aujourd'hui
  if (trades.length > 0) {
    const todayTrades = trades.filter(t => t.date === today)
    if (todayTrades.length > 0) {
      const wins = todayTrades.filter(t => t.result === 'tp').length
      const profit = todayTrades.reduce((acc, t) => {
        if (t.result === 'tp') return acc + (t.rr_won || 0)
        if (t.result === 'sl') return acc - 1
        return acc
      }, 0)
      notifs.push({
        id: 'today', priority: 'info', icon: 'chart', color: '#58a6ff',
        title: `${todayTrades.length} trade${todayTrades.length > 1 ? 's' : ''} aujourd'hui`,
        body: `${wins} TP · ${todayTrades.length - wins} autres · P&L : ${profit >= 0 ? '+' : ''}${profit.toFixed(1)}R`,
        action: '/trades', actionLabel: 'Voir',
      })
    }
  }

  // Résumé hebdomadaire — le lundi
  if (todayDate.getDay() === 1 && trades.length > 0) {
    const oneWeekAgo = new Date(todayDate)
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const weekISO = oneWeekAgo.toISOString().slice(0, 10)
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
        action: '/monthly', actionLabel: 'Voir stats',
      })
    }
  }

  // Backtest gap — 2+ jours sans session
  if (lastBacktestDate) {
    const diffDays = Math.floor((todayDate - new Date(lastBacktestDate)) / (1000 * 60 * 60 * 24))
    if (diffDays >= 2) notifs.push({
      id: 'backtest_gap', priority: 'info', icon: 'clock', color: '#8B949E',
      title: `${diffDays} jours sans backtest`,
      body: 'Reprenez votre session de backtest pour maintenir votre progression.',
      action: '/rules', actionLabel: 'Backtest',
    })
  }

  // Pas de forecast cette semaine
  if (!hasWeeklyForecast) notifs.push({
    id: 'no_forecast', priority: 'info', icon: 'chart', color: '#58a6ff',
    title: 'Pas de prévision cette semaine',
    body: 'Préparez votre analyse hebdomadaire avant de trader.',
    action: '/weekly-forecast', actionLabel: 'Créer',
  })

  // Inactivité
  if (trades.length > 0) {
    const diffDays = Math.floor((todayDate - new Date(trades[0].date)) / (1000 * 60 * 60 * 24))
    if (diffDays >= 5) notifs.push({
      id: 'inactive', priority: 'info', icon: 'clock', color: '#8B949E',
      title: `${diffDays} jours sans trade`,
      body: "N'oubliez pas de journaliser vos positions.",
      action: '/trades/new', actionLabel: 'Ajouter',
    })
  }

  const order = { urgent: 0, warning: 1, success: 2, info: 3 }
  return notifs.sort((a, b) => order[a.priority] - order[b.priority])
}

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
  urgent:  { label: 'Urgent',  bg: 'rgba(248,81,73,0.15)',  color: '#F85149' },
  warning: { label: 'Alerte',  bg: 'rgba(247,183,49,0.15)', color: '#F7B731' },
  success: { label: 'Succès',  bg: 'rgba(46,160,67,0.15)',  color: '#2EA043' },
  info:    { label: 'Info',    bg: 'rgba(88,166,255,0.15)', color: '#58a6ff' },
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
function NotifBell({ onClick, count, urgentCount }) {
  return (
    <button onClick={onClick}
      className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95 hover:bg-white/5"
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <Bell size={15} className={urgentCount > 0 ? 'text-forge-red' : 'text-forge-muted'} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center"
          style={{
            background: urgentCount > 0 ? '#F85149' : '#F7B731',
            color: '#070A0F',
            boxShadow: urgentCount > 0 ? '0 0 6px rgba(248,81,73,0.7)' : '0 0 6px rgba(247,183,49,0.7)',
          }}>
          {count}
        </span>
      )}
    </button>
  )
}

// ── Notifications panel ───────────────────────────────────────
function NotifPanel({ onClose, notifications, onRead, onDismiss, onDismissAll, anchor, navigate }) {
  const posStyle = anchor === 'top-right'
    ? { top: '56px', right: '16px' }
    : { top: 'calc(env(safe-area-inset-top) + 56px)', right: '16px' }

  const unread = notifications.filter(n => !n.read)
  const read   = notifications.filter(n => n.read)

  const handleAction = (n) => {
    if (n.action) { navigate(n.action); onClose() }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed z-50 rounded-2xl border overflow-hidden"
        style={{
          ...posStyle,
          width: '320px',
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
                <Trash2 size={11} /> Effacer
              </button>
            )}
            <button onClick={onClose} className="text-forge-muted hover:text-white transition-colors ml-1">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="max-h-[480px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Bell size={16} className="text-forge-muted opacity-40" />
              </div>
              <p className="text-xs text-forge-muted">Tout est calme</p>
              <p className="text-[10px] text-forge-muted/50 mt-1">Les alertes apparaîtront ici</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {unread.length > 0 && (
                <>
                  <p className="text-[9px] text-forge-muted uppercase tracking-widest px-1 pt-1">Nouvelles</p>
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
                            <p className="text-xs font-semibold text-white leading-tight">{n.title}</p>
                            {(n.priority === 'urgent' || n.priority === 'warning') && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: prio.bg, color: prio.color }}>
                                {prio.label}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-forge-muted leading-relaxed mb-2">{n.body}</p>
                          {n.action && (
                            <button onClick={() => handleAction(n)}
                              className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-lg transition-all active:scale-95"
                              style={{ background: `${n.color}18`, color: n.color, border: `1px solid ${n.color}30` }}>
                              {n.actionLabel} <ChevronRight size={10} />
                            </button>
                          )}
                        </div>
                        <button onClick={() => onDismiss(n.id)}
                          className="opacity-0 group-hover:opacity-100 text-forge-muted hover:text-white transition-all flex-shrink-0 mt-0.5">
                          <X size={12} />
                        </button>
                      </div>
                    )
                  })}
                </>
              )}

              {read.length > 0 && (
                <>
                  <p className="text-[9px] text-forge-muted uppercase tracking-widest px-1 pt-2">Déjà lues</p>
                  {read.map(n => (
                    <div key={n.id} className="group flex items-start gap-3 p-3 rounded-xl opacity-40 hover:opacity-60 transition-all"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <NotifIcon type={n.icon} color="#8B949E" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-forge-muted leading-tight">{n.title}</p>
                        <p className="text-[10px] text-forge-muted/60 mt-0.5">{n.body}</p>
                      </div>
                      <button onClick={() => onDismiss(n.id)}
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
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(() => {
  return localStorage.getItem('sidebar_open') !== 'false'
})

useEffect(() => {
  localStorage.setItem('sidebar_open', sidebarOpen)
}, [sidebarOpen])

  const [showMenu, setShowMenu]                   = useState(false)
  const [showNotif, setShowNotif]                 = useState(false)
  const [showUserPopup, setShowUserPopup]         = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [userPopupAnchor, setUserPopupAnchor]     = useState('desktop')
  const [notifAnchor, setNotifAnchor]             = useState('mobile')
  const [backtestDone, setBacktestDone]           = useState(false)
  const [backtestHours, setBacktestHours]         = useState(null)
  const [lastBacktestDate, setLastBacktestDate] = useState(null)
  const [hasWeeklyForecast, setHasWeeklyForecast] = useState(true)

  const [readIds, setReadIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tf_read_notifs') || '[]') } catch { return [] }
  })

  const [dismissedIds, setDismissedIds] = useState(() => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const saved = JSON.parse(localStorage.getItem('tf_dismissed_notifs') || '{}')
    // Si la date sauvegardée n'est pas aujourd'hui, reset
    if (saved.date !== today) return []
    return saved.ids || []
  } catch { return [] }
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

  // Charger le backtest actuel
useEffect(() => {
  if (!user) return
  const load = async () => {
    // Backtest cycle actuel
    const { data } = await supabase
      .from('backtest_cycles')
      .select('*, backtest_sessions(*)')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .single()
    if (data) {
      const totalMin = (data.backtest_sessions || []).reduce((a, s) => a + s.minutes, 0)
      const goalMin  = data.goal_hours * 60
      if (totalMin >= goalMin) {
        setBacktestDone(true)
        setBacktestHours(data.goal_hours)
      }
    }

    // Dernière session backtest
    const { data: lastSession } = await supabase
      .from('backtest_sessions')
      .select('date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)
      .single()
    if (lastSession) setLastBacktestDate(lastSession.date)

    // Forecast semaine en cours
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
    const weekISO = weekStart.toISOString().slice(0, 10)
    const { data: forecast } = await supabase
  .from('weekly_forecasts')
  .select('id')
  .eq('user_id', user.id)
  .eq('week_start', weekISO)
  .maybeSingle()
setHasWeeklyForecast(!!forecast)
  }
  load()
}, [user?.id])

// Notifications push automatiques
useEffect(() => {
  if (!user || !trades.length) return

  const sentKey = `tf_sent_notifs_${new Date().toISOString().slice(0, 10)}`
  const sent = JSON.parse(localStorage.getItem(sentKey) || '[]')

  const sendPush = async (id, title, body, url = '/') => {
    if (sent.includes(id)) return
    try {
      await fetch('https://trade-forge-mu.vercel.app/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, title, body, url })
      })
    } catch (e) {
      // Silently ignore — API may not be available
    }
    const next = [...sent, id]
    localStorage.setItem(sentKey, JSON.stringify(next))
    sent.push(id)
  }

  const last5 = trades.slice(0, 5)
  const last3 = trades.slice(0, 3)
  const last10 = trades.slice(0, 10)

  const slStreak = last5.filter(t => t.result === 'sl').length
  if (slStreak >= 3)
    sendPush('sl_streak', '⚠️ 3 pertes consécutives', 'Arrêtez de trader. Revoyez votre plan.', '/trades')

  const horsSession = last3.filter(t => t.session === 'Hors session').length
  if (horsSession >= 2)
    sendPush('hors_session', '⚠️ Trades hors session', 'Vous tradez en dehors des sessions optimales.', '/rules')

  const lowDisc = last5.filter(t => t.discipline_score != null && t.discipline_score <= 4)
  if (lowDisc.length >= 2)
    sendPush('low_disc', '📉 Discipline en baisse', 'Score moyen faible sur vos derniers trades.', '/rules')

  const noplan = last5.filter(t => t.respect_plan === false).length
  if (noplan >= 3)
    sendPush('no_plan', '❌ Plan non respecté', 'Relisez vos règles avant chaque trade.', '/rules')

  const revenge = last5.filter(t => t.emotion === 'Revenge').length
  if (revenge >= 2)
    sendPush('revenge', '😤 Revenge trading', 'Détecté sur vos derniers trades. Faites une pause.', '/trades')

  if (last10.length >= 5) {
    const wr = Math.round((last10.filter(t => t.result === 'tp').length / last10.length) * 100)
    if (wr >= 65)
      sendPush('wr_good', '🔥 Excellent win rate', `${wr}% sur vos 10 derniers trades !`, '/monthly')
  }

  const respectStreak = trades.slice(0, 7).filter(t => t.respect_plan === true).length
  if (respectStreak >= 5)
    sendPush('respect_streak', '✅ Super discipline', `${respectStreak} trades avec plan respecté !`, '/rules')

  const noHindsight = trades.slice(0, 10).filter(t => !t.hindsight?.length).length
  if (noHindsight >= 3)
    sendPush('no_hindsight', '📝 After Trade manquant', `${noHindsight} trades sans analyse post-trade.`, '/hindsights')

  if (backtestDone && backtestHours)
    sendPush('backtest_done', '🎯 Objectif backtest atteint', `${backtestHours}h complétées ! Lancez un nouveau cycle.`, '/rules')

  const diffDays = Math.floor((new Date() - new Date(trades[0].date)) / (1000 * 60 * 60 * 24))
  if (diffDays >= 5)
    sendPush('inactive', '💤 Inactivité détectée', `${diffDays} jours sans trade journalisé.`, '/trades/new')

}, [trades, user, backtestDone, backtestHours])

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

  const unreadCount  = notifications.filter(n => !n.read).length
  const urgentCount  = notifications.filter(n => !n.read && n.priority === 'urgent').length

  const markAllRead = () => {
    const ids = allNotifs.map(n => n.id)
    setReadIds(ids)
    localStorage.setItem('tf_read_notifs', JSON.stringify(ids))
  }

  const dismissNotif = (id) => {
  const next = [...dismissedIds, id]
  setDismissedIds(next)
  const today = new Date().toISOString().slice(0, 10)
  localStorage.setItem('tf_dismissed_notifs', JSON.stringify({ date: today, ids: next }))
}

  const dismissAll = () => {
  const ids = allNotifs.map(n => n.id)
  setDismissedIds(ids)
  const today = new Date().toISOString().slice(0, 10)
  localStorage.setItem('tf_dismissed_notifs', JSON.stringify({ date: today, ids }))
}

  const handleBell = (anchor) => {
    setNotifAnchor(anchor)
    setShowNotif(v => !v)
  }

  const handleLogoutConfirmed = () => { setShowLogoutConfirm(false); signOut?.() }
  const displayName = profile?.username || profile?.full_name || 'Trader'
  const contentRef = useRef(null)

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

  return (
    <div className="min-h-screen">

      {/* Cloche desktop — visible seulement si sidebar fermée */}
<div className="hidden lg:flex fixed top-4 right-4 z-50">
  <NotifBell onClick={() => handleBell('top-right')} count={unreadCount} urgentCount={urgentCount} />
</div>

{/* Sidebar desktop */}
<aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col transition-all duration-300"
  style={{
    width: sidebarOpen ? '224px' : '64px',
    background: 'rgba(10,14,20,0.85)',
    backdropFilter: 'blur(20px)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
  }}>

{/* Logo + toggle */}
<div className="px-3 py-5 mb-2 flex items-center justify-between overflow-hidden">
{sidebarOpen && (
  <div>
    <span className="font-mono text-lg font-semibold tracking-tight whitespace-nowrap">
      <span className="text-forge-accent">TRADE</span><span className="text-white">FORGE</span>
    </span>
    <p className="text-[10px] text-forge-muted mt-0.5 font-mono">Journal avancé</p>
  </div>
)}
  <button onClick={() => setSidebarOpen(v => !v)}
      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:bg-white/5"
      style={{ border: '1px solid rgba(255,255,255,0.08)', marginLeft: sidebarOpen ? '0' : 'auto' }}>
      {sidebarOpen
        ? <ChevronLeft size={13} className="text-forge-muted" />
        : <ChevronRight size={13} className="text-forge-muted" />
      }
    </button>
  </div>

  {/* Bouton Nouveau */}
  <div className="px-3 mb-4">
    {sidebarOpen ? (
      <button onClick={() => setShowMenu(v => !v)} className="btn-primary w-full flex items-center justify-center gap-2">
        <Plus size={15} /> Nouveau
      </button>
    ) : (
      <button onClick={() => setShowMenu(v => !v)}
        className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all active:scale-95"
        style={{ background: '#F7B731', color: '#070A0F', boxShadow: '0 0 16px rgba(247,183,49,0.35)' }}>
        <Plus size={18} strokeWidth={2.5} />
      </button>
    )}
  </div>

  {/* Nav */}
  <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
    {navItems.map(({ to, icon: Icon, label }) => (
      <NavLink key={to} to={to}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium overflow-hidden ${
            isActive
              ? 'text-forge-accent bg-forge-accent/10 border border-forge-accent/20'
              : 'text-forge-muted hover:text-white hover:bg-white/5'
          }`}
        title={!sidebarOpen ? label : undefined}>
        <Icon size={16} strokeWidth={1.5} className="flex-shrink-0" />
        {sidebarOpen && <span className="truncate">{label}</span>}
      </NavLink>
    ))}
  </nav>

  {/* User */}
  <div className="px-3 pb-5 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
    {sidebarOpen ? (
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
    ) : (
      <div className="flex flex-col items-center gap-2">
  <Avatar user={user} profile={profile} size="sm"
    onClick={() => { setUserPopupAnchor('desktop'); setShowUserPopup(v => !v) }} />
</div>
    )}
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
            <NotifBell onClick={() => handleBell('mobile')} count={unreadCount} urgentCount={urgentCount} />
            <Avatar user={user} profile={profile} size="sm"
              onClick={() => { setUserPopupAnchor('mobile'); setShowUserPopup(v => !v) }} />
          </div>
        </div>
      </div>

{/* Header desktop — visible seulement si sidebar fermée */}
{!sidebarOpen && (
  <div className="hidden lg:flex fixed top-0 left-16 right-0 h-14 z-30 items-center justify-center"
    style={{ background: 'rgba(10,14,20,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
    <span className="font-mono text-lg font-bold tracking-tight">
      <span className="text-forge-accent">TRADE</span><span className="text-white">FORGE</span>
    </span>
  </div>
)}


{/* Content */}
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
          navigate={navigate}
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