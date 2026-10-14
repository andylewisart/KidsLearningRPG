# The opening film: storyboard

**For Andy to approve.** This covers everything from the galleon's charge to the island at dawn. Nothing in the game has changed yet, and no recorded line changes.

It starts from the plan the session on your PC began (one ram-and-fall film after the charge, cut on matching action), keeps what's right in it, and changes what I think would still feel odd. Section F says exactly where we differ and which of Codex's keyframes 1–3 can still be used.

---

## A. What this film is for

A minute earlier, he taught the crystal its first fact and watched it glow. In fifteen seconds this film takes that away. Jumble breaks the crystal **on purpose**, the crew loses its ship and each other, and they fall. The feeling is a sudden drop: helpless and scary, but never hurt and never gory. Then, out of the white of the cloud, comes the first hope: dawn over the island, with four lights coming down. Each light is a piece he'll go and find.

What the viewer has to come away knowing:

- Jumble's ship broke it.
- It broke into four.
- Wren held on to her ship.
- Cade and Kit fell together.
- Jumble got away.

Everything else is decoration.

## B. What was wrong with the last cut

Your notes, in film terms:

1. **The cut didn't happen on the action.** The charge stopped just *before* the hit. The next clip started from a still picture, and video tools ease into motion, so the ship visibly stopped. Then the hit came 1.35 seconds later, from the same angle. Cutting to the same angle reads as a stumble, not a new shot. The fix: cut **on** the moment of contact, to a clearly different angle, with the flash, the crash and the shake right on the cut.
2. **The crystal was never set up.** It wasn't in the charge's picture, so when it grew up out of the wreckage it looked like something new, and Jumble standing over it made it look like his spell. The fix: show the crystal before the hit, and have it *fall* when it breaks (gravity, not magic). Green light is only ever Jumble's, and teal light is only ever the crystal's.
3. **We lost track of where things were.** The wide shot of the shards showed one ship with a crystal on it, and the Albatross was gone, so you couldn't tell whose crystal it was or which ship was which.
4. **The light jumped.** Moonlit night cut straight to golden dawn in a new place. Nothing on screen carried the time across.
5. **The acting said the wrong thing.** The long close-up of Cade held with nothing happening, and then a head-first dive with a determined face says "I meant to do that." Kit's thrusters were lit, so it looked like Kit could fly (its hover is meant to be knocked out). Wren was laughing as she said a line about not losing her ship.
6. **Things happened twice.** The shards streaked off at night, then fell again in the dawn shot, and then again in the island picture after it. The island also showed up twice.
7. **The lines didn't sit on their speaker.** Jumble's taunt played over a wide shot where you couldn't see him.

## C. The shot list

Five short shots after the charge: **about 14 seconds**, plus the charge's 4.3. Each shot is one painted keyframe animated with one clear action. **No last frames are locked.**

**At a glance:**

1. The hit: side-on wide, on the cut.
2. Four pieces: looking down through the broken grate.
3. Jumble pulls away, laughing.
4. Wren catches the rope.
5. Cade and Kit fall into the cloud, and the cloud turns to white.

Then the island at dawn (`story_crash`), fading in out of the white.

**Rules for every shot:**

- **Screen direction.** The galleon is always on the right: it charges in from the right and leaves to the right. The moon is always upper left, setting in the west. The horizon at the right is where dawn comes from, and it pales a little more in each shot. In `story_crash`, the sun rises on the right too.
- **Clouds below.** The ships fight above a sea of cloud, so the island stays hidden until dawn.
- **The story box.** Keep faces and the key action in the top 70% of the frame, above the story box.
- **The look.** Wren wears her harbor-arrival outfit: the teal collared shirt buttoned to the collarbone and tucked under her belts, and full dark trousers. Everyone follows the all-ages clothing rule. Nobody looks hurt or terrified: alarmed, yes.
- **Pockets** stays unseen in the opening (bible).
- **Size and editing.** Paint every keyframe at 16:9, 1536×864, and export a 1920×1080 JPEG to `art/video-refs/frames/`. Generate each shot at 4–5 seconds and keep the middle. Always cut off the first ~0.4 s, where the motion eases in: that ease-in is what made the ship "stop".
- **References for every keyframe:**
  - the style anchors;
  - `art/video-refs/ally_knight/front.jpg` (Cade), `tutor_droid/front.jpg` (Kit) and `npc_jumble/front.jpg` (Jumble);
  - for Wren, the look crop from `scenes/story_harbor_arrival.webp` (x 420–780, y 120–864) and her new `characters/ally_gunner/base.webp`. Her old `ally_gunner/front.jpg` still shows the crop top, so don't use it.
- **Line timings.** Lines are given in seconds on the film's clock, which starts at the cut into shot 1. Measured lengths of the recordings: Cade 1.3 s, Jumble 2.6 s, Wren 3.2 s.

### 0. The charge (exists, but I recommend remaking it: question 1)

- **Length:** 4.3 s, playing over Jumble's "NOBODY CORRECTS CAPTAIN JUMBLE! RAMMING SPEED!" (4.6 s long; its "SPEED!" spills over the hit, which is good).
- **Framing:** from behind the three on the stern deck, the galleon bursting out of its green cloud straight at us. Steady, with a slight shake.
- **What changes in the remake:**
  - It starts from the painting that's on screen behind Jumble's lines (`story_galleon_night`). Today's film was made from an older picture, so the picture visibly jumps when the film fades in.
  - **The crystal's grate glows on the deck between the three**, so the crystal is in the shot just before it breaks.
  - It ends **mid-lunge**: the prow almost on them, Cade swinging his shield up. Never on a held frame.
- **Light:** night, full moon upper left.
- **Out:** hard cut on Cade's shield coming up, straight into the hit.
- **Keyframe (new `story_galleon_night`):** the plan's keyframe 1, which Codex is painting now, is almost exactly this: the same angle as the charge, with the grate between them. Check four things:
  - Jumble stands on the prow, laughing and pointing, **with no magic in his hands**;
  - the galleon is one second from impact;
  - the grate glows teal between the heroes;
  - Wren, seen from behind, is in her new clothes.

  It then replaces today's `story_galleon_night` as both the still and the charge's first frame.

### 1. The hit (2.0 s, film 0.0–2.0)

- **Framing:** side-on wide, level with both ships. The camera is jolted by the hit and keeps shaking.
- **What happens:** the galleon's prow, already moving fast from the right, smashes into the Albatross's deck right over the crystal's grate. Splinters and green sparks fly. The Albatross pitches nose-down. Three small figures are knocked off their feet across the tilting deck, readable by color: crimson scarf, rust-red coat, white sphere. Under the deck, the crystal's light flares teal through new cracks.
- **Light:** night. Moon upper left. At the far right, the horizon has its first thin, cold, pale band.
- **In:** **cut on the action.** The cut *is* the impact: the game's crash sound, white flash and shake fire on the cut's first frame. It's a 90° change of angle from the charge, with the galleon still on the right.
- **Out:** cut on the crystal's flare. The bright frame hides the cut.
- **Line:** Cade, "The crystal!" at **1.0 s** (`[shouting]`). He cries out as he sees it crack.
- **Keyframe `story_ram_hit`:** "Night above a sea of moonlit cloud, full moon upper left, a thin pale band on the far right horizon. Side view: the translucent sea-green ghost galleon from the reference drives in from the right, its prow buried in the middle of the patched red-and-white airship from `story_albatross`, at the round brass grate over the crystal's cradle. Splinters, rope and green sparks burst out, caught mid-air. The airship tips nose-down, smoke starting from its engine. Three small figures tumble across its tilting deck: the silver-haired knight with the crimson scarf, the red-haired captain in a teal shirt and long rust-red coat, and the round white droid in its tiny tricorn. Bright teal light flares through cracks under the airship's deck. Captain Jumble rides the prow with his arms flung wide, laughing, no spell in his hands. Dramatic and spooky-fun, nobody hurt."
  - **Scene references:** `story_albatross` (the ship, the moon and the crystal's cradle), `story_galleon_night` (the galleon at night), `story_deck` (the grate).
  - The plan's keyframe 3 has the right layout (both ships in moonlit cloud). Repaint it at **this** moment: contact, not after.
- **Last frame locked:** no.

### 2. Four pieces (2.5 s, film 2.0–4.5)

- **Framing:** straight down through the crumpled brass grate, the dome he saw glow on deck. A slow push down after the pieces.
- **What happens:** the crystal has split into four along glowing lines. Its cradle gives way, and **the four shards drop out through the torn hull and fall away** into the cloud far below, spreading apart, each trailing teal light. They fall. Nothing rises.
- **Light:** the crystal's teal light from below, moonlight from upper left on the bent brass.
- **In:** match on the crack's flare from shot 1, with the grate in the same place in the ship.
- **Out:** the shards leave the bottom of the frame, heading down and to the left.
- **Line:** none. Cade's line finishes over the start (to about 2.3 s). Then two seconds of just the picture: the loss, given room.
- **Keyframe `story_ram_shatter`:** "Looking straight down through a crumpled round brass grate on a splintered wooden airship deck at night. In the cradle below, the big faceted teal-blue crystal from `story_deck` has split into exactly four large pieces along bright glowing cracks, just coming apart. Through the torn hull beneath it, far below, a sea of moonlit cloud. Teal light lights the bent brass from below. No green light anywhere near the crystal."
  - **Scene references:** `story_deck` (the grate and the crystal).
  - The plan's keyframe 2 can be used **if** its four pieces are still in or just leaving the cradle, and nothing in it shows them rising. Then the film prompt sends them **down** through the hull. Otherwise, repaint it.
- **Last frame locked:** no.

### 3. Jumble pulls away (3.0 s, film 4.5–7.5)

- **Framing:** medium shot on Jumble at his prow rail, the camera drifting with him.
- **What happens:** his galleon backs out of the wreck and wheels away to the right, into its green cloud, which swallows it. He leans over the rail looking down-left after the shards, then tips his hat to us.
- **Light:** his own green ghost light, with moonlight. The pale band at the right horizon behind him has turned faintly rose.
- **In:** eyeline match. The shards fell down and to the left, and he looks down and to the left after them.
- **Out:** the galleon and its cloud leave the frame to the right. The next shot is the Albatross alone.
- **Line:** Jumble, "Good luck teaching it in pieces!" at **4.8 s** (ends about 7.4).
  - Tag as recorded: `[gleeful taunting gravelly sinister pirate]`.
  - The joke lands on his smug face, which is why he gets his own shot.
- **Keyframe `story_ram_jumble`:** "Night, full moon upper left, a faint rose band on the far right horizon. Medium shot of Captain Jumble from the reference at the splintered prow rail of his translucent green ghost galleon: green spectral beard, red coat, plumed tricorn. He leans over the rail, grinning, looking down to the left, one hand lifting his hat. Behind him the galleon is already turning away to the right into a glowing green cloud, with broken airship rigging still caught on its bowsprit. Theatrical and smug, spooky-fun."
  - **References:** `npc_jumble/front.jpg`, `story_galleon_night`.
  - A medium shot on purpose: close-ups drift.
- **Last frame locked:** no.

### 4. Wren catches the rope (3.5 s, film 7.5–11.0)

- **Framing:** medium-wide from just below the listing Albatross, the camera swinging with her.
- **What happens:** Wren slides off the steeply tilted deck and over the rail. One hand closes on a trailing rope, and she swings out under the hull and hangs on. She looks up at her ship, fierce and gritted. She's not laughing.
- **Light:** night going. The moon is lower, at left. The right horizon is pale rose-gold. The airship's lanterns swing.
- **In:** after Jumble's ship leaves to the right, we're back with the Albatross alone, smoking. Same light, a little later.
- **Out:** she looks **up**. The next shot looks **down** from just beneath her: her boots and the rope at the top of the frame carry the cut.
- **Line:** Wren, "Hang on, Albatross! I'm not leaving you!" at **7.9 s** (ends about 11.1).
  - Tag as recorded: `[fiercely]`.
  - It plays on her face, looking up at her ship, which is her whole fear in one picture.
- **Keyframe `story_ram_wren`:** "The last of the night, the moon low at the left, the right horizon pale rose-gold above a sea of cloud. Just below the tilting, smoking hull of the patched red-and-white airship, the red-haired sky-pirate captain from the look reference has just gone over the rail and caught a trailing rope with her brass mechanical hand. Copper-red braid flying, goggles on her teal bandana, a teal collared shirt buttoned to the collarbone and tucked under her belts, full dark trousers, and her long patched rust-red coat streaming. She looks up at her ship, determined, teeth gritted. A broken empty crystal cradle hangs under the hull. Brave, not hurt."
  - **References:** the Wren look crop, `ally_gunner/base.webp`, `story_albatross`.
- **Last frame locked:** no.

### 5. Cade and Kit fall (3.0 s, film 11.0–14.0, then white)

- **Framing:** looking straight down from just under Wren. Her boots and the rope's end are at the top of the frame. The camera tilts and pushes down after the two of them.
- **What happens:**
  - Cade tumbles away on his back, reaching up for Kit, scarf whipping, shield on his arm. He's alarmed and helpless, not diving.
  - Kit spins just out of his reach. Its blue thruster jets sputter and **go out**, and one fin clamps its hat on. (That's the hat it will call "perfect" on the beach.)
  - They shrink together into the cloud below. The cloud fills the frame, and the frame goes white.
- **Light:** the cloud sea is silvered by the moon on its left side and catches the **first pink-gold of dawn** on its right edge. The dawn is visibly coming as they fall into it.
- **In:** spatial cut from Wren: we're directly under her, looking at what's happening below.
- **Out:** into the cloud, so the white-out is the cloud. The game fades to white from **13.7 s**, and `story_crash` fades in out of the white: they've come out of the bottom of the cloud, and it's dawn. The cloud is what carries night into dawn, and because they fall together, Kit lands on Cade (later, at the cove).
- **Line:** none. Just the wind (and the music cut off by the hit). The narrator's "...somewhere softer" is waiting on the other side.
- **Keyframe `story_ram_fall`:** "Looking straight down from just beneath a hanging rope: at the top edge, a pair of buckled boots and dark trousers, the rope's frayed end. Below, small in the frame and falling away, the silver-haired knight with the crimson scarf tumbles on his back, one arm reaching up toward the round white droid in its tiny tricorn, which spins just out of reach, its blue thrusters sputtering out, one fin holding its hat on. Far below them, a vast sea of cloud, silver in moonlight on the left, its right edge catching the first pink-gold of dawn. Thrilling, never scary: nobody hurt."
  - **References:** `ally_knight/front.jpg`, `tutor_droid/front.jpg`, the Wren look crop (for the boots and trousers).
  - The figures are small, so their faces can't drift.
- **Last frame locked:** no. The game makes the white.

### After the film: the island at dawn

`story_crash` as it is: dawn, the sun on the right, the smoking Albatross coming down toward the canyon, and four teal beams falling. It's the only time the shards land and the only time we see the island, so nothing happens twice. The narrator plays over it, as now.

## D. Line and timing changes

- **No line changes and nothing to re-record.** All three lines stay, with their current tags. Each now plays over the shot of what it's about (Cade over the crack, Jumble over Jumble, Wren over Wren).
- **Timing change (flagged, code only, after approval).** In `OPENING`'s ram (`src/ui/explore.js`):
  - **now:** `from: 0, to: 9.7, impact: 1.35, at: [1.6, 3.0, 5.6]`
  - **new:** `from: 0, to: 13.7, impact: 0, at: [1.0, 4.8, 7.9]`

  `impact: 0` puts the crash, flash and shake on the cut itself. Re-measure these against the finished film.
- **One warning about the PC plan's timings.** Wren at about 9 s with the white at 9.7 would cut her line off: it's 3.2 s long, and the next beat stops any voice still speaking. Her line needs to start at least 3.3 s before the white.
- **The fallback stills** (used if the film can't play) become this film's keyframes: `story_ram_hit` under Cade's line, `story_ram_jumble` under Jumble's, `story_ram_wren` under Wren's. `story_fall` comes out of the opening.
- **Optional, free:** a glassy crack sound (`sfx_ice`, which already exists) as shot 2 starts.

## E. Questions for you (each takes one word)

1. **Remake the charge from the new deck-angle painting, with the crystal's grate in it?** *Recommend: yes.* It sets up the crystal, ends in motion, and stops the picture jumping when the film fades in. If no, everything else still works, just less cleanly.
2. **End in the cloud's white (as above), or add a sixth shot of breaking out under the cloud into dawn?** *Recommend: white.* A sixth shot would show the shards and the island just before `story_crash` shows them again.
3. **Retire `story_fall` for good?** *Recommend: yes.* It's the posed dive you didn't like, at the wrong light, and wave 10 would otherwise spend a repaint dressing it.

## F. Review of the plan already started on your PC

**Right, and kept:**

- one film after the charge;
- cutting on matching action;
- the galleon coming from the same side throughout;
- the impact early;
- the horizon starting to pale;
- the island left to the next still;
- the white before anyone lands.

**Changed, and why:**

- **Shot 1 (impact from the charge's angle):** cutting to the same angle is what made the last cut stumble, and from behind the heroes the prow hides everything. That frame is better used as the *charge's* first frame (question 1), and the hit becomes a side-on wide on the cut.
- **Shot 2 (the crystal bursts out of its cradle):** "bursts out" is the rise that read as Jumble's spell, and the shot packs in five actions. Now the four pieces *fall* through the broken hull, and the heroes are thrown in shot 1.
- **Shot 3 (thrown clear, wide):** four actions at once, with small blurry figures, and it shows the streaks a second time. Jumble now gets his own shot for his line, and the throw is split between shots 1, 4 and 5.
- **Shot 4 (`story_fall` at dawn):** the dive you didn't like, Kit flying with its jets lit, Wren in the crop top, and the hard jump in light. It's replaced by Wren's own shot and the fall into the cloud, so the cloud carries night into dawn.

**Codex's keyframes 1–3 in progress:**

- **Keyframe 1:** becomes the new `story_galleon_night` and the charge's first frame, after the checks in shot 0.
- **Keyframe 2:** usable for shot 2 if nothing in it is rising.
- **Keyframe 3:** repaint it at the moment of contact for shot 1.

## G. Production list

**Lines to re-record:** none.

**Paintings for Codex** (a new wave, or added to wave 10, which is already dressing Wren):

| Keyframe | Use | Starting point |
|---|---|---|
| `story_galleon_night` (new) | the still behind Jumble's lines, and the charge's first frame | the plan's keyframe 1, checked |
| `story_ram_hit` | shot 1, and the fallback still | repaint of the plan's keyframe 3 |
| `story_ram_shatter` | shot 2 | the plan's keyframe 2, if it fits |
| `story_ram_jumble` | shot 3, and the fallback still | new |
| `story_ram_wren` | shot 4, and the fallback still | new |
| `story_ram_fall` | shot 5 | new |

- Each one is 1536×864 in `scenes/`, plus a 1920×1080 JPEG in `art/video-refs/frames/`, and draft in the manifest.
- Take `story_fall` off wave 10's list (Sections C and D).
- `story_deck` still needs wave 10's edit to Wren's clothes.

**Films (yours, made locally with LTX 2.5 from each keyframe):**

- the charge, about 4.5 s;
- five shots of 4–5 s each, trimmed and joined into one `story_ram.mp4` of about 14.2 s, muted;
- no locked last frames.

**Reused as they are:** `story_crash` (the landing picture), `story_albatross` and `story_deck` (references, and their own beats), and `story_ram` (the last-resort fallback).

**Code, after approval:** the `OPENING` timings and fallback stills above, then `npm test`, and update the bible's time-of-day table (the ram: "night, paling into the cloud").
