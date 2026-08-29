import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { BarChart2 } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import AnimatedBackground from '../components/AnimatedBackground'
import BackToHome from '../components/BackToHome'

export default function NotFound() {
  const navigate = useNavigate()
  const { isDark } = useTheme()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <AnimatedBackground isDark={isDark} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center relative"
        style={{ zIndex: 1 }}
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 64, height: 64, borderRadius: 18, margin: '0 auto 22px',
            background: 'linear-gradient(135deg,#F7B731 0%,#e0a020 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(247,183,49,0.35)',
          }}
        >
          <BarChart2 size={30} color="#070A0F" strokeWidth={2.5} />
        </motion.div>

        <p style={{
          fontSize: 'clamp(3.5rem,12vw,6rem)', fontWeight: 900, lineHeight: 1,
          fontFamily: 'JetBrains Mono, monospace', color: '#F7B731',
          textShadow: isDark ? '0 0 50px rgba(247,183,49,0.4)' : 'none',
        }}>
          404
        </p>
        <p style={{ fontWeight: 800, fontSize: 'clamp(1.2rem,3vw,1.5rem)', color: 'var(--text-primary)', margin: '8px 0 6px' }}>
          Page introuvable
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 320, margin: '0 auto 26px', lineHeight: 1.6 }}>
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>

        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/app/dashboard')}
          className="btn-primary"
          style={{ padding: '12px 28px', fontSize: 14 }}
        >
          Retour au tableau de bord
        </motion.button>
      </motion.div>

      <BackToHome />
    </div>
  )
}
