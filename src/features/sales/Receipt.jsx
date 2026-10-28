export default function Receipt({ sale }) {
  return (
    <div className="receipt">
      <h3>Receipt #{sale.receiptNo}</h3>
      <p>{new Date(sale.date).toLocaleString()}</p>
      {sale.lines.map((l, i) => (
        <div key={i} className="row">
          <span>{l.qty} {l.unitName} {l.name}{l.brand ? ` (${l.brand})` : ''}</span>
          <span>₦{(l.qty * l.price).toLocaleString()}</span>
        </div>
      ))}
      <div className="row">
        <b>Total</b>
        <b>₦{sale.total.toLocaleString()}</b>
      </div>
      <p className="powered-receipt">Powered by Winfieldtec</p>
    </div>
  )
}
