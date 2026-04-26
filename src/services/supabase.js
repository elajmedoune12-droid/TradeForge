import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── AUTH ───────────────────────────────────────────────
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signUp = (email, password) =>
  supabase.auth.signUp({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

// ─── TRADES ─────────────────────────────────────────────
export const getTrades = async (userId) => {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export const getTradeById = async (id) => {
  const { data, error } = await supabase
    .from('trades')
    .select('*, hindsight(*)')
    .eq('id', id)
    .single()
  if (error) throw error

  // ── Normalise hindsight : toujours un tableau ──
  // Supabase peut retourner un objet, un tableau, ou null selon la relation
  if (data.hindsight && !Array.isArray(data.hindsight)) {
    data.hindsight = [data.hindsight]
  } else if (!data.hindsight) {
    data.hindsight = []
  }

  return data
}

export const createTrade = async (trade) => {
  const { data, error } = await supabase
    .from('trades')
    .insert(trade)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateTrade = async (id, updates) => {
  const { data, error } = await supabase
    .from('trades')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteTrade = async (id) => {
  const { error } = await supabase.from('trades').delete().eq('id', id)
  if (error) throw error
}

// ─── HINDSIGHT ──────────────────────────────────────────
export const getHindsightByTrade = async (tradeId) => {
  const { data, error } = await supabase
    .from('hindsight')
    .select('*')
    .eq('trade_id', tradeId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export const upsertHindsight = async (hindsight) => {
  const { data, error } = await supabase
    .from('hindsight')
    .upsert(hindsight, { onConflict: 'trade_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── RULES ──────────────────────────────────────────────
export const getRules = async (userId) => {
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const createRule = async (rule) => {
  const { data, error } = await supabase.from('rules').insert(rule).select().single()
  if (error) throw error
  return data
}

export const updateRule = async (id, updates) => {
  const { data, error } = await supabase
    .from('rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteRule = async (id) => {
  const { error } = await supabase.from('rules').delete().eq('id', id)
  if (error) throw error
}

// ─── STORAGE ────────────────────────────────────────────
export const uploadImage = async (file, path) => {
  const { data, error } = await supabase.storage
    .from('trade-images')
    .upload(path, file, { upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage
    .from('trade-images')
    .getPublicUrl(path)
  return urlData.publicUrl
}

export const deleteImage = async (path) => {
  const { error } = await supabase.storage.from('trade-images').remove([path])
  if (error) throw error
}

// ─── HINDSIGHTS STANDALONE ──────────────────────────────
export const getHindsightsStandalone = async (userId) => {
  const { data, error } = await supabase
    .from('hindsights_standalone')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const getHindsightStandaloneById = async (id) => {
  const { data, error } = await supabase
    .from('hindsights_standalone')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const updateHindsightStandalone = async (id, updates) => {
  const { data, error } = await supabase
    .from('hindsights_standalone')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteHindsightStandalone = async (id) => {
  const { error } = await supabase
    .from('hindsights_standalone')
    .delete()
    .eq('id', id)
  if (error) throw error
}