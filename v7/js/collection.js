// ============================================================
//  collection.js  --  the kaleidoscope that accumulates
// ============================================================
//  Every visitor's name grows one butterfly (app.js -> DNA.create ->
//  'dna:committed'), and it stays for the rest of the exhibition. The
//  room begins empty and ends as a record of everyone who passed
//  through it. This component owns those butterflies: it flies a new
//  one in when it is committed, and it replays the whole stored
//  collection on load.
//
//  NOT the keyboard. These cannot be caught (they are never in
//  keyboard.js:targets(), so interact.js cannot see them), they carry
//  a NAME rather than a letter, and they fly in their own wider, taller
//  shell (CFG.col*) so the kaleidoscope reads as the room around you
//  and the keyboard stays the near, actionable layer in front.
//
//  The flight is a simplified port of keyboard.js:tickKey / pathAt /
//  presentRoll / readSources / separate -- no capture states, no
//  slow-field, no per-key clock, no letter. keyboard.js:tickKey is the
//  SOURCE OF TRUTH; a flight bugfix there must be mirrored here. It is
//  copied rather than shared because factoring it out would be surgery
//  on the most-tuned file in the piece, and the two flights genuinely
//  differ. The file-global helpers (makeNoise / makeFbm / smoothstep /
//  rand / UP) are reused from keyboard.js -- this script loads after it.
//
//  A committed entry is ENQUEUED, never built in the event handler:
//  'dna:committed' fires synchronously inside keyboard.js's tick, and
//  generating a wing mid-tick hitches. tick() drains the queue a couple
//  per frame, the way web/js/swarm.js does.
// ============================================================
AFRAME.registerComponent('butterfly-collection', {
  init: function () {
    var self = this;

    //  `this.name` on an A-Frame component silently unregisters its own
    //  tick() -- see CLAUDE.md. The collection lives on `this.collected`.
    this.root = new THREE.Group();
    this.el.setObject3D('mesh', this.root);

    this.collected = [];      // built butterflies: { id, bm, tag, group, anchor, phase, ... }
    this.queue = [];          // { entry, fling } waiting for a free frame to be built
    this.sources = [];        // repulsor sources (the hands, the head)
    this.repulsors = [];
    this._camPos = new THREE.Vector3();
    this._camFwd = new THREE.Vector3(0, 0, -1);   // where the visitor is looking
    this._q = new THREE.Quaternion();
    this._tmp = new THREE.Vector3();
    this._box = new THREE.Box3();
    this._haveCam = false;

    //  The v6.2 lesson (see the "config keys drift" note in its
    //  VERSION.md): a CFG key the code reads but config.js never defined
    //  multiplies to NaN and renders nothing, invisibly. Fail loud instead.
    ['maxCollected', 'colRadMin', 'colRadMax', 'colHgtMin', 'colHgtMax',
     'colSizeMin', 'colSizeRange', 'bflySat', 'bflyLit', 'wander',
     'readRoll', 'acceptResetDelay', 'eyeY',
     'presentDist', 'presentRise', 'presentSize', 'presentArrive',
     'presentHold', 'presentJoin'].forEach(function (k) {
      if (CFG[k] === undefined) { console.error('[collection] CFG.' + k + ' is undefined'); }
    });

    //  The collection persists -- replay what is stored, newest first,
    //  capped. tick() drains this a couple per frame so a full room does
    //  not generate every wing in one hitch.
    var want = DNA.sequences().slice(-CFG.maxCollected).reverse();
    for (var i = 0; i < want.length; i++) { this.queue.push({ entry: want[i], fling: false }); }

    window.addEventListener('dna:committed', function (e) { self.enqueue(e.detail, true); });
    window.addEventListener('dna:changed', function () { self.rebuild(); });

    //  Repulsor sources, exactly as keyboard.js wires them: the tracked
    //  hands (via hand-rig, since hand-tracking-controls pins its entity
    //  to the origin) and the head. A fast hand scatters the cloud a
    //  little; a slow one does nothing.
    this.el.sceneEl.addEventListener('loaded', function () {
      var sel = ['#handL', '#handR', '[camera]'];
      for (var j = 0; j < sel.length; j++) {
        var n = document.querySelector(sel[j]);
        if (!n) { continue; }
        self.sources.push({
          el: n, isCamera: sel[j] === '[camera]', isHand: sel[j].indexOf('hand') === 1,
          pos: new THREE.Vector3(), prev: new THREE.Vector3(), speed: 0, started: false
        });
      }
    });
  },

  // ---------- the queue ----------
  //  A committed entry -> queued. NEVER build here (see the header):
  //  this runs synchronously inside keyboard.js's tick.
  enqueue: function (entry, fling) {
    if (this.hasId(entry.id)) { return; }
    this.queue.push({ entry: entry, fling: !!fling });
  },

  hasId: function (id) {
    var i;
    for (i = 0; i < this.collected.length; i++) { if (this.collected[i].id === id) { return true; } }
    for (i = 0; i < this.queue.length; i++) { if (this.queue[i].entry.id === id) { return true; } }
    return false;
  },

  //  Storage changed under us -- a DELETE, an import, or (phase 2) a
  //  hydrate from the shared file. Reconcile the scene against the
  //  newest maxCollected, keeping what should stay. Checks `collected`
  //  AND `queue` so an entry mid-flight is not queued twice.
  rebuild: function () {
    var want = DNA.sequences().slice(-CFG.maxCollected).reverse();
    var wantIds = {}, i;
    for (i = 0; i < want.length; i++) { wantIds[want[i].id] = true; }

    for (i = this.collected.length - 1; i >= 0; i--) {
      if (!wantIds[this.collected[i].id]) { this.removeOne(i); }
    }
    this.queue = this.queue.filter(function (q) { return wantIds[q.entry.id]; });
    for (i = 0; i < want.length; i++) {
      if (!this.hasId(want[i].id)) { this.queue.push({ entry: want[i], fling: false }); }
    }
  },

  // ---------- build one ----------
  spawn: function (entry, fling) {
    var rec = Wings.forDials(DNA.dialsFor(entry));
    //  Hue from the name (stable per name, like the wing), but the
    //  keys' white-tuned saturation/lightness -- Wings.colorFor's own
    //  S/L range predates the white sky and washes out on it.
    var hue = Math.floor(Wings.hashValues(entry.values) * 360);
    var color = 'hsl(' + hue + ', ' + CFG.bflySat + '%, ' + CFG.bflyLit + '%)';
    var bm = BflyModel.build(rec.tex, color);      // rec.tex is an alphaMap -- not srgb-tagged

    var group = new THREE.Group();
    group.add(bm.model);
    this.root.add(group);

    //  the geometry's lowest point at scale 1, so the name can hug the
    //  actual silhouette at any size (the body plane bottom, ~ -0.4)
    var modelBottom = this._box.setFromObject(bm.model).min.y;
    if (!isFinite(modelBottom)) { modelBottom = -0.42; }

    //  The name hangs off a position-only anchor, never the yaw -- the
    //  flying group turns to face its heading and would swing the name
    //  round the body. Same trick as the keys' letters.
    var anchor = new THREE.Group();
    this.root.add(anchor);
    var tag = null;
    if (entry.name) {
      //  seeded off the stored id: the name keeps its exact wonky layout
      //  across reloads, but two visitors with the same name differ
      tag = UI.nameTag(entry.name, entry.id);
      anchor.add(tag.sprite);
    }

    var sd = rand(0, 1000);
    var c = {
      id: entry.id, bm: bm, tag: tag, group: group, anchor: anchor,
      modelBottom: modelBottom,
      //  'present'  just committed -- rising into view in front of the visitor
      //  'joining'  flying from there out to its orbit
      //  'orbit'    the ambient flight (replayed butterflies start here)
      state: fling ? 'present' : 'orbit',
      stateT: 0,
      sizeT: Math.random(), radT: Math.random(), hgtT: Math.random(),
      //  a touch slower than the keyboard's cruise -- this is ambient
      speed: (Math.random() < 0.5 ? -1 : 1) * rand(0.10, 0.32),
      phase: rand(0, Math.PI * 2),
      wobAmp: rand(0.035, 0.10), wobFreq: rand(0.018, 0.045),
      radAmp: rand(0.06, 0.20),  radFreq: rand(0.012, 0.036),
      hgtAmp: rand(0.05, 0.16),  hgtFreq: rand(0.010, 0.030),
      flapSpeed: rand(18, 27), flapAmp: rand(0.9, 1.3), flapPh: rand(0, 6.28),
      nWob: makeFbm(sd + 1.1), nRad: makeFbm(sd + 2.2), nHgt: makeFbm(sd + 3.3),
      offset: new THREE.Vector3(), offsetVel: new THREE.Vector3(),
      pathPos: new THREE.Vector3(), pos: new THREE.Vector3(), prev: new THREE.Vector3(),
      presentAt: new THREE.Vector3(), joinFrom: new THREE.Vector3(),
      first: true, smoothRoll: 0,
      flapEnv: 1, gliding: false, cycleT: 1 + Math.random() * 2,
      //  both a committed butterfly (mid-present) and a replayed one fade
      //  and scale up from nothing
      scale: 0.5, alpha: 0
    };
    c.size = CFG.colSizeFor(c.sizeT);
    c.radius = CFG.colRadiusFor(c.radT);
    c.height = CFG.colHeightFor(c.hgtT);
    bm.model.scale.setScalar(c.size * c.scale);

    if (fling) {
      //  the spot in front of the visitor, captured ONCE now so the
      //  butterfly rises to a fixed point rather than chasing the head
      if (this._haveCam) {
        c.presentAt.copy(this._camPos).addScaledVector(this._camFwd, CFG.presentDist);
      } else {
        c.presentAt.set(0, CFG.eyeY, -CFG.presentDist);
      }
      c.presentAt.y += CFG.presentRise;
      c.pos.copy(c.presentAt); c.pos.y -= 0.55;      // start just below, rise into view
    } else {
      //  replayed: straight onto its orbit
      this.pathAt(c, 0, c.pos);
    }
    c.prev.copy(c.pos);
    c.group.position.copy(c.pos);
    c.anchor.position.copy(c.pos);

    this.collected.push(c);
    //  over the cap: evict the OLDEST from the scene, keep its record in
    //  storage -- it comes back on reload or if the cap is raised
    while (this.collected.length > CFG.maxCollected) { this.removeOne(0); }
  },

  removeOne: function (i) {
    var c = this.collected[i];
    if (!c) { return; }
    this.root.remove(c.group);
    this.root.remove(c.anchor);
    c.bm.dispose();                 // geo + materials; the wing texture belongs to Wings
    if (c.tag) { c.tag.dispose(); } // material only; the tag texture stays cached
    this.collected.splice(i, 1);
  },

  // ---------- per frame ----------
  tick: function (time, dtMs) {
    if (!dtMs) { return; }
    var dt = Math.min(dtMs / 1000, 0.05);
    var t = time / 1000;
    var i;

    var cam = this.el.sceneEl.camera;
    this._haveCam = !!cam;
    if (cam) {
      cam.getWorldPosition(this._camPos);
      cam.getWorldQuaternion(this._q);
      this._camFwd.set(0, 0, -1).applyQuaternion(this._q);   // the look direction, unambiguously
    }

    //  build a couple of queued butterflies per frame -- WingGen.drawWing
    //  is a few ms and doing a roomful in one frame hitches
    var budget = 2;
    while (this.queue.length && budget-- > 0) {
      var q = this.queue.shift();
      if (!this.hasId(q.entry.id)) { this.spawn(q.entry, q.fling); }
    }

    this.readSources(dt);
    for (i = 0; i < this.collected.length; i++) { this.tickOne(this.collected[i], t, dt); }
    this.separate(dt);
  },

  //  Where the hands and the head are, and how fast. Verbatim from
  //  keyboard.js:readSources -- hand-tracking-controls pins its entity
  //  to the origin, so a hand's position comes from hand-rig.point.
  readSources: function (dt) {
    this.repulsors.length = 0;
    for (var i = 0; i < this.sources.length; i++) {
      var s = this.sources[i];
      var obj;
      if (s.isHand) {
        var rig = s.el.components && s.el.components['hand-rig'];
        obj = rig && rig.tracked ? rig.point : null;
      } else {
        obj = s.el.object3D;
      }
      if (!obj) { s.started = false; continue; }
      obj.getWorldPosition(s.pos);
      if (!s.started) {
        if (s.pos.lengthSq() > 1e-6) { s.started = true; s.prev.copy(s.pos); }
        continue;
      }
      s.speed = s.pos.distanceTo(s.prev) / dt;
      s.prev.copy(s.pos);
      this.repulsors.push({ pos: s.pos, speed: s.isCamera ? s.speed * 0.7 : s.speed });
    }
  },

  //  keyboard.js:pathAt, minus the partial-arc branch -- the collection
  //  is always a full circle around the visitor whatever CFG.arcSpan
  //  does to the keyboard, so k.centre / k.swing are not needed and the
  //  arcSpan-NaN hazard cannot reach here.
  pathAt: function (c, t, out) {
    var wa = CFG.wander;
    var theta = c.phase + c.speed * t;
    theta += c.wobAmp * wa * c.nWob(t * c.wobFreq);
    var r = Math.max(1.2, c.radius + c.radAmp * wa * c.nRad(t * c.radFreq));
    var y = Math.max(0.40, c.height + c.hgtAmp * wa * c.nHgt(t * c.hgtFreq));
    out.set(r * Math.cos(theta), y, r * Math.sin(theta));
    return out;
  },

  //  Three states. 'present' and 'joining' are scripted; 'orbit' is the
  //  ambient flight and is where a butterfly spends its whole life after
  //  the first ~5 seconds.
  tickOne: function (c, t, dt) {
    if (c.state === 'present') { this.tickPresent(c, t, dt); return; }
    if (c.state === 'joining') { this.tickJoining(c, t, dt); return; }
    this.tickOrbit(c, t, dt);
  },

  //  dress the mesh + place the tag -- shared by all three states.
  //  The tag hugs the bottom of the ACTUAL scaled silhouette
  //  (c.modelBottom), so it stays tucked in whatever the butterfly's size.
  render: function (c) {
    var s = c.size * c.scale;
    c.bm.model.scale.setScalar(s);
    c.bm.setOpacity(c.alpha);
    c.group.visible = c.alpha > 0.01;
    c.anchor.visible = c.group.visible;
    c.anchor.position.copy(c.pos);                  // position only, never the yaw
    c.group.position.copy(c.pos);
    if (c.tag && this._haveCam) {
      //  hug the visible silhouette: modelBottom is the geometry's edge,
      //  tagCling pulls the name up into the body a little from there
      c.tag.place(this._camPos, c.pos, c.modelBottom * s * CFG.tagCling, c.alpha);
    }
  },

  //  "HERE'S YOUR BUTTERFLY." It rises into a spot in front of the
  //  visitor -- following the head on a slow lag so it stays in view --
  //  turns to face them, and hovers at a comfortable size (whatever its
  //  orbit size will be) while the name settles under it. Then it peels
  //  off to join the kaleidoscope (tickJoining), growing or shrinking to
  //  its real size on the way.
  tickPresent: function (c, t, dt) {
    c.stateT += dt;
    var u = Math.min(1, c.stateT / CFG.presentArrive);
    var e = smoothstep(u);

    //  the live spot in front of the visitor; presentAt eases toward it
    if (this._haveCam) {
      this._tmp.copy(this._camPos).addScaledVector(this._camFwd, CFG.presentDist);
      this._tmp.y += CFG.presentRise;
      c.presentAt.lerp(this._tmp, Math.min(1, dt / 0.5));
    }
    this._tmp.copy(c.presentAt);
    this._tmp.y -= 0.55 * (1 - e);                  // rise the last bit into place
    c.pos.lerp(this._tmp, Math.min(1, dt / 0.12));
    c.pos.y += 0.012 * Math.sin(t * 2.1 + c.flapPh);  // a gentle hover bob

    if (this._haveCam) {                            // turn to face the visitor
      var yaw = Math.atan2(this._camPos.z - c.pos.z, -(this._camPos.x - c.pos.x));
      var cur = c.group.rotation.y;
      var diff = Math.atan2(Math.sin(yaw - cur), Math.cos(yaw - cur));
      c.group.rotation.y = cur + diff * Math.min(1, dt / 0.18);
    }
    var fp = t * c.flapSpeed + c.flapPh;
    c.bm.flap(Math.sin(fp) * 0.95 - 0.35);
    c.bm.model.rotation.set(this.presentRoll(c, -0.35), 0, 0, 'XZY');

    c.alpha += (1 - c.alpha) * 0.14;
    c.scale += (CFG.presentSize / c.size - c.scale) * 0.12;   // -> a comfortable held size
    this.render(c);

    if (c.stateT >= CFG.presentArrive + CFG.presentHold) {
      c.state = 'joining';
      c.stateT = 0;
      c.joinFrom.copy(c.pos);
      c.prev.copy(c.pos);
    }
  },

  //  Fly from the present spot out to where it belongs on its orbit,
  //  then hand over to the ambient flight.
  tickJoining: function (c, t, dt) {
    c.stateT += dt;
    var u = Math.min(1, c.stateT / CFG.presentJoin);
    this.pathAt(c, t, c.pathPos);                   // its orbit position, now
    c.pos.lerpVectors(c.joinFrom, c.pathPos, smoothstep(u));

    var fp = t * c.flapSpeed + c.flapPh;
    c.bm.flap(Math.sin(fp) * c.flapAmp - 0.5);
    c.scale += (1 - c.scale) * 0.05;                // -> its real orbit size
    c.alpha += (1 - c.alpha) * 0.1;

    var dx = c.pos.x - c.prev.x, dz = c.pos.z - c.prev.z;
    if (dx * dx + dz * dz > 1e-8) {
      var yaw = Math.atan2(dz, -dx);
      var cur = c.group.rotation.y;
      var diff = Math.atan2(Math.sin(yaw - cur), Math.cos(yaw - cur));
      c.group.rotation.y = cur + diff * Math.min(1, dt * 1000 / 200);
      c.bm.model.rotation.set(this.presentRoll(c, -0.6), 0, 0, 'XZY');
    }
    this.render(c);
    c.prev.copy(c.pos);

    if (u >= 1) { c.state = 'orbit'; c.first = true; }
  },

  //  keyboard.js:tickKey, flight only -- no capture states, no
  //  slow-field clock (t / dt are used directly), no letter, no hot.
  tickOrbit: function (c, t, dt) {
    var i;
    this.pathAt(c, t, c.pathPos);

    c.cycleT -= dt;
    if (c.cycleT <= 0) {
      c.gliding = !c.gliding;
      c.cycleT = c.gliding ? (0.5 + Math.random() * 0.9) : (1.2 + Math.random() * 2.2);
    }
    c.flapEnv += ((c.gliding ? 0 : 1) - c.flapEnv) * Math.min(1, dt / 0.22);

    var fp = t * c.flapSpeed + c.flapPh;
    var flapAngle = Math.sin(fp) * c.flapAmp - 0.5;
    var glideAngle = -1.0 + 0.08 * Math.sin(t * 3 + c.flapPh);
    var flap = c.flapEnv * flapAngle + (1 - c.flapEnv) * glideAngle;

    for (i = 0; i < this.repulsors.length; i++) {
      var rp = this.repulsors[i];
      if (rp.speed < 1.2) { continue; }
      this._tmp.copy(c.pos).sub(rp.pos);
      var dist = this._tmp.length();
      if (dist > 1.4 || dist < 1e-4) { continue; }
      var push = Math.min(rp.speed, 6) * 9 / (1 + 6 * dist * dist);
      c.offsetVel.addScaledVector(this._tmp.normalize(), push * dt);
    }
    c.offsetVel.addScaledVector(c.offset, -1.2 * dt);        // spring back to the path
    c.offsetVel.multiplyScalar(Math.max(0, 1 - 1.6 * dt));
    c.offsetVel.y += (c.flapEnv - 0.5) * 0.08 * dt;          // glide sinks, flapping climbs
    c.offset.addScaledVector(c.offsetVel, dt);
    if (c.offset.length() > 6) { c.offset.setLength(6); }

    c.pos.copy(c.pathPos).add(c.offset);
    c.bm.flap(flap);
    c.pos.y += 0.01 * c.size * Math.sin(fp - 0.9) * c.flapEnv;   // per-wingbeat bob

    //  a replayed butterfly fades and scales up where it sits; a joined
    //  one is already at 1 and these are no-ops
    c.alpha += (1 - c.alpha) * Math.min(1, dt / 0.4);
    c.scale += (1 - c.scale) * Math.min(1, dt / 0.4);
    this.render(c);

    if (c.first) { c.prev.copy(c.pos); c.first = false; return; }

    // ---- heading and banking ----
    var dx = c.pos.x - c.prev.x, dy = c.pos.y - c.prev.y, dz = c.pos.z - c.prev.z;
    var hSpeed = Math.sqrt(dx * dx + dz * dz);
    if (hSpeed > 1e-6) {
      var yaw = Math.atan2(dz, -dx);
      var cur = c.group.rotation.y;
      var diff = Math.atan2(Math.sin(yaw - cur), Math.cos(yaw - cur));
      c.group.rotation.y = cur + diff * Math.min(1, dt * 1000 / 160);
      var pitch = -Math.atan2(dy, hSpeed) * 0.25;
      var targetRoll = THREE.MathUtils.clamp(diff * 8, -0.09, 0.09);
      c.smoothRoll += (targetRoll - c.smoothRoll) * Math.min(1, dt * 1000 / 420);
      var mean = c.flapEnv * -0.5 + (1 - c.flapEnv) * -1.0;
      c.bm.model.rotation.set(this.presentRoll(c, mean) + c.smoothRoll, 0, pitch, 'XZY');
    }
    c.prev.copy(c.pos);
  },

  //  keyboard.js:presentRoll, verbatim. The collection orbits through
  //  eye height, so without this a butterfly there is an edge-on twig.
  presentRoll: function (c, flapMean) {
    if (!CFG.readRoll || !this._haveCam) { return 0; }
    this._tmp.copy(this._camPos).sub(c.pos);
    this._tmp.applyAxisAngle(UP, -c.group.rotation.y);
    var beta = Math.atan2(this._tmp.z, this._tmp.y);
    var want = Math.PI / 2 - CFG.readRoll;
    var best = 0, bestAbs = Infinity;
    for (var i = 0; i < 6; i++) {
      var x = (i % 2 ? -want : want) - beta + (Math.floor(i / 2) - 1) * Math.PI - flapMean;
      var a = Math.abs(x);
      if (a < bestAbs) { bestAbs = a; best = x; }
    }
    return best;
  },

  //  keyboard.js:separate -- butterflies steer apart instead of
  //  stacking. Wider band than the keyboard (the collection's own
  //  butterflies are bigger) and no state check (they are always flying).
  separate: function (dt) {
    var f = this.collected;
    for (var a = 0; a < f.length; a++) {
      var A = f[a];
      if (A.state !== 'orbit') { continue; }        // present / joining are scripted
      for (var b = a + 1; b < f.length; b++) {
        var B = f[b];
        if (B.state !== 'orbit') { continue; }
        var dx = A.pos.x - B.pos.x, dy = A.pos.y - B.pos.y, dz = A.pos.z - B.pos.z;
        var d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > 0.49 || d2 < 1e-6) { continue; }
        var d = Math.sqrt(d2);
        var push = (0.7 - d) * 2.0 * dt / d;
        A.offsetVel.x += dx * push; A.offsetVel.y += dy * push; A.offsetVel.z += dz * push;
        B.offsetVel.x -= dx * push; B.offsetVel.y -= dy * push; B.offsetVel.z -= dz * push;
      }
    }
  },

  remove: function () {
    for (var i = this.collected.length - 1; i >= 0; i--) { this.removeOne(i); }
  }
});
