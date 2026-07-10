import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const STORE_VERSION = 2

const defaultState = {
  trades: {
    search:         '',
    filterResults:  [],
    filterMarkets:  [],
    filterTypes:    [],
    filterDateFrom: '',
    filterDateTo:   '',
    filterMonth:    '',
    sortBy:         'date_desc',
    // panelOpen et chartMode intentionnellement absents → local useState dans TradesList
  },
  weekly:     { currentWeek:   null },
  monthly:    { currentMonth:  null },
  dashboard:  { calendarMonth: null },
  discipline: { activeTab: 'rules', filterCat: 'all', expandedWeeks: {}, expandedCycles: {} },
  hindsights: { filterTF: '', filterMkt: '' },
  lastTradeId: null,
  // tradeCache absent → jamais persisté (peut devenir stale)
}

export const useUIStore = create(
  persist(
    (set) => ({
      ...defaultState,

      // ── TradesList ──────────────────────────────────────
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
      setWeeklyState: (patch) =>
        set(s => ({ weekly: { ...s.weekly, ...patch } })),

      // ── MonthlyAnalysis ─────────────────────────────────
      setMonthlyState: (patch) =>
        set(s => ({ monthly: { ...s.monthly, ...patch } })),

      // ── Dashboard ───────────────────────────────────────
      setDashboardState: (patch) =>
        set(s => ({ dashboard: { ...s.dashboard, ...patch } })),

      // ── RulesAndErrors ──────────────────────────────────
      setDisciplineState: (patch) =>
        set(s => ({ discipline: { ...s.discipline, ...patch } })),

      // ── HindsightsList ──────────────────────────────────
      setHindsightsState: (patch) =>
        set(s => ({ hindsights: { ...s.hindsights, ...patch } })),

      // ── Dernier trade consulté ──────────────────────────
      setLastTradeId:   (id) => set({ lastTradeId: id }),
      clearLastTradeId: ()   => set({ lastTradeId: null }),

      // ── Reset complet au logout ─────────────────────────
      resetAll: () => set(defaultState),
    }),
    {
      name:    'tradeforge-ui',
      version: STORE_VERSION,
      migrate: (_persistedState, _version) => {
        // Toute version différente de STORE_VERSION → on repart de zéro proprement
        return defaultState
      },
      partialize: (s) => ({
        trades:      {
          // On persiste les filtres mais PAS panelOpen ni chartMode
          search:         s.trades.search,
          filterResults:  s.trades.filterResults,
          filterMarkets:  s.trades.filterMarkets,
          filterTypes:    s.trades.filterTypes,
          filterDateFrom: s.trades.filterDateFrom,
          filterDateTo:   s.trades.filterDateTo,
          filterMonth:    s.trades.filterMonth,
          sortBy:         s.trades.sortBy,
        },
        weekly:      s.weekly,
        monthly:     s.monthly,
        dashboard:   s.dashboard,
        discipline:  {
          // On persiste l'onglet actif et le filtre catégorie
          // mais PAS expandedWeeks/expandedCycles (états UI transitoires)
          activeTab: s.discipline.activeTab,
          filterCat: s.discipline.filterCat,
        },
        hindsights:  s.hindsights,
        lastTradeId: s.lastTradeId,
        // tradeCache : intentionnellement exclu (peut devenir stale)
      }),
    }
  )
)