import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { signIn, signUp, supabase } from '../services/supabase'

export default function Login() {
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode]                 = useState('login')
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
      navigate('/dashboard')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xs">

        {/* Logo */}
        <div className="text-center mb-8">
          <p className="font-mono text-2xl font-bold tracking-tight mb-1">
            <span className="text-forge-accent">TRADE</span>
            <span className="text-white">FORGE</span>
          </p>
          <p className="text-forge-muted text-xs uppercase tracking-widest">Journal de trading avancé</p>
        </div>

        {/* Card */}
        <div className="card space-y-4">

          {/* Header */}
          <div>
            {mode !== 'login' && (
              <button onClick={() => switchMode('login')}
                className="flex items-center gap-1 text-forge-muted hover:text-white transition-colors text-xs mb-3">
                <ArrowLeft size={12} /> Retour
              </button>
            )}
            <p className="text-sm font-semibold text-white">
              {mode === 'login'  && 'Connexion'}
              {mode === 'signup' && 'Créer un compte'}
              {mode === 'reset'  && 'Mot de passe oublié'}
            </p>
            <p className="text-xs text-forge-muted mt-0.5">
              {mode === 'login'  && 'Bienvenue sur TradeForge'}
              {mode === 'signup' && 'Commencez votre journal de trading'}
              {mode === 'reset'  && 'Recevez un lien de réinitialisation par email'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Email */}
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="trader@mail.com"
                className="w-full"
                required
              />
            </div>

            {/* Password */}
            {mode !== 'reset' && (
              <div>
                <label className="label">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-forge-muted hover:text-white transition-colors">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-xs rounded-xl px-3 py-2"
                style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.25)', color: '#F85149' }}>
                {error}
              </p>
            )}

            {/* Success */}
            {success && (
              <p className="text-xs rounded-xl px-3 py-2"
                style={{ background: 'rgba(46,160,67,0.1)', border: '1px solid rgba(46,160,67,0.3)', color: '#2EA043' }}>
                ✓ {success}
              </p>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Chargement…</>
                : mode === 'login'  ? 'Se connecter'
                : mode === 'signup' ? 'Créer un compte'
                : 'Envoyer le lien'
              }
            </button>
          </form>

          {/* Forgot password */}
          {mode === 'login' && (
            <button onClick={() => switchMode('reset')}
              className="w-full text-center text-forge-muted text-xs hover:text-white transition-colors pt-1">
              Mot de passe oublié ?
            </button>
          )}
        </div>

        {/* Switch mode */}
        {mode !== 'reset' && (
          <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            className="w-full text-center text-forge-muted text-sm mt-4 hover:text-white transition-colors">
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