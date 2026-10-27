const KEY = 'dl_products'

export function loadProducts() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {}
}

export function addProduct(p) {
  const item = {
    id: Date.now().toString(),
    name: p.name.trim(),
    barcode: (p.barcode || '').trim(),
    price: Number(p.price) || 0,
    quantity: Number(p.quantity) || 0,
    expiry: p.expiry || '',
    createdAt: new Date().toISOString()
  }
  const next = [item, ...loadProducts()]
  save(next)
  return next
}

export function searchProducts(list, text) {
  const t = text.trim().toLowerCase()
  if (!t) return list
  return list.filter(p => p.name.toLowerCase().includes(t) || p.barcode.includes(t))
}
