const KEY = 'dl_business'
const SIG = 'dl_signature'

const blank = { name: '', cac: '', hotline: '', email: '', address: '' }

export function loadBusiness() {
  try {
    return { ...blank, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }
  } catch {
    return { ...blank }
  }
}

export function saveBusiness(b) {
  try { localStorage.setItem(KEY, JSON.stringify(b)) } catch {}
}

export function loadSignature() {
  try { return localStorage.getItem(SIG) || '' } catch { return '' }
}

export function saveSignature(name) {
  try { localStorage.setItem(SIG, name.trim()) } catch {}
}
