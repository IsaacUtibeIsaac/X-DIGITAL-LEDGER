import { useState, useEffect } from 'react'
import { supabase, supabaseReady } from './lib/supabase.js'
import BottomNav from './components/BottomNav.jsx'
import PoweredBy from './components/PoweredBy.jsx'
import Login from './screens/Login.jsx'
import Home from './screens/Home.jsx'
import Sell from './screens/Sell.jsx'
import Inventory from './screens/Inventory.jsx'
import Reports from './screens/Reports.jsx'

const screens = { Dashboard: Home, Sales: Sell, Inventory, Reports }
const TEST_MODE = true

export default function App() {
  const [tab, setTab] = useState('Dashboard')
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseReady) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  let content
  if (!supabaseReady) {
    content = <div className="screen"><h2>Setup needed</h2><p>The Supabase keys are missing in Vercel.</p></div>
  } else if (loading) {
    content = <div className="screen">Loading...</div>
  } else if (!session && !TEST_MODE) {
    content = <Login />
  } else {
    const Screen = screens[tab]
    content = (
      <>
        <Screen />
        <BottomNav tab={tab} setTab={setTab} names={Object.keys(screens)} />
      </>
    )
  }

  return (
    <>
      {content}
      <PoweredBy />
    </>
  )
}
