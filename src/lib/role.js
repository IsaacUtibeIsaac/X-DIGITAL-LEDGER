const KEY = 'dl_test_role'

export const ROLES = ['Owner', 'Manager', 'Cashier']

export function getRole() {
  try {
    return localStorage.getItem(KEY) || 'Manager'
  } catch {
    return 'Manager'
  }
}

export function setRole(r) {
  try { localStorage.setItem(KEY, r) } catch {}
}
