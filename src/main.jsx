import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

class Boundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <pre style={{ padding: 16, whiteSpace: 'pre-wrap' }}>
          {String(this.state.error.stack || this.state.error)}
        </pre>
      )
    }
    return this.props.children
  }
}

const root = document.getElementById('root')

import('./App.jsx')
  .then(m => {
    const App = m.default
    createRoot(root).render(
      <Boundary>
        <App />
      </Boundary>
    )
  })
  .catch(err => {
    root.innerHTML =
      '<pre style="padding:16px;white-space:pre-wrap">' +
      String(err && err.stack ? err.stack : err) +
      '</pre>'
  })
