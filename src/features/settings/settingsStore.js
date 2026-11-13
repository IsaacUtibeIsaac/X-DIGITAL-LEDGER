const KEY = 'dl_settings'

export const RECEIPT_FEE = 50

// emptyWalletRule: what happens at the till when the receipt wallet cannot pay the fee
//   'no_receipt' = sales continue, receipts switch off   |   'debt' = receipts continue, the fee is owed
const defaults = { minReceiptPrice: 0, chargeOnReceipt: true, emptyWalletRule: 'no_receipt' }

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
