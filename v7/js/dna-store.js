// ============================================================
//  dna-store.js  --  the collection: made, kept, brought back
// ============================================================
//  A FORK of web/js/dna-store.js, trimmed for this piece. The web
//  build buffers four separate captures because a narrative would
//  collect them at four story beats; the keyboard hands over a whole
//  name at once, so the buffer, `capture`, `undo` and `reset` are
//  gone and `DNA.create([v,v,v,v])` is the only way in. Do not sync
//  this file back to web/ -- it has diverged on purpose.
//
//  What a name becomes:
//
//      app.js:  DNA.create(NameDNA.toValues(name), { name: ..., ... })
//               -> an entry, saved, and 'dna:committed' fired
//               -> collection.js flies the butterfly in
//
//  The JSON shape is still TouchDesigner's exactly, plus one extra
//  `name` key it ignores on the way through:
//
//      { "sequences": [ { id, created, source, channel, values:[4], name } ] }
//
//  STORAGE is the `Store` object at the bottom -- the one seam. Above
//  it, an in-memory `cache` array is the synchronous source of truth,
//  so every `DNA.sequences()` call returns immediately whatever the
//  backing store is doing. `Store.write` replaces the cache and then
//  persists; nothing above the seam changed when phase 2 landed.
//
//  Phase 1 kept the collection in localStorage -- per-origin, so the
//  headset and the desktop held separate collections and a cleared
//  browser wiped the show. Phase 2 makes the server the authority:
//
//    Store.hydrate()  on load, GET dna_sequences.json from the server,
//                     and if it answers, that IS the collection.
//    Store.write()    also POSTs the whole collection back (debounced),
//                     and keeps writing localStorage as an offline mirror.
//
//  With no server (file://, a static host) the GET and POST just fail
//  quietly and it is phase-1 behaviour exactly -- localStorage only.
//  hydrate() will not clobber a collection this session has already
//  added to (see `dirtiedLocally`): the visitor in front of you wins.
// ============================================================
var DNA = (function () {
  'use strict';

  var SLOTS = 4;                       // values per sequence
  var PRECISION = 6;                   // decimal places stored
  var KEY = 'butterflies.dna.v1';      // localStorage key (shared with web/'s schema)

  //  Dial gain. Values are assumed to sit in -1..1; SPREAD widens them
  //  around the centre before toDials wraps. 1.0 is the identity map.
  //  Raise it only if real names cluster too tightly to reach different
  //  rolls -- measure, don't guess.
  var spread = 1.0;

  var cache = null;                    // Array | null -- the sync source of truth
  var listeners = {};

  var COLLECTION = 'dna_sequences.json';   // the shared file, served + written by serve.py
  var dirtiedLocally = false;          // has this session added to the collection yet?
  var postTimer = null;                // debounce handle for the write-back POST

  // ---------- events ----------
  function on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); }
  function emit(name, arg) {
    (listeners[name] || []).forEach(function (fn) { fn(arg); });
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent(name, { detail: arg }));
    }
  }

  // ---------- raw value -> roll dial ----------
  function toDials(values) {
    // The generator's roll chains are cyclic (0.0 and 1.0 are the same
    // roll), so this WRAPS instead of clamping: a gain above 1.0 spreads
    // a tight cluster across more of the chain without piling anything
    // up at the ends.
    var out = [];
    for (var i = 0; i < values.length; i++) {
      var d = (Number(values[i]) + 1.0) * 0.5;      // -1..1  ->  0..1
      d = (d - 0.5) * spread + 0.5;                  // expand around centre
      d = ((d % 1.0) + 1.0) % 1.0;
      out.push(Number(d.toFixed(PRECISION)));
    }
    return out;
  }

  function round(v) { return Number(Number(v).toFixed(PRECISION)); }
  function now() { return new Date().toISOString().replace(/\.\d+Z$/, ''); }

  // ---------- ids ----------
  function nextId(seqs) {
    // One past the highest id in use. NOT length + 1: that collides the
    // moment anything but the last entry is deleted, and the wing for a
    // duplicated id would be fought over by two butterflies.
    var m = 0;
    for (var i = 0; i < seqs.length; i++) { if ((seqs[i].id || 0) > m) { m = seqs[i].id || 0; } }
    return m + 1;
  }

  // ---------- cache ----------
  function ensureCache() {
    if (cache === null) { cache = Store.read(); }
    return cache;
  }

  // ---------- public API ----------
  function sequences() { return ensureCache().slice(); }   // a copy: callers must not mutate
  function count() { return ensureCache().length; }

  function byId(id) {
    var seqs = ensureCache();
    for (var i = 0; i < seqs.length; i++) { if (seqs[i].id === id) { return seqs[i]; } }
    return null;
  }

  function dialsFor(entry) { return toDials(entry.values); }

  //  A name (already turned into four values by NameDNA) becomes one
  //  stored sequence. Refuses a wrong-length set rather than padding it
  //  with fabricated genes.
  function create(values, meta) {
    if (!values || values.length !== SLOTS) { return null; }
    meta = meta || {};
    var seqs = ensureCache();
    var entry = {
      id: nextId(seqs),
      created: now(),
      source: meta.source || 'butterfly-keyboard',
      channel: meta.channel || 'name',
      values: values.map(round),
      name: meta.name || ''
    };
    Store.write(seqs.concat([entry]));
    emit('dna:committed', entry);
    return entry;
  }

  function remove(id) {
    Store.write(ensureCache().filter(function (s) { return s.id !== id; }));
    emit('dna:changed', { count: cache.length });
    return cache.length;
  }

  function clearAll() {
    Store.write([]);
    emit('dna:changed', { count: 0 });
  }

  // ---------- file io, in TouchDesigner's schema (+ name) ----------
  function exportJSON() {
    return JSON.stringify({ sequences: sequences() }, null, 2);
  }

  function importJSON(text, mode) {
    // mode 'replace' (default) or 'merge'. Merge re-ids incoming entries
    // off the local high-water mark so two collections cannot collide.
    var d;
    try { d = JSON.parse(text); } catch (e) { return { ok: false, error: 'not valid JSON' }; }
    if (!d || !Array.isArray(d.sequences)) {
      return { ok: false, error: 'expected { "sequences": [ ... ] }' };
    }
    var incoming = d.sequences.filter(function (s) {
      return s && Array.isArray(s.values) && s.values.length === SLOTS;
    });
    var skipped = d.sequences.length - incoming.length;

    var seqs;
    if (mode === 'merge') {
      seqs = ensureCache().slice();
      var next = nextId(seqs);
      incoming.forEach(function (s) {
        seqs.push({
          id: next++, created: s.created || now(),
          source: s.source || 'import', channel: s.channel || '',
          values: s.values.map(round), name: s.name || ''
        });
      });
    } else {
      seqs = incoming.map(function (s, i) {
        return {
          id: s.id || (i + 1), created: s.created || now(),
          source: s.source || 'import', channel: s.channel || '',
          values: s.values.map(round), name: s.name || ''
        };
      });
    }
    Store.write(seqs);
    emit('dna:changed', { count: seqs.length });
    return { ok: true, loaded: incoming.length, skipped: skipped, total: seqs.length };
  }

  // ---------- storage backend ----------
  //  The one part that knows where sequences live. `read` seeds the
  //  cache from the offline mirror; `write` replaces the cache, mirrors
  //  it to localStorage, and (debounced) POSTs it to the server;
  //  `hydrate` pulls the server's copy in on load. Nothing above this
  //  object knows which of those is happening.
  function mirror(seqs) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ sequences: seqs }));
    } catch (e) {
      console.warn('[dna] could not write the localStorage mirror: ' + e);
    }
  }

  function schedulePost() {
    if (typeof fetch !== 'function') { return; }
    if (postTimer) { clearTimeout(postTimer); }
    postTimer = setTimeout(function () {
      postTimer = null;
      fetch(COLLECTION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequences: cache })   // always the current cache, not a stale copy
      }).catch(function () { /* no server: the localStorage mirror is the fallback */ });
    }, 800);
  }

  var Store = {
    read: function () {
      try {
        var raw = window.localStorage.getItem(KEY);
        if (!raw) { return []; }
        var d = JSON.parse(raw);
        return Array.isArray(d && d.sequences) ? d.sequences : [];
      } catch (e) {
        console.warn('[dna] could not read storage (' + e + '); starting empty');
        return [];
      }
    },
    write: function (next) {
      cache = next;
      dirtiedLocally = true;      // this session has changed the collection -- hydrate must not undo it
      mirror(next);
      schedulePost();
    },
    //  On load, ask the server for the shared collection. If it answers,
    //  that is the collection -- unless this session has already added to
    //  it, in which case the visitor in front of us wins and their new
    //  butterfly is on its way to the server anyway.
    hydrate: function () {
      if (typeof fetch !== 'function') { return; }
      fetch(COLLECTION, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (dirtiedLocally) { return; }
          if (!d || !Array.isArray(d.sequences)) { return; }   // no server file -> keep the mirror
          cache = d.sequences;
          mirror(cache);
          emit('dna:changed', { count: cache.length, hydrated: true });
        })
        .catch(function () { /* file://, static host, server down: mirror stays authoritative */ });
    }
  };

  //  ?reset=1 -- wipe the collection on load. For clearing test
  //  butterflies, or resetting between exhibition days. Read once, not
  //  persisted (reloading with the param still in the URL wipes again --
  //  that is a deliberate action, so that is fine). Clears the mirror,
  //  the in-memory cache, and the server file, and stops this load's
  //  hydrate from bringing anything back.
  if (typeof location !== 'undefined' && /[?&]reset=1(?:&|$)/.test(location.search)) {
    cache = [];
    dirtiedLocally = true;
    mirror([]);
    if (typeof fetch === 'function') {
      fetch(COLLECTION, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: '{"sequences": []}'
      }).catch(function () {});
    }
    console.log('[dna] ?reset=1 -- collection wiped');
  }

  //  Pull the shared collection in as soon as the script loads. Async
  //  and fire-and-forget: collection.js replays the mirror on init and
  //  reconciles again when the 'dna:changed' above fires.
  Store.hydrate();

  return {
    SLOTS: SLOTS,
    on: on,
    create: create,
    sequences: sequences, count: count, byId: byId,
    toDials: toDials, dialsFor: dialsFor,
    remove: remove, clearAll: clearAll,
    exportJSON: exportJSON, importJSON: importJSON,
    getSpread: function () { return spread; },
    setSpread: function (v) { spread = Math.max(0.01, Number(v) || 1); },
    _store: Store
  };
})();
