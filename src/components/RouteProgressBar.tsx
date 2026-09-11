import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { Rocket } from 'lucide-react'

export default function RouteProgressBar() {
  const location = useLocation()
  const [active, setActive] = useState(false)
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    setActive(true)
    const timer = setTimeout(() => setActive(false), 1100)
    return () => clearTimeout(timer)
  }, [location.pathname])

  if (!active) return null

  return (
    <div className="route-progress" key={location.key}>
      <div className="route-progress-fill" />
      <Rocket className="route-progress-ship" size={15} strokeWidth={2.2} />
    </div>
  )
}
