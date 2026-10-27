import { useState } from 'react'
import { describeStock } from './productStore.js'

const REASONS = ['Purchase', 'Damaged', 'Expired', 'Stocktake correction', 'Other']

export default function ItemEditor({ item, history, onSave, onAdjust, onClose }) {
  const [f, setF] = useState({
    name: item.name,
    brand: item.brand,
    barcode: item.barcode,
    expiry: item.expiry,
    unitCost: Math.round(item.unitCost * 100) / 100,
    prices: item.units.map(u => u.price)
  })
  const [a, setA] = useState({
    unitName: item.units[0].name, change: '', reason: 'Purchase', cost: '', note: ''
  })

  function setPrice(i, v) {
    const prices = [...f.prices]
    prices[i] = v
    setF({ ...f, prices })
  }

  return (
    <div>
      <button onClick={onClose}>← Back to inventory</button>
      <h3>Edit item</h3>
      <label>Item name
        <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      </label>
      <label>Brand
        <input value={f.brand} onChange={e => setF({ ...f, brand: e.target.value })} />
      </label>
      <label>Barcode / SKU
        <input value={f.barcode} onChange={e => setF({ ...f, barcode: e.target.value })} />
      </label>
      {item.units.map((u, i) => (
        <label key={u.name}>Selling price per {u.name} (₦)
          <input type="number" value={f.prices[i]} onChange={e => setPrice(i, e.target.value)} />
        </label>
      ))}
      <label>Cost price per {item.baseUnit} (₦)
        <input type="number" value={f.unitCost} onChange={e => setF({ ...f, unitCost: e.target.value })} />
      </label>
      <label>Expiry date
        <input type="date" value={f.expiry} onChange={e => setF({ ...f, expiry: e.target.value })} />
      </label>
      <button onClick={() => onSave(f)}>Save changes</button>

      <h3>Inventory adjustment</h3>
      <p>On hand: {describeStock(item)}</p>
      <label>Quantity change (use minus to reduce)
        <input type="number" value={a.change} onChange={e => setA({ ...a, change: e.target.value })} />
      </label>
      <label>Unit
        <select value={a.unitName} onChange={e => setA({ ...a, unitName: e.target.value })}>
          {item.units.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
        </select>
      </label>
      <label>Reason
        <select value={a.reason} onChange={e => setA({ ...a, reason: e.target.value })}>
          {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      {a.reason === 'Purchase' && (
        <label>Cost price per {a.unitName} (₦)
          <input type="number" value={a.cost} onChange={e => setA({ ...a, cost: e.target.value })} />
        </label>
      )}
      <label>Note (optional)
        <input value={a.note} onChange={e => setA({ ...a, note: e.target.value })} />
      </label>
      <button onClick={() => { onAdjust(a); setA({ ...a, change: '', cost: '', note: '' }) }}>
        Record adjustment
      </button>

      <h3>Recent adjustments</h3>
      {history.length === 0 && <p>None yet.</p>}
      {history.map(h => (
        <div key={h.id} className="row">
          <span>{h.reason}{h.note ? ` · ${h.note}` : ''}</span>
          <span>{h.change > 0 ? '+' : ''}{h.change} {h.unit}</span>
        </div>
      ))}
    </div>
  )
}
