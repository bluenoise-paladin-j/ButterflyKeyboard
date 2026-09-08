# v8.7 — the wing SHAPE's fit in its slice, 8 September 2026

Serve this folder and it runs. `tools/` is the two servers, two dev tuning pages —
`tools/shape-preview.html` (new) and `tools/colour-preview.html` — and
`tools/knobs.html`, a reference for every adjustable constant in the build.

```bash
python3 tools/serve.py 8123        # then http://localhost:8123/
python3 tools/serve-https.py 8443  # for a Quest, over the local network
```

v8.3–v8.6 were all about the wing's **colour**. v8.7 leaves the colour alone and
goes back to the **shape** — specifically to the complaint that some wings come out
too small.

## What was actually wrong

The wing was not too small. It was drawn too small **in its slice**, and it wasted
the slice in two different ways at once. Measured over 4000 spelled names:

| | |
|---|---|
| **outward** (across the slice) | the wing reached a median **0.59** of its budget, and never more than 0.90 — the frame is sized for a worst case no single roll comes near |
| **along the body** | the extent is lopsided. A deep hindwing under a shallow forewing — `up 0.42` against `dn 1.05` — is typical, so a scale anchored at a **fixed seam** is limited by the long side while the short one leaves the top third of the frame blank |

Between them the painted wing filled **10–39% of the slice, median 21%**. On the
butterfly that is a sliver of wing on a plane mostly full of nothing.

## The fit stage

After the outline is built, `fitPlan()` measures it and returns two numbers:
a **uniform scale about the body root**, and a **shift of the seam** onto the middle
of the wing. The row/col mapping in `drawWing` applies both.

**Nothing upstream moves.** `expand()`, `forewing()` and `hindwing()` are
byte-identical to v8.6 and still match the Python parameter for parameter — the roll
table, the dial chains, every clamp and control point are untouched. The shape is
the same shape; only how much of the slice it is drawn at changes. `wingFitFill = 0`
and `wingFitSeam = 0` give v8.6's rasterisation back exactly.

### Uniform, not per-axis

Fitting x and y independently fills more of the frame still, but it stretches wings
by up to **2.4:1**, and a stretched wing is a different wing. Uniform plus the seam
recentre gets almost the same coverage with no distortion at all — and it **narrows**
the size spread, because the wings with the most headroom are exactly the small ones.

| policy | p05 | med | p95 | spread |
|---|---|---|---|---|
| v8.6 | 14.2% | 21.5% | 30.3% | 2.13 |
| uniform fit, seam fixed | 20.7% | 33.8% | 53.0% | 2.56 |
| **uniform fit + seam recentre** | **33.1%** | **48.0%** | **62.9%** | **1.90** |
| per-axis fit + seam recentre | 45.2% | 57.6% | 68.9% | 1.53 (stretched) |

Note the second row: a fit with the seam left where it is makes the spread *worse*.
A wing can be small in area and still touch the frame — that is the lopsided case —
so without the recentre the fit hands most of its gain to wings that were already
big. **The seam recentre is what makes this fix the small ones.**

## Measured, rasterised, over 500 names

Polygon area is a ranking; these are painted pixels.

| | p05 | med | p95 |
|---|---|---|---|
| v8.6 | 14.1% | 20.9% | 29.2% |
| **v8.7** | **31.2%** | **43.0%** | **54.9%** |

The **smallest** wing v8.7 draws is now bigger than the **biggest** wing v8.6 drew.
Median area a little over doubles, which is ×1.44 on each edge.

Nothing clips: over 600 names the tightest clear margin is exactly `wingFitMargin`,
and the count of wings touching the frame edge is zero. The clamp is structural —
the gain is applied *after* the headroom is computed and then capped by it, so no
setting of any knob can push a wing off the slice.

## Knobs

| key | default | |
|---|---|---|
| `wingFitFill` | 0.80 | 0..1 of the per-wing headroom to take. **This is the one that lifts the small wings**: headroom runs 1.09× on a wing that already fills the slice up to 2.20× on one that does not |
| `wingFitSeam` | 1.00 | 0..1, how far to slide the fore/hind seam onto the middle of the wing. Where most of the headroom comes from |
| `wingFitGain` | 1.05 | flat multiplier on top, for the overall lift. Still clamped by the headroom |
| `wingFitMargin` | 2.0 | pixels of slice left clear on every side. Mip headroom, not a safety margin — the outline is exact. Costs 0.6 points of fill against 1px |

`wingFitFill` 0.80 with `wingFitGain` 1.05 is already within half a point of a full
fit (43.0% against 44.5%), so there is little left above it; the room is below.

## Two things downstream that had to move with it

- **`wing-colour.js`'s wing region.** `WX0..WY1` is the static box the composition
  is aimed at, and the fit stage changed the answer: the painted box went from
  x 0.00–0.59 / y 0.46–1.77 to **x 0.00–0.85 / y 0.07–1.93**. Left at v8.6's numbers
  the composition would aim at the middle of a wing that now reaches well past them.
  Widened to match; the rng sequence is untouched, so each name keeps its palette,
  its pattern and its blend modes and only the placement moves.
- **`wing-tex.js`'s cache key.** The fit knobs change the pixels, so they are in the
  key. Without that, tuning them would be served a stale texture.

## …and then the wing plane came down to pay for it

A bigger wing in the slice is a bigger butterfly in the room, and at v8.6's plane size the
kaleidoscope read as **busy**. So `BflyModel`'s `WING_PLANE` — the wing plane's chord,
relative to the body plane — is cut **0.85 → 0.64**, which puts the painted wing back at
its v8.6 size in metres. The room is no busier than it was; what it gains is the *shape*
of the wings, not their bulk.

**The factor is measured on the scene, not on the generator.** Sizing it off the
spelled-name distribution gives 0.595 and is wrong by 10%: 26 of the ~40 wings in the room
are the keyboard's, and `dialsForLetter` draws a different distribution from the name hash —
the keys already had fuller wings, so the fit stage had less to add to them. Read off every
wing texture live in the running scene:

| | v8.6 | v8.7 |
|---|---|---|
| mean painted ink | 0.1575 | 0.2786 — **1.77× the area** |

`0.85 × sqrt(1/1.769)` = **0.639**. Verified back in the running scene at 0.64: painted
area **1.003×** v8.6, along-body extent 0.987×, outward extent 0.916×.

**Area is the criterion**, because "busy" is how much of the view is butterfly. The two
extents cannot both be matched at once — the fit stage makes a wing proportionally *fuller*
inside its own bounding box, not merely bigger — so a v8.7 wing is a touch shorter and
about 8% narrower than a v8.6 one, at the same painted area.

### Why not `CFG.sizeMin` / `colSizeMin`

Because `size` is the unit half a dozen tuned constants are quoted in — the pick radius
(`keyboard.js`: `0.20 * k.size`), the per-wingbeat bob (`0.01 * size`), `CFG.tagBodyDrop`,
the letter's placement. Scaling the size bands would have silently shrunk every one of them
by 30%, **including three rounds' worth of selection tuning**. Scaling the plane leaves
`size` meaning what it has always meant, so all of them stay valid with no edits at all.

It also leaves the **body** alone, which the size bands would not have. The fit stage grew
the wings and nothing else, so taking it back out of the wings and nothing else is what
actually restores v8.6 — scaling the whole model would have left the body 30% small.

`CFG.wingPlane` (default 0.64) is the knob. **This, not the size bands, is what to move if
the butterflies want to be bigger or smaller from here.**

## `CFG.tagBodyDrop` was checked, not assumed

The name tag hangs where "the painted silhouette reaches below the butterfly's
centre" (−0.135 per unit model size), so a wing reaching 44% further outward is an
obvious candidate to have broken it. Measured: **`BODY_ALPHA`'s ink bottoms out at
−0.1407**. The constant is set by the **abdomen**, not the wings, and v8.7 does not
touch the body. Left alone.

## The slice is still 128 × 256

Unchanged, and it did not need to change — the wing was using a fifth of the pixels
it already had. **The texture the generator outputs is 128 px outward from the body
by 256 px along it** (1:2, ~128 KB as RGBA), and the base-colour texture beside it is
the same 128 × 256. Three meshes and two 128×256 textures per butterfly.

## Also new: `tools/knobs.html`

Every adjustable constant in the build in one searchable page — 200 of them across
eleven files, each with what it does, its shipped value, and the file and line to find
it on. Filter by name or by file; the twelve rows v8.7 introduced or moved carry a rail
down the left.

It is **generated**: edit the table in `tools/build-knobs.py` and re-run
`python3 tools/build-knobs.py`, never the HTML. The table is written by hand on purpose —
the useful half of each entry is the one-line explanation of what the number *does*, and
no parser recovers that from `sizeExp: 1.4`. The cost is that **line numbers go stale**;
they are a convenience and the name is what to search for if one has moved.

## Also new: `tools/shape-preview.html`

The shape's equivalent of `colour-preview.html`. A slider per knob, v8.6 drawn beside
v8.7 for every wing, the slice-fill distribution recomputed live over 2000 names, and
a second view that assembles both wings on the **real body texture** so the fit can
be judged where it matters — whether the wing sits on the butterfly, not whether it
fills a rectangle.

Two things that view got wrong before it was right, both worth not rediscovering:
`BODY_ALPHA` is an opaque white-on-black mask, so drawn over a white wing it shows
nothing at all (key the black out and tint it), and the body's ink sits near one edge
of its own square — `bfly-model` shifts the plane by `-s*0.63` to bring it level with
the wings — so the square has to be placed by its **measured ink centroid**, not
centred.

## What changed

`js/wing-gen.js` (the fit stage and its header note), `js/config.js` (five keys),
`js/wing-tex.js` (the cache key), `js/bfly-model.js` (`WING_PLANE` 0.85 → 0.64),
**one constant line of `js/wing-colour.js`**, `tools/shape-preview.html` (new), and the
two page titles. The reveal, the flight,
the DNA path, the keyboard interaction and persistence are untouched.

**Every wing in the scene changes shape-fit on next load** — the 26 keyboard
butterflies included, since they go through the same generator.
