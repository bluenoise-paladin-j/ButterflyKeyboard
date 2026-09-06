# v8 — the base-colour generator, 3 September 2026

Serve this folder and it runs. `tools/` is the two servers (plus a dev tuning
page, `tools/colour-preview.html`).

```bash
python3 tools/serve.py 8123        # then http://localhost:8123/
python3 tools/serve-https.py 8443  # for a Quest, over the local network
```

v7 turns the name into a butterfly; v7.1 tightened the name tag; v7.2
art-directed the reveal; **v8 gives the grown butterfly a per-name procedural
COLOUR texture on its wings** — the last unported TouchDesigner script. The
generation stage is complete: a name → a wing shape *and* a wing colour, both
deterministic from the same four values. The 26-key interaction, the DNA path,
the shape parity, the reveal, the name tag and the persistence are all untouched.

## What changed from v7.2

One new file (`js/wing-colour.js`) and four small edits.

`wingbasecolour_script.py` (the TouchDesigner "BASE COLOR GENERATOR v3") ported
into **`js/wing-colour.js`** — a mirror-fold gradient ramp, an fBm domain warp, a
dark→bright HSV palette, a second palette-coloured fBm ("mottle"), and a
complementary overlay tint (multiply or soft-screen). Full-frame RGB, alpha 1;
the wing shape supplies the cutout as a separate `alphaMap`. Rendered at 128×256
(the shape slice). `WingColour.forEntry(entry)` → an LRU-cached, sRGB-tagged
`THREE.CanvasTexture`; `WingColour.render()` is pure Canvas2D (no THREE) for the
preview tool.

**Two deliberate divergences from the Python** (the user's call):

1. **Name-driven, own PRNG.** The Python seeds numpy's PCG64 off an integer atlas
   index. Here it is seeded off an FNV-1a hash of `entry.values` (same
   construction as `Wings.hashValues`) and drawn from **`mulberry32`** (the
   codebase's off-parity PRNG, `web/js/prng.js`). The RNG **draw order** is
   reproduced exactly — `wing-colour.js` carries the Python line references step
   by step — but the numbers are not bit-identical to a TouchDesigner bake. There
   is no TD colour reference or harness in the repo, and index-parity is
   meaningless once it is name-driven. The contract: **same `entry.values` →
   byte-identical texture, any machine, across reloads** (verified).
2. **Full-spectrum hue.** The Python centres `base_hue` on a fixed `0.08`
   (orange). Here that centre is name-derived across the whole wheel
   (`nameHueFor` — the values reversed, then hashed, so it is decorrelated from
   the draw seed). Everything keyed off `base_hue` downstream follows.

Edits:

- **`js/bfly-model.js`** — `build()` gains an optional **6th** arg
  `wingColourTex`. Present → wing material takes it as `map` and its diffuse
  `color` is forced white (`MeshBasicMaterial` does `color × map`). Absent (the
  26 keys, which pass four args) → `map: null`, byte-identical behaviour.
  `setColor` guards against stomping the white; `dispose()` comment notes the
  texture is `WingColour`-owned.
- **`js/collection.js`** — `spawn()` calls `WingColour.forEntry(entry)`, passes
  `col.tex` as the 6th arg, sets the wing `color` white, and takes the **body**
  hue from `col.hue` (`WingColour.nameHueFor`) — the same hash the texture
  centres its palette on, so body + wings are one hue family. Replaces
  `Wings.hashValues(entry.values)` as the hue source. `removeOne` unchanged
  (the texture is `WingColour`-owned, like the shape texture is `Wings`-owned).
- **`js/config.js`** — three `CFG.wingCol*` knobs with literal defaults
  (`wingColRandAmt` 0.5, `wingColPeriod` 1.0, `wingColRampType` 'random'), read
  by `wing-colour.js`, which `console.error`s any that come back undefined.
- **`index.html`** — `<script src="js/wing-colour.js">` after `config.js`, before
  `collection.js`; `<title>` → v8 (was stale at v7.1).

**The "Flat" rule gets one exception** — the visitor's own butterfly, the hero.
The 26 keys and every other surface stay flat.

### Verified (desktop, real seam + `tools/colour-preview.html`)

The A-Frame render loop is throttled in a background tab, so the scene was pumped
with `sceneEl.tick()` / `renderer.render()` between samples.

| | |
|---|---|
| clean load | no console errors, no `[wing-colour] CFG.* is undefined` |
| determinism | same `entry.values` → identical `canvas.toDataURL()` twice in a row **and across a page reload** (CALYPSO: 33438 chars, tail byte-identical) |
| distinct per name | ANNA / JARED / MERIDIAN / SERAPHINE / CALYPSO all visibly different textures and hues (green, pink, orange, blue, lavender); full spectrum, not the Python's warm-only family |
| the collection butterfly | wing material `map` set + sRGB-tagged, diffuse `color` white; `alphaMap` (shape) untagged; body flat `hsl` at `col.hue`; screenshotted in `present` — a distinctly patterned wing |
| the 26 keys | wing material `map: null`, flat `color`, `alphaMap` present — completely unaffected |
| orientation | forced `vert` ramp → gradient runs fore→hind along the body; `horiz` → root→tip across the wing; the Python's `rgb[::-1]` flip is deliberately dropped (TD origin convention only) |
| reveal | a fresh commit still runs `present` → `joining` → `orbit`; the textured wing fades in via `setOpacity` unchanged |
| memory | `WingColour.stats()` — own LRU, 16 slots, 0.13 MB/texture; not routed through `Wings`' 64-slot cache |

## What changed from v7.1

Only `collection.js`'s `present` and `joining` states, and the `CFG` numbers
that drive them. The butterfly a name grows now:

1. **hovers flat, wings square to the visitor** — a pinned-specimen aspect. The
   flight's `presentRoll` geometrically *can't* do this (there the body axis
   points at the visitor, so the wing plane never faces them — measured in the
   running scene, the aspect never tops ~0.18 at any roll). So `present` leaves
   the group unrotated and orients the model with a direct look-at
   (`collection.js:_flatQuat` — wing normal → camera, head → **down**; head-up
   renders the butterfly upside down), slerped in as it rises. Held aspect ≈ 0.99;
2. **breathes** — a slow, shallow *symmetric* wing movement (`CFG.revealFlapAmp`
   0.11 rad at `CFG.revealFlapRate` 1.9 rad/s ≈ 0.3 Hz) instead of the full
   ~3–4 Hz flight beat;
3. **flutters up and away into the visible flock** — `aimJoin()` biases its
   orbit `phase` so the slot it flies to sits `CFG.revealJoinArc` (1.05 rad)
   off the visitor's gaze on the side it already travels; `tickJoining` adds a
   half-sine climb (`CFG.revealJoinLift` 0.35 m), ramps the wings up to the full
   beat, eases the group yaw up to the travel heading, and slerps the model
   orientation from the flat look-at back to the flight's `presentRoll` with a
   bank (`CFG.revealJoinBank` 0.22 rad) through the turn. At `u = 1` it writes
   the exact flight representation so `tickOrbit` continues it with no pop.

Supporting changes:

- **`presentRoll` is untouched — still verbatim from `keyboard.js`.** The reveal
  does not go through it.
- **`config.js`** — five new `CFG.reveal*` keys (each with its literal default
  and a one-line note, in the same change as its reader; `collection.js`
  `console.error`s any that come back undefined). `presentArrive` 0.7 → 1.0,
  `presentHold` 2.4 → 4.2, `presentJoin` 2.8 → 3.2, `acceptResetDelay`
  3600 → 5600 (kept ≈ `(presentArrive + presentHold)·1000` + a small margin, so
  the keyboard resets ~0.4 s into the departure). `revealFlapAmp` 0.11 /
  `revealFlapRate` 1.9 — a gentle ≈ 0.3 Hz breath.
- **`collection.js`** — new `_flatQuat()` and `_joinYaw` state; `tickPresent`
  and `tickJoining` reshaped; a handful of scratch `Vector3`/`Quaternion`/
  `Matrix4`/`Euler` in `init()`. `_flatQuat` points the head at world −Y (not
  +Y) so the butterfly is right-side up — a 180° rotation about the view axis,
  wings still square to the camera.
- Replayed butterflies are untouched — they spawn straight into `orbit` and
  never enter `present`/`joining`.

All the reveal numbers are on-headset judgement calls.

### Verified (desktop, driven through the real `keyboard:accepted` seam)

The A-Frame render loop is throttled in a background tab, so the scene was
pumped with `sceneEl.tick()` and `renderer.render()` between samples.

| | |
|---|---|
| clean load | no console errors, no `[collection] CFG.* is undefined` |
| flat present | wing-to-camera aspect **0.99–1.0** for the whole hold; right-side up (head world −Y); the name tag rides under it; screenshotted — wings fully spread to the viewer, body a thin sliver |
| breath | aspect wavers ±0.006 across the cycle (wing tips ±6°) — reads as the wings easing open/shut slowly, not a beat |
| beat lengths | `present` ≈ 5.2 s (`presentArrive` 1.0 + `presentHold` 4.2), `joining` ≈ 3.2 s (`presentJoin`), orbit by ≈ 8.4 s |
| departure | climbs ~0.5–1 m, arcs into the forward arc (biased by `aimJoin`), wings ramp to the full beat, settles onto the orbit at its real size |
| handoff | position, scale, group yaw and model roll all continuous `joining` → `orbit`; no pop |
| replay | reload without `?reset=1` → the stored butterfly spawns straight to `state: 'orbit'`, no reveal |
| camera moved | butterfly still spawns in front and presents face-on with the head turned |

## What changed from v7 → v7.1

The name tag under a collected butterfly. In v7 it floated well below
the butterfly — `CFG.tagCling` scaled the model's *bounding box* bottom, and
the wing/body planes carry a lot of transparent margin, so "the bottom of the
geometry" is ~3× further down than the bottom of the painted shape. The name
now hangs **right below the body, tight against it**.

- `CFG.tagBodyDrop` (−0.135 × the model's size, per unit) is where the
  *painted* silhouette actually reaches below the butterfly's centre —
  measured across flap and roll, not read off the geometry. `collection.js:
  render()` passes `CFG.tagBodyDrop * s` as the drop point. `CFG.tagCling`
  (and the now-pointless `c.modelBottom` bbox measurement in `spawn()`) are
  gone.
- `ui.js:nameTagTex()` scans the rendered canvas for the first row that
  carries a pixel, so `nameTag().place()` lands the *visible* top of the name
  on the drop point rather than the padded canvas edge (the padding varies
  with how far the per-letter jitter threw a letter, so a fixed offset was
  always a little loose).

`tagBodyDrop` less negative = the name tighter / slightly into the body; more
negative = a gap below it.

Nothing else — the generation, the collection, the flight, the persistence and
the server are v7's, unchanged.

## What changed from v6.2

The name a visitor spells now grows a butterfly of their own, and it stays in
the room for the rest of the exhibition. The room begins empty and fills up.

### `js/name-dna.js` (new) — a name → four values

The Outline's one open question. The generator takes four values; names are any
length; the mapping has to be **stable** (same name, same butterfly, every
session) and **well spread** (short and long names alike land far apart).

`NameDNA.toValues(name)` seeds an `xmur3` hash off the whole cleaned name and
takes four draws — four decorrelated values in −1..1. A string hash *is* that
mapping: a full avalanche per step, length-independent, so "ANNA" / "ANA" /
"NANA" are three visibly different butterflies and a two-letter name spreads as
widely as a twelve-letter one. There is no literal letter-to-parameter
correspondence — the Outline asks only for deterministic and distinct.

The four values flow on unchanged through `DNA.toDials`, which maps −1..1 onto
the roll chains with a **wrap** (the chains are cyclic), so a uniform hash sits
on it with nothing piling up at the ends.

This is **not** `keyboard.js`'s `dialsForLetter`, which hashes a letter's *index*
so the 26 keys look like 26 butterflies. This hashes the whole spelled *name*.

### `js/dna-store.js` (new, forked from `web/js/dna-store.js`)

The collection: made, kept, brought back. A trimmed fork of the `web/` build's
`DNA` object — the four-slot capture buffer is gone (a narrative would fill it
at four story beats; the keyboard hands over a whole name at once), so
`DNA.create([v,v,v,v], { name })` is the only way in. It fires `dna:committed`;
the entry is TouchDesigner's schema exactly, plus a `name` key it ignores.

Storage is the `Store` object — the one seam. Above it an in-memory `cache`
array is the synchronous source of truth, so `DNA.sequences()` always returns
immediately.

- **localStorage** is the offline mirror, written on every change.
- **The server file** is the authority. `Store.hydrate()` GETs
  `dna_sequences.json` on load; `Store.write()` POSTs the whole collection back,
  debounced. localStorage is per-origin, so without this the headset
  (`https://LAN:8443`) and the desktop (`http://localhost:8123`) would hold
  separate collections and a cleared browser would wipe the show.
- With no server (`file://`, a static host) the fetch and POST fail quietly and
  it is localStorage-only, exactly as before.
- `hydrate()` will not clobber a collection this session has already added to
  (`dirtiedLocally`) — the visitor in front of you wins.

### `js/collection.js` (new) — the kaleidoscope that accumulates

`AFRAME.registerComponent('butterfly-collection')`. Owns the butterflies grown
from names: flies a new one in on `dna:committed`, and replays the whole stored
collection (newest first, capped) on load.

- **Not the keyboard.** These are never in `keyboard.js:targets()`, so
  `interact.js` cannot see them — "cannot be selected or captured" falls out for
  free. They carry a **name**, not a letter.
- **"Here's your butterfly."** A just-committed butterfly does not fly straight
  into the swarm. It rises into a spot ~0.8 m in front of the visitor (inside the
  keyboard's orbit, clearly the foreground), turns to face them, and hovers at a
  held size (`CFG.presentSize`, whatever its orbit size will be) for
  `CFG.presentHold` while the name settles under it — then peels off and flies
  out to its orbit over `CFG.presentJoin`, growing or shrinking to its real size
  on the way. Three states: `present` → `joining` → `orbit`. `CFG.acceptResetDelay`
  (3600 ms) is set so the keyboard resets just as the butterfly starts leaving.
  Replayed butterflies skip all this and spawn straight into `orbit`.
- **Their own shell.** The 26 keys sit in a near, tuned band (1.0–2.4 m) that
  took three rounds of on-headset selection work. The collection flies further
  out and taller (`CFG.col*`, ≈2.6–4.3 m) so the kaleidoscope reads as the room
  around you and the keyboard stays the near, actionable layer.
- **Ported flight.** A simplified copy of `keyboard.js`'s `tickKey` / `pathAt` /
  `presentRoll` / `readSources` / `separate` — no capture states, no slow-field,
  no per-key clock, no letter. `keyboard.js:tickKey` is named in the header as
  the source of truth; a flight bugfix there must be mirrored here. Copied
  rather than shared because factoring it out would be surgery on the most-tuned
  file in the piece. The file-global helpers (`makeNoise` / `makeFbm` /
  `smoothstep` / `rand` / `UP`) are reused from `keyboard.js`, which loads first.
- **`presentRoll` is not optional** — the collection orbits through eye height,
  and without the roll solve a butterfly there is an edge-on twig.
- **A committed entry is enqueued, never built in the event handler.**
  `dna:committed` fires synchronously inside `keyboard.js`'s tick; `tick()`
  drains the queue a couple per frame, the way `web/js/swarm.js` does.
- **Colour** is the name's hue (`Wings.hashValues`) at the keys' own white-tuned
  saturation and lightness — `Wings.colorFor`'s S/L range predates the white sky
  and washes out on it. Size is random, not from the name: a name that hashed
  small would be a permanent bad outcome, and the wing shape and hue already
  carry "this is theirs".
- **The cap.** `CFG.maxCollected` (12) is how many *render*; the rest stay in
  storage and in the file. Over the cap, the oldest leaves the *scene* only —
  its record is kept and it comes back on reload or if the cap is raised.

### The small edits

- **`js/app.js`** — the whole file is now the seam it always described:
  `name → NameDNA.toValues → DNA.create`. Nothing else.
- **`js/ui.js`** — `UI.nameTag(text, seed)`: the name drawn the way the keyboard
  sets the caught name — **every letter its own small angle, rise and colour**
  (nothing to do with the wing), the wonk deterministic off the butterfly's
  stored id. One canvas, one sprite. **v7.1:** it hangs right below the body,
  tight against it (`CFG.tagBodyDrop`, where the *painted* silhouette reaches —
  not the geometry's transparent-padded edge); `nameTagTex()` scans the canvas
  for its first inked row so the visible top of the name lands there.
  **Never faded with distance** —
  the name is the record of a visitor and must stay legible. A *colour* canvas,
  so `srgb()`-tagged (unlike the wing alpha map).
- **`js/config.js`** — `maxCollected`, the `col*` bands and helpers, the `present*`
  and `tag*` keys, and `acceptResetDelay`. Every new key has its literal default
  here, in the same change as the code that reads it — the "config keys drift →
  silent `NaN`" trap this build has hit before. `collection.js` also
  `console.error`s any of its keys that come back undefined.
- **`js/keyboard.js`** — one line: the bare `3200` reset delay is now
  `CFG.acceptResetDelay` (3600, so the keyboard resets just as the presented
  butterfly leaves). Nothing else.
- **`js/dna-store.js`** — `?reset=1` in the URL wipes the collection on load
  (localStorage mirror, in-memory cache, and the server file). For clearing test
  butterflies, or between exhibition days. Read once, not persisted.
- **`tools/serve.py` / `serve-https.py`** — `do_POST` writes
  `dna_sequences.json` atomically (temp file + `os.replace`, under a lock);
  `do_GET` answers an empty collection rather than a 404 before the first
  butterfly exists. `serve-https.py` also had a broken dead block (`HERE` used
  before assignment — a `NameError` at import); that is deleted.

## What the Outline asked, and what v7 settled

| open question | v7 |
|---|---|
| **name → values** | a stable, well-spread string hash — `name-dna.js` |
| **name length** | `CFG.maxName` (16) already caps it; an empty name can't reach the seam (the keyboard won't finish one), and the seam refuses it anyway |
| **correction** | already there — backspace / the red delete control, in `keyboard.js` since v3 |
| **keyboard replenishment** | already there — keys go `gone` → `return`, pickable again as they fly back in |
| **the released butterfly** | `collection.js` — flies in from outside, name beneath it, not selectable, its own hue, joins the accumulating cloud |
| **persistence** | localStorage mirror + a shared `dna_sequences.json` on disk |

## Verified (desktop, driven through the real event path)

| | |
|---|---|
| `NameDNA` determinism | `toValues('CAT') === toValues('cat')` (cleaned); `toValues('') === null` |
| spread | ANNA / ANA / NANA / A / JAREDAMUSO all land far apart across all four values |
| the seam | spell + accept → `DNA.create` → entry stored `{ id, name, values }` matching `toValues` |
| a butterfly is made | `dna:committed` → `collection.js` builds one, name beneath it, its own hue |
| the present beat (v7 shape) | every fresh butterfly runs `present` → `joining` → `orbit`; replayed ones skip to `orbit`; `present`/`joining` skipped by `separate()`; verified across many spawns. **v7.2 reshaped `present`/`joining` — see the v7.2 checks below.** |
| no phantoms | scene holds exactly 26 keys + `collected.length` butterfly bodies, nothing else |
| name always legible | tags never fade with distance; every collected butterfly has a visible tag; per-letter colours + jitter, seeded per id (stable across reloads) |
| not pickable | no collection id ever appears in `keyboard.js:targets()` |
| deterministic butterfly | two "JARED" entries → byte-identical values, one shared wing texture (`Wings.stats().unique` does not rise on the second) |
| accumulation across reload | spell CAT, reload → CAT replays from storage, no fly-in; spell more → they pile up |
| the cap | 15 names stored, 12 rendered (newest first), oldest 3 kept in storage; survives reload |
| `dna:changed` reconcile | `importJSON` and `clearAll` → scene reconciles / empties, no leaked groups (`root.children` back to 0) |
| export / import round-trip | `DNA.importJSON(DNA.exportJSON())` clean, `name` preserved |
| server write-back | `DNA.create` → debounced POST → `dna_sequences.json` on disk has the entry with its `name` |
| shared collection | wipe localStorage, reload → `hydrate()` pulls the collection back from the server file, mirror rewritten |
| local session wins | create during load → `hydrate()` does not undo it; the new entry POSTs and merges |
| server rejects junk | non-JSON / wrong shape → 400, file unchanged; wrong path → 404 |
| the keyboard, unchanged | 26/26 keys still pick; CAT / SAM typed and accepted end to end; reset restores all 26 targets |
| console | clean on a fresh load (the missing-file GET now answers 200, not 404) |

**Not yet run on a physical Quest.** The flight is a port of v6.2's, verified on
a Quest at v6. On-headset judgement calls, all `CFG` knobs: the present beat
(`presentDist` / `presentSize` / `presentHold` — does the hero butterfly read
against the busy keyboard, or does the keyboard need to dim during it?); the
name-tag size and how tight it sits (`tagAngular` / `tagBodyDrop` / `tagJitter`);
the collection's orbit (`col*`); the framerate with a dozen extra butterflies
(`maxCollected`); and, **v8**, the base-colour texture — `wingColRandAmt` /
`wingColPeriod` (does the mirror-fold banding read as wing patterning or as
noise?), and whether the noisy texture with trilinear mipmaps muddies acceptably
at 2.6–4.3 m or wants `generateMipmaps = false` + `minFilter = LinearFilter` in
`wing-colour.js`.

## Known gaps

- **Framerate.** Scene weight is ~260 objects against a 180 budget already (see
  below); each collected butterfly adds ~4. `CFG.maxCollected = 12` is
  provisional pending a 72 Hz check — bump toward 20–30 only if it holds. The
  sanctioned release valve is cutting the keys' decorative lattices (~70
  sprites) and ghosts (~35) in `style.js`, which earlier `VERSION.md`s call not
  load-bearing.
- **The wing-texture ceiling.** `Wings.MAX_UNIQUE` is 64 and the 26 keys hold 26
  of those slots for good, so past ~36 *distinct* collected names a live wing
  could be redrawn under it by the LRU. `maxCollected` above ~36 needs a
  deliberate `MAX_UNIQUE` bump in `wing-tex.js` (the cache layer, not the
  parity-locked math) — out of scope here. **v8's colour cache is separate**
  (`WingColour`'s own LRU, `maxCollected + 4`), so it does not eat shape slots —
  but raising `CFG.maxCollected` needs `MAX` in `wing-colour.js` bumped in step.
- **One writing station.** The server does last-writer-wins on the whole
  collection blob. Fine for one keyboard, one visitor at a time (the Outline's
  model). Two headsets writing at once would need a merge-by-id or a per-entry
  append.
- **Audio.** `sounds/` and `versions/to_implement_audio/` exist; v7 does not
  wire sound.
- **The narrative.** Still a dev-facing build — no intro beat, no attract loop.

## Scene weight

~260 objects at rest (v6.2's count) **plus up to `CFG.maxCollected` × ~4** — a
body plane, two wing planes, one name-tag sprite each, no per-letter typography.
At 12 that is ~308. Collected butterflies keep `frustumCulled` on and fly
further out, so the ones behind you do not draw. `alphaTest` materials do not
batch, so that is roughly the draw-call count. v8 adds no objects — the colour
texture is a second `map` on the wing material that already existed — and ≤2 MB
of GPU texture (`WingColour`'s 16-slot LRU × 128 KB), generated once per name on
a free frame like the wing shape.
