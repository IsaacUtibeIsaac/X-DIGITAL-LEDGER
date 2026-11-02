import { loadBusiness } from './businessStore.js'
import { loadProducts, inventoryValue } from '../inventory/productStore.js'
import { loadSales, loadVoids } from '../sales/saleStore.js'
import { loadRequests } from '../requests/requestStore.js'
import { loadCustomers } from '../customers/customerStore.js'
import { loadSuppliers } from '../suppliers/supplierStore.js'

const DAY = 86400000
const has = v => Boolean(v && String(v).trim())

// Slow KYC: level 1 is needed to start, level 2 builds the business record.
// Level 3 (documents checked by Digital Ledger staff) needs cloud accounts.
export function kycStatus(b) {
  const phoneOk = /^\+\d{7,15}$/.test((b.ownerPhone || '').replace(/[\s-]/g, ''))
  const l1Missing = []
  if (!has(b.ownerName)) l1Missing.push('Owner full name')
  if (!phoneOk) l1Missing.push('Owner phone with country code (for example +234...)')
  if (!has(b.name)) l1Missing.push('Business name')
  const l2Missing = []
  if (!has(b.cac)) l2Missing.push('CAC number')
  if (!has(b.address)) l2Missing.push('Shop address')
  if (!has(b.state)) l2Missing.push('State')
  if (!has(b.businessType)) l2Missing.push('Business type')
  const level = l1Missing.length ? 0 : l2Missing.length ? 1 : 2
  return { level, l1Missing, l2Missing }
}

export function accountSummary() {
  const business = loadBusiness()
  const kyc = kycStatus(business)
  const voided = new Set(loadVoids().map(v => v.saleId))
  const valid = loadSales().filter(s => !voided.has(s.id))
  const items = loadProducts()
  const times = valid.map(s => new Date(s.date).getTime())
  const firstSale = times.length ? Math.min(...times) : null
  const lastSale = times.length ? Math.max(...times) : null
  const activeDays = new Set(
    valid
      .filter(s => Date.now() - new Date(s.date).getTime() <= 7 * DAY)
      .map(s => new Date(s.date).toDateString())
  )
  const firstItem = items.length
    ? Math.min(...items.map(p => new Date(p.createdAt || Date.now()).getTime()))
    : null

  const stages = [
    { label: 'Registered', done: Boolean(business.createdAt), at: business.createdAt },
    { label: 'Basic details complete (KYC level 1)', done: kyc.level >= 1 },
    { label: 'Business details complete (KYC level 2)', done: kyc.level >= 2 },
    { label: 'Inventory set up', done: items.length > 0, at: firstItem },
    { label: 'First sale recorded', done: firstSale !== null, at: firstSale },
    { label: 'Active (sales on 4 of the last 7 days)', done: activeDays.size >= 4 }
  ]

  const metrics = [
    ['Items in inventory', items.length],
    ['Inventory value (at cost)', '₦' + Math.round(inventoryValue(items)).toLocaleString()],
    ['Sales recorded', valid.length],
    ['Voided sales', voided.size],
    ['Receipts issued', valid.filter(s => s.receiptIssued).length],
    ['System charges added', '₦' + valid.reduce((t, s) => t + (s.fee || 0), 0).toLocaleString()],
    ['Customers listed', loadCustomers().length],
    ['Suppliers listed', loadSuppliers().length],
    ['Open item requests', loadRequests().filter(r => !r.done).length],
    ['First sale', firstSale ? new Date(firstSale).toLocaleDateString() : 'none yet'],
    ['Last sale', lastSale ? new Date(lastSale).toLocaleString() : 'none yet']
  ]

  return { business, kyc, stages, metrics }
}
