import { loadProducts, changeQuantities } from '../inventory/productStore.js'
import { RECEIPT_FEE } from '../settings/settingsStore.js'
import { loadBusiness } from '../business/businessStore.js'

const SALES = 'dl_sales'
const VOIDS = 'dl_voids'

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || []
  } catch {
    return []
  }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

export const loadSales = () => read(SALES)
export const loadVoids = () => read(VOIDS)

// Random, searchable tracking ID such as DL-4829-1750-3641
function makeTrackingId(existing) {
  for (let tries = 0; tries < 20; tries++) {
    const bytes = crypto.getRandomValues(new Uint8Array(12))
    const digits = Array.from(bytes, b => b % 10).join('')
    const id = 'DL-' + digits.slice(0, 4) + '-' + digits.slice(4, 8) + '-' + digits.slice(8, 12)
    if (!existing.some(s => s.trackingId === id)) return id
  }
  return 'DL-' + Date.now()
}

function baseUsed(lines) {
  const used = {}
  lines.forEach(l => {
    used[l.itemId] = (used[l.itemId] || 0) + l.qty * l.size
  })
  return used
}

export function checkStock(lines) {
  const items = loadProducts()
  const used = baseUsed(lines)
  for (const id in used) {
    const p = items.find(x => x.id === id)
    if (!p || p.quantity < used[id]) {
      return `Not enough ${p ? p.name : 'stock'} on hand`
    }
  }
  return ''
}

export function recordSale(lines, receiptOn, cashier, paid) {
  const problem = checkStock(lines)
  if (problem) return { error: problem }
  const items = loadProducts()
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0)
  const amountPaid = paid === '' || paid === undefined ? total : Number(paid)
  if (!(amountPaid >= total)) return { error: 'Amount paid is less than the total' }
  const sales = loadSales()
  const receiptIssued = receiptOn && lines.some(l => l.receipt)
  const sale = {
    id: Date.now().toString(),
    receiptNo: sales.length + 1,
    trackingId: makeTrackingId(sales),
    date: new Date().toISOString(),
    cashier,
    receiptOn,
    receiptIssued,
    fee: receiptIssued ? RECEIPT_FEE : 0,
    business: loadBusiness(),
    lines: lines.map(l => {
      const p = items.find(x => x.id === l.itemId)
      return { ...l, cost: (p ? p.unitCost : 0) * l.size }
    }),
    total,
    paid: amountPaid,
    change: amountPaid - total
  }
  write(SALES, [sale, ...sales])
  const used = baseUsed(lines)
  changeQuantities(Object.keys(used).map(id => ({ id, baseQty: -used[id] })))
  return { sale }
}

export function voidSale(saleId, reason) {
  const sale = loadSales().find(s => s.id === saleId)
  if (!sale || loadVoids().some(v => v.saleId === saleId)) return false
  write(VOIDS, [
    { id: Date.now().toString(), saleId, reason, date: new Date().toISOString() },
    ...loadVoids()
  ])
  const used = baseUsed(sale.lines)
  changeQuantities(Object.keys(used).map(id => ({ id, baseQty: used[id] })))
  return true
}
