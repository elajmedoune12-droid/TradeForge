import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── STATS ──────────────────────────────────────────────
export const calcWinRate = (trades) => {
  const beSetting = localStorage.getItem('winrate_be_mode') || 'neutral'
  const tp = trades.filter(t => t.result === 'tp').length
  const sl = trades.filter(t => t.result === 'sl').length
  const be = trades.filter(t => t.result === 'be').length

  if (beSetting === 'win') {
    const denom = tp + sl + be
    return denom ? Math.round(((tp + be) / denom) * 100) : 0
  }
  if (beSetting === 'loss') {
    const denom = tp + sl + be
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

export const calcTotalProfit = (trades) => {
  return trades.reduce((acc, t) => {
    if (t.result === 'tp') return acc + (t.rr_won || 0)
    if (t.result === 'sl') return acc - 1
    return acc
  }, 0)
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
    if (t.emotion) {
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

  // Pattern 1: pertes quand discipline basse
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

  // Pattern 2: gains quand respect du plan
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

  // Pattern 3: emotion FOMO
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
export const fmtDate = (d) => format(parseISO(d), 'dd MMM yyyy', { locale: fr })
export const fmtMonth = (y, m) => format(new Date(y, m - 1), 'MMMM yyyy', { locale: fr })

export const EMOTIONS = ['Neutre', 'Confiant', 'Anxieux', 'FOMO', 'Revenge', 'Impatient', 'Euphorique']
export const MARKETS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'NAS100', 'SP500', 'BTC/USD', 'Autre']
export const RESULTS = [
  { value: 'tp', label: 'Take Profit', color: 'text-forge-green' },
  { value: 'sl', label: 'Stop Loss', color: 'text-forge-red' },
  { value: 'be', label: 'Breakeven', color: 'text-blue-400' },
  { value: 'missed', label: 'Missed', color: 'text-forge-muted' },
]
export const TIMEFRAMES = ['Daily', 'H4', 'H1', 'M30', 'M15', 'M5', 'M1', 'Entrée', 'Clôture']
