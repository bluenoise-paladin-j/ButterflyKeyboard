# v9 — the kaleidoscope answers, 8 September 2026

Serve this folder and it runs. `tools/` is the two servers, the two dev tuning pages
(`shape-preview.html`, `colour-preview.html`), `knobs.html` — the reference for every
adjustable constant — and, new in v9, `reach/`, a headless harness for the interaction
this version adds.

```bash
python3 tools/serve.py 8123        # then http://localhost:8123/
python3 tools/serve-https.py 8443  # for a Quest, over the local network
sh tools/reach/run.sh              # the new interaction, tested without a headset
```

v8.3–v8.7 were all about the wing — its colour, then its shape. v9 does not touch either.
It is about what the room **does** once it has butterflies in it.

## What was actually wrong

Nothing was broken. The piece just stopped after the reveal — and once it did not, three
things about the room turned out to be in the way. All four are in here.

A visitor spelled their name, watched their butterfly bloom, greet them and launch into the
kaleidoscope — and that was the end of the interaction. Everything after it was **scenery**:
twelve butterflies orbiting a room, unreachable by construction. `collection.js` had no
`targets()` at all, so `interact.js` could not see the collection even in principle. The
one thing every visitor wants to do with their own butterfly — get it back, look at it, have
it come to them — was the one thing the piece could not do.

## The interaction

Pinch one of the orbiting butterflies, exactly the way you pinch a letter. It leaves its
orbit and comes to you. What happens when it arrives is decided entirely by what your hands
are doing:

| | |
|---|---|
| **a flat palm, turned up, held up** | it lands on it, and stays for `perchDwell` (12 s) |
| **anything else** | it hovers in front of your face for `hoverDwell` (7 s), then goes |
| **the palm turns, drops or closes** | it goes, on that frame |
| **a palm goes up while it is hovering** | it goes to it |

And while it is coming, **nothing else in the room is pickable** — not the letters, not
accept, not delete. Reaching for a butterfly flying at your face means putting your hand
through the whole keyboard, and every letter it passes was a live target.

Four new states in `collection.js` — `summon`, `perch`, `hover`, `leave` — built exactly the
way the reveal's eight beats are, so they are skipped by `separate()`, are not pickable
while they run, and hand back to `tickOrbit` through the same representation the soar
lands on.

**There is nothing to learn and nothing announced.** The whole grammar is *hold your hand
out and it will come to it*, which is what people already do around butterflies. Discovery
is free: the butterfly comes to your face whether or not you know about the hand, and
putting one up while it is hovering there redirects it immediately.

## Three things this needed, in order of risk

### 1. The palm — `hands.js`

`hand-tracking-controls` pins its entity to the origin (the note this build has carried
since v2), so `hands.js` already read the joint matrices itself. v9 reads five more of them
and publishes a posture:

```
rig.palm         world position of the middle of the palm
rig.palmNormal   unit vector out of its front
rig.palmWidth    index knuckle to pinky knuckle, metres
rig.palmUp / palmFlat / palmRaised     the three raw conditions
rig.offering     all three, held and released on timers
```

**Everything geometric is quoted in palm widths or as a dot product, never in
centimetres** — a child's hand and an adult's have to read the same. Measured off the
joint model:

| | flat | curled |
|---|---|---|
| mean fingertip-to-wrist distance | ~1.9 palm widths | ~1.0 |
| mean fingertip offset off the palm plane | ~0.2 | 0.5–0.75 |

so `palmFlatExtend = 1.45` sits in the middle of a wide gap and is the test doing the work;
`palmFlatOffset` is a lenient backstop against a cupped hand, not a demand for a rigid
salute.

**The palm normal is handed, and getting it wrong is invisible.** Wrist→index-knuckle
crossed with wrist→pinky-knuckle points *down* for one hand and *up* for the other with the
palm in the same real-world orientation, so the sign is flipped per side. A sign error here
leaves one hand permanently unusable and the other permanently offering — and it cannot be
seen on a desktop at all. It is the first thing `tools/reach/test-palm.js` checks.

**Raised is measured from the headset, not the floor** (`palmRaiseBelowEye`). Visitors are
different heights and may be seated; "raised" means raised for them.

**A dropout is not a withdrawn hand.** `holdOffer` takes `palmHoldMs` (220) of the pose
before it counts as an offer and `palmGraceMs` (320) of its absence before it stops
counting. This is the same argument as `trackLossGraceMs` in `interact.js`, for the same
reason: Quest hand tracking drops a frame or two at a time, and a butterfly that took off
every time it did would never stay on anyone's hand.

### 2. The two swarms, and the pick between them — `interact.js`, `config.js`

`interact.js` now gathers targets from **providers** — the keyboard and the collection —
tags each target with the provider that owns it, and routes activation back there.
Its three layers are tested in a fixed order:

```
panel        the two controls. Fixed, inside everything else.
key          the 26 letters, on their low dome
collection   the kaleidoscope, on its high one above them
```

**But that was not enough, and the reason is worth writing down.** The collection used to fly
*inside* the letters' angular band — letters spanned −31° to +35° of elevation from the eye
and the collection −17° to +28° — so there was no direction in which a collected butterfly
did not have letters in front of it. With an absolute veto, **42% of attempts to pick one
were blocked by a letter that was merely nearby.**

Two changes, and they are both needed:

**The bands moved apart.** The letters became a low dome (`hgtMax` 2.30 → 1.95) and the
collection a high one, brought *closer* as well as lifted (2.6–4.3 → 1.7–3.0 m out, 0.8–3.0 →
2.2–3.1 m up). Closer and higher work together: at 1.7 m out it takes only 2.2 m of height to
clear the letters, where at 2.6 m it would have taken 2.9 — so the look-up is 19–42°, not the
36–52° the old radius would have forced, and the top of the band stays under a real 3 m
ceiling for passthrough. Apparent size was checked rather than assumed: at the new distances a
collected butterfly spans 4–18° of view against the keys' own 4–21°, so `colSize*` did not
need to move.

**And the key layer's veto became a margin.** A key's cone is enormous in angular terms —
20.3° wide for a big key at 1 m — against which the new bands buy a geometric gap of a
fraction of a degree at the very bottom of the collection's range. Monte Carlo over both
bands, 26 letters in the room, aiming dead-on at a collected butterfly:

| | a letter vetoes the pick |
|---|---|
| v8.7's bands, absolute veto | **42.0%** |
| new bands, absolute veto | 9.3% |
| **new bands + the margin** | **1.1%** |

The vetoing letter's own score was a median 0.65–0.77 — plain near-misses, which is what says
the margin is the right instrument rather than a wider cone. A key now keeps the pick unless
the butterfly beats it by `CFG.colBeatsKey` (0.45) on the same 0..1 score. A key actually
aimed at scores near 0 and cannot be beaten, so **spelling cannot break**: checked the other
way round over 6000 trials, **0 letters lost**. Verified against the running scene too, aimed
at each of the 26 live keys in turn: **26 of 26 still pick themselves.**

`pickBase`, `pickAngle`, `touchRadius`, the hover lock and the pinch thresholds are all
untouched. `keyboard.js` is untouched — its targets are still told apart by the `panel` flag
it already sets, and only the collection labels its own layer. `hgtMax` is the single number
v9 changes outside its own four files.

### 2b. Nothing else is pickable while it is coming

`butterfly-collection` reports itself **exclusive** through `summon`, `hover` and `perch`,
and `interact.js` then offers nothing but its own butterflies — so the letters and both
controls go dead, and visibly so: nothing highlights, rather than pinches being silently
swallowed. In the running scene that is 28 targets → 0, with a ray aimed straight at `accept`
picking nothing.

The lockout lifts the moment the butterfly turns for home, so a visitor mid-name waits about
twelve seconds rather than fifteen and the room returns while they are still watching it go.
Its own targets stay live throughout, so a pinch on a different butterfly still swaps which
one is coming — only the letters and the two destructive controls go away.

### 3. The four states — `collection.js`

**The approach is a cruise, not a lerp.** A lerp toward a target is fastest when it is
furthest away and crawls at the end, which is exactly backwards for something flying to
your hand. `summonSpeed` holds until the last `summonEase` metres and then eases down, so
it arrives settled rather than stopping dead. The first pass (0.55 m/s, easing over a full
metre to 0.16) took **8 s** from 3.7 m out — past deliberate and into waiting. At the
shipped numbers the same trip is **5 s**, and the furthest butterfly in the room reaches
you in about 6.5.

**It is re-aimed every frame**, at the palm if one is being offered and at a spot in front
of the visitor's face otherwise. Putting a hand up mid-flight redirects it; dropping one
sends it back to the hover spot. Neither is a state change.

**The sway is a velocity, not an offset.** The lateral wander that stops the approach
reading as a dolly move fades out as it arrives; added as a position offset it would step
the moment the fade factor moved, so it goes in as amplitude × rate × cos and integrates.

**And when it gets there with no hand out, it FLIES.** The first pass held it in the reveal's
flat pinned-specimen pose, wings spread square to the visitor — the one thing in a room full
of flight that was not flying, and it read as a diagram of a butterfly rather than a
butterfly. That pose is the hero's and stays the hero's. It now takes the ordinary flight
wingbeat, turns its body to follow its heading, and wanders left-right / up-down / in-out
about the held spot on the same fbm noise it flies its orbit with. Measured in the running
scene, the wing-to-camera aspect travels **0.08 → 0.53**; the flat pose sat pinned at 0.99.

Two things that cost a measurement each. The wander is applied to the **target**, with the
position lagging it — steering the position directly leaves the heading chasing noise. And it
has to **ease in**: the butterfly arrives within `summonArrive` of the un-wandered spot, but
the noise at that instant can be a full span away, so the target jumped on the first frame
and the lag chased it at **1.0 m/s** — a lunge toward a face 0.6 m away. Ramped in, the peak
over the whole wait is 0.36 m/s. `hoverRate` was then swept over the full 7 s wait: 20 buys
the widest swing (0.24 m side to side) at the same peak speed as slower rates, and past about
26 the peak climbs and it reads as darting.

**The resting pose is built directly, like the reveal's.** The wing plane (local +Y is its
normal) is laid into the palm plane and the head turned to the visitor — so the head is
parallel to the visitor direction *projected into the palm plane*, which is not the same as
the visitor direction and is why the harness checks the projection. The degenerate case is
real: a visitor looking straight down their own palm leaves no in-plane direction to point
at, and `_restQuat` falls back to a world axis rather than producing a NaN pose.

**A resting butterfly is not a still one.** It opens and shuts its wings every couple of
seconds, jittered so two never sync up. Without the flutter it reads as a sticker stuck to
your palm.

**And it sits BROADSIDE, not head-on.** The body is a single *plane* through the body axis,
so with the head pointed at the visitor they look straight down its length and it disappears
— two wings with nothing joining them. It now turns 60–70° across the view, drawn fresh on
each landing and to either side (both read as broadside; a fixed angle made every landing
identical). The turn is about the **palm's own normal**, which is what keeps the wings lying
flat in the palm plane however the hand is tilted — the harness checks that invariant at
every angle it draws.

**It hovers ABOVE the eye line**, not below. The name field hangs at −0.235 and the two
controls at −0.435 on a panel 0.80 m out; a butterfly holding station at 0.62 m *below* the
eye line sits directly in front of both. It could never steal their pick — a summoned
butterfly is not a target — but it would cover them. The reveal solved the same problem the
same way, with `presentRise`.

## Tested without a headset

Hand tracking cannot be reproduced on a desktop, and the landing is most of what v9 is. Two
things close that gap.

**SPACE toggles a synthetic palm** held out in front of the camera (`Hands`, `palmSim*`).
It is a real offer as far as everything downstream is concerned — same shape of answer, same
code path — so the whole approach / land / hold / leave arc can be driven and tuned on a
desktop. It only ever appears when no real hand is offering, and never inside an XR session.

**`tools/reach/`** runs the lot headless under JavaScriptCore (every Mac has one; this
machine has no node), against a maths-only THREE stub. **117 assertions**, about a second:

```bash
sh tools/reach/run.sh
```

It covers the handedness of the palm normal, every way of *not* offering a hand (turned
over, curled, lowered), the hold/release timers, the resting pose's axes and its degenerate
case, the broadside turn at every angle it draws, the whole four-state arc in both branches,
the hover's wander and wingbeat, the exclusivity lockout, `summonMax`, a 300 ms frame, the
handoff back onto the orbit, and the pick ladder — including a margin case taken straight
out of the Monte Carlo rather than contrived, because the first draft of that test passed
while there was in fact no letter in the way at all.

Two rules it earned the hard way, both from tests that passed for the wrong reason: **never
hard-code a beat's duration, wait on the state** (every fixed `frames(10)` went stale the day
the collection's band moved closer and the approach got faster), and **call the component's
own method, never a reimplementation of it** (the exclusivity test's first draft rebuilt the
target-gathering inside the test and passed while the real rule did nothing — which is why
`gather()` exists as a method at all).

The arc was then driven end to end in the **real engine** in a browser — real THREE, real
wing generator, real reveal — by spelling a name, letting the reveal run, and calling the
butterfly back: 6.7 s to cross the room, 0.7 s more to reach a palm raised while it hovered,
18 mm off the palm plane with the wing normal on the palm normal to 1.000, gone on the frame
the hand dropped, and back on its orbit at radius 4.06 with the path offset cleared to
0.000 m.

## What is not here

- **The 26 letter butterflies cannot be called over.** They are the keyboard; catching one
  spells a letter, and that is a different verb.
- **`summonMax` is 1.** Calling a second sends the first home rather than refusing — a pinch
  that visibly does nothing reads as broken tracking. Raise it if a room of them is wanted.
- **The name tag hangs under a perched butterfly**, which puts it over the visitor's palm.
  On a desktop it reads as a caption and looks right; in passthrough it will be written
  across a real hand. That is an on-headset judgement call, not something arithmetic
  settles — `CFG.tagBodyDrop` is where to move it.
- **The desktop letter keys are not locked out**, only the pointer is. `keyboard.js` owns
  that `keydown` handler and it is explicitly a testing convenience ("the piece itself never
  needs a keyboard"), so leaving it alone is what keeps `keyboard.js` byte-identical.
- **The residual 1.1%.** A letter can still occasionally veto a pick — it takes a letter
  genuinely close to the line, where the visitor could reasonably have meant either. Driving
  it to zero means either dropping the veto entirely, which risks the letters, or widening
  `colBeatsKey` past the point where it is still true that a key aimed at cannot be beaten.
- Still **not run on a physical Quest**. Every hand path here is verified against a
  synthetic joint model, which is the same standard v6.1's selection work was held to.

## Files

| | |
|---|---|
| `js/hands.js` | +the palm: `palmPose`, `holdOffer`, and the `Hands` module (offers, and the SPACE stand-in) |
| `js/interact.js` | providers, `gather()` with its exclusivity rule, the pick ladder and its margin |
| `js/collection.js` | `targets`/`setHot`/`activate`/`exclusive`, and `summon`/`perch`/`hover`/`leave` |
| `js/config.js` | one new block (45 constants), plus three moved bands |
| `tools/reach/` | the headless harness |
| `tools/knobs.html` | regenerated — 245 tunables |

`js/keyboard.js`, the generator, the colour and everything else are **byte-identical to
v8.7**. The single number v9 changes outside its own four files is `CFG.hgtMax`, the top of
the letters' flight band.
