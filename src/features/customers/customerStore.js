const KEY = 'dl_customers'

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {}
  return list
}

export const loadCustomers = read

export function addCustomer(c) {
  if (!c.name.trim()) return read()
  return write([{
    id: Date.now().toString(), name: c.name.trim(),
    phone: c.phone.trim(), note: c.note.trim()
  }, ...read()])
}

export function updateCustomer(id, changes) {
  return write(read().map(x => (x.id === id ? { ...x, ...changes } : x)))
}
