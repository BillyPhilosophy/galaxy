import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import SystemPage from './pages/SystemPage'
import StoryHub from './pages/StoryHub'
import StoryChapter from './pages/StoryChapter'
import StoryScale from './pages/StoryScale'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/system/:id" element={<SystemPage />} />
      <Route path="/story" element={<StoryHub />} />
      <Route path="/story/scale" element={<StoryScale />} />
      <Route path="/story/:id" element={<StoryChapter />} />
    </Routes>
  )
}
