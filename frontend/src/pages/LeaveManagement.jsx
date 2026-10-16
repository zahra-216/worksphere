import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { api } from '../lib/api'
import { useDebounced, useList } from '../hooks/useList'
import { cap, fmtDate, plural } from '../lib/format'
import { Badge, Card, Modal, PageHeader, PersonCell, Pagination, SearchBox, TableState, Tabs, useToast } from '../components/ui'

// Admin view: review, approve or reject leave requests
export default function LeaveManagement() {
  const toast = useToast()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)
  const q = useDebounced(search)

  const { rows, meta, loading, error, reload } = useList('/leave-requests', { status, search: q, page })

  async function decide(leave, decision) {
    setBusy(true)
    try {
      await api(`/leave-requests/${leave.id}/decision`, { method: 'PATCH', body: { status: decision } })
      toast(`Leave ${decision}. ${leave.user?.name} has been emailed.`)
      setOpen(null)
      reload()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const quick = (l, d, icon, cls, title) => (
    <button className={`icon-btn ${cls}`} title={title} disabled={busy}
      onClick={(e) => { e.stopPropagation(); decide(l, d) }}>{icon}</button>
  )

  return (
    <div>
      <PageHeader title="Leave" subtitle="Requests arrive here and in your email." />

      <Card flush>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3">
          <Tabs
            value={status}
            onChange={(v) => { setStatus(v); setPage(1) }}
            tabs={[
              { value: '', label: 'All' }, { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' },
            ]}
          />
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by name or ID..." />
        </div>

        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr><th>Name</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {!loading && rows.map((l) => (
                <tr key={l.id} className="clickable" onClick={() => setOpen(l)}>
                  <td><PersonCell name={l.user?.name} sub={l.user?.staff_code} src={l.user?.photo_url} /></td>
                  <td>{cap(l.leave_type)}</td>
                  <td>{fmtDate(l.start_date)}</td>
                  <td>{fmtDate(l.end_date)}</td>
                  <td>{l.total_days}</td>
                  <td><Badge status={l.status} /></td>
                  <td>
                    <div className="flex justify-end">
                      {l.status === 'pending' && (
                        <>
                          {quick(l, 'approved', <Check className="h-4 w-4" />, 'good', 'Approve')}
                          {quick(l, 'rejected', <X className="h-4 w-4" />, 'danger', 'Reject')}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <TableState loading={loading} error={error} empty={!rows.length} text="No leave requests." />
        </div>
        <Pagination meta={meta} onPage={setPage} />
      </Card>

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title="Leave request"
        footer={
          open?.status === 'pending' ? (
            <>
              <button className="btn-ghost btn-danger" disabled={busy} onClick={() => decide(open, 'rejected')}>Reject</button>
              <button className="btn" disabled={busy} onClick={() => decide(open, 'approved')}>Approve</button>
            </>
          ) : (
            <button className="btn-ghost" onClick={() => setOpen(null)}>Close</button>
          )
        }
      >
        {open && (
          <div className="space-y-5">
            <PersonCell name={open.user?.name} sub={`${open.user?.staff_code} · ${cap(open.user?.role)}`} src={open.user?.photo_url} />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div><dt className="label">Type</dt><dd>{cap(open.leave_type)}</dd></div>
              <div><dt className="label">Duration</dt><dd>{plural(open.total_days, 'day')}</dd></div>
              <div><dt className="label">From</dt><dd>{fmtDate(open.start_date)}</dd></div>
              <div><dt className="label">To</dt><dd>{fmtDate(open.end_date)}</dd></div>
              <div className="col-span-2"><dt className="label">Reason</dt><dd className="text-muted">{open.reason || 'No reason given.'}</dd></div>
              <div><dt className="label">Status</dt><dd><Badge status={open.status} /></dd></div>
              <div><dt className="label">Requested</dt><dd>{fmtDate(open.created_at)}</dd></div>
            </dl>
          </div>
        )}
      </Modal>
    </div>
  )
}
