// ImageMatch: front-of-pack matcher with no extra libraries.
// A photo becomes a short list of numbers:
//   - a colour histogram (12 hue bins + 3 bins for white/grey/black), and
//   - a coarse 3 x 3 layout of average colour.
// A new photo is compared with the saved ones and the closest products are suggested.
// Look-alike packs can be confused, so the cashier always confirms.

const GRID = 3
const HUE_BINS = 12
const MAX_PHOTOS = 3
const r3 = n => Math.round(n * 1000) / 1000

export const MAX_PHOTOS_PER_ITEM = MAX_PHOTOS

// rgba: flat RGBA pixel array, w and h: its size. Uses the middle 80% to ignore the background.
export function signatureFromPixels(rgba, w, h) {
  const x0 = Math.floor(w * 0.1)
  const x1 = Math.ceil(w * 0.9)
  const y0 = Math.floor(h * 0.1)
  const y1 = Math.ceil(h * 0.9)
  const hist = new Array(HUE_BINS + 3).fill(0)
  const cells = Array.from({ length: GRID * GRID }, () => [0, 0, 0, 0])
  let n = 0
  let lum = 0

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4
      const r = rgba[i]
      const g = rgba[i + 1]
      const b = rgba[i + 2]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const v = max / 255
      const s = max === 0 ? 0 : (max - min) / max
      let bin
      if (s < 0.2) {
        bin = HUE_BINS + (v < 0.33 ? 0 : v < 0.66 ? 1 : 2)
      } else {
        const d = max - min
        let hue
        if (max === r) hue = ((g - b) / d) % 6
        else if (max === g) hue = (b - r) / d + 2
        else hue = (r - g) / d + 4
        hue = (hue * 60 + 360) % 360
        bin = Math.min(HUE_BINS - 1, Math.floor((hue / 360) * HUE_BINS))
      }
      hist[bin]++
      const cx = Math.min(GRID - 1, Math.floor(((x - x0) / (x1 - x0)) * GRID))
      const cy = Math.min(GRID - 1, Math.floor(((y - y0) / (y1 - y0)) * GRID))
      const c = cells[cy * GRID + cx]
      c[0] += r; c[1] += g; c[2] += b; c[3]++
      lum += 0.299 * r + 0.587 * g + 0.114 * b
      n++
    }
  }

  const meanLum = n ? lum / n || 1 : 1
  const layout = []
  cells.forEach(c => {
    for (let k = 0; k < 3; k++) {
      // Divide by the photo's overall brightness so a darker or brighter photo still matches.
      const v = c[3] ? c[k] / c[3] / meanLum : 0
      layout.push(r3(Math.min(2, v) / 2))
    }
  })
  return { v: 1, h: hist.map(x => r3(n ? x / n : 0)), l: layout }
}

// 0 to 1, higher = more alike
export function compareSignatures(a, b) {
  if (!a || !b || !a.h || !b.h || a.h.length !== b.h.length) return 0
  let inter = 0
  for (let i = 0; i < a.h.length; i++) inter += Math.min(a.h[i], b.h[i])
  let diff = 0
  for (let i = 0; i < a.l.length; i++) diff += Math.abs(a.l[i] - b.l[i])
  const layoutSim = Math.max(0, 1 - 4 * (diff / a.l.length))
  return 0.6 * inter + 0.4 * layoutSim
}

// products that have saved photos (imgSigs), best first
export function suggestProducts(sig, products, limit = 4) {
  return products
    .filter(p => Array.isArray(p.imgSigs) && p.imgSigs.length > 0)
    .map(p => ({
      product: p,
      score: Math.max(...p.imgSigs.map(s => compareSignatures(sig, s)))
    }))
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
}

// ---- browser part: photo file to signature (the photo itself is never kept) ----
const SIZE = 64

export function imageToSignature(img) {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, SIZE, SIZE)
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE)
  return signatureFromPixels(data, SIZE, SIZE)
}

export function fileToSignature(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try { resolve(imageToSignature(img)) } catch (e) { reject(e) }
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read the photo'))
    }
    img.src = url
  })
}
