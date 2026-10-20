import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, ScanLine } from 'lucide-react'
import { useFetch } from '../hooks/useList'
import { cap, fmtDate, fmtTime, thisMonth, today } from '../lib/format'
import { downloadPdf } from '../lib/pdf'
import { Badge, Card, PageHeader, PersonCell, StatStrip, Tabs, TableState } from '../components/ui'

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
  const [name, setName] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setQ(name.trim()), 400)
    return () => clearTimeout(t)
  }, [name])

  const { data, loading, error } = useFetch(`/gate-log/history?month=${month}&search=${encodeURIComponent(q)}`)
  const rows = data?.rows || []

  const cols = [
    ['Name', (r) => r.name],
    ['ID', (r) => r.staff_code],
    ['Date', (r) => fmtDate(r.date)],
    ['Check-in', (r) => (r.check_in ? fmtTime(r.check_in) : '-')],
    ['Check-out', (r) => (r.check_out ? fmtTime(r.check_out) : '-')],
    ['Status', (r) => (r.late ? 'Late' : 'On time')],
  ]

  function pdf() {
    downloadPdf(`attendance-${month}.pdf`, 'Attendance report', `Month: ${month}${q ? ` | Search: ${q}` : ''}`, cols, rows)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input !w-auto" type="month" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        <input className="input !w-auto" placeholder="Search name or ID" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn-ghost" disabled={!rows.length} onClick={pdf}><Download className="h-4 w-4" /> PDF</button>
      </div>

      <Card title="History" flush>
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
