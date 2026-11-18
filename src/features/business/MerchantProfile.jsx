import KycTasks from './KycTasks.jsx'
import AccountReview from './AccountReview.jsx'

// Owner only. The KYC process lives inside the merchant profile.
export default function MerchantProfile() {
  return (
    <div className="profile-section">
      <h3>Merchant profile</h3>
      <KycTasks />
      <AccountReview />
    </div>
  )
}
