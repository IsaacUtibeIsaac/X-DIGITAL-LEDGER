import { useState } from 'react'

// Test data lives on this phone only. Download a backup to keep it safe or to share it.
export default function BackupTools() {
  const [note, setNote] = useState('')

  function exportData() {
    const data = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('dl_')) data[k] = localStorage.getItem(k)
    }
    const text = JSON.stringify({ app: 'digital-ledger', exportedAt: new Date().toISOString(), data }, null, 2)
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'digital-ledger-backup-' + new Date().toISOString().slice(0, 10) + '.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1500)
    setNote('Backup downloaded.')
  }

  function importData(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        if (parsed.app !== 'digital-ledger') throw new Error('bad file')
        if (!window.confirm('This replaces the data on this phone with the backup. Continue?')) return
        Object.keys(parsed.data).forEach(k => {
          if (k.startsWith('dl_')) localStorage.setItem(k, parsed.data[k])
        })
        setNote('Backup restored. Close and reopen the app.')
      } catch {
        setNote('That file is not a valid Digital Ledger backup.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div>
      <h3>Backup</h3>
      <p>Your data is stored on this phone. Download a backup regularly.</p>
      <button onClick={exportData}>Download backup</button>
      <label>Restore from a backup file
        <input type="file" accept="application/json,.json" onChange={importData} />
      </label>
      {note && <p>{note}</p>}
    </div>
  )
}
