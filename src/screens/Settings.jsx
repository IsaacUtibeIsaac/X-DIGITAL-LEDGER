import { useState } from 'react'
import { loadSignature, saveSignature } from '../features/business/businessStore.js'
import { getRole } from '../lib/role.js'

export default function Settings() {
  const role = getRole()
  const [name, setName] = useState(loadSignature())
  const [saved, setSaved] = useState(false)

  if (role !== 'Manager') {
    return (
      <div className="screen">
        <h2>Settings</h2>
        <p>Only the manager signs receipts.</p>
      </div>
    )
  }

  function save() {
    saveSignature(name)
    setSaved(true)
  }

  return (
    <div className="screen">
      <h2>Settings</h2>
      <h3>My electronic signature</h3>
      <label>Type your full name
        <input value={name} onChange={e => { setName(e.target.value); setSaved(false) }} />
      </label>
      <div className="sig">{name || 'Your signature'}</div>
      <p>By saving, I adopt this as my electronic signature on receipts.</p>
      <button onClick={save}>Save signature</button>
      {saved && <p>Saved.</p>}
    </div>
  )
}
