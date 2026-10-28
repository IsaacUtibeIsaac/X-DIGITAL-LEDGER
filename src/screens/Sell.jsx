import { useState } from 'react'
import { loadProducts, searchProducts, describeStock } from '../features/inventory/productStore.js'
import { recordSale, voidSale, loadSales, loadVoids, checkStock } from '../features/sales/saleStore.js'
import Receipt from '../features/sales/Receipt.jsx'
import { getRole } from '../lib/role.js'

export default function Sell() {
  const role = getRole()
  const [items, setItems] = useState(loadProducts())
  const [text, setText] = useState('')
  const [lines, setLines] = useState([])
  const [receiptOn, setReceiptOn] = useState(true)
  const [message, setMessage] = useState('')
  const [lastSale, setLastSale] = useState(null)
  const [sales, setSales] = useState(loadSales())
  const [voids, setVoids] = useState(loadVoids())

  if (role !== 'Cashier') {
    return (
      <div className="screen">
        <h2>Sales</h2>
        <p>Sales are recorded in the cashier role. The owner can switch to the cashier role to make a sale.</p>
      </div>
    )
  }

  if (lastSale) {
    return (
      <div className="screen">
        {lastSale.receiptOn
          ? <Receipt sale={lastSale} />
          : <p>Sale #{lastSale.receiptNo} recorded. Total ₦{lastSale.total.toLocaleString()} (no receipt).</p>}
        <button onClick={() => setLastSale(null)}>New sale</button>
      </div>
    )
  }

  const suggestions = text.trim() ? searchProducts(items, text).slice(0, 6) : []
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0)

  function addLine(p, unit) {
    const at = lines.findIndex(l => l.itemId === p.id && l.unitName === unit.name)
    const next = at >= 0
      ? lines.map((l, i) => (i === at ? { ...l, qty: l.qty + 1 } : l))
      : [...lines, {
          itemId: p.id, name: p.name, brand: p.brand,
          unitName: unit.name, size: unit.size, price: unit.price, qty: 1
        }]
    const problem = checkStock(next)
    if (problem) { setMessage(problem); return }
    setMessage('')
    setLines(next)
    setText('')
  }

  function changeQty(i, delta) {
    const next = lines
      .map((l, j) => (j === i ? { ...l, qty: l.qty + delta } : l))
      .filter(l => l.qty > 0)
    const problem = checkStock(next)
    if (problem) { setMessage(problem); return }
    setMessage('')
    setLines(next)
  }

  function complete() {
    if (!lines.length) return
    const result = recordSale(lines, receiptOn, 'Cashier')
    if (result.error) { setMessage(result.error); return }
    setItems(loadProducts())
    setSales(loadSales())
    setLines([])
    setMessage('')
    setLastSale(result.sale)
  }

  function doVoid(id) {
    const reason = window.prompt('Reason for voiding this sale?')
    if (!reason || !reason.trim()) return
    voidSale(id, reason.trim())
    setVoids(loadVoids())
    setItems(loadProducts())
  }

  return (
    <div className="screen">
      <h2>Sales</h2>
      <input placeholder="Type a product name, brand or barcode" value={text} onChange={e => setText(e.target.value)} />
      {suggestions.map(p => (
        <div key={p.id} className="sug">
          <b>{p.name}</b>{p.brand ? ` · ${p.brand}` : ''} (on hand: {describeStock(p)})
          <div>
            {p.units.map(u => (
              <button key={u.name} onClick={() => addLine(p, u)}>
                {u.name} ₦{u.price.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      ))}
      {message && <p><b>{message}</b></p>}

      <h3>Current sale</h3>
      {lines.length === 0 && <p>No items yet.</p>}
      {lines.map((l, i) => (
        <div key={i} className="row">
          <span>{l.name} · {l.unitName} ₦{l.price.toLocaleString()}</span>
          <span>
            <button onClick={() => changeQty(i, -1)}>−</button>
            {' '}{l.qty}{' '}
            <button onClick={() => changeQty(i, 1)}>+</button>
          </span>
        </div>
      ))}
      <p><b>Total: ₦{total.toLocaleString()}</b></p>
      <button onClick={() => setReceiptOn(!receiptOn)}>Receipt: {receiptOn ? 'ON' : 'OFF'}</button>{' '}
      <button onClick={complete}>Complete sale</button>

      <h3>Recent sales</h3>
      {sales.length === 0 && <p>None yet.</p>}
      {sales.slice(0, 5).map(s => {
        const isVoid = voids.some(v => v.saleId === s.id)
        return (
          <div key={s.id} className="row">
            <span>#{s.receiptNo} · ₦{s.total.toLocaleString()}{isVoid ? ' · VOIDED' : ''}</span>
            {!isVoid && <button onClick={() => doVoid(s.id)}>Void</button>}
          </div>
        )
      })}
    </div>
  )
}
