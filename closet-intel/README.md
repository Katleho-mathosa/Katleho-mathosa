# Closet Intel — clickable mockup

A personal digital-wardrobe app, built as a working mockup: a phone-sized React app with
40 sample items, a drag-and-drop mannequin Studio, and **simulated** AI. There's no backend,
no login and no paid API. Everything runs in your browser.

## Run it

Requires **Node 20.19+** (or 22.12+).

```bash
cd closet-intel
npm install
npm run dev
```

Open the printed `Local:` URL. On a desktop browser the app is drawn inside a 390×844 phone frame.

**On your phone:** keep `npm run dev` running, connect the phone to the same Wi-Fi, and open the
`Network:` URL that Vite prints (e.g. `http://192.168.1.20:5173`). Add it to your home screen for
a full-screen feel.

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | TypeScript only |

## Quick tour

| Screen | Try this |
| --- | --- |
| **Today** | Switch the fake weather (6°→26° swing, rainy, 31° hot, mild) and the occasion, then press **Suggest 3 outfits**. The suggestions update live when you change either. **Show 3 different** gives the next-best set. Tap a card to open it in Studio. The ⚙ button holds light/dark mode and **Reset to sample closet**. |
| **Closet** | Category chips, search, and filters (colour, season, formality, *not worn in 30+ days*). Tap an item to edit any tag, favourite, delete, or **Style this item**. That opens Studio with the item locked and a simulated outfit built around it. |
| **＋ (Add)** | *Take photo / Choose photo* or *use a sample*. You get about 2 s of simulated processing, then a review screen where every tag is editable and **low-confidence tags are highlighted**. **Batch** mode queues several items and lets you review them one by one. You can also accept all the remaining guesses in one tap. |
| **Studio** | **Drag** an item *up* from the drawer onto the mannequin (touch or mouse), or just **tap** it. Tap a garment on the mannequin, or its chip in the slot rail, for **Remove / Swap / Lock / Shuffle slot**. **Long-press** a slot to shuffle just that slot. **Shuffle** refills every unlocked slot. **Undo/Redo** keeps 20 steps (Ctrl/Cmd+Z works on desktop). **Pick list** is the checklist of the physical items to pull from your closet. |
| **Outfits** | Saved outfits filtered by occasion, 👍/👎 on each one (feeds the taste learning), and a weekly strip showing what you wore and what you've planned. Tap a day to plan an outfit. |

### Studio rules

- Fixed slots: Head/neck, Outer layer, Top, Full-body (dress), Bottom, Shoes, Bag/accessory.
- Drawing order, back to front: shoes, bottom, top, outer layer, accessories. **Tucked in** draws the
  top under the bottom's waistband.
- Dropping onto an occupied slot replaces the item. A dress clears Top and Bottom, and a top or
  bottom clears the dress. Locked slots are never overwritten.
- Anything the mock AI picked is marked with a ✨ **Simulated** badge.

## Where the "AI" lives, and how to plug in the real thing

All AI behaviour is in **one file: [`src/ai/mockAi.ts`](src/ai/mockAi.ts)**. The UI imports only these
functions and the types in `src/types.ts`:

| Function | Mock behaviour today | Real replacement |
| --- | --- | --- |
| `tagItem(image) → TagResult` | Measures the dominant colours from the pixels for real. Category comes from the sample's hint, or from the photo's aspect ratio. Returns a High/Medium/Low confidence per field. | Vision model: send the image and ask for JSON in the `TagResult` shape. |
| `suggestOutfits(closet, weather, occasion, lockedItems, history, opts) → SuggestedOutfit[]` | Deterministic rules: neutrals go with anything, max one bold colour and one busy pattern, formality within ±1, warmth for the weather, a removable layer when the swing is >12 °C, season fit, prefers items not worn recently, boosts 👍 pairs and avoids 👎 pairs. | Keep the rules as a candidate filter, then let a model re-rank the candidates and write the reasons. |
| `suggestForSlot(...)` | Same scoring, applied to one slot. | Same model, scoped to one slot. |
| `clashCheck(outfit, weather, occasion?) → Warning[]` | Rule-based warnings (busy patterns, bold colours, formality mismatch, too warm/cold, rain, missing pieces). | An LLM critique, or keep the rules because they're cheap and predictable. |
| `explain(outfit, ctx?) → string` | Template sentence built from the rules that fired. | A one-line LLM explanation. |

Tips for the swap:

1. **Keep the signatures.** Make the functions `async` where needed (`tagItem` already is). The
   callers are `screens/AddItem.tsx`, `screens/Today.tsx` and `screens/studio/useStudioActions.ts`.
2. **Don't put API keys in the browser.** Add a tiny server or serverless function that holds the
   key and calls the model. `mockAi.ts` then just `fetch`es that endpoint.
3. **Keep the honesty flag.** Every result carries `simulated: true`, and the UI shows the badge
   because of it. Replace it with something like `source: 'model'` and change the badge text. Don't
   delete the badge.

## Data & storage

- Everything is kept in memory and persisted to `localStorage` under the key `closet-intel:v1`,
  so it survives a refresh. Every read and write is wrapped in try/catch. If storage is blocked
  or full, the app keeps working for the session and shows a one-time notice.
- Uploaded photos are downscaled to 520 px JPEGs (a few tens of KB each) to fit in storage. They're
  shown as-is in a rounded card. There's no real background removal.
- **Reset:** Today → ⚙ → *Reset to sample closet*.

## Project layout

```
src/
  ai/mockAi.ts            ← all simulated AI (the only file to change for real AI)
  art/garments.ts         original SVG garments, drawn in the mannequin's body coordinates
  art/mannequin.ts        mannequin silhouette, slot zones, drawing order
  data/                   sample closet (40 items), colours, catalogue, weather scenarios
  store/useStore.ts       app state (zustand) + localStorage persistence + undo/redo
  lib/                    studio slot rules, dates, image downscaling, long-press, storage
  components/             Mannequin, TagEditor, sheets, chips, badges
  screens/                Today, Closet, ItemDetail, AddItem, Outfits, studio/*
```

Garments are drawn in the same 200×460 coordinate space as the mannequin. Each item's thumbnail is
just that drawing cropped to its bounding box, so every garment fits its slot exactly.

## Out of scope (by design)

Real AI, real background removal, accounts, cloud sync, payments, social features, shopping
recommendations and virtual try-on.
