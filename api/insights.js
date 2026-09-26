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

  // Angle tiré au sort à chaque appel : deux générations successives
  // n'empruntent jamais le même angle, comme l'exige le cahier des charges.
  const ANGLES = [
    `Partie uniquement de ce qu'il a écrit lui-même dans ses notes de trade.`,
    `Partie des règles qu'il s'est fixées dans ses After Trade.`,
    `Partie de ce qu'il a noté comme leçon après ses trades.`,
    `Partie du simple fait que son journal est tenu et à jour.`,
    `Partie d'un instrument sur lequel il a travaillé.`,
    `Partie du soin apporté à sa saisie : il note le plan, la discipline et le résultat à chaque trade.`,
    `Partie des questions qu'il se pose dans ses notes, sans y répondre.`,
    `Partie d'un moment précis de sa période, décrit strictement tel qu'il l'a écrit.`,
  ]
  const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)]

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
- Rédige UNIQUEMENT 1 insight IA, en français, vouvoiement. Un seul, jamais deux : pas de liste, pas de second point, pas de remplissage. Si deux problèmes semblent importants, garde le plus déterminant et l'explique pleinement.
- Choisis le levier qui change réellement le résultat du trader, par ordre de priorité : le ratio gain/perte et le win rate, l'erreur la plus coûteuse, la discipline, puis une dérive comportementale.
- L'insight doit pouvoir se lire seul, comme un message complet : un titre court (≤ 60 caractères) et une description précise et concrète (≤ 180 caractères).
- Évite les insights vagues du type "restez discipliné" ou "faites attention" : chaque phrase doit nommer un problème ou un levier précis, avec un chiffre.
- Base-toi sur les chiffres réels fournis, pas de généralités vides.
- Identifie les vrais points faibles : win rate, RR, discipline, émotions, erreurs récurrentes, violations du plan.
- Mentionne des nombres précis quand c'est possible (ex. "62% win rate").
- Ne répète pas les patterns déjà détectés tels quels : approfondis-les ou complète avec ce que tu vois.

MOTIVATION — Tu es une IA d'accompagnement pour un journal de trading. Ta mission : de courts messages de motivation bâtis sur les données réelles du journal, qui encouragent le trader sans inventer d'information, sans exagerer ses performances et sans porter de jugement sur sa personnalité.

1. BASE-TOI UNIQUEMENT SUR LES DONNÉES FOURNIES
${groundingLines}
- Cette liste est ta SEULE source. N'invente jamais une performance, une tendance, un comportement, un setup, un mouvement de marché, une intention, une émotion, une pensée ni un ressenti.
- Ne paraphrase pas les données chiffrées et ne répète pas les constats de l'insight.
- Si les données sont insuffisantes, reste factuel.

2. NE CONFONDS PAS OBSERVATION ET JUGEMENT
- Formulations INTERDITES : « vous êtes discipliné », « vous êtes patient », « vous êtes confiant », « vous êtes courageux », « vous progressez très bien », « vous maîtrisez parfaitement vos entrées », et toute qualité déduite d'une seule action. Écris aussi jamais « votre discipline », « votre patience », « votre lucidité ».
- Formulations PRÉFÉRÉES : « Le journal indique… », « Sur cette période… », « Sur les dernières sessions… », « Dans les données disponibles… », « Certains trades présentent… », « Plusieurs occurrences montrent… ».
- N'écris JAMAIS « il a senti », « il a pensé », « il a hésité », « il a cru », « il a voulu », « il a eu peur », « il a ressenti », ni aucune variante : ces mots ne sont autorisés que si le trader les a écrits mot pour mot dans ses notes. Un fait ne devient jamais un état d'âme.

3. NE SURINTERPRÈTE PAS
- Une seule journée ou quelques trades ne suffisent jamais pour conclure sur le comportement général. Employe des formulations proportionnées aux données : « certains trades », « plusieurs occurrences », « sur cette période », « dans les données disponibles ».
- Ne généralise jamais : une note qui ne concerne qu'un seul trade n'est pas une habitude du trader.
- Ne suppose jamais qu'un trade est un breakout, un pullback, un rejet, une cassure, du FOMO ou du revenge trading, sauf si l'information est explicitement enregistrée. En cas de doute, ne le mentionne pas.

4. LE MESSAGE DOIT RESTER MOTIVANT, SANS CULPABILISER
- Même si la donnée est négative, ne culpabilise jamais le trader et ne fais aucun reproche. Transforme l'observation en piste de réflexion ou en rappel utile.
- N'adresse JAMAIS un ordre, une consigne ou un conseil (« continuez à… », « appliquez… », « renforcez… », « vous devez… ») : la motivation n'est pas une consigne.
- Coaching excessif INTERDIT : « continue comme ça ! », « tu vas y arriver ! », « tu es sur la bonne voie ! », « ne lâche rien ! », « courage », « crois en toi », « la pratique paiera », « félicitations ».
- Ne fais pas semblant d'être positif si le contexte est dur, et ne console pas non plus : reste strictement factuel.
- Ne commence pas par son prénom ni par une formule de politesse creuse.

5. PAS DE STATISTIQUE, MAIS LA PÉRIODE EST AUTORISÉE
- Tu n'écris AUCUN chiffre de résultat : ni pourcentage, ni montant, ni P&L, ni win rate, ni nombre de trades, ni RR, ni série. « Plusieurs » et « certains » sont tes outils, pas les chiffres.
- Tu peux en revanche situer la période : « sur les 30 derniers jours », « sur cette période », « ces dernières semaines ».

6. ÉVITE LES PHRASES TROP GÉNÉRIÈRES
- Le message doit renvoyer à un élément concret du journal dès que c'est possible. S'il n'en existe aucun, écris une phrase sobre et factuelle sur la tenue du journal, sans interprétation.
- Phrases INTERDITES, et toutes leurs variantes : "cela peut changer la donne", "chaque trade est une leçon", "chaque échec rapproche de la réussite", "l'impulsion du marché", "danser avec le marché", "gardez votre cap", "un mauvais mois ne te définit pas".
- Si un élément de la liste est trop long et se termine par « […] », n'en cite qu'un court extrait et ne reproduis jamais les crochets.

7. NE DONNE PAS DE CONSEIL FINANCIER
- Ne recommande jamais d'acheter, de vendre, d'augmenter le risque ni de prendre une position. Tu peux commenter les données du journal et suggérer un axe d'observation, rien de plus.

8. RESTE COURT
- 1 à 2 phrases, entre 90 et 190 caractères, lisible d'un coup sur un dashboard.

STRUCTURE RECOMMANDÉE : [Observation concrète] + [piste de réflexion ou encouragement neutre]
ANGLE OBLIGATOIRE pour cette génération (respecte-le) : ${angle}
- Ne force jamais : si la liste ne t'inspire rien de pertinent, écris un message simple et sincère plutôt que d'inventer.

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

  const callGroq = () => fetch('https://api.groq.com/openai/v1/chat/completions', {
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

  // Un 429 (rate limit) est transitoire : on réessaie une fois après une courte
  // pause, sinon le Dashboard retomberait immédiatement sur le fallback local.
  let response = await callGroq()
  if (response.status === 429) {
    await new Promise(r => setTimeout(r, 9000))
    response = await callGroq()
  }

  const data = await response.json()
  if (!response.ok) {
    // Dégradation silencieuse : le Dashboard retombe sur detectPatterns + motivation locale.
    return res.status(200).json({ insights: [], motivation: '', error: data.error?.message || 'Erreur Groq' })
  }

  const content = data.choices?.[0]?.message?.content || ''
  try {
    const parsed = JSON.parse(content)
    const insights = Array.isArray(parsed.insights) ? parsed.insights.slice(0, 1) : []
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