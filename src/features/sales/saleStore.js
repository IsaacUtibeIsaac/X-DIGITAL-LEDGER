import { loadProducts, changeQuantities } from '../inventory/productStore.js'
import { RECEIPT_FEE } from '../settings/settingsStore.js'

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

export function recordSale(lines, receiptOn, who) {
  const problem = checkStock(lines)
  if (problem) return { error: problem }
  const sales = loadSales()
  const receiptIssued = receiptOn && lines.some(l => l.receipt)
  const sale = {
    id: Date.now().toString(),
    receiptNo: sales.length + 1,
    date: new Date().toISOString(),
    cashier: who,
    receiptOn,
    receiptIssued,
    fee: receiptIssued ? RECEIPT_FEE : 0,
    lines: lines.map(l => ({ ...l })),
    total: lines.reduce((s, l) => s + l.qty * l.price, 0)
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
