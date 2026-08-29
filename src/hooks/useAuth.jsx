import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, signOut as supabaseSignOut } from '../services/supabase'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const clearStaleSession = async () => {
      // Session locale invalide (refresh token mort) : on vide le storage
      // pour éviter des erreurs "Invalid Refresh Token" à répétition
      await supabase.auth.signOut()
    }
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!active) return
        setUser(session?.user ?? null)
      })
      .catch(async (err) => {
        console.error('Erreur récupération session', err)
        // Token de refresh invalide/expiré côté serveur → purge la session locale
        if (active) {
          setUser(null)
          await clearStaleSession()
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signOut: supabaseSignOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)