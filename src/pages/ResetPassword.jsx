import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

export default function ResetPassword() {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)
  const [ready, setReady]         = useState(false)
  const navigate = useNavigate()

  // Supabase envoie le token dans le hash de l'URL
  // On attend que la session soit restaurée
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-forge-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-block mb-4">
            <span className="font-mono text-2xl text-forge-accent font-medium tracking-tight">TRADE</span>
            <span className="font-mono text-2xl text-white font-medium tracking-tight">FORGE</span>
          </div>
          <p className="text-forge-muted text-sm">Journal de trading avancé</p>
        </div>

        <p className="text-center text-sm font-medium text-white mb-5">
          Nouveau mot de passe
        </p>

        {success ? (
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
              style={{ background: 'rgba(46,160,67,0.15)', border: '1px solid rgba(46,160,67,0.3)' }}>
              <span className="text-forge-green text-xl">✓</span>
            </div>
            <p className="text-forge-green text-sm">Mot de passe mis à jour !</p>
            <p className="text-forge-muted text-xs">Redirection en cours…</p>
          </div>
        ) : !ready ? (
          <div className="text-center space-y-3">
            <div className="w-6 h-6 border-2 border-forge-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-forge-muted text-sm">Vérification du lien…</p>
            <button onClick={() => navigate('/login')}
              className="text-xs text-forge-muted hover:text-white transition-colors">
              Retourner à la connexion
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nouveau mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" className="w-full" required minLength={6} />
            </div>
            <div>
              <label className="label">Confirmer le mot de passe</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••" className="w-full" required minLength={6} />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
            </button>

            <button type="button" onClick={() => navigate('/login')}
              className="w-full text-center text-forge-muted text-sm hover:text-white transition-colors">
              ← Retour à la connexion
            </button>
          </form>
        )}
      </div>
    </div>
  )
}