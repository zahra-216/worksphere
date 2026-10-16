import { useEffect, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { apiText } from '../lib/api'
import { Loading, Modal } from './ui'

// Shows the person's gate QR. The endpoint needs the login token, so we fetch the SVG and show it from memory.
export default function QrModal({ person, onClose }) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!person) return
    setSvg(''); setError('')
    apiText(`/users/${person.id}/qr`).then(setSvg).catch((e) => setError(e.message))
  }, [person])

  function download() {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${person.staff_code || 'qr'}-${person.name.replace(/\s+/g, '-')}.svg`
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
          <p className="mt-3 text-xs text-faint">Scan this at the gate scanner to record check-in and check-out.</p>
        </div>
      )}
    </Modal>
  )
}
