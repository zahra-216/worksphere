import { useEffect, useState } from 'react'
import { api } from '../lib/api'

// Loads a Laravel paginated endpoint. Re-fetches whenever path or params change.
// Returns { rows, meta, loading, error, reload }
export function useList(path, params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString()

  const [state, setState] = useState({ rows: [], meta: null, loading: true, error: '' })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    api(`${path}?${qs}`)
      .then((res) => {
        if (!alive) return
        const { data, ...meta } = res
        setState({ rows: data, meta, loading: false, error: '' })
      })
      .catch((e) => alive && setState((s) => ({ ...s, loading: false, error: e.message })))
    return () => { alive = false }
  }, [path, qs, tick])

  return { ...state, reload: () => setTick((t) => t + 1) }
}

// Loads any endpoint once (and again on reload / when deps change)
export function useFetch(path, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!path) return
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    api(path)
      .then((data) => alive && setState({ data, loading: false, error: '' }))
      .catch((e) => alive && setState({ data: null, loading: false, error: e.message }))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps])

  return { ...state, reload: () => setTick((t) => t + 1) }
}

export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
