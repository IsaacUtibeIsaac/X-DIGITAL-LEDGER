import { supabase } from '../lib/supabase.js'
import { getRole } from '../lib/role.js'
import { loadProducts, inventoryValue, lowStock } from '../features/inventory/productStore.js'
import { loadSales, loadVoids, goodsTotal } from '../features/sales/saleStore.js'
import { loadRequests } from '../features/requests/requestStore.js'
import AccountReview from '../features/business/AccountReview.jsx'
import BusinessProfile from '../features/business/BusinessProfile.jsx'
import ReceiptSettings from '../features/settings/ReceiptSettings.jsx'
import BackupTools from '../features/settings/BackupTools.jsx'

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
// Shop revenue excludes the automated system charge
const revenue = list => list.reduce((t, s) => t + goodsTotal(s), 0)
const cash = list => list.reduce((t, s) => t + s.total, 0)
const fees = list => list.reduce((t, s) => t + (s.fee || 0), 0)
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
  const low = lowStock(items)
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
          <Stat label="Cash collected today (incl. system charge)" value={naira(cash(mine))} />
          <Stat label="Receipts issued today" value={mine.filter(s => s.receiptIssued).length} />
          <Stat label="Open item requests" value={openRequests} />
        </div>
      )}

      {role === 'Manager' && (
        <>
          <div className="stats">
            <Stat label="Items in inventory" value={items.length} />
            <Stat label="Below reorder level" value={low.length} />
            <Stat label="Open item requests" value={openRequests} />
            <Stat label="Near expiry (30 days)" value={nearExpiry.length} />
          </div>
          {low.length > 0 && <h3>Restock now</h3>}
          {low.map(p => (
            <div key={p.id} className="row">
              <span>{p.name}{p.brand ? ` · ${p.brand}` : ''}</span>
              <span>{p.quantity} {p.baseUnit} left</span>
            </div>
          ))}
          {nearExpiry.length > 0 && <h3>Near expiry</h3>}
          {nearExpiry.map(p => (
            <div key={p.id} className="row"><span>{p.name}{p.brand ? ` · ${p.brand}` : ''}</span><span>{p.expiry}</span></div>
          ))}
          <BackupTools />
        </>
      )}

      {role === 'Owner' && (
        <>
          <div className="stats">
            <Stat label="Shop sales today" value={naira(revenue(today))} />
            <Stat label="Shop sales, last 7 days" value={naira(revenue(week))} />
            <Stat label="Gross profit today" value={naira(revenue(today) - costOf(today))} />
            <Stat label="System charges today (not shop revenue)" value={naira(fees(today))} />
            <Stat label="Inventory value" value={naira(inventoryValue(items))} />
            <Stat label="Below reorder level" value={low.length} />
            <Stat label="Voided sales" value={voided.size} />
            <Stat label="Open item requests" value={openRequests} />
          </div>
          <AccountReview />
          <BusinessProfile />
          <ReceiptSettings />
          <BackupTools />
        </>
      )}

      <p><button onClick={() => supabase && supabase.auth.signOut()}>Sign out</button></p>
    </div>
  )
}
