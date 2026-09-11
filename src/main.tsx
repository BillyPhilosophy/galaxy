import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './styles/base.css'
import './styles/hud.css'
import './styles/intro.css'
import './styles/story.css'
import './styles/chapters.css'
import './styles/beyond.css'
import './styles/route-progress.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
