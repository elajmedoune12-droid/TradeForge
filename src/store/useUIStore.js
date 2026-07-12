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
  },
  weekly:     { currentWeek:   null },
  monthly:    { currentMonth:  null },
  dashboard:  { calendarMonth: null },
  discipline: {
    activeTab:      'rules',
    filterCat:      'all',
    expandedWeeks:  {},   // ← toujours présent
    expandedCycles: {},   // ← toujours présent
  },
  hindsights:  { filterTF: '', filterMkt: '' },
  lastTradeId: null,
}

export const useUIStore = create(
  persist(
    (set) => ({
      ...defaultState,

      setTradesState: (patch) =>
        set(s => ({ trades: { ...s.trades, ...patch } })),
      resetTradesFilters: () =>
        set(s => ({
          trades: {
            ...s.trades,
            search: '', filterResults: [], filterMarkets: [],
            filterTypes: [], filterDateFrom: '', filterDateTo: '', filterMonth: '',
          }
        })),

      setWeeklyState:     (patch) => set(s => ({ weekly:     { ...s.weekly,     ...patch } })),
      setMonthlyState:    (patch) => set(s => ({ monthly:    { ...s.monthly,    ...patch } })),
      setDashboardState:  (patch) => set(s => ({ dashboard:  { ...s.dashboard,  ...patch } })),
      setDisciplineState: (patch) => set(s => ({ discipline: { ...s.discipline, ...patch } })),
      setHindsightsState: (patch) => set(s => ({ hindsights: { ...s.hindsights, ...patch } })),

      setLastTradeId:   (id) => set({ lastTradeId: id }),
      clearLastTradeId: ()   => set({ lastTradeId: null }),

      resetAll: () => set(defaultState),
    }),
    {
      name:    'tradeforge-ui',
      version: STORE_VERSION,
      migrate: (_persistedState, _version) => defaultState,
      partialize: (s) => ({
        trades: {
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
        discipline: {
          activeTab:      s.discipline.activeTab,
          filterCat:      s.discipline.filterCat,
          // expandedWeeks/expandedCycles NON persistés — états UI transitoires
        },
        hindsights:  s.hindsights,
        lastTradeId: s.lastTradeId,
      }),
    }
  )
)