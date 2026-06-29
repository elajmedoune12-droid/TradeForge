import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import AddTrade from './pages/AddTrade'
import TradesList from './pages/TradesList'
import TradeDetail from './pages/TradeDetail'
import AfterTrade from './pages/AfterTrade'
import HindsightNew from './pages/HindsightNew'
import HindsightsList from './pages/HindsightsList'
import RulesAndErrors from './pages/RulesAndErrors'
import MonthlyAnalysis from './pages/MonthlyAnalysis'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import WeeklyForecast from './pages/WeeklyForecast'

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

const AppRoutes = () => (
  <Routes>
    <Route path="/"               element={<Landing />} />
    <Route path="/login"          element={<Login />} />
    <Route path="/reset-password" element={<ResetPassword />} />

    <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
      <Route index                                     element={<Navigate to="/app/dashboard" replace />} />
      <Route path="dashboard"                          element={<Dashboard />} />
      <Route path="trades"                             element={<TradesList />} />
      <Route path="trades/new"                         element={<AddTrade />} />
      <Route path="trades/:id"                         element={<TradeDetail />} />
      <Route path="trades/:id/edit"                    element={<AddTrade />} />
      <Route path="trades/:id/after-trade"             element={<AfterTrade />} />
      <Route path="hindsights"                         element={<HindsightsList />} />
      <Route path="hindsights/new"                     element={<HindsightNew />} />
      <Route path="errors"                             element={<RulesAndErrors defaultTab="errors" />} />
      <Route path="rules"                              element={<RulesAndErrors />} />
      <Route path="monthly"                            element={<MonthlyAnalysis />} />
      <Route path="settings"                           element={<Settings />} />
      <Route path="profile"                            element={<Profile />} />
      <Route path="weekly-forecast"                    element={<WeeklyForecast />} />
    </Route>
  </Routes>
)

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <LocationMemory />
          <ScrollManager />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}