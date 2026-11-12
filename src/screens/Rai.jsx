import { useState, useEffect, useRef } from 'react'
import { getRole } from '../lib/role.js'
import { ask, suggestions } from '../features/rai/raiEngine.js'
import { converse, followUp } from '../features/rai/chat.js'
import { can, isSubscribed, setSubscribed } from '../features/rai/plan.js'
import { watchBattery, getReminders } from '../features/rai/reminders.js'
import { loadTasks, addTask, toggleTask, removeTask } from '../features/rai/taskStore.js'
import { canSpeak, speak, stopSpeaking, voiceRepliesOn, setVoiceReplies } from '../features/rai/speech.js'
import { buildSnapshot } from '../features/rai/snapshot.js'
import { askOnline } from '../features/rai/brain.js'
import { prepareAction, runAction } from '../features/rai/actions.js'
import VoiceButton from '../features/scan/VoiceButton.jsx'

// Words that usually mean "change something", so the online assistant should handle it.
const WRITE_WORDS = /\b(add|update|change|set|increase|reduce|remove|record|register|save|edit|create|make|put|received|restocked|remind me)\b/

const CONVERSATION_MS = 5 * 60 * 1000

function offlineNote(res) {
  if (res.error === 'not_configured' || res.status === 404 || res.status === 503) {
    return 'Online conversation is not switched on yet, so here is what I can answer from your records.'
  }
  if (res.error === 'slow_down' || res.status === 429) {
    return 'Too many questions at once. Please wait a minute and try again.'
  }
  return 'I could not reach the online assistant just now, so here is what I can answer from your records.'
}

export default function Rai() {
  const role = getRole()
  const staffTasks = role === 'Manager' || role === 'Owner'

  const [q, setQ] = useState('')
  const [thread, setThread] = useState([])
  const [busy, setBusy] = useState(false)
  const [subscribed, setSub] = useState(isSubscribed())
  const [voiceOn, setVoiceOn] = useState(voiceRepliesOn())
  const [battery, setBattery] = useState(undefined)
  const [tasks, setTasks] = useState(() => loadTasks(role))
  const [taskText, setTaskText] = useState('')
  const [taskDue, setTaskDue] = useState('')

  const last = useRef('')
  const hist = useRef([])
  const lastOnline = useRef(false)
  const lastOnlineAt = useRef(0)

  useEffect(() => watchBattery(setBattery), [])
  useEffect(() => () => stopSpeaking(), [])

  const reminders = getReminders(role, battery || null)

  function addEntry(entry) {
    setThread(t => [entry, ...t])
  }

  function patchEntry(id, patch) {
    setThread(t => t.map(e => (e.id === id ? { ...e, ...patch } : e)))
  }

  function patchAction(entryId, actionId, patch) {
    setThread(t => t.map(e => (e.id !== entryId
      ? e
      : { ...e, actions: e.actions.map(a => (a.id === actionId ? { ...a, ...patch } : a)) })))
  }

  function say(lines) {
    if (voiceOn && can('voiceReplies')) speak(lines)
  }

  async function send(text, viaVoice) {
    const t = (text === undefined ? q : text).trim()
    if (!t || busy) return
    const lower = t.toLowerCase()
    const isChip = suggestions(role).some(s => s.toLowerCase() === lower)
    const allowed = isChip || (viaVoice ? can('voiceInput') : can('typedQuestions'))
    const id = Date.now() + Math.random()
    setQ('')

    if (!allowed) {
      addEntry({
        id, q: t, actions: [],
        lines: ['Asking your own questions unlocks with a subscription. You can still tap any suggestion above, and your reminders stay free.']
      })
      return
    }

    const online = can('conversation')
    const talking = lastOnline.current && Date.now() - lastOnlineAt.current < CONVERSATION_MS

    let query = lower
    const f = online ? followUp(last.current, lower) : null
    if (f) query = f

    const chat = online && !isChip && lower.length <= 40 ? converse(role, query) : null
    if (chat) {
      addEntry({ id, q: t, lines: chat, actions: [] })
      say(chat)
      return
    }

    const local = ask(role, query)
    const wantsChange = WRITE_WORDS.test(lower)
    const useLocal = isChip || !online || (local.matched && !wantsChange && !talking)

    if (useLocal) {
      last.current = query
      lastOnline.current = false
      addEntry({ id, q: t, lines: local.lines, actions: [] })
      say(local.lines)
      return
    }

    // Online conversation
    addEntry({ id, q: t, lines: ['Thinking...'], actions: [] })
    setBusy(true)
    const history = [...hist.current, { role: 'user', content: t }].slice(-12)
    const res = await askOnline({ role, history, snapshot: buildSnapshot(role) })
    setBusy(false)

    if (!res.ok) {
      lastOnline.current = false
      const lines = res.status === 429 ? [offlineNote(res)] : [offlineNote(res), ...local.lines]
      patchEntry(id, { lines })
      say(lines)
      return
    }

    const actions = res.actions.map((a, n) => {
      const check = prepareAction(role, a)
      return {
        id: a.id || id + '-' + n,
        action: a,
        summary: check.ok ? check.summary : '',
        error: check.ok ? '' : check.error,
        status: check.ok ? 'pending' : 'blocked'
      }
    })

    const lines = res.text ? res.text.split('\n').filter(Boolean) : []
    actions.filter(a => a.status === 'blocked').forEach(a => lines.push(a.error))
    if (!lines.length && !actions.length) lines.push('I could not work that out. Could you say it another way?')

    const proposed = actions.filter(a => a.status === 'pending').map(a => a.summary)
    hist.current = [
      ...history,
      { role: 'assistant', content: [res.text, ...proposed.map(s => 'Proposed: ' + s)].filter(Boolean).join('\n') || '(no reply)' }
    ].slice(-12)
    lastOnline.current = true
    lastOnlineAt.current = Date.now()

    patchEntry(id, { lines, actions: actions.filter(a => a.status === 'pending') })
    say(lines)
  }

  function confirmAction(entryId, actionId) {
    const entry = thread.find(e => e.id === entryId)
    const a = entry && entry.actions.find(x => x.id === actionId)
    if (!a || a.status !== 'pending') return
    const r = runAction(role, a.action)
    patchAction(entryId, actionId, { status: r.ok ? 'done' : 'failed', result: r.ok ? r.message : r.error })
    hist.current = [
      ...hist.current,
      { role: 'assistant', content: r.ok ? r.message : 'That change could not be made: ' + r.error }
    ].slice(-12)
    setTasks(loadTasks(role))
    say([r.ok ? r.message : r.error])
  }

  function cancelAction(entryId, actionId) {
    patchAction(entryId, actionId, { status: 'cancelled', result: 'Cancelled. Nothing was changed.' })
    hist.current = [...hist.current, { role: 'assistant', content: 'The person cancelled that change.' }].slice(-12)
  }

  function toggleVoice() {
    const next = !voiceOn
    setVoiceReplies(next)
    setVoiceOn(next)
  }

  function changePlan(e) {
    const on = e.target.value === 'subscribed'
    setSubscribed(on)
    setSub(on)
    if (!on) {
      setVoiceReplies(false)
      setVoiceOn(false)
      lastOnline.current = false
    }
  }

  function saveTask() {
    if (!taskText.trim()) return
    addTask(role, taskText, taskDue)
    setTasks(loadTasks(role))
    setTaskText('')
    setTaskDue('')
  }

  function flip(id) {
    toggleTask(id)
    setTasks(loadTasks(role))
  }

  function drop(id) {
    removeTask(id)
    setTasks(loadTasks(role))
  }

  return (
    <div className="screen">
      <h2>RAI</h2>
      <p>
        Role-Aware Intelligence. You are signed in as <b>{role}</b>, so I only answer what that role may see.
      </p>

      <div className="rai-card">
        <h3>Reminders</h3>
        {role === 'Cashier' && battery && (
          <p className="rai-reminder">
            Phone battery: {battery.level}%{battery.charging ? ' (charging)' : ''}
          </p>
        )}
        {role === 'Cashier' && battery === null && (
          <p className="rai-lock">Battery reminders need Chrome on Android. This browser cannot report the battery.</p>
        )}
        {reminders.map(r => (
          <p key={r.id} className={'rai-reminder ' + r.level}>{r.text}</p>
        ))}
        {!reminders.length && <p className="rai-lock">No reminders right now.</p>}
      </div>

      {staffTasks && (
        <div className="rai-card">
          <h3>My tasks</h3>
          <input
            placeholder="Add a task..."
            value={taskText}
            onChange={e => setTaskText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveTask() }}
          />
          <div className="rai-row">
            <input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} />
            <button type="button" onClick={saveTask}>Add task</button>
          </div>
          {tasks.map(t => (
            <div key={t.id} className="rai-task">
              <label>
                <input type="checkbox" checked={t.done} onChange={() => flip(t.id)} />{' '}
                <span className={t.done ? 'done' : ''}>
                  {t.text}{t.due ? ' · due ' + t.due : ''}
                </span>
              </label>
              <button type="button" className="rai-x" aria-label="Delete task" onClick={() => drop(t.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="chips">
        {suggestions(role).map(s => (
          <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
        ))}
      </div>

      <div className="grid2">
        <input
          placeholder={can('typedQuestions') ? 'Ask RAI or tell it what to do...' : 'Subscribe to ask your own questions'}
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send() }}
        />
        <button onClick={() => send()} disabled={busy}>{busy ? '...' : 'Ask'}</button>
      </div>

      {can('voiceInput')
        ? <VoiceButton onText={text => send(text, true)} />
        : <p className="rai-lock">🔒 Voice questions unlock with a subscription.</p>}

      <div className="rai-row">
        {can('voiceReplies')
          ? (canSpeak()
              ? <button type="button" onClick={toggleVoice}>{voiceOn ? '🔊 Voice replies: On' : '🔈 Voice replies: Off'}</button>
              : <span className="rai-lock">This browser cannot speak replies.</span>)
          : <span className="rai-lock">🔒 Spoken replies unlock with a subscription.</span>}
      </div>

      {thread.map(m => (
        <div key={m.id} className="msg">
          <div className="msgq">{m.q}</div>
          {m.lines.map((l, j) => <p key={j}>{l}</p>)}
          {m.actions.map(a => (
            <div key={a.id} className={'rai-action ' + a.status}>
              <div>{a.summary}</div>
              {a.status === 'pending' && (
                <div className="rai-row">
                  <button type="button" onClick={() => confirmAction(m.id, a.id)}>Confirm</button>
                  <button type="button" className="rai-x" onClick={() => cancelAction(m.id, a.id)}>Cancel</button>
                </div>
              )}
              {a.result && <div className="rai-result">{a.result}</div>}
            </div>
          ))}
        </div>
      ))}

      <div className="rai-card">
        <label className="rai-lock">
          Pilot test only, plan:{' '}
          <select value={subscribed ? 'subscribed' : 'free'} onChange={changePlan}>
            <option value="free">Free</option>
            <option value="subscribed">Subscribed</option>
          </select>
        </label>
      </div>
    </div>
  )
}
