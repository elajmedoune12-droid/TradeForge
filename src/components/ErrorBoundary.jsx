import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, message: '' }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Une erreur inattendue est survenue.' }
  }

  componentDidCatch(error, info) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary]', error, info)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6"
          style={{ background: 'var(--forge-bg)' }}>
          <div className="text-center max-w-sm" style={{
            padding: '32px 28px', borderRadius: 20,
            background: 'var(--surface-card)',
            border: '1px solid var(--border-medium)',
            backdropFilter: 'blur(14px)',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14, margin: '0 auto 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(248,81,73,0.12)', border: '1px solid rgba(248,81,73,0.25)',
              fontSize: 22,
            }}>⚠️</div>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              Oups, quelque chose a mal tourné.
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6, marginBottom: 18 }}>
              {this.state.message}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
                style={{ padding: '9px 18px', fontSize: 13 }}
              >
                Recharger
              </button>
              <button
                onClick={this.handleReset}
                className="btn-ghost"
                style={{ padding: '9px 18px', fontSize: 13 }}
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
