import { supabase } from '../lib/supabase.js'
import DlComms from '../features/comms/DlComms.jsx'

// Official communication: owner and manager, manager and cashier.
// Messages belong to the person who is signed in, not to the role being viewed.
export default function Messages({ businessId, viewRole, realRole }) {
  if (!businessId) {
    return (
      <div>
        <h2>Messages</h2>
        <p className="rai-lock">
          Official messages need a signed-in account in a business. Test mode has no account, so there is nothing to show here.
        </p>
      </div>
    )
  }

  return (
    <div>
      {realRole && viewRole && realRole !== viewRole && (
        <p className="rai-lock">You are viewing as {viewRole}. Messages always belong to you, as {realRole}.</p>
      )}
      <DlComms supabase={supabase} businessId={businessId} />
    </div>
  )
}
