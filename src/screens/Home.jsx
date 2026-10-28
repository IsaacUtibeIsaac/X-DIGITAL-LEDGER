import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { ROLES, getRole, setRole } from '../lib/role.js'

export default function Home() {
  const [role, setRoleState] = useState(getRole())

  function change(e) {
    setRole(e.target.value)
    setRoleState(e.target.value)
  }

  return (
    <div className="screen">
      <h2>Dashboard</h2>
      <p>Today's summary will appear here.</p>
      <label>Testing as (temporary)
        <select value={role} onChange={change}>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      <button onClick={() => supabase && supabase.auth.signOut()}>Sign out</button>
    </div>
  )
}
