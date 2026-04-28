import { useState, useEffect, useCallback } from 'react'
import { getTrades, supabase } from '../services/supabase'
import { useAuth } from './useAuth'

export const useTrades = () => {
  const { user } = useAuth()
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      const data = await getTrades(user.id)
      setTrades(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetch() }, [fetch])

 useEffect(() => {
  if (!user) return
  const channel = supabase
    .channel(`trades_changes_${user.id}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'trades', filter: `user_id=eq.${user.id}` },
      () => fetch()
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}, [user, fetch])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetch()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetch])

  return { trades, loading, error, refresh: fetch }
}