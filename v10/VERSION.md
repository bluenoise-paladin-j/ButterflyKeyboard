# v10 — the guide, 9 September 2026

Serve this folder and it runs. `tools/` is the two servers, the two dev tuning pages,
`knobs.html` — the reference for every adjustable constant — and `reach/`, the headless
harness, which v10 adds a fourth suite to.

```bash
python3 tools/serve.py 8123        # then http://localhost:8123/
python3 tools/serve-https.py 8443  # for a Quest, over the local network
sh tools/reach/run.sh              # 193 assertions, about a second
```

v9 made the kaleidoscope answer. v10 gives the run a **session**.

## What was actually wrong

The piece had no start, no guidance and no end. A visitor put the headset on and landed in
a room that was **already fully interactive**, with nothing to say what to do — and nothing
to say when they were finished, so the next person inherited whatever the last one left. The
voice-over tracks exist; there was nowhere to put them, because there was no state machine
for them to be the voice of.

## The shape of it

Two new files, and **one new provider**.

| | |
|---|---|
| `js/voice.js` | the narration. One `HTMLAudioElement` per named cue, `.volume` for level, no AudioContext, no library. |
| `js/guide.js` | `session-guide` — the state machine, and the start flower. A provider exactly like `butterfly-collection`. |

```
   idle  --pinch the flower-->  welcome  -->  live
                                              |  ^
                                        quiet |  | any activity
                                              v  |
                                            wrapup
                                              | quiet
                                              v
    idle  <--  farewell  <---------------------
     ^
     |  headset doff / operator key, silently, from ANY state
```

**THE LOCKOUT IS v9'S EXCLUSIVITY, REUSED, and that is the whole trick.**
`interact.js:gather()` already lets a provider claim the room: when one reports itself
exclusive, nothing else is offered, so nothing else highlights and nothing swallows a pinch.
That is exactly "the letters fly but there is no interaction yet" — for free. Measured in the
running scene, idle: **30 pickable things in the room, `gather()` returns 1**, and it is the
flower. `keyboard.js`'s flight, capture and picking did not have to change for any of it.

## The start flower

`UI.blob()` — the same six-lobed cluster accept and delete are — at its own hue (**212**,
neither accept's 142 nor delete's 356), its own place (panel centre, between the name field
and the two controls) and clearly bigger than either (`guideBlobK` 1.60 against 1.26 and
1.02). In idle it is **the only pickable thing in the room**, so pointing anywhere lights up
one shape and nothing else: there is nothing to read and nothing to learn.

It is offered with `panel: true`, so it goes through the tuned, tighter panel pick path the
two controls already use — `panelPickBase`, `panelTouchRadius`, `panelPickShrink`, and "the
controls win" — and the desktop mouse picks it through the identical call.

**And accept and delete go entirely while no session is running.** One more factor on the
`setAlpha` line the reveal already drives: in idle there is nothing to accept or delete and
one flower to press, so two dim shapes hanging next to it are exactly the clutter that line
exists to remove.

## The spoken beats

Four recordings. **The opening is three of them**, played back to back as one cue.

| cue | fires | |
|---|---|---|
| `welcome` | the flower is pressed | *"Welcome to Kalei Identity."* — 1.9 s |
| `spell` | …then | *"Catch butterflies one at a time to spell your name. This will build the genetic code of your own butterfly."* — 6.7 s |
| `pinch` | …then | *"Start by pinching a selected butterfly to attract it towards you."* — 4.1 s |
| `recall` | **`reveal:joined`** | *"Now, find your butterfly in the kaleidoscope. Select it and hold out your palm facing down, and flat in front of you to interact with it."* — 7.8 s |
| `nudge` | 30 s of quiet | **not recorded** — the session runs silent |
| `farewell` | 15 s after that | **not recorded** — the flower coming back is the signal |

**A SEQUENCE IS ONE CUE as far as everything else is concerned.** `Voice.playing()` stays
true across the gaps, so the silence between two recordings is never mistaken for the
narration having finished: the room does not unlock early and the quiet clock does not start
counting mid-sentence. Driven against the real recordings in the browser: `welcome` ends at
**2.02 s**, `spell` at **9.04**, `pinch` at **13.44**, with gaps of exactly `voGap` 0.45 s
and `playing()` true throughout. **The opening runs 13.4 s.**

**The room is pickable from the first second regardless** (`guideUnlockAt` = 0), so a visitor
who already knows what to do never waits out thirteen seconds of narration.

The four tracks are **mono mp3, 395 KB in total**, copied into `audio/` from
`sounds/ai_voiceover/v1/` (which stays the master). mp3 needs no conversion — the Quest
browser is Chromium and plays it and m4a equally well; `.wav` is the only format worth
avoiding, purely on size.

`reveal:joined` is one new line in `collection.js`, the mirror of the `reveal:launch` that
has been there since v8.1: that one fires on the takeoff frame and hands the caught name
over, this one fires the instant the butterfly stops being the hero and becomes one of the
many — which is exactly what "you can call it back" is about. Replayed butterflies spawn
straight into `orbit` and never soar, so it only ever fires for a freshly grown one.

**Only the first of a session speaks.** A visitor who spells a second name has already been
told. Verified: `recall` on the first `reveal:joined`, nothing on the second.

## A missing track is a silent no-op that still finishes

The tracks are being cut separately and none of them exists yet. **The whole of v10 was
built, driven and tested with no audio in the build at all**, and that is a property of the
design, not a coincidence:

- `Voice.play` on a cue with no file returns false and fires `voice:ended` on the next
  tick, exactly as a real track would;
- no `Audio` constructor → the module is a no-op outright, which is what lets the harness
  drive the guide under JavaScriptCore;
- **nothing in the piece ever waits on audio.** The guide advances on state, and every wait
  it does have carries its own timeout.

**The unlock hangs off the Enter-AR click, and it has to.** Browsers refuse programmatic
playback until the page has had a real user gesture, and **a hand-tracked pinch is not
one** — it is our own threshold on a joint distance, invisible to the browser. So the
visitor pressing the start flower cannot authorise anything. What can, and always happens
first, is the click on A-Frame's Enter AR button: you cannot get into the piece without it.

## A hand turned OVER lands a butterfly too

The recall track asks the visitor to hold their hand out flat and palm **DOWN**. v9's offer
required the palm turned **up** — so following the instruction exactly took the
hover-then-leave branch, and **the interaction read as broken to precisely the people doing
as they were told.** That is the worst way for it to fail.

`palmUp` no longer means "facing the sky", it means **horizontal**, and the butterfly lands
on whichever face points up — the back of the hand, when the palm is down, which is where a
butterfly lands on a person anyway.

```js
var upness = palmNormal.dot(WORLD_UP);
palmUp = Math.abs(upness) >= CFG.palmUpDot;     // either way up
faceNormal = (upness < 0) ? -palmNormal : palmNormal;
```

**`rig.faceNormal` is the landing surface and it is what `Hands.offers()` publishes** —
`palmNormal` is now read only inside `hands.js`. Everything downstream is quoted against the
normal it is *handed* (`perchPoint`'s offset, `_restQuat`'s plane, `perchYaw`'s turn about
it, the leg drop), so **none of v9.2's landing arithmetic moved.** Driven end to end with the
palm turned over: it completes the approach, lands, and its leg tips sit **2.0 mm** off the
back of the hand — the same number as the palm-up landing.

It is also strictly more forgiving, which is the argument for it independent of the script.
The pose is still gated by `palmFlat` (fingers extended — a pinching hand never qualifies)
and `palmRaised` (held up near the headset), and **an edge-on hand is still rejected**, which
is the load-bearing half: without it the offer would fire on a flat hand at any angle at all.

`CFG.palmEitherFace = false` restores v9.2's rule exactly, and the harness asserts both
branches. This is the only change v10 makes to `hands.js`.

## The end, and why the timers are short

**Ending is non-destructive**, and that is the whole argument. It resets an empty keyboard,
sends anything with the visitor home the way a lowered palm already does, and re-arms the
flower. **`DNA` and the kaleidoscope are never touched** — verified across a full end in the
running scene: 1 entry before, 1 after, the butterfly still in `orbit`. A visitor ended
early presses start again and loses nothing.

So on an exhibition floor with rapid handovers, 30 s of quiet is a safe default rather than
a hair trigger — and there is no end control, because the visitor keeps playing as long as
they want and museum visitors do not press "done".

| | |
|---|---|
| `guideQuietMs` 30 s | of no interaction → the **nudge** |
| `guideQuietGrace` 15 s | more → the **farewell**. Any activity cancels and puts the session back |
| `guideMaxMs` 8 min | hard cap. The backstop for a session the quiet clock can never end |
| `guideDoffMs` 2 s | of XR visibility `hidden` → end **silently**. There is nobody in there to hear a farewell |

**THE QUIET CLOCK IS FROZEN WHENEVER THE VISITOR CANNOT ACT**, which is the other half of
making 30 s safe: the reveal is ~14 s of watching by design, `perchDwell` alone is 12 s of
deliberately holding still, and a cue that is teaching them something has not finished
teaching it. Frozen, not reset — the clock is at zero going into all three anyway, because
whatever started them counted as activity.

**Presence costs nothing to measure.** `interact.js` hands *every* provider the whole hot
set each frame, so a non-empty set arriving in `setHot()` means the visitor is pointing at
something. No new event, and the only change to `interact.js` in the whole of v10 is adding
`'session-guide'` to its provider list.

### Three things this got wrong first

- **The nudge froze its own clock.** "A cue is playing" freezes the quiet clock, and the
  nudge is a cue — so playing it reset the very timer it was announcing and the grace never
  ran out. `TALKS_OVER` is the fix: the nudge is asking whether anyone is still there, so
  its own playback must not answer the question. The farewell is in the set for the same
  reason.
- **A stalled track could hold a session open for eight minutes.** Found by driving the
  real scene with the tracks missing: a track that stalls mid-fetch never fires `ended` and
  never reports itself paused, so `talking()` stayed true indefinitely and only `guideMaxMs`
  ended the session. `guideTalkMax` (90 s) caps how long any one cue may freeze the clock.
- **The two envelopes were an exponential approach, so they never landed.** `guideCtlFade`
  and `guideFlowerFade` read as "seconds to fade" and behaved as time constants: a second
  into a 0.70 s fade the flower was still at **0.16**. They are now built the way
  `reveal.js` builds its own — a raw parameter travelling **linearly** at 1/duration, read
  out through a smoothstep — so the constant means the seconds it says, both ends are soft,
  and it lands exactly on 0 and 1.

## Tested

`sh tools/reach/run.sh` — **193 assertions** across four suites, about a second.
`test-palm.js` and `test-flight.js` gain the either-face work (both branches of the rule, an
edge-on hand still rejected, and a whole palm-down approach and landing); `test-guide.js` is new and covers the idle lockout
(a full room, one pickable thing), the real pinch on the flower driven the whole way through
`interact.js`'s shoulder ray and pinch edge, the room coming back, both spoken beats, all
three freezes, the nudge, the cancel, the farewell and what it does to the room, the return
to idle, the doff, a blink that is *not* a doff, the operator key, the hard cap, and the
fact that **every transition completes with no `Audio` present at all**.

Driven end to end in the **real engine** too, by pumping `sceneEl.tick` (the documented
trap: a browser tab that is not visible pauses A-Frame's render loop entirely):

| | |
|---|---|
| idle, with 30 pickable things in the room | `gather()` → **1**, and it is `begin` |
| accept, a letter, a collected butterfly, all aimed at squarely | **none of them picks** |
| a real mouse press on the flower | → `welcome`, then `live`; **26 letters offered again** |
| spelled a name, accepted, watched the reveal | `reveal:joined` **×1**, `recall` asked for |
| a second `reveal:joined` | **no repeat** |
| quiet → wrapup → farewell → idle | `nudge`, then `farewell` exactly `guideQuietGrace` later, then the flower back at alpha 1 |
| during the farewell | `gather()` → **0** |
| across the whole end | `DNA` **1 → 1**, the butterfly still in `orbit` |

**One desktop-only caveat**, worth knowing before it looks like a bug: a mouse cursor left
parked over the swarm hovers a butterfly every time one drifts under it, and a hover *is*
presence — so the quiet clock keeps resetting and a desktop session may never time out. On
a headset with no hands tracked there are no pointers and no hot ids, which is the case the
signal is for. Park the cursor on the floor to watch the arc on a desktop, or use `Escape`.

## Files

| | |
|---|---|
| `js/voice.js` | **new** — the narration, and the cue queue the opening needs |
| `js/guide.js` | **new** — the session, and the start flower |
| `audio/` | **new** — where the four tracks go, and a README naming them |
| `js/config.js` | one new block, 21 constants and the cue table |
| `js/interact.js` | **one line**: `'session-guide'` first in the provider list |
| `js/collection.js` | `reveal:joined` at the soar handoff, and `releaseAll()` |
| `js/keyboard.js` | **two lines**: the desktop keydown gate, and one more factor on the controls' alpha |
| `js/hands.js` | either face: `faceNormal`, and `palmUp` meaning horizontal |
| `audio/` | the four tracks, mono mp3, 395 KB — masters in `sounds/ai_voiceover/v1/` |
| `index.html` | two script tags and one entity |
| `tools/reach/` | `test-guide.js`, `run.sh`, and `UI.blob` + a `Reveal` stub + timers in `stub-scene.js` |
| `tools/knobs.html` | regenerated — **277 tunables**, 28 flagged |

`wing-gen.js`, `wing-colour.js`, `wing-tex.js`, `name-dna.js`, `dna-store.js`,
`bfly-model.js`, `style.js`, `reveal.js`, `ui.js` and `app.js` are **byte-identical to
v9.2**. Parity with TouchDesigner is untouched.

## What is not here

- **`nudge` and `farewell` are not recorded**, and the session runs without them: the end is
  silent and the start flower coming back is the whole signal. A short *"thank you, please
  pass the headset on"* is the one line an exhibition floor would most want next — drop it in
  as `audio/farewell.mp3` and set the key in `CFG.voCues`.
- **No music bed and no SFX.** `sounds/` is untouched. `Voice.duck()` exists so a bed can
  be added later as a level write rather than a rewrite.
- **`guideUnlockAt` is 0** — the room is live the instant the welcome starts, so a visitor
  who already understands is never blocked. Once the track is cut, move it onto the second
  where the instruction actually lands if they should hear it first.
- **`serve.py` does not answer HTTP Range requests.** If a track plays on the desktop but
  not in the headset, that is the likely cause. Keep the files small enough to be fetched
  whole, or teach the server `Range`.
- Still **not run on a physical Quest.**

---

# v9.2 — it sits down properly, 9 September 2026

One change, in the landing. **The butterfly's hind legs are drawn shorter than its front
ones, so it did not rest on the hand.**

`BODY_ALPHA` is a body in **flight**, seen side-on: front legs long and hanging forward,
hind pair short and swept back. v9's `perchLegDrop` took the single lowest painted pixel
and hung the model that far above the palm, which stands it on its deepest leg and leaves
everything behind that leg in the air — measured at `perchSize`, the two hind tips sat
**24.1 and 26.6 mm** off the hand. The tail half of the butterfly was hovering.

Label the four leg strands in the decoded alpha and their tips are at, along the body from
the wing hinge (head is −x):

| | along the body | below the hinge |
|---|---|---|
| front | −0.0575 | −0.1145 |
| mid | −0.0301 | **−0.1407** ← the lowest, and all v9.1 used |
| hind | +0.0892 | −0.0964 |
| hind | +0.1171 | −0.0915 |

**They are not collinear.** The mid pair hangs 15 mm below the line through the other two,
so no rigid pose lands all four and the only question is which error to spend:

| pitch | `perchLegDrop` | the four tips, mm off the hand at `perchSize` | |
|---|---|---|---|
| 0.000 | 0.1406 | +15.1  +2.0  +24.1  +26.6 | v9.1 |
| **0.205** | **0.1145** | **+9.1  −6.6  +3.0  +2.5** | **shipped** |
| 0.323 | 0.1239 | +18.8  +2.0  +4.1  +2.0 | the lower hull |

(as shipped, so `perchLift`'s 2 mm of clearance is in those numbers; negative is a tip
inside the hand.)

**`CFG.perchPitch` = 0.205 rad — 11.8° of nose-up**, the least-squares line through the four
tips. It puts the hind pair down within a millimetre, which is the whole complaint, and buys
that with the mid pair 8.6 mm *into* the hand — where a leg tip reads as contact. A leg tip
**above** a hand reads as floating, and that is the error worth avoiding. The lower hull is
the no-penetration answer and lands three of the four exactly, but 11.8° reads as a
butterfly settling and 18.5° as one rearing; move `perchPitch` there if the sunk pair shows
in a headset, and `0` gives the flat pose back.

**The pitch is about the wing SPAN axis** (model local Z: the body runs along X, the wings
out along Z), so the wings stay level across the palm and only tip fore-and-aft. The span
axis stays *exactly* in the palm plane at any `perchYaw` — that is now the invariant the
harness asserts, in place of "the wings lie in the palm plane" — and the wing normal comes
off the palm normal by cos(`perchPitch`) = 0.979 and no more. Clearance was re-checked over
every painted pixel after the tilt: **body 22 mm off the palm, abdomen tip 29 mm.** Nothing
but the legs reaches the hand.

`perchLegDrop` keeps its meaning and its units — the drop of the legs' **contact line**
below the origin, now measured perpendicular to that line — so `perchPoint` is still one
offset along the palm normal and `perchLift` still sits on top of it.

## Tested

`sh tools/reach/run.sh` — all three suites, and `test-palm.js` gained a block that pushes
the four measured tips through the real `_restQuat` and the real `perchPoint` and prints
what each one is off the hand, plus the v9.1 pose for comparison. Driven in the running
engine too: 11.75° of head pitch, wing span in the palm plane to 1e-5, and the four tips at
**+9.1 / −6.6 / +3.0 / +2.5 mm** — the shipped row of the table, from the real component.

## Files

| | |
|---|---|
| `js/config.js` | `perchPitch` (new), `perchLegDrop` 0.1406 → 0.1145 |
| `js/collection.js` | `_restQuat` applies the pitch; `perchPoint`'s comment |
| `tools/reach/test-palm.js` | the span-axis invariant, and the leg-contact block |
| `tools/knobs.html` | regenerated — 249 tunables |

Everything else is byte-identical to v9.1.

---

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
position lagging it — that is where the damping lives. And it has to **ease in**: the
butterfly arrives within `summonArrive` of the un-wandered spot, but the noise at that instant
can be a full span away, so the target jumped on the first frame and the lag chased it at
**1.0 m/s** — a lunge toward a face 0.6 m away.

**And the heading is held, not chased** — which was the second pass, and the bigger half of
"it moves too radically". Following its own travel direction is right for the orbit, where a
butterfly travels one way for many seconds, and wrong here, where the wander reverses every
couple of seconds and the body swung a full half turn each time: **4.6 radians of yaw in
3.3 seconds.** It now holds **broadside** to the visitor and sways about it — broadside
rather than square-on, because with the body axis pointed at the visitor the wing plane
cannot face them either, so facing them is the one heading at which the butterfly is an
edge-on twig. The side is chosen on arrival as the shorter turn from the heading it flew in
on (drawn at random it could swing a half turn to settle: 179°/s against 84 now). The drift
came down with it.

| over the whole 7 s wait | first pass | now |
|---|---|---|
| drift | 0.24 × 0.11 × 0.10 m | **0.09 × 0.05 × 0.06 m** |
| peak speed | 0.36 m/s | **0.19 m/s** |
| yaw swept | 264° | **52°** |

**The resting pose is built directly, like the reveal's.** The wing plane (local +Y is its
normal) is laid into the palm plane and the head turned to the visitor — so the head is
parallel to the visitor direction *projected into the palm plane*, which is not the same as
the visitor direction and is why the harness checks the projection. The degenerate case is
real: a visitor looking straight down their own palm leaves no in-plane direction to point
at, and `_restQuat` falls back to a world axis rather than producing a NaN pose.

**A resting butterfly is not a still one.** It opens and shuts its wings every couple of
seconds, jittered so two never sync up. Without the flutter it reads as a sticker stuck to
your palm.

**And it stands on its legs.** `perchPoint` first put the model's *origin* on the palm — but
the origin is the **wing hinge**, and the body sprite hangs below it: body, then three pairs
of legs. The butterfly was planted wings-deep in the hand with every leg buried, about 52 mm
of it. `perchLegDrop` is measured off `BODY_ALPHA` itself rather than guessed — decode the
PNG, threshold at the material's own `alphaTest` of 0.5, map rows through the body plane's
geometry, and the paint runs from local y +0.0287 down to **−0.1406**, the last of that being
the longest pair of legs. (Cross-check: `tagBodyDrop`, measured independently for the name
tag, is −0.135.) Quoted per unit model size and applied against the *current* scale, so the
legs do not sink as the butterfly grows into its landing. Verified in the running scene: leg
tips **2 mm** off the palm, body **72 mm** clear of it.

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
machine has no node), against a maths-only THREE stub. **119 assertions**, about a second:

```bash
sh tools/reach/run.sh
```

It covers the handedness of the palm normal, every way of *not* offering a hand (turned
over, curled, lowered), the hold/release timers, the resting pose's axes and its degenerate
case, the broadside turn at every angle it draws, the leg tips landing on the palm rather
than the model's origin, the whole four-state arc in both branches,
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
