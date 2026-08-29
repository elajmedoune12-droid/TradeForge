// ── En-tête de page moderne ────────────────────────────────
// Pastille d'icône dégradée + halo, titre et sous-titre.
// Utilisé par toutes les pages pour rester cohérent.

export const PageHeader = ({ title, subtitle, icon: Icon, accent = '#F7B731', right }) => (
  <div className="flex items-center justify-between mb-4" style={{ gap: 12 }}>
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${accent}40, ${accent}14)`,
          border: `1px solid ${accent}55`,
          boxShadow: `0 4px 16px -6px ${accent}80`,
        }}
      >
        {Icon && <Icon size={18} style={{ color: accent }} />}
        <div
          className="absolute -top-4 -right-4 w-9 h-9 rounded-full blur-lg opacity-40"
          style={{ background: accent }}
        />
      </div>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] text-forge-muted truncate">{subtitle}</p>
        )}
      </div>
    </div>
    {right && <div className="flex items-center gap-2 flex-shrink-0">{right}</div>}
  </div>
)

export const PrimaryButton = ({ children, onClick, style }) => (
  <button
    onClick={onClick}
    className="relative overflow-hidden btn-primary flex items-center gap-1.5"
    style={style}
  >
    {children}
    <div
      className="absolute inset-0 opacity-30 pointer-events-none rounded-xl"
      style={{ background: 'radial-gradient(circle at 80% -40%, #fff3, transparent 60%)' }}
    />
  </button>
)
