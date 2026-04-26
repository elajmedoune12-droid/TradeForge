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
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante' })

  // Vérifier l'utilisateur avec son token
  const userSupabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY)
  const { data: { user }, error: userError } = await userSupabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (userError || !user) return res.status(401).json({ error: 'Token invalide' })

  // Supprimer avec la clé service
  const adminSupabase = createClient(supabaseUrl, serviceKey)
  const { error } = await adminSupabase.auth.admin.deleteUser(user.id)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ success: true })
}