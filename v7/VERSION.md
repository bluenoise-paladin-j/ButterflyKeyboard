# v7 — the generation stage, 27 August 2026

Serve this folder and it runs. `tools/` is the two servers.

```bash
python3 tools/serve.py 8123        # then http://localhost:8123/
python3 tools/serve-https.py 8443  # for a Quest, over the local network
```

v7 is the version that finally does something with the name. Every version
from v3 to v6.2 collected a name, fired `keyboard:accepted`, and stopped —
"generating a butterfly from the name is the next version's work" was in every
`VERSION.md`. This is that work. **The 26-key interaction is untouched** —
`keyboard.js`, `interact.js`, `hands.js` are v6.2's, bar one line.

## What changed from v6.2

The name a visitor spells now grows a butterfly of their own, and it stays in
the room for the rest of the exhibition. The room begins empty and fills up.

### `js/name-dna.js` (new) — a name → four values

The Outline's one open question. The generator takes four values; names are any
length; the mapping has to be **stable** (same name, same butterfly, every
session) and **well spread** (short and long names alike land far apart).

`NameDNA.toValues(name)` seeds an `xmur3` hash off the whole cleaned name and
takes four draws — four decorrelated values in −1..1. A string hash *is* that
mapping: a full avalanche per step, length-independent, so "ANNA" / "ANA" /
"NANA" are three visibly different butterflies and a two-letter name spreads as
widely as a twelve-letter one. There is no literal letter-to-parameter
correspondence — the Outline asks only for deterministic and distinct.

The four values flow on unchanged through `DNA.toDials`, which maps −1..1 onto
the roll chains with a **wrap** (the chains are cyclic), so a uniform hash sits
on it with nothing piling up at the ends.

This is **not** `keyboard.js`'s `dialsForLetter`, which hashes a letter's *index*
so the 26 keys look like 26 butterflies. This hashes the whole spelled *name*.

### `js/dna-store.js` (new, forked from `web/js/dna-store.js`)

The collection: made, kept, brought back. A trimmed fork of the `web/` build's
`DNA` object — the four-slot capture buffer is gone (a narrative would fill it
at four story beats; the keyboard hands over a whole name at once), so
`DNA.create([v,v,v,v], { name })` is the only way in. It fires `dna:committed`;
the entry is TouchDesigner's schema exactly, plus a `name` key it ignores.

Storage is the `Store` object — the one seam. Above it an in-memory `cache`
array is the synchronous source of truth, so `DNA.sequences()` always returns
immediately.

- **localStorage** is the offline mirror, written on every change.
- **The server file** is the authority. `Store.hydrate()` GETs
  `dna_sequences.json` on load; `Store.write()` POSTs the whole collection back,
  debounced. localStorage is per-origin, so without this the headset
  (`https://LAN:8443`) and the desktop (`http://localhost:8123`) would hold
  separate collections and a cleared browser would wipe the show.
- With no server (`file://`, a static host) the fetch and POST fail quietly and
  it is localStorage-only, exactly as before.
- `hydrate()` will not clobber a collection this session has already added to
  (`dirtiedLocally`) — the visitor in front of you wins.

### `js/collection.js` (new) — the kaleidoscope that accumulates

`AFRAME.registerComponent('butterfly-collection')`. Owns the butterflies grown
from names: flies a new one in on `dna:committed`, and replays the whole stored
collection (newest first, capped) on load.

- **Not the keyboard.** These are never in `keyboard.js:targets()`, so
  `interact.js` cannot see them — "cannot be selected or captured" falls out for
  free. They carry a **name**, not a letter.
- **"Here's your butterfly."** A just-committed butterfly does not fly straight
  into the swarm. It rises into a spot ~0.8 m in front of the visitor (inside the
  keyboard's orbit, clearly the foreground), turns to face them, and hovers at a
  held size (`CFG.presentSize`, whatever its orbit size will be) for
  `CFG.presentHold` while the name settles under it — then peels off and flies
  out to its orbit over `CFG.presentJoin`, growing or shrinking to its real size
  on the way. Three states: `present` → `joining` → `orbit`. `CFG.acceptResetDelay`
  (3600 ms) is set so the keyboard resets just as the butterfly starts leaving.
  Replayed butterflies skip all this and spawn straight into `orbit`.
- **Their own shell.** The 26 keys sit in a near, tuned band (1.0–2.4 m) that
  took three rounds of on-headset selection work. The collection flies further
  out and taller (`CFG.col*`, ≈2.6–4.3 m) so the kaleidoscope reads as the room
  around you and the keyboard stays the near, actionable layer.
- **Ported flight.** A simplified copy of `keyboard.js`'s `tickKey` / `pathAt` /
  `presentRoll` / `readSources` / `separate` — no capture states, no slow-field,
  no per-key clock, no letter. `keyboard.js:tickKey` is named in the header as
  the source of truth; a flight bugfix there must be mirrored here. Copied
  rather than shared because factoring it out would be surgery on the most-tuned
  file in the piece. The file-global helpers (`makeNoise` / `makeFbm` /
  `smoothstep` / `rand` / `UP`) are reused from `keyboard.js`, which loads first.
- **`presentRoll` is not optional** — the collection orbits through eye height,
  and without the roll solve a butterfly there is an edge-on twig.
- **A committed entry is enqueued, never built in the event handler.**
  `dna:committed` fires synchronously inside `keyboard.js`'s tick; `tick()`
  drains the queue a couple per frame, the way `web/js/swarm.js` does.
- **Colour** is the name's hue (`Wings.hashValues`) at the keys' own white-tuned
  saturation and lightness — `Wings.colorFor`'s S/L range predates the white sky
  and washes out on it. Size is random, not from the name: a name that hashed
  small would be a permanent bad outcome, and the wing shape and hue already
  carry "this is theirs".
- **The cap.** `CFG.maxCollected` (12) is how many *render*; the rest stay in
  storage and in the file. Over the cap, the oldest leaves the *scene* only —
  its record is kept and it comes back on reload or if the cap is raised.

### The small edits

- **`js/app.js`** — the whole file is now the seam it always described:
  `name → NameDNA.toValues → DNA.create`. Nothing else.
- **`js/ui.js`** — `UI.nameTag(text, seed)`: the name drawn the way the keyboard
  sets the caught name — **every letter its own small angle, rise and colour**
  (nothing to do with the wing), the wonk deterministic off the butterfly's
  stored id. One canvas, one sprite. It hugs the bottom of the butterfly's actual
  silhouette (`CFG.tagCling`) at any size, and is **never faded with distance** —
  the name is the record of a visitor and must stay legible. A *colour* canvas,
  so `srgb()`-tagged (unlike the wing alpha map).
- **`js/config.js`** — `maxCollected`, the `col*` bands and helpers, the `present*`
  and `tag*` keys, and `acceptResetDelay`. Every new key has its literal default
  here, in the same change as the code that reads it — the "config keys drift →
  silent `NaN`" trap this build has hit before. `collection.js` also
  `console.error`s any of its keys that come back undefined.
- **`js/keyboard.js`** — one line: the bare `3200` reset delay is now
  `CFG.acceptResetDelay` (3600, so the keyboard resets just as the presented
  butterfly leaves). Nothing else.
- **`js/dna-store.js`** — `?reset=1` in the URL wipes the collection on load
  (localStorage mirror, in-memory cache, and the server file). For clearing test
  butterflies, or between exhibition days. Read once, not persisted.
- **`tools/serve.py` / `serve-https.py`** — `do_POST` writes
  `dna_sequences.json` atomically (temp file + `os.replace`, under a lock);
  `do_GET` answers an empty collection rather than a 404 before the first
  butterfly exists. `serve-https.py` also had a broken dead block (`HERE` used
  before assignment — a `NameError` at import); that is deleted.

## What the Outline asked, and what v7 settled

| open question | v7 |
|---|---|
| **name → values** | a stable, well-spread string hash — `name-dna.js` |
| **name length** | `CFG.maxName` (16) already caps it; an empty name can't reach the seam (the keyboard won't finish one), and the seam refuses it anyway |
| **correction** | already there — backspace / the red delete control, in `keyboard.js` since v3 |
| **keyboard replenishment** | already there — keys go `gone` → `return`, pickable again as they fly back in |
| **the released butterfly** | `collection.js` — flies in from outside, name beneath it, not selectable, its own hue, joins the accumulating cloud |
| **persistence** | localStorage mirror + a shared `dna_sequences.json` on disk |

## Verified (desktop, driven through the real event path)

| | |
|---|---|
| `NameDNA` determinism | `toValues('CAT') === toValues('cat')` (cleaned); `toValues('') === null` |
| spread | ANNA / ANA / NANA / A / JAREDAMUSO all land far apart across all four values |
| the seam | spell + accept → `DNA.create` → entry stored `{ id, name, values }` matching `toValues` |
| a butterfly is made | `dna:committed` → `collection.js` builds one, name beneath it, its own hue |
| the present beat | every fresh butterfly runs `present` (~3 s, ~0.8 m ahead, facing you, held at `presentSize`) → `joining` (~2.8 s, flies out, grows/shrinks to its real size) → `orbit`; verified across many spawns |
| no phantoms | scene holds exactly 26 keys + `collected.length` butterfly bodies, nothing else |
| name always legible | tags never fade with distance; every collected butterfly has a visible tag; per-letter colours + jitter, seeded per id (stable across reloads) |
| not pickable | no collection id ever appears in `keyboard.js:targets()` |
| deterministic butterfly | two "JARED" entries → byte-identical values, one shared wing texture (`Wings.stats().unique` does not rise on the second) |
| accumulation across reload | spell CAT, reload → CAT replays from storage, no fly-in; spell more → they pile up |
| the cap | 15 names stored, 12 rendered (newest first), oldest 3 kept in storage; survives reload |
| `dna:changed` reconcile | `importJSON` and `clearAll` → scene reconciles / empties, no leaked groups (`root.children` back to 0) |
| export / import round-trip | `DNA.importJSON(DNA.exportJSON())` clean, `name` preserved |
| server write-back | `DNA.create` → debounced POST → `dna_sequences.json` on disk has the entry with its `name` |
| shared collection | wipe localStorage, reload → `hydrate()` pulls the collection back from the server file, mirror rewritten |
| local session wins | create during load → `hydrate()` does not undo it; the new entry POSTs and merges |
| server rejects junk | non-JSON / wrong shape → 400, file unchanged; wrong path → 404 |
| the keyboard, unchanged | 26/26 keys still pick; CAT / SAM typed and accepted end to end; reset restores all 26 targets |
| console | clean on a fresh load (the missing-file GET now answers 200, not 404) |

**Not yet run on a physical Quest.** The flight is a port of v6.2's, verified on
a Quest at v6. On-headset judgement calls, all `CFG` knobs: the present beat
(`presentDist` / `presentSize` / `presentHold` — does the hero butterfly read
against the busy keyboard, or does the keyboard need to dim during it?); the
name-tag size and how close it clings (`tagAngular` / `tagCling` / `tagJitter`);
the collection's orbit (`col*`); and the framerate with a dozen extra butterflies
(`maxCollected`).

## Known gaps

- **Framerate.** Scene weight is ~260 objects against a 180 budget already (see
  below); each collected butterfly adds ~4. `CFG.maxCollected = 12` is
  provisional pending a 72 Hz check — bump toward 20–30 only if it holds. The
  sanctioned release valve is cutting the keys' decorative lattices (~70
  sprites) and ghosts (~35) in `style.js`, which earlier `VERSION.md`s call not
  load-bearing.
- **The wing-texture ceiling.** `Wings.MAX_UNIQUE` is 64 and the 26 keys hold 26
  of those slots for good, so past ~36 *distinct* collected names a live wing
  could be redrawn under it by the LRU. `maxCollected` above ~36 needs a
  deliberate `MAX_UNIQUE` bump in `wing-tex.js` (the cache layer, not the
  parity-locked math) — out of scope here.
- **One writing station.** The server does last-writer-wins on the whole
  collection blob. Fine for one keyboard, one visitor at a time (the Outline's
  model). Two headsets writing at once would need a merge-by-id or a per-entry
  append.
- **Audio.** `sounds/` and `versions/to_implement_audio/` exist; v7 does not
  wire sound.
- **The narrative.** Still a dev-facing build — no intro beat, no attract loop.

## Scene weight

~260 objects at rest (v6.2's count) **plus up to `CFG.maxCollected` × ~4** — a
body plane, two wing planes, one name-tag sprite each, no per-letter typography.
At 12 that is ~308. Collected butterflies keep `frustumCulled` on and fly
further out, so the ones behind you do not draw. `alphaTest` materials do not
batch, so that is roughly the draw-call count.
