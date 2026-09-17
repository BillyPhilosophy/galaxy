import type { ComponentType } from 'react'
import type { StarSystemData } from '../../data/systems'
import ArcturusSystem from './arcturus/ArcturusSystem'
import BetelgeuseSystem from './betelgeuse/BetelgeuseSystem'
import KeplerSystem from './kepler-452/KeplerSystem'
import PistolSystem from './pistol-star/PistolSystem'
import PolluxSystem from './pollux/PolluxSystem'
import ProximaSystem from './proxima-centauri/ProximaSystem'
import ThreeBodySystem from './three-body/ThreeBodySystem'

/** 沉浸场景注册表：新增恒星系统 = 建目录 + 这里注册一行 */
export const SYSTEM_REGISTRY: Record<string, ComponentType<{ system: StarSystemData }>> = {
  'pistol-star': PistolSystem,
  arcturus: ArcturusSystem,
  pollux: PolluxSystem,
  'kepler-452': KeplerSystem,
  'proxima-centauri': ProximaSystem,
  'three-body': ThreeBodySystem,
  betelgeuse: BetelgeuseSystem,
}
