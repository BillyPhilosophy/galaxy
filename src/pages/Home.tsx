import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from '../components/solar/Scene'
import Header from '../components/hud/Header'
import PlanetNav from '../components/hud/PlanetNav'
import ControlBar from '../components/hud/ControlBar'
import InfoPanel from '../components/hud/InfoPanel'
import IntroOverlay from '../components/hud/IntroOverlay'
import Hint from '../components/hud/Hint'
import { useStore } from '../store'

export default function Home() {
  return (
    <div className="app">
      <Canvas
        camera={{ position: [0, 42, 88], fov: 45, near: 0.1, far: 1200 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => useStore.getState().select(null)}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <Header />
      <PlanetNav />
      <ControlBar />
      <InfoPanel />
      <Hint />
      <IntroOverlay />
    </div>
  )
}
