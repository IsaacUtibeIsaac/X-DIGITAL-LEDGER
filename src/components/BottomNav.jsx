const navMeta = {
  Dashboard: ['▦', 'Overview'],
  Sales: ['＋', 'Point of sale'],
  Inventory: ['▤', 'Stock & products'],
  Customers: ['♙', 'Customers'],
  Suppliers: ['⇄', 'Suppliers'],
  Requests: ['☷', 'Item requests'],
  Receipts: ['▧', 'Receipts'],
  Reports: ['▥', 'Reports'],
  RAI: ['✦', 'Ledger assistant']
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
        const [icon, label] = navMeta[name] || ['•', name]

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
            title={collapsed ? label : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              {icon}
            </span>

            <span className="nav-label">
              <span>{name}</span>
              <small>{label}</small>
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
