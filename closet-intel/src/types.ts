// Core data model for Closet Intel.

export type Category = 'top' | 'outer' | 'bottom' | 'dress' | 'shoes' | 'accessory'
export type Pattern = 'solid' | 'striped' | 'checked' | 'print'
export type Layer = 'base' | 'mid' | 'outer'
export type Season = 'summer' | 'autumn' | 'winter' | 'spring'

/** Named drawing shapes the SVG generator knows how to draw. */
export type Shape =
  // tops
  | 'tee' | 'longsleeve' | 'shirt' | 'polo' | 'blouse' | 'turtleneck'
  // outer
  | 'denim-jacket' | 'blazer' | 'coat' | 'cardigan' | 'jersey'
  // bottoms
  | 'jeans' | 'trousers' | 'chinos' | 'cargos' | 'joggers' | 'shorts' | 'skirt'
  // dresses
  | 'midi-dress' | 'wrap-dress' | 'slip-dress'
  // shoes
  | 'sneaker' | 'runner' | 'boot' | 'oxford' | 'loafer' | 'sandal' | 'heel'
  // accessories
  | 'belt' | 'cap' | 'tote' | 'scarf' | 'watch'

export interface Item {
  id: string
  name: string
  category: Category
  subcategory: string
  primaryColour: string // colour id, see data/colours.ts
  secondaryColour: string
  pattern: Pattern
  formality: number // 1–5
  warmth: number // 1–5
  seasons: Season[]
  layer: Layer
  /** Full SVG markup of the item illustration (regenerated when colour/pattern/shape changes). */
  imageSvg: string
  /** Drawing shape used to (re)generate imageSvg. */
  shape: Shape
  /** Uploaded photo (downscaled data URL). When present it is shown instead of imageSvg. */
  photo?: string
  dateAdded: string // ISO date
  timesWorn: number
  lastWorn: string | null // ISO date
  favourite: boolean
  notes: string
}

/** Fixed mannequin slots. */
export type SlotId = 'head' | 'outer' | 'top' | 'bottom' | 'dress' | 'shoes' | 'bag'

export type SlotMap = Partial<Record<SlotId, string>> // slot -> item id

export type Occasion =
  | 'work' | 'casual' | 'church' | 'date' | 'event' | 'gym' | 'traditional'

export interface Outfit {
  id: string
  name: string
  occasion: Occasion
  slots: SlotMap
  tucked: boolean
  createdAt: string
  /** 1 = thumbs up, -1 = thumbs down, 0 = no rating */
  rating: 1 | -1 | 0
}

/** A suggestion produced by the (mock) AI — never persisted as a "real" result. */
export interface SuggestedOutfit {
  id: string
  slots: SlotMap
  tucked: boolean
  reason: string
  score: number
  simulated: true
}

export interface WeatherScenario {
  id: string
  label: string
  short: string
  minTemp: number
  maxTemp: number
  rain: boolean
  summary: string
}

export interface Warning {
  id: string
  level: 'warn' | 'info'
  message: string
}

export interface WearEntry {
  date: string // YYYY-MM-DD
  slots: SlotMap
  outfitId?: string
  planned: boolean
}

export type Confidence = 'High' | 'Medium' | 'Low'

export interface TagResult {
  category: Category
  subcategory: string
  shape: Shape
  primaryColour: string
  secondaryColour: string
  pattern: Pattern
  formality: number
  warmth: number
  confidence: Record<'category' | 'subcategory' | 'primaryColour' | 'pattern' | 'formality' | 'warmth', Confidence>
  simulated: true
}
