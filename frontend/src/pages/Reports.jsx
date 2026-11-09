import { useState } from 'react'
import { Download, Search, X } from 'lucide-react'
import { useFetch } from '../hooks/useList'
import { cap, downloadCsv, fmtDate, fmtShort, plural, thisMonth } from '../lib/format'
import { Card, Empty, ErrorNote, Loading, PageHeader, StatStrip, Tabs } from '../components/ui'
import { downloadPdf } from '../lib/pdf'

export default function Reports() {
  const [tab, setTab] = useState('overview')
  const [month, setMonth] = useState(thisMonth())
  const [role, setRole] = useState('')

  const path = {
    overview: `/reports/summary?month=${month}`,
    attendance: `/reports/attendance?month=${month}${role ? `&role=${role}` : ''}`,
    leaves: `/reports/leaves?month=${month}`,
    work: `/reports/work?month=${month}`,
    staff: `/reports/staff?month=${month}`,
  }[tab]

  const { data, loading, error } = useFetch(path)
  // The previous tab's data can still be there for one render after switching tabs
  const needs = { overview: 'attendance_trend', attendance: 'rows', leaves: 'rows', work: 'by_project', staff: 'headcount' }
  const ready = !loading && data && data[needs[tab]] !== undefined

  return (
    <div>
      <PageHeader title="Reports" subtitle="Monthly figures for the whole campus.">
        <input className="input !w-auto" type="month" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </PageHeader>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview' }, { value: 'attendance', label: 'Attendance' },
          { value: 'leaves', label: 'Leave' }, { value: 'work', label: 'Work' }, { value: 'staff', label: 'People' },
        ]}
      />

      <div className="mt-6">
        <ErrorNote>{error}</ErrorNote>
        {!ready && !error && <Loading />}
        {ready && tab === 'overview' && <Overview d={data} />}
        {ready && tab === 'attendance' && <AttendanceReport d={data} role={role} setRole={setRole} month={month} />}
        {ready && tab === 'leaves' && <LeaveReport d={data} month={month} />}
        {ready && tab === 'work' && <WorkReport d={data} month={month} />}
        {ready && tab === 'staff' && <PeopleReport d={data} month={month} />}
      </div>
    </div>
  )
}

function ExportButton({ name, month, columns, rows, summary = null, info = [], title = null }) {
  const empty = !rows.length && !summary?.rows?.length
  return (
    <div className="flex gap-1">
      <button className="btn-ghost !py-1.5" disabled={empty} onClick={() => downloadCsv(`${name}-${month}.csv`, columns, rows, summary)}>
        <Download className="h-4 w-4" /> CSV
      </button>
      <button
        className="btn-ghost !py-1.5"
        disabled={empty}
        onClick={() => downloadPdf(`${name}-${month}.pdf`, title || `${cap(name.replace(/-/g, ' '))} report`, `Month: ${month}`, columns, rows, info, summary)}
      >
        <Download className="h-4 w-4" /> PDF
      </button>
    </div>
  )
}

function Overview({ d }) {
  return (
    <div className="space-y-6">
      <StatStrip
        items={[
          { label: 'Total people', value: d.total_staff },
          { label: 'Present today', value: d.present_today },
          { label: 'On leave today', value: d.on_leave_today },
          { label: 'Absent today', value: d.absent_today },
        ]}
      />
      <Card title="Attendance trend">
        <TrendChart points={d.attendance_trend} />
      </Card>
    </div>
  )
}

// Two simple lines: present (accent, solid) and absent (grey, dashed)
function TrendChart({ points }) {
  if (!points.length) return <Empty text="No attendance data for this month." />

  const W = 720, H = 230, L = 34, R = 26, T = 12, B = 28
  const max = Math.max(1, ...points.flatMap((p) => [p.present, p.absent]))
  const x = (i) => L + (points.length === 1 ? (W - L - R) / 2 : (i / (points.length - 1)) * (W - L - R))
  const y = (v) => T + (1 - v / max) * (H - T - B)
  const line = (key) => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t))
  const step = Math.max(1, Math.ceil(points.length / 8))

  return (
    <div>
      <div className="mb-3 flex gap-5 text-xs text-muted">
        <span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-accent" /> Present</span>
        <span className="flex items-center gap-2"><span className="h-0.5 w-5 border-t-2 border-dashed border-faint" /> Absent</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--color-line)" />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-faint)">{t}</text>
          </g>
        ))}
        {points.map((p, i) => i % step === 0 && (
          <text key={p.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-faint)">{fmtShort(p.date)}</text>
        ))}
        <path d={line('absent')} fill="none" stroke="var(--color-faint)" strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />
        <path d={line('present')} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={p.date} cx={x(i)} cy={y(p.present)} r="3.2" fill="var(--color-accent)">
            <title>{`${fmtShort(p.date)}: ${p.present} present, ${p.absent} absent`}</title>
          </circle>
        ))}
      </svg>
    </div>
  )
}

function ReportTable({ head, children, empty, isEmpty }) {
  return (
    <div className="overflow-x-auto">
      <table className="tbl">
        <thead><tr>{head.map((h, i) => <th key={h} className={i > 1 ? 'text-right' : ''}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
      {isEmpty && <Empty text={empty} />}
    </div>
  )
}

const num = 'text-right tabular-nums'

function AttendanceReport({ d, role, setRole, month }) {
  const cols = [['Name', (r) => r.name], ['ID', (r) => r.staff_code], ['Role', (r) => r.role],
    ['Days present', (r) => r.days_present], ['Days late', (r) => r.days_late], ['Days on leave', (r) => r.days_on_leave]]
  return (
    <Card flush title="Attendance by person" action={
      <div className="flex items-center gap-2">
        <select className="input !w-auto !py-1.5" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Everyone</option>
          <option value="staff">Staff</option>
          <option value="intern">Interns</option>
          <option value="lecturer">Lecturers</option>
        </select>
        <ExportButton name="attendance" month={month} columns={cols} rows={d.rows} />
      </div>
    }>
      <ReportTable head={['Name', 'Role', 'Present', 'Late', 'On leave']} isEmpty={!d.rows.length} empty="No people found.">
        {d.rows.map((r) => (
          <tr key={r.user_id}>
            <td><p className="font-medium">{r.name}</p><p className="text-xs text-muted">{r.staff_code}</p></td>
            <td>{cap(r.role)}</td>
            <td className={num}>{r.days_present}</td><td className={num}>{r.days_late}</td><td className={num}>{r.days_on_leave}</td>
          </tr>
        ))}
      </ReportTable>
    </Card>
  )
}

// "12 Nov 2026" for one day, "12 Nov 2026 to 14 Nov 2026" for a run of days
const leaveDates = (l) => (l.start_date === l.end_date ? fmtDate(l.start_date) : `${fmtDate(l.start_date)} to ${fmtDate(l.end_date)}`)
const leaveTimes = (l) => (l.duration_type === 'full' ? 'Whole day' : `${l.start_time} to ${l.end_time}`)

// No search: everyone's totals for the month.
// Search an employee: that person's leave, day by day, with their total at the end.
function LeaveReport({ d, month }) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState(null) // { user_id, name, staff_code, role }
  const [showList, setShowList] = useState(false)

  const q = query.trim().toLowerCase()
  const matches = q
    ? d.rows.filter((r) => `${r.name} ${r.staff_code}`.toLowerCase().includes(q)).slice(0, 8)
    : []

  function pick(r) {
    setPicked({ user_id: r.user_id, name: r.name, staff_code: r.staff_code, role: r.role })
    setQuery(r.name)
    setShowList(false)
  }

  function clear() {
    setPicked(null)
    setQuery('')
    setShowList(false)
  }

  const search = (
    <div className="relative w-full sm:w-80">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      <input
        className="input pl-9 pr-9"
        placeholder="Search an employee by name or ID..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setPicked(null); setShowList(true) }}
        onFocus={() => setShowList(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' && matches[0]) { e.preventDefault(); pick(matches[0]) } }}
      />
      {query && (
        <button type="button" title="Clear search" onClick={clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-faint hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      )}
      {showList && !picked && q && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-line bg-white py-1 shadow-lg">
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-muted">No one with leave this month matches.</li>}
          {matches.map((r) => (
            <li key={r.user_id}>
              <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-paper" onClick={() => pick(r)}>
                <span className="font-medium">{r.name}</span> <span className="text-xs text-muted">{r.staff_code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  // ---------- one employee ----------
  if (picked) {
    const row = d.rows.find((r) => r.user_id === picked.user_id)
    const details = (d.details || []).filter((l) => l.user_id === picked.user_id)

    const detailCols = [['Leave', (r) => cap(r.leave_type)], ['Duration', (r) => r.duration_label],
      ['Date', leaveDates], ['Time', leaveTimes], ['Reason', (r) => r.reason || '-']]
    const total = row
      ? [{ ...row }]
      : [{ pending: 0, approved: 0, rejected: 0, approved_days: '0 days' }]
    const summary = {
      title: 'Total leave',
      columns: [['Pending', (r) => r.pending], ['Approved', (r) => r.approved], ['Rejected', (r) => r.rejected],
        ['Total approved leave', (r) => r.approved_days]],
      rows: total,
    }
    const info = [['Name', picked.name], ['ID', picked.staff_code], ['Role', cap(picked.role)]]

    return (
      <div className="space-y-4">
        <div className="flex justify-end">{search}</div>
        <Card flush title={`Leave details · ${picked.name}`} action={
          <ExportButton name={`leave-${picked.staff_code}`} title="Leave report" month={month} columns={detailCols} rows={details} summary={summary} info={info} />
        }>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Leave</th><th>Duration</th><th>Date</th><th>Time</th><th>Reason</th></tr></thead>
              <tbody>
                {details.map((l) => (
                  <tr key={l.id}>
                    <td>{cap(l.leave_type)}</td>
                    <td>{l.duration_label}</td>
                    <td>{leaveDates(l)}</td>
                    <td>{leaveTimes(l)}</td>
                    <td className="max-w-[18rem] truncate text-muted" title={l.reason || ''}>{l.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!details.length && <Empty text="No approved leave for this person in this month." />}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
            <span className="text-sm text-muted">
              Pending {total[0].pending} · Approved {total[0].approved} · Rejected {total[0].rejected}
            </span>
            <span className="text-sm">Total approved leave: <strong>{total[0].approved_days}</strong></span>
          </div>
        </Card>
      </div>
    )
  }

  // ---------- everyone ----------
  const cols = [['Name', (r) => r.name], ['ID', (r) => r.staff_code], ['Role', (r) => r.role], ['Pending', (r) => r.pending],
    ['Approved', (r) => r.approved], ['Rejected', (r) => r.rejected], ['Approved leave', (r) => r.approved_days]]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{search}</div>
      <Card flush title="Leave by person" action={<ExportButton name="leave" month={month} columns={cols} rows={d.rows} />}>
        <ReportTable head={['Name', 'Role', 'Pending', 'Approved', 'Rejected', 'Approved leave']} isEmpty={!d.rows.length} empty="No leave in this month.">
          {d.rows.map((r) => (
            <tr key={r.user_id}>
              <td><p className="font-medium">{r.name}</p><p className="text-xs text-muted">{r.staff_code}</p></td>
              <td>{cap(r.role)}</td>
              <td className={num}>{r.pending}</td><td className={num}>{r.approved}</td><td className={num}>{r.rejected}</td><td className={num}>{r.approved_days}</td>
            </tr>
          ))}
        </ReportTable>
      </Card>
    </div>
  )
}

function WorkReport({ d, month }) {
  const personCols = [['Name', (r) => r.name], ['ID', (r) => r.staff_code], ['Tasks', (r) => r.total],
    ['Completed', (r) => r.completed], ['Pending', (r) => r.pending], ['Days taken', (r) => r.days_taken]]
  const projectCols = [['Project', (r) => r.project], ['Tasks', (r) => r.total], ['Completed', (r) => r.completed],
    ['Pending', (r) => r.pending], ['Days taken', (r) => r.days_taken]]
  return (
    <div className="space-y-6">
      <Card flush title="By project" action={<ExportButton name="work-by-project" month={month} columns={projectCols} rows={d.by_project} />}>
        <ReportTable head={['Project', 'Tasks', 'Completed', 'Pending', 'Days taken']} isEmpty={!d.by_project.length} empty="No tasks started this month.">
          {d.by_project.map((r) => (
            <tr key={r.project}>
              <td className="font-medium">{r.project}</td>
              <td className={num}>{r.total}</td><td className={num}>{r.completed}</td><td className={num}>{r.pending}</td><td className={num}>{r.days_taken}</td>
            </tr>
          ))}
        </ReportTable>
      </Card>
      <Card flush title="By person" action={<ExportButton name="work-by-person" month={month} columns={personCols} rows={d.by_person} />}>
        <ReportTable head={['Name', 'Tasks', 'Completed', 'Pending', 'Days taken']} isEmpty={!d.by_person.length} empty="No tasks started this month.">
          {d.by_person.map((r) => (
            <tr key={r.user_id}>
              <td><p className="font-medium">{r.name}</p><p className="text-xs text-muted">{r.staff_code}</p></td>
              <td className={num}>{r.total}</td><td className={num}>{r.completed}</td><td className={num}>{r.pending}</td><td className={num}>{r.days_taken}</td>
            </tr>
          ))}
        </ReportTable>
      </Card>
    </div>
  )
}

function PeopleReport({ d, month }) {
  // headcount comes as rows of role + status + total
  const roles = ['staff', 'lecturer', 'intern']
  const count = (role, status) => Number(d.headcount.find((h) => h.role === role && h.status === status)?.total || 0)
  const cols = [['Name', (r) => r.name], ['ID', (r) => r.staff_code], ['Role', (r) => r.role], ['Joined', (r) => r.joined_date]]

  return (
    <div className="space-y-6">
      <StatStrip items={roles.map((r) => ({ label: `${cap(r)}s (active)`, value: count(r, 'active') }))} />
      <Card flush title="Joined this month" action={<ExportButton name="joined" month={month} columns={cols} rows={d.joined_this_month} />}>
        <ReportTable head={['Name', 'Role', 'Joined']} isEmpty={!d.joined_this_month.length} empty="Nobody joined this month.">
          {d.joined_this_month.map((r) => (
            <tr key={r.id}>
              <td><p className="font-medium">{r.name}</p><p className="text-xs text-muted">{r.staff_code}</p></td>
              <td>{cap(r.role)}</td>
              <td className="text-right">{fmtDate(r.joined_date)}</td>
            </tr>
          ))}
        </ReportTable>
      </Card>
      <p className="text-xs text-faint">{plural(roles.reduce((n, r) => n + count(r, 'inactive'), 0), 'person')} currently inactive.</p>
    </div>
  )
}
