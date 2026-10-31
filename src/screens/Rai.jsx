import { useState } from 'react'
import { getRole } from '../lib/role.js'
import { ask, suggestions } from '../features/rai/raiEngine.js'

export default function Rai() {
  const role = getRole()
  const [q, setQ] = useState('')
  const [thread, setThread] = useState([])

  function send(text) {
    const t = (text === undefined ? q : text).trim()
    if (!t) return
    const res = ask(role, t)
    setThread([{ q: t, lines: res.lines }, ...thread])
    setQ('')
  }

  return (
    <div className="screen">
      <h2>RAI</h2>
      <p>Role-Aware Intelligence. You are signed in as <b>{role}</b>, so I only answer what that role may see.</p>
      <div className="chips">
        {suggestions(role).map(s => (
          <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
        ))}
      </div>
      <div className="grid2">
        <input
          placeholder="Ask RAI..."
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send() }}
        />
        <button onClick={() => send()}>Ask</button>
      </div>
      {thread.map((m, i) => (
        <div key={i} className="msg">
          <div className="msgq">{m.q}</div>
          {m.lines.map((l, j) => <p key={j}>{l}</p>)}
        </div>
      ))}
    </div>
  )
}
