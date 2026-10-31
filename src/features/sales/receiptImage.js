import { nairaInWords } from '../../lib/numberWords.js'

// Receipt is drawn as an image: about 58 mm POS-paper width, gold background,
// faint blue Digital Ledger watermark. The same image is shown, printed and shared.
const W = 384
const SCALE = 2
const GOLD = '#f3d98b'
const INK = '#1f2937'
const SANS = 'Arial, Helvetica, sans-serif'
const SCRIPT = '"Brush Script MT", "Segoe Script", "Snell Roundhand", cursive'

function money(n) {
  return '₦' + Number(n).toLocaleString()
}

function wrap(ctx, text, maxWidth) {
  const words = String(text).split(' ')
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function dashed(ctx, y) {
  ctx.save()
  ctx.strokeStyle = '#6b5b1f'
  ctx.setLineDash([4, 3])
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(16, y)
  ctx.lineTo(W - 16, y)
  ctx.stroke()
  ctx.restore()
}

function drawContent(ctx, sale) {
  const M = 16
  const inner = W - M * 2
  const b = sale.business || {}
  const paid = sale.paid ?? sale.total
  let y = 16
  ctx.fillStyle = INK
  ctx.textBaseline = 'top'

  // Business name (registered with CAC)
  ctx.textAlign = 'center'
  ctx.font = 'bold 20px ' + SANS
  wrap(ctx, b.name || 'Business name not set', inner).forEach(l => {
    ctx.fillText(l, W / 2, y)
    y += 24
  })
  y += 6

  // Hotline and email on the left, address on the right
  ctx.font = '12px ' + SANS
  const leftLines = []
  if (b.hotline) leftLines.push(...wrap(ctx, 'Hotline: ' + b.hotline, inner * 0.55))
  if (b.email) leftLines.push(...wrap(ctx, b.email, inner * 0.55))
  const rightLines = b.address ? wrap(ctx, b.address, inner * 0.4) : []
  const rows = Math.max(leftLines.length, rightLines.length)
  ctx.textAlign = 'left'
  leftLines.forEach((l, i) => ctx.fillText(l, M, y + i * 15))
  ctx.textAlign = 'right'
  rightLines.forEach((l, i) => ctx.fillText(l, W - M, y + i * 15))
  y += rows * 15 + 8
  dashed(ctx, y)
  y += 8

  // Tracking ID, date and time
  ctx.textAlign = 'left'
  ctx.font = 'bold 12px ' + SANS
  ctx.fillText('Receipt ID: ' + (sale.trackingId || '-'), M, y)
  y += 16
  ctx.font = '12px ' + SANS
  ctx.fillText(new Date(sale.date).toLocaleString(), M, y)
  y += 20

  // Products
  const qtyX = M + inner * 0.62
  ctx.font = 'bold 12px ' + SANS
  ctx.textAlign = 'left'
  ctx.fillText('Product', M, y)
  ctx.textAlign = 'center'
  ctx.fillText('Qty', qtyX, y)
  ctx.textAlign = 'right'
  ctx.fillText('Amount', W - M, y)
  y += 16
  dashed(ctx, y)
  y += 6

  ctx.font = '12px ' + SANS
  sale.lines.forEach(l => {
    const label = l.name + (l.brand ? ' (' + l.brand + ')' : '') + ' · ' + l.unitName + ' @ ' + money(l.price)
    const parts = wrap(ctx, label, inner * 0.58)
    ctx.textAlign = 'left'
    parts.forEach((p, i) => ctx.fillText(p, M, y + i * 15))
    ctx.textAlign = 'center'
    ctx.fillText(String(l.qty), qtyX, y)
    ctx.textAlign = 'right'
    ctx.fillText(money(l.qty * l.price), W - M, y)
    y += parts.length * 15 + 4
  })
  y += 2
  dashed(ctx, y)
  y += 8

  // Totals, amount paid in figures and words
  ctx.font = 'bold 14px ' + SANS
  ctx.textAlign = 'left'
  ctx.fillText('Total', M, y)
  ctx.textAlign = 'right'
  ctx.fillText(money(sale.total), W - M, y)
  y += 20
  ctx.font = '12px ' + SANS
  ctx.textAlign = 'left'
  ctx.fillText('Amount paid', M, y)
  ctx.textAlign = 'right'
  ctx.fillText(money(paid), W - M, y)
  y += 16
  if (sale.change > 0) {
    ctx.textAlign = 'left'
    ctx.fillText('Change', M, y)
    ctx.textAlign = 'right'
    ctx.fillText(money(sale.change), W - M, y)
    y += 16
  }
  ctx.textAlign = 'left'
  ctx.font = 'italic 12px ' + SANS
  wrap(ctx, nairaInWords(paid), inner).forEach(l => {
    ctx.fillText(l, M, y)
    y += 15
  })
  y += 12

  // Cashier name and electronic signature at the bottom
  ctx.font = '12px ' + SANS
  ctx.textAlign = 'left'
  ctx.fillText('Cashier: ' + (sale.cashier || ''), M, y)
  y += 18
  ctx.font = '26px ' + SCRIPT
  ctx.fillText(sale.cashier || '', M, y)
  y += 32
  ctx.strokeStyle = INK
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(M, y)
  ctx.lineTo(M + 170, y)
  ctx.stroke()
  y += 4
  ctx.font = '11px ' + SANS
  ctx.fillText("Cashier's electronic signature", M, y)
  y += 28

  // Footer on the bottom edge, like a page number
  ctx.textAlign = 'center'
  ctx.fillStyle = '#1e3a8a'
  ctx.font = 'bold 11px ' + SANS
  ctx.fillText('DIGITAL LEDGER', W / 2, y)
  y += 14
  ctx.fillStyle = INK
  ctx.font = '11px ' + SANS
  ctx.fillText('Powered by Winfieldtec', W / 2, y)
  y += 14
  return y + 6
}

function drawWatermark(ctx, h, logo) {
  ctx.save()
  ctx.rotate(-Math.PI / 6)
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  ctx.font = 'bold 22px ' + SANS
  for (let yy = -h; yy < h * 2; yy += 64) {
    for (let xx = -W; xx < W * 2; xx += 250) {
      if (logo) {
        ctx.save()
        ctx.globalAlpha = 0.18
        ctx.globalCompositeOperation = 'multiply'
        ctx.drawImage(logo, xx, yy - 2, 26, 26)
        ctx.restore()
      }
      ctx.fillStyle = 'rgba(30, 64, 175, 0.11)'
      ctx.fillText('DIGITAL LEDGER', xx + 32, yy)
    }
  }
  ctx.restore()
}

function loadLogo() {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = '/pwa-192x192.png'
  })
}

export async function renderReceipt(sale) {
  const logo = await loadLogo()

  // First pass measures the height
  const probe = document.createElement('canvas')
  probe.width = W * SCALE
  probe.height = 6000
  const pctx = probe.getContext('2d')
  pctx.scale(SCALE, SCALE)
  const h = Math.ceil(drawContent(pctx, sale))

  // Second pass draws the real receipt
  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = h * SCALE
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, h)
  drawWatermark(ctx, h, logo)
  drawContent(ctx, sale)

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  return { blob, url: URL.createObjectURL(blob) }
}
