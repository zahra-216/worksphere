import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useFetch } from '../hooks/useList'
import { Badge, Card, Empty, ErrorNote, Loading, PageHeader, PersonCell, StatStrip } from '../components/ui'
import { cap, fmtShort, fmtTime, greeting } from '../lib/format'

export default function Dashboard() {
  const { user, isAdmin } = useAuth()
  const { data, error } = useFetch('/dashboard')

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${isAdmin ? 'Admin' : user?.name?.split(' ')[0]}`}
        subtitle="Here's what's happening today."
      />
      
      <ErrorNote>{error}</ErrorNote>
      {!data && !error && <Loading />}
      {data && (isAdmin ? <AdminView d={data} /> : <PersonalView d={data} />)}
    </div>
  )
}

function AdminView({ d }) {
  return (
    <div className="space-y-6">
      <StatStrip
        items={[
          { label: 'Staff', value: d.staff.total },
          { label: 'Lecturers', value: d.lecturers.total },
          { label: 'Interns', value: d.interns.total },
          { label: 'Pending leave', value: d.pending_leaves.total },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Leave requests" action={<Link to="/leave-management" className="text-sm font-medium text-accent">View all</Link>}>
          {d.upcoming_leave_requests.length === 0 && <Empty text="No pending requests." />}
          <ul className="divide-y divide-line">
            {d.upcoming_leave_requests.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <PersonCell
                  name={l.user?.name}
                  src={l.user?.photo_url}
                  sub={`${cap(l.leave_type)} · ${fmtShort(l.start_date)} - ${fmtShort(l.end_date)}`}
                />
                <Badge status={l.status} />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Work by project" action={<Link to="/work-allocation" className="text-sm font-medium text-accent">Open</Link>}>
          <Donut data={d.work_allocation.by_project} total={d.work_allocation.total_tasks} />
        </Card>
      </div>
    </div>
  )
}

// One colour, stepped in strength, so it stays calm
const SHADES = [1, 0.7, 0.45, 0.28, 0.16]

function Donut({ data, total }) {
  const r = 58
  const c = 2 * Math.PI * r
  let offset = 0

  if (!total) return <Empty text="No tasks yet." />

  return (
    <div className="flex flex-wrap items-center justify-center gap-8 py-2">
      <div className="relative h-44 w-44">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          <circle cx="80" cy="80" r={r} fill="none" stroke="var(--color-paper)" strokeWidth="16" />
          {data.map((p, i) => {
            const len = (p.total / total) * c
            const el = (
              <circle key={p.project} cx="80" cy="80" r={r} fill="none" stroke="var(--color-accent)"
                strokeOpacity={SHADES[i % SHADES.length]} strokeWidth="16"
                strokeDasharray={`${Math.max(len - 2, 0)} ${c - Math.max(len - 2, 0)}`} strokeDashoffset={-offset} />
            )
            offset += len
            return el
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-semibold">{total}</span>
          <span className="text-xs text-muted">tasks</span>
        </div>
      </div>
      <ul className="min-w-[10rem] space-y-2.5 text-sm">
        {data.map((p, i) => (
          <li key={p.project} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-accent" style={{ opacity: SHADES[i % SHADES.length] }} />
            <span className="text-muted">{p.project}</span>
            <span className="ml-auto pl-4 font-semibold">{p.total}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PersonalView({ d }) {
  return (
    <div className="space-y-6">
      <StatStrip
        items={[
          { label: 'Pending tasks', value: d.tasks.pending },
          { label: 'Completed tasks', value: d.tasks.completed },
          { label: 'Leave days left', value: `${d.leave.remaining} / ${d.leave.allowed}` },
          { label: d.attendance_today.check_out ? `Checked in · out ${fmtTime(d.attendance_today.check_out)}` : 'Checked in today',
            value: d.attendance_today.check_in ? fmtTime(d.attendance_today.check_in) : '-' },
        ]}
      />

      <Card title="Pending tasks" action={<Link to="/my-tasks" className="text-sm font-medium text-accent">Log work</Link>}>
        {d.tasks.recent_pending.length === 0 && <Empty text="Nothing pending." />}
        <ul className="divide-y divide-line">
          {d.tasks.recent_pending.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-xs text-muted">{t.project?.name} · started {fmtShort(t.start_date)}</p>
              </div>
              <Badge status={t.status} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

