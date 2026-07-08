import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUIStore = create(
  persist(
    (set) => ({

      // ── TradesList — filtres persistés (pas l'état UI) ──────────
      trades: {
        search:         '',
        filterResults:  [],
        filterMarkets:  [],
        filterTypes:    [],
        filterDateFrom: '',
        filterDateTo:   '',
        filterMonth:    '',
        sortBy:         'date_desc',
        // ❌ panelOpen et chartMode ne sont PAS ici → state local dans le composant
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

      // ── WeeklyForecast — juste la semaine sélectionnée ──────────
      weekly: {
        currentWeek: null,
      },
      setWeeklyState: (patch) =>
        set(s => ({ weekly: { ...s.weekly, ...patch } })),

      // ── Cache trades détail ──────────────────────────────────────
      tradeCache: {},
      setTradeCache: (id, trade) =>
        set(s => ({ tradeCache: { ...s.tradeCache, [id]: trade } })),
      clearTradeCache: (id) =>
        set(s => {
          const next = { ...s.tradeCache }
          delete next[id]
          return { tradeCache: next }
        }),

      // ── Dernier trade consulté ───────────────────────────────────
      lastTradeId: null,
      setLastTradeId: (id) => set({ lastTradeId: id }),
      clearLastTradeId: () => set({ lastTradeId: null }),

    }),
    {
      name: 'tradeforge-ui',
      // ✅ On persiste UNIQUEMENT les filtres et le cache
      // Tout ce qui est "état visuel" (panel ouvert, onglet actif,
      // mode graphique) reste en state local dans chaque composant
      partialize: (s) => ({
        trades: {
          // filtres seulement — pas panelOpen ni chartMode
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
        tradeCache:  s.tradeCache,
        lastTradeId: s.lastTradeId,
      }),
    }
  )
)