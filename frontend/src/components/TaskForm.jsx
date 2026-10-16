import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { cap, toInputDate, today } from '../lib/format'
import { useFetch } from '../hooks/useList'
import { ErrorNote, Field, Modal } from './ui'

const blank = (assignee = '') => ({
  project_id: '', assigned_to: assignee, title: '', description: '',
  start_date: today(), due_date: '', status: 'pending', completed_date: '',
})

// Add / edit a task. Admin picks the person; everyone else logs work for themselves.
export default function TaskForm({ open, onClose, task, isAdmin, defaultAssignee = '', onSaved }) {
  const editing = !!task
  const { data: projects } = useFetch(open ? '/projects' : null, [open])
  const { data: people } = useFetch(open && isAdmin ? '/users?per_page=500&status=active' : null, [open])

  const [f, setF] = useState(blank(defaultAssignee))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setF(task ? {
      project_id: task.project_id, assigned_to: task.assigned_to, title: task.title,
      description: task.description || '', start_date: toInputDate(task.start_date),
      due_date: toInputDate(task.due_date), status: task.status, completed_date: toInputDate(task.completed_date),
    } : blank(defaultAssignee))
  }, [open, task, defaultAssignee])

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError(''); setBusy(true)
    const body = {
      project_id: f.project_id, title: f.title, description: f.description || null,
      start_date: f.start_date, due_date: f.due_date || null, status: f.status,
      completed_date: f.status === 'completed' ? (f.completed_date || today()) : null,
    }
    if (isAdmin) body.assigned_to = f.assigned_to
    try {
      await api(editing ? `/tasks/${task.id}` : '/tasks', { method: editing ? 'PUT' : 'POST', body })
      onSaved(editing)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const groups = ['staff', 'intern', 'lecturer']
  const active = (projects || []).filter((p) => !p.deleted_at)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit task' : isAdmin ? 'Assign task' : 'Log work'}
      width="max-w-xl"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" form="task-form" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : isAdmin ? 'Create task' : 'Save'}</button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} className="space-y-4">
        <ErrorNote>{error}</ErrorNote>

        <Field label={isAdmin ? 'Task title *' : 'What did you work on? *'}>
          <input className="input" required value={f.title} onChange={set('title')} placeholder={isAdmin ? 'e.g. Social media content' : 'e.g. Designed the event poster'} />
        </Field>

        <div className={`grid gap-4 ${isAdmin ? 'sm:grid-cols-2' : ''}`}>
          <Field label="Project *">
            <select className="input" required value={f.project_id} onChange={set('project_id')}>
              <option value="">Select project</option>
              {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          {isAdmin && (
            <Field label="Assigned to *">
              <select className="input" required value={f.assigned_to} onChange={set('assigned_to')}>
                <option value="">Select person</option>
                {groups.map((g) => {
                  const list = (people?.data || []).filter((p) => p.role === g)
                  return list.length ? (
                    <optgroup key={g} label={`${cap(g)}s`}>
                      {list.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </optgroup>
                  ) : null
                })}
              </select>
            </Field>
          )}
        </div>

        <Field label="Details" hint="Optional">
          <textarea className="input" maxLength={2000} value={f.description} onChange={set('description')} placeholder="Add a few notes" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date *">
            <input className="input" type="date" required value={f.start_date} onChange={set('start_date')} />
          </Field>
          <Field label="Due date">
            <input className="input" type="date" min={f.start_date} value={f.due_date} onChange={set('due_date')} />
          </Field>
          <Field label="Status">
            <select className="input" value={f.status} onChange={set('status')}>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          {f.status === 'completed' && (
            <Field label="Completed on">
              <input className="input" type="date" min={f.start_date} value={f.completed_date || today()} onChange={set('completed_date')} />
            </Field>
          )}
        </div>
      </form>
    </Modal>
  )
}
