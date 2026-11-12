// Small status chip in the top bar. Tap it to sync right now.
export default function SyncStatus({ status, onClick }) {
  let text = ''
  let tone = 'idle'

  if (status.state === 'syncing') { text = 'Syncing...'; tone = 'busy' }
  else if (status.state === 'synced') {
    const t = new Date(status.at)
    text = 'Synced ' + t.getHours().toString().padStart(2, '0') + ':' + t.getMinutes().toString().padStart(2, '0')
    tone = 'ok'
  } else if (status.state === 'offline') { text = 'Offline, saved on this phone'; tone = 'warn' }
  else if (status.state === 'error') { text = 'Sync problem'; tone = 'bad' }
  else return null

  return (
    <button
      type="button"
      className={'sync-chip ' + tone}
      onClick={onClick}
      title={status.message || 'Tap to sync now'}
    >
      {text}
    </button>
  )
}
