import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Check, AlertCircle, Eye, EyeOff, ArrowLeft, Shield, Camera, Trash2, AtSign } from 'lucide-react'
import { supabase } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'

// ── Toast ───────────────────────────────────────────────────
const Toast = ({ message, type }) => (
  <div
    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg whitespace-nowrap"
    style={{
      background: type === 'success' ? 'rgba(46,160,67,0.15)' : 'rgba(248,81,73,0.15)',
      border: `1px solid ${type === 'success' ? 'rgba(46,160,67,0.4)' : 'rgba(248,81,73,0.4)'}`,
      color: type === 'success' ? '#2EA043' : '#F85149',
      backdropFilter: 'blur(12px)',
    }}
  >
    {type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
    {message}
  </div>
)

// ── Field ───────────────────────────────────────────────────
const Field = ({ label, icon: Icon, error, ...props }) => (
  <div>
    <label className="label">{label}</label>
    <div className="relative">
      {Icon && (
        <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-forge-muted pointer-events-none" />
      )}
      <input
        className={`w-full ${Icon ? 'pl-9' : ''} ${error ? 'border-forge-red/60 focus:border-forge-red/80' : ''}`}
        {...props}
      />
    </div>
    {error && (
      <p className="text-xs text-forge-red mt-1 flex items-center gap-1">
        <AlertCircle size={10} />{error}
      </p>
    )}
  </div>
)

// ── SectionIcon ─────────────────────────────────────────────
const SectionIcon = ({ children, bg }) => (
  <div
    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
    style={{ background: bg }}
  >
    {children}
  </div>
)

export default function Profile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [username, setUsername]           = useState('')
  const [avatarUrl, setAvatarUrl]         = useState(null)
  const [avatarFile, setAvatarFile]       = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError]     = useState('')

  const [email, setEmail]               = useState(user?.email || '')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError]     = useState('')

  const [currentPwd, setCurrentPwd]   = useState('')
  const [newPwd, setNewPwd]           = useState('')
  const [confirmPwd, setConfirmPwd]   = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwdLoading, setPwdLoading]   = useState(false)
  const [pwdError, setPwdError]       = useState('')

  const [showDelete, setShowDelete]       = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!user) return
    const meta = user.user_metadata || {}
    setUsername(meta.username || '')
    setAvatarUrl(meta.avatar_url || null)
  }, [user])

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { showToast('Image trop lourde (max 2 Mo)', 'error'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    setAvatarUrl(null)
  }

  const handleProfileSave = async () => {
    setProfileError('')
    if (username && username.length < 2) { setProfileError('Pseudo trop court (min 2 caractères)'); return }
    setProfileLoading(true)

    let finalAvatarUrl = avatarUrl
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `avatars/${user.id}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('trade-images')
        .upload(path, avatarFile, { upsert: true })
      if (upErr) { setProfileLoading(false); setProfileError('Erreur upload avatar'); return }
      const { data: urlData } = supabase.storage.from('trade-images').getPublicUrl(path)
      finalAvatarUrl = urlData.publicUrl
    }

    const { error } = await supabase.auth.updateUser({
      data: { username: username || null, avatar_url: finalAvatarUrl || null }
    })
    setProfileLoading(false)
    if (error) { setProfileError(error.message) }
    else { setAvatarUrl(finalAvatarUrl); setAvatarFile(null); showToast('Profil mis à jour') }
  }

  const handleEmailUpdate = async () => {
    setEmailError('')
    if (!email || email === user?.email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('Email invalide'); return }
    setEmailLoading(true)
    const { error } = await supabase.auth.updateUser({ email })
    setEmailLoading(false)
    if (error) setEmailError(error.message)
    else showToast('Vérifie ta boîte mail pour confirmer')
  }

  const handlePasswordUpdate = async () => {
    setPwdError('')
    if (!newPwd) { setPwdError('Nouveau mot de passe requis'); return }
    if (newPwd.length < 6) { setPwdError('Minimum 6 caractères'); return }
    if (newPwd !== confirmPwd) { setPwdError('Les mots de passe ne correspondent pas'); return }
    setPwdLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email: user?.email, password: currentPwd })
    if (authError) { setPwdLoading(false); setPwdError('Mot de passe actuel incorrect'); return }
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setPwdLoading(false)
    if (error) setPwdError(error.message)
    else { setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); showToast('Mot de passe mis à jour') }
  }

  const pwdStrength = newPwd.length === 0 ? null
    : newPwd.length < 6 ? { label: 'Trop court', color: '#F85149', width: '20%' }
    : newPwd.length < 8 ? { label: 'Faible', color: '#F7B731', width: '40%' }
    : /[A-Z]/.test(newPwd) && /[0-9]/.test(newPwd) ? { label: 'Fort', color: '#2EA043', width: '100%' }
    : { label: 'Moyen', color: '#F7B731', width: '65%' }

  const displayAvatar  = avatarPreview || avatarUrl
  const emailChanged   = email !== user?.email && email.length > 0
  const profileChanged = username !== (user?.user_metadata?.username || '') || avatarFile || (!avatarUrl && user?.user_metadata?.avatar_url)

  return (
    <div className="page">
      {toast && <Toast {...toast} />}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95"
          style={{
            background: 'var(--surface-6)',
            border: '1px solid var(--border-soft)',
            color: 'var(--text-primary)',
          }}
        >
          <ArrowLeft size={15} />
        </button>
        <div>
          <h1 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Profil</h1>
          <p className="text-xs" style={{ color: 'var(--forge-muted)' }}>Modifier vos informations</p>
        </div>
      </div>

      {/* ── Avatar + pseudo ── */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-4">
          <SectionIcon bg="rgba(247,183,49,0.12)">
            <User size={13} className="text-forge-accent" />
          </SectionIcon>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Identité</p>
        </div>

        {/* Avatar picker */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative flex-shrink-0">
            <div
              className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ background: 'rgba(247,183,49,0.1)', border: '2px solid rgba(247,183,49,0.25)' }}
            >
              {displayAvatar ? (
                <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-forge-accent">
                  {(username || user?.email)?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl flex items-center justify-center transition-all active:scale-95"
              style={{ background: '#F7B731', boxShadow: '0 0 12px rgba(247,183,49,0.4)' }}
            >
              <Camera size={12} style={{ color: '#070A0F' }} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
              {username || user?.email?.split('@')[0]}
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--forge-muted)' }}>{user?.email}</p>
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs px-3 py-1.5 rounded-lg transition-all active:scale-95"
                style={{ background: 'rgba(247,183,49,0.1)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.25)' }}
              >
                Changer
              </button>
              {displayAvatar && (
                <button
                  onClick={removeAvatar}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all active:scale-95"
                  style={{ background: 'rgba(248,81,73,0.08)', color: '#F85149', border: '1px solid rgba(248,81,73,0.2)' }}
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>
        </div>

        <Field
          label="Pseudo"
          icon={AtSign}
          type="text"
          value={username}
          onChange={e => { setUsername(e.target.value); setProfileError('') }}
          placeholder="mon_pseudo"
          error={profileError}
          maxLength={30}
        />
        {username && (
          <p className="text-[10px] mt-1 text-right" style={{ color: 'var(--forge-muted)' }}>
            {username.length}/30
          </p>
        )}

        <button
          onClick={handleProfileSave}
          disabled={!profileChanged || profileLoading}
          className="mt-3 w-full py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: 'rgba(247,183,49,0.12)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.25)' }}
        >
          <Check size={13} />
          {profileLoading ? 'Sauvegarde...' : 'Sauvegarder le profil'}
        </button>
      </div>

      {/* ── Email ── */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-4">
          <SectionIcon bg="rgba(88,166,255,0.12)">
            <Mail size={13} style={{ color: '#58a6ff' }} />
          </SectionIcon>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Adresse email</p>
        </div>

        <Field
          label="Email"
          icon={Mail}
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setEmailError('') }}
          placeholder="votre@email.com"
          error={emailError}
        />

        <button
          onClick={handleEmailUpdate}
          disabled={!emailChanged || emailLoading}
          className="mt-3 w-full py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: emailChanged ? 'rgba(88,166,255,0.12)' : 'var(--surface-4)',
            color: emailChanged ? '#58a6ff' : 'var(--forge-muted)',
            border: `1px solid ${emailChanged ? 'rgba(88,166,255,0.3)' : 'var(--border-soft)'}`,
          }}
        >
          {emailLoading ? 'Mise à jour...' : emailChanged ? 'Confirmer le nouvel email' : 'Email inchangé'}
        </button>

        {emailChanged && (
          <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--forge-muted)' }}>
            Un email de confirmation sera envoyé
          </p>
        )}
      </div>

      {/* ── Mot de passe ── */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-4">
          <SectionIcon bg="rgba(247,183,49,0.12)">
            <Lock size={13} className="text-forge-accent" />
          </SectionIcon>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Mot de passe</p>
        </div>

        <div className="space-y-3">
          {/* Current */}
          <div>
            <label className="label">Mot de passe actuel</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-forge-muted pointer-events-none" />
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPwd}
                onChange={e => { setCurrentPwd(e.target.value); setPwdError('') }}
                placeholder="••••••••"
                className="w-full pl-9 pr-9"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--forge-muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}
              >
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* New */}
          <div>
            <label className="label">Nouveau mot de passe</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-forge-muted pointer-events-none" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPwd}
                onChange={e => { setNewPwd(e.target.value); setPwdError('') }}
                placeholder="••••••••"
                className="w-full pl-9 pr-9"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--forge-muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {pwdStrength && (
              <div className="mt-1.5">
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-soft)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: pwdStrength.width, background: pwdStrength.color }}
                  />
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: pwdStrength.color }}>{pwdStrength.label}</p>
              </div>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label className="label">Confirmer</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-forge-muted pointer-events-none" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPwd}
                onChange={e => { setConfirmPwd(e.target.value); setPwdError('') }}
                placeholder="••••••••"
                className={`w-full pl-9 pr-9
                  ${confirmPwd && confirmPwd !== newPwd ? 'border-forge-red/60' : ''}
                  ${confirmPwd && confirmPwd === newPwd && newPwd.length >= 6 ? 'border-forge-green/60' : ''}
                `}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--forge-muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--forge-muted)'}
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              {confirmPwd && confirmPwd === newPwd && newPwd.length >= 6 && (
                <Check size={12} className="absolute right-9 top-1/2 -translate-y-1/2 text-forge-green" />
              )}
            </div>
          </div>
        </div>

        {pwdError && (
          <p className="text-xs text-forge-red mt-2 flex items-center gap-1">
            <AlertCircle size={10} />{pwdError}
          </p>
        )}

        <button
          onClick={handlePasswordUpdate}
          disabled={!currentPwd || !newPwd || !confirmPwd || pwdLoading}
          className="mt-3 w-full py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: 'rgba(247,183,49,0.12)', color: '#F7B731', border: '1px solid rgba(247,183,49,0.25)' }}
        >
          <Shield size={13} />
          {pwdLoading ? 'Mise à jour...' : 'Changer le mot de passe'}
        </button>
      </div>

      {/* ── Danger zone ── */}
      <div className="card mb-6" style={{ borderColor: 'rgba(248,81,73,0.2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <SectionIcon bg="rgba(248,81,73,0.1)">
            <Trash2 size={13} className="text-forge-red" />
          </SectionIcon>
          <p className="text-sm font-medium text-forge-red">Zone dangereuse</p>
        </div>

        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
            style={{ background: 'rgba(248,81,73,0.08)', color: '#F85149', border: '1px solid rgba(248,81,73,0.2)' }}
          >
            Supprimer mon compte
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed" style={{ color: 'var(--forge-muted)' }}>
              Action <span className="text-forge-red font-medium">irréversible</span>. Tapez{' '}
              <span className="font-mono" style={{ color: 'var(--text-primary)' }}>SUPPRIMER</span> pour confirmer.
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="Tapez SUPPRIMER"
              className="w-full text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDelete(false); setDeleteConfirm('') }}
                className="flex-1 py-2 rounded-xl text-xs transition-all"
                style={{
                  color: 'var(--forge-muted)',
                  border: '1px solid var(--border-soft)',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-soft)'}
              >
                Annuler
              </button>
              <button
                disabled={deleteConfirm !== 'SUPPRIMER'}
                onClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession()
                  await fetch('/api/delete-account', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${session.access_token}` }
                  })
                  await supabase.auth.signOut({ scope: 'local' })
                  navigate('/app/login')
                }}
                className="flex-1 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: 'rgba(248,81,73,0.15)', color: '#F85149', border: '1px solid rgba(248,81,73,0.3)' }}
              >
                Confirmer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}