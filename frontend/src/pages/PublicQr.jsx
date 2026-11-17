import { useParams } from 'react-router-dom'
import { useFetch } from '../hooks/useList'
import { cap } from '../lib/format'
import { Card, ErrorNote, Loading } from '../components/ui'

// Opens when a normal phone scanner reads a person's QR. Read only.
// It shows who the QR belongs to and NEVER marks attendance.
export default function PublicQr() {
  const { token } = useParams()
  const { data, error } = useFetch(`/public/qr/${encodeURIComponent(token)}`)

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="mb-1 text-center text-xl font-semibold">WorkSphere</h1>
      <p className="mb-6 text-center text-sm text-muted">TT Metro Campus ID</p>

      {!data && !error && <Loading />}
      {error && <Card><ErrorNote>{error}</ErrorNote></Card>}

      {data && (
        <Card>
          <dl className="divide-y divide-line text-sm">
            {[
              ['Name', data.name],
              ['Staff ID', data.staff_code || '-'],
              ['Role', cap(data.role)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 rounded-lg bg-paper px-3 py-2 text-xs text-muted">
            This page only shows who the QR belongs to. Attendance is recorded by the campus scanner, not by scanning here.
          </p>
        </Card>
      )}
    </div>
  )
}
