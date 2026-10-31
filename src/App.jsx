import { useState, useEffect } from 'react'
import { supabase, supabaseReady } from './lib/supabase.js'
import { ROLES, getRole, setRole } from './lib/role.js'
import BottomNav from './components/BottomNav.jsx'
import PoweredBy from './components/PoweredBy.jsx'
import Login from './screens/Login.jsx'
import Home from './screens/Home.jsx'
import Sell from './screens/Sell.jsx'
import Inventory from './screens/Inventory.jsx'
import Customers from './screens/Customers.jsx'
import Requests from './screens/Requests.jsx'
import Receipts from './screens/Receipts.jsx'
import Reports from './screens/Reports.jsx'

const screens = {
  Dashboard: Home,
  Sales: Sell,
  Inventory,
  Customers,
  Requests,
  Receipts,
  Reports
}

// Which tabs each role can see (the first tab opens by default)
const tabsByRole = {
  Owner: ['Dashboard', 'Inventory', 'Customers', 'Requests', 'Receipts', 'Reports'],
  Manager: ['Dashboard', 'Inventory', 'Requests', 'Receipts'],
  Cashier: ['Sales', 'Receipts', 'Customers', 'Requests', 'Dashboard']
}

const TEST_MODE = true

export default function App() {
  const startRole = tabsByRole[getRole()] ? getRole() : 'Manager'
  const [role, setRoleState] = useState(startRole)
  const [tab, setTab] = useState(tabsByRole[startRole][0])
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

  function changeRole(e) {
    const r = e.target.value
    setRole(r)
    setRoleState(r)
    setTab(tabsByRole[r][0])
  }

  let content
  if (loading && !TEST_MODE) {
    content = <div className="screen">Loading...</div>
  } else if (!session && !TEST_MODE) {
    content = supabaseReady
      ? <Login />
      : <div className="screen"><h2>Setup needed</h2><p>The Supabase keys are missing in Vercel.</p></div>
  } else {
    const names = tabsByRole[role]
    const current = names.includes(tab) ? tab : names[0]
    const Screen = screens[current]
    content = (
      <>
        <div className="testbar">
          Testing as
          <select value={role} onChange={changeRole}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <Screen key={role + current} />
        <BottomNav tab={current} setTab={setTab} names={names} />
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
