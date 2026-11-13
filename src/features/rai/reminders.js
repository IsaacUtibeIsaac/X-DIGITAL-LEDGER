import { loadProducts, lowStock } from '../inventory/productStore.js'
import { loadTasks, todayStr } from './taskStore.js'
import { availableBalance, FEE } from '../wallet/walletStore.js'

export const BATTERY_LIMIT = 25

// Watches the phone battery. Calls onChange({ level, charging }), or onChange(null)
// when the browser cannot report it (Chrome on Android can; iPhone Safari cannot).
export function watchBattery(onChange) {
  if (typeof navigator === 'undefined' || !navigator.getBattery) {
    onChange(null)
    return () => {}
  }
  let battery = null
  let stopped = false
  const push = () => {
    if (battery && !stopped) {
      onChange({ level: Math.round(battery.level * 100), charging: battery.charging })
    }
  }
  navigator.getBattery()
    .then(b => {
      if (stopped) return
      battery = b
      b.addEventListener('levelchange', push)
      b.addEventListener('chargingchange', push)
      push()
    })
    .catch(() => onChange(null))
  return () => {
    stopped = true
    if (battery) {
      battery.removeEventListener('levelchange', push)
      battery.removeEventListener('chargingchange', push)
    }
  }
}

// level 'warn' shows in the banner on every screen; 'info' only on the RAI screen.
export function getReminders(role, battery) {
  const out = []

  if (role === 'Cashier') {
    if (battery && battery.level < BATTERY_LIMIT && !battery.charging) {
      out.push({
        id: 'battery',
        level: 'warn',
        text: `Your phone battery is at ${battery.level}%. Please put it on charge so sales are not interrupted.`
      })
    }
  }

  if (role === 'Owner') {
    const bal = availableBalance()
    if (bal !== null && bal < FEE) {
      out.push({
        id: 'wallet-empty',
        level: 'warn',
        text: `Your receipt wallet is empty (₦${Math.round(bal).toLocaleString()}). Top it up from the Wallet tab so receipts keep working.`
      })
    } else if (bal !== null && bal < FEE * 10) {
      out.push({
        id: 'wallet-low',
        level: 'warn',
        text: `Your receipt wallet is low (₦${Math.round(bal).toLocaleString()}). Top it up soon.`
      })
    }
  }

  if (role === 'Manager' || role === 'Owner') {
    const today = todayStr()
    const open = loadTasks(role).filter(t => !t.done)
    open.filter(t => t.due && t.due < today).forEach(t =>
      out.push({ id: 'task-' + t.id, level: 'warn', text: `Overdue task: ${t.text} (was due ${t.due}).` }))
    open.filter(t => t.due === today).forEach(t =>
      out.push({ id: 'task-' + t.id, level: 'warn', text: `Task due today: ${t.text}.` }))
    const undated = open.filter(t => !t.due).length
    if (undated) {
      out.push({ id: 'tasks-open', level: 'info', text: `You have ${undated} open task(s) with no due date.` })
    }
    const low = lowStock(loadProducts())
    if (low.length) {
      out.push({
        id: 'lowstock',
        level: 'info',
        text: `${low.length} item(s) are at or below their reorder level. Ask me "What should I restock?"`
      })
    }
  }

  return out
}
