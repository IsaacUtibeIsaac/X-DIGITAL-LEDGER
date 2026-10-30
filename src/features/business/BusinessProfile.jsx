import { useState } from 'react'
import { loadBusiness, saveBusiness } from './businessStore.js'

export default function BusinessProfile() {
  const [b, setB] = useState(loadBusiness())
  const [saved, setSaved] = useState(false)

  function change(e) {
    setB({ ...b, [e.target.name]: e.target.value })
    setSaved(false)
  }

  function save() {
    saveBusiness(b)
    setSaved(true)
  }

  return (
    <div>
      <h3>Business profile (printed on receipts)</h3>
      <label>Business name registered with CAC
        <input name="name" value={b.name} onChange={change} />
      </label>
      <label>CAC number (optional)
        <input name="cac" value={b.cac} onChange={change} />
      </label>
      <label>Hotline
        <input name="hotline" value={b.hotline} onChange={change} />
      </label>
      <label>Email address
        <input name="email" value={b.email} onChange={change} />
      </label>
      <label>Shop address
        <input name="address" value={b.address} onChange={change} />
      </label>
      <button onClick={save}>Save business profile</button>
      {saved && <p>Saved.</p>}
    </div>
  )
}
