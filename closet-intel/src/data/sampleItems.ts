import type { Item, Outfit, Pattern, Season, WearEntry } from '../types'
import { subcategoryInfo } from './catalogue'
import { renderItemArt } from '../art/garments'
import { daysAgo } from '../lib/date'

const SEASON_CODES: Record<string, Season> = { P: 'spring', S: 'summer', A: 'autumn', W: 'winter' }

type Row = [
  id: string,
  name: string,
  subcategory: string,
  primary: string,
  secondary: string,
  pattern: Pattern,
  formality: number,
  warmth: number,
  seasons: string, // P S A W
  addedDaysAgo: number,
  timesWorn: number,
  lastWornDaysAgo: number | null,
  favourite: boolean,
  notes: string,
]

// 12 tops, 5 outer layers, 8 bottoms, 3 dresses, 7 shoes, 5 accessories = 40 items.
const ROWS: Row[] = [
  // Tops
  ['t01', 'White crew tee', 'T-shirt', 'white', 'grey', 'solid', 1, 1, 'PSA', 120, 34, 2, true, 'Top drawer, left'],
  ['t02', 'Black crew tee', 'T-shirt', 'black', 'charcoal', 'solid', 1, 1, 'PSAW', 118, 28, 5, false, 'Top drawer, left'],
  ['t03', 'Grey training tee', 'T-shirt', 'grey', 'charcoal', 'solid', 1, 1, 'PS', 90, 19, 3, false, 'Gym bag'],
  ['t04', 'Breton long-sleeve', 'Long-sleeve', 'white', 'navy', 'striped', 2, 2, 'PA', 80, 9, 12, true, ''],
  ['t05', 'White oxford shirt', 'Shirt', 'white', 'white', 'solid', 3, 2, 'PSAW', 200, 22, 8, true, 'Iron before wearing'],
  ['t06', 'Sky blue dress shirt', 'Shirt', 'sky', 'white', 'solid', 4, 2, 'PSAW', 190, 15, 21, false, ''],
  ['t07', 'Check flannel shirt', 'Shirt', 'burgundy', 'navy', 'checked', 2, 3, 'AW', 160, 11, 45, false, 'Winter box, top shelf'],
  ['t08', 'Olive polo', 'Polo', 'olive', 'cream', 'solid', 2, 1, 'PS', 70, 7, 18, false, ''],
  ['t09', 'Cream blouse', 'Blouse', 'cream', 'beige', 'solid', 4, 1, 'PS', 60, 5, 33, false, 'Hand wash'],
  ['t10', 'Indigo print shirt', 'Shirt', 'indigo', 'white', 'print', 3, 2, 'PS', 150, 6, 40, true, 'For family events'],
  ['t11', 'Black turtleneck', 'Turtleneck', 'black', 'black', 'solid', 3, 3, 'AW', 140, 13, 60, false, ''],
  ['t12', 'Terracotta linen shirt', 'Shirt', 'terracotta', 'cream', 'solid', 2, 1, 'S', 40, 3, 9, false, ''],
  // Outer layers (jackets, knitwear)
  ['o01', 'Denim jacket', 'Denim jacket', 'denim', 'tan', 'solid', 2, 3, 'PA', 300, 41, 4, true, 'Hallway hook'],
  ['o02', 'Charcoal blazer', 'Blazer', 'charcoal', 'black', 'solid', 4, 3, 'PSAW', 260, 18, 10, false, 'Matches charcoal suit trousers'],
  ['o03', 'Camel trench coat', 'Coat', 'camel', 'brown', 'solid', 4, 4, 'AW', 240, 12, 70, false, 'Water-resistant'],
  ['o04', 'Cream cardigan', 'Cardigan', 'cream', 'tan', 'solid', 3, 3, 'PA', 100, 14, 6, false, ''],
  ['o05', 'Navy knit jersey', 'Jersey', 'navy', 'navy', 'solid', 2, 4, 'AW', 210, 16, 35, false, 'Winter box'],
  // Bottoms
  ['b01', 'Dark indigo jeans', 'Jeans', 'indigo', 'tan', 'solid', 2, 3, 'PSAW', 320, 58, 1, true, ''],
  ['b02', 'Black tailored trousers', 'Trousers', 'black', 'black', 'solid', 4, 3, 'PSAW', 220, 24, 7, false, ''],
  ['b03', 'Beige chinos', 'Chinos', 'beige', 'brown', 'solid', 3, 2, 'PS', 180, 17, 14, false, ''],
  ['b04', 'Charcoal suit trousers', 'Trousers', 'charcoal', 'charcoal', 'solid', 5, 3, 'PSAW', 260, 8, 50, false, 'Matches charcoal blazer'],
  ['b05', 'Olive cargo pants', 'Cargo pants', 'olive', 'olive', 'solid', 1, 3, 'PA', 75, 10, 16, false, ''],
  ['b06', 'Black joggers', 'Joggers', 'black', 'grey', 'solid', 1, 2, 'PSAW', 95, 26, 3, false, 'Gym bag'],
  ['b07', 'Navy shorts', 'Shorts', 'navy', 'navy', 'solid', 1, 1, 'S', 50, 9, 38, false, ''],
  ['b08', 'Burgundy pleated skirt', 'Skirt', 'burgundy', 'burgundy', 'solid', 3, 2, 'PA', 65, 4, 31, false, ''],
  // Dresses
  ['d01', 'Black midi dress', 'Midi dress', 'black', 'black', 'solid', 4, 2, 'PSA', 170, 7, 26, true, ''],
  ['d02', 'Indigo print wrap dress', 'Wrap dress', 'indigo', 'white', 'print', 3, 2, 'PS', 130, 5, 55, false, 'For family events'],
  ['d03', 'Emerald slip dress', 'Slip dress', 'emerald', 'emerald', 'solid', 5, 1, 'S', 45, 1, 90, false, 'Garment bag'],
  // Shoes (side profile, facing right)
  ['s01', 'White sneakers', 'Sneakers', 'white', 'grey', 'solid', 1, 2, 'PSAW', 280, 63, 1, true, 'Shoe rack, bottom'],
  ['s02', 'Black running shoes', 'Running shoes', 'black', 'white', 'solid', 1, 2, 'PSAW', 150, 30, 3, false, 'Gym bag'],
  ['s03', 'Brown Chelsea boots', 'Boots', 'brown', 'black', 'solid', 3, 4, 'AW', 230, 21, 36, false, ''],
  ['s04', 'Black oxfords', 'Oxfords', 'black', 'charcoal', 'solid', 5, 2, 'PSAW', 260, 11, 20, false, 'Polish soon'],
  ['s05', 'Tan loafers', 'Loafers', 'tan', 'brown', 'solid', 4, 2, 'PS', 110, 14, 9, false, ''],
  ['s06', 'Camel sandals', 'Sandals', 'camel', 'brown', 'solid', 1, 1, 'S', 60, 8, 42, false, ''],
  ['s07', 'Black block heels', 'Heels', 'black', 'charcoal', 'solid', 4, 1, 'PSA', 140, 6, 26, false, ''],
  // Accessories
  ['a01', 'Brown leather belt', 'Belt', 'brown', 'silver', 'solid', 3, 1, 'PSAW', 300, 40, 7, false, ''],
  ['a02', 'Navy cap', 'Cap', 'navy', 'white', 'solid', 1, 1, 'PS', 90, 12, 11, false, ''],
  ['a03', 'Tan tote bag', 'Bag', 'tan', 'brown', 'solid', 2, 1, 'PSAW', 200, 35, 4, true, ''],
  ['a04', 'Mustard check scarf', 'Scarf', 'mustard', 'brown', 'checked', 2, 3, 'AW', 190, 9, 65, false, 'Winter box'],
  ['a05', 'Silver watch', 'Watch', 'silver', 'silver', 'solid', 3, 1, 'PSAW', 400, 90, 2, true, 'Bedside dish'],
]

export function buildSampleItems(): Item[] {
  return ROWS.map(([id, name, sub, primary, secondary, pattern, formality, warmth, seasons, added, worn, last, fav, notes]) => {
    const info = subcategoryInfo(sub)!
    const art = renderItemArt({ id, shape: info.shape, primaryColour: primary, secondaryColour: secondary, pattern })
    return {
      id,
      name,
      category: info.category,
      subcategory: sub,
      primaryColour: primary,
      secondaryColour: secondary,
      pattern,
      formality,
      warmth,
      seasons: seasons.split('').map((c) => SEASON_CODES[c]),
      layer: info.layer,
      imageSvg: art.svg,
      shape: info.shape,
      dateAdded: daysAgo(added),
      timesWorn: worn,
      lastWorn: last === null ? null : daysAgo(last),
      favourite: fav,
      notes,
    }
  })
}

export function buildSampleOutfits(): Outfit[] {
  return [
    { id: 'of1', name: 'Easy Friday', occasion: 'casual', slots: { top: 't04', bottom: 'b01', shoes: 's01', outer: 'o01' }, tucked: false, createdAt: daysAgo(20), rating: 1 },
    { id: 'of2', name: 'Board meeting', occasion: 'work', slots: { top: 't05', outer: 'o02', bottom: 'b04', shoes: 's04', bag: 'a05' }, tucked: true, createdAt: daysAgo(15), rating: 1 },
    { id: 'of3', name: 'Sunday service', occasion: 'church', slots: { dress: 'd01', outer: 'o04', shoes: 's07', bag: 'a03' }, tucked: false, createdAt: daysAgo(12), rating: 0 },
    { id: 'of4', name: 'Family celebration', occasion: 'traditional', slots: { dress: 'd02', shoes: 's05', bag: 'a03' }, tucked: false, createdAt: daysAgo(9), rating: 1 },
    { id: 'of5', name: 'Too loud', occasion: 'casual', slots: { top: 't07', bottom: 'b08', shoes: 's01', head: 'a04' }, tucked: false, createdAt: daysAgo(6), rating: -1 },
  ]
}

export function buildSampleWearLog(): WearEntry[] {
  return [
    { date: daysAgo(1), slots: { top: 't01', bottom: 'b01', shoes: 's01', outer: 'o01' }, planned: false },
    { date: daysAgo(2), slots: { top: 't05', outer: 'o02', bottom: 'b02', shoes: 's05' }, planned: false },
    { date: daysAgo(3), slots: { top: 't03', bottom: 'b06', shoes: 's02' }, planned: false },
  ]
}
