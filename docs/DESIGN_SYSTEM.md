# Quiet Paper — A Design System & Philosophy

A portable guide to the look, feel, and native-app craft behind this project. It is
written to be reused across projects: copy this file in, follow the principles, and
paste the tokens and snippets. Nothing here is tied to a particular app's domain.

The aesthetic in one line: **a calm sheet of warm paper that feels like a native iOS
app, gets out of the way, and is quietly capable.**

---

## 1. Philosophy

Seven principles, in priority order:

1. **Calm over loud.** Soft, warm neutrals; one confident accent; lots of breathing
   room. Nothing competes for attention until it needs to.
2. **Paper, not glass.** The surface feels like cream paper, not a glowing screen.
   Warm off-whites, gentle shadows, soft rounded corners.
3. **Content first.** Chrome is minimal. The screen is mostly the user's content, with
   navigation tucked to an edge.
4. **Native, not "web app".** On iPhone and iPad it should be indistinguishable from a
   built-for-the-platform app: flush edges, safe-area aware, real momentum scrolling,
   sheets that rise over the keyboard, no browser chrome.
5. **Motion with physics, used sparingly.** Springs, not linear fades. Motion confirms
   actions and guides the eye; it never blocks or shows off.
6. **Instant and trustworthy.** The UI responds immediately (optimistic, local-first
   where possible) and tells the truth about state quietly (a small sync dot, not a
   spinner over everything).
7. **Warm, plain voice.** Copy sounds like a kind, literate friend. Short, encouraging,
   never robotic.

---

## 2. Voice and copy

- Warm, understated, human. "You're on track" beats "Status: OK".
- Prefer plain words and short sentences.
- **No em dashes or en dashes, ever.** They are a dead giveaway of generated text. Use
  commas, periods, colons, or parentheses instead. This rule is part of the aesthetic.
- Encourage, don't scold. Empty states invite ("Add your first item"), warnings are
  gentle but honest ("This can't be undone").
- Avoid jargon and exclamation marks. Let the calm tone carry the warmth.

---

## 3. Colour

Low saturation, earthy, legible on warm paper. The palette is built from a neutral
"parchment" surface scale, an "ink" text scale, one primary (sage green), two semantic
tones (rose, amber), and a spread of muted accent hues for user-colourable items.

```js
// tailwind theme.extend.colors
parchment: { 50:'#FDFCF9', 100:'#FAF9F6', 200:'#F0EDE6', 300:'#E0DCD2' }, // surfaces
ink:       { 900:'#1A1A18', 700:'#3D3D38', 500:'#6B6960', 300:'#9B9890', 100:'#D4D2CB' }, // text
sage:      { 700:'#2D4A2E', 600:'#3D5A3E', 500:'#4F7942', 400:'#6E9B61', 100:'#E8F0E6', 50:'#F3F7F2' }, // primary
rose:      { 600:'#A14A5E', 500:'#B85C72', 100:'#F3E2E6' }, // danger / at-risk
amber:     { 600:'#B8782A', 500:'#C98F3E', 100:'#F5E9D6' }, // caution / close
```

Muted multi-hue accent set (for colour-coding user items), spaced around the wheel so
every swatch is distinct yet soft on parchment:

```
Sage #4F7942  Emerald #2F8062  Teal #2E8A8A  Ocean #357F9B
Blue #3C5F9A  Indigo #4A4E94  Violet #6A4AA0 Plum #8A3F7A
Rose #A8436A  Crimson #B23B43 Terracotta #AF573C Amber #BE7A2E
Marigold #C29A24 Olive #83863A Graphite #4A4A4A Storm #64707E
```

Rules of thumb:

- **Background** is `parchment-100`; raised cards are `parchment-50` with a soft shadow;
  inset fields/chips are `parchment-200`.
- **Text** uses the ink scale (900 for headings, 700 body, 500 secondary, 300 hints).
- **One primary** (sage). Use it for the main action, the active nav item, and "good"
  status. Don't introduce a second brand colour.
- **Semantic tones** map to a status, not decoration: rose = below target / danger,
  amber = close / caution, sage = on track / done.
- Status colour as a function of a threshold: below = rose, within ~5% = amber, else
  sage.

---

## 4. Typography

Two families, clear roles:

- **Display serif** for headings, numbers, and moments of personality. Here: *DM Serif
  Display*. Use it for page titles, big stats, and empty-state headlines.
- **Humanist sans** for everything else (labels, body, buttons, nav). Here: *Plus
  Jakarta Sans*, weights 400/500/600.

Roles: serif `text-2xl`+ for titles and key figures; sans `text-sm`/`text-xs` for UI;
uppercase tracked micro-labels (`text-[10px]`) for section eyebrows. Truncate or wrap
deliberately so long strings never break the layout.

---

## 5. Shape, depth, and surfaces

- **Generous, consistent radii.** Cards `12px`, sheets/large surfaces `16px`, floating
  action button `24px`. Pills are fully rounded.
- **Soft shadows, not hard ones.** A faint `shadow-sm` to lift a card off the paper; a
  larger soft shadow for sheets and the FAB. Avoid harsh dark drop shadows.
- **Rings over borders.** For inputs and selected states, use an inset ring
  (`ring-1 ring-inset`) that thickens and turns sage on focus, rather than a 1px border.
- **Selected swatch halo:** `box-shadow: 0 0 0 2px <bg>, 0 0 0 4px <swatch>` gives a
  clean ring with a parchment gap.

---

## 6. Motion

Springs, not easing curves. Subtle, physical, quick.

```ts
export const spring = { type: 'spring', stiffness: 400, damping: 30 };       // taps, sheets
export const softSpring = { type: 'spring', stiffness: 120, damping: 20 };   // rings, large moves
export const listContainer = { animate: { transition: { staggerChildren: 0.05 } } };
export const listItem = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: spring } };
```

Patterns:

- **Tap feedback:** `whileTap={{ scale: 0.97 }}` on buttons, `0.9` on icon chips.
- **Lists stagger in** with `listContainer` + `listItem`.
- **Sheets and modals** spring up / scale in via `AnimatePresence`.
- **Numbers animate** to their value (e.g. a progress ring's dash offset driven by a
  `useSpring` motion value).
- Keep durations short (0.2 to 0.4s). Motion should feel like a reflex, never a wait.

---

## 7. Layout and responsiveness

One layout that adapts by space, not by device:

- **Phone portrait:** a fixed **bottom tab bar**, content scrolls above it.
- **iPad and landscape (`md+`):** a **sidebar rail** on the left, the bottom bar hides.
- Define nav items **once** in a shared array and feed both the rail and the bottom bar,
  so they never drift apart. Give the primary action an accent treatment in both.
- Content sits in a centered column with a sensible max width (`max-w-md` on phones,
  wider at `md+`), generous horizontal padding, and bottom padding that clears the FAB
  and nav.

---

## 8. The native-feel layer (the important part)

This is what makes it read as a real iOS/iPad app rather than a website. Most of it is
a handful of CSS and structural choices.

### 8a. Size the shell to the real visible viewport

iOS PWAs report `100dvh` as roughly the screen height minus the top safe-area inset, and
no single CSS unit lands on the true visible bottom. This formula does, and it shrinks
correctly when the keyboard opens:

```css
html {
  height: min(calc(100dvh + env(safe-area-inset-top)), 100lvh);
}
body { height: 100%; overflow: hidden; overscroll-behavior: none; } /* lock the page */
#root { height: 100%; overflow: hidden; }
```

The app shell is a flex column/row at this height; **only an inner region scrolls.** The
top safe-area inset lives on the content wrapper, outside the scroller, so content never
slides under the status bar, and the bottom nav (a normal flex child, not
`position: fixed`) stays flush to the true bottom in any orientation.

### 8b. Safe areas as first-class tokens

```css
:root {
  --safe-top: env(safe-area-inset-top);
  --safe-bottom: env(safe-area-inset-bottom);
  --safe-left: env(safe-area-inset-left);
  --safe-right: env(safe-area-inset-right);
}
/* utilities: pt-safe / pb-safe / pl-safe / pr-safe map to the vars above */
```

Set the viewport meta to `viewport-fit=cover` so the insets are non-zero, and add the
inset to anything that touches an edge (headers, nav, FAB, sheets).

### 8c. Momentum scrolling, no rubber-banding of the page

```css
.scroll-ios { -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain; }
```

The locked body prevents the whole page from bouncing under the status bar; inner
scrollers get the iOS momentum feel.

### 8d. Bottom sheets that behave

- Render via a **portal to `document.body`** so they escape any stacking context and sit
  above a fixed nav.
- Pin to the bottom, cap height (`max-h-[90%]`), and **lift above the keyboard** with a
  measured `--keyboard-height` margin (read `window.visualViewport` and set the var).
- Make **only the grip handle draggable** (drag controls with the listener off on the
  panel) so the body scrolls freely while a drag on the handle dismisses the sheet.
- Use sheets for forms (add/edit), and centered **modals** (also portaled) for short
  confirmations.

### 8e. Floating action button

Pin the primary "create" action above the bottom nav with safe-area math, and move it to
the corner at `md+`:

```
fixed bottom-[calc(5rem+var(--safe-bottom))] right-5  md:bottom-8 md:right-8
```

### 8f. Installable and current

- PWA manifest: `display: standalone`, `orientation: 'any'`, themed to the parchment
  background, maskable icons.
- Auto-update: register the service worker with auto-update, re-check on focus /
  visibility / interval (iOS only checks on cold launch), and on `controllerchange`
  show a brief full-screen "Updating" overlay then reload, so a live update feels
  intentional.

---

## 9. Interaction and state patterns

- **Optimistic and local-first where possible.** Reflect the user's action instantly;
  reconcile with the server in the background. The app should feel like it has no
  latency.
- **Quiet status, not blocking spinners.** A small dot communicates offline / pending /
  synced; tap it for a label. Reserve full-screen loaders for first auth only.
- **Skeletons** for first loads, matching the real card shape.
- **Confirm destructive actions** inline, and state the consequence honestly (how much
  data is lost), then let the user proceed.
- **Ask when an edit has two honest readings.** Some edits mean two different things
  and only the person making them knows which: correcting what was always true, or
  recording something that changed today. Guessing is silently wrong half the time.
  Ask once, at the moment of saving, with both readings written out plainly and the
  safer one to hand, rather than adding a mode to be set beforehand.
- **Never rewrite the past on the user's behalf.** A setting that describes a stretch
  of time (a schedule, a rate, a target) should be recorded with the date it took
  effect, so history keeps saying what actually happened. Show that history back to
  them: a record they can read is what makes the change safe to make.
- **Empty states** are an invitation with a single clear action, in the display serif.

---

## 10. Versioning and "What's new"

- Keep the version in one place (a changelog array; the newest entry's version is the
  app version) and surface a friendly in-app "What's new" list.
- Flag feature releases as "major" so users can tell them from fixes. Expand only the
  latest by default; condense long note lists behind "Show more".
- Write the notes in the warm, no-em-dash voice.

---

## 11. Copy-paste starting points

**Tailwind `theme.extend`** (colours above) plus:

```js
borderRadius: { card: '12px', sheet: '16px', fab: '24px' },
keyframes: { 'pulse-dot': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } },
```

**Fonts:** load DM Serif Display + Plus Jakarta Sans; set sans as the base font and use
a `font-serif` utility for display.

**The native-feel CSS** from sections 8a to 8c, verbatim.

**Motion tokens** from section 6, verbatim.

**Structure:** a single app shell (sidebar at `md+`, bottom bar on phone) with one inner
scroller; portaled bottom sheet + modal primitives; a FAB; a sync dot.

---

## 12. New-project checklist

To make a fresh app feel like this:

- [ ] Parchment background, ink text, one sage primary, rose/amber for status only.
- [ ] DM Serif Display for titles/numbers, Plus Jakarta Sans for UI.
- [ ] Radii 12/16/24, soft shadows, inset rings on inputs.
- [ ] Spring motion tokens; tap-scale on every button; staggered lists.
- [ ] App shell sized with the `min(100dvh + safe-top, 100lvh)` formula; inner scroller
      only; safe-area variables and `pt/pb-safe` utilities.
- [ ] Sidebar rail at `md+`, bottom tab bar on phone, from one shared nav array.
- [ ] Bottom sheets (portaled, keyboard-lifting, handle-drag) for forms; modals for
      confirmations; a FAB for the primary create action.
- [ ] PWA manifest (standalone, orientation any) + auto-update with an "Updating"
      overlay.
- [ ] Optimistic UI, a quiet sync dot, skeletons, inviting empty states.
- [ ] Warm, plain copy. No em dashes.
```
