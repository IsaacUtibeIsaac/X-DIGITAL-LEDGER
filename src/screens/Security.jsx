import { useState, useEffect } from 'react'
import { loadStaff, setMemberActive } from '../lib/session.js'
import { loadVoids, loadSales } from '../features/sales/saleStore.js'
import { loadAdjustments } from '../features/inventory/productStore.js'

// Owner only. Staff access (uses the same functions as the Staff screen)
// and an activity log built from this phone's records of voids and stock changes.
function buildLog() {
  const sales = loadSales()
  const rows = []
  loadVoids().forEach(v => {
    const s = sales.find(x => x.id === v.saleId)
    rows.push({
      id: 'v' + v.id,
      at: v.date,
      text: `Sale cancelled${s && s.cashier ? ' (cashier: ' + s.cashier + ')' : ''}`,
      detail: v.reason || ''
    })
  })
  loadAdjustments().forEach(a => {
    rows.push({
      id: 'a' + a.id,
      at: a.date,
      text: `Stock change: ${a.itemName} ${a.change > 0 ? '+' : ''}${a.change} ${a.unit}`,
      detail: [a.reason, a.note].filter(Boolean).join(' · ')
    })
  })
  return rows.sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, 100)
}

export default function Security({ businessId }) {
  const [data, setData] = useState({ members: [], error: null, loading: true })
  const [note, setNote] = useState('')
  const log = buildLog()

  async function refresh() {
    const r = await loadStaff(businessId)
    setData({ members: r.members, error: r.error, loading: false })
  }
  useEffect(() => { if (businessId) refresh() }, [businessId])

  async function toggle(m) {
    const word = m.active ? 'turn off' : 'turn on'
    if (!window.confirm(`Do you want to ${word} access for ${m.display_name || m.email}?`)) return
    const { error } = await setMemberActive(businessId, m.user_id, !m.active)
    if (error) setNote(error.message)
    refresh()
  }

  const staff = data.members.filter(m => m.role !== 'Owner')
  return (
    <div className="screen">
      <h2>Security</h2>

      <h3>Staff access</h3>
      {data.loading && <p>Loading...</p>}
      {data.error && <p>{data.error.message}</p>}
      {!data.loading && staff.length === 0 && <p>No staff yet. Invite a manager or cashier from the Staff tab.</p>}
      {staff.map(m => (
        <div key={m.user_id} className="row">
          <span>{m.display_name || m.email} · {m.role} · {m.active ? 'Access on' : 'Access off'}</span>
          <button type="button" className="small" onClick={() => toggle(m)}>
            {m.active ? 'Turn off' : 'Turn on'}
          </button>
        </div>
      ))}
      {note && <p>{note}</p>}

      <h3>Activity log</h3>
      {log.length === 0 && <p>No cancelled sales or stock changes recorded yet.</p>}
      {log.map(r => (
        <div key={r.id} className="row">
          <span>{r.text}{r.detail ? ` · ${r.detail}` : ''}</span>
          <span>{new Date(r.at).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}
