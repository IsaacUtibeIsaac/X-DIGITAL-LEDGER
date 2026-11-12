import { useState } from 'react'
import { createBusiness, acceptInvite } from '../lib/session.js'

// Shown to a signed-in person who does not belong to a business yet.
export default function Onboarding({ email, onDone, onSignOut }) {
  const [mode, setMode] = useState('create')
  const [name, setName] = useState('')
  const [business, setBusiness] = useState('')
  const [code, setCode] = useState('')
  const [adopt, setAdopt] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function create() {
    setError('')
    if (!name.trim()) { setError('Enter your name.'); return }
    if (!business.trim()) { setError('Enter your business name.'); return }
    setBusy(true)
    const { error: e } = await createBusiness(business.trim(), name.trim())
    setBusy(false)
    if (e) setError(e.message)
    else onDone(adopt)
  }

  async function join() {
    setError('')
    if (!name.trim()) { setError('Enter your name.'); return }
    if (!code.trim()) { setError('Enter the invite code from your owner.'); return }
    setBusy(true)
    const { error: e } = await acceptInvite(code.trim(), name.trim())
    setBusy(false)
    if (e) setError(e.message)
    else onDone(false)
  }

  return (
    <div className="screen auth-card">
      <h2>Welcome</h2>
      <p>Signed in as {email}.</p>

      <div className="auth-tabs">
        <button type="button" className={mode === 'create' ? 'tab on' : 'tab'} onClick={() => setMode('create')}>I own a business</button>
        <button type="button" className={mode === 'join' ? 'tab on' : 'tab'} onClick={() => setMode('join')}>I have an invite code</button>
      </div>

      <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />

      {mode === 'create' ? (
        <>
          <input placeholder="Business name" value={business} onChange={e => setBusiness(e.target.value)} />
          <label>
            <input type="checkbox" checked={adopt} onChange={e => setAdopt(e.target.checked)} />
            Keep the items and sales already saved on this phone
          </label>
          <button type="button" className="big" onClick={create} disabled={busy}>
            {busy ? 'Please wait...' : 'Create my business'}
          </button>
        </>
      ) : (
        <>
          <input
            placeholder="Invite code"
            autoCapitalize="characters"
            value={code}
            onChange={e => setCode(e.target.value)}
          />
          <button type="button" className="big" onClick={join} disabled={busy}>
            {busy ? 'Please wait...' : 'Join my business'}
          </button>
        </>
      )}

      {error && <p className="auth-error">{error}</p>}
      <button type="button" className="small" onClick={onSignOut}>Sign out</button>
    </div>
  )
}
