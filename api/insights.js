// api/insights.js
// Vercel Serverless Function — génère de vrais insights IA (Groq)
// à partir des 30 derniers jours de trading.

// Coupe la motivation à une frontière de phrase : jamais au milieu d'un mot.
function trimAtSentence(text, max) {
  const clean = String(text).trim()
  if (clean.length <= max) return clean
  const head = clean.slice(0, max)
  const lastStop = Math.max(head.lastIndexOf('.'), head.lastIndexOf('!'), head.lastIndexOf('?'))
  if (lastStop > 60) return head.slice(0, lastStop + 1).trim()
  const lastSpace = head.lastIndexOf(' ')
  return (lastSpace > 60 ? head.slice(0, lastSpace) : head).trim() + '…'
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY manquante' })

  const { userName, trades, patterns } = req.body || {}
  if (!Array.isArray(trades) || !trades.length) {
    return res.status(200).json({ insights: [] })
  }

  const nameRef = userName ? `L'utilisateur s'appelle ${userName}.` : ''

  const last30 = Array.isArray(trades) ? trades.slice(0, 30) : []
  const total = last30.length
  const wins  = last30.filter(t => t.result === 'tp').length
  const losses = last30.filter(t => t.result === 'sl').length
  const wr    = total ? Math.round((wins / total) * 100) : 0
  const profit = last30.reduce((acc, t) => {
    if (t.result === 'tp') return acc + (t.rr_won || 0)
    if (t.result === 'sl') return acc - 1
    return acc
  }, 0).toFixed(2)

  const disc = last30.filter(t => t.discipline_score != null)
  const avgDisc = disc.length ? Math.round(disc.reduce((a, t) => a + t.discipline_score, 0) / disc.length) : 0
  const violations = last30.filter(t => t.respect_plan === false).length

  const emotionMap = {}
  last30.filter(t => t.emotion).forEach(t => {
    emotionMap[t.emotion] = (emotionMap[t.emotion] || 0) + 1
  })
  const topEmotions = Object.entries(emotionMap).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([e, c]) => `${e}(${c}x)`).join(', ')

  const errorMap = {}
  last30.forEach(t => {
    const h = Array.isArray(t.hindsight) ? t.hindsight[0] : t.hindsight
    if (h?.main_error) errorMap[h.main_error] = (errorMap[h.main_error] || 0) + 1
  })
  const topErrors = Object.entries(errorMap).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([e, c]) => `"${e}"(${c}x)`).join(', ')

  const patternLines = (patterns || []).map(p => `- [${p.type}] ${p.title} : ${p.desc}`).join('\n') || 'Aucun pattern prédéfini détecté.'

  // Éléments VÉRIFIABLES uniquement : la motivation doit s'ancrer sur cette liste,
  // jamais sur une interprétation. Rien ici n'est déduit, tout est cité littéralement des données.
  const hOf = t => (Array.isArray(t.hindsight) ? t.hindsight[0] : t.hindsight) || null
  const clip = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 90)
  const grounding = []
  last30.slice(0, 6).forEach(t => {
    const h = hOf(t)
    if (t.notes) grounding.push(`- Note du trader du ${t.date} : "${clip(t.notes)}"`)
    if (h?.rule) grounding.push(`- Règle notée par le trader le ${t.date} : "${clip(h.rule)}"`)
    if (h?.lesson) grounding.push(`- Leçon notée par le trader le ${t.date} : "${clip(h.lesson)}"`)
  })
  const emoSet = [...new Set(last30.map(t => t.emotion).filter(Boolean))]
  if (emoSet.length) grounding.push(`- Émotions explicitement enregistrées par le trader : ${emoSet.join(', ')}`)
  const mkSet = [...new Set(last30.map(t => t.market).filter(Boolean))]
  if (mkSet.length) grounding.push(`- Marchés effectivement tradés : ${mkSet.join(', ')}`)
  const withShots = last30.filter(t => Array.isArray(t.images) && t.images.length).length
  if (withShots) grounding.push(`- Trades avec captures d'écran déposées : ${withShots}`)
  const withHind = last30.filter(t => hOf(t)).length
  if (withHind) grounding.push(`- Trades avec un After Trade rédigé : ${withHind}`)
  const daySet = [...new Set(last30.map(t => t.day).filter(Boolean))]
  if (daySet.length) grounding.push(`- Jours de la semaine où il a tradé : ${daySet.join(', ')}`)
  const groundingLines = grounding.length ? grounding.join('\n') : 'AUCUN élément vérifiable disponible : ne force rien, écris un message simple et sincère sans ancrage.'

  const systemPrompt = `Tu es TradeForge Coach, un coach trading professionnel. ${nameRef}

Tu analyses les 30 derniers jours de trading d'un trader.

DONNÉES RÉELLES FOURNIES. RÈGLES STRICTES :
- Rédige UNIQUEMENT 2 insights IA, les plus importants et actionnables, en français, vouvoiement. N'en produis pas plus : uniquement les plus utiles, jamais de remplissage.
- Priorise ce qui change réellement le résultat du trader : le levier de profit principal (RR vs win rate), l'erreur la plus coûteuse, la discipline, ou une dérive comportementale.
- Chaque insight : type ("success" si c'est un point fort positif, sinon "warning"), un titre court (≤ 50 caractères) et une description précise et concrète (≤ 140 caractères).
- Évite les insights vagues du type "restez discipliné" ou "faites attention" : chaque phrase doit nommer un problème ou un levier précis, avec un chiffre.
- Base-toi sur les chiffres réels fournis, pas de généralités vides.
- Identifie les vrais points faibles : win rate, RR, discipline, émotions, erreurs récurrentes, violations du plan.
- Mentionne des nombres précis quand c'est possible (ex. "62% win rate").
- Ne répète pas les patterns déjà détectés tels quels : approfondis-les ou complète avec ce que tu vois.

MOTIVATION (règles opposables, aucune exception) :
- La motivation ACCOMPAGNE le trader. Elle n'analyse pas ses performances, n'enseigne pas, ne donne aucun conseil, ne tire aucune leçon.
- Longueur : 1 à 2 phrases, entre 90 et 190 caractères.
- INTERDIT ABSOLU : tout chiffre, pourcentage, montant, résultat, P&L, win rate, nombre de trades, série. Tu n'écris AUCUN chiffre.
- Elle ne paraphrase pas les données et ne répète pas les constats des insights.
- UTILISE EXCLUSIVEMENT les informations réellement présentes dans les données des 30 derniers jours. Voici la liste des seuls éléments vérifiables dont tu disposes :
${groundingLines}
- Ancre la motivation sur UN de ces éléments, repris tel quel ou reformulé sans le trahir. Ne laisse pas la motivation flotter dans le vide : elle doit faire référence à quelque chose de réel et de vérifiable chez ce trader.
- Si cette liste ne t'inspire rien de pertinent, écris alors un message simple et sincère, sans ancrage et sans analyse, plutôt que d'inventer.
- N'invente jamais un setup, une stratégie, un événement, une intention, une émotion ou un comportement.
- Ne suppose JAMAIS qu'un trade est un breakout, un pullback, une cassure, un rejet, du FOMO ou du revenge trading, sauf si cette information est explicitement présente et vérifiable dans les données. En cas de doute, ne le mentionne pas.
- Si une information n'est pas identifiable avec certitude, ne la mentionne pas.
- Ne généralise jamais : si une note, une règle ou une leçon ne concerne qu'un seul trade, ne la présente pas comme une habitude générale du trader ni comme un schéma récurrent. Reprends-la pour ce qu'elle est : une observation portant sur ce trade-là.
- Ne transforme jamais une action observée en jugement sur la personnalité du trader.
- N'attribue aucune qualité ("audacieux", "patient", "discipliné", "confiant", "courageux", "exigeant", "lucide") sans éléments concrets et répétés dans les données qui la soutiennent.
- Évite toute formulation dramatique, romancée ou artificielle, par exemple "ressentir l'impulsion du marché" ou "danser avec le marché". Écris simplement, comme un humain qui connaît le contexte du trader, sans surinterpréter son comportement.
- Ne cherche pas à être positif à tout prix : si le contexte est dur, reconnais-le sobrement, sans dramatiser ni consoler bêtement.
- Varie naturellement le ton, la structure et l'angle à chaque génération. Ne commence pas systématiquement par son prénom.
- FORMULES INTERDITES (et leurs variantes) : "reste discipliné", "continue d'avancer", "chaque trade est une leçon", "un mauvais mois ne te définit pas", "tu es sur la bonne voie", "courage", "tu peux le faire", "crois en toi", "la pratique paiera", "tu progresses", "félicitations".
- Ne force jamais la motivation. Si aucune observation pertinente ne permet d'en produire une naturellement, écris un message simple et sincère plutôt que d'inventer ou de surinterpréter.

RETOUR : uniquement du JSON valide, sans markdown :
{"insights": [{"type": "success|warning", "title": "...", "desc": "..."}], "motivation": "..."}`

  const userPrompt = `30 derniers jours :
- Trades : ${total} | TP : ${wins} | SL : ${losses}
- Win rate : ${wr}% | Profit : ${profit}R
- Discipline moyenne : ${avgDisc}/10 | Violations du plan : ${violations}
- Émotions les plus fréquentes : ${topEmotions || '—'}
- Erreurs récurrentes (After Trade) : ${topErrors || '—'}

Patterns déjà détectés :
${patternLines}`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      max_tokens: 3072,
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  })

  const data = await response.json()
  if (!response.ok) {
    // Dégradation silencieuse : le Dashboard retombe sur detectPatterns + motivation locale.
    return res.status(200).json({ insights: [], motivation: '', error: data.error?.message || 'Erreur Groq' })
  }

  const content = data.choices?.[0]?.message?.content || ''
  try {
    const parsed = JSON.parse(content)
    const insights = Array.isArray(parsed.insights) ? parsed.insights.slice(0, 2) : []
    return res.status(200).json({
      insights: insights.map(i => ({
        type: i.type === 'success' ? 'success' : 'warning',
        title: i.title || '',
        desc: i.desc || '',
      })).filter(i => i.title && i.desc),
      motivation: typeof parsed.motivation === 'string' ? trimAtSentence(parsed.motivation, 190) : '',
    })
  } catch {
    return res.status(200).json({ insights: [], motivation: '' })
  }
}