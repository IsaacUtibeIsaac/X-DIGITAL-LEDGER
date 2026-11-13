import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const naira = n => '₦' + Math.round(Number(n) || 0).toLocaleString()

function ago(ts) {
  if (!ts) return 'never'
  const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return mins + ' min ago'
  const hours = Math.round(mins / 60)
  if (hours < 48) return hours + ' h ago'
  return Math.round(hours / 24) + ' days ago'
}

// Active in the last day, quiet for up to 3 days, silent after that.
function health(ts) {
  if (!ts) return { label: 'Silent', tone: 'bad' }
  const hours = (Date.now() - new Date(ts).getTime()) / 3600000
  if (hours <= 24) return { label: 'Active', tone: 'ok' }
  if (hours <= 72) return { label: 'Quiet', tone: 'warn' }
  return { label: 'Silent', tone: 'bad' }
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="statv">{value}</div>
      <div>{label}</div>
    </div>
  )
}

// XDL-Management, first version. Only Winfieldtec staff (platform admins) see this screen.
export default function Xdl() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [biz, setBiz] = useState('')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    const { data, error: e } = await supabase.rpc('admin_overview')
    if (e) {
      setError(/does not exist|schema cache/i.test(e.message)
        ? 'Run supabase/003_xdl_admin.sql in Supabase (SQL Editor) first.'
        : e.message)
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function credit() {
    setMsg('')
    const amt = Number(amount)
    if (!biz) { setMsg('Choose a business.'); return }
    if (!(amt > 0)) { setMsg('Enter an amount above zero.'); return }
    if (!reference.trim()) { setMsg('Enter a reference, for example the bank transfer reference. Each one can be used once.'); return }
    const before = Number((rows.find(r => r.biz_id === biz) || {}).wallet || 0)
    setBusy(true)
    const { data, error: e } = await supabase.rpc('admin_credit_wallet', {
      p_business: biz, p_amount: amt, p_ref: reference.trim(), p_note: note.trim()
    })
    setBusy(false)
    if (e) { setMsg(e.message); return }
    if (Number(data) === before) {
      setMsg('That reference was already used, so nothing was added.')
      return
    }
    setMsg('Done. New balance: ' + naira(data))
    setAmount('')
    setReference('')
    setNote('')
    load()
  }

  const day = rows.filter(r => r.last_activity && Date.now() - new Date(r.last_activity).getTime() <= 86400000).length
  const sales = rows.reduce((t, r) => t + Number(r.sales_7d || 0), 0)
  const receipts = rows.reduce((t, r) => t + Number(r.receipts_7d || 0), 0)
  const low = rows.filter(r => Number(r.wallet) < 50).length

  return (
    <div className="screen">
      <h2>XDL-Management</h2>
      <p>Pilot monitoring for Winfieldtec. Counts and wallet balances only. No revenue, customers or KYC details.</p>

      {error && <p className="auth-error">{error}</p>}
      {loading && <p className="rai-lock">Loading...</p>}

      {!error && (
        <div className="stats">
          <Stat label="Businesses" value={rows.length} />
          <Stat label="Active in the last 24 hours" value={day} />
          <Stat label="Sales recorded, last 7 days" value={sales} />
          <Stat label="Receipts issued, last 7 days" value={receipts} />
          <Stat label="Wallets below one receipt fee" value={low} />
        </div>
      )}

      {rows.map(r => {
        const h = health(r.last_activity)
        return (
          <div key={r.biz_id} className="row">
            <span>
              <b>{r.biz_name}</b> <span className={'pill ' + h.tone}>{h.label}</span>
              <div>{r.owner_name || 'No owner name'} · {r.owner_email}</div>
              <div>{r.staff} staff · {r.products} items · {r.sales_total} sales in total</div>
              <div>Last 7 days: {r.sales_7d} sales, {r.receipts_7d} receipts</div>
              <div>Last activity {ago(r.last_activity)}</div>
            </span>
            <b className={Number(r.wallet) < 50 ? 'auth-error' : ''}>{naira(r.wallet)}</b>
          </div>
        )
      })}

      <div className="rai-card">
        <h3>Credit a wallet</h3>
        <p className="rai-lock">For payments received by bank transfer or cash through a marketer.</p>
        <select value={biz} onChange={e => setBiz(e.target.value)}>
          <option value="">Choose a business</option>
          {rows.map(r => <option key={r.biz_id} value={r.biz_id}>{r.biz_name}</option>)}
        </select>
        <input type="number" placeholder="Amount (₦)" value={amount} onChange={e => setAmount(e.target.value)} />
        <input placeholder="Reference (bank ref or marketer receipt no.)" value={reference} onChange={e => setReference(e.target.value)} />
        <input placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
        <button type="button" onClick={credit} disabled={busy}>{busy ? 'Please wait...' : 'Credit wallet'}</button>
        {msg && <p className="rai-lock">{msg}</p>}
      </div>

      <button type="button" className="small" onClick={load}>Refresh</button>
    </div>
  )
}
