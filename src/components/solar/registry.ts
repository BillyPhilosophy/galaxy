import type { Group } from 'three'

/** 天体 id → 场景中的 Group，用于相机聚焦定位 */
export const bodyRegistry = new Map<string, Group>()
