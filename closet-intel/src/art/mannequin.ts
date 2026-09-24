/**
 * Mannequin geometry. Everything is in a 200×460 body coordinate system.
 * A neutral, gender-neutral figure: no face, soft shoulders, straight hips.
 */
import type { Shape, SlotId } from '../types'

export const BODY_VIEWBOX = '0 0 200 460'

export const MANNEQUIN_PARTS = {
  head: 'M100 13C112 13 119 23 119 36C119 50 111 60 100 60C89 60 81 50 81 36C81 23 88 13 100 13Z',
  neck: 'M91 52H109V74H91Z',
  torso:
    'M90 68C84 72 72 74 66 80C60 86 62 100 64 118C66 150 72 170 72 192C70 206 66 214 66 228L134 228C134 214 130 206 128 192C128 170 134 150 136 118C138 100 140 86 134 80C128 74 116 72 110 68Z',
  armL: 'M66 80C56 84 52 96 50 112L45 170L41 240C40 250 52 252 53 242L58 174L64 124Z',
  armR: 'M134 80C144 84 148 96 150 112L155 170L159 240C160 250 148 252 147 242L142 174L136 124Z',
  handL: 'M47 238C53 238 54 246 53 252C52 258 42 258 41 252C40 246 41 238 47 238Z',
  handR: 'M153 238C159 238 160 246 159 252C158 258 148 258 147 252C146 246 147 238 153 238Z',
  legL: 'M66 222L100 222L100 246L97 330L96 432L81 432L78 330C70 290 66 260 66 222Z',
  legR: 'M134 222L100 222L100 246L103 330L104 432L119 432L122 330C130 290 134 260 134 222Z',
  footL: 'M96 428L96 440Q88 443 76 441Q72 437 80 432Z',
  footR: 'M104 428L104 440Q112 443 124 441Q128 437 120 432Z',
}

export type Rect = [number, number, number, number] // x, y, w, h

/** Drop/highlight zones for each slot, and where uploaded photos are placed. */
export const SLOT_ZONES: Record<SlotId, Rect> = {
  head: [72, 4, 56, 64],
  outer: [34, 64, 132, 200],
  top: [50, 66, 100, 172],
  bottom: [60, 184, 80, 246],
  dress: [52, 66, 96, 292],
  shoes: [58, 412, 84, 36],
  bag: [132, 196, 54, 76],
}

/** Anchor boxes for non-body-coordinate art (shoes and accessories). */
export const ANCHORS: Partial<Record<Shape, Rect>> = {
  cap: [73, 3, 54, 35],
  scarf: [74, 50, 52, 84],
  tote: [134, 222, 42, 51],
  belt: [67, 185, 66, 9],
  watch: [37, 222, 13, 24],
}

/** Right foot (shoe facing right). The left foot is the mirror image. */
export const SHOE_RIGHT: Rect = [96, 409, 52, 35]

export const SLOT_ORDER: SlotId[] = ['head', 'outer', 'top', 'dress', 'bottom', 'shoes', 'bag']

export const SLOT_LABEL: Record<SlotId, string> = {
  head: 'Head / neck',
  outer: 'Outer layer',
  top: 'Top',
  bottom: 'Bottom',
  dress: 'Full body',
  shoes: 'Shoes',
  bag: 'Bag / accessory',
}

/**
 * Drawing order, back to front: shoes < bottom < top < outer < accessories.
 * A dress sits at the top/bottom level. With "tucked in" the top goes under the bottom.
 */
export function drawOrder(tucked: boolean): SlotId[] {
  return tucked
    ? ['shoes', 'top', 'bottom', 'dress', 'outer', 'head', 'bag']
    : ['shoes', 'bottom', 'top', 'dress', 'outer', 'head', 'bag']
}
