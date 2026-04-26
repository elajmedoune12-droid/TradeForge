import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from './useAuth'

/**
 * Hook pour lire et sauvegarder l'objectif mensuel d'un mois donné.
 * @param {number} year
 * @param {number} month  (1-12)
 */
export const useMonthlyGoal = (year, month) => {
  const { user } = useAuth()
  const [goal, setGoal]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('monthly_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle()
      if (error) throw error
      setGoal(data)
    } catch (e) {
      console.error('useMonthlyGoal fetch:', e.message)
    } finally {
      setLoading(false)
    }
  }, [user, year, month])

  useEffect(() => { fetch() }, [fetch])

  /**
   * Upsert l'objectif du mois.
   * @param {{ goal_trades?, goal_winrate?, goal_profit?, goal_discipline? }} updates
   */
  const save = useCallback(async (updates) => {
    if (!user) return
    setSaving(true)
    try {
      const payload = {
        user_id: user.id,
        year,
        month,
        ...updates,
      }
      const { data, error } = await supabase
        .from('monthly_goals')
        .upsert(payload, { onConflict: 'user_id,year,month' })
        .select()
        .single()
      if (error) throw error
      setGoal(data)
      return data
    } catch (e) {
      console.error('useMonthlyGoal save:', e.message)
      throw e
    } finally {
      setSaving(false)
    }
  }, [user, year, month])

  const remove = useCallback(async () => {
    if (!user || !goal) return
    try {
      const { error } = await supabase
        .from('monthly_goals')
        .delete()
        .eq('id', goal.id)
      if (error) throw error
      setGoal(null)
    } catch (e) {
      console.error('useMonthlyGoal delete:', e.message)
    }
  }, [user, goal])

  return { goal, loading, saving, save, remove, refresh: fetch }
}
