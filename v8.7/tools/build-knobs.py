# -*- coding: utf-8 -*-
# ============================================================
#  build-knobs.py  --  regenerates tools/knobs.html
# ============================================================
#  knobs.html is the reference for every adjustable constant in the
#  build: what it does, its shipped value, and the file and line to
#  find it on. It is GENERATED -- edit the FILES table below and
#  re-run, never the HTML.
#
#      python3 tools/build-knobs.py
#
#  Needs nothing but a Python 3. It reads no source files: the table
#  is written by hand, because the useful half of each entry is the
#  one-line explanation of what the number DOES, and that is not
#  something a parser can recover from `sizeExp: 1.4`.
#
#  The cost of that is the obvious one -- LINE NUMBERS GO STALE. They
#  are a convenience, not a source of truth; the name is what to search
#  for if a line has moved. After any real edit to config.js, re-check
#  the lines with:
#
#      grep -n "sizeExp\\|wingPlane\\|..." js/config.js
#
#  A row is (name, value, line, note, flag). `flag` is '' for a
#  constant that predates this version, 'new' for one v8.7 introduced,
#  and 'changed' for one it moved -- those two draw the coloured rail
#  down the left of the row.
#
#  Every non-ASCII character is emitted as a numeric entity at the end,
#  so the page renders identically whatever charset the host declares.
#  Type the real characters here; do not hand-write entities.
# ============================================================
import os
import html, json, io

# (name, value, line, note, flag)  flag: '' | 'new' | 'changed'
FILES = [
 dict(f='js/config.js', hue=214, blurb='Every number the piece is built from. 140 keys. Almost everything you will want to move is here.', groups=[
  ('the room', [
   ('eyeY','1.60',18,"Camera height in metres. The whole scene is composed around it.",''),
  ]),
  ('the swarm — the 26 keyboard butterflies', [
   ('sizeMin','0.45',30,"Bottom of the size band. sizeFor(t) = sizeMin + sizeRange · t^sizeExp.",''),
   ('sizeRange','0.60',30,"Width of the size band above sizeMin.",''),
   ('sizeExp','1.4',30,"Curve of the band. >1 puts more butterflies at the small end.",''),
   ('radMin','1.00',31,"Nearest orbit radius, metres.",''),
   ('radMax','2.40',31,"Furthest orbit radius, metres. The collection sits outside this.",''),
   ('hgtMin','1.00',32,"Lowest flight height, metres.",''),
   ('hgtMax','2.30',32,"Highest flight height, metres.",''),
   ('wander','1.0',37,"Scales all three noise amplitudes live. THE knob for how calm the flight is — raise this rather than editing the amplitudes in keyboard.js.",''),
   ('arcSpan','Math.PI * 2',51,"Radians of orbit each butterfly covers. Full circle = every letter findable without turning.",''),
   ('arcRate','0.11',52,"Sweeps per second, when the arc is not a full circle.",''),
   ('readRoll','0.84',57,"Radians of wing presented to the visitor. 0 = body face-on, wings edge-on. 0 restores v2's flight exactly.",''),
  ]),
  ('the letter under each butterfly', [
   ('letterAngular','0.075',63,"World height per metre of distance — the letter stays a constant size on screen.",''),
   ('letterMin','0.075',64,"Floor on that angular scale.",''),
   ('letterMax','0.42',65,"Ceiling on that angular scale.",''),
  ]),
  ('selection — reach, point, pinch', [
   ('pickBase','0.16',75,"Metres of slack on the pick cone, close in.",''),
   ('pickAngle','0.055',76,"Radians the cone opens by, further out.",''),
   ('touchRadius','0.16',77,"A fingertip this close beats any ray pick.",''),
   ('rayMax','8.0',78,"Metres the aim ray reaches.",''),
   ('pinchOn','0.033',79,"Metres, thumb tip to index tip: the pinch closes.",''),
   ('pinchOff','0.050',80,"…and opens again. Hysteresis, deliberately not one value.",''),
   ('shoulderDown','0.20',109,"Metres the estimated shoulder sits below the headset.",''),
   ('shoulderOut','0.18',110,"Metres the estimated shoulder sits out from centre.",''),
   ('aimSmoothTau','0.07',111,"Seconds, EMA time constant on the hand ray.",''),
   ('pickGraceMs','180',112,"Milliseconds a hover survives after tracking loss.",''),
   ('hoverLockMargin','0.22',132,"Score units (0–1) a challenger must beat the held target by.",''),
   ('hoverLockMs','250',133,"Milliseconds a sustained challenger takes to win anyway.",''),
   ('panelPickShrink','0.55',145,"Multiplies a control's own pick radius. Visual size untouched.",''),
   ('panelPickBase','0.06',146,"Controls-only version of pickBase.",''),
   ('panelTouchRadius','0.08',147,"Controls-only version of touchRadius.",''),
   ('pinchSmoothTau','0.035',158,"Seconds, EMA time constant on rig.pinch (which is raw and unsmoothed).",''),
   ('trackLossGraceMs','200',186,"Milliseconds — a dropout this short holds state rather than resetting it.",''),
   ('touchDwellMs','120',187,"Milliseconds a touch must stay on one target before it can win.",''),
  ]),
  ('feedback', [
   ('hiScale','1.45',190,"A highlighted butterfly grows to this.",''),
   ('captureTime','0.55',191,"Seconds to fly into the hand.",''),
   ('goneTime','0.40',192,"Seconds off-screen before it rejoins the swarm.",''),
   ('returnTime','0.60',193,"Seconds to fade back in, flying from outside.",''),
   ('flashTime','0.15',194,"Seconds the ray line's catch-flash takes to decay.",''),
   ('slowHot','0.25',204,"Time-scale for the butterfly directly under the pointer.",''),
   ('slowRadius','1.10',205,"Metres — how far that slowing reaches its neighbours.",''),
   ('slowEase','0.35',206,"Seconds the speed change eases in and out over.",''),
   ('slowFalloffPow','1.6',218,"Curve of that falloff with distance.",''),
  ]),
  ('the UI, fixed in front of the visitor', [
   ('panelR','0.80',227,"Metres in front of the visitor the panel hangs.",''),
   ('nameX','0.045',229,"Name field, off-centre on purpose.",''),
   ('nameY','-0.235',230,"Name field, below the eye line.",''),
   ('nameTilt','-0.055',231,"Radians — the whole line hung on a slope.",''),
   ('nameSize','0.105',232,"Letter height in the name field.",''),
   ('nameSpacing','0.072',233,"Base advance between letters.",''),
   ('nameTrack','0.80',234,"Tracking multiplier. Under 1 = the letters nearly touch.",''),
   ('nameMaxW','1.02',235,"Metres the name may span before it condenses.",''),
   ('nameBob','0.006',236,"Metres the field drifts.",''),
   ('nameBobRate','0.28',237,"Cycles per second of that drift.",''),
   ('nameFlyTime','0.65',238,"Seconds for a caught letter to reach the name.",''),
   ('blobY','-0.435',249,"Height of the two flower controls.",''),
   ('blobW','0.160',250,"One lobe's radius; the cluster is ~2.9× this across.",''),
   ('blobH','0.140',251,"Lobe height.",''),
   ('ctlGap','0.82',252,"Metres between the two controls, centre to centre.",''),
   ('blobPulse','0.045',253,"Depth of the breathing.",''),
   ('blobDrift','0.022',254,"How far a shape floats from where it hangs.",''),
   ('ctlSpring','150',259,"Stiffness of the press spring.",''),
   ('ctlDamp','0.86',260,"Per frame at 60 fps. Under 1 = it rings.",''),
   ('ctlKick','7.5',261,"Impulse a press adds to the velocity.",''),
   ('acceptConfirmKick','16',270,"Roughly 2× ctlKick, on accept only.",''),
   ('maxName','16',272,"Longest name the field will take.",''),
   ('acceptResetDelay','20000',282,"Milliseconds before an abandoned name clears itself.",''),
   ('nameExitTime','2.0',296,"Seconds for a name letter to burst away and fade (sim time, not wall clock).",''),
   ('nameExitDrop','1.30',297,"Metres it falls over that — accelerating, like blast wash.",''),
   ('nameExitSpread','0.55',298,"Metres it also fans horizontally as it goes.",''),
  ]),
  ('the collection — the kaleidoscope that accumulates', [
   ('maxCollected','12',307,"How many render at once; the rest stay in storage. Ceiling ~36 before Wings.MAX_UNIQUE bites.",''),
   ('colRadMin','2.6',311,"Nearest collection orbit, outside the keyboard's 2.40.",''),
   ('colRadMax','4.3',311,"Furthest collection orbit.",''),
   ('colHgtMin','0.8',312,"Bottom of the collection's dome.",''),
   ('colHgtMax','3.0',312,"Top of it — taller than the keyboard band.",''),
   ('colSizeMin','0.6',313,"Bottom of the collection's size band.",''),
   ('colSizeRange','0.9',313,"Width of it. A touch bigger than the keys, to carry the distance.",''),
   ('presentDist','0.80',318,"Metres in front for the 'here's your butterfly' beat — inside the keyboard's orbit.",''),
   ('presentRise','0.06',319,"Metres above the eye line for that beat.",''),
   ('presentSize','0.78',320,"Held at a comfortable size there, whatever its orbit size will be.",''),
  ]),
  ('the reveal — nine beats, ~14 s', [
   ('revealCharge','1.8',359,"Seconds of anticipation between ACCEPT and the bloom.",''),
   ('revealArrive','0.9',361,"Seconds of the bloom — the overshoot scale-up from 0.",''),
   ('revealPopOver','0.42',366,"Overshoot hump past full size mid-bloom, as a fraction.",''),
   ('revealArriveBurst','15',367,"Letters flung outward as it blooms.",''),
   ('revealArriveBurstSpd','1.05',368,"Metres/sec they are thrown.",''),
   ('revealSettle','1.8',369,"Seconds held flat and breathing after it arrives.",''),
   ('revealGreet','1.8',370,"Seconds of the greeting flutters.",''),
   ('revealStill','0.8',371,"Seconds of complete stillness before the coil.",''),
   ('revealCoil','0.4',372,"Seconds of anticipation — the dip before the launch.",''),
   ('revealLaunch','1.1',373,"Seconds of the upward shot.",''),
   ('revealSoar','2.7',374,"Seconds from the top of the shot out to its orbit.",''),
   ('revealFlapAmp','0.11',380,"Dihedral of the breath, radians.",''),
   ('revealFlapRate','1.9',381,"Radians/sec of that breath — about 0.3 Hz.",''),
   ('revealGreetBeats','3',390,"How many greeting flutters.",''),
   ('revealGreetBeat','0.38',391,"Seconds of movement in each 0.60 s slot; the rest is the pause.",''),
   ('revealGreetAmp','0.85',392,"Radians of dihedral at the top of a flutter.",''),
   ('revealGreetLift','0.02',393,"Metres the body rises on the stroke.",''),
   ('revealCoilDip','0.08',400,"Metres it sinks into the coil.",''),
   ('revealCoilFlap','-1.05',401,"Radians — wings drawn up together, ready. Negative is wings-up.",''),
   ('revealCoilSquash','0.93',402,"Scale multiplier at the bottom of the dip.",''),
   ('revealLaunchRise','1.60',410,"Metres it gains, most of it in the first third.",''),
   ('revealLaunchLean','0.25',411,"Metres it drifts toward its orbit slot during the launch.",''),
   ('revealSpinTurns','2',412,"Full rolls about the body axis across launch + soar. MUST be a whole number.",''),
   ('revealShock','4.0',413,"The takeoff shoves every other butterfly outward by this impulse.",''),
   ('revealJoinLift','0.18',418,"Metres the soar arcs upward at its midpoint.",''),
   ('revealJoinBank','0.22',419,"Radians of bank through the turn away, peaking mid-departure.",''),
   ('revealJoinArc','1.05',420,"Radians forward of the visitor's gaze to bias the orbit entry point.",''),
   ('revealTagFade','0.8',428,"Seconds the name tag takes to fade in, once orbiting.",''),
   ('revealDim','0.10',455,"Opacity the rest of the room falls to during a reveal.",''),
   ('revealSlow','0.35',456,"Time-scale ceiling on the 26 keys while the hero is up.",''),
   ('revealDimIn','1.5',457,"Seconds to recede, from 'keyboard:accepted'.",''),
   ('revealDimOut','3.5',458,"Seconds to come back, once the hero reaches its orbit.",''),
   ('revealBurst','8',467,"Letters thrown outward at the launch instant.",''),
   ('revealTrailGap','0.055',468,"Seconds between shed letters after that.",''),
   ('revealTrailTail','0.9',469,"Seconds into the soar that shedding stops.",''),
   ('revealTrailLife','1.9',470,"Seconds a shed letter lives.",''),
   ('revealTrailFall','0.55',471,"Metres/sec² it sinks. Gentle — this is ink, not gravity.",''),
   ('revealTrailDrag','1.4',472,"Per second the throw bleeds off.",''),
   ('revealTrailSpin','3.4',473,"Max radians/sec a shed letter tumbles.",''),
  ]),
  ('how big a wing is on the butterfly', [
   ('wingPlane','0.64',506,"Wing plane chord relative to the body plane. THE knob for overall butterfly scale — not sizeMin/colSizeMin, which are the unit half a dozen tuned constants are quoted in. Was 0.85 through v8.6.",'changed'),
  ]),
  ("the wing shape's fit in its slice", [
   ('wingFitFill','0.80',513,"0–1 of the per-wing headroom to take. The knob that lifts the SMALL wings: headroom runs 1.09× on a wing that already fills the slice up to 2.20× on one that does not.",'new'),
   ('wingFitSeam','1.00',514,"0–1, how far to slide the fore/hind seam onto the middle of the wing. Where most of the headroom comes from.",'new'),
   ('wingFitGain','1.05',515,"Flat multiplier on top of the fill. Still hard-clamped by the headroom, so it can never push a wing off the slice.",'new'),
   ('wingFitMargin','2.0',516,"Pixels of slice left clear on every side. Mip headroom, not a safety margin.",'new'),
  ]),
  ('the wing base colour', [
   ('wingColRandAmt','0.29',518,"Scales the jitter draws — shape placement wobble, linework spread. 0 = pure formula.",''),
   ('wingColStyle',"'random'",519,"Pattern kind: random | stripes | checker | dots | rings | sunburst.",''),
   ('wingColHues','6',520,"How many palette entries a name draws into its working set.",''),
   ('wingColShapes','0',521,"Big overlay shapes. 0 = per-name (1–3); 1–5 forces it.",''),
   ('wingColBlend',"'random'",522,"Force the blend mode: random | normal | difference | multiply | screen | exclusion.",''),
   ('wingColPatternScale','1.0',523,"Multiplier on pattern frequency. >1 = finer.",''),
   ('wingColAA','0',524,"Antialias half-width in PIXELS. 0 = fully hard edges, as the reference graphics.",''),
  ]),
  ('the name tag under a collected butterfly', [
   ('tagShow','true',536,"Whether the name renders at all.",''),
   ('tagAngular','0.085',537,"World height per metre of distance. Never faded with distance — the name is the visitor's record.",''),
   ('tagMin','0.050',538,"Floor on that angular scale.",''),
   ('tagMax','0.340',539,"Ceiling on it.",''),
   ('tagBodyDrop','-0.135',540,"Per unit model size: where the painted silhouette bottom sits, and the name's top with it. Set by the abdomen (BODY_ALPHA bottoms at −0.1407), not the wings.",''),
   ('tagJitter','0.75',541,"Per-letter angle and rise. Higher = wilder.",''),
  ]),
  ('palette', [
   ('bflySat','100',547,"Per cent. Butterflies are fully saturated, always — the scene is white.",''),
   ('bflyLit','47',548,"Lightness of a butterfly's own colour.",''),
   ('letterLit','36',552,"A letter is darker than its butterfly: type, not silhouette.",''),
   ('cutLit','46',554,"The letter cut out of the wing.",''),
   ('ghostLit','52',556,"The echo behind a letter.",''),
  ]),
 ]),

 dict(f='js/wing-gen.js', hue=150, blurb='The generator — a parity-locked port of the TouchDesigner Python — plus v8.7’s fit stage. The first three are structural: changing them breaks parity.', groups=[
  ('structure — do not move without re-running the parity harness', [
   ('SS','1',117,"Supersampling. NOT the Python's 2 — measured. Canvas2D already computes analytic coverage, so supersampling erodes the shape (ss1 −0.073%, ss2 −0.855%, ss4 −0.988%).",''),
   ('SEED','0',118,"The seed the baked roll table covers. Anything else falls through to WingPRNG and is explicitly off-parity.",''),
   ('SLICE_W','128',125,"Texture width — outward from the body.",''),
   ('SLICE_H','256',126,"Texture height — along the body, fore at the top. 1:2 because the wing reaches twice as far along the body as outward.",''),
   ('PARITY_ASPECT','1.0',127,"Pinned. expand() is always called with aspect 1.0, which keeps parity true by construction rather than by measurement.",''),
  ]),
  ('DEFAULTS — overridable per call via opts', [
   ('anchorV','0.5',130,"Seam position. 0.5 = fore and hind split mid-slice.",''),
   ('fitScale','0.9',131,"Fixed wing scale, the same in every variation.",''),
   ('bodyWid','0.055',132,"Root inset. Never randomised.",''),
   ('wingGap','0.02',133,"Gap between fore and hind at the root. Never randomised.",''),
   ('fitFill','0.80',135,"Fallback for CFG.wingFitFill.",'new'),
   ('fitSeam','1.00',136,"Fallback for CFG.wingFitSeam.",'new'),
   ('fitGain','1.05',137,"Fallback for CFG.wingFitGain.",'new'),
   ('fitMargin','2.0',138,"Fallback for CFG.wingFitMargin.",'new'),
  ]),
 ]),

 dict(f='js/bfly-model.js', hue=28, blurb='The mesh: one body plane and two wing planes on pivots. Size is not baked in — it lives on model.scale.', groups=[
  ('build geometry', [
   ('BASE','0.28',22,"Fixed build scale. The per-butterfly size multiplies this on the group.",''),
   ('wingPlane()','0.64',61,"Reads CFG.wingPlane, falls back to 0.64. Cut from 0.85 in v8.7 to pay for the fit stage.",'changed'),
  ]),
 ]),

 dict(f='js/wing-tex.js', hue=268, blurb='The seam between the generator and the scene: one CanvasTexture per unique wing, and who gets one.', groups=[
  ('the cache', [
   ('MAX_UNIQUE','64',28,"Distinct wing textures held at once, ~128 KB each. The 26 keys hold 26 of these for good, which is why CFG.maxCollected has a ~36 ceiling.",''),
  ]),
 ]),

 dict(f='js/wing-colour.js', hue=330, blurb='A name → a flat graphic composition. Deterministic from the name, but not parity-locked. Most of its behaviour is on the CFG.wingCol* keys above; these are the structural constants.', groups=[
  ('structure', [
   ('WX0 / WX1','0.01 / 0.85',90,"Where the wing actually is, across the slice. Composition is aimed here, not at the frame. Widened in v8.7 — the fit stage moved the painted box from x 0.00–0.59 to 0.00–0.85.",'changed'),
   ('WY0 / WY1','0.10 / 1.90',90,"The same, along the body. Was 0.15 / 1.72; the painted box moved from y 0.46–1.77 to 0.07–1.93.",'changed'),
   ('MINS','[10, 12, 12, 10, 10]',96,"Pixel floors per pattern kind, so nothing renders finer than it can be read at wing scale.",''),
   ('STYLES',"stripes · checker · dots · rings · sunburst",103,"The five pattern kinds. wingColStyle picks one or leaves it per-name.",''),
   ('BLENDS',"normal · difference · multiply · screen · exclusion",104,"The five blend modes a shape can composite through.",''),
   ('PAL_HEX','32 entries',111,"The fixed colour table sampled from the reference graphics. Edit here to change the palette.",''),
   ('N_BOLD / N_EARTH','18 / 8',125,"How the table splits: 18 bold, 8 earth, the remaining 6 neutral.",''),
  ]),
 ]),

 dict(f='js/style.js', hue=188, blurb='The typographic decisions, made once per letter and then fixed. Every constant here is a RANGE the per-letter hash draws from — move the range, not a value.', groups=[
  ('the letter sprite', [
   ('ANGLES','[0, 0, 0.12, −0.14, …]',37,"The set of angles a letter can be thrown to.",''),
   ('scale','0.72 + c · 0.55',52,"Deliberately a narrow band.",''),
   ('dist','0.55 + d · 0.95',54,"Multiples of the letter's own size.",''),
   ('mirror','e < 0.14',55,"14% of letters are mirrored.",''),
   ('hollow','f < 0.28',56,"28% are outlined rather than filled.",''),
   ('leader','g < 0.45',57,"45% get a hairline back to the body.",''),
  ]),
  ('the letter cut into the wing', [
   ('wingRot','(r − 0.5) · 2.0',84,"Radians, in the wing's plane.",''),
   ('wingSX','0.70 + r · 0.55',85,"Uneven squash — what a tilt out of plane reads as.",''),
   ('wingSY','0.55 + r · 0.62',86,"The other axis of that squash.",''),
   ('wingShear','(r − 0.5) · 0.75',87,"Shear, which is the rest of the tilt.",''),
   ('wingSize','0.62 + r · 0.34',88,"Multiples of the slice width.",''),
   ('wingOffX','(r − 0.5) · 0.22',89,"Placement wobble across the slice.",''),
   ('wingOffY','(r − 0.5) · 0.26',90,"Placement wobble along it.",''),
  ]),
 ]),

 dict(f='js/reveal.js', hue=45, blurb='The room’s dim/slow envelope and the wake of shed letters. Its timings are all CFG.reveal* above; these two are the pool sizes.', groups=[
  ('pools', [
   ('MAX_TRAIL','28',54,"The whole shed-letter pool, allocated once and reused forever.",''),
   ('HUE_STEPS','24',55,"Hue buckets for the wake-letter texture cache.",''),
  ]),
 ]),

 dict(f='js/ui.js', hue=300, blurb='Letter sprites, the cut-out wing glyph, the flower clusters, and the name tag.', groups=[
  ('drawing', [
   ('FONT','"Helvetica Neue", Helvetica, Arial…',32,"The one typeface the whole piece is set in.",''),
   ('LOBE_RIM','40',510,"Segments around a flower control's lobe.",''),
  ]),
 ]),

 dict(f='js/dna-store.js', hue=0, blurb='The collection: made, kept, brought back. Storage is behind DNA._store — replace that object to move the gallery to a server.', groups=[
  ('schema and storage', [
   ('SLOTS','4',45,"Values per sequence. DNA.capture auto-commits at this count.",''),
   ('PRECISION','6',46,"Decimal places stored — matches the TouchDesigner schema.",''),
   ('KEY',"'butterflies.dna.v1'",47,"localStorage key. Per-origin, so a headset and a desktop hold separate collections.",''),
   ('COLLECTION',"'dna_sequences.json'",58,"The shared file, served and written by serve.py.",''),
  ]),
 ]),

 dict(f='js/keyboard.js', hue=105, blurb='The flight amplitudes, drawn per butterfly at spawn. CFG.wander scales the first three live, so raise that rather than editing these — they were cut twice already and the FREQUENCIES matter as much as the amplitudes.', groups=[
  ('spawn — each is a rand(min, max) range', [
   ('speed','±rand(0.18, 0.5)',212,"Orbit rate, signed. Half go each way.",''),
   ('wobAmp / wobFreq','rand(0.035, 0.10) / rand(0.018, 0.045)',217,"Lateral wobble around the orbit.",''),
   ('radAmp / radFreq','rand(0.05, 0.16) / rand(0.015, 0.040)',218,"Drift in and out of the orbit radius.",''),
   ('hgtAmp / hgtFreq','rand(0.04, 0.12) / rand(0.012, 0.032)',219,"Drift up and down.",''),
   ('flapSpeed / flapAmp','rand(18, 27) / rand(0.9, 1.3)',220,"Wingbeat rate and dihedral.",''),
  ]),
  ('flight, in tick()', [
   ('glide / burst length','0.5 + r·0.9  /  1.2 + r·2.2',817,"Seconds of each phase of the flap–glide cycle.",''),
   ('glideAngle','−1.0 + 0.08 · sin(…)',824,"Wings held up with a tiny tremble while gliding.",''),
   ('body bob','0.01 · size',860,"Per-wingbeat bob. Runs at 3–4 Hz — the fastest movement on the butterfly — so it is deliberately tiny.",''),
   ('repulsor push','min(speed, 6) · 9 / (1 + 6·d²)',845,"How hard a moving hand scatters the swarm, within 1.4 m.",''),
   ('regroup spring','−1.2 · dt',849,"Pull back to the nominal path after a scatter.",''),
   ('bank','clamp(diff · 8, ±0.09)',874,"Radians of roll into a turn, smoothed over 420 ms.",''),
  ]),
 ]),

 dict(f='js/collection.js', hue=240, blurb='The kaleidoscope that accumulates — the same flight as the keyboard, in its own wider shell. Its own spawn ranges are a touch calmer.', groups=[
  ('spawn', [
   ('speed','±rand(0.10, 0.32)',239,"A touch slower than the keyboard's cruise — this is ambient.",''),
   ('wobAmp / wobFreq','rand(0.035, 0.10) / rand(0.018, 0.045)',241,"Same as the keyboard's.",''),
   ('radAmp / radFreq','rand(0.06, 0.20) / rand(0.012, 0.036)',242,"Wider radial drift than the keyboard's — the shell is bigger.",''),
   ('hgtAmp / hgtFreq','rand(0.05, 0.16) / rand(0.010, 0.030)',243,"Likewise for height.",''),
   ('flapSpeed / flapAmp','rand(18, 27) / rand(0.9, 1.3)',244,"Same wingbeat as the keys.",''),
  ]),
 ]),
]

TOP = [
 ("Butterflies too big or too small", "CFG.wingPlane", "js/config.js", 506,
  "Not sizeMin or colSizeMin — those set <code>size</code>, the unit the pick radius, the wingbeat bob and tagBodyDrop are all quoted in."),
 ("Flight too busy or too still", "CFG.wander", "js/config.js", 37,
  "Scales all three noise amplitudes live. The amplitudes themselves live in <code>keyboard.js</code> spawn and have been cut twice."),
 ("Small wings still too small", "CFG.wingFitSeam", "js/config.js", 514,
  "The seam recentre is the part that lifts the small ones. <code>wingFitFill</code> takes more headroom overall."),
 ("Too many butterflies at once", "CFG.maxCollected", "js/config.js", 307,
  "Ceiling around 36: <code>Wings.MAX_UNIQUE</code> is 64 and the 26 keys hold 26 slots for good."),
]

def esc(s): return html.escape(s, quote=False)

o = io.StringIO()
w = o.write

w('<title>Butterfly Keyboard Knobs</title>\n')
w('<link rel="preconnect" href="https://fonts.googleapis.com">\n')
w('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n')
w('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">\n')

w('''<style>
:root{
  --ground:#F4F6F9; --surface:#FFFFFF; --raise:#FBFCFD;
  --ink:#161A21; --ink-2:#39414F; --ink-3:#6B7585;
  --rule:#DFE4EB; --rule-2:#EDF0F4;
  --accent:#2440BE; --accent-soft:#E7EAFB;
  --new:#166A4A; --new-soft:#DFF1E8;
  --chg:#8A4A05; --chg-soft:#FBEEDC;
  --shadow:0 1px 2px rgba(20,26,38,.05);
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --ground:#0E1116; --surface:#161A21; --raise:#1B2029;
    --ink:#E7EAF0; --ink-2:#B3BCCA; --ink-3:#7C8798;
    --rule:#262D38; --rule-2:#1E242D;
    --accent:#8FA5FF; --accent-soft:#1B2340;
    --new:#5FD3A3; --new-soft:#12291F;
    --chg:#E5A85C; --chg-soft:#2B2013;
    --shadow:0 1px 2px rgba(0,0,0,.3);
  }
}
:root[data-theme="dark"]{
  --ground:#0E1116; --surface:#161A21; --raise:#1B2029;
  --ink:#E7EAF0; --ink-2:#B3BCCA; --ink-3:#7C8798;
  --rule:#262D38; --rule-2:#1E242D;
  --accent:#8FA5FF; --accent-soft:#1B2340;
  --new:#5FD3A3; --new-soft:#12291F;
  --chg:#E5A85C; --chg-soft:#2B2013;
  --shadow:0 1px 2px rgba(0,0,0,.3);
}

*{box-sizing:border-box}
body{
  background:var(--ground); color:var(--ink);
  font:400 15px/1.55 "IBM Plex Sans","Helvetica Neue",Arial,sans-serif;
  -webkit-font-smoothing:antialiased;
}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px 96px}

/* ---------- masthead ---------- */
header.top{padding:56px 0 26px}
.eyebrow{
  font:500 11px/1 "IBM Plex Mono",monospace; letter-spacing:.13em;
  text-transform:uppercase; color:var(--ink-3); margin:0 0 16px;
}
h1{
  font:400 clamp(38px,5.6vw,60px)/1.02 Newsreader,Georgia,serif;
  letter-spacing:-.015em; margin:0; text-wrap:balance;
}
h1 em{font-style:italic;color:var(--accent)}
.standfirst{
  margin:16px 0 0; max-width:62ch; color:var(--ink-2); font-size:16.5px;
}
.counts{
  display:flex;flex-wrap:wrap;gap:8px 10px;margin:22px 0 0;
  font:500 12px/1 "IBM Plex Mono",monospace;color:var(--ink-3);
}
.counts span{
  border:1px solid var(--rule);border-radius:2px;padding:6px 9px;background:var(--surface);
}
.counts b{color:var(--ink);font-weight:600}

/* ---------- "if you want to change X" ---------- */
.quick{
  margin:34px 0 0;border-top:2px solid var(--ink);padding-top:0;
}
.quick h2{
  font:500 11px/1 "IBM Plex Mono",monospace;letter-spacing:.13em;
  text-transform:uppercase;color:var(--ink-3);margin:14px 0 14px;
}
.quick ol{list-style:none;margin:0;padding:0;display:grid;gap:0}
.quick li{
  display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.35fr);
  gap:10px 28px;padding:14px 0;border-bottom:1px solid var(--rule-2);
  align-items:baseline;
}
.quick li:last-child{border-bottom:none}
.want{font-weight:500}
.want .arrow{color:var(--ink-3);font-family:"IBM Plex Mono",monospace}
.knob{font:600 14px/1.4 "IBM Plex Mono",monospace;color:var(--accent);white-space:nowrap}
.quick .why{color:var(--ink-2);font-size:14px}
.quick .why code{font:500 12.5px/1 "IBM Plex Mono",monospace;color:var(--ink)}

/* ---------- filter bar ---------- */
.bar{
  position:sticky;top:0;z-index:20;background:var(--ground);
  border-bottom:1px solid var(--rule);margin-top:44px;
  padding:12px 0;display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;
}
.search{
  flex:1 1 240px;min-width:200px;display:flex;align-items:center;gap:8px;
  background:var(--surface);border:1px solid var(--rule);border-radius:3px;padding:8px 11px;
}
.search input{
  border:0;background:transparent;color:var(--ink);width:100%;outline:none;
  font:400 14px/1.3 "IBM Plex Mono",monospace;
}
.search input::placeholder{color:var(--ink-3)}
.search:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{
  font:500 11.5px/1 "IBM Plex Mono",monospace;letter-spacing:.01em;
  border:1px solid var(--rule);background:var(--surface);color:var(--ink-2);
  border-radius:2px;padding:7px 9px;cursor:pointer;
  display:inline-flex;align-items:center;gap:6px;
}
.chip .dot{width:7px;height:7px;border-radius:50%;background:var(--h);flex:none}
.chip[aria-pressed="true"]{border-color:var(--ink);color:var(--ink);background:var(--raise)}
.chip:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.hitcount{font:500 12px/1 "IBM Plex Mono",monospace;color:var(--ink-3);margin-left:auto}

/* ---------- file sections ---------- */
section.file{margin-top:46px;scroll-margin-top:76px}
.filehead{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:baseline;
  border-bottom:2px solid var(--h);padding-bottom:9px}
.filehead h2{
  font:600 17px/1.2 "IBM Plex Mono",monospace;margin:0;letter-spacing:-.01em;
}
.filehead .n{font:500 12px/1 "IBM Plex Mono",monospace;color:var(--ink-3);margin-left:auto}
.fileblurb{margin:12px 0 0;color:var(--ink-2);font-size:14.5px;max-width:74ch}

h3.group{
  font:500 11px/1 "IBM Plex Mono",monospace;letter-spacing:.11em;text-transform:uppercase;
  color:var(--ink-3);margin:28px 0 8px;
}
.rows{display:grid;gap:0}
.row{
  display:grid;
  grid-template-columns:minmax(170px,1.05fr) minmax(120px,.85fr) minmax(230px,2fr) 62px;
  gap:6px 20px;align-items:baseline;
  padding:11px 10px 11px 12px;border-bottom:1px solid var(--rule-2);
  border-left:2px solid transparent;
}
.row:hover{background:var(--raise)}
.row .name{font:600 13.5px/1.4 "IBM Plex Mono",monospace;word-break:break-word}
.row .val{
  font:500 13px/1.4 "IBM Plex Mono",monospace;color:var(--accent);
  font-variant-numeric:tabular-nums;word-break:break-word;
}
.row .note{color:var(--ink-2);font-size:13.5px}
.row .note code{font:500 12px/1 "IBM Plex Mono",monospace;color:var(--ink)}
.row .at{
  font:400 12px/1.4 "IBM Plex Mono",monospace;color:var(--ink-3);
  font-variant-numeric:tabular-nums;text-align:right;
}
.row.is-new{border-left-color:var(--new);background:linear-gradient(90deg,var(--new-soft),transparent 42%)}
.row.is-chg{border-left-color:var(--chg);background:linear-gradient(90deg,var(--chg-soft),transparent 42%)}
.flag{
  display:inline-block;margin-left:7px;vertical-align:1px;
  font:600 9.5px/1 "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;
  padding:3px 5px;border-radius:2px;
}
.flag.new{color:var(--new);background:var(--new-soft)}
.flag.chg{color:var(--chg);background:var(--chg-soft)}

.empty{padding:40px 0;color:var(--ink-3);font-size:14.5px}

footer{
  margin-top:64px;padding-top:20px;border-top:1px solid var(--rule);
  color:var(--ink-3);font-size:13px;display:flex;flex-wrap:wrap;gap:6px 18px;
}
footer code{font:500 12px/1 "IBM Plex Mono",monospace}

@media (max-width:760px){
  .quick li{grid-template-columns:1fr}
  .row{grid-template-columns:1fr auto;gap:4px 14px}
  .row .note{grid-column:1/-1}
  .row .at{text-align:left}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
</style>
''')

total = sum(len(g[1]) for f in FILES for g in f['groups'])
newn = sum(1 for f in FILES for g in f['groups'] for r in g[1] if r[4])

w('<div class="wrap">\n')
w('<header class="top">\n')
w('<p class="eyebrow">Butterflies VR · v8.7 · versions/v8.7</p>\n')
w('<h1>Every knob, and <em>where it lives</em></h1>\n')
w('<p class="standfirst">The adjustable constants across the eleven source files — what each one does, its shipped value, and the file and line to find it on. Search by name, or filter to one file.</p>\n')
w('<div class="counts">')
w('<span><b>%d</b> tunables</span>' % total)
w('<span><b>%d</b> in config.js</span>' % sum(len(g[1]) for g in FILES[0]['groups']))
w('<span><b>11</b> files</span>')
w('<span><b>%d</b> new or changed in v8.7</span>' % newn)
w('</div>\n</header>\n')

w('<div class="quick"><h2>If you want to change…</h2><ol>\n')
for want, knob, f, line, why in TOP:
    w('<li><div class="want">%s <span class="arrow">→</span></div>' % esc(want))
    w('<div><div class="knob">%s <span style="color:var(--ink-3);font-weight:400">%s:%d</span></div>' % (esc(knob), esc(f), line))
    w('<div class="why">%s</div></div></li>\n' % why)
w('</ol></div>\n')

w('<div class="bar">\n')
w('<label class="search"><span aria-hidden="true" style="color:var(--ink-3);font:500 13px/1 \'IBM Plex Mono\',monospace">/</span>')
w('<input id="q" type="search" placeholder="filter by name, value or note…" aria-label="Filter variables"></label>\n')
w('<div class="chips" id="chips">')
w('<button class="chip" data-f="all" aria-pressed="true">all files</button>')
for f in FILES:
    short = f['f'].split('/')[-1]
    w('<button class="chip" data-f="%s" aria-pressed="false" style="--h:hsl(%d 58%% 46%%)"><span class="dot"></span>%s</button>'
      % (esc(short), f['hue'], esc(short)))
w('</div>\n<div class="hitcount" id="hits">%d shown</div>\n</div>\n' % total)

for f in FILES:
    short = f['f'].split('/')[-1]
    n = sum(len(g[1]) for g in f['groups'])
    w('<section class="file" data-file="%s" style="--h:hsl(%d 58%% 46%%)">\n' % (esc(short), f['hue']))
    w('<div class="filehead"><h2>%s</h2><span class="n">%d</span></div>\n' % (esc(f['f']), n))
    w('<p class="fileblurb">%s</p>\n' % esc(f['blurb']))
    for gname, rows in f['groups']:
        w('<h3 class="group">%s</h3>\n<div class="rows">\n' % esc(gname))
        for name, val, line, note, flag in rows:
            cls = ' is-new' if flag=='new' else (' is-chg' if flag=='changed' else '')
            fl = ''
            if flag=='new': fl = '<span class="flag new">new</span>'
            elif flag=='changed': fl = '<span class="flag chg">v8.7</span>'
            blob = (name+' '+val+' '+note).lower()
            w('<div class="row%s" data-s="%s">' % (cls, esc(blob.replace('"',''))))
            w('<div class="name">%s%s</div>' % (esc(name), fl))
            w('<div class="val">%s</div>' % esc(val))
            w('<div class="note">%s</div>' % note)
            w('<div class="at">%s:%d</div>' % (esc(short.replace('.js','')), line))
            w('</div>\n')
        w('</div>\n')
    w('</section>\n')

w('<p class="empty" id="empty" hidden>Nothing matches that.</p>\n')
w('<footer><span>Butterflies VR — generative DNA build</span>')
w('<span><code>versions/v8.7/</code></span>')
w('<span>Tuning pages: <code>tools/shape-preview.html</code>, <code>tools/colour-preview.html</code></span></footer>\n')
w('</div>\n')

w('''<script>
(function(){
  var q=document.getElementById('q'), chips=document.getElementById('chips'),
      hits=document.getElementById('hits'), empty=document.getElementById('empty'),
      rows=[].slice.call(document.querySelectorAll('.row')),
      secs=[].slice.call(document.querySelectorAll('section.file')),
      file='all';

  function apply(){
    var t=q.value.trim().toLowerCase(), n=0;
    rows.forEach(function(r){
      var sec=r.closest('section.file');
      var ok=(file==='all'||sec.dataset.file===file) && (!t||r.dataset.s.indexOf(t)>-1);
      r.hidden=!ok; if(ok)n++;
    });
    secs.forEach(function(s){
      var any=s.querySelector('.row:not([hidden])');
      s.hidden=!any;
      if(any){
        // hide groups that emptied out
        [].forEach.call(s.querySelectorAll('.rows'),function(g){
          var live=g.querySelector('.row:not([hidden])');
          g.hidden=!live;
          var h=g.previousElementSibling;
          if(h&&h.classList.contains('group')) h.hidden=!live;
        });
      }
    });
    hits.textContent=n+' shown';
    empty.hidden=n>0;
  }

  q.addEventListener('input',apply);
  chips.addEventListener('click',function(e){
    var b=e.target.closest('.chip'); if(!b)return;
    file=b.dataset.f;
    [].forEach.call(chips.children,function(c){c.setAttribute('aria-pressed',String(c===b));});
    apply();
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='/'&&document.activeElement!==q){e.preventDefault();q.focus();}
    if(e.key==='Escape'&&document.activeElement===q){q.value='';apply();q.blur();}
  });
})();
</script>
''')

# Emit every non-ASCII character as a numeric entity, so the page is
# byte-identical under any charset the host happens to declare.
out = ''.join(c if ord(c) < 128 else '&#%d;' % ord(c) for c in o.getvalue())
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'knobs.html')
with open(dst, 'w') as fh:
    fh.write(out)
print('%s  --  %d tunables, %d flagged' % (dst, total, newn))
