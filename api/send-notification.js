// api/send-notification.js
// Vercel Serverless Function — envoie une notification push
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

if (
  process.env.VAPID_SUBJECT &&
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

function getSupabase(userToken) {
  const url = process.env.VITE_SUPABASE_URL
  if (!url) return null
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  // 1) Service role : contourne la RLS (recommandé en serverless)
  // 2) Fallback : clé anon + token utilisateur pour passer la RLS
  if (serviceKey) {
    return createClient(url, serviceKey)
  }
  if (anonKey && userToken) {
    return createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${userToken}` } }
    })
  }
  return null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!process.env.VAPID_SUBJECT || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: 'VAPID non configuré : définissez VAPID_SUBJECT, VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY dans vos variables d’environnement.' })
  }

  const { user_id, title, body, url = '/', tag, user_token } = req.body

  if (!user_id || !title) return res.status(400).json({ error: 'user_id et title requis' })

  const supabase = getSupabase(user_token)
  if (!supabase) return res.status(500).json({ error: 'Supabase non configuré : définissez SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_URL + clé anon + token dans la requête).' })

  // Récupère les abonnements de l'utilisateur
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', user_id)

  if (error) return res.status(500).json({ error: error.message })
  if (!subs?.length) return res.status(404).json({ error: 'Aucun abonnement trouvé' })

  const payload = JSON.stringify({ title, body, url, tag: tag || `${url}-${Date.now()}` })

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      ).catch(async err => {
        // Abonnement expiré → supprimer
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
        throw err
      })
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  return res.status(200).json({ sent, total: subs.length })
}