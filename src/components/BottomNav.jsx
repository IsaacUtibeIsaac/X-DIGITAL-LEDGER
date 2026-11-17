// Main navigation menu.
// Props (all supplied by App.jsx):
//   tab         the screen that is open now
//   setTab      call with a screen name to open it
//   names       the screens this role may open, in order
//   collapsed   true = icons only (computers and tablets)
//   mobileOpen  true = the menu drawer is open (phones)
//   onNavigate  called after a screen is chosen (closes the phone drawer)
//   badges      optional counts to show beside a screen, for example { Messages: 3 }

const navIcons = {
  Dashboard: '▦',
  Sales: '＋',
  Inventory: '▤',
  Customers: '♙',
  Suppliers: '⇄',
  Requests: '☷',
  Receipts: '▧',
  Reports: '▥',
  Staff: '☺',
  Messages: '✉',
  Wallet: '₦',
  Security: '⛨',
  'KYC Store': '✓',
  XDL: '◈',
  RAI: '✦'
}

const badgeStyle = {
  marginLeft: 'auto',
  minWidth: 18,
  padding: '0 6px',
  borderRadius: 9,
  background: '#c0392b',
  color: '#fff',
  fontSize: 11,
  lineHeight: '18px',
  textAlign: 'center'
}

export default function BottomNav({
  tab,
  setTab,
  names = [],
  collapsed = false,
  mobileOpen = false,
  onNavigate,
  badges = {}
}) {
  const navClass = [
    'app-nav',
    collapsed ? 'is-collapsed' : '',
    mobileOpen ? 'mobile-open' : ''
  ].filter(Boolean).join(' ')

  function choose(name) {
    setTab(name)
    if (onNavigate) onNavigate()
  }

  return (
    <nav className={navClass} aria-label="Main navigation">
      <div className="nav-brand">
        <span className="nav-brand-mark">DL</span>
        <span className="nav-brand-name">Digital Ledger</span>
      </div>

      <div className="nav-section-label">WORKSPACE</div>

      <div className="nav-items">
        {names.map(name => {
          const count = Number(badges[name]) || 0
          return (
            <button
              key={name}
              type="button"
              className={'nav-item' + (name === tab ? ' active' : '')}
              onClick={() => choose(name)}
              aria-current={name === tab ? 'page' : undefined}
              aria-label={count > 0 ? `${name}, ${count} waiting` : name}
              title={name}
            >
              <span className="nav-icon" aria-hidden="true">
                {navIcons[name] || '•'}
              </span>
              <span className="nav-label">{name}</span>
              {count > 0 && <span style={badgeStyle}>{count > 9 ? '9+' : count}</span>}
            </button>
          )
        })}
      </div>

      <div className="nav-footer-note">
        <span>Business workspace</span>
      </div>
    </nav>
  )
}
