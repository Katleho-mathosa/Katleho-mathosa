import { useState } from 'react'
import { Heart, Sparkles, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { relativeDay, longDate } from '../lib/date'
import { Button, IconButton, ItemImage, Sheet, cx } from '../components/ui'
import { TagEditor } from '../components/TagEditor'
import { useStyleItem } from './studio/useStudioActions'

export function ItemDetail({ itemId, onClose }: { itemId: string | null; onClose: () => void }) {
  const item = useStore((s) => s.items.find((i) => i.id === itemId))
  const updateItem = useStore((s) => s.updateItem)
  const deleteItem = useStore((s) => s.deleteItem)
  const toast = useStore((s) => s.toast)
  const styleItem = useStyleItem()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const close = () => {
    setConfirmDelete(false)
    onClose()
  }

  if (!item) return <Sheet open={false} onClose={close}>{null}</Sheet>
  return (
    <Sheet
      open={!!itemId}
      onClose={close}
      tall
      title={
        <input
          value={item.name}
          onChange={(e) => updateItem(item.id, { name: e.target.value })}
          aria-label="Item name"
          className="w-full rounded-lg bg-transparent font-display text-xl font-semibold outline-none focus:bg-surface-2 focus:px-1"
        />
      }
      footer={
        <Button className="w-full" onClick={() => { styleItem(item.id); close() }}>
          <Sparkles size={18} /> Style this item
        </Button>
      }
    >
      <div className="relative flex h-56 items-center justify-center rounded-3xl bg-tile p-5">
        <ItemImage item={item} className="h-full w-full" />
        <IconButton
          label={item.favourite ? 'Remove from favourites' : 'Add to favourites'}
          onClick={() => updateItem(item.id, { favourite: !item.favourite })}
          className="absolute right-2 top-2 bg-surface/80"
        >
          <Heart size={20} className={cx(item.favourite && 'fill-danger text-danger')} />
        </IconButton>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Times worn" value={String(item.timesWorn)} />
        <Stat label="Last worn" value={relativeDay(item.lastWorn)} />
        <Stat label="Added" value={relativeDay(item.dateAdded)} />
      </div>

      <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">Tags · tap to edit</h3>
      <TagEditor value={item} onChange={(patch) => updateItem(item.id, patch)} />

      <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">Notes</h3>
      <textarea
        value={item.notes}
        onChange={(e) => updateItem(item.id, { notes: e.target.value })}
        placeholder="Where it lives, care notes…"
        rows={2}
        className="w-full rounded-2xl border border-line bg-surface p-3 text-sm outline-none focus:border-accent"
      />
      <p className="mt-1 text-[11px] text-muted">Added {longDate(item.dateAdded)}</p>

      <div className="mt-5">
        {confirmDelete ? (
          <div className="flex items-center gap-2 rounded-2xl border border-danger/30 bg-surface p-3">
            <span className="flex-1 text-sm">Delete “{item.name}”? This can’t be undone.</span>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                deleteItem(item.id)
                toast(`Deleted ${item.name}`)
                close()
              }}
            >
              Delete
            </Button>
          </div>
        ) : (
          <Button variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={16} /> Delete item
          </Button>
        )}
      </div>
    </Sheet>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-2 py-2.5">
      <div className="text-base font-semibold">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  )
}
