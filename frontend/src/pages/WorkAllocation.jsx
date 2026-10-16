import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, Circle, Pencil, Plus, Trash2, X } from 'lucide-react'
import { api } from '../lib/api'
import { useDebounced, useFetch, useList } from '../hooks/useList'
import { cap, fmtShort, plural } from '../lib/format'
import { Badge, Card, Confirm, PageHeader, PersonCell, Pagination, SearchBox, TableState, Tabs, useToast } from '../components/ui'
import TaskForm from '../components/TaskForm'

// Admin: all tasks across projects, with how many days each one has taken
export default function WorkAllocation() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const assignedTo = params.get('assigned_to') || ''

  const [projectId, setProjectId] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState({ open: false, task: null })
  const [toDelete, setToDelete] = useState(null)
  const q = useDebounced(search)

  const { data: projects } = useFetch('/projects')
  const { data: people } = useFetch('/users?per_page=500')
  const { rows, meta, loading, error, reload } = useList('/tasks', {
    project_id: projectId, status, search: q, assigned_to: assignedTo, page,
  })

  const person = (people?.data || []).find((p) => String(p.id) === assignedTo)

  async function toggle(t) {
    try {
      await api(`/tasks/${t.id}`, { method: 'PUT', body: { status: t.status === 'completed' ? 'pending' : 'completed' } })
      toast(t.status === 'completed' ? 'Marked as pending' : 'Marked as completed')
      reload()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function remove() {
    try {
      await api(`/tasks/${toDelete.id}`, { method: 'DELETE' })
      toast('Task deleted')
      setToDelete(null)
      reload()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  return (
    <div>
      <PageHeader title="Work allocation" subtitle="Who is working on what, and how long it has taken.">
        <button className="btn" onClick={() => setForm({ open: true, task: null })}><Plus className="h-4 w-4" /> Assign task</button>
      </PageHeader>

      <Card flush>
        <div className="px-5">
          <Tabs
            value={projectId}
            onChange={(v) => { setProjectId(v); setPage(1) }}
            tabs={[{ value: '', label: 'All projects' }, ...(projects || []).map((p) => ({ value: String(p.id), label: p.name }))]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search tasks..." />
          <select className="input !w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="">Any status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <select className="input !w-auto" value={assignedTo}
            onChange={(e) => { setParams(e.target.value ? { assigned_to: e.target.value } : {}); setPage(1) }}>
            <option value="">Everyone</option>
            {(people?.data || []).map((p) => <option key={p.id} value={p.id}>{p.name} ({cap(p.role)})</option>)}
          </select>
          {assignedTo && (
            <button className="btn-ghost !py-1.5" onClick={() => setParams({})}>
              {person?.name || 'Filtered'} <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr><th /><th>Task</th><th>Project</th><th>Assigned to</th><th>Started</th><th>Due</th><th>Days taken</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {!loading && rows.map((t) => (
                <tr key={t.id}>
                  <td className="!pr-0">
                    <button className={`icon-btn ${t.status === 'completed' ? 'text-good' : ''}`}
                      title={t.status === 'completed' ? 'Mark as pending' : 'Mark as completed'} onClick={() => toggle(t)}>
                      {t.status === 'completed' ? <CheckCircle2 className="h-[18px] w-[18px]" /> : <Circle className="h-[18px] w-[18px]" />}
                    </button>
                  </td>
                  <td className="max-w-[16rem]">
                    <p className="truncate font-medium">{t.title}</p>
                    {t.description && <p className="truncate text-xs text-muted">{t.description}</p>}
                  </td>
                  <td>{t.project?.name}</td>
                  <td><PersonCell name={t.assignee?.name} sub={cap(t.assignee?.role)} /></td>
                  <td>{fmtShort(t.start_date)}</td>
                  <td>{fmtShort(t.due_date)}</td>
                  <td className="whitespace-nowrap">
                    <span className="font-medium">{plural(t.days_taken, 'day')}</span>
                    {t.status === 'pending' && <span className="ml-1 text-xs text-faint">so far</span>}
                  </td>
                  <td><Badge status={t.status} /></td>
                  <td>
                    <div className="flex justify-end">
                      <button className="icon-btn" title="Edit" onClick={() => setForm({ open: true, task: t })}><Pencil className="h-4 w-4" /></button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setToDelete(t)}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <TableState loading={loading} error={error} empty={!rows.length} text="No tasks found." />
        </div>
        <Pagination meta={meta} onPage={setPage} />
      </Card>

      <TaskForm
        open={form.open}
        task={form.task}
        isAdmin
        defaultAssignee={assignedTo}
        onClose={() => setForm({ open: false, task: null })}
        onSaved={(wasEdit) => { setForm({ open: false, task: null }); toast(wasEdit ? 'Task updated' : 'Task created'); reload() }}
      />
      <Confirm open={!!toDelete} title="Delete task?" text={`"${toDelete?.title}" will be removed.`} onConfirm={remove} onClose={() => setToDelete(null)} />
    </div>
  )
}
