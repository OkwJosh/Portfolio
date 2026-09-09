# Portfolio v3 — Interactive 3D laptop hero

React Three Fiber hero with a drag-to-open laptop, spring-driven throughout and
GSAP-scrubbed scroll docking.

**Stack:** React 19 · @react-three/fiber 9 · drei 10 · @react-spring 10 · GSAP 3 · Vite 7

**This is the live site.** `firebase.json` deploys `v3/dist`; v1 (repo root)
and v2 are archived and no longer published.

```bash
# from the repo root
npm run studio   # edit content + live preview + publish  → localhost:5180
npm run dev      # just the site                          → localhost:5175
npm run build
npm run deploy   # build + firebase deploy --only hosting
```

> Ports: 5173 is the original React app, 5174 is v2, 5175 is this,
> 5179 is the Studio's preview server and 5180 is the Studio itself.

---

## Editing the content

Everything the site says lives in **`src/content/content.json`**. Nothing about
the copy, the projects, the stack or the SEO needs a code change.

```bash
npm run studio
```

That opens the Content Studio at <http://localhost:5180> — a form for every
field, with the real site running live beside it. It also starts the dev
server, so a save is reflected in the preview immediately.

| | |
| --- | --- |
| **About you** | name, role, bio, hero headline, portrait, résumé, accent |
| **Projects** | everything behind each card and its detail page; drag to reorder |
| **Stack** | skill groups and their logos |
| **Wins** / **Certifications** | the achievement and credential cards |
| **Links** | social links (the email one follows `identity.email` automatically) |
| **Search & AI** | title, description, keywords, share image, site URL |

Images and PDFs are dropped straight into the picker and land in
`src/assets/` (logos go to `src/assets/logos/`). **Publish** runs the build and
`firebase deploy` and streams the log into the panel.

Every save snapshots the previous file into `studio/.backups/` (last 20 kept),
and `content.json` is in git — so nothing is one bad click from gone.

### The same editor, hosted

The Studio also ships with the site at **`/studio`** (noindex, not linked from
anywhere), so you can edit from a phone. It is the same code — `public/studio/`
is served by the local server *and* copied into `dist/` by Vite, so the two can
never drift.

The difference is only where content goes:

| | local `npm run studio` | hosted `/studio` |
| --- | --- | --- |
| Content | writes `content.json` on disk | commits it to GitHub |
| Publish | runs `vite build` + `firebase deploy` | the push triggers the deploy workflow |
| Preview | the live dev server, updates on save | the published site |
| Auth | none needed (bound to 127.0.0.1) | a GitHub fine-grained token |

Saving in the hosted editor commits to `main`, and
`.github/workflows/deploy.yml` rebuilds and redeploys — so the static
rendering, JSON-LD, sitemap and llms.txt are all regenerated from the new
content. That is the reason edits go through git rather than a live database:
what crawlers read cannot drift from what the site says.

**One-time setup**

1. Push this repo to GitHub (the workflow has to exist on `main`).
2. In the Firebase console → Project settings → Service accounts → *Generate
   new private key*. In GitHub → repo → Settings → Secrets and variables →
   Actions → New secret named `FIREBASE_SERVICE_ACCOUNT`, pasting the whole
   JSON file.
3. Open `/studio` and follow the prompts: create a fine-grained token scoped to
   this one repo with **Contents: read and write** and **Actions: read-only**,
   and paste it in.

The token lives in that browser's `localStorage` and is sent only to
api.github.com. Anyone who can unlock that device can edit the site, so use
**Sign out** on a shared one, and set an expiry you're happy with. Revoke any
time at github.com/settings/personal-access-tokens.

If both editors are open at once, the second save is refused rather than
silently overwriting — reload to pick up the newer version first.

`src/data/site.js` is the only thing that reads the JSON: it resolves asset
filenames to hashed bundle URLs and re-exports the exact shapes the components
already consumed.

---

## Crawlability

`plugins/seo.js` generates, from that same `content.json`, at build time:

- the `<head>` — title, description, canonical, Open Graph, Twitter card
- **JSON-LD** — `Person`, `WebSite`, `ProfilePage` and an `ItemList` of the
  projects as `SoftwareApplication`s
- **a full static rendering of the page's content** inside `index.html`
- `robots.txt` (naming GPTBot, ClaudeBot, PerplexityBot, Google-Extended and
  friends explicitly), `sitemap.xml`, `llms.txt`, `favicon.svg`,
  `site.webmanifest`

The static rendering is the important one. This is a WebGL app: without it the
served HTML is an empty `<div>` and every word arrives via ~1.5MB of
JavaScript. Googlebot renders that; GPTBot, ClaudeBot, Bingbot's fast path and
every link-preview unfurler do not — to them an unprerendered SPA is a blank
page.

So the build writes the content into the document as real semantic HTML. The
inline `<head>` script sets `data-js="on"` before first paint and the CSS hides
that copy whenever scripting is live, so a browser never flashes it; `main.jsx`
then removes the node outright. Same content either way — the app is the
enhanced view of it.

To check what a crawler sees: `npm run build && npm run preview`, then load it
with JavaScript disabled.

---

## Verifying it for real

`npm i -D playwright && npx playwright install chromium` is already done. The
checks live in the scratchpad and are worth keeping:

| Check | What it proves |
| ----- | -------------- |
| `hinge-check.mjs` | the hinge is a pivot, not a translation; open/shut poses are correct |
| `overlap-check.mjs` | the laptop clears the copy at every aspect from 21:9 to 1:1 |
| `mobile-check.mjs` | vertical clearance on 5 devices, and that on-screen type stays ≥ 9px |
| `contain.mjs` | **in a real browser** — no screen channel's content overflows the panel |
| `visual.mjs` | **in a real browser** — console/page errors, plus screenshots in both themes |
| `focus.mjs` | **in a real browser** — loader smoothness, and the View → Back round trip |
| `fillcheck.mjs` | **in a real browser** — across 5 aspect ratios: the whole laptop translates and scales, its screen centre lands on the viewport centre, the screen covers both axes, the page hands over at exactly the viewport box, and Back returns the laptop to its docked pose |

The first three are pure maths and run in a second; the rest drive Chromium.

**`?boot=<ms>`** shortens or skips the intro — useful when iterating on a
section further down, and required by the browser checks: headless Chromium is
software-rendered at ~1.5fps, and react-spring's rafz clamps per-frame dt to
64ms, so the 6.5s intro genuinely takes over a minute there. On real hardware no
clamping applies.

### The absent param is not zero

The override above shipped with a bug that made the loader **never run**:

```js
Number(new URLSearchParams('').get('boot'))   // -> 0, not NaN
```

`URLSearchParams.get()` returns `null` for a missing key, and `Number(null)` is
`0`. So `Number.isFinite(0) && 0 >= 0` was true on every ordinary visit, the
intro ran with `durationMs: 0`, and the authored duration was dead code that
nobody had ever seen. The reported symptom was "the loader is too brief" —
which it was, by exactly 100%.

The string is now tested for `null` *before* coercing. That check is the only
thing separating "no override" from "override with zero", and zero is a value
we deliberately support, so the two cannot be collapsed.

**Boot pacing.** With the loader actually running, `BOOT.durationMs` is 6500.
It was 4200, which gave each of the six status lines ~0.7s — under the time it
takes to read a line and glance at the bar, so the sequence went past before it
registered as a sequence.

`BOOT.reducedMs` is the reduced-motion path and was 300ms, which is a flash
rather than a loader. Reduced motion means "don't move things about", not "skip
the content" — a bar filling in place is not the kind of motion the preference
exists to prevent — so it now runs 1200ms.

Use these. This page has shipped four bugs a build could never catch: a blank
screen from an undeclared identifier, a clipped button, a laptop cropped off
the top of frame, and a loader that stuttered. Every one showed up the moment
a browser was actually looking.

**A caveat about the maths checkers.** They mirror the rig's placement logic,
which means they can agree with it and both be wrong — that is exactly what
happened with the vertical framing. The group's origin is the laptop's BASE,
not its centre, so a pose at `y = 0` floated the model half a height too high
and cropped the lid; the checkers assumed a centred model and passed it. Now
both use `modelBounds()`, computed from the live hinge angle. If you change the
rig's placement maths, change the checkers with it — or they will keep
confirming your assumptions instead of testing them.

## Light / dark

Resolution order: saved choice → OS preference → dark. A **synchronous** inline
script in `<head>` stamps `data-theme` before first paint; any async path there
flashes the wrong theme.

Surfaces are plain custom properties overridden by `[data-theme='light']`, and
the `@theme` block points Tailwind's colour tokens at *those*, so `text-fg`
resolves through the live theme rather than being baked to a hex.

Three things the CSS can't reach, handled in the scene:

- **The casing changes finish.** A near-black shell reads as a hole punched in
  a light page, so it goes silver. Colours are assigned in an effect, not baked
  into the `useMemo`, so switching tweens the existing materials instead of
  rebuilding them mid-transition.
- **Lighting and bloom rebalance.** Light mode needs ~2.5× the ambient fill or
  the laptop reads as a silhouette, and the bloom threshold rises so a pale
  page doesn't blow out.
- **The screen keeps its own palette.** It's a display inside a device — it can
  be a dark UI on a light page. `.screen` defines `--scr-*` variables rather
  than inheriting the page's.

## View → the project page

**View** runs a four-stage sequence. The *whole laptop* — chassis, deck, lid
and screen together — is the entrance; the destination is a real fullscreen
document.

| Stage | What happens |
| ----- | ------------ |
| `approach` | the **whole laptop** travels to the centre of the frame and zooms until its screen covers the viewport — 3D, ~950ms. The screen wears the `launch` channel |
| `open` | the real page takes over that rectangle — DOM, at the same size and place |
| `closing` | the page hands the rectangle back. The screen returns to the project card *behind* it, out of sight |
| `idle` | only now does the fill reverse and the laptop return to its section pose |

### The launch screen

What the laptop wears on the way in is a loading screen, not a preview: the
app's mark, its name, and a linear bar. Nothing to read.

Putting the project's detail there — which is what it used to do — meant the
same content appeared twice, and the first time was through a ~2.6x CSS
upscale, in motion, which is the one place it looks worst.

The mark is the project's own image in a rounded tile. The artwork is square
across the set (1.00–1.22), so `cover` crops next to nothing and it reads as an
app icon rather than a cropped thumbnail. The accent gradient behind it is a
backdrop, not decoration — several marks carry transparency and sit badly on
the bare panel without it. No extra network cost either: the same file is
already on the project channel and in the work list, so by the time anyone can
press View it is in cache.

**The bar is a readout of the zoom, not an animation of its own.** It owns no
state and no spring: `LaunchProgress` reads the rig's fill clock through a ref
every frame and writes `scaleX` straight to the node. So it reaches 100% on
precisely the frame the screen finishes covering the viewport. The obvious
implementation — a duration spring timed to `FILL.durationMs` — is two clocks
again, and would still read 80% on a device that dropped a frame. Same failure
the boot loader was rebuilt to remove; this one avoids having two clocks at all.

### Coming back is not a load

The bar is deliberately **not** mirrored. A progress bar running backwards reads
as *undoing* rather than closing, and there is nothing to load on the way out —
you already have the content.

Instead the screen drops the `launch` channel the instant Back is pressed,
while the page is still fully opaque. The swap and its wipe happen entirely out
of sight; by the time the page has dissolved, the laptop is already carrying the
card it started from, and it shrinks back to the docked pose holding it. The
trip closes on exactly the frame it opened from.

Swapping at `idle` instead would put that content change at the *end* of the
return, in the open, on a small panel — the one place it is visible.

### The project is committed at the moment you press View

Selection fires on hover as well as click, and the work list is still sitting
there behind the veil while the laptop flies at you. Any pointer drift across a
row would swap the project mid-launch — caught on a phone viewport, where the
launch screen read `NuraHelp` at t+700ms and `BrainStorm` at t+1400ms. Press
View on one project, get a different one's page.

`onSelect` is therefore inert unless the sequence is `idle`, and arrow-key
cycling is allowed while browsing and while the page is `open` (there it flips
the page itself) but never during `approach` or `closing`.

### The zoom is one move on one group

Chassis, deck, lid and screen are all children of the rig's group, so the whole
device moves as one object — there is no arrangement in which the laptop stays
parked while its screen animates. The move is a single blend, applied to
position, rotation and scale at once:

```js
const t = FILL_EASE(fill.current);       // 0 docked → 1 covering
x = lerp(x, target.x, t);                //  translate to centre
sc = lerp(sc, target.scale, t);          //  and zoom
ax = lerp(ax, 0, t);                     //  squaring up as it goes
```

`fill.current` is a plain ref advanced by wall time and run through an authored
`cubic-bezier(0.62, 0.02, 0.18, 1)` — a short ease-in so it commits the instant
you click, then a long flat ease-out that coasts into the final frame. Not a
spring: overshoot on a screen-filling zoom reads as a rendering fault. Because
it is *one number driven in both directions*, **Back is an exact reverse** rather
than a second animation that approximately undoes the first.

The section pose keeps being sprung underneath the whole time, so the laptop
returns to a live target instead of a remembered one. Parallax tilt, idle bob
and the interaction kicks are scaled by `1 - t`, easing away with the move
rather than switching off under you.

### Solving the placement, not tuning it

`fillPlacement` in `LaptopRig.jsx` answers "where must the laptop sit for its
screen to cover the window". The panel is `SCREEN_W × SCREEN_H` world units; at
distance *d* a perspective camera sees `2·d·tan(fov/2)` tall by that times the
aspect. Covering both axes means

```
s·SCREEN_W  ≥  2·d·tan(fov/2)·aspect
s·SCREEN_H  ≥  2·d·tan(fov/2)
```

Both are linear in *d*, so with `c = max(2·tan(fov/2)·aspect / SCREEN_W,
2·tan(fov/2) / SCREEN_H)` the answer is just `d = s / c`. World scale is held
**constant** and the *distance* is solved for, so the laptop stays one physical
object of one physical size and only its depth changes with the window shape —
solving for scale instead would make it literally grow and the perspective on
the chassis would stop being believable.

`max`, not `min`: this is `cover`, not `contain`. Two corrections keep it honest
— the projected height is multiplied by `cos(Δhinge)` while the lid is still
settling onto 99.9°, and a 1.5% overscan absorbs fractional-DPR rounding.

Measured across five viewports, screen box vs viewport:

| Viewport | Docked | Filled | Covers |
| -------- | ------ | ------ | ------ |
| 1720×720 (21:9) | 456px @cx1249 | 1756×1129 @−18,−207 | yes |
| 1440×810 (16:9) | 431px @cx1007 | 1472×945 @−16,−70 | yes |
| 1280×800 (16:10) | 420px @cx856 | 1308×840 @−14,−22 | yes |
| 834×1112 (3:4) | 430px @cx430 | 1757×1130 @−462,−11 | yes |
| 390×844 (phone) | 235px @cx202 | 1333×858 @−472,−8 | yes |

In every case the screen's centre lands on the viewport's centre to within 2px.

### The hand-off

drei renders the laptop screen as real DOM through a CSS 3D matrix, so it has a
measurable bounding box — and by the time the fill lands, that box *is* the
viewport. The page is authored fullscreen and FLIPped **down** onto the measured
box, so at p = 1 the transform is exactly identity rather than the product of a
division:

```
sx = box.width / vw     tx = box.left      // transform-origin: 0 0
sy = box.height / vh    ty = box.top       // translate(tx,ty) scale(sx,sy)
```

The source box is **clipped to the window** first. The fill is `cover`, so the
panel deliberately overflows on one axis — by ~15% vertically at 16:9 — and
animating from a box larger than the window would run the page through a
non-uniform squash on its way to settling. What the reader can actually see is
the intersection, and when the fill is correct that intersection is the window:
sx = sy = 1, and the hand-off becomes a **dissolve at a fixed size** on every
aspect ratio rather than a second, redundant zoom. The FLIP stays in place as
the correctness guarantee for the degenerate cases.

The rect is measured one `requestAnimationFrame` after the move lands, not in
the same frame. The rig fires from its own `useFrame` and drei writes the CSS
matrix in a *different* one whose relative order isn't guaranteed — measuring
immediately can catch the matrix from the frame before. At 60fps that is
sub-pixel; on a device rendering at 1fps it is the entire animation, and the
page hands over from a rectangle the laptop has already left.

The hand-off is triggered by the move reaching its end, not by a timer running
alongside it — the same reason the boot bar owns its own hand-off. Two clocks
drift apart the moment a tab throttles.

### `filling` is a ref, not a boolean prop

`useFrame` swaps its callback in a **layout effect**, and the Canvas subtree is
a separate reconciler root whose effects flush on their own schedule. A boolean
read out of the frame closure therefore lags the DOM by a frame or two.

Instrumented on a device rendering at ~0.3fps, the return trip looked like this:

```
12  rig.filling=true   pv:false  focus:unset   screen 1464px   ← page already gone
13  rig.filling=true   pv:false  focus:unset   screen 1464px
14  rig.filling=false  fill=0                  screen  394px   ← finally noticed
```

React had rendered `idle`, unmounted the page and cleared the focus flag, while
the laptop sat covering the whole screen for two more frames. At 60fps that is
~16ms and invisible; it is not invisible on a phone that has just dropped a
frame. Passing a ref makes the rig read the flag *fresh every frame*, and the
stable identity means opening and closing no longer reconciles the Canvas tree
at all. `velocity` is threaded the same way, for the same reason.

The page carries the in-depth content: overview, engineering detail, role /
platform / stack, recognition, a screenshot grid and the demo. Add more
screenshots by listing them under `gallery` in `data/site.js` — it falls back
to `[image]`, which is why the grid currently shows one.

### Do not pause the render loop

The obvious optimisation while a fullscreen page covers the canvas is
`frameloop="never"`. **It breaks the page.**

`@react-spring/three` sets react-spring's *global* frameLoop to `'demand'` and
advances it from r3f's `useFrame`:

```js
frameLoop: "demand",  …  raf.advance();
```

That global is shared with `@react-spring/web`, so halting r3f's loop freezes
every DOM spring in the app — including the one expanding the page over it. The
expansion stalled dead at 47% until this was reverted. The `covered` prop drops
bloom and contact shadows instead, which gets most of the saving with none of
the coupling.

## The fill hinge

There is deliberately **no `focus` entry in `POSES`**. Viewing a project can't
be written as fixed coordinates — the distance that makes the screen cover the
window depends on the window's aspect — so it is solved every frame instead.
All that's left to declare is the lid angle.

The fill hinge is **99.9°, not 110°**. The screen's normal is `(0, -cos t,
sin t)` and the camera looks down 9.9°, so 99.9° is the angle at which the panel
faces the lens dead on — alignment 1.0000 versus 0.9845 at 110. Head-on means no
foreshortening, which is what lets a 1.55-aspect panel cover *any* window; at
110° the cover solve would be for a rectangle that isn't there.

While filling: page scroll is locked (otherwise the section director grabs the
pose back mid-read), the canvas lifts above the page with a veil between, and
the HUD and theme toggle fade out. Arrow keys still flip projects.

Bloom and contact shadows are dropped only once the page is genuinely opaque —
killing them mid-dissolve is a visible pop, and the whole point of the sequence
is that you cannot see the seam.

### Measuring the round trip

Verifying that Back returns the laptop to its docked pose is harder than it
sounds, and the first three attempts at it were wrong.

`Spring.step` integrates in fixed 1/240 sub-steps and clamps `dt` to 1/20s, so
under headless software rendering at ~1fps the pose spring advances **50ms of
spring time per real second**. A "wait until the value stops changing" detector
is useless there: the pose creeps by fractions of a pixel and reads as settled
while it is still tens of seconds from its target. Three runs produced docked
baselines of `469px@cx923`, `427px@cx1016` and `417px@cx1065` — all of them
still in transit toward the same place, which the *returned* measurement hit
reproducibly at `394px@cx1133` every single time.

So the check compares two **fixed, generous waits** on the same pose, one before
the round trip and one after, with the cursor parked identically for both (the
rig applies up to 7° of cursor parallax, so measuring with the mouse on the View
button and then on the Back button compares two tilts, not two poses).

## Performance

Four structural fixes, in rough order of impact:

1. **Scroll progress never enters React.** It was App state updated on a rAF,
   so every ~0.5% of scroll re-rendered the whole app — including the `<Canvas>`
   element tree. `SectionHud` now takes the ref and writes `transform` straight
   to the node.
2. **The boot loader animates itself.** It was a 25ms `setInterval` driving
   state: 40 full re-renders per second. One spring inside the screen now does
   it with zero renders.
3. **`LaptopHero` is memoised.** App still re-renders on theme, section and
   project changes; the 3D tree no longer reconciles for them.
4. **`Magnetic` measures once on enter.** `getBoundingClientRect` on every
   pointermove forces a synchronous layout at pointer frequency.

Plus: adaptive DPR via `PerformanceMonitor` (drops to 1 under load, recovers to
2, `flipflops={3}` stops it oscillating), ContactShadows at 128 instead of 256
and skipped entirely on touch.

## The bug that stopped the lid opening

Worth recording, because it's invisible and easy to reintroduce.

The canvas is fixed at `z-index: 1`. `<main class="page">` sits at `z-index: 2`,
spans the full document, and is completely transparent. **A transparent element
with `pointer-events: auto` still swallows every hit** — so no `pointerdown`
ever reached the canvas, and the lid could not be grabbed.

Putting `pointer-events: none` on `.hero` did nothing, because the blocker was
its *parent*. The rule has to live on `.page`, with interactive children
(`.hero-copy`, `.section`, `.footer`) opting back in.

If the laptop ever stops responding to the pointer, check this first.

---

## Structure

```
src/
├── App.jsx                  owns the hinge, the preview selection, the dialog
├── data/site.js             projects, profile, stack, socials
├── lib/
│   ├── config.js            EVERY tunable number — dimensions, springs, poses
│   └── spring.js            the per-frame spring integrator
├── hooks/useMediaFlag.js    reduced-motion / coarse-pointer / breakpoint
├── hero/
│   ├── LaptopHero.jsx       Canvas, camera, lightformer env, bloom
│   ├── LaptopRig.jsx        tilt + idle bob + scroll dock (one useFrame)
│   ├── Laptop.jsx           hinged base/lid groups, built from primitives
│   ├── Screen.jsx           emissive panel + <Html transform> UI, staggered
│   ├── useHinge.js          drag / flick / tap → the lid angle spring
│   └── useScrollDock.js     ScrollTrigger → progress ref
├── sections/                Work · About · Contact
└── ui/                      Reveal (spring scroll-in) · DemoDialog
```

## The screen is the payload

The laptop isn't decoration — it's the display surface for the site's content.

- **Shut → open:** the screen shows the profile card (portrait, name, role,
  bio, socials), staggered in.
- **Hover or focus a project row:** that project loads onto the screen —
  shot, title, category, description, stack. By then the laptop has docked to
  the corner, so it acts as a live preview pane for the list you're reading.
- **Click a row:** the video demo opens in a dialog.

Both views fill the **same five slots** (`media / title / subtitle / body /
meta`). That's deliberate: `useSprings` takes a fixed count, and changing the
count mid-flight while a stagger is running is how you get stuck rows.
Switching views is just new content in the same springs, so the stagger replays
cleanly every time.

The hinge lives in `App`, not inside the canvas, because the DOM drives it too
— the hero button toggles it and previewing a project opens it if it's shut.

---

## The hinge

The lid is a child `<group>` whose **origin is the hinge**, positioned at the
back edge on top of the base. Rotating that group swings the lid on a real
pivot — the lid never translates.

```
     z-  ┌──────────────┐  ← hinge (lid group origin)
         │     base     │
     z+  └──────────────┘  ← front edge, faces camera
```

**On the rotation axis:** a lid hinges about the axis that *runs along* the back
edge. With the base in the XZ plane that is **X**, not Y — a Y rotation would
swing the lid sideways like a door. The brief said Y; the code says X and names
the constant `HINGE_AXIS` so the choice is visible rather than buried.

The angle spring carries **degrees**, not radians, so the drag maths, the 0-110
clamp and the 80%-open threshold all read in the unit the design is specified
in. Conversion happens once, at the group that consumes it.

Verified numerically (pure matrix maths, no browser needed): the pivot is
stationary across the whole sweep, the shut lid lies flat inside the base
footprint with its screen facing the keyboard, and at 110° the screen normal is
`(0, 0.34, 0.94)` — facing the viewer and tipped back like a reclined lid.

---

## Why two spring systems

Both are real spring physics. Neither is a tween. They solve different problems:

| System | Used for | Why |
| ------ | -------- | --- |
| `@react-spring/three` | the lid angle | Discrete state transitions — "released, snap open". Needs `immediate`, scheduling and per-item `delay`. |
| `lib/spring.js` | parallax tilt, scroll dock | Targets that change *every* pointer/scroll event. Calling `api.start()` at that rate allocates constantly; a plain integrator inside the existing `useFrame` costs nothing. |

`lib/spring.js` integrates in **fixed 1/240s sub-steps**. A spring stepped with
a raw frame delta is frame-rate dependent — it visibly rings at low FPS and can
diverge outright. Fixed sub-steps make 60Hz, 144Hz and a stuttering tab produce
the same curve.

### The drag

- **`immediate: true` while the pointer is down.** The lid tracks 1:1 with zero
  lag; the spring only takes over on release. This is most of the "instant
  response" feel.
- **Flick detection.** Release velocity above `FLICK_VELOCITY` throws the lid
  the way it was moving instead of snapping to whichever end is nearer.
  Without it, a fast flick feels ignored.
- **Window-level listeners.** The pointer routinely leaves the lid mid-drag;
  binding to the mesh would drop the gesture.
- **An oversized invisible hit volume** wraps the lid. Note it uses a
  transparent *material*, not `visible={false}` — three skips invisible objects
  when raycasting, so that would make it unclickable.
- **Under `CLICK_SLOP_PX` of travel** counts as a click and toggles.

The hinge config (`tension: 120, friction: 14`) has a damping ratio of ~0.64 —
underdamped, so it overshoots slightly and settles. **That overshoot is the
feel.** Don't "fix" it by raising friction.

---

## The screen

Real DOM in 3D via drei's `<Html transform>`, so actual UI renders on the panel.

Fitting it to the bezel is **exact, not eyeballed**. drei sizes transformed HTML
as `clientWidth * (distanceFactor / 400)` world units, so authoring the DOM at
`worldSize * SCREEN_PX_PER_UNIT` px and passing `400 / SCREEN_PX_PER_UNIT` makes
it fill the panel precisely at any dimension.

Content mounts only past the open threshold — `<Html>` is DOM layered over the
canvas, so a shut lid would show its UI floating through the case. The latch has
**hysteresis** (on at 80%, off at 68%): without the gap, a lid parked exactly on
the threshold mounts and unmounts on alternating frames.

The stagger uses `useSprings` with an explicit `delay: i * STAGGER_MS` rather
than `useTrail`. A trail's spacing emerges from the physics and can't be pinned
to a number; the brief asks for 40-60ms. Only the start time is scheduled — the
motion is still a spring.

---

## Choreography

The laptop doesn't dock and sit still — it travels through the page, taking a
different attitude in each section.

| Section | What the laptop does | Screen channel |
| ------- | -------------------- | -------------- |
| hero | centre-right, shut, idle float | profile (once opened) |
| work | swings left, turns to face the reader | the hovered project |
| stack | tips back and up, seen from above | stack summary |
| about | left, squared to the reader | profile |
| contact | comes forward, squares up | contact card |

`POSES` in `lib/config.js` holds a `{ side, y, z, rotation, scale, hinge }`
target per section. `useSceneDirector` runs one ScrollTrigger per section —
whichever covers the middle band of the viewport owns the laptop — and the rig
**springs** toward that pose. Because it's a spring rather than a scrubbed
tween, the laptop *arrives* with a settle instead of tracking the scrollbar.

### Why the laptop can't overlap the copy

A hard-coded world `x` **cannot** guarantee separation: the visible width at a
given depth depends on the viewport aspect, so an x that clears the text at
16:9 drives straight through it at 21:9. That was a real bug in an earlier
pass — the work pose sat at `x: -1.55` while the CSS put the copy on the left
too.

So a pose declares which **half of the frame** it takes, never a coordinate.
Each frame the rig measures the frustum at the pose's own z, centres the
laptop in its half, and clamps `scale` so the laptop can't exceed that half or
the frame height. CSS puts the copy in the opposite half via `data-side`, read
from the same `POSES` object through `sideFor()` — so layout and choreography
cannot disagree about who owns which side.

Verified numerically from 21:9 down to 1:1: a positive gap in every section at
every aspect. `scratchpad/overlap-check.mjs` replicates the rig maths and
checks the laptop's footprint against the text column.

A pose can raise its own `fit` margin — the contact stage does, because that
gutter exists to clear copy and there is no copy there. It fills **78–94% of
the frame** versus ~43% elsewhere.

Note `hinge` is part of the pose: scrolling into the work section opens the lid,
and scrolling back to the top shuts it again.

Nothing is pinned and no wheel event is intercepted. This is choreography
layered on normal scrolling, not scroll-jacking.

### Targets vs. impulses

This is the distinction that makes it feel physical rather than scripted:

- A **pose change** moves a spring's *target*. It eases.
- An **interaction** injects velocity directly into a spring that's already at
  rest on zero. It reads as an impact.

So changing project doesn't tween the laptop to a new angle and back — it
shoves `kickY.velocity` and lets the spring resolve, with direction depending
on whether you moved forward or backward through the list. Opening the lid
kicks `kickX`. Scroll velocity feeds in continuously, so fast scrolling visibly
drags the laptop and it recovers on its own.

**One gotcha, fixed:** ScrollTrigger's `onUpdate` only fires *while* scrolling,
so the last velocity sample sits at full value once you stop. Without decaying
it in the frame loop the laptop gets kicked forever. `velocity.current` is
consumed each frame.

### The list is an index; the laptop is the detail view

A work tile carries only what identifies a project — name, year, category,
platform, stack. The description and the **Watch demo** button live on the
laptop screen. That keeps the list scannable and gives the 3D element an actual
job instead of a decorative one.

Selecting and opening are separate: a tile publishes itself to the screen, the
demo opens from the button on the screen. On touch that's a clean two-step —
tap a tile to load it, tap the screen to watch it.

### Mobile

Two things had to be solved properly rather than nudged.

**On-screen type.** The screen DOM is authored at N px per world unit and then
scaled to whatever the panel occupies on the display. At a fixed 200px/unit the
panel lands at ~315 CSS px on an iPhone 14 against a 564px-wide UI — a 0.56
scale, rendering 13px body copy at **7.3px**. So `SCREEN_PX_PER_UNIT` is
responsive (200 wide / 120 narrow): less authored width means less scale-down.
Same phone now renders it at **12.1px**. The compact layout drops the media
column rather than shrinking everything to fit.

**Vertical clearance.** On narrow the laptop holds the lower band and the copy
stops above it — `padding-bottom: 46svh`, and 68svh on the contact stage where
the laptop fills from ~40% down. Checked across five devices in
`scratchpad/mobile-check.mjs`; every section keeps an 8-18% gap.

**The laptop renders IN FRONT.** Some overlap is unavoidable once a section's
content is taller than the band above the device, and text showing *through*
the laptop reads as a rendering fault. So below the breakpoint the canvas moves
above the page and content scrolls behind it, with a scrim so copy fades rather
than collides.

That requires the layer to be transparent to taps, which takes **two** changes,
not one: `pointer-events: none` on `.canvas-layer` *and* on the Canvas via its
`style` prop — r3f writes `pointer-events: auto` inline on its container and no
stylesheet rule can beat inline. drei's Html sets its own inline value deeper
still, so Watch demo and the contact links keep working. The trade is that
tapping the lid no longer toggles it; scrolling and the hero button both do.

**Panel density is a two-sided knob.** Lowering `SCREEN_PX_PER_UNIT` makes the
type bigger but shrinks the box the content must fit in — the two pull against
each other. The win came from elsewhere: parallax tilt is disabled on touch, so
the footprint clamp shouldn't reserve headroom for it. Dropping that slack on
coarse pointers bought back ~20% of the phone's laptop scale.

One finding worth recording: a 768×1024 tablet in portrait originally
overlapped by 4%. Lowering the contact `fit` would have fixed it but made the
contact laptop *smaller* than the work one, defeating the zoom — so the pose
drops instead, which preserves the scale.

### Screen channels

The screen behaves like a small OS that changes application as you scroll.
Every channel fills the **same five slots** (`media / title / subtitle / body /
meta`) — a hard constraint, because `useSprings` takes a fixed count and
changing it mid-stagger leaves rows stuck at opacity 0. A light bar wipes
across on every change, so the screen reads as repainting rather than silently
swapping.

The active accent drives the fill light, the screen's emissive glow and
therefore the bloom colour — so hovering a project retints the whole scene.

**The contact channel is interactive.** `pointerEvents` flips to `auto` for
that channel only, so the links rendered on the 3D screen are real, clickable
anchors. Everywhere else it stays `none`, or the screen would swallow the drag
gesture meant for the lid. The contact `<section>` is itself
`pointer-events: none` apart from its label — an empty full-viewport section
would otherwise intercept every click aimed at the screen, which is exactly the
bug class that stopped the lid opening. The same links are duplicated into the
footer, quiet but focusable, so contact never depends on WebGL starting.

### Micro-interactions

| Where | What |
| ----- | ---- |
| fixed chrome | section counter + name, swapped with `useTransition`; spring scroll bar |
| hero buttons | magnetic — lean toward the cursor, spring back on leave |
| headings | word-by-word reveal from behind a clipped baseline |
| work rows | accent glow tracking the cursor via a CSS variable (no re-render) |
| screen | light bar wipes across on every channel change |
| laptop | physical kick on project change, lid open, and scroll momentum |

---

## Performance

- `dpr={[1, 2]}` — r3f clamps; a 3× DPR phone would otherwise render ~9× the pixels.
- Materials built once in `useMemo` and disposed on unmount. Re-instantiating a
  material per render forces a shader recompile on the next frame.
- Tilt, bob and dock run in **one** `useFrame` and write straight to the group
  transform. No React state, no re-renders. The only state in the hero is the
  screen-open latch, because mounting DOM genuinely is a render.
- **No shadow maps** — one `ContactShadows` pass sells the ground contact.
- **No CDN at runtime.** The environment is built from `<Lightformer>` rects
  rather than `<Environment preset>`, which fetches an HDR from a third-party
  host. A hero that renders as flat grey plastic when that host is slow is not
  a trade worth making.
- Bloom is skipped on coarse pointers, where fill-rate cost lands hardest.

Three is ~180 KB gzipped and the r3f ecosystem another ~150 KB. That is the
price of admission for WebGL in React; the chunks are split so the app code
stays independently cacheable.

---

## Accessibility

- **`prefers-reduced-motion`** — idle bob and parallax tilt are skipped
  entirely. State-change springs are kept but retuned to `hingeReduced`
  (critically damped, ~2× faster), so the lid still animates rather than
  teleporting.
- **Coarse pointers** — no drag (there is no persistent cursor to drag with).
  Tap toggles, through the identical spring. The hero copy reflects which.
- The hero section is `pointer-events: none` so it doesn't swallow the drag,
  with the copy block opting back in — which keeps the text selectable.

---

## Swapping in a real model

`Laptop.jsx` is the only file that knows what a laptop looks like. To move to a
`.glb`, keep the two-group structure and drive the same `angle` spring:

```jsx
const { nodes } = useGLTF('/laptop-draco.glb');
// lid group origin MUST be the hinge — bake that in Blender by moving the
// lid mesh's origin to the back edge before export, or parent it to an empty
// placed there. Everything else in this repo keeps working unchanged.
```
