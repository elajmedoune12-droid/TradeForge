import { useState, useEffect, useCallback } from 'react'
import { getTrades } from '../services/supabase'
import { useAuth } from './useAuth'

export const useTrades = () => {
  const { user } = useAuth()
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch initial avec loading
  useEffect(() => {
    if (!user) return
    setLoading(true)
    getTrades(user.id)
      .then(data => { setTrades(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [user])

  // Refresh silencieux — sans loading
  const refresh = useCallback(async () => {
    if (!user) return
    try {
      const data = await getTrades(user.id)
      setTrades(prev =>
        JSON.stringify(prev) === JSON.stringify(data) ? prev : data
      )
    } catch (e) {
      setError(e.message)
    }
  }, [user])

  // Polling toutes les 10s sans re-render visuel
  useEffect(() => {
    const interval = setInterval(() => refresh(), 10000)
    return () => clearInterval(interval)
  }, [refresh])

  // Refresh quand l'app revient au premier plan
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  return { trades, loading, error, refresh }
}