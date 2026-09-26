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

  // Règle absolue commune à tous les contextes
  const regleAbsolue = `RÈGLE ABSOLUE : Vous êtes exclusivement spécialisé dans le trading, la psychologie du trader et la gestion du risque. Pour toute question non liée à ces domaines (code informatique, cuisine, sport, politique, etc.), répondez UNIQUEMENT : "Je suis TradeForge Coach, spécialisé uniquement dans le trading et la psychologie du trader. Je ne peux pas répondre à cette question." Ne faites aucune exception.`

  // ── Sérialisation : TOUTES les données de TOUS les trades ──────────
  // Source de vérité = trade-forge.sql (20 colonnes) + table hindsight.
  // Aucun champ stocké n'est oublié : la liste ci-dessous est exhaustive.
  // Seuls les identifiants techniques (id, user_id, trade_id, created_at,
  // updated_at) sont omis : ils n'apportent aucune information d'analyse.
  const MAX_TEXT = 300   // protection contre un textarea géant
  const MAX_TF = 8        //Nb de timeframes listés par trade
  const MAX_HISTORY = 200 // plafond de sécurité du contexte (déclaration honnête si atteint)

  const hindsightOf = t => (Array.isArray(t.hindsight) ? t.hindsight[0] : t.hindsight) || null

  const clip = v => {
    if (v === null || v === undefined) return null
    const s = String(v).replace(/\s+/g, ' ').trim()
    if (!s) return null
    return s.length > MAX_TEXT ? s.slice(0, MAX_TEXT) + ' […]' : s
  }

  // Les images ne sont PAS lisibles par le modèle texte : on donne le factuel
  // (timeframes, nombre de captures, nombre de liens) sans prétendre les analyser.
  const imagesOf = arr => {
    const list = Array.isArray(arr) ? arr : []
    if (!list.length) return null
    const tfs = [...new Set(list.map(i => i?.timeframe || i?.label).filter(Boolean))]
    const links = list.filter(i => i?.isLink || !i?.path).length
    const p = []
    if (tfs.length) p.push(`timeframes: ${tfs.slice(0, MAX_TF).join(', ')}`)
    p.push(`${list.length - links} capture(s), ${links} lien(s), contenu visuel non lisible par le modèle`)
    return p.join(' | ')
  }

  // Retire les champs synthétiques « _xxx » (calculés côté client) qui
  // embarqueraient des tableaux de trades entiers et feraient exploser le prompt.
  const stripSynthetic = o => {
    const c = { ...(o || {}) }
    Object.keys(c).forEach(k => { if (k.startsWith('_')) delete c[k] })
    return c
  }

  // Un trade = un objet JSON complet. Même format pour le trade analysé et
  // pour l'historique : impossible d'oublier un champ dans l'un des deux.
  const serializeTrade = t => {
    const s = stripSynthetic(t)
    const h = hindsightOf(t)
    const out = {
      date: s.date || null,
      jour: s.day || null,
      marche: s.market || null,
      sens: s.type || null,
      resultat: s.result || null,
      rr_prevu: s.rr_planned ?? null,
      rr_realise: s.rr_won ?? null,
      session: s.session || null,
      style: s.style || null,
      tendance: s.trend || null,
      structure: s.market_structure || null,
      emotion: s.emotion || null,
      discipline: s.discipline_score ?? null,
      plan_respecte: s.respect_plan ?? null,
      notes: clip(s.notes),
      captures: imagesOf(s.images),
    }
    if (h) {
      out.after_trade = {
        erreur_principale: clip(h.main_error),
        lecon: clip(h.lesson),
        regle: clip(h.rule),
        notes: clip(h.notes),
        tags: Array.isArray(h.tags) && h.tags.length ? h.tags : null,
        captures: imagesOf(h.images),
      }
    }
    return JSON.stringify(out, (k, v) => (v === null || v === '' ? undefined : v))
  }

  // Stats globales + historique COMPLET, du plus ancien au plus récent
  let globalContext = ''
  if (allTrades?.length) {
    const total  = allTrades.length
    const wins   = allTrades.filter(t => t.result === 'tp').length
    const wr     = Math.round((wins / total) * 100)
    const profit = allTrades.reduce((acc, t) => {
      if (t.result === 'tp') return acc + (t.rr_won || 0)
      if (t.result === 'sl') return acc + (t.rr_won ?? -1)
      if (t.result === 'manual_exit') return acc + (t.rr_won || 0)
      return acc
    }, 0).toFixed(2)
    const withHindsight = allTrades.filter(t => hindsightOf(t)).length

    const sorted = [...allTrades].sort((a, b) => String(a?.date || '').localeCompare(String(b?.date || '')))
    const truncated = Math.max(0, sorted.length - MAX_HISTORY)
    const kept = truncated ? sorted.slice(-MAX_HISTORY) : sorted
    const oldest = kept[0]?.date || '?'
    const newest = kept[kept.length - 1]?.date || '?'

    globalContext = `

CONTEXTE GLOBAL DU TRADER${nameRef} : ${total} trades au total, win rate global ${wr}%, profit cumulé ${profit}R. After Trade renseigné sur ${withHindsight} trade(s) sur ${total}.

HISTORIQUE COMPLET — un objet JSON par trade, avec TOUTES ses données (du plus ancien au plus récent). Ces données sont la source de vérité : toute affirmation doit s'appuyer dessus, et tu peux comparer le trade analysé à cet historique :
${kept.map(serializeTrade).join('\n')}${truncated ? `\n[ATTENTION : seules les ${MAX_HISTORY} entrées les plus récentes ont pu être transmises ; ${truncated} trade(s) plus ancien(s) ont été omis pour ne pas dépasser la taille de contexte. Ne prétends donc jamais avoir une vision exhaustive si une question porte sur cette période.]` : ''}
Période couverte : ${oldest} → ${newest}.${truncated ? ` (tronquée : la période la plus ancienne manque)` : ' (historique complet, non tronqué)'}`
  }

  // System prompt selon le contexte
  let systemPrompt = ''

  if (trade?._rulesContext) {
    systemPrompt = `${regleAbsolue}

Vous êtes TradeForge Coach, un coach trading professionnel expert en psychologie du trading et gestion du risque. ${userRef}

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
- Ne répétez pas les informations déjà connues de l'utilisateur`

  } else if (trade?._monthlyContext) {
    const s = trade._stats
    systemPrompt = `${regleAbsolue}

Vous êtes TradeForge Coach, un coach trading professionnel expert en analyse de performance. ${userRef}

Analyse mensuelle — ${trade.market} :
- Trades : ${s?.total || 0} | Win Rate : ${s?.winRate || 0}% | Profit : ${s?.profit || 0}R
- TP : ${s?.tp || 0} | SL : ${s?.sl || 0} | BE : ${s?.be || 0} | Missed : ${s?.missed || 0} | Manuel : ${s?.trades?.filter(t => t.result === 'manual_exit').length || 0}
- Score discipline moyen : ${trade.discipline_score}/10
${globalContext}

INSTRUCTIONS :
- Adoptez un ton professionnel, analytique et motivant
- Vouvoiements requis
- Répondez en français avec structure claire (titres, listes si pertinents)
- Comparez la performance mensuelle au contexte global quand c'est utile
- Proposez des axes d'amélioration concrets et actionnables`

  } else if (trade && trade.market) {
    systemPrompt = `${regleAbsolue}

Vous êtes TradeForge Coach, un coach trading professionnel spécialisé en analyse post-trade. ${userRef}

TRADE ANALYSÉ (toutes ses données, format identique à celui de l'historique) :
${serializeTrade(trade)}
${globalContext}

CYCLE DE L'ANALYSE POST-TRADE — suis ces étapes dans l'ordre :
1. Entrée : le sens, la session, le style, la tendance et la structure étaient-ils cohérents entre eux ? La décision d'entrer était-elle alignée sur le plan du trader ?
2. SL et TP : compare le RR prévu au RR réellement obtenu. Un écart important indique soit une sortie anticipée, soit un TP déplacé, soit une mauvaise gestion.
3. Sortie : le résultat obtenu est-il cohérent avec le RR réalisé ? Un trade gagnant mal exécuté (RR réalisé faible) est un signal d'exécution, pas de chance.
4. Recul : le journal ne stocke AUCUN prix. Le schéma confirmed ne contient ni prix d'entrée, ni prix de sortie, ni niveau de SL ou de TP chiffré, ni taille de position, ni horodatage d'entrée/sortie, ni données OHLC. Le P&L n'existe qu'en multiples de R (rr_prevu / rr_realise). Tu n'as donc aucun cours à analyser et aucun mouvement post-trade à observer. Les captures sont listées mais leur contenu visuel t'est inaccessible. N'invente jamais ce qui s'est passé sur le graphique après la sortie : si l'information manque, dis-le simplement et poursuis l'analyse sur ce qui est réellement mesurable (écart RR prévu/réalisé, discipline, respect du plan, notes, After Trade, historique).
5. Verdict : ce qui a été bien exécuté, et ce qui aurait pu être amélioré. Ne juge pas la personne, juge l'exécution. N'invente jamais un prix, un niveau, un chiffre ou un fait qui ne figure pas dans les données fournies.

INSTRUCTIONS :
- Sois précis, humain, naturel et concis. Écris comme un vrai coach, pas comme un rapport automatique.
- Écris en prose fluide ou en 3-5 puces au maximum. Pas de rubrique ni de titre par étape du cycle : le lecteur n'a pas besoin de la structure, il a besoin du fond.
- Vise 120 mots maximum. Chaque phrase doit apporter quelque chose ; supprime tout ce qui pourrait se dire de n'importe quel trade.
- Ne mentionne que les observations réellement pertinentes : ignore ce qui est correct et sans enjeu. Pas de remplissage, pas de banalités.
- Sans juger ni réécrire l'histoire : tu n'as pas le droit de réinterpréter les intentions du trader ou de réécrire ce qu'il a décidé. Décris ce qui s'est passé, puis ce qui pouvait mieux fonctionner.
- Appuie chaque observation sur une donnée précise du trade ou de l'historique (un chiffre, une date, une récurrence).
- Si l'After Trade est rempli, exploite ce que le trader en a tiré au lieu de répéter ce qu'il sait déjà. S'il est vide, dis-le franchement : l'analyse est faite à froid.
- Ne demande jamais d'information déjà présente dans les données.
${trade.result === 'tp' ? '- Trade gagnant : ne gâche pas le résultat avec des critiques sans fondement. Ne souligne que ce qui est réellement perfectible.' : '- Trade perdant : ne lui reproche ni ses intentions ni sa faute. Décris la mécanique de la perte et le point de réparation exact sur lequel le prochain trade peut être mieux exécuté.'}
- Vouvoiement, français.`

  } else {
    systemPrompt = `${regleAbsolue}

Vous êtes TradeForge Coach, un coach trading professionnel expert en performance et psychologie du trading. ${userRef}
${globalContext}

INSTRUCTIONS :
- Adoptez un ton professionnel, bienveillant et motivant
- Vouvoiements requis
- Répondez en français, structuré et actionnable
- Basez vos réponses sur les données réelles du trader quand disponibles
- Évitez les généralités : soyez précis et personnalisé`
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
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