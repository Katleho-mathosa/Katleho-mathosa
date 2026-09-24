export interface Colour {
  id: string
  name: string
  hex: string
  /** Neutrals go with anything. */
  neutral: boolean
}

export const COLOURS: Colour[] = [
  { id: 'white', name: 'White', hex: '#F4F2EE', neutral: true },
  { id: 'cream', name: 'Cream', hex: '#EBDFC8', neutral: true },
  { id: 'beige', name: 'Beige', hex: '#D4BF9E', neutral: true },
  { id: 'camel', name: 'Camel', hex: '#B98A57', neutral: true },
  { id: 'tan', name: 'Tan', hex: '#A9774A', neutral: true },
  { id: 'brown', name: 'Brown', hex: '#6B4630', neutral: true },
  { id: 'grey', name: 'Grey', hex: '#A3A3A0', neutral: true },
  { id: 'charcoal', name: 'Charcoal', hex: '#45474B', neutral: true },
  { id: 'black', name: 'Black', hex: '#1F1F21', neutral: true },
  { id: 'navy', name: 'Navy', hex: '#223A5E', neutral: true },
  { id: 'denim', name: 'Denim blue', hex: '#4C6C92', neutral: true },
  { id: 'indigo', name: 'Indigo', hex: '#2E3F78', neutral: true },
  { id: 'olive', name: 'Olive', hex: '#6B6B3A', neutral: true },
  { id: 'khaki', name: 'Khaki', hex: '#A89B6B', neutral: true },
  { id: 'silver', name: 'Silver', hex: '#C4C7CC', neutral: true },
  { id: 'sky', name: 'Sky blue', hex: '#9CC3E4', neutral: false },
  { id: 'burgundy', name: 'Burgundy', hex: '#6E2335', neutral: false },
  { id: 'red', name: 'Red', hex: '#C23B32', neutral: false },
  { id: 'terracotta', name: 'Terracotta', hex: '#C2653E', neutral: false },
  { id: 'mustard', name: 'Mustard', hex: '#D0A032', neutral: false },
  { id: 'emerald', name: 'Emerald', hex: '#1F7A5A', neutral: false },
  { id: 'pink', name: 'Pink', hex: '#E7A6B4', neutral: false },
  { id: 'lavender', name: 'Lavender', hex: '#B6A8D8', neutral: false },
]

const byId = new Map(COLOURS.map((c) => [c.id, c]))

export function colour(id: string): Colour {
  return byId.get(id) ?? { id, name: id, hex: '#999999', neutral: true }
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** Darken (amt < 0) or lighten (amt > 0) a hex colour. */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex)
  const f = (v: number) => {
    const out = amt < 0 ? v * (1 + amt) : v + (255 - v) * amt
    return Math.max(0, Math.min(255, Math.round(out)))
  }
  return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('')
}

export function isLight(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex)
  return 0.299 * r + 0.587 * g + 0.114 * b > 160
}
