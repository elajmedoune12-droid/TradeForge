import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Sparkles, Send, Loader2, ChevronDown, RefreshCw, TrendingUp, Brain, Target, AlertTriangle } from 'lucide-react'
import { useTrades } from '../hooks/useTrades'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/supabase'

// ── Markdown renderer ──────────────────────────────────────
function renderMarkdown(text) {
  const lines = text.split('\n')
  const elements = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
      const items = []
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('• '))) {
        items.push(lines[i].trim().replace(/^[-•]\s/, ''))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1 my-1.5">
          {items.map((item, j) => (
            <li key={j} className="flex gap-1.5 text-sm leading-relaxed">
              <span style={{ color: '#F7B731', flexShrink: 0 }}>·</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }
    if (line.trim() === '') { elements.push(<div key={`br-${i}`} className="h-1.5" />); i++; continue }
    elements.push(<p key={`p-${i}`} className="text-sm leading-relaxed">{renderInline(line)}</p>)
    i++
  }
  return elements
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} style={{ color: '#F7B731' }}>{part.slice(2, -2)}</strong>
    return <span key={i}>{part}</span>
  })
}

// ── Suggestions ────────────────────────────────────────────
function getSuggestions(trade) {
  if (!trade) return [
    'Analyse mes performances globales',
    'Quelles sont mes erreurs récurrentes ?',
    'Comment améliorer mon win rate ?',
    'Dans quelle session je performe le mieux ?',
  ]
  if (trade._rulesContext) return [
    'Analyse mes règles et mon taux de respect',
    'Quelles règles je viole le plus souvent ?',
    'Comment renforcer ma discipline ?',
    'Suggère-moi de nouvelles règles selon mes trades',
  ]
  if (trade._monthlyContext) return [
    'Analyse mes performances ce mois',
    'Quels sont mes points forts ce mois ?',
    'Comment améliorer mon win rate le mois prochain ?',
    'Analyse ma discipline et mes émotions ce mois',
  ]
  if (trade._backtestContext) return [
    'Évalue ma progression en backtest',
    'Combien d\'heures par semaine me conseilles-tu ?',
    'Comment optimiser mes sessions de backtest ?',
    'Quel objectif d\'heures viser pour progresser ?',
  ]

  const suggestions = ['Analyse ce trade en détail']
  if (trade.result === 'sl') {
    suggestions.push('Pourquoi ce SL ? Comment l\'éviter ?')
    if (trade.emotion && trade.emotion !== 'Neutre')
      suggestions.push(`Impact de mon état "${trade.emotion}" sur ce trade`)
  } else if (trade.result === 'tp') {
    suggestions.push('Qu\'est-ce que j\'ai bien fait ?')
    suggestions.push('Comment répliquer ce setup ?')
  } else if (trade.result === 'be') {
    suggestions.push('Aurais-je dû laisser courir ce trade ?')
  }
  if (!trade.respect_plan) suggestions.push('Impact du non-respect de mon plan')
  if (trade.discipline_score && trade.discipline_score <= 5) suggestions.push('Comment améliorer ma discipline ?')

  // Hindsight disponible
  const h = Array.isArray(trade.hindsight) ? trade.hindsight[0] : trade.hindsight
  if (h?.main_error) suggestions.push(`Approfondis l'erreur : "${h.main_error}"`)

  return suggestions.slice(0, 4)
}

// ── Message ────────────────────────────────────────────────
function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'rgba(247,183,49,0.15)', border: '1px solid rgba(247,183,49,0.3)' }}>
          <Sparkles size={13} className="text-forge-accent" />
        </div>
      )}
      <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5"
        style={isUser
          ? { background: 'rgba(247,183,49,0.12)', border: '1px solid rgba(247,183,49,0.25)', color: '#E6EDF3' }
          : { background: 'rgba(22,27,34,0.95)', border: '1px solid rgba(33,38,45,0.9)', color: '#E6EDF3' }
        }>
        {isUser
          ? <p className="text-sm leading-relaxed">{msg.content}</p>
          : <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>
        }
      </div>
    </div>
  )
}

function StatPill({ icon: Icon, label, value, color = '#8B949E' }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <Icon size={11} style={{ color }} />
      <div>
        <p className="text-[9px] text-forge-muted leading-none">{label}</p>
        <p className="text-xs font-medium leading-none mt-0.5" style={{ color }}>{value}</p>
      </div>
    </div>
  )
}

// ── Construit le system prompt enrichi ────────────────────
function buildSystemPrompt(trade, trades, displayName) {
  const userRef = displayName ? `L'utilisateur s'appelle ${displayName}. Adressez-vous à lui par son prénom naturellement.` : ''

  // Stats globales
  let globalContext = ''
  if (trades?.length) {
    const total  = trades.length
    const wins   = trades.filter(t => t.result === 'tp').length
    const wr     = Math.round((wins / total) * 100)
    const profit = trades.reduce((acc, t) => {
      if (t.result === 'tp') return acc + (t.rr_won || 0)
      if (t.result === 'sl') return acc - 1
      return acc
    }, 0).toFixed(2)
    const avgDisc = trades.filter(t => t.discipline_score).length
      ? Math.round(trades.reduce((a, t) => a + (t.discipline_score || 0), 0) / trades.filter(t => t.discipline_score).length)
      : 0
    const violations = trades.filter(t => t.respect_plan === false).length

    // Top émotions sur SL
    const emotionMap = {}
    trades.filter(t => t.result === 'sl' && t.emotion).forEach(t => {
      emotionMap[t.emotion] = (emotionMap[t.emotion] || 0) + 1
    })
    const topEmotions = Object.entries(emotionMap).sort((a,b) => b[1]-a[1]).slice(0,3).map(([e,c]) => `${e}(${c}x)`).join(', ')

    // Erreurs hindsight récurrentes
    const errorMap = {}
    trades.forEach(t => {
      const h = Array.isArray(t.hindsight) ? t.hindsight[0] : t.hindsight
      if (h?.main_error) errorMap[h.main_error] = (errorMap[h.main_error] || 0) + 1
    })
    const topErrors = Object.entries(errorMap).sort((a,b) => b[1]-a[1]).slice(0,3).map(([e,c]) => `"${e}"(${c}x)`).join(', ')

    globalContext = `\n\n=== STATISTIQUES GLOBALES ===
Total trades : ${total} | Win Rate : ${wr}% | Profit cumulé : ${profit}R
Discipline moyenne : ${avgDisc}/10 | Violations du plan : ${violations}
${topEmotions ? `Émotions sur SL : ${topEmotions}` : ''}
${topErrors ? `Erreurs hindsight récurrentes : ${topErrors}` : ''}`
  }

  // Contexte Règles
  if (trade?._rulesContext) {
    return `Vous êtes TradeForge Coach, un coach trading professionnel expert. ${userRef}
${globalContext}

=== RÈGLES DE TRADING ===
Taux de respect du plan : ${trade._respectRate}%
Violations détectées : ${trade._violationCount}
Règles actives :
${trade._rules?.map((r, i) => `${i+1}. ${r}`).join('\n') || 'Aucune.'}

INSTRUCTIONS : Français, vouvoiement, ton professionnel. Réponses structurées et actionnables. Basez-vous sur les données réelles.`
  }

  // Contexte Mensuel
  if (trade?._monthlyContext) {
    const s = trade._stats
    const g = trade._goal
    return `Vous êtes TradeForge Coach, un coach trading professionnel expert. ${userRef}
${globalContext}

=== ANALYSE MENSUELLE : ${trade.market} ===
Trades : ${s?.total || 0} | Win Rate : ${s?.winRate || 0}% | Profit : ${s?.profit || 0}R
TP : ${s?.tp || 0} | SL : ${s?.sl || 0} | BE : ${s?.be || 0} | Missed : ${s?.missed || 0}
Discipline moyenne : ${trade.discipline_score}/10
${g ? `Objectifs : ${g.goal_trades ? `${g.goal_trades} trades` : ''} ${g.goal_winrate ? `/ ${g.goal_winrate}% WR` : ''} ${g.goal_profit ? `/ ${g.goal_profit}R` : ''} ${g.goal_discipline ? `/ disc ${g.goal_discipline}/10` : ''}` : 'Aucun objectif défini.'}

INSTRUCTIONS : Français, vouvoiement, ton professionnel. Structuré et actionnable.`
  }

  // Contexte Backtest
  if (trade?._backtestContext) {
    return `Vous êtes TradeForge Coach, un coach trading professionnel expert. ${userRef}
${globalContext}

=== SUIVI BACKTEST ===
Objectif du cycle : ${trade._goalHours}h
Heures effectuées : ${trade._doneHours}h (${trade._progress}%)
Heures restantes : ${trade._leftHours}h
Nombre de cycles : ${trade._cycleCount}
Sessions récentes : ${trade._recentSessions || 'Aucune'}

INSTRUCTIONS : Français, vouvoiement, encourageant mais exigeant. Conseils concrets sur le backtest.`
  }

  // Contexte Trade individuel
  if (trade && trade.market) {
    // Hindsight / After Trade
    const h = Array.isArray(trade.hindsight) ? trade.hindsight[0] : trade.hindsight
    const hindsightContext = h?.main_error ? `
=== AFTER TRADE (Hindsight) ===
Erreur principale : ${h.main_error}
Leçon tirée : ${h.lesson || '—'}
Règle à appliquer : ${h.rule || '—'}
${h.notes ? `Notes : ${h.notes}` : ''}
${h.tags?.length ? `Tags : ${h.tags.join(', ')}` : ''}` : '\n(Aucun After Trade rempli pour ce trade.)'

    return `Vous êtes TradeForge Coach, un coach trading professionnel expert. ${userRef}
${globalContext}

=== TRADE ANALYSÉ ===
Marché : ${trade.market} | Direction : ${trade.type?.toUpperCase()} | Date : ${trade.date}
Résultat : ${trade.result?.toUpperCase()} | RR prévu : ${trade.rr_planned ?? '—'}R | RR réalisé : ${trade.rr_won ?? '—'}R
Session : ${trade.session || '—'} | Jour : ${trade.day || '—'} | Style : ${trade.style || '—'}
Tendance : ${trade.trend || '—'} | Structure : ${trade.market_structure || '—'}
Émotion : ${trade.emotion || '—'} | Discipline : ${trade.discipline_score ?? '—'}/10
Plan respecté : ${trade.respect_plan ? 'Oui' : 'Non'}
${trade.notes ? `Notes trader : ${trade.notes}` : ''}
${hindsightContext}

INSTRUCTIONS : Français, vouvoiement, concis (4-6 phrases), basé sur les données réelles. Utilisez l'After Trade pour approfondir l'analyse.`
  }

  // Contexte global (dashboard)
  return `Vous êtes TradeForge Coach, un coach trading professionnel expert. ${userRef}
${globalContext}

INSTRUCTIONS : Français, vouvoiement, structuré et actionnable. Évitez les généralités. Basez-vous sur les statistiques réelles.`
}

// ── Bienvenue ──────────────────────────────────────────────
function buildWelcome(trade, trades, displayName) {
  const greeting = displayName ? `Bonjour **${displayName}**` : 'Bonjour'
  const globalStats = trades.length > 0 ? {
    total: trades.length,
    winRate: Math.round((trades.filter(t => t.result === 'tp').length / trades.length) * 100),
    profit: +(trades.reduce((acc, t) => {
      if (t.result === 'tp') return acc + (t.rr_won || 0)
      if (t.result === 'sl') return acc - 1
      return acc
    }, 0)).toFixed(2),
  } : null

  if (trade?._backtestContext) {
    const done = trade._progress >= 100
    return `${greeting} — je vais analyser votre progression en **backtest**.\n\n` +
      `**Cycle en cours :** ${trade._doneHours}h / ${trade._goalHours}h (**${trade._progress}%**)\n` +
      `${done ? '🎉 Objectif atteint ! Prêt pour un nouveau cycle ?' : `**Restant :** ${trade._leftHours}h`}\n\n` +
      `Comment puis-je vous aider à optimiser vos sessions de backtest ?`
  }

  if (trade?._rulesContext) {
    const rulesList = trade._rules?.length > 0
      ? trade._rules.map((r, i) => `${i + 1}. ${r}`).join('\n') : 'Aucune règle active.'
    return `${greeting} — je suis votre **Coach Trading TradeForge**.\n\n` +
      `J'ai analysé vos **${trade._rules?.length || 0} règles actives**. Taux de respect : **${trade._respectRate}%** avec **${trade._violationCount} violation${trade._violationCount !== 1 ? 's' : ''}**.\n\n` +
      `**Vos règles :**\n${rulesList}\n\nQue souhaitez-vous explorer ?`
  }

  if (trade?._monthlyContext) {
    const s = trade._stats
    if (s && s.total > 0) {
      const perf = s.winRate >= 60 ? 'excellente' : s.winRate >= 50 ? 'satisfaisante' : 'perfectible'
      return `${greeting} — voici mon analyse de **${trade.market}**.\n\n` +
        `**${s.total} trades** ce mois, performance ${perf} : **${s.winRate}% win rate**, P&L **${s.profit >= 0 ? '+' : ''}${s.profit}R**.\n\n` +
        `Comment puis-je vous aider à tirer les enseignements de ce mois ?`
    }
    return `${greeting}.\n\nAucun trade ce mois-ci. Profitez-en pour revoir votre plan ou définir vos objectifs.`
  }

  if (trade && trade.market) {
    const h = Array.isArray(trade.hindsight) ? trade.hindsight[0] : trade.hindsight
    const resultMap = {
      tp: '✅ Take Profit', sl: '❌ Stop Loss', be: '⚖️ Breakeven', missed: '👁️ Missed',
    }
    let msg = `${greeting} — analysons votre trade **${trade.type?.toUpperCase()} ${trade.market}**.\n\n`
    msg += `**Résultat :** ${resultMap[trade.result] || trade.result}  \n`
    if (trade.rr_planned) msg += `**RR prévu / réalisé :** ${trade.rr_planned}R / ${trade.rr_won != null ? trade.rr_won + 'R' : '—'}  \n`
    if (trade.session) msg += `**Session :** ${trade.session}  \n`
    if (trade.discipline_score) msg += `**Discipline :** ${trade.discipline_score}/10\n`

    if (h?.main_error) {
      msg += `\n**After Trade rempli :**\n- Erreur : ${h.main_error}\n- Leçon : ${h.lesson || '—'}\n- Règle : ${h.rule || '—'}\n`
    }

    const issues = []
    if (!trade.respect_plan) issues.push('plan non respecté')
    if (trade.session === 'Hors session') issues.push('trade hors session')
    if (trade.discipline_score && trade.discipline_score <= 4) issues.push(`discipline faible (${trade.discipline_score}/10)`)
    if (trade.emotion === 'FOMO' || trade.emotion === 'Revenge') issues.push(`état ${trade.emotion}`)
    if (issues.length > 0) msg += `\n**Points d'attention :** ${issues.join(', ')}\n`

    msg += `\nQue souhaitez-vous approfondir ?`
    return msg
  }

  if (globalStats) {
    const perf = globalStats.winRate >= 60 ? 'solide' : globalStats.winRate >= 50 ? 'dans la moyenne' : 'à améliorer'
    return `${greeting} — je suis votre **Coach Trading TradeForge**.\n\n` +
      `**${globalStats.total} trades** enregistrés. Win rate : **${globalStats.winRate}%** (${perf}). Profit cumulé : **${globalStats.profit >= 0 ? '+' : ''}${globalStats.profit}R**.\n\n` +
      `Par où souhaitez-vous commencer ?`
  }

  return `${greeting} — je suis votre **Coach Trading TradeForge**.\n\nVotre journal est encore vide. Commencez par enregistrer vos premiers trades pour que je puisse analyser votre performance.\n\nN'hésitez pas à me poser des questions sur votre stratégie.`
}

// ── Main ───────────────────────────────────────────────────
export default function AIAssistant({ trade, onClose }) {
  const { trades } = useTrades()
  const { user }   = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const displayName = user?.user_metadata?.username || user?.user_metadata?.full_name || null

  const globalStats = trades.length > 0 ? {
    total: trades.length,
    winRate: Math.round((trades.filter(t => t.result === 'tp').length / trades.length) * 100),
    profit: +(trades.reduce((acc, t) => {
      if (t.result === 'tp') return acc + (t.rr_won || 0)
      if (t.result === 'sl') return acc - 1
      return acc
    }, 0)).toFixed(2),
  } : null

  useEffect(() => {
    const welcome = buildWelcome(trade, trades, displayName)
    setMessages([{ role: 'assistant', content: welcome }])
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(async (text) => {
    const userText = (text || input).trim()
    if (!userText || loading) return

    setInput('')
    setError(null)
    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const systemPrompt = buildSystemPrompt(trade, trades, displayName)

// PAR ça :
const res = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: newMessages.map(m => ({ role: m.role, content: m.content })),
    trade,
    allTrades: trades,
    userName: displayName,
  }),
})
if (!res.ok) throw new Error(`Erreur API ${res.status}`)
const data = await res.json()
const content = data.reply || ''

      setMessages(prev => [...prev, { role: 'assistant', content }])
    } catch (err) {
      setError(`Impossible de contacter le coach : ${err.message}`)
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, trade, trades, displayName])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const reset = () => {
    setMessages([])
    setError(null)
    setTimeout(() => {
      setMessages([{ role: 'assistant', content: buildWelcome(trade, trades, displayName) }])
    }, 100)
  }

  const suggestions = getSuggestions(trade)
  const showSuggestions = messages.length <= 1 && !loading

  const tradeStats = trade && !trade._rulesContext && !trade._monthlyContext && !trade._backtestContext ? [
    trade.result && { icon: Target, label: 'Résultat', value: trade.result.toUpperCase(), color: trade.result === 'tp' ? '#2EA043' : trade.result === 'sl' ? '#F85149' : '#58a6ff' },
    trade.rr_won != null && { icon: TrendingUp, label: 'RR Réalisé', value: `${trade.rr_won}R`, color: trade.rr_won > 0 ? '#2EA043' : '#F85149' },
    trade.discipline_score && { icon: Brain, label: 'Discipline', value: `${trade.discipline_score}/10`, color: trade.discipline_score >= 7 ? '#2EA043' : trade.discipline_score >= 5 ? '#F7B731' : '#F85149' },
    !trade.respect_plan && { icon: AlertTriangle, label: 'Plan', value: 'Non respecté', color: '#F85149' },
  ].filter(Boolean) : []

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(7,10,15,0.6)', backdropFilter: 'blur(6px)' }} onClick={onClose} />

      <div className="fixed left-0 right-0 bottom-0 z-50 flex flex-col rounded-t-3xl overflow-hidden"
        style={{ background: '#0D1117', border: '1px solid rgba(247,183,49,0.18)', borderBottom: 'none', maxHeight: '88vh', paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -24px 80px rgba(0,0,0,0.8)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(33,38,45,0.8)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(247,183,49,0.15)', border: '1px solid rgba(247,183,49,0.35)' }}>
              <Sparkles size={15} className="text-forge-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Coach Trading IA</p>
              <p className="text-[10px] text-forge-muted">
                {trade?._backtestContext ? 'Analyse Backtest'
                  : trade?._rulesContext ? 'Analyse des règles'
                  : trade?._monthlyContext ? trade.market
                  : trade?.market ? `${trade.market} · ${trade.type?.toUpperCase()} · ${trade.session || ''}`
                  : globalStats ? `${globalStats.total} trades · ${globalStats.winRate}% win rate`
                  : 'Analyse globale'
                }
                {displayName ? ` · ${displayName}` : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={reset}
              className="w-8 h-8 rounded-full flex items-center justify-center text-forge-muted hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              <RefreshCw size={13} />
            </button>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-forge-muted hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              <ChevronDown size={18} />
            </button>
          </div>
        </div>

        {/* Stats pills */}
        {tradeStats.length > 0 && (
          <div className="flex gap-2 px-4 py-2.5 overflow-x-auto flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(33,38,45,0.6)', scrollbarWidth: 'none' }}>
            {tradeStats.map((s, i) => (
              <StatPill key={i} icon={s.icon} label={s.label} value={s.value} color={s.color} />
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}

          {loading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(247,183,49,0.15)', border: '1px solid rgba(247,183,49,0.3)' }}>
                <Sparkles size={13} className="text-forge-accent" />
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl"
                style={{ background: 'rgba(22,27,34,0.9)', border: '1px solid rgba(33,38,45,0.8)' }}>
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-forge-accent"
                      style={{ animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />
                  ))}
                </div>
                <span className="text-xs text-forge-muted">Analyse en cours...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.2)', color: '#F85149' }}>
              <AlertTriangle size={12} /> {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {showSuggestions && (
          <div className="px-4 pb-2 flex-shrink-0">
            <p className="text-[10px] text-forge-muted mb-1.5 uppercase tracking-wider">Suggestions</p>
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {suggestions.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full transition-all active:scale-95"
                  style={{ background: 'rgba(247,183,49,0.07)', border: '1px solid rgba(247,183,49,0.2)', color: '#F7B731', whiteSpace: 'nowrap' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-3 pt-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(33,38,45,0.8)' }}>
          <div className="flex gap-2 items-end">
            <textarea ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Pose une question sur ce trade..."
              rows={1}
              className="flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm text-white placeholder-forge-muted outline-none"
              style={{ background: 'rgba(22,27,34,0.9)', border: '1px solid rgba(33,38,45,0.8)', maxHeight: '120px', lineHeight: '1.5' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
            />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-40"
              style={{ background: input.trim() && !loading ? '#F7B731' : 'rgba(247,183,49,0.12)', color: input.trim() && !loading ? '#0A0B0D' : 'rgba(247,183,49,0.4)' }}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
          <p className="text-[10px] text-forge-muted text-center mt-1.5">
            Entrée pour envoyer · Shift+Entrée pour nouvelle ligne
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  )
}