import { supabase } from '../lib/supabase.js'
import BusinessProfile from '../features/business/BusinessProfile.jsx'
import ReceiptSettings from '../features/settings/ReceiptSettings.jsx'

export default function Home() {
  return (
    <div className="screen">
      <h2>Dashboard</h2>
      <p>Today's summary will appear here.</p>
      <BusinessProfile />
      <ReceiptSettings />
      <button onClick={() => supabase && supabase.auth.signOut()}>Sign out</button>
    </div>
  )
}
