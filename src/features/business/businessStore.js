const KEY = 'dl_business'
const SIG = 'dl_signature'

const blank = {
  name: '', cac: '', hotline: '', email: '', address: '',
  ownerName: '', ownerPhone: '', state: '', businessType: '', staffCount: '',
  createdAt: ''
}

export function loadBusiness() {
  try {
    return { ...blank, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }
  } catch {
    return { ...blank }
  }
}

export function saveBusiness(b) {
  const existing = loadBusiness()
  const next = { ...b, createdAt: existing.createdAt || new Date().toISOString() }
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
  return next
}

export function loadSignature() {
  try { return localStorage.getItem(SIG) || '' } catch { return '' }
}

export function saveSignature(name) {
  try { localStorage.setItem(SIG, name.trim()) } catch {}
}
