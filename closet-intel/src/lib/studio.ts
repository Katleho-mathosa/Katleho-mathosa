import type { Item, SlotId, SlotMap } from '../types'
import { slotForItem } from '../data/catalogue'
import { SLOT_LABEL } from '../art/mannequin'

export interface StudioState {
  slots: SlotMap
  locked: SlotId[]
  tucked: boolean
}

export type PlaceResult = { ok: true; state: StudioState; slot: SlotId; replaced: string[] } | { ok: false; message: string }

/**
 * Put an item on the mannequin. It snaps to its own slot; an occupied slot is replaced.
 * A dress clears Top and Bottom, and a top or bottom clears the dress. Locked slots are never overwritten.
 */
export function placeItem(state: StudioState, item: Item): PlaceResult {
  const slot = slotForItem(item)
  const slots = { ...state.slots }
  if (slots[slot] === item.id) return { ok: true, state, slot, replaced: [] }
  const clears: SlotId[] = [slot]
  if (slot === 'dress') clears.push('top', 'bottom')
  if (slot === 'top' || slot === 'bottom') clears.push('dress')
  const blocked = clears.find((s) => slots[s] && state.locked.includes(s))
  if (blocked) return { ok: false, message: `${SLOT_LABEL[blocked]} is locked — unlock it to replace` }
  const replaced: string[] = []
  for (const s of clears) {
    if (slots[s]) replaced.push(slots[s]!)
    delete slots[s]
  }
  slots[slot] = item.id
  return { ok: true, state: { ...state, slots }, slot, replaced }
}

export function removeSlot(state: StudioState, slot: SlotId): StudioState {
  const slots = { ...state.slots }
  delete slots[slot]
  return { ...state, slots, locked: state.locked.filter((s) => s !== slot) }
}

export function toggleLock(state: StudioState, slot: SlotId): StudioState {
  if (!state.slots[slot]) return state
  const locked = state.locked.includes(slot) ? state.locked.filter((s) => s !== slot) : [...state.locked, slot]
  return { ...state, locked }
}

export function lockedItems(state: StudioState): SlotMap {
  const m: SlotMap = {}
  for (const s of state.locked) if (state.slots[s]) m[s] = state.slots[s]
  return m
}

export const sameStudio = (a: StudioState, b: StudioState) =>
  a.tucked === b.tucked && JSON.stringify(a.slots) === JSON.stringify(b.slots) && a.locked.join() === b.locked.join()
