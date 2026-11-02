import { useRef, useState } from 'react'

// Tap the mic and say an item name; the words fill the search box.
export default function VoiceButton({ onText }) {
  const [listening, setListening] = useState(false)
  const [note, setNote] = useState('')
  const rec = useRef(null)

  function start() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setNote('Voice input is not supported on this browser.')
      return
    }
    const r = new SR()
    r.lang = 'en-NG'
    r.interimResults = false
    r.maxAlternatives = 1
    r.onresult = e => {
      onText(e.results[0][0].transcript)
      setNote('')
    }
    r.onerror = e => {
      setNote('Voice error: ' + e.error)
      setListening(false)
    }
    r.onend = () => setListening(false)
    rec.current = r
    setListening(true)
    r.start()
  }

  function toggle() {
    if (listening && rec.current) rec.current.stop()
    else start()
  }

  return (
    <div>
      <button
        className={'rtoggle' + (listening ? ' on' : '')}
        style={{ width: '100%', margin: '6px 0 0' }}
        aria-label="Voice input"
        onClick={toggle}
      >🎤</button>
      {note && <div className="pill">{note}</div>}
    </div>
  )
}
