import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useFetch } from '../hooks/useList'
import { Card, Confirm, Empty, ErrorNote, Field, Loading, Modal, PageHeader, useToast } from '../components/ui'

// Admin: add or remove projects (IMS, Media, Marketing and anything new)
export default function Projects() {
  const toast = useToast()
  const { data, loading, error, reload } = useFetch('/projects')
  const [form, setForm] = useState({ open: false, project: null })
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)

  async function remove() {
    setBusy(true)
    try {
      await api(`/projects/${toDelete.id}`, { method: 'DELETE' })
      toast(`${toDelete.name} deleted`)
      setToDelete(null)
      reload()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title="Projects" subtitle="Tasks are grouped under these projects.">
        <button className="btn" onClick={() => setForm({ open: true, project: null })}><Plus className="h-4 w-4" /> Add project</button>
      </PageHeader>

      {loading && <Loading />}
      <ErrorNote>{error}</ErrorNote>
      {data && data.length === 0 && <Card><Empty text="No projects yet. Add your first one." /></Card>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((p) => (
          <Card key={p.id}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <div className="-mr-2 -mt-1 flex">
                <button className="icon-btn" title="Edit" onClick={() => setForm({ open: true, project: p })}><Pencil className="h-4 w-4" /></button>
                <button className="icon-btn danger" title="Delete" onClick={() => setToDelete(p)}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <p className="mt-1 min-h-[2.5rem] text-sm text-muted">{p.description || 'No description.'}</p>
            <p className="mt-4 border-t border-line pt-3 text-sm">
              <span className="font-display text-xl font-semibold">{p.tasks_count}</span>
              <span className="ml-1.5 text-muted">{p.tasks_count === 1 ? 'task' : 'tasks'}</span>
            </p>
          </Card>
        ))}
      </div>

      <ProjectForm
        state={form}
        onClose={() => setForm({ open: false, project: null })}
        onSaved={(wasEdit) => { setForm({ open: false, project: null }); toast(wasEdit ? 'Project updated' : 'Project added'); reload() }}
      />
      <Confirm
        open={!!toDelete}
        title="Delete project?"
        text={`${toDelete?.name} will no longer be available for new tasks. Existing tasks keep their project name.`}
        busy={busy}
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}

function ProjectForm({ state, onClose, onSaved }) {
  const { open, project } = state
  const editing = !!project
  const [f, setF] = useState({ name: '', description: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // reset the form each time the modal opens
  useEffect(() => {
    if (!open) return
    setF({ name: project?.name || '', description: project?.description || '' })
    setError('')
  }, [open, project])

  async function submit(e) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      await api(editing ? `/projects/${project.id}` : '/projects', { method: editing ? 'PUT' : 'POST', body: f })
      onSaved(editing)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit project' : 'Add project'}
      width="max-w-md"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" form="project-form" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
        </>
      }
    >
      <form id="project-form" onSubmit={submit} className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <Field label="Project name *">
          <input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Student Portal" />
        </Field>
        <Field label="Description" hint="Optional">
          <textarea className="input" maxLength={1000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
      </form>
    </Modal>
  )
}
