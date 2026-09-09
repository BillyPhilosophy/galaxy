import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import SystemPage from './pages/SystemPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/system/:id" element={<SystemPage />} />
    </Routes>
  )
}
