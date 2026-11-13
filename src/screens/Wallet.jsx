import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { loadSettings, saveSettings } from '../features/settings/settingsStore.js'
import { loadWallet, pendingFees, FEE } from '../features/wallet/walletStore.js'

const naira = n => '₦' + Math.round(Number(n) || 0).toLocaleString()

const KIND = {
  topup: 'Top-up',
  receipt_fee: 'Receipt fee',
  rebate: 'Monthly rebate',
  reward: 'Reward',
  adjustment: 'Adjustment'
}

const RULES = [
  {
    value: 'no_receipt',
    title: 'Stop receipts',
    text: 'Sales continue. Receipts switch off until you top up.'
  },
  {
    value: 'debt',
    title: 'Keep issuing receipts',
    text: 'Receipts continue and the fee is owed. The balance goes below zero until you top up.'
  }
]

// Owner only: the receipt wallet.
export default function Wallet({ businessId }) {
  const cached = loadWallet()
  const [balance, setBalance] = useState(cached ? cached.balance : null)
  const [entries, setEntries] = useState([])
  const [error, setError] = useState('')
  const [rule, setRule] = useState(loadSettings().emptyWalletRule || 'no_receipt')
  const [copied, setCopied] = useState(false)

  async function load() {
    if (!supabase || !businessId) return
    setError('')
    const w = await supabase.from('wallets').select('balance').eq('business_id', businessId).maybeSingle()
    if (w.error) setError(w.error.message)
    else if (w.data) setBalance(Number(w.data.balance))
    const e = await supabase
      .from('wallet_entries')
      .select('id, kind, amount, ref, note, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (!e.error) setEntries(e.data || [])
  }

  useEffect(() => { load() }, [businessId])

  function chooseRule(value) {
    setRule(value)
    saveSettings({ emptyWalletRule: value })
  }

  async function copyId() {
    try {
      await navigator.clipboard.writeText(businessId)
      setCopied(true)
    } catch {}
  }

  const waiting = pendingFees()

  return (
    <div className="screen">
      <h2>Receipt wallet</h2>
      <p>Each receipt issued costs {naira(FEE)}, taken from this wallet.</p>

      <div className="rai-card">
        <h3>Balance</h3>
        <div className="wallet-balance">{balance === null ? '...' : naira(balance)}</div>
        {waiting > 0 && (
          <p className="rai-lock">
            {waiting} receipt fee(s) on this phone are waiting to be charged ({naira(waiting * FEE)}).
          </p>
        )}
        <button type="button" className="small" onClick={load}>Refresh</button>
        {error && <p className="auth-error">{error}</p>}
      </div>

      <div className="rai-card">
        <h3>How to top up</h3>
        <p>Pay by bank transfer, or give cash to your Winfieldtec marketer, and send us your Business ID so we can credit the right wallet. Online top-up is coming.</p>
        <div className="invite-code small-code">{businessId}</div>
        <button type="button" onClick={copyId}>{copied ? 'Copied' : 'Copy Business ID'}</button>
      </div>

      <div className="rai-card">
        <h3>When the wallet is empty</h3>
        {RULES.map(r => (
          <label key={r.value} className="rule-option">
            <input
              type="radio"
              name="emptyRule"
              checked={rule === r.value}
              onChange={() => chooseRule(r.value)}
            />
            <span><b>{r.title}</b><br />{r.text}</span>
          </label>
        ))}
      </div>

      <h3>Recent activity</h3>
      {entries.length === 0 && <p className="rai-lock">Nothing yet.</p>}
      {entries.map(x => (
        <div key={x.id} className="row">
          <span>
            <b>{KIND[x.kind] || x.kind}</b>
            <div>{new Date(x.created_at).toLocaleString()}{x.note ? ' · ' + x.note : ''}</div>
          </span>
          <b>{Number(x.amount) > 0 ? '+' : ''}{naira(x.amount)}</b>
        </div>
      ))}
    </div>
  )
}
