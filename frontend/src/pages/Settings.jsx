import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useFetch } from '../hooks/useList'
import { fmtDate } from '../lib/format'
import { Card, Confirm, ErrorNote, Field, Loading, PageHeader, useToast } from '../components/ui'

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

      <div className="mt-8"><ScanDevices /></div>
    </div>
  )
}

// Devices allowed to mark attendance. Add one from the Scan attendance page; remove it here.
function ScanDevices() {
  const toast = useToast()
  const { data, loading, error, reload } = useFetch('/attendance/devices')
  const [removing, setRemoving] = useState(null)
  const [busy, setBusy] = useState(false)

  async function remove() {
    setBusy(true)
    try {
      await api(`/attendance/devices/${removing.id}`, { method: 'DELETE' })
      toast('Device removed')
      setRemoving(null)
      reload()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Scanner devices" action={<span className="text-xs text-muted">Only these can mark attendance</span>}>
      <ErrorNote>{error}</ErrorNote>
      {loading && !data && <Loading />}
      {data && data.length === 0 && (
        <p className="text-sm text-muted">No devices yet. Open Scan attendance on the device you want to allow and register it.</p>
      )}
      {data && data.length > 0 && (
        <ul className="divide-y divide-line">
          {data.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">{d.name}</p>
                <p className="text-xs text-muted">
                  Added {fmtDate(d.created_at)}{d.registrar?.name ? ` by ${d.registrar.name}` : ''}
                  {' · '}{d.last_used_at ? `last used ${fmtDate(d.last_used_at)}` : 'not used yet'}
                </p>
              </div>
              <button className="btn-ghost btn-danger !py-1.5" onClick={() => setRemoving(d)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      <Confirm
        open={!!removing}
        title="Remove this device?"
        text={`${removing?.name || 'This device'} will stop being able to mark attendance straight away. You can register it again later.`}
        confirmLabel="Remove device"
        busy={busy}
        onConfirm={remove}
        onClose={() => setRemoving(null)}
      />
    </Card>
  )
}
