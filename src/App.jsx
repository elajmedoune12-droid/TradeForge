import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, lazy, Suspense } from 'react'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import NotFound from './pages/NotFound'
import ErrorBoundary from './components/ErrorBoundary'
import PageTransition from './components/PageTransition'

// Pages de l'app chargées à la demande (code-splitting)
const Dashboard       = lazy(() => import('./pages/Dashboard'))
const AddTrade        = lazy(() => import('./pages/AddTrade'))
const TradesList      = lazy(() => import('./pages/TradesList'))
const TradeDetail     = lazy(() => import('./pages/TradeDetail'))
const AfterTrade      = lazy(() => import('./pages/AfterTrade'))
const HindsightNew    = lazy(() => import('./pages/HindsightNew'))
const HindsightsList  = lazy(() => import('./pages/HindsightsList'))
const RulesAndErrors  = lazy(() => import('./pages/RulesAndErrors'))
const MonthlyAnalysis = lazy(() => import('./pages/MonthlyAnalysis'))
const Settings        = lazy(() => import('./pages/Settings'))
const Profile         = lazy(() => import('./pages/Profile'))
const WeeklyForecast  = lazy(() => import('./pages/WeeklyForecast'))

// ── Mémorise et restaure la dernière route ────────────────────
function LocationMemory() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (location.pathname.startsWith('/app')) {
      sessionStorage.setItem('lastRoute', location.pathname)
    }
  }, [location])

  useEffect(() => {
    const last = sessionStorage.getItem('lastRoute')
    if (last && location.pathname === '/') {
      navigate(last, { replace: true })
    }
  }, [])

  return null
}

// Pages où on revient toujours en haut (pas de restauration)
const ALWAYS_TOP = [
  '/app/trades/new',
  '/app/hindsights/new',
]

const isAlwaysTop = (path) =>
  ALWAYS_TOP.some(p => path === p) ||
  path.endsWith('/edit') ||
  path.endsWith('/after-trade')

// ── Scroll manager : sauvegarde + restauration par route ──────
function ScrollManager() {
  const { pathname } = useLocation()
  const positions = useRef({})   // { [pathname]: scrollY }
  const prevPath  = useRef(null)

  useEffect(() => {
    const prev = prevPath.current

    // 1. Sauvegarder la position de la page qu'on quitte
    if (prev && prev !== pathname) {
      positions.current[prev] = window.scrollY
    }

    // 2. Restaurer ou remettre en haut
    const saved = positions.current[pathname]

    if (isAlwaysTop(pathname) || saved == null) {
      // Page jamais visitée ou page "création" → haut
      window.scrollTo({ top: 0, behavior: 'instant' })
    } else {
      // Page déjà visitée → restaurer position
      // On attend le prochain frame pour que le DOM soit prêt
      requestAnimationFrame(() => {
        window.scrollTo({ top: saved, behavior: 'instant' })
      })
    }

    prevPath.current = pathname
  }, [pathname])

  return null
}

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-forge-bg">
      <div className="w-6 h-6 border-2 border-forge-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

// Chargement moderne pour les pages chargées à la demande (code-splitting)
function RouteLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-forge-muted">
      <div className="w-8 h-8 border-2 border-forge-accent border-t-transparent rounded-full animate-spin" />
      <p className="text-xs">Chargement…</p>
    </div>
  )
}

// Applique une transition de page + garde-fou d'erreur + suspense sur chaque écran
function withTransition(node) {
  return <Suspense fallback={<RouteLoader />}><PageTransition>{node}</PageTransition></Suspense>
}

const AppRoutes = () => {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/"               element={withTransition(<Landing />)} />
        <Route path="/login"          element={withTransition(<Login />)} />
        <Route path="/reset-password" element={withTransition(<ResetPassword />)} />

        <Route path="/app" element={<ErrorBoundary><PrivateRoute><Layout /></PrivateRoute></ErrorBoundary>}>
          <Route index                                     element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard"                          element={<ErrorBoundary>{withTransition(<Dashboard />)}</ErrorBoundary>} />
          <Route path="trades"                             element={<ErrorBoundary>{withTransition(<TradesList />)}</ErrorBoundary>} />
          <Route path="trades/new"                         element={<ErrorBoundary>{withTransition(<AddTrade />)}</ErrorBoundary>} />
          <Route path="trades/:id"                         element={<ErrorBoundary>{withTransition(<TradeDetail />)}</ErrorBoundary>} />
          <Route path="trades/:id/edit"                    element={<ErrorBoundary>{withTransition(<AddTrade />)}</ErrorBoundary>} />
          <Route path="trades/:id/after-trade"             element={<ErrorBoundary>{withTransition(<AfterTrade />)}</ErrorBoundary>} />
          <Route path="hindsights"                         element={<ErrorBoundary>{withTransition(<HindsightsList />)}</ErrorBoundary>} />
          <Route path="hindsights/new"                     element={<ErrorBoundary>{withTransition(<HindsightNew />)}</ErrorBoundary>} />
          <Route path="errors"                             element={<ErrorBoundary>{withTransition(<RulesAndErrors defaultTab="errors" />)}</ErrorBoundary>} />
          <Route path="rules"                              element={<ErrorBoundary>{withTransition(<RulesAndErrors />)}</ErrorBoundary>} />
          <Route path="monthly"                            element={<ErrorBoundary>{withTransition(<MonthlyAnalysis />)}</ErrorBoundary>} />
          <Route path="settings"                           element={<ErrorBoundary>{withTransition(<Settings />)}</ErrorBoundary>} />
          <Route path="profile"                            element={<ErrorBoundary>{withTransition(<Profile />)}</ErrorBoundary>} />
          <Route path="weekly-forecast"                    element={<ErrorBoundary>{withTransition(<WeeklyForecast />)}</ErrorBoundary>} />
          <Route path="*"                                  element={<ErrorBoundary>{withTransition(<NotFound />)}</ErrorBoundary>} />
        </Route>
        <Route path="*" element={<ErrorBoundary>{withTransition(<NotFound />)}</ErrorBoundary>} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
          <MotionConfig reducedMotion="user">
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <LocationMemory />
              <ScrollManager />
              <AppRoutes />
            </BrowserRouter>
          </MotionConfig>
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  )
}