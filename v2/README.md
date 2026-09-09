# Okwoli — Portfolio v2

A brutalist / immersive WebGL portfolio. Vanilla ES modules, no framework.

**Stack:** Vite 7 · Tailwind CSS v4 · Three.js 0.180 · Anime.js 4.5

---

## Run it

```bash
cd v2
npm install
npm run dev      # http://localhost:5174
```

```bash
npm run build    # -> v2/dist
npm run preview  # serve the production build
```

> Port 5174 is used on purpose so this can run side by side with the React app
> in the repo root (which owns 5173).

### Installing from scratch

If you're lifting this into a new folder, these are the only four packages:

```bash
npm create vite@latest my-site -- --template vanilla
cd my-site
npm install three animejs
npm install -D tailwindcss @tailwindcss/vite
```

Then copy `vite.config.js`, `index.html` and `src/` across.

---

## Architecture

```
src/
├── main.js                  boot order + the single rAF loop wiring
├── data/site.js             all repeating content (projects, skills, socials, nav)
├── styles/main.css          theme surfaces + Tailwind v4 @theme + design system
├── lib/
│   ├── dom.js               $, $$, clamp, damp, html`` template tag
│   └── pointer.js           one shared, damped pointer model
├── three/
│   ├── stage.js             renderer, camera, resize, THE render loop, FPS
│   ├── background.js        composes the scene, exposes a DOM-friendly API
│   ├── glsl/noise.glsl.js   simplex noise as a template string
│   └── objects/
│       ├── lattice.js       the compute volume — one instanced voxel shell
│       └── field.js         parallax point field
└── ui/
    ├── theme.js             light/dark toggle + persistence
    ├── preloader.js         000→100 counter + two-layer curtain wipe
    ├── hero.js              splitText + staggered character reveal
    ├── work.js              project list hover choreography
    ├── cursor.js            custom dot + trailing ring
    ├── chrome.js            nav, stack grid, marquee, socials, HUD, progress
    ├── reveal.js            scroll-triggered reveals + stat counters
    └── demo.js              project video overlay
```

### Three rules worth keeping

**1. One render loop.** `Stage` owns the only `requestAnimationFrame` in the
app. The cursor, HUD and thumbnail trail all register via `background.onTick()`
instead of starting loops of their own, so everything shares one frame budget
and stays in sync. Frame order is: pointer → DOM ticks → scene entities → render.

**2. One accent variable.** `--accent` on `:root` is the single source of truth
for the active colour. `background.setAccent(hex)` tweens the Three.js uniforms
*and* writes the CSS variable, so hovering a project retints the mesh, the
particle field, the giant outlined title, the scrollbar and the text selection
together.

**3. Theme surfaces are indirected, not duplicated.** `:root` and
`[data-theme='light']` define `--bg` / `--fg` / `--line`; the `@theme` block then
points Tailwind's colour tokens *at those variables*
(`--color-fg: var(--fg)`), so `text-fg` resolves through the live theme instead
of being baked to one hex at build time. There is exactly one place to change a
surface colour.

---

## The WebGL layer

`objects/lattice.js` renders a **compute volume** — 1,304 cubes on a regular 3D
grid, culled to a hollow spherical shell. Deliberately discipline-neutral: it
reads as systems and data rather than as any one platform.

It is a **single `InstancedMesh`**, so the whole thing is one draw call no
matter how many cells you generate.

### What drives a cell

Three signals combine in the vertex shader into one `energy` value, which sets
both the cell's size and its colour:

| Signal   | Source                                   | Effect                        |
| -------- | ---------------------------------------- | ----------------------------- |
| field    | slow simplex noise over cell position     | the volume breathes           |
| scan     | a plane sweeping bottom → top             | lights each layer in turn — this is what reads as *processing* rather than *blob* |
| pointer  | cursor unprojected onto the z = 0 plane   | a bright bulge under the cursor |

Idle cells shrink *and* fade, which is what keeps the volume see-through
instead of an opaque ball parked over the headline. `depthWrite` is off so the
far side of the shell shows through — the x-ray look is the point.

### Constraints that aren't style knobs

- **`innerRatio` (0.62)** — hollows the shell. A solid ball is just a lump, and
  it occludes the type behind it.
- **`radius` (1.9)** — the group rotates, so a cell at radius *r* swings within
  `cameraZ - r` of the lens. Past ~2.2 it projects large enough to slide out of
  frame as it comes forward.
- **Cell size vs. grid spacing** — at full energy a cell grows ~1.6×. That has
  to stay under the grid spacing or neighbouring cells merge into a solid mass
  at the wavefront.

### Theming the scene

`background.setTheme('light' | 'dark')` does what CSS cannot reach:

- **Inverts the highlight colour.** The scan/cursor highlight is the brightest
  thing on screen — near-white on dark, near-ink on light — so it always reads
  as a highlight rather than disappearing into the page.
- **Raises the alpha floor on light.** Idle cells need more presence against
  white than against near-black.
- **Flips the point field's blend mode.** Additive blending *adds light*, so on
  a near-white page the field vanishes; on light it switches to normal blending
  and darkens instead.

The lattice uses normal blending throughout, which is crisper (right for the
brutalist type) and immune to the additive-on-white problem.

**Perf notes:** one draw call for 1,304 cells. DPR is capped at 2, the loop
pauses on `visibilitychange`, `dt` is clamped to 1/30s so a backgrounded tab
can't slingshot the damped values, and `prefers-reduced-motion` drops the point
count and slows the scan to a crawl.

### Swapping the object out

`Stage` takes any entity with `{ object3D, update(ctx), resize?, dispose? }`, so
replacing the centrepiece means writing one file and changing one line in
`background.js`. Keep `setAccent` / `setTheme` / `pulse` on it and the rest of
the site keeps working untouched.

---

## Adding a project

Append to `projects` in `src/data/site.js` — the row, hover title, thumbnail,
accent retint and demo overlay all derive from it:

```js
{
  id: 'newthing',
  title: 'NewThing',
  category: 'Category',
  year: '2026',
  platform: 'iOS · Android',
  accent: '#34d399',        // drives the row wash AND the WebGL retint
  tech: ['Flutter', 'Firebase'],
  description: '…',         // shown on the row — this is what tells a visitor
                            // what the thing actually is, so don't skip it
  highlights: ['…'],        // implementation notes, shown in the demo panel
  image: asset('newthing.png'),   // put the file in src/assets/
  demo: 'https://player.vimeo.com/video/…',
}
```

Skills live in the same file under `skillGroups`. The grid is `auto-fit`, so
adding a fifth group reflows rather than stranding a card on its own row.

`logo` is **optional** — Google Cloud and CI/CD currently render a small accent
marker instead, because no mark for them is bundled. To give one a real logo,
drop the file in `src/assets/logos/` and add `logo: logo('gcp.png')`. Set
`invertOnDark: true` for monochrome marks (GitHub) that would otherwise vanish
on one theme.

Vite globs the whole `logos/` folder into the bundle, so delete any file you
don't reference — it ships either way.

The "Technologies" stat on the About section is rewritten from `stack.length`
at runtime, so it can't drift out of step with what's actually listed.

## Editing the design system

There is no `tailwind.config.js` — Tailwind v4 reads tokens from the `@theme`
block near the top of `src/styles/main.css`. Anything declared there becomes a
utility (`--color-volt` → `text-volt`, `bg-volt`, `border-volt`).

To change a surface colour, edit `:root` (dark) or `[data-theme='light']`,
**not** `@theme` — the theme block only points Tailwind at those variables.
There's a duplicate of the light values inside a `prefers-color-scheme` block as
a no-JS fallback; keep the two in sync.

Typography is a variable font: `.display` drives Archivo's `wdth` axis down to
76 for the condensed brutalist weight. Change `font-variation-settings` in one
place to re-proportion every headline.

---

## Light / dark

Resolution order: saved choice → OS preference → dark. The `<head>` carries a
small **synchronous** inline script that stamps `data-theme` on `<html>` before
first paint; any async path there produces a visible flash of the wrong theme.

The toggle is labelled with the theme it switches *to* ("LIGHT" while you're in
dark), because a bare sun/moon icon is genuinely ambiguous about which state it
represents. Once you click it, the choice is stored and the site stops following
the OS.

## Accessibility

- `splitText` runs with `accessible: true`, so the split headline keeps an
  `aria-label` and is announced as a sentence, not as loose characters.
- Project rows are real `<button>`s — keyboard focus triggers the same hover
  choreography as the pointer.
- The custom cursor is disabled on coarse pointers; native cursors return. It is
  always white with `mix-blend-mode: difference`, which is self-inverting, so one
  cursor stays visible on both themes and over the canvas.
- `prefers-reduced-motion` is honoured across CSS and JS: the grain, cursor,
  marquee and all entrance animations reduce to instant states.
