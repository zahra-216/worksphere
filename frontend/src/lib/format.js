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

// "09:00:00" -> "09:00"
export const hhmm = (t) => (t ? String(t).slice(0, 5) : '')

// Add minutes to "HH:MM" (used to show the end of a 1 hour short leave)
export const addMinutes = (t, mins) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const total = h * 60 + m + mins
  if (total >= 24 * 60) return ''
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// What a leave request covers, e.g. "3 days", "Half day · 09:00-13:00", "Short leave · 10:00-11:00"
export const leaveSize = (l) => {
  if (l.duration_type === 'half' || l.duration_type === 'short') {
    return `${l.duration_label} · ${hhmm(l.start_time)}-${hhmm(l.end_time)}`
  }
  return plural(l.total_days, 'day')
}

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
