// ============================================================
//  interact.js  --  reach, highlight, pinch
// ============================================================
//  Three pointers feed one selection model:
//
//    left hand, right hand   from hand-rig (see hands.js)
//    the mouse               so the piece can be driven on a desktop
//
//  A pointer picks in two ways, in this order:
//
//    TOUCH   the index fingertip is inside a target's sphere. Reaching
//            out and putting your finger on a butterfly always wins.
//    POINT   otherwise, a ray from the index knuckle through the index
//            fingertip. The keyboard is 1.15 m away -- far enough that
//            it reads as butterflies hanging in the room rather than a
//            panel stuck to your face, and further than most people
//            can comfortably reach -- so pointing is the normal case
//            and touching is the bonus.
//
//  "Reach toward a butterfly, it highlights" is satisfied by either.
//
//  ACTIVATION is the pinch EDGE, not the pinch state: the frame the
//  thumb and index close. Two thresholds, not one -- a single distance
//  chatters on and off across it and fires repeatedly.
//
//  Nothing here knows what a target is. It asks the keyboard for
//  spheres and hands back ids.
// ============================================================
AFRAME.registerComponent('pointer-input', {
  init: function () {
    this.kb = null;
    this.pointers = [
      { kind: 'hand', side: 'left',  closed: false, hover: null, at: new THREE.Vector3() },
      { kind: 'hand', side: 'right', closed: false, hover: null, at: new THREE.Vector3() },
      { kind: 'mouse',               click: false,  hover: null, at: new THREE.Vector3() }
    ];

    this._o = new THREE.Vector3();
    this._d = new THREE.Vector3();
    this._w = new THREE.Vector3();
    this._ndc = new THREE.Vector2(0, 0);
    this._ray = new THREE.Raycaster();
    this._mouseIn = false;

    this.buildRayLines();
    this.bindMouse();
  },

  //  A short line out of each fingertip. Without it there is no way to
  //  tell where you are pointing until something highlights, and on a
  //  headset that is the difference between the keyboard feeling aimed
  //  and feeling random.
  buildRayLines: function () {
    this.lines = [];
    for (var i = 0; i < 2; i++) {
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      var mat = new THREE.LineBasicMaterial({
        color: 0x12121a, transparent: true, opacity: 0.5, depthWrite: false
      });
      var line = new THREE.Line(geo, mat);
      line.visible = false;
      line.frustumCulled = false;
      this.el.sceneEl.object3D.add(line);
      this.lines.push(line);
    }
  },

  bindMouse: function () {
    var self = this;
    // The cursor is read on the PRESS as well as on the move. A press
    // that arrives without a preceding move -- a tap, a synthetic click,
    // a stylus -- would otherwise be tested against wherever the cursor
    // was last seen, which on a fresh page is dead centre.
    function readCursor(e) {
      var r = (self.el.sceneEl.canvas || document.body).getBoundingClientRect();
      self._ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      self._ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      self._mouseIn = true;
    }
    window.addEventListener('mousemove', readCursor);
    //  A click is LATCHED, not sampled. A real click closes and opens
    //  inside a single frame more often than not, so a tick that reads
    //  the button's level sees nothing happen -- the same trap the v2
    //  dev panel hit from the other direction. The latch is consumed by
    //  the next tick, which is also the tick that knows what is under
    //  the cursor.
    window.addEventListener('mousedown', function (e) {
      readCursor(e);
      self.pointers[2].click = true;
    });
  },

  keyboard: function () {
    if (!this.kb) {
      var el = document.querySelector('[butterfly-keyboard]');
      var c = el && el.components && el.components['butterfly-keyboard'];
      if (c && c.initialized) { this.kb = c; }
    }
    return this.kb;
  },

  //  Nearest target to a fingertip, or null.
  pickTouch: function (targets, tip) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < targets.length; i++) {
      var d = tip.distanceTo(targets[i].pos);
      if (d < CFG.touchRadius && d < bestD) { bestD = d; best = targets[i]; }
    }
    return best;
  },

  //  Ray against the target spheres.
  //
  //  The tolerance is a CONE, not a fixed radius. The swarm ranges from
  //  about 1.6 m to 4 m out, and a fixed world radius makes the far half
  //  nearly unhittable while a radius generous enough for those turns
  //  the near ones into one big blob. `pickBase` is the slack close in,
  //  `pickAngle` is how fast it opens with distance.
  //
  //  Scored by how far off the axis the centre is RELATIVE to that
  //  tolerance, so a big slow butterfly does not out-compete a small one
  //  sitting right under the ray.
  pickRay: function (targets, origin, dir, panelOnly) {
    var best = null, bestScore = Infinity;
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i];
      if (panelOnly && !tg.panel) { continue; }
      if (!panelOnly && tg.panel) { continue; }
      this._w.copy(tg.pos).sub(origin);
      var along = this._w.dot(dir);
      if (along < 0.05 || along > CFG.rayMax) { continue; }
      var perp2 = this._w.lengthSq() - along * along;
      if (perp2 < 0) { perp2 = 0; }
      var tol = tg.radius + Math.max(CFG.pickBase, along * CFG.pickAngle);
      var score = Math.sqrt(perp2) / tol;
      if (score < 1 && score < bestScore) { bestScore = score; best = tg; }
    }
    return best;
  },

  //  THE CONTROLS WIN. The two shapes are the only fixed things in the
  //  room and they sit inside the swarm's orbit, so a butterfly drifting
  //  across the green one must not steal the pick -- the visitor would be
  //  unable to finish until it moved on.
  pick: function (targets, origin, dir) {
    return this.pickRay(targets, origin, dir, true) ||
           this.pickRay(targets, origin, dir, false);
  },

  tick: function () {
    var kb = this.keyboard();
    if (!kb) { return; }
    var targets = kb.targets();
    var hot = {};

    for (var i = 0; i < this.pointers.length; i++) {
      var p = this.pointers[i];
      var picked = null;
      var closed = false;

      if (p.kind === 'hand') {
        var rig = handRig(p.side);
        var line = this.lines[i];
        if (!rig || !rig.tracked) {
          if (line) { line.visible = false; }
          p.hover = null; p.closed = false;
          continue;
        }
        this._o.copy(rig.indexTip);
        this._d.copy(rig.indexTip).sub(rig.indexKnuckle).normalize();
        p.at.copy(rig.indexTip);

        picked = this.pickTouch(targets, rig.indexTip) ||
                 this.pick(targets, this._o, this._d);

        // hysteresis: closes at pinchOn, opens again only past pinchOff
        closed = p.closed ? (rig.pinch < CFG.pinchOff) : (rig.pinch < CFG.pinchOn);

        if (line) {
          var end = this._w.copy(this._d).multiplyScalar(picked ? 0.9 : 0.35).add(this._o);
          var a = line.geometry.attributes.position.array;
          a[0] = this._o.x; a[1] = this._o.y; a[2] = this._o.z;
          a[3] = end.x;     a[4] = end.y;     a[5] = end.z;
          line.geometry.attributes.position.needsUpdate = true;
          line.material.opacity = picked ? 0.85 : 0.35;
          line.visible = true;
        }
      } else {
        // desktop: a ray from the camera through the cursor
        if (!this._mouseIn || this.el.sceneEl.is('vr-mode')) { p.hover = null; continue; }
        var cam = this.el.sceneEl.camera;
        if (!cam) { continue; }
        this._ray.setFromCamera(this._ndc, cam);
        this._o.copy(this._ray.ray.origin);
        this._d.copy(this._ray.ray.direction);
        picked = this.pick(targets, this._o, this._d);
        if (picked) { p.at.copy(picked.pos); }
      }

      if (picked) { hot[picked.id] = true; }

      // hands fire on the pinch EDGE; the mouse fires on its latch
      var fire;
      if (p.kind === 'hand') {
        fire = closed && p.closed !== true;
        p.closed = closed;
      } else {
        fire = !!p.click;
        p.click = false;
      }
      if (fire && picked) { kb.activate(picked.id, p.at); }
      p.hover = picked ? picked.id : null;
    }

    kb.setHot(hot);
  }
});
