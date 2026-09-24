import { useCallback, useRef } from 'react'
import type { SlotId } from '../../types'
import { useStore } from '../../store/useStore'
import { comboKey, suggestForSlot, suggestOutfits } from '../../ai/mockAi'
import { weatherById } from '../../data/weather'
import { aiSlots, lockedItems, placeItem } from '../../lib/studio'
import { slotForItem } from '../../data/catalogue'
import { SLOT_LABEL } from '../../art/mannequin'

export function useWeather() {
  return weatherById(useStore((s) => s.weatherId))
}

function history() {
  const s = useStore.getState()
  return { outfits: s.outfits, wearLog: s.wearLog }
}

/** Shuffle: refill unlocked slots with the next-best mock-AI combination not seen in this shuffle run. */
export function useShuffle() {
  const seen = useRef<{ lockKey: string; keys: Set<string> }>({ lockKey: '', keys: new Set() })
  return useCallback(() => {
    const s = useStore.getState()
    const weather = weatherById(s.weatherId)
    const locked = lockedItems(s.studio)
    const lockKey = `${comboKey(locked)}|${s.weatherId}|${s.occasion}`
    if (seen.current.lockKey !== lockKey) seen.current = { lockKey, keys: new Set() }
    seen.current.keys.add(comboKey(s.studio.slots))
    let [next] = suggestOutfits(s.items, weather, s.occasion, locked, history(), { count: 1, avoid: seen.current.keys })
    if (!next) {
      // Every valid combination has been shown — start the cycle again.
      seen.current.keys = new Set([comboKey(s.studio.slots)])
      ;[next] = suggestOutfits(s.items, weather, s.occasion, locked, history(), { count: 1, avoid: seen.current.keys })
      if (next) s.toast('Seen every combo for these locks — starting over')
    }
    if (!next) {
      s.toast('No matching items for the locked pieces', { tone: 'warn' })
      return
    }
    seen.current.keys.add(comboKey(next.slots))
    s.commitStudio({ ...s.studio, slots: next.slots, tucked: next.tucked, aiPicked: aiSlots(next.slots, s.studio.locked) })
  }, [])
}

/** Shuffle one slot (long-press). Cycles through alternatives for that slot. */
export function useShuffleSlot() {
  const seen = useRef<Record<string, Set<string>>>({})
  return useCallback((slot: SlotId) => {
    const s = useStore.getState()
    if (s.studio.locked.includes(slot)) {
      s.toast(`${SLOT_LABEL[slot]} is locked`, { tone: 'warn' })
      return
    }
    const weather = weatherById(s.weatherId)
    const avoid = (seen.current[slot] ??= new Set())
    if (s.studio.slots[slot]) avoid.add(s.studio.slots[slot]!)
    let id = suggestForSlot(s.items, s.studio.slots, slot, weather, s.occasion, history(), avoid, s.studio.locked)
    if (!id) {
      avoid.clear()
      id = suggestForSlot(s.items, s.studio.slots, slot, weather, s.occasion, history(), avoid, s.studio.locked)
    }
    const item = id ? s.items.find((i) => i.id === id) : undefined
    if (!item) {
      s.toast(`No other options for ${SLOT_LABEL[slot].toLowerCase()}`)
      return
    }
    avoid.add(item.id)
    const res = placeItem(s.studio, item)
    if (!res.ok) return s.toast(res.message, { tone: 'warn' })
    s.commitStudio({ ...res.state, aiPicked: [...(res.state.aiPicked ?? []), slot] })
    s.toast(`${SLOT_LABEL[slot]}: ${item.name} · simulated`)
  }, [])
}

/** "Style this item": put it on the mannequin, lock it, and let the mock AI build around it. */
export function useStyleItem() {
  return useCallback((itemId: string) => {
    const s = useStore.getState()
    const item = s.items.find((i) => i.id === itemId)
    if (!item) return
    const slot = slotForItem(item)
    const start = { slots: {}, locked: [] as SlotId[], tucked: false }
    const placed = placeItem(start, item)
    if (!placed.ok) return
    const weather = weatherById(s.weatherId)
    const [sugg] = suggestOutfits(s.items, weather, s.occasion, { [slot]: item.id }, history(), { count: 1 })
    const slots = sugg ? sugg.slots : placed.state.slots
    s.commitStudio({ slots, locked: [slot], tucked: sugg?.tucked ?? false, aiPicked: aiSlots(slots, [slot]) }, null)
    s.setTab('studio')
    s.toast(`Built a look around ${item.name} · simulated`)
  }, [])
}
