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
        currentWeek: null, // ISO string de la date (wStart), null = semaine en cours
      },
      setWeeklyState: (patch) =>
        set(s => ({ weekly: { ...s.weekly, ...patch } })),

    }),
    {
      name: 'tradeforge-ui',
      partialize: (s) => ({
        trades: s.trades,
        weekly: s.weekly,
      }),
    }
  )
)