// Tasks for Manager and Owner. Each role sees only its own tasks.
const KEY = 'dl_tasks'

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
}

function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {}
}

export function todayStr() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + m + '-' + day
}

export const loadTasks = role => read().filter(t => t.role === role)

export function addTask(role, text, due) {
  const clean = (text || '').trim()
  if (!clean) return
  const list = read()
  list.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    role,
    text: clean,
    due: due || '',
    done: false,
    created: new Date().toISOString()
  })
  write(list)
}

export function toggleTask(id) {
  write(read().map(t => (t.id === id ? { ...t, done: !t.done } : t)))
}

export function removeTask(id) {
  write(read().filter(t => t.id !== id))
}
