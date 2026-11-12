import { useState, useEffect } from 'react'
import { loadStaff, createInvite, setMemberActive } from '../lib/session.js'

// Owner only: invite staff and turn their access on or off.
export default function Staff({ businessId }) {
  const [data, setData] = useState({ members: [], invites: [], error: null, loading: true })
  const [fresh, setFresh] = useState(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  async function refresh() {
    const r = await loadStaff(businessId)
    setData({ ...r, loading: false })
  }

  useEffect(() => {
    if (businessId) refresh()
  }, [businessId])

  async function invite(role) {
    setNote('')
    setBusy(true)
    const { code, error } = await createInvite(businessId, role)
    setBusy(false)
    if (error) { setNote(error.message); return }
    setFresh({ code, role })
    refresh()
  }

  function message(code) {
    return `Join our shop on Digital Ledger. Open ${window.location.origin}, create an account, choose "I have an invite code" and enter: ${code}`
  }

  async function share(code) {
    const text = message(code)
    try {
      if (navigator.share) await navigator.share({ text })
      else {
        await navigator.clipboard.writeText(text)
        setNote('Copied. Paste it into WhatsApp or SMS.')
      }
    } catch {}
  }

  async function toggle(m) {
    const word = m.active ? 'turn off' : 'turn on'
    if (!window.confirm(`Do you want to ${word} access for ${m.display_name || m.email}?`)) return
    const { error } = await setMemberActive(businessId, m.user_id, !m.active)
    if (error) setNote(error.message)
    refresh()
  }

  return (
    <div className="screen">
      <h2>Staff</h2>
      <p>Invite your managers and cashiers. Each person signs in with their own account.</p>

      <div className="rai-row">
        <button type="button" onClick={() => invite('Manager')} disabled={busy}>Invite a Manager</button>
        <button type="button" onClick={() => invite('Cashier')} disabled={busy}>Invite a Cashier</button>
      </div>

      {fresh && (
        <div className="rai-card">
          <h3>New {fresh.role} invite</h3>
          <div className="invite-code">{fresh.code}</div>
          <p className="rai-lock">Works once and expires in 7 days.</p>
          <button type="button" onClick={() => share(fresh.code)}>Share or copy</button>
        </div>
      )}

      {note && <p className="rai-lock">{note}</p>}
      {data.error && <p className="auth-error">{data.error.message}</p>}

      <h3>People ({data.members.length})</h3>
      {data.loading && <p className="rai-lock">Loading...</p>}
      {data.members.map(m => (
        <div key={m.user_id} className="row">
          <span>
            <b>{m.display_name || 'No name'}</b> · {m.role}
            <div>{m.email}{m.active ? '' : ' · access off'}</div>
          </span>
          {m.role !== 'Owner' && (
            <button type="button" className="small" onClick={() => toggle(m)}>
              {m.active ? 'Turn off' : 'Turn on'}
            </button>
          )}
        </div>
      ))}

      {data.invites.length > 0 && (
        <>
          <h3>Unused invites</h3>
          {data.invites.map(i => (
            <div key={i.code} className="row">
              <span><b>{i.code}</b> · {i.role}<div>Expires {new Date(i.expires_at).toLocaleDateString()}</div></span>
              <button type="button" className="small" onClick={() => share(i.code)}>Share</button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
