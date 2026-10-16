import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'
import { ErrorNote } from '../components/ui'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password, remember)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="hidden flex-col justify-between bg-accent p-12 text-white lg:flex">
        <Logo />
        <div>
          <h2 className="max-w-md text-5xl font-semibold leading-[1.08]">
            Everyone, every task, one calm place.
          </h2>
          <p className="mt-5 max-w-sm text-base text-white/75">
            Attendance, leave and work for the whole campus team.
          </p>
        </div>
        <p className="text-sm text-white/60">TT Metro Campus</p>
      </div>

      <div className="flex items-center justify-center bg-white p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-10 text-accent lg:hidden"><Logo /></div>
          <h1 className="text-3xl font-semibold">Welcome back</h1>
          <p className="mb-8 mt-1.5 text-sm text-muted">Sign in to your WorkSphere account.</p>

          <ErrorNote>{error}</ErrorNote>

          <label className="label">Email</label>
          <input className="input mb-4" type="email" required placeholder="you@ttmetrocampus.com"
            value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className="label">Password</label>
          <div className="relative mb-4">
            <input className="input pr-10" type={show ? 'text' : 'password'} required placeholder="Enter your password"
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink" aria-label="Show password">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="mb-6 flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-muted">
              <input type="checkbox" className="accent-[var(--color-accent)]" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>
            <Link to="/forgot-password" className="font-medium text-accent">Forgot password?</Link>
          </div>

          <button className="btn w-full" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  )
}
