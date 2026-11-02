import { useState } from 'react'
import { loadSuppliers, addSupplier, updateSupplier } from '../features/suppliers/supplierStore.js'
import { getRole } from '../lib/role.js'

export default function Suppliers() {
  const role = getRole()
  const [list, setList] = useState(loadSuppliers())
  const [f, setF] = useState({ name: '', phone: '', email: '', note: '' })

  function add() {
    setList(addSupplier(f))
    setF({ name: '', phone: '', email: '', note: '' })
  }

  function edit(s) {
    const phone = window.prompt('Phone number', s.phone)
    if (phone === null) return
    const email = window.prompt('Email address', s.email)
    if (email === null) return
    const note = window.prompt('Note (what they supply)', s.note)
    if (note === null) return
    setList(updateSupplier(s.id, { phone: phone.trim(), email: email.trim(), note: note.trim() }))
  }

  return (
    <div className="screen">
      <h2>Suppliers</h2>
      {role === 'Manager' && (
        <>
          <div className="grid2">
            <input placeholder="Supplier name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
            <input placeholder="Phone" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
          </div>
          <div className="grid2">
            <input placeholder="Email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
            <input placeholder="What they supply" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />
          </div>
          <button onClick={add}>Add supplier</button>
        </>
      )}
      {role !== 'Manager' && <p>View only. The manager keeps the supplier list.</p>}
      <h3>List ({list.length})</h3>
      {list.map(s => (
        <div key={s.id} className="row">
          <span><b>{s.name}</b> · {s.phone}<div>{s.email}{s.note ? ` · ${s.note}` : ''}</div></span>
          {role === 'Manager' && <button className="small" onClick={() => edit(s)}>Edit</button>}
        </div>
      ))}
    </div>
  )
}
