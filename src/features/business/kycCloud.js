import { supabase, supabaseReady } from '../../lib/supabase.js'
import { loadKyc, saveKyc, docForUpload, markDocUploaded } from './kycStore.js'

const BUCKET = 'kyc-documents'

// Cloud is used when the real login is on (not test mode) and we know the business.
export function cloudOn(businessId) {
  try {
    if (localStorage.getItem('dl_force_test') === '1') return false
  } catch {}
  return Boolean(supabaseReady && supabase && businessId)
}

export async function pushStages(businessId) {
  if (!cloudOn(businessId)) return { ok: true }
  const k = loadKyc()
  const { error } = await supabase.rpc('kyc_save', {
    p_business: businessId,
    p_social: k.social,
    p_tin: k.tin,
    p_cac: k.cacNumber,
    p_s1: k.s1At || null,
    p_s2: k.s2At || null
  })
  return { ok: !error, error: error ? error.message : '' }
}

async function uploadOne(businessId, kind) {
  const doc = docForUpload(kind)
  if (!doc) return { ok: true } // nothing new on this phone, so it was uploaded before
  const ext = doc.type === 'application/pdf' ? 'pdf' : 'jpg'
  const storage = supabase.storage.from(BUCKET)
  await storage.remove([`${businessId}/${kind}.jpg`, `${businessId}/${kind}.pdf`])
  const blob = await (await fetch(doc.data)).blob()
  const { error } = await storage.upload(`${businessId}/${kind}.${ext}`, blob, {
    upsert: true,
    contentType: doc.type
  })
  if (error) return { ok: false, error: error.message }
  markDocUploaded(kind) // frees the copy kept on this phone
  return { ok: true }
}

export async function submitToCloud(businessId) {
  const saved = await pushStages(businessId)
  if (!saved.ok) return saved
  for (const kind of ['cac', 'tin']) {
    const r = await uploadOne(businessId, kind)
    if (!r.ok) return r
  }
  const { error } = await supabase.rpc('kyc_submit', { p_business: businessId })
  return { ok: !error, error: error ? error.message : '' }
}

// Reads the review result from the server. Returns true if anything on this phone changed.
export async function pullStatus(businessId) {
  if (!cloudOn(businessId)) return false
  const { data, error } = await supabase
    .from('kyc_records')
    .select('status, review_note, submitted_at, reviewed_at, social, tin, cac_number, s1_at, s2_at')
    .eq('business_id', businessId)
    .maybeSingle()
  if (error || !data) return false

  const k = loadKyc()
  const patch = {}
  // A second phone starts empty, so fill gaps from the server
  if (!k.social && data.social) patch.social = data.social
  if (!k.tin && data.tin) patch.tin = data.tin
  if (!k.cacNumber && data.cac_number) patch.cacNumber = data.cac_number
  if (!k.s1At && data.s1_at) patch.s1At = data.s1_at
  if (!k.s2At && data.s2_at) patch.s2At = data.s2_at

  if (data.status === 'verified' || data.status === 'review') {
    patch.s3At = data.submitted_at || k.s3At
    patch.verifiedAt = data.status === 'verified' ? (data.reviewed_at || new Date().toISOString()) : ''
    patch.reviewNote = ''
    markDocUploaded('cac', data.submitted_at)
    markDocUploaded('tin', data.submitted_at)
  } else if (data.status === 'changes') {
    patch.s3At = ''
    patch.verifiedAt = ''
    patch.reviewNote = data.review_note || 'Please check your details and documents.'
  }

  const changed = Object.keys(patch).some(key => (k[key] || '') !== (patch[key] || ''))
  if (changed) saveKyc(patch)
  return changed
}
