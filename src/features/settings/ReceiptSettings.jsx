import { useState } from 'react'
import { loadSettings, saveSettings, loadModes, saveMode, RECEIPT_FEE } from './settingsStore.js'
import { loadProducts } from '../inventory/productStore.js'
import { loadSales } from '../sales/saleStore.js'

export default function ReceiptSettings() {
  const [min, setMin] = useState(loadSettings().minReceiptPrice)
  const [modes, setModes] = useState(loadModes())
  const items = loadProducts()
  const issued = loadSales().filter(s => s.receiptIssued).length

  function setMode(id, m) {
    saveMode(id, m)
    setModes({ ...modes, [id]: m })
  }

  return (
    <div>
      <h3>Receipt settings</h3>
      <p>Receipt fee: ₦{RECEIPT_FEE} each (counted only during the free pilot).</p>
      <p>Receipts issued: {issued} · fees accrued: ₦{(issued * RECEIPT_FEE).toLocaleString()}</p>
      <label>No receipt for items priced below (₦). Use 0 to turn this off.
        <input type="number" value={min} onChange={e => setMin(e.target.value)} />
      </label>
      <button onClick={() => saveSettings({ minReceiptPrice: Number(min) || 0 })}>Save minimum</button>
      <h4>Per-item receipt setting</h4>
      {items.map(p => (
        <div key={p.id} className="row">
          <span>{p.name}{p.brand ? ` · ${p.brand}` : ''}</span>
          <select style={{ width: 'auto' }} value={modes[p.id] || 'auto'} onChange={e => setMode(p.id, e.target.value)}>
            <option value="auto">Auto</option>
            <option value="always">Always</option>
            <option value="never">Never</option>
          </select>
        </div>
      ))}
    </div>
  )
}
