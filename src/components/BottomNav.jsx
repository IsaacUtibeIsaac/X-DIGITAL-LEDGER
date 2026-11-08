
const navMeta = {
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
  onNavigate
}) {
  return (
    <nav
      className={`app-nav ${collapsed ? 'is-collapsed' : ''}`}
      aria-label="Main navigation"
    >
      <div className="nav-section-label">
        WORKSPACE
      </div>

      {names.map(name => {
        const icon = navMeta[name] || '•'

        return (
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
              {icon}
            </span>

            <span className="nav-label">
              {name}
            </span>
          </button>
        )
      })}

      <div className="nav-footer-note">
        Digital Ledger
        <br />
        <span>Business workspace</span>
      </div>
    </nav>
  )
}
