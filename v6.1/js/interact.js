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
//    POINT   otherwise, a ray from an estimated SHOULDER point through
//            the fingertip (v6.1 -- see below; was knuckle-through-tip
//            in v6). The keyboard is 1.15 m away -- far enough that it
//            reads as butterflies hanging in the room rather than a
//            panel stuck to your face, and further than most people can
//            comfortably reach -- so pointing is the normal case and
//            touching is the bonus.
//
//  "Reach toward a butterfly, it highlights" is satisfied by either.
//
//  ACTIVATION is the pinch EDGE, not the pinch state: the frame the
//  thumb and index close. Two thresholds, not one -- a single distance
//  chatters on and off across it and fires repeatedly.
//
//  Nothing here knows what a target is. It asks the keyboard for
//  spheres and hands back ids.
//
//  v6.1 -- three things made real hand tracking harder to select with
//  than it needed to be, and all three are fixed here rather than by
//  widening the pick cone (see config.js: the cone is already tuned
//  right up against the point where neighbours start blobbing together):
//
//    THE RAY'S OWN ORIGIN WAS THE NOISE SOURCE. v6 cast from the index
//              knuckle through the fingertip -- a ~3cm baseline, so a
//              few millimetres of finger curl during a pinch swung the
//              aim by tens of degrees. This is exactly what Meta's own
//              hand-pointing model (the ray Quest's system UI casts)
//              avoids: it anchors the ray near the SHOULDER instead,
//              aimed through the hand. A ~60-80cm baseline means the
//              same finger curl swings the aim by a couple of degrees,
//              often less than the pick cone's own slack. `shoulderOf()`
//              below estimates that point each tick from the camera
//              pose (there is no tracked shoulder joint to read).
//    JITTER    hands.js deliberately publishes raw, unfiltered joints, so
//              a hover could still flicker on residual noise even with a
//              stable ray origin. `smAim` is an exponential moving
//              average of the fingertip the ray is aimed through, per
//              hand, used for the POINT pick only -- touch stays on the
//              raw fingertip, and the mouse pointer has no jitter to
//              smooth.
//    THE PINCH ITSELF CAN STILL PERTURB THE PICK, just far less than
//              before. `lastHotId`/`lastHotAt` remember what a hand had
//              hot; a pinch's rising edge with nothing picked that exact
//              frame still activates the remembered target if it was hot
//              within `CFG.pickGraceMs` -- butterflies only, never the
//              two controls (see the grace-window check in tick()).
//
//  The ray line still visually emanates from the fingertip -- only the
//  invisible shoulder anchor moved, not what you see -- and now bends to
//  touch whatever is actually picked instead of just gesturing toward
//  it, and flashes briefly on a catch. All free reads of the same pick
//  data, no new raycasts.
//
//  v6.1 ROUND 2 -- three things remained after the shoulder-ray pass:
//
//    NEIGHBOURS STILL GOT CONFUSED. Butterflies sit ~0.6m apart, so their
//              cones genuinely overlap; a fresh best-score-wins pick each
//              frame flickers between two overlapping candidates on
//              ordinary joint noise. `pickFlySticky()` adds MEMORY --
//              once a hand has a hovered butterfly, a challenger has to
//              clearly beat it or keep winning for a while to steal it,
//              but a target the ray plainly left releases instantly. Cone
//              geometry itself is untouched (see config.js).
//    THE CONTROLS GOT BRUSHED. Their own pick RADIUS, not just the cone's
//              slack, was bigger than a typical butterfly's -- so "the
//              controls win" kept firing on near-misses. `panelPickBase`/
//              `panelTouchRadius` here and a radius shrink in
//              `keyboard.js:targets()` bring a control's total tolerance
//              below a butterfly's, so it only wins when genuinely aimed
//              at. The priority RULE itself is untouched.
//    THE PINCH DIDN'T ALWAYS REGISTER. `rig.pinch` is raw and unsmoothed,
//              and Quest hand tracking is noisiest right as fingers
//              occlude each other -- exactly at a real pinch. `smPinch`
//              (EMA, same technique as `smAim`) plus widening
//              `pinchOn`/`pinchOff` by the same 5mm (preserving the
//              hysteresis gap) address the noise and the threshold fit
//              together -- smoothing alone can't fix a signal that's
//              systematically a little wide at occlusion.
// ============================================================
AFRAME.registerComponent('pointer-input', {
  init: function () {
    this.kb = null;
    this.pointers = [
      { kind: 'hand', side: 'left',  closed: false, hover: null, at: new THREE.Vector3(),
        smAim: new THREE.Vector3(), smInit: false,
        lastHotId: null, lastHotAt: -Infinity, flashT: 0,
        lockId: null, lockChallengeId: null, lockChallengeAt: -Infinity,
        smPinch: 0, pinchInit: false },
      { kind: 'hand', side: 'right', closed: false, hover: null, at: new THREE.Vector3(),
        smAim: new THREE.Vector3(), smInit: false,
        lastHotId: null, lastHotAt: -Infinity, flashT: 0,
        lockId: null, lockChallengeId: null, lockChallengeAt: -Infinity,
        smPinch: 0, pinchInit: false },
      { kind: 'mouse',               click: false,  hover: null, at: new THREE.Vector3() }
    ];

    this._o = new THREE.Vector3();
    this._d = new THREE.Vector3();
    this._w = new THREE.Vector3();
    this._ndc = new THREE.Vector2(0, 0);
    this._ray = new THREE.Raycaster();
    this._mouseIn = false;

    // shoulder-ray scratch: a per-tick camera read, shared by both hands
    this._camPos = new THREE.Vector3();
    this._camX = new THREE.Vector3();
    this._camY = new THREE.Vector3();
    this._camZ = new THREE.Vector3();

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

  //  Nearest target to a fingertip, or null. v6.1 round 2: the controls
  //  use their own, tighter radius -- see config.js:panelTouchRadius.
  pickTouch: function (targets, tip) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i];
      var r = tg.panel ? CFG.panelTouchRadius : CFG.touchRadius;
      var d = tip.distanceTo(tg.pos);
      if (d < r && d < bestD) { bestD = d; best = tg; }
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
  //
  //  v6.1 round 2: the controls use their own, tighter slack
  //  (`panelPickBase`) -- their own pick RADIUS is already shrunk in
  //  `keyboard.js:targets()`, and this is the other half of that. Shared
  //  `pickAngle` stays shared: its contribution at the controls' fixed
  //  ~0.8m depth (~0.044m) was never the dominant term either way.
  pickRay: function (targets, origin, dir, panelOnly) {
    var best = null, bestScore = Infinity;
    var base = panelOnly ? CFG.panelPickBase : CFG.pickBase;
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i];
      if (panelOnly && !tg.panel) { continue; }
      if (!panelOnly && tg.panel) { continue; }
      this._w.copy(tg.pos).sub(origin);
      var along = this._w.dot(dir);
      if (along < 0.05 || along > CFG.rayMax) { continue; }
      var perp2 = this._w.lengthSq() - along * along;
      if (perp2 < 0) { perp2 = 0; }
      var tol = tg.radius + Math.max(base, along * CFG.pickAngle);
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

  //  HOVER LOCK (v6.1 round 2, butterflies only, hands only). Resolves
  //  ambiguity between two candidates that are BOTH inside their own cone
  //  this frame -- which happens routinely at ~0.6m neighbour spacing --
  //  by favouring whichever the pointer already had, unless a challenger
  //  is either CLEARLY better (beats the lock's score by
  //  `CFG.hoverLockMargin`) or has been the SAME challenger, consistently
  //  better, for `CFG.hoverLockMs` running. A single wobble frame (the
  //  pinch-commit curl, one noisy sample) is protected either way; a
  //  sustained, deliberate re-aim onto a specific neighbour is not held
  //  past that window even if it never quite clears the full margin.
  //
  //  A target the ray has plainly left (score >= 1) is skipped by the
  //  loop below same as `pickRay` -- so `lockTarget` comes back null and
  //  the lock releases with NO delay. The lock only ever resists
  //  switching inside a genuine overlap band, never after a clean miss.
  //
  //  Deliberately a SEPARATE loop from `pickRay`, not a modification of
  //  it: `pickRay` stays exactly what the panel path and the mouse's
  //  `pick()` call, untouched and risk-free by construction.
  pickFlySticky: function (targets, origin, dir, p, now) {
    var best = null, bestScore = Infinity;
    var lockScore = Infinity, lockTarget = null;
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i];
      if (tg.panel) { continue; }
      this._w.copy(tg.pos).sub(origin);
      var along = this._w.dot(dir);
      if (along < 0.05 || along > CFG.rayMax) { continue; }
      var perp2 = this._w.lengthSq() - along * along;
      if (perp2 < 0) { perp2 = 0; }
      var tol = tg.radius + Math.max(CFG.pickBase, along * CFG.pickAngle);
      var score = Math.sqrt(perp2) / tol;
      if (score >= 1) { continue; }
      if (score < bestScore) { bestScore = score; best = tg; }
      if (p.lockId && tg.id === p.lockId) { lockScore = score; lockTarget = tg; }
    }

    //  A CHALLENGE ONLY MEANS ANYTHING WHILE IT IS ACTIVE. Whenever the
    //  lock isn't currently being challenged -- no lock target at all, or
    //  the lock is still winning outright -- `lockChallengeId` must be
    //  cleared alongside `lockChallengeAt`, not just the timestamp. Left
    //  stale, a later frame where that same id reappears as `best` sees
    //  `lockChallengeId === best.id` already (so the timer-reset branch
    //  below never fires) while `lockChallengeAt` is still the earlier
    //  `-Infinity` -- and `now - (-Infinity)` is always >= hoverLockMs,
    //  so `sustained` comes back true on a single fresh frame instead of
    //  after a genuine hoverLockMs of consistently losing. (Found by
    //  synthetic testing: a symmetric tie flickered every 5-7 frames
    //  instead of holding, tracing straight back to this.)
    if (!lockTarget) {
      p.lockId = best ? best.id : null;
      p.lockChallengeId = null;
      p.lockChallengeAt = -Infinity;
      return best;
    }
    if (best === lockTarget) {
      p.lockChallengeId = null;
      p.lockChallengeAt = -Infinity;
      return lockTarget;
    }

    if (p.lockChallengeId !== best.id) { p.lockChallengeId = best.id; p.lockChallengeAt = now; }
    var sustained = (now - p.lockChallengeAt) >= CFG.hoverLockMs;
    var clearWin = bestScore < lockScore - CFG.hoverLockMargin;
    if (clearWin || sustained) {
      p.lockId = best.id;
      p.lockChallengeId = null;
      p.lockChallengeAt = -Infinity;
      return best;
    }
    return lockTarget;
  },

  //  v6.1 -- an estimated shoulder point for `side`, derived from the
  //  camera pose each tick (there is no tracked shoulder joint). Down by
  //  `CFG.shoulderDown` from the headset, and out by `CFG.shoulderOut`
  //  along the camera's HORIZONTAL right axis -- flattened to the XZ
  //  plane so a shoulder does not swing up or tilt when you look up or
  //  down, the way your actual shoulders do not. Requires `updateCamera()`
  //  to have been called this tick.
  shoulderOf: function (side, out) {
    out.copy(this._camPos);
    out.y -= CFG.shoulderDown;
    out.addScaledVector(this._camX, CFG.shoulderOut * (side === 'left' ? -1 : 1));
    return out;
  },

  //  Camera position and a FLATTENED right axis, read once per tick and
  //  shared by both hands (shoulderOf() just adds a per-side sign).
  //  Flattening (zeroing Y, renormalising) keeps the estimated shoulders
  //  level even if the headset pitches or rolls.
  updateCamera: function () {
    var cam = this.el.sceneEl.camera;
    if (!cam) { return false; }
    cam.updateMatrixWorld();
    cam.getWorldPosition(this._camPos);
    cam.matrixWorld.extractBasis(this._camX, this._camY, this._camZ);
    this._camX.y = 0;
    if (this._camX.lengthSq() < 1e-6) { this._camX.set(1, 0, 0); }  // looking straight up/down
    this._camX.normalize();
    return true;
  },

  tick: function (time, delta) {
    var kb = this.keyboard();
    if (!kb) { return; }
    var targets = kb.targets();
    var hot = {};
    var dt = Math.min(0.1, (delta || 16.7) / 1000);
    var haveCam = this.updateCamera();

    // built once per tick so the grace-window rescue below can look a
    // remembered id back up against LIVE targets, not a stale snapshot
    var targetsById = {};
    for (var t = 0; t < targets.length; t++) { targetsById[targets[t].id] = targets[t]; }

    for (var i = 0; i < this.pointers.length; i++) {
      var p = this.pointers[i];
      var picked = null;
      var closed = false;

      if (p.kind === 'hand') {
        var rig = handRig(p.side);
        var line = this.lines[i];
        if (!rig || !rig.tracked) {
          if (line) { line.visible = false; }
          p.hover = null; p.closed = false; p.smInit = false;
          p.lastHotId = null; p.flashT = 0;
          p.lockId = null; p.lockChallengeId = null; p.lockChallengeAt = -Infinity;
          p.pinchInit = false;
          continue;
        }
        p.at.copy(rig.indexTip);              // capture point stays raw/exact

        //  Smoothing lives here, on the pointer's own state, not in
        //  hands.js -- the raw joint reader stays raw for anything else
        //  that ever reads it. EMA rather than a fixed-N average so it
        //  is frame-rate independent and needs no history buffer. Only
        //  the fingertip needs smoothing now -- the ray's ORIGIN is the
        //  shoulder estimate below, not a second noisy joint.
        if (!p.smInit) {
          p.smAim.copy(rig.indexTip);
          p.smInit = true;
        } else {
          var a = 1 - Math.exp(-dt / CFG.aimSmoothTau);
          p.smAim.lerp(rig.indexTip, a);
        }

        //  THE RAY. Shoulder to (smoothed) fingertip -- a long baseline,
        //  so the finger curl that happens as a pinch closes barely
        //  moves the aim (see the header comment). Falls back to the old
        //  knuckle-anchored origin on the very first tick or two before
        //  the camera pose is available, rather than skipping the pick.
        if (haveCam) { this.shoulderOf(p.side, this._o); }
        else { this._o.copy(rig.indexKnuckle); }
        this._d.copy(p.smAim).sub(this._o).normalize();

        // touch stays on the RAW fingertip; only the ray's aim is smoothed.
        // v6.1 round 2: the panel path (this.pickRay directly) and the
        // butterfly path (pickFlySticky, with hover-lock memory) are kept
        // as two separate calls rather than going through this.pick() --
        // "the controls win" still checks the panel first unconditionally,
        // but the fly pick needs the pointer's own lock state, which
        // this.pick()'s signature has no room for.
        var panelPick = this.pickRay(targets, this._o, this._d, true);
        var flyPick = this.pickFlySticky(targets, this._o, this._d, p, time);
        picked = this.pickTouch(targets, rig.indexTip) || panelPick || flyPick;

        //  Pinch smoothing (v6.1 round 2): rig.pinch is raw, and Quest
        //  hand tracking is noisiest right as fingers occlude each other
        //  -- exactly at a real pinch. EMA it the same way smAim damps
        //  the aim, just with a shorter time constant (pinchSmoothTau)
        //  since activation should still feel immediate.
        if (!p.pinchInit) {
          p.smPinch = rig.pinch;
          p.pinchInit = true;
        } else {
          var ap = 1 - Math.exp(-dt / CFG.pinchSmoothTau);
          p.smPinch += (rig.pinch - p.smPinch) * ap;
        }

        // hysteresis: closes at pinchOn, opens again only past pinchOff
        closed = p.closed ? (p.smPinch < CFG.pinchOff) : (p.smPinch < CFG.pinchOn);

        if (picked) { p.lastHotId = picked.id; p.lastHotAt = time; }

        if (line) {
          p.flashT = Math.max(0, p.flashT - dt / CFG.flashTime);
          var baseOp = picked ? 0.85 : 0.35;
          //  THE LINE STILL VISUALLY COMES FROM THE HAND -- only the
          //  invisible ray origin used for picking moved to the shoulder
          //  estimate, not what is drawn. THE LINE CONNECTS: when
          //  something is picked the endpoint is its actual live
          //  position, exactly, not a projection that merely passes near
          //  it -- so what you see is exactly what would activate.
          var end;
          if (picked) {
            end = picked.pos;
          } else {
            end = this._w.copy(this._d).multiplyScalar(0.35).add(rig.indexTip);
          }
          var arr = line.geometry.attributes.position.array;
          arr[0] = rig.indexTip.x; arr[1] = rig.indexTip.y; arr[2] = rig.indexTip.z;
          arr[3] = end.x;          arr[4] = end.y;          arr[5] = end.z;
          line.geometry.attributes.position.needsUpdate = true;
          // a brief opacity pulse on a catch, decaying over flashT -- no
          // new geometry, no glow, just brighter ink for a moment
          line.material.opacity = baseOp + (1 - baseOp) * p.flashT;
          line.visible = true;
        }
      } else {
        // desktop: a ray from the camera through the cursor -- no jitter
        // to smooth, no pinch to be perturbed by, so none of the above
        // applies here
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

      //  GRACE WINDOW. Only for hands, only rescuing a butterfly (never a
      //  control -- a wrong accept/delete costs more than a missed
      //  letter), and only if the remembered target is still live this
      //  frame. keyboard.js:activate() re-checks the key's own state
      //  before capturing, so a stale rescue just silently no-ops rather
      //  than double-firing.
      var activated = picked;
      if (fire && !picked && p.kind === 'hand' && p.lastHotId &&
          (time - p.lastHotAt) <= CFG.pickGraceMs) {
        var rescued = targetsById[p.lastHotId];
        if (rescued && !rescued.panel) { activated = rescued; }
      }

      if (fire && activated) {
        kb.activate(activated.id, p.at);
        if (p.kind === 'hand') { p.flashT = 1; }
      }
      p.hover = picked ? picked.id : null;
    }

    kb.setHot(hot);
  }
});
