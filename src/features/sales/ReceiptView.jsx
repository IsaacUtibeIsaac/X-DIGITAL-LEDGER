import { useEffect, useState } from 'react'
import { renderReceipt } from './receiptImage.js'

export default function ReceiptView({ sale }) {
  const [img, setImg] = useState(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    let alive = true
    let made = null
    renderReceipt(sale).then(r => {
      if (!alive) {
        URL.revokeObjectURL(r.url)
        return
      }
      made = r
      setImg(r)
    })
    return () => {
      alive = false
      if (made) URL.revokeObjectURL(made.url)
    }
  }, [sale])

  async function share() {
    if (!img) return
    const id = sale.trackingId || 'receipt'
    const file = new File([img.blob], id + '.png', { type: 'image/png' })
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Receipt', text: 'Receipt ' + id })
      } else if (navigator.share) {
        await navigator.share({ title: 'Receipt', text: 'Receipt ' + id + ' · Total ₦' + sale.total.toLocaleString() })
      } else {
        const a = document.createElement('a')
        a.href = img.url
        a.download = file.name
        a.click()
        setNote('Sharing is not available here, so the receipt was downloaded.')
      }
    } catch {
      // sharing was cancelled
    }
  }

  return (
    <div>
      {img
        ? <img className="receipt-img" src={img.url} alt="Receipt" />
        : <p>Preparing receipt...</p>}
      <div className="noprint">
        <button onClick={share} disabled={!img}>Share</button>{' '}
        <button onClick={() => window.print()} disabled={!img}>Print</button>
        {note && <p>{note}</p>}
      </div>
    </div>
  )
}
