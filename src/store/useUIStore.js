import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// Stockage localStorage sécurisé : évite de crasher le rendu
// si le stockage est indisponible ou saturé (mode privé, quota…).
const safeStorage = {
  getItem: (name) => {
    try { return localStorage.getItem(name) } catch { return null }
  },
  setItem: (name, value) => {
    try { localStorage.setItem(name, value) } catch { /* quota / indisponible */ }
  },
  removeItem: (name) => {
    try { localStorage.removeItem(name) } catch { /* ignore */ }
  },
}

export const useUIStore = create(
  persist(
    (set) => ({

      // ── TradesList ──────────────────────────────────────
      trades: {
        search:         '',
        filterResults:  [],
        filterMarkets:  [],
        filterTypes:    [],
        filterDateFrom: '',
        filterDateTo:   '',
        filterMonth:    '',
        sortBy:         'date_desc',
        panelOpen:      false,
        chartMode:      'equity',
      },
      setTradesState: (patch) =>
        set(s => ({ trades: { ...s.trades, ...patch } })),
      resetTradesFilters: () =>
        set(s => ({
          trades: {
            ...s.trades,
            search:         '',
            filterResults:  [],
            filterMarkets:  [],
            filterTypes:    [],
            filterDateFrom: '',
            filterDateTo:   '',
            filterMonth:    '',
          }
        })),

      // ── WeeklyForecast ──────────────────────────────────
      weekly: {
        currentWeek: null,
      },
      setWeeklyState: (patch) =>
        set(s => ({ weekly: { ...s.weekly, ...patch } })),

      // ── MonthlyAnalysis ─────────────────────────────────
      monthly: {
        currentMonth: null,
      },
      setMonthlyState: (patch) =>
        set(s => ({ monthly: { ...s.monthly, ...patch } })),

      // ── Dashboard ───────────────────────────────────────
      dashboard: {
        calendarMonth: null, // ISO string, null = mois en cours
      },
      setDashboardState: (patch) =>
        set(s => ({ dashboard: { ...s.dashboard, ...patch } })),

      // ── RulesAndErrors ──────────────────────────────────
      discipline: {
        activeTab:      'rules',
        filterCat:      'all',
        expandedWeeks:  {},
        expandedCycles: {},
      },
      setDisciplineState: (patch) =>
        set(s => ({ discipline: { ...s.discipline, ...patch } })),

      // ── HindsightsList ──────────────────────────────────
      hindsights: {
        filterTF:  '',
        filterMkt: '',
      },
      setHindsightsState: (patch) =>
        set(s => ({ hindsights: { ...s.hindsights, ...patch } })),

      // ── Cache trades détail ─────────────────────────────
      tradeCache: {},
      setTradeCache: (id, trade) =>
        set(s => ({ tradeCache: { ...s.tradeCache, [id]: trade } })),
      clearTradeCache: (id) =>
        set(s => {
          const next = { ...s.tradeCache }
          delete next[id]
          return { tradeCache: next }
        }),

      // ── Dernier trade consulté ──────────────────────────
      lastTradeId: null,
      setLastTradeId: (id) => set({ lastTradeId: id }),
      clearLastTradeId: () => set({ lastTradeId: null }),

    }),
    {
      name: 'tradeforge-ui',
      // Version du schéma : change en cas d'évolution de forme → migrate ci-dessous
      version: 1,
      migrate: (persisted, version) => {
        const base = { ...persisted }
        // En cas de stockage d'un ancien format, on ne conservera que
        // ce qui est réconciliable ; les slices manquantes seront fournies
        // par `merge` via les valeurs par défaut du state initial.
        return base
      },
      // Fusionne le state persisté avec les valeurs par défaut du state initial,
      // garantit qu'aucune clé ne manque même si le stockage est incomplet.
      merge: (persisted, current) => {
        const deepMerge = (base, next) => {
          const out = { ...base }
          for (const key of Object.keys(next || {})) {
            const nv = next[key]
            const bv = base[key]
            out[key] = nv && typeof nv === 'object' && !Array.isArray(nv) && bv && typeof bv === 'object' && !Array.isArray(bv)
              ? deepMerge(bv, nv)
              : nv
          }
          return out
        }
        return deepMerge(current, persisted)
      },
      storage: createJSONStorage(() => safeStorage),
      // On ne persiste PAS les caches volumineux / éphémères (quota localStorage).
      partialize: (s) => ({
        trades:      s.trades,
        weekly:      s.weekly,
        monthly:     s.monthly,
        dashboard:   s.dashboard,
        discipline:  s.discipline,
        hindsights:  s.hindsights,
      }),
    }
  )
)