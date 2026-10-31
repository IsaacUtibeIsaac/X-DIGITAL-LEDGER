import { useEffect, useRef, useState } from 'react'

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    osc.frequency.value = 1000
    osc.connect(ctx.destination)
    osc.start()
    setTimeout(() => { osc.stop(); ctx.close() }, 120)
  } catch {}
  try { if (navigator.vibrate) navigator.vibrate(80) } catch {}
}

export default function BarcodeScanner({ onCode, onClose, continuous = false }) {
  const videoRef = useRef(null)
  const callback = useRef(onCode)
  callback.current = onCode
  const [status, setStatus] = useState('Starting camera...')
  const [error, setError] = useState('')
  const [last, setLast] = useState('')
  const [typed, setTyped] = useState('')

  useEffect(() => {
    let stream = null
    let stopped = false
    let lastCode = ''
    let lastTime = 0
    let frames = 0

    async function start() {
      if (!('BarcodeDetector' in window)) {
        setError('This phone or browser cannot scan barcodes yet. Type the barcode below instead.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        })
        const track = stream.getVideoTracks()[0]
        try { await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }) } catch {}
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()

        let detector
        try {
          const supported = await window.BarcodeDetector.getSupportedFormats()
          const wanted = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code']
          detector = new window.BarcodeDetector({ formats: wanted.filter(f => supported.includes(f)) })
        } catch {
          detector = new window.BarcodeDetector()
        }

        setStatus('Scanning...')
        const tick = async () => {
          if (stopped) return
          frames += 1
          try {
            if (video.readyState >= 2) {
              const found = await detector.detect(video)
              if (found.length) {
                const code = found[0].rawValue
                const now = Date.now()
                if (code !== lastCode || now - lastTime > 2000) {
                  lastCode = code
                  lastTime = now
                  beep()
                  setLast(code)
                  callback.current(code)
                  if (!continuous) { stopped = true; return }
                }
              }
            }
          } catch (e) {
            setError('Scanner error: ' + (e && e.message ? e.message : e))
            return
          }
          if (frames % 10 === 0) setStatus('Scanning... (' + frames + ' checks)')
          setTimeout(tick, 120)
        }
        tick()
      } catch {
        setError('The camera could not start. Allow camera access, then try again.')
      }
    }

    start()
    return () => {
      stopped = true
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [])

  function addTyped() {
    if (!typed.trim()) return
    callback.current(typed.trim())
    setTyped('')
  }

  return (
    <div className="scanner">
      {error
        ? <p><b>{error}</b></p>
        : (
          <div className="scanbox">
            <video ref={videoRef} playsInline muted style={{ width: '100%', maxHeight: 240, objectFit: 'cover', background: '#000' }} />
            <div className="scanline" />
          </div>
        )}
      <p>{error ? '' : status}{last ? ` · last: ${last}` : ''}</p>
      <div className="grid2">
        <input placeholder="Or type the barcode" value={typed} onChange={e => setTyped(e.target.value)} />
        <button onClick={addTyped}>Add</button>
      </div>
      <button onClick={onClose}>{continuous ? 'Done scanning' : 'Close scanner'}</button>
    </div>
  )
}
