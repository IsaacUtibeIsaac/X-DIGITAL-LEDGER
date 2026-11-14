import { loadBusiness } from './businessStore.js'
import { kycStatus } from './kycStore.js'

// Owner dashboard: status only. No KYC details are ever shown here.
export default function KycBanner({ onOpen }) {
  const { level } = kycStatus(loadBusiness())
  if (level >= 2) return null
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        width: '100%', textAlign: 'left', padding: 12, margin: '8px 0',
        borderRadius: 10, border: '1px solid #c9a227', background: '#fff8e6', color: '#0b2a5b'
      }}
    >
      Complete your verification: KYC level {level} of 3. Tap to continue.
    </button>
  )
}
