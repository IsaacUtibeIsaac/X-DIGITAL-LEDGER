import { loadBusiness } from './businessStore.js'
import { loadProducts, inventoryValue } from '../inventory/productStore.js'
import { loadSales, loadVoids } from '../sales/saleStore.js'
import { loadRequests } from '../requests/requestStore.js'
import { loadCustomers } from '../customers/customerStore.js'
import { loadSuppliers } from '../suppliers/supplierStore.js'

const DAY = 86400000
const KYC = 'dl_kyc'
const DOCS = 'dl_kyc_docs'
const has = v => Boolean(v && String(v).trim())

// KYC 1 = business details, KYC 2 = TIN and CAC number, KYC 3 = documents sent for review.
// Business name, address, hotline and email live in businessStore (receipts use them).
const blankKyc = { social: '', tin: '', cacNumber: '', s1At: '', s2At: '', s3At: '', verifiedAt: '', reviewNote: '' }

export function loadKyc() {
  try {
    return { ...blankKyc, ...(JSON.parse(localStorage.getItem(KYC)) || {}) }
  } catch {
    return { ...blankKyc }
  }
}

export function saveKyc(patch) {
  const next = { ...loadKyc(), ...patch }
  try { localStorage.setItem(KYC, JSON.stringify(next)) } catch {}
  return next
}

function readDocs() {
  try { return JSON.parse(localStorage.getItem(DOCS)) || {} } catch { return {} }
}

// Returns false if the phone has no room left.
export function saveDoc(kind, doc) {
  const docs = readDocs()
  docs[kind] = doc
  try {
    localStorage.setItem(DOCS, JSON.stringify(docs))
    return true
  } catch {
    return false
  }
}

// Only says whether a document is there. The image itself is never handed to the screen.
export function docMeta(kind) {
  const d = readDocs()[kind]
  return d ? { name: d.name, at: d.at } : null
}

// Used only by the upload code (kycCloud.js). Null if nothing new is waiting on this phone.
export function docForUpload(kind) {
  const d = readDocs()[kind]
  return d && d.data ? { data: d.data, type: d.type, name: d.name } : null
}

// After a document reaches the server, keep a small marker and drop the copy on this phone.
export function markDocUploaded(kind, at) {
  const docs = readDocs()
  const d = docs[kind] || {}
  docs[kind] = {
    name: d.name || 'Uploaded document',
    type: d.type || '',
    at: d.at || at || new Date().toISOString(),
    remote: true
  }
  try { localStorage.setItem(DOCS, JSON.stringify(docs)) } catch {}
}

export function submitKyc() {
  return saveKyc({ s3At: new Date().toISOString(), reviewNote: '' })
}

// Test mode only. In the real app, a reviewer in XDL-Management sets this.
export function markVerified() {
  return saveKyc({ verifiedAt: new Date().toISOString() })
}

export function kycStatus(b = loadBusiness(), k = loadKyc()) {
  const l1Missing = []
  if (!has(b.name)) l1Missing.push('Business name')
  if (!has(b.address)) l1Missing.push('Business address')
  if (!has(b.hotline)) l1Missing.push('Hotline')
  if (!has(b.email) && !has(k.social)) l1Missing.push('Email or a social media page')
  const l2Missing = []
  if (!has(k.tin)) l2Missing.push('TIN')
  if (!has(k.cacNumber)) l2Missing.push('CAC registration number')
  const docs = { cac: Boolean(docMeta('cac')), tin: Boolean(docMeta('tin')) }

  const s1 = Boolean(k.s1At) && l1Missing.length === 0
  const s2 = s1 && Boolean(k.s2At) && l2Missing.length === 0
  const s3 = s2 && Boolean(k.s3At) && docs.cac && docs.tin
  const verified = s3 && Boolean(k.verifiedAt)
  const level = s3 ? 3 : s2 ? 2 : s1 ? 1 : 0
  const state = verified ? 'verified' : s3 ? 'review' : 'progress'
  return { level, state, s1, s2, s3, verified, l1Missing, l2Missing, docs }
}

export function accountSummary() {
  const business = loadBusiness()
  const k = loadKyc()
  const kyc = kycStatus(business, k)
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
    { label: 'KYC 1: business details saved', done: kyc.s1, at: k.s1At },
    { label: 'KYC 2: TIN and CAC number saved', done: kyc.s2, at: k.s2At },
    { label: 'KYC 3: documents sent for review', done: kyc.s3, at: k.s3At },
    { label: 'Verified', done: kyc.verified, at: k.verifiedAt },
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
