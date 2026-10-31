import { useState, useRef } from 'react'
import { loadProducts, searchProducts, describeStock } from '../features/inventory/productStore.js'
import { recordSale, voidSale, loadSales, loadVoids, checkStock } from '../features/sales/saleStore.js'
import ReceiptView from '../features/sales/ReceiptView.jsx'
import BarcodeScanner from '../features/scan/BarcodeScanner.jsx'
import { wantsReceipt } from '../features/settings/settingsStore.js'
import { getRole } from '../lib/role.js'

const NAME_KEY = 'dl_cashier_name'

function savedName() {
  try { return localStorage.getItem(NAME_KEY) || '' } catch { return '' }
}

export default function Sell() {
  const role = getRole()
  const [items] = useState(loadProducts())
  const [text, setText] = useState('')
  const [lines, setLines] = useState([])
  const linesRef = useRef([])
  const [receiptOn, setReceiptOn] = useState(true)
  const [paid, setPaid] = useState('')
  const [cashier, setCashier] = useState(savedName())
  const [scanning, setScanning] = useState(false)
  const [message, setMessage] = useState('')
  const [lastSale, setLastSale] = useState(null)
  const [sales, setSales] = useState(loadSales())
  const [voids, setVoids] = useState(loadVoids())

  function commit(next) {
    linesRef.current = next
    setLines(next)
  }

  function addLine(p, unit) {
    const cur = linesRef.current
    const at = cur.findIndex(l => l.itemId === p.id && l.unitName === unit.name)
    const next =
      at >= 0
        ? cur.map((l, i) => (i === at ? { ...l, qty: l.qty + 1 } : l))
        : [
            ...cur,
            {
              itemId: p.id,
              name: p.name,
              brand: p.brand,
              unitName: unit.name,
              size: unit.size,
              price: unit.price,
              qty: 1,
              receipt: wantsReceipt(p, unit)
            }
          ]
    const problem = checkStock(next)
    if (problem) {
      setMessage(problem)
      return
    }
    setMessage('')
    commit(next)
    setText('')
  }

  function onScan(code) {
    const p = items.find(x => x.barcode && x.barcode === code)
    if (!p) {
      setMessage(`Barcode ${code} is not in inventory. Log it under Requests so the manager can add it.`)
      return
    }
    addLine(p, p.units[0])
  }

  function changeQty(i, delta) {
    const next = linesRef.current
      .map((l, j) => (j === i ? { ...l, qty: l.qty + delta } : l))
      .filter(l => l.qty > 0)
    const problem = checkStock(next)
    if (problem) {
      setMessage(problem)
      return
    }
    setMessage('')
    commit(next)
  }

  function changeName(e) {
    setCashier(e.target.value)
    try { localStorage.setItem(NAME_KEY, e.target.value) } catch {}
  }

  function complete() {
    const cur = linesRef.current
    if (!cur.length) return
    if (!cashier.trim()) {
      setMessage('Enter the cashier name first')
      return
    }
    const result = recordSale(cur, receiptOn, cashier.trim(), paid)
    if (result.error) {
      setMessage(result.error)
      return
    }
    setScanning(false)
    setSales(loadSales())
    commit([])
    setPaid('')
    setMessage('')
    setLastSale(result.sale)
  }

  function doVoid(id) {
    const reason = window.prompt('Reason for voiding this sale?')
    if (!reason || !reason.trim()) return
    voidSale(id, reason.trim())
    setVoids(loadVoids())
  }

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
        {lastSale.receiptIssued ? (
          <ReceiptView sale={lastSale} />
        ) : (
          <p>
            Sale recorded. Total ₦{lastSale.total.toLocaleString()}.{' '}
            {lastSale.receiptOn
              ? 'No receipt: items are below the receipt minimum.'
              : 'Receipt was turned off.'}
          </p>
        )}
        <p className="noprint"><button className="big" onClick={() => setLastSale(null)}>New sale</button></p>
      </div>
    )
  }

  const suggestions = text.trim() ? searchProducts(items, text).slice(0, 6) : []
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0)

  return (
    <div className="screen">
      {scanning
        ? <BarcodeScanner continuous onCode={onScan} onClose={() => setScanning(false)} />
        : <button className="big" onClick={() => setScanning(true)}>Scan items with camera</button>}

      <input
        placeholder="Type a product name, brand or barcode"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      {suggestions.map(p => (
        <div key={p.id} className="sug">
          <b>{p.name}</b>
          {p.brand ? ` · ${p.brand}` : ''} (on hand: {describeStock(p)})
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
          <span>{l.name}{l.brand ? ` (${l.brand})` : ''} · {l.unitName} ₦{l.price.toLocaleString()}</span>
          <span>
            <button className="small" onClick={() => changeQty(i, -1)}>−</button> {l.qty}{' '}
            <button className="small" onClick={() => changeQty(i, 1)}>+</button>
          </span>
        </div>
      ))}
      <p className="totalline">Total: ₦{total.toLocaleString()}</p>

      <div className="grid2">
        <label>Amount paid (₦), empty = exact
          <input type="number" value={paid} onChange={e => setPaid(e.target.value)} />
        </label>
        <label>Cashier name
          <input value={cashier} onChange={changeName} />
        </label>
      </div>

      <div className="payrow">
        <button
          className={'rtoggle' + (receiptOn ? ' on' : '')}
          aria-label="Receipt on or off"
          onClick={() => setReceiptOn(!receiptOn)}
        >🧾</button>
        <button className="big" onClick={complete}>Complete sale</button>
      </div>

      <h3>Recent sales</h3>
      {sales.length === 0 && <p>None yet.</p>}
      {sales.slice(0, 5).map(s => {
        const isVoid = voids.some(v => v.saleId === s.id)
        return (
          <div key={s.id} className="row">
            <span>{s.trackingId || '#' + s.receiptNo} · ₦{s.total.toLocaleString()}{isVoid ? ' · VOIDED' : ''}</span>
            {!isVoid && <button className="small" onClick={() => doVoid(s.id)}>Void</button>}
          </div>
        )
      })}
    </div>
  )
}
