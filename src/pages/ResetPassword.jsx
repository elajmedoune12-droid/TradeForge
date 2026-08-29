import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../services/supabase'
import { useTheme } from '../hooks/useTheme'
import AnimatedBackground from '../components/AnimatedBackground'
import CustomCursor from '../components/CustomCursor'
import BackToHome from '../components/BackToHome'

const ease = [0.22, 1, 0.36, 1]

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [ready, setReady]       = useState(false)
  const navigate = useNavigate()
  const { isDark } = useTheme()

  const card = {
    background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.7)',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(20,16,8,0.08)',
    backdropFilter: 'blur(14px)',
  }

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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <AnimatedBackground isDark={isDark} />

      <motion.div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(420px, 80vw)', height: 'min(420px, 80vh)', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(247,183,49,0.14), transparent 65%)',
        filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0,
      }}
        animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.08, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease }}
        className="w-full max-w-sm relative" style={{ zIndex: 1 }}>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-10"
        >
          <motion.div whileHover={{ scale: 1.03 }} className="inline-block mb-4">
            <span className="font-mono text-2xl text-forge-accent font-medium tracking-tight">TRADE</span>
            <span className="font-mono text-2xl font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>FORGE</span>
          </motion.div>
          <p className="text-sm" style={{ color: 'var(--forge-muted)' }}>Journal de trading avancé</p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center text-sm font-medium mb-5" style={{ color: 'var(--text-primary)' }}
        >
          Nouveau mot de passe
        </motion.p>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease }}
            className="text-center space-y-3"
          >
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.2 }}
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
              style={{
                background: 'rgba(46,160,67,0.15)', border: '1px solid rgba(46,160,67,0.3)',
                boxShadow: '0 0 30px rgba(46,160,67,0.25)',
              }}
            >
              <span className="text-forge-green text-xl">✓</span>
            </motion.div>
            <p className="text-forge-green text-sm">Mot de passe mis à jour !</p>
            <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>Redirection en cours…</p>
          </motion.div>

        ) : !ready ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-3"
          >
            <div className="w-6 h-6 border-2 border-forge-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm" style={{ color: 'var(--forge-muted)' }}>Vérification du lien…</p>
            <button
              onClick={() => navigate('/login')}
              className="text-xs transition-colors"
              style={{ color: 'var(--forge-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}
            >
              Retourner à la connexion
            </button>
          </motion.div>

        ) : (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            onSubmit={handleSubmit}
            style={{
              borderRadius: 22, padding: '24px 22px',
              ...card,
              boxShadow: isDark
                ? '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(247,183,49,0.08), 0 0 40px rgba(247,183,49,0.06)'
                : '0 20px 50px rgba(0,0,0,0.12), 0 0 0 1px rgba(247,183,49,0.12), 0 0 30px rgba(247,183,49,0.06)',
            }}
            className="space-y-4"
          >
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

            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="btn-primary w-full py-3"
            >
              {loading ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
            </motion.button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full text-center text-sm transition-colors"
              style={{ color: 'var(--forge-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}
            >
              ← Retour à la connexion
            </button>
          </motion.form>
        )}
      </motion.div>

      {/* Bouton retour à l'accueil (flottant) */}
      <BackToHome />

      {/* Curseur personnalisé animé (desktop) */}
      <CustomCursor />
    </div>
  )
}
