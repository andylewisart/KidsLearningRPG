# Sound spotting sheet: `intro_FINAL_E_L1.mp4` (24.0 s, 24 fps, currently silent)

Times are seconds into the film. "Pan" is where the sound sits in the stereo field:
- L = hard left, CL = centre-left, C = centre, CR = centre-right, R = hard right.
- "→" means the sound travels across the field.

These timings come from frames sampled every 0.5 s. Snap each hit to the exact frame when mixing.

## Recommended approach
- **Film soundtrack:** bake the SFX and ambience into the film's own audio track, then let the game play the film unmuted. Only a baked track stays frame-accurate.
- **Voice:** keep the voice lines as the game's existing recorded lines (ElevenLabs, `tools/audio/`), played at new `at` cue times. Duck the film track by about 6 dB under each line.
- **Music:** Jumble's theme rolls on from the charge beat. Let it duck at the impact, then swell under the dawn and fall (8–12 s). Cut it to near-silence for the beach comedy (17–24 s), leaving just waves and gulls.

## Cues

| Time | What happens on screen | Sound | Pan |
|---|---|---|---|
| 0.0–0.5 | Wide: the two ships side by side in the moonlit sky | High-altitude wind bed; Albatross propeller hum (L); ghost ship's low eerie drone with chain rattle (R) | Bed wide; hum CL; drone CR |
| 0.5 | **Impact**: green-white flash where the galleon's prow meets the hull | Huge layered hit: deep boom, timber crunch, a ghostly whoosh-shriek | C, slightly CR; sub to centre |
| 0.5–2.5 | The ships grind together, green energy crackling, debris | Wood groan and splinter tail, chains snapping, ghostly crackle | Spread CL–CR |
| 2.5–3.0 | The crystal in its cradle under the Albatross flares | Rising glassy shimmer, resonant hum building | CL |
| **3.0** | **The crystal shatters** into four shards | Crystal shatter: bright glass burst plus a deep resonant "bwong" | CL |
| 3.0–4.0 | Four shards fall away, glowing | Four descending chime-whooshes, each slightly different in pitch | CL → down / centre |
| 4.0 | **Cut to the deck**: Cade, Wren and Kit braced, deck tilting | Hard cut: wind rush louder, deck creak, lantern rattle (top right) | Creak C; lantern R |
| 4.0–5.5 | The deck heaves; they stagger; shield and sword glint | Boots skidding on wood, armour clank (Cade L), Kit's servo whine (R) | Cade CL; Wren C; Kit CR |
| 5.5 | Cade thrown, cape sweeping across camera | Cloth whoosh right past the mic | R → L |
| 6.0 | **Cut, low angle**: the galleon overhead, heroes small | Muffled sky ambience (high), distant galleon creak | Galleon CR |
| 6.0–7.5 | The galleon starts to dissolve | Ghostly dissolve: reversed whispers, rising hiss | CR |
| **7.5** | **The galleon bursts into green fog** | Soft "phoom" plus a spectral wail tail | CR |
| 8.0–9.5 | **Green streak (Jumble)** shoots off toward lower right | Fast ghostly comet whoosh with Doppler drop | C → R |
| 8.5–9.5 | Heroes falling, glinting shards | Freefall wind roar (keep it fast and urgent), cloth flapping | Wide |
| 9.5 | A rope whips in from the right | Rope whip-crack | R → C |
| **10.0** | **Wren grabs the rope** | Hand slap, rope creak and tension | CL |
| 10.5–12.0 | Wren yanked upward; Cade falls left, Kit right | Rope groan rising; wind continues; Kit servo whine | Wren C; Cade L; Kit R |
| 12.0 | **Landing shot**: Cade plunging through clouds | Wind roar peaks, cloud whoosh-through | C |
| 12.5–13.5 | Top-down: the island rushing up | Rising pitch, wind building | C |
| **14.0** | **Cut to jungle canopy**: palms, leaves | Hard cut: first big leaf crash, birds scatter (screeches up and away) | Crash C; birds L & R |
| 14.5–15.5 | Crashing down through palm fronds | Rapid leafy smashes and branch snaps, each a little lower in pitch | Cade CR at 15.5 |
| 16.0 | Vines and flower close-up | Springy vine "boing" and stretch, comic but real | C |
| 16.5 | Cade bursts out of the foliage | Final leaf burst | CR |
| **17.0** | **Cut to beach: lands and skids** | Thud into sand, long sand-skid hiss, armour jingle | L → C |
| 17.5–18.5 | Sand cloud settles | Sand patter settling; waves fade up; gulls | C; waves wide; gulls R |
| 18.5–19.5 | Lies face down, dazed | Muffled groan (Cade VO, optional); gentle surf | C |
| **19.5–24.0** | **Thumbs-up**, grin, hold | Tiny comic "ting" or soft beat on the thumb (optional); surf and gulls to the end | Thumb R |

## Voice placement (the game's existing recorded lines)

| Time | Line | Note |
|---|---|---|
| ~3.0 | **Cade:** "The crystal!" | On the shatter |
| ~7.8 | **Jumble:** "Good luck teaching it in pieces!" | On the fog burst and green streak |
| ~10.0 | **Wren:** "Hang on, Albatross! I'm not leaving you!" | On the rope grab |
| ~16.3 (option) | **Narrator:** "...And the knight came down somewhere softer." | Lands just before the sand thump. Currently this is the `story_crash` line; move it here only if the parent likes the comic timing |

## Delivery notes
- Final mix: stereo 48 kHz, peak about −1 dBFS, dialogue around −16 LUFS integrated. Keep low-frequency effects in the centre.
- The film should end on surf and gulls, so the cut to the beach scene (`scene_cove`, which has its own waves) is seamless.
