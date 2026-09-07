// ============================================================
//  wing-colour.js  --  the per-name base-colour texture (v8, enriched v8.3)
// ============================================================
//  Descends from a faithful-look port of
//  existing_work/td_py/wingbasecolour_script.py (the TouchDesigner
//  "BASE COLOR GENERATOR v3" Script TOP). It paints a full-frame RGB
//  texture -- a mirror-fold gradient ramp, perturbed by an fBm noise
//  field, coloured through an HSV palette, multiplied by a second
//  palette-coloured fBm ("mottle"), and finished with a 1-D overlay
//  tint. Alpha is a constant 1: the wing SHAPE (wing-tex.js) supplies
//  the cutout as a separate alphaMap.
//
//  ONLY the visitor's grown butterfly gets one (collection.js). The 26
//  keyboard letters stay flat -- this is the single deliberate exception
//  to the "Flat" rule in CLAUDE.md, for the hero butterfly.
//
//  v8.3 -- LAYERED, LEPIDOPTERAN. The v8 port was one global gradient
//  ramp and read as wallpaper. v8.3 builds the wing the way a real one
//  is built: a membrane wash with discrete markings composited on top,
//  all seeded from the name. In compositing order:
//
//   1. MEMBRANE -- the old ramp (eight kinds, a fine fold, an fBm warp)
//      through a TWO-TONE palette: each name derives a second anchor hue
//      from the first by a harmonic rule (complement / triad / split /
//      analogous, or CFG.wingColHarmony), and the palette sweeps between
//      them the short way round the wheel. The field is biased toward the
//      name's own hue so the second reads as banded accent.
//   2. WING DIVISION -- fore (v<0.5) and hind (v>0.5) take a slight
//      value offset, so the two halves are not one flat sheet.
//   3. SCALE SPECKLE -- a fine per-pixel grain, for the powdery read.
//   4. MOTTLE -- the second palette-coloured fBm, as before.
//   5. VENATION -- 4-7 tapering veins fanning from the wing root out to
//      the margin, per wing, optionally cross-linked. The single
//      strongest "this is a wing" cue.
//   6. DISCAL MARK -- an optional dark spot/bar mid-wing.
//   7. EYESPOTS -- 0-3 discrete ocelli (dark pupil, bright rim, coloured
//      iris, dark ring, pale halo, white catch-light) placed in the
//      outer wing.
//   8. MARGINAL BAND + SUBMARGINAL LUNULES -- a dark border with a row
//      of pale/coloured spots just inside it, following the outer edge.
//   9. BASAL SUFFUSION -- dark against the body at the root.
//  10. OVERLAY TINT -- a faint 1-D gradient, as before.
//
//  NOT PARITY-LOCKED. There is no TouchDesigner colour reference in the
//  repo and the texture is name-driven, not index-driven, so a
//  bit-match with a TD bake was never the contract. The contract is:
//
//      SAME entry.values  ->  byte-identical texture, any machine, any reload.
//
//  That still holds -- every draw below is deterministic from the FNV-1a
//  hash of entry.values through mulberry32, in the fixed order the
//  DRAW N comments mark. Changing that order re-renders every collected
//  butterfly's wing on next load (shape, hue identity and name tag are
//  unaffected); v8.3 does exactly that, deliberately.
//
//  Loads AFTER config.js (reads CFG.wingCol*), wing-gen.js (SLICE_W/H),
//  and A-Frame (THREE). Before collection.js.
// ============================================================
var WingColour = (function () {
  'use strict';

  //  Match the shape slice exactly so map and alphaMap share a pixel
  //  layout and line up under the wing plane's UVs (bfly-model.js).
  var W = WingGen.SLICE_W;   // 128, outward from the body (root -> tip)
  var H = WingGen.SLICE_H;   // 256, along the body (hind -> fore, forewing at row 0)
  var NOISE_RES = 256;       // internal fBm resolution, upscaled to W x H

  //  The v6.2 lesson (see "config keys drift" in the version notes): a
  //  CFG key the code reads but config.js never defined multiplies to NaN
  //  and renders nothing, invisibly. Fail loud.
  ['wingColRandAmt', 'wingColPeriod', 'wingColPeriodMax',
   'wingColRampType', 'wingColHarmony'].forEach(function (key) {
    if (CFG[key] === undefined) { console.error('[wing-colour] CFG.' + key + ' is undefined'); }
  });

  //  v8.3: eight kinds (v8 had the first, second, fifth, sixth). Any of
  //  them can be forced by CFG.wingColRampType; the per-name 'random'
  //  pick is WEIGHTED (RAMP_BAG) toward the ones that read like real wing
  //  markings -- cross-bands (horiz), rings/ocelli (radial, circular),
  //  oblique sweeps (diag) -- and away from plaid / spiral, which are
  //  there for range but rarely look lepidopteran.
  var RAMPS = ['margin', 'horiz', 'vert', 'diag', 'diagalt', 'radial', 'circular', 'spiral', 'plaid'];
  var WHITE = [1, 1, 1];   // eyespot catch-light
  var RAMP_WEIGHT = { margin: 2, horiz: 3, vert: 1, diag: 2, diagalt: 2, radial: 2, circular: 5, spiral: 1, plaid: 1 };
  var RAMP_BAG = (function () {
    var bag = [];
    RAMPS.forEach(function (r) { for (var i = 0; i < RAMP_WEIGHT[r]; i++) { bag.push(r); } });
    return bag;
  })();

  //  harmonic rules for the second anchor hue -- offsets round the wheel.
  //  'analog' is drawn from analogRoll; the rest are fixed fractions.
  var HARMONIES = ['complement', 'triad', 'split', 'analog'];

  // ---------- hashing: stable across sessions and machines ----------
  //  FNV-1a over the printed values -- identical construction to
  //  Wings.hashValues (a float-bit hash would not be portable).
  function fnv1a(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function canon(values) {
    return values.map(function (v) { return Number(v).toFixed(6); }).join(',');
  }
  //  seed off the values FORWARD; base hue off the values REVERSED, so
  //  the two are decorrelated (same trick Wings.colorFor uses).
  function seedFor(values)    { return fnv1a(canon(values)); }
  function nameHueFor(values) { return fnv1a(canon(values.slice().reverse())) / 4294967296; }

  // ---------- mulberry32, verbatim from web/js/prng.js ----------
  function mulberry32(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- small maths ----------
  function clamp01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
  function mod1(x) { return ((x % 1) + 1) % 1; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  //  hue interpolation on the SHORT way round the wheel -- so a
  //  complement anchor sweeps half the wheel, not the other half, and a
  //  triad stays a triad instead of wrapping into a rainbow.
  function hueLerp(a, b, t) { var d = b - a; d -= Math.round(d); return mod1(a + d * t); }

  //  _hsv, ported exactly: 6-sector, hue wraps.
  function hsv(h, s, v) {
    h = mod1(h);
    var i = Math.floor(h * 6), f = h * 6 - i;
    var p = v * (1 - s), q = v * (1 - f * s), tt = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0:  return [v, tt, p];
      case 1:  return [q, v, p];
      case 2:  return [p, v, tt];
      case 3:  return [p, q, v];
      case 4:  return [tt, p, v];
      default: return [v, p, q];
    }
  }

  //  nstops HSV colours sweeping hueA -> hueB (short way), dark -> bright.
  //  THREE rng draws per stop, in order: hue jitter, saturation, value.
  //  (v8's _make_palette took two -- v8.3 adds a per-stop hue wobble so
  //  the two anchors don't read as a clean two-stop gradient.)
  function makePalette(rng, hueA, hueB, ramt, nstops, floorV) {
    if (floorV === undefined) { floorV = 0.48; }
    var stops = [], cols = [], denom = Math.max(nstops - 1, 1);
    for (var k = 0; k < nstops; k++) {
      var frac = k / denom;
      var h  = hueLerp(hueA, hueB, frac) + (rng() * 2 - 1) * ramt * 0.06;      // DRAW: hue
      var s  = clamp01(0.60 + (rng() * 2 - 1) * ramt * 0.34);                  // DRAW: sat
      var vv = floorV + (1 - floorV) * frac;
      vv = Math.min(Math.max(vv + (rng() * 2 - 1) * ramt * 0.20, 0.14), 1.0);  // DRAW: val
      cols.push(hsv(h, s, vv));
      stops.push(nstops === 1 ? 0 : k / (nstops - 1));
    }
    return { stops: stops, cols: cols };
  }

  //  np.interp over the palette, flat-clamped at both ends.
  function paletteEval(x, pal) {
    var s = pal.stops, c = pal.cols, n = s.length;
    if (x <= s[0]) { return c[0]; }
    if (x >= s[n - 1]) { return c[n - 1]; }
    for (var i = 0; i < n - 1; i++) {
      if (x <= s[i + 1]) {
        var w = (x - s[i]) / (s[i + 1] - s[i]);
        var a = c[i], b = c[i + 1];
        return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w];
      }
    }
    return c[n - 1];
  }

  //  _value_noise: one octave of smooth value noise at N x N, bilinear
  //  over an (freq+1)x(freq+1) lattice with a smoothstepped fraction. The
  //  lattice fill is the ONLY rng draw here -- (freq+1)^2 values,
  //  ROW-MAJOR (numpy C order).
  function valueNoise(rng, N, freq) {
    var side = freq + 1;
    var g = new Float64Array(side * side);
    for (var i = 0; i < g.length; i++) { g[i] = rng(); }   // g[r * side + c]

    var i0 = new Int32Array(N), i1 = new Int32Array(N), wt = new Float64Array(N);
    for (var j = 0; j < N; j++) {
      var sp = j * freq / N;
      var f0 = Math.floor(sp), fr = sp - f0;
      i0[j] = f0;
      i1[j] = Math.min(f0 + 1, freq);
      wt[j] = fr * fr * (3 - 2 * fr);
    }

    var row = new Float64Array(side * N);
    for (var r = 0; r < side; r++) {
      var base = r * side;
      for (var x = 0; x < N; x++) {
        var g0 = g[base + i0[x]], g1 = g[base + i1[x]];
        row[r * N + x] = g0 + (g1 - g0) * wt[x];
      }
    }
    var out = new Float64Array(N * N);
    for (var y = 0; y < N; y++) {
      var ra = i0[y] * N, rb = i1[y] * N, wy = wt[y];
      for (var xx = 0; xx < N; xx++) {
        var v0 = row[ra + xx], v1 = row[rb + xx];
        out[y * N + xx] = v0 + (v1 - v0) * wy;
      }
    }
    return out;   // N x N, row-major
  }

  //  _fbm_small: 3 octaves at NOISE_RES, freq f, 2f, 4f; amp 1 -> x0.5;
  //  normalise by the amplitude sum (1.75). Octave order is load-bearing.
  function fbmSmall(rng, freq) {
    var total = new Float64Array(NOISE_RES * NOISE_RES);
    var amp = 1.0, asum = 0.0, f = Math.max(freq, 1);
    for (var o = 0; o < 3; o++) {
      var oct = valueNoise(rng, NOISE_RES, f);
      for (var i = 0; i < total.length; i++) { total[i] += amp * oct[i]; }
      asum += amp; amp *= 0.5; f *= 2;
    }
    for (var j = 0; j < total.length; j++) { total[j] /= asum; }
    return total;   // NOISE_RES x NOISE_RES
  }

  //  _upscale: separable bilinear small -> (W, H). No rng, no smoothstep
  //  (plain lerp); np.linspace(0, src-1, dst) sample positions.
  function upscale(g, gW, gH, dstW, dstH) {
    function idx(dst, last) {
      var i0 = new Int32Array(dst), i1 = new Int32Array(dst), wt = new Float64Array(dst);
      for (var j = 0; j < dst; j++) {
        var sp = dst === 1 ? 0 : j * last / (dst - 1);
        var f0 = Math.floor(sp);
        i0[j] = f0; i1[j] = Math.min(f0 + 1, last); wt[j] = sp - f0;
      }
      return { i0: i0, i1: i1, wt: wt };
    }
    var X = idx(dstW, gW - 1), Y = idx(dstH, gH - 1);
    var row = new Float64Array(gH * dstW);
    for (var r = 0; r < gH; r++) {
      var base = r * gW;
      for (var x = 0; x < dstW; x++) {
        var a = g[base + X.i0[x]], b = g[base + X.i1[x]];
        row[r * dstW + x] = a + (b - a) * X.wt[x];
      }
    }
    var out = new Float64Array(dstH * dstW);
    for (var y = 0; y < dstH; y++) {
      var ra = Y.i0[y] * dstW, rb = Y.i1[y] * dstW, wy = Y.wt[y];
      for (var xx = 0; xx < dstW; xx++) {
        var v0 = row[ra + xx], v1 = row[rb + xx];
        out[y * dstW + xx] = v0 + (v1 - v0) * wy;
      }
    }
    return out;   // dstH x dstW, row-major
  }

  // ---------- venation helpers ----------
  //  A vein is a polyline fanning out from the wing root. Built entirely
  //  from rng draws so it is part of the determinism contract.
  function buildVeins(rng, originU, originV, n, spread, curl) {
    var veins = [];
    for (var i = 0; i < n; i++) {
      var frac = n === 1 ? 0.5 : i / (n - 1);
      //  fan OUTWARD (angle 0 = +u = root->tip), across a capped spread
      //  so no vein ever runs back toward the body or straight up/down
      var fan = Math.max(0.35, Math.min(spread, 0.8));
      var ang = (frac - 0.5) * fan + (rng() * 2 - 1) * 0.05;       // 3 draws / vein
      var len = 1.35 + rng() * 0.4;
      var cu  = curl * 0.4 + (rng() * 2 - 1) * 0.12;               // gentle curve only
      var wob = (rng() * 2 - 1) * 0.5;                             // subtle sinuosity
      //  the convergence node sits OFF the left edge (under the body on a
      //  real wing), so only the already-diverged run of each vein shows
      var oy = originV + (frac - 0.5) * 0.06;
      var segs = 7, step = len / segs;
      var dx = Math.cos(ang), dy = Math.sin(ang);
      var px = originU, py = oy;
      var pts = [[px, py]];
      for (var s = 1; s <= segs; s++) {
        var rot = cu * step * (0.4 + 1.0 * s / segs)
                + wob * step * Math.sin(s * 1.7);                  // sinuous, not a ruled line
        var ndx = dx * Math.cos(rot) - dy * Math.sin(rot);
        var ndy = dx * Math.sin(rot) + dy * Math.cos(rot);
        dx = ndx; dy = ndy;
        px += dx * step; py += dy * step;
        pts.push([px, py]);
      }
      veins.push(pts);
    }
    return veins;
  }
  //  short cross-veins between adjacent main veins. One rng draw per gap,
  //  always taken (branch or not) so the draw count is fixed.
  function addCrossVeins(rng, veins) {
    var base = veins.length;
    for (var i = 0; i < base - 1; i++) {
      var take = rng() < 0.5;
      var pi = 2 + Math.floor(rng() * 3);
      if (take && pi < veins[i].length && pi < veins[i + 1].length) {
        veins.push([veins[i][pi].slice(), veins[i + 1][pi].slice()]);
      }
    }
  }
  function veinBoxes(veins, pad) {
    return veins.map(function (p) {
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (var i = 0; i < p.length; i++) {
        var q = p[i];
        if (q[0] < x0) x0 = q[0]; if (q[1] < y0) y0 = q[1];
        if (q[0] > x1) x1 = q[0]; if (q[1] > y1) y1 = q[1];
      }
      return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
    });
  }
  function segDistSq(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var L2 = dx * dx + dy * dy || 1e-9;
    var tt = ((px - ax) * dx + (py - ay) * dy) / L2;
    tt = tt < 0 ? 0 : (tt > 1 ? 1 : tt);
    var ex = px - (ax + tt * dx), ey = py - (ay + tt * dy);
    return ex * ex + ey * ey;
  }
  function veinDistSq(u, v, veins, boxes) {
    var best = 1e9;
    for (var i = 0; i < veins.length; i++) {
      var bb = boxes[i];
      if (u < bb[0] || u > bb[2] || v < bb[1] || v > bb[3]) { continue; }
      var p = veins[i];
      for (var s = 0; s < p.length - 1; s++) {
        var d = segDistSq(u, v, p[s][0], p[s][1], p[s + 1][0], p[s + 1][1]);
        if (d < best) { best = d; }
      }
    }
    return best;
  }

  // ---------- the render ----------
  //  render(canvas, seed, nameHue, k) -- pure Canvas2D, no THREE.
  //  k = { ramt, basep, basepMax, ramp, harm }
  //
  //  All the PRNG draws happen up front, in this fixed order (the
  //  determinism contract); the pixel loop is pure maths. Layer order is
  //  the header list.
  function render(canvas, seed, nameHue, k) {
    canvas.width = W; canvas.height = H;
    var rng = mulberry32(seed >>> 0);
    var ramt = k.ramt;
    function jit(scale) { return (rng() * 2 - 1) * ramt * scale; }
    function clampf(x, a, b) { return x < a ? a : (x > b ? b : x); }
    function smooth(x) { x = x < 0 ? 0 : (x > 1 ? 1 : x); return x * x * (3 - 2 * x); }

    // == membrane ramp ==
    var kc = RAMP_BAG[Math.floor(rng() * RAMP_BAG.length) % RAMP_BAG.length];
    var kind = (RAMPS.indexOf(k.ramp) < 0) ? kc : k.ramp;
    var cx = 0.62 + jit(0.30);
    var cy = 0.5 + jit(0.38);
    var basepMax = Math.max(k.basepMax, k.basep + 0.25);
    var period = clampf(k.basep + (basepMax - k.basep) * Math.pow(rng(), 0.62), 0.25, basepMax);
    var twist = (rng() * 2 - 1) * 1.4;
    var fineMul = 2.0 + rng() * 3.0;
    var fineAmt = 0.07 + Math.abs(jit(0.24));
    var warpAmt = 0.12 + Math.abs(jit(0.45));
    var f1 = Math.floor(3 + Math.abs(jit(4)));
    var nw = upscale(fbmSmall(rng, f1), NOISE_RES, NOISE_RES, W, H);

    // == the two anchor hues ==
    var baseHue = mod1(nameHue + jit(0.16));
    var harmRoll = rng();
    var dir = rng() < 0.5 ? -1 : 1;
    var analog = 0.11 + rng() * 0.13;
    var fam = (HARMONIES.indexOf(k.harm) < 0)
      ? HARMONIES[Math.floor(harmRoll * HARMONIES.length) % HARMONIES.length]
      : k.harm;
    var off = fam === 'complement' ? 0.5
            : fam === 'triad'      ? 0.3333
            : fam === 'split'      ? 0.42
            :                        analog;
    var hueB = mod1(baseHue + dir * off);

    var nstops = clampf(2 + Math.floor(Math.abs(jit(3.5))), 2, 5);
    var pal1 = makePalette(rng, baseHue, hueB, ramt, nstops, 0.34);   // membrane rides dark so the markings read on top

    // == mottle ==
    var f2 = Math.floor(6 + Math.abs(jit(8)));
    var n2 = upscale(fbmSmall(rng, f2), NOISE_RES, NOISE_RES, W, H);
    var pal2 = makePalette(rng, hueB, baseHue, ramt, 3);
    var namt = 0.09 + Math.abs(jit(0.22));

    // == the marking colours, derived from the two anchors ==
    var veinCol = hsv(baseHue, clampf(0.35 + jit(0.2), 0.1, 0.7), 0.14 + Math.abs(jit(0.06)));
    var darkCol = hsv(baseHue, clampf(0.5 + jit(0.2), 0.15, 0.85), 0.06 + Math.abs(jit(0.05)));
    var irisCol = hsv(hueB, clampf(0.82 + jit(0.25), 0.35, 1), 0.86);
    var rimCol  = hsv(mod1(hueB + dir * 0.07), clampf(0.55 + jit(0.2), 0.2, 0.9), 0.96);
    var lunPale = rng() < 0.5;
    var lunCol  = lunPale ? [0.96, 0.95, 0.90] : hsv(hueB, clampf(0.7 + jit(0.2), 0.3, 1), 0.9);

    // == wing division / speckle ==
    var hindVal = jit(0.13);                     // fore vs hind value offset
    var speckAmt = 0.045 + Math.abs(jit(0.085));

    // == venation ==
    var veinN = 3 + Math.floor(rng() * 3);       // 3..5 main veins per wing
    var veinW = 0.011 + rng() * 0.010;           // half-width in uv (root; tapers out)
    var veinDark = 0.24 + rng() * 0.22;          // subtle -- structure, not cracks
    var veinCurl = (rng() * 2 - 1) * 0.6;
    var veinSpread = 0.5 + rng() * 0.3;
    var originU = -0.10 - rng() * 0.06;          // node off-frame to the left
    var foreOV = clampf(0.30 + jit(0.06), 0.12, 0.44);
    var hindOV = clampf(0.70 + jit(0.06), 0.56, 0.88);
    var foreVeins = buildVeins(rng, originU, foreOV, veinN, veinSpread, veinCurl);
    var hindVeins = buildVeins(rng, originU, hindOV, veinN, veinSpread, -veinCurl);
    addCrossVeins(rng, foreVeins);
    addCrossVeins(rng, hindVeins);
    var foreBox = veinBoxes(foreVeins, veinW * 2.5);
    var hindBox = veinBoxes(hindVeins, veinW * 2.5);
    var veinW2 = veinW * 2;

    // == discal mark ==
    var hasDiscal = rng() < 0.45;
    var discU = 0.34 + rng() * 0.16;
    var discOnHind = rng() < 0.5;
    var discV = discOnHind ? 0.60 + rng() * 0.12 : 0.22 + rng() * 0.12;
    var discR = 0.05 + rng() * 0.05;

    // == eyespots -- 0-4, and when there are several they form a
    //    SUBMARGINAL ROW along the outer wing (Satyrinae / Buckeye), not
    //    a scatter ==
    var eyeRoll = rng();
    var eyeN = eyeRoll < 0.34 ? 0 : eyeRoll < 0.58 ? 1 : eyeRoll < 0.80 ? 2
             : eyeRoll < 0.93 ? 3 : 4;
    var eyeHind = rng() < 0.72;                   // most butterflies wear them on the hindwing
    var eyeBandU = 0.60 + rng() * 0.20;           // how far out the row sits
    var eyeR0 = 0.040 + rng() * 0.055;            // base radius (smaller when there are more)
    var eyeR = eyeN > 1 ? eyeR0 * (0.62 + 0.9 / eyeN) : eyeR0 + 0.02;
    var eyeVLo = eyeHind ? 0.55 : 0.06;
    var eyeVHi = eyeHind ? 0.94 : 0.45;
    var eyes = [];
    for (var e = 0; e < eyeN; e++) {
      var f = eyeN === 1 ? 0.5 : e / (eyeN - 1);
      var span = eyeVHi - eyeVLo;
      var ev = eyeVLo + span * (0.12 + 0.76 * f);
      var eu = eyeBandU + (rng() * 2 - 1) * 0.05;     // 1 draw / eye
      var er = eyeR * (0.85 + rng() * 0.35);          // 1 draw / eye
      eyes.push({ u: eu, v: ev, r: er });
    }

    // == marginal band + submarginal lunules ==
    var marginW = 0.05 + Math.abs(jit(0.055));
    var lunN = 5 + Math.floor(Math.abs(jit(7)));
    var lunDepth = 0.5 + rng() * 0.4;
    var submarg = rng() < 0.6;

    // == basal suffusion ==
    var basalAmt = 0.30 + Math.abs(jit(0.4));
    var basalW = 0.09 + Math.abs(jit(0.09));

    // == overlay tint ==
    var vertical = rng() >= 0.5;
    var diagOv = rng() < 0.35;
    var oHue = mod1(baseHue + 0.5 + jit(0.25));
    var oSat = clampf(0.6 + jit(0.4), 0, 1);
    var oAmt = Math.abs(jit(0.30));
    var oMult = rng() < 0.65;                     // multiply (deepens) more often than screen (washes)
    var oCol = hsv(oHue, oSat, 1.0);
    //  -- all PRNG draws are now done; the pixel loop is pure maths --

    var TWO_PI = Math.PI * 2;
    var isPlaid = kind === 'plaid';
    function foldTri(x, p) { var a = (x * p) % 2.0; a -= 1.0; return 1.0 - Math.abs(a); }
    function rampScalar(u, v) {
      switch (kind) {
        case 'margin':                                                           // bands parallel to the wing edge, corners rounded
          var ed = Math.min(1 - u, Math.min(v, 1 - v));
          var rd = Math.hypot((u - 0.5) * 0.72, v - 0.5);
          return (1 - (ed * 0.55 + (0.5 - Math.min(rd, 0.5)) * 0.45)) * 1.7;
        case 'horiz':   return u;
        case 'vert':    return v;
        case 'diag':    return (u + v) * 0.5;
        case 'diagalt': return (u - v) * 0.5 + 0.5;
        case 'radial':  return Math.atan2(v - cy, u - cx) / TWO_PI + 0.5
                             + twist * Math.hypot(v - cy, u - cx);
        case 'spiral':  return Math.atan2(v - cy, u - cx) / TWO_PI + 0.5
                             + (0.6 + Math.abs(twist)) * Math.hypot(v - cy, u - cx);
        default:        return Math.hypot(v - cy, u - cx) / 0.72;   // circular
      }
    }
    //  crisp two-octave value grain -- reads as scales, not TV static
    function hash2(x, y) {
      var h = (Math.imul((x + 1) ^ 0x9e3779b9, 0x85ebca6b) ^
               Math.imul((y + 1) ^ 0x27d4eb2f, 0xc2b2ae35)) >>> 0;
      h ^= h >>> 15;
      return (h >>> 0) / 4294967296;
    }

    var img = canvas.getContext('2d').createImageData(W, H);
    var data = img.data;

    for (var row = 0; row < H; row++) {
      var v = H === 1 ? 0 : row / (H - 1);
      var hindW = smooth((v - 0.5) / 0.14);           // 0 fore -> 1 hind
      var onHindHalf = v >= 0.5;
      for (var col = 0; col < W; col++) {
        var u = W === 1 ? 0 : col / (W - 1);
        var idx = row * W + col;

        // distance to the nearest visible margin (outer / fore / hind)
        var outerD = 1 - u, foreD = v, hindD = 1 - v;
        var md = outerD < foreD ? outerD : foreD;
        if (hindD < md) { md = hindD; }

        // -- 1. membrane --
        var t0, fine;
        if (isPlaid) {
          t0   = 0.5 * (foldTri(u, period) + foldTri(v, period));
          fine = 0.5 * (foldTri(u, period * fineMul) + foldTri(v, period * fineMul));
        } else {
          var a = rampScalar(u, v);
          t0   = foldTri(a, period);
          fine = foldTri(a, period * fineMul);
        }
        t0 = clampf(t0 + fineAmt * (fine - 0.5), 0, 1);
        t0 = t0 * t0 * (2 - t0);                       // bias toward the name's hue
        var tt = clampf((nw[idx] - 0.5) * warpAmt + t0, 0, 1);
        var mem = paletteEval(tt, pal1);
        var r = mem[0], g = mem[1], b = mem[2];

        // -- 2. wing division --
        var wv = 1 - hindVal * hindW;
        r *= wv; g *= wv; b *= wv;

        // -- 3. scale speckle --
        var sp = 0.5 * hash2(col, row) + 0.5 * hash2(col >> 1, row >> 1);
        var sk = 1 + (sp - 0.5) * 2 * speckAmt;
        r *= sk; g *= sk; b *= sk;

        // -- 4. mottle --
        var cn = paletteEval(n2[idx], pal2);
        r *= 1 + (cn[0] - 0.5) * 2 * namt;
        g *= 1 + (cn[1] - 0.5) * 2 * namt;
        b *= 1 + (cn[2] - 0.5) * 2 * namt;

        // -- 5. venation -- tapers thinner and fainter toward the tip,
        //    and stops at the marginal band
        if (md > marginW * 0.9) {
          var vsq = onHindHalf
            ? veinDistSq(u, v, hindVeins, hindBox)
            : veinDistSq(u, v, foreVeins, foreBox);
          var half = veinW2 * (1.25 - 0.55 * u);       // wide at root, narrow at tip
          if (vsq < half * half) {
            var vd = 1 - Math.sqrt(vsq) / half;
            vd = vd * vd * veinDark * (1 - 0.45 * u);
            r += (veinCol[0] - r) * vd; g += (veinCol[1] - g) * vd; b += (veinCol[2] - b) * vd;
          }
        }

        // -- 6. discal mark --
        if (hasDiscal) {
          var dd = Math.sqrt((u - discU) * (u - discU) + (v - discV) * (v - discV)) / discR;
          if (dd < 1) {
            var df = (1 - dd); df = df * df * 0.7;
            r += (darkCol[0] - r) * df; g += (darkCol[1] - g) * df; b += (darkCol[2] - b) * df;
          }
        }

        // -- 7. eyespots --
        for (var ei = 0; ei < eyes.length; ei++) {
          var E = eyes[ei];
          var ex = u - E.u, ey = v - E.v;
          var ern = Math.sqrt(ex * ex + ey * ey) / E.r;
          if (ern < 1.10) {
            var ec, ea = 1;
            if      (ern < 0.30) { ec = darkCol; }     // pupil
            else if (ern < 0.40) { ec = rimCol;  }     // bright rim
            else if (ern < 0.66) { ec = irisCol; }     // iris
            else if (ern < 0.86) { ec = darkCol; }     // dark ring
            else                 { ec = lunCol;  }     // pale halo
            if (ern > 0.98) { ea = 1 - (ern - 0.98) / 0.12; }
            // white catch-light in the pupil, up and inboard
            var hx = u - (E.u - E.r * 0.15), hy = v - (E.v - E.r * 0.22);
            if (hx * hx + hy * hy < (E.r * 0.12) * (E.r * 0.12)) { ec = WHITE; ea = 1; }
            r += (ec[0] - r) * ea; g += (ec[1] - g) * ea; b += (ec[2] - b) * ea;
          }
        }

        // -- 8. marginal band + submarginal lunules --
        if (md < marginW) {
          var mb = 1 - md / marginW; mb = mb < 0 ? 0 : mb * (2 - mb);   // ease-out, solid at the very edge
          r += (darkCol[0] - r) * mb; g += (darkCol[1] - g) * mb; b += (darkCol[2] - b) * mb;
        } else if (outerD < foreD && outerD < hindD && outerD < marginW * 2.8) {
          //  submarginal spot row -- a run of soft lunules just inside the
          //  dark band, following the OUTER margin only (the fore/hind
          //  edges keep just the plain dark band; a row wrapping all four
          //  sides reads as a picture frame, not a wing)
          var lz = (outerD - marginW) / (marginW * 1.8);    // 0 at band -> 1 outward
          var along = v * lunN;
          var fr = along - Math.floor(along);
          var spot = smooth(1 - Math.abs(fr - 0.5) * 1.7);  // rounder blobs, not sharp dashes
          var lw = lz < 1 ? (1 - Math.abs(lz - 0.4) / 0.62) : 0; if (lw < 0) { lw = 0; }
          //  fade the row out at the fore/hind ends so it never collides
          //  with the corner where the margins meet
          var endFade = smooth(v / 0.14) * smooth((1 - v) / 0.14);
          var lf = spot * smooth(lw) * endFade * lunDepth;
          if (submarg) { lf *= 1.3; }
          r += (lunCol[0] - r) * lf; g += (lunCol[1] - g) * lf; b += (lunCol[2] - b) * lf;
        }

        // -- 9. basal suffusion (root, u -> 0) --
        var bf = basalAmt * (1 - smooth(u / basalW)) * 0.85;
        r += (darkCol[0] - r) * bf; g += (darkCol[1] - g) * bf; b += (darkCol[2] - b) * bf;

        // -- 10. overlay tint --
        var oT = diagOv ? (u + v) * 0.5 : (vertical ? v : u);
        var trr = 1 - oT * oAmt * (1 - oCol[0]);
        var tgg = 1 - oT * oAmt * (1 - oCol[1]);
        var tbb = 1 - oT * oAmt * (1 - oCol[2]);
        if (oMult) {
          r *= trr; g *= tgg; b *= tbb;
        } else {
          r = 1 - (1 - r) * (2 - trr) * 0.5;
          g = 1 - (1 - g) * (2 - tgg) * 0.5;
          b = 1 - (1 - b) * (2 - tbb) * 0.5;
        }

        //  final grade -- saturate, deepen, and lift midtone contrast so
        //  the pale variants stop reading as washed-out
        var lum = 0.30 * r + 0.59 * g + 0.11 * b;
        r = r + (r - lum) * 0.22;
        g = g + (g - lum) * 0.22;
        b = b + (b - lum) * 0.22;
        var cc = 0.5 + (lum - 0.5) * 1.14 - 0.03;         // S-ish contrast, slight darken
        var kk = lum > 0.001 ? clampf(cc, 0, 1) / lum : 1;
        r *= kk; g *= kk; b *= kk;

        var o = idx * 4;
        data[o]     = Math.round(clampf(r, 0, 1) * 255);
        data[o + 1] = Math.round(clampf(g, 0, 1) * 255);
        data[o + 2] = Math.round(clampf(b, 0, 1) * 255);
        data[o + 3] = 255;                                // alpha 1 -- the shape mask cuts it
      }
    }
    canvas.getContext('2d').putImageData(img, 0, 0);
    return canvas;
  }

  // ---------- the THREE wrapper + its own small LRU ----------
  function srgb(tex) {
    if (THREE.SRGBColorSpace) { tex.colorSpace = THREE.SRGBColorSpace; }
    return tex;
  }

  function texFromCanvas(canvas) {
    var t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true;
    return srgb(t);
  }

  var MAX = 0;                 // set lazily, once CFG.maxCollected is trusted
  var cache = [];              // [{ key, canvas, tex, hue }] newest last

  function knobs() {
    return {
      ramt: CFG.wingColRandAmt, basep: CFG.wingColPeriod,
      basepMax: CFG.wingColPeriodMax, ramp: CFG.wingColRampType,
      harm: CFG.wingColHarmony
    };
  }
  function keyFor(values) {
    var k = knobs();
    return seedFor(values) + '|' + k.ramt + '|' + k.basep + '|' +
           k.basepMax + '|' + k.ramp + '|' + k.harm;
  }

  function build(values) {
    if (!MAX) { MAX = (CFG.maxCollected || 12) + 4; }
    var key = keyFor(values);
    for (var i = 0; i < cache.length; i++) {
      if (cache[i].key === key) {
        var hit = cache.splice(i, 1)[0];        // touch
        cache.push(hit);
        return hit;
      }
    }
    var k = knobs();
    var seed = seedFor(values), hue = nameHueFor(values);
    var rec;
    if (cache.length >= MAX) {
      rec = cache.shift();
      rec.key = key; rec.hue = hue;
      render(rec.canvas, seed, hue, k);
      rec.tex.needsUpdate = true;
      cache.push(rec);
    } else {
      var canvas = document.createElement('canvas');
      render(canvas, seed, hue, k);
      rec = { key: key, canvas: canvas, tex: texFromCanvas(canvas), hue: hue };
      cache.push(rec);
    }
    return rec;
  }

  function stats() {
    return {
      unique: cache.length, max: MAX,
      approxMB: +((cache.length * W * H * 4) / 1048576).toFixed(2)
    };
  }

  return {
    W: W, H: H,
    RAMPS: RAMPS, HARMONIES: HARMONIES,
    forEntry: function (entry) { return build(entry.values); },
    forValues: function (values) { return build(values); },
    render: render,
    seedFor: seedFor,
    nameHueFor: nameHueFor,
    stats: stats
  };
})();
