/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  MOCK AI — every "smart" feature in the app goes through this file.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Nothing here calls a model. All results are produced by transparent,
 * rule-based logic so the prototype is predictable and testable, and every
 * result is marked `simulated: true` so the UI can label it.
 *
 * To plug in real AI later, keep these signatures and replace the bodies:
 *   - tagItem(image)             → vision model (category/colour/pattern tagging)
 *   - suggestOutfits(...)        → LLM or ranking model over the closet
 *   - suggestForSlot(...)        → same ranking model, one slot at a time
 *   - clashCheck(outfit, weather)→ LLM critique, or keep these rules
 *   - explain(outfit)            → LLM one-liner
 * The UI only depends on the types exported here and in ../types.
 */
import type {
  Confidence, Item, Occasion, Outfit, Pattern, SlotId, SlotMap, SuggestedOutfit, TagResult, Warning, WeatherScenario, WearEntry,
} from '../types'
import { COLOURS, colour, hexToRgb } from '../data/colours'
import { OCCASIONS, PATTERNS, SUBCATEGORIES, occasionLabel, slotForItem, subcategoryInfo } from '../data/catalogue'
import { daysSince } from '../lib/date'

// ─── Shared types ───────────────────────────────────────────────────────────

/** An outfit with its slot ids resolved to items. */
export type ResolvedOutfit = { items: Partial<Record<SlotId, Item>>; tucked?: boolean }

export interface History {
  outfits: Outfit[] // saved outfits incl. thumbs up/down ratings
  wearLog: WearEntry[]
}

export interface TagInput {
  /** Image to analyse (uploaded photo or rendered sample), as a data URL. */
  dataUrl: string
  /** Only for bundled sample images: stands in for a real classifier's shape detection. */
  hint?: { subcategory: string; pattern?: Pattern }
}

export function resolve(slots: SlotMap, items: Record<string, Item>, tucked = false): ResolvedOutfit {
  const out: ResolvedOutfit = { items: {}, tucked }
  for (const [slot, id] of Object.entries(slots) as [SlotId, string][]) {
    if (id && items[id]) out.items[slot] = items[id]
  }
  return out
}

// ─── Rule helpers (exported so the UI can show "why") ───────────────────────

const isBusy = (p: Pattern) => PATTERNS.find((x) => x.id === p)?.busy ?? false
const isBold = (i: Item) => !colour(i.primaryColour).neutral
const clothing = (o: ResolvedOutfit) =>
  (['outer', 'top', 'bottom', 'dress', 'shoes'] as SlotId[]).map((s) => o.items[s]).filter(Boolean) as Item[]
const allItems = (o: ResolvedOutfit) => Object.values(o.items).filter(Boolean) as Item[]

/** How much total warmth feels right at a temperature (roughly: sum of item warmth). */
export function warmthTarget(temp: number): number {
  if (temp >= 28) return 2
  if (temp >= 23) return 3
  if (temp >= 18) return 4.5
  if (temp >= 13) return 6
  if (temp >= 8) return 7.5
  return 9
}

/** Warmth of what stays on all day (everything except the outer layer and scarf). */
function coreWarmth(o: ResolvedOutfit): number {
  const { top, bottom, dress } = o.items
  return dress ? dress.warmth * 1.6 : (top?.warmth ?? 0) + (bottom?.warmth ?? 0) * 0.8
}
/** Warmth with the removable pieces on too (outer layer, scarf). */
const fullWarmth = (o: ResolvedOutfit) =>
  coreWarmth(o) + (o.items.outer?.warmth ?? 0) + (o.items.head?.shape === 'scarf' ? o.items.head.warmth * 0.5 : 0)

const swing = (w: WeatherScenario) => w.maxTemp - w.minTemp
const needsRemovableLayer = (w: WeatherScenario) => swing(w) > 12

function warmthPenalty(o: ResolvedOutfit, w: WeatherScenario): number {
  const core = coreWarmth(o)
  const full = fullWarmth(o)
  if (needsRemovableLayer(w)) {
    // Morning: everything on. Afternoon: outer layer off.
    const morning = Math.max(0, warmthTarget(w.minTemp) - full)
    const afternoon = Math.max(0, core - warmthTarget(w.maxTemp))
    const noLayer = o.items.outer ? 0 : 3
    return morning + afternoon + noLayer
  }
  const cold = Math.max(0, warmthTarget(w.minTemp) - full)
  const hot = Math.max(0, full - warmthTarget(w.maxTemp) - 0.5)
  return cold + hot * 1.4
}

/** Season tags vs. the day's weather: no winter-only pieces in a heatwave, no summer-only pieces on a cold day. */
function seasonPenalty(o: ResolvedOutfit, w: WeatherScenario): number {
  let p = 0
  for (const i of allItems(o)) {
    if (w.maxTemp >= 27 && !i.seasons.includes('summer')) p += 1.2
    if (w.maxTemp <= 16 && i.seasons.length === 1 && i.seasons[0] === 'summer') p += 1.2
  }
  return p
}

function formalitySpread(items: Item[]): { low?: Item; high?: Item; spread: number } {
  if (!items.length) return { spread: 0 }
  const sorted = [...items].sort((a, b) => a.formality - b.formality)
  const low = sorted[0]
  const high = sorted[sorted.length - 1]
  return { low, high, spread: high.formality - low.formality }
}

// ─── Occasion rules ─────────────────────────────────────────────────────────

const GYM_OK = new Set(['T-shirt', 'Polo', 'Joggers', 'Shorts', 'Running shoes', 'Sneakers', 'Jersey', 'Cap', 'Watch'])

function fitsOccasion(item: Item, occasion: Occasion): boolean {
  const target = OCCASIONS.find((o) => o.id === occasion)!.formality
  if (occasion === 'gym') return GYM_OK.has(item.subcategory)
  if (item.category === 'accessory') return item.formality <= target + 1 && item.formality >= target - 2
  return Math.abs(item.formality - target) <= 1
}

function occasionBonus(o: ResolvedOutfit, occasion: Occasion): number {
  const items = allItems(o)
  const target = OCCASIONS.find((x) => x.id === occasion)!.formality
  let b = 0
  for (const i of clothing(o)) b -= Math.abs(i.formality - target) * 0.25
  if (occasion === 'traditional') b += items.some((i) => i.pattern === 'print') ? 2 : -1
  if (occasion === 'event' && o.items.dress) b += 0.6
  if (occasion === 'event' && o.items.outer?.subcategory === 'Blazer') b += 0.6
  if (occasion === 'gym' && o.items.shoes?.subcategory === 'Running shoes') b += 1
  return b
}

// ─── Taste learning (from thumbs up / down) ─────────────────────────────────

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

export interface TasteModel {
  liked: Map<string, number>
  disliked: Map<string, number>
  dislikedCombos: Set<string>
}

export function learnTaste(history: History): TasteModel {
  const liked = new Map<string, number>()
  const disliked = new Map<string, number>()
  const dislikedCombos = new Set<string>()
  for (const o of history.outfits) {
    if (!o.rating) continue
    const ids = Object.values(o.slots).filter(Boolean) as string[]
    const target = o.rating > 0 ? liked : disliked
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) target.set(pairKey(ids[i], ids[j]), (target.get(pairKey(ids[i], ids[j])) ?? 0) + 1)
    if (o.rating < 0) dislikedCombos.add(comboKey(o.slots))
  }
  return { liked, disliked, dislikedCombos }
}

function tasteScore(o: ResolvedOutfit, taste: TasteModel): number {
  const ids = allItems(o).map((i) => i.id)
  let s = 0
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const k = pairKey(ids[i], ids[j])
      s += (taste.liked.get(k) ?? 0) * 0.5
      s -= (taste.disliked.get(k) ?? 0) * 1.2
    }
  return s
}

// ─── Scoring ────────────────────────────────────────────────────────────────

/** Identity of an outfit's core garments (accessory slots ignored), used for "seen" / "disliked" checks. */
export function comboKey(slots: SlotMap): string {
  return (Object.entries(slots) as [SlotId, string | undefined][])
    .filter(([slot, id]) => id && slot !== 'head' && slot !== 'bag')
    .map(([, id]) => id!)
    .sort()
    .join('+')
}

/** Hard colour/pattern/formality rules. Locked items are allowed to break them. */
function passesHardRules(o: ResolvedOutfit, lockedIds: Set<string>): boolean {
  const items = allItems(o)
  const free = (pred: (i: Item) => boolean) => items.filter(pred).filter((i) => !lockedIds.has(i.id)).length
  const count = (pred: (i: Item) => boolean) => items.filter(pred).length
  if (count((i) => isBusy(i.pattern)) > 1 && free((i) => isBusy(i.pattern)) > 0) return false
  if (count(isBold) > 1 && free(isBold) > 0) return false
  const { spread } = formalitySpread(clothing(o))
  if (spread > 2 && clothing(o).some((i) => !lockedIds.has(i.id))) return false
  return true
}

function scoreOutfit(o: ResolvedOutfit, weather: WeatherScenario, occasion: Occasion, taste: TasteModel): number {
  let s = 10
  s -= warmthPenalty(o, weather) * 1.2
  s -= seasonPenalty(o, weather)
  s += occasionBonus(o, occasion)
  s += tasteScore(o, taste)
  if (taste.dislikedCombos.has(comboKey(slotsOf(o)))) s -= 5
  for (const i of allItems(o)) {
    const days = daysSince(i.lastWorn)
    s += (Math.min(days, 30) / 30) * 0.4 // prefer things not worn recently
    if (days <= 1) s -= 0.6
    if (i.favourite) s += 0.1
  }
  if (weather.rain) {
    if (o.items.shoes?.subcategory === 'Sandals') s -= 3
    if (o.items.outer && /water/i.test(o.items.outer.notes)) s += 1.2
    if (o.items.outer?.subcategory === 'Coat') s += 0.5
  }
  if (weather.maxTemp >= 28 && o.items.shoes?.subcategory === 'Boots') s -= 1.5
  // Gentle colour harmony: one accent colour on neutrals reads intentional.
  const bold = allItems(o).filter(isBold).length
  if (bold === 1) s += 0.3
  return s
}

function slotsOf(o: ResolvedOutfit): SlotMap {
  const m: SlotMap = {}
  for (const [k, v] of Object.entries(o.items) as [SlotId, Item][]) m[k] = v.id
  return m
}

function shouldTuck(o: ResolvedOutfit, occasion: Occasion): boolean {
  const { top, bottom } = o.items
  if (!top || !bottom) return false
  const tuckable = ['Shirt', 'Blouse', 'Turtleneck'].includes(top.subcategory)
  return tuckable && (OCCASIONS.find((x) => x.id === occasion)!.formality >= 3 || bottom.subcategory === 'Skirt')
}

function pickAccessories(o: ResolvedOutfit, pool: Item[], weather: WeatherScenario, occasion: Occasion, locked: SlotMap, lockedIds: Set<string>) {
  for (const slot of ['head', 'bag'] as SlotId[]) {
    if (locked[slot]) continue
    let best: Item | undefined
    let bestScore = 0
    for (const a of pool) {
      if (slotForItem(a) !== slot) continue
      let s = 0
      if (a.shape === 'scarf' && weather.minTemp < 12) s += 0.6
      if (a.shape === 'cap' && weather.maxTemp >= 26 && (occasion === 'casual' || occasion === 'gym')) s += 0.5
      if (a.shape === 'tote' && ['work', 'church', 'event', 'traditional'].includes(occasion)) s += 0.4
      if (a.shape === 'watch' && ['work', 'event', 'date'].includes(occasion)) s += 0.45
      if (a.shape === 'belt' && o.tucked) s += 0.5
      if (s <= bestScore) continue
      const trial: ResolvedOutfit = { ...o, items: { ...o.items, [slot]: a } }
      if (!passesHardRules(trial, lockedIds)) continue
      best = a
      bestScore = s
    }
    if (best) o.items[slot] = best
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface SuggestOptions {
  count?: number
  /** combo keys to skip (used by Shuffle so it never repeats itself) */
  avoid?: Set<string>
}

/**
 * Suggest outfits. Deterministic: same inputs → same outputs.
 * Rules: neutrals go with anything; max one bold colour; max one busy pattern;
 * formality within ±1 of the occasion and a max spread of 2 across items;
 * warmth suits the weather; a removable outer layer when the swing is >12°C;
 * prefer items not worn recently; boost thumbed-up pairs, avoid thumbed-down.
 */
export function suggestOutfits(
  closet: Item[],
  weather: WeatherScenario,
  occasion: Occasion,
  lockedItems: SlotMap,
  history: History,
  opts: SuggestOptions = {},
): SuggestedOutfit[] {
  const count = opts.count ?? 3
  const byId = Object.fromEntries(closet.map((i) => [i.id, i]))
  const locked = resolve(lockedItems, byId).items
  const lockedIds = new Set(Object.values(locked).map((i) => i!.id))
  const taste = learnTaste(history)

  const pool = closet.filter((i) => fitsOccasion(i, occasion))
  const of = (slot: SlotId) => (locked[slot] ? [locked[slot]!] : pool.filter((i) => slotForItem(i) === slot))

  const tops = of('top')
  const bottoms = of('bottom')
  const shoes = of('shoes')
  const outers: (Item | undefined)[] = locked.outer ? [locked.outer] : [undefined, ...of('outer')]
  const dresses = locked.top || locked.bottom ? [] : of('dress')
  const bases: Partial<Record<SlotId, Item>>[] = []
  if (!locked.dress) for (const t of tops) for (const b of bottoms) bases.push({ top: t, bottom: b })
  for (const d of dresses) bases.push({ dress: d })

  const candidates: { o: ResolvedOutfit; score: number; key: string }[] = []
  for (const base of bases) {
    for (const sh of shoes.length ? shoes : [undefined]) {
      for (const ou of outers) {
        const o: ResolvedOutfit = { items: { ...base } }
        if (sh) o.items.shoes = sh
        if (ou) o.items.outer = ou
        if (locked.head) o.items.head = locked.head
        if (locked.bag) o.items.bag = locked.bag
        if (!passesHardRules(o, lockedIds)) continue
        const key = comboKey(slotsOf(o))
        candidates.push({ o, score: scoreOutfit(o, weather, occasion, taste), key })
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score || (a.key < b.key ? -1 : 1))

  // Greedy pick for variety: no two suggestions share a top, bottom or dress
  // (unless it's locked, in which case every suggestion shares it by design).
  const picked: typeof candidates = []
  const shares = (a: ResolvedOutfit, b: ResolvedOutfit) =>
    (['top', 'bottom', 'dress'] as SlotId[]).some((s) => a.items[s] && a.items[s] === b.items[s] && !locked[s])
  for (const c of candidates) {
    if (picked.length >= count) break
    if (opts.avoid?.has(c.key)) continue
    if (count > 1 && picked.some((p) => shares(p.o, c.o))) continue
    picked.push(c)
  }
  // Fall back to anything left if variety rules were too strict.
  for (const c of candidates) {
    if (picked.length >= count) break
    if (!picked.includes(c) && !opts.avoid?.has(c.key)) picked.push(c)
  }

  return picked.map((c, idx) => {
    const o = c.o
    o.tucked = shouldTuck(o, occasion)
    pickAccessories(o, pool, weather, occasion, lockedItems, lockedIds)
    return {
      id: `sugg-${idx}-${c.key}`,
      slots: slotsOf(o),
      tucked: o.tucked,
      reason: explain(o, { weather, occasion }),
      score: Math.round(c.score * 10) / 10,
      simulated: true as const,
    }
  })
}

/** Best replacement for a single slot, keeping every other slot as-is. */
export function suggestForSlot(
  closet: Item[],
  current: SlotMap,
  slot: SlotId,
  weather: WeatherScenario,
  occasion: Occasion,
  history: History,
  avoid: Set<string>,
  lockedSlots: SlotId[] = [],
): string | null {
  const byId = Object.fromEntries(closet.map((i) => [i.id, i]))
  const taste = learnTaste(history)
  const lockedIds = new Set(lockedSlots.map((s) => current[s]).filter(Boolean) as string[])
  let options = closet.filter((i) => slotForItem(i) === slot && i.id !== current[slot] && !avoid.has(i.id))
  const fitting = options.filter((i) => fitsOccasion(i, occasion))
  if (fitting.length) options = fitting
  let best: { id: string; score: number } | null = null
  for (const cand of options) {
    const slots: SlotMap = { ...current, [slot]: cand.id }
    if (slot === 'dress') { delete slots.top; delete slots.bottom }
    if (slot === 'top' || slot === 'bottom') delete slots.dress
    const o = resolve(slots, byId)
    const hard = passesHardRules(o, lockedIds) ? 0 : -8
    const score = scoreOutfit(o, weather, occasion, taste) + hard
    if (!best || score > best.score || (score === best.score && cand.id < best.id)) best = { id: cand.id, score }
  }
  return best?.id ?? null
}

/** Simulated stylist warnings for an outfit. */
export function clashCheck(outfit: ResolvedOutfit, weather: WeatherScenario, occasion?: Occasion): Warning[] {
  const w: Warning[] = []
  const items = allItems(outfit)
  const { top, bottom, dress, outer, shoes } = outfit.items
  if (!items.length) return w

  const busy = items.filter((i) => isBusy(i.pattern))
  if (busy.length > 1) w.push({ id: 'busy', level: 'warn', message: `Two busy patterns: ${busy.map((i) => i.name).slice(0, 2).join(' + ')}` })

  const bold = items.filter(isBold)
  if (bold.length > 1)
    w.push({ id: 'bold', level: 'warn', message: `Competing bold colours: ${[...new Set(bold.map((i) => colour(i.primaryColour).name))].join(' + ')}` })

  const { low, high, spread } = formalitySpread(clothing(outfit))
  if (spread >= 3 && low && high) {
    const suit = outer?.subcategory === 'Blazer' && bottom?.subcategory === 'Trousers' && outer.primaryColour === bottom.primaryColour
    const highName = suit ? 'suit' : high.name.toLowerCase()
    w.push({ id: 'formality', level: 'warn', message: `Formality mismatch: ${low.name.toLowerCase()} with ${highName}` })
  }

  const full = fullWarmth(outfit)
  const core = coreWarmth(outfit)
  if (needsRemovableLayer(weather)) {
    if (!outer) w.push({ id: 'swing', level: 'info', message: `Big swing today (${weather.minTemp}°→${weather.maxTemp}°): add a layer you can take off` })
    else if (full < warmthTarget(weather.minTemp) - 1.5) w.push({ id: 'cold', level: 'warn', message: `Chilly for a ${weather.minTemp}°C morning` })
    if (core > warmthTarget(weather.maxTemp) + 2) w.push({ id: 'hot', level: 'warn', message: `Too warm for ${weather.maxTemp}°C, even without the ${outer?.subcategory.toLowerCase() ?? 'layer'}` })
  } else {
    if (full > warmthTarget(weather.maxTemp) + 2) w.push({ id: 'hot', level: 'warn', message: `Too warm for ${weather.maxTemp}°C` })
    if (full < warmthTarget(weather.minTemp) - 2) w.push({ id: 'cold', level: 'warn', message: `Too light for ${weather.minTemp}°C — add a layer` })
  }

  if (weather.rain) {
    if (shoes?.subcategory === 'Sandals') w.push({ id: 'rain-shoes', level: 'warn', message: 'Sandals in the rain' })
    if (!outer) w.push({ id: 'rain-outer', level: 'info', message: 'Rain expected — consider a coat' })
  }
  if (weather.maxTemp >= 28 && shoes?.subcategory === 'Boots') w.push({ id: 'hot-boots', level: 'warn', message: `Boots at ${weather.maxTemp}°C will be hot` })

  if (occasion) {
    const target = OCCASIONS.find((o) => o.id === occasion)!.formality
    const off = clothing(outfit).find((i) => i.formality <= target - 3)
    if (off && !w.some((x) => x.id === 'formality')) w.push({ id: 'occasion', level: 'warn', message: `${off.name} is too casual for ${occasionLabel(occasion)}` })
  }

  if (!dress && top && !bottom) w.push({ id: 'no-bottom', level: 'info', message: 'Add a bottom' })
  if (!dress && bottom && !top) w.push({ id: 'no-top', level: 'info', message: 'Add a top' })
  if (!shoes && (top || dress || bottom)) w.push({ id: 'no-shoes', level: 'info', message: 'No shoes yet' })
  return w
}

/** One-sentence reason for an outfit. */
export function explain(outfit: ResolvedOutfit, ctx?: { weather?: WeatherScenario; occasion?: Occasion }): string {
  const { top, bottom, dress, outer, shoes } = outfit.items
  const weather = ctx?.weather
  const lc = (i?: Item) => i?.name.toLowerCase() ?? ''
  const base = dress ? `the ${lc(dress)}` : top && bottom ? `the ${lc(top)} with ${lc(bottom)}` : `the ${lc(top ?? bottom)}`
  const light = weather ? coreWarmth(outfit) <= warmthTarget(weather.maxTemp) + 1 : false

  let clause: string
  if (weather && needsRemovableLayer(weather) && outer) clause = `Layers for the cold ${weather.minTemp}° morning; the ${lc(outer)} comes off by lunch`
  else if (weather?.rain && outer) clause = `The ${lc(outer)} handles the showers${shoes && shoes.subcategory !== 'Sandals' ? ` and the ${lc(shoes)} keep feet dry` : ''}`
  else if (weather && weather.maxTemp >= 28 && light) clause = `${cap(base)} stays light and breathable for the ${weather.maxTemp}° heat`
  else if (weather && weather.maxTemp >= 28) clause = `${cap(base)} will run warm at ${weather.maxTemp}°, but it’s the best fit for the occasion`
  else if (outer) clause = `${cap(base)} under the ${lc(outer)} is an easy, balanced pairing`
  else clause = `${cap(base)} is an easy, balanced pairing`

  const items = allItems(outfit)
  const bold = items.find(isBold)
  const print = items.find((i) => isBusy(i.pattern))
  const mentioned = clause.toLowerCase()
  let tail = ''
  if (ctx?.occasion === 'traditional' && print) tail = `the ${lc(print)} brings the celebration`
  else if (bold) tail = `${colour(bold.primaryColour).name.toLowerCase()} is the one pop of colour`
  else if (print) tail = `the ${lc(print)} is the only busy piece`
  else if (!mentioned.includes(base.replace('the ', ''))) tail = `${base} keeps it calm for ${ctx?.occasion ? occasionLabel(ctx.occasion).toLowerCase() : 'the day'}`
  else if (ctx?.occasion) tail = `calm neutrals suit ${occasionLabel(ctx.occasion).toLowerCase()}`
  return tail ? `${clause} — ${tail}.` : `${clause}.`
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

// ─── Tagging ────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = () => rej(new Error('image load failed'))
    img.src = src
  })
}

function nearestColour(r: number, g: number, b: number): { id: string; dist: number } {
  let best = { id: 'grey', dist: Infinity }
  for (const c of COLOURS) {
    const [cr, cg, cb] = hexToRgb(c.hex)
    // weighted RGB distance (cheap perceptual approximation)
    const d = 2 * (r - cr) ** 2 + 4 * (g - cg) ** 2 + 3 * (b - cb) ** 2
    if (d < best.dist) best = { id: c.id, dist: d }
  }
  return best
}

/**
 * Guess tags for a garment image.
 * Colour is genuinely measured from the pixels (nearest palette colour vote).
 * Category/pattern are "plausible fixed guesses": from the sample's hint, or
 * from the photo's aspect ratio. Confidence labels explain how sure each rule is.
 */
export async function tagItem(image: TagInput): Promise<TagResult> {
  let votes = new Map<string, number>()
  let total = 0
  let aspect = 1
  try {
    const img = await loadImage(image.dataUrl)
    aspect = img.naturalHeight / Math.max(1, img.naturalWidth)
    const size = 48
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (ctx) {
      ctx.drawImage(img, 0, 0, size, size)
      const { data } = ctx.getImageData(0, 0, size, size)
      const photo = !image.hint
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          // photos: centre 60% only (the garment is usually centred)
          if (photo && (x < size * 0.2 || x > size * 0.8 || y < size * 0.2 || y > size * 0.8)) continue
          const i = (y * size + x) * 4
          if (data[i + 3] < 128) continue
          const id = nearestColour(data[i], data[i + 1], data[i + 2]).id
          votes.set(id, (votes.get(id) ?? 0) + 1)
          total++
        }
    }
  } catch {
    votes = new Map()
  }
  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1])
  const primary = ranked[0]?.[0] ?? 'grey'
  const secondary = ranked[1] && ranked[1][1] / Math.max(1, total) > 0.08 ? ranked[1][0] : primary
  const share = ranked[0] ? ranked[0][1] / Math.max(1, total) : 0
  const colourConf: Confidence = share >= 0.5 ? 'High' : share >= 0.28 ? 'Medium' : 'Low'

  if (image.hint) {
    const info = subcategoryInfo(image.hint.subcategory)!
    const pattern = image.hint.pattern ?? 'solid'
    return {
      category: info.category,
      subcategory: info.name,
      shape: info.shape,
      primaryColour: primary,
      secondaryColour: secondary,
      pattern,
      formality: info.formality,
      warmth: info.warmth,
      confidence: {
        category: 'High',
        subcategory: info.category === 'top' || info.category === 'outer' ? 'Medium' : 'High',
        primaryColour: colourConf,
        pattern: pattern === 'solid' ? 'High' : 'Medium',
        formality: 'Medium',
        // Thickness is hard to judge from a flat image.
        warmth: info.category === 'outer' ? 'Low' : 'Medium',
      },
      simulated: true,
    }
  }

  // Uploaded photo: aspect ratio is the only "shape" signal we pretend to have.
  const sub =
    aspect > 1.6 ? 'Trousers' : aspect > 1.15 ? 'Shirt' : aspect < 0.75 ? 'Sneakers' : 'T-shirt'
  const info = SUBCATEGORIES.find((s) => s.name === sub)!
  const pattern: Pattern = share < 0.3 ? 'print' : 'solid'
  return {
    category: info.category,
    subcategory: info.name,
    shape: info.shape,
    primaryColour: primary,
    secondaryColour: secondary,
    pattern,
    formality: info.formality,
    warmth: info.warmth,
    confidence: {
      category: 'Medium',
      subcategory: 'Low',
      primaryColour: colourConf === 'High' ? 'Medium' : colourConf, // backgrounds make photos harder
      pattern: 'Low',
      formality: 'Low',
      warmth: 'Low',
    },
    simulated: true,
  }
}
