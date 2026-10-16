export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

export const fmtShort = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'

export const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'

export const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

// yyyy-mm-dd in the user's local time (toISOString would shift the day)
export const today = () => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export const thisMonth = () => today().slice(0, 7)

// Laravel sends dates like 2026-10-15T00:00:00.000000Z. Inputs need yyyy-mm-dd.
export const toInputDate = (d) => (d ? String(d).slice(0, 10) : '')

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// Download rows as a CSV file. columns = [[header, row => value], ...]
export function downloadCsv(filename, columns, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [columns.map(([h]) => esc(h)).join(',')]
  rows.forEach((r) => lines.push(columns.map(([, get]) => esc(get(r))).join(',')))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
