import { useState, useEffect } from 'react'
import { supabaseReady } from '../../lib/supabase.js'
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '../../lib/support.js'
import { loadBusiness, saveBusiness } from './businessStore.js'
import { kycStatus, loadKyc, saveKyc, docMeta, saveDoc, submitKyc, markVerified } from './kycStore.js'
import { prepareDocument } from './docUpload.js'
import { cloudOn, pushStages, submitToCloud, pullStatus } from './kycCloud.js'

const has = v => Boolean(v && String(v).trim())
const now = () => new Date().toISOString()
const day = iso => (iso ? new Date(iso).toLocaleDateString() : '')
const testMode = () => !supabaseReady || localStorage.getItem('dl_force_test') === '1'
const mask = v => (v && v.length > 4 ? '•••• ' + v.slice(-4) : v || '')

function Support() {
  return (
    <p className="kyc-note">
      To change anything now, contact Digital Ledger customer support.
      {SUPPORT_EMAIL && <> <a href={'mailto:' + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</a></>}
      {SUPPORT_PHONE && <> <a href={'tel:' + SUPPORT_PHONE}>{SUPPORT_PHONE}</a></>}
    </p>
  )
}

function Task({ n, title, note, status, open, onToggle, children }) {
  return (
    <div className="kyc-card">
      <button type="button" className="kyc-head" onClick={onToggle} aria-expanded={open}>
        <span className={'kyc-num' + (status.done ? ' done' : '')}>{status.done ? '✓' : n}</span>
        <span className="kyc-title">
          <b>KYC {n}</b> · {title}
          <small>{note}</small>
        </span>
        <span className={'pill ' + status.cls}>{status.label}</span>
      </button>
      {open && <div className="kyc-body">{children}</div>}
    </div>
  )
}

function Rows({ rows }) {
  return rows.filter(r => r[1]).map(([label, value]) => (
    <div key={label} className="row"><span>{label}</span><span>{value}</span></div>
  ))
}

export default function KycTasks({ businessId }) {
  const [tick, setTick] = useState(0)
  const refresh = () => setTick(t => t + 1)

  const b = loadBusiness()
  const k = loadKyc()
  const st = kycStatus(b, k)
  const active = !st.s1 ? 1 : !st.s2 ? 2 : !st.s3 ? 3 : 0
  const locked = st.s3 // once documents are sent, changes go through customer support

  const [open, setOpen] = useState(active)
  const [editing, setEditing] = useState(0)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [f1, setF1] = useState({
    name: b.name, address: b.address, hotline: b.hotline, email: b.email, social: k.social
  })
  const [f2, setF2] = useState({ tin: k.tin, cacNumber: k.cacNumber })

  // Check the review result when this screen opens, then once a minute
  useEffect(() => {
    if (!cloudOn(businessId)) return
    let live = true
    const check = () => pullStatus(businessId).then(changed => { if (live && changed) refresh() })
    check()
    const id = setInterval(check, 60000)
    return () => { live = false; clearInterval(id) }
  }, [businessId])

  const change1 = e => setF1({ ...f1, [e.target.name]: e.target.value })
  const change2 = e => setF2({ ...f2, [e.target.name]: e.target.value })
  const go = n => { setErr(''); setOpen(open === n ? 0 : n) }

  function save1(next) {
    const miss = []
    if (!has(f1.name)) miss.push('business name')
    if (!has(f1.address)) miss.push('address')
    if (!has(f1.hotline)) miss.push('hotline')
    if (!has(f1.email) && !has(f1.social)) miss.push('email or a social media page')
    if (miss.length) return setErr('Please fill in: ' + miss.join(', ') + '.')
    saveBusiness({
      ...loadBusiness(),
      name: f1.name.trim(), address: f1.address.trim(),
      hotline: f1.hotline.trim(), email: f1.email.trim()
    })
    saveKyc({ social: f1.social.trim(), s1At: loadKyc().s1At || now() })
    pushStages(businessId)
    setErr(''); setEditing(0); setOpen(next); refresh()
  }

  function save2(next) {
    if (f2.tin.trim().length < 6) return setErr('Enter your TIN.')
    if (f2.cacNumber.trim().length < 5) return setErr('Enter your CAC registration number.')
    saveKyc({ tin: f2.tin.trim(), cacNumber: f2.cacNumber.trim(), s2At: loadKyc().s2At || now() })
    pushStages(businessId)
    setErr(''); setEditing(0); setOpen(next); refresh()
  }

  async function pick(kind, file) {
    setErr(''); setBusy(true)
    try {
      const doc = await prepareDocument(file)
      if (!saveDoc(kind, doc)) setErr('This phone has no space left to keep that file. Free some space and try again.')
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false); refresh()
  }

  async function submit() {
    if (!window.confirm('Send your documents for review? After this, changes go through customer support.')) return
    setErr(''); setBusy(true)
    if (cloudOn(businessId)) {
      const r = await submitToCloud(businessId)
      if (!r.ok) {
        setBusy(false)
        setErr(r.error || 'Could not send. Check your internet and try again.')
        return
      }
    }
    submitKyc()
    setBusy(false); setOpen(0); refresh()
  }

  function statusOf(n) {
    if (n === 3 && st.verified) return { label: 'Verified', cls: 'ok', done: true }
    if (n === 3 && st.s3) return { label: 'Under review', cls: 'warn', done: true }
    if ((n === 1 && st.s1) || (n === 2 && st.s2)) return { label: 'Done', cls: 'ok', done: true }
    if (active === n) return { label: 'In progress', cls: 'warn', done: false }
    return { label: 'Not started', cls: '', done: false }
  }

  const header = st.verified
    ? { text: 'Verified', cls: 'ok' }
    : st.s3 ? { text: 'Under review', cls: 'warn' } : { text: 'In progress', cls: 'warn' }

  function docSlot(kind, label) {
    const meta = docMeta(kind)
    return (
      <div className="row" key={kind}>
        <span>
          {label}
          <div className="kyc-small">{meta ? '✓ Uploaded ' + day(meta.at) + ' · kept private' : 'Not uploaded yet'}</div>
        </span>
        <label className="kyc-upload">
          {meta ? 'Replace' : 'Upload'}
          <input
            type="file" accept="image/*,application/pdf" hidden disabled={busy}
            onChange={e => { pick(kind, e.target.files[0]); e.target.value = '' }}
          />
        </label>
      </div>
    )
  }

  return (
    <div>
      <div className="kyc-top">
        <div className="kyc-topline">
          <h3>Business verification</h3>
          <span className={'pill ' + header.cls}>{header.text}</span>
        </div>
        <div className="bar"><div className="barfill" style={{ width: Math.round((st.level / 3) * 100) + '%' }} /></div>
        <p>
          {st.verified
            ? 'Your business is verified.'
            : st.s3
              ? 'Your documents were sent on ' + day(k.s3At) + '. Review takes up to 7 working days.'
              : `${st.level} of 3 steps done. You can stop at any point and continue later. Nothing here stops you from selling.`}
        </p>
      </div>

      {k.reviewNote && !st.s3 && (
        <div style={{ margin: '8px 0', padding: 12, border: '1px solid #fca5a5', borderRadius: 12, background: '#fef2f2', color: '#7f1d1d' }}>
          <b>Changes needed</b>
          <p>{k.reviewNote}</p>
          <p>Fix this below and submit again, or contact customer support.</p>
        </div>
      )}

      {st.verified && (
        <div className="kyc-verified">
          <h4>KYC 1: verified business details</h4>
          <Rows rows={[
            ['Business name', b.name], ['Address', b.address], ['Hotline', b.hotline],
            ['Email', b.email], ['Social media', k.social]
          ]} />
          <h4>KYC 2</h4>
          <Rows rows={[['TIN', mask(k.tin)], ['CAC number', mask(k.cacNumber)]]} />
        </div>
      )}

      <Task n={1} title="Business details" note="Name, address, hotline, email or social media"
        status={statusOf(1)} open={open === 1} onToggle={() => go(1)}>
        {st.s1 && editing !== 1 ? (
          <>
            <Rows rows={[
              ['Business name', b.name], ['Address', b.address], ['Hotline', b.hotline],
              ['Email', b.email], ['Social media', k.social]
            ]} />
            {locked ? <Support /> : <button type="button" className="small" onClick={() => setEditing(1)}>Edit</button>}
          </>
        ) : (
          <>
            <label>Business name (printed on receipts)
              <input name="name" value={f1.name} onChange={change1} />
            </label>
            <label>Business address (printed on receipts)
              <input name="address" value={f1.address} onChange={change1} />
            </label>
            <div className="grid2">
              <label>Hotline
                <input name="hotline" value={f1.hotline} onChange={change1} />
              </label>
              <label>Email address
                <input name="email" type="email" value={f1.email} onChange={change1} />
              </label>
            </div>
            <label>Social media page (Facebook, Instagram, WhatsApp link). Needed if you have no email
              <input name="social" value={f1.social} onChange={change1} />
            </label>
            {err && open === 1 && <p className="auth-error">{err}</p>}
            <div className="rai-row">
              <button type="button" onClick={() => save1(2)}>Save and continue</button>
              <button type="button" className="small ghost" onClick={() => save1(0)}>Save, continue later</button>
            </div>
          </>
        )}
      </Task>

      <Task n={2} title="TIN and CAC number" note="Saved, then you move to documents"
        status={statusOf(2)} open={open === 2} onToggle={() => go(2)}>
        {!st.s1 ? (
          <p className="kyc-note">Finish KYC 1 first.</p>
        ) : st.s2 && editing !== 2 ? (
          <>
            <Rows rows={[['TIN', mask(k.tin)], ['CAC registration number', mask(k.cacNumber)]]} />
            {locked ? <Support /> : <button type="button" className="small" onClick={() => setEditing(2)}>Edit</button>}
          </>
        ) : (
          <>
            <label>Tax Identification Number (TIN)
              <input name="tin" value={f2.tin} onChange={change2} />
            </label>
            <label>CAC registration number
              <input name="cacNumber" value={f2.cacNumber} onChange={change2} />
            </label>
            {err && open === 2 && <p className="auth-error">{err}</p>}
            <div className="rai-row">
              <button type="button" onClick={() => save2(3)}>Save and continue</button>
              <button type="button" className="small ghost" onClick={() => save2(0)}>Save, continue later</button>
            </div>
          </>
        )}
      </Task>

      <Task n={3} title="Documents" note="CAC certificate and TIN certificate, reviewed in up to 7 working days"
        status={statusOf(3)} open={open === 3} onToggle={() => go(3)}>
        {!st.s2 ? (
          <p className="kyc-note">Finish KYC 2 first.</p>
        ) : st.s3 ? (
          <>
            <p>Both documents were received on {day(k.s3At)}. They are kept private and are not shown in the app.</p>
            {!st.verified && <p>Review takes up to 7 working days.</p>}
            <Support />
          </>
        ) : (
          <>
            <p>Upload a clear photo or PDF of each official document. They are kept private and never shown in the app.</p>
            {docSlot('cac', 'CAC certificate of registration')}
            {docSlot('tin', 'TIN certificate (Joint Tax Board)')}
            {err && open === 3 && <p className="auth-error">{err}</p>}
            <button type="button" className="big" disabled={!(docMeta('cac') && docMeta('tin')) || busy} onClick={submit}>
              {busy ? 'Please wait...' : 'Submit for review'}
            </button>
          </>
        )}
      </Task>

      {testMode() && st.s3 && !st.verified && (
        <button type="button" className="small ghost" onClick={() => { markVerified(); refresh() }}>
          Test mode: mark as verified
        </button>
      )}
    </div>
  )
}
