// Keeps this phone's records and the central database (Supabase) in step.
//
// How it works:
//  - The app keeps saving to the phone first, so it works with no internet.
//  - Every 15 seconds (and when the phone comes back online) it uploads what changed,
//    then downloads what other devices changed.
//  - If two devices change the same record, the last one saved wins.
//  - Records are never removed from the server; a removal is saved as "deleted".

export const COLLECTIONS = [
  { key: 'dl_products', name: 'products', kind: 'list' },
  { key: 'dl_sales', name: 'sales', kind: 'list' },
  { key: 'dl_voids', name: 'voids', kind: 'list' },
  { key: 'dl_requests', name: 'requests', kind: 'list' },
  { key: 'dl_customers', name: 'customers', kind: 'list' },
  { key: 'dl_suppliers', name: 'suppliers', kind: 'list' },
  { key: 'dl_adjustments', name: 'adjustments', kind: 'list' },
  { key: 'dl_business', name: 'business', kind: 'single' },
  { key: 'dl_settings', name: 'settings', kind: 'single' }
]

const ALL_NAMES = COLLECTIONS.map(c => c.name)

// Must match can_write_collection in supabase/schema.sql
export const WRITE_ACCESS = {
  Owner: ALL_NAMES,
  Manager: ['products', 'adjustments', 'suppliers', 'requests', 'customers', 'sales', 'voids', 'settings'],
  Cashier: ['products', 'sales', 'voids', 'requests', 'customers']
}

const STATE_KEY = 'dl_sync_state'
const OVERLAP_MS = 10000
const CHUNK = 200
const PAGE = 1000
const MAX_PAGES = 20

function canonical(v) {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']'
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}'
  }
  return JSON.stringify(v === undefined ? null : v)
}

function cyrb53(str) {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

export const hashOf = v => cyrb53(canonical(v)).toString(36)

const sortKey = x => String(x.createdAt || x.date || x.id || '')
const newestFirst = (a, b) => (sortKey(a) < sortKey(b) ? 1 : sortKey(a) > sortKey(b) ? -1 : 0)

export function createSync(client, storage) {
  const store = storage || globalThis.localStorage

  const read = key => {
    try { return JSON.parse(store.getItem(key)) } catch { return null }
  }
  const write = (key, value) => {
    try { store.setItem(key, JSON.stringify(value)) } catch {}
  }

  const loadState = () => read(STATE_KEY)
  const saveState = s => write(STATE_KEY, s)

  // Local items of one collection as [{ id, data }]
  function localItems(def) {
    const raw = read(def.key)
    if (def.kind === 'single') {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Object.keys(raw).length) return []
      return [{ id: 'main', data: raw }]
    }
    if (!Array.isArray(raw)) return []
    return raw.filter(x => x && x.id !== undefined && x.id !== null).map(x => ({ id: String(x.id), data: x }))
  }

  function wipeData() {
    COLLECTIONS.forEach(c => store.removeItem(c.key))
    store.removeItem('dl_tasks')
    store.removeItem(STATE_KEY)
  }

  // Call when someone signs in. adopt = keep the records already on this phone and upload them.
  function prepareDevice(businessId, adopt) {
    const st = loadState()
    if (st && st.businessId === businessId) return st
    if (!adopt) wipeData()
    const fresh = { businessId, cursor: null, shadow: {}, lastSync: null }
    saveState(fresh)
    return fresh
  }

  function changesFor(def, state) {
    const shadow = state.shadow[def.name] || {}
    const rows = []
    const seen = new Set()
    for (const item of localItems(def)) {
      seen.add(item.id)
      const h = hashOf(item.data)
      if (shadow[item.id] !== h) {
        rows.push({ id: item.id, data: item.data, deleted: false, h })
      }
    }
    for (const id of Object.keys(shadow)) {
      if (!seen.has(id) && shadow[id] !== 'deleted') {
        rows.push({ id, data: {}, deleted: true, h: 'deleted' })
      }
    }
    return rows
  }

  function pendingCount(role) {
    const state = loadState()
    if (!state) return 0
    let n = 0
    for (const def of COLLECTIONS) {
      if (!(WRITE_ACCESS[role] || []).includes(def.name)) continue
      n += changesFor(def, state).length
    }
    return n
  }

  async function pushCollection(def, state) {
    const rows = changesFor(def, state)
    if (!rows.length) return { pushed: 0 }
    const shadow = state.shadow[def.name] || (state.shadow[def.name] = {})
    let pushed = 0
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      const { error } = await client.from('records').upsert(
        chunk.map(r => ({
          business_id: state.businessId,
          collection: def.name,
          id: r.id,
          data: r.data,
          deleted: r.deleted
        })),
        { onConflict: 'business_id,collection,id' }
      )
      if (error) return { pushed, error: error.message || 'Could not save ' + def.name }
      chunk.forEach(r => { shadow[r.id] = r.h })
      pushed += chunk.length
    }
    return { pushed }
  }

  // Applies rows downloaded from the server. A change made on this phone that has not
  // been uploaded yet is never overwritten.
  function applyRemote(def, remoteRows, state) {
    const shadow = state.shadow[def.name] || (state.shadow[def.name] = {})

    if (def.kind === 'single') {
      const row = remoteRows[remoteRows.length - 1]
      if (!row || row.deleted) return false
      const localRaw = read(def.key)
      const hasLocal = Boolean(localRaw && typeof localRaw === 'object' && Object.keys(localRaw).length)
      const localHash = hasLocal ? hashOf(localRaw) : null
      const s = shadow.main
      const pending = hasLocal ? (s === undefined || localHash !== s) : (s !== undefined && s !== 'deleted')
      const h = hashOf(row.data)
      if (pending) {
        if (hasLocal && localHash === h) shadow.main = h
        return false
      }
      if (localHash === h) { shadow.main = h; return false }
      write(def.key, row.data)
      shadow.main = h
      return true
    }

    const list = (read(def.key) || []).filter(x => x && x.id !== undefined && x.id !== null)
    const byId = new Map(list.map(x => [String(x.id), x]))
    let changed = false

    for (const row of remoteRows) {
      const id = String(row.id)
      const local = byId.get(id)
      const s = shadow[id]
      const pending = local ? (s === undefined || hashOf(local) !== s) : (s !== undefined && s !== 'deleted')

      if (pending) {
        if (local && !row.deleted && hashOf(local) === hashOf(row.data)) shadow[id] = hashOf(local)
        continue
      }

      if (row.deleted) {
        if (local) { byId.delete(id); changed = true }
        shadow[id] = 'deleted'
        continue
      }

      const h = hashOf(row.data)
      if (!local || hashOf(local) !== h) { byId.set(id, row.data); changed = true }
      shadow[id] = h
    }

    if (changed) write(def.key, Array.from(byId.values()).sort(newestFirst))
    return changed
  }

  async function pullAll(state) {
    const since = state.cursor ? new Date(new Date(state.cursor).getTime() - OVERLAP_MS).toISOString() : null
    let from = since
    let newest = state.cursor
    let changed = false

    for (let page = 0; page < MAX_PAGES; page++) {
      let q = client
        .from('records')
        .select('collection,id,data,deleted,updated_at')
        .eq('business_id', state.businessId)
        .order('updated_at', { ascending: true })
        .limit(PAGE)
      if (from) q = q.gte('updated_at', from)
      const { data, error } = await q
      if (error) return { error: error.message || 'Could not download changes', changed }
      const rows = data || []

      for (const def of COLLECTIONS) {
        const mine = rows.filter(r => r.collection === def.name)
        if (mine.length && applyRemote(def, mine, state)) changed = true
      }
      if (rows.length) {
        const last = rows[rows.length - 1].updated_at
        if (!newest || last > newest) newest = last
      }
      if (rows.length < PAGE) break
      from = rows[rows.length - 1].updated_at
    }

    state.cursor = newest
    return { changed }
  }

  async function runOnce(role) {
    const state = loadState()
    if (!state) return { ok: false, error: 'This phone is not set up for syncing yet.' }
    const errors = []
    let pushed = 0
    for (const def of COLLECTIONS) {
      if (!(WRITE_ACCESS[role] || []).includes(def.name)) continue
      const r = await pushCollection(def, state)
      pushed += r.pushed
      if (r.error) errors.push(r.error)
    }
    const pulled = await pullAll(state)
    if (pulled.error) errors.push(pulled.error)
    if (!errors.length) state.lastSync = new Date().toISOString()
    saveState(state)
    return { ok: errors.length === 0, error: errors[0] || '', pushed, changed: Boolean(pulled.changed) }
  }

  const looksOffline = msg => {
    const m = String(msg || '').toLowerCase()
    return (typeof navigator !== 'undefined' && navigator.onLine === false) ||
      m.includes('fetch') || m.includes('network') || m.includes('failed to') || m.includes('load failed')
  }

  // Starts the repeating sync. Returns { stop, now }.
  function start({ role }, onStatus) {
    let stopped = false
    let running = false

    async function run() {
      if (stopped || running) return
      running = true
      onStatus({ state: 'syncing' })
      try {
        const r = await runOnce(role)
        if (stopped) return
        if (r.ok) onStatus({ state: 'synced', at: Date.now(), changed: r.changed })
        else onStatus({ state: looksOffline(r.error) ? 'offline' : 'error', message: r.error })
      } catch (e) {
        if (!stopped) onStatus({ state: looksOffline(e && e.message) ? 'offline' : 'error', message: (e && e.message) || 'Sync failed' })
      } finally {
        running = false
      }
    }

    const timer = setInterval(run, 15000)
    const onOnline = () => run()
    const onVisible = () => { if (typeof document !== 'undefined' && document.visibilityState === 'visible') run() }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onOnline)
      document.addEventListener('visibilitychange', onVisible)
    }
    run()

    return {
      now: run,
      stop() {
        stopped = true
        clearInterval(timer)
        if (typeof window !== 'undefined') {
          window.removeEventListener('online', onOnline)
          document.removeEventListener('visibilitychange', onVisible)
        }
      }
    }
  }

  return { prepareDevice, runOnce, start, pendingCount, wipeData, loadState }
}
