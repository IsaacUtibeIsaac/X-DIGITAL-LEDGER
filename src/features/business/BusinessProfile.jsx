import { useState } from 'react'
import { loadBusiness, saveBusiness } from './businessStore.js'

const TYPES = ['Provision store', 'Supermarket', 'Pharmacy', 'Foodstuff / market', 'Building materials', 'Other']

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
      <h3>Business profile</h3>
      <p>Fill in step by step. Nothing here stops you from selling. Level 1 is the basics, level 2 is the business record.</p>

      <h4>Level 1: basics</h4>
      <label>Owner full name
        <input name="ownerName" value={b.ownerName} onChange={change} />
      </label>
      <label>Owner phone with country code (for example +2348012345678)
        <input name="ownerPhone" value={b.ownerPhone} onChange={change} />
      </label>
      <label>Business name registered with CAC (printed on receipts)
        <input name="name" value={b.name} onChange={change} />
      </label>

      <h4>Level 2: business record</h4>
      <label>CAC number
        <input name="cac" value={b.cac} onChange={change} />
      </label>
      <label>Shop address (printed on receipts)
        <input name="address" value={b.address} onChange={change} />
      </label>
      <div className="grid2">
        <label>State
          <input name="state" value={b.state} onChange={change} />
        </label>
        <label>Business type
          <select name="businessType" value={b.businessType} onChange={change}>
            <option value="">Choose...</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>

      <h4>Also on receipts</h4>
      <div className="grid2">
        <label>Hotline
          <input name="hotline" value={b.hotline} onChange={change} />
        </label>
        <label>Email address
          <input name="email" value={b.email} onChange={change} />
        </label>
      </div>
      <label>Number of staff
        <input name="staffCount" type="number" value={b.staffCount} onChange={change} />
      </label>

      <button onClick={save}>Save business profile</button>
      {saved && <p>Saved. See the Account review above for your level.</p>}
    </div>
  )
}
