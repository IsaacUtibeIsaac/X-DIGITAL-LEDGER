import { useState } from 'react'
import { describeStock, describeQty, stockSplit } from './productStore.js'
import ImageCapture from '../scan/ImageCapture.jsx'
import { MAX_PHOTOS_PER_ITEM } from '../scan/imageMatch.js'

const REASONS = ['Purchase', 'Damaged', 'Expired', 'Stocktake correction', 'Other']

export default function ItemEditor({ item, history, onSave, onAdjust, onMove, onPhoto, onClearPhotos, onClose }) {
  const [f, setF] = useState({
    name: item.name,
    brand: item.brand,
    category: item.category || '',
    barcode: item.barcode,
    expiry: item.expiry,
    reorderLevel: item.reorderLevel || 0,
    unitCost: Math.round(item.unitCost * 100) / 100,
    prices: item.units.map(u => u.price)
  })
  const [a, setA] = useState({
    unitName: item.units[0].name, change: '', reason: 'Purchase', cost: '', note: ''
  })

  const [m, setM] = useState({ direction: 'toStore', unitName: item.units[0].name, qty: '', note: '' })
  const [moveMsg, setMoveMsg] = useState('')
  const split = stockSplit(item)
  const photoCount = (item.imgSigs || []).length

  function doMove() {
    const unit = item.units.find(u => u.name === m.unitName) || item.units[0]
    const q = (Number(m.qty) || 0) * unit.size
    const have = m.direction === 'toStore' ? split.shelf : split.store
    if (q <= 0) { setMoveMsg('Enter how much to move.'); return }
    if (q > have) {
      setMoveMsg(`Only ${describeQty(item, have)} on the ${m.direction === 'toStore' ? 'shelf' : 'store room'}.`)
      return
    }
    setMoveMsg('')
    onMove(m)
    setM({ ...m, qty: '', note: '' })
  }

  function setPrice(i, v) {
    const prices = [...f.prices]
    prices[i] = v
    setF({ ...f, prices })
  }

  return (
    <div>
      <button onClick={onClose}>← Back to inventory</button>
      <h3>Edit item</h3>
      <h3>Front-of-pack photos (helps cashiers sell faster)</h3>
      <p>
        {photoCount} of {MAX_PHOTOS_PER_ITEM} photos saved. Fill the frame with the front of the pack.
        Add a second photo in different light for better matching. Photos are kept as numbers, not pictures.
      </p>
      <ImageCapture label="Take front-of-pack photo" onSignature={onPhoto} />
      {photoCount > 0 && <button className="small" onClick={onClearPhotos}>Clear photos</button>}

      <div className="grid2">
        <label>Item name
          <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        </label>
        <label>Brand
          <input value={f.brand} onChange={e => setF({ ...f, brand: e.target.value })} />
        </label>
      </div>
      <div className="grid2">
        <label>Category
          <input value={f.category} onChange={e => setF({ ...f, category: e.target.value })} />
        </label>
        <label>Barcode / SKU
          <input value={f.barcode} onChange={e => setF({ ...f, barcode: e.target.value })} />
        </label>
      </div>
      {item.units.map((u, i) => (
        <label key={u.name}>Selling price per {u.name} (₦)
          <input type="number" value={f.prices[i]} onChange={e => setPrice(i, e.target.value)} />
        </label>
      ))}
      <div className="grid2">
        <label>Cost price per {item.baseUnit} (₦)
          <input type="number" value={f.unitCost} onChange={e => setF({ ...f, unitCost: e.target.value })} />
        </label>
        <label>Reorder level ({item.baseUnit})
          <input type="number" value={f.reorderLevel} onChange={e => setF({ ...f, reorderLevel: e.target.value })} />
        </label>
      </div>
      <label>Expiry date
        <input type="date" value={f.expiry} onChange={e => setF({ ...f, expiry: e.target.value })} />
      </label>
      <button onClick={() => onSave(f)}>Save changes</button>

      <h3>Inventory adjustment</h3>
      <p>On hand: {describeStock(item)}</p>
      <div className="grid2">
        <label>Quantity change (minus to reduce)
          <input type="number" value={a.change} onChange={e => setA({ ...a, change: e.target.value })} />
        </label>
        <label>Unit
          <select value={a.unitName} onChange={e => setA({ ...a, unitName: e.target.value })}>
            {item.units.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
          </select>
        </label>
      </div>
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

      <h3>Move stock</h3>
      <p>Shelf: {describeQty(item, split.shelf)} · Store room: {describeQty(item, split.store)}</p>
      <label>Direction
        <select value={m.direction} onChange={ev => setM({ ...m, direction: ev.target.value })}>
          <option value="toStore">Shelf to store room</option>
          <option value="toShelf">Store room to shelf</option>
        </select>
      </label>
      <div className="grid2">
        <label>Quantity
          <input type="number" value={m.qty} onChange={ev => setM({ ...m, qty: ev.target.value })} />
        </label>
        <label>Unit
          <select value={m.unitName} onChange={ev => setM({ ...m, unitName: ev.target.value })}>
            {item.units.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
          </select>
        </label>
      </div>
      <label>Note (optional)
        <input value={m.note} onChange={ev => setM({ ...m, note: ev.target.value })} />
      </label>
      {moveMsg && <p><b>{moveMsg}</b></p>}
      <button onClick={doMove}>Move stock</button>

      <h3>Recent adjustments</h3>
      {history.length === 0 && <p>None yet.</p>}
      {history.map(h => (
        <div key={h.id} className="row">
          <span>{h.reason}{h.note ? ` · ${h.note}` : ''}{h.by ? ` · ${h.by}` : ''}</span>
          <span>
            {h.moved ? `${h.moved} ${h.unit}` : h.change !== 0 ? `${h.change > 0 ? '+' : ''}${h.change} ${h.unit}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}
