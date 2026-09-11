import type { ComponentType } from 'react'
import type { StarSystemData } from '../../data/systems'
import PistolSystem from './pistol-star/PistolSystem'
import ThreeBodySystem from './three-body/ThreeBodySystem'

/** 沉浸场景注册表：新增恒星系统 = 建目录 + 这里注册一行 */
export const SYSTEM_REGISTRY: Record<string, ComponentType<{ system: StarSystemData }>> = {
  'pistol-star': PistolSystem,
  'three-body': ThreeBodySystem,
}
