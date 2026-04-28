import { useState, useEffect, useCallback, useRef } from 'react'
import { getTrades, supabase } from '../services/supabase'
import { useAuth } from './useAuth'

export const useTrades = () => {
  const { user } = useAuth()
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const channelRef = useRef(null)

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
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    channelRef.current = supabase
      .channel(`trades_${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'trades', filter: `user_id=eq.${user.id}` },
        () => fetch()
      )
      .subscribe()
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user?.id])

  return { trades, loading, error, refresh: fetch }
}