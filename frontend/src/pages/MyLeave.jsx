import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useFetch, useList } from '../hooks/useList'
import { addMinutes, cap, fmtDate, leaveSize, plural, today } from '../lib/format'
import { Badge, Card, Confirm, ErrorNote, Field, InfoNote, Modal, PageHeader, Pagination, StatStrip, TableState, useToast } from '../components/ui'

const NOTE = 'Leave should be requested at least one day before.'

// Staff / interns / lecturers: request leave and track requests
export default function MyLeave() {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [cancelling, setCancelling] = useState(null)
  const [busy, setBusy] = useState(false)

  const { data: dash, reload: reloadDash } = useFetch('/dashboard')
  const { rows, meta, loading, error, reload } = useList('/leave-requests', { page })

  async function cancel() {
    setBusy(true)
    try {
      await api(`/leave-requests/${cancelling.id}`, { method: 'DELETE' })
      toast('Request cancelled')
      setCancelling(null)
      reload(); reloadDash()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title="My leave" subtitle={NOTE}>
        <button className="btn" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> Request leave</button>
      </PageHeader>

      {dash?.leave && (
        <div className="mb-6">
          <StatStrip
            items={[
              { label: 'Yearly allowance', value: dash.leave.allowed },
              { label: 'Used', value: dash.leave.used_label },
              { label: 'Remaining', value: dash.leave.remaining_label },
              { label: 'Awaiting decision', value: dash.leave.pending_requests },
            ]}
          />
        </div>
      )}

      <Card flush>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr><th>Type</th><th>From</th><th>To</th><th>Duration</th><th>Reason</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {!loading && rows.map((l) => (
                <tr key={l.id}>
                  <td>{cap(l.leave_type)}</td>
                  <td>{fmtDate(l.start_date)}</td>
                  <td>{fmtDate(l.end_date)}</td>
                  <td>{leaveSize(l)}</td>
                  <td className="max-w-[16rem] truncate text-muted">{l.reason || '-'}</td>
                  <td><Badge status={l.status} /></td>
                  <td>
                    <div className="flex justify-end">
                      {l.status === 'pending' && (
                        <button className="icon-btn danger" title="Cancel request" onClick={() => setCancelling(l)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <TableState loading={loading} error={error} empty={!rows.length} text="You haven't requested any leave yet." />
        </div>
        <Pagination meta={meta} onPage={setPage} />
      </Card>

      <LeaveForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); toast('Request sent to the admin'); reload(); reloadDash() }}
      />
      <Confirm
        open={!!cancelling}
        title="Cancel this request?"
        text="The request will be removed. You can submit a new one any time."
        confirmLabel="Cancel request"
        busy={busy}
        onConfirm={cancel}
        onClose={() => setCancelling(null)}
      />
    </div>
  )
}

const DURATIONS = [
  { value: 'full', label: 'Full day', hint: 'One or more whole days' },
  { value: 'half', label: 'Half day', hint: '3 hours or more' },
  { value: 'short', label: 'Short leave', hint: '1 hour permission' },
]

const blankForm = () => ({
  leave_type: 'annual', duration_type: 'full', start_date: today(), end_date: today(),
  start_time: '09:00', end_time: '13:00', reason: '',
})

function LeaveForm({ open, onClose, onSaved }) {
  const [f, setF] = useState(blankForm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const isFull = f.duration_type === 'full'
  const isHalf = f.duration_type === 'half'
  const shortEnd = addMinutes(f.start_time, 60)

  const days = isFull && f.start_date && f.end_date && f.end_date >= f.start_date
    ? Math.round((new Date(f.end_date) - new Date(f.start_date)) / 86400000) + 1
    : 0
  const halfMinutes = isHalf && f.start_time && f.end_time
    ? (Number(f.end_time.slice(0, 2)) * 60 + Number(f.end_time.slice(3))) - (Number(f.start_time.slice(0, 2)) * 60 + Number(f.start_time.slice(3)))
    : 0
  const halfOk = halfMinutes >= 180
  const valid = isFull ? days > 0 : isHalf ? !!f.start_date && halfOk : !!f.start_date && !!shortEnd

  async function submit(e) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const body = { leave_type: f.leave_type, duration_type: f.duration_type, start_date: f.start_date, reason: f.reason }
      if (isFull) body.end_date = f.end_date
      else { body.start_time = f.start_time; if (isHalf) body.end_time = f.end_time }
      await api('/leave-requests', { method: 'POST', body })
      setF(blankForm())
      onSaved()
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
      title="Request leave"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" form="leave-form" disabled={busy || !valid}>{busy ? 'Sending...' : 'Send request'}</button>
        </>
      }
    >
      <form id="leave-form" onSubmit={submit} className="space-y-4">
        <InfoNote>{NOTE}</InfoNote>
        <p className="text-xs text-muted">Short leave is 1 hour. 3 hours or more is a half day.</p>
        <ErrorNote>{error}</ErrorNote>
        <Field label="Leave type">
          <select className="input" value={f.leave_type} onChange={set('leave_type')}>
            <option value="annual">Annual</option>
            <option value="sick">Sick</option>
            <option value="casual">Casual</option>
          </select>
        </Field>
        <Field label="How long?" hint="3 short leaves = 1 half day · 2 half days = 1 full day">
          <div className="grid grid-cols-3 gap-2">
            {DURATIONS.map((d) => (
              <button
                type="button"
                key={d.value}
                onClick={() => setF((s) => ({ ...s, duration_type: d.value }))}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${f.duration_type === d.value ? 'border-accent bg-accent/10 font-semibold' : 'border-line'}`}
              >
                <span className="block">{d.label}</span>
                <span className="block text-xs font-normal text-muted">{d.hint}</span>
              </button>
            ))}
          </div>
        </Field>
        {isFull ? (
          <div className="grid grid-cols-2 gap-4">
            <Field label="From"><input className="input" type="date" required value={f.start_date} onChange={set('start_date')} /></Field>
            <Field label="To"><input className="input" type="date" required min={f.start_date} value={f.end_date} onChange={set('end_date')} /></Field>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" ><input className="input" type="date" required value={f.start_date} onChange={set('start_date')} /></Field>
            <Field label="From time"><input className="input" type="time" required value={f.start_time} onChange={set('start_time')} /></Field>
            {isHalf
              ? <Field label="To time" hint="At least 3 hours after the start"><input className="input" type="time" required value={f.end_time} onChange={set('end_time')} /></Field>
              : <Field label="To time" hint="Short leave is always 1 hour"><input className="input" type="time" value={shortEnd} readOnly disabled /></Field>}
          </div>
        )}
        {days > 0 && <p className="text-sm text-muted">{plural(days, 'day')} requested</p>}
        {isHalf && f.end_time && !halfOk && <p className="text-sm text-danger">A half day must be 3 hours or more. For 1 hour, choose Short leave.</p>}
        <Field label="Reason" hint="Optional">
          <textarea className="input" maxLength={1000} value={f.reason} onChange={set('reason')} placeholder="Briefly say why" />
        </Field>
      </form>
    </Modal>
  )
}
