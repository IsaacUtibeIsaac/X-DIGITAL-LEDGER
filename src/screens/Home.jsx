import { supabase } from '../lib/supabase.js'
import { getRole } from '../lib/role.js'
import { loadProducts, inventoryValue } from '../features/inventory/productStore.js'
import { loadSales, loadVoids } from '../features/sales/saleStore.js'
import { loadRequests } from '../features/requests/requestStore.js'
import BusinessProfile from '../features/business/BusinessProfile.jsx'
import ReceiptSettings from '../features/settings/ReceiptSettings.jsx'

function startOfDay() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="statv">{value}</div>
      <div>{label}</div>
    </div>
  )
}

const naira = n => '₦' + Math.round(n).toLocaleString()
const sum = list => list.reduce((t, s) => t + s.total, 0)
const costOf = list =>
  list.reduce((t, s) => t + s.lines.reduce((c, l) => c + (l.cost || 0) * l.qty, 0), 0)

export default function Home() {
  const role = getRole()
  const voided = new Set(loadVoids().map(v => v.saleId))
  const sales = loadSales().filter(s => !voided.has(s.id))
  const dayStart = startOfDay()
  const today = sales.filter(s => new Date(s.date).getTime() >= dayStart)
  const week = sales.filter(s => new Date(s.date).getTime() >= dayStart - 6 * 86400000)
  const items = loadProducts()
  const openRequests = loadRequests().filter(r => !r.done).length
  const nearExpiry = items.filter(
    p => p.expiry && (new Date(p.expiry).getTime() - Date.now()) / 86400000 <= 30
  )
  let myName = ''
  try { myName = localStorage.getItem('dl_cashier_name') || '' } catch {}
  const mine = today.filter(s => s.cashier === myName)

  return (
    <div className="screen">
      <h2>Dashboard</h2>

      {role === 'Cashier' && (
        <div className="stats">
          <Stat label="My sales today" value={mine.length} />
          <Stat label="My takings today" value={naira(sum(mine))} />
          <Stat label="Receipts issued today" value={mine.filter(s => s.receiptIssued).length} />
          <Stat label="Open item requests" value={openRequests} />
        </div>
      )}

      {role === 'Manager' && (
        <>
          <div className="stats">
            <Stat label="Items in inventory" value={items.length} />
            <Stat label="Open item requests" value={openRequests} />
            <Stat label="Sales today" value={today.length} />
            <Stat label="Near expiry (30 days)" value={nearExpiry.length} />
          </div>
          {nearExpiry.length > 0 && <h3>Near expiry</h3>}
          {nearExpiry.map(p => (
            <div key={p.id} className="row"><span>{p.name}{p.brand ? ` · ${p.brand}` : ''}</span><span>{p.expiry}</span></div>
          ))}
        </>
      )}

      {role === 'Owner' && (
        <>
          <div className="stats">
            <Stat label="Sales today" value={naira(sum(today))} />
            <Stat label="Sales, last 7 days" value={naira(sum(week))} />
            <Stat label="Gross profit today" value={naira(sum(today) - costOf(today))} />
            <Stat label="Inventory value" value={naira(inventoryValue(items))} />
            <Stat label="Voided sales" value={voided.size} />
            <Stat label="Open item requests" value={openRequests} />
          </div>
          <BusinessProfile />
          <ReceiptSettings />
        </>
      )}

      <p><button onClick={() => supabase && supabase.auth.signOut()}>Sign out</button></p>
    </div>
  )
}
