const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
const KEY = 'ws_token'

export const getToken = () => localStorage.getItem(KEY) || sessionStorage.getItem(KEY)

export function setToken(token, remember = true) {
  clearToken()
  ;(remember ? localStorage : sessionStorage).setItem(KEY, token)
}

export function clearToken() {
  localStorage.removeItem(KEY)
  sessionStorage.removeItem(KEY)
}

function authHeaders(extra = {}) {
  const headers = { Accept: 'application/json', ...extra }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

function handleUnauthorized(res) {
  if (res.status === 401 && getToken()) {
    clearToken()
    window.location.href = '/login'
  }
}

// body = JSON object, form = FormData (for photo uploads)
export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = authHeaders()

  let payload
  if (form) {
    payload = form
  } else if (body) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const res = await fetch(BASE + path, { method, headers, body: payload })
  const data = await res.json().catch(() => null)

  handleUnauthorized(res)

  if (!res.ok) {
    const firstError = data?.errors ? Object.values(data.errors)[0]?.[0] : null
    const err = new Error(firstError || data?.message || 'Something went wrong.')
    err.status = res.status
    err.errors = data?.errors
    throw err
  }

  return data
}

// For endpoints that return a file (the QR code SVG). Needs the token, so <img src> will not work.
export async function apiText(path) {
  const res = await fetch(BASE + path, { headers: authHeaders() })
  handleUnauthorized(res)
  if (!res.ok) throw new Error('Could not load file.')
  return res.text()
}
