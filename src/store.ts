import { create } from 'zustand'

interface SolarState {
  started: boolean
  paused: boolean
  speed: number
  showOrbits: boolean
  showLabels: boolean
  selectedId: string | null
  viewResetTick: number
  start: () => void
  setPaused: (v: boolean) => void
  setSpeed: (v: number) => void
  toggleOrbits: () => void
  toggleLabels: () => void
  select: (id: string | null) => void
  resetView: () => void
}

export const useStore = create<SolarState>()((set) => ({
  started: false,
  paused: false,
  speed: 1,
  showOrbits: true,
  showLabels: true,
  selectedId: null,
  viewResetTick: 0,
  start: () => set({ started: true }),
  setPaused: (v) => set({ paused: v }),
  setSpeed: (v) => set({ speed: v }),
  toggleOrbits: () => set((s) => ({ showOrbits: !s.showOrbits })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  select: (id) => set({ selectedId: id }),
  resetView: () => set((s) => ({ viewResetTick: s.viewResetTick + 1, selectedId: null })),
}))
