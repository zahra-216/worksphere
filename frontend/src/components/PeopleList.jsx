import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListChecks, Pencil, Plus, QrCode, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useDebounced, useList } from '../hooks/useList'
import { fmtDate } from '../lib/format'
import { Badge, Card, Confirm, PageHeader, PersonCell, Pagination, SearchBox, TableState, Tabs, useToast } from './ui'
import QrModal from './QrModal'

// Column sets per role. Interns have no department column.
const COLUMNS = {
  staff: [
    ['ID', (p) => <span className="text-muted">{p.staff_code}</span>],
    ['Name', (p) => <PersonCell name={p.name} sub={p.email} src={p.photo_url} />],
    ['Position', (p) => p.position || '-'],
    ['Type', (p) => p.employment_type || '-'],
    ['Contact', (p) => p.phone || '-'],
  ],
  intern: [
    ['ID', (p) => <span className="text-muted">{p.staff_code}</span>],
    ['Name', (p) => <PersonCell name={p.name} sub={p.email} src={p.photo_url} />],
    ['University', (p) => p.university || '-'],
    ['Joined', (p) => fmtDate(p.joined_date)],
    ['Contact', (p) => p.phone || '-'],
  ],
  lecturer: [
    ['ID', (p) => <span className="text-muted">{p.staff_code}</span>],
    ['Name', (p) => <PersonCell name={p.name} sub={p.email} src={p.photo_url} />],
    ['Position', (p) => p.position || '-'],
    ['Contact', (p) => p.phone || '-'],
  ],
}

const COPY = {
  staff: { title: 'Staff', one: 'staff member', add: 'Add staff', empty: 'No staff yet.' },
  intern: { title: 'Interns', one: 'intern', add: 'Add intern', empty: 'No interns yet.' },
  lecturer: { title: 'Lecturers', one: 'lecturer', add: 'Add lecturer', empty: 'No lecturers yet.' },
}

export default function PeopleList({ role, basePath }) {
  const navigate = useNavigate()
  const toast = useToast()
  const copy = COPY[role]
  const columns = COLUMNS[role]

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [qr, setQr] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const q = useDebounced(search)

  const { rows, meta, loading, error, reload } = useList('/users', { role, search: q, status, page })

  async function remove() {
    setBusy(true)
    try {
      await api(`/users/${toDelete.id}`, { method: 'DELETE' })
      toast(`${toDelete.name} removed`)
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
      <PageHeader title={copy.title} subtitle={meta ? `${meta.total} in total` : ' '}>
        <button className="btn" onClick={() => navigate(`${basePath}/new`)}><Plus className="h-4 w-4" /> {copy.add}</button>
      </PageHeader>

      <Card flush>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3">
          <Tabs
            value={status}
            onChange={(v) => { setStatus(v); setPage(1) }}
            tabs={[{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
          />
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder={`Search ${copy.title.toLowerCase()}...`} />
        </div>

        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                {columns.map(([h]) => <th key={h}>{h}</th>)}
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.map((p) => (
                <tr key={p.id}>
                  {columns.map(([h, cell]) => <td key={h}>{cell(p)}</td>)}
                  <td><Badge status={p.status} /></td>
                  <td>
                    <div className="flex justify-end gap-0.5">
                      {role === 'intern' && (
                        <button className="icon-btn" title="View work" onClick={() => navigate(`/work-allocation?assigned_to=${p.id}`)}>
                          <ListChecks className="h-4 w-4" />
                        </button>
                      )}
                      <button className="icon-btn" title="Attendance QR" onClick={() => setQr(p)}><QrCode className="h-4 w-4" /></button>
                      <button className="icon-btn" title="Edit" onClick={() => navigate(`${basePath}/${p.id}/edit`)}><Pencil className="h-4 w-4" /></button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setToDelete(p)}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <TableState loading={loading} error={error} empty={!rows.length} text={search ? 'No matches.' : copy.empty} />
        </div>
        <Pagination meta={meta} onPage={setPage} />
      </Card>

      <QrModal person={qr} onClose={() => setQr(null)} />
      <Confirm
        open={!!toDelete}
        title={`Delete ${copy.one}?`}
        text={`${toDelete?.name} will be removed permanently. To keep their records, set them to inactive instead.`}
        busy={busy}
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}
