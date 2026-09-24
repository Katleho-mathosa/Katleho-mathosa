import { useStore } from '../store/useStore'
import { OCCASIONS } from '../data/catalogue'
import { WEATHER_SCENARIOS } from '../data/weather'
import { Chip, Sheet, SimulatedBadge } from './ui'

/** Weather scenario + occasion picker (used from Studio). */
export function ContextSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const weatherId = useStore((s) => s.weatherId)
  const occasion = useStore((s) => s.occasion)
  const setWeather = useStore((s) => s.setWeather)
  const setOccasion = useStore((s) => s.setOccasion)
  return (
    <Sheet open={open} onClose={onClose} title="Today’s context">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
        Weather <SimulatedBadge label="Fake data" />
      </div>
      <div className="flex flex-col gap-2">
        {WEATHER_SCENARIOS.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => setWeather(w.id)}
            className={`flex min-h-12 items-center justify-between rounded-2xl border px-4 text-left text-sm ${weatherId === w.id ? 'border-accent bg-accent-soft' : 'border-line bg-surface'}`}
          >
            <span className="font-semibold">{w.label}</span>
            <span className="text-muted">{w.short}</span>
          </button>
        ))}
      </div>
      <div className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">Occasion</div>
      <div className="flex flex-wrap gap-2 pb-3">
        {OCCASIONS.map((o) => (
          <Chip key={o.id} size="sm" active={occasion === o.id} onClick={() => setOccasion(o.id)}>
            <span aria-hidden>{o.emoji}</span> {o.label}
          </Chip>
        ))}
      </div>
    </Sheet>
  )
}
