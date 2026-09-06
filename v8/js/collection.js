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
    this._haveCam = false;
    //  scratch for the v7.2 reveal orientation (tickPresent / tickJoining)
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._v3 = new THREE.Vector3();
    this._qa = new THREE.Quaternion();
    this._qb = new THREE.Quaternion();
    this._qc = new THREE.Quaternion();
    this._mat = new THREE.Matrix4();
    this._eul = new THREE.Euler();

    //  The v6.2 lesson (see the "config keys drift" note in its
    //  VERSION.md): a CFG key the code reads but config.js never defined
    //  multiplies to NaN and renders nothing, invisibly. Fail loud instead.
    ['maxCollected', 'colRadMin', 'colRadMax', 'colHgtMin', 'colHgtMax',
     'colSizeMin', 'colSizeRange', 'bflySat', 'bflyLit', 'wander',
     'readRoll', 'acceptResetDelay', 'eyeY', 'tagBodyDrop',
     'presentDist', 'presentRise', 'presentSize', 'presentArrive',
     'presentHold', 'presentJoin',
     'revealFlapAmp', 'revealFlapRate',
     'revealJoinLift', 'revealJoinBank', 'revealJoinArc'].forEach(function (k) {
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
    //  v8: the per-name procedural base-colour texture. The wings ARE the
    //  texture (white diffuse); the body takes the name's base hue
    //  (col.hue, the same FNV hash the texture centres its palette on) so
    //  body and wings read as one hue family. Keys' white-tuned S/L --
    //  Wings.colorFor's own range predates the white sky and washes out.
    var col = WingColour.forEntry(entry);          // { canvas, tex, hue } -- WingColour's own LRU
    var hue = Math.floor(col.hue * 360);
    var color = 'hsl(' + hue + ', ' + CFG.bflySat + '%, ' + CFG.bflyLit + '%)';
    var bm = BflyModel.build(rec.tex, color, undefined, undefined, col.tex);
    //  rec.tex is the wing-shape alphaMap (not srgb-tagged); col.tex is
    //  the RGB colour map (srgb-tagged by wing-colour.js).

    var group = new THREE.Group();
    group.add(bm.model);
    this.root.add(group);

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
      first: true, smoothRoll: 0, _joinYaw: 0,
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
  //  v7.1: the name sits RIGHT under the body, tight against it. The
  //  wing/body planes carry a lot of transparent margin, so the drop
  //  point is CFG.tagBodyDrop (where the painted shape actually reaches,
  //  per unit model size) scaled by the butterfly's current size --
  //  NOT the plane's geometric edge. UI.nameTag then lands the name's
  //  own visible top on that point.
  render: function (c) {
    var s = c.size * c.scale;
    c.bm.model.scale.setScalar(s);
    c.bm.setOpacity(c.alpha);
    c.group.visible = c.alpha > 0.01;
    c.anchor.visible = c.group.visible;
    c.anchor.position.copy(c.pos);                  // position only, never the yaw
    c.group.position.copy(c.pos);
    if (c.tag && this._haveCam) {
      c.tag.place(this._camPos, c.pos, CFG.tagBodyDrop * s, c.alpha);
    }
  },

  //  "HERE'S YOUR BUTTERFLY." It rises into a spot in front of the
  //  visitor -- following the head on a slow lag so it stays in view --
  //  and hovers FLAT (wings square to the visitor, body near edge-on) at a
  //  comfortable size, breathing slowly, while the name settles under it.
  //  Then it flutters up and away to join the kaleidoscope (tickJoining),
  //  growing or shrinking to its real size on the way.
  //
  //  v7.2: the flight's presentRoll only ever gives a 3/4 aspect -- there
  //  the body axis points at the visitor and the wing plane (which
  //  contains that axis) can never face them. So the model is oriented
  //  with a direct look-at instead (_flatQuat: head up, wing normal -> the
  //  camera), and the wings do a slow shallow breath, not the flight beat.
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

    //  flat to the visitor. The group carries NO yaw here; the model takes
    //  the look-at orientation directly, slerped in as it rises.
    c.group.rotation.set(0, 0, 0);
    c.bm.model.quaternion.slerp(this._flatQuat(c, this._qa), Math.min(1, dt / 0.22));

    //  a slow, shallow breath. bm.flap's two pivots mirror, so the wing
    //  tips rise and fall together -- it reads as the wings opening and
    //  closing a little, not a wingbeat.
    c.bm.flap(Math.sin(t * CFG.revealFlapRate + c.flapPh) * CFG.revealFlapAmp);

    c.alpha += (1 - c.alpha) * 0.14;
    c.scale += (CFG.presentSize / c.size - c.scale) * 0.12;   // -> a comfortable held size
    this.render(c);

    if (c.stateT >= CFG.presentArrive + CFG.presentHold) {
      c.state = 'joining';
      c.stateT = 0;
      c.joinFrom.copy(c.pos);
      c.prev.copy(c.pos);
      c._joinYaw = 0;                               // group yaw at handoff; eases up to the travel heading
      this.aimJoin(c, t);                           // bias its orbit slot into the forward view
    }
  },

  //  A world-space quaternion for the model (with the group unrotated)
  //  that lays the wing plane square to the camera: local +Y (the wing
  //  normal) -> the camera, local +X (the head) -> DOWN. Used by the
  //  reveal. Head-down, not head-up: the wing slice is drawn with the
  //  forewing above the seam, and the plane's UVs put that at local -X,
  //  so pointing the head up renders the butterfly upside down.
  _flatQuat: function (c, out) {
    var toCam = this._v1;
    if (this._haveCam) { toCam.copy(this._camPos).sub(c.pos); } else { toCam.set(0, 0, 1); }
    if (toCam.lengthSq() < 1e-8) { toCam.set(0, 0, 1); }
    toCam.normalize();
    var headX = this._v2.set(0, -1, 0);
    headX.addScaledVector(toCam, -headX.dot(toCam));      // project head onto the plane facing the camera
    if (headX.lengthSq() < 1e-6) { headX.set(1, 0, 0); }  // camera dead above / below
    headX.normalize();
    var zA = this._v3.crossVectors(headX, toCam).normalize();
    this._mat.makeBasis(headX, toCam, zA);
    return out.setFromRotationMatrix(this._mat);
  },

  //  v7.2: shift c.phase (only) so the point the butterfly reaches at the
  //  END of 'joining' sits in the arc the visitor is looking at -- they
  //  watch it fly off to JOIN the others, not peel away behind them. The
  //  orbit itself is unchanged, so from there it drifts freely (and
  //  eventually behind), which is the kaleidoscope.
  aimJoin: function (c, t) {
    if (!this._haveCam) { return; }
    var faceAng = Math.atan2(this._camFwd.z, this._camFwd.x);   // pathAt's angle frame: atan2(z, x)
    var side = c.speed >= 0 ? 1 : -1;                           // which way round it already travels
    var arrive = t + CFG.presentJoin;
    //  pathAt: theta = c.phase + c.speed*t (+ a <=0.1 rad wobble, ignored).
    //  Solve c.phase so theta at arrival lands in the forward arc.
    c.phase = (faceAng + side * CFG.revealJoinArc) - c.speed * arrive;
  },

  //  Flutter up and away from the present spot to where it belongs on its
  //  orbit, then hand over to the ambient flight. v7.2: a shallow climb
  //  that peaks mid-flight and is gone by the time it meets the orbit; the
  //  wings coming up from the breath to a full beat; and the orientation
  //  slerping from the flat present pose to the flight's presentRoll, with
  //  a bank rolled through the turn -- so it reads as taking off, not
  //  sliding. At u = 1 it lands exactly on the flight's group-yaw +
  //  model-euler representation, so tickOrbit picks it up seamlessly.
  tickJoining: function (c, t, dt) {
    c.stateT += dt;
    var u = Math.min(1, c.stateT / CFG.presentJoin);
    var e = smoothstep(u);
    this.pathAt(c, t, c.pathPos);                   // its orbit position, now
    c.pos.lerpVectors(c.joinFrom, c.pathPos, e);
    c.pos.y += CFG.revealJoinLift * Math.sin(Math.PI * u);   // climbs, then settles onto the orbit

    //  breath -> full beat (with its half-radian bias) across the departure
    var fp = t * c.flapSpeed + c.flapPh;
    var amp = CFG.revealFlapAmp + (c.flapAmp - CFG.revealFlapAmp) * e;
    c.bm.flap(Math.sin(fp) * amp - 0.5 * e);

    c.scale += (1 - c.scale) * 0.05;                // -> its real orbit size
    c.alpha += (1 - c.alpha) * 0.1;

    //  heading: ease a stored yaw toward the travel direction, and bring
    //  the GROUP yaw up from 0 (the flat present pose) to it across the
    //  departure
    var dx = c.pos.x - c.prev.x, dz = c.pos.z - c.prev.z;
    var travelYaw = (dx * dx + dz * dz > 1e-8) ? Math.atan2(dz, -dx) : c._joinYaw;
    c._joinYaw += Math.atan2(Math.sin(travelYaw - c._joinYaw), Math.cos(travelYaw - c._joinYaw)) *
                  Math.min(1, dt * 1000 / 380);
    c.group.rotation.y = c._joinYaw;               // eases from 0 (set at the present handoff) on its own
    c.group.updateMatrixWorld(true);               // presentRoll + the flat-quat conversion read world

    //  blend model orientation: flat present pose (a group-identity world
    //  quat, re-expressed under the now-yawed group) -> the flight's
    //  presentRoll aspect, plus a bank that peaks mid-departure
    var bank = Math.sin(Math.PI * u) * CFG.revealJoinBank * (c.speed >= 0 ? 1 : -1);
    var rhoT = this.presentRoll(c, -0.5 * e);
    var gq = c.group.getWorldQuaternion(this._qb);
    var qFlatLocal = this._qc.copy(gq).conjugate().multiply(this._flatQuat(c, this._qa));
    var qFlight = this._qa.setFromEuler(this._eul.set(rhoT + bank, 0, 0, 'XZY'));
    c.bm.model.quaternion.copy(qFlatLocal).slerp(qFlight, e);

    this.render(c);
    c.prev.copy(c.pos);

    if (u >= 1) {
      c.group.rotation.y = c._joinYaw;             // land on the flight representation
      c.bm.model.rotation.set(rhoT, 0, 0, 'XZY');  // bank is 0 at u = 1
      c.state = 'orbit';
      c.first = true;
    }
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
  //  (The v7.2 reveal does NOT use this -- see tickPresent's _flatQuat.)
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
