import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Camera, Copy } from 'lucide-react'
import { api } from '../lib/api'
import { toInputDate, today } from '../lib/format'
import { Card, ErrorNote, Field, Loading, Modal, PageHeader, useToast } from '../components/ui'

const COPY = {
  staff: { add: 'Add staff', edit: 'Edit staff', back: '/staff' },
  intern: { add: 'Add intern', edit: 'Edit intern', back: '/interns' },
  lecturer: { add: 'Add lecturer', edit: 'Edit lecturer', back: '/lecturers' },
}

const EMPTY = {
  name: '', email: '', nic: '', phone: '', position: '', employment_type: 'Full-time',
  university: '', joined_date: '', status: 'active', password: '',
}

// One form for staff, interns and lecturers. Only the fields that matter for the role are shown.
export default function PersonForm({ role }) {
  const { id } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const toast = useToast()
  const copy = COPY[role]

  const [f, setF] = useState(EMPTY)
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(editing)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [created, setCreated] = useState(null) // { user, temp_password }

  useEffect(() => {
    if (!editing) return
    api(`/users/${id}`)
      .then((u) => {
        setF({
          name: u.name || '', email: u.email || '', nic: u.nic || '', phone: u.phone || '',
          position: u.position || '', employment_type: u.employment_type || 'Full-time',
          university: u.university || '', joined_date: toInputDate(u.joined_date),
          status: u.status || 'active', password: '',
        })
        setPreview(u.photo_url || '')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [editing, id])

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  function pickPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  async function submit(e) {
    e.preventDefault()
    setError(''); setFieldErrors({}); setBusy(true)

    const form = new FormData()
    const fields = ['name', 'email', 'nic', 'phone', 'joined_date']
    if (role !== 'intern') fields.push('position')
    if (role === 'staff') fields.push('employment_type')
    if (role === 'intern') fields.push('university')
    fields.forEach((k) => form.append(k, f[k] ?? ''))
    if (f.password) form.append('password', f.password)
    if (photo) form.append('photo', photo)

    try {
      if (editing) {
        form.append('status', f.status)
        form.append('_method', 'PUT') // Laravel needs this for file uploads on update
        await api(`/users/${id}`, { method: 'POST', form })
        toast('Changes saved')
        navigate(copy.back)
      } else {
        form.append('role', role)
        const res = await api('/users', { method: 'POST', form })
        setCreated(res)
      }
    } catch (err) {
      setError(err.message)
      setFieldErrors(err.errors ? Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])) : {})
    } finally {
      setBusy(false)
    }
  }

  function copyPassword() {
    navigator.clipboard?.writeText(created.temp_password)
    toast('Password copied')
  }

  if (loading) return <Loading />

  return (
    <div className="mx-auto max-w-3xl">
      <button className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink" onClick={() => navigate(copy.back)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <PageHeader title={editing ? copy.edit : copy.add} />

      <form onSubmit={submit}>
        <Card>
          <ErrorNote>{error}</ErrorNote>

          <div className="mb-6 flex items-center gap-4">
            <label className="group relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-faint bg-paper text-faint hover:border-accent hover:text-accent">
              {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <Camera className="h-6 w-6" />}
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={pickPhoto} />
            </label>
            <div>
              <p className="text-sm font-medium">Photo</p>
              <p className="text-xs text-muted">JPG or PNG, up to 2 MB.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *" error={fieldErrors.name}>
              <input className="input" required value={f.name} onChange={set('name')} placeholder="Enter full name" />
            </Field>
            <Field label="Email *" error={fieldErrors.email}>
              <input className="input" type="email" required value={f.email} onChange={set('email')} placeholder="name@example.com" />
            </Field>
            <Field label="NIC / ID number" error={fieldErrors.nic}>
              <input className="input" value={f.nic} onChange={set('nic')} placeholder="Enter NIC number" />
            </Field>
            <Field label="Phone number" error={fieldErrors.phone}>
              <input className="input" value={f.phone} onChange={set('phone')} placeholder="07X XXX XXXX" />
            </Field>

            {role !== 'intern' && (
              <Field label="Position" error={fieldErrors.position}>
                <input className="input" value={f.position} onChange={set('position')}
                  placeholder={role === 'lecturer' ? 'e.g. Senior Lecturer' : 'e.g. Marketing Executive'} />
              </Field>
            )}
            {role === 'staff' && (
              <Field label="Employment type" error={fieldErrors.employment_type}>
                <select className="input" value={f.employment_type} onChange={set('employment_type')}>
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                </select>
              </Field>
            )}
            {role === 'intern' && (
              <Field label="University" error={fieldErrors.university}>
                <input className="input" value={f.university} onChange={set('university')} placeholder="e.g. SLIIT" />
              </Field>
            )}

            <Field label="Joined date" error={fieldErrors.joined_date}>
              <input className="input" type="date" max={today()} value={f.joined_date} onChange={set('joined_date')} />
            </Field>
            {editing && (
              <Field label="Status">
                <select className="input" value={f.status} onChange={set('status')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            )}
            <Field
              label={editing ? 'New password' : 'Password'}
              hint={editing ? 'Leave blank to keep the current password.' : 'Leave blank and we will generate a temporary one.'}
              error={fieldErrors.password}
              className="sm:col-span-2"
            >
              <input className="input" type="password" minLength={8} value={f.password} onChange={set('password')} placeholder="At least 8 characters" />
            </Field>
          </div>
        </Card>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => navigate(copy.back)}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : copy.add}</button>
        </div>
      </form>

      <Modal
        open={!!created}
        onClose={() => navigate(copy.back)}
        title="Account created"
        width="max-w-sm"
        footer={<button className="btn" onClick={() => navigate(copy.back)}>Done</button>}
      >
        {created && (
          <div className="text-sm">
            <p><span className="font-semibold">{created.user.name}</span> was added as <span className="font-semibold">{created.user.staff_code}</span>.</p>
            {created.temp_password ? (
              <>
                <p className="mt-4 text-muted">Share this temporary password. It is shown only once.</p>
                <div className="mt-2 flex items-center justify-between rounded-xl border border-line bg-paper px-4 py-3">
                  <code className="font-mono text-base font-semibold">{created.temp_password}</code>
                  <button type="button" className="icon-btn" onClick={copyPassword} aria-label="Copy"><Copy className="h-4 w-4" /></button>
                </div>
              </>
            ) : (
              <p className="mt-4 text-muted">They can sign in with the password you set.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
