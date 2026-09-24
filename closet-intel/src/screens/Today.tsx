import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, CloudRain, CloudSun, Monitor, Moon, RotateCcw, Settings2, Sun, Sparkles, ThermometerSun, Wand2 } from 'lucide-react'
import type { SuggestedOutfit, WeatherScenario } from '../types'
import { useItemMap, useStore, type Theme } from '../store/useStore'
import { suggestOutfits, clashCheck, comboKey, resolve } from '../ai/mockAi'
import { OCCASIONS } from '../data/catalogue'
import { WEATHER_SCENARIOS } from '../data/weather'
import { longDate, todayISO } from '../lib/date'
import { Mannequin } from '../components/Mannequin'
import { Button, Chip, IconButton, Sheet, SimulatedBadge, cx } from '../components/ui'
import { useWeather } from './studio/useStudioActions'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export function Today() {
  const items = useStore((s) => s.items)
  const outfits = useStore((s) => s.outfits)
  const wearLog = useStore((s) => s.wearLog)
  const weatherId = useStore((s) => s.weatherId)
  const occasion = useStore((s) => s.occasion)
  const setWeather = useStore((s) => s.setWeather)
  const setOccasion = useStore((s) => s.setOccasion)
  const studioLoad = useStore((s) => s.studioLoad)
  const setTab = useStore((s) => s.setTab)
  const itemMap = useItemMap()
  const weather = useWeather()
  const [requested, setRequested] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Combos already shown for this weather + occasion ("Show 3 different" skips them).
  const [seen, setSeen] = useState<{ ctx: string; keys: string[] }>({ ctx: '', keys: [] })
  const ctxKey = `${weatherId}|${occasion}`
  const avoid = seen.ctx === ctxKey ? seen.keys : []

  // Once asked, suggestions follow the weather/occasion live.
  const suggestions = useMemo<SuggestedOutfit[]>(
    () => (requested ? suggestOutfits(items, weather, occasion, {}, { outfits, wearLog }, { avoid: new Set(avoid) }) : []),
    [requested, items, weather, occasion, outfits, wearLog, avoid.join()],
  )

  const suggest = () => {
    if (!requested) return setRequested(true)
    const shown = suggestions.map((s) => comboKey(s.slots))
    // Start over once every combination has been shown.
    setSeen({ ctx: ctxKey, keys: suggestions.length < 3 ? [] : [...avoid, ...shown] })
  }

  const open = (s: SuggestedOutfit) => {
    studioLoad(s.slots, s.tucked, { outfitId: null, ai: true })
    setTab('studio')
  }

  return (
    <div className="h-full overflow-y-auto pb-8">
      <header className="flex items-start justify-between px-5 pt-4">
        <div>
          <p className="text-sm text-muted">{longDate(todayISO())}</p>
          <h1 className="font-display text-3xl font-semibold">{greeting()}</h1>
        </div>
        <IconButton label="Settings" onClick={() => setSettingsOpen(true)} className="-mr-2">
          <Settings2 size={20} />
        </IconButton>
      </header>

      <section className="px-5">
        <WeatherCard weather={weather} />
        <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
          {WEATHER_SCENARIOS.map((w) => (
            <Chip key={w.id} size="sm" active={weatherId === w.id} onClick={() => setWeather(w.id)}>
              {w.id === 'rain' ? <CloudRain size={14} /> : w.id === 'hot' ? <ThermometerSun size={14} /> : <CloudSun size={14} />}
              {w.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-5 px-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">What’s the occasion?</h2>
        <div className="flex flex-wrap gap-2">
          {OCCASIONS.map((o) => (
            <Chip key={o.id} size="sm" active={occasion === o.id} onClick={() => setOccasion(o.id)}>
              <span aria-hidden>{o.emoji}</span> {o.label}
            </Chip>
          ))}
        </div>
        <Button className="mt-4 w-full min-h-13 text-base" onClick={suggest}>
          <Wand2 size={19} /> {requested ? 'Show 3 different' : 'Suggest 3 outfits'}
        </Button>
        {requested && <p className="mt-2 text-center text-[11px] text-muted">Suggestions update as you change the weather or occasion.</p>}
      </section>

      {requested && (
        <section className="mt-5 px-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Suggestions{avoid.length ? ' · more options' : ''}</h2>
          {suggestions.length === 0 && (
            <p className="rounded-2xl bg-surface p-4 text-sm text-muted">
              Nothing in your closet fits these rules for this occasion. Try another occasion, or add a few items.
            </p>
          )}
          <div className="flex flex-col gap-3">
            {suggestions.map((s, i) => (
              <SuggestionCard key={`${ctxKey}-${s.id}`} s={s} index={i} itemMap={itemMap} weather={weather} onOpen={() => open(s)} />
            ))}
          </div>
          <p className="mt-3 px-1 text-[11px] leading-snug text-muted">
            Rule-based mock: neutrals go with anything, max one bold colour and one busy pattern, formality within ±1, warmth for the
            weather, a removable layer on big swings, fresh picks over recent ones, and your thumbs up/down.
          </p>
        </section>
      )}

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

function WeatherCard({ weather }: { weather: WeatherScenario }) {
  const Icon = weather.rain ? CloudRain : weather.maxTemp >= 28 ? Sun : CloudSun
  const swing = weather.maxTemp - weather.minTemp
  return (
    <div className="relative mt-4 overflow-hidden rounded-3xl bg-accent p-5 text-on-accent shadow-sm">
      <div className="absolute -right-6 -top-6 opacity-15">
        <Icon size={140} strokeWidth={1.2} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold opacity-90">Johannesburg · today</span>
        <span className="rounded-full bg-black/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Fake weather</span>
      </div>
      <div className="mt-2 flex items-end gap-3">
        <Icon size={40} strokeWidth={1.8} />
        <div className="font-display text-5xl font-semibold leading-none">
          {weather.minTemp}°<span className="mx-1 text-3xl opacity-70">→</span>
          {weather.maxTemp}°
        </div>
      </div>
      <p className="mt-2 text-sm opacity-90">{weather.summary}</p>
      {swing > 12 && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/15 px-3 py-1 text-xs font-semibold">
          <Sparkles size={12} /> {swing}° swing — dress in layers
        </p>
      )}
    </div>
  )
}

function SuggestionCard({
  s, index, itemMap, weather, onOpen,
}: {
  s: SuggestedOutfit
  index: number
  itemMap: ReturnType<typeof useItemMap>
  weather: WeatherScenario
  onOpen: () => void
}) {
  const warnings = clashCheck(resolve(s.slots, itemMap, s.tucked), weather).filter((w) => w.level === 'warn')
  const names = Object.values(s.slots).map((id) => itemMap[id!]?.name).filter(Boolean)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="anim-rise flex w-full items-stretch gap-3 rounded-3xl border border-line bg-surface p-3 text-left transition-transform duration-150 active:scale-[.98]"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex w-24 shrink-0 items-center justify-center rounded-2xl bg-tile">
        <Mannequin slots={s.slots} items={itemMap} tucked={s.tucked} className="h-52 w-auto" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-semibold">Option {index + 1}</span>
          <SimulatedBadge className="ml-auto" />
        </div>
        <p className="mt-1 text-sm leading-snug">{s.reason}</p>
        <ul className="mt-2 flex flex-wrap gap-1">
          {names.map((n) => (
            <li key={n} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">{n}</li>
          ))}
        </ul>
        {warnings.length > 0 && <p className="mt-2 text-[11px] font-medium text-warn">⚠ {warnings[0].message}</p>}
        <span className="mt-auto flex items-center gap-1 pt-2 text-sm font-semibold text-accent">
          Open in Studio <ChevronRight size={16} />
        </span>
      </div>
    </button>
  )
}

function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const resetDemo = useStore((s) => s.resetDemo)
  const toast = useStore((s) => s.toast)
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    if (!open) setConfirm(false)
  }, [open])
  const themes: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: 'system', label: 'System', icon: Monitor },
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
  ]
  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Appearance</h3>
      <div className="grid grid-cols-3 gap-2">
        {themes.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            className={cx(
              'flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border text-sm font-semibold',
              theme === t.id ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface',
            )}
          >
            <t.icon size={18} /> {t.label}
          </button>
        ))}
      </div>
      <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted">Demo data</h3>
      <p className="mb-3 text-sm text-muted">
        Everything lives in this browser only (localStorage). No accounts, no cloud, no real AI — every smart feature is simulated.
      </p>
      {confirm ? (
        <div className="flex gap-2 pb-2">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirm(false)}>Cancel</Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              resetDemo()
              toast('Sample closet restored')
              onClose()
            }}
          >
            Yes, reset everything
          </Button>
        </div>
      ) : (
        <Button variant="secondary" className="mb-2 w-full" onClick={() => setConfirm(true)}>
          <RotateCcw size={16} /> Reset to sample closet
        </Button>
      )}
    </Sheet>
  )
}
