import type { Category, Layer, Occasion, Pattern, Season, Shape, SlotId } from '../types'

export interface SubcategoryInfo {
  name: string
  category: Category
  shape: Shape
  layer: Layer
  formality: number
  warmth: number
}

/** Every subcategory the app understands, with sensible defaults. */
export const SUBCATEGORIES: SubcategoryInfo[] = [
  { name: 'T-shirt', category: 'top', shape: 'tee', layer: 'base', formality: 1, warmth: 1 },
  { name: 'Long-sleeve', category: 'top', shape: 'longsleeve', layer: 'base', formality: 2, warmth: 2 },
  { name: 'Shirt', category: 'top', shape: 'shirt', layer: 'base', formality: 3, warmth: 2 },
  { name: 'Polo', category: 'top', shape: 'polo', layer: 'base', formality: 2, warmth: 1 },
  { name: 'Blouse', category: 'top', shape: 'blouse', layer: 'base', formality: 4, warmth: 1 },
  { name: 'Turtleneck', category: 'top', shape: 'turtleneck', layer: 'base', formality: 3, warmth: 3 },
  { name: 'Denim jacket', category: 'outer', shape: 'denim-jacket', layer: 'outer', formality: 2, warmth: 3 },
  { name: 'Blazer', category: 'outer', shape: 'blazer', layer: 'outer', formality: 4, warmth: 3 },
  { name: 'Coat', category: 'outer', shape: 'coat', layer: 'outer', formality: 4, warmth: 4 },
  { name: 'Cardigan', category: 'outer', shape: 'cardigan', layer: 'mid', formality: 3, warmth: 3 },
  { name: 'Jersey', category: 'outer', shape: 'jersey', layer: 'mid', formality: 2, warmth: 4 },
  { name: 'Jeans', category: 'bottom', shape: 'jeans', layer: 'base', formality: 2, warmth: 3 },
  { name: 'Trousers', category: 'bottom', shape: 'trousers', layer: 'base', formality: 4, warmth: 3 },
  { name: 'Chinos', category: 'bottom', shape: 'chinos', layer: 'base', formality: 3, warmth: 2 },
  { name: 'Cargo pants', category: 'bottom', shape: 'cargos', layer: 'base', formality: 1, warmth: 3 },
  { name: 'Joggers', category: 'bottom', shape: 'joggers', layer: 'base', formality: 1, warmth: 2 },
  { name: 'Shorts', category: 'bottom', shape: 'shorts', layer: 'base', formality: 1, warmth: 1 },
  { name: 'Skirt', category: 'bottom', shape: 'skirt', layer: 'base', formality: 3, warmth: 2 },
  { name: 'Midi dress', category: 'dress', shape: 'midi-dress', layer: 'base', formality: 4, warmth: 2 },
  { name: 'Wrap dress', category: 'dress', shape: 'wrap-dress', layer: 'base', formality: 3, warmth: 2 },
  { name: 'Slip dress', category: 'dress', shape: 'slip-dress', layer: 'base', formality: 5, warmth: 1 },
  { name: 'Sneakers', category: 'shoes', shape: 'sneaker', layer: 'base', formality: 1, warmth: 2 },
  { name: 'Running shoes', category: 'shoes', shape: 'runner', layer: 'base', formality: 1, warmth: 2 },
  { name: 'Boots', category: 'shoes', shape: 'boot', layer: 'base', formality: 3, warmth: 4 },
  { name: 'Oxfords', category: 'shoes', shape: 'oxford', layer: 'base', formality: 5, warmth: 2 },
  { name: 'Loafers', category: 'shoes', shape: 'loafer', layer: 'base', formality: 4, warmth: 2 },
  { name: 'Sandals', category: 'shoes', shape: 'sandal', layer: 'base', formality: 1, warmth: 1 },
  { name: 'Heels', category: 'shoes', shape: 'heel', layer: 'base', formality: 4, warmth: 1 },
  { name: 'Belt', category: 'accessory', shape: 'belt', layer: 'outer', formality: 3, warmth: 1 },
  { name: 'Cap', category: 'accessory', shape: 'cap', layer: 'outer', formality: 1, warmth: 1 },
  { name: 'Bag', category: 'accessory', shape: 'tote', layer: 'outer', formality: 2, warmth: 1 },
  { name: 'Scarf', category: 'accessory', shape: 'scarf', layer: 'outer', formality: 2, warmth: 3 },
  { name: 'Watch', category: 'accessory', shape: 'watch', layer: 'outer', formality: 3, warmth: 1 },
]

export function subcategoryInfo(name: string): SubcategoryInfo | undefined {
  return SUBCATEGORIES.find((s) => s.name === name)
}

export const CATEGORIES: { id: Category; label: string; plural: string }[] = [
  { id: 'top', label: 'Top', plural: 'Tops' },
  { id: 'outer', label: 'Outer layer', plural: 'Outerwear' },
  { id: 'bottom', label: 'Bottom', plural: 'Bottoms' },
  { id: 'dress', label: 'Dress', plural: 'Dresses' },
  { id: 'shoes', label: 'Shoes', plural: 'Shoes' },
  { id: 'accessory', label: 'Accessory', plural: 'Accessories' },
]

export const categoryLabel = (c: Category) => CATEGORIES.find((x) => x.id === c)?.label ?? c
export const categoryPlural = (c: Category) => CATEGORIES.find((x) => x.id === c)?.plural ?? c

export const PATTERNS: { id: Pattern; label: string; busy: boolean }[] = [
  { id: 'solid', label: 'Solid', busy: false },
  { id: 'striped', label: 'Striped', busy: true },
  { id: 'checked', label: 'Checked', busy: true },
  { id: 'print', label: 'Print', busy: true },
]

export const SEASONS: { id: Season; label: string }[] = [
  { id: 'spring', label: 'Spring' },
  { id: 'summer', label: 'Summer' },
  { id: 'autumn', label: 'Autumn' },
  { id: 'winter', label: 'Winter' },
]

export const LAYERS: { id: Layer; label: string }[] = [
  { id: 'base', label: 'Base' },
  { id: 'mid', label: 'Mid' },
  { id: 'outer', label: 'Outer' },
]

export const OCCASIONS: { id: Occasion; label: string; emoji: string; formality: number }[] = [
  { id: 'work', label: 'Work', emoji: '💼', formality: 4 },
  { id: 'casual', label: 'Casual', emoji: '☕', formality: 2 },
  { id: 'church', label: 'Church', emoji: '⛪', formality: 4 },
  { id: 'date', label: 'Date night', emoji: '🌙', formality: 3 },
  { id: 'event', label: 'Wedding / Event', emoji: '🥂', formality: 5 },
  { id: 'gym', label: 'Gym', emoji: '🏃', formality: 1 },
  { id: 'traditional', label: 'Traditional / cultural', emoji: '🪘', formality: 3 },
]

export const occasionLabel = (o: Occasion) => OCCASIONS.find((x) => x.id === o)?.label ?? o

/** Which mannequin slot an item goes into. */
export function slotForItem(item: { category: Category; shape: Shape }): SlotId {
  switch (item.category) {
    case 'top': return 'top'
    case 'outer': return 'outer'
    case 'bottom': return 'bottom'
    case 'dress': return 'dress'
    case 'shoes': return 'shoes'
    case 'accessory': return item.shape === 'cap' || item.shape === 'scarf' ? 'head' : 'bag'
  }
}

/** Categories that can fill a slot (used by the drawer when swapping). */
export function categoriesForSlot(slot: SlotId): Category[] {
  switch (slot) {
    case 'head':
    case 'bag': return ['accessory']
    default: return [slot as Category]
  }
}
