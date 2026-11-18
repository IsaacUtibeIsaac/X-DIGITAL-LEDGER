import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import { loadBusiness, loadSignature, saveSignature } from '../business/businessStore.js'

// The signed-in person's own details. Shown at the top of the Profile screen for every role.
export default function AccountProfile({ viewRole, realRole }) {
  const [email, setEmail] = useState('')
  const [sig, setSig] = useState(loadSignature())
  const [sigSaved, setSigSaved] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [pwNote, setPwNote] = useState('')

  let name = ''
  try { name = localStorage.getItem('dl_cashier_name') || '' } catch {}
  const business = loadBusiness().name

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => {
      if (data && data.user) setEmail(data.user.email || '')
    })
  }, [])

  async function changePassword() {
    if (pw.length < 6) return setPwNote('Use a password of at least 6 characters.')
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) return setPwNote(error.message)
    setPw(''); setPwOpen(false); setPwNote('Password changed.')
  }

  return (
    <div className="profile-card">
      <div className="profile-head">
        <div className="avatar">{(name || viewRole || '?').trim().charAt(0).toUpperCase()}</div>
        <div>
          <h3>{name || 'Your profile'}</h3>
          <span className="pill ok">{viewRole}</span>
        </div>
      </div>

      <div className="row"><span>Role</span><span>{realRole && realRole !== viewRole ? `${realRole} (viewing as ${viewRole})` : viewRole}</span></div>
      {email && <div className="row"><span>Email</span><span>{email}</span></div>}
      {business && <div className="row"><span>Business</span><span>{business}</span></div>}

      {viewRole === 'Manager' && (
        <>
          <h4>My electronic signature</h4>
          <label>Type your full name
            <input value={sig} onChange={e => { setSig(e.target.value); setSigSaved(false) }} />
          </label>
          <div className="sig">{sig || 'Your signature'}</div>
          <p>By saving, I adopt this as my electronic signature on receipts.</p>
          <button type="button" onClick={() => { saveSignature(sig); setSigSaved(true) }}>Save signature</button>
          {sigSaved && <p>Saved.</p>}
        </>
      )}

      {supabase && (
        <>
          <h4>Password</h4>
          {!pwOpen ? (
            <button type="button" className="small" onClick={() => { setPwOpen(true); setPwNote('') }}>Change password</button>
          ) : (
            <>
              <input type="password" autoComplete="new-password" placeholder="New password" value={pw} onChange={e => setPw(e.target.value)} />
              <div className="rai-row">
                <button type="button" onClick={changePassword}>Save password</button>
                <button type="button" className="small ghost" onClick={() => setPwOpen(false)}>Cancel</button>
              </div>
            </>
          )}
          {pwNote && <p>{pwNote}</p>}
        </>
      )}
    </div>
  )
}
