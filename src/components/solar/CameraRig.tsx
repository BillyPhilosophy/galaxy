import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { focusDistance } from '../../data/planets'
import { useStore } from '../../store'
import { bodyRegistry } from './registry'

const DEFAULT_POS = new THREE.Vector3(0, 42, 88)
const ORIGIN = new THREE.Vector3(0, 0, 0)

/** 相机聚焦/跟随与视角重置 */
export default function CameraRig() {
  const selectedId = useStore((s) => s.selectedId)
  const viewResetTick = useStore((s) => s.viewResetTick)
  const lastResetTick = useRef(viewResetTick)
  const returning = useRef(false)
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const desired = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, delta) => {
    const controls = state.controls as unknown as {
      target: THREE.Vector3
      update: () => void
    } | null
    if (!controls) return
    const k = 1 - Math.exp(-3 * delta)

    if (viewResetTick !== lastResetTick.current) {
      lastResetTick.current = viewResetTick
      returning.current = true
    }

    if (selectedId) {
      returning.current = false
      const g = bodyRegistry.get(selectedId)
      if (!g) return
      g.getWorldPosition(tmp)
      controls.target.lerp(tmp, k)
      // 保持当前视线方向，把相机拉到目标附近
      desired.copy(state.camera.position).sub(tmp)
      if (desired.lengthSq() < 1e-6) desired.set(0, 0.4, 1)
      desired.normalize().multiplyScalar(focusDistance(selectedId)).add(tmp)
      state.camera.position.lerp(desired, k * 0.85)
      controls.update()
      return
    }

    if (returning.current) {
      controls.target.lerp(ORIGIN, k)
      state.camera.position.lerp(DEFAULT_POS, k)
      if (state.camera.position.distanceTo(DEFAULT_POS) < 0.6) returning.current = false
      controls.update()
      return
    }

    controls.target.lerp(ORIGIN, k * 0.5)
  })

  return null
}
