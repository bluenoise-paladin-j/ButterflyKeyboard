# Butterfly Keyboard — v8.2

**v8.2 refines the reveal.** Same nine-ish beats as v8.1, tuned on feedback: a **`charge`**
beat is prepended — ~1.8 s after **accept** where *nothing appears at all*, just the room
receding and the name hanging there, so the butterfly's arrival lands as a reward; the
arrival is now a **bloom** (scales up from nothing with a half-sine overshoot and a burst
of the visitor's letters) rather than a rise from below; the shed wake letters and the
launch burst **tumble** as they move; the caught name is **blasted downward** at launch
(and no longer vanishes early — the reset that disposed it raced a wall-clock timer);
the small name tag stays hidden until the butterfly has **joined the kaleidoscope**; and
the room's dim floor is raised (`revealDim` 0.28 → 0.42) with a slower return so it reads
as a fade, not a jump. Edits to `collection.js`, `reveal.js`, `keyboard.js`, `ui.js`,
`config.js`; no new files; generation, parity, DNA path, keyboard interaction and
persistence all untouched. See `VERSION.md` and "The reveal" below.

**v8.1 art-directs the reveal properly.** v7.2 gave the grown butterfly two beats —
rise, hover flat and breathing, fly away. v8.1 makes it **eight**, ~12.5 s, with a
**still beat at the centre of it**: arrive → settle → greet → still → coil → launch →
soar → orbit. The rest of the room **recedes** around the hero (it fades to 0.42 *and*
slows to 0.35×, and the decorative type and the two controls go entirely), the departure
becomes a real **launch** — an anticipation, a 1.6 m shot upward, a barrel roll unwinding
to nothing — and it sheds a **wake of the visitor's own letters** on the way up. At the
launch instant the name hanging in front of the visitor **flies apart** while the one
under the butterfly stays. One new file (`js/reveal.js`) plus edits to `collection.js`,
`keyboard.js`, `ui.js` and `config.js`; the generation, parity, DNA path, keyboard
interaction and persistence are all untouched. See "The reveal (v8.1)" below.

**v8 adds the base-colour generator.** The visitor's grown butterfly now carries a
**per-name procedural RGB texture** on its wings — a faithful-look port of the last
unported TouchDesigner script, `existing_work/td_py/wingbasecolour_script.py`. A mirror-fold
gradient ramp, perturbed by an fBm field, coloured through a dark→bright HSV palette,
multiplied by a second palette-coloured fBm ("mottle"), finished with a complementary
overlay tint. **The 26 keyboard letters stay flat.** The generation stage is now complete:
a name → a wing *shape* and a wing *colour*, both deterministic from the same four values.
See "The base-colour generator (v8)" below.

**v7.2 art-directs the reveal.** When a name grows a butterfly it now runs a shaped
two-beat "here's your butterfly": it hovers **flat, wings square to the visitor** like a
pinned specimen with only a slow shallow wing-breath, then **flutters up and away into the
part of the kaleidoscope the visitor is looking at**, wings rising to a full beat as it
banks into the turn. v7/v7.1 presented a three-quarter view with a full flight beat and
slid to a random orbit slot. This is `collection.js`'s `present`/`joining` states
reshaped plus five `CFG.reveal*` knobs (and retuned `present*` timings) — the generation,
the DNA path, parity, the keyboard, the name tag and the persistence are all untouched.
Superseded by v8.1 — see "The reveal (v8.1)" below.

**v7.1** is v7 with one change: the name tag under a collected butterfly now hangs **right
below the body, tight against it**. v7 placed it against the model's *bounding box*
bottom, but the wing/body planes carry ~3× more transparent margin than shape, so the name
floated well below. It now uses `CFG.tagBodyDrop` — where the *painted* silhouette
actually reaches — and `ui.js` scans the rendered name canvas for its first inked row so
the visible top of the name lands there. Everything else — the generation, the collection,
the flight, the persistence, the server — is v7's. Section "The generation stage" below
still describes the whole thing.

Catching butterflies is typing. Twenty-six butterflies circle the visitor, one per letter;
reach toward one, pinch, and its letter joins the name floating in front of you. A green
shape confirms, a red one takes a letter back — and then the name **grows a butterfly of
the visitor's own**, which joins an accumulating kaleidoscope and stays there for the rest
of the exhibition. The room begins empty and fills up. Then the piece resets for the next
person.

v4's typographic collage with everything explanatory taken out of it, and the two controls
given real weight.

**v7 adds the generation stage.** Every version from v3 to v6.2 collected a name, fired
`keyboard:accepted`, and stopped. v7 turns that name into four generator values, grows the
butterfly, and keeps the collection — in the browser, and (behind `serve.py`) in a shared
file on disk. **The 26-key interaction is untouched**: `keyboard.js`, `interact.js`,
`hands.js` are v6.2's, bar one line. See `VERSION.md` and "The generation stage (v7)"
below.

**v6.1 is v6 (tested and working on the Quest) with selection made easier**, driven by
exhibition feedback: reaching out and pinching a specific butterfly was harder than it
should be, and the swarm's motion risked motion sickness. Nothing about the composition,
typography, or capture flow changed — see "Selection, made easier (v6.1)" below for what
did.

**v6.2 was a janitorial pass over v6.1** — three latent `NaN` bugs fixed (a partial
`CFG.arcSpan` collapsing the swarm; the blown-up highlight letter and the satellites, both
of which had rendered nothing since v6 because their `CFG` keys went missing), dead code
removed, the generation seam left ready. Nothing changed on a clean load.

**The keyboard scene is butterflies and the two controls, nothing else.** The scatter —
the words on their side, the rules, the giant letters, the alphabet ring — is deleted, not
disabled. v7 adds one thing to the room: the collection, a second, wider, non-pickable
cloud of butterflies further out (see "The generation stage").

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
  wing-colour.js    v8 — a name -> a base-colour texture (collection only; not parity-locked)
  name-dna.js       v7 — a spelled name -> four values (xmur3 hash)
  dna-store.js      v7 — the collection: made, kept, brought back (fork of web/)
  hands.js          usable data out of hand-tracking-controls
  config.js         every number the piece is built from
  style.js          the typographic decisions, made once per letter
  bfly-model.js     the mesh: one body plane, two wing planes on pivots
  ui.js             letter sprites, the cut-out wing glyph, the flower
                    clusters, and (v7) the name tag under a collected butterfly
  reveal.js         v8.1 — the room's dim/slow envelope, the launch's shove,
                    and the wake of shed letters
  keyboard.js       the swarm, the letters, capture, the name
  collection.js     v7 — the kaleidoscope that accumulates (not the keyboard)
  interact.js       reach / point / pinch -> highlight and activate
  app.js            v7 — the seam: name -> NameDNA.toValues -> DNA.create
tools/
  serve.py          static server + the collection write endpoint (v7)
  serve-https.py    TLS server, for testing on a Quest + the same endpoint
```

The parity harness lives in `web/tools/` and is not archived into a release — a snapshot
carries what it needs to RUN, not to be tested. `wing-gen.js` / `rolltable.js` /
`textures.js` / `wing-tex.js` here are byte-identical copies; if any is ever edited, edit
it in `web/` and re-run the harness there first. `dna-store.js` is a **deliberate fork**
of `web/`'s (see its header), not a sync target. `wing-colour.js` (v8) is a **faithful-look
port, not parity-locked** — it lives only here, has no `web/` counterpart, and its contract
is determinism from the name, not a bit-match with TouchDesigner (see "The base-colour
generator"). `tools/colour-preview.html` is its tuning aid.

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

**One deliberate exception (v8): the visitor's own butterfly.** Its wings carry a
procedural gradient-and-mottle texture (`wing-colour.js`) — the hero of the piece, and the
one thing that is *theirs*. The 26 keys and every other surface stay flat. See "The
base-colour generator (v8)".

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

## The reveal (v8.1)

The generation stage (below) always ran a beat on a freshly grown butterfly before it
joined the kaleidoscope. v7 presented a three-quarter view and slid to a random orbit
slot; v7.2 made it hover **flat**, wings square to the visitor, and leave into the part
of the flock they were looking at. **v8.1 gives that arc a shape.** `orbit` is still
untouched, and replayed butterflies still skip straight to it.

### Nine beats, ~14 s (v8.2 prepended `charge`)

| | |
|---|---|
| **hush** | `keyboard:accepted` fires and the room starts to recede — *before* the butterfly exists. That ordering is the point: it appears in a room that has already gone quiet rather than one that dims around it. |
| **charge** 1.8 s | **v8.2:** the held breath after **accept**. *Nothing new appears* — the butterfly is at scale 0, alpha 0, hidden. All that carries the beat is the room going quiet and the name still hanging in front of the visitor where they spelled it. The anticipation that makes the bloom land as a reward. |
| **arrive** 0.9 s | **v8.2:** the **bloom**. The butterfly scales up **from nothing** — past its held size on a half-sine overshoot, then settling exactly onto it — wings flinging open out of the loaded pose, while a ring of the visitor's own letters bursts outward and tumbles. Then straight into the flat breathing hold. |
| **settle** 1.8 s | Held flat, breathing. The name tag stays hidden. |
| **greet** 1.8 s | **Three deliberate deep flutters**, aimed at the visitor. |
| **still** 0.8 s | Nothing moves. |
| **coil** 0.4 s | It dips 8 cm, the wings draw up, the scale contracts to 0.93. |
| **launch** 1.1 s | A hard downstroke and it shoots up 1.6 m, barrel-rolling, shedding letters (which **tumble** as they fall — v8.2). The room is shoved outward; the caught name is **blasted downward** and falls away (v8.2), still visible into the soar. |
| **soar** 2.7 s | Decelerates and curves out to its orbit, the roll unwinding, the orientation slerping back to `presentRoll`. On the handoff the room fades **up** to meet it (v8.2) — the hero holds full brightness, so it never steps dark. |

Four things carry the whole moment, and none of them is an effect:

- **The charge beat (v8.2).** After **accept**, nothing appears for 1.8 s — the room
  recedes and the visitor's name just hangs there. No butterfly, not even a hint of one.
  The wait, and the empty space where the butterfly will be, is what makes the bloom a
  reward rather than a response to a button. A pop with no anticipation in front of it is
  just feedback.
- **The still beat.** In a scene where every object is always in motion, stopping is the
  loudest device available — and it is what stops the launch reading as a `lerpVectors`.
  It is also why the reveal has room to breathe: a pause only reads as a pause if there
  is space around it.
- **The pauses inside the greeting.** Each flutter moves for 0.38 s of its 0.60 s slot
  and then holds. Without the hold, three flutters in a row are just a faster breath and
  the gesture disappears entirely.
- **The anticipation.** It goes down before it goes up. Four tenths of a second, 8 cm, and
  the launch stops being a teleport.

### What must not break

- **`_flatQuat` and the flat pose.** The flight's `presentRoll` geometrically cannot
  present the wings to the visitor — there the butterfly is yawed to face them, the body
  axis points at them, and the wing plane (which contains that axis) can never face them;
  measured in the running scene, the aspect never tops ~0.18 at any roll. So the five
  **held** beats leave the group unyawed and orient the model with a direct look-at
  instead (wing normal → camera, head → **down**; head-up renders it upside down). All
  five share one `holdPose()` so that code is written once and cannot drift between them.
  Measured: **0.994–1.000** through `settle`, **0.999–1.000** through `still`. `greet`
  and `coil` dip to ~0.65 and ~0.59 because the wings are deliberately tilting — that is
  the gesture, not a regression.
- **The `soar → orbit` handoff.** At `u = 1` the lift, the bank and the roll are all
  exactly zero, and `tickSoar` writes the flight's own representation
  (`group.rotation.y = _joinYaw`, `model.rotation.set(rhoT, 0, 0)`) so `tickOrbit`
  continues with no pop. Verified: the position step across the handoff is 0.0168 against
  a typical frame's 0.0177.
- **`presentRoll` stays verbatim** from `keyboard.js`. The held beats do not go through it.

### `CFG.revealSpinTurns` must be a whole number

The barrel roll turns about the body axis, which flashes the wings edge-on twice a turn —
at launch speed that reads as a tumble. The total lands on the model as `turns × 2π`,
which is **the identity rotation only if `turns` is an integer**, and the handoff above
depends on that. At 1.5 the butterfly meets its orbit upside down.

It also has to **accumulate from zero** rather than decay to it. An earlier pass had the
angle start at its total and fall to 0 — the same speed profile, but the first frame of
the launch snapped the butterfly through most of a turn. The curve is `1 - (1-x)³`, not
`smoothstep`: what matters is the *rate*, and cubed is fastest at the instant of takeoff
and eases to a standstill as it meets the orbit. Smoothstep would start it *from* a
standstill, which is backwards for a launch.

### The isolation — `Reveal.dim` / `Reveal.slow`

v8's `VERSION.md` posed this as an open question: *"does the keyboard need to dim during
it?"* It does — but dimming alone leaves twenty-six butterflies still darting about
behind the one thing the visitor is meant to be looking at. So there are three ramps off
one envelope:

| | |
|---|---|
| `revealDim` 0.42 | opacity of everything that is not the hero — keys, their letters and leaders, and every other collected butterfly and its tag. **v8.2: was 0.28**, which against the white sky read as fully gone, so the return looked like a jump from nothing. 0.42 keeps the room visibly present but clearly backgrounded. |
| `revealSlow` 0.35 | a **ceiling on the keys' `timeScale`**. One line in `updateSlowField()`, riding the slow field v6.1 already built and tested on-headset, so it is eased both ways for free |
| `deco` | the same envelope taken all the way to **0**, for the things that should go entirely rather than merely recede: the letters' ghosts and lattices (**76 sprites**) and the two controls, which are unusable during the beat anyway. The `(dim − revealDim) / (1 − revealDim)` remap tracks the new floor automatically. |

Down over 1.5 s, back up over 3.5 s (**v8.2: was 1.2 / 2.5**). The room recedes without
vanishing and returns on a slow enough ramp that the eye reads it as one deliberate fade,
not a second event.

**The floor is deliberately well clear of 0.** With the hero now isolated as much by
*motion* — it moves deliberately while the keys crawl at `revealSlow` and the rest drifts —
as by opacity, the room can afford to stay visible. Switched off outright, or dimmed so far
it reads as off, the return is a scene change rather than a fade.

Two implementation notes that are easy to get wrong:

- **`visible` must test the UNDIMMED alpha.** Both `dress()` and `render()` gate
  `group.visible` on `alpha > 0.01`; multiplying the dim in there pops the whole room off
  and back on as the envelope crosses the threshold.
- **`setDeco` is a scalar, not a switch.** The decoration fades, and only stops being
  drawn once it is already invisible. Flipping `visible` at a threshold pops a lattice
  sprite in at whatever opacity the threshold happened to land on.

### The wake — letters, not sparks

`reveal.js` keeps a pool of **28 sprites**, allocated once and reused for every visitor
forever, hung off `collection.js`'s unrotated root so letters are shed into **world
space** and stay where they fell. That is the difference between a wake and a tail. Eight
are thrown outward at the launch instant, then one every 0.055 s carrying a tenth of the
butterfly's velocity, until 0.9 s into the soar. They **sink** rather than rise, because
they are ink, and each one **tumbles** as it falls (v8.2 — `CFG.revealTrailSpin`, a random
angular velocity on top of the glyph's own typographic angle, bled off on the same drag as
the throw). Size is angular, on the same rule and clamps as the letters under the
butterflies, so the wake matches the swarm's type at any distance.

**v8.2 also fires a burst on `arrive`** — `CFG.revealArriveBurst` letters flung outward
from the same pool as the butterfly pops in, so the arrival and the departure rhyme.

Letters and not sparks for two reasons: **everything in this piece is a letter** (the
numerals went in v6, the satellites in v6.2), and there is no post-processing here to
make a spark out of — see "Flat, and how to keep it flat" above.

> **`UI.letterTex` caches on colour and is unbounded.** A per-visitor ink would add 26
> canvases per name and never free one — a real leak over an exhibition run.
> `Reveal.setName` **quantises the hue to 24 buckets** first, so the cache is bounded at
> 26 × 24 = 624 however many people pass through. Measured cold: 26 canvases for the
> first name, 598 by the thirtieth — flattening against the ceiling instead of climbing
> 26 a name forever. Any future caller of `letterTex` outside the fixed 26 has to do the
> same.

### The launch's shove

The takeoff publishes one radial impulse (`Reveal.shock`); both swarms watch `shockT` and
apply it on the frame it changes, so neither has to know about the other and the order
they tick in does not matter. It goes into the `offsetVel` spring that already exists for
hand-scatter, and the same spring reels them back — **no new physics**. Measured: a key's
offset goes ~0.08 m → ~0.37 m and decays. The distance is clamped at 0.6 m or a butterfly
sitting right at the launch point is flung. `CFG.revealShock = 0` disables it.

### The name handover

At the launch instant the visitor's name is in two places: hanging in front of them where
they spelled it, and lit under the butterfly. **The one in front is blasted downward and
fades; the one on the butterfly stays and leaves with it.**

`collection.js` fires `reveal:launch` on the takeoff frame; `keyboard.js` runs the exit
through a `sp.flyOut` branch in `tickUI` — the mirror of the `sp.flyFrom` fly-in that has
been there since v3, so letters flying *out* of the name is a rhyme rather than a new
idea. **v8.2: the burst goes DOWN, not up** — the butterfly shoots up, so its name is
thrown the other way, on an accelerating fall (`flyOut²`, `CFG.nameExitDrop` 1.3 m),
fanning outward from the word's centre (`CFG.nameExitSpread`) and spinning as it goes. It
runs over `CFG.nameExitTime` 2.0 s (was 0.9) so it is still falling while the butterfly
soars, instead of snapping away and leaving a gap before the small tag appears. The
scatter is still deterministic (`Style.forNameSlot`), so a name always comes apart the
same way.

**v8.2 also fixes the intermittent "name vanishes early" bug.** The reset that disposes
these sprites used to be a wall-clock `setTimeout(reset, nameExitTime·1000 + 150)` in the
`reveal:launch` handler — timed against the fly-out's *sim-clock* duration. On any frame
drop the timer fired while the letters were still mid-air and `syncName()` disposed them
(exactly the bug the "used to simply vanish" note below is about, reintroduced by the
timer). Now `keyboard.js` carries `_nameExiting`, and `tickUI` calls `reset()` the frame
every sprite reaches `flyOut >= 1` — sim-clock, so a frame drop just means the fall takes
a few more real milliseconds.

**`CFG.acceptResetDelay` is the last-resort fallback** (20000). The reset normally follows
the burst completing; the wall-clock timer only matters if no butterfly ever launches — a
backgrounded tab whose render loop is throttled so `collection.js` never drains its queue.
`reset()` is idempotent, so whichever path gets there first wins.

### The name tag arrives

v7.2 had the tag up from the first frame, so the butterfly was labelled before the
visitor had seen it. v8.1 wrote it on 0.6 s into `settle`. **v8.2 holds it back through
the entire reveal** — it fades in only in `tickOrbit`, over `CFG.revealTagFade`, once the
butterfly has joined the kaleidoscope. The reveal is about the butterfly; the label is
what it becomes once it is one of the many. Replayed butterflies are labelled immediately,
exactly as before: `c.tagAlpha` is 1 at spawn for them and 0 for the hero.

### The room fades back up, it does not step (v8.2)

When `soar` hands off to `orbit`, `c.hero` clears — and without care the just-joined
butterfly would fall under `Reveal.dim` (still ~0.28, mid-release) on that very frame and
then crawl back to full over `revealDimOut`, reading as a hard cut. `c.wasHero` keeps it
**exempt from the dim** until `Reveal.active` goes false (the envelope fully released), so
its brightness never changes on the handoff — the rest of the room fades *up* to meet it.

### Naming, and where the numbers live

`present*` is **where** it presents (a place: `presentDist`, `presentRise`,
`presentSize`, unchanged since v7). `reveal*` is **when** and **how** — the eight beat
durations and everything that shapes them. v7.2's `presentArrive` / `presentHold` /
`presentJoin` are gone.

Every one of the ~30 new keys has its literal default and a one-line note in
`config.js`, in the same change as its reader, and both `collection.js` and `reveal.js`
`console.error` any of theirs that come back undefined — the "config keys drift → silent
`NaN`" trap this build has hit three times.

All the reveal numbers are on-headset judgement calls.

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

## The base-colour generator (v8)

The wing **shape** is `wing-gen.js`, a parity-locked port of `wingtexgen_script.py`. v8
ports the sibling script, `wingbasecolour_script.py` (the TouchDesigner "BASE COLOR
GENERATOR v3"), into `wing-colour.js` — the wing **colour**. The generation stage is now
whole: a name grows both.

**What it paints.** A full-frame RGB texture, 128×256 (the shape slice), alpha a constant
1 — the wing shape supplies the cutout as a separate `alphaMap`, so `bfly-model.js` hands
the wing material *both* (`map` = colour, `alphaMap` = shape). Per pixel: a **mirror-fold
triangle-wave ramp** (`fold(a) = 1 − |(a·period)%2 − 1|`) in one of four kinds
(`horiz`/`vert`/`radial`/`circular`), **perturbed by an fBm noise field**, **coloured
through a dark→bright HSV palette** (2–3 stops around one hue), **multiplied by a second
palette-coloured fBm** ("mottle"), then a **complementary 1-D overlay tint** (multiply or
soft-screen, 50/50). All the character of `wingbasecolour_script.py`, ported operation for
operation.

**Two deliberate divergences from the Python** (the user's call):

1. **Name-driven, own PRNG.** The Python seeds numpy's PCG64 off an integer *atlas index*.
   Here the texture is the visitor's, so it is seeded off a hash of `entry.values` (FNV-1a,
   the same construction as `Wings.hashValues`) and drawn from **`mulberry32`** — the
   codebase's existing off-parity PRNG (`web/js/prng.js`). The RNG **draw order** is
   reproduced *exactly* — that order is the contract, and `wing-colour.js` carries the
   Python line references step by step — but the numbers are **not** bit-identical to a
   TouchDesigner bake. There is no TD colour reference or harness in the repo, and
   index-parity is meaningless once it is name-driven. The real contract, verified: **same
   `entry.values` → byte-identical texture, on any machine, across reloads.**
2. **Full-spectrum hue.** The Python centres every texture on a fixed `base_hue = 0.08`
   (orange) — every butterfly comes out warm. Here that centre is **name-derived across the
   whole wheel** (`nameHueFor`, the values reversed then hashed, so it is decorrelated from
   the draw seed). The Python's `+ jit(0.5)` jitter and everything keyed off `base_hue`
   downstream (palette spread, mottle palette, complementary overlay) follow it for free.

**Only the collection butterfly.** `collection.js:spawn()` calls `WingColour.forEntry(entry)`
and passes the texture as `BflyModel.build`'s **6th argument**; when it is present the wing
material's diffuse `color` is forced **white** (`MeshBasicMaterial` does `color × map`).
The 26 keys call `build()` with four arguments → the 6th is `undefined` → `map: null` →
they are untouched. The body keeps a **flat** colour, `hsl` at the name's base hue
(`col.hue`) so body and wings read as one hue family.

**Orientation.** The colour canvas is built with `u = col/(W−1)`, `v = row/(H−1)` and the
Python's final `rgb[::-1]` row-flip is **dropped** — that flip is only for TouchDesigner's
bottom-left texture origin. What matters is that `map` and `alphaMap` share `WingGen`'s
top-left pixel layout so they line up under the wing plane's UVs. Verified with a forced
`vert` ramp (runs fore→hind along the body) and `horiz` (root→tip across the wing).

**sRGB.** The colour `CanvasTexture` **is** `SRGBColorSpace`-tagged (`colorManagement` is
on — the documented "Flat" trap: untagged, a solid colour comes back a stop lighter). The
wing `alphaMap` is **never** tagged. Two textures, two rules, one material.

**Memory / cache.** `WingColour` keeps its **own** small LRU (`CFG.maxCollected + 4` = 16
records, 128 KB each), deliberately *not* routed through `Wings`' 64-slot cache — that
would halve the shape budget and its in-place redraw could mutate a live *key* wing.
Eviction redraws the LRU tail in place; safe because with the +4 margin the tail is always
a stale, non-live record (`collection.js`'s on-screen set is a subset of the newest
`maxCollected` entries, which are also the most recently built here). Raising
`CFG.maxCollected` past ~12 needs `MAX` in `wing-colour.js` bumped too — same note as the
`Wings.MAX_UNIQUE` ceiling.

**Knobs** (`config.js`, `CFG.wingCol*`): `wingColRandAmt` (0.5 — the Python's `Randamt`,
scales every jitter draw; 0 leaves only the name hue varying), `wingColPeriod` (1.0 — the
Python's `Period`, a *minimum*; the draw skews it upward, so bands are the norm),
`wingColRampType` (`'random'` — the per-name pick; the pick is *always drawn* even when
overridden, for determinism). `tools/colour-preview.html` is a tuning grid — a dev aid, not
needed to run.

## The generation stage (v7)

`keyboard.js` still fires one event and knows nothing beyond that:

```js
window.dispatchEvent(new CustomEvent('keyboard:accepted', { detail: { name: nm } }));
```

Everything downstream is three new files and a handful of small edits. `interact.js` and
`hands.js` are still v6.2's, untouched. `keyboard.js` was v6.2's plus one line in v7 (the
bare `3200` reset delay became `CFG.acceptResetDelay`); **v8.1** adds six small edits to
it, all for the reveal's isolation and the name handover — the flight, the capture states
and the picking are still v6.2's.

### The chain

```
name  --app.js--------------->  NameDNA.toValues(name)   ->  [v,v,v,v] in -1..1
      --DNA.create(values,{name})-->  a stored entry  +  'dna:committed'
      --collection.js------------>  a butterfly flown into the kaleidoscope
```

`app.js` is the whole seam and does nothing else. `name-dna.js` is the mapping.
`dna-store.js` is storage. `collection.js` is the scene.

### name → four values — `name-dna.js`

The Outline's open question, now settled. `NameDNA.toValues(name)` cleans the name to
A–Z, seeds an `xmur3` hash off the whole string, and takes four draws — four decorrelated
values in −1..1. A string hash **is** the mapping the Outline asks for: **stable** (same
name, same butterfly, on any machine) and **well spread** (a full avalanche per step,
length-independent, so "ANNA"/"ANA"/"NANA" diverge and a 2-letter name spreads as widely
as a 12-letter one). It is deliberately not a legible letter-to-parameter correspondence —
the brief asks only for deterministic and distinct.

Not to be confused with `keyboard.js:dialsForLetter(i)`, which hashes a letter's *index*
so the 26 keys look different. This hashes the whole *name*, for the one butterfly the
visitor takes away. Both end at `Wings.forDials(dials in 0..1)`; the name path goes
through `DNA.toDials`, which maps −1..1 → 0..1 and **wraps** (the roll chains are cyclic),
so a uniform hash needs no clamping.

### the collection — `dna-store.js` + `collection.js`

`dna-store.js` is a trimmed fork of `web/js/dna-store.js`. The four-slot capture buffer is
gone (that was for a narrative filling it at four beats); `DNA.create([v,v,v,v], { name })`
is the only entry point. The stored entry is TouchDesigner's schema exactly, plus a `name`
key it ignores. An in-memory `cache` array is the synchronous source of truth behind the
`Store` seam, so `DNA.sequences()` never blocks whatever the backing store is doing.

`collection.js` (`AFRAME.registerComponent('butterfly-collection')`) owns the grown
butterflies:

- **It is not the keyboard.** Collected butterflies are never in `keyboard.js:targets()`,
  so `interact.js` structurally cannot pick or highlight them — the Outline's "cannot be
  selected or captured" needs no code of its own. They carry a **name** (`UI.nameTag`),
  not a letter.
- **"Here's your butterfly."** A freshly committed butterfly runs a scripted beat before
  it joins the swarm. v7 had three states (`present` → `joining` → `orbit`); **v8.1 has
  eight** — `arrive` → `settle` → `greet` → `still` → `coil` → `launch` → `soar` →
  `orbit`, ~12.5 s. Only fresh commits do this; replayed butterflies spawn straight into
  `orbit`. Everything before `orbit` is scripted rather than the ambient flight, and
  `separate()` skips all of it for free because it only ever touches `orbit`. The
  keyboard resets off `reveal:launch` rather than a timer. See "The reveal (v8.1)" above
  for the whole thing.
- **Their own shell.** The 26 keys sit at 1.0–2.4 m — a tuned band that took three rounds
  of on-headset selection work (see the selection sections above). The collection flies
  further out and taller (`CFG.col*`, ≈2.6–4.3 m) so it reads as the kaleidoscope around
  you and the keyboard stays the near, actionable layer. Full circle regardless of
  `CFG.arcSpan`.
- **Flight is a port of `keyboard.js:tickKey`** — `pathAt`, the offset spring, flap-glide,
  heading/bank, `presentRoll`, `separate` — with the capture states, the slow-field and
  the per-key clock stripped out. `keyboard.js:tickKey` is the **source of truth**: a
  flight bugfix there has to be mirrored in `collection.js`. Copied rather than shared
  because factoring it out would mean editing the most-tuned file in the piece, and the
  two flights genuinely differ. The file-global helpers (`makeNoise`/`makeFbm`/
  `smoothstep`/`rand`/`UP`) are reused from `keyboard.js`, which loads first — hence
  `<script src="js/collection.js">` sits **after** `keyboard.js` in `index.html`.
- **`presentRoll` is required**, not optional — the collection orbits through eye height,
  and a butterfly there without the roll solve is an edge-on twig (see "The presentation
  roll"). v7.2 gave it an optional third argument (the target aspect) so the reveal can
  present flatter than the flight; the no-argument path is the flight's solve unchanged.
- **A committed entry is enqueued, never built in the event handler.** `dna:committed`
  fires *synchronously* inside `keyboard.js`'s tick (`accept()` → `app.js` → `DNA.create`
  → `emit`), and generating a wing mid-tick hitches. `tick()` drains the queue ≤2 per
  frame, like `web/js/swarm.js`. `dna:changed` triggers a full reconcile against
  `this.collected` **and** `this.queue` (a change arriving between a commit and its spawn
  otherwise double-queues).
- **Colour** — v8: the wings are a **procedural texture** (`WingColour.forEntry`, see "The
  base-colour generator" above); the **body** stays flat at the name's base hue
  (`col.hue`), keys' white-tuned `CFG.bflySat`/`bflyLit`. **Size is random**, not from the
  name: identity is carried by the wing silhouette, the texture and the hue, and a name
  that hashed to a tiny size would be a permanent bad outcome.
- **The name tag** (`UI.nameTag`) is drawn the way the keyboard sets the caught name:
  every letter its own small angle, rise and colour, the wonk deterministic off the stored
  id (so a name keeps its layout across reloads, but two visitors with the same name
  differ). One canvas, one sprite. It hangs **right below the body, tight against it**
  (v7.1): `collection.js:render()` passes `CFG.tagBodyDrop * s` as the drop point.
  `tagBodyDrop` (−0.135 per unit model size) is where the *painted* silhouette actually
  reaches below the butterfly's centre — the wing/body planes carry ~3× more transparent
  margin than shape, so the geometry's bbox bottom (what v7's `tagCling` scaled) is far
  below the visible butterfly. `nameTagTex()` scans the rendered canvas for its first
  inked row so `nameTag().place()` lands the *visible* top of the name on the drop point —
  the padded canvas edge sits well above it, and the padding varies with how far the
  per-letter jitter threw a letter, so a fixed offset was always a little loose. **Never faded with
  distance** — the name is the visitor's record and has to stay legible however far the
  butterfly wanders. (An earlier pass faded it past a few metres; that is what made a
  drifting butterfly look "unlabelled".)
- **The cap.** `CFG.maxCollected` (12) is how many *render*. Over it, the oldest leaves
  the *scene* only — its `DNA` record is kept, and it returns on reload or if the cap goes
  up. `Wings.MAX_UNIQUE` is 64 and the 26 keys hold 26 of those texture slots for good, so
  `maxCollected` much past ~36 needs a deliberate bump there (the cache layer, not the
  parity-locked math).

### persistence — localStorage now, a shared file behind `serve.py`

`DNA._store` is the seam the whole thing turns on. localStorage is the **offline mirror**,
written every change. The server file `dna_sequences.json` is the **authority**:

- `Store.hydrate()` GETs it on load; if the server answers, that is the collection.
- `Store.write()` POSTs the whole collection back, debounced ~800 ms, and keeps mirroring
  to localStorage.
- No server (`file://`, a static host, `serve.py` down) → both fetches fail quietly and
  it is localStorage-only, per-origin, exactly as a pre-v7 build would have been.
- `hydrate()` will not overwrite a collection this session has already added to
  (`dirtiedLocally`) — the visitor in front of you always wins, and their butterfly is on
  its way to the server anyway.

Why it matters: localStorage is **per-origin**, so without the shared file the headset
(`https://LAN:8443`) and the desktop (`http://localhost:8123`) hold completely separate
collections, and clearing the headset's browsing data wipes the whole exhibition with no
backup. The file on disk is one collection everyone reads, and something you can copy to a
USB stick.

`serve.py` / `serve-https.py` gained a `do_POST` (writes the file atomically — temp file
+ `os.replace`, under a lock) and a `do_GET` that answers an empty collection instead of a
404 before the first butterfly. `serve-https.py` also had a long-standing broken block at
the top (`HERE` referenced before assignment — a `NameError` at import); v7 deletes it.
The server is **one writing station** — last-writer-wins on the whole blob, which is the
Outline's model (one keyboard, one visitor at a time). Two headsets writing at once would
need a merge.

**`?reset=1`** in the URL wipes the collection on load — the localStorage mirror, the
in-memory cache, and the server file — and stops that load's `hydrate()` bringing anything
back. Read once, not persisted. For clearing test butterflies, or resetting between
exhibition days on a headset where there is no console.

### traps this stage has to respect

- **`CFG` keys and silent `NaN`.** Three v6.2 bugs were `CFG.*` that the code read but
  `config.js` never defined → `NaN` → rendered nothing → invisible on the Quest. Every v7
  key has its literal default in `config.js` in the same change as its reader, no
  `CFG.x || fallback` in the new files, and `collection.js` `console.error`s any of its
  keys that come back undefined.
- **`this.name` on a component** silently unregisters its `tick()` — `collection.js` uses
  `this.collected`.
- **`dna:committed` is synchronous inside the tick** — enqueue, do not build.
- **The name tag is a colour canvas → `srgb()` it. The wing `rec.tex` is an alpha map →
  never.** v8: the base-colour texture (`col.tex`) is also a colour canvas → `srgb`-tagged
  (by `wing-colour.js`); it and the alphaMap sit in the *same* wing material.
- **A backgrounded browser tab pauses A-Frame's render loop**, so `collection.js`'s queue
  will not drain and nothing flies in until the tab is visible again. This is expected
  browser behaviour, not a bug; it bites automated testing, where the fix is to pump
  `sceneEl.tick(t, dt)` manually. **v8.1 gives it a second face:** the keyboard's reset
  now hangs off `reveal:launch`, which a stalled queue never reaches — hence
  `CFG.acceptResetDelay` surviving as a generous fallback.
- **A synthetic clock and a `setTimeout` disagree** (v8.1, testing only). Pumping
  `sceneEl.tick` in a tight loop advances the scene by seconds while real time barely
  moves, so a real-time reset timer fires long after the beat it belongs to — or, if a
  test stubs `reset()` out to hold the name still for a screenshot, `this.done` stays
  true and the *next* `accept()` silently short-circuits. Both cost a confusing half hour
  during v8.1's checks.
- **A WebGL canvas loses its drawing buffer after compositing** (v8.1, testing only), so
  a single `renderer.render()` followed by a screenshot captures a blank frame. Run a
  render-only animation loop instead — repainting every frame, never ticking — and the
  scene sits frozen on the beat you stopped at.
