
const navIcons = {
  Dashboard: '▦',
  Sales: '＋',
  Inventory: '▤',
  Customers: '♙',
  Suppliers: '⇄',
  Requests: '☷',
  Receipts: '▧',
  Reports: '▥',
  RAI: '✦'
}

export default function BottomNav({
  tab,
  setTab,
  names,
  collapsed = false,
  mobileOpen = false,
  onNavigate
}) {
  const navClass = [
    'app-nav',
    collapsed ? 'is-collapsed' : '',
    mobileOpen ? 'mobile-open' : ''
  ].filter(Boolean).join(' ')

  return (
    <nav className={navClass} aria-label="Main navigation">

      <div className="nav-brand">
        <span className="nav-brand-mark">DL</span>
        <span className="nav-brand-name">Digital Ledger</span>
      </div>

      <div className="nav-section-label">
        WORKSPACE
      </div>

      <div className="nav-items">
        {names.map(name => (
          <button
            key={name}
            type="button"
            className={`nav-item ${name === tab ? 'active' : ''}`}
            onClick={() => {
              setTab(name)
              onNavigate?.()
            }}
            aria-current={name === tab ? 'page' : undefined}
            title={collapsed ? name : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              {navIcons[name] || '•'}
            </span>

            <span className="nav-label">
              {name}
            </span>
          </button>
        ))}
      </div>

      <div className="nav-footer-note">
        <span>Business workspace</span>
      </div>

    </nav>
  )
}
