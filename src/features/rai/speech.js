// RAI speaks its replies using the phone's built-in voice (no cost, no internet needed on most phones).
const KEY = 'dl_rai_voice'

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function voiceRepliesOn() {
  try { return localStorage.getItem(KEY) === 'on' } catch { return false }
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel()
}

export function setVoiceReplies(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch {}
  if (!on) stopSpeaking()
}

export function speak(lines) {
  if (!canSpeak()) return
  const text = (Array.isArray(lines) ? lines : [lines])
    .join('. ')
    .replace(/₦\s?([\d,.]+)/g, '$1 naira')
    .replace(/•/g, '')
  if (!text.trim()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-NG'
  const voices = synth.getVoices()
  const v = voices.find(x => x.lang === 'en-NG') || voices.find(x => x.lang && x.lang.startsWith('en'))
  if (v) u.voice = v
  synth.speak(u)
}
