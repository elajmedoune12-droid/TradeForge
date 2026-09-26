// api/notify-ai.js
// Vercel Serverless Function — génère une notification push unique et cohérente
// à partir des alertes réelles du trader (via Groq). Retourne aussi l'URL cible.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY manquante' })

  const { userName, trades, alerts } = req.body || {}
  if (!Array.isArray(alerts) || !alerts.length) {
    return res.status(200).json({ fallback: true })
  }

  const nameRef = userName ? `L'utilisateur s'appelle ${userName}. Adressez-vous à lui par son prénom.` : ''

  const tradeSummary = (trades || []).slice(0, 10).map(t => {
    const h = Array.isArray(t.hindsight) ? t.hindsight[0] : t.hindsight
    const parts = [
      `${t.date} ${t.market || ''} ${(t.type || '').toUpperCase()}`,
      `résultat:${t.result || '—'}`,
      t.rr_won != null ? `RR:${t.rr_won}R` : '',
      t.discipline_score != null ? `disc:${t.discipline_score}/10` : '',
      t.respect_plan != null ? `plan:${t.respect_plan ? 'ok' : 'violé'}` : '',
      t.emotion || '',
      h?.main_error ? `erreur:${h.main_error}` : '',
    ].filter(Boolean).join(' | ')
    return parts
  }).join('\n')

  const alertLines = alerts
    .map((a, i) => `[${i}] [${a.priority}] ${a.title} — ${a.body}`)
    .join('\n')

  const systemPrompt = `Tu es TradeForge Coach, un coach trading professionnel. ${nameRef}

Tu dois rédiger UNE notification push pour l'utilisateur, à partir des alertes DETECTEES ci-dessous. Chaque alerte est numérotée entre crochets.

RÈGLES STRICTES :
- Choisissez le sujet LE PLUS IMPORTANT (priorité : urgent > warning > success > info, sinon la plus récente).
- Identifiez l'index exact [n] de l'alerte retenue.
- Rédigez un message unique, court et concret (titre ≤ 50 caractères, corps ≤ 120 caractères, 1-2 phrases).
- Vouvoiement. Français. Zéro émoji.
- Basez-vous sur les données réelles fournies, pas de généralités ni de contradictions.
- Ne répétez pas plusieurs alertes à la fois : un seul message focalisé.
- Ne mentionnez jamais "notification" ou "alerte".

RETOUR : uniquement du JSON valide, sans markdown :
{"title": "...", "body": "...", "alertIndex": 0}`

  const userPrompt = `Derniers trades :
${tradeSummary || 'Aucun trade renseigné.'}

Alertes détectées :
${alertLines}

Choisissez l'index de l'alerte la plus pertinente et rédigez le message.`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      max_tokens: 1024,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  })

  const data = await response.json()
  if (!response.ok) {
    return res.status(response.status).json({ error: data.error?.message || 'Erreur Groq' })
  }

  const content = data.choices?.[0]?.message?.content || ''
  try {
    const parsed = JSON.parse(content)
    let idx = Number.isInteger(parsed.alertIndex) ? parsed.alertIndex : 0
    if (idx < 0 || idx >= alerts.length) idx = 0
    return res.status(200).json({
      title: parsed.title || alerts[idx].title,
      body: parsed.body || alerts[idx].body,
      url: alerts[idx].action || '/',
    })
  } catch {
    return res.status(200).json({ title: alerts[0].title, body: alerts[0].body, url: alerts[0].action || '/' })
  }
}