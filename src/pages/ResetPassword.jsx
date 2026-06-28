import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [ready, setReady]       = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 6)  { setError('Le mot de passe doit contenir au moins 6 caractères.'); return }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setSuccess(true)
      setTimeout(() => navigate('/app/dashboard'), 2000)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-block mb-4">
            <span className="font-mono text-2xl text-forge-accent font-medium tracking-tight">TRADE</span>
            <span className="font-mono text-2xl font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>FORGE</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--forge-muted)' }}>Journal de trading avancé</p>
        </div>

        <p className="text-center text-sm font-medium mb-5" style={{ color: 'var(--text-primary)' }}>
          Nouveau mot de passe
        </p>

        {success ? (
          <div className="text-center space-y-3">
            <div
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
              style={{ background: 'rgba(46,160,67,0.15)', border: '1px solid rgba(46,160,67,0.3)' }}
            >
              <span className="text-forge-green text-xl">✓</span>
            </div>
            <p className="text-forge-green text-sm">Mot de passe mis à jour !</p>
            <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>Redirection en cours…</p>
          </div>

        ) : !ready ? (
          <div className="text-center space-y-3">
            <div className="w-6 h-6 border-2 border-forge-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm" style={{ color: 'var(--forge-muted)' }}>Vérification du lien…</p>
            <button
              onClick={() => navigate('/app/login')}
              className="text-xs transition-colors"
              style={{ color: 'var(--forge-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}
            >
              Retourner à la connexion
            </button>
          </div>

        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nouveau mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="label">Confirmer le mot de passe</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full"
                required
                minLength={6}
              />
            </div>

            {error && (
              <p
                className="text-xs rounded-xl px-3 py-2"
                style={{
                  background: 'rgba(248,81,73,0.1)',
                  border: '1px solid rgba(248,81,73,0.2)',
                  color: '#F85149',
                }}
              >
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/app/login')}
              className="w-full text-center text-sm transition-colors"
              style={{ color: 'var(--forge-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}
            >
              ← Retour à la connexion
            </button>
          </form>
        )}
      </div>
    </div>
  )
}