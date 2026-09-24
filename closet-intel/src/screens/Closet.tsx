import { useMemo, useState } from 'react'
import { Heart, Moon, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import type { Category, Item, Season } from '../types'
import { useStore } from '../store/useStore'
import { CATEGORIES, SEASONS, categoryPlural } from '../data/catalogue'
import { COLOURS, colour } from '../data/colours'
import { daysSince } from '../lib/date'
import { Button, Chip, ItemImage, Sheet, Swatch, Toggle, cx } from '../components/ui'
import { FORMALITY_LABELS } from '../components/TagEditor'
import { ItemDetail } from './ItemDetail'

interface Filters {
  colours: string[]
  seasons: Season[]
  formality: number[]
  stale: boolean
}
const EMPTY: Filters = { colours: [], seasons: [], formality: [], stale: false }

export function Closet() {
  const items = useStore((s) => s.items)
  const freshIds = useStore((s) => s.freshIds)
  const openAdd = useStore((s) => s.openAddFlow)
  const [cat, setCat] = useState<Category | 'all'>('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [filterOpen, setFilterOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const activeFilters =
    filters.colours.length + filters.seasons.length + filters.formality.length + (filters.stale ? 1 : 0)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((i) => {
      if (cat !== 'all' && i.category !== cat) return false
      if (q) {
        const hay = `${i.name} ${i.subcategory} ${colour(i.primaryColour).name} ${i.pattern} ${i.notes}`.toLowerCase()
        if (!q.split(/\s+/).every((w) => hay.includes(w))) return false
      }
      if (filters.colours.length && !filters.colours.includes(i.primaryColour) && !filters.colours.includes(i.secondaryColour)) return false
      if (filters.seasons.length && !filters.seasons.some((s) => i.seasons.includes(s))) return false
      if (filters.formality.length && !filters.formality.includes(i.formality)) return false
      if (filters.stale && daysSince(i.lastWorn) < 30) return false
      return true
    })
  }, [items, cat, query, filters])

  const groups = CATEGORIES.map((c) => ({ ...c, items: visible.filter((i) => i.category === c.id) })).filter((g) => g.items.length)
  const coloursInCloset = COLOURS.filter((c) => items.some((i) => i.primaryColour === c.id || i.secondaryColour === c.id))

  return (
    <div className="flex h-full flex-col">
      <header className="px-5 pb-2 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold">Closet</h1>
            <p className="text-sm text-muted">{items.length} items</p>
          </div>
          <Button onClick={() => openAdd(true)} className="rounded-full">
            <Plus size={18} /> Add
          </Button>
        </div>
        <div className="mt-3 flex gap-2">
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl border border-line bg-surface px-3">
            <Search size={18} className="text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, colour, notes…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="text-muted">
                <X size={16} />
              </button>
            )}
          </label>
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className={cx(
              'relative flex h-11 w-11 items-center justify-center rounded-2xl border',
              activeFilters ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface',
            )}
            aria-label="Filters"
          >
            <SlidersHorizontal size={18} />
            {activeFilters > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent">
                {activeFilters}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-3 pt-1">
        <Chip active={cat === 'all'} onClick={() => setCat('all')}>
          All
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
            {c.plural}
          </Chip>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        {filters.stale && (
          <p className="mb-2 flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2 text-xs text-muted">
            <Moon size={14} /> Showing items not worn in 30+ days — good candidates to wear or donate.
          </p>
        )}
        {groups.length === 0 && (
          <div className="mt-16 text-center text-sm text-muted">
            Nothing matches.
            <div className="mt-3">
              <Button variant="secondary" onClick={() => { setQuery(''); setFilters(EMPTY); setCat('all') }}>
                Clear search & filters
              </Button>
            </div>
          </div>
        )}
        {groups.map((g) => (
          <section key={g.id} className="mb-4">
            {cat === 'all' && (
              <h2 className="mb-2 mt-2 flex items-baseline gap-2 text-sm font-semibold">
                {categoryPlural(g.id)} <span className="text-xs font-normal text-muted">{g.items.length}</span>
              </h2>
            )}
            <div className="grid grid-cols-3 gap-2.5">
              {g.items.map((i) => (
                <ItemCard key={i.id} item={i} fresh={freshIds.includes(i.id)} onOpen={() => setDetailId(i.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filters" footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setFilters(EMPTY)}>Reset</Button>
          <Button className="flex-1" onClick={() => setFilterOpen(false)}>Show {visible.length} items</Button>
        </div>
      }>
        <FilterBody filters={filters} setFilters={setFilters} colours={coloursInCloset.map((c) => c.id)} />
      </Sheet>

      <ItemDetail itemId={detailId} onClose={() => setDetailId(null)} />
    </div>
  )
}

function ItemCard({ item, fresh, onOpen }: { item: Item; fresh: boolean; onOpen: () => void }) {
  const stale = daysSince(item.lastWorn) >= 30
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx(
        'group flex flex-col rounded-2xl bg-surface p-1.5 text-left shadow-[0_1px_0_var(--line)] transition-transform duration-150 active:scale-[.97]',
        fresh && 'ring-2 ring-accent',
      )}
    >
      <div className="relative flex aspect-square items-center justify-center rounded-xl bg-tile p-2">
        <ItemImage item={item} className="h-full w-full" />
        {item.favourite && <Heart size={13} className="absolute right-1.5 top-1.5 fill-danger text-danger" />}
        {stale && (
          <span className="absolute bottom-1 left-1 rounded-full bg-surface/90 px-1.5 text-[9px] font-semibold text-muted" title="Not worn in 30+ days">
            30d+
          </span>
        )}
        {fresh && <span className="absolute left-1 top-1 rounded-full bg-accent px-1.5 text-[9px] font-bold text-on-accent">NEW</span>}
      </div>
      <span className="mt-1 line-clamp-2 min-h-8 px-0.5 text-[11.5px] font-medium leading-tight">{item.name}</span>
    </button>
  )
}

function FilterBody({ filters, setFilters, colours }: { filters: Filters; setFilters: (f: Filters) => void; colours: string[] }) {
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  return (
    <div className="flex flex-col gap-5 pb-2">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Colour</h3>
        <div className="flex flex-wrap gap-1.5">
          {colours.map((id) => (
            <Chip key={id} size="sm" active={filters.colours.includes(id)} onClick={() => setFilters({ ...filters, colours: toggle(filters.colours, id) })}>
              <Swatch hex={colour(id).hex} size={12} /> {colour(id).name}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Season</h3>
        <div className="flex flex-wrap gap-1.5">
          {SEASONS.map((s) => (
            <Chip key={s.id} size="sm" active={filters.seasons.includes(s.id)} onClick={() => setFilters({ ...filters, seasons: toggle(filters.seasons, s.id) })}>
              {s.label}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Formality</h3>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Chip key={n} size="sm" active={filters.formality.includes(n)} onClick={() => setFilters({ ...filters, formality: toggle(filters.formality, n) })}>
              {n} · {FORMALITY_LABELS[n]}
            </Chip>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-surface px-3">
        <Toggle checked={filters.stale} onChange={(stale) => setFilters({ ...filters, stale })} label="Not worn in 30+ days" />
      </div>
    </div>
  )
}

