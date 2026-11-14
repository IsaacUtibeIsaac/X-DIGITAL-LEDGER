import { useState, useEffect, useRef } from 'react'
import { supabase, supabaseReady } from './lib/supabase.js'
import { sync } from './lib/syncInstance.js'
import { ROLES, getRole, setRole } from './lib/role.js'
import { fetchMembership, signOutAndWipe } from './lib/session.js'
import BottomNav from './components/BottomNav.jsx'
import PoweredBy from './components/PoweredBy.jsx'
import RaiBanner from './components/RaiBanner.jsx'
import SyncStatus from './components/SyncStatus.jsx'
import Login from './screens/Login.jsx'
import Onboarding from './screens/Onboarding.jsx'
import Home from './screens/Home.jsx'
import Sell from './screens/Sell.jsx'
import Inventory from './screens/Inventory.jsx'
import Customers from './screens/Customers.jsx'
import Suppliers from './screens/Suppliers.jsx'
import Requests from './screens/Requests.jsx'
import Receipts from './screens/Receipts.jsx'
import Reports from './screens/Reports.jsx'
import Staff from './screens/Staff.jsx'
import Wallet from './screens/Wallet.jsx'
import Xdl from './screens/Xdl.jsx'
import Rai from './screens/Rai.jsx'
import Security from './screens/Security.jsx'
import KycStore from './screens/KycStore.jsx'
import PinLock from './features/security/PinLock.jsx'
import LegalScreen from './features/legal/LegalScreen.jsx'
import KycBanner from './features/business/KycBanner.jsx'

const screens = {
  Dashboard: Home,
  Sales: Sell,
  Inventory,
  Customers,
  Suppliers,
  Requests,
  Receipts,
  Reports,
  Staff,
  Wallet,
  Security,
  'KYC Store': KycStore,
  XDL: Xdl,
  RAI: Rai
}

const tabsByRole = {
  Owner: [
    'Dashboard', 'Inventory', 'Customers', 'Suppliers',
    'Requests', 'Receipts', 'Reports', 'Wallet', 'Staff',
    'Security', 'KYC Store', 'RAI'
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

function readForceTest() {
  try { return localStorage.getItem('dl_force_test') === '1' } catch { return false }
}

// Test mode: no login, and a role switcher at the top.
// It is on when the database keys are missing, or when this phone chose it.
const FORCE_TEST = readForceTest()
const TEST_MODE = !supabaseReady || FORCE_TEST

function setForceTest(on) {
  try { localStorage.setItem('dl_force_test', on ? '1' : '0') } catch {}
  window.location.reload()
}

export default function App() {
  const startRole = tabsByRole[getRole()] ? getRole() : 'Manager'

  const [role, setRoleState] = useState(startRole)
  const [tab, setTab] = useState(tabsByRole[startRole][0])
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const [member, setMember] = useState({ status: 'idle' })
  const [memberTick, setMemberTick] = useState(0)
  const [syncStatus, setSyncStatus] = useState({ state: 'idle' })
  const [staleData, setStaleData] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const [legalOk, setLegalOk] = useState(false)
  const [legalDocs, setLegalDocs] = useState(null)
  const [legalChecked, setLegalChecked] = useState(false)
  const [showLegal, setShowLegal] = useState(false)

  const adoptRef = useRef(false)
  const syncRef = useRef(null)

  const userId = session ? session.user.id : null

  // 1. Who is signed in
  useEffect(() => {
    if (TEST_MODE) {
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

  // 1b. Published Terms and Privacy Policy (written and approved in XDL-Management).
  // If nothing is published yet, or the lookup fails (for example offline), nobody is blocked.
  useEffect(() => {
    if (TEST_MODE || !userId) {
      setLegalDocs(null)
      setLegalOk(false)
      setLegalChecked(false)
      return
    }
    let live = true
    setLegalChecked(false)
    supabase.rpc('legal_published', { p_audience: 'merchant' }).then(({ data, error }) => {
      if (!live) return
      const docs = !error && Array.isArray(data) ? data : []
      setLegalDocs(docs)
      setLegalOk(docs.every(d => d.accepted))
      setLegalChecked(true)
    })
    return () => { live = false }
  }, [userId])

  // 2. Which business and role they have
  useEffect(() => {
    if (TEST_MODE) return
    if (!userId) {
      setMember({ status: 'idle' })
      return
    }

    let live = true
    setMember({ status: 'loading' })

    fetchMembership(userId).then(res => {
      if (!live) return
      if (res.error) {
        setMember({ status: 'error', error: res.error.message || 'Could not reach the database.' })
        return
      }
      const m = res.membership
      if (!m) {
        setMember({ status: 'none' })
        return
      }
      if (!m.active) {
        setMember({ status: 'inactive' })
        return
      }
      setRole(m.role)
      try {
        if (m.display_name) localStorage.setItem('dl_cashier_name', m.display_name)
      } catch {}
      if (sync) sync.prepareDevice(m.business_id, adoptRef.current)
      adoptRef.current = false
      setRoleState(m.role)
      setTab(tabsByRole[m.role][0])
      setMember({ status: 'ready', data: m })
    })

    return () => { live = false }
  }, [userId, memberTick])

  // 3. Keep this phone and the database in step
  const businessId = member.status === 'ready' ? member.data.business_id : null
  const memberRole = member.status === 'ready' ? member.data.role : null

  useEffect(() => {
    if (TEST_MODE || !sync || !businessId) return

    const run = sync.start({ role: memberRole }, s => {
      setSyncStatus(s)
      if (s.state === 'synced' && s.changed) setStaleData(true)
    })
    syncRef.current = run

    return () => {
      run.stop()
      syncRef.current = null
    }
  }, [businessId, memberRole])

  // 4. Notice if the owner turns this person's access off
  useEffect(() => {
    if (TEST_MODE || !userId || member.status !== 'ready') return
    const id = setInterval(() => {
      fetchMembership(userId).then(res => {
        if (res.membership && !res.membership.active) setMember({ status: 'inactive' })
      })
    }, 60000)
    return () => clearInterval(id)
  }, [userId, member.status])

  // 5. Winfieldtec staff get the XDL screen
  useEffect(() => {
    if (TEST_MODE || !supabase || !businessId) {
      setIsAdmin(false)
      return
    }
    let live = true
    supabase.rpc('is_platform_admin').then(({ data, error }) => {
      if (live) setIsAdmin(!error && data === true)
    })
    return () => { live = false }
  }, [businessId])

  function changeRole(event) {
    const newRole = event.target.value

    setRole(newRole)
    setRoleState(newRole)
    setTab(tabsByRole[newRole][0])
    setMobileOpen(false)
    setShowLegal(false)

    // Sales and changes made while the owner acts as someone else are labelled as such.
    if (!TEST_MODE && member.status === 'ready') {
      const base = member.data.display_name || 'Owner'
      try {
        localStorage.setItem(
          'dl_cashier_name',
          newRole === member.data.role ? base : `${base} (Owner as ${newRole})`
        )
      } catch {}
    }
  }

  async function signOut() {
    const result = await signOutAndWipe(role)
    if (!result.cancelled) {
      setMember({ status: 'idle' })
      setSyncStatus({ state: 'idle' })
    }
  }

  async function acceptLegal() {
    for (const d of legalDocs || []) {
      if (d.accepted) continue
      const { error } = await supabase.rpc('legal_accept', { p_doc: d.id })
      if (error) throw error
    }
    setLegalDocs(docs => (docs || []).map(d => ({ ...d, accepted: true })))
    setLegalOk(true)
  }

  function refreshScreen() {
    setStaleData(false)
    setRefreshKey(k => k + 1)
  }

  function renderShell() {
    const base = tabsByRole[role]
    const names = !TEST_MODE && isAdmin && role === 'Owner' ? [...base, 'XDL'] : base
    const current = names.includes(tab) ? tab : names[0]
    const Screen = screens[current]
    const title = !TEST_MODE && member.status === 'ready' && member.data.business_name
      ? member.data.business_name
      : 'Digital Ledger'

    return (
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
          setTab={t => { setShowLegal(false); setTab(t) }}
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
              {title}
            </div>

            <div className="app-topbar-role">
              {TEST_MODE ? (
                <>
                  <span>Testing as</span>
                  <select value={role} onChange={changeRole}>
                    {ROLES.map(item => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  {supabaseReady && (
                    <button type="button" className="small" onClick={() => setForceTest(false)}>
                      Use real login
                    </button>
                  )}
                </>
              ) : (
                <>
                  <SyncStatus
                    status={syncStatus}
                    onClick={() => syncRef.current && syncRef.current.now()}
                  />
                  {memberRole === 'Owner' ? (
                    <>
                      <span>Viewing as</span>
                      <select value={role} onChange={changeRole}>
                        {ROLES.map(item => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <span>{role}</span>
                  )}
                  <button type="button" className="small" onClick={() => setShowLegal(!showLegal)}>Legal</button>
                  <button type="button" className="small" onClick={signOut}>Sign out</button>
                </>
              )}
            </div>
          </header>

          <RaiBanner role={role} />

          {staleData && (
            <div className="sync-banner">
              <span>Updated from another device.</span>
              <button type="button" className="small" onClick={refreshScreen}>Refresh</button>
            </div>
          )}

          {!TEST_MODE && memberRole === 'Owner' && role === 'Owner' && current === 'Dashboard' && !showLegal && (
            <KycBanner onOpen={() => setTab('KYC Store')} />
          )}

          <main className="app-screen">
            {showLegal ? (
              <>
                <button type="button" className="small" onClick={() => setShowLegal(false)}>Back</button>
                <LegalScreen docs={legalDocs} />
              </>
            ) : (
              <Screen key={role + current + refreshKey} businessId={businessId} />
            )}
          </main>

        </div>
      </div>
    )
  }

  let content

  if (TEST_MODE) {
    content = renderShell()
  } else if (loading || member.status === 'loading') {
    content = <div className="screen">Loading...</div>
  } else if (!session) {
    content = <Login />
  } else if (!legalChecked) {
    content = <div className="screen">Loading...</div>
  } else if (!legalOk) {
    content = <LegalScreen docs={legalDocs} onAccept={acceptLegal} />
  } else if (member.status === 'error') {
    content = (
      <div className="screen">
        <h2>Setup needed</h2>
        <p>The online database is not ready yet.</p>
        <p className="rai-lock">{member.error}</p>
        <p>Run the file supabase/schema.sql in Supabase (SQL Editor), then refresh this page.</p>
        <div className="rai-row">
          <button type="button" onClick={() => setForceTest(true)}>Use test mode on this phone</button>
          <button type="button" className="small" onClick={signOut}>Sign out</button>
        </div>
      </div>
    )
  } else if (member.status === 'none') {
    content = (
      <Onboarding
        email={session.user.email}
        onDone={adopt => {
          adoptRef.current = adopt
          setMemberTick(n => n + 1)
        }}
        onSignOut={signOut}
      />
    )
  } else if (member.status === 'inactive') {
    content = (
      <div className="screen">
        <h2>Access is turned off</h2>
        <p>The owner has turned off your access. Please ask them to turn it back on.</p>
        <button type="button" onClick={signOut}>Sign out</button>
      </div>
    )
  } else if (member.status === 'ready') {
    content = (
      <PinLock userId={userId} onForgot={signOut}>
        {renderShell()}
      </PinLock>
    )
  } else {
    content = <div className="screen">Loading...</div>
  }

  return (
    <>
      {content}
      <PoweredBy />
    </>
  )
}
