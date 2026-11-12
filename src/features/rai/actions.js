import { loadProducts, addProduct, updateProduct, adjustQuantity, describeStock } from '../inventory/productStore.js'
import { loadSuppliers, addSupplier, updateSupplier } from '../suppliers/supplierStore.js'
import { addTask } from './taskStore.js'

// Changes that RAI can propose. Nothing here runs until the person taps Confirm.
// Permissions match the rest of the app: only the Manager edits inventory and suppliers.

const INVENTORY_TOOLS = ['add_stock', 'reduce_stock', 'set_price', 'add_item']
const SUPPLIER_TOOLS = ['add_supplier', 'update_supplier']
const REDUCE_REASONS = ['Damaged', 'Expired', 'Stocktake correction', 'Other']

const naira = n => '₦' + Math.round(Number(n) || 0).toLocaleString()
const norm = s => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim()
const text = s => String(s == null ? '' : s).trim()
const named = p => p.name + (p.brand ? ' (' + p.brand + ')' : '')
const fail = error => ({ ok: false, error })

function findProduct(name) {
  const n = norm(name)
  if (!n) return { error: 'Which item do you mean?' }
  const all = loadProducts()
  const exact = all.filter(p => norm(p.name) === n || norm(p.name + ' ' + p.brand) === n)
  const pool = exact.length
    ? exact
    : all.filter(p => norm(p.name + ' ' + p.brand).includes(n) || (norm(p.name) && n.includes(norm(p.name))))
  if (pool.length === 1) return { product: pool[0] }
  if (!pool.length) return { error: `I could not find "${text(name)}" in your inventory.` }
  return { error: 'Which one do you mean: ' + pool.slice(0, 5).map(named).join(', ') + '?' }
}

function findUnit(p, unitName) {
  const n = norm(unitName)
  if (!n) return { unit: p.units[0], index: 0 }
  const strip = s => s.replace(/s$/, '')
  const index = p.units.findIndex(u => norm(u.name) === n || strip(norm(u.name)) === strip(n))
  if (index < 0) return { error: `${p.name} has no unit called "${text(unitName)}". Its units are: ${p.units.map(u => u.name).join(', ')}.` }
  return { unit: p.units[index], index }
}

function findSupplier(name) {
  const n = norm(name)
  if (!n) return { error: 'Which supplier do you mean?' }
  const all = loadSuppliers()
  const exact = all.filter(s => norm(s.name) === n)
  const pool = exact.length ? exact : all.filter(s => norm(s.name).includes(n) || n.includes(norm(s.name)))
  if (pool.length === 1) return { supplier: pool[0] }
  if (!pool.length) return { error: `I could not find a supplier called "${text(name)}".` }
  return { error: 'Which supplier: ' + pool.slice(0, 5).map(s => s.name).join(', ') + '?' }
}

function positive(value, max = 1000000) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 && n <= max ? n : null
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === '') return 0
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : NaN
}

// Checks a proposal. Returns { ok:true, summary } or { ok:false, error }.
export function prepareAction(role, action) {
  const tool = action && action.tool
  const i = (action && action.input) || {}

  if (INVENTORY_TOOLS.includes(tool) || SUPPLIER_TOOLS.includes(tool)) {
    if (role !== 'Manager') {
      return fail('Only the Manager can change inventory or the supplier list. Switch to the Manager role to do this.')
    }
  } else if (tool === 'add_task') {
    if (role === 'Cashier') return fail('Tasks are for the Manager and Owner.')
  } else {
    return fail('I cannot do that.')
  }

  if (tool === 'add_stock' || tool === 'reduce_stock') {
    const f = findProduct(i.item_name)
    if (f.error) return fail(f.error)
    const u = findUnit(f.product, i.unit)
    if (u.error) return fail(u.error)
    const qty = positive(i.quantity, 100000)
    if (!qty) return fail('Tell me how many, as a number above zero.')
    const p = f.product

    if (tool === 'add_stock') {
      const cost = optionalNumber(i.total_cost_naira)
      if (Number.isNaN(cost)) return fail('The cost must be a number.')
      return {
        ok: true,
        summary: `Add ${qty} ${u.unit.name} to ${named(p)} (now ${describeStock(p)})` + (cost ? ` for a total cost of ${naira(cost)}` : '') + '.'
      }
    }

    const reason = REDUCE_REASONS.includes(i.reason) ? i.reason : 'Other'
    if (qty * u.unit.size > p.quantity) {
      return fail(`Only ${describeStock(p)} of ${named(p)} is on hand, so I cannot remove ${qty} ${u.unit.name}.`)
    }
    return { ok: true, summary: `Remove ${qty} ${u.unit.name} from ${named(p)} (now ${describeStock(p)}). Reason: ${reason}.` }
  }

  if (tool === 'set_price') {
    const f = findProduct(i.item_name)
    if (f.error) return fail(f.error)
    const u = findUnit(f.product, i.unit)
    if (u.error) return fail(u.error)
    const price = positive(i.new_price)
    if (!price) return fail('Tell me the new price as a number above zero.')
    return { ok: true, summary: `Change the price of ${named(f.product)} per ${u.unit.name} from ${naira(u.unit.price)} to ${naira(price)}.` }
  }

  if (tool === 'add_item') {
    const name = text(i.name)
    if (!name) return fail('What is the item called?')
    const baseUnit = text(i.base_unit) || 'piece'
    const price = positive(i.selling_price)
    if (!price) return fail('Tell me the selling price as a number above zero.')
    const brand = text(i.brand)
    const dup = loadProducts().find(p => norm(p.name) === norm(name) && norm(p.brand) === norm(brand))
    if (dup) return fail(`${named(dup)} is already in your inventory. Ask me to add stock to it instead.`)
    const qty = optionalNumber(i.quantity)
    const cost = optionalNumber(i.cost_price)
    const reorder = optionalNumber(i.reorder_level)
    if ([qty, cost, reorder].some(Number.isNaN)) return fail('Quantity, cost and reorder level must be numbers.')
    if (i.expiry && !/^\d{4}-\d{2}-\d{2}$/.test(i.expiry)) return fail('The expiry date should look like 2026-12-31.')
    const bigName = text(i.big_unit_name)
    const bigSize = Number(i.big_unit_size) || 0
    const big = bigName && bigSize > 1
    return {
      ok: true,
      summary: `Add new item ${name}${brand ? ' (' + brand + ')' : ''}: ${qty} ${baseUnit} in stock, selling at ${naira(price)} per ${baseUnit}` +
        (big ? `, and ${bigName} of ${bigSize} at ${naira(i.big_unit_price)}` : '') + '.'
    }
  }

  if (tool === 'add_supplier') {
    const name = text(i.name)
    if (!name) return fail('What is the supplier called?')
    if (loadSuppliers().some(s => norm(s.name) === norm(name))) {
      return fail(`${name} is already on your supplier list. Ask me to update it instead.`)
    }
    const bits = [text(i.phone), text(i.email), text(i.note)].filter(Boolean)
    return { ok: true, summary: `Add supplier ${name}` + (bits.length ? ' (' + bits.join(', ') + ')' : '') + '.' }
  }

  if (tool === 'update_supplier') {
    const f = findSupplier(i.name)
    if (f.error) return fail(f.error)
    const changes = []
    if (text(i.phone)) changes.push('phone ' + text(i.phone))
    if (text(i.email)) changes.push('email ' + text(i.email))
    if (text(i.note)) changes.push('note "' + text(i.note) + '"')
    if (!changes.length) return fail('Tell me what to change: the phone, email or note.')
    return { ok: true, summary: `Update ${f.supplier.name}: ${changes.join(', ')}.` }
  }

  // add_task
  const taskText = text(i.text)
  if (!taskText) return fail('What should the task say?')
  const due = text(i.due)
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return fail('The due date should look like 2026-12-31.')
  return { ok: true, summary: `Add task: ${taskText}` + (due ? ` (due ${due})` : '') + '.' }
}

// Runs a confirmed proposal. Checks everything again first because data may have changed.
export function runAction(role, action) {
  const check = prepareAction(role, action)
  if (!check.ok) return fail(check.error)
  const tool = action.tool
  const i = action.input || {}

  if (tool === 'add_stock' || tool === 'reduce_stock') {
    const p = findProduct(i.item_name).product
    const u = findUnit(p, i.unit).unit
    const qty = Number(i.quantity)
    if (tool === 'add_stock') {
      adjustQuantity(p.id, {
        unitName: u.name, change: qty, reason: 'Purchase',
        cost: optionalNumber(i.total_cost_naira) || '', note: text(i.note) || 'Added by RAI'
      })
    } else {
      adjustQuantity(p.id, {
        unitName: u.name, change: -qty,
        reason: REDUCE_REASONS.includes(i.reason) ? i.reason : 'Other',
        note: text(i.note) || 'Recorded by RAI'
      })
    }
    const after = loadProducts().find(x => x.id === p.id)
    return { ok: true, message: `Done. ${named(p)} is now ${describeStock(after)}.` }
  }

  if (tool === 'set_price') {
    const p = findProduct(i.item_name).product
    const idx = findUnit(p, i.unit).index
    updateProduct(p.id, {
      name: p.name, brand: p.brand || '', category: p.category || '', barcode: p.barcode || '',
      expiry: p.expiry || '', reorderLevel: p.reorderLevel || 0, unitCost: p.unitCost || 0,
      prices: p.units.map((u, n) => (n === idx ? Number(i.new_price) : u.price))
    })
    return { ok: true, message: `Done. The price of ${named(p)} is now ${naira(i.new_price)} per ${p.units[idx].name}.` }
  }

  if (tool === 'add_item') {
    const baseUnit = text(i.base_unit) || 'piece'
    addProduct({
      name: text(i.name), brand: text(i.brand), category: '', barcode: '',
      baseUnit, basePrice: Number(i.selling_price),
      bigName: text(i.big_unit_name), bigSize: Number(i.big_unit_size) || 0, bigPrice: Number(i.big_unit_price) || 0,
      stockUnit: baseUnit, quantity: optionalNumber(i.quantity), reorder: optionalNumber(i.reorder_level),
      cost: optionalNumber(i.cost_price), expiry: text(i.expiry)
    })
    return { ok: true, message: `Done. ${text(i.name)} has been added to your inventory.` }
  }

  if (tool === 'add_supplier') {
    addSupplier({ name: text(i.name), phone: text(i.phone), email: text(i.email), note: text(i.note) })
    return { ok: true, message: `Done. ${text(i.name)} is now on your supplier list.` }
  }

  if (tool === 'update_supplier') {
    const s = findSupplier(i.name).supplier
    const changes = {}
    if (text(i.phone)) changes.phone = text(i.phone)
    if (text(i.email)) changes.email = text(i.email)
    if (text(i.note)) changes.note = text(i.note)
    updateSupplier(s.id, changes)
    return { ok: true, message: `Done. ${s.name} has been updated.` }
  }

  addTask(role, text(i.text), text(i.due))
  return { ok: true, message: 'Done. The task has been added.' }
}
