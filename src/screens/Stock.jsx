import { useState } from 'react'
import { loadProducts, addProduct, searchProducts } from '../features/inventory/productStore.js'

const empty = { name: '', barcode: '', price: '', quantity: '', expiry: '' }

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

  const shown = searchProducts(products, search)

  return (
    <div className="screen">
      <h2>Stock</h2>
      <input name="name" placeholder="Product name" value={form.name} onChange={change} />
      <input name="barcode" placeholder="Barcode (optional)" value={form.barcode} onChange={change} />
      <input name="price" type="number" placeholder="Price (₦)" value={form.price} onChange={change} />
      <input name="quantity" type="number" placeholder="Quantity" value={form.quantity} onChange={change} />
      <input name="expiry" type="date" value={form.expiry} onChange={change} />
      <button onClick={submit}>Add product</button>

      <h3>Products ({products.length})</h3>
      <input placeholder="Search products" value={search} onChange={e => setSearch(e.target.value)} />
      {shown.map(p => (
        <div key={p.id} className="row">
          <b>{p.name}</b>
          <span>₦{p.price} · Qty {p.quantity}</span>
        </div>
      ))}
    </div>
  )
}
