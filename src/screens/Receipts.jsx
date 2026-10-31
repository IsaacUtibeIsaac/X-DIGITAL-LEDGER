import { useState } from 'react'
import { loadSales, loadVoids } from '../features/sales/saleStore.js'
import ReceiptView from '../features/sales/ReceiptView.jsx'

export default function Receipts() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)

  if (open) {
    return (
      <div className="screen">
        <p className="noprint"><button onClick={() => setOpen(null)}>← Back to receipts</button></p>
        <ReceiptView sale={open} />
      </div>
    )
  }

  const voided = new Set(loadVoids().map(v => v.saleId))
  const t = q.trim().toLowerCase()
  const shown = loadSales()
    .filter(s => {
      if (!t) return true
      const d = new Date(s.date)
      const hay = [s.trackingId, s.cashier, d.toLocaleString(), d.toISOString().slice(0, 10)]
        .join(' ')
        .toLowerCase()
      return hay.includes(t)
    })
    .slice(0, 50)

  return (
    <div className="screen">
      <h2>Receipts</h2>
      <input
        placeholder="Search by receipt ID, date, time or cashier"
        value={q}
        onChange={e => setQ(e.target.value)}
      />
      {shown.length === 0 && <p>No receipts found.</p>}
      {shown.map(s => (
        <div key={s.id} className="row" onClick={() => setOpen(s)}>
          <span>
            <b>{s.trackingId || '#' + s.receiptNo}</b>
            <div>{new Date(s.date).toLocaleString()} · {s.cashier}</div>
          </span>
          <span>₦{s.total.toLocaleString()}{voided.has(s.id) ? ' · VOID' : ''}</span>
        </div>
      ))}
    </div>
  )
}
