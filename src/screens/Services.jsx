import { SERVICES } from '../features/services/serviceList.js'

// Owner only. Locked services stay visible so merchants know what is coming.
export default function Services() {
  return (
    <div className="screen">
      <h2>Services</h2>
      <p>More ways Digital Ledger can help your business.</p>
      {SERVICES.map(s => (
        <div key={s.id} className={'svc-card' + (s.unlocked ? '' : ' locked')}>
          <span className="svc-icon" aria-hidden="true">{s.unlocked ? '✓' : '🔒'}</span>
          <div>
            <b>{s.title}</b>
            <div>{s.blurb}</div>
            {!s.unlocked && <span className="pill">Coming soon, pending authorisation</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
