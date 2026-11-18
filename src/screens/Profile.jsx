import AccountProfile from '../features/profile/AccountProfile.jsx'
import MerchantProfile from '../features/business/MerchantProfile.jsx'

// Everyone: account profile at the top.
// Owner only: the merchant profile (KYC and account activity) below it.
export default function Profile({ businessId, viewRole, realRole }) {
  return (
    <div className="screen">
      <h2>Profile</h2>
      <AccountProfile viewRole={viewRole} realRole={realRole} />
      {viewRole === 'Owner' && <MerchantProfile businessId={businessId} />}
    </div>
  )
}
