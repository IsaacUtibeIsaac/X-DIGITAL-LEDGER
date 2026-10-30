import { useState } from 'react'
import { loadSettings, saveSettings, RECEIPT_FEE } from './settingsStore.js'
import { loadSales } from '../sales/saleStore.js'

export default function ReceiptSettings() {
  const [min, setMin] = useState(loadSettings().minReceiptPrice)
  const [saved, setSaved] = useState(false)
  const issued = loadSales().filter(s => s.receiptIssued).length

  function save() {
    saveSettings({ minReceiptPrice: Number(min) || 0 })
    setSaved(true)
  }

  return (
    <div>
      <h3>Receipt settings</h3>
      <p>Receipt fee: ₦{RECEIPT_FEE} each (counted only during the free pilot).</p>
      <p>
        Receipts issued: {issued} · fees accrued: ₦{(issued * RECEIPT_FEE).toLocaleString()}
      </p>
      <label>No receipt for items priced below (₦). Use 0 to turn this off.
        <input
          type="number"
          value={min}
          onChange={e => { setMin(e.target.value); setSaved(false) }}
        />
      </label>
      <button onClick={save}>Save minimum</button>
      {saved && <p>Saved.</p>}
    </div>
  )
}
