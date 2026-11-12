import { todayStr } from './taskStore.js'

// Sends the conversation to the online assistant (api/rai.js on Vercel).
// Always resolves. Returns { ok:true, text, actions } or { ok:false, error, status }.
export async function askOnline({ role, history, snapshot }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  try {
    const r = await fetch('/api/rai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, today: todayStr(), snapshot, messages: history }),
      signal: controller.signal
    })
    if (!r.ok) {
      let code = ''
      try { code = (await r.json()).error || '' } catch {}
      return { ok: false, error: code || 'failed', status: r.status }
    }
    const data = await r.json()
    return {
      ok: true,
      text: typeof data.text === 'string' ? data.text : '',
      actions: Array.isArray(data.actions) ? data.actions : []
    }
  } catch {
    return { ok: false, error: 'offline', status: 0 }
  } finally {
    clearTimeout(timer)
  }
}
