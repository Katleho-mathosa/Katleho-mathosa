import { useEffect, useState } from 'react'
import type { Occasion } from '../../types'
import { useStore } from '../../store/useStore'
import { Button, Chip, Sheet } from '../../components/ui'
import { OCCASIONS } from '../../data/catalogue'
import { todayISO, weekdayShort } from '../../lib/date'

export function SaveOutfitSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const occasionPref = useStore((s) => s.occasion)
  const studioOutfitId = useStore((s) => s.studioOutfitId)
  const existing = useStore((s) => s.outfits.find((o) => o.id === s.studioOutfitId))
  const save = useStore((s) => s.saveOutfit)
  const toast = useStore((s) => s.toast)
  const [name, setName] = useState('')
  const [occasion, setOccasion] = useState<Occasion>(occasionPref)

  useEffect(() => {
    if (!open) return
    const occ = existing?.occasion ?? occasionPref
    setOccasion(occ)
    setName(existing?.name ?? `${weekdayShort(todayISO())} ${OCCASIONS.find((o) => o.id === occ)!.label.toLowerCase()} look`)
  }, [open, existing, occasionPref])

  const submit = (asNew: boolean) => {
    const o = save(name.trim() || 'Untitled outfit', occasion, asNew)
    toast(`${asNew || !studioOutfitId ? 'Saved' : 'Updated'} “${o.name}”`)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Save outfit"
      footer={
        existing ? (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => submit(true)}>Save as new</Button>
            <Button className="flex-1" onClick={() => submit(false)}>Update</Button>
          </div>
        ) : (
          <Button className="w-full" onClick={() => submit(true)}>Save outfit</Button>
        )
      }
    >
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="outfit-name">Name</label>
      <input
        id="outfit-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit(!existing)}
        className="min-h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base outline-none focus:border-accent"
      />
      <div className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">Occasion</div>
      <div className="flex flex-wrap gap-2 pb-2">
        {OCCASIONS.map((o) => (
          <Chip key={o.id} size="sm" active={occasion === o.id} onClick={() => setOccasion(o.id)}>
            <span aria-hidden>{o.emoji}</span> {o.label}
          </Chip>
        ))}
      </div>
    </Sheet>
  )
}
