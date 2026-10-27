const KEY = 'dl_products'

function normalise(p) {
  if (p.units) return p
  return {
    ...p,
    brand: p.brand || '',
    baseUnit: 'piece',
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
    expiry: f.expiry || '',
    createdAt: new Date().toISOString()
  }
  const next = [item, ...loadProducts()]
  save(next)
  return next
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
