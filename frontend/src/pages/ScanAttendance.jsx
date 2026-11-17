import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { Check } from 'lucide-react'
import { api, clearDeviceKey, getDeviceKey, setDeviceKey } from '../lib/api'
import { cap } from '../lib/format'
import { Card, ErrorNote, Field, Loading, PageHeader, useToast } from '../components/ui'

const btn = 'inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60'

// Only registered devices may mark attendance. Check this device first, then show the scanner.
export default function ScanAttendance() {
  const [registered, setRegistered] = useState(null) // null = checking

  useEffect(() => {
    api('/attendance/device')
      .then((d) => {
        if (!d.registered) clearDeviceKey()
        setRegistered(d.registered)
      })
      .catch(() => setRegistered(false))
  }, [])

  if (registered === null) return <Loading />
  if (!registered) return <RegisterDevice onDone={() => setRegistered(true)} />
  return <Scanner onLostDevice={() => { clearDeviceKey(); setRegistered(false) }} />
}

function RegisterDevice({ onDone }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function register(e) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const res = await api('/attendance/devices', { method: 'POST', body: { name } })
      setDeviceKey(res.key)
      toast('This device can now mark attendance')
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Scan attendance" subtitle="Scan the QR code at the gate." />
      <Card title="This device is not registered">
        <p className="mb-4 text-sm text-muted">
          Only registered devices can mark attendance. If this is a campus scanner (for example the gate tablet),
          register it once. You can remove a device later from Settings.
        </p>
        <ErrorNote>{error}</ErrorNote>
        <form onSubmit={register} className="space-y-4">
          <Field label="Device name" hint="For example: Gate tablet">
            <input className="input" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <button className={btn} disabled={busy || !name.trim()}>{busy ? 'Registering...' : 'Register this device'}</button>
        </form>
      </Card>
    </div>
  )
}

function Scanner({ onLostDevice }) {
  const [step, setStep] = useState('scan') // scan | ready | done
  const [code, setCode] = useState('')
  const [info, setInfo] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const handled = useRef(false)

  useEffect(() => {
    if (step !== 'scan') return
    handled.current = false
    const scanner = new Html5Qrcode('reader')
    const started = scanner
      .start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 }, onScan)
      .catch(() => setError('Camera could not start. Please allow camera access.'))

    return () => {
      started.then(() => {
        try {
          scanner.stop().then(() => scanner.clear()).catch(() => {})
        } catch (e) {}
      })
    }
  }, [step])

  async function onScan(text) {
    if (handled.current) return
    handled.current = true
    try {
      const data = await api('/attendance/verify', { method: 'POST', body: { token: text } })
      setCode(text)
      setInfo(data)
      setError('')
      setStep('ready')
    } catch (e) {
      if (e.code === 'device_not_registered') return onLostDevice()
      setError(e.message)
      setTimeout(() => { handled.current = false }, 2500)
    }
  }

  async function mark() {
    setBusy(true)
    setError('')
    try {
      const data = await api('/attendance/mark', { method: 'POST', body: { token: code } })
      setResult(data)
      setStep('done')
    } catch (e) {
      if (e.code === 'device_not_registered') return onLostDevice()
      setError(e.message)
    }
    setBusy(false)
  }

  const isIn = info?.next === 'in'

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Scan attendance" subtitle="Scan the QR code at the gate." />
      <ErrorNote>{error}</ErrorNote>

      {step === 'scan' && (
        <Card title="Point your camera at the QR code">
          <div id="reader" className="overflow-hidden rounded-xl" />
        </Card>
      )}

      {step === 'ready' && (
        <Card title="QR code verified">
          <dl className="divide-y divide-line text-sm">
            {[
              ['Name', info.name],
              ['Staff code', info.ref || '-'],
              ['Role', cap(info.role)],
              ['Date', info.date],
              ['Time', info.time],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <button className={`${btn} mt-5`} disabled={busy} onClick={mark}>
            {busy ? 'Please wait...' : isIn ? 'Check In' : 'Check Out'}
          </button>
          <button className="mt-3 w-full text-sm text-muted" onClick={() => setStep('scan')}>Scan again</button>
        </Card>
      )}

      {step === 'done' && (
        <Card>
          <div className="flex flex-col items-center py-2">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-white">
              <Check className="h-8 w-8" />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold text-green-700">
              {result.scan_type === 'in' ? 'Check In Successful!' : 'Check Out Successful!'}
            </h2>
          </div>
          <dl className="mt-4 divide-y divide-line text-sm">
            {[
              ['Name', result.name],
              ['Staff code', result.ref || '-'],
              ['Role', cap(result.role)],
              ['Date', result.date],
              ['Time', result.time],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <Link to="/dashboard" className={`${btn} mt-5`}>Back to dashboard</Link>
        </Card>
      )}
    </div>
  )
}