import { nairaInWords } from '../../lib/numberWords.js'

export default function Receipt({ sale }) {
  const b = sale.business || {}
  const paid = sale.paid ?? sale.total
  return (
    <div className="receipt">
      <h2 className="brand">DIGITAL LEDGER</h2>
      <div className="head">
        <div>
          <b>{b.name || 'Business name not set'}</b>
          {b.hotline ? <div>Hotline: {b.hotline}</div> : null}
          {b.email ? <div>{b.email}</div> : null}
        </div>
        <div className="addr">{b.address}</div>
      </div>
      <p>Receipt #{sale.receiptNo} · {new Date(sale.date).toLocaleString()}</p>
      <p>Cashier: {sale.cashier}</p>

      <div className="rline rhead"><span>Product</span><span>Qty</span><span>Amount</span></div>
      {sale.lines.map((l, i) => (
        <div key={i} className="rline">
          <span>{l.name}{l.brand ? ` (${l.brand})` : ''} · {l.unitName} @ ₦{l.price.toLocaleString()}</span>
          <span>{l.qty}</span>
          <span>₦{(l.qty * l.price).toLocaleString()}</span>
        </div>
      ))}
      <div className="rline rhead"><span>Total</span><span></span><span>₦{sale.total.toLocaleString()}</span></div>

      <p>Amount paid: <b>₦{paid.toLocaleString()}</b></p>
      <p>In words: {nairaInWords(paid)}</p>
      {sale.change > 0 && <p>Change: ₦{sale.change.toLocaleString()}</p>}

      <div className="sign">
        <div className="sig">{sale.signatory || '________'}</div>
        <div>Manager's electronic signature</div>
      </div>
      <p className="powered-receipt">Powered by Winfieldtec</p>
    </div>
  )
}
