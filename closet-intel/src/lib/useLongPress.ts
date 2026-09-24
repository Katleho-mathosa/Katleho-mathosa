import { useCallback, useEffect, useRef } from 'react'

/**
 * Long-press detection that works for touch and mouse (pointer events).
 * `start(key, e)` on pointerdown; call `consumeClick()` in the click handler —
 * it returns true (and swallows the click) when a long-press just fired.
 */
export function useLongPress<K>(onLong: (key: K) => void, ms = 520) {
  const timer = useRef<number | null>(null)
  const fired = useRef(false)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const cb = useRef(onLong)
  cb.current = onLong

  const clear = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    origin.current = null
    window.removeEventListener('pointerup', clear)
    window.removeEventListener('pointercancel', clear)
    window.removeEventListener('pointermove', onMove)
  }, [])

  const onMove = useCallback((e: PointerEvent) => {
    if (!origin.current) return
    if (Math.hypot(e.clientX - origin.current.x, e.clientY - origin.current.y) > 10) clear()
  }, [clear])

  const start = useCallback(
    (key: K, e: React.PointerEvent) => {
      clear()
      fired.current = false
      origin.current = { x: e.clientX, y: e.clientY }
      window.addEventListener('pointerup', clear)
      window.addEventListener('pointercancel', clear)
      window.addEventListener('pointermove', onMove)
      timer.current = window.setTimeout(() => {
        fired.current = true
        try {
          navigator.vibrate?.(12)
        } catch {
          /* not supported */
        }
        cb.current(key)
        clear()
      }, ms)
    },
    [clear, onMove, ms],
  )

  const consumeClick = useCallback(() => {
    if (fired.current) {
      fired.current = false
      return true
    }
    return false
  }, [])

  useEffect(() => clear, [clear])
  return { start, consumeClick }
}
