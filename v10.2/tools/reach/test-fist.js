// ------------------------------------------------------------
//  v10.2: the exhibition team's hard reset -- two closed fists, held up,
//  held for five seconds.
//
//  THE WHOLE QUESTION IS WHETHER IT COLLIDES WITH ANYTHING, and the
//  answer is not obvious from the code: a fist is trivially not a flat
//  palm, but a PINCH WITH THE OTHER THREE FINGERS CURLED -- which is how
//  a great many people pinch -- is very nearly a fist. This file measures
//  that case against the same synthetic hand every other palm test uses,
//  and it is the reason `fistBall` measures all five tips against the
//  palm centre rather than four against the wrist.
// ------------------------------------------------------------
load('stub-three.js');
load('stub-scene.js');
var V10 = '../../';          // this folder is <build>/tools/reach
load(V10 + 'js/config.js');
load(V10 + 'js/hands.js');

var FAIL = 0;
function ok(c, w) { if (!c) { FAIL++; print('  FAIL  ' + w); } else { print('  ok    ' + w); } }

//  the same adult hand test-palm.js uses, in its own frame: +x across the
//  palm toward the pinky (right hand), -z the way the fingers point, +y
//  out of the back of the hand. Palm width comes out at 80 mm.
var HAND = {
  0:  [0, 0, 0],            // wrist
  6:  [-0.025, 0, -0.080],  // index knuckle
  11: [ 0.000, 0, -0.085],  // middle
  16: [ 0.028, 0, -0.080],  // ring
  21: [ 0.055, 0, -0.072],  // pinky
  9:  [-0.025, 0, -0.155],  // index tip
  14: [ 0.000, 0, -0.165],  // middle
  19: [ 0.028, 0, -0.155],  // ring
  24: [ 0.055, 0, -0.130],  // pinky
  4:  [-0.055, 0, -0.055]   // thumb tip
};

//  A FIST: all four fingers rolled in against the palm, and the thumb
//  folded across them -- which is what a closed fist actually is, and
//  what the first draft of this got wrong by leaving the thumb out where
//  an open hand has it.
var FIST = {
  9:  [-0.025, 0.030, -0.060], 14: [0, 0.034, -0.062],
  19: [ 0.028, 0.032, -0.060], 24: [0.055, 0.028, -0.055],
  4:  [ 0.005, 0.038, -0.058]
};

//  A PINCH, the awkward case: thumb and index tips meeting IN FRONT OF
//  the palm, with the other three curled in exactly as the fist has them.
//  On any measure that ignores the thumb this is a fist.
var PINCH_CURLED = {
  9:  [-0.048, 0.004, -0.104], 4: [-0.052, 0.000, -0.100],
  14: [0, 0.034, -0.062], 19: [0.028, 0.032, -0.060], 24: [0.055, 0.028, -0.055]
};

//  ...and an ordinary pinch, other fingers still out
var PINCH_OPEN = {
  9: [-0.048, 0.004, -0.104], 4: [-0.052, 0.000, -0.100]
};

function poses(side, flip, at, override) {
  var p = new Array(25 * 16);
  for (var i = 0; i < 25 * 16; i++) { p[i] = (i % 17 === 0) ? 1 : 0; }
  for (var j in HAND) {
    var v = (override && override[j]) ? override[j] : HAND[j];
    var x = v[0], y = v[1], z = v[2];
    if (side === 'left') { x = -x; }
    if (flip) { x = -x; y = -y; }
    p[j * 16 + 12] = at[0] + x;
    p[j * 16 + 13] = at[1] + y;
    p[j * 16 + 14] = at[2] + z;
  }
  return p;
}

function rigFor(side) {
  var r = Object.create(COMPONENTS['hand-rig']);
  r.data = { hideModel: true };
  r.el = { id: side === 'left' ? 'handL' : 'handR', components: {},
           sceneEl: SCENE_EL, object3D: new THREE.Object3D() };
  r.init();
  return r;
}
function read(rig, p) {
  for (var i = 0; i < p.length; i++) { rig.poses[i] = p[i]; }
  rig.jointPos(rig.poses, 0, rig.wrist);
  rig.palmPose(rig.poses);
}

var UP = [0.2, 1.20, -0.35];       // held up, against a 1.60 m headset
var DOWN = [0.2, 0.80, -0.35];     // hanging by a hip
var r = rigFor('right');
var L = rigFor('left');

print('== the four poses, measured ==');
//  ballT is the FARTHEST of the five tips from the palm centre, in palm
//  widths. Print it before asserting on it -- these numbers are the whole
//  argument for the threshold, and for taking a max rather than a mean.
var M = {};
[['open', null], ['fist', FIST], ['pinch, fingers curled', PINCH_CURLED],
 ['pinch, fingers out', PINCH_OPEN]].forEach(function (row) {
  read(r, poses('right', false, UP, row[1]));
  M[row[0]] = r.ballT;
  print('  ' + (row[0] + '                       ').slice(0, 22) +
        ' ballT ' + r.ballT.toFixed(3) +
        '   balled ' + (r.balled ? 'YES' : 'no ') +
        '   (fistBall ' + CFG.fistBall + ')');
});

ok(M['fist'] < CFG.fistBall, 'a fist is balled: ' + M['fist'].toFixed(3));
ok(M['open'] > CFG.fistBall, 'an open hand is not: ' + M['open'].toFixed(3));

print('\n== ...and the collision that had to be designed around ==');
ok(M['pinch, fingers curled'] > CFG.fistBall,
   'A PINCH WITH THE FINGERS CURLED IS NOT A FIST: ' + M['pinch, fingers curled'].toFixed(3) +
   ' against ' + CFG.fistBall);
ok(M['pinch, fingers out'] > CFG.fistBall,
   'nor is an ordinary pinch: ' + M['pinch, fingers out'].toFixed(3));
//  the margin is what says the threshold is not sitting on a knife edge
var margin = M['pinch, fingers curled'] - M['fist'];
ok(margin > 0.15, 'and the gap between them is real: ' + margin.toFixed(3) + ' palm widths');
print('        fist ' + M['fist'].toFixed(3) + '  ..  ' + CFG.fistBall +
      '  ..  ' + M['pinch, fingers curled'].toFixed(3) + ' curled pinch  ..  ' +
      M['open'].toFixed(3) + ' open');

print('\n== a fist is never an offer, and an offer is never a fist ==');
read(r, poses('right', false, UP, FIST));
ok(!r.palmFlat, 'a fist does not read as flat');
ok(!r.poseOk, '...so it can never be an offer');
read(r, poses('right', false, UP, null));
ok(r.poseOk && !r.balled, 'and a flat offered palm is never balled');

print('\n== a fist has to be held UP ==');
//  hands hang closed by a person's side all the time
read(r, poses('right', false, DOWN, FIST));
ok(r.balled && !r.palmRaised && !r.fistPose,
   'a closed hand at hip height is balled but not raised, so not the pose');
read(r, poses('right', false, UP, FIST));
ok(r.fistPose, 'held up, it is');

print('\n== and held for five seconds ==');
var t = 0;
r.fist = false; r._fistSince = null; r._fistBad = null;
r.holdFist(true, t);
ok(!r.fist, 'not on the first frame');
t += CFG.fistHoldMs - 200; r.holdFist(true, t);
ok(!r.fist, 'nor just before fistHoldMs (' + (CFG.fistHoldMs / 1000) + ' s)');
t += 400; r.holdFist(true, t);
ok(r.fist, 'and then it is');

print('\n   -- a tracking blink does not restart the five seconds --');
//  the difference from holdOffer, and it matters over a hold this long:
//  Quest hand tracking drops a frame or two at a time, and a five-second
//  hold that reset on every blink would be unusable in a room with any
//  hand occlusion in it.
var r2 = rigFor('right');
r2.fist = false; r2._fistSince = null; r2._fistBad = null;
t = 0;
r2.holdFist(true, t);
t += 3000; r2.holdFist(true, t);                 // 3 s in
t += 100;  r2.holdFist(false, t);                // ...and a blink
t += 100;  r2.holdFist(true, t);                 // back
t += 1900; r2.holdFist(true, t);                 // 5.1 s of pose in total
ok(r2.fist, 'a 100 ms dropout mid-hold does not cost the hold');
var r3 = rigFor('right');
r3.fist = false; r3._fistSince = null; r3._fistBad = null;
t = 0;
r3.holdFist(true, t);
t += 3000; r3.holdFist(true, t);
//  ...sampled every frame, the way tick() calls it -- one lone false
//  frame can never outlast the grace, and the first draft of this test
//  called it once and then wondered why the clock had not restarted
for (var q = 0; q < 20; q++) { t += 50; r3.holdFist(false, t); }   // 1 s of open hands
t += 2500; r3.holdFist(true, t);
ok(!r3.fist, 'but genuinely opening the hands does: the clock restarts');

print('\n== it takes BOTH hands ==');
//  which is the safety, not a formality: a pinch is one hand doing the
//  work while the other hangs, so two balled hands held up together is a
//  pose no visitor reaches by accident.
ELEMENTS['#handL'] = { components: { 'hand-rig': L } };
ELEMENTS['#handR'] = { components: { 'hand-rig': r } };
L.fist = false; r.fist = true;
ok(Hands.fists() === 1, 'one fist is one fist');
ok(!Hands.resetAsked(), '...and one is not a reset (fistHands ' + CFG.fistHands + ')');
L.fist = true;
ok(Hands.fists() === 2 && Hands.resetAsked(), 'two is');
L.fist = false; r.fist = false;
ok(!Hands.resetAsked(), 'and opening them clears it');

print(FAIL ? '\n*** ' + FAIL + ' FAILED ***' : '\nall passed');
