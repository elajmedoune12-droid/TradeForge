import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, BarChart2, Shield, TrendingUp, Zap } from 'lucide-react'
import { signIn, signUp, supabase } from '../services/supabase'
import { useTheme } from '../hooks/useTheme'
import AnimatedBackground from '../components/AnimatedBackground'
import CustomCursor from '../components/CustomCursor'
import BackToHome from '../components/BackToHome'

const ease = [0.22, 1, 0.36, 1]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
}
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const MORE = [
  { icon: Shield,    text: 'Données chiffrées'  },
  { icon: TrendingUp, text: 'Insights IA'        },
  { icon: Zap,       text: 'Journal ultra-rapide' },
]

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
  const { isDark } = useTheme()

  const card = {
    background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.7)',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(20,16,8,0.08)',
    backdropFilter: 'blur(14px)',
  }

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

  const title = mode === 'login' ? 'Connexion' : mode === 'signup' ? 'Créer un compte' : 'Mot de passe oublié'
  const sub   = mode === 'login' ? 'Bienvenue sur TradeForge'
            : mode === 'signup' ? 'Commencez votre journal de trading'
            : 'Recevez un lien de réinitialisation par email'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Fond animé */}
      <AnimatedBackground isDark={isDark} />

      {/* Halo lumineux derrière la carte */}
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
        className="w-full max-w-xs relative" style={{ zIndex: 1 }}>

        {/* Logo */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="text-center mb-8">
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-2 mb-2">
            <motion.div whileHover={{ rotate: 8, scale: 1.08 }}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg,#F7B731 0%,#e0a020 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 20px rgba(247,183,49,0.35)',
              }}>
              <BarChart2 size={14} color="#070A0F" strokeWidth={2.5} />
            </motion.div>
            <p className="font-mono text-xl font-bold tracking-tight">
              <span className="text-forge-accent">TRADE</span>
              <span style={{ color: 'var(--text-primary)' }}>FORGE</span>
            </p>
          </motion.div>
          <motion.p variants={fadeUp} className="text-xs uppercase tracking-widest" style={{ color: 'var(--forge-muted)' }}>
            Journal de trading avancé
          </motion.p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.15 }}
          style={{
            borderRadius: 22, padding: '24px 20px',
            ...card,
            boxShadow: isDark
              ? '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(247,183,49,0.08), 0 0 40px rgba(247,183,49,0.06)'
              : '0 20px 50px rgba(0,0,0,0.12), 0 0 0 1px rgba(247,183,49,0.12), 0 0 30px rgba(247,183,49,0.06)',
          }}
        >
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={fadeUp}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--forge-muted)' }}>{sub}</p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-3 mt-4">
              <motion.div variants={fadeUp}>
                <label className="label">Email</label>
                <input
                  type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="trader@mail.com"
                  className="w-full" required
                />
              </motion.div>

              {mode !== 'reset' && (
                <motion.div variants={fadeUp}>
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
                </motion.div>
              )}

              {error && (
                <motion.p variants={fadeUp} initial="hidden" animate="show"
                  className="text-xs rounded-xl px-3 py-2" style={{
                    background: 'rgba(248,81,73,0.1)',
                    border: '1px solid rgba(248,81,73,0.25)',
                    color: '#F85149',
                  }}>{error}</motion.p>
              )}

              {success && (
                <motion.p variants={fadeUp} initial="hidden" animate="show"
                  className="text-xs rounded-xl px-3 py-2" style={{
                    background: 'rgba(46,160,67,0.1)',
                    border: '1px solid rgba(46,160,67,0.3)',
                    color: '#2EA043',
                  }}>✓ {success}</motion.p>
              )}

              <motion.div variants={fadeUp}>
                <motion.button
                  type="submit" disabled={loading}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Chargement…</>
                  ) : mode === 'login'  ? 'Se connecter'
                    : mode === 'signup' ? 'Créer un compte'
                    : 'Envoyer le lien'}
                </motion.button>
              </motion.div>
            </form>

            {mode === 'login' && (
              <motion.div variants={fadeUp}>
                <button
                  onClick={() => switchMode('reset')}
                  className="w-full text-center text-xs pt-3 transition-colors"
                  style={{ color: 'var(--forge-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}
                >
                  Mot de passe oublié ?
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {mode !== 'reset' && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
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
          </motion.button>
        )}

        {/* Pastilles de confiance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{
            display: 'flex', justifyContent: 'center', gap: 12,
            marginTop: 24, flexWrap: 'wrap',
          }}>
          {MORE.map(({ icon: Icon, text }) => (
            <span key={text} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 10, color: 'var(--forge-muted)',
              padding: '5px 10px', borderRadius: 20,
              ...card,
            }}>
              <Icon size={11} color="#F7B731" /> {text}
            </span>
          ))}
        </motion.div>
      </motion.div>

      {/* Bouton retour à l'accueil (flottant) */}
      <BackToHome />

      {/* Curseur personnalisé animé (desktop) */}
      <CustomCursor />
    </div>
  )
}
