// ============================================================
//  bfly-model.js  --  the mesh, without the flight
// ============================================================
//  Lifted straight out of v2's butterfly.js so the keyboard keys are
//  the same object the kaleidoscope is made of: one body plane and two
//  wing planes, wings on pivots so they hinge at the body.
//
//  The one part that is easy to break is the wing UVs. The generator
//  draws a wing LEGIBLY -- body axis vertical down the left edge, fore
//  above the seam, hind below -- so a saved slice can be read and can
//  drop into a TouchDesigner atlas unrotated. The plane wants the
//  opposite (local X along the body, local Z outward). Those four UVs
//  are the whole reconciliation; rotating the textures instead would
//  cost a blit per wing and leave the exports unreadable.
//
//  Size is NOT baked into the geometry. It lives on model.scale, so a
//  key can grow when it highlights without rebuilding anything.
// ============================================================
var BflyModel = (function () {
  'use strict';

  var BASE = 0.28;              // fixed build scale; scale lives on the group
  var WING_PLANE = 0.85;        // wing chord relative to the body plane

  var bodyTex = null;
  function getBodyTex() {
    if (!bodyTex) {
      bodyTex = new THREE.TextureLoader().load(BODY_ALPHA);
      bodyTex.wrapS = bodyTex.wrapT = THREE.RepeatWrapping;
    }
    return bodyTex;
  }

  //  build(wingAlpha, cssColour, letterAlpha, letterColour) -> {
  //    model, setColor(css), setOpacity(a), flap(angle), dispose()
  //  }
  //  `model` is a Group at the butterfly's own origin, facing -X as its
  //  head; parent it to whatever positions it.
  //
  //  The optional fourth and fifth arguments add a SECOND pair of wings
  //  carrying only the letter, sitting inside the hole the first pair
  //  has been punched through. Same geometry, same pivots, so it flaps
  //  with the wing it belongs to; nudged a hair along the plane normal
  //  so two coplanar meshes cannot argue about depth.
  //  The optional SIXTH argument (v8) is a per-name procedural RGB colour
  //  texture (wing-colour.js) for the visitor's grown butterfly only. It
  //  goes in as the wing material's `map`; MeshBasicMaterial does
  //  diffuse = color * map, so `color` must be WHITE when a map is present
  //  or the tint multiplies into every generated colour. The 26 keys call
  //  build() with four args -> wingColourTex is undefined -> map: null ->
  //  they are completely unaffected.
  function build(wingTex, color, letterTex, letterColor, wingColourTex) {
    var s = BASE;
    var hasColMap = !!wingColourTex;

    var wingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(hasColMap ? 0xffffff : color),
      map: wingColourTex || null,             // v8: the base-colour texture (sRGB-tagged by wing-colour.js)
      alphaMap: wingTex || null,              // the wing SHAPE, an alpha channel -- NOT sRGB
      alphaTest: 0.5, side: THREE.DoubleSide
    });
    var bodyMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color), alphaMap: getBodyTex(),
      alphaTest: 0.5, side: THREE.DoubleSide
    });

    var bodyGeo = new THREE.PlaneGeometry(s * 1.5, s * 1.5);
    bodyGeo.translate(0, -s * 0.63, 0);        // the drawn body line lands on y = 0
    var body = new THREE.Mesh(bodyGeo, bodyMat);

    // 2:1, matching the generator's slice. Width runs ALONG the body
    // (fore to hind); height runs OUTWARD from the hinge.
    var wingW = s * WING_PLANE * 2, wingH = s * WING_PLANE;
    var wingGeo = new THREE.PlaneGeometry(wingW, wingH);
    wingGeo.translate(0, -wingH / 2, 0);       // hinge edge onto the body
    wingGeo.rotateX(-Math.PI / 2);             // lie flat in XZ
    //   vertex          local                     wanted uv
    //   0 (-w/2, z=0)   head side, at the hinge    u=0 (root)  v=1 (fore)
    //   1 (+w/2, z=0)   tail side, at the hinge    u=0         v=0 (hind)
    //   2 (-w/2, z=+h)  head side, outward         u=1 (tip)   v=1
    //   3 (+w/2, z=+h)  tail side, outward         u=1         v=0
    wingGeo.attributes.uv.array.set([0, 1,  0, 0,  1, 1,  1, 0]);
    wingGeo.attributes.uv.needsUpdate = true;

    var leftPivot = new THREE.Group();
    leftPivot.add(new THREE.Mesh(wingGeo, wingMat));
    var rightPivot = new THREE.Group();
    rightPivot.add(new THREE.Mesh(wingGeo, wingMat));
    rightPivot.scale.z = -1;                   // mirrored

    var letterMat = null;
    if (letterTex) {
      letterMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(letterColor), alphaMap: letterTex,
        alphaTest: 0.5, side: THREE.DoubleSide
      });
      var lL = new THREE.Mesh(wingGeo, letterMat);
      var lR = new THREE.Mesh(wingGeo, letterMat);
      lL.position.y = 0.0006;                  // off the wing plane, barely
      lR.position.y = 0.0006;
      leftPivot.add(lL);
      rightPivot.add(lR);
    }

    var model = new THREE.Group();
    model.add(body, leftPivot, rightPivot);

    return {
      model: model,
      //  Kept for the generation stage: a butterfly grown from a name
      //  will take its colour from the DNA hash (see Wings.colorFor).
      setColor: function (css) {
        var c = new THREE.Color(css);
        if (!wingMat.map) { wingMat.color.copy(c); }   // v8: don't stomp the white a colour map needs
        bodyMat.color.copy(c);
      },
      setOpacity: function (a) {
        // alphaTest materials do not fade on their own; opacity needs
        // transparency switched on, and back off again when opaque so
        // the keys keep sorting correctly against each other.
        var t = a < 0.999;
        wingMat.transparent = bodyMat.transparent = t;
        wingMat.opacity = bodyMat.opacity = a;
        // The fragment alpha is (mask * opacity), so a FIXED alphaTest of
        // 0.5 discards the whole silhouette the instant opacity drops
        // below 0.5 -- the butterfly does not fade out, it pops out, and
        // pops back on when opacity crosses 0.5 again on the way up.
        // Reveal.dim bottoms out at 0.42, just under that line, so every
        // dimmed butterfly in the room vanished outright instead of
        // receding, then snapped back mid-return. Scaling the cut with
        // opacity keeps the discard test at exactly `mask < 0.5` for any
        // opacity, so the shape is unchanged and simply blends down.
        // Held clear of 0 so USE_ALPHATEST never toggles (a recompile).
        var at = a >= 0.999 ? 0.5 : Math.max(0.02, 0.5 * a);
        wingMat.alphaTest = bodyMat.alphaTest = at;
        if (letterMat) { letterMat.transparent = t; letterMat.opacity = a; letterMat.alphaTest = at; }
      },
      flap: function (angle) {
        leftPivot.rotation.x = angle;
        rightPivot.rotation.x = -angle;
      },
      dispose: function () {
        //  geo + materials only. wingTex belongs to Wings and
        //  wingColourTex (v8) belongs to WingColour -- their caches reuse
        //  them, so disposing here would pull a texture out from under a
        //  live butterfly.
        wingGeo.dispose(); bodyGeo.dispose();
        wingMat.dispose(); bodyMat.dispose();
        if (letterMat) { letterMat.dispose(); }
      }
    };
  }

  return { build: build };
})();
