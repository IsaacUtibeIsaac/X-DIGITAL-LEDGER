const KEY = 'dl_settings'

export const RECEIPT_FEE = 50

const defaults = { minReceiptPrice: 0, chargeOnReceipt: true }

export function loadSettings() {
  try {
    return { ...defaults, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }
  } catch {
    return { ...defaults }
  }
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...loadSettings(), ...s })) } catch {}
}

// A receipt is issued only when the unit price reaches the owner's minimum
export function wantsReceipt(item, unit) {
  return unit.price >= loadSettings().minReceiptPrice
}
