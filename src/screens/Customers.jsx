import { useState } from 'react'
import { loadCustomers, addCustomer, updateCustomer } from '../features/customers/customerStore.js'
import { getRole } from '../lib/role.js'

export default function Customers() {
  const role = getRole()
  const [list, setList] = useState(loadCustomers())
  const [f, setF] = useState({ name: '', phone: '', note: '' })

  if (role === 'Manager') {
    return (
      <div className="screen">
        <h2>Customers</h2>
        <p>The customer list is kept by the cashier and the owner.</p>
      </div>
    )
  }

  function add() {
    setList(addCustomer(f))
    setF({ name: '', phone: '', note: '' })
  }

  function edit(c) {
    const phone = window.prompt('Phone number', c.phone)
    if (phone === null) return
    const note = window.prompt('Note', c.note)
    if (note === null) return
    setList(updateCustomer(c.id, { phone: phone.trim(), note: note.trim() }))
  }

  return (
    <div className="screen">
      <h2>Customers</h2>
      {role === 'Cashier' && (
        <>
          <input placeholder="Customer name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
          <input placeholder="Phone number" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
          <input placeholder="Note (e.g. wants Indomie when available)" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />
          <button onClick={add}>Add customer</button>
        </>
      )}
      <h3>List ({list.length})</h3>
      {list.map(c => (
        <div key={c.id} className="row">
          <span><b>{c.name}</b> · {c.phone}<div>{c.note}</div></span>
          {role === 'Cashier' && <button onClick={() => edit(c)}>Edit</button>}
        </div>
      ))}
    </div>
  )
}
