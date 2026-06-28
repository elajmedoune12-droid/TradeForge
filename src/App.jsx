import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
    {/* Pages publiques */}
    <Route path="/"               element={<Landing />} />
    <Route path="/login"          element={<Login />} />
    <Route path="/reset-password" element={<ResetPassword />} />

    {/* App privée — toutes les routes internes sous /app */}
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
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}