import type { StateStorage } from 'zustand/middleware'

type Listener = (kind: 'quota' | 'unavailable') => void
const listeners = new Set<Listener>()
let problem: 'quota' | 'unavailable' | null = null
let replayed = false

/** Subscribe to storage problems. A problem that happened before subscribing (e.g. during hydration) is replayed. */
export function onStorageProblem(fn: Listener) {
  listeners.add(fn)
  if (problem && !replayed) {
    replayed = true
    fn(problem)
  }
  return () => {
    listeners.delete(fn)
  }
}
function report(kind: 'quota' | 'unavailable') {
  if (problem) return
  problem = kind
  if (listeners.size) replayed = true
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
