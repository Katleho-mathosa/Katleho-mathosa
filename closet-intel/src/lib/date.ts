/** Local-date helpers. Dates are stored as YYYY-MM-DD strings. */

export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return isoDate(new Date())
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

export function daysAgo(n: number): string {
  return addDays(todayISO(), -n)
}

export function daysSince(iso: string | null): number {
  if (!iso) return Infinity
  const ms = parseISO(todayISO()).getTime() - parseISO(iso).getTime()
  return Math.round(ms / 86_400_000)
}

export function relativeDay(iso: string | null): string {
  if (!iso) return 'Never'
  const n = daysSince(iso)
  if (n === 0) return 'Today'
  if (n === 1) return 'Yesterday'
  if (n < 0) return `In ${-n} days`
  if (n < 14) return `${n} days ago`
  if (n < 60) return `${Math.round(n / 7)} weeks ago`
  return `${Math.round(n / 30)} months ago`
}

/** Monday-based week containing `iso`. */
export function weekOf(iso: string): string[] {
  const d = parseISO(iso)
  const dow = (d.getDay() + 6) % 7 // Mon=0
  const monday = addDays(iso, -dow)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export function weekdayShort(iso: string): string {
  return parseISO(iso).toLocaleDateString('en-ZA', { weekday: 'short' })
}

export function dayNum(iso: string): number {
  return parseISO(iso).getDate()
}

export function longDate(iso: string): string {
  return parseISO(iso).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** Days since an item was last worn — or, if never worn, since it was added. */
export function daysIdle(item: { lastWorn: string | null; dateAdded: string }): number {
  return daysSince(item.lastWorn ?? item.dateAdded)
}
