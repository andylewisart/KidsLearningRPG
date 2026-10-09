# Crystal Titans: notes for Claude

A Final Fantasy X–style learning RPG with Monkey Island–style humor, for one Utah 3rd grader on a laptop. Read `docs/game-design.md` and `docs/curriculum.md` before changing gameplay or content.

**Work in progress:** read `docs/handoff.md` for what's next and how the art and audio pipelines fit in.

## Commands

- `npm test`: unit tests (`node --test`). Run before every commit.
- `npm run build`: bundle to `dist/` (esbuild). `npm run dev` serves it at http://localhost:8000 with rebuilds.
- `?battle=t1` … `t4` or `?battle=free` jumps straight into a fight, which is quickest for checking UI or new art.
- `?explore` jumps into the adventure. Add `&debug` to expose `window.__world`, `window.__puzzle`, `window.__battle` and `window.__stage` (the camera) for automated playtests, and `&calm` to turn ambushes off.

## Layout

- `src/learn/`: the learning engine, pure and tested. Skills (Utah codes), mastery, problem generators, mistake detection, hints, the writing judge.
- `src/battle/`: battle rules (`engine.js`, pure and tested), data, and question building.
- `src/world/`: the adventure, pure and tested. Places and hotspots (`data.js`), the story and every line of dialogue (`story.js`), puzzles (`puzzles.js`), save state and walking rules (`state.js`). The setting is `docs/world.md`.
- `src/ai/`:
  - Claude Haiku 5.5 (`claude.js`) writes every word the tutor droid says and judges writing.
  - OpenAI (`openai.js`) does text-to-speech and speech-to-text only.
  - Prompts live in `prompts.js`.
- `src/ui/`: DOM and Web Animations UI on a fixed 1280×720 stage.
  - `explore.js` runs the adventure on `scene.js`, the living stage: camera, depth parallax, breathing sprites. `dialogue.js` is the talking box, and `ask.js` runs a puzzle problem with the battle's help flow.
  - `placeholders.js` and `props.js` draw stand-ins until Codex art lands in `public/assets/` (see `art/PRODUCTION.md`).
- `src/content/`: word bank, Word Lash items, and the droid's jokes.

## Rules

- **The repo is public.** Never commit personal details: his name, school, teacher, emails, anything from ClassDojo or family email. The cast's names are fictional and live in the code (`docs/world.md`); a grown-up can override them in the save.
- Keep every problem inside Utah grade-3 limits (`docs/curriculum.md`, "Limits the problem generators must respect").
- Every problem is tagged with a skill from `src/learn/skills.js`, so progress maps to Utah standards.
- No timers shown to him, ever. Answer speed is recorded quietly for fact fluency.
- Kid-safe, never babyish. Jokes land on the droid or the fiends, never on him.
- Claude API usage: model `claude-haiku-5-5`, no `temperature`, `output_config.effort: "low"`, append-only message history, and handle `stop_reason: "refusal"`.
