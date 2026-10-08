import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'

export const LAB_CHAPTER_REGISTRY: Record<string, LazyExoticComponent<ComponentType>> = {
  'galaxy-collision': lazy(() => import('./galaxy-collision/GalaxyCollisionChapter')),
}
