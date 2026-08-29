import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── STATS ──────────────────────────────────────────────

// Émotions réellement "négatives" (erreurs potentielles de psychologie)
const NEGATIVE_EMOTIONS = ['Anxieux', 'FOMO', 'Revenge', 'Impatient']

export const calcWinRate = (trades, beSetting) => {
  const be = beSetting || (typeof localStorage !== 'undefined'
    ? (localStorage.getItem('winrate_be_mode') || 'neutral')
    : 'neutral')
  const tp = trades.filter(t => t.result === 'tp').length
  const sl = trades.filter(t => t.result === 'sl').length
  const beCount = trades.filter(t => t.result === 'be').length

  if (be === 'win') {
    const denom = tp + sl + beCount
    return denom ? Math.round(((tp + beCount) / denom) * 100) : 0
  }
  if (be === 'loss') {
    const denom = tp + sl + beCount
    return denom ? Math.round((tp / denom) * 100) : 0
  }
  // neutre : BE ignoré des deux côtés
  const denom = tp + sl
  return denom ? Math.round((tp / denom) * 100) : 0
}

export const calcAvgRR = (trades) => {
  const withRR = trades.filter(t => t.rr_won != null && t.rr_won > 0)
  if (!withRR.length) return 0
  const sum = withRR.reduce((acc, t) => acc + t.rr_won, 0)
  return +(sum / withRR.length).toFixed(2)
}

// TP → rr_won, SL → rr_won si renseigné sinon -1 (plafonné à -1 max), BE/Missed → 0
export const calcPnl = (trade) => {
  if (trade.result === 'tp') return trade.rr_won || 0
  if (trade.result === 'sl') return trade.rr_won != null ? Math.min(trade.rr_won, -1) : -1
  if (trade.result === 'manual_exit') return trade.rr_won != null ? trade.rr_won : 0
  return 0 // BE et Missed
}

export const calcTotalProfit = (trades) => {
  return trades.reduce((acc, t) => acc + calcPnl(t), 0)
}

export const calcDisciplineScore = (trades) => {
  if (!trades.length) return 0
  const scores = trades.filter(t => t.discipline_score != null)
  if (!scores.length) return 0
  const sum = scores.reduce((acc, t) => acc + t.discipline_score, 0)
  return Math.round(sum / scores.length)
}

export const getMonthlyStats = (trades, year, month) => {
  const start = startOfMonth(new Date(year, month - 1))
  const end = endOfMonth(new Date(year, month - 1))
  const monthly = trades.filter(t => {
    const d = parseISO(t.date)
    return isWithinInterval(d, { start, end })
  })
  const tp     = monthly.filter(t => t.result === 'tp').length
  const sl     = monthly.filter(t => t.result === 'sl').length
  const be     = monthly.filter(t => t.result === 'be').length
  const missed = monthly.filter(t => t.result === 'missed').length
  const active = tp + sl + be
  return {
    total: monthly.length,
    tp, sl, be, missed,
    winRate: active ? calcWinRate(monthly) : 0,
    avgRR: calcAvgRR(monthly),
    profit: +calcTotalProfit(monthly).toFixed(2),
    trades: monthly,
  }
}

export const getTopErrors = (trades) => {
  const errorMap = {}
  trades.forEach(t => {
    // Ne compte que les émotions réellement à risque (pas Neutre/Confiant/Euphorique)
    if (t.emotion && NEGATIVE_EMOTIONS.includes(t.emotion)) {
      errorMap[t.emotion] = (errorMap[t.emotion] || 0) + 1
    }
  })
  return Object.entries(errorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }))
}

// ─── AI / PATTERN DETECTION ─────────────────────────────

export const detectPatterns = (trades) => {
  const patterns = []

  const lowDiscipline = trades.filter(t => t.discipline_score != null && t.discipline_score <= 5)
  const lowDisciplineLosses = lowDiscipline.filter(t => t.result === 'sl').length
  if (lowDiscipline.length >= 3) {
    const ratio = Math.round((lowDisciplineLosses / lowDiscipline.length) * 100)
    if (ratio >= 60) {
      patterns.push({
        type: 'warning',
        title: 'Discipline faible = pertes',
        desc: `${ratio}% de tes trades avec discipline ≤5 sont des pertes. Améliore ta préparation.`,
      })
    }
  }

  const respectPlan = trades.filter(t => t.respect_plan === true)
  const respectPlanWins = respectPlan.filter(t => t.result === 'tp').length
  if (respectPlan.length >= 3) {
    const ratio = Math.round((respectPlanWins / respectPlan.length) * 100)
    if (ratio >= 60) {
      patterns.push({
        type: 'success',
        title: 'Respect du plan = performance',
        desc: `${ratio}% de tes trades respectant le plan sont gagnants. Continue comme ça.`,
      })
    }
  }

  const fomo = trades.filter(t => t.emotion === 'FOMO')
  const fomoLosses = fomo.filter(t => t.result === 'sl').length
  if (fomo.length >= 2 && fomoLosses / fomo.length >= 0.5) {
    patterns.push({
      type: 'warning',
      title: 'FOMO détecté',
      desc: `Tu perds souvent quand tu trades sous FOMO (${fomo.length} trades). Attends la prochaine setup.`,
    })
  }

  return patterns
}

export const generateFeedback = (trades) => {
  if (trades.length < 5) return 'Ajoute au moins 5 trades pour obtenir un feedback IA.'
  const wr = calcWinRate(trades)
  const avgRR = calcAvgRR(trades)
  const disc = calcDisciplineScore(trades)
  const lines = []

  if (wr >= 60) lines.push(`✅ Excellent win rate de ${wr}%. Tu identifies bien tes setups.`)
  else if (wr >= 45) lines.push(`⚠️ Win rate de ${wr}%. Des marges de progression existent.`)
  else lines.push(`❌ Win rate de ${wr}%. Revois tes critères d'entrée.`)

  if (avgRR >= 2) lines.push(`✅ RR moyen de ${avgRR} — tu laisses courir tes profits.`)
  else if (avgRR >= 1) lines.push(`⚠️ RR moyen de ${avgRR} — peux mieux faire sur la gestion des sorties.`)
  else lines.push(`❌ RR moyen de ${avgRR} — coupe tes pertes plus tôt ou vise de meilleures cibles.`)

  if (disc >= 8) lines.push(`✅ Discipline score de ${disc}/10 — trading psychologique solide.`)
  else if (disc >= 6) lines.push(`⚠️ Discipline score de ${disc}/10 — travaille ta régularité.`)
  else lines.push(`❌ Discipline score de ${disc}/10 — la psychologie impacte tes résultats.`)

  return lines.join('\n')
}

// ─── FORMATTERS ─────────────────────────────────────────
// Accepte string, Date ou null/undefined sans planter
export const fmtDate = (d) => {
  if (d == null || d === '') return '—'
  let date
  try {
    date = typeof d === 'string' ? parseISO(d) : d
    return format(date, 'dd MMM yyyy', { locale: fr })
  } catch {
    return '—'
  }
}
export const fmtMonth = (y, m) => format(new Date(y, m - 1), 'MMMM yyyy', { locale: fr })

export const EMOTIONS = ['Neutre', 'Confiant', 'Anxieux', 'FOMO', 'Revenge', 'Impatient', 'Euphorique']
export const MARKETS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'NAS100', 'SP500', 'BTC/USD', 'Autre']
// Palette unique des résultats (partagée par les pages & exports)
export const RESULT_COLORS = {
  tp:          '#2EA043',
  sl:          '#F85149',
  be:          '#58a6ff',
  missed:      '#8B949E',
  manual_exit: '#D98411',
}
export const RESULTS = [
  { value: 'tp',          label: 'Take Profit',        color: RESULT_COLORS.tp },
  { value: 'sl',          label: 'Stop Loss',          color: RESULT_COLORS.sl },
  { value: 'be',          label: 'Breakeven',          color: RESULT_COLORS.be },
  { value: 'missed',      label: 'Missed',             color: RESULT_COLORS.missed },
  { value: 'manual_exit', label: 'Sortie manuelle',    color: RESULT_COLORS.manual_exit },
]
export const TIMEFRAMES = ['Daily', 'H4', 'H1', 'M30', 'M15', 'M5', 'M1', 'Entrée', 'Clôture']