import { useState } from 'react'
import { ArrowLeftRight, Lock, LockOpen, Shuffle, Trash2 } from 'lucide-react'
import type { SlotId } from '../../types'
import { useItemMap, useStore } from '../../store/useStore'
import { ItemImage, Sheet, SimulatedBadge, cx } from '../../components/ui'
import { SLOT_LABEL } from '../../art/mannequin'
import { slotForItem } from '../../data/catalogue'

/** Tap an item on the mannequin → Remove / Swap / Lock (+ shuffle this slot). */
export function SlotMenu({ slot, onClose, onShuffleSlot }: { slot: SlotId | null; onClose: () => void; onShuffleSlot: (s: SlotId) => void }) {
  const itemMap = useItemMap()
  const items = useStore((s) => s.items)
  const studio = useStore((s) => s.studio)
  const remove = useStore((s) => s.studioRemove)
  const toggleLock = useStore((s) => s.studioToggleLock)
  const place = useStore((s) => s.studioPlace)
  const [swapping, setSwapping] = useState(false)

  const close = () => {
    setSwapping(false)
    onClose()
  }
  if (!slot) return null
  const item = studio.slots[slot] ? itemMap[studio.slots[slot]!] : undefined
  const locked = studio.locked.includes(slot)
  const options = items.filter((i) => slotForItem(i) === slot)

  return (
    <Sheet open onClose={close} title={SLOT_LABEL[slot]}>
      {item && !swapping && (
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-line bg-surface p-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-tile p-1.5">
            <ItemImage item={item} className="h-full w-full" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{item.name}</div>
            <div className="text-xs text-muted">{item.subcategory}{item.notes ? ` · ${item.notes}` : ''}</div>
          </div>
        </div>
      )}
      {!swapping ? (
        <div className="grid grid-cols-2 gap-2 pb-2">
          {item && (
            <MenuBtn onClick={() => { remove(slot); close() }} disabled={locked} hint={locked ? 'Unlock first' : undefined}>
              <Trash2 size={18} /> Remove
            </MenuBtn>
          )}
          <MenuBtn onClick={() => setSwapping(true)} disabled={locked} hint={locked ? 'Unlock first' : undefined}>
            <ArrowLeftRight size={18} /> {item ? 'Swap' : 'Choose'}
          </MenuBtn>
          {item && (
            <MenuBtn onClick={() => { toggleLock(slot); close() }} active={locked}>
              {locked ? <LockOpen size={18} /> : <Lock size={18} />} {locked ? 'Unlock' : 'Lock'}
            </MenuBtn>
          )}
          <MenuBtn onClick={() => { onShuffleSlot(slot); close() }} disabled={locked}>
            <Shuffle size={18} /> Shuffle slot <SimulatedBadge className="ml-1" label="AI" />
          </MenuBtn>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 pb-3">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => { if (place(o.id)) close() }}
              className={cx('flex flex-col items-center rounded-2xl border p-1.5 text-center', o.id === item?.id ? 'border-accent bg-accent-soft' : 'border-line bg-surface')}
            >
              <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-tile p-2">
                <ItemImage item={o} className="h-full w-full" />
              </div>
              <span className="mt-1 line-clamp-2 text-[11px] font-medium leading-tight">{o.name}</span>
            </button>
          ))}
          {options.length === 0 && <p className="col-span-3 py-6 text-center text-sm text-muted">No items for this slot yet.</p>}
        </div>
      )}
    </Sheet>
  )
}

function MenuBtn({ children, onClick, disabled, active, hint }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean; hint?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className={cx(
        'flex min-h-14 items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition-colors disabled:opacity-40',
        active ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface',
      )}
    >
      {children}
    </button>
  )
}
