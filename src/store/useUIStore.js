import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
      partialize: (s) => ({
        trades:      s.trades,
        weekly:      s.weekly,
        monthly:     s.monthly,
        dashboard:   s.dashboard,
        discipline:  s.discipline,
        hindsights:  s.hindsights,
        tradeCache:  s.tradeCache,
        lastTradeId: s.lastTradeId,
      }),
    }
  )
)