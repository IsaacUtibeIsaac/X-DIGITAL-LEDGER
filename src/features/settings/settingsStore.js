const KEY = 'dl_settings'
const MODES = 'dl_receipt_modes'

export const RECEIPT_FEE = 50

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

export function loadSettings() {
  return { minReceiptPrice: 0, ...read(KEY, {}) }
}
export function saveSettings(s) { write(KEY, s) }
export function loadModes() { return read(MODES, {}) }
export function saveMode(itemId, mode) {
  write(MODES, { ...loadModes(), [itemId]: mode })
}

export function wantsReceipt(item, unit) {
  const mode = loadModes()[item.id] || 'auto'
  if (mode === 'always') return true
  if (mode === 'never') return false
  return unit.price >= loadSettings().minReceiptPrice
}
