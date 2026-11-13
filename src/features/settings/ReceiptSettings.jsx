import { useState } from 'react'
import { loadSettings, saveSettings, RECEIPT_FEE } from './settingsStore.js'
import { loadSales, loadVoids } from '../sales/saleStore.js'

export default function ReceiptSettings() {
  const [min, setMin] = useState(loadSettings().minReceiptPrice)
  const [charge, setCharge] = useState(loadSettings().chargeOnReceipt)
  const [saved, setSaved] = useState(false)

  const voided = new Set(loadVoids().map(v => v.saleId))
  const valid = loadSales().filter(s => !voided.has(s.id))
  const issued = valid.filter(s => s.receiptIssued).length
  const charged = valid.reduce((t, s) => t + (s.fee || 0), 0)

  function save() {
    saveSettings({ minReceiptPrice: Number(min) || 0 })
    setSaved(true)
  }

  function toggleCharge() {
    saveSettings({ chargeOnReceipt: !charge })
    setCharge(!charge)
  }

  return (
    <div>
      <h3>Receipt settings</h3>
      <p>
        Each receipt issued costs ₦{RECEIPT_FEE}, paid from your receipt wallet (see the Wallet tab).
        The system charge below adds the same ₦{RECEIPT_FEE} to the customer's bill as its own line, so the customer covers it.
        Turn it off if you want to pay the fee yourself. It is never shop revenue.
      </p>
      <p>
        <button onClick={toggleCharge}>System charge: {charge ? 'ON' : 'OFF'}</button>
      </p>
      <p>
        Receipts issued: {issued} · system charges added: ₦{charged.toLocaleString()}
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
