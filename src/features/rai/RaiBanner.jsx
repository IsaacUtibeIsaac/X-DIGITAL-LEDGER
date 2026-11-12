import { useEffect, useState } from 'react'
import { watchBattery, getReminders } from '../features/rai/reminders.js'

const HIDE_MS = 15 * 60 * 1000

// Shows the most urgent RAI reminder on every screen (for example, "charge your phone").
export default function RaiBanner({ role }) {
  const [battery, setBattery] = useState(null)
  const [hiddenUntil, setHiddenUntil] = useState(0)
  const [, tick] = useState(0)

  useEffect(() => watchBattery(setBattery), [])

  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 60000)
    return () => clearInterval(id)
  }, [])

  const top = getReminders(role, battery).find(r => r.level === 'warn')
  if (!top || Date.now() < hiddenUntil) return null

  return (
    <div className="rai-banner" role="alert">
      <span><b>RAI:</b> {top.text}</span>
      <button
        type="button"
        className="rai-banner-btn"
        onClick={() => setHiddenUntil(Date.now() + HIDE_MS)}
      >
        Dismiss
      </button>
    </div>
  )
}
