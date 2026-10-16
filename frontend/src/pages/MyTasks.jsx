import { useState } from 'react'
import { CheckCircle2, Circle, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useList } from '../hooks/useList'
import { fmtDate, plural } from '../lib/format'
import { Badge, Card, Confirm, Empty, Loading, PageHeader, Pagination, Tabs, useToast } from '../components/ui'
import TaskForm from '../components/TaskForm'

// Staff, interns and lecturers: log what you worked on and mark tasks pending / completed
export default function MyTasks() {
  const toast = useToast()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState({ open: false, task: null })
  const [toDelete, setToDelete] = useState(null)

  const { rows, meta, loading, error, reload } = useList('/tasks', { status, page })

  async function toggle(t) {
    try {
      await api(`/tasks/${t.id}`, { method: 'PUT', body: { status: t.status === 'completed' ? 'pending' : 'completed' } })
      toast(t.status === 'completed' ? 'Marked as pending' : 'Nice, marked as completed')
      reload()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function remove() {
    try {
      await api(`/tasks/${toDelete.id}`, { method: 'DELETE' })
      toast('Entry deleted')
      setToDelete(null)
      reload()
    } catch (e) {
      toast(e.message, 'error')
    }
  }


  return (
    <div>
      <PageHeader title="My work" subtitle="Tasks given to you, and what you've worked on.">
        <button className="btn" onClick={() => setForm({ open: true, task: null })}><Plus className="h-4 w-4" /> Log work</button>
      </PageHeader>

      <Card flush>
        <div className="px-5">
          <Tabs
            value={status}
            onChange={(v) => { setStatus(v); setPage(1) }}
            tabs={[{ value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }]}
          />
        </div>

        {loading && <Loading />}
        {error && <p className="px-5 py-10 text-center text-sm text-bad">{error}</p>}
        {!loading && !error && rows.length === 0 && <Empty text="No work logged yet. Use Log work to add your first entry." />}

        <ul className="divide-y divide-line">
          {!loading && rows.map((t) => (
            <li key={t.id} className="flex items-start gap-3 px-5 py-4">
              <button className={`icon-btn mt-0.5 ${t.status === 'completed' ? 'text-good' : ''}`}
                title={t.status === 'completed' ? 'Mark as pending' : 'Mark as completed'} onClick={() => toggle(t)}>
                {t.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${t.status === 'completed' ? 'text-muted line-through' : ''}`}>{t.title}</p>
                {t.description && <p className="mt-0.5 text-sm text-muted">{t.description}</p>}
                <p className="mt-1.5 text-xs text-muted">
                  {t.project?.name} · started {fmtDate(t.start_date)}
                  {t.due_date && ` · due ${fmtDate(t.due_date)}`}
                  {` · ${plural(t.days_taken, 'day')}${t.status === 'pending' ? ' so far' : ''}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Badge status={t.status} />
                <button className="icon-btn ml-2" title="Edit" onClick={() => setForm({ open: true, task: t })}><Pencil className="h-4 w-4" /></button>
                <button className="icon-btn danger" title="Delete" onClick={() => setToDelete(t)}><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
        <Pagination meta={meta} onPage={setPage} />
      </Card>

      <TaskForm
        open={form.open}
        task={form.task}
        isAdmin={false}
        onClose={() => setForm({ open: false, task: null })}
        onSaved={(wasEdit) => { setForm({ open: false, task: null }); toast(wasEdit ? 'Entry updated' : 'Work logged'); reload() }}
      />
      <Confirm open={!!toDelete} title="Delete this entry?" text={`"${toDelete?.title}" will be removed.`} onConfirm={remove} onClose={() => setToDelete(null)} />
    </div>
  )
}
