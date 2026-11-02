import { accountSummary } from './kycStore.js'

export default function AccountReview() {
  const { kyc, stages, metrics } = accountSummary()
  const next = kyc.level === 0 ? kyc.l1Missing : kyc.level === 1 ? kyc.l2Missing : []

  return (
    <div>
      <h3>Account review</h3>
      <p>
        KYC level {kyc.level} of 3.
        {kyc.level === 2 && ' Level 3 (documents checked by Digital Ledger staff) comes once accounts are stored in the cloud.'}
      </p>
      <div className="bar"><div className="barfill" style={{ width: Math.round((kyc.level / 3) * 100) + '%' }} /></div>
      {next.length > 0 && (
        <p>To reach level {kyc.level + 1}, fill in: {next.join(', ')}.</p>
      )}

      <h4>Account journey</h4>
      {stages.map(s => (
        <div key={s.label} className="row">
          <span>{s.done ? '✓' : '○'} {s.label}</span>
          <span>{s.done && s.at ? new Date(s.at).toLocaleDateString() : ''}</span>
        </div>
      ))}

      <h4>Account activity</h4>
      {metrics.map(([label, value]) => (
        <div key={label} className="row"><span>{label}</span><span>{value}</span></div>
      ))}
    </div>
  )
}
