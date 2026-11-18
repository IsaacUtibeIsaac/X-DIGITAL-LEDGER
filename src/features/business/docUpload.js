const MAX_PDF = 1.5 * 1024 * 1024
const MAX_SIDE = 1400

export function prepareDocument(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file chosen.'))
    const isPdf = file.type === 'application/pdf'
    if (!isPdf && !file.type.startsWith('image/')) {
      return reject(new Error('Choose a photo or a PDF.'))
    }
    const base = { name: file.name, type: isPdf ? 'application/pdf' : 'image/jpeg', at: new Date().toISOString() }

    if (isPdf) {
      if (file.size > MAX_PDF) return reject(new Error('That PDF is too big. Use a photo, or a PDF under 1.5 MB.'))
      const r = new FileReader()
      r.onload = () => resolve({ ...base, size: file.size, data: r.result })
      r.onerror = () => reject(new Error('Could not read that file.'))
      r.readAsDataURL(file)
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      const data = c.toDataURL('image/jpeg', 0.75)
      resolve({ ...base, size: data.length, data })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not open that image.'))
    }
    img.src = url
  })
}
