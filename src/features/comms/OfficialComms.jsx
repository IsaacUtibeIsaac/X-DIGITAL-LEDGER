import { useState, useEffect } from 'react'

// Official communication along the chain of command. One screen for both apps.
// XDL and Digital Ledger each pass their own `api`, so this file is identical in both repositories:
//   api.contacts()                        -> [{ email, name, label, direction: 'up' | 'down', to_management }]
//   api.list(box)                         -> threads; box is 'inbox' | 'sent' | 'all' (| 'everything' for the CEO)
//   api.open(threadId)                    -> { subject, thread_id, mine, messages: [...] }
//   api.send({ to, toManagement, kind, subject, body, thread })
//   api.ack(messageId)
const KIND = { instruction: 'Instruction', notice: 'Notice', report: 'Report', request: 'Request', reply: 'Reply' }
const KINDS_BY_DIRECTION = { down: ['instruction', 'notice'], up: ['report', 'request'] }

export default function OfficialComms({ api, canSeeEverything = false }) {
  const [box, setBox] = useState('all')
  const [threads, setThreads] = useState([])
  const [contacts, setContacts] = useState([])
  const [open, setOpen] = useState(null)
  const [composing, setComposing] = useState(false)
  const [err, setErr] = useState('')
  const [reply, setReply] = useState('')
  const [form, setForm] = useState({ to: '', kind: '', subject: '', body: '' })

  async function load(b = box) {
    setErr('')
    try { setThreads(await api.list(b) || []) } catch (e) { setErr(e.message) }
  }
  async function loadContacts() {
    try { setContacts(await api.contacts() || []) } catch (e) { setErr(e.message) }
  }
  useEffect(() => { load(box) }, [box])
  useEffect(() => { loadContacts() }, [])

  async function openThread(id) {
    setErr('')
    try { setOpen(await api.open(id)); await load() } catch (e) { setErr(e.message) }
  }

  const chosen = contacts.find(c => (c.email || 'management') === form.to)
  const kinds = chosen ? KINDS_BY_DIRECTION[chosen.direction] : []

  async function send() {
    setErr('')
    if (!chosen) { setErr('Choose who to write to.'); return }
    if (!form.kind) { setErr('Choose what kind of message this is.'); return }
    try {
      const id = await api.send({
        to: chosen.email, toManagement: !!chosen.to_management, kind: form.kind, subject: form.subject, body: form.body
      })
      setForm({ to: '', kind: '', subject: '', body: '' })
      setComposing(false)
      await load()
      await openThread(id)
    } catch (e) { setErr(e.message) }
  }

  async function sendReply() {
    setErr('')
    try {
      await api.send({ thread: open.thread_id, body: reply })
      setReply('')
      await openThread(open.thread_id)
    } catch (e) { setErr(e.message) }
  }

  async function ack(id) {
    setErr('')
    try { await api.ack(id); await openThread(open.thread_id) } catch (e) { setErr(e.message) }
  }

  if (open) {
    return (
      <div>
        <button type="button" className="small" onClick={() => { setOpen(null); load() }}>Back</button>
        <h3>{open.subject}</h3>
        {!open.mine && <p className="rai-lock">You are reading this as the CEO. It has been recorded in the activity log.</p>}
        {err && <p className="auth-error">{err}</p>}
        {open.messages.map(m => (
          <div key={m.id} className="rai-card">
            <b>{m.from_name}</b> to {m.to_name} · {KIND[m.kind] || m.kind}
            <div className="rai-lock">{new Date(m.created_at).toLocaleString()}{m.read_at ? ' · read' : ''}</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
            {m.ack_at && <div className="rai-lock">Acknowledged {new Date(m.ack_at).toLocaleString()}</div>}
            {m.can_ack && <button type="button" onClick={() => ack(m.id)}>Acknowledge</button>}
          </div>
        ))}
        {open.mine && (
          <>
            <textarea rows={3} placeholder="Reply" value={reply} onChange={e => setReply(e.target.value)} />
            <button type="button" onClick={sendReply}>Send reply</button>
          </>
        )}
        <p className="rai-lock">Official messages cannot be edited or deleted.</p>
      </div>
    )
  }

  return (
    <div>
      <h3>Official communication</h3>
      <p className="rai-lock">Write to the person you report to and to the people who report to you. Instructions and notices go down and must be acknowledged. Reports and requests go up.</p>
      {err && <p className="auth-error">{err}</p>}

      <div className="rai-row">
        {[['all', 'All'], ['inbox', 'Received'], ['sent', 'Sent']].concat(canSeeEverything ? [['everything', 'Everyone']] : []).map(([k, l]) => (
          <button key={k} type="button" className={box === k ? '' : 'small'} onClick={() => setBox(k)}>{l}</button>
        ))}
        {!composing && <button type="button" onClick={() => setComposing(true)}>New message</button>}
      </div>

      {composing && (
        <div className="rai-card">
          <select value={form.to} onChange={e => setForm({ ...form, to: e.target.value, kind: '' })}>
            <option value="">Write to</option>
            {contacts.map(c => <option key={c.email || 'management'} value={c.email || 'management'}>{c.label}</option>)}
          </select>
          {chosen && (
            <select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>
              <option value="">Kind of message</option>
              {kinds.map(k => <option key={k} value={k}>{KIND[k]}</option>)}
            </select>
          )}
          {contacts.length === 0 && !err && <p className="rai-lock">There is nobody in your chain of command to write to yet.</p>}
          <input placeholder="Subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
          <textarea rows={6} placeholder="Message" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
          <button type="button" onClick={send}>Send</button>
          <button type="button" className="small" onClick={() => setComposing(false)}>Cancel</button>
        </div>
      )}

      {threads.length === 0 && !err && <p>No messages yet.</p>}
      {threads.map(t => (
        <div key={t.thread_id} className="rai-card" onClick={() => openThread(t.thread_id)} style={{ cursor: 'pointer' }}>
          <b>{t.subject}</b>
          {t.unread > 0 && <span className="pill warn"> {t.unread} new</span>}
          {t.needs_ack > 0 && <span className="pill bad"> Acknowledge</span>}
          <div>{KIND[t.kind]} · {t.from_name || t.from_email} to {t.to_name}</div>
          <div className="rai-lock">{new Date(t.last_at).toLocaleString()}{t.replies > 0 ? ` · ${t.replies} replies` : ''}</div>
        </div>
      ))}
    </div>
  )
}
