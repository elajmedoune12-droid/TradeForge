import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, BarChart2 } from 'lucide-react'
import { signIn, signUp, supabase } from '../services/supabase'

export default function Login() {
  const [searchParams]                  = useSearchParams()
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode]                 = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'login')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState('')
  const navigate = useNavigate()

  const switchMode = (next) => { setError(''); setSuccess(''); setMode(next) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    setLoading(true)
    try {
      if (mode === 'reset') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (err) throw err
        setSuccess('Lien envoyé ! Vérifiez votre boîte mail.')
        return
      }
      const fn = mode === 'login' ? signIn : signUp
      const { error: err } = await fn(email, password)
      if (err) throw err
      navigate('/app/dashboard')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xs">

        {/* Logo + retour accueil */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs mb-4 transition-colors"
            style={{ color: 'var(--forge-muted)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}
          >
            <ArrowLeft size={12} /> Retour à l'accueil
          </button>

          <div className="flex items-center justify-center gap-2 mb-2">
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg,#F7B731 0%,#e0a020 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <BarChart2 size={14} color="#070A0F" strokeWidth={2.5} />
            </div>
            <p className="font-mono text-xl font-bold tracking-tight">
              <span className="text-forge-accent">TRADE</span>
              <span style={{ color: 'var(--text-primary)' }}>FORGE</span>
            </p>
          </div>
          <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--forge-muted)' }}>
            Journal de trading avancé
          </p>
        </div>

        {/* Card */}
        <div className="card space-y-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {mode === 'login'  && 'Connexion'}
              {mode === 'signup' && 'Créer un compte'}
              {mode === 'reset'  && 'Mot de passe oublié'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--forge-muted)' }}>
              {mode === 'login'  && 'Bienvenue sur TradeForge'}
              {mode === 'signup' && 'Commencez votre journal de trading'}
              {mode === 'reset'  && 'Recevez un lien de réinitialisation par email'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">Email</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="trader@mail.com"
                className="w-full" required
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="label">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10" required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--forge-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs rounded-xl px-3 py-2" style={{
                background: 'rgba(248,81,73,0.1)',
                border: '1px solid rgba(248,81,73,0.25)',
                color: '#F85149',
              }}>{error}</p>
            )}

            {success && (
              <p className="text-xs rounded-xl px-3 py-2" style={{
                background: 'rgba(46,160,67,0.1)',
                border: '1px solid rgba(46,160,67,0.3)',
                color: '#2EA043',
              }}>✓ {success}</p>
            )}

            <button
              type="submit" disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Chargement…</>
              ) : mode === 'login'  ? 'Se connecter'
                : mode === 'signup' ? 'Créer un compte'
                : 'Envoyer le lien'}
            </button>
          </form>

          {mode === 'login' && (
            <button
              onClick={() => switchMode('reset')}
              className="w-full text-center text-xs pt-1 transition-colors"
              style={{ color: 'var(--forge-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}
            >
              Mot de passe oublié ?
            </button>
          )}
        </div>

        {mode !== 'reset' && (
          <button
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            className="w-full text-center text-sm mt-4 transition-colors"
            style={{ color: 'var(--forge-muted)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}
          >
            {mode === 'login'
              ? <>Pas encore de compte ? <span className="text-forge-accent font-medium">S'inscrire</span></>
              : <>Déjà un compte ? <span className="text-forge-accent font-medium">Se connecter</span></>
            }
          </button>
        )}
      </div>
    </div>
  )
}