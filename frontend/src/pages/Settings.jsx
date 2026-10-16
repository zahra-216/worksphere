import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useFetch } from '../hooks/useList'
import { Card, ErrorNote, Field, Loading, PageHeader, useToast } from '../components/ui'

export default function Settings() {
  const toast = useToast()
  const { data, error } = useFetch('/settings')
  const [f, setF] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { if (data) setF(data) }, [data])
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      await api('/settings', { method: 'PUT', body: { ...f, default_leave_days: Number(f.default_leave_days) } })
      toast('Settings saved')
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" subtitle="General rules for the whole campus." />
      <ErrorNote>{error}</ErrorNote>
      {!f && !error && <Loading />}
      {f && (
        <form onSubmit={submit}>
          <Card>
            <ErrorNote>{err}</ErrorNote>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Institution name" className="sm:col-span-2">
                <input className="input" required value={f.institution_name} onChange={set('institution_name')} />
              </Field>
              <Field label="Academic year">
                <input className="input" required value={f.academic_year} onChange={set('academic_year')} />
              </Field>
              <Field label="Yearly leave days" hint="Given to each person.">
                <input className="input" type="number" min="0" max="365" required value={f.default_leave_days} onChange={set('default_leave_days')} />
              </Field>
              <Field label="Late after" hint="Check-ins after this time count as late.">
                <input className="input" type="time" required value={f.late_after} onChange={set('late_after')} />
              </Field>
            </div>
          </Card>
          <div className="mt-5 flex justify-end">
            <button className="btn" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button>
          </div>
        </form>
      )}
    </div>
  )
}
