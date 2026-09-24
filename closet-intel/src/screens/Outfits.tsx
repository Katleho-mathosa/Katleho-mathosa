import { useMemo, useState } from 'react'
import { CalendarPlus, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react'
import type { Occasion, Outfit, WearEntry } from '../types'
import { useItemMap, useStore } from '../store/useStore'
import { OCCASIONS, occasionLabel } from '../data/catalogue'
import { dayNum, longDate, todayISO, weekOf, weekdayShort } from '../lib/date'
import { learnTaste } from '../ai/mockAi'
import { Mannequin } from '../components/Mannequin'
import { Button, Chip, Sheet, SimulatedBadge, cx } from '../components/ui'

export function Outfits() {
  const outfits = useStore((s) => s.outfits)
  const wearLog = useStore((s) => s.wearLog)
  const itemMap = useItemMap()
  const rate = useStore((s) => s.rateOutfit)
  const del = useStore((s) => s.deleteOutfit)
  const restore = useStore((s) => s.restoreOutfit)
  const studioLoad = useStore((s) => s.studioLoad)
  const setTab = useStore((s) => s.setTab)
  const toast = useStore((s) => s.toast)
  const [filter, setFilter] = useState<Occasion | 'all'>('all')
  const [day, setDay] = useState<string | null>(null)

  const shown = filter === 'all' ? outfits : outfits.filter((o) => o.occasion === filter)
  const openInStudio = (o: { slots: Outfit['slots']; tucked: boolean }, outfitId: string | null) => {
    studioLoad(o.slots, o.tucked, { outfitId })
    setTab('studio')
  }

  return (
    <div className="h-full overflow-y-auto pb-8">
      <header className="px-5 pt-4">
        <h1 className="font-display text-3xl font-semibold">Outfits</h1>
        <p className="text-sm text-muted">{outfits.length} saved</p>
      </header>

      <WeekStrip wearLog={wearLog} itemMap={itemMap} onDay={setDay} />

      <TasteCard outfits={outfits} itemMap={itemMap} />

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
        <Chip size="sm" active={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
        {OCCASIONS.map((o) => (
          <Chip key={o.id} size="sm" active={filter === o.id} onClick={() => setFilter(o.id)}>
            <span aria-hidden>{o.emoji}</span> {o.label}
          </Chip>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 px-5">
        {shown.map((o) => (
          <div key={o.id} className="anim-rise flex flex-col rounded-3xl border border-line bg-surface p-2">
            <button type="button" onClick={() => openInStudio(o, o.id)} className="flex h-52 items-center justify-center rounded-2xl bg-tile" aria-label={`Open ${o.name} in Studio`}>
              <Mannequin slots={o.slots} items={itemMap} tucked={o.tucked} className="h-48 w-auto" />
            </button>
            <div className="mt-2 px-1">
              <div className="truncate text-sm font-semibold">{o.name}</div>
              <div className="text-[11px] text-muted">{occasionLabel(o.occasion)}</div>
            </div>
            <div className="mt-1 flex items-center">
              <RateBtn up active={o.rating === 1} onClick={() => rate(o.id, o.rating === 1 ? 0 : 1)} />
              <RateBtn active={o.rating === -1} onClick={() => rate(o.id, o.rating === -1 ? 0 : -1)} />
              <button
                type="button"
                aria-label={`Delete ${o.name}`}
                onClick={() => {
                  del(o.id)
                  toast(`Deleted “${o.name}”`, { action: { label: 'Undo', run: () => restore(o) } })
                }}
                className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-surface-2"
              >
                <Trash2 size={17} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {shown.length === 0 && (
        <p className="mx-5 mt-3 rounded-2xl bg-surface p-4 text-center text-sm text-muted">
          No saved outfits{filter !== 'all' ? ` for ${occasionLabel(filter)}` : ''} yet. Build one in Studio and tap Save.
        </p>
      )}

      <DaySheet
        date={day}
        onClose={() => setDay(null)}
        entry={wearLog.find((w) => w.date === day)}
        itemMap={itemMap}
        onOpen={(e) => { setDay(null); openInStudio({ slots: e.slots, tucked: false }, e.outfitId ?? null) }}
      />
    </div>
  )
}

function RateBtn({ up, active, onClick }: { up?: boolean; active: boolean; onClick: () => void }) {
  const Icon = up ? ThumbsUp : ThumbsDown
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={up ? 'Thumbs up' : 'Thumbs down'}
      aria-pressed={active}
      className={cx(
        'flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-150',
        active ? (up ? 'bg-accent-soft text-accent' : 'bg-warn-soft text-warn') : 'text-muted hover:bg-surface-2',
      )}
    >
      <Icon size={18} className={cx(active && 'fill-current')} />
    </button>
  )
}

function WeekStrip({ wearLog, itemMap, onDay }: { wearLog: WearEntry[]; itemMap: ReturnType<typeof useItemMap>; onDay: (d: string) => void }) {
  const today = todayISO()
  const days = weekOf(today)
  return (
    <section className="mt-4 px-5">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">This week</h2>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const e = wearLog.find((w) => w.date === d)
          const isToday = d === today
          const future = d > today
          return (
            <button
              key={d}
              type="button"
              onClick={() => onDay(d)}
              className={cx(
                'flex flex-col items-center rounded-2xl border px-0.5 pb-1 pt-1.5 transition-colors duration-150',
                isToday ? 'border-accent bg-accent-soft' : 'border-line bg-surface',
              )}
              aria-label={`${longDate(d)}${e ? (e.planned ? ' — planned' : ' — worn') : ''}`}
            >
              <span className={cx('text-[10px] font-semibold uppercase', isToday ? 'text-accent' : 'text-muted')}>{weekdayShort(d).slice(0, 2)}</span>
              <span className="text-sm font-semibold">{dayNum(d)}</span>
              <div className="mt-0.5 flex h-16 w-full items-center justify-center">
                {e ? (
                  <Mannequin slots={e.slots} items={itemMap} tucked={false} className={cx('h-16 w-auto', e.planned && 'opacity-60')} />
                ) : future || isToday ? (
                  <CalendarPlus size={16} className="text-muted/60" />
                ) : (
                  <span className="text-xs text-muted/50">—</span>
                )}
              </div>
              {e && <span className={cx('text-[8.5px] font-bold uppercase', e.planned ? 'text-muted' : 'text-accent')}>{e.planned ? 'Plan' : 'Worn'}</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function DaySheet({
  date, onClose, entry, itemMap, onOpen,
}: {
  date: string | null
  onClose: () => void
  entry?: WearEntry
  itemMap: ReturnType<typeof useItemMap>
  onOpen: (e: WearEntry) => void
}) {
  const outfits = useStore((s) => s.outfits)
  const planDay = useStore((s) => s.planDay)
  const toast = useStore((s) => s.toast)
  if (!date) return null
  const past = date < todayISO()
  return (
    <Sheet open onClose={onClose} title={longDate(date)}>
      {entry ? (
        <div className="flex gap-3 rounded-2xl border border-line bg-surface p-3">
          <div className="flex w-20 items-center justify-center rounded-xl bg-tile">
            <Mannequin slots={entry.slots} items={itemMap} tucked={false} className="h-40 w-auto" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className={cx('text-xs font-bold uppercase', entry.planned ? 'text-muted' : 'text-accent')}>{entry.planned ? 'Planned' : 'Worn'}</span>
            <ul className="mt-1 flex flex-col gap-0.5 text-sm">
              {Object.values(entry.slots).map((id) => itemMap[id!] && <li key={id} className="truncate">{itemMap[id!].name}</li>)}
            </ul>
            <div className="mt-auto flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => onOpen(entry)}>Open</Button>
              {entry.planned && (
                <Button variant="ghost" onClick={() => { planDay(date, null); toast('Plan cleared') }}>Clear</Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl bg-surface p-4 text-sm text-muted">
          {past ? 'Nothing logged for this day. Use “Wear today” in Studio to log outfits.' : 'Nothing planned yet.'}
        </p>
      )}
      {!past && (
        <>
          <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">{entry ? 'Change plan' : 'Plan an outfit'}</h3>
          <div className="grid grid-cols-3 gap-2 pb-3">
            {outfits.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => { planDay(date, o); toast(`Planned “${o.name}”`); onClose() }}
                className="flex flex-col items-center rounded-2xl border border-line bg-surface p-1.5"
              >
                <div className="flex h-28 w-full items-center justify-center rounded-xl bg-tile">
                  <Mannequin slots={o.slots} items={itemMap} tucked={o.tucked} className="h-26 w-auto" />
                </div>
                <span className="mt-1 w-full truncate text-center text-[11px] font-medium">{o.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </Sheet>
  )
}

function TasteCard({ outfits, itemMap }: { outfits: Outfit[]; itemMap: ReturnType<typeof useItemMap> }) {
  const taste = useMemo(() => learnTaste({ outfits, wearLog: [] }), [outfits])
  const top = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k.split('|').map((id) => itemMap[id]?.name))
      .filter((pair) => pair.every(Boolean))
      .slice(0, 2)
  const liked = top(taste.liked)
  const disliked = top(taste.disliked)
  const rated = outfits.filter((o) => o.rating !== 0).length
  return (
    <section className="mx-5 mt-5 rounded-3xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">What I’ve learned</h2>
        <SimulatedBadge label="Taste learning" />
      </div>
      {rated === 0 ? (
        <p className="mt-2 text-sm text-muted">Rate outfits with 👍 / 👎 and suggestions will lean towards your taste.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-1.5 text-[13px]">
          {liked.map((p) => (
            <p key={p.join()} className="flex gap-2"><ThumbsUp size={14} className="mt-0.5 shrink-0 text-accent" /> {p.join(' + ')}</p>
          ))}
          {disliked.map((p) => (
            <p key={p.join()} className="flex gap-2"><ThumbsDown size={14} className="mt-0.5 shrink-0 text-warn" /> {p.join(' + ')}</p>
          ))}
          <p className="mt-1 text-[11px] text-muted">From {rated} rated outfit{rated === 1 ? '' : 's'}. Suggestions boost liked pairs and avoid disliked ones.</p>
        </div>
      )}
    </section>
  )
}
