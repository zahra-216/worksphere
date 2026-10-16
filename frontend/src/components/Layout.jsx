import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart3, BookOpen, CalendarDays, FolderKanban, GraduationCap, KeyRound,
  LayoutDashboard, ListChecks, LogOut, Menu, ScanLine, Settings, Users, X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'
import { Avatar } from './ui'

const ADMIN_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/staff', label: 'Staff', icon: Users },
  { to: '/leave-management', label: 'Leave', icon: CalendarDays },
  { to: '/attendance', label: 'Attendance', icon: ScanLine },
  { to: '/work-allocation', label: 'Work allocation', icon: ListChecks },
  { to: '/interns', label: 'Interns', icon: GraduationCap },
  { to: '/lecturers', label: 'Lecturers', icon: BookOpen },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const PERSONAL_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/my-tasks', label: 'My work', icon: ListChecks },
  { to: '/my-leave', label: 'My leave', icon: CalendarDays },
  { to: '/change-password', label: 'Password', icon: KeyRound },
]

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const nav = isAdmin ? ADMIN_NAV : PERSONAL_NAV

  const sidebar = (
    <div className="flex h-full w-64 flex-col border-r border-line bg-white">
      <div className="px-6 pb-6 pt-6 text-accent"><Logo /></div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-paper hover:text-ink'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar name={user?.name} src={user?.photo_url} size={34} />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
            <p className="text-xs capitalize text-muted">{isAdmin ? 'Administrator' : user?.role}</p>
          </div>
        </div>
        <button
          onClick={async () => { await logout(); navigate('/login') }}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-paper hover:text-ink"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.9} /> Log out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen lg:block">{sidebar}</aside>

      {open && (
        <div className="no-print fixed inset-0 z-40 flex lg:hidden">
          <div className="h-full">{sidebar}</div>
          <div className="flex-1 bg-ink/40" onClick={() => setOpen(false)} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="no-print flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
          <div className="text-accent"><Logo /></div>
          <button className="icon-btn" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8"><Outlet /></main>
      </div>
    </div>
  )
}
