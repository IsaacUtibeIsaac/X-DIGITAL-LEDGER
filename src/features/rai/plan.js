// Free vs Subscribed. Change a value to true/false to move an ability between plans.
// true  = needs a subscription
// false = free for everyone
const KEY = 'dl_plan'

const NEEDS_SUBSCRIPTION = {
  reminders: false,
  suggestions: false,
  typedQuestions: true,
  voiceInput: true,
  voiceReplies: true,
  conversation: true
}

export function isSubscribed() {
  try { return localStorage.getItem(KEY) === 'subscribed' } catch { return false }
}

// For the pilot this is a test switch. Real billing replaces it later.
export function setSubscribed(on) {
  try { localStorage.setItem(KEY, on ? 'subscribed' : 'free') } catch {}
}

export function can(feature) {
  return !NEEDS_SUBSCRIPTION[feature] || isSubscribed()
}
