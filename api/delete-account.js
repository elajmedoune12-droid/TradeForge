import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Token manquant' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey     = process.env.VITE_SUPABASE_ANON_KEY
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante' })

  // Vérifier l'utilisateur avec son token
  const userSupabase = createClient(supabaseUrl, anonKey)
  const { data: { user }, error: userError } = await userSupabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (userError || !user) return res.status(401).json({ error: 'Token invalide' })

  const uid = user.id
  const adminSupabase = createClient(supabaseUrl, serviceKey)

  // Supprimer toutes les données (ordre important pour les clés étrangères)
  await adminSupabase.from('backtest_sessions').delete().eq('user_id', uid)
  await adminSupabase.from('backtest_goals').delete().eq('user_id', uid)
  await adminSupabase.from('backtest_cycles').delete().eq('user_id', uid)
  await adminSupabase.from('push_subscriptions').delete().eq('user_id', uid)
  await adminSupabase.from('journal_entries').delete().eq('user_id', uid)
  await adminSupabase.from('monthly_goals').delete().eq('user_id', uid)
  await adminSupabase.from('rules').delete().eq('user_id', uid)
  await adminSupabase.from('hindsights_standalone').delete().eq('user_id', uid)
  await adminSupabase.from('hindsight').delete().eq('user_id', uid)
  await adminSupabase.from('weekly_forecasts').delete().eq('user_id', uid)
  await adminSupabase.from('trades').delete().eq('user_id', uid)
  await adminSupabase.from('profiles').delete().eq('id', uid)

  // Supprimer le compte auth
  const { error } = await adminSupabase.auth.admin.deleteUser(uid)
  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ success: true })
}