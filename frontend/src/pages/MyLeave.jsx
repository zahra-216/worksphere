import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useFetch, useList } from '../hooks/useList'
import { cap, fmtDate, plural, today } from '../lib/format'
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
              { label: 'Used', value: dash.leave.used },
              { label: 'Remaining', value: dash.leave.remaining },
              { label: 'Awaiting decision', value: dash.leave.pending_requests },
            ]}
          />
        </div>
      )}

      <Card flush>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {!loading && rows.map((l) => (
                <tr key={l.id}>
                  <td>{cap(l.leave_type)}</td>
                  <td>{fmtDate(l.start_date)}</td>
                  <td>{fmtDate(l.end_date)}</td>
                  <td>{l.total_days}</td>
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

function LeaveForm({ open, onClose, onSaved }) {
  const [f, setF] = useState({ leave_type: 'annual', start_date: today(), end_date: today(), reason: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const days = f.start_date && f.end_date && f.end_date >= f.start_date
    ? Math.round((new Date(f.end_date) - new Date(f.start_date)) / 86400000) + 1
    : 0

  async function submit(e) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      await api('/leave-requests', { method: 'POST', body: f })
      setF({ leave_type: 'annual', start_date: today(), end_date: today(), reason: '' })
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
          <button className="btn" form="leave-form" disabled={busy || !days}>{busy ? 'Sending...' : 'Send request'}</button>
        </>
      }
    >
      <form id="leave-form" onSubmit={submit} className="space-y-4">
        <InfoNote>{NOTE}</InfoNote>
        <ErrorNote>{error}</ErrorNote>
        <Field label="Leave type">
          <select className="input" value={f.leave_type} onChange={set('leave_type')}>
            <option value="annual">Annual</option>
            <option value="sick">Sick</option>
            <option value="casual">Casual</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="From"><input className="input" type="date" required value={f.start_date} onChange={set('start_date')} /></Field>
          <Field label="To"><input className="input" type="date" required min={f.start_date} value={f.end_date} onChange={set('end_date')} /></Field>
        </div>
        {days > 0 && <p className="text-sm text-muted">{plural(days, 'day')} requested</p>}
        <Field label="Reason" hint="Optional">
          <textarea className="input" maxLength={1000} value={f.reason} onChange={set('reason')} placeholder="Briefly say why" />
        </Field>
      </form>
    </Modal>
  )
}
