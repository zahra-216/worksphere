import { createContext, useContext, useEffect, useState } from 'react'
import { api, clearToken, getToken, setToken } from '../lib/api'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!getToken())

  useEffect(() => {
    if (!getToken()) return
    api('/me')
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password, remember) {
    const data = await api('/login', { method: 'POST', body: { email, password } })
    setToken(data.token, remember)
    setUser(data.user)
    return data.user
  }

  async function logout() {
    try {
      await api('/logout', { method: 'POST' })
    } catch (e) {
      /* ignore */
    }
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}
