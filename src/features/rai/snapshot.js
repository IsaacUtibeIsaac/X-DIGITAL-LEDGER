import { loadProducts, describeStock } from '../inventory/productStore.js'
import { loadSuppliers } from '../suppliers/supplierStore.js'
import { loadRequests } from '../requests/requestStore.js'
import { loadSales, loadVoids, goodsTotal } from '../sales/saleStore.js'
import { loadBusiness } from '../business/businessStore.js'
import { loadTasks } from './taskStore.js'

// A compact copy of the shop's data for the online assistant.
// It is limited to what the signed-in role may see BEFORE it leaves the phone.
// KYC details, customer details and signatures are never included.

const DAY = 86400000
const MAX_PRODUCTS = 150

function validSales() {
  const voided = new Set(loadVoids().map(v => v.saleId))
  return loadSales().filter(s => !voided.has(s.id))
}

function within(sales, from) {
  return sales.filter(s => new Date(s.date).getTime() >= from)
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function unitsSold(sales) {
  const out = {}
  sales.forEach(s => s.lines.forEach(l => {
    out[l.itemId] = (out[l.itemId] || 0) + l.qty * l.size
  }))
  return out
}

function money(sales) {
  const revenue = sales.reduce((t, s) => t + goodsTotal(s), 0)
  const cost = sales.reduce((t, s) => t + s.lines.reduce((c, l) => c + (l.cost || 0) * l.qty, 0), 0)
  return { sales: sales.length, revenue, costOfGoods: cost, grossProfit: revenue - cost }
}

export function buildSnapshot(role) {
  const sales = validSales()
  const sold = unitsSold(within(sales, Date.now() - 7 * DAY))
  const products = loadProducts()

  const rows = products.slice(0, MAX_PRODUCTS).map(p => {
    const r = {
      name: p.name,
      brand: p.brand || '',
      category: p.category || '',
      inStock: describeStock(p),
      baseUnit: p.baseUnit,
      quantityInBaseUnits: p.quantity,
      prices: p.units.map(u => ({ unit: u.name, unitSize: u.size, price: u.price })),
      reorderLevel: p.reorderLevel || 0,
      expiry: p.expiry || ''
    }
    if (role !== 'Cashier') {
      r.costPerBaseUnit = p.unitCost
      r.unitsSoldLast7Days = sold[p.id] || 0
    }
    return r
  })

  const snap = {
    shop: loadBusiness().name || '',
    role,
    productCount: products.length,
    products: rows,
    openItemRequests: loadRequests().filter(r => !r.done).slice(0, 10).map(r => ({ item: r.item, customer: r.customer || '' }))
  }

  if (role === 'Manager' || role === 'Owner') {
    snap.suppliers = loadSuppliers().map(s => ({ name: s.name, phone: s.phone, email: s.email, note: s.note }))
    snap.openTasks = loadTasks(role).filter(t => !t.done).map(t => ({ text: t.text, due: t.due || '' }))
  }

  if (role === 'Owner') {
    snap.financials = {
      today: money(within(sales, startOfToday())),
      last7Days: money(within(sales, Date.now() - 7 * DAY))
    }
  }

  if (role === 'Cashier') {
    let me = ''
    try { me = localStorage.getItem('dl_cashier_name') || '' } catch {}
    const mine = within(sales, startOfToday()).filter(s => s.cashier === me)
    snap.mySalesToday = { sales: mine.length, total: mine.reduce((t, s) => t + goodsTotal(s), 0) }
  }

  return snap
}
