const KEY = 'dl_settings'

export const RECEIPT_FEE = 50

export function loadSettings() {
  try {
    return { minReceiptPrice: 0, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }
  } catch {
    return { minReceiptPrice: 0 }
  }
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {}
}

// A receipt is issued only when the unit price reaches the owner's minimum
export function wantsReceipt(item, unit) {
  return unit.price >= loadSettings().minReceiptPrice
}
