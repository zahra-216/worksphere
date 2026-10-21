import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, ScanLine } from 'lucide-react'
import { useFetch } from '../hooks/useList'
import { cap, fmtDate, fmtTime, thisMonth, today } from '../lib/format'
import { downloadPdf } from '../lib/pdf'
import { Badge, Card, PageHeader, PersonCell, StatStrip, Tabs, TableState } from '../components/ui'
import { api } from '../lib/api'

export default function Attendance() {
  const [tab, setTab] = useState('daily')

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Check-in and check-out records">
        <Link to="/scan" className="btn"><ScanLine className="h-4 w-4" /> Scan attendance</Link>
      </PageHeader>

      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'daily', label: 'Daily' }, { value: 'history', label: 'History' }]} />

      <div className="mt-6">{tab === 'daily' ? <Daily /> : <History />}</div>
    </div>
  )
}

function Daily() {
  const [date, setDate] = useState(today())
  const [name, setName] = useState('')
  const { data, loading, error } = useFetch(`/gate-log?date=${date}`)

  const s = data?.summary
  const rows = (data?.records || []).filter((r) =>
    `${r.name} ${r.staff_code || ''}`.toLowerCase().includes(name.trim().toLowerCase())
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input !w-auto" type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <input className="input !w-auto" placeholder="Search name or ID" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="mb-6">
        <StatStrip
          items={[
            { label: 'Present', value: s?.present ?? '-' },
            { label: 'Absent', value: s?.absent ?? '-' },
            { label: 'Late', value: s?.late ?? '-' },
          ]}
        />
      </div>

      <Card title={`Check-ins · ${fmtDate(date)}`} flush>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr><th>Name</th><th>Role</th><th>Check-in</th><th>Check-out</th><th>Status</th></tr>
            </thead>
            <tbody>
              {!loading && rows.map((r) => (
                <tr key={r.user_id}>
                  <td><PersonCell name={r.name} sub={r.staff_code} src={r.photo_url} /></td>
                  <td>{cap(r.role)}</td>
                  <td>{fmtTime(r.check_in)}</td>
                  <td>{r.check_out ? fmtTime(r.check_out) : <span className="text-faint">-</span>}</td>
                  <td><Badge status={r.late ? 'late' : 'on time'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <TableState loading={loading} error={error} empty={!rows.length} text="No check-ins found." />
        </div>
      </Card>
    </div>
  )
}

function History() {
  const [month, setMonth] = useState(thisMonth())
  const [text, setText] = useState('')
  const [picked, setPicked] = useState(null) // the chosen employee
  const [matches, setMatches] = useState([])
  const [showList, setShowList] = useState(false)

  // look up matching employees while typing
  useEffect(() => {
    const q = text.trim()
    if (picked || !q) { setMatches([]); return }
    const t = setTimeout(async () => {
      try { setMatches(await api(`/gate-log/people?q=${encodeURIComponent(q)}`)) } catch { setMatches([]) }
    }, 300)
    return () => clearTimeout(t)
  }, [text, picked])

  const { data, loading, error } = useFetch(`/gate-log/history?month=${month}${picked ? `&user_id=${picked.id}` : ''}`)
  const rows = data?.rows || []

  function choose(p) { setPicked(p); setText(p.name); setShowList(false); setMatches([]) }
  function clear() { setPicked(null); setText(''); setMatches([]) }

  function pdf() {
    const monthName = new Date(`${month}-01`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date))
    const cols = [
      ['Date', (r) => fmtDate(r.date)],
      ['Day', (r) => new Date(r.date).toLocaleDateString('en-GB', { weekday: 'long' })],
      ['Check-in', (r) => (r.check_in ? fmtTime(r.check_in) : '-')],
      ['Check-out', (r) => (r.check_out ? fmtTime(r.check_out) : '-')],
      ['Status', (r) => (r.late ? 'Late' : 'On time')],
    ]
    downloadPdf(
      `attendance-${picked.staff_code || picked.id}-${month}.pdf`,
      'Attendance report',
      monthName,
      cols,
      sorted,
      [
        ['Name', picked.name],
        ['ID', picked.staff_code || '-'],
        ['Role', cap(picked.role)],
        ['Days present', rows.length],
        ['Days late', rows.filter((r) => r.late).length],
      ],
    )
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input className="input !w-auto" type="month" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} />

        <div className="relative">
          <input
            className="input !w-72"
            placeholder="Search employee name or ID"
            value={text}
            onChange={(e) => { setText(e.target.value); setPicked(null); setShowList(true) }}
          />
          {showList && matches.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-72 w-80 overflow-auto rounded-xl border border-line bg-white py-1 shadow-lg">
              {matches.map((p) => (
                <li key={p.id}>
                  <button type="button" className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-paper" onClick={() => choose(p)}>
                    <span><span className="font-medium">{p.name}</span><span className="block text-xs text-muted">{p.staff_code}</span></span>
                    <span className="text-xs text-muted">{cap(p.role)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {picked && <button className="btn-ghost" onClick={clear}>Clear</button>}
        <button className="btn-ghost" disabled={!picked || !rows.length} onClick={pdf}><Download className="h-4 w-4" /> PDF</button>
      </div>
      {!picked && <p className="mb-4 text-xs text-muted">Search and select an employee to download their report.</p>}
      {picked && <div className="mb-4" />}

      <Card title={picked ? `${picked.name} · History` : 'History'} flush>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr><th>Date</th><th>Name</th><th>Check-in</th><th>Check-out</th><th>Status</th></tr>
            </thead>
            <tbody>
              {!loading && rows.map((r) => (
                <tr key={`${r.user_id}-${r.date}`}>
                  <td>{fmtDate(r.date)}</td>
                  <td><p className="font-medium">{r.name}</p><p className="text-xs text-muted">{r.staff_code}</p></td>
                  <td>{r.check_in ? fmtTime(r.check_in) : '-'}</td>
                  <td>{r.check_out ? fmtTime(r.check_out) : <span className="text-faint">-</span>}</td>
                  <td><Badge status={r.late ? 'late' : 'on time'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <TableState loading={loading} error={error} empty={!rows.length} text="No records found." />
        </div>
      </Card>
    </div>
  )
}
