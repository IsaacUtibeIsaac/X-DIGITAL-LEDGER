import { accountSummary } from './kycStore.js'
import ShowMoreList from '../../components/ShowMoreList.jsx'

export default function AccountReview() {
  const { stages, metrics } = accountSummary()

  return (
    <div>
      <h4>Account journey</h4>
      {stages.map(s => (
        <div key={s.label} className="row">
          <span>{s.done ? '✓' : '○'} {s.label}</span>
          <span>{s.done && s.at ? new Date(s.at).toLocaleDateString() : ''}</span>
        </div>
      ))}

      <h4>Account activity</h4>
      <ShowMoreList
        items={metrics}
        render={([label, value]) => (
          <div key={label} className="row"><span>{label}</span><span>{value}</span></div>
        )}
      />
    </div>
  )
}
