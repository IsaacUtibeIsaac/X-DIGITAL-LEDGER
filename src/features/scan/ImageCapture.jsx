import { useRef, useState } from 'react'
import { fileToSignature } from './imageMatch.js'

// Opens the phone camera, turns the photo into a number list and hands it back.
// The photo itself is not stored.
export default function ImageCapture({ label, onSignature }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function pick(e) {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setErr('')
    try {
      onSignature(await fileToSignature(file))
    } catch {
      setErr('Could not read that photo. Please try again.')
    }
    setBusy(false)
  }

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={pick}
        style={{ display: 'none' }}
      />
      <button type="button" onClick={() => ref.current && ref.current.click()} disabled={busy}>
        {busy ? 'Reading photo...' : label}
      </button>
      {err && <p>{err}</p>}
    </>
  )
}
