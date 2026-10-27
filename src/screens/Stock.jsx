import { useState } from 'react'
import {
  loadProducts, addProduct, searchProducts, describeStock
} from '../features/inventory/productStore.js'

const empty = {
  name: '', brand: '', barcode: '',
  baseUnit: 'piece', basePrice: '',
  bigName: '', bigSize: '', bigPrice: '',
  stockUnit: '', quantity: '', expiry: ''
}

export default function Stock() {
  const [products, setProducts] = useState(loadProducts())
  const [form, setForm] = useState(empty)
  const [search, setSearch] = useState('')

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function submit() {
    if (!form.name.trim()) return
    setProducts(addProduct(form))
    setForm(empty)
  }

  const unitChoices = [form.baseUnit || 'piece', form.bigName].filter(Boolean)
  const shown = searchProducts(products, search)

  return (
    <div className="screen">
      <h2>Stock</h2>
      <input name="name" placeholder="Product (e.g. Rice)" value={form.name} onChange={change} />
      <input name="brand" placeholder="Brand (optional)" value={form.brand} onChange={change} />
      <input name="barcode" placeholder="Barcode (optional)" value={form.barcode} onChange={change} />
      <input name="baseUnit" placeholder="Smallest unit (e.g. cup, piece)" value={form.baseUnit} onChange={change} />
      <input name="basePrice" type="number" placeholder="Price per smallest unit (₦)" value={form.basePrice} onChange={change} />
      <input name="bigName" placeholder="Bigger unit (optional, e.g. bag)" value={form.bigName} onChange={change} />
      <input name="bigSize" type="number" placeholder="How many smallest units in one bigger unit" value={form.bigSize} onChange={change} />
      <input name="bigPrice" type="number" placeholder="Price per bigger unit (₦)" value={form.bigPrice} onChange={change} />
      <input name="quantity" type="number" placeholder="Quantity in stock" value={form.quantity} onChange={change} />
      <select name="stockUnit" value={form.stockUnit} onChange={change}>
        {unitChoices.map(u => <option key={u} value={u}>Quantity is in {u}</option>)}
      </select>
      <input name="expiry" type="date" value={form.expiry} onChange={change} />
      <button onClick={submit}>Add product</button>

      <h3>Products ({products.length})</h3>
      <input placeholder="Search name, brand or barcode" value={search} onChange={e => setSearch(e.target.value)} />
      {shown.map(p => (
        <div key={p.id} className="row">
          <div>
            <b>{p.name}</b>{p.brand ? ` · ${p.brand}` : ''}
            <div>{p.units.map(u => `${u.name} ₦${u.price.toLocaleString()}`).join(' · ')}</div>
          </div>
          <span>{describeStock(p)}</span>
        </div>
      ))}
    </div>
  )
}
