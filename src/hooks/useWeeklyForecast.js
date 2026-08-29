import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from './useAuth'

export const useWeeklyForecast = (weekStart) => {
  const { user } = useAuth()
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  const fetch = useCallback(async () => {
    if (!user || !weekStart) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('weekly_forecasts')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      setForecast(data || null)
    } catch (e) {
      console.error('useWeeklyForecast fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [user, weekStart])

  useEffect(() => { fetch() }, [fetch])

  const save = async (payload) => {
    if (!user) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('weekly_forecasts')
        .upsert({ user_id: user.id, week_start: weekStart, ...payload }, { onConflict: 'user_id,week_start' })
        .select()
        .single()
      if (error) throw error
      setForecast(data)
      return data
    } catch (e) {
      console.error('useWeeklyForecast save error:', e)
      throw e
    } finally {
      setSaving(false)
    }
  }

  return { forecast, loading, saving, save, refresh: fetch }
}