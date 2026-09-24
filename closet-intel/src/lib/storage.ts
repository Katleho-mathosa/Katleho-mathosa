import type { StateStorage } from 'zustand/middleware'

type Listener = (kind: 'quota' | 'unavailable') => void
const listeners = new Set<Listener>()
export function onStorageProblem(fn: Listener) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
let warned = false
function report(kind: 'quota' | 'unavailable') {
  if (warned) return
  warned = true
  listeners.forEach((l) => l(kind))
}

/** localStorage wrapped so the app keeps working (in memory) when storage is blocked or full. */
export const safeStorage: StateStorage = {
  getItem(name) {
    try {
      return window.localStorage.getItem(name)
    } catch {
      report('unavailable')
      return null
    }
  },
  setItem(name, value) {
    try {
      window.localStorage.setItem(name, value)
    } catch (e) {
      report(e instanceof DOMException && /quota/i.test(e.name + e.message) ? 'quota' : 'unavailable')
    }
  },
  removeItem(name) {
    try {
      window.localStorage.removeItem(name)
    } catch {
      /* ignore */
    }
  },
}
