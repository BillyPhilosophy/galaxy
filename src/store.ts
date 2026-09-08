import { create } from 'zustand'
import { isMoonId } from './data/planets'

interface SolarState {
  started: boolean
  paused: boolean
  /** 选中卫星时派生的"系统停转"，不影响用户的 paused 设置 */
  halted: boolean
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
  halted: false,
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
  select: (id) => set({ selectedId: id, halted: id !== null && isMoonId(id) }),
  resetView: () => set((s) => ({ viewResetTick: s.viewResetTick + 1, selectedId: null, halted: false })),
}))
