import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Image, BookMarked, ZoomIn, X, ChevronLeft, ChevronRight, Clock, Globe, Target, Pencil } from 'lucide-react'
import { getHindsightsStandalone, deleteHindsightStandalone } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { SkeletonCard } from '../components/Skeleton'

// ── Lightbox ─────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex)
  const img = images[idx]

  useEffect(() => {
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape')      onClose()
      if (e.key === 'ArrowRight')  setIdx(i => Math.min(i + 1, images.length - 1))
      if (e.key === 'ArrowLeft')   setIdx(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = orig; window.removeEventListener('keydown', onKey) }
  }, [images.length, onClose])

  const content = (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: '#000', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 'calc(env(safe-area-inset-top) + 10px)', paddingBottom: '10px',
        paddingLeft: 16, paddingRight: 16, flexShrink: 0,
        background: 'rgba(0,0,0,0.9)', borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#8B949E', fontFamily: 'monospace' }}>{idx + 1} / {images.length}</span>
          {img?.timeframe && (
            <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: 'rgba(247,183,49,0.2)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.4)' }}>
              {img.timeframe}
            </span>
          )}
        </div>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <X size={18} />
        </button>
      </div>

      {/* Image */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: images.length > 1 ? '12px 56px' : '12px' }}>
        {idx > 0 && (
          <button onClick={() => setIdx(i => i - 1)} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 1 }}>
            <ChevronLeft size={20} />
          </button>
        )}
        <img key={img?.url} src={img?.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8, userSelect: 'none' }} />
        {idx < images.length - 1 && (
          <button onClick={() => setIdx(i => i + 1)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 1 }}>
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 8, padding: '8px 16px 14px', flexShrink: 0, background: 'rgba(0,0,0,0.8)', borderTop: '1px solid rgba(255,255,255,0.07)', overflowX: 'auto' }}>
          {images.map((im, i) => (
            <button key={i} onClick={() => setIdx(i)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 0 }}>
              <div style={{ borderRadius: 6, overflow: 'hidden', border: `2px solid ${i === idx ? '#F7B731' : 'transparent'}`, opacity: i === idx ? 1 : 0.4, transition: 'all 0.15s' }}>
                <img src={im.url} alt="" style={{ width: 60, height: 42, objectFit: 'cover', display: 'block' }} />
              </div>
              {im.timeframe && <span style={{ fontSize: 9, fontFamily: 'monospace', color: i === idx ? '#F7B731' : '#8B949E' }}>{im.timeframe}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
  return createPortal(content, document.body)
}

// ── DetailPanel ───────────────────────────────────────────────
function DetailPanel({ item, onClose, onDelete, onOpenImage }) {
  const [deleting, setDeleting] = useState(false)
  const images = item.images || []
  const byTF = {}
  images.forEach((img, globalIdx) => {
    const key = img.timeframe || 'Sans timeframe'
    if (!byTF[key]) byTF[key] = []
    byTF[key].push({ ...img, globalIdx })
  })

  useEffect(() => {
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = orig; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  const handleDelete = async () => {
    if (!confirm('Supprimer ce hindsight définitivement ?')) return
    setDeleting(true)
    await onDelete(item.id)
    onClose()
  }

  const content = (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'var(--modal-overlay)', backdropFilter: 'blur(6px)', cursor: 'pointer' }}
      />

      {/* Panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 760, maxHeight: '88vh', overflowY: 'auto',
          background: 'var(--modal-bg)',
          border: '1px solid var(--border-medium)',
          borderRadius: 20,
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
        }}
      >
        {/* Sticky header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'var(--modal-bg)',
          borderBottom: '1px solid var(--border-soft)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(46,160,67,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookMarked size={15} color="#2EA043" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                {format(parseISO(item.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
              {images.length > 0 && (
                <p style={{ fontSize: 11, color: 'var(--forge-muted)', margin: 0 }}>
                  {images.length} image{images.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleDelete} disabled={deleting}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, cursor: 'pointer', background: 'rgba(248,81,73,0.12)', border: '1px solid rgba(248,81,73,0.35)', color: '#F85149', fontSize: 12, fontWeight: 600, opacity: deleting ? 0.5 : 1, transition: 'all 0.15s' }}
            >
              <Trash2 size={13} />{deleting ? 'Suppression…' : 'Supprimer'}
            </button>
            <button
              onClick={onClose}
              style={{ width: 34, height: 34, borderRadius: 10, cursor: 'pointer', background: 'var(--surface-6)', border: '1px solid var(--border-soft)', color: 'var(--forge-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          {(item.timeframes?.length > 0 || item.markets?.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 20 }}>
              {item.timeframes?.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, color: 'var(--forge-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>⏱ Timeframes</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {item.timeframes.map(tf => (
                      <span key={tf} style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(247,183,49,0.12)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.3)' }}>{tf}</span>
                    ))}
                  </div>
                </div>
              )}
              {item.markets?.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, color: 'var(--forge-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>🌐 Marchés</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {item.markets.map(m => (
                      <span key={m} style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(46,160,67,0.12)', color: '#2EA043', border: '1px solid rgba(46,160,67,0.3)' }}>{m}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {item.notes && (
            <div style={{ borderRadius: 12, padding: '14px 18px', marginBottom: 24, background: 'var(--surface-3)', border: '1px solid var(--border-soft)' }}>
              <p style={{ fontSize: 10, color: 'var(--forge-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Notes</p>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>{item.notes}</p>
            </div>
          )}

          {images.length > 0 && Object.entries(byTF).map(([tf, imgs]) => (
            <div key={tf} style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, marginBottom: 10, color: tf === 'Sans timeframe' ? 'var(--forge-muted)' : '#F7B731', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{tf}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))', gap: 10 }}>
                {imgs.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => onOpenImage(img.globalIdx)}
                    style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '16/9', border: '1px solid var(--border-soft)', cursor: 'pointer', padding: 0, background: 'none', transition: 'transform 0.15s, border-color 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.025)'; e.currentTarget.style.borderColor = 'rgba(247,183,49,0.4)'; e.currentTarget.querySelector('.ov').style.opacity = '1' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.querySelector('.ov').style.opacity = '0' }}
                  >
                    <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div className="ov" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}>
                      <ZoomIn size={22} color="white" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
  return createPortal(content, document.body)
}

// ── HindsightCard ─────────────────────────────────────────────
function HindsightCard({ item, onClick }) {
  const images  = item.images || []
  const preview = images[0]?.url
  return (
    <div onClick={onClick} className="card-hover group flex gap-4 cursor-pointer active:scale-[0.99]">
      <div style={{
        flexShrink: 0, width: 76, height: 76, borderRadius: 12, overflow: 'hidden',
        background: 'var(--surface-4)', border: '1px solid var(--border-soft)',
      }}>
        {preview
          ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookMarked size={18} style={{ color: 'var(--forge-muted)', opacity: 0.35 }} />
            </div>
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, color: 'var(--forge-muted)', marginBottom: 6 }}>
          {format(parseISO(item.created_at), 'd MMM yyyy', { locale: fr })}
        </p>
        {item.timeframes?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 5 }}>
            {item.timeframes.slice(0, 5).map(tf => (
              <span key={tf} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, fontWeight: 600, background: 'rgba(247,183,49,0.1)', color: '#F7B731' }}>{tf}</span>
            ))}
          </div>
        )}
        {item.markets?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 5 }}>
            {item.markets.slice(0, 3).map(m => (
              <span key={m} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, fontWeight: 600, background: 'rgba(46,160,67,0.1)', color: '#2EA043' }}>{m}</span>
            ))}
          </div>
        )}
        {item.notes && (
          <p style={{ fontSize: 12, color: 'var(--forge-muted)', lineHeight: 1.5, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {item.notes}
          </p>
        )}
        {images.length > 0 && (
          <p style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Image size={9} /> {images.length} image{images.length > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}

// ── HindsightGoals ────────────────────────────────────────────
function HindsightGoals({ items }) {
  const [cycles, setCycles] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hs_cycles') || '[]') } catch { return [] }
  })
  const [currentCycle, setCurrentCycle] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hs_current_cycle') || 'null') } catch { return null }
  })
  const [showHistory, setShowHistory] = useState(false)
  const [showNewCycle, setShowNewCycle] = useState(false)
  const [editing, setEditing] = useState(!currentCycle)
  const [form, setForm] = useState({
    weekly:  currentCycle?.weekly  || '',
    monthly: currentCycle?.monthly || '',
    streak:  currentCycle?.streak  || '',
  })

  const saveCycles = (cycs, current) => {
    localStorage.setItem('hs_cycles', JSON.stringify(cycs))
    localStorage.setItem('hs_current_cycle', JSON.stringify(current))
  }

  const streak = useMemo(() => {
    if (!items.length) return 0
    const dates = [...new Set(items.map(i => i.created_at.slice(0, 10)))].sort().reverse()
    let count = 0
    let current = new Date(); current.setHours(0, 0, 0, 0)
    for (const date of dates) {
      const d    = new Date(date + 'T00:00:00')
      const diff = Math.round((current - d) / (1000 * 60 * 60 * 24))
      if (diff === 0 || diff === 1) { count++; current = d } else break
    }
    return count
  }, [items])

  const thisWeek = useMemo(() => {
    const now = new Date(), start = new Date(now)
    const day = now.getDay()
    start.setDate(now.getDate() + (day === 0 ? -6 : 1 - day)); start.setHours(0, 0, 0, 0)
    return items.filter(i => new Date(i.created_at) >= start).length
  }, [items])

  const thisMonth = useMemo(() => {
    const now = new Date()
    return items.filter(i => { const d = new Date(i.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() }).length
  }, [items])

  const startCycle = () => {
    const newCycle = { id: Date.now(), startedAt: new Date().toISOString().slice(0, 10), weekly: form.weekly ? +form.weekly : null, monthly: form.monthly ? +form.monthly : null, streak: form.streak ? +form.streak : null }
    setCurrentCycle(newCycle); saveCycles(cycles, newCycle); setEditing(false)
  }

  const completeCycle = () => {
    const completed = { ...currentCycle, endedAt: new Date().toISOString().slice(0, 10), achievedWeekly: thisWeek, achievedMonthly: thisMonth, achievedStreak: streak }
    const newCycles = [...cycles, completed]
    setCycles(newCycles); setCurrentCycle(null); setForm({ weekly: '', monthly: '', streak: '' })
    saveCycles(newCycles, null); setShowNewCycle(false); setEditing(true)
  }

  const allDone = currentCycle && [
    currentCycle.weekly  ? thisWeek  >= currentCycle.weekly  : null,
    currentCycle.monthly ? thisMonth >= currentCycle.monthly : null,
    currentCycle.streak  ? streak    >= currentCycle.streak  : null,
  ].filter(v => v !== null).every(Boolean)

  const goals = currentCycle ? [
    currentCycle.weekly  && { label: 'Semaine', current: thisWeek,  goal: currentCycle.weekly,  color: '#58a6ff', unit: '' },
    currentCycle.monthly && { label: 'Ce mois', current: thisMonth, goal: currentCycle.monthly, color: '#F7B731', unit: '' },
    currentCycle.streak  && { label: 'Streak',  current: streak,    goal: currentCycle.streak,  color: '#2EA043', unit: '🔥' },
  ].filter(Boolean) : []

  return (
    <>
      {/* ── Modal historique ── */}
      {showHistory && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'var(--modal-overlay)', backdropFilter: 'blur(6px)' }} onClick={() => setShowHistory(false)} />
          <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'var(--modal-bg)', border: '1px solid var(--border-medium)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)', maxHeight: '80vh' }}>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b" style={{ borderColor: 'var(--border-soft)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Historique des objectifs</p>
              <button onClick={() => setShowHistory(false)} style={{ color: 'var(--forge-muted)' }}><X size={16} /></button>
            </div>
            <div className="overflow-y-auto p-3 space-y-3" style={{ maxHeight: 'calc(80vh - 60px)' }}>
              {cycles.length === 0 ? (
                <p className="text-xs text-center py-8" style={{ color: 'var(--forge-muted)' }}>Aucun objectif complété pour l'instant.</p>
              ) : (
                [...cycles].reverse().map((c, i) => {
                  const cGoals = [
                    c.weekly  && { label: 'Semaine', target: c.weekly,  achieved: c.achievedWeekly,  color: '#58a6ff' },
                    c.monthly && { label: 'Mois',    target: c.monthly, achieved: c.achievedMonthly, color: '#F7B731' },
                    c.streak  && { label: 'Streak',  target: c.streak,  achieved: c.achievedStreak,  color: '#2EA043' },
                  ].filter(Boolean)
                  const allAchieved = cGoals.every(g => g.achieved >= g.target)
                  return (
                    <div key={c.id} className="rounded-xl p-3"
                      style={{ background: allAchieved ? 'rgba(46,160,67,0.06)' : 'var(--surface-3)', border: `1px solid ${allAchieved ? 'rgba(46,160,67,0.2)' : 'var(--border-soft)'}` }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{allAchieved ? '🏆' : '📋'}</span>
                          <div>
                            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Cycle #{cycles.length - i}</p>
                            <p className="text-[10px]" style={{ color: 'var(--forge-muted)' }}>{c.startedAt} → {c.endedAt}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: allAchieved ? 'rgba(46,160,67,0.15)' : 'var(--surface-5)', color: allAchieved ? '#2EA043' : 'var(--forge-muted)' }}>
                            {allAchieved ? '✓ Atteint' : 'Incomplet'}
                          </span>
                          <button
                            onClick={() => { const n = cycles.filter(x => x.id !== c.id); setCycles(n); saveCycles(n, currentCycle) }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                            style={{ color: 'var(--forge-muted)' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#F85149'; e.currentTarget.style.background = 'rgba(248,81,73,0.1)' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--forge-muted)'; e.currentTarget.style.background = 'transparent' }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {cGoals.map(g => (
                          <div key={g.label}>
                            <div className="flex justify-between text-[10px] mb-0.5">
                              <span style={{ color: 'var(--forge-muted)' }}>{g.label}</span>
                              <span style={{ color: g.achieved >= g.target ? '#2EA043' : g.color }}>{g.achieved}/{g.target} {g.achieved >= g.target ? '✓' : ''}</span>
                            </div>
                            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-8)' }}>
                              <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round(g.achieved / g.target * 100))}%`, background: g.achieved >= g.target ? '#2EA043' : g.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Card objectifs ── */}
      <div className="rounded-2xl p-4 mb-5"
        style={{ background: 'var(--surface-card)', border: '1px solid rgba(46,160,67,0.2)', boxShadow: '0 0 24px rgba(46,160,67,0.04)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(46,160,67,0.15)' }}>
              <Target size={12} style={{ color: '#2EA043' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Objectifs d'étude</p>
          </div>
          <div className="flex items-center gap-2">
            {cycles.length > 0 && (
              <button onClick={() => setShowHistory(true)} className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: 'var(--forge-muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}>
                <Clock size={11} /> Historique ({cycles.length})
              </button>
            )}
            {currentCycle && !editing && (
              <button onClick={() => setEditing(true)} className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: 'var(--forge-muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}>
                <Pencil size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Form édition objectifs */}
        {editing && (
          <div className="space-y-3 mb-4">
            <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>
              {currentCycle ? 'Modifier les objectifs' : 'Définir vos objectifs'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'weekly',  label: 'Semaine', placeholder: 'ex: 3' },
                { key: 'monthly', label: 'Ce mois', placeholder: 'ex: 12' },
                { key: 'streak',  label: 'Streak',  placeholder: 'ex: 7' },
              ].map(f => (
                <div key={f.key}>
                  <p className="text-[10px] mb-1" style={{ color: 'var(--forge-muted)' }}>{f.label}</p>
                  <input type="number" min="1" value={form[f.key]}
                    onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} className="w-full text-sm" />
                </div>
              ))}
            </div>
            <p className="text-[10px]" style={{ color: 'var(--forge-muted)' }}>Laissez vide les objectifs à ignorer.</p>
            <div className="flex gap-2">
              <button onClick={startCycle} disabled={!form.weekly && !form.monthly && !form.streak}
                className="btn-primary flex-1 text-xs py-2 disabled:opacity-40">
                {currentCycle ? 'Mettre à jour' : 'Démarrer'}
              </button>
              {currentCycle && <button onClick={() => setEditing(false)} className="btn-ghost text-xs py-2 px-3">Annuler</button>}
            </div>
          </div>
        )}

        {/* Affichage progression */}
        {!editing && currentCycle && goals.length > 0 && (
          <>
            <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: `repeat(${goals.length}, 1fr)` }}>
              {goals.map((g, i) => {
                const p    = Math.min(100, Math.round((g.current / g.goal) * 100))
                const done = g.current >= g.goal
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="relative" style={{ width: 70, height: 70 }}>
                      <svg width={70} height={70} style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx={35} cy={35} r={29} fill="none" stroke="var(--surface-8)" strokeWidth={7} />
                        <circle cx={35} cy={35} r={29} fill="none" stroke={done ? '#2EA043' : g.color} strokeWidth={7}
                          strokeDasharray={`${(p / 100) * 2 * Math.PI * 29} ${2 * Math.PI * 29}`} strokeLinecap="round"
                          style={{ transition: 'stroke-dasharray 0.8s ease', filter: done ? 'drop-shadow(0 0 4px #2EA043)' : `drop-shadow(0 0 3px ${g.color}88)` }} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-mono font-bold" style={{ color: done ? '#2EA043' : g.color }}>
                          {done ? '✓' : `${p}%`}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] font-medium" style={{ color: 'var(--forge-muted)' }}>{g.label}</p>
                    <p className="text-[10px]" style={{ color: done ? '#2EA043' : 'var(--forge-muted)' }}>{g.current}{g.unit} / {g.goal}{g.unit}</p>
                  </div>
                )
              })}
            </div>

            <div className="space-y-2 pt-3 border-t mb-3" style={{ borderColor: 'var(--border-soft)' }}>
              {goals.map((g, i) => {
                const p    = Math.min(100, Math.round((g.current / g.goal) * 100))
                const done = g.current >= g.goal
                return (
                  <div key={i}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span style={{ color: 'var(--forge-muted)' }}>{g.label}</span>
                      <span style={{ color: done ? '#2EA043' : g.color }}>{g.current}{g.unit} / {g.goal}{g.unit} {done ? '✓' : ''}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-8)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${p}%`, background: done ? '#2EA043' : g.color, boxShadow: done ? '0 0 6px rgba(46,160,67,0.5)' : `0 0 4px ${g.color}55` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {allDone && !showNewCycle && (
              <div className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: 'rgba(46,160,67,0.08)', border: '1px solid rgba(46,160,67,0.25)' }}>
                <span className="text-xl">🎉</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold" style={{ color: '#2EA043' }}>Tous les objectifs atteints !</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--forge-muted)' }}>Prêt pour un nouveau cycle ?</p>
                </div>
                <button onClick={() => setShowNewCycle(true)} className="text-xs font-medium px-3 py-1.5 rounded-xl transition-all active:scale-95 flex-shrink-0"
                  style={{ background: 'rgba(46,160,67,0.15)', color: '#2EA043', border: '1px solid rgba(46,160,67,0.3)' }}>
                  Nouveau cycle
                </button>
              </div>
            )}

            {showNewCycle && (
              <div className="rounded-xl p-3" style={{ background: 'var(--surface-3)', border: '1px solid rgba(247,183,49,0.25)' }}>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Terminer ce cycle ?</p>
                <p className="text-[10px] mb-3" style={{ color: 'var(--forge-muted)' }}>Il sera archivé dans l'historique. Vous pourrez définir de nouveaux objectifs.</p>
                <div className="flex gap-2">
                  <button onClick={completeCycle} className="btn-primary flex-1 text-xs py-2">Confirmer</button>
                  <button onClick={() => setShowNewCycle(false)} className="btn-ghost text-xs py-2 px-3">Annuler</button>
                </div>
              </div>
            )}
          </>
        )}

        {!editing && !currentCycle && (
          <div className="text-center py-4">
            <p className="text-sm mb-3" style={{ color: 'var(--forge-muted)' }}>Aucun objectif défini</p>
            <button onClick={() => setEditing(true)} className="text-xs px-4 py-2 rounded-xl transition-all active:scale-95"
              style={{ background: 'rgba(46,160,67,0.1)', color: '#2EA043', border: '1px solid rgba(46,160,67,0.2)' }}>
              Définir des objectifs →
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── MAIN ─────────────────────────────────────────────────────
export default function HindsightsList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const [filterTF, setFilterTF]   = useState('')
  const [filterMkt, setFilterMkt] = useState('')

  useEffect(() => {
    if (!user) return
    getHindsightsStandalone(user.id).then(setItems).catch(console.error).finally(() => setLoading(false))
  }, [user])

  const handleDelete = useCallback(async (id) => {
    await deleteHindsightStandalone(id)
    setItems(prev => prev.filter(i => i.id !== id))
    setSelected(null)
  }, [])

  const openImage = useCallback((images, idx) => { setLightbox({ images, startIndex: idx }) }, [])

  const allTF  = [...new Set(items.flatMap(i => i.timeframes || []))]
  const allMkt = [...new Set(items.flatMap(i => i.markets   || []))]

  const filtered = items.filter(i => {
    if (filterTF  && !i.timeframes?.includes(filterTF))  return false
    if (filterMkt && !i.markets?.includes(filterMkt))    return false
    return true
  })

  if (loading) return (
    <div className="page space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1.5">
          <div className="h-6 w-32 rounded-lg animate-pulse" style={{ background: 'var(--skeleton-bg)' }} />
          <div className="h-3 w-24 rounded-lg animate-pulse" style={{ background: 'var(--skeleton-bg-soft)' }} />
        </div>
        <div className="h-9 w-24 rounded-xl animate-pulse" style={{ background: 'var(--skeleton-bg)' }} />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="card flex gap-4 animate-pulse">
          <div className="rounded-xl flex-shrink-0" style={{ width: 76, height: 76, background: 'var(--skeleton-bg)' }} />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-24 rounded" style={{ background: 'var(--skeleton-bg)' }} />
            <div className="h-3 w-32 rounded" style={{ background: 'var(--skeleton-bg-soft)' }} />
            <div className="h-3 w-full rounded" style={{ background: 'var(--skeleton-bg-soft)' }} />
            <div className="h-3 w-3/4 rounded" style={{ background: 'var(--skeleton-bg-soft)' }} />
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="page animate-slide-up">
      {lightbox && <Lightbox images={lightbox.images} startIndex={lightbox.startIndex} onClose={() => setLightbox(null)} />}
      {selected && !lightbox && (
        <DetailPanel
          item={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
          onOpenImage={(idx) => openImage(selected.images || [], idx)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(46,160,67,0.15)' }}>
              <BookMarked size={14} className="text-forge-green" />
            </div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Hindsights</h1>
          </div>
          <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>
            {items.length} analyse{items.length !== 1 ? 's' : ''} de marché
          </p>
        </div>
        <button
          onClick={() => navigate('/app/hindsights/new')}
          className="btn-primary flex items-center gap-1.5"
          style={{ background: '#2EA043', boxShadow: '0 0 20px rgba(46,160,67,0.3)' }}
        >
          <Plus size={15} /> Nouveau
        </button>
      </div>

      <HindsightGoals items={items} />

      {/* Filtres */}
      {(allTF.length > 0 || allMkt.length > 0) && (
        <div className="mb-5 space-y-3">
          {allTF.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--forge-muted)' }}>Timeframe</p>
              <div className="flex flex-wrap gap-1.5">
                {['', ...allTF].map(tf => (
                  <button key={tf} onClick={() => setFilterTF(tf)} className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                    style={filterTF === tf
                      ? { background: 'rgba(247,183,49,0.15)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.3)' }
                      : { background: 'var(--surface-4)', color: 'var(--forge-muted)', border: '1px solid var(--border-soft)' }
                    }>
                    {tf || 'Tous'}
                  </button>
                ))}
              </div>
            </div>
          )}
          {allMkt.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--forge-muted)' }}>Marché</p>
              <div className="flex flex-wrap gap-1.5">
                {['', ...allMkt].map(m => (
                  <button key={m} onClick={() => setFilterMkt(m)} className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                    style={filterMkt === m
                      ? { background: 'rgba(46,160,67,0.15)', color: '#2EA043', border: '1px solid rgba(46,160,67,0.3)' }
                      : { background: 'var(--surface-4)', color: 'var(--forge-muted)', border: '1px solid var(--border-soft)' }
                    }>
                    {m || 'Tous'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(46,160,67,0.1)', border: '1px solid rgba(46,160,67,0.2)' }}>
            <BookMarked size={28} className="text-forge-green/60" />
          </div>
          <p className="text-sm mb-1" style={{ color: 'var(--forge-muted)' }}>
            {items.length === 0 ? "Aucun hindsight pour l'instant." : 'Aucun résultat.'}
          </p>
          {items.length === 0 && (
            <>
              <p className="text-xs mb-5" style={{ color: 'var(--text-faint)' }}>
                Analysez le marché librement, sans lier à un trade.
              </p>
              <button
                onClick={() => navigate('/app/hindsights/new')}
                className="btn-primary inline-flex items-center gap-2"
                style={{ background: '#2EA043', boxShadow: '0 0 20px rgba(46,160,67,0.3)' }}
              >
                <Plus size={15} /> Créer un hindsight
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => <HindsightCard key={item.id} item={item} onClick={() => setSelected(item)} />)}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-center mt-5" style={{ color: 'var(--forge-muted)' }}>
          {filtered.length} hindsight{filtered.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}