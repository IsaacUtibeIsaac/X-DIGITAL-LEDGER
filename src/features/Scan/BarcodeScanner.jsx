import { useEffect, useRef, useState } from 'react'

export default function BarcodeScanner({ onCode, onClose }) {
  const videoRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let stream = null
    let stopped = false

    async function start() {
      if (!('BarcodeDetector' in window)) {
        setError('This phone or browser cannot scan barcodes yet. Please type the barcode instead.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        })
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        const detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
        })
        const tick = async () => {
          if (stopped) return
          try {
            const found = await detector.detect(video)
            if (found.length) {
              stopped = true
              onCode(found[0].rawValue)
              return
            }
          } catch {}
          setTimeout(tick, 250)
        }
        tick()
      } catch {
        setError('The camera could not start. Allow camera access and try again.')
      }
    }

    start()
    return () => {
      stopped = true
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [])

  return (
    <div>
      <p>Point the camera at the barcode.</p>
      {error
        ? <p><b>{error}</b></p>
        : <video ref={videoRef} playsInline muted style={{ width: '100%', background: '#000' }} />}
      <button onClick={onClose}>Close scanner</button>
    </div>
  )
}
