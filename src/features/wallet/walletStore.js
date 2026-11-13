import { loadSettings } from '../settings/settingsStore.js'
import { STATE_KEY, FEE_QUEUE_KEY, WALLET_KEY } from '../../lib/sync.js'

// The receipt wallet as this phone knows it. The database is the real record;
// this is a copy refreshed every time the phone syncs.

// Shown to the user only. The server sets the real fee (receipt_fee() in schema.sql).
export const FEE = 50

function read(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v === null || v === undefined ? fallback : v
  } catch {
    return fallback
  }
}

export const loadWallet = () => read(WALLET_KEY, null)
export const pendingFees = () => read(FEE_QUEUE_KEY, []).length

// Balance after fees that are waiting to be charged. null = not known yet.
export function availableBalance() {
  const w = loadWallet()
  if (!w || typeof w.balance !== 'number') return null
  return w.balance - pendingFees() * FEE
}

// May a receipt be issued right now? The owner chooses what happens when the wallet is empty.
export function receiptsAllowed() {
  const bal = availableBalance()
  if (bal === null || bal >= FEE) return { allowed: true }
  if (loadSettings().emptyWalletRule === 'debt') return { allowed: true, owing: true }
  return {
    allowed: false,
    reason: 'The receipt wallet is empty, so receipts are off. Ask the owner to top up.'
  }
}

// Remember that a receipt was issued. The sync loop charges it as soon as there is signal.
export function queueFee(saleId) {
  try {
    if (!localStorage.getItem(STATE_KEY)) return
    const queue = read(FEE_QUEUE_KEY, []).map(String)
    if (!queue.includes(String(saleId))) {
      queue.push(String(saleId))
      localStorage.setItem(FEE_QUEUE_KEY, JSON.stringify(queue))
    }
  } catch {}
}
