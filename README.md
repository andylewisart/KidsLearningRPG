# Crystal Titans (working title)

A turn-based RPG with the art of Final Fantasy X and the humor of The Secret of Monkey Island, built for a Utah 3rd grader. Every attack is a piece of 3rd grade:

- Knight strikes are subtraction.
- Gunner volleys are multiplication and division.
- Spells are cast by spelling.
- Titans (his own creatures) are summoned by writing.

He picks how hard each move is (★, ★★ or ★★★), and harder hits harder. When he misses, the droid shows him how, or he can ask it anything.

**Status:** chapter 1 is playable. He explores Driftwood Isle as Cade the Crystal Knight: walking the beach, temple and canyon, solving puzzles, getting ambushed by fiends, and recruiting Knox, Captain Wren and Maren on the way to the Geode Titan. Quick Battle on the title screen still runs the four set battles and endless random ones. It's set in the Sundered Isles (`docs/world.md`). Codex's painted art drops in automatically as it lands in `public/assets/`; anything not painted yet is drawn as a stand-in.

## Playing it

**Online:** once GitHub Pages is switched on, the game is at https://andylewisart.github.io/KidsLearningRPG/.
- One-time setup: in the repo, **Settings → Pages → Source: GitHub Actions**.
- After that, every push rebuilds it.

**On the laptop without the internet build:**

```
npm install
npm run dev
```

Then open http://localhost:8000.

**Grown-ups corner** (title screen, PIN protected):
- **Claude API key** (console.anthropic.com): the droid's words and the writing judge.
- **OpenAI API key** (platform.openai.com): the droid's live voice and push-to-talk. A ChatGPT subscription doesn't include API use.
- **ElevenLabs API key** (optional, elevenlabs.io): a better live voice and push-to-talk. The fixed lines, music and sound effects are already recorded and need no key. Pick the provider and each role's voice here too.
- **Spending limits:** set a monthly limit on every account. Expect pennies a day.
- **Without keys:** the game still works, with built-in hints and the browser's voice.
- **Keys stay put:** they're saved only in that browser and are left out of backups.
- **Sound:** music and sound-effect volume, read-aloud, and the heroes' character voices.
- **Also in the corner:** names (do these with him), this week's school spelling words, Utah progress, recent mistakes, tutor chats, and a "Copy report for Claude" button.

**Controls:** made for a keyboard.
- Number keys pick menu items.
- Arrows and Enter pick targets.
- Type answers and press Enter. Ctrl+Enter submits writing.
- Esc goes back.
- In a chat with the droid, hold Space to talk.

## The docs

| Doc | What's in it |
|---|---|
| [`docs/game-design.md`](docs/game-design.md) | The game: party, battles, Titans, exploring, Wit Duels, the Compendium, the tutor, the tech plan, the roadmap |
| [`docs/curriculum.md`](docs/curriculum.md) | Every Utah 3rd-grade standard for 2026–27, where it lives in the game, the mistakes the tutor watches for, and how Utah checks progress (Acadience, RISE) |
| [`art/`](art/) | The art direction and the Codex production pipeline: style, sprite-sheet specs, asset waves |
| [`AGENTS.md`](AGENTS.md), [`CLAUDE.md`](CLAUDE.md) | Notes for Codex and Claude |

## Development

- `npm test` runs the unit tests.
- `npm run build` bundles the game into `dist/`.
- `?battle=t1` … `t4` (or `?battle=free`) in the URL jumps straight into a fight. It's handy for checking new art.
- `node tools/audio/generate.mjs` remakes the sound pack with ElevenLabs (see [`docs/handoff.md`](docs/handoff.md)).

A separate, more mature game than [Story Quest](https://github.com/andylewisart/creative-writing-pal), the creative-writing app. It has its own saves, keys and characters.
