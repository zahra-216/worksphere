import { useState } from 'react'
import { Download } from 'lucide-react'
import { useFetch } from '../hooks/useList'
import { cap, downloadCsv, fmtDate, fmtShort, plural, thisMonth } from '../lib/format'
import { Card, Empty, ErrorNote, Loading, PageHeader, StatStrip, Tabs } from '../components/ui'

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
        {loading && <Loading />}
        {!loading && data && tab === 'overview' && <Overview d={data} />}
        {!loading && data && tab === 'attendance' && <AttendanceReport d={data} role={role} setRole={setRole} month={month} />}
        {!loading && data && tab === 'leaves' && <LeaveReport d={data} month={month} />}
        {!loading && data && tab === 'work' && <WorkReport d={data} month={month} />}
        {!loading && data && tab === 'staff' && <PeopleReport d={data} month={month} />}
      </div>
    </div>
  )
}

function ExportButton({ name, month, columns, rows }) {
  return (
    <button className="btn-ghost !py-1.5" disabled={!rows.length} onClick={() => downloadCsv(`${name}-${month}.csv`, columns, rows)}>
      <Download className="h-4 w-4" /> CSV
    </button>
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

function LeaveReport({ d, month }) {
  const cols = [['Name', (r) => r.name], ['ID', (r) => r.staff_code], ['Role', (r) => r.role], ['Pending', (r) => r.pending],
    ['Approved', (r) => r.approved], ['Rejected', (r) => r.rejected], ['Approved days', (r) => r.approved_days]]
  return (
    <Card flush title="Leave by person" action={<ExportButton name="leave" month={month} columns={cols} rows={d.rows} />}>
      <ReportTable head={['Name', 'Role', 'Pending', 'Approved', 'Rejected', 'Approved days']} isEmpty={!d.rows.length} empty="No leave in this month.">
        {d.rows.map((r) => (
          <tr key={r.user_id}>
            <td><p className="font-medium">{r.name}</p><p className="text-xs text-muted">{r.staff_code}</p></td>
            <td>{cap(r.role)}</td>
            <td className={num}>{r.pending}</td><td className={num}>{r.approved}</td><td className={num}>{r.rejected}</td><td className={num}>{r.approved_days}</td>
          </tr>
        ))}
      </ReportTable>
    </Card>
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
