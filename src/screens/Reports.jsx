import { loadProducts } from '../features/inventory/productStore.js'
import { loadSales, loadVoids, goodsTotal } from '../features/sales/saleStore.js'
import { getRole } from '../lib/role.js'

const DAY = 86400000

function startOfDay() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

const naira = n => '₦' + Math.round(n).toLocaleString()

export default function Reports() {
  const role = getRole()
  if (role !== 'Owner') {
    return (
      <div className="screen">
        <h2>Reports</h2>
        <p>Reports are for the owner.</p>
      </div>
    )
  }

  const voided = new Set(loadVoids().map(v => v.saleId))
  const sales = loadSales().filter(s => !voided.has(s.id))
  const items = loadProducts()
  const today = startOfDay()

  function inPeriod(days) {
    const from = days === 1 ? today : today - (days - 1) * DAY
    return sales.filter(s => new Date(s.date).getTime() >= from)
  }

  const periods = [['Today', 1], ['Last 7 days', 7], ['Last 30 days', 30], ['Last 12 months', 365]]
  const rows = periods.map(([label, days]) => {
    const list = inPeriod(days)
    const revenue = list.reduce((t, s) => t + goodsTotal(s), 0)
    const cost = list.reduce((t, s) => t + s.lines.reduce((c, l) => c + (l.cost || 0) * l.qty, 0), 0)
    const units = list.reduce((t, s) => t + s.lines.reduce((c, l) => c + (l.system ? 0 : l.qty * l.size), 0), 0)
    return { label, count: list.length, units, revenue, profit: revenue - cost }
  })

  const month = inPeriod(30)
  const by = {}
  month.forEach(s => s.lines.forEach(l => {
    if (l.system) return
    const e = by[l.itemId] || (by[l.itemId] = { name: l.name, brand: l.brand, units: 0, revenue: 0 })
    e.units += l.qty * l.size
    e.revenue += l.qty * l.price
  }))
  const best = Object.entries(by).sort((a, b) => b[1].units - a[1].units).slice(0, 5)

  const soldRecently = new Set()
  inPeriod(14).forEach(s => s.lines.forEach(l => { if (!l.system) soldRecently.add(l.itemId) }))
  const slow = items.filter(p => p.quantity > 0 && !soldRecently.has(p.id))

  const expiring = items
    .filter(p => p.expiry)
    .map(p => ({ p, days: Math.ceil((new Date(p.expiry).getTime() - Date.now()) / DAY) }))
    .filter(r => r.days <= 30)
    .sort((a, b) => a.days - b.days)

  return (
    <div className="screen">
      <h2>Reports</h2>
      <p>Shop revenue excludes the automated system charge.</p>

      <h3>Sales by period</h3>
      <div className="rep">
        <div className="repr rephead"><span>Period</span><span>Sales</span><span>Units</span><span>Revenue</span><span>Gross profit</span></div>
        {rows.map(r => (
          <div key={r.label} className="repr">
            <span>{r.label}</span><span>{r.count}</span><span>{r.units}</span><span>{naira(r.revenue)}</span><span>{naira(r.profit)}</span>
          </div>
        ))}
      </div>

      <h3>Best sellers, last 30 days</h3>
      {best.length === 0 && <p>No sales yet.</p>}
      {best.map(([id, e], i) => (
        <div key={id} className="row">
          <span>{i + 1}. {e.name}{e.brand ? ` (${e.brand})` : ''}</span>
          <span>{e.units} units · {naira(e.revenue)}</span>
        </div>
      ))}

      <h3>Slow movers (no sales in 14 days)</h3>
      {slow.length === 0 && <p>None.</p>}
      {slow.map(p => (
        <div key={p.id} className="row"><span>{p.name}{p.brand ? ` (${p.brand})` : ''}</span><span>Reduce restocking</span></div>
      ))}

      <h3>Close to expiry</h3>
      {expiring.length === 0 && <p>None within 30 days.</p>}
      {expiring.map(({ p, days }) => (
        <div key={p.id} className="row">
          <span>{p.name}{p.brand ? ` (${p.brand})` : ''}</span>
          <span>{days <= 0 ? 'Expired' : `${days} day(s)`} · suggest {days <= 0 ? 'remove' : days <= 7 ? '30% off' : days <= 14 ? '20% off' : '10% off'}</span>
        </div>
      ))}
    </div>
  )
}
