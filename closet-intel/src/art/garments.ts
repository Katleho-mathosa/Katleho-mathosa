/**
 * Original SVG garment illustrations.
 *
 * Tops, outer layers, bottoms and dresses are drawn directly in the mannequin's
 * body coordinate system (viewBox 0 0 200 460, see art/mannequin.ts). The item
 * thumbnail simply crops to the garment's bounding box, and the mannequin draws
 * the same markup at its native coordinates — so every garment fits its slot
 * exactly. Shoes (side profile, facing right) and accessories use their own
 * small canvases and are scaled into anchor boxes on the mannequin.
 */
import type { Pattern, Shape } from '../types'
import { colour, shade, isLight } from '../data/colours'

type P = [number, number]
type Seg = ['L', P] | ['Q', P, P] | ['C', P, P, P]

export interface ArtInput {
  id: string
  shape: Shape
  primaryColour: string
  secondaryColour: string
  pattern: Pattern
}

const BODY_SHAPES: Shape[] = [
  'tee', 'longsleeve', 'shirt', 'polo', 'blouse', 'turtleneck',
  'denim-jacket', 'blazer', 'coat', 'cardigan', 'jersey',
  'jeans', 'trousers', 'chinos', 'cargos', 'joggers', 'shorts', 'skirt',
  'midi-dress', 'wrap-dress', 'slip-dress',
]

export function isBodyShape(shape: Shape): boolean {
  return BODY_SHAPES.includes(shape)
}

const r = (n: number) => Math.round(n * 10) / 10
const pt = (p: P) => `${r(p[0])} ${r(p[1])}`
const m = (p: P): P => [200 - p[0], p[1]]

class Canvas {
  minX = Infinity
  minY = Infinity
  maxX = -Infinity
  maxY = -Infinity
  track(p: P) {
    this.minX = Math.min(this.minX, p[0])
    this.minY = Math.min(this.minY, p[1])
    this.maxX = Math.max(this.maxX, p[0])
    this.maxY = Math.max(this.maxY, p[1])
  }
  /** Open or closed path from explicit segments. */
  path(start: P, segs: Seg[], close = true): string {
    this.track(start)
    let out = `M${pt(start)}`
    for (const s of segs) {
      const pts = s.slice(1) as P[]
      pts.forEach((p) => this.track(p))
      out += s[0] + pts.map(pt).join(' ')
    }
    return close ? out + 'Z' : out
  }
  /** Symmetric closed outline: `segs` trace the left half from `start` (on the centre line) back to the centre line. */
  sym(start: P, segs: Seg[]): string {
    const ends: P[] = [start, ...segs.map((s) => s[s.length - 1] as P)]
    const rev: Seg[] = []
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = segs[i]
      const target = m(ends[i])
      if (s[0] === 'L') rev.push(['L', target])
      else if (s[0] === 'Q') rev.push(['Q', m(s[1]), target])
      else rev.push(['C', m(s[2]), m(s[1]), target])
    }
    return this.path(start, [...segs, ...rev])
  }
  /** Mirror an explicit path (for right-hand panels). */
  mirror(start: P, segs: Seg[]): string {
    return this.path(
      m(start),
      segs.map((s) => [s[0], ...(s.slice(1) as P[]).map(m)] as Seg),
    )
  }
}

// ---------------------------------------------------------------------------
// Pattern fills

function patternDefs(uid: string, pattern: Pattern, base: string, second: string): string {
  const id = `pat-${uid}`
  switch (pattern) {
    case 'striped':
      return `<pattern id="${id}" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="${base}"/><rect width="9" height="3.6" fill="${second}"/></pattern>`
    case 'checked':
      return `<pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="${base}"/><rect width="16" height="6" fill="${second}" opacity=".55"/><rect width="6" height="16" fill="${second}" opacity=".55"/><rect y="10" width="16" height="1" fill="${second}" opacity=".35"/><rect x="10" width="1" height="16" fill="${second}" opacity=".35"/></pattern>`
    case 'print':
      // Small geometric motif, loosely inspired by indigo-dyed prints.
      return `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="${base}"/><circle cx="7" cy="7" r="2.2" fill="none" stroke="${second}" stroke-width="1"/><circle cx="7" cy="7" r=".8" fill="${second}"/><path d="M0 0l2 2M14 0l-2 2M0 14l2-2M14 14l-2-2" stroke="${second}" stroke-width="1"/><path d="M7 0v1.6M7 14v-1.6M0 7h1.6M14 7h-1.6" stroke="${second}" stroke-width=".9"/></pattern>`
    default:
      return ''
  }
}

function fillFor(uid: string, pattern: Pattern, base: string): string {
  return pattern === 'solid' ? base : `url(#pat-${uid})`
}

// ---------------------------------------------------------------------------
// Body garments

type Neck = 'crew' | 'v' | 'collar' | 'turtle' | 'scoop'
type Sleeve = 'short' | 'long' | 'none'

function topSegs(neck: Neck, sleeve: Sleeve, hemY: number, e: number, curvedHem = false): { start: P; segs: Seg[] } {
  let start: P
  const segs: Seg[] = []
  switch (neck) {
    case 'crew': start = [100, 79]; segs.push(['Q', [91, 79], [87, 69]]); break
    case 'v': start = [100, 104]; segs.push(['L', [87, 69]]); break
    case 'collar': start = [100, 77]; segs.push(['L', [88, 68]]); break
    case 'turtle': start = [100, 50]; segs.push(['L', [89, 50]], ['L', [88, 70]]); break
    case 'scoop': start = [100, 90]; segs.push(['Q', [88, 90], [85, 70]]); break
  }
  if (sleeve === 'none') {
    segs.push(['L', [77, 73]], ['Q', [68, 92], [66, 114]])
  } else {
    segs.push(['L', [62 - e, 78 - e * 0.3]])
    if (sleeve === 'short') {
      segs.push(['L', [44 - e, 122]], ['L', [62 - e * 0.3, 128]], ['L', [65 - e * 0.5, 114]])
    } else {
      segs.push(
        ['C', [53 - e, 84], [49 - e, 98], [48 - e, 112]],
        ['L', [43 - e, 170]],
        ['L', [37 - e, 243]],
        ['L', [55 + e * 0.3, 246]],
        ['L', [59 + e * 0.2, 174]],
        ['L', [64 - e * 0.4, 124]],
        ['L', [65 - e * 0.5, 114]],
      )
    }
  }
  segs.push(['C', [67 - e, 150], [70 - e, 172], [70 - e, 192]])
  segs.push(['C', [68 - e, 206], [64 - e, 214], [64 - e, hemY - 2]])
  segs.push(curvedHem ? ['Q', [80, hemY + 5], [100, hemY + 4]] : ['L', [100, hemY]])
  return { start: start!, segs }
}

interface Parts {
  defs: string
  body: string
}

function strokeFor(base: string) {
  return shade(base, isLight(base) ? -0.28 : 0.25)
}

function drawBody(c: Canvas, input: ArtInput, uid: string): Parts {
  const base = colour(input.primaryColour).hex
  const second = colour(input.secondaryColour).hex
  const fill = fillFor(uid, input.pattern, base)
  const line = strokeFor(base)
  const detail = input.pattern === 'solid' ? shade(base, isLight(base) ? -0.18 : 0.18) : line
  const accent = second
  const out: string[] = []
  const shapeAttrs = `fill="${fill}" stroke="${line}" stroke-width="1" stroke-linejoin="round"`
  const shadeAttrs = `fill="url(#sh-${uid})"`
  const add = (d: string) => out.push(`<path d="${d}" ${shapeAttrs}/><path d="${d}" ${shadeAttrs}/>`)
  const det = (d: string, w = 1, col = detail, extra = '') =>
    out.push(`<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`)
  const solid = (d: string, col: string, extra = '') => out.push(`<path d="${d}" fill="${col}" ${extra}/>`)

  switch (input.shape) {
    // ------------------------------------------------------------------ tops
    case 'tee': {
      const t = topSegs('crew', 'short', 234, 0)
      add(c.sym(t.start, t.segs))
      det('M87 69Q91 79 100 79Q109 79 113 69', 1.4)
      break
    }
    case 'longsleeve': {
      const t = topSegs('crew', 'long', 236, 0)
      add(c.sym(t.start, t.segs))
      det('M87 69Q91 79 100 79Q109 79 113 69', 1.4)
      det('M38 236L55 239M162 236L145 239', 1.2)
      break
    }
    case 'turtleneck': {
      const t = topSegs('turtle', 'long', 236, 0)
      add(c.sym(t.start, t.segs))
      det('M89 55H111M89 60H111M89 65H111', 0.8)
      det('M64 228H136', 1)
      break
    }
    case 'shirt': {
      const t = topSegs('collar', 'long', 240, 0.5, true)
      add(c.sym(t.start, t.segs))
      // collar
      const collarL = c.path([100, 78], [['L', [88, 64]], ['L', [83, 72]], ['L', [93, 88]]])
      const collarR = c.mirror([100, 78], [['L', [88, 64]], ['L', [83, 72]], ['L', [93, 88]]])
      out.push(`<path d="${collarL}" ${shapeAttrs}/><path d="${collarR}" ${shapeAttrs}/>`)
      det('M100 80V242', 1)
      for (let y = 100; y < 240; y += 26) out.push(`<circle cx="102.5" cy="${y}" r="1.5" fill="${detail}"/>`)
      det('M38 232L55 235M162 232L145 235', 1)
      break
    }
    case 'polo': {
      const t = topSegs('collar', 'short', 234, 0)
      add(c.sym(t.start, t.segs))
      const collar: Seg[] = [['L', [88, 64]], ['L', [84, 72]], ['L', [95, 86]]]
      out.push(`<path d="${c.path([100, 78], collar)}" ${shapeAttrs}/><path d="${c.mirror([100, 78], collar)}" ${shapeAttrs}/>`)
      det('M97 80V112H103V80', 1)
      out.push(`<circle cx="100" cy="92" r="1.4" fill="${detail}"/><circle cx="100" cy="104" r="1.4" fill="${detail}"/>`)
      det('M46 118L62 124M154 118L138 124', 1.2)
      break
    }
    case 'blouse': {
      const t = topSegs('v', 'none', 232, 0, true)
      add(c.sym(t.start, t.segs))
      det('M87 69L100 104L113 69', 1)
      det('M76 140Q100 150 124 140', 0.8, detail, 'opacity=".6"')
      break
    }
    // ------------------------------------------------------------------ outer
    case 'jersey': {
      const t = topSegs('crew', 'long', 232, 3)
      add(c.sym(t.start, t.segs))
      det('M86 69Q91 81 100 81Q109 81 114 69', 2.2)
      det('M61 222H139M61 226H139', 1.1)
      det('M36 236L56 239M164 236L144 239', 2)
      for (let x = 70; x <= 130; x += 6) det(`M${x} 222V232`, 0.6)
      break
    }
    case 'denim-jacket': {
      const segs = jacketPanel(93, 90, 216, 3)
      add(c.path([93, 216], segs))
      add(c.mirror([93, 216], segs))
      // collar
      const col: Seg[] = [['L', [80, 64]], ['L', [70, 78]], ['L', [86, 96]]]
      out.push(`<path d="${c.path([90, 68], col)}" ${shapeAttrs}/><path d="${c.mirror([90, 68], col)}" ${shapeAttrs}/>`)
      // pockets + yoke + waistband stitching in the accent colour
      det('M72 112H90V128L81 132L72 128Z M128 112H110V128L119 132L128 128Z', 1, accent)
      det('M62 102Q80 96 92 100M138 102Q120 96 108 100', 0.9, accent, 'stroke-dasharray="2 2"')
      det('M62 204H93M107 204H138', 1, accent, 'stroke-dasharray="2 2"')
      for (let y = 118; y < 214; y += 24) out.push(`<circle cx="95.5" cy="${y}" r="1.6" fill="${accent}"/>`)
      break
    }
    case 'blazer': {
      const segs = closedPanel(196, 252, 3)
      add(c.path([100, 252], segs))
      add(c.mirror([100, 252], segs))
      const lapel: Seg[] = [['L', [99, 192]], ['L', [84, 128]], ['L', [76, 112]], ['L', [83, 98]], ['L', [80, 80]]]
      out.push(`<path d="${c.path([87, 68], lapel)}" ${shapeAttrs} fill-opacity=".9"/><path d="${c.mirror([87, 68], lapel)}" ${shapeAttrs} fill-opacity=".9"/>`)
      det('M87 68L99 192M113 68L101 192', 1, line)
      out.push(`<circle cx="100" cy="204" r="2" fill="${detail}"/><circle cx="100" cy="226" r="2" fill="${detail}"/>`)
      det('M70 214H86M114 214H130M112 118H124', 1.4)
      break
    }
    case 'coat': {
      const segs = closedPanel(160, 354, 4)
      add(c.path([100, 354], segs))
      add(c.mirror([100, 354], segs))
      const lapel: Seg[] = [['L', [99, 158]], ['L', [80, 124]], ['L', [72, 104]], ['L', [82, 94]], ['L', [78, 80]]]
      out.push(`<path d="${c.path([86, 68], lapel)}" ${shapeAttrs} fill-opacity=".9"/><path d="${c.mirror([86, 68], lapel)}" ${shapeAttrs} fill-opacity=".9"/>`)
      det('M86 68L99 158M114 68L101 158', 1, line)
      // belt
      out.push(`<rect x="66" y="188" width="68" height="9" rx="2" fill="${shade(base, -0.12)}" stroke="${line}" stroke-width=".8"/>`)
      out.push(`<rect x="94" y="186" width="12" height="13" rx="2" fill="none" stroke="${accent}" stroke-width="1.6"/>`)
      out.push(`<circle cx="92" cy="176" r="2" fill="${detail}"/><circle cx="108" cy="176" r="2" fill="${detail}"/><circle cx="92" cy="214" r="2" fill="${detail}"/><circle cx="108" cy="214" r="2" fill="${detail}"/>`)
      det('M70 246H84M116 246H130', 1.4)
      break
    }
    case 'cardigan': {
      const segs = jacketPanel(98, 176, 238, 2.5)
      add(c.path([98, 238], segs))
      add(c.mirror([98, 238], segs))
      for (let y = 188; y < 236; y += 14) out.push(`<circle cx="95" cy="${y}" r="1.7" fill="${accent}"/>`)
      det('M63 228H98M102 228H137', 1.1)
      det('M37 236L55 239M163 236L145 239', 1.8)
      det('M88 69L98 176M112 69L102 176', 2.2)
      break
    }
    // --------------------------------------------------------------- bottoms
    case 'jeans':
    case 'trousers':
    case 'chinos':
    case 'cargos':
    case 'joggers': {
      const spec = {
        jeans: { knee: 74, hemOut: 77, hemIn: 97.5 },
        trousers: { knee: 72, hemOut: 73, hemIn: 98.5 },
        chinos: { knee: 73, hemOut: 75, hemIn: 98 },
        cargos: { knee: 70, hemOut: 71, hemIn: 99 },
        joggers: { knee: 73, hemOut: 79, hemIn: 97 },
      }[input.shape]
      const hem = 426
      const segs: Seg[] = [
        ['L', [70, 186]],
        ['L', [68, 196]],
        ['C', [64, 212], [63, 224], [64, 236]],
        ['L', [spec.knee, 330]],
        ['L', [spec.hemOut, hem]],
        ['L', [spec.hemIn, hem]],
        ['L', [99.4, 330]],
        ['L', [100, 252]],
      ]
      add(c.sym([100, 186], segs))
      det('M70 196H130', 1)
      if (input.shape === 'jeans') {
        det('M70 204Q82 206 86 196M130 204Q118 206 114 196', 1, accent)
        det('M100 196V238Q98 244 94 240', 1, accent)
        det('M64 238L76 424M136 238L124 424', 0.7, accent, 'stroke-dasharray="2 2" opacity=".7"')
      } else if (input.shape === 'cargos') {
        det('M100 196V240', 1)
        out.push(`<rect x="63" y="270" width="16" height="22" rx="2" fill="none" stroke="${detail}" stroke-width="1.2"/><rect x="121" y="270" width="16" height="22" rx="2" fill="none" stroke="${detail}" stroke-width="1.2"/>`)
        det('M63 276H79M121 276H137', 1)
      } else if (input.shape === 'joggers') {
        det('M100 196V236', 0.8)
        solid('M79 414H97V426H79ZM103 414H121V426H103Z', shade(base, -0.15))
        det('M94 196V212M106 196V212', 1, accent)
      } else {
        det('M100 196V240', 1)
        det('M72 204L80 196M128 204L120 196', 1)
        det('M86 240L88 420M114 240L112 420', 0.7, detail, 'opacity=".6"')
      }
      break
    }
    case 'shorts': {
      const segs: Seg[] = [
        ['L', [70, 186]], ['L', [68, 196]], ['C', [64, 212], [63, 224], [64, 236]],
        ['L', [65, 300]], ['L', [98.5, 300]], ['L', [100, 252]],
      ]
      add(c.sym([100, 186], segs))
      det('M70 196H130M100 196V238', 1)
      det('M66 292H98M134 292H102', 0.8, detail, 'stroke-dasharray="2 2"')
      break
    }
    case 'skirt': {
      const segs: Seg[] = [
        ['L', [70, 186]], ['L', [68, 196]], ['C', [62, 240], [56, 300], [52, 348]], ['Q', [76, 354], [100, 352]],
      ]
      add(c.sym([100, 186], segs))
      det('M70 196H130', 1)
      for (const x of [78, 89, 100, 111, 122]) det(`M${x} 197L${100 + (x - 100) * 1.8} 350`, 0.8)
      break
    }
    // --------------------------------------------------------------- dresses
    case 'midi-dress': {
      const segs: Seg[] = [
        ['Q', [89, 86], [86, 70]], ['L', [78, 72]], ['Q', [68, 94], [67, 114]],
        ['C', [68, 150], [72, 172], [72, 192]], ['C', [66, 240], [58, 300], [55, 352]], ['Q', [78, 358], [100, 356]],
      ]
      add(c.sym([100, 86], segs))
      det('M72 192Q100 198 128 192', 1)
      break
    }
    case 'wrap-dress': {
      const t = topSegs('v', 'short', 0, 0)
      // Replace the top's hem part with a flared skirt.
      const segs = t.segs.slice(0, -2) as Seg[]
      segs.push(['C', [66, 240], [58, 300], [54, 350]], ['Q', [78, 356], [100, 354]])
      add(c.sym([100, 120], [['L', [87, 69]], ...segs.slice(1)]))
      det('M87 69L118 192M113 69L100 120', 1)
      det('M118 192L96 352', 1, detail, 'opacity=".6"')
      // sash
      out.push(`<path d="M70 188Q100 196 130 188L130 197Q100 205 70 197Z" fill="${accent}"/>`)
      det('M128 196L136 222M128 196L126 226', 3, accent)
      break
    }
    case 'slip-dress': {
      const segs: Seg[] = [
        ['Q', [88, 98], [80, 88]], ['L', [68, 106]], ['C', [68, 150], [72, 172], [72, 192]],
        ['C', [70, 260], [66, 340], [63, 412]], ['Q', [80, 416], [100, 415]],
      ]
      add(c.sym([100, 100], segs))
      det('M80 88L85 71M120 88L115 71', 1.4, line)
      det('M80 90Q100 104 120 90', 0.8, detail, 'opacity=".6"')
      break
    }
  }
  return { defs: '', body: out.join('') }
}

/** Open-front jacket panel (left). Starts at [frontX, hemY]. */
function jacketPanel(frontX: number, vBottomY: number, hemY: number, e: number): Seg[] {
  const t = topSegs('crew', 'long', hemY, e)
  // skip neckline, keep shoulder..side
  const body = t.segs.slice(1, -1) as Seg[]
  return [
    ['L', [frontX, vBottomY]],
    ['L', [88, 68]],
    ...body,
    ['L', [hemY > 260 ? 60 - e : 64 - e, hemY]],
  ]
}

/** Closed-below-V panel (blazer/coat, left). Starts at [100, hemY]. */
function closedPanel(vBottomY: number, hemY: number, e: number): Seg[] {
  const t = topSegs('crew', 'long', Math.min(hemY, 240), e)
  const body = t.segs.slice(1, -1) as Seg[]
  return [
    ['L', [100, vBottomY]],
    ['L', [87, 68]],
    ...body,
    ['L', [hemY > 260 ? 58 - e : 63 - e, hemY]],
  ]
}

// ---------------------------------------------------------------------------
// Shoes: side profile facing right, canvas 0 0 120 80, sole at y≈70.

function drawShoe(input: ArtInput, uid: string): string {
  const base = colour(input.primaryColour).hex
  const second = colour(input.secondaryColour).hex
  const fill = fillFor(uid, input.pattern, base)
  const line = strokeFor(base)
  const s = `stroke="${line}" stroke-width="1.2" stroke-linejoin="round"`
  switch (input.shape) {
    case 'sneaker':
      return `<path d="M6 70L112 70Q119 70 118 63L116 60L8 60Q3 62 6 70Z" fill="${second}" stroke="${strokeFor(second)}" stroke-width="1"/>
<path d="M9 60C7 44 13 34 26 34L42 37C54 40 62 46 76 48C96 51 112 52 116 60Z" fill="${fill}" ${s}/>
<path d="M9 60C7 44 13 34 26 34L42 37C54 40 62 46 76 48C96 51 112 52 116 60Z" fill="url(#sh-${uid})"/>
<path d="M44 40L50 50M52 42L57 51M60 45L64 53" stroke="${line}" stroke-width="1.6" stroke-linecap="round"/>
<path d="M22 56C34 50 48 52 62 56" fill="none" stroke="${second}" stroke-width="3" stroke-linecap="round" opacity=".8"/>
<path d="M11 42L20 38" stroke="${line}" stroke-width="1"/>`
    case 'runner':
      return `<path d="M4 71L110 71Q119 70 118 62L114 58L10 58Q2 60 4 71Z" fill="${second}"/>
<path d="M4 66L118 64" stroke="${strokeFor(second)}" stroke-width="1"/>
<path d="M10 58C8 40 16 30 28 31L40 35C52 38 60 44 74 46C96 49 110 50 114 58Z" fill="${fill}" ${s}/>
<path d="M10 58C8 40 16 30 28 31L40 35C52 38 60 44 74 46C96 49 110 50 114 58Z" fill="url(#sh-${uid})"/>
<path d="M30 54L58 40M40 56L70 44" stroke="${second}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M46 38L50 46M54 41L58 48M62 43L66 50" stroke="${line}" stroke-width="1.4" stroke-linecap="round"/>`
    case 'boot':
      return `<path d="M14 64L14 12Q14 8 20 8L50 8Q54 8 54 12L56 40C70 44 100 48 112 56Q118 62 116 66L14 66Z" fill="${fill}" ${s}/>
<path d="M14 64L14 12Q14 8 20 8L50 8Q54 8 54 12L56 40C70 44 100 48 112 56Q118 62 116 66L14 66Z" fill="url(#sh-${uid})"/>
<path d="M36 10C40 22 42 34 48 42" fill="none" stroke="${line}" stroke-width="1"/>
<path d="M38 12Q44 26 50 38L54 12Z" fill="${shade(base, -0.25)}"/>
<path d="M12 66H118V72H40L38 76H14Q11 76 12 72Z" fill="${second}"/>
<path d="M50 8V16" stroke="${line}" stroke-width="3" stroke-linecap="round"/>`
    case 'oxford':
      return `<path d="M10 62C10 48 20 42 32 42L50 44C64 46 80 48 98 52C110 55 116 58 116 64L10 64Z" fill="${fill}" ${s}/>
<path d="M10 62C10 48 20 42 32 42L50 44C64 46 80 48 98 52C110 55 116 58 116 64L10 64Z" fill="url(#sh-${uid})"/>
<path d="M8 64H118Q118 69 112 69H8Z" fill="${second}"/><path d="M10 69H30V75H12Z" fill="${second}"/>
<path d="M44 45Q54 52 64 47" fill="none" stroke="${line}" stroke-width="1.2"/>
<path d="M48 46L52 50M54 46L57 49M59 47L61 49" stroke="${line}" stroke-width="1"/>
<path d="M86 50Q92 58 98 52" fill="none" stroke="${line}" stroke-width=".9"/>`
    case 'loafer':
      return `<path d="M10 62C10 50 18 46 30 46L52 46C66 46 82 48 98 52C110 55 116 58 116 64L10 64Z" fill="${fill}" ${s}/>
<path d="M10 62C10 50 18 46 30 46L52 46C66 46 82 48 98 52C110 55 116 58 116 64L10 64Z" fill="url(#sh-${uid})"/>
<path d="M8 64H118Q118 69 112 69H8Z" fill="${second}"/><path d="M10 69H28V74H12Z" fill="${second}"/>
<path d="M56 47Q70 56 88 50" fill="none" stroke="${line}" stroke-width="1.4"/>
<rect x="62" y="48" width="14" height="4" rx="2" fill="${shade(base, -0.25)}"/>`
    case 'sandal':
      return `<path d="M8 66H116Q118 70 112 72H10Q6 70 8 66Z" fill="${second}"/>
<path d="M8 66C30 62 80 62 116 64" fill="none" stroke="${strokeFor(second)}" stroke-width="1"/>
<path d="M22 64C24 50 34 46 42 48L46 64" fill="none" stroke="${base}" stroke-width="5" stroke-linecap="round"/>
<path d="M62 64C66 54 78 52 90 58L94 64" fill="none" stroke="${base}" stroke-width="6" stroke-linecap="round"/>
<path d="M14 62C12 54 16 50 22 50" fill="none" stroke="${base}" stroke-width="3" stroke-linecap="round"/>`
    case 'heel':
    default:
      return `<path d="M12 48C14 38 24 36 32 40L50 50C66 52 88 52 104 56C114 58 118 62 116 66L60 66C44 60 30 56 22 58L18 70H10Z" fill="${fill}" ${s}/>
<path d="M12 48C14 38 24 36 32 40L50 50C66 52 88 52 104 56C114 58 118 62 116 66L60 66C44 60 30 56 22 58L18 70H10Z" fill="url(#sh-${uid})"/>
<path d="M10 58H24L22 76H12Z" fill="${second}"/>
<path d="M60 66H116Q117 70 112 70H64Z" fill="${second}"/>`
  }
}

// ---------------------------------------------------------------------------
// Accessories: each has its own small canvas.

const ACCESSORY_VIEWBOX: Partial<Record<Shape, [number, number, number, number]>> = {
  cap: [0, 0, 100, 64],
  scarf: [0, 0, 80, 130],
  tote: [0, 0, 90, 110],
  belt: [0, 0, 120, 16],
  watch: [0, 0, 30, 54],
}
const SHOE_VIEWBOX: [number, number, number, number] = [0, 0, 120, 80]

function drawAccessory(input: ArtInput, uid: string): string {
  const base = colour(input.primaryColour).hex
  const second = colour(input.secondaryColour).hex
  const fill = fillFor(uid, input.pattern, base)
  const line = strokeFor(base)
  const s = `stroke="${line}" stroke-width="1.2" stroke-linejoin="round"`
  switch (input.shape) {
    case 'cap':
      return `<path d="M14 44C14 16 32 4 50 4C68 4 86 16 86 44Z" fill="${fill}" ${s}/>
<path d="M14 44C14 16 32 4 50 4C68 4 86 16 86 44Z" fill="url(#sh-${uid})"/>
<path d="M50 4V44M32 9Q38 26 36 44M68 9Q62 26 64 44" fill="none" stroke="${line}" stroke-width=".9"/>
<path d="M8 44Q50 36 92 44Q95 54 84 57Q50 50 16 57Q5 54 8 44Z" fill="${shade(base, -0.1)}" ${s}/>
<circle cx="50" cy="5" r="3" fill="${second}"/>
<rect x="40" y="22" width="20" height="10" rx="2" fill="${second}" opacity=".85"/>`
    case 'scarf':
      return `<path d="M6 18Q40 40 74 18L74 34Q40 56 6 34Z" fill="${fill}" ${s}/>
<path d="M44 38L58 38L64 118L44 120Z" fill="${fill}" ${s}/>
<path d="M30 40L44 42L42 104L26 102Z" fill="${fill}" ${s}/>
<path d="M44 38L58 38L64 118L44 120Z" fill="url(#sh-${uid})"/>
<path d="M46 120V128M50 120V128M54 119V127M58 119V127M62 118V126M28 102V110M32 103V111M36 103V111M40 104V112" stroke="${line}" stroke-width="1.2" stroke-linecap="round"/>`
    case 'tote':
      return `<path d="M28 36C28 6 62 6 62 36" fill="none" stroke="${second}" stroke-width="4" stroke-linecap="round"/>
<path d="M12 34H78L86 106H4Z" fill="${fill}" ${s}/>
<path d="M12 34H78L86 106H4Z" fill="url(#sh-${uid})"/>
<path d="M12 44H78" stroke="${line}" stroke-width="1" stroke-dasharray="2 2"/>
<circle cx="28" cy="38" r="2.2" fill="${second}"/><circle cx="62" cy="38" r="2.2" fill="${second}"/>`
    case 'belt':
      return `<rect x="2" y="3" width="116" height="10" rx="2" fill="${fill}" ${s}/>
<rect x="46" y="1" width="16" height="14" rx="2.5" fill="none" stroke="${colour(input.secondaryColour).hex}" stroke-width="2.4"/>
<path d="M54 8H66" stroke="${second}" stroke-width="2"/>
<circle cx="80" cy="8" r="1.2" fill="${line}"/><circle cx="90" cy="8" r="1.2" fill="${line}"/><circle cx="100" cy="8" r="1.2" fill="${line}"/>`
    case 'watch':
    default:
      return `<rect x="9" y="2" width="12" height="50" rx="4" fill="${fill}" ${s}/>
<circle cx="15" cy="27" r="11" fill="${second}" stroke="${line}" stroke-width="1.6"/>
<circle cx="15" cy="27" r="8" fill="#FAFAF7" stroke="${shade(second, -0.3)}" stroke-width=".8"/>
<path d="M15 27V21M15 27L19 29" stroke="#333" stroke-width="1.1" stroke-linecap="round"/>`
  }
}

// ---------------------------------------------------------------------------

export interface RenderedArt {
  svg: string
  viewBox: [number, number, number, number]
}

function uidFor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return 'a' + (h >>> 0).toString(36)
}

export function renderItemArt(input: ArtInput): RenderedArt {
  const uid = uidFor(input.id)
  const base = colour(input.primaryColour).hex
  const second = colour(input.secondaryColour).hex
  const pat = patternDefs(uid, input.pattern, base, second)
  const shadeGrad = `<linearGradient id="sh-${uid}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".10"/><stop offset=".45" stop-color="#fff" stop-opacity=".07"/><stop offset=".55" stop-color="#fff" stop-opacity=".07"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>`
  let vb: [number, number, number, number]
  let body: string
  if (isBodyShape(input.shape)) {
    const c = new Canvas()
    body = drawBody(c, input, uid).body
    const pad = 4
    vb = [c.minX - pad, c.minY - pad, c.maxX - c.minX + pad * 2, c.maxY - c.minY + pad * 2].map(r) as typeof vb
  } else if (ACCESSORY_VIEWBOX[input.shape]) {
    body = drawAccessory(input, uid)
    vb = ACCESSORY_VIEWBOX[input.shape]!
  } else {
    body = drawShoe(input, uid)
    vb = SHOE_VIEWBOX
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}"><defs>${pat}${shadeGrad}</defs>${body.replace(/\n/g, '')}</svg>`
  return { svg, viewBox: vb }
}

const parseCache = new Map<string, { viewBox: [number, number, number, number]; inner: string }>()

/** Split stored SVG markup into its viewBox and inner markup (for inline rendering on the mannequin). */
export function parseSvg(svg: string) {
  let hit = parseCache.get(svg)
  if (!hit) {
    const vbMatch = svg.match(/viewBox="([^"]+)"/)
    const viewBox = (vbMatch ? vbMatch[1].split(/\s+/).map(Number) : [0, 0, 100, 100]) as [number, number, number, number]
    const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
    hit = { viewBox, inner }
    parseCache.set(svg, hit)
  }
  return hit
}

const urlCache = new Map<string, string>()
export function svgDataUrl(svg: string): string {
  let u = urlCache.get(svg)
  if (!u) {
    u = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    urlCache.set(svg, u)
  }
  return u
}
