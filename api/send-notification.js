// api/send-notification.js
// Vercel Serverless Function — envoie une notification push
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // clé service role (pas anon)
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user_id, title, body, url = '/' } = req.body

  if (!user_id || !title) return res.status(400).json({ error: 'user_id et title requis' })

  // Récupère les abonnements de l'utilisateur
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', user_id)

  if (error) return res.status(500).json({ error: error.message })
  if (!subs?.length) return res.status(404).json({ error: 'Aucun abonnement trouvé' })

  const payload = JSON.stringify({ title, body, url, tag: 'tradeforge' })

  // APRÈS — correct
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