// ------------------------------------------------------------
//  Drive collection.js's v9 arc head-on, under jsc.
// ------------------------------------------------------------
load('stub-three.js');
load('stub-scene.js');

var V9 = '../../';           // this folder is <build>/tools/reach
load(V9 + 'js/config.js');
load(V9 + 'js/reveal.js');     // real Reveal: dim/slow/active + the wake pool
load(V9 + 'js/keyboard.js');   // for makeNoise / makeFbm / smoothstep / rand / UP
load(V9 + 'js/hands.js');      // real hand-rig + the real Hands module
load(V9 + 'js/collection.js');

var FAIL = 0;
function ok(cond, what) { if (!cond) { FAIL++; print('  FAIL  ' + what); } else { print('  ok    ' + what); } }
function finite(v, what) { ok(isFinite(v.x) && isFinite(v.y) && isFinite(v.z), what); }

// ---- build the component ----
var def = COMPONENTS['butterfly-collection'];
var comp = Object.create(def);
comp.el = { setObject3D: function () {}, sceneEl: SCENE_EL };
comp.data = {};

// three stored butterflies
for (var i = 1; i <= 3; i++) { STORE.push({ id: i, name: 'NAME' + i, values: [0, 0, 0, 0] }); }
comp.init();

// ---- run frames ----
var T = 0;
function frames(seconds, dtMs) {
  dtMs = dtMs || 16.7;
  var n = Math.round(seconds * 1000 / dtMs);
  for (var f = 0; f < n; f++) { T += dtMs; comp.tick(T, dtMs); }
}
function states() {
  return comp.collected.map(function (c) { return c.state; }).join(',');
}
function byId(id) {
  for (var i = 0; i < comp.collected.length; i++) { if (comp.collected[i].id === id) { return comp.collected[i]; } }
  return null;
}
function offerPalm(side, x, y, z) {
  var r = RIGS[side];
  r.tracked = true; r.offering = true;
  r.palm.set(x, y, z); r.palmNormal.set(0, 1, 0);
}
function dropPalm(side) { RIGS[side].tracked = false; RIGS[side].offering = false; }

print('\n== the room replays and settles ==');
frames(4);
ok(comp.collected.length === 3, 'three butterflies built');
ok(states() === 'orbit,orbit,orbit', 'all orbiting: ' + states());

print('\n== targets ==');
var tg = comp.targets();
ok(tg.length === 3, 'three pickable, got ' + tg.length);
ok(tg[0].layer === 'col', "layer is 'col'");
ok(/^col\d+$/.test(tg[0].id), "id is prefixed: " + tg[0].id);
ok(tg[0].radius > 0.05 && tg[0].radius < 0.5, 'sane pick radius ' + tg[0].radius.toFixed(3));

print('\n== hover feedback ==');
comp.setHot({ col2: true });
ok(byId(2).hot === true && byId(1).hot === false, 'only #2 is hot');
frames(0.5);
ok(byId(2).hotScale > 1.1, 'hot one grew to ' + byId(2).hotScale.toFixed(3));
comp.setHot({});
frames(1);
ok(Math.abs(byId(2).hotScale - 1) < 0.02, 'and shrank back to ' + byId(2).hotScale.toFixed(3));

print('\n== NO HAND: summon -> hover -> leave -> orbit ==');
comp.activate('col1');
ok(byId(1).state === 'summon', 'pinch starts the summon');
var far = byId(1).pos.distanceTo(CAM.position);
var t0 = T;
while (byId(1).state === 'summon' && T - t0 < 30000) { frames(0.1); }
print('        approach took ' + ((T - t0) / 1000).toFixed(1) + ' s from ' + far.toFixed(2) + ' m');
ok(T - t0 < 9000, 'the approach is under 9 s');
var near = byId(1).pos.distanceTo(CAM.position);
ok(near < far, 'it came closer: ' + far.toFixed(2) + ' -> ' + near.toFixed(2) + ' m');
ok(byId(1).state === 'hover', 'hovering in front of the visitor');
ok(Math.abs(byId(1).pos.distanceTo(CAM.position) - CFG.hoverDist) < 0.15,
   'at hoverDist: ' + byId(1).pos.distanceTo(CAM.position).toFixed(2) + ' m');
finite(byId(1).pos, 'position is finite');
frames(CFG.hoverDwell + 0.5);
ok(byId(1).state === 'leave', 'gave up and left, state ' + byId(1).state);
frames(CFG.leaveTime + 1);
ok(byId(1).state === 'orbit', 'back in the kaleidoscope');
var r1 = Math.sqrt(byId(1).pos.x * byId(1).pos.x + byId(1).pos.z * byId(1).pos.z);
ok(r1 > CFG.colRadMin - 0.5, 'and back out at radius ' + r1.toFixed(2));
ok(byId(1).offset.length() < 0.2, 'no leftover path offset: ' + byId(1).offset.length().toFixed(3));

print('\n== A HAND: summon -> perch, and it holds ==');
offerPalm('right', 0.18, 1.15, -0.35);
comp.activate('col2');
var t1 = T;
while (byId(2).state === 'summon' && T - t1 < 30000) { frames(0.1); }
print('        approach to the hand took ' + ((T - t1) / 1000).toFixed(1) + ' s');
frames(1);
ok(byId(2).state === 'perch', 'it landed, state ' + byId(2).state);
var d = byId(2).pos.distanceTo(RIGS.right.palm);
ok(d < 0.05, 'sitting on the palm, ' + (d * 1000).toFixed(0) + ' mm off');
ok(Math.abs(byId(2).size * byId(2).scale - CFG.perchSize) < 0.06,
   'at perch size ' + (byId(2).size * byId(2).scale).toFixed(3));
ok(byId(2).summonSide === 'right', 'aimed at the right hand');
finite(byId(2).pos, 'position is finite');
ok(!byId(2).bm.model.quaternion.isNaN(), 'rest orientation is finite');

print('\n== the hand moves: it follows ==');
RIGS.right.palm.set(-0.25, 1.30, -0.30);
frames(1.0);
ok(byId(2).pos.distanceTo(RIGS.right.palm) < 0.05, 'followed the hand');
ok(byId(2).state === 'perch', 'still perched');

print('\n== the hand drops: it goes ==');
dropPalm('right');
frames(0.05);
ok(byId(2).state === 'leave', 'left on the frame the offer went, state ' + byId(2).state);
frames(CFG.leaveTime + 1);
ok(byId(2).state === 'orbit', 'and rejoined');

print('\n== hover -> a palm goes up -> it comes to it ==');
comp.activate('col3');
frames(10);
ok(byId(3).state === 'hover', 'hovering first, state ' + byId(3).state);
offerPalm('left', -0.20, 1.20, -0.40);
frames(0.1);
ok(byId(3).state === 'summon', 'a raised palm redirects it, state ' + byId(3).state);
frames(6);
ok(byId(3).state === 'perch', 'and it lands, state ' + byId(3).state);

print('\n== perchDwell expires ==');
frames(CFG.perchDwell + 1);
ok(byId(3).state === 'leave' || byId(3).state === 'orbit', 'it leaves of its own accord, state ' + byId(3).state);
dropPalm('left');
frames(CFG.leaveTime + 2);
ok(states() === 'orbit,orbit,orbit', 'the room is scenery again: ' + states());

print('\n== summonMax ==');
comp.activate('col1');
frames(1);
comp.activate('col2');
frames(0.1);
ok(byId(1).state === 'leave', 'the first one was sent home, state ' + byId(1).state);
ok(byId(2).state === 'summon', 'the second one was honoured');
frames(20);

print('\n== a long frame does not break the approach ==');
comp.activate('col3');
comp.tick(T += 300, 300);       // a 300 ms hitch
finite(byId(3).pos, 'position survived a 300 ms frame');
frames(30);
ok(byId(3).state === 'orbit' || SUMMONED[byId(3).state], 'still in a sane state: ' + byId(3).state);

print('\n== nothing is pickable during a reveal ==');
Reveal.begin(); comp.tick(T += 17, 17);
ok(comp.targets().length === 0, 'targets() is empty while the room is receding');
Reveal.release();
frames(CFG.revealDimOut + 1);
ok(comp.targets().length > 0, 'and comes back after it: ' + comp.targets().length);

print(FAIL ? '\n*** ' + FAIL + ' FAILED ***' : '\nall passed');
