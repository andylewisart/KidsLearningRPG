# Crystal Titans: notes for Claude

A Final Fantasy X–style learning RPG with Monkey Island–style humor, for one Utah 3rd grader on a laptop. Read `docs/game-design.md` and `docs/curriculum.md` before changing gameplay or content.

**Work in progress:** read `docs/handoff.md` for what's next and how the art and audio pipelines fit in.

**Agents:** hand story, dialogue and cutscene staging to the `screenwriter` agent, and ElevenLabs recording to the `voice` agent (`.claude/agents/`). The story bible is `docs/story/bible.md`.

**Pictures and films:** every still image comes from Codex through an art wave (`art/PRODUCTION.md`, `art/waves/`), never from Kling or any other image tool. Films are the parent's to make in Kling: don't generate, retake or fix them. Write their first-frame stills into a Codex wave and their prompts into `art/video-refs/`, and wire in the films the parent hands over.

## Commands

- `npm test`: unit tests (`node --test`). Run before every commit.
- **Every push to `claude/busy-einstein-52yr07` (or `main`) redeploys the game the kids play** (`.github/workflows/pages.yml`). Push only finished states.
- `npm run build`: bundle to `dist/` (esbuild). `npm run dev` serves it at http://localhost:8000 with rebuilds.
- `?battle=t1` … `t4` or `?battle=free` jumps straight into a fight, which is quickest for checking UI or new art. Chapter 2's are `?battle=h1` … `h4` (the harbor's fiends, all five heroes and their pets: `HARBOR_TRIALS` in `src/world/data2.js`) and `?battle=engine` (the Drain Engine).
- `?explore` jumps into the adventure. Add `&debug` to expose `window.__world`, `window.__puzzle`, `window.__battle` and `window.__stage` (the camera) for automated playtests, `&calm` to turn ambushes off, `&unpainted` to see a place without its wave 04 painting, `&scene=temple` to start in a scene (`cove`, `temple`, `temple_hall`, `canyon` or `grotto`; chapter 2's are `harbor`, `hal_shop`, `biscuit`, `menagerie`, `lighthouse`, `lamp_room`, `sea_cave`, `camp`, `sword_dock`, `sage_library` and `lair_deep`), and `&at=lair` to start partway through the story (chapter 1: `temple`, `canyon`, `wren`, `maren`, `lair`, or `ending` for its ending; chapter 2: `ch2`, `harbor`, `tamsin`, `menagerie`, `causeway`, `lamp`, `day2`, `audit`, `dusk`, or `ending2` for its ending; `checkpoint()` in `src/world/state.js`). The two combine: `&at=canyon&scene=cove` shows the cove with the chest, gate and pool already done. A jump drops any fight saved mid-way (`save.fight`); plain `?explore&debug` picks one back up.

## Layout

- `src/learn/`: the learning engine, pure and tested. Skills (Utah codes, grade 1 to 3), mastery, problem generators, mistake detection, hints, the writing judge, and the players (`players.js`: a profile per child with a grade per subject, and turn-taking when two play together).
- `src/battle/`: battle rules (`engine.js`, pure and tested), data, and question building.
- `src/world/`: the adventure, pure and tested. Places and hotspots (`data.js`), the story and every line of dialogue (`story.js`; chapter 2's are `lines2.js` and `chapter2.js`, its places `data2.js`), puzzles (`puzzles.js`, `puzzles2.js`), save state and walking rules (`state.js`), and how a painted scene's measured objects become places to click, stand and walk around (`painted.js`). The setting is `docs/world.md`.
- `src/ai/`:
  - Claude Haiku 5.5 (`claude.js`) writes every word the tutor droid says and judges writing.
  - `judge.js` has Claude read his sentences as he types and on the shrine, within a daily cap; the word lists in `src/learn/writing.js` are the fallback.
  - OpenAI (`openai.js`) does text-to-speech and speech-to-text only.
  - Prompts live in `prompts.js`.
- `src/ui/`: DOM and Web Animations UI on a fixed 1280×720 stage, scaled to the window but never shown bigger than 1080p (`fit()` in `src/main.js`; the grown-ups corner's "Fill the window" lifts that).
  - `explore.js` runs the adventure on `scene.js`, the living stage: camera, depth parallax, breathing sprites. It also draws the island map, the party's health bar and the rest crystals. `dialogue.js` is the talking box, and `ask.js` runs a puzzle problem with the battle's help flow.
  - `placeholders.js` and `props.js` draw stand-ins until Codex art lands in `public/assets/` (see `art/PRODUCTION.md`).
- `src/content/`: word bank, Word Lash items, the droid's jokes, and how the voices say tricky names (`pronounce.js`).

## Rules

- **The repo is public.** Never commit personal details: his name, school, teacher, emails, anything from ClassDojo or family email. The cast's names are fictional and live in the code (`docs/world.md`); a grown-up can override them in the save.
- Keep every problem inside Utah grade-3 limits (`docs/curriculum.md`, "Limits the problem generators must respect"), and a younger player's inside their own grade's ("Younger players").
- Every problem is tagged with a skill from `src/learn/skills.js`, so progress maps to Utah standards.
- No timers shown to him, ever. Answer speed is recorded quietly for fact fluency.
- Kid-safe, never babyish. Jokes land on the droid or the fiends, never on him.
- Claude API usage: model `claude-haiku-5-5`, no `temperature`, `output_config.effort: "low"`, append-only message history, and handle `stop_reason: "refusal"`.
- **Every recorded line is performed with an expression tag** (an ElevenLabs audio tag like `[warmly]` or `[dryly]` at its start, kept in `tools/audio/direction.json`, never in the displayed text). Without one, a line falls flat. A new or changed line isn't done until it has its tag; a test fails for any line missing one on a voice that takes tags.
