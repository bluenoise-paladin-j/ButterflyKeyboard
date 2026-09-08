// ------------------------------------------------------------
//  hands.js:palmPose against a synthetic hand, both sides, and
//  collection.js:_restQuat's axes.
// ------------------------------------------------------------
load('stub-three.js');
load('stub-scene.js');
var V9 = '../../';           // this folder is <build>/tools/reach
load(V9 + 'js/config.js');
load(V9 + 'js/reveal.js');
load(V9 + 'js/keyboard.js');
load(V9 + 'js/hands.js');
load(V9 + 'js/collection.js');

var FAIL = 0;
function ok(c, w) { if (!c) { FAIL++; print('  FAIL  ' + w); } else { print('  ok    ' + w); } }

//  A hand, in its own frame: +x across the palm toward the pinky (right
//  hand), -z the way the fingers point, +y out of the back of the hand.
//  Distances are ordinary adult ones; palm width comes out at 80 mm.
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
var FIST = { 9: [-0.025, 0.030, -0.060], 14: [0, 0.034, -0.062],
             19: [0.028, 0.032, -0.060], 24: [0.055, 0.028, -0.055] };

//  build a jointPoses array. `side` mirrors x, `flip` turns the hand
//  palm-DOWN (a rotation of pi about the finger axis: x and y negate),
//  `at` is where the wrist sits in the world.
function poses(side, flip, at, curled) {
  var p = new Array(25 * 16);
  for (var i = 0; i < 25 * 16; i++) { p[i] = (i % 17 === 0) ? 1 : 0; }
  for (var j in HAND) {
    var v = (curled && FIST[j]) ? FIST[j] : HAND[j];
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

print('\n== the palm normal is handed correctly ==');
['left', 'right'].forEach(function (side) {
  var rig = rigFor(side);
  read(rig, poses(side, false, [side === 'left' ? -0.2 : 0.2, 1.20, -0.35], false));
  print('  ' + side + ': normal.y ' + rig.palmNormal.y.toFixed(3) +
        '  width ' + (rig.palmWidth * 1000).toFixed(0) + ' mm');
  ok(rig.palmNormal.y > 0.9, side + ' hand held flat, palm up -> normal points up');
  ok(rig.palmUp, side + ' reads palm-up');
  ok(rig.palmFlat, side + ' reads flat');
  ok(rig.palmRaised, side + ' reads raised (1.20 m against a 1.60 m headset)');
  ok(rig.poseOk, side + ' is a complete offer');
});

print('\n== and every way of NOT offering is rejected ==');
var r = rigFor('right');
read(r, poses('right', true, [0.2, 1.20, -0.35], false));      // palm down
ok(!r.palmUp && !r.poseOk, 'palm turned over -> not up (normal.y ' + r.palmNormal.y.toFixed(2) + ')');
read(r, poses('right', false, [0.2, 1.20, -0.35], true));      // fist
ok(!r.palmFlat && !r.poseOk, 'fingers curled -> not flat');
read(r, poses('right', false, [0.2, 0.85, -0.35], false));     // hand down by the hip
ok(!r.palmRaised && !r.poseOk, 'hand lowered to 0.85 m -> not raised');
read(r, poses('right', false, [0.2, 1.20, -0.35], false));
ok(r.poseOk, 'and back to a good offer');

print('\n== the offer is held on the way in and out ==');
var t = 0;
r.offering = false; r._okSince = null; r._badSince = null;
r.holdOffer(true, t); ok(!r.offering, 'not offered on the first good frame');
t += CFG.palmHoldMs - 20; r.holdOffer(true, t); ok(!r.offering, 'nor just before palmHoldMs');
t += 40; r.holdOffer(true, t); ok(r.offering, 'offered once the pose has held');
t += 100; r.holdOffer(false, t); ok(r.offering, 'a lost frame does not withdraw it');
t += CFG.palmGraceMs; r.holdOffer(false, t); ok(!r.offering, 'a sustained loss does');

print('\n== the resting pose sits the butterfly on the palm ==');
var def = COMPONENTS['butterfly-collection'];
var comp = Object.create(def);
comp.el = { setObject3D: function () {}, sceneEl: SCENE_EL };
comp.data = {};
STORE.push({ id: 1, name: 'ADA', values: [0, 0, 0, 0] });
comp.init();
comp.tick(16, 16);
var c = comp.collected[0];
comp._haveCam = true;
comp._camPos.set(0, 1.6, 0);
c.pos.set(0.20, 1.22, -0.36);                       // on a palm in front and to the right

var n = new THREE.Vector3(0.15, 0.98, 0.1).normalize();   // a slightly tilted palm
var q = comp._restQuat(c, n, new THREE.Quaternion());
var wingNormal = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
var head = new THREE.Vector3(-1, 0, 0).applyQuaternion(q);   // the model's head is along local -X
var toCam = new THREE.Vector3().copy(comp._camPos).sub(c.pos).normalize();

//  the head can only ever lie IN the palm plane, so what it should be
//  parallel to is the visitor direction PROJECTED into that plane -- not
//  the raw one, which here points 42 degrees up out of it
var toCamFlat = new THREE.Vector3().copy(toCam).addScaledVector(n, -toCam.dot(n)).normalize();
print('  wing normal . palm normal = ' + wingNormal.dot(n).toFixed(4));
print('  head . (visitor, in the palm plane) = ' + head.dot(toCamFlat).toFixed(4));
print('  head . (visitor, raw) = ' + head.dot(toCam).toFixed(4) + '  (the palm is 42 deg below the eye line)');
ok(wingNormal.dot(n) > 0.999, 'the wings lie in the palm plane, facing out of it');
ok(head.dot(toCamFlat) > 0.999, 'the head is turned toward the visitor');
ok(Math.abs(head.dot(n)) < 0.001, 'and the body axis lies IN the palm plane');

print('\n== the camera directly over the palm does not blow it up ==');
comp._camPos.copy(c.pos).addScaledVector(n, 0.4);   // looking straight down the normal
var q2 = comp._restQuat(c, n, new THREE.Quaternion());
ok(!q2.isNaN(), 'degenerate look direction still gives a finite pose');
var wn2 = new THREE.Vector3(0, 1, 0).applyQuaternion(q2);
ok(wn2.dot(n) > 0.999, 'and the wings still lie in the palm plane');

print(FAIL ? '\n*** ' + FAIL + ' FAILED ***' : '\nall passed');
