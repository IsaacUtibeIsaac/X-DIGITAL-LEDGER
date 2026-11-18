import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Login() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  async function sendReset() {
    setError('')
    setNote('')
    if (!email.trim()) {
      setError('Enter your email address first.')
      return
    }
    setBusy(true)
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin
    })
    setBusy(false)
    if (e) setError(e.message)
    else setNote('If that email has an account, a reset link is on its way. Check your inbox and spam folder.')
  }

  async function submit() {
    if (mode === 'forgot') return sendReset()
    setError('')
    setNote('')
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Use a password of at least 6 characters.')
      return
    }
    setBusy(true)
    if (mode === 'signin') {
      const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (e) setError(e.message)
    } else {
      const { data, error: e } = await supabase.auth.signUp({ email: email.trim(), password })
      if (e) setError(e.message)
      else if (!data.session) setNote('Account created. Check your email to confirm it, then sign in.')
    }
    setBusy(false)
  }

  async function google() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  return (
    <div className="screen auth-card">
      <h2>Digital Ledger</h2>
      <p>{mode === 'signin' ? 'Sign in to continue.' : mode === 'forgot' ? 'Enter your email and we will send a reset link.' : 'Create your account.'}</p>

      <div className="auth-tabs">
        <button type="button" className={mode === 'signin' ? 'tab on' : 'tab'} onClick={() => setMode('signin')}>Sign in</button>
        <button type="button" className={mode === 'signup' ? 'tab on' : 'tab'} onClick={() => setMode('signup')}>Create account</button>
      </div>

      <input
        type="email"
        autoComplete="email"
        placeholder="Email address"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      {mode !== 'forgot' && (
        <input
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
        />
      )}

      {error && <p className="auth-error">{error}</p>}
      {note && <p className="auth-note">{note}</p>}

      <button type="button" className="big" onClick={submit} disabled={busy}>
        {busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : mode === 'forgot' ? 'Send reset link' : 'Create account'}
      </button>

      {mode === 'signin' && (
        <button type="button" className="small ghost" onClick={() => { setMode('forgot'); setError(''); setNote('') }}>
          Forgot password?
        </button>
      )}
      {mode === 'forgot' && (
        <button type="button" className="small ghost" onClick={() => { setMode('signin'); setError(''); setNote('') }}>
          Back to sign in
        </button>
      )}

      <p className="rai-lock">or</p>
      <button type="button" onClick={google}>Continue with Google</button>
    </div>
  )
}
