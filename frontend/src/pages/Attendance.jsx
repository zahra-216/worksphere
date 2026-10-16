import { useState } from 'react'
import { Copy, Plus, ScanLine, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useFetch } from '../hooks/useList'
import { cap, fmtDate, fmtTime, today } from '../lib/format'
import { Badge, Card, Confirm, ErrorNote, InfoNote, Modal, PageHeader, PersonCell, StatStrip, TableState, useToast } from '../components/ui'

export default function Attendance() {
  const [date, setDate] = useState(today())
  const [devicesOpen, setDevicesOpen] = useState(false)
  const { data, loading, error } = useFetch(`/gate-log?date=${date}`)

  const rows = data?.records || []
  const s = data?.summary

  return (
    <div>
      <PageHeader title="Attendance" subtitle={fmtDate(date)}>
        <input className="input !w-auto" type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <button className="btn" onClick={() => setDevicesOpen(true)}><ScanLine className="h-4 w-4" /> Gate scanners</button>
      </PageHeader>

      <div className="mb-6">
        <StatStrip
          items={[
            { label: 'Present', value: s?.present ?? '-' },
            { label: 'Absent', value: s?.absent ?? '-' },
            { label: 'Late', value: s?.late ?? '-' },
          ]}
        />
      </div>

      <Card title="Check-ins" flush>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr><th>Name</th><th>Role</th><th>Check-in</th><th>Check-out</th><th>Status</th></tr>
            </thead>
            <tbody>
              {!loading && rows.map((r) => (
                <tr key={r.user_id}>
                  <td><PersonCell name={r.name} sub={r.staff_code} src={r.photo_url} /></td>
                  <td>{cap(r.role)}</td>
                  <td>{fmtTime(r.check_in)}</td>
                  <td>{r.check_out ? fmtTime(r.check_out) : <span className="text-faint">-</span>}</td>
                  <td><Badge status={r.late ? 'late' : 'on time'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <TableState loading={loading} error={error} empty={!rows.length} text="No check-ins on this day." />
        </div>
      </Card>

      <DevicesModal open={devicesOpen} onClose={() => setDevicesOpen(false)} />
    </div>
  )
}

// Gate scanners: a tablet/phone at the gate opens its private link and scans everyone's QR
function DevicesModal({ open, onClose }) {
  const toast = useToast()
  const { data, loading, error, reload } = useFetch(open ? '/gate-devices' : null, [open])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [fresh, setFresh] = useState(null) // scanner_url, shown once
  const [toRemove, setToRemove] = useState(null)

  async function add(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const res = await api('/gate-devices', { method: 'POST', body: { name } })
      setFresh(res.scanner_url)
      setName('')
      reload()
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  async function toggle(d) {
    try {
      await api(`/gate-devices/${d.id}/toggle`, { method: 'POST' })
      reload()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function remove() {
    try {
      await api(`/gate-devices/${toRemove.id}`, { method: 'DELETE' })
      toast('Scanner removed')
      setToRemove(null)
      reload()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Gate scanners" width="max-w-xl">
        <p className="mb-4 text-sm text-muted">
          Open a scanner's private link on the device at the gate. Everyone scans their own QR code to check in and out.
        </p>

        <form onSubmit={add} className="mb-4 flex gap-2">
          <input className="input" required placeholder="Scanner name, e.g. Main gate" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn" disabled={busy}><Plus className="h-4 w-4" /> Add</button>
        </form>
        <ErrorNote>{err}</ErrorNote>

        {fresh && (
          <div className="mb-4 space-y-2">
            <InfoNote>Copy this link now. For security it is shown only once.</InfoNote>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2">
              <code className="min-w-0 flex-1 break-all text-xs">{fresh}</code>
              <button className="icon-btn" onClick={() => { navigator.clipboard?.writeText(fresh); toast('Link copied') }} aria-label="Copy">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {loading && <p className="py-4 text-center text-sm text-muted">Loading...</p>}
        {error && <p className="text-sm text-bad">{error}</p>}
        {data && data.length === 0 && <p className="py-4 text-center text-sm text-muted">No scanners yet.</p>}
        <ul className="divide-y divide-line">
          {data?.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium">{d.name}</p>
                <p className="text-xs text-muted">{d.last_used_at ? `Last used ${fmtDate(d.last_used_at)} ${fmtTime(d.last_used_at)}` : 'Never used'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button className="btn-ghost !py-1.5" onClick={() => toggle(d)}>{d.is_active ? 'Disable' : 'Enable'}</button>
                <button className="icon-btn danger" onClick={() => setToRemove(d)} aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      </Modal>

      <Confirm
        open={!!toRemove}
        title="Remove scanner?"
        text={`${toRemove?.name} will stop working immediately.`}
        confirmLabel="Remove"
        onConfirm={remove}
        onClose={() => setToRemove(null)}
      />
    </>
  )
}
