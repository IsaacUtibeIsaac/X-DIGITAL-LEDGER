import { kycStatus } from './kycStore.js'

// Owner dashboard: status only. No KYC details are ever shown here.
export default function KycBanner({ onOpen }) {
  const { level, state } = kycStatus()
  if (state === 'verified') return null
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        width: '100%', textAlign: 'left', padding: 12, margin: '8px 0',
        borderRadius: 10, border: '1px solid #c9a227', background: '#fff8e6', color: '#0b2a5b'
      }}
    >
      {state === 'review'
        ? 'Your verification is under review. Tap to see the status.'
        : `Complete your verification: ${level} of 3 steps done. Tap to continue.`}
    </button>
  )
}
