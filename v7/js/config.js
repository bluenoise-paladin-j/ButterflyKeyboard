// ============================================================
//  config.js  --  the numbers the piece is built from
// ============================================================
//  v3 has no dev panel on purpose. Everything that would have been a
//  slider in v2 is a constant here instead, so there is one place to
//  change the piece and nothing to open in a headset.
//
//  The twenty-six keys ARE v2's swarm: the same circling flight, the
//  same flap-glide, the same scatter. They are not parked on a panel.
//  A letter rides under each one and faces the camera, so the keyboard
//  is something you read off a room full of moving butterflies rather
//  than off a grid.
//
//  Only the name field and the two buttons are fixed in place, in
//  front of the visitor where they can always be found.
// ============================================================
var CFG = {
  eyeY: 1.60,               // the scene's camera height

  // ---- the swarm ----
  //  Same shape of distribution as v2, pulled in: these have to be
  //  catchable, so the far end of the radius band is closer and the
  //  small end of the size band is bigger than the ambient swarm's.
  //  Close. The visitor should be able to reach a butterfly by leaning,
  //  not by walking -- an exhibition floor is not big and a headset
  //  guardian is smaller still. radMin is the near edge of the orbit and
  //  sits just outside the floating UI, so nothing flies through it.
  //  Sizes come down with the radius: a butterfly at 1 m at v2's size
  //  band fills the view.
  sizeMin:   0.45, sizeRange: 0.60, sizeExp: 1.4,
  radMin:    1.00, radMax:    2.40,
  hgtMin:    1.00, hgtMax:    2.30,

  //  How far the noise pushes a butterfly off its nominal orbit. v2 cut
  //  these hard after "they wobble too much"; 1.0 is that calm baseline
  //  and it scales all three noise amplitudes at once.
  wander:    1.0,

  //  HOW FAR AROUND THE VISITOR THE KEYBOARD GOES, in radians.
  //
  //  2*PI is v2's swarm: every butterfly orbits the full circle, which is
  //  what this is asked to look like. Worth knowing before an exhibition:
  //  a full circle means only about a quarter of the alphabet is in front
  //  of you at any moment, so spelling a name involves turning around to
  //  hunt for a letter.
  //
  //  Set this to something under 2*PI -- 3.4 (about 195 degrees) is a good
  //  first try -- and the butterflies sweep back and forth across an arc
  //  in front of the visitor instead of circling. Same flight, same noise,
  //  same everything else; all 26 letters stay findable without turning.
  arcSpan:   Math.PI * 2,
  arcRate:   0.11,          // sweeps per second, when the arc is not full

  //  How much of the wing to present, in radians: 0 = body face-on and
  //  wings edge-on, PI/2 = the reverse. See presentRoll() in keyboard.js
  //  -- this is the only departure from v2's flight, and 0 restores it.
  readRoll:  0.84,

  // ---- the letter under each butterfly ----
  //  Angular, like v2's id labels: scaled by distance from the camera
  //  so a letter across the room stays as readable as one in your face,
  //  clamped at both ends so a near one is not enormous.
  letterAngular: 0.075,     // world height per metre of distance
  letterMin:     0.075,
  letterMax:     0.42,

  // ---- selection ----
  //  A pointing ray is the main way in -- most of the swarm is further
  //  than an arm. The tolerance is a CONE, not a fixed radius: a fixed
  //  radius makes a butterfly four metres away almost unhittable, and a
  //  wide fixed radius makes a near one grab everything around it.
  //  Tightened when the swarm came closer: separation holds neighbours
  //  about 0.6 m apart, so slack much past a quarter of that stops
  //  feeling like aiming.
  pickBase:    0.16,        // metres of slack, close in
  pickAngle:   0.055,       // radians the cone opens by, further out
  touchRadius: 0.16,        // fingertip this close beats any ray pick
  rayMax:      8.0,
  pinchOn:     0.033,       // metres, thumb tip to index tip: pinch closes
  pinchOff:    0.050,       // and opens again (hysteresis, not one value)

  //  v6.1: the cone above is already tuned right up against a hard ceiling
  //  (neighbours sit ~0.6 m apart; slack past a quarter of that turns them
  //  into one blob -- see the note further down). So easier selection comes
  //  from calming the SIGNAL feeding the cone, not widening the cone:
  //
  //  shoulderDown/shoulderOut place the ray's ORIGIN, not its aim. v6 cast
  //  from the index knuckle through the fingertip -- a ~3cm baseline, so a
  //  few millimetres of finger curl during a pinch swung the aim by tens
  //  of degrees. This mirrors Meta's own hand-pointing model (the ray
  //  Quest's system UI casts): anchor the ray near the SHOULDER instead,
  //  aimed through the hand. There is no tracked shoulder joint, so
  //  interact.js:shoulderOf() estimates one each tick from the camera
  //  pose -- down by shoulderDown, out by shoulderOut along the camera's
  //  flattened (yaw-only) right axis, mirrored per hand. A ~60-80cm
  //  baseline means the same finger curl swings the aim by a couple of
  //  degrees, often less than the cone's own slack.
  //
  //  aimSmoothTau damps residual raw joint jitter out of the fingertip the
  //  ray is aimed through, so a hover does not flicker on and off a target
  //  it is plainly sitting on.
  //
  //  pickGraceMs covers what the shoulder anchor does not fully remove:
  //  a pinch's rising edge with nothing picked that exact frame still
  //  activates whatever this hand had hot within this many milliseconds --
  //  butterflies only, never the two controls, which are fixed in place,
  //  easier to hit anyway, and where a wrong guess (an accidental
  //  accept/delete) costs more than a missed letter.
  shoulderDown: 0.20,       // metres, estimated shoulder below the headset
  shoulderOut:  0.18,       // metres, estimated shoulder out from centre
  aimSmoothTau: 0.07,       // seconds, EMA time constant on the hand ray
  pickGraceMs:  180,        // ms, how long a hover is "rescued" after loss

  //  v6.1 round 2 -- the shoulder ray above cut most of the pinch-commit
  //  perturbation, but three things remained on-headset: neighbouring
  //  butterflies (~0.6 m apart, so their cones genuinely overlap) still
  //  got confused for each other, the two controls still got triggered by
  //  a reach that only grazed them, and the pinch itself sometimes never
  //  registered at all. None of this is fixed by shrinking the shared
  //  cone further -- that ceiling is exactly the one described above --
  //  so this round adds MEMORY (hover doesn't flicker between two
  //  candidates that are both technically in range) and shrinks two
  //  SPECIFIC targets (the controls) rather than the shared budget.
  //
  //  hoverLockMargin/hoverLockMs: once a hand's pointer has a hovered
  //  butterfly, a challenger only steals it by clearly beating its score
  //  (hoverLockMargin, a fraction of the tolerance width) or by being the
  //  SAME better challenger for hoverLockMs running. A target the ray has
  //  plainly left (score >= 1) releases with no delay either way -- the
  //  lock only ever resists switching inside a genuine overlap band.
  //  interact.js:pickFlySticky().
  hoverLockMargin: 0.22,    // score units (0..1), see pickFlySticky()
  hoverLockMs:      250,    // ms a sustained challenger takes to win anyway

  //  panelPickShrink/panelPickBase/panelTouchRadius: the controls' own
  //  RADIUS (their visual size), not just the cone's slack, turned out to
  //  be the dominant term in their tolerance -- both blobs are already
  //  bigger than a typical butterfly's own pick radius. panelPickShrink
  //  scales the accept/delete PICK radius down (keyboard.js:targets(),
  //  visual size untouched); panelPickBase/panelTouchRadius are the
  //  controls-only versions of pickBase/touchRadius above. Together a
  //  control's total tolerance drops below a typical butterfly's, so "the
  //  controls win" only fires when one is genuinely, deliberately aimed
  //  at -- not softened, just evaluated against a smaller target.
  panelPickShrink:  0.55,   // multiplies a control's own pick radius
  panelPickBase:    0.06,   // metres, controls-only version of pickBase
  panelTouchRadius: 0.08,   // metres, controls-only version of touchRadius

  //  pinchSmoothTau, and pinchOn/pinchOff above widened by 5mm each (was
  //  0.028/0.045): rig.pinch (hands.js) is raw and unsmoothed, and Quest
  //  hand tracking is noisiest right as fingers occlude each other --
  //  exactly at a real pinch. Smoothing alone can't fix a signal that's
  //  systematically a little wide right at occlusion, so it's paired with
  //  widening pinchOn; the gap between the two thresholds (their
  //  hysteresis) is kept the same width as before, only shifted.
  //  pinchSmoothTau is about half aimSmoothTau -- long enough to bridge
  //  one bad sample, short enough that activation still feels immediate.
  pinchSmoothTau: 0.035,    // seconds, EMA time constant on rig.pinch

  //  v6.1 round 3 -- two things remained after round 2: the pinch still
  //  sometimes didn't register at all, and it was still too easy to
  //  accidentally select a neighbour.
  //
  //  trackLossGraceMs found the real cause of the first: on a SINGLE
  //  untracked frame, tick() used to fully reset closed/smPinch/pinchInit/
  //  lockId/etc -- and Quest hand tracking commonly loses confidence for a
  //  frame or two exactly as fingers occlude each other, i.e. exactly at a
  //  real pinch. A dropout this short now just hides the line and holds
  //  every pinch/lock/aim value exactly where it was, so a pinch already
  //  in progress survives the blip instead of being discarded by it. Only
  //  a dropout that outlasts this window does the original full reset.
  //
  //  touchDwellMs closes the other gap round 2 didn't touch: pickTouch()
  //  still won outright over the now-stabilised ray/hover-lock on a
  //  SINGLE frame of proximity, with no memory at all -- so a hand simply
  //  passing near a neighbour on the way to the real target could steal
  //  the pick instantly. A touch now has to be the same nearest target
  //  continuously for this long before it's allowed to override the ray.
  //  Shorter than hoverLockMs since physical proximity is already a
  //  stronger intent signal -- this only needs to filter a pass-through,
  //  not damp genuine ambiguity.
  //
  //  pinchOn/pinchOff are deliberately NOT widened again this round:
  //  that would make an accidental touch more likely to read as a
  //  deliberate pinch, working directly against the second complaint.
  trackLossGraceMs: 200,    // ms, a dropout this short holds state, not resets it
  touchDwellMs:      120,   // ms a touch must stay on one target before it can win

  // ---- feedback ----
  hiScale:     1.45,        // a highlighted butterfly grows to this
  captureTime: 0.55,        // seconds to fly into the hand
  goneTime:    0.40,        // seconds off, before it rejoins the swarm
  returnTime:  0.60,        // seconds to fade back in, flying in from outside
  flashTime:   0.15,        // v6.1: seconds, the ray line's catch-flash decay

  //  v6.1: exhibition feedback flagged the swarm's motion as a motion-
  //  sickness risk. Rather than slow everyone all the time -- v6's cruising
  //  flight is already tuned and tested on-headset -- only a butterfly
  //  being reached for (and its near neighbours, tapering with distance)
  //  eases into a calmer flight, and back out once nothing is pointed
  //  there. This also makes 1-2 above work better: a target that is barely
  //  moving while hot is far easier for a damped ray to stay locked onto,
  //  and far more forgiving of the pinch-commit perturbation.
  slowHot:     0.25,        // time-scale for the butterfly directly hot
  slowRadius:  1.10,        // metres, falloff for neighbours of a hot one
  slowEase:    0.35,        // seconds, how gradually speed eases in/out

  //  v6.1 round 2 -- slowHot/slowRadius retuned calmer and wider, plus
  //  this new curve exponent, so the immediate neighbourhood's own flight
  //  noise (a contributor to accidental hover-lock challenges) settles
  //  down without flattening every nearby butterfly toward the hot one's
  //  own speed. That would backfire: a near-stationary neighbour is an
  //  EASIER accidental ray target than one still visibly drifting, so the
  //  contrast between "the hot one" and "everything else nearby" has to
  //  stay clear. Biases the falloff to stay close to slowHot near the
  //  target and drop off more steeply near slowRadius's edge, instead of
  //  smoothstep's roughly-linear middle -- see updateSlowField().
  slowFalloffPow: 1.6,

  // ---- the UI, fixed in front of the visitor ----
  //  No panel, no box. The name is loose letters hanging in the air and
  //  the two controls are shapes, not labelled rectangles -- the piece is
  //  a room full of butterflies and a chrome dialog in the middle of it
  //  reads as a different application. Nothing here is centred on anything
  //  else, and there is no frame to centre it in: the name and the two
  //  shapes are all that is fixed in the room.
  panelR:      0.80,        // metres in front

  nameX:       0.045,       // off-centre, on purpose
  nameY:       -0.235,
  nameTilt:    -0.055,      // the whole line hung on a slope
  nameSize:    0.105,
  nameSpacing: 0.072,
  nameTrack:   0.80,        // under 1 = the letters nearly touch
  nameMaxW:    1.02,
  nameBob:     0.006,
  nameBobRate: 0.28,
  nameFlyTime: 0.65,        // seconds for a caught letter to reach the name

  //  THE TWO SHAPES. Was "much bigger than v4's" here on purpose; v6.1
  //  round 3 walks that back -- "it takes up a lot of the space" -- to
  //  essentially v4's own shipped size (blobW 0.155/blobH 0.140), rather
  //  than an arbitrary guess. Each still hung at its own tilt and cant so
  //  neither sits square to the visitor. This also tightens the pick
  //  radius further on top of round 2's panelPickShrink (radius is
  //  derived from these), which only helps the accidental-selection fix.
  //  Pulled in much past this the six lobes merge back into one blob-lump
  //  -- an on-headset judgement call, not something arithmetic settles.
  blobY:       -0.435,
  blobW:       0.160,       // was 0.200; one lobe's radius, cluster ~2.9x this across
  blobH:       0.140,       // was 0.176
  ctlGap:      0.82,        // between the two, centre to centre
  blobPulse:   0.045,       // depth of the breathing
  blobDrift:   0.022,       // how far a shape floats from where it hangs

  //  The press bounce. Under-damped on purpose: the kick is a velocity,
  //  so the shape shoots past its resting size, comes back past it, and
  //  rings down over about a second.
  ctlSpring:   150,         // stiffness
  ctlDamp:     0.86,        // per frame at 60fps; under 1 = it rings
  ctlKick:     7.5,         // the impulse a press adds to the velocity

  //  v6.1 round 3 -- "there needs to be confirmation the green button was
  //  pressed." Both buttons already get ctlKick's bounce; accept gets a
  //  bigger one on top (~1.77x peak vs an ordinary press's ~1.36x, same
  //  ~80ms tempo -- bigger in amplitude, not a different animation
  //  language), and the same kick also pulses the caught name itself
  //  (keyboard.js:accept()/tickUI()) -- the thing actually being
  //  confirmed, not just the button. Delete's press is unchanged.
  acceptConfirmKick: 16,    // roughly 2x ctlKick, accept only

  maxName:     16,          // longest name the field will take

  //  v7 -- how long the caught name stays up after accept before the
  //  keyboard resets for the next visitor. Was a bare 3200 literal in
  //  keyboard.js:accept(); pulled in here so the "watch your butterfly
  //  join the kaleidoscope" beat can be tuned. The collection's fly-in
  //  is timed to land about a second inside this.
  acceptResetDelay: 3200,   // ms

  // ---- the collection (v7) ----
  //  The butterflies grown from visitors' names. NOT the keyboard: they
  //  cannot be caught, they carry a name rather than a letter, and they
  //  accumulate for the whole run of the exhibition. They fly the same
  //  flight as the keys but in their OWN, wider shell -- further out and
  //  taller -- so the kaleidoscope reads as the room around you and the
  //  keyboard stays the near, actionable layer in front.
  maxCollected: 12,         // most shown at once; the rest stay in storage.
                            //  Ceiling ~36: Wings.MAX_UNIQUE is 64 and the 26
                            //  keys hold 26 of those texture slots for good, so
                            //  past ~36 a live wing could be redrawn under it.
  colRadMin:   2.7, colRadMax: 4.6,    // horizontal orbit, outside the keyboard's 2.4
  colHgtMin:   0.8, colHgtMax: 3.2,    // a dome, taller than the keyboard band
  colSizeMin:  0.6, colSizeRange: 0.9, // a touch bigger than the keys, to carry the distance

  //  The name under each collected butterfly -- angular like the keys'
  //  letters, a little smaller since it is a word, and faded right out
  //  past tagFadeFar so the far cloud is not a wall of text.
  tagShow:     true,
  tagAngular:  0.055,       // world height per metre of distance
  tagMin:      0.040,
  tagMax:      0.280,
  tagFadeNear: 3.4,         // metres: full opacity within this
  tagFadeFar:  5.6,         // metres: gone beyond this

  // ---- palette ----
  //  Fully saturated, always. The scene is white, so the butterflies carry
  //  all the colour and carry it at full strength -- v2's 72%/63% was
  //  tuned against a black void and washes out completely against white.
  bflySat:     100,         // per cent
  bflyLit:     47,
  //  Letters take their butterfly's hue at full chroma but darker: a wing
  //  is a silhouette and a letter is type, and type at the wing's own
  //  lightness is unreadable on white for a good third of the wheel.
  letterLit:   36,
  //  the letter cut out of the wing, filled rather than left open
  cutLit:      46,
  //  the ghost trailing each letter, in its own ink
  ghostLit:    52
};

CFG.letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// --- normalized roll -> live value, exactly v2's mapping -------------
CFG.sizeFor   = function (t) { return CFG.sizeMin + CFG.sizeRange * Math.pow(t, CFG.sizeExp); };
CFG.radiusFor = function (t) { return CFG.radMin + (CFG.radMax - CFG.radMin) * t; };
CFG.heightFor = function (t) { return CFG.hgtMin + (CFG.hgtMax - CFG.hgtMin) * t; };

// --- the collection's own bands (v7), same shape of mapping ----------
CFG.colRadiusFor = function (t) { return CFG.colRadMin + (CFG.colRadMax - CFG.colRadMin) * t; };
CFG.colHeightFor = function (t) { return CFG.colHgtMin + (CFG.colHgtMax - CFG.colHgtMin) * t; };
CFG.colSizeFor   = function (t) { return CFG.colSizeMin + CFG.colSizeRange * Math.pow(t, CFG.sizeExp); };

// Anything mounted flat on the panel, at (x, y) in front of the visitor.
CFG.panelPos = function (x, y) {
  return new THREE.Vector3(x, CFG.eyeY + y, -CFG.panelR);
};
