import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import Logo from '../components/Logo'
import { ErrorNote, InfoNote } from '../components/ui'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setMsg(''); setBusy(true)
    try {
      const data = await api('/forgot-password', { method: 'POST', body: { email } })
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
        <h1 className="text-2xl font-semibold">Forgot password?</h1>
        <p className="mb-6 mt-1 text-sm text-muted">Enter your email and we'll send you a reset link.</p>
        <ErrorNote>{error}</ErrorNote>
        {msg && <div className="mb-4"><InfoNote>{msg}</InfoNote></div>}
        <input className="input mb-4" type="email" required placeholder="you@ttmetrocampus.com"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn w-full" disabled={busy}>{busy ? 'Sending...' : 'Send reset link'}</button>
        <Link to="/login" className="mt-5 block text-center text-sm font-medium text-accent">Back to sign in</Link>
      </form>
    </div>
  )
}
