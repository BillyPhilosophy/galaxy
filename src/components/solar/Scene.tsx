import { OrbitControls, Stars } from '@react-three/drei'
import Planet from './Planet'
import Sun from './Sun'
import CameraRig from './CameraRig'
import { PLANETS } from '../../data/planets'

export default function Scene() {
  return (
    <>
      <color attach="background" args={['#020204']} />
      <ambientLight intensity={0.14} />
      <hemisphereLight intensity={0.08} color="#cdd8ff" groundColor="#201812" />
      <pointLight position={[0, 0, 0]} intensity={2.4} decay={0} color="#fff1d6" />
      <Stars radius={200} depth={80} count={7000} factor={4.2} saturation={0} fade speed={0.35} />
      <Sun />
      {PLANETS.map((p) => (
        <Planet key={p.id} data={p} />
      ))}
      <CameraRig />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        minDistance={6}
        maxDistance={170}
      />
    </>
  )
}
