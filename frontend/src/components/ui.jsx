import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'

/* ---------- Status ---------- */

const DOT = {
  pending: 'bg-warn',
  approved: 'bg-good',
  completed: 'bg-good',
  active: 'bg-good',
  present: 'bg-good',
  'on time': 'bg-good',
  rejected: 'bg-bad',
  late: 'bg-warn',
  inactive: 'bg-faint',
}

// A small dot + label. No filled pills, keeps the page calm.
export function Badge({ status, label }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm capitalize text-ink">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status] || 'bg-faint'}`} />
      {label || status}
    </span>
  )
}

/* ---------- Layout bits ---------- */

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[1.65rem] font-semibold leading-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function Card({ title, action, children, className = '', flush = false }) {
  return (
    <section className={`rounded-2xl border border-line bg-white ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 pt-5">
          {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
          {action}
        </div>
      )}
      <div className={flush ? 'pt-3' : 'p-5'}>{children}</div>
    </section>
  )
}

// One card, several numbers split by hairlines
export function StatStrip({ items }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      {/* shifted by 1px so the first row/column borders are clipped away */}
      <div className="-ml-px -mt-px grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        {items.map((s) => (
          <div key={s.label} className="border-l border-t border-line px-5 py-4">
            <p className="text-xs font-medium text-muted">{s.label}</p>
            <p className="mt-1.5 font-display text-3xl font-semibold text-ink">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Avatar({ name, src, size = 36 }) {
  const style = { height: size, width: size, fontSize: size * 0.38 }
  if (src) return <img src={src} alt={name} style={style} className="shrink-0 rounded-full object-cover" />
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (
    <div style={style} className="flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent">
      {initials}
    </div>
  )
}

export function PersonCell({ name, sub, src }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} src={src} size={34} />
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{name}</p>
        {sub && <p className="truncate text-xs text-muted">{sub}</p>}
      </div>
    </div>
  )
}

/* ---------- Controls ---------- */

export function SearchBox({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      <input className="input pl-9" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

// Underline tabs. tabs = [{ value, label }]
export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition ${
            value === t.value ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, hint, error, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-faint">{hint}</p>}
      {error && <p className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  )
}

export function ErrorNote({ children }) {
  if (!children) return null
  return <p className="mb-4 rounded-xl border border-bad/20 bg-bad/5 px-3.5 py-2.5 text-sm text-bad">{children}</p>
}

export function InfoNote({ children }) {
  return <p className="rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm text-accent">{children}</p>
}

export function Loading({ text = 'Loading...' }) {
  return <p className="px-5 py-10 text-center text-sm text-muted">{text}</p>
}

export function Empty({ text = 'Nothing here yet.' }) {
  return <p className="px-5 py-12 text-center text-sm text-muted">{text}</p>
}

// Table body states in one place
export function TableState({ loading, error, empty, text }) {
  if (loading) return <Loading />
  if (error) return <p className="px-5 py-10 text-center text-sm text-bad">{error}</p>
  if (empty) return <Empty text={text} />
  return null
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.last_page <= 1) {
    return meta ? <p className="px-5 py-3 text-xs text-muted">{meta.total} {meta.total === 1 ? 'record' : 'records'}</p> : null
  }
  return (
    <div className="flex items-center justify-between border-t border-line px-5 py-3">
      <p className="text-xs text-muted">Showing {meta.from}-{meta.to} of {meta.total}</p>
      <div className="flex items-center gap-1">
        <button className="icon-btn" disabled={meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)} aria-label="Previous">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2 text-xs font-medium text-ink">{meta.current_page} / {meta.last_page}</span>
        <button className="icon-btn" disabled={meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)} aria-label="Next">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/* ---------- Modal + confirm ---------- */

export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        className={`flex max-h-[92vh] w-full ${width} flex-col rounded-t-2xl bg-white sm:rounded-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function Confirm({ open, title, text, confirmLabel = 'Delete', danger = true, busy, onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="max-w-sm"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" style={danger ? { background: 'var(--color-bad)', borderColor: 'var(--color-bad)' } : undefined} disabled={busy} onClick={onConfirm}>
            {busy ? 'Please wait...' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-muted">{text}</p>
    </Modal>
  )
}

/* ---------- Toasts ---------- */

const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const push = useCallback((message, type = 'ok') => {
    const id = Math.random()
    setItems((l) => [...l, { id, message, type }])
    setTimeout(() => setItems((l) => l.filter((i) => i.id !== id)), 3500)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-2.5 rounded-xl bg-ink px-4 py-3 text-sm text-white">
            <span className={`h-1.5 w-1.5 rounded-full ${t.type === 'error' ? 'bg-bad' : 'bg-good'}`} />
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
