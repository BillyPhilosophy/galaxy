import { Routes, Route, Navigate } from 'react-router'
import RouteProgressBar from './components/RouteProgressBar'
import IntroPage from './pages/IntroPage'
import Home from './pages/Home'
import SystemPage from './pages/SystemPage'
import StoryHub from './pages/StoryHub'
import StoryChapter from './pages/StoryChapter'
import StoryScale from './pages/StoryScale'

export default function App() {
  return (
    <>
      <RouteProgressBar />
      <Routes>
      <Route path="/" element={<IntroPage />} />
      <Route path="/solar" element={<Home />} />
      <Route path="/system/:id" element={<SystemPage />} />
      <Route path="/story" element={<StoryHub />} />
      <Route path="/story/scale" element={<StoryScale />} />
      <Route path="/story/:id" element={<StoryChapter />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
