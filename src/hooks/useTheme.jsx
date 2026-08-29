import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'tradeforge_theme'

// Retourne 'dark' ou 'light' selon l'heure (jour = 7h-20h)
function getTimeBasedTheme() {
  const hour = new Date().getHours()
  return hour >= 7 && hour < 20 ? 'light' : 'dark'
}

// Valeur stockée : 'dark' | 'light' | 'auto'
function getInitialMode() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored
  return 'dark'
}

// Résout le thème effectif à partir du mode
function resolveTheme(mode) {
  if (mode === 'auto') return getTimeBasedTheme()
  return mode
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode)
  const [theme, setTheme] = useState(() => resolveTheme(getInitialMode()))

  // Quand le mode change → résoudre + persister
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode)
    setTheme(resolveTheme(mode))
  }, [mode])

  // En mode auto : réévaluer toutes les minutes
  useEffect(() => {
    if (mode !== 'auto') return
    const interval = setInterval(() => {
      setTheme(getTimeBasedTheme())
    }, 60_000)
    return () => clearInterval(interval)
  }, [mode])

  // Appliquer le data-theme sur <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const setThemeMode = useCallback((m) => setMode(m), [])

  return (
    <ThemeContext.Provider value={{
      mode,           // 'dark' | 'light' | 'auto'
      theme,          // thème effectif appliqué : 'dark' | 'light'
      setThemeMode,
      isDark: theme === 'dark',
      isLight: theme === 'light',
      isAuto: mode === 'auto',
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme doit être utilisé à l'intérieur de <ThemeProvider>")
  return ctx
}