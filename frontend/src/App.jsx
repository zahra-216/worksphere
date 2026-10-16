import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import { InternsPage, LecturersPage, StaffPage } from './pages/People'
import PersonForm from './pages/PersonForm'
import LeaveManagement from './pages/LeaveManagement'
import MyLeave from './pages/MyLeave'
import Attendance from './pages/Attendance'
import WorkAllocation from './pages/WorkAllocation'
import MyTasks from './pages/MyTasks'
import Projects from './pages/Projects'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import ChangePassword from './pages/ChangePassword'
import { Loading } from './components/ui'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  return user ? children : <Navigate to="/login" replace />
}

// Pages only the admin may open. Everyone else is sent back to the dashboard.
function AdminOnly({ children }) {
  const { isAdmin } = useAuth()
  return isAdmin ? children : <Navigate to="/dashboard" replace />
}

// Pages for staff, interns and lecturers (the admin does not log work or request leave)
function PeopleOnly({ children }) {
  const { isAdmin } = useAuth()
  return isAdmin ? <Navigate to="/dashboard" replace /> : children
}

const admin = (el) => <AdminOnly>{el}</AdminOnly>

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/change-password" element={<ChangePassword />} />

        <Route path="/my-tasks" element={<PeopleOnly><MyTasks /></PeopleOnly>} />
        <Route path="/my-leave" element={<PeopleOnly><MyLeave /></PeopleOnly>} />

        <Route path="/staff" element={admin(<StaffPage />)} />
        <Route path="/staff/new" element={admin(<PersonForm role="staff" />)} />
        <Route path="/staff/:id/edit" element={admin(<PersonForm role="staff" />)} />

        <Route path="/interns" element={admin(<InternsPage />)} />
        <Route path="/interns/new" element={admin(<PersonForm role="intern" />)} />
        <Route path="/interns/:id/edit" element={admin(<PersonForm role="intern" />)} />

        <Route path="/lecturers" element={admin(<LecturersPage />)} />
        <Route path="/lecturers/new" element={admin(<PersonForm role="lecturer" />)} />
        <Route path="/lecturers/:id/edit" element={admin(<PersonForm role="lecturer" />)} />

        <Route path="/leave-management" element={admin(<LeaveManagement />)} />
        <Route path="/attendance" element={admin(<Attendance />)} />
        <Route path="/work-allocation" element={admin(<WorkAllocation />)} />
        <Route path="/projects" element={admin(<Projects />)} />
        <Route path="/reports" element={admin(<Reports />)} />
        <Route path="/settings" element={admin(<Settings />)} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
