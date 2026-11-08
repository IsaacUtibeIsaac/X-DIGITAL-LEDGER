
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
import Suppliers from './screens/Suppliers.jsx'
import Requests from './screens/Requests.jsx'
import Receipts from './screens/Receipts.jsx'
import Reports from './screens/Reports.jsx'
import Rai from './screens/Rai.jsx'

const screens = {
  Dashboard: Home,
  Sales: Sell,
  Inventory,
  Customers,
  Suppliers,
  Requests,
  Receipts,
  Reports,
  RAI: Rai
}

const tabsByRole = {
  Owner: [
    'Dashboard', 'Inventory', 'Customers', 'Suppliers',
    'Requests', 'Receipts', 'Reports', 'RAI'
  ],
  Manager: [
    'Dashboard', 'Inventory', 'Suppliers',
    'Requests', 'Receipts', 'RAI'
  ],
  Cashier: [
    'Sales', 'Receipts', 'Customers',
    'Requests', 'RAI', 'Dashboard'
  ]
}

const TEST_MODE = true

export default function App() {
  const startRole = tabsByRole[getRole()] ? getRole() : 'Manager'

  const [role, setRoleState] = useState(startRole)
  const [tab, setTab] = useState(tabsByRole[startRole][0])
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!supabaseReady) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    )

    return () => sub.subscription.unsubscribe()
  }, [])

  function changeRole(event) {
    const newRole = event.target.value

    setRole(newRole)
    setRoleState(newRole)
    setTab(tabsByRole[newRole][0])
    setMobileOpen(false)
  }

  let content

  if (loading && !TEST_MODE) {
    content = <div className="screen">Loading...</div>
  } else if (!session && !TEST_MODE) {
    content = supabaseReady
      ? <Login />
      : (
        <div className="screen">
          <h2>Setup needed</h2>
          <p>The Supabase keys are missing in Vercel.</p>
        </div>
      )
  } else {
    const names = tabsByRole[role]
    const current = names.includes(tab) ? tab : names[0]
    const Screen = screens[current]

    content = (
      <div className="app-shell">

        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>

        {mobileOpen && (
          <button
            type="button"
            className="mobile-nav-backdrop"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
          />
        )}

        <BottomNav
          tab={current}
          setTab={setTab}
          names={names}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileOpen}
          onNavigate={() => setMobileOpen(false)}
        />

        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

          <header className="app-topbar">
            <button
              type="button"
              className="desktop-nav-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              ☰
            </button>

            <div className="app-topbar-title">
              Digital Ledger
            </div>

            <div className="app-topbar-role">
              {TEST_MODE && (
                <>
                  <span>Testing as</span>
                  <select value={role} onChange={changeRole}>
                    {ROLES.map(item => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </header>

          <main className="app-screen">
            <Screen key={role + current} />
          </main>

        </div>
      </div>
    )
  }

  return (
    <>
      {content}
      <PoweredBy />
    </>
  )
}
