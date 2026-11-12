import { supabase } from './supabase.js'
import { sync } from './syncInstance.js'

// Everything the app asks Supabase about who you are and who works in your business.

export async function fetchMembership(userId) {
  const { data, error } = await supabase
    .from('members')
    .select('business_id, role, display_name, active, businesses(name)')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return { error }
  if (!data) return { membership: null }
  return {
    membership: {
      business_id: data.business_id,
      role: data.role,
      display_name: data.display_name || '',
      active: data.active,
      business_name: data.businesses ? data.businesses.name : ''
    }
  }
}

export async function createBusiness(name, displayName) {
  const { error } = await supabase.rpc('create_business', { p_name: name, p_display_name: displayName })
  return { error }
}

export async function acceptInvite(code, displayName) {
  const { error } = await supabase.rpc('accept_invite', { p_code: code, p_display_name: displayName })
  return { error }
}

export async function createInvite(businessId, role) {
  const { data, error } = await supabase.rpc('create_invite', { p_business: businessId, p_role: role })
  return { code: data, error }
}

export async function loadStaff(businessId) {
  const members = await supabase
    .from('members')
    .select('user_id, role, display_name, email, active, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: true })
  const invites = await supabase
    .from('invites')
    .select('code, role, expires_at, used_at')
    .eq('business_id', businessId)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  return {
    members: members.data || [],
    invites: invites.data || [],
    error: members.error || invites.error || null
  }
}

export async function setMemberActive(businessId, userId, active) {
  const { error } = await supabase.rpc('set_member_active', {
    p_business: businessId, p_user: userId, p_active: active
  })
  return { error }
}

// Uploads anything not yet saved, then signs out and clears this phone's shop data
// so the next person who signs in cannot see it.
export async function signOutAndWipe(role) {
  if (sync) {
    try { await sync.runOnce(role) } catch {}
    const left = sync.pendingCount(role)
    if (left > 0) {
      const sure = window.confirm(
        `${left} change(s) on this phone have not been saved online yet. Signing out will lose them. Sign out anyway?`
      )
      if (!sure) return { cancelled: true }
    }
    sync.wipeData()
  }
  try { localStorage.removeItem('dl_cashier_name') } catch {}
  await supabase.auth.signOut()
  return { cancelled: false }
}
