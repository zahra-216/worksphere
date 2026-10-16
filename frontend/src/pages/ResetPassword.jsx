import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import Logo from '../components/Logo'
import { ErrorNote, InfoNote } from '../components/ui'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const data = await api('/reset-password', {
        method: 'POST',
        body: {
          token: params.get('token'),
          email: params.get('email'),
          password,
          password_confirmation: confirm,
        },
      })
      setMsg(data.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 text-accent"><Logo /></div>
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-line bg-white p-8">
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <p className="mb-6 mt-1 text-sm text-muted">Use at least 8 characters.</p>
        <ErrorNote>{error}</ErrorNote>
        {msg && <div className="mb-4"><InfoNote>{msg}</InfoNote></div>}
        {!msg && (
          <>
            <input className="input mb-3" type="password" required minLength={8} placeholder="New password"
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <input className="input mb-4" type="password" required minLength={8} placeholder="Confirm new password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <button className="btn w-full" disabled={busy}>{busy ? 'Saving...' : 'Reset password'}</button>
          </>
        )}
        <Link to="/login" className="mt-5 block text-center text-sm font-medium text-accent">Back to sign in</Link>
      </form>
    </div>
  )
}
