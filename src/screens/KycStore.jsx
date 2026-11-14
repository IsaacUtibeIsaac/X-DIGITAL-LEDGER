import AccountReview from '../features/business/AccountReview.jsx'
import BusinessProfile from '../features/business/BusinessProfile.jsx'

// Owner only. The KYC pieces that used to sit on the dashboard live here.
export default function KycStore() {
  return (
    <div className="screen">
      <h2>KYC Store</h2>
      <p>Verify your business step by step. Nothing here stops you from selling.</p>
      <AccountReview />
      <BusinessProfile />
    </div>
  )
}
