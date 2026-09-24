import { useEffect, useMemo, useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { Check, ClipboardList, CloudSun, Lock, Redo2, Save, Shirt, Shuffle, Undo2, Hand } from 'lucide-react'
import type { Category, Item, SlotId } from '../../types'
import { useItemMap, useStore } from '../../store/useStore'
import { Mannequin } from '../../components/Mannequin'
import { ItemImage, SimulatedBadge, cx } from '../../components/ui'
import { CATEGORIES, OCCASIONS, slotForItem } from '../../data/catalogue'
import { SLOT_LABEL, SLOT_ORDER } from '../../art/mannequin'
import { clashCheck, resolve } from '../../ai/mockAi'
import { useLongPress } from '../../lib/useLongPress'
import { useShuffle, useShuffleSlot, useWeather } from './useStudioActions'
import { SlotMenu } from './SlotMenu'
import { PickList } from './PickList'
import { SaveOutfitSheet } from './SaveOutfitSheet'
import { ContextSheet } from '../../components/ContextSheet'

export function Studio() {
  const items = useStore((s) => s.items)
  const itemMap = useItemMap()
  const studio = useStore((s) => s.studio)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const place = useStore((s) => s.studioPlace)
  const setTucked = useStore((s) => s.studioSetTucked)
  const wearToday = useStore((s) => s.wearToday)
  const studioOutfitId = useStore((s) => s.studioOutfitId)
  const toast = useStore((s) => s.toast)
  const occasion = useStore((s) => s.occasion)
  const weather = useWeather()
  const shuffle = useShuffle()
  const shuffleSlot = useShuffleSlot()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [menuSlot, setMenuSlot] = useState<SlotId | null>(null)
  const [pickOpen, setPickOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [ctxOpen, setCtxOpen] = useState(false)
  const [drawerCat, setDrawerCat] = useState<Category | 'all'>('all')

  const sensors = useSensors(
    // Vertical movement starts a drag; horizontal swipes scroll the drawer instead.
    useSensor(PointerSensor, { activationConstraint: { distance: { y: 8 }, tolerance: { x: 16 } } }),
  )

  const longPress = useLongPress<SlotId>((slot) => {
    setMenuSlot(null)
    shuffleSlot(slot)
  })

  // Desktop convenience: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  const resolved = useMemo(() => resolve(studio.slots, itemMap, studio.tucked), [studio, itemMap])
  const warnings = useMemo(() => clashCheck(resolved, weather, occasion), [resolved, weather, occasion])
  const activeItem = activeId ? itemMap[activeId] : undefined
  const filled = SLOT_ORDER.filter((s) => studio.slots[s])
  const hasTopBottom = !!(studio.slots.top && studio.slots.bottom)

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.data.current?.itemId ?? ''))
  const onDragEnd = (e: DragEndEvent) => {
    const id = e.active.data.current?.itemId as string | undefined
    setActiveId(null)
    if (id && e.over?.id === 'stage') place(id)
  }

  const onSlotClick = (slot: SlotId) => {
    if (longPress.consumeClick()) return
    setMenuSlot(slot)
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <header className="flex items-center gap-1 px-4 pb-1 pt-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold leading-tight">Studio</h1>
            <button
              type="button"
              onClick={() => setCtxOpen(true)}
              className="-ml-1 flex min-h-8 items-center gap-1.5 rounded-full px-1 text-xs text-muted"
            >
              <CloudSun size={14} />
              <span className="truncate">
                {weather.short} · {OCCASIONS.find((o) => o.id === occasion)?.label}
              </span>
            </button>
          </div>
          <HeaderBtn label="Undo" onClick={undo} disabled={!canUndo}><Undo2 size={20} /></HeaderBtn>
          <HeaderBtn label="Redo" onClick={redo} disabled={!canRedo}><Redo2 size={20} /></HeaderBtn>
          <button
            type="button"
            onClick={() => setPickOpen(true)}
            disabled={!filled.length}
            className="ml-1 flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold disabled:opacity-40"
          >
            <ClipboardList size={17} /> Pick list
          </button>
        </header>

        {/* Stage */}
        <Stage>
          <div className="relative flex min-h-0 flex-1 items-stretch">
            <div className="relative flex min-h-0 flex-1 items-center justify-center">
              <Mannequin
                slots={studio.slots}
                items={itemMap}
                tucked={studio.tucked}
                interactive
                locked={studio.locked}
                highlightSlot={activeItem ? slotForItem(activeItem) : null}
                selectedSlot={menuSlot}
                onSlotPointerDown={(slot, e) => longPress.start(slot, e)}
                onSlotClick={onSlotClick}
                className="h-full max-h-full w-auto select-none touch-none"
              />
              {!filled.length && (
                <div className="pointer-events-none absolute inset-x-6 top-1/3 rounded-2xl bg-surface/90 p-3 text-center text-sm text-muted shadow-sm">
                  <Hand className="mx-auto mb-1" size={20} />
                  Drag items up onto the mannequin, or tap them in the drawer.
                </div>
              )}
            </div>
            <SlotRail
              slots={studio.slots}
              locked={studio.locked}
              itemMap={itemMap}
              onTap={onSlotClick}
              onPointerDown={(slot, e) => longPress.start(slot, e)}
              selected={menuSlot}
            />
          </div>
        </Stage>

        {/* Clash check */}
        <div className="no-scrollbar flex min-h-10 items-center gap-1.5 overflow-x-auto px-4">
          <SimulatedBadge label="Clash check" />
          {warnings.length === 0 && filled.length > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent">
              <Check size={14} /> Looks balanced
            </span>
          )}
          {warnings.map((w) => (
            <span
              key={w.id}
              className={cx(
                'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
                w.level === 'warn' ? 'bg-warn-soft text-warn' : 'bg-surface-2 text-muted',
              )}
            >
              {w.message}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-4 gap-2 px-4 pb-2 pt-1">
          <ActionBtn
            label={studio.tucked ? 'Tucked in' : 'Untucked'}
            active={studio.tucked}
            disabled={!hasTopBottom}
            onClick={() => setTucked(!studio.tucked)}
          >
            <Shirt size={19} />
          </ActionBtn>
          <ActionBtn label="Shuffle" primary onClick={shuffle}>
            <Shuffle size={19} />
          </ActionBtn>
          <ActionBtn label="Save" disabled={!filled.length} onClick={() => setSaveOpen(true)}>
            <Save size={19} />
          </ActionBtn>
          <ActionBtn
            label="Wear today"
            disabled={!filled.length}
            onClick={() => {
              wearToday(studio.slots, studioOutfitId ?? undefined)
              toast(`Marked ${filled.length} items as worn today`)
            }}
          >
            <Check size={19} />
          </ActionBtn>
        </div>

        {/* Drawer */}
        <Drawer items={items} cat={drawerCat} setCat={setDrawerCat} onTap={place} onMannequin={new Set(Object.values(studio.slots) as string[])} />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem && (
          <div className="flex h-20 w-20 scale-110 items-center justify-center rounded-2xl bg-surface p-2 shadow-xl ring-2 ring-accent">
            <ItemImage item={activeItem} className="h-full w-full" />
          </div>
        )}
      </DragOverlay>

      <SlotMenu slot={menuSlot} onClose={() => setMenuSlot(null)} onShuffleSlot={shuffleSlot} />
      <PickList open={pickOpen} onClose={() => setPickOpen(false)} />
      <SaveOutfitSheet open={saveOpen} onClose={() => setSaveOpen(false)} />
      <ContextSheet open={ctxOpen} onClose={() => setCtxOpen(false)} />
    </DndContext>
  )
}

function Stage({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'stage' })
  return (
    <div
      ref={setNodeRef}
      className={cx(
        'relative mx-3 flex min-h-0 flex-1 flex-col rounded-[28px] py-2 pl-2 transition-colors duration-200',
        isOver ? 'bg-accent-soft' : 'bg-surface',
      )}
    >
      {children}
    </div>
  )
}

function HeaderBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-surface-2 disabled:opacity-30"
    >
      {children}
    </button>
  )
}

function ActionBtn({
  label, onClick, children, primary, active, disabled,
}: { label: string; onClick: () => void; children: React.ReactNode; primary?: boolean; active?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cx(
        'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-all duration-150 active:scale-[.96] disabled:opacity-35',
        primary ? 'bg-accent text-on-accent shadow-sm' : active ? 'bg-accent-soft text-accent ring-1 ring-accent/40' : 'border border-line bg-surface',
      )}
    >
      {children}
      {label}
    </button>
  )
}

function SlotRail({
  slots, locked, itemMap, onTap, onPointerDown, selected,
}: {
  slots: Partial<Record<SlotId, string>>
  locked: SlotId[]
  itemMap: Record<string, Item>
  onTap: (s: SlotId) => void
  onPointerDown: (s: SlotId, e: React.PointerEvent) => void
  selected: SlotId | null
}) {
  return (
    <div className="no-scrollbar flex w-[58px] shrink-0 flex-col justify-center gap-1.5 overflow-y-auto pr-2">
      {SLOT_ORDER.map((slot) => {
        const item = slots[slot] ? itemMap[slots[slot]!] : undefined
        const isLocked = locked.includes(slot)
        return (
          <button
            key={slot}
            type="button"
            title={`${SLOT_LABEL[slot]}${item ? `: ${item.name}` : ''} — tap for options, long-press to shuffle`}
            aria-label={`${SLOT_LABEL[slot]}${item ? `: ${item.name}` : ' (empty)'}`}
            onClick={() => onTap(slot)}
            onPointerDown={(e) => onPointerDown(slot, e)}
            onContextMenu={(e) => e.preventDefault()}
            className={cx(
              'relative flex h-12 w-12 shrink-0 select-none items-center justify-center rounded-2xl border transition-all duration-150 [-webkit-touch-callout:none]',
              item ? 'border-line bg-tile' : 'border-dashed border-line bg-transparent',
              selected === slot && 'ring-2 ring-accent',
            )}
          >
            {item ? (
              <ItemImage item={item} className="h-9 w-9" />
            ) : (
              <span className="text-[8.5px] font-semibold uppercase leading-tight text-muted">{SLOT_LABEL[slot].split(' ')[0]}</span>
            )}
            {isLocked && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-on-accent">
                <Lock size={11} strokeWidth={2.6} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

const DRAWER_TABS: { id: Category | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  ...CATEGORIES.map((c) => ({ id: c.id, label: c.id === 'outer' ? 'Outer' : c.plural })),
]

function Drawer({
  items, cat, setCat, onTap, onMannequin,
}: {
  items: Item[]
  cat: Category | 'all'
  setCat: (c: Category | 'all') => void
  onTap: (id: string) => void
  onMannequin: Set<string>
}) {
  const shown = cat === 'all' ? items : items.filter((i) => i.category === cat)
  return (
    <div className="border-t border-line bg-surface pb-2 pt-1.5 shadow-[0_-8px_24px_-16px_var(--shadow)]">
      <div className="no-scrollbar flex gap-1 overflow-x-auto px-3">
        {DRAWER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setCat(t.id)}
            className={cx(
              'min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold transition-colors duration-150',
              cat === t.id ? 'bg-ink text-canvas' : 'text-muted hover:bg-surface-2',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="no-scrollbar mt-1 flex gap-2 overflow-x-auto px-3 pb-1 pt-1" data-testid="drawer-strip">
        {shown.map((i) => (
          <DrawerTile key={i.id} item={i} onTap={() => onTap(i.id)} worn={onMannequin.has(i.id)} />
        ))}
      </div>
      <p className="px-4 text-center text-[10.5px] text-muted">Tap or drag up to add · long-press a slot to shuffle it</p>
    </div>
  )
}

function DrawerTile({ item, onTap, worn }: { item: Item; onTap: () => void; worn: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `drawer:${item.id}`, data: { itemId: item.id } })
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={onTap}
      aria-label={`Add ${item.name}`}
      data-item={item.id}
      style={{ touchAction: 'pan-x' }}
      className={cx(
        'relative flex w-[74px] shrink-0 select-none flex-col items-center rounded-2xl p-1 transition-opacity duration-150 [-webkit-touch-callout:none]',
        isDragging && 'opacity-30',
      )}
    >
      <div className={cx('flex h-[66px] w-[66px] items-center justify-center rounded-2xl bg-tile p-1.5', worn && 'ring-2 ring-accent')}>
        <ItemImage item={item} className="pointer-events-none h-full w-full" />
      </div>
      <span className="mt-0.5 w-full truncate text-center text-[10px] font-medium text-muted">{item.name}</span>
      {worn && (
        <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-on-accent">
          <Check size={10} strokeWidth={3} />
        </span>
      )}
    </button>
  )
}
