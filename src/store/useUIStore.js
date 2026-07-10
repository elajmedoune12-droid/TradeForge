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
        // panelOpen et chartMode intentionnellement EXCLUS de la persistence
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

      // ── Reset complet (appelé au logout) ───────────────
      resetAll: () => set({
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
        weekly:      { currentWeek: null },
        tradeCache:  {},
        lastTradeId: null,
      }),

    }),
    {
      name: 'tradeforge-ui',
      // Ne persister QUE les filtres utiles — jamais les états UI transitoires
      partialize: (s) => ({
        trades: {
          // Filtres : oui, ils ont une intention utilisateur
          search:         s.trades.search,
          filterResults:  s.trades.filterResults,
          filterMarkets:  s.trades.filterMarkets,
          filterTypes:    s.trades.filterTypes,
          filterDateFrom: s.trades.filterDateFrom,
          filterDateTo:   s.trades.filterDateTo,
          filterMonth:    s.trades.filterMonth,
          sortBy:         s.trades.sortBy,
          // panelOpen: NON — le panneau doit être fermé à chaque ouverture
          // chartMode: NON — revient au défaut 'equity' à chaque ouverture
        },
        weekly:      s.weekly,
        // tradeCache: NON — peut devenir stale, on ne le persiste plus
        lastTradeId: s.lastTradeId,
      }),
    }
  )
)