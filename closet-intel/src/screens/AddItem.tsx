import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Check, ChevronRight, ImagePlus, Layers, Loader2, X } from 'lucide-react'
import type { Confidence, Item, Season, TagResult } from '../types'
import { useStore } from '../store/useStore'
import { tagItem } from '../ai/mockAi'
import { ADD_SAMPLES, sampleSvg, type AddSample } from '../data/addSamples'
import { subcategoryInfo } from '../data/catalogue'
import { colour } from '../data/colours'
import { renderItemArt, svgDataUrl } from '../art/garments'
import { fileToDataUrl, newId } from '../lib/image'
import { todayISO } from '../lib/date'
import { Button, IconButton, SimulatedBadge, cx } from '../components/ui'
import { TagEditor } from '../components/TagEditor'

type Source = { kind: 'photo'; dataUrl: string } | { kind: 'sample'; sample: AddSample; dataUrl: string }

interface Draft {
  name: string
  nameTouched: boolean
  category: Item['category']
  subcategory: string
  primaryColour: string
  secondaryColour: string
  pattern: Item['pattern']
  formality: number
  warmth: number
  layer: Item['layer']
  seasons: Season[]
}

interface Entry {
  key: string
  source: Source
  draft?: Draft
  confidence: Partial<Record<string, Confidence>>
  status: 'queued' | 'ready' | 'saved' | 'skipped'
}

type Step = 'pick' | 'processing' | 'review' | 'done'

const seasonsFor = (warmth: number): Season[] =>
  warmth >= 4 ? ['autumn', 'winter'] : warmth === 3 ? ['spring', 'autumn', 'winter'] : ['spring', 'summer']

const autoName = (d: Pick<Draft, 'primaryColour' | 'subcategory'>) =>
  `${colour(d.primaryColour).name} ${d.subcategory.toLowerCase()}`

function draftFrom(tags: TagResult, source: Source): Draft {
  const info = subcategoryInfo(tags.subcategory)!
  return {
    name: source.kind === 'sample' ? source.sample.name : autoName(tags),
    nameTouched: source.kind === 'sample',
    category: tags.category,
    subcategory: tags.subcategory,
    primaryColour: tags.primaryColour,
    secondaryColour: tags.secondaryColour,
    pattern: tags.pattern,
    formality: tags.formality,
    warmth: tags.warmth,
    layer: info.layer,
    seasons: seasonsFor(tags.warmth),
  }
}

function toItem(e: Entry): Item {
  const d = e.draft!
  const info = subcategoryInfo(d.subcategory)!
  const id = newId()
  return {
    id,
    name: d.name.trim() || autoName(d),
    category: info.category,
    subcategory: d.subcategory,
    primaryColour: d.primaryColour,
    secondaryColour: d.secondaryColour,
    pattern: d.pattern,
    formality: d.formality,
    warmth: d.warmth,
    seasons: d.seasons,
    layer: d.layer,
    shape: info.shape,
    imageSvg: renderItemArt({ id, shape: info.shape, primaryColour: d.primaryColour, secondaryColour: d.secondaryColour, pattern: d.pattern }).svg,
    ...(e.source.kind === 'photo' ? { photo: e.source.dataUrl } : {}),
    dateAdded: todayISO(),
    timesWorn: 0,
    lastWorn: null,
    favourite: false,
    notes: '',
  }
}

export function AddItemFlow() {
  const open = useStore((s) => s.addFlowOpen)
  if (!open) return null
  return <AddItemInner />
}

function AddItemInner() {
  const close = useStore((s) => s.openAddFlow)
  const addItems = useStore((s) => s.addItems)
  const setTab = useStore((s) => s.setTab)
  const toast = useStore((s) => s.toast)
  const [batch, setBatch] = useState(false)
  const [step, setStep] = useState<Step>('pick')
  const [queue, setQueue] = useState<Entry[]>([])
  const [index, setIndex] = useState(0)
  const [saved, setSaved] = useState<Item[]>([])
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)

  const enqueue = (sources: Source[]) => {
    const entries = sources.map((source) => ({ key: newId('q'), source, confidence: {}, status: 'queued' as const }))
    if (batch) setQueue((q) => [...q, ...entries])
    else {
      setQueue(entries)
      setStep('processing')
    }
  }

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const sources: Source[] = []
    for (const f of Array.from(files)) {
      try {
        sources.push({ kind: 'photo', dataUrl: await fileToDataUrl(f) })
      } catch {
        toast(`Couldn’t read ${f.name}`, { tone: 'warn' })
      }
    }
    if (sources.length) enqueue(sources)
  }

  const pickSample = (s: AddSample) => {
    const already = queue.find((e) => e.source.kind === 'sample' && e.source.sample.id === s.id)
    if (batch && already) {
      setQueue((q) => q.filter((e) => e !== already))
      return
    }
    enqueue([{ kind: 'sample', sample: s, dataUrl: svgDataUrl(sampleSvg(s)) }])
  }

  // Simulated processing: run the mock tagger while showing ~2s of progress.
  useEffect(() => {
    if (step !== 'processing') return
    let cancelled = false
    const minTime = Math.min(3200, 2000 + (queue.length - 1) * 250)
    Promise.all([
      Promise.all(
        queue.map((e) =>
          tagItem({
            dataUrl: e.source.dataUrl,
            hint: e.source.kind === 'sample' ? { subcategory: e.source.sample.subcategory, pattern: e.source.sample.pattern } : undefined,
          }),
        ),
      ),
      new Promise((r) => setTimeout(r, minTime)),
    ]).then(([results]) => {
      if (cancelled) return
      setQueue((q) => q.map((e, i) => ({ ...e, draft: draftFrom(results[i], e.source), confidence: { ...results[i].confidence }, status: 'ready' })))
      setIndex(0)
      setStep('review')
    })
    return () => {
      cancelled = true
    }
  }, [step])

  const current = queue[index]
  const remaining = queue.filter((e, i) => i >= index && e.status === 'ready').length

  const advance = (nextQueue: Entry[], newlySaved: Item[]) => {
    const nextIdx = nextQueue.findIndex((e, i) => i > index && e.status === 'ready')
    if (nextIdx === -1) setStep('done')
    else setIndex(nextIdx)
    setSaved((s) => [...s, ...newlySaved])
  }

  const saveCurrent = () => {
    const item = toItem(current)
    addItems([item])
    const q = queue.map((e, i) => (i === index ? { ...e, status: 'saved' as const } : e))
    setQueue(q)
    advance(q, [item])
  }
  const skipCurrent = () => {
    const q = queue.map((e, i) => (i === index ? { ...e, status: 'skipped' as const } : e))
    setQueue(q)
    advance(q, [])
  }
  const saveAllRemaining = () => {
    const toSave = queue.filter((e, i) => i >= index && e.status === 'ready')
    const items = toSave.map(toItem)
    addItems(items)
    setQueue((q) => q.map((e) => (toSave.includes(e) ? { ...e, status: 'saved' } : e)))
    setSaved((s) => [...s, ...items])
    setStep('done')
  }

  const updateDraft = (patch: Partial<Item>) => {
    setQueue((q) =>
      q.map((e, i) => {
        if (i !== index || !e.draft) return e
        const d: Draft = { ...e.draft, ...(patch as Partial<Draft>) }
        if (patch.subcategory) {
          const info = subcategoryInfo(patch.subcategory)
          if (info) Object.assign(d, { category: info.category, layer: info.layer })
        }
        if (!d.nameTouched && (patch.primaryColour || patch.subcategory)) d.name = autoName(d)
        // Once you've checked a field it's no longer "low confidence".
        const confidence = { ...e.confidence }
        for (const k of Object.keys(patch)) delete confidence[k]
        if (patch.subcategory) delete confidence.category
        return { ...e, draft: d, confidence }
      }),
    )
  }

  const restart = () => {
    setQueue([])
    setSaved([])
    setIndex(0)
    setStep('pick')
  }

  return (
    <div className="anim-sheet absolute inset-0 z-40 flex flex-col bg-canvas" role="dialog" aria-modal="true" aria-label="Add item">
      <header className="flex items-center gap-2 px-4 pb-2 pt-3">
        <IconButton label="Close" onClick={() => close(false)}>
          <X size={22} />
        </IconButton>
        <h1 className="flex-1 font-display text-xl font-semibold">
          {step === 'pick' && (batch ? 'Batch add' : 'Add an item')}
          {step === 'processing' && 'Analysing…'}
          {step === 'review' && `Review ${index + 1} of ${queue.length}`}
          {step === 'done' && 'All done'}
        </h1>
        {step === 'pick' && (
          <div className="flex rounded-full bg-surface-2 p-1 text-xs font-semibold">
            {(['Single', 'Batch'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setBatch(m === 'Batch'); setQueue([]) }}
                className={cx('min-h-10 rounded-full px-3 transition-colors duration-150', (m === 'Batch') === batch ? 'bg-surface shadow-sm' : 'text-muted')}
              >
                {m}
              </button>
            ))}
          </div>
        )}
        {step === 'review' && <SimulatedBadge label="AI guesses" />}
      </header>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
      <input ref={libraryRef} type="file" accept="image/*" multiple={batch} className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />

      {step === 'pick' && (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
            <p className="text-sm text-muted">
              {batch ? 'Queue several items, then review them one by one. Fastest way to fill your closet.' : 'Snap a garment on a plain background — we’ll guess the tags for you to check.'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <BigAction icon={<Camera size={26} />} label="Take photo" onClick={() => cameraRef.current?.click()} />
              <BigAction icon={<ImagePlus size={26} />} label={batch ? 'Choose photos' : 'Choose photo'} onClick={() => libraryRef.current?.click()} />
            </div>
            <div className="mb-2 mt-6 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Or use a sample</h3>
              {batch && <span className="text-xs text-muted">Tap to queue</span>}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ADD_SAMPLES.map((s) => {
                const pos = queue.findIndex((e) => e.source.kind === 'sample' && e.source.sample.id === s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => pickSample(s)}
                    aria-label={`Use sample: ${s.name}`}
                    className={cx('relative flex aspect-square items-center justify-center rounded-2xl bg-tile p-2 transition-transform duration-150 active:scale-95', pos >= 0 && 'ring-2 ring-accent')}
                  >
                    <img src={svgDataUrl(sampleSvg(s))} alt="" className="h-full w-full object-contain" />
                    {pos >= 0 && (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-on-accent">{pos + 1}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          {batch && (
            <div className="border-t border-line bg-surface px-4 pb-4 pt-3">
              <div className="no-scrollbar mb-3 flex min-h-14 gap-2 overflow-x-auto">
                {queue.length === 0 && <p className="self-center text-sm text-muted">Queue is empty — add photos or samples.</p>}
                {queue.map((e) => (
                  <div key={e.key} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-tile p-1">
                    <img src={e.source.dataUrl} alt="" className="h-full w-full rounded-lg object-contain" />
                    <button
                      type="button"
                      aria-label="Remove from queue"
                      onClick={() => setQueue((q) => q.filter((x) => x !== e))}
                      className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center rounded-bl-xl bg-ink/70 text-canvas"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <Button className="w-full" disabled={!queue.length} onClick={() => setStep('processing')}>
                <Layers size={18} /> Analyse {queue.length || ''} item{queue.length === 1 ? '' : 's'}
              </Button>
            </div>
          )}
        </>
      )}

      {step === 'processing' && <Processing queue={queue} />}

      {step === 'review' && current?.draft && (
        <Review
          entry={current}
          onChange={updateDraft}
          onSave={saveCurrent}
          onSkip={skipCurrent}
          onSaveAll={remaining > 1 ? saveAllRemaining : undefined}
          remaining={remaining}
          isLast={remaining === 1}
        />
      )}

      {step === 'done' && (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="anim-rise flex h-16 w-16 items-center justify-center rounded-full bg-accent text-on-accent">
            <Check size={32} strokeWidth={3} />
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold">
            {saved.length ? `Added ${saved.length} item${saved.length === 1 ? '' : 's'}` : 'Nothing added'}
          </h2>
          <div className="no-scrollbar mt-4 flex max-w-full gap-2 overflow-x-auto">
            {saved.map((i) => (
              <div key={i.id} className="h-16 w-16 shrink-0 rounded-xl bg-tile p-1.5">
                <img src={i.photo ?? svgDataUrl(i.imageSvg)} alt={i.name} className="h-full w-full rounded-lg object-contain" />
              </div>
            ))}
          </div>
          <div className="mt-8 flex w-full flex-col gap-2">
            <Button onClick={() => { setTab('closet'); close(false) }}>View in Closet</Button>
            <Button variant="secondary" onClick={restart}>Add more</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function BigAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-3xl border border-line bg-surface text-sm font-semibold transition-transform duration-150 active:scale-[.97]"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">{icon}</span>
      {label}
    </button>
  )
}

const STEPS = ['Removing background…', 'Detecting category…', 'Detecting colour…']

function Processing({ queue }: { queue: Entry[] }) {
  const [done, setDone] = useState(0)
  const total = Math.min(3200, 2000 + (queue.length - 1) * 250)
  useEffect(() => {
    const timers = STEPS.map((_, i) => setTimeout(() => setDone(i + 1), (total * (i + 1)) / STEPS.length - 120))
    return () => timers.forEach(clearTimeout)
  }, [total])
  const first = queue[0]
  return (
    <div className="flex flex-1 flex-col items-center px-8 pt-6">
      <div className="relative h-60 w-60 overflow-hidden rounded-3xl bg-tile p-4 shadow-inner">
        {first && <img src={first.source.dataUrl} alt="" className="h-full w-full rounded-2xl object-contain" />}
        <div className="scan-line absolute inset-x-0 h-16" />
        {queue.length > 1 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-semibold text-canvas">+{queue.length - 1} more</span>
        )}
      </div>
      <ul className="mt-8 flex w-full flex-col gap-3">
        {STEPS.map((s, i) => (
          <li key={s} className={cx('flex items-center gap-3 text-sm transition-opacity duration-200', i > done ? 'opacity-40' : 'opacity-100')}>
            <span className={cx('flex h-7 w-7 items-center justify-center rounded-full', i < done ? 'bg-accent text-on-accent' : 'bg-surface-2')}>
              {i < done ? <Check size={15} strokeWidth={3} /> : i === done ? <Loader2 size={15} className="animate-spin" /> : null}
            </span>
            <span className="font-medium">{s}</span>
          </li>
        ))}
      </ul>
      <p className="mt-8 flex items-center gap-2 text-xs text-muted">
        <SimulatedBadge /> No photo leaves your device — this is a mock.
      </p>
    </div>
  )
}

function Review({
  entry, onChange, onSave, onSkip, onSaveAll, remaining, isLast,
}: {
  entry: Entry
  onChange: (p: Partial<Item>) => void
  onSave: () => void
  onSkip: () => void
  onSaveAll?: () => void
  remaining: number
  isLast: boolean
}) {
  const d = entry.draft!
  const lowCount = Object.values(entry.confidence).filter((c) => c === 'Low').length
  const preview = useMemo(() => {
    if (entry.source.kind === 'photo') return entry.source.dataUrl
    const info = subcategoryInfo(d.subcategory)!
    return svgDataUrl(renderItemArt({ id: entry.key, shape: info.shape, primaryColour: d.primaryColour, secondaryColour: d.secondaryColour, pattern: d.pattern }).svg)
  }, [entry.source, entry.key, d.subcategory, d.primaryColour, d.secondaryColour, d.pattern])

  return (
    <>
      <div key={entry.key} className="anim-rise min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        <div className="flex h-48 items-center justify-center rounded-3xl bg-tile p-4">
          <img src={preview} alt="" className="h-full w-full rounded-2xl object-contain" />
        </div>
        <input
          value={d.name}
          onChange={(e) => onChange({ name: e.target.value, nameTouched: true } as Partial<Item>)}
          aria-label="Item name"
          className="mt-3 min-h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base font-semibold outline-none focus:border-accent"
        />
        {lowCount > 0 ? (
          <p className="mt-3 rounded-2xl bg-warn-soft px-3 py-2 text-xs font-medium text-warn">
            {lowCount} low-confidence tag{lowCount === 1 ? '' : 's'} highlighted — please check {lowCount === 1 ? 'it' : 'them'}.
          </p>
        ) : (
          <p className="mt-3 px-1 text-xs text-muted">Tap any tag to change it.</p>
        )}
        <div className="mt-3">
          <TagEditor
            value={d}
            onChange={onChange}
            confidence={entry.confidence}
            fields={['subcategory', 'primaryColour', 'secondaryColour', 'pattern', 'formality', 'warmth', 'seasons']}
          />
        </div>
      </div>
      <div className="border-t border-line bg-canvas px-4 pb-4 pt-3">
        {onSaveAll && (
          <button type="button" onClick={onSaveAll} className="mb-1 min-h-11 w-full text-center text-xs font-semibold text-accent">
            Accept guesses for all {remaining} remaining
          </button>
        )}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onSkip}>Skip</Button>
          <Button className="flex-1" onClick={onSave}>
            {isLast ? 'Save to closet' : <>Save & next <ChevronRight size={18} /></>}
          </Button>
        </div>
      </div>
    </>
  )
}
