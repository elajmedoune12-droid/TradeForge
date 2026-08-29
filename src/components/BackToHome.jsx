import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Home } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

export default function BackToHome({ position = 'top-left' }) {
  const navigate = useNavigate()
  const { isDark } = useTheme()

  const topLeft = position === 'top-left'
  const style = {
    position: 'fixed',
    top: 'calc(env(safe-area-inset-top, 0px) + 18px)',
    [topLeft ? 'left' : 'right']: 'calc(env(safe-area-inset-right, 0px) + 18px)',
    zIndex: 50,
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '9px 14px', borderRadius: 999,
    cursor: 'pointer',
    background: isDark ? 'rgba(16,20,28,0.6)' : 'rgba(255,255,255,0.75)',
    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(20,16,8,0.08)',
    backdropFilter: 'blur(14px)',
    color: 'var(--text-secondary)',
    boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.35)' : '0 8px 30px rgba(0,0,0,0.08)',
    fontSize: 12.5, fontWeight: 600,
  }

  return (
    <motion.button
      type="button"
      onClick={() => navigate('/')}
      initial={{ opacity: 0, x: topLeft ? -16 : 16, y: -8 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      whileHover={{ scale: 1.05, x: topLeft ? -3 : 3 }}
      whileTap={{ scale: 0.96 }}
      style={style}
    >
      <motion.span
        animate={{ x: topLeft ? [0, -3, 0] : [0, 3, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ display: 'inline-flex', color: '#F7B731' }}
      >
        {topLeft ? <ArrowLeft size={14} /> : <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />}
      </motion.span>
      <span>Accueil</span>
      <motion.span
        whileHover={{ rotate: -10, scale: 1.1 }}
        style={{ display: 'inline-flex', color: 'var(--forge-muted)' }}
      >
        <Home size={13} />
      </motion.span>
    </motion.button>
  )
}
