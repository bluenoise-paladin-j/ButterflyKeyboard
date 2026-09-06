// ============================================================
//  wing-colour.js  --  the per-name base-colour texture (v8)
// ============================================================
//  A faithful-LOOK port of existing_work/td_py/wingbasecolour_script.py
//  (the TouchDesigner "BASE COLOR GENERATOR v3" Script TOP). It paints a
//  full-frame RGB texture -- a mirror-fold gradient ramp, perturbed by an
//  fBm noise field, coloured through a dark->bright HSV palette,
//  multiplied by a second palette-coloured fBm ("mottle"), and finished
//  with a complementary 1-D overlay tint. Alpha is a constant 1: the wing
//  SHAPE (wing-tex.js) supplies the cutout as a separate alphaMap.
//
//  ONLY the visitor's grown butterfly gets one (collection.js). The 26
//  keyboard letters stay flat -- this is the single deliberate exception
//  to the "Flat" rule in CLAUDE.md, for the hero butterfly.
//
//  TWO DELIBERATE DIVERGENCES FROM THE PYTHON:
//
//   1. Own PRNG. The Python seeds numpy's PCG64 off an integer atlas
//      index. Here the texture is driven by the NAME (like the wing
//      shape), so it is seeded off a hash of entry.values and drawn from
//      mulberry32 (the codebase's existing off-parity PRNG, web/js/
//      prng.js). The RNG DRAW ORDER is reproduced exactly -- that order
//      is the contract -- but the numbers are not bit-identical to a
//      TouchDesigner bake. There is no TD colour reference or harness in
//      the repo, and index-parity is meaningless once it is name-driven.
//      The real contract: SAME entry.values -> SAME texture, any machine.
//
//   2. Full-spectrum hue. The Python centres every texture's base_hue on
//      a fixed 0.08 (orange). Here that centre is a name-derived hue over
//      the whole wheel; the Python's `+ jit(0.5)` jitter and everything
//      keyed off base_hue downstream (palette spread, mottle palette,
//      complementary overlay) follow it for free.
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
  var NOISE_RES = 256;       // internal fBm resolution, upscaled to W x H (matches the Python)

  //  The v6.2 lesson (see "config keys drift" in the version notes): a
  //  CFG key the code reads but config.js never defined multiplies to NaN
  //  and renders nothing, invisibly. Fail loud.
  ['wingColRandAmt', 'wingColPeriod', 'wingColRampType'].forEach(function (k) {
    if (CFG[k] === undefined) { console.error('[wing-colour] CFG.' + k + ' is undefined'); }
  });

  var RAMPS = ['horiz', 'vert', 'radial', 'circular'];

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

  //  _make_palette, ported exactly: nstops HSV colours dark->bright
  //  around base_hue (+ hue_off). TWO rng draws per stop, SAT then VAL.
  function makePalette(rng, baseHue, hueOff, ramt, nstops) {
    var stops = [], cols = [], denom = Math.max(nstops - 1, 1);
    for (var k = 0; k < nstops; k++) {
      var h  = baseHue + hueOff + (k / denom - 0.5) * (0.10 + 0.15 * ramt);
      var s  = clamp01(0.75 + (rng() * 2 - 1) * ramt * 0.35);            // DRAW: sat
      var vv = 0.25 + 0.75 * (k / denom);
      vv = Math.min(Math.max(vv + (rng() * 2 - 1) * ramt * 0.2, 0.05), 1.0);   // DRAW: val
      cols.push(hsv(h, s, vv));
      stops.push(nstops === 1 ? 0 : k / (nstops - 1));
    }
    return { stops: stops, cols: cols };
  }

  //  np.interp over the palette, flat-clamped at both ends. The Python
  //  bakes a 2048-entry LUT for speed; its own header notes the LUT error
  //  is < 1/4000 of a colour step, so evaluating the piecewise-linear
  //  palette directly is MORE accurate, not less.
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

    //  sample positions: np.linspace(0, freq, N, endpoint=False)
    var i0 = new Int32Array(N), i1 = new Int32Array(N), wt = new Float64Array(N);
    for (var j = 0; j < N; j++) {
      var sp = j * freq / N;
      var f0 = Math.floor(sp), fr = sp - f0;
      i0[j] = f0;
      i1[j] = Math.min(f0 + 1, freq);
      wt[j] = fr * fr * (3 - 2 * fr);
    }

    //  interpolate along x for each lattice row -> (side, N)
    var row = new Float64Array(side * N);
    for (var r = 0; r < side; r++) {
      var base = r * side;
      for (var x = 0; x < N; x++) {
        var g0 = g[base + i0[x]], g1 = g[base + i1[x]];
        row[r * N + x] = g0 + (g1 - g0) * wt[x];
      }
    }
    //  then along y -> (N, N)
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
    //  x pass at source height -> (gH, dstW)
    var row = new Float64Array(gH * dstW);
    for (var r = 0; r < gH; r++) {
      var base = r * gW;
      for (var x = 0; x < dstW; x++) {
        var a = g[base + X.i0[x]], b = g[base + X.i1[x]];
        row[r * dstW + x] = a + (b - a) * X.wt[x];
      }
    }
    //  y pass -> (dstH, dstW)
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

  // ---------- the port of onCook ----------
  //  render(canvas, seed, nameHue, k) -- pure Canvas2D, no THREE.
  //  k = { ramt, basep, ramp }  (CFG.wingColRandAmt / Period / RampType)
  function render(canvas, seed, nameHue, k) {
    canvas.width = W; canvas.height = H;
    var rng = mulberry32(seed >>> 0);
    var ramt = k.ramt;
    function jit(scale) { return (rng() * 2 - 1) * ramt * scale; }

    // -- ramp kind / centre / period --
    var kc = RAMPS[Math.floor(rng() * 4) % 4];                       // DRAW 1 -- ALWAYS
    var kind = (k.ramp === 'random' || RAMPS.indexOf(k.ramp) < 0) ? kc : k.ramp;
    var cx = 0.5 + jit(0.35);                                        // DRAW 2
    var cy = 0.5 + jit(0.35);                                        // DRAW 3
    var period = k.basep + (8.0 - k.basep) * Math.pow(rng(), 0.4);   // DRAW 4
    period = Math.min(Math.max(period, 0.25), 8.0);

    // -- domain warp: fBm-1, upscaled --
    var warpAmt = 0.10 + Math.abs(jit(0.40));                        // DRAW 5
    var f1 = Math.floor(3 + Math.abs(jit(4)));                       // DRAW 6
    var nw = upscale(fbmSmall(rng, f1), NOISE_RES, NOISE_RES, W, H); // DRAWS 7-9

    // -- base palette --
    var baseHue = mod1(nameHue + jit(0.5));                          // DRAW 10 (0.08 -> nameHue)
    var nstops = 2 + Math.floor(Math.abs(jit(2.4)));                 // DRAW 11
    var pal1 = makePalette(rng, baseHue, 0.0, ramt, nstops);        // DRAWS 12  (2*nstops)

    // -- colour mottle: fBm-2, through a shifted palette --
    var f2 = Math.floor(6 + Math.abs(jit(8)));                       // DRAW 13
    var n2 = upscale(fbmSmall(rng, f2), NOISE_RES, NOISE_RES, W, H); // DRAWS 14-16
    var hueOff2 = 0.12 + jit(0.25);                                  // DRAW 17
    var pal2 = makePalette(rng, baseHue, hueOff2, ramt, 3);         // DRAWS 18  (6)
    var namt = 0.12 + Math.abs(jit(0.38));                           // DRAW 19

    // -- complementary overlay --
    var vertical = rng() >= 0.5;                                     // DRAW 20
    var oHue = mod1(baseHue + 0.5 + jit(0.25));                      // DRAW 21
    var oSat = clamp01(0.6 + jit(0.4));                              // DRAW 22
    var oAmt = Math.abs(jit(0.5));                                   // DRAW 23
    var mult = rng() < 0.5;                                          // DRAW 24
    //  -- all PRNG draws are now done; the pixel loop is pure maths --

    var oCol = hsv(oHue, oSat, 1.0);
    var TWO_PI = Math.PI * 2;

    var img = canvas.getContext('2d').createImageData(W, H);
    var data = img.data;

    for (var row = 0; row < H; row++) {
      var v = H === 1 ? 0 : row / (H - 1);
      for (var col = 0; col < W; col++) {
        var u = W === 1 ? 0 : col / (W - 1);

        // ramp value
        var a;
        if (kind === 'horiz')      { a = u; }
        else if (kind === 'vert')  { a = v; }
        else if (kind === 'radial'){ a = Math.atan2(v - cy, u - cx) / TWO_PI + 0.5; }
        else                       { a = Math.hypot(v - cy, u - cx) / 0.72; }   // circular
        a = (a * period) % 2.0; a -= 1.0;
        var t0 = 1.0 - Math.abs(a);                       // fold()

        var idx = row * W + col;
        var t = clamp01((nw[idx] - 0.5) * warpAmt + t0);

        var rgb = paletteEval(t, pal1);
        var cn = paletteEval(n2[idx], pal2);
        // rgb *= 1 + (cn - 0.5) * 2 * namt   (per channel)
        var r = rgb[0] * (1 + (cn[0] - 0.5) * 2 * namt);
        var g = rgb[1] * (1 + (cn[1] - 0.5) * 2 * namt);
        var b = rgb[2] * (1 + (cn[2] - 0.5) * 2 * namt);

        // overlay tint  (o_t is v for a vertical overlay, u otherwise)
        var oT = vertical ? v : u;
        var tr = 1 - oT * oAmt * (1 - oCol[0]);
        var tg = 1 - oT * oAmt * (1 - oCol[1]);
        var tb = 1 - oT * oAmt * (1 - oCol[2]);
        if (mult) {
          r *= tr; g *= tg; b *= tb;
        } else {
          // soft screen:  1 - (1 - rgb) * (2 - tint) * 0.5
          r = 1 - (1 - r) * (2 - tr) * 0.5;
          g = 1 - (1 - g) * (2 - tg) * 0.5;
          b = 1 - (1 - b) * (2 - tb) * 0.5;
        }

        var o = idx * 4;
        data[o]     = Math.round(clamp01(r) * 255);
        data[o + 1] = Math.round(clamp01(g) * 255);
        data[o + 2] = Math.round(clamp01(b) * 255);
        data[o + 3] = 255;                                // alpha 1 -- the shape mask cuts it
      }
    }
    canvas.getContext('2d').putImageData(img, 0, 0);
    return canvas;
  }

  // ---------- the THREE wrapper + its own small LRU ----------
  //  Deliberately NOT routed through Wings.forDials's cache: that would
  //  eat half of Wings.MAX_UNIQUE's 64 slots and its in-place redraw
  //  could mutate a live KEY wing's texture.
  function srgb(tex) {
    //  a COLOUR canvas -- unlike the wing alphaMap. colorManagement is on,
    //  so an untagged CanvasTexture reads as linear and a solid colour
    //  comes back a stop lighter (the documented "Flat" trap).
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
    return { ramt: CFG.wingColRandAmt, basep: CFG.wingColPeriod, ramp: CFG.wingColRampType };
  }
  function keyFor(values) {
    var k = knobs();
    return seedFor(values) + '|' + k.ramt + '|' + k.basep + '|' + k.ramp;
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
      //  reuse the least-recently-touched record IN PLACE. Safe: with
      //  MAX = maxCollected + 4, the LRU tail is always a stale,
      //  non-live record -- collection.js's on-screen set is a subset of
      //  the newest ~maxCollected entries, which are also the most
      //  recently built here. Raising CFG.maxCollected past ~MAX-4 needs
      //  MAX bumped too (cf. the Wings.MAX_UNIQUE / maxCollected note).
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
    forEntry: function (entry) { return build(entry.values); },
    forValues: function (values) { return build(values); },
    render: render,
    seedFor: seedFor,
    nameHueFor: nameHueFor,
    stats: stats
  };
})();
