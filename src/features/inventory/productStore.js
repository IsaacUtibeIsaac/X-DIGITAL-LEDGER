const KEY = 'dl_products'

function normalise(p) {
  if (p.units) return { unitCost: 0, ...p }
  return {
    ...p,
    brand: p.brand || '',
    baseUnit: 'piece',
    unitCost: 0,
    units: [{ name: 'piece', size: 1, price: p.price || 0 }]
  }
}

export function loadProducts() {
  try {
    return (JSON.parse(localStorage.getItem(KEY)) || []).map(normalise)
  } catch {
    return []
  }
}

function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {}
}

export function addProduct(f) {
  const units = [{
    name: f.baseUnit.trim() || 'piece',
    size: 1,
    price: Number(f.basePrice) || 0
  }]
  if (f.bigName.trim() && Number(f.bigSize) > 1) {
    units.push({
      name: f.bigName.trim(),
      size: Number(f.bigSize),
      price: Number(f.bigPrice) || 0
    })
  }
  const stockUnit = units.find(u => u.name === f.stockUnit) || units[0]
  const item = {
    id: Date.now().toString(),
    name: f.name.trim(),
    brand: f.brand.trim(),
    barcode: f.barcode.trim(),
    baseUnit: units[0].name,
    units,
    quantity: (Number(f.quantity) || 0) * stockUnit.size,
    unitCost: (Number(f.cost) || 0) / stockUnit.size,
    expiry: f.expiry || '',
    createdAt: new Date().toISOString()
  }
  const next = [item, ...loadProducts()]
  save(next)
  return next
}

export function inventoryValue(list) {
  return list.reduce((sum, p) => sum + p.quantity * p.unitCost, 0)
}

export function describeStock(p) {
  const big = [...p.units].sort((a, b) => b.size - a.size)[0]
  if (big.size <= 1) return `${p.quantity} ${p.baseUnit}`
  const whole = Math.floor(p.quantity / big.size)
  const rest = p.quantity % big.size
  return `${whole} ${big.name} + ${rest} ${p.baseUnit}`
}

export function searchProducts(list, text) {
  const t = text.trim().toLowerCase()
  if (!t) return list
  return list.filter(p =>
    p.name.toLowerCase().includes(t) ||
    p.brand.toLowerCase().includes(t) ||
    p.barcode.includes(t)
  )
}
const ADJ_KEY = 'dl_adjustments'

export function loadAdjustments() {
  try {
    return JSON.parse(localStorage.getItem(ADJ_KEY)) || []
  } catch {
    return []
  }
}

export function updateProduct(id, c) {
  const next = loadProducts().map(p => {
    if (p.id !== id) return p
    return {
      ...p,
      name: c.name.trim() || p.name,
      brand: c.brand.trim(),
      barcode: c.barcode.trim(),
      expiry: c.expiry || '',
      unitCost: Number(c.unitCost) || 0,
      units: p.units.map((u, i) => ({ ...u, price: Number(c.prices[i]) || 0 }))
    }
  })
  save(next)
  return next
}

export function adjustQuantity(id, a) {
  const list = loadProducts()
  const p = list.find(x => x.id === id)
  if (!p) return list
  const unit = p.units.find(u => u.name === a.unitName) || p.units[0]
  const requested = (Number(a.change) || 0) * unit.size
  if (!requested) return list
  const newQty = Math.max(0, p.quantity + requested)
  const actual = newQty - p.quantity
  let unitCost = p.unitCost
  if (a.reason === 'Purchase' && actual > 0 && Number(a.cost) > 0) {
    const addCost = Number(a.cost) / unit.size
    unitCost = (p.quantity * p.unitCost + actual * addCost) / newQty
  }
  const next = list.map(x => (x.id === id ? { ...x, quantity: newQty, unitCost } : x))
  save(next)
  try {
    localStorage.setItem(ADJ_KEY, JSON.stringify([
      {
        id: Date.now().toString(), itemId: id, itemName: p.name,
        change: actual, unit: p.baseUnit, reason: a.reason,
        note: a.note || '', date: new Date().toISOString()
      },
      ...loadAdjustments()
    ]))
  } catch {}
  return next
}
