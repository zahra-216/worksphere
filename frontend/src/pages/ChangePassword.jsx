import { useState } from 'react'
import { api } from '../lib/api'
import { Card, ErrorNote, Field, PageHeader, useToast } from '../components/ui'

export default function ChangePassword() {
  const toast = useToast()
  const [f, setF] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (f.password !== f.password_confirmation) return setError('The new passwords do not match.')
    setBusy(true)
    try {
      await api('/change-password', { method: 'POST', body: f })
      setF({ current_password: '', password: '', password_confirmation: '' })
      toast('Password changed')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Change password" subtitle="Other devices will be signed out." />
      <form onSubmit={submit}>
        <Card>
          <ErrorNote>{error}</ErrorNote>
          <div className="space-y-4">
            <Field label="Current password">
              <input className="input" type="password" required value={f.current_password} onChange={set('current_password')} />
            </Field>
            <Field label="New password" hint="At least 8 characters.">
              <input className="input" type="password" required minLength={8} value={f.password} onChange={set('password')} />
            </Field>
            <Field label="Confirm new password">
              <input className="input" type="password" required minLength={8} value={f.password_confirmation} onChange={set('password_confirmation')} />
            </Field>
          </div>
        </Card>
        <div className="mt-5 flex justify-end">
          <button className="btn" disabled={busy}>{busy ? 'Saving...' : 'Update password'}</button>
        </div>
      </form>
    </div>
  )
}
