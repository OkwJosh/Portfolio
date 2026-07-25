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
├── data/site.js             all repeating content (projects, stack, socials, nav)
├── styles/main.css          Tailwind v4 @theme tokens + the whole design system
├── lib/
│   ├── dom.js               $, $$, clamp, damp, html`` template tag
│   └── pointer.js           one shared, damped pointer model
├── three/
│   ├── stage.js             renderer, camera, resize, THE render loop
│   ├── background.js        composes the scene, exposes a DOM-friendly API
│   ├── glsl/noise.glsl.js   simplex noise as a template string
│   └── objects/
│       ├── knot.js          shader-displaced wireframe TorusKnot (3 passes)
│       └── field.js         parallax point field
└── ui/
    ├── preloader.js         000→100 counter + two-layer curtain wipe
    ├── hero.js              splitText + staggered character reveal
    ├── work.js              project list hover choreography
    ├── cursor.js            custom dot + trailing ring
    ├── chrome.js            nav, marquee, socials, HUD, scroll progress
    ├── reveal.js            scroll-triggered reveals + stat counters
    └── demo.js              project video overlay
```

### Two rules worth keeping

**1. One render loop.** `Stage` owns the only `requestAnimationFrame` in the
app. The cursor, HUD and thumbnail trail all register via `background.onTick()`
instead of starting loops of their own, so everything shares one frame budget
and stays in sync. Frame order is: pointer → DOM ticks → scene entities → render.

**2. One accent variable.** `--accent` on `:root` is the single source of truth
for the active colour. `background.setAccent(hex)` tweens the Three.js uniforms
*and* writes the CSS variable, so hovering a project retints the mesh, the
particle field, the giant outlined title, the scrollbar and the text selection
together.

---

## The WebGL layer

`objects/knot.js` renders a `TorusKnotGeometry` three times from one shared
uniform set:

| Pass   | Material                        | Purpose                                     |
| ------ | ------------------------------- | ------------------------------------------- |
| `core` | solid, near-black, `uMode = 2`  | occludes back faces so the knot reads solid |
| `wire` | wireframe, `uMode = 0`          | the artwork                                 |
| `halo` | wireframe, additive, `uMode = 1`| fakes bloom — no EffectComposer needed       |

The vertex shader displaces along the normal with two octaves of simplex noise,
then shears the mesh using the damped pointer position. The fragment shader is
a fresnel mix between `uColorA` and `uColorB`.

Skipping post-processing is deliberate: an additive shell at 1.045× scale gets
90% of the bloom look for a fraction of the frame cost, and keeps the dependency
list at four packages.

**Perf notes:** DPR is capped at 2, the loop pauses on `visibilitychange`, `dt`
is clamped to 1/30s so a backgrounded tab can't slingshot the damped values, and
`prefers-reduced-motion` drops the point count and flattens the displacement.

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
  accent: '#34d399',        // drives the row wash AND the WebGL retint
  tech: ['Flutter', 'Firebase'],
  description: '…',
  image: asset('newthing.png'),   // put the file in src/assets/
  demo: 'https://player.vimeo.com/video/…',
}
```

## Editing the design system

There is no `tailwind.config.js` — Tailwind v4 reads tokens from the `@theme`
block at the top of `src/styles/main.css`. Anything declared there becomes a
utility (`--color-volt` → `text-volt`, `bg-volt`, `border-volt`).

Typography is a variable font: `.display` drives Archivo's `wdth` axis down to
76 for the condensed brutalist weight. Change `font-variation-settings` in one
place to re-proportion every headline.

---

## Accessibility

- `splitText` runs with `accessible: true`, so the split headline keeps an
  `aria-label` and is announced as a sentence, not as loose characters.
- Project rows are real `<button>`s — keyboard focus triggers the same hover
  choreography as the pointer.
- The custom cursor is disabled on coarse pointers; native cursors return.
- `prefers-reduced-motion` is honoured across CSS and JS: the grain, cursor,
  marquee and all entrance animations reduce to instant states.
