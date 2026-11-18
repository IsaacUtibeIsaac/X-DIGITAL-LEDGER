import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Shown after someone taps the reset link in their email.
export default function ResetPassword({ onDone }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    setError('')
    if (pw.length < 6) return setError('Use a password of at least 6 characters.')
    if (pw !== pw2) return setError('The two passwords do not match.')
    setBusy(true)
    const { error: e } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (e) return setError(e.message)
    onDone()
  }

  return (
    <div className="screen auth-card">
      <h2>Choose a new password</h2>
      <input type="password" autoComplete="new-password" placeholder="New password" value={pw} onChange={e => setPw(e.target.value)} />
      <input type="password" autoComplete="new-password" placeholder="Repeat new password" value={pw2} onChange={e => setPw2(e.target.value)} />
      {error && <p className="auth-error">{error}</p>}
      <button type="button" className="big" onClick={save} disabled={busy}>
        {busy ? 'Please wait...' : 'Save new password'}
      </button>
    </div>
  )
}
