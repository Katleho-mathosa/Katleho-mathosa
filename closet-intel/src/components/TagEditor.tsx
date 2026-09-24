import { useState, type ReactNode } from 'react'
import { AlertTriangle, ChevronDown } from 'lucide-react'
import type { Confidence, Item, Layer, Pattern, Season } from '../types'
import { CATEGORIES, LAYERS, PATTERNS, SEASONS, SUBCATEGORIES, categoryLabel } from '../data/catalogue'
import { COLOURS, colour } from '../data/colours'
import { Chip, Swatch, cx } from './ui'

export const FORMALITY_LABELS = ['', 'Very casual', 'Casual', 'Smart casual', 'Smart', 'Formal']
export const WARMTH_LABELS = ['', 'Very light', 'Light', 'Medium', 'Warm', 'Very warm']

export type TagField = 'subcategory' | 'primaryColour' | 'secondaryColour' | 'pattern' | 'formality' | 'warmth' | 'layer' | 'seasons'

type Editable = Pick<Item, 'category' | 'subcategory' | 'primaryColour' | 'secondaryColour' | 'pattern' | 'formality' | 'warmth' | 'layer' | 'seasons'>

const CONF_FIELD: Partial<Record<TagField, 'subcategory' | 'primaryColour' | 'pattern' | 'formality' | 'warmth'>> = {
  subcategory: 'subcategory',
  primaryColour: 'primaryColour',
  pattern: 'pattern',
  formality: 'formality',
  warmth: 'warmth',
}

function ConfidenceLabel({ c }: { c: Confidence }) {
  return (
    <span
      className={cx(
        'rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        c === 'High' && 'bg-accent-soft text-accent',
        c === 'Medium' && 'bg-surface-2 text-muted',
        c === 'Low' && 'bg-warn text-white dark:text-black',
      )}
    >
      {c}
    </span>
  )
}

function Row({
  label,
  value,
  open,
  onToggle,
  children,
  confidence,
}: {
  label: string
  value: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
  confidence?: Confidence
}) {
  const low = confidence === 'Low'
  return (
    <div className={cx('rounded-2xl border transition-colors duration-150', low ? 'border-warn/60 bg-warn-soft' : 'border-line bg-surface')}>
      <button type="button" onClick={onToggle} className="flex min-h-12 w-full items-center gap-2 px-3.5 text-left" aria-expanded={open}>
        <span className="w-24 shrink-0 text-xs font-medium text-muted">{label}</span>
        <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm font-semibold">{value}</span>
        {low && <AlertTriangle size={14} className="text-warn" aria-label="Check this" />}
        {confidence && <ConfidenceLabel c={confidence} />}
        <ChevronDown size={16} className={cx('text-muted transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && <div className="anim-rise flex flex-wrap gap-1.5 px-3 pb-3">{children}</div>}
    </div>
  )
}

export function TagEditor({
  value,
  onChange,
  confidence,
  fields = ['subcategory', 'primaryColour', 'secondaryColour', 'pattern', 'formality', 'warmth', 'layer', 'seasons'],
}: {
  value: Editable
  onChange: (patch: Partial<Item>) => void
  confidence?: Partial<Record<string, Confidence>>
  fields?: TagField[]
}) {
  const [open, setOpen] = useState<TagField | null>(null)
  const toggle = (f: TagField) => setOpen((o) => (o === f ? null : f))
  const conf = (f: TagField) => (confidence && CONF_FIELD[f] ? confidence[CONF_FIELD[f]!] : undefined)
  const pick = (patch: Partial<Item>) => {
    onChange(patch)
    setOpen(null)
  }

  const rows: Record<TagField, ReactNode> = {
    subcategory: (
      <Row
        key="sub"
        label="Type"
        value={
          <>
            {value.subcategory}
            <span className="font-normal text-muted">· {categoryLabel(value.category)}</span>
          </>
        }
        open={open === 'subcategory'}
        onToggle={() => toggle('subcategory')}
        confidence={conf('subcategory') ?? confidence?.category}
      >
        {CATEGORIES.map((c) => (
          <div key={c.id} className="w-full">
            <div className="mb-1 mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{c.plural}</div>
            <div className="flex flex-wrap gap-1.5">
              {SUBCATEGORIES.filter((s) => s.category === c.id).map((s) => (
                <Chip key={s.name} size="sm" active={value.subcategory === s.name} onClick={() => pick({ subcategory: s.name })}>
                  {s.name}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </Row>
    ),
    primaryColour: (
      <Row
        key="pc"
        label="Main colour"
        value={
          <>
            <Swatch hex={colour(value.primaryColour).hex} /> {colour(value.primaryColour).name}
          </>
        }
        open={open === 'primaryColour'}
        onToggle={() => toggle('primaryColour')}
        confidence={conf('primaryColour')}
      >
        <ColourGrid value={value.primaryColour} onPick={(c) => pick({ primaryColour: c })} />
      </Row>
    ),
    secondaryColour: (
      <Row
        key="sc"
        label="Second colour"
        value={
          <>
            <Swatch hex={colour(value.secondaryColour).hex} /> {colour(value.secondaryColour).name}
          </>
        }
        open={open === 'secondaryColour'}
        onToggle={() => toggle('secondaryColour')}
      >
        <ColourGrid value={value.secondaryColour} onPick={(c) => pick({ secondaryColour: c })} />
      </Row>
    ),
    pattern: (
      <Row key="pat" label="Pattern" value={PATTERNS.find((p) => p.id === value.pattern)?.label} open={open === 'pattern'} onToggle={() => toggle('pattern')} confidence={conf('pattern')}>
        {PATTERNS.map((p) => (
          <Chip key={p.id} size="sm" active={value.pattern === p.id} onClick={() => pick({ pattern: p.id as Pattern })}>
            {p.label}
          </Chip>
        ))}
      </Row>
    ),
    formality: (
      <Row key="f" label="Formality" value={<Dots n={value.formality} label={FORMALITY_LABELS[value.formality]} />} open={open === 'formality'} onToggle={() => toggle('formality')} confidence={conf('formality')}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip key={n} size="sm" active={value.formality === n} onClick={() => pick({ formality: n })}>
            {n} · {FORMALITY_LABELS[n]}
          </Chip>
        ))}
      </Row>
    ),
    warmth: (
      <Row key="w" label="Warmth" value={<Dots n={value.warmth} label={WARMTH_LABELS[value.warmth]} />} open={open === 'warmth'} onToggle={() => toggle('warmth')} confidence={conf('warmth')}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip key={n} size="sm" active={value.warmth === n} onClick={() => pick({ warmth: n })}>
            {n} · {WARMTH_LABELS[n]}
          </Chip>
        ))}
      </Row>
    ),
    layer: (
      <Row key="l" label="Layer" value={LAYERS.find((l) => l.id === value.layer)?.label} open={open === 'layer'} onToggle={() => toggle('layer')}>
        {LAYERS.map((l) => (
          <Chip key={l.id} size="sm" active={value.layer === l.id} onClick={() => pick({ layer: l.id as Layer })}>
            {l.label}
          </Chip>
        ))}
      </Row>
    ),
    seasons: (
      <Row
        key="s"
        label="Seasons"
        value={value.seasons.length ? SEASONS.filter((s) => value.seasons.includes(s.id)).map((s) => s.label).join(', ') : 'None'}
        open={open === 'seasons'}
        onToggle={() => toggle('seasons')}
      >
        {SEASONS.map((s) => {
          const on = value.seasons.includes(s.id)
          return (
            <Chip
              key={s.id}
              size="sm"
              active={on}
              onClick={() => onChange({ seasons: on ? value.seasons.filter((x) => x !== s.id) : ([...value.seasons, s.id] as Season[]) })}
            >
              {s.label}
            </Chip>
          )
        })}
      </Row>
    ),
  }
  return <div className="flex flex-col gap-2">{fields.map((f) => rows[f])}</div>
}

function Dots({ n, label }: { n: number; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cx('h-1.5 w-3 rounded-full', i <= n ? 'bg-accent' : 'bg-line')} />
        ))}
      </span>
      <span className="truncate">{label}</span>
    </span>
  )
}

export function ColourGrid({ value, onPick }: { value: string; onPick: (id: string) => void }) {
  return (
    <div className="grid w-full grid-cols-4 gap-1.5">
      {COLOURS.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onPick(c.id)}
          className={cx(
            'flex min-h-11 items-center gap-1.5 rounded-xl border px-2 text-left text-[11px] font-medium',
            value === c.id ? 'border-accent bg-accent-soft' : 'border-line bg-canvas',
          )}
        >
          <Swatch hex={c.hex} size={14} />
          <span className="truncate">{c.name}</span>
        </button>
      ))}
    </div>
  )
}
