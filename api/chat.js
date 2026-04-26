export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY manquante' })
  
    const { messages, trade, allTrades, userName } = req.body || {}
    if (!messages) return res.status(400).json({ error: 'messages requis' })
  
    // Nom de l'utilisateur pour personnalisation
    const name = userName || null
    const nameRef = name ? ` de ${name}` : ''
    const userRef = name ? `L'utilisateur s'appelle ${name}. Adressez-vous à lui par son prénom de manière naturelle dans vos réponses.` : ''
  
    // Stats globales depuis allTrades
    let globalContext = ''
    if (allTrades?.length) {
      const total  = allTrades.length
      const wins   = allTrades.filter(t => t.result === 'tp').length
      const wr     = Math.round((wins / total) * 100)
      const profit = allTrades.reduce((acc, t) => {
        if (t.result === 'tp') return acc + (t.rr_won || 0)
        if (t.result === 'sl') return acc - 1
        return acc
      }, 0).toFixed(2)
      globalContext = `\n\nCONTEXTE GLOBAL DU TRADER${nameRef} : ${total} trades au total, win rate global ${wr}%, profit cumulé ${profit}R.`
    }
  
    // System prompt selon le contexte
    let systemPrompt = ''
  
    if (trade?._rulesContext) {
      systemPrompt = `Vous êtes TradeForge Coach, un coach trading professionnel expert en psychologie du trading et gestion du risque. ${userRef}
  
  Vous analysez les règles de trading de l'utilisateur.
  Taux de respect du plan : ${trade._respectRate}%.
  Violations détectées : ${trade._violationCount}.
  Règles actives :
  ${trade._rules?.map((r, i) => `${i + 1}. ${r}`).join('\n') || 'Aucune règle définie.'}
  ${globalContext}
  
  INSTRUCTIONS :
  - Adoptez un ton professionnel, bienveillant et constructif
  - Vouvoiements requis (vous, votre, vos)
  - Répondez en français, structuré et précis (4-6 phrases ou liste structurée)
  - Identifiez les patterns de violation et proposez des solutions concrètes
  - Ne répétez pas les informations déjà connues de l'utilisateur
  - Refusez poliment toute question non liée au trading, à la psychologie du trader ou à la gestion du risque`  
    } else if (trade?._monthlyContext) {
      const s = trade._stats
      systemPrompt = `Vous êtes TradeForge Coach, un coach trading professionnel expert en analyse de performance. ${userRef}
  
  Analyse mensuelle — ${trade.market} :
  - Trades : ${s?.total || 0} | Win Rate : ${s?.winRate || 0}% | Profit : ${s?.profit || 0}R
  - TP : ${s?.tp || 0} | SL : ${s?.sl || 0} | BE : ${s?.be || 0} | Missed : ${s?.missed || 0}
  - Score discipline moyen : ${trade.discipline_score}/10
  ${globalContext}
  
  INSTRUCTIONS :
  - Adoptez un ton professionnel, analytique et motivant
  - Vouvoiements requis
  - Répondez en français avec structure claire (titres, listes si pertinents)
  - Comparez la performance mensuelle au contexte global quand c'est utile
  - Proposez des axes d'amélioration concrets et actionnables
  - Refusez poliment toute question non liée au trading, à la psychologie du trader ou à la gestion du risque`
  
    } else if (trade && trade.market) {
      systemPrompt = `Vous êtes TradeForge Coach, un coach trading professionnel spécialisé en analyse post-trade. ${userRef}
  
  Trade analysé :
  - Instrument : ${trade.market} | Direction : ${trade.type?.toUpperCase() || '—'} | Résultat : ${trade.result?.toUpperCase() || '—'}
  - RR prévu : ${trade.rr_planned ?? '—'}R | RR réalisé : ${trade.rr_won ?? '—'}R
  - Session : ${trade.session || '—'} | Style : ${trade.style || '—'}
  - Tendance : ${trade.trend || '—'} | Structure : ${trade.market_structure || '—'}
  - État émotionnel : ${trade.emotion || '—'} | Discipline : ${trade.discipline_score ?? '—'}/10
  - Plan respecté : ${trade.respect_plan ? 'Oui' : 'Non'}
  ${trade.notes ? `- Notes du trader : ${trade.notes}` : ''}
  ${globalContext}
  
  INSTRUCTIONS :
  - Adoptez un ton professionnel, précis et constructif
  - Vouvoiements requis
  - Répondez en français, concis mais complet (4-6 phrases ou liste structurée)
  - Basez votre analyse sur les données du trade, pas des généralités
  - Si le plan n'a pas été respecté, abordez l'aspect psychologique avec bienveillance
  - Refusez poliment toute question non liée au trading, à la psychologie du trader ou à la gestion du risque`
  
    } else {
      systemPrompt = `Vous êtes TradeForge Coach, un coach trading professionnel expert en performance et psychologie du trading. ${userRef}
  ${globalContext}
  
  INSTRUCTIONS :
  - Adoptez un ton professionnel, bienveillant et motivant
  - Vouvoiements requis
  - Répondez en français, structuré et actionnable
  - Basez vos réponses sur les données réelles du trader quand disponibles
  - Évitez les généralités : soyez précis et personnalisé
  - Refusez poliment toute question non liée au trading, à la psychologie du trader ou à la gestion du risque`
    }
  
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ]
      })
    })
  
    const data = await response.json()
  
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Erreur Groq' })
    }
  
    return res.status(200).json({ reply: data.choices?.[0]?.message?.content || '' })
  }