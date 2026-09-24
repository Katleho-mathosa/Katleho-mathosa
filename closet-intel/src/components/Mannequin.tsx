import { memo } from 'react'
import type { Item, SlotId, SlotMap } from '../types'
import { ANCHORS, BODY_VIEWBOX, MANNEQUIN_PARTS, SHOE_RIGHT, SLOT_ZONES, drawOrder, type Rect } from '../art/mannequin'
import { isBodyShape, parseSvg, svgDataUrl } from '../art/garments'

interface Props {
  slots: SlotMap
  items: Record<string, Item>
  tucked: boolean
  /** Inline SVG (interactive, precise hit-testing) vs. <image> (cheap thumbnails). */
  interactive?: boolean
  locked?: SlotId[]
  highlightSlot?: SlotId | null
  selectedSlot?: SlotId | null
  className?: string
  onSlotPointerDown?: (slot: SlotId, e: React.PointerEvent) => void
  onSlotClick?: (slot: SlotId) => void
}

const BADGE: Record<SlotId, [number, number]> = {
  head: [128, 16],
  outer: [166, 96],
  top: [150, 128],
  bottom: [140, 300],
  dress: [146, 210],
  shoes: [150, 424],
  bag: [182, 214],
}

function placement(item: Item, slot: SlotId): { rect: Rect; mirrorCopy: boolean } {
  if (item.photo) return { rect: SLOT_ZONES[slot], mirrorCopy: false }
  if (isBodyShape(item.shape)) return { rect: parseSvg(item.imageSvg).viewBox, mirrorCopy: false }
  if (item.category === 'shoes') return { rect: SHOE_RIGHT, mirrorCopy: true }
  return { rect: ANCHORS[item.shape] ?? SLOT_ZONES[slot], mirrorCopy: false }
}

function Art({ item, rect, interactive }: { item: Item; rect: Rect; interactive: boolean }) {
  const [x, y, w, h] = rect
  if (item.photo) {
    const clipId = `clip-${item.id}`
    return (
      <g>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={w} height={h} rx={10} />
        </clipPath>
        <rect x={x} y={y} width={w} height={h} rx={10} fill="var(--surface)" stroke="var(--line)" />
        <image href={item.photo} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet" clipPath={`url(#${clipId})`} />
      </g>
    )
  }
  if (!interactive) {
    return <image href={svgDataUrl(item.imageSvg)} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet" />
  }
  const { viewBox, inner } = parseSvg(item.imageSvg)
  return (
    <svg
      x={x}
      y={y}
      width={w}
      height={h}
      viewBox={viewBox.join(' ')}
      preserveAspectRatio="xMidYMid meet"
      overflow="visible"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  )
}

function LockBadge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <circle r="8.5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="1.5" />
      <rect x="-3.6" y="-1" width="7.2" height="5.6" rx="1.2" fill="var(--on-accent)" />
      <path d="M-2.2 -1V-3a2.2 2.2 0 0 1 4.4 0V-1" fill="none" stroke="var(--on-accent)" strokeWidth="1.3" />
    </g>
  )
}

export const Mannequin = memo(function Mannequin({
  slots,
  items,
  tucked,
  interactive = false,
  locked = [],
  highlightSlot,
  selectedSlot,
  className,
  onSlotPointerDown,
  onSlotClick,
}: Props) {
  const order = drawOrder(tucked)
  return (
    <svg viewBox={BODY_VIEWBOX} className={className} role="img" aria-label="Mannequin preview">
      <ellipse cx="100" cy="446" rx="62" ry="7" fill="var(--shadow)" />
      <g fill="var(--mannequin)">
        {Object.values(MANNEQUIN_PARTS).map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <path d={MANNEQUIN_PARTS.head} fill="url(#mq-sheen)" />
      <defs>
        <radialGradient id="mq-sheen" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {order.map((slot) => {
        const id = slots[slot]
        const item = id ? items[id] : undefined
        if (!item) return null
        const { rect, mirrorCopy } = placement(item, slot)
        const selected = selectedSlot === slot
        return (
          <g
            key={slot + item.id}
            className={interactive ? 'garment-in cursor-pointer' : undefined}
            data-slot={slot}
            onPointerDown={onSlotPointerDown ? (e) => onSlotPointerDown(slot, e) : undefined}
            onClick={onSlotClick ? () => onSlotClick(slot) : undefined}
            style={selected ? { filter: 'drop-shadow(0 0 4px var(--accent))' } : undefined}
          >
            <Art item={item} rect={rect} interactive={interactive} />
            {mirrorCopy && !item.photo && (
              <g transform="translate(200 0) scale(-1 1)">
                <Art item={item} rect={rect} interactive={interactive} />
              </g>
            )}
          </g>
        )
      })}

      {highlightSlot && (
        <rect
          className="slot-highlight"
          x={SLOT_ZONES[highlightSlot][0]}
          y={SLOT_ZONES[highlightSlot][1]}
          width={SLOT_ZONES[highlightSlot][2]}
          height={SLOT_ZONES[highlightSlot][3]}
          rx="14"
        />
      )}

      {interactive &&
        locked.map((slot) => (slots[slot] ? <LockBadge key={slot} x={BADGE[slot][0]} y={BADGE[slot][1]} /> : null))}
    </svg>
  )
})
