# Intro film audio (raw stems)

Raw audio for the 24 s intro film (night-sky ramming, the crystal breaking into four shards, Cade's fall onto the beach). `tools/audio/intro-mix.py` mixes them into the film's soundtrack (the game plays `public/assets/video/story_intro.mp4`, which carries it). The game doesn't load anything from this folder.

- `sfx/`: 27 sound effects made with ElevenLabs sound generation (`eleven_text_to_sound_v2`, prompt influence 0.4), one take per cue. They're 44.1 kHz stereo mp3s. Levels are left as generated, so expect to set each one in the mix. The eight hottest files (marked "trimmed") were turned down to a true peak of about -1.5 dBFS, because they came back with peaks above 0 dBFS. Those eight were re-encoded at 192 kbps.
- `voice/`: copies of the game's existing recordings of the film's lines (`public/assets/audio/voice/`). They're 44.1 kHz mono mp3s, already leveled by the game's pipeline and not re-recorded.
- `music/`: a copy of the game's `music_jumble.mp3` (40 s, loops in game; the game plays it at a gain of 0.794).

"Hit" is roughly where the main transient or loudest moment falls in the file, to help with lining up.

## Sound effects (`sfx/`)

| File | Duration | Hit | Description |
|---|---|---|---|
| `wind_bed.mp3` | 20.0 s | (bed) | High-altitude night wind past rigging. Generated as a loop. Soft (about -37 dB mean), so raise it in the mix. |
| `propeller_hum.mp3` | 10.0 s | (bed) | Old wooden airship's propeller and low engine rumble, with wood creaks. Generated as a loop. |
| `ghost_drone.mp3` | 10.0 s | swells to 5.1 s | Ghostly low drone with heavy chains clanking. |
| `impact_boom.mp3` | 3.0 s | 0.0 s | Deep collision boom, timber crunch, ghostly shriek tail. Trimmed. |
| `wood_groan.mp3` | 3.0 s | 0.65 s | Hull groaning under strain, then planks splintering. |
| `crystal_flare.mp3` | 2.0 s | 0.15 s | Rising glassy shimmer as the crystal flares, then a fade. |
| `crystal_shatter.mp3` | 3.0 s | 1.3 s | Small crystalline lead-in (0 to 0.6 s), a gap, then the big glass burst and ringing "bwong" at 1.3 s. |
| `chime_whoosh.mp3` | 4.0 s | 0.65 s | Four descending sparkling chime-whooshes for the shards streaking down, in one file. |
| `deck_creak.mp3` | 3.0 s | 0.8 s | Deck tilting and creaking, hanging lantern rattling. Trimmed. |
| `boots_skid.mp3` | 2.0 s | 0.9 s | Armoured boots skidding and scraping on wooden planks. Trimmed. |
| `armour_clank.mp3` | 1.5 s | 0.45 s | Single clatter of plate armour. Trimmed. |
| `droid_servo.mp3` | 1.5 s | 0.0 s | Quick high cartoon servo whirr for Kit, about 0.8 s long. |
| `cloth_whoosh.mp3` | 1.5 s | 0.35 s | Cape or cloth fluttering past. |
| `galleon_dissolve.mp3` | 4.0 s | 1.05 s | Long airy fog hiss with faint breathy ghostly whispers, fading. |
| `fog_phoom.mp3` | 3.0 s | 1.1 s | Soft deep "phoom" of magic fog with a short spectral wail. |
| `comet_whoosh.mp3` | 3.0 s | 0.65 s | Spectral comet fly-by with a Doppler pitch drop as it streaks away. Trimmed. |
| `freefall_roar.mp3` | 6.0 s | builds to 1.95 s | Freefall wind roar, rushing air buffeting. |
| `rope_crack.mp3` | 1.5 s | 0.55 s | Rope snapping taut with a sharp whip-crack. Trimmed. |
| `rope_grab.mp3` | 2.0 s | 0.05 s | Gloved hand slaps onto the rope, then the rope creaks and stretches. |
| `rising_whoosh.mp3` | 3.0 s | 0.8 s | Rising wind whoosh, swelling. |
| `canopy_crash.mp3` | 3.0 s | 0.8 s | Heavy crash through palm leaves, birds flapping and squawking away. Trimmed. |
| `branch_snaps.mp3` | 3.0 s | 0.9 s | Leaf smashes and branch snaps clustered around 0.7 to 1.1 s, then a decay. Quiet (peak -12 dBFS), so it needs about +10 dB. |
| `vine_boing.mp3` | 1.5 s | 0.05 s | Comic springy vine "boing" twang. |
| `sand_skid.mp3` | 3.0 s | 0.0 s | Thud onto sand, then a long skidding hiss. Trimmed. |
| `sand_settle.mp3` | 3.0 s | swells to 2.0 s | Fine sand trickling and settling. Soft. Not in the mix: it buzzed like bees. |
| `surf_gulls.mp3` | 12.0 s | (bed) | Not in the mix (the cove's own `amb_cove` waves are used instead). Dawn beach: gentle surf on sand, distant gulls. Generated as a loop. |
| `sand_thud.mp3` | 1.5 s | 0.04 s | One heavy, dull body thud onto sand (added 16 October: the skid's own hit didn't read as a thud). |
| `comic_ting.mp3` | 1.0 s | 0.0 s | Small bright cartoon sparkle "ting" for the thumbs-up. |

The loop beds (`wind_bed`, `propeller_hum`, `surf_gulls`) were generated with ElevenLabs' loop option. Their start and end levels match to within 3 dB. mp3 adds a few milliseconds of padding, so a gapless loop in an editor may need the ends trimmed or a short crossfade.

## Voice lines (`voice/`)

In film order, with the rough cue time noted in `src/world/story.js` (`prologueFilm`); the narrator's line uses only its last sentence, from 6.62 s.

| File | Duration | Character | Line | At |
|---|---|---|---|---|
| `01_cade_the_crystal.mp3` | 1.3 s | Cade (knight) | "The crystal!" | ~1.5 s |
| `02_cade_whoaaaa.mp3` | 1.3 s | Cade (knight) | "Whoaaaa!" | ~4.3 s |
| `03_jumble_good_luck_teaching_it_in_pieces.mp3` | 2.6 s | Captain Jumble | "Good luck teaching it in pieces!" | ~6.2 s |
| `04_jumble_laugh.mp3` | 4.3 s | Captain Jumble | "Ha ha ha ha HAAA!" | ~8.8 s |
| `05_wren_hang_on_albatross.mp3` | 3.2 s | Captain Wren | "Hang on, Albatross! I'm not leaving you!" | ~9.2 s |
| `06_wren_shiny_boots_hat_bot.mp3` | 2.4 s | Captain Wren | "Shiny Boots! Hat-Bot!" | ~12.4 s |
| `07_cade_aaaah_oof_ow_ow.mp3` | 4.8 s | Cade (knight) | "Aaaaaaah! Oof! Ow! Ow!" | ~13.5 s |
| `08_cade_mmmph.mp3` | 2.4 s | Cade (knight) | "Mmmph." | ~19.3 s |
| `09_cade_im_okay_knights_land_on_their_feet.mp3` | 3.6 s | Cade (knight) | "I'm okay! Knights always land on their feet." | ~20.5 s |
| `10_narrator_shards_somewhere_softer.mp3` | 9.4 s | Narrator | "The Albatross came down in the Crystal Canyon. The four shards came down all over the island. And the knight came down somewhere softer." | after the film |

## Music (`music/`)

| File | Duration | Description |
|---|---|---|
| `music_jumble.mp3` | 40.0 s | Captain Jumble's theme from the game, 44.1 kHz stereo. |
