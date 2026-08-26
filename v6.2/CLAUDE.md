# Butterfly Keyboard — v6.2

Catching butterflies is typing. Twenty-six butterflies circle the visitor, one per letter;
reach toward one, pinch, and its letter joins the name floating in front of you. A green
shape confirms, a red one takes a letter back, and the piece resets for the next person.

v4's typographic collage with everything explanatory taken out of it, and the two controls
given real weight. Still no dev panel, no DNA store and no generation stage — confirming a
name fires one event and stops.

**v6.1 is v6 (tested and working on the Quest) with selection made easier**, driven by
exhibition feedback: reaching out and pinching a specific butterfly was harder than it
should be, and the swarm's motion risked motion sickness. Nothing about the composition,
typography, or capture flow changed — see "Selection, made easier (v6.1)" below for what
did.

**v6.2 is a janitorial pass over v6.1** — three latent `NaN` bugs fixed (a partial
`CFG.arcSpan` collapsing the swarm; the blown-up highlight letter and the satellites, both
of which had rendered nothing since v6 because their `CFG` keys went missing), dead code
removed, the generation seam untouched. Nothing changes on a clean load. Full detail in
`VERSION.md`. The blown-up letter and the satellites were **removed**, not revived — they
were absent for the whole v6 exhibition run, so the sections describing them are gone from
this file.

**Nothing is in the scene but butterflies and the two controls.** The scatter — the words on
their side, the rules, the giant letters, the alphabet ring — is deleted, not disabled.

**Nothing in the scene is a word or a rectangle.** No instructions, no captions, no keyline.
The only written thing left is the alphabet, set on its side. If reaching at a butterfly and
watching it light up does not carry the interaction, a sentence hanging in the air was never
going to.

## Layout

```
index.html          scene + script tags
js/
  rolltable.js      GENERATED — 180 baked uniforms  ]
  wing-gen.js       the generator                   ]  v2, unchanged.
  textures.js       body alpha, base64              ]  Parity with TouchDesigner
  wing-tex.js       dials -> a THREE texture        ]  is held in web/ — do not
  hands.js          usable data out of hand-tracking-controls
  config.js         every number the piece is built from
  style.js          the typographic decisions, made once per letter
  bfly-model.js     the mesh: one body plane, two wing planes on pivots
  ui.js             letter sprites (idle / highlight / name), the cut-out wing
                    glyph, and the two flower clusters
  keyboard.js       the swarm, the letters, capture, the name
  interact.js       reach / point / pinch -> highlight and activate
  app.js            what happens after the name is accepted (the v4 seam)
tools/
  serve.py          static server
  serve-https.py    TLS server, for testing on a Quest
```

The parity harness lives in `web/tools/` and is not archived into a release — a snapshot
carries what it needs to RUN, not to be tested. `wing-gen.js` here is a copy; if it is ever
edited, edit it in `web/` and re-run the harness there first.

## Passthrough

`XRMode: xr` offers both buttons. **AR** keeps the room; **VR** is the black void. Three
things make AR work and all three are in `index.html`:

- `hide-on-enter-ar` on the `<a-sky>`, or the black sphere covers the camera feed;
- `ar-hit-test="enabled: false"` — A-Frame adds a floor placement reticle by default and
  this piece has no use for one;
- `webxr="optionalFeatures: hand-tracking, ..."` rather than leaving it to the browser to
  infer from the hand entities.

The sky is **white**, not black, so the desktop view and a lit passthrough room look like
the same piece. Nothing in the UI has a background to hide behind, so everything carries its
own contrast as flat ink: grey letters, a darker caption, and two saturated shapes.

## The interaction

Two ways to pick, in order:

| | |
|---|---|
| **touch** | the index fingertip is inside a butterfly's sphere — wins outright |
| **point** | otherwise, a ray from the index knuckle through the fingertip |

Most of the swarm is further away than an arm, so pointing is the normal case and touching
is the bonus. The ray tolerance is a **cone**, not a fixed radius (`CFG.pickBase` close in,
`CFG.pickAngle` opening with distance): a fixed radius makes a butterfly four metres away
almost unhittable, and one wide enough for those turns a near one into a blob.

**The controls win.** The two shapes are the only fixed things in the room and they sit
inside the swarm's orbit, so a butterfly drifting across the green one must not steal the
pick — the visitor would be unable to finish until it moved on.

Activation is the pinch **edge** with two thresholds (`pinchOn` / `pinchOff`). A single
distance chatters across the boundary and fires repeatedly.

Desktop: hover and click drive the same code path, and letter keys / Backspace / Enter work
as a testing convenience. The piece itself never needs a keyboard.

## Selection, made easier (v6.1)

The cone above is a fixed geometric budget, already tuned right up against a hard
ceiling — neighbours sit about 0.6 m apart, and slack much past a quarter of that turns
several of them into one unhittable blob, a regression already found and fixed once (see
`CFG.pickBase`/`pickAngle` further down). So v6.1 does not touch it. Instead it fixes the
three things that were actually making real hand tracking hard to select with, none of
them geometric:

- **The ray's own origin was the noise source.** v6 cast from the index knuckle through
  the fingertip — a ~3cm baseline, so a few millimetres of finger curl *while closing a
  pinch* swung the aim by tens of degrees: the single most common miss was being visibly
  on a butterfly right up until the frame the pinch committed. This is exactly what
  Meta's own hand-pointing model (the ray Quest's system UI casts) avoids, by anchoring
  the ray near the **shoulder** instead of the hand. There is no tracked shoulder joint,
  so `interact.js:shoulderOf()` estimates one each tick from the camera pose —
  `CFG.shoulderDown` below the headset, `CFG.shoulderOut` to the side along the camera's
  flattened (yaw-only) right axis, mirrored per hand — and the ray runs from there
  through the fingertip. A ~60-80cm baseline means the same finger curl swings the aim
  by a couple of degrees, often less than the pick cone's own slack. Measured directly:
  a realistic ~2.7cm pinch-close curl that puts the OLD knuckle-anchored math 0.70 m off
  axis against a 0.27 m tolerance (a clean miss) leaves the new shoulder-anchored ray
  still on target. The line drawn for the user still visually starts at the fingertip —
  only the invisible point used for picking moved.
- **Residual jitter.** `hands.js` deliberately publishes raw, unfiltered joint
  positions — that's correct, filtering belongs one layer up. `interact.js` keeps a
  per-hand exponential moving average of the fingertip the ray is aimed through
  (`CFG.aimSmoothTau`, in `tick()`), used for the ray pick only — touch stays on the raw
  fingertip (it's a deliberate close-range action, not the noisy long-range case), and
  the desktop mouse pointer has no jitter to smooth.
- **What the shoulder ray doesn't fully remove.** Activation only ever fired if a
  target was picked on the exact frame the pinch crossed its threshold.
  `interact.js` remembers each hand's last hot id and when (`lastHotId`/`lastHotAt`); a
  pinch's rising edge with nothing picked that exact frame still activates the
  remembered target if it was hot within `CFG.pickGraceMs`. **Butterflies only** — the
  two controls keep the exact old behaviour with no rescue, since a wrong accept/delete
  costs more than a missed letter, and they're fixed in place and easier to hit anyway.
  `keyboard.js:activate()` already re-validates a key's state before capturing, so a
  stale rescue (already captured by the other hand, mid-flight out) just silently
  no-ops.

**The line now literally connects.** It used to be a fixed-length segment gesturing along
the pointing direction; now, whenever something is picked, its endpoint is that target's
exact live position (not a projection along the ray — the shoulder anchor above means the
ray's own origin is no longer where the line is drawn from, so the endpoint is set
directly rather than derived from the ray math), so what you see is exactly what would
activate. It still visually starts at the fingertip, same dark, subtle ink (`0x12121a`),
same opacity behaviour — only the invisible picking origin moved. A successful catch also
gives the line a brief opacity flash (`CFG.flashTime`) that eases back down — pure
opacity on existing geometry, no new meshes, no glow, matching "Flat" below.

**A hot butterfly, and its neighbours, fly calmer.** Exhibition feedback flagged the
swarm's motion as a motion-sickness risk. Rather than slow the whole swarm at all times —
v6's cruising flight is already tuned and tested on-headset, and stays untouched —
`keyboard.js:updateSlowField()` eases a hot key's `timeScale` down to `CFG.slowHot`, and
eases nearby keys down too on a falloff (`CFG.slowRadius`), releasing back to 1 once
nothing is pointed there (`CFG.slowEase` controls how gradual both directions are — a
snap would be its own small motion-sickness risk). Each key carries its own accumulated
clock, `k.flightT`, incremented by `dt * k.timeScale` instead of tracking the scene clock
directly — this is what lets a slowed key's orbit, wobble noise, wingbeat, and glide/flap
burst cycle all calm down together, in `tickKey()`, rather than the body slowing while the
wings keep beating at full rate. At `timeScale` 1 (everywhere nothing is hot) `flightT`
tracks the scene clock exactly, so this is byte-for-byte v6's flight until something is
reached for. Hand-repulsion/scatter and the neighbour-separation spring are deliberately
**not** rescaled — both are `dt`-based physical reactions, and a slowed butterfly still
has to be able to react instantly if a hand brushes it, or it would read as stuck. This
also has a selection side-effect worth knowing: a target barely moving while hot is far
more forgiving of both the ray-jitter smoothing and the pinch's commit-frame perturbation
above, so the three fixes reinforce each other.

## Selection, round 2: memory instead of a wider cone

After trying the pass above on-headset, three things remained: neighbouring butterflies
(~0.6 m apart, cones that genuinely overlap at that spacing) still got confused for each
other, the two controls still got triggered by a reach that only grazed them, and the
pinch itself sometimes just didn't register. None of this is a job for the shared cone —
that ceiling is exactly the one described above, and the "closest pair 0.17 m apart, 26/26
self-pick" check in `VERSION.md` is what a further tightening would put at risk. So this
round adds *memory over time* and shrinks two *specific* targets, rather than touching the
shared budget.

**Hover lock.** `interact.js:pickFlySticky()` — butterflies only, hands only, called
alongside (not instead of) `pickRay`'s panel check, so "the controls win" and the mouse's
plain `pick()` are both untouched. Once a hand has a hovered butterfly (`p.lockId`), a
competing candidate only steals it by clearly beating its score (`CFG.hoverLockMargin`, a
fraction of the tolerance width) or by being the *same* better challenger for
`CFG.hoverLockMs` running. A target the ray has plainly left (`score >= 1`) releases with
**no delay** either way — the lock only ever resists switching inside a genuine overlap
band. This also stabilises the grace window from the pass above for free: `lastHotId` is
set from whatever the lock returns, so it inherits the same steadiness.

*A bug worth not rediscovering:* the two "still winning" branches reset
`p.lockChallengeAt = -Infinity` but originally left `p.lockChallengeId` stale. A later
frame where that same challenger id reappeared saw `lockChallengeId === best.id` already
(so the timer never restarted) while `lockChallengeAt` was still `-Infinity` — and
`now - (-Infinity)` is always `>= hoverLockMs`, so `sustained` came back true on a single
fresh frame instead of after a genuine `hoverLockMs` of consistently losing. Caught by a
synthetic symmetric-tie test that flickered every 5-7 frames instead of holding; the fix
clears `lockChallengeId` alongside `lockChallengeAt` in every branch that isn't an active
challenge.

**The controls stop being "fallen onto."** Their own pick **radius**, not just the cone's
slack, turned out to be the dominant term: the accept blob's pick radius was ≈0.29 m, the
delete blob's ≈0.23 m — both already bigger than a typical butterfly's own (`0.20 * size`,
0.09–0.21 m). `keyboard.js:targets()` now shrinks a control's *picking* radius by
`CFG.panelPickShrink`, decoupled from its visual size (which is untouched, everywhere
else); `interact.js:pickRay()`/`pickTouch()` also give panel targets their own, tighter
slack (`CFG.panelPickBase`/`panelTouchRadius`). Combined, a control's total tolerance
drops from ≈0.35–0.45 m to ≈0.19–0.22 m — tighter than a typical butterfly's, so "the
controls win" (still an unconditional rule) only matters when one is genuinely aimed at.

**Making the pinch itself register.** `rig.pinch` (hands.js, raw thumb-index distance) is
noisiest exactly as fingers occlude each other from the headset's own cameras — i.e.
exactly at a real pinch — and the absolute thresholds may not fit every hand. Two changes
together: `p.smPinch` EMA-smooths it (`CFG.pinchSmoothTau`, about half `aimSmoothTau`
since activation should still feel immediate — this only needs to bridge one bad sample,
not damp sustained jitter), and `pinchOn`/`pinchOff` both widened by the same 5 mm
(preserving the hysteresis gap, just shifting where it sits) — smoothing alone can't fix a
signal that's systematically a little wide right at occlusion. The small added lag before
`closed` flips is fine by the same logic the grace window already relies on: it looks
*backward* from the pinch frame, so a few ms of *forward* delay before that frame arrives
doesn't compound with it.

**The slow field, sharpened.** `slowHot` lower (0.25) and `slowRadius` wider (1.10), plus
a new `CFG.slowFalloffPow` biasing the falloff curve to stay close to `slowHot` near the
target and drop off more steeply near the edge, instead of `smoothstep`'s roughly-linear
middle (`keyboard.js:updateSlowField()`). Deliberately *not* flattening nearby neighbours
down toward the hot target's own speed — a near-stationary neighbour is an *easier*
accidental ray target than one still visibly drifting, so the contrast between "the hot
one" and "everything else nearby" has to stay legible; the goal is calming the immediate
neighbourhood's own flight noise, not equalising speeds.

## Selection, round 3: forgive the tracking, gate the touch

Round 2 on-headset left two things: the pinch still sometimes didn't register, and it was
still too easy to accidentally select a neighbour. Both traced to code round 2 never
touched — this round doesn't widen `pinchOn`/`pinchOff` again (that would make an
accidental touch read as a deliberate pinch, working against the second complaint), and
doesn't touch the shared cone either.

**Tracking-loss forgiveness.** `interact.js:tick()`'s untracked branch used to reset
`closed`/`smPinch`/`pinchInit`/`lockId`/`lastHotId`/etc. unconditionally on a **single**
untracked frame — and Quest hand tracking commonly loses confidence for a frame or two
exactly as fingers occlude each other, i.e. exactly at a real pinch, discarding a pinch
already in progress before it could complete. None of round 2's smoothing runs on an
untracked frame at all (it's inside that same early-return), so it was structurally blind
to this. Now a dropout under `CFG.trackLossGraceMs` (200ms) just hides the ray line
(honest about not knowing where the hand is) and otherwise holds every value exactly where
it was; only a dropout that outlasts that window does the original full reset. Verified
directly: through a brief (~50ms) synthetic dropout, `closed`/`smPinch`/`lockId` are
byte-identical before and after and the lock re-acquires with zero delay; through a
sustained (300ms) one, everything correctly returns to its reset defaults.

**Touch dwell.** `pickTouch()` itself is untouched (same nearest-within-`touchRadius`
scan) — but it used to win outright over the now-stabilised ray/hover-lock on a **single
frame** of proximity, with no memory at all. A hand travelling through the swarm toward an
intended target routinely passes within touch range of unintended neighbours en route; any
one of those could instantly steal the pick. A touch now has to be the *same* nearest
target continuously for `CFG.touchDwellMs` (120ms, about half `hoverLockMs` since physical
contact is already a stronger intent signal) before it's allowed to override
`panelPick`/`flyPick`. Losing touch range releases the candidate instantly — no dwell on
the way out, matching hover lock's own "plainly left → no delay" convention. Bonus effect:
a graze that never clears the dwell window no longer becomes `picked`, so it can no longer
pollute `p.lastHotId` either — the grace window can't be tricked into rescuing a butterfly
the hand only brushed past.

**An accept confirmation.** Pressing accept used to get the exact same press-bounce as
delete, then the whole panel immediately dimmed — not distinct enough to read as "that
worked." Two changes, both fired from `accept()`, both reusing the identical spring math
`tickUI()` already runs for button scale (no new colours, no glow — state via colour/size
only, never softness): `bump()` gained an optional `kick` parameter so accept can pass a
bigger one (`CFG.acceptConfirmKick`, roughly 2× the shared `CFG.ctlKick`; delete's call
site is byte-identical to before), and a second spring instance (`this.confirmScale`/
`confirmVel`) pulses the caught name itself, multiplied into `this.nameScale` everywhere
it's read. Measured directly against the real running springs: an ordinary press peaks at
1.35×; accept's button peaks at 1.79× and the name at 1.77×, essentially in lockstep —
bigger in *amplitude*, not *tempo*, so it reads as "the same bounce, bigger," and the name
— the thing actually being confirmed — visibly responds too, not just the button.
`reset()` snaps the name pulse back to its rest state for the next visitor even if caught
mid-ring-down.

**A smaller UI.** `CFG.blobW`/`blobH` walked back from `0.200/0.176` to `0.160/0.140` —
not a guess: `versions/v4/js/config.js` shipped `blobW: 0.155, blobH: 0.140`, the actual
prior size this file's "much bigger than v4's" was contrasting against, and a size already
proven not to blob-lump. A genuine ~20% area reduction from where v6.1 started, while
v6.1's own larger per-control `k` multipliers (1.26 accept / 1.02 delete, vs v4's 1.12/
0.90) still carry over unchanged, so accept still reads moderately bigger than v4's ever
did — a real shrink, not a full revert. No compensating change needed to `ctlGap` (cluster
half-widths only get *more* clearance, not less, once the shapes shrink — verified: 0.53m
combined half-width against `ctlGap`'s 0.82m). The shrink also tightens round 2's pick
math further (a happy accident, verified: accept's ray tolerance ≈0.22m → ≈0.19m, delete's
≈0.19m → ≈0.16m) — reinforcing "too easy to accidentally select" on top of that round's own
fix. Whether the six lobes still read as six lobes rather than one blob-lump at this size
is an on-headset judgement call CLAUDE.md's own earlier warning about this only poses
qualitatively — arithmetic can't settle it.

## Flat, and how to keep it flat

No blur, no bloom, no gradients, no soft glow anywhere. Every surface is one solid colour:
`MeshBasicMaterial` with an `alphaMap` and `alphaTest`, and canvases painted with flat
fills. If something needs to stand out it changes **colour or size**, never blurriness.

Two things this depends on:

- **Canvas textures must be tagged `SRGBColorSpace`.** three.js assumes no colour space on a
  `CanvasTexture`, so with A-Frame's colour management on it reads the bytes as linear and
  encodes them again on the way out. Every flat fill comes back a stop lighter and visibly
  desaturated — a solid red draws as pink, which is exactly what happened. `ui.js:srgb()`
  tags them. Only the **colour** canvases: the wing and body maps are alpha, read straight
  off a channel, and must stay unconverted.
- **The butterfly palette is tuned for white.** v2's `72% / 63%` was chosen against a black
  void and washes out completely against white; `CFG.bflySat` / `CFG.bflyLit` are `88 / 48`.

## The highlight is on the letter, not the butterfly

Recolouring the highlighted butterfly is the obvious move and is wrong twice over. Against
white the only colour with enough contrast to mean anything is black, which reads as
switched off rather than chosen; and in a dark passthrough room it disappears outright.

So a highlighted letter is **knocked out of a solid disc in its butterfly's own colour** and
grows by a third, and the butterfly grows by `CFG.hiScale` and keeps its colour — which is
the point of having twenty-six different ones.

Every letter carries its butterfly's colour: under the butterfly, in the highlight disc, and
in the name once it is caught, so the name in front of you is visibly made of the ones you
picked. The hue is the wing's, at full chroma but `CFG.letterLit` darker — a wing is a
silhouette and a letter is type, and type at the wing's own lightness is unreadable on white
for a good third of the wheel.

The type is Helvetica Neue with the usual grotesque fallbacks (Roboto on a Quest), at weight
500 and never heavier. Nothing is fetched — no font asset, no network on the critical path.
Letters sit close under the body, far enough to clear the hindwing and near enough that a
butterfly and its letter read as one object.

## The three traps this build hit

- **`this.name` on an A-Frame component unregisters its own `tick()`.** A-Frame keys its
  behaviour registry off `component.name`. Assigning to it drops the component out of the
  tick loop silently: everything builds, nothing animates, no error. The name being spelled
  is therefore `this.typed`.

- **A click is latched, not sampled.** A real mousedown/mouseup pair often lands inside one
  frame, so a tick that reads the button's *level* sees nothing. The press sets a flag the
  next tick consumes. The cursor is also read **on the press**, not only on the move, or a
  press with no preceding move is tested against screen centre.

- **`hand-tracking-controls` pins its entity to the origin** every frame — `js/hands.js`
  reads the joint matrices directly instead. This is v2's file unchanged; its own header
  has the details.

## The presentation roll — the one departure from v2's flight

The body is a side-on silhouette plane and the wings are a plane **perpendicular** to it, so
the two can never both face you: whenever the wings spread across your view the body is
edge-on. A butterfly orbiting at eye height is therefore seen exactly edge-on and reads as a
twig. Fine for v2's ambient swarm; useless for a keyboard you have to read.

Roll the model by `rho` about its own body axis and the wing plane's visibility works out to
`|cos(rho + beta)|`, where `beta` is the angle of the camera in the plane perpendicular to
the body. So there is always a roll that presents the same three-quarter aspect, wherever
the butterfly is and whichever way round it is flying. `presentRoll()` solves for it every
frame and takes the branch closest to upright.

The flap is folded into that solve, because the wing pivots turn about the same axis: the
flap is biased half a radian upward, and without compensating, the whole swarm sits half a
radian off target.

`CFG.readRoll = 0` restores v2's look exactly.

## Everything else in one place

The UI is two things: the caught name, hung off-centre on a slope, and the two clusters
below it. They are deliberately unequal in size, not level with each other, and each carries
its own tilt in the plane **and** its own cant in space — two matching shapes side by side at
the same angle is a button bar, and the piece has spent six versions not being one.

**Scale is a spring, not an eased value** (`CFG.ctlSpring` / `ctlDamp` / `ctlKick`). A press
calls `bump()`, which kicks the *velocity*; the spring pulls back, overshoots because it is
under-damped, and rings down over about a second. An eased lerp approaches from one side only
and can never overshoot, so it cannot bounce however it is tuned.

`config.js` holds every number — the swarm bands, the noise, the pick tolerances, the
capture timings, and every position in that composition. There is no dev panel, so there is
nothing to open in a headset and one file to change.

## The typography

`style.js` gives every letter its own angle, size, place on a circle around its butterfly,
and a few flags — mirrored, hollow, carrying a hairline leader, ghosted, wearing a lattice.
All of it is **deterministic**, seeded off the letter's index, which matters for an
exhibition: the
composition is wild but it is the *same* wild composition every session, so it can be
judged and signed off rather than re-rolled in front of an audience.

Angles are **quantised** rather than free. A composition where every angle differs by a
degree or two reads as sloppy; one built from a short list of angles reads as deliberate,
which is what the reference work does.

Two things this depends on:

- **The type hangs off its own anchor, not off the flying group.** The flying group yaws to
  face the butterfly's heading, so a letter thrown sideways inside it swings a full circle
  round the body every time the butterfly turns. Each key has a second, unrotated group that
  tracks position only.
- **`SpriteMaterial.rotation`** turns the sprite in screen space, so a letter can be thrown
  to any angle and still face the camera. Nothing is billboarded by hand, nothing is ever
  edge-on.

**The pick target is still the body.** However far a letter is thrown, the type is
decoration on top of a target that never moves relative to what you are aiming at — checked
by aiming dead-on at all 26 after ten seconds of flight.

**Everything is a letter.** An earlier pass used numerals for the far scenery and for
satellite marks hanging off the butterflies, and they were the one thing in the build about
something other than the alphabet, which is the only subject the piece has. All of it is
gone — the scatter was deleted in v6, the satellites in v6.2.

**The letter is cut out of the wing** (`ui.js:punchLetter`) and then FILLED. The hole is
punched through the first pair of wings, and a second pair sits inside it carrying only the
glyph (`ui.js:letterMask`) in a colour of its own — deliberately never the wing's and never
white, thrown far enough round the wheel that the two never sit next to each other, with an
odd step so twenty-six of them do not repeat. Same geometry and same pivots, so it flaps
with the wing it belongs to, nudged a hair along the plane normal so two coplanar meshes
cannot argue about depth.

Punched, not printed: the butterfly is holed in the shape of the letter it carries, twice,
because the far wing is the same texture mirrored. The generated slice is an opaque canvas
read as an alphaMap off the green channel, so **filling the glyph with black is the whole
operation** — no compositing modes, no premultiplied-alpha surprises. The slice is drawn
with the body axis vertical and the plane's UVs turn it ninety degrees, so the glyph goes in
sideways to come out upright on the butterfly.

**Echoes.** About two in five letters repeat behind themselves at falling size and opacity.
Not all of them — on twenty-six it stops being an accent and becomes a texture. They fan
further out while a letter is chosen, so the highlight moves the type as well as colouring
it.

The highlight is otherwise just the letter knocked out of a disc in its butterfly's colour
plus a `CFG.hiScale` size bump — see "The highlight is on the letter, not the butterfly"
above. (v4 also struck the chosen letter two metres tall behind its butterfly; that never
worked past v4 — its `CFG` keys were dropped — and v6.2 removed the dead code.)

## The controls are flowers, and they never hold still

`ui.js:blob()` builds **six overlapping lobes** around a centre, each its own triangle fan
whose rim is recomputed from harmonics every frame. Overlapping opaque circles in one flat
colour read as a union without anyone computing one — there is no boolean here, just lobes
drawn on top of each other, sharing a material so a state change is one colour write.

They have to sit far enough out to read as separate lobes: pulled in tight they merge into
one lump and the flower turns back into a blob, which is what the first pass did.

On top of that `tickUI()` floats each cluster a couple of centimetres on two periods that do
not divide into each other, turns it, and breathes its scale.

Geometry rather than a canvas for two reasons. Deforming a *drawn* shape means redrawing and
re-uploading a 256×256 texture every frame — a quarter of a megabyte per shape per frame to
say what a hundred vertices say for nothing. And geometry is exactly flat: one solid unlit
colour with no texture anywhere in the path, so there is nothing to soften it and no colour
space to get wrong.

**Saturation is pinned at 100 and the lightness band is narrow.** State is carried by
lightness alone, a couple of stops at a time. The first pass lifted `off` to a pale tint to
say "nothing to accept yet" and it just made both shapes look washed out for most of a
visit — the keyboard starts empty, so `off` is what people see first and longest. Green sits
darker than red at full chroma or it glows next to it.

The pick sphere **follows the shape as it drifts**, not the point it was hung from, so a
shape that has floated 2 cm is still where you are pointing. Verified both ways: aiming at
the live position and at the original anchor both land.

The life in the rest of the UI is in `tickUI()` too — each letter drifts on its own slow
phase and swells in as it arrives.

The swarm orbits at `radMin`..`radMax` = **1.0 m to 2.4 m** horizontally, which puts every
butterfly 1.0–2.6 m from the eye: a lean and a reach, not a walk. `radMin` is deliberately
outside the UI at `panelR` 0.8 m so nothing flies through the name.

Three worth knowing:

- **`CFG.arcSpan`** is `2*PI`, v2's full orbit. That means only about a quarter of the
  alphabet is in front of you at any moment and spelling a name involves turning around.
  Setting it under `2*PI` — 3.4 rad is a good first try — makes the butterflies sweep back
  and forth across an arc in front of the visitor instead. Same flight, same noise; all 26
  stay findable. Measured over 20 s at 3.4: the worst butterfly reaches 94° off centre and
  none goes behind. `k.centre` / `k.swing` (the per-key arc slice) are read from
  `CFG.arcSpan` in `buildKeys`, so change it in `config.js` before load, not live.
  (v4–v6.1 left those two unset and any `arcSpan` under `2*PI` produced `NaN`; fixed in
  v6.2.)
- **`CFG.pickBase` / `CFG.pickAngle`** are the cone. Separation holds neighbours about
  0.6 m apart, so slack much past a quarter of that stops feeling like aiming. Checked by
  aiming dead-on at all 26 across 30 s of flight: 26/26 pick themselves, with the closest
  pair 0.17 m apart.
- **`CFG.captureTime + CFG.goneTime`** is how long a letter is unusable, currently ~0.95 s.
  A key is pickable again the moment it starts flying back in, because a keyboard where the
  letter you just used has gone cannot spell ANNA.

## The seam to v4

```js
window.addEventListener('keyboard:accepted', function (e) { e.detail.name });
```

`js/app.js` is the only file that knows a name means anything. Generation replaces the body
of that listener; nothing else in v3 changes. The outline's open question — how an n-letter
name maps onto the generator's four values, stably and well spread — is still open.
