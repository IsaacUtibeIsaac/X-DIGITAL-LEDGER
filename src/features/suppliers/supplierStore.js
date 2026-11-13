import { newId } from '../../lib/newId.js'
const KEY = 'dl_suppliers'

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

export const loadSuppliers = read

export function addSupplier(s) {
  if (!s.name.trim()) return read()
  return write([{
    id: newId(), name: s.name.trim(),
    phone: s.phone.trim(), email: s.email.trim(), note: s.note.trim()
  }, ...read()])
}

export function updateSupplier(id, changes) {
  return write(read().map(x => (x.id === id ? { ...x, ...changes } : x)))
}
