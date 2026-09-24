import { useEffect, useState } from 'react'
import { Check, Copy, StickyNote } from 'lucide-react'
import { useItemMap, useStore } from '../../store/useStore'
import { Button, ItemImage, Sheet, cx } from '../../components/ui'
import { SLOT_LABEL, SLOT_ORDER } from '../../art/mannequin'
import { colour } from '../../data/colours'

/** Plain checklist of the physical items to pull from the real closet. */
export function PickList({ open, onClose }: { open: boolean; onClose: () => void }) {
  const itemMap = useItemMap()
  const studio = useStore((s) => s.studio)
  const toast = useStore((s) => s.toast)
  const [picked, setPicked] = useState<string[]>([])
  useEffect(() => {
    if (open) setPicked([])
  }, [open])

  const rows = SLOT_ORDER.filter((s) => studio.slots[s] && itemMap[studio.slots[s]!]).map((s) => ({ slot: s, item: itemMap[studio.slots[s]!] }))
  const done = rows.length > 0 && picked.length === rows.length

  const copy = async () => {
    const text = rows.map((r) => `☐ ${r.item.name}${r.item.notes ? ` (${r.item.notes})` : ''}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      toast('Pick list copied')
    } catch {
      toast('Copy isn’t available here', { tone: 'warn' })
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Pick list · ${rows.length} item${rows.length === 1 ? '' : 's'}`}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={copy}>
            <Copy size={16} /> Copy
          </Button>
          <Button className="flex-1" onClick={onClose}>
            {done ? 'All pulled — done' : 'Close'}
          </Button>
        </div>
      }
    >
      <p className="mb-3 text-sm text-muted">Pull these exact pieces from your closet. Tick each one as you go.</p>
      <ul className="flex flex-col gap-2 pb-2">
        {rows.map(({ slot, item }) => {
          const on = picked.includes(item.id)
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== item.id) : [...p, item.id]))}
                className={cx(
                  'flex w-full items-center gap-3 rounded-2xl border p-2 text-left transition-colors duration-150',
                  on ? 'border-accent/40 bg-accent-soft' : 'border-line bg-surface',
                )}
                aria-pressed={on}
              >
                <span
                  className={cx(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors',
                    on ? 'border-accent bg-accent text-on-accent' : 'border-line',
                  )}
                >
                  {on && <Check size={16} strokeWidth={3} />}
                </span>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-tile p-1.5">
                  <ItemImage item={item} className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cx('truncate font-semibold', on && 'text-muted line-through')}>{item.name}</div>
                  <div className="truncate text-xs text-muted">
                    {SLOT_LABEL[slot]} · {colour(item.primaryColour).name} {item.subcategory.toLowerCase()}
                  </div>
                  {item.notes && (
                    <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-accent">
                      <StickyNote size={11} /> {item.notes}
                    </div>
                  )}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}
