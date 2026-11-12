import { useState, useEffect, useRef } from 'react'
import { getRole } from '../lib/role.js'
import { ask, suggestions } from '../features/rai/raiEngine.js'
import { converse, followUp } from '../features/rai/chat.js'
import { can, isSubscribed, setSubscribed } from '../features/rai/plan.js'
import { watchBattery, getReminders } from '../features/rai/reminders.js'
import { loadTasks, addTask, toggleTask, removeTask } from '../features/rai/taskStore.js'
import { canSpeak, speak, stopSpeaking, voiceRepliesOn, setVoiceReplies } from '../features/rai/speech.js'
import VoiceButton from '../features/scan/VoiceButton.jsx'

export default function Rai() {
  const role = getRole()
  const staffTasks = role === 'Manager' || role === 'Owner'

  const [q, setQ] = useState('')
  const [thread, setThread] = useState([])
  const [subscribed, setSub] = useState(isSubscribed())
  const [voiceOn, setVoiceOn] = useState(voiceRepliesOn())
  const [battery, setBattery] = useState(undefined)
  const [tasks, setTasks] = useState(() => loadTasks(role))
  const [taskText, setTaskText] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const last = useRef('')

  useEffect(() => watchBattery(setBattery), [])
  useEffect(() => () => stopSpeaking(), [])

  const reminders = getReminders(role, battery || null)

  function send(text, viaVoice) {
    const t = (text === undefined ? q : text).trim()
    if (!t) return
    const lower = t.toLowerCase()
    const isChip = suggestions(role).some(s => s.toLowerCase() === lower)
    const allowed = isChip || (viaVoice ? can('voiceInput') : can('typedQuestions'))

    let lines
    if (!allowed) {
      lines = ['Asking your own questions unlocks with a subscription. You can still tap any suggestion above, and your reminders stay free.']
    } else {
      let query = lower
      const f = can('conversation') ? followUp(last.current, lower) : null
      if (f) query = f
      const talk = can('conversation') ? converse(role, query) : null
      lines = talk || ask(role, query).lines
      if (!talk) last.current = query
    }

    setThread([{ q: t, lines }, ...thread])
    setQ('')
    if (voiceOn && can('voiceReplies')) speak(lines)
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
          placeholder={can('typedQuestions') ? 'Ask RAI...' : 'Subscribe to ask your own questions'}
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send() }}
        />
        <button onClick={() => send()}>Ask</button>
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

      {thread.map((m, i) => (
        <div key={i} className="msg">
          <div className="msgq">{m.q}</div>
          {m.lines.map((l, j) => <p key={j}>{l}</p>)}
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
