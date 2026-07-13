import { useUIStore } from '../store/useUIStore'
import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Trash2, Shield, CheckCircle, XCircle, Sparkles,
  AlertTriangle, X, ChevronRight, Pencil, Check,
  Timer, Target, TrendingUp, ChevronDown, ChevronUp, Edit2,
} from 'lucide-react'
import { getRules, createRule, updateRule, deleteRule, supabase } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'
import { useTrades } from '../hooks/useTrades'
import AIAssistant from '../components/AIAssistant'
import { SkeletonCard } from '../components/Skeleton'

// ── Catégories ───────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',   label: 'Toutes', color: '#8B949E' },
  { id: 'entry', label: 'Entrée', color: '#58a6ff' },
  { id: 'risk',  label: 'Risque', color: '#F85149' },
  { id: 'psych', label: 'Psycho', color: '#F7B731' },
  { id: 'exit',  label: 'Sortie', color: '#2EA043' },
  { id: 'other', label: 'Autre',  color: '#8B949E' },
]
const getCategoryColor = (cat) => CATEGORIES.find(c => c.id === cat)?.color || '#8B949E'

// ── Helpers ──────────────────────────────────────────────────
const fmtMin = (min) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

const todayISO = () => new Date().toISOString().slice(0, 10)

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

// ── RuleCard ─────────────────────────────────────────────────
function RuleCard({ rule, onToggle, onDelete, onEdit }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const color = getCategoryColor(rule.category)

  return (
    <div
      className={`rounded-2xl p-4 border transition-all ${!rule.active ? 'opacity-50' : ''}`}
      style={{
        background:   rule.active ? 'var(--surface-card)' : 'var(--surface-2)',
        borderColor:  rule.active ? `${color}25` : 'var(--border-soft)',
        borderLeft:   rule.active ? `3px solid ${color}` : '3px solid var(--border-medium)',
      }}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(rule.id, rule.active)}
          className="mt-0.5 flex-shrink-0 transition-transform active:scale-90"
        >
          {rule.active
            ? <CheckCircle size={18} style={{ color }} />
            : <XCircle    size={18} style={{ color: 'var(--forge-muted)' }} />
          }
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm leading-relaxed ${!rule.active ? 'line-through' : ''}`}
            style={{ color: rule.active ? 'var(--text-primary)' : 'var(--forge-muted)' }}
          >
            {rule.text}
          </p>
          {rule.category && rule.category !== 'other' && (
            <span
              className="inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
            >
              {CATEGORIES.find(c => c.id === rule.category)?.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(rule)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ color: 'var(--forge-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--surface-4)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--forge-muted)'; e.currentTarget.style.background = 'transparent' }}
          >
            <Pencil size={12} />
          </button>

          {confirmDelete ? (
            <div className="flex gap-1">
              <button
                onClick={() => { onDelete(rule.id); setConfirmDelete(false) }}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-95"
                style={{ background: 'rgba(248,81,73,0.15)', color: '#F85149' }}
              >
                <Check size={12} />
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{ color: 'var(--forge-muted)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-4)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ color: 'var(--forge-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#F85149'; e.currentTarget.style.background = 'rgba(248,81,73,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--forge-muted)'; e.currentTarget.style.background = 'transparent' }}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── RuleForm ─────────────────────────────────────────────────
function RuleForm({ initial, onSave, onCancel, saving }) {
  const [text, setText]         = useState(initial?.text || '')
  const [category, setCategory] = useState(initial?.category || 'other')

  return (
    <div
      className="rounded-2xl p-4 mb-4 border"
      style={{
        background:  'var(--surface-card)',
        borderColor: 'rgba(247,183,49,0.2)',
        boxShadow:   '0 0 24px rgba(247,183,49,0.06)',
      }}
    >
      <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
        {initial ? 'Modifier la règle' : 'Nouvelle règle'}
      </p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Ex: Je n'entre pas contre la tendance H4..."
        className="w-full mb-3 resize-none text-sm"
        rows={3}
        autoFocus
      />
      <div className="flex flex-wrap gap-1.5 mb-3">
        {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-all active:scale-95"
            style={category === cat.id
              ? { background: `${cat.color}20`, color: cat.color, borderColor: `${cat.color}50` }
              : { background: 'var(--surface-4)', color: 'var(--forge-muted)', borderColor: 'var(--border-soft)' }
            }
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ text: text.trim(), category })}
          disabled={saving || !text.trim()}
          className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Sauvegarde...' : initial ? 'Modifier' : 'Ajouter'}
        </button>
        <button onClick={onCancel} className="btn-ghost">Annuler</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ── Tab: Backtest ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
function TabBacktest({ user }) {
  const [cycles, setCycles]               = useState([])
  const [currentCycle, setCurrentCycle]   = useState(null)
  const [loading, setLoading]             = useState(true)
  const [showGoalEdit, setShowGoalEdit]   = useState(false)
  const [goalInput, setGoalInput]         = useState('')
  const [addDate, setAddDate]             = useState(todayISO())
  const [addMin, setAddMin]               = useState('')
  const [saving, setSaving]               = useState(false)
  const [showNewCycle, setShowNewCycle]   = useState(false)
  const [newCycleHours, setNewCycleHours] = useState('')
  const { expandedWeeks, expandedCycles } = useUIStore(s => s.discipline)
  const setDisciplineState = useUIStore(s => s.setDisciplineState)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      const { data: cycs } = await supabase
        .from('backtest_cycles')
        .select('*, backtest_sessions(*)')
        .eq('user_id', user.id)
        .order('started_at', { ascending: true })
      if (cycs && cycs.length > 0) {
        const sorted = cycs.map(c => ({
          ...c,
          sessions: (c.backtest_sessions || []).sort((a, b) => a.date.localeCompare(b.date)),
        }))
        const active = sorted.find(c => !c.ended_at) || sorted[sorted.length - 1]
        const past   = sorted.filter(c => c.id !== active.id)
        setCurrentCycle(active)
        setCycles(past)
      }
      setLoading(false)
    }
    load()
  }, [user])

  const handleAdd = async () => {
    const mins = parseInt(addMin)
    if (!mins || mins <= 0 || !addDate || !currentCycle) return
    setSaving(true)
    const existing = currentCycle.sessions.find(s => s.date === addDate)
    if (existing) {
      const newMin = existing.minutes + mins
      const { data } = await supabase
        .from('backtest_sessions')
        .update({ minutes: newMin })
        .eq('id', existing.id)
        .select()
        .single()
      if (data) setCurrentCycle(c => ({
        ...c,
        sessions: c.sessions.map(x => x.id === existing.id ? data : x),
      }))
    } else {
      const { data } = await supabase
        .from('backtest_sessions')
        .insert({ user_id: user.id, cycle_id: currentCycle.id, date: addDate, minutes: mins })
        .select()
        .single()
      if (data) setCurrentCycle(c => ({
        ...c,
        sessions: [...c.sessions, data].sort((a, b) => a.date.localeCompare(b.date)),
      }))
    }
    setAddMin('')
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('backtest_sessions').delete().eq('id', id)
    setCurrentCycle(c => ({ ...c, sessions: c.sessions.filter(x => x.id !== id) }))
  }

  const handleSaveGoal = async () => {
    const h = parseInt(goalInput)
    if (!h || h <= 0 || !currentCycle) return
    await supabase.from('backtest_cycles').update({ goal_hours: h }).eq('id', currentCycle.id)
    setCurrentCycle(c => ({ ...c, goal_hours: h }))
    setShowGoalEdit(false)
  }

  const handleNewCycle = async () => {
    const h = parseInt(newCycleHours)
    if (!h || h <= 0) return
    if (currentCycle) {
      await supabase.from('backtest_cycles').update({ ended_at: todayISO() }).eq('id', currentCycle.id)
      setCycles(prev => [...prev, { ...currentCycle, ended_at: todayISO() }])
    }
    const { data } = await supabase
      .from('backtest_cycles')
      .insert({ user_id: user.id, goal_hours: h, started_at: todayISO() })
      .select()
      .single()
    if (data) setCurrentCycle({ ...data, sessions: [] })
    setShowNewCycle(false)
    setNewCycleHours('')
    setDisciplineState({ expandedWeeks: {} })
  }

  const fmtDate = (iso) => {
    if (!iso) return ''
    return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const getWeeks = (sessions) => {
    if (!sessions?.length) return []
    const map = {}
    sessions.forEach(s => {
      const d   = new Date(s.date + 'T12:00:00')
      const day = d.getDay()
      const monday = new Date(d)
      monday.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
      const key = monday.toISOString().slice(0, 10)
      if (!map[key]) map[key] = { monday: key, sessions: [] }
      map[key].sessions.push(s)
    })
    return Object.values(map).sort((a, b) => a.monday.localeCompare(b.monday))
  }

  const weekMin = (w) => w.sessions.reduce((a, s) => a + s.minutes, 0)

  const totalMin = currentCycle?.sessions.reduce((a, s) => a + s.minutes, 0) ?? 0
  const goalMin  = (currentCycle?.goal_hours ?? 100) * 60
  const leftMin  = Math.max(0, goalMin - totalMin)
  const progress = Math.min(100, Math.round((totalMin / goalMin) * 100))
  const done     = totalMin >= goalMin
  const weeks    = getWeeks(currentCycle?.sessions)

  useEffect(() => {
    if (!done) return
    if (!('Notification' in window)) return
    const notify = () => new Notification('TradeForge 🎉', {
      body: `Objectif de ${currentCycle?.goal_hours}h de backtest atteint !`,
      icon: '/icons/icon-192.png',
    })
    if (Notification.permission === 'granted') notify()
    else if (Notification.permission !== 'denied') Notification.requestPermission().then(p => p === 'granted' && notify())
  }, [done])

  if (loading) return (
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-2xl p-4 animate-pulse"
          style={{ background: 'var(--skeleton-bg)', border: '1px solid var(--border-soft)', height: '72px' }} />
      ))}
    </div>
  )

  if (!currentCycle) return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
        style={{ background: 'rgba(247,183,49,0.08)', border: '1px solid rgba(247,183,49,0.15)' }}>
        <Timer size={28} className="text-forge-accent opacity-60" />
      </div>
      <p className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Démarrez votre premier cycle de backtest</p>
      <p className="text-xs mb-5" style={{ color: 'var(--forge-muted)' }}>Définissez un objectif d'heures et suivez votre progression jour par jour.</p>
      <div className="flex gap-2 max-w-xs mx-auto">
        <input
          type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)}
          placeholder="Objectif en heures" min="1" className="flex-1 text-sm" autoFocus
        />
        <button
          onClick={async () => {
            const h = parseInt(goalInput)
            if (!h || h <= 0) return
            const { data } = await supabase
              .from('backtest_cycles')
              .insert({ user_id: user.id, goal_hours: h, started_at: todayISO() })
              .select().single()
            if (data) setCurrentCycle({ ...data, sessions: [] })
            setGoalInput('')
          }}
          disabled={!goalInput}
          className="btn-primary disabled:opacity-40"
        >
          Démarrer
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {/* ── Cycle actuel ── */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{
          background:   'var(--surface-card)',
          border:       `1px solid ${done ? 'rgba(46,160,67,0.3)' : 'rgba(247,183,49,0.2)'}`,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-forge-accent" />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Cycle #{cycles.length + 1}
              <span className="text-[10px] ml-2" style={{ color: 'var(--forge-muted)' }}>
                depuis {fmtDate(currentCycle.started_at)}
              </span>
            </span>
          </div>
          {!done && (
            <button
              onClick={() => { setGoalInput(String(currentCycle.goal_hours)); setShowGoalEdit(true) }}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: 'var(--forge-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#F7B731'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}
            >
              <Edit2 size={11} /> {currentCycle.goal_hours}h
            </button>
          )}
        </div>

        {showGoalEdit && (
          <div className="flex gap-2 mb-3">
            <input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)}
              className="flex-1 text-sm" placeholder="Ex: 100" min="1" autoFocus />
            <button onClick={handleSaveGoal} className="btn-primary px-4 text-sm">OK</button>
            <button onClick={() => setShowGoalEdit(false)} className="btn-ghost text-sm">✕</button>
          </div>
        )}

        <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: 'var(--surface-8)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width:      `${progress}%`,
              background: done
                ? 'linear-gradient(90deg, #2EA043, #3fb950)'
                : 'linear-gradient(90deg, #F7B731, #ffcc00)',
            }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--forge-muted)' }}>Fait</p>
            <p className="text-lg font-mono font-semibold text-forge-accent">{fmtMin(totalMin)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--forge-muted)' }}>Progression</p>
            <p className={`text-lg font-mono font-semibold ${done ? 'text-forge-green' : ''}`}
              style={!done ? { color: 'var(--text-primary)' } : {}}>
              {progress}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--forge-muted)' }}>Restant</p>
            <p className="text-lg font-mono font-semibold" style={{ color: 'var(--forge-muted)' }}>
              {done ? '✓' : fmtMin(leftMin)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Objectif atteint ── */}
      {done && !showNewCycle && (
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-3"
          style={{ background: 'rgba(46,160,67,0.08)', border: '1px solid rgba(46,160,67,0.3)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(46,160,67,0.15)' }}>
            <TrendingUp size={18} style={{ color: '#2EA043' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#3fb950' }}>Objectif atteint ! 🎉</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--forge-muted)' }}>
              {currentCycle.goal_hours}h de backtest complétées.
            </p>
          </div>
          <button
            onClick={() => setShowNewCycle(true)}
            className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
            style={{ background: 'rgba(46,160,67,0.15)', color: '#3fb950', border: '1px solid rgba(46,160,67,0.3)' }}
          >
            Nouveau cycle
          </button>
        </div>
      )}

      {/* ── Formulaire nouveau cycle ── */}
      {showNewCycle && (
        <div className="rounded-2xl p-4 mb-4"
          style={{ background: 'var(--surface-card)', border: '1px solid rgba(247,183,49,0.25)' }}>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Nouvel objectif</p>
          <p className="text-xs mb-3" style={{ color: 'var(--forge-muted)' }}>
            Le cycle actuel sera archivé. Vos sessions sont conservées.
          </p>
          <div className="flex gap-2">
            <input type="number" value={newCycleHours} onChange={e => setNewCycleHours(e.target.value)}
              placeholder="Ex: 150 heures" min="1" className="flex-1 text-sm" autoFocus />
            <button onClick={handleNewCycle} disabled={!newCycleHours}
              className="btn-primary px-4 disabled:opacity-40 disabled:cursor-not-allowed">
              Démarrer
            </button>
            <button onClick={() => setShowNewCycle(false)} className="btn-ghost">✕</button>
          </div>
        </div>
      )}

      {/* ── Formulaire ajout minutes ── */}
      {!done && (
        <div className="rounded-2xl p-4 mb-5"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)' }}>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--forge-muted)' }}>
            Ajouter des minutes
          </p>
          <div className="flex gap-2">
            <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)}
              className="text-sm flex-1" style={{ minWidth: 0 }} />
            <input type="number" value={addMin} onChange={e => setAddMin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="min" min="1" className="text-sm w-20" />
            <button onClick={handleAdd} disabled={saving || !addMin || !addDate}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
              <Plus size={14} /> Ajouter
            </button>
          </div>
          <p className="text-[10px] mt-2" style={{ color: 'var(--forge-muted)' }}>
            Les minutes sont cumulées si vous ajoutez plusieurs fois la même date.
          </p>
        </div>
      )}

      {/* ── Sessions par semaines ── */}
      {weeks.length === 0 && !done ? (
        <div className="text-center py-10">
          <Timer size={24} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--forge-muted)' }} />
          <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>
            Aucune session pour ce cycle. Ajoutez vos premières minutes.
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {weeks.map((week, wi) => {
            const wMin    = weekMin(week)
            const prevMin = wi > 0 ? weekMin(weeks[wi - 1]) : null
            const diffMin = prevMin !== null ? wMin - prevMin : null
            const diffPct = prevMin && prevMin > 0 ? Math.round(((wMin - prevMin) / prevMin) * 100) : null
            const isDown  = diffMin !== null && diffMin < 0
            const isExp   = expandedWeeks[week.monday] ?? (wi === weeks.length - 1)
            const sundayDate = new Date(week.monday + 'T12:00:00')
            sundayDate.setDate(sundayDate.getDate() + 6)

            return (
              <div
                key={week.monday}
                className="rounded-2xl overflow-hidden"
                style={{
                  border:     `1px solid ${isDown ? 'rgba(248,81,73,0.2)' : 'var(--border-soft)'}`,
                  background: isDown ? 'rgba(248,81,73,0.04)' : 'var(--surface-card)',
                }}
              >
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  onClick={() => setDisciplineState({ expandedWeeks: { ...expandedWeeks, [week.monday]: !isExp } })}
                >
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {fmtDate(week.monday)} → {fmtDate(sundayDate.toISOString().slice(0, 10))}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--forge-muted)' }}>
                      {week.sessions.length} session{week.sessions.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {fmtMin(wMin)}
                      </p>
                      {diffMin !== null && (
                        <p className={`text-[10px] font-mono ${isDown ? 'text-forge-red' : 'text-forge-green'}`}>
                          {isDown ? '' : '+'}{diffPct}% ({isDown ? '-' : '+'}{fmtMin(Math.abs(diffMin))})
                        </p>
                      )}
                    </div>
                    {isExp
                      ? <ChevronUp   size={14} style={{ color: 'var(--forge-muted)' }} />
                      : <ChevronDown size={14} style={{ color: 'var(--forge-muted)' }} />
                    }
                  </div>
                </button>

                {isExp && (
                  <div className="px-4 pb-3 space-y-1.5 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                    {week.sessions.map(s => {
                      const d = new Date(s.date + 'T12:00:00')
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between py-2 px-3 rounded-xl"
                          style={{ background: 'var(--surface-3)' }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] w-8 font-mono" style={{ color: 'var(--forge-muted)' }}>
                              {DAYS_FR[d.getDay()]}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--forge-muted)' }}>{fmtDate(s.date)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono font-medium text-forge-accent">{fmtMin(s.minutes)}</span>
                            <button
                              onClick={() => handleDelete(s.id)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                              style={{ color: 'var(--forge-muted)' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#F85149'; e.currentTarget.style.background = 'rgba(248,81,73,0.1)' }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'var(--forge-muted)'; e.currentTarget.style.background = 'transparent' }}
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Cycles archivés ── */}
      {cycles.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest px-1 mb-3" style={{ color: 'var(--forge-muted)' }}>
            Cycles précédents · {cycles.length}
          </p>
          <div className="space-y-2">
            {[...cycles].reverse().map((cycle, ci) => {
              const cycMin   = cycle.sessions.reduce((a, s) => a + s.minutes, 0)
              const cycGoal  = cycle.goal_hours * 60
              const cycPct   = Math.min(100, Math.round((cycMin / cycGoal) * 100))
              const cycDone  = cycMin >= cycGoal
              const isExp    = expandedCycles[cycle.id] ?? false
              const cycWeeks = getWeeks(cycle.sessions)
              const cycNum   = cycles.length - ci

              return (
                <div
                  key={cycle.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ border: '1px solid var(--border-soft)', background: 'var(--surface-2)' }}
                >
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    onClick={() => setDisciplineState({ expandedCycles: { ...expandedCycles, [cycle.id]: !isExp } })}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: cycDone ? 'rgba(46,160,67,0.15)' : 'var(--surface-5)' }}
                      >
                        <span className="text-xs font-mono font-semibold"
                          style={{ color: cycDone ? '#3fb950' : 'var(--forge-muted)' }}>
                          #{cycNum}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'var(--forge-muted)' }}>
                          {fmtDate(cycle.started_at)} → {fmtDate(cycle.ended_at)}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                          Objectif : {cycle.goal_hours}h · {cycDone ? '✓ Complété' : `${cycPct}%`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-mono font-medium" style={{ color: 'var(--forge-muted)' }}>
                        {fmtMin(cycMin)}
                      </p>
                      {isExp
                        ? <ChevronUp   size={14} style={{ color: 'var(--forge-muted)' }} />
                        : <ChevronDown size={14} style={{ color: 'var(--forge-muted)' }} />
                      }
                    </div>
                  </button>

                  {isExp && (
                    <div className="px-4 pb-3 border-t space-y-2" style={{ borderColor: 'var(--border-soft)' }}>
                      <div className="h-1.5 rounded-full overflow-hidden mt-3" style={{ background: 'var(--surface-8)' }}>
                        <div className="h-full rounded-full"
                          style={{ width: `${cycPct}%`, background: cycDone ? '#2EA043' : '#F7B731' }} />
                      </div>
                      <div className="space-y-1.5 mt-2">
                        {cycWeeks.map(week => (
                          <div
                            key={week.monday}
                            className="flex items-center justify-between py-1.5 px-3 rounded-xl"
                            style={{ background: 'var(--surface-2)' }}
                          >
                            <p className="text-[10px]" style={{ color: 'var(--forge-muted)' }}>
                              {fmtDate(week.monday)} → {(() => {
                                const s = new Date(week.monday + 'T12:00:00')
                                s.setDate(s.getDate() + 6)
                                return fmtDate(s.toISOString().slice(0, 10))
                              })()}
                            </p>
                            <p className="text-xs font-mono" style={{ color: 'var(--forge-muted)' }}>
                              {fmtMin(weekMin(week))}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Règles ───────────────────────────────────────────────
function TabRules({ user, trades }) {
  const [rules, setRules]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [saving, setSaving]           = useState(false)
  const { filterCat } = useUIStore(s => s.discipline)
  const setDisciplineState = useUIStore(s => s.setDisciplineState)
  const [showAI, setShowAI]           = useState(false)

  useEffect(() => {
    if (!user) return
    getRules(user.id).then(setRules).finally(() => setLoading(false))
  }, [user])

  const handleAdd = async ({ text, category }) => {
    setSaving(true)
    try {
      const rule = await createRule({ user_id: user.id, text, category, active: true })
      setRules(r => [rule, ...r])
      setShowForm(false)
    } finally { setSaving(false) }
  }

  const handleEdit = async ({ text, category }) => {
    setSaving(true)
    try {
      const updated = await updateRule(editingRule.id, { text, category })
      setRules(r => r.map(rule => rule.id === editingRule.id ? updated : rule))
      setEditingRule(null)
    } finally { setSaving(false) }
  }

  const handleToggle = async (id, active) => {
    const updated = await updateRule(id, { active: !active })
    setRules(r => r.map(rule => rule.id === id ? updated : rule))
  }

  const handleDelete = async (id) => {
    await deleteRule(id)
    setRules(r => r.filter(rule => rule.id !== id))
  }

  const totalTrades    = trades.length
  const respectCount   = trades.filter(t => t.respect_plan === true).length
  const violationCount = trades.filter(t => t.respect_plan === false).length
  const respectRate    = totalTrades ? Math.round((respectCount / totalTrades) * 100) : 0
  const activeCount    = rules.filter(r => r.active).length
  const filtered       = filterCat === 'all' ? rules : rules.filter(r => (r.category || 'other') === filterCat)

  const aiContext = {
    market: 'Règles de trading', type: null, result: null,
    rr_planned: null, rr_won: null, emotion: null, discipline_score: null,
    _rulesContext: true,
    _rules: rules.filter(r => r.active).map(r => r.text),
    _respectRate: respectRate,
    _violationCount: violationCount,
  }

  if (loading) return (
    <div className="space-y-3">
      <div className="rounded-2xl animate-pulse" style={{ background: 'var(--skeleton-bg)', height: '160px' }} />
      <div className="rounded-2xl animate-pulse" style={{ background: 'var(--skeleton-bg)', height: '100px' }} />
      <SkeletonCard />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>
          {activeCount} règle{activeCount !== 1 ? 's' : ''} active{activeCount !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAI(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all active:scale-95"
            style={{ background: 'rgba(247,183,49,0.08)', color: '#F7B731', borderColor: 'rgba(247,183,49,0.25)' }}
          >
            <Sparkles size={13} /> Coach IA
          </button>
          <button
            onClick={() => { setEditingRule(null); setShowForm(v => !v) }}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus size={15} /> Ajouter
          </button>
        </div>
      </div>

      {/* Stats respect */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-2xl p-3 text-center"
          style={{ background: 'rgba(46,160,67,0.08)', border: '1px solid rgba(46,160,67,0.2)' }}>
          <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--forge-muted)' }}>Respect</p>
          <p className="text-2xl font-mono font-semibold"
            style={{ color: respectRate >= 70 ? '#2EA043' : respectRate >= 50 ? '#F7B731' : '#F85149' }}>
            {respectRate}%
          </p>
        </div>
        <div className="rounded-2xl p-3 text-center"
          style={{ background: 'var(--surface-4)', border: '1px solid var(--border-soft)' }}>
          <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--forge-muted)' }}>Respecté</p>
          <p className="text-2xl font-mono font-semibold text-forge-green">{respectCount}</p>
        </div>
        <div className="rounded-2xl p-3 text-center"
          style={{ background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.15)' }}>
          <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--forge-muted)' }}>Violations</p>
          <p className="text-2xl font-mono font-semibold text-forge-red">{violationCount}</p>
        </div>
      </div>

      {/* Barre respect/violations */}
      {totalTrades > 0 && (
        <div className="rounded-2xl px-4 py-3 mb-4"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--border-soft)' }}>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-forge-green font-medium">✓ Respect plan</span>
            <span className="text-forge-red font-medium">✗ Violations</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: 'var(--forge-border)' }}>
            <div className="rounded-l-full transition-all duration-500"
              style={{ width: `${respectRate}%`, background: 'linear-gradient(90deg, #2EA043, #3fb950)' }} />
            <div className="rounded-r-full transition-all duration-500"
              style={{ width: `${100 - respectRate}%`, background: 'linear-gradient(90deg, #F85149, #ff6b6b)' }} />
          </div>
          <div className="flex justify-between text-[10px] mt-1.5" style={{ color: 'var(--forge-muted)' }}>
            <span>{respectCount} trades</span>
            <span>{violationCount} trades</span>
          </div>
        </div>
      )}

      {/* CTA Coach IA */}
      {rules.length >= 3 && (
        <button
          onClick={() => setShowAI(true)}
          className="w-full rounded-2xl p-4 mb-4 flex items-center gap-3 text-left transition-all active:scale-[0.99]"
          style={{ background: 'rgba(247,183,49,0.05)', border: '1px solid rgba(247,183,49,0.2)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(247,183,49,0.15)' }}>
            <Sparkles size={18} className="text-forge-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-forge-accent">Analyse IA de tes règles</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--forge-muted)' }}>
              Taux de respect {respectRate}% · {violationCount} violation{violationCount !== 1 ? 's' : ''} détectée{violationCount !== 1 ? 's' : ''}
            </p>
          </div>
          <ChevronRight size={15} style={{ color: 'var(--forge-muted)' }} />
        </button>
      )}

      {showForm && !editingRule && (
        <RuleForm onSave={handleAdd} onCancel={() => setShowForm(false)} saving={saving} />
      )}
      {editingRule && (
        <RuleForm initial={editingRule} onSave={handleEdit} onCancel={() => setEditingRule(null)} saving={saving} />
      )}

      {/* Filtres catégories */}
      {rules.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 scrollbar-hide">
          {CATEGORIES.map(cat => {
            const count = cat.id === 'all' ? rules.length : rules.filter(r => (r.category || 'other') === cat.id).length
            if (count === 0 && cat.id !== 'all') return null
            return (
              <button
                key={cat.id}
                onClick={() => setDisciplineState({ filterCat: cat.id })}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all active:scale-95"
                style={filterCat === cat.id
                  ? { background: `${cat.color}20`, color: cat.color, borderColor: `${cat.color}50` }
                  : { background: 'var(--surface-4)', color: 'var(--forge-muted)', borderColor: 'var(--border-soft)' }
                }
              >
                {cat.label} <span className="opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Liste règles */}
      {rules.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(247,183,49,0.08)', border: '1px solid rgba(247,183,49,0.15)' }}>
            <Shield size={28} className="text-forge-accent opacity-60" />
          </div>
          <p className="text-sm mb-1" style={{ color: 'var(--forge-muted)' }}>Aucune règle définie</p>
          <p className="text-xs mb-5" style={{ color: 'var(--text-faint)' }}>
            Définissez vos règles pour suivre et améliorer votre discipline.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus size={14} /> Première règle
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.filter(r => r.active).length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-widest px-1 mb-2" style={{ color: 'var(--forge-muted)' }}>
                Actives · {filtered.filter(r => r.active).length}
              </p>
              {filtered.filter(r => r.active).map(rule => (
                <RuleCard key={rule.id} rule={rule} onToggle={handleToggle} onDelete={handleDelete}
                  onEdit={r => { setEditingRule(r); setShowForm(false) }} />
              ))}
            </>
          )}
          {filtered.filter(r => !r.active).length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-widest px-1 mt-4 mb-2" style={{ color: 'var(--forge-muted)' }}>
                Désactivées · {filtered.filter(r => !r.active).length}
              </p>
              {filtered.filter(r => !r.active).map(rule => (
                <RuleCard key={rule.id} rule={rule} onToggle={handleToggle} onDelete={handleDelete}
                  onEdit={r => { setEditingRule(r); setShowForm(false) }} />
              ))}
            </>
          )}
        </div>
      )}

      {showAI && <AIAssistant trade={aiContext} onClose={() => setShowAI(false)} />}
    </div>
  )
}

// ── Tab: Erreurs ──────────────────────────────────────────────
function TabErrors({ trades }) {
  const [showAI, setShowAI] = useState(false)

  const aiContext = {
    market: 'Analyse des erreurs',
    type: null, result: null, rr_planned: null, rr_won: null,
    emotion: null, discipline_score: null,
    _errorsContext: true,
    _trades: trades.length,
  }

  const stats = useMemo(() => {
    if (!trades.length) return { emotions: [], patterns: [], hindsightErrors: [] }

    const emotionMap = {}
    trades.forEach(t => {
      if (!t.emotion || t.emotion === 'Neutre') return
      if (!emotionMap[t.emotion]) emotionMap[t.emotion] = { total: 0, losses: 0, wins: 0 }
      emotionMap[t.emotion].total++
      if (t.result === 'sl' || t.result === 'manual_exit') emotionMap[t.emotion].losses++
      if (t.result === 'tp') emotionMap[t.emotion].wins++
    })

    const emotions = Object.entries(emotionMap)
      .map(([name, v]) => ({ name, ...v, lossRate: Math.round((v.losses / v.total) * 100) }))
      .sort((a, b) => b.lossRate - a.lossRate)

    const noRespect       = trades.filter(t => t.respect_plan === false)
    const noRespectLosses = noRespect.filter(t => t.result === 'sl' || t.result === 'manual_exit').length
    const lowDisc         = trades.filter(t => t.discipline_score != null && t.discipline_score < 6)
    const lowDiscLosses   = lowDisc.filter(t => t.result === 'sl' || t.result === 'manual_exit').length

    const patterns = [
      noRespect.length > 0 && {
        label: 'Plan non respecté',
        total: noRespect.length,
        losses: noRespectLosses,
        lossRate: Math.round((noRespectLosses / noRespect.length) * 100),
        color: 'text-forge-red',
      },
      lowDisc.length > 0 && {
        label: 'Discipline faible (< 6/10)',
        total: lowDisc.length,
        losses: lowDiscLosses,
        lossRate: Math.round((lowDiscLosses / lowDisc.length) * 100),
        color: 'text-forge-accent',
      },
    ].filter(Boolean)

    const hindsightMap = {}
    trades.forEach(t => {
      const h = t.hindsight?.[0]
      if (h?.main_error) hindsightMap[h.main_error] = (hindsightMap[h.main_error] || 0) + 1
    })
    const hindsightErrors = Object.entries(hindsightMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, count]) => ({ label, count }))

    return { emotions, patterns, hindsightErrors }
  }, [trades])

  const maxCount = Math.max(...stats.hindsightErrors.map(e => e.count), 1)

  return (
    <div>
      {/* CTA Coach IA */}
      {trades.length >= 3 && (
        <button
          onClick={() => setShowAI(true)}
          className="w-full rounded-2xl p-4 mb-5 flex items-center gap-3 text-left transition-all active:scale-[0.99]"
          style={{ background: 'rgba(247,183,49,0.05)', border: '1px solid rgba(247,183,49,0.2)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(247,183,49,0.15)' }}>
            <Sparkles size={18} className="text-forge-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-forge-accent">Analyse IA des erreurs</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--forge-muted)' }}>
              {trades.length} trades analysés · patterns détectés
            </p>
          </div>
          <ChevronRight size={15} style={{ color: 'var(--forge-muted)' }} />
        </button>
      )}

      {/* Patterns comportement */}
      {stats.patterns.length > 0 && (
        <div className="mb-6">
          <p className="section-title">Patterns de comportement</p>
          <div className="space-y-3">
            {stats.patterns.map((p, i) => (
              <div key={i} className="card">
                <div className="flex items-start justify-between mb-2">
                  <p className={`text-sm font-medium ${p.color}`}>{p.label}</p>
                  <span className={`font-mono text-lg font-medium ${p.lossRate >= 60 ? 'text-forge-red' : 'text-forge-accent'}`}>
                    {p.lossRate}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'var(--forge-border)' }}>
                  <div
                    className={`h-full rounded-full ${p.lossRate >= 60 ? 'bg-forge-red' : 'bg-forge-accent'}`}
                    style={{ width: `${p.lossRate}%` }}
                  />
                </div>
                <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>
                  {p.losses} pertes sur {p.total} occurrences
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Émotions */}
      {stats.emotions.length > 0 && (
        <div className="mb-6">
          <p className="section-title">Émotions & impact</p>
          <div className="card divide-y" style={{ '--tw-divide-opacity': 1 }}>
            {stats.emotions.map(e => (
              <div
                key={e.name}
                className="py-3 first:pt-0 last:pb-0"
                style={{ borderColor: 'var(--forge-border)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{e.name}</span>
                  <div className="flex items-center gap-3 text-xs font-mono" style={{ color: 'var(--forge-muted)' }}>
                    <span className="text-forge-green">+{e.wins}TP</span>
                    <span className="text-forge-red">-{e.losses}SL</span>
                    <span className={`font-medium ${e.lossRate >= 60 ? 'text-forge-red' : e.lossRate >= 40 ? 'text-forge-accent' : ''}`}
                      style={e.lossRate < 40 ? { color: 'var(--forge-muted)' } : {}}>
                      {e.lossRate}% SL
                    </span>
                  </div>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--forge-border)' }}>
                  <div
                    className={`h-full rounded-full ${e.lossRate >= 60 ? 'bg-forge-red/60' : e.lossRate >= 40 ? 'bg-forge-accent/60' : 'bg-forge-green/60'}`}
                    style={{ width: `${e.lossRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hindsight errors */}
      {stats.hindsightErrors.length > 0 && (
        <div className="mb-6">
          <p className="section-title">Erreurs Hindsight récurrentes</p>
          <div className="card space-y-3">
            {stats.hindsightErrors.map(({ label, count }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="truncate flex-1" style={{ color: 'var(--text-primary)' }}>{label}</span>
                  <span className="font-mono text-forge-accent ml-2 flex-shrink-0">{count}×</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--forge-border)' }}>
                  <div className="h-full bg-forge-accent/40 rounded-full"
                    style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vide */}
      {trades.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--forge-muted)' }}>
          <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Enregistrez des trades pour voir vos patterns d'erreurs.</p>
        </div>
      )}

      {trades.length > 0 && stats.emotions.length === 0 && stats.hindsightErrors.length === 0 && stats.patterns.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--forge-muted)' }}>
          <p className="text-sm">Renseignez les émotions et ajoutez des hindsights pour voir vos erreurs.</p>
        </div>
      )}

      {showAI && <AIAssistant trade={aiContext} onClose={() => setShowAI(false)} />}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────
const TABS = [
  { id: 'rules',    label: 'Règles',   icon: Shield },
  { id: 'errors',   label: 'Erreurs',  icon: AlertTriangle },
  { id: 'backtest', label: 'Backtest', icon: Timer },
]

export default function RulesAndErrors({ defaultTab = 'rules' }) {
  const { activeTab } = useUIStore(s => s.discipline)
  const setDisciplineState = useUIStore(s => s.setDisciplineState)
  const { user } = useAuth()
  const { trades, loading: tradesLoading } = useTrades()

useEffect(() => {
  // Seulement si on arrive depuis une route forcée (/app/errors ou /app/rules)
  // et que le defaultTab n'est pas 'rules' (valeur par défaut)
  if (defaultTab && defaultTab !== 'rules') {
    setDisciplineState({ activeTab: defaultTab })
  }
}, [])

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-5">
  <div>
    <div className="flex items-center gap-2 mb-0.5">
      <div className="w-7 h-7 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(247,183,49,0.15)' }}>
        <Shield size={14} className="text-forge-accent" />
      </div>
      <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Discipline</h1>
    </div>
    <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>Règles, erreurs & backtest</p>
  </div>
</div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-2xl mb-6"
        style={{ background: 'var(--surface-4)', border: '1px solid var(--border-soft)' }}
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setDisciplineState({ activeTab: id })}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={activeTab === id
              ? { background: 'rgba(247,183,49,0.12)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.25)', boxShadow: '0 0 12px rgba(247,183,49,0.1)' }
              : { color: 'var(--forge-muted)', border: '1px solid transparent' }
            }
          >
            <Icon size={14} strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      {tradesLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          {activeTab === 'rules'    && <TabRules    user={user} trades={trades} />}
          {activeTab === 'errors'   && <TabErrors   trades={trades} />}
          {activeTab === 'backtest' && <TabBacktest user={user} />}
        </>
      )}
    </div>
  )
}