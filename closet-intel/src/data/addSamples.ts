import type { Pattern } from '../types'
import { subcategoryInfo } from './catalogue'
import { renderItemArt } from '../art/garments'

/** "Use sample" images for the Add item flow — stand-ins for a phone photo. */
export interface AddSample {
  id: string
  name: string
  subcategory: string
  primary: string
  secondary: string
  pattern: Pattern
}

export const ADD_SAMPLES: AddSample[] = [
  { id: 'smp-lavender-tee', name: 'Lavender tee', subcategory: 'T-shirt', primary: 'lavender', secondary: 'white', pattern: 'solid' },
  { id: 'smp-denim-shirt', name: 'Denim shirt', subcategory: 'Shirt', primary: 'denim', secondary: 'white', pattern: 'solid' },
  { id: 'smp-grey-sweat', name: 'Grey sweatshirt', subcategory: 'Jersey', primary: 'grey', secondary: 'charcoal', pattern: 'solid' },
  { id: 'smp-pink-stripe', name: 'Pink striped shirt', subcategory: 'Shirt', primary: 'white', secondary: 'pink', pattern: 'striped' },
  { id: 'smp-khaki-shorts', name: 'Khaki shorts', subcategory: 'Shorts', primary: 'khaki', secondary: 'khaki', pattern: 'solid' },
  { id: 'smp-linen-trousers', name: 'White linen trousers', subcategory: 'Trousers', primary: 'cream', secondary: 'cream', pattern: 'solid' },
  { id: 'smp-navy-blazer', name: 'Navy blazer', subcategory: 'Blazer', primary: 'navy', secondary: 'silver', pattern: 'solid' },
  { id: 'smp-red-sneakers', name: 'Red sneakers', subcategory: 'Sneakers', primary: 'red', secondary: 'white', pattern: 'solid' },
]

export function sampleSvg(s: AddSample): string {
  const info = subcategoryInfo(s.subcategory)!
  return renderItemArt({ id: s.id, shape: info.shape, primaryColour: s.primary, secondaryColour: s.secondary, pattern: s.pattern }).svg
}
