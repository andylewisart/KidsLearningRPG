# Art pipeline: ChatGPT → the game

All game art is painted by ChatGPT image generation from the prompt batches in [`batches/`](batches/). You paste the prompts, download the images and upload them here. Claude then cuts them out, sizes and compresses them, and wires them into the game.

## The loop

1. **Open the batch file** (for example [`batches/batch-01-first-battle.md`](batches/batch-01-first-battle.md)). Each batch says what it's for and roughly how long it takes.
2. **Start a new ChatGPT chat** for the batch. Paste the batch's **Setup** message first. It holds the style and the rules, so every image matches. If the batch lists reference images, attach them to that first message.
3. **Paste the prompts one at a time.** Each one starts with an asset name like `enemy_scrap_raptor`.
4. **Fix anything that's off in plain words**, for example: "Same creature, but make the armor rusty orange and show all four legs." Two or three tries is plenty. If it still won't cooperate, skip it and say so when you upload.
5. **Download each image and rename it** to its asset name: `enemy_scrap_raptor.png`. (Keep `.webp` or `.jpg` if that's what ChatGPT gives you.)
6. **Upload them to `art/inbox/<batch>/`** in this repo. On github.com, open the repo, pick the project branch from the branch menu, open `art/inbox/`, then **Add file → Upload files**. To create the batch folder, type `batch-01/` in front of the file name, or just upload into `art/inbox/` and tell me which batch it is.
7. **Tell Claude the batch is uploaded.** Claude processes the images into `public/assets/`, adds them to the asset manifest along with the prompt that made each one (so anything can be regenerated later), and removes the raw files from the inbox.

## Transparent backgrounds

Characters, creatures and bosses need transparent backgrounds so they can stand in any scene. The prompts already ask for one.

- If an image comes back with a background, reply: **"Same image, but with a fully transparent background, as a PNG."**
- If that still doesn't work, reply: **"Same image on a flat, solid magenta (#FF00FF) background with no shadows."** Use green (#00FF00) instead if the creature itself is pink or purple. Claude removes the solid color during processing.

## Sizes

ChatGPT paints three shapes. Each prompt says which one to use.

| Shape | Use it for |
|---|---|
| Portrait (tall, 2:3) | heroes and human-sized characters |
| Square (1:1) | creatures, the tutor companion, most enemies |
| Landscape (wide, 3:2) | battle backgrounds, story scenes, giant bosses |

## Keeping the style consistent

- **One chat per batch.** The chat remembers its own images, which keeps later images in line with earlier ones.
- **Attach the reference images** the batch lists. Most batches after the audition use his winning audition image as the style reference.
- **If the style starts to drift** (colors go flat, it starts looking cartoony), paste the Setup message again.

## Do this with him

He's the art director. Show him each image as it comes in and let him say what to change. That's speaking and describing practice, and it gets him invested. Give him the final say on names, colors and anything his own hero wears.

## Rules every prompt follows

The full list is in [`style-bible.md`](style-bible.md). The key ones:

- **No franchise names** (Final Fantasy, Pokémon, Godzilla, Star Wars). OpenAI blocks lookalikes, so describe the qualities you want and add an original twist.
- **No text, logos, frames or user interface** in the images. The game draws its own.
- **Epic and intense is fine; blood and gore are not.**

## What happens on the Claude side

- Cut out the background (from transparency or the solid color), trim, and resize. Characters become about 768 px tall and backgrounds 1920 px wide.
- Compress to WebP, usually 100–250 KB each, so the game stays fast on an iPad.
- Record each asset in `public/assets/manifest.json` with its source prompt and batch.
- If an image doesn't work in the game (unreadable at small size, wrong pose), Claude adds a short fix-up prompt to the next batch instead of asking you to redo it on the spot.

## Optional: automatic batches through the API

Story Quest already has an OpenAI API key. A script could paint a whole batch through the API without any copy-pasting, with exact sizes and real transparency. API images are billed per image, separately from your ChatGPT subscription. That's worth it later for big batches like 60 item icons. For now, ChatGPT is the plan.
