import { useEffect, useState } from 'react'
import { CalendarHeart, Plus, Shirt, Sun, UserRound } from 'lucide-react'
import { useStore, type Tab } from './store/useStore'
import { onStorageProblem } from './lib/storage'
import { cx } from './components/ui'
import { Today } from './screens/Today'
import { Closet } from './screens/Closet'
import { Studio } from './screens/studio/Studio'
import { Outfits } from './screens/Outfits'
import { AddItemFlow } from './screens/AddItem'

function useSystemDark() {
  const q = '(prefers-color-scheme: dark)'
  const [dark, setDark] = useState(() => window.matchMedia?.(q).matches ?? false)
  useEffect(() => {
    const m = window.matchMedia?.(q)
    if (!m) return
    const on = (e: MediaQueryListEvent) => setDark(e.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return dark
}

export default function App() {
  const tab = useStore((s) => s.tab)
  const theme = useStore((s) => s.theme)
  const toast = useStore((s) => s.toast)
  const systemDark = useSystemDark()
  const dark = theme === 'dark' || (theme === 'system' && systemDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#181614' : '#F6F2EC')
  }, [dark])

  useEffect(
    () =>
      onStorageProblem((kind) =>
        toast(kind === 'quota' ? 'Storage is full — recent changes are kept for this session only' : 'Storage unavailable — changes will last until you close the tab', { tone: 'warn' }),
      ),
    [toast],
  )

  return (
    <div className="flex min-h-full w-full items-center justify-center sm:p-6">
      <div
        className={cx(
          'relative flex h-[100dvh] w-full flex-col overflow-hidden bg-canvas text-ink',
          'sm:h-[min(844px,calc(100dvh-48px))] sm:w-[390px] sm:rounded-[46px] sm:shadow-[0_30px_80px_-20px_rgba(0,0,0,.35)] sm:ring-[10px] sm:ring-[#1c1b1a]',
        )}
      >
        <main className="min-h-0 flex-1" key={tab}>
          <div className="anim-fade h-full">
            {tab === 'today' && <Today />}
            {tab === 'closet' && <Closet />}
            {tab === 'studio' && <Studio />}
            {tab === 'outfits' && <Outfits />}
          </div>
        </main>
        <TabBar />
        <AddItemFlow />
        <Toasts />
      </div>
    </div>
  )
}

const TABS: { id: Tab; label: string; icon: typeof Sun }[] = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'closet', label: 'Closet', icon: Shirt },
  { id: 'studio', label: 'Studio', icon: UserRound },
  { id: 'outfits', label: 'Outfits', icon: CalendarHeart },
]

function TabBar() {
  const tab = useStore((s) => s.tab)
  const setTab = useStore((s) => s.setTab)
  const openAdd = useStore((s) => s.openAddFlow)
  const btn = (t: (typeof TABS)[number]) => {
    const Icon = t.icon
    const on = tab === t.id
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => setTab(t.id)}
        aria-current={on ? 'page' : undefined}
        className={cx('flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors duration-150', on ? 'text-accent' : 'text-muted')}
      >
        <Icon size={22} strokeWidth={on ? 2.4 : 1.9} />
        {t.label}
      </button>
    )
  }
  return (
    <nav className="relative z-20 flex items-center border-t border-line bg-canvas/95 px-2 pb-[max(env(safe-area-inset-bottom),6px)] backdrop-blur">
      {TABS.slice(0, 2).map(btn)}
      <div className="flex flex-1 justify-center">
        <button
          type="button"
          onClick={() => openAdd(true)}
          aria-label="Add item"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-on-accent shadow-md transition-transform duration-150 active:scale-95"
        >
          <Plus size={24} strokeWidth={2.4} />
        </button>
      </div>
      {TABS.slice(2).map(btn)}
    </nav>
  )
}

function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[max(env(safe-area-inset-top),14px)] z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            'anim-rise pointer-events-auto flex max-w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium shadow-lg',
            t.tone === 'warn' ? 'bg-warn text-white dark:text-black' : 'bg-ink text-canvas',
          )}
          onClick={() => dismiss(t.id)}
        >
          <span className="min-w-0">{t.message}</span>
          {t.action && (
            <button type="button" className="font-bold underline" onClick={() => { t.action!.run(); dismiss(t.id) }}>
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
