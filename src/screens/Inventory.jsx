import { useState } from 'react'
import {
  loadProducts, addProduct, searchProducts, describeStock, inventoryValue
} from '../features/inventory/productStore.js'

const empty = {
  name: '', brand: '', barcode: '',
  baseUnit: 'piece', basePrice: '',
  bigName: '', bigSize: '', bigPrice: '',
  stockUnit: '', quantity: '', cost: '', expiry: ''
}

export default function Inventory() {
  const [items, setItems] = useState(loadProducts())
  const [form, setForm] = useState(empty)
  const [search, setSearch] = useState('')

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function submit() {
    if (!form.name.trim()) return
    setItems(addProduct(form))
    setForm(empty)
  }

  const unitChoices = [form.baseUnit || 'piece', form.bigName].filter(Boolean)
  const chosenUnit = form.stockUnit || unitChoices[0]
  const shown = searchProducts(items, search)

  return (
    <div className="screen">
      <h2>Inventory</h2>
      <input name="name" placeholder="Item name (e.g. Rice)" value={form.name} onChange={change} />
      <input name="brand" placeholder="Brand (optional)" value={form.brand} onChange={change} />
      <input name="barcode" placeholder="Barcode / SKU (optional)" value={form.barcode} onChange={change} />
      <input name="baseUnit" placeholder="Base unit of measure (e.g. cup, piece)" value={form.baseUnit} onChange={change} />
      <input name="basePrice" type="number" placeholder="Selling price per base unit (₦)" value={form.basePrice} onChange={change} />
      <input name="bigName" placeholder="Larger unit (optional, e.g. bag)" value={form.bigName} onChange={change} />
      <input name="bigSize" type="number" placeholder="Base units in one larger unit" value={form.bigSize} onChange={change} />
      <input name="bigPrice" type="number" placeholder="Selling price per larger unit (₦)" value={form.bigPrice} onChange={change} />
      <input name="quantity" type="number" placeholder="Quantity on hand" value={form.quantity} onChange={change} />
      <select name="stockUnit" value={form.stockUnit} onChange={change}>
        {unitChoices.map(u => <option key={u} value={u}>Quantity is in {u}</option>)}
      </select>
      <input name="cost" type="number" placeholder={`Cost price per ${chosenUnit} (₦)`} value={form.cost} onChange={change} />
      <input name="expiry" type="date" value={form.expiry} onChange={change} />
      <button onClick={submit}>Add item</button>

      <h3>Items ({items.length})</h3>
      <p>Total inventory value: ₦{Math.round(inventoryValue(items)).toLocaleString()}</p>
      <input placeholder="Search name, brand or barcode" value={search} onChange={e => setSearch(e.target.value)} />
      {shown.map(p => (
        <div key={p.id} className="row">
          <div>
            <b>{p.name}</b>{p.brand ? ` · ${p.brand}` : ''}
            <div>{p.units.map(u => `${u.name} ₦${u.price.toLocaleString()}`).join(' · ')}</div>
          </div>
          <span>On hand: {describeStock(p)}</span>
        </div>
      ))}
    </div>
  )
}
