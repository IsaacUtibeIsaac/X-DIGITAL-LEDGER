import { loadProducts, describeStock, inventoryValue } from '../inventory/productStore.js'
import { loadSales, loadVoids } from '../sales/saleStore.js'
import { loadRequests } from '../requests/requestStore.js'
import { RECEIPT_FEE } from '../settings/settingsStore.js'

// RAI v1: Role-Aware Intelligence.
// All numbers are calculated by plain code from recorded data.
// Each question is checked against the signed-in role BEFORE any data is read.

const DAY = 86400000
const naira = n => '₦' + Math.round(n).toLocaleString()

function startOfDay() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function validSales() {
  const voided = new Set(loadVoids().map(v => v.saleId))
  return loadSales().filter(s => !voided.has(s.id))
}

function between(sales, from, to) {
  return sales.filter(s => {
    const t = new Date(s.date).getTime()
    return t >= from && t < to
  })
}

function unitsSold(sales) {
  const out = {}
  sales.forEach(s => s.lines.forEach(l => {
    out[l.itemId] = (out[l.itemId] || 0) + l.qty * l.size
  }))
  return out
}

function periodFrom(q) {
  if (/month/.test(q)) return { from: Date.now() - 30 * DAY, label: 'the last 30 days' }
  if (/week/.test(q)) return { from: startOfDay() - 6 * DAY, label: 'the last 7 days' }
  return { from: startOfDay(), label: 'today' }
}

const named = p => p.name + (p.brand ? ' (' + p.brand + ')' : '')
const evidence = n => `Based on ${n} recorded sale(s).`

// ---------- data answers ----------

function mySales() {
  let me = ''
  try { me = localStorage.getItem('dl_cashier_name') || '' } catch {}
  const list = between(validSales(), startOfDay(), Date.now() + 1).filter(s => s.cashier === me)
  if (!list.length) return [`No sales recorded today under the name "${me || 'not set'}".`]
  const total = list.reduce((t, s) => t + s.total, 0)
  return [
    `Today you made ${list.length} sale(s) worth ${naira(total)}.`,
    `Receipts issued: ${list.filter(s => s.receiptIssued).length}.`
  ]
}

function profit(q) {
  const { from, label } = periodFrom(q)
  const list = between(validSales(), from, Date.now() + 1)
  if (!list.length) return [`No sales recorded for ${label}.`]
  const revenue = list.reduce((t, s) => t + s.total, 0)
  const cost = list.reduce((t, s) => t + s.lines.reduce((c, l) => c + (l.cost || 0) * l.qty, 0), 0)
  const lines = [
    `For ${label}:`,
    `• Sales revenue: ${naira(revenue)}`,
    `• Cost of goods sold: ${naira(cost)}`,
    `• Gross profit: ${naira(revenue - cost)}` + (revenue ? ` (${Math.round(((revenue - cost) / revenue) * 100)}% margin)` : ''),
    evidence(list.length)
  ]
  if (list.some(s => s.lines.some(l => !l.cost))) {
    lines.push('Some items have no cost price, so profit may be overstated. Ask the manager to enter cost prices.')
  }
  return lines
}

function salesTotals(q) {
  const { from, label } = periodFrom(q)
  const list = between(validSales(), from, Date.now() + 1)
  if (!list.length) return [`No sales recorded for ${label}.`]
  const total = list.reduce((t, s) => t + s.total, 0)
  return [
    `Sales for ${label}: ${naira(total)} from ${list.length} sale(s).`,
    `Average sale: ${naira(total / list.length)}.`,
    evidence(list.length)
  ]
}

function cashierPerformance() {
  const voided = new Set(loadVoids().map(v => v.saleId))
  const all = between(loadSales(), startOfDay() - 6 * DAY, Date.now() + 1)
  if (!all.length) return ['No sales recorded in the last 7 days.']
  const by = {}
  all.forEach(s => {
    const k = s.cashier || 'Unknown'
    const e = by[k] || (by[k] = { n: 0, total: 0, voids: 0 })
    if (voided.has(s.id)) e.voids += 1
    else { e.n += 1; e.total += s.total }
  })
  const lines = ['Cashier activity, last 7 days:']
  Object.entries(by)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([name, e]) => lines.push(`• ${name}: ${e.n} sale(s), ${naira(e.total)}, ${e.voids} voided`))
  lines.push(evidence(all.length))
  return lines
}

function movementRows() {
  const now = Date.now()
  const sales = validSales()
  const last = unitsSold(between(sales, now - 7 * DAY, now + 1))
  const prev = unitsSold(between(sales, now - 14 * DAY, now - 7 * DAY))
  return loadProducts().map(p => {
    const a = last[p.id] || 0
    const b = prev[p.id] || 0
    const diff = a - b
    const trend = diff > 10 ? 'rising' : diff < -10 ? 'falling' : 'steady (within ±10 units)'
    const perDay = a / 7
    const daysLeft = perDay > 0 ? p.quantity / perDay : null
    return { p, a, b, trend, perDay, daysLeft }
  })
}

function restock() {
  const recent = between(validSales(), Date.now() - 14 * DAY, Date.now() + 1)
  if (!recent.length) {
    return ['No sales recorded in the last 14 days, so I cannot estimate restocking yet. Record some sales first.']
  }
  const need = movementRows()
    .filter(r => (r.a > 0 || r.b > 0) && (r.p.quantity === 0 || (r.daysLeft !== null && r.daysLeft <= 7)))
    .sort((x, y) => (x.daysLeft ?? 0) - (y.daysLeft ?? 0))
  if (!need.length) {
    return ['Nothing needs restocking within the next 7 days at the current pace.', evidence(recent.length)]
  }
  const lines = ['Likely to run out within 7 days:']
  need.forEach(r => {
    const rate = Math.round(r.perDay * 10) / 10
    const left = r.p.quantity === 0 ? 'out of stock' : `lasts about ${Math.round(r.daysLeft * 10) / 10} day(s)`
    lines.push(`• ${named(r.p)}: ${describeStock(r.p)} on hand, selling about ${rate} ${r.p.baseUnit}/day, ${left}. Demand ${r.trend}.`)
  })
  lines.push('Estimates are approximate (about ±10 units).')
  lines.push(evidence(recent.length))
  return lines
}

function slowMovers() {
  const all = loadSales()
  if (!all.length) return ['No sales recorded yet, so I cannot tell which items are slow.']
  const oldest = Math.min(...all.map(s => new Date(s.date).getTime()))
  const days = Math.floor((Date.now() - oldest) / DAY)
  const sold = unitsSold(between(validSales(), Date.now() - 14 * DAY, Date.now() + 1))
  const slow = loadProducts().filter(p => p.quantity > 0 && !sold[p.id]).slice(0, 10)
  const lines = []
  if (!slow.length) lines.push('Every item in stock has sold in the last 14 days.')
  else {
    lines.push('No sales in the last 14 days, so reduce restocking:')
    slow.forEach(p => lines.push(`• ${named(p)}: ${describeStock(p)} on hand`))
  }
  if (days < 14) lines.push(`Only about ${days} day(s) of sales history so far, so treat this as early.`)
  return lines
}

function expiring() {
  const withDates = loadProducts().filter(p => p.expiry)
  if (!withDates.length) return ['No expiry dates have been entered yet.']
  const rows = withDates
    .map(p => ({ p, days: Math.ceil((new Date(p.expiry).getTime() - Date.now()) / DAY) }))
    .filter(r => r.days <= 30)
    .sort((a, b) => a.days - b.days)
  if (!rows.length) return ['No items expire within 30 days.']
  const lines = ['Items close to expiry:']
  rows.forEach(({ p, days }) => {
    const advice = days <= 0 ? 'expired, remove from sale'
      : `suggested discount about ${days <= 7 ? 30 : days <= 14 ? 20 : 10}%`
    lines.push(`• ${named(p)}: ${days <= 0 ? 'expired' : `expires in ${days} day(s)`} (${p.expiry}), ${advice}`)
  })
  lines.push('These are suggestions only. The manager decides and applies any discount.')
  return lines
}

function bestSellers(role) {
  const list = between(validSales(), Date.now() - 30 * DAY, Date.now() + 1)
  if (!list.length) return ['No sales recorded in the last 30 days.']
  const products = loadProducts()
  const by = {}
  list.forEach(s => s.lines.forEach(l => {
    const e = by[l.itemId] || (by[l.itemId] = { name: l.name, brand: l.brand, units: 0, revenue: 0 })
    e.units += l.qty * l.size
    e.revenue += l.qty * l.price
  }))
  const lines = ['Best sellers, last 30 days:']
  Object.entries(by)
    .sort((a, b) => b[1].units - a[1].units)
    .slice(0, 5)
    .forEach(([id, e], i) => {
      const p = products.find(x => x.id === id)
      const unit = p ? p.baseUnit : 'units'
      lines.push(`${i + 1}. ${named(e)}: ${e.units} ${unit}` + (role === 'Owner' ? `, ${naira(e.revenue)}` : ''))
    })
  lines.push(evidence(list.length))
  return lines
}

function openRequests() {
  const open = loadRequests().filter(r => !r.done)
  if (!open.length) return ['No open item requests.']
  const lines = [`${open.length} open item request(s):`]
  open.slice(0, 5).forEach(r =>
    lines.push(`• ${r.item}${r.customer ? ' (' + r.customer + ')' : ''}, ${new Date(r.date).toLocaleDateString()}`))
  return lines
}

function voidList() {
  const voids = loadVoids()
  if (!voids.length) return ['No sales have been voided.']
  const sales = loadSales()
  const lines = [`${voids.length} voided sale(s). Latest:`]
  voids.slice(0, 5).forEach(v => {
    const s = sales.find(x => x.id === v.saleId)
    lines.push(`• ${s ? (s.trackingId || '#' + s.receiptNo) : 'sale'}${s ? ' by ' + s.cashier : ''}: ${v.reason}`)
  })
  return lines
}

function receiptFees() {
  const issued = validSales().filter(s => s.receiptIssued).length
  return [
    `Receipts issued: ${issued}.`,
    `Fees at ₦${RECEIPT_FEE} each: ${naira(issued * RECEIPT_FEE)} (counted only during the free pilot).`
  ]
}

function inventoryWorth() {
  return [`Inventory value at cost price: ${naira(inventoryValue(loadProducts()))}.`]
}

// ---------- item lookup ----------

function findItems(q) {
  const products = loadProducts()
  const exact = products.filter(p => q.includes(p.name.toLowerCase()))
  if (exact.length) return exact.slice(0, 3)
  return products
    .filter(p => p.name.toLowerCase().split(/\s+/).some(w => w.length >= 3 && q.includes(w)))
    .slice(0, 3)
}

function itemInfo(role, items) {
  const lines = []
  items.forEach(p => {
    lines.push(`${named(p)}: ${describeStock(p)} on hand.`)
    lines.push('Prices: ' + p.units.map(u => `${u.name} ${naira(u.price)}`).join(', ') + '.')
    if (role !== 'Cashier') lines.push(`Cost price: ${naira(p.unitCost)} per ${p.baseUnit}.`)
  })
  return lines
}

// ---------- help ----------

const TABS = {
  Cashier: 'Sales, Receipts, Customers, Requests, RAI, Dashboard',
  Manager: 'Dashboard, Inventory, Requests, Receipts, RAI',
  Owner: 'Dashboard, Inventory, Customers, Requests, Receipts, Reports, RAI'
}

const HELP = {
  Cashier: [
    [/void|cancel/, 'To void a sale: Sales → Recent sales → tap Void beside it and give a reason. The sale stays on record marked VOIDED and the stock returns.'],
    [/scan|barcode|camera/, 'Sales → Scan items with camera. It stays open and adds each item with a beep. Tap Done scanning when finished. You can also type the barcode.'],
    [/receipt/, 'Every sale makes a receipt automatically. The blue 🧾 button means receipts are ON, white means OFF. After the sale tap Share to send it by WhatsApp or email, or Print. To find an old one, open the Receipts tab and search by receipt ID, date, time or cashier.'],
    [/customer/, 'Customers tab → enter the name, phone and a note → Add customer.'],
    [/request|unavailable|not in stock/, 'If a customer asks for something we do not have: Requests tab → log the item. The manager will see it.'],
    [/sell|sale|pay|total/, 'Sales → type a name or scan → tap the unit (cup, bag...) to add it → check the total → enter the amount paid if it is not exact → Complete sale.']
  ],
  Manager: [
    [/add|new item|stock in|inventory/, 'Inventory → fill the form (name, brand, barcode or Scan barcode, units and prices, quantity, cost price, expiry date) → Add item.'],
    [/edit|change|price|adjust|damage|correct/, 'Inventory → tap an item. Edit its details, or record an inventory adjustment (purchase, damaged, expired, stocktake) with a reason.'],
    [/restock|low|order/, 'Ask me "What should I restock?" and I will estimate from recent sales which items will run out soon.'],
    [/request/, 'Requests tab shows what cashiers logged. Tap Done when you have handled one.'],
    [/receipt/, 'Receipts tab: search by receipt ID, date, time or cashier name.']
  ],
  Owner: [
    [/business|profile|address|hotline|cac/, 'Dashboard → Business profile → enter the CAC-registered name, hotline, email and address → Save. It prints on every receipt.'],
    [/minimum|receipt/, 'Dashboard → Receipt settings → set "No receipt for items priced below" → Save minimum. Receipts for items below that price are skipped.'],
    [/switch|role|cashier|manager/, 'Use the Testing as bar to act as Manager or Cashier. In the real app the owner will switch roles from the menu, and each action will be recorded as "Owner acting as ...".'],
    [/report|sales|profit/, 'Ask me things like "Sales this week", "Gross profit today", "Best selling items" or "Cashier performance".']
  ]
}

function helpAnswer(role, q) {
  for (const [re, text] of HELP[role] || []) {
    if (re.test(q)) return [text]
  }
  return [`As ${role} you can use: ${TABS[role]}. Ask me how to do something in any of them.`]
}

// ---------- intents with the roles allowed to use them ----------

const ALL = ['Cashier', 'Manager', 'Owner']
const STOCK_STAFF = ['Manager', 'Owner']

const INTENTS = [
  { test: /\bmy (sales|takings|total|sale)\b/, roles: ['Cashier'], run: () => mySales() },
  { test: /(profit|margin)/, roles: ['Owner'], run: q => profit(q) },
  { test: /(cashier|staff|employee).*(perform|sales|record|activity)|performance/, roles: ['Owner'], run: () => cashierPerformance() },
  { test: /(restock|running low|low stock|reorder|out of stock|run out|runs out)/, roles: STOCK_STAFF, run: () => restock() },
  { test: /(slow|not selling|dead stock|poor)/, roles: STOCK_STAFF, run: () => slowMovers() },
  { test: /(expir|discount|spoil)/, roles: STOCK_STAFF, run: () => expiring() },
  { test: /(best|top|most).*(sell|sold|item|product)|bestsell/, roles: STOCK_STAFF, run: (q, role) => bestSellers(role) },
  { test: /(voided|voids|cancelled sales)/, roles: ['Owner'], run: () => voidList() },
  { test: /receipt.*(fee|issued|count|how many)|fees accrued/, roles: ['Owner'], run: () => receiptFees() },
  { test: /(inventory|stock).*(value|worth)|worth/, roles: ['Owner'], run: () => inventoryWorth() },
  { test: /\b(sales|takings|revenue|turnover)\b/, roles: ['Owner'], run: q => salesTotals(q) },
  { test: /(request|asked for|unavailable)/, roles: ALL, run: () => openRequests() }
]

const SUGGESTIONS = {
  Cashier: ['How do I void a sale?', 'How do I scan items?', 'Is rice in stock?', 'My sales today'],
  Manager: ['What should I restock?', 'Which items are slow?', 'What is near expiry?', 'Best selling items', 'How do I add an item?'],
  Owner: ['Sales this week', 'Gross profit today', 'Best selling items', 'Cashier performance', 'What should I restock?', 'How do I set the receipt minimum?']
}

export const suggestions = role => SUGGESTIONS[role] || []

export function ask(role, question) {
  const q = question.toLowerCase().trim()

  if (/\b(how (do|can|to|should)|where (do|can)|help|guide|steps?)\b/.test(q)) {
    return { lines: helpAnswer(role, q) }
  }

  for (const intent of INTENTS) {
    if (intent.test.test(q)) {
      if (!intent.roles.includes(role)) {
        return { lines: [`That information is only available to the ${intent.roles.join(' or ')} role, so I can't share it from the ${role} role.`] }
      }
      return { lines: intent.run(q, role) }
    }
  }

  const items = findItems(q)
  if (items.length) return { lines: itemInfo(role, items) }

  return { lines: ["I didn't understand that. Try one of the suggestions above, or ask how to do something."] }
}
