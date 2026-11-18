import { useEffect, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { apiText } from '../lib/api'
import { Loading, Modal } from './ui'

// Shows the person's gate QR. The endpoint needs the login token, so we fetch the SVG and show it from memory.
export default function QrModal({ person, onClose }) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')
  const [type, setType] = useState('code') // code = original QR, link = QR that opens a details page

  useEffect(() => { setType('code') }, [person])

  useEffect(() => {
    if (!person) return
    setSvg(''); setError('')
    apiText(`/users/${person.id}/qr${type === 'link' ? '?type=link' : ''}`).then(setSvg).catch((e) => setError(e.message))
  }, [person, type])

  function download() {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${person.staff_code || 'qr'}-${person.name.replace(/\s+/g, '-')}${type === 'link' ? '-link' : ''}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  function print() {
    const w = window.open('', '_blank', 'width=420,height=560')
    if (!w) return
    w.document.write(
      `<html><head><title>${person.name}</title></head><body style="font-family:sans-serif;text-align:center;padding:32px">
       <div style="width:260px;margin:0 auto">${svg}</div>
       <h2 style="margin:16px 0 4px">${person.name}</h2><p style="margin:0;color:#555">${person.staff_code || ''}</p>
       <script>window.onload=()=>{window.print()}<\/script></body></html>`
    )
    w.document.close()
  }

  return (
    <Modal
      open={!!person}
      onClose={onClose}
      title="Attendance QR"
      width="max-w-sm"
      footer={
        <>
          <button className="btn-ghost" onClick={download} disabled={!svg}><Download className="h-4 w-4" /> Download</button>
          <button className="btn" onClick={print} disabled={!svg}><Printer className="h-4 w-4" /> Print</button>
        </>
      }
    >
      {person && (
        <div className="text-center">
          {!svg && !error && <Loading />}
          {error && <p className="text-sm text-bad">{error}</p>}
          {svg && <div className="mx-auto w-56 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />}
          <p className="mt-4 font-semibold">{person.name}</p>
          <p className="text-sm text-muted">{person.staff_code}</p>
          {type === 'code' ? (
            <>
              <p className="mt-3 text-xs text-faint">This is the standard QR (same as the ID cards). The gate scanner uses it for check-in and check-out.</p>
              <button className="mt-2 text-xs font-medium text-accent hover:underline" onClick={() => setType('link')}>Show the phone-friendly QR</button>
            </>
          ) : (
            <>
              <p className="mt-3 text-xs text-faint">This QR works in the gate scanner too. A normal phone scanner opens a page with this person's name, ID and role, and never marks attendance.</p>
              <button className="mt-2 text-xs font-medium text-accent hover:underline" onClick={() => setType('code')}>Back to the standard QR</button>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
