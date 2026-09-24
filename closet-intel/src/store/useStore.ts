import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Item, Occasion, Outfit, SlotId, SlotMap, WearEntry } from '../types'
import { buildSampleItems, buildSampleOutfits, buildSampleWearLog } from '../data/sampleItems'
import { renderItemArt } from '../art/garments'
import { slotForItem, subcategoryInfo } from '../data/catalogue'
import { safeStorage } from '../lib/storage'
import { todayISO } from '../lib/date'
import { aiSlots, placeItem, removeSlot, sameStudio, toggleLock, type StudioState } from '../lib/studio'

export type Tab = 'today' | 'closet' | 'studio' | 'outfits'
export type Theme = 'system' | 'light' | 'dark'

export interface Toast {
  id: number
  message: string
  tone?: 'default' | 'warn'
  action?: { label: string; run: () => void }
}

const HISTORY_LIMIT = 20

interface State {
  items: Item[]
  outfits: Outfit[]
  wearLog: WearEntry[]
  theme: Theme
  weatherId: string
  occasion: Occasion
  tab: Tab
  studio: StudioState
  past: StudioState[]
  future: StudioState[]
  /** Id of the saved outfit currently loaded in Studio (for "update" vs "save new"). */
  studioOutfitId: string | null
  toasts: Toast[]
  addFlowOpen: boolean
  /** Item ids recently added — highlighted in the Closet. */
  freshIds: string[]
}

interface Actions {
  setTab: (t: Tab) => void
  setTheme: (t: Theme) => void
  setWeather: (id: string) => void
  setOccasion: (o: Occasion) => void
  toast: (message: string, opts?: Omit<Toast, 'id' | 'message'>) => void
  dismissToast: (id: number) => void
  openAddFlow: (open: boolean) => void

  addItems: (items: Item[]) => void
  updateItem: (id: string, patch: Partial<Item>) => void
  deleteItem: (id: string) => void

  /** Commit a new studio state onto the undo stack. */
  commitStudio: (next: StudioState, outfitId?: string | null) => void
  studioPlace: (itemId: string) => boolean
  studioRemove: (slot: SlotId) => void
  studioToggleLock: (slot: SlotId) => void
  studioSetTucked: (t: boolean) => void
  studioLoad: (slots: SlotMap, tucked: boolean, opts?: { locked?: SlotId[]; outfitId?: string | null; ai?: boolean }) => void
  undo: () => void
  redo: () => void

  saveOutfit: (name: string, occasion: Occasion, asNew: boolean) => Outfit
  deleteOutfit: (id: string) => void
  restoreOutfit: (o: Outfit) => void
  rateOutfit: (id: string, rating: 1 | -1 | 0) => void
  wearToday: (slots: SlotMap, outfitId?: string) => void
  planDay: (date: string, outfit: Outfit | null) => void

  resetDemo: () => void
}

let toastSeq = 1

function seed() {
  return {
    items: buildSampleItems(),
    outfits: buildSampleOutfits(),
    wearLog: buildSampleWearLog(),
    studio: { slots: { top: 't04', bottom: 'b01', shoes: 's01', outer: 'o01' }, locked: [], tucked: false } as StudioState,
    past: [] as StudioState[],
    future: [] as StudioState[],
    studioOutfitId: null,
  }
}

const ART_FIELDS: (keyof Item)[] = ['primaryColour', 'secondaryColour', 'pattern', 'subcategory', 'shape']

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...seed(),
      theme: 'system',
      weatherId: 'swing',
      occasion: 'work',
      tab: 'today',
      toasts: [],
      addFlowOpen: false,
      freshIds: [],

      setTab: (tab) => set({ tab }),
      setTheme: (theme) => set({ theme }),
      setWeather: (weatherId) => set({ weatherId }),
      setOccasion: (occasion) => set({ occasion }),
      toast: (message, opts) => {
        const t: Toast = { id: toastSeq++, message, ...opts }
        set((s) => ({ toasts: [...s.toasts.slice(-2), t] }))
        setTimeout(() => get().dismissToast(t.id), opts?.action ? 4500 : 2600)
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      openAddFlow: (addFlowOpen) => set(addFlowOpen ? { addFlowOpen, freshIds: [] } : { addFlowOpen }),

      addItems: (items) => set((s) => ({ items: [...items, ...s.items], freshIds: [...items.map((i) => i.id), ...s.freshIds] })),
      updateItem: (id, patch) =>
        set((s) => {
          let studio = s.studio
          const items = s.items.map((it) => {
            if (it.id !== id) return it
            let next = { ...it, ...patch }
            if (patch.subcategory && patch.subcategory !== it.subcategory) {
              const info = subcategoryInfo(patch.subcategory)
              if (info) next = { ...next, category: info.category, shape: info.shape, layer: info.layer }
              // If the item moved to a different slot, take it off the mannequin.
              const oldSlot = slotForItem(it)
              if (slotForItem(next) !== oldSlot && studio.slots[oldSlot] === id) studio = removeSlot(studio, oldSlot)
            }
            if (ART_FIELDS.some((f) => f in patch)) next.imageSvg = renderItemArt(next).svg
            return next
          })
          return { items, studio }
        }),
      deleteItem: (id) =>
        set((s) => {
          const strip = (slots: SlotMap) =>
            Object.fromEntries(Object.entries(slots).filter(([, v]) => v !== id)) as SlotMap
          const slot = (Object.keys(s.studio.slots) as SlotId[]).find((k) => s.studio.slots[k] === id)
          return {
            items: s.items.filter((i) => i.id !== id),
            outfits: s.outfits.map((o) => ({ ...o, slots: strip(o.slots) })),
            wearLog: s.wearLog.map((w) => ({ ...w, slots: strip(w.slots) })),
            studio: slot ? removeSlot(s.studio, slot) : s.studio,
            past: s.past.map((p) => ({ ...p, slots: strip(p.slots) })),
            future: s.future.map((p) => ({ ...p, slots: strip(p.slots) })),
          }
        }),

      commitStudio: (next, outfitId) =>
        set((s) => {
          if (sameStudio(s.studio, next) && outfitId === undefined) return {}
          return {
            studio: next,
            past: [...s.past, s.studio].slice(-HISTORY_LIMIT),
            future: [],
            ...(outfitId !== undefined ? { studioOutfitId: outfitId } : {}),
          }
        }),
      studioPlace: (itemId) => {
        const item = get().items.find((i) => i.id === itemId)
        if (!item) return false
        const res = placeItem(get().studio, item)
        if (!res.ok) {
          get().toast(res.message, { tone: 'warn' })
          return false
        }
        get().commitStudio(res.state)
        return true
      },
      studioRemove: (slot) => get().commitStudio(removeSlot(get().studio, slot)),
      studioToggleLock: (slot) => get().commitStudio(toggleLock(get().studio, slot)),
      studioSetTucked: (tucked) => get().commitStudio({ ...get().studio, tucked }),
      studioLoad: (slots, tucked, opts) =>
        get().commitStudio(
          { slots: { ...slots }, tucked, locked: opts?.locked ?? [], aiPicked: opts?.ai ? aiSlots(slots, opts?.locked ?? []) : [] },
          opts?.outfitId ?? null,
        ),
      undo: () =>
        set((s) => {
          if (!s.past.length) return {}
          const prev = s.past[s.past.length - 1]
          return { studio: prev, past: s.past.slice(0, -1), future: [s.studio, ...s.future].slice(0, HISTORY_LIMIT) }
        }),
      redo: () =>
        set((s) => {
          if (!s.future.length) return {}
          const [next, ...rest] = s.future
          return { studio: next, future: rest, past: [...s.past, s.studio].slice(-HISTORY_LIMIT) }
        }),

      saveOutfit: (name, occasion, asNew) => {
        const s = get()
        const existing = !asNew && s.studioOutfitId ? s.outfits.find((o) => o.id === s.studioOutfitId) : undefined
        const outfit: Outfit = existing
          ? { ...existing, name, occasion, slots: { ...s.studio.slots }, tucked: s.studio.tucked }
          : { id: `of-${Date.now().toString(36)}`, name, occasion, slots: { ...s.studio.slots }, tucked: s.studio.tucked, createdAt: todayISO(), rating: 0 }
        set({
          outfits: existing ? s.outfits.map((o) => (o.id === existing.id ? outfit : o)) : [outfit, ...s.outfits],
          studioOutfitId: outfit.id,
        })
        return outfit
      },
      deleteOutfit: (id) =>
        set((s) => ({
          outfits: s.outfits.filter((o) => o.id !== id),
          wearLog: s.wearLog.filter((w) => !(w.planned && w.outfitId === id)),
          studioOutfitId: s.studioOutfitId === id ? null : s.studioOutfitId,
        })),
      restoreOutfit: (o) => set((s) => ({ outfits: s.outfits.some((x) => x.id === o.id) ? s.outfits : [o, ...s.outfits] })),
      rateOutfit: (id, rating) => set((s) => ({ outfits: s.outfits.map((o) => (o.id === id ? { ...o, rating } : o)) })),
      wearToday: (slots, outfitId) =>
        set((s) => {
          const today = todayISO()
          const ids = new Set(Object.values(slots).filter(Boolean) as string[])
          // Undo a previous "wear today" for items no longer in today's outfit? Keep it simple: count each item once per day.
          const alreadyToday = new Set(
            s.wearLog.filter((w) => w.date === today && !w.planned).flatMap((w) => Object.values(w.slots) as string[]),
          )
          return {
            items: s.items.map((i) =>
              ids.has(i.id) ? { ...i, timesWorn: i.timesWorn + (alreadyToday.has(i.id) ? 0 : 1), lastWorn: today } : i,
            ),
            wearLog: [...s.wearLog.filter((w) => w.date !== today), { date: today, slots: { ...slots }, outfitId, planned: false }],
          }
        }),
      planDay: (date, outfit) =>
        set((s) => ({
          wearLog: [
            ...s.wearLog.filter((w) => w.date !== date),
            ...(outfit ? [{ date, slots: { ...outfit.slots }, outfitId: outfit.id, planned: true }] : []),
          ],
        })),

      resetDemo: () => set({ ...seed(), freshIds: [] }),
    }),
    {
      name: 'closet-intel:v1',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        items: s.items,
        outfits: s.outfits,
        wearLog: s.wearLog,
        theme: s.theme,
        weatherId: s.weatherId,
        occasion: s.occasion,
        tab: s.tab,
        studio: s.studio,
        past: s.past,
        future: s.future,
        studioOutfitId: s.studioOutfitId,
      }),
    },
  ),
)

/** id → item lookup, memoised on the items array. */
export function useItemMap(): Record<string, Item> {
  const items = useStore((s) => s.items)
  return useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])
}
