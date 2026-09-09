# audio/ — the guide's voice-over

Four recordings. The names live in **`CFG.voCues` in `js/config.js`**, not here — rename the
constant, not the file, if you want a different one.

The four tracks in this folder are the real recordings, copied from
**`sounds/ai_voiceover/v1/`** — that folder is the master and is untouched. (The
machine-spoken placeholders this was built against have been deleted; the `say` line at the
bottom regenerates one in a second if a stand-in is ever wanted again.)

## The opening — three recordings, played as one

Fires when the visitor presses the start flower. `CFG.voIntro` is the order; `CFG.voGap`
(0.45 s) is the beat between them.

| file | from | script | length |
|---|---|---|---|
| `welcome.mp3` | `1. Welcome` | "Welcome to Kalei Identity." | 1.9 s |
| `spell.mp3` | `2. Catch the butterfly` | "Catch butterflies one at a time to spell your name. This will build the genetic code of your own butterfly." | 6.7 s |
| `pinch.mp3` | `3. Pinching` | "Start by pinching a selected butterfly to attract it towards you." | 4.1 s |

**The three are one cue as far as the rest of the piece is concerned.** `Voice.playing()`
stays true across the gaps, so the silence between two of them is never mistaken for the
narration having finished — the quiet clock does not start counting mid-sentence, and the
`welcome` state does not hand over to `live` until the third one is done. Driven in the real
scene: the three end at **2.02 s / 9.04 s / 13.44 s**, gaps exactly 0.45 s, `playing()` true
throughout. **The opening runs 13.4 s in total.**

**The room is pickable from the first second regardless** (`CFG.guideUnlockAt` = 0), so a
visitor who already knows what to do is never made to wait out twelve seconds of narration.
Raise it if they should hear the instruction first.

## The recall

| file | from | script | length |
|---|---|---|---|
| `recall.mp3` | `4. Hold your hand` | "Now, find your butterfly in the kaleidoscope. Select it and hold out your palm facing down, and flat in front of you to interact with it." | 7.8 s |

Fires on **`reveal:joined`** — the frame their butterfly's soar hands off onto the orbit,
which is the instant it stops being the hero and becomes one of the many. Only the **first**
of a session speaks: a visitor who spells a second name has already been told.

## Not recorded

`nudge` and `farewell` are `null` in `CFG.voCues`, and the session runs without them — a
missing cue is a silent no-op that still reports itself finished.

- **`nudge`** would play 30 s into a quiet stretch. *"Still there?"* — any activity cancels
  the end.
- **`farewell`** would play as the room hands over. Without it the end is silent and the
  start flower reappearing is the whole signal, which works — but **a short "thank you,
  please pass the headset to the next person" is the one line an exhibition floor would most
  want next.** Record it, drop it in as `farewell.mp3`, and set the key in `CFG.voCues`.

## Format

**mp3 is right, and no conversion is needed.** The Quest browser is Chromium and plays mp3
and m4a/aac equally well; mp3 is the more universally supported of the two. These four are
mono 44.1 kHz and total **395 KB**, which is nothing over the LAN.

**`.wav` is the one to avoid**, purely on size — these are fetched over TLS by a headset, and
a 30 s stereo wav is about 5 MB against the ~100 KB the same speech costs as mp3.

```bash
# if a master ever needs converting
ffmpeg -i welcome.wav -c:a libmp3lame -b:a 96k -ac 1 welcome.mp3

# a machine-spoken stand-in, if one is wanted again
say -v Samantha -r 175 -o welcome.m4a --data-format=aac "Welcome to Kalei Identity."
```

The extension is not special anywhere in the code — `CFG.voCues` holds whatever path you
give it.

## Why nothing plays until the visitor has clicked something

Browsers refuse programmatic playback until the page has had a real user gesture, and **a
hand-tracked pinch is not one** — it is our own threshold on a joint distance, invisible to
the browser. What is one, and always happens first, is the click on **Enter AR**: you cannot
get into the piece without it, and `Voice.unlock()` spends that gesture on every track at
once. If audio ever goes silent on a headset, that click is the first thing to check.

`serve.py` does not answer HTTP Range requests. If a track plays on the desktop but not in
the headset, that is the likely cause — keep the files small enough to be fetched whole, or
teach the server `Range`.
