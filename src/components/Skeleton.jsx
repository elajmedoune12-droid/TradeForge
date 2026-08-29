export const SkeletonCard = () => (
  <div className="card animate-pulse">
    <div className="h-3 rounded-lg mb-3 w-1/3" style={{ background: 'var(--skeleton-bg)' }} />
    <div className="h-8 rounded-lg mb-2 w-1/2" style={{ background: 'var(--skeleton-bg-soft)' }} />
    <div className="h-3 rounded-lg w-2/3"       style={{ background: 'var(--skeleton-bg-soft)' }} />
  </div>
)

export const SkeletonList = () => (
  <div className="space-y-2">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="card flex items-center gap-3 animate-pulse">
        <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ background: 'var(--skeleton-bg)' }} />
        <div className="flex-1">
          <div className="h-3 rounded-lg mb-2 w-1/3" style={{ background: 'var(--skeleton-bg)' }} />
          <div className="h-2.5 rounded-lg w-1/4"    style={{ background: 'var(--skeleton-bg-soft)' }} />
        </div>
        <div className="h-5 w-10 rounded-lg" style={{ background: 'var(--skeleton-bg-soft)' }} />
      </div>
    ))}
  </div>
)