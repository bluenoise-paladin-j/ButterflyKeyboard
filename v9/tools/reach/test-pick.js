// ------------------------------------------------------------
//  interact.js: the three-layer pick ladder, and routing.
// ------------------------------------------------------------
load('stub-three.js');
load('stub-scene.js');
var V9 = '../../';           // this folder is <build>/tools/reach
load(V9 + 'js/config.js');
load(V9 + 'js/hands.js');
load(V9 + 'js/interact.js');

var FAIL = 0;
function ok(c, w) { if (!c) { FAIL++; print('  FAIL  ' + w); } else { print('  ok    ' + w); } }
function V(x, y, z) { return new THREE.Vector3(x, y, z); }

//  two stub providers with the same shape the real ones have
var KB = {
  initialized: true, hot: null, fired: null,
  targets: function () {
    return [
      { id: 'accept', pos: V(0.46, 1.16, -0.80), radius: 0.09, panel: true },
      { id: 'key7',   pos: V(0, 1.60, -1.60),    radius: 0.14, panel: false },
      { id: 'key8',   pos: V(0.9, 1.60, -1.60),  radius: 0.14, panel: false }
    ];
  },
  setHot: function (h) { this.hot = h; },
  activate: function (id) { this.fired = id; }
};
var COL = {
  initialized: true, hot: null, fired: null,
  targets: function () {
    return [
      //  directly behind key7 from the origin, and dead on the axis
      { id: 'col3', pos: V(0, 1.60, -3.60), radius: 0.22, panel: false, layer: 'col' },
      { id: 'col4', pos: V(-2.2, 1.90, -2.6), radius: 0.22, panel: false, layer: 'col' }
    ];
  },
  setHot: function (h) { this.hot = h; },
  activate: function (id) { this.fired = id; }
};
ELEMENTS['[butterfly-keyboard]'] = { components: { 'butterfly-keyboard': KB } };
ELEMENTS['[butterfly-collection]'] = { components: { 'butterfly-collection': COL } };

var pi = Object.create(COMPONENTS['pointer-input']);
pi.el = { sceneEl: SCENE_EL };
pi.data = {};
pi.init();

var provs = pi.providers();
ok(provs.length === 2, 'both providers found');

function all() {
  var out = [], p = pi.providers();
  for (var i = 0; i < p.length; i++) {
    var ts = p[i].targets();
    for (var j = 0; j < ts.length; j++) { ts[j].owner = p[i]; out.push(ts[j]); }
  }
  return out;
}
function shoot(from, to) {
  var d = new THREE.Vector3().copy(to).sub(from).normalize();
  return pi.pick(all(), from, d);
}

var eye = V(0, 1.6, 0);

print('\n== the ladder ==');
ok(pi.layerOf({ panel: true }) === 'panel', 'a control is the panel layer');
ok(pi.layerOf({ panel: false }) === 'key', 'a keyboard butterfly is the key layer');
ok(pi.layerOf({ layer: 'col' }) === 'col', 'a collected one says so itself');

var hit = shoot(eye, V(0, 1.6, -3.60));
ok(hit && hit.id === 'key7', 'a ray through a KEY at a butterfly behind it catches the key, got ' + (hit && hit.id));

hit = shoot(eye, V(-2.2, 1.90, -2.6));
ok(hit && hit.id === 'col4', 'a ray at a collected butterfly with nothing in front picks it, got ' + (hit && hit.id));

hit = shoot(eye, V(0.46, 1.16, -0.80));
ok(hit && hit.id === 'accept', 'the controls still win, got ' + (hit && hit.id));

hit = shoot(eye, V(3.0, 1.6, -1.0));
ok(hit === null, 'nothing aimed at picks nothing');

print('\n== the hover lock is keys-only ==');
var p = { lockId: null, lockChallengeId: null, lockChallengeAt: -Infinity };
var d = new THREE.Vector3().copy(V(-2.2, 1.90, -2.6)).sub(eye).normalize();
var sticky = pi.pickFlySticky(all(), eye, d, p, 0);
ok(sticky === null, 'a collected butterfly is invisible to the key lock');
d.copy(V(0.9, 1.6, -1.6)).sub(eye).normalize();
sticky = pi.pickFlySticky(all(), eye, d, p, 0);
ok(sticky && sticky.id === 'key8', 'a key is not, got ' + (sticky && sticky.id));

print('\n== routing ==');
//  drive one real tick through the hand path
var rig = RIGS.right;
rig.tracked = true;
rig.indexTip = V(0.1, 1.45, -0.30);
rig.indexKnuckle = V(0.1, 1.44, -0.26);
rig.pinch = 0.08;                       // open
//  aim the shoulder ray at col4 by putting the fingertip on that line
var sh = new THREE.Vector3(0, 1.6 - CFG.shoulderDown, 0).addScaledVector(V(1, 0, 0), CFG.shoulderOut);
var dir = new THREE.Vector3().copy(V(-2.2, 1.90, -2.6)).sub(sh).normalize();
rig.indexTip.copy(sh).addScaledVector(dir, 0.55);

CAM.matrixWorld.makeBasis(V(1, 0, 0), V(0, 1, 0), V(0, 0, 1));
CAM.position.set(0, 1.6, 0);

var t = 0;
for (var f = 0; f < 40; f++) { t += 16.7; pi.tick(t, 16.7); }
ok(KB.hot !== null && COL.hot !== null, 'both providers were told what is hot');
ok(COL.hot['col4'] === true, 'the collected butterfly reads as hot');
ok(!KB.hot['key7'], 'and no key does');

rig.pinch = 0.02;                       // pinch closed -> the rising edge
for (f = 0; f < 6; f++) { t += 16.7; pi.tick(t, 16.7); }
ok(COL.fired === 'col4', 'the pinch was routed to the collection, got ' + COL.fired);
ok(KB.fired === null, 'and not to the keyboard');

print(FAIL ? '\n*** ' + FAIL + ' FAILED ***' : '\nall passed');
