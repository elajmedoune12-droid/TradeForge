import { useMemo } from 'react'

const PARTICLES = 16

export default function AnimatedBackground({ isDark }) {
  const particles = useMemo(() =>
    Array.from({ length: PARTICLES }).map((_, i) => ({
      left: `${(i * 6.2 + 3) % 100}%`,
      size: 2 + ((i * 3) % 4),
      duration: 14 + ((i * 2.3) % 12),
      delay: -((i * 1.7) % 20),
      opacity: 0.35 + ((i * 0.6) % 40) / 100,
      color: i % 3 === 0 ? '#F7B731' : i % 3 === 1 ? '#2EA043' : '#58a6ff',
    })), []
  )

  const auroraColor = isDark
    ? 'rgba(247,183,49,0.14)'
    : 'rgba(247,183,49,0.18)'

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div className="tf-bg-grid" />

      <div className="tf-aurora tf-aurora--1"
        style={{ top: '-8%', left: '45%', width: 560, height: 560, background: auroraColor }} />

      <div className="tf-aurora tf-aurora--2"
        style={{ top: '25%', right: '-8%', width: 380, height: 380,
          background: isDark ? 'rgba(88,166,255,0.10)' : 'rgba(88,166,255,0.14)' }} />

      <div className="tf-aurora tf-aurora--3"
        style={{ top: '12%', left: '-6%', width: 320, height: 320,
          background: isDark ? 'rgba(46,160,67,0.10)' : 'rgba(46,160,67,0.12)' }} />

      {particles.map((p, i) => (
        <span key={i} className="tf-particle"
          style={{
            left: p.left, width: p.size, height: p.size,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            '--p-op': p.opacity,
            bottom: '-20px',
          }} />
      ))}
    </div>
  )
}
