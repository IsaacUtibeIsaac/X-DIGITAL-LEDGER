const ONES = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']
const SCALES = [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']]

function underThousand(n) {
  const parts = []
  const h = Math.floor(n / 100)
  const r = n % 100
  if (h) parts.push(ONES[h] + ' hundred')
  if (r) {
    if (h) parts.push('and')
    if (r < 20) parts.push(ONES[r])
    else parts.push(TENS[Math.floor(r / 10)] + (r % 10 ? '-' + ONES[r % 10] : ''))
  }
  return parts.join(' ')
}

// 51050 -> "Fifty-one thousand and fifty naira only"
export function nairaInWords(amount) {
  const value = Math.abs(Number(amount) || 0)
  let n = Math.floor(value)
  const kobo = Math.round((value - n) * 100)
  const parts = []
  for (const [size, name] of SCALES) {
    if (n >= size) {
      parts.push(underThousand(Math.floor(n / size)) + ' ' + name)
      n = n % size
    }
  }
  if (n > 0) {
    if (parts.length && n < 100) parts.push('and')
    parts.push(underThousand(n))
  }
  if (!parts.length) parts.push('zero')
  let words = parts.join(' ') + ' naira'
  if (kobo) words += ' and ' + underThousand(kobo) + ' kobo'
  words += ' only'
  return words.charAt(0).toUpperCase() + words.slice(1)
}
