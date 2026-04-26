import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Image, BookMarked, ZoomIn, X, ChevronLeft, ChevronRight, Clock, Globe } from 'lucide-react'
import { getHindsightsStandalone, deleteHindsightStandalone } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─────────────────────────────────────────────────────────
// LIGHTBOX — rendered via createPortal directly into body
// guarantees it's above sidebar, above everything
// ─────────────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex)
  const img = images[idx]

  useEffect(() => {
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, images.length - 1))
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = orig
      window.removeEventListener('keydown', onKey)
    }
  }, [images.length, onClose])

  const content = (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 99999,
      background: '#000',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
        paddingBottom: '10px', paddingLeft: 16, paddingRight: 16, flexShrink: 0,
        background: 'rgba(0,0,0,0.9)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#8B949E', fontFamily: 'monospace' }}>
            {idx + 1} / {images.length}
          </span>
          {img?.timeframe && (
            <span style={{
              padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: 'rgba(247,183,49,0.2)', color: '#F7B731',
              border: '1px solid rgba(247,183,49,0.4)',
            }}>
              {img.timeframe}
            </span>
          )}
        </div>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
        }}>
          <X size={18} />
        </button>
      </div>

      {/* Main image */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        padding: images.length > 1 ? '12px 56px' : '12px',
      }}>
        {idx > 0 && (
          <button onClick={() => setIdx(i => i - 1)} style={{
            position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
            width: 40, height: 40, borderRadius: '50%', cursor: 'pointer',
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
            zIndex: 1,
          }}>
            <ChevronLeft size={20} />
          </button>
        )}

        <img
          key={img?.url}
          src={img?.url}
          alt=""
          style={{
            maxWidth: '100%', maxHeight: '100%',
            objectFit: 'contain', borderRadius: 8,
            userSelect: 'none',
          }}
        />

        {idx < images.length - 1 && (
          <button onClick={() => setIdx(i => i + 1)} style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            width: 40, height: 40, borderRadius: '50%', cursor: 'pointer',
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
            zIndex: 1,
          }}>
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
          gap: 8, padding: '8px 16px 14px', flexShrink: 0,
          background: 'rgba(0,0,0,0.8)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          overflowX: 'auto',
        }}>
          {images.map((im, i) => (
            <button key={i} onClick={() => setIdx(i)} style={{
              flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: 0,
            }}>
              <div style={{
                borderRadius: 6, overflow: 'hidden',
                border: `2px solid ${i === idx ? '#F7B731' : 'transparent'}`,
                opacity: i === idx ? 1 : 0.4,
                transition: 'all 0.15s',
              }}>
                <img src={im.url} alt="" style={{ width: 60, height: 42, objectFit: 'cover', display: 'block' }} />
              </div>
              {im.timeframe && (
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: i === idx ? '#F7B731' : '#8B949E' }}>
                  {im.timeframe}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return createPortal(content, document.body)
}

// ─────────────────────────────────────────────────────────
// DETAIL PANEL — also portaled, large, closable by backdrop
// ─────────────────────────────────────────────────────────
function DetailPanel({ item, onClose, onDelete, onOpenImage }) {
  const [deleting, setDeleting] = useState(false)
  const images = item.images || []

  // Group by timeframe
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
    return () => {
      document.body.style.overflow = orig
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const handleDelete = async () => {
    if (!confirm('Supprimer ce hindsight définitivement ?')) return
    setDeleting(true)
    await onDelete(item.id)
    onClose()
  }

  const content = (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Backdrop — click to close */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          cursor: 'pointer',
        }}
      />

      {/* Panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 760,
          maxHeight: '88vh',
          overflowY: 'auto',
          background: 'rgb(11,15,22)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 20,
          boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
        }}
      >
        {/* Sticky header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'rgb(11,15,22)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(46,160,67,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BookMarked size={15} color="#2EA043" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'white', margin: 0, lineHeight: 1.3 }}>
                {format(parseISO(item.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
              {images.length > 0 && (
                <p style={{ fontSize: 11, color: '#8B949E', margin: 0 }}>
                  {images.length} image{images.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Delete button — always visible */}
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                background: 'rgba(248,81,73,0.12)',
                border: '1px solid rgba(248,81,73,0.35)',
                color: '#F85149', fontSize: 12, fontWeight: 600,
                opacity: deleting ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              <Trash2 size={13} />
              {deleting ? 'Suppression…' : 'Supprimer'}
            </button>
            <button onClick={onClose} style={{
              width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#8B949E',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>

          {/* Tags */}
          {(item.timeframes?.length > 0 || item.markets?.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 20 }}>
              {item.timeframes?.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    ⏱ Timeframes
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {item.timeframes.map(tf => (
                      <span key={tf} style={{
                        padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: 'rgba(247,183,49,0.12)', color: '#F7B731',
                        border: '1px solid rgba(247,183,49,0.3)',
                      }}>{tf}</span>
                    ))}
                  </div>
                </div>
              )}
              {item.markets?.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    🌐 Marchés
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {item.markets.map(m => (
                      <span key={m} style={{
                        padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: 'rgba(46,160,67,0.12)', color: '#2EA043',
                        border: '1px solid rgba(46,160,67,0.3)',
                      }}>{m}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div style={{
              borderRadius: 12, padding: '14px 18px', marginBottom: 24,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <p style={{ fontSize: 10, color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Notes</p>
              <p style={{ fontSize: 13, color: 'white', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>{item.notes}</p>
            </div>
          )}

          {/* Images grouped by TF */}
          {images.length > 0 && Object.entries(byTF).map(([tf, imgs]) => (
            <div key={tf} style={{ marginBottom: 20 }}>
              <p style={{
                fontSize: 11, fontFamily: 'monospace', fontWeight: 700, marginBottom: 10,
                color: tf === 'Sans timeframe' ? '#8B949E' : '#F7B731',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {tf}
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))',
                gap: 10,
              }}>
                {imgs.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => onOpenImage(img.globalIdx)}
                    style={{
                      position: 'relative', borderRadius: 10, overflow: 'hidden',
                      aspectRatio: '16/9',
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer', padding: 0, background: 'none',
                      transition: 'transform 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'scale(1.025)'
                      e.currentTarget.style.borderColor = 'rgba(247,183,49,0.4)'
                      e.currentTarget.querySelector('.ov').style.opacity = '1'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                      e.currentTarget.querySelector('.ov').style.opacity = '0'
                    }}
                  >
                    <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div className="ov" style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.15s',
                    }}>
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

// ─────────────────────────────────────────────────────────
// CARD
// ─────────────────────────────────────────────────────────
function HindsightCard({ item, onClick }) {
  const images = item.images || []
  const preview = images[0]?.url
  return (
    <div onClick={onClick} className="card-hover group flex gap-4 cursor-pointer active:scale-[0.99]">
      <div style={{
        flexShrink: 0, width: 76, height: 76, borderRadius: 12, overflow: 'hidden',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {preview
          ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookMarked size={18} color="rgba(139,148,158,0.35)" />
            </div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, color: '#8B949E', marginBottom: 6 }}>
          {format(parseISO(item.created_at), 'd MMM yyyy', { locale: fr })}
        </p>
        {item.timeframes?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 5 }}>
            {item.timeframes.slice(0, 5).map(tf => (
              <span key={tf} style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 6, fontWeight: 600,
                background: 'rgba(247,183,49,0.1)', color: '#F7B731',
              }}>{tf}</span>
            ))}
          </div>
        )}
        {item.markets?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 5 }}>
            {item.markets.slice(0, 3).map(m => (
              <span key={m} style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 6, fontWeight: 600,
                background: 'rgba(46,160,67,0.1)', color: '#2EA043',
              }}>{m}</span>
            ))}
          </div>
        )}
        {item.notes && (
          <p style={{
            fontSize: 12, color: '#8B949E', lineHeight: 1.5, margin: 0,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>{item.notes}</p>
        )}
        {images.length > 0 && (
          <p style={{ fontSize: 10, color: 'rgba(139,148,158,0.45)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Image size={9} /> {images.length} image{images.length > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────
export default function HindsightsList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const [filterTF, setFilterTF] = useState('')
  const [filterMkt, setFilterMkt] = useState('')

  useEffect(() => {
    if (!user) return
    getHindsightsStandalone(user.id)
      .then(setItems).catch(console.error).finally(() => setLoading(false))
  }, [user])

  const handleDelete = useCallback(async (id) => {
    await deleteHindsightStandalone(id)
    setItems(prev => prev.filter(i => i.id !== id))
    setSelected(null)
  }, [])

  const openImage = useCallback((images, idx) => {
    setLightbox({ images, startIndex: idx })
  }, [])

  const allTF  = [...new Set(items.flatMap(i => i.timeframes || []))]
  const allMkt = [...new Set(items.flatMap(i => i.markets || []))]

  const filtered = items.filter(i => {
    if (filterTF  && !i.timeframes?.includes(filterTF))  return false
    if (filterMkt && !i.markets?.includes(filterMkt))    return false
    return true
  })

  if (loading) return (
    <div className="page flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-forge-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="page animate-slide-up">

      {/* Lightbox via portal — truly fullscreen */}
      {lightbox && (
        <Lightbox
          images={lightbox.images}
          startIndex={lightbox.startIndex}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Detail panel via portal */}
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
            <div className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(46,160,67,0.15)' }}>
              <BookMarked size={14} className="text-forge-green" />
            </div>
            <h1 className="text-xl font-semibold">Hindsights</h1>
          </div>
          <p className="text-xs text-forge-muted">
            {items.length} analyse{items.length !== 1 ? 's' : ''} de marché
          </p>
        </div>
        <button
          onClick={() => navigate('/hindsights/new')}
          className="btn-primary flex items-center gap-1.5"
          style={{ background: '#2EA043', boxShadow: '0 0 20px rgba(46,160,67,0.3)' }}
        >
          <Plus size={15} /> Nouveau
        </button>
      </div>

      {/* Filters */}
      {(allTF.length > 0 || allMkt.length > 0) && (
        <div className="mb-5 space-y-3">
          {allTF.length > 0 && (
            <div>
              <p className="text-[10px] text-forge-muted uppercase tracking-widest mb-2">Timeframe</p>
              <div className="flex flex-wrap gap-1.5">
                {['', ...allTF].map(tf => (
                  <button key={tf} onClick={() => setFilterTF(tf)}
                    className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                    style={filterTF === tf
                      ? { background: 'rgba(247,183,49,0.15)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.3)' }
                      : { background: 'rgba(255,255,255,0.04)', color: '#8B949E', border: '1px solid rgba(255,255,255,0.08)' }
                    }>
                    {tf || 'Tous'}
                  </button>
                ))}
              </div>
            </div>
          )}
          {allMkt.length > 0 && (
            <div>
              <p className="text-[10px] text-forge-muted uppercase tracking-widest mb-2">Marché</p>
              <div className="flex flex-wrap gap-1.5">
                {['', ...allMkt].map(m => (
                  <button key={m} onClick={() => setFilterMkt(m)}
                    className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                    style={filterMkt === m
                      ? { background: 'rgba(46,160,67,0.15)', color: '#2EA043', border: '1px solid rgba(46,160,67,0.3)' }
                      : { background: 'rgba(255,255,255,0.04)', color: '#8B949E', border: '1px solid rgba(255,255,255,0.08)' }
                    }>
                    {m || 'Tous'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(46,160,67,0.1)', border: '1px solid rgba(46,160,67,0.2)' }}>
            <BookMarked size={28} className="text-forge-green/60" />
          </div>
          <p className="text-forge-muted text-sm mb-1">
            {items.length === 0 ? "Aucun hindsight pour l'instant." : 'Aucun résultat.'}
          </p>
          {items.length === 0 && (
            <>
              <p className="text-forge-muted/50 text-xs mb-5">
                Analysez le marché librement, sans lier à un trade.
              </p>
              <button onClick={() => navigate('/hindsights/new')}
                className="btn-primary inline-flex items-center gap-2"
                style={{ background: '#2EA043', boxShadow: '0 0 20px rgba(46,160,67,0.3)' }}>
                <Plus size={15} /> Créer un hindsight
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <HindsightCard
              key={item.id}
              item={item}
              onClick={() => setSelected(item)}
            />
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-center text-forge-muted mt-5">
          {filtered.length} hindsight{filtered.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
