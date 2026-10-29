import { useState } from 'react'
import { loadRequests, addRequest, markDone } from '../features/requests/requestStore.js'
import { getRole } from '../lib/role.js'

export default function Requests() {
  const role = getRole()
  const [list, setList] = useState(loadRequests())
  const [item, setItem] = useState('')
  const [customer, setCustomer] = useState('')

  function log() {
    setList(addRequest(item, customer))
    setItem('')
    setCustomer('')
  }

  return (
    <div className="screen">
      <h2>Requested items</h2>
      {role === 'Cashier' && (
        <>
          <p>Log an item a customer asked for that we don't have.</p>
          <input placeholder="Item requested" value={item} onChange={e => setItem(e.target.value)} />
          <input placeholder="Customer name or phone (optional)" value={customer} onChange={e => setCustomer(e.target.value)} />
          <button onClick={log}>Log request</button>
        </>
      )}
      <h3>List ({list.filter(r => !r.done).length} open)</h3>
      {list.length === 0 && <p>None yet.</p>}
      {list.map(r => (
        <div key={r.id} className="row">
          <span>
            {r.item}{r.customer ? ` · ${r.customer}` : ''}{r.done ? ' · DONE' : ''}
            <div>{new Date(r.date).toLocaleDateString()}</div>
          </span>
          {role === 'Manager' && !r.done && <button onClick={() => setList(markDone(r.id))}>Done</button>}
        </div>
      ))}
    </div>
  )
}
