import { newId } from '../../lib/newId.js'
const KEY = 'dl_requests'

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

export const loadRequests = read

export function addRequest(item, customer) {
  if (!item.trim()) return read()
  return write([{
    id: newId(), item: item.trim(), customer: customer.trim(),
    date: new Date().toISOString(), done: false
  }, ...read()])
}

export function markDone(id) {
  return write(read().map(r => (r.id === id ? { ...r, done: true } : r)))
}
