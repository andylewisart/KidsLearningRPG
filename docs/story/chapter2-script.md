# Chapter 2: Driftwood Harbor (script)

The full script for chapter 2, written from the approved outline (`docs/story/chapter2-proposal.md`, approved 13 October) and the story bible (`docs/story/bible.md`). **Nothing here is in the game yet.** Once the parent approves the script, the lines go into `CONVOS` in `src/world/story.js` (and the battle lines into `src/content/`), their tags go into `tools/audio/direction.json`, and the `voice` agent records them.

## How to read it

- Each conversation has a proposed `CONVOS` key, its scene and time of day, and a staging note: what's on screen (a painting, story card or film from `art/waves/wave-08-harbor.md`).
- Each line is written the way it would be recorded:

  `- **speaker** (portrait mood) [expression tag] The words.`

  The tag is performed, never shown. Some lines have a second tag where the line turns. Jumble's tags always open with a pirate's voice.
- Speaker keys: `knight` (Cade), `gunner` (Wren), `spellwright` (Knox), `titancaller` (Maren), `kit`, `jumble`, `narrator`, and the new ones: `beastkeeper` (Tamsin), `clamp`, `keeper`, `hal`, `baker`, `swordmaster`.
- Moods are the six on every expression sheet: neutral, laughing, angry, shocked, smug, worried.
- *Italic lines* are staging: sound, movement, what the picture does. Nobody says them.
- **Live** marks a number, time or word the game makes up at his level and shows on screen. Recorded lines never say those.
- **(reused)** marks a line already recorded for chapter 1. It costs nothing.
- **(approved)** marks a line quoted word for word from the approved outline.
- The bars of quiet: the keeper's logbook, the Lantern Song, Jumble's audit and the keeper saying Tamsin's name. Nobody jokes inside them.

---

## Beat 1. Into the harbor (the first morning)

### `harborArrive`: the town that's gone quiet
- **Scene:** the trail down into the harbor. Morning.
- **Staging:** story card `story_harbor_arrival` (the party walking down into the silent harbor). The lines play over it, then the view cuts to `scene_harbor` (laundry hanging still, bells not moving, a fiddler staring at his fiddle).

- **knight** (neutral) [solemnly] Driftwood Harbor. The crystal's home.
- **gunner** (worried) [uneasily] A pirate port this quiet? That's just wrong.
- **spellwright** (worried) [wistfully] Look at the fiddler. He's holding it like a word he can't spell.
- **titancaller** (worried) [gently] They can tell something's missing. They just can't tell what.
- **kit** (neutral) [matter-of-factly] Crystal up the lighthouse, and everyone remembers. Simple.
- **gunner** (smug) [teasingly] Hat-Bot, nothing we do is simple.

### `pocketsTwoHats`: the first look at Pockets in town
- **Scene:** `scene_harbor`, on a rooftop. Morning.
- **Staging:** Pockets sits on a hull-roof in his own tricorn with Kit's good tricorn stacked on top (`field_twohats`). Kit is still in the spare from chapter 1. Pockets flees after the second line.

- **kit** (shocked) [indignantly] Two hats. One of them is mine. My good one.
- **kit** (angry) [determined] I refuse to chase that monkey in my second-best hat.

### `clockTower`: the scrambled clock (first look)
- **Scene:** `scene_harbor`, the bell tower. Morning.
- **Staging:** the clock's hands point at each other.

- **kit** (neutral) [dryly] The hands are pointing at each other. That's not a time. That's an argument.
- **titancaller** (worried) [gently] The fishing boats haven't gone out. They can't tell when the tide turns.
- **kit** (neutral) [matter-of-factly] Somebody still chalks the tide board by hand. Set the clock from that.

> **Puzzle: the clock tower.** Time to the minute. **Live:** the time on the tide board and the clock face he sets. Recorded lines name no time.

- `clockMissed`: **kit** (worried) [helpfully] Close. Check the minute hand against the board again.
- `clockWait`: **kit** (neutral) [dryly] The clock's been wrong all night. It can wait a bit longer.

### `clockFixed`: the hands clunk home, and Jumble wakes up
- **Scene:** `scene_harbor` (variant `clock_fixed`). Morning.
- **Staging:** a huge CLONK as the hands drop into place. The *Misspelled* is moored at the end of the dock. Jumble bursts out onto its rail. Knox ducks behind a stack of barrels before Jumble looks their way (Jumble must not see Knox: their meeting stays saved).

- **kit** (smug) [satisfied] There. The harbor knows what time it is.
- **jumble** (angry) [furious bellowing gravelly sinister pirate] WHO TOUCHED MY CLOCK?
- **spellwright** (shocked) [urgently] Hide me. Old classmate.
- **jumble** (smug) [sneering gravelly sinister pirate] The crystal carriers! Still in one piece. [scoffing] Mostly.
- **jumble** (angry) [wounded theatrical gravelly sinister pirate] That took me ALL NIGHT! [pompously] Some of us have a craft!
- **knight** (angry) [determined] A knight fixes what's broken.
- **jumble** (laughing) [mocking gravelly sinister pirate] A kuh-NIGHT. [scoffing] Of course.
- **kit** (smug) [deadpan] Still silent.

### `clampArrives`: two villains, instantly
- **Scene:** the dock, `scene_harbor`. Morning.
- **Staging:** a flat foghorn. A small gunmetal Dominion cutter glides in at the other end of the dock. Clamp steps off and stamps the planks (stamp sound), then the story card `story_clamp_meets_jumble` (Clamp writing the fine, Jumble looming over him) holds from the fine to the end.

- **clamp** (neutral) [politely] Inspector Clamp, Iron Dominion. I'm here to count your crystal. **(approved)**
- **knight** (angry) [firmly] This crystal belongs to Driftwood.
- **clamp** (smug) [politely] I'll get to yours. I get to everything eventually.
- **clamp** (neutral) [politely] Is that galleon yours, sir? It's in a loading zone. That's a fine.
- *A form tears off the clipboard. Clamp tucks it into Jumble's coat.*
- **jumble** (angry) [outraged sputtering pirate] A FINE? I'm a GHOST! I don't even have POCKETS! **(approved)**
- *Up on a roof, Pockets chitters, offended.*
- **clamp** (neutral) [politely] Then I'll add it to your file.
- **jumble** (shocked) [taken aback gravelly sinister pirate] My... FILE?
- **gunner** (laughing) [delighted] I can't stand either of them, and I love this.

### `lighthouseSealed`: inspection in progress
- **Scene:** `scene_harbor`, looking out at the lighthouse on its point. Morning.
- **Staging:** drones peel off the cutter and settle along the causeway. A barricade goes up with a stamp. Clamp walks away mid-conversation.

- **clamp** (neutral) [politely] The lighthouse is closed for inventory. Inspection in progress.
- **knight** (angry) [indignantly] You can't just close a lighthouse! You're a villain!
- **clamp** (smug) [politely] I'm not a villain. I'm a form you haven't filled out yet.
- *Clamp leaves. The drones hum on the causeway.*
- **kit** (worried) [urgently] The old crystal can't stop him. And if we put the new one in now...
- **titancaller** (worried) [gently] ...he takes that too.
- **knight** (neutral) [determined] Then we find another way in. And we don't let him count us.

---

## Beat 2. The town that's forgetting (the first morning, into noon)

### `halIntro`: Honest Hal's Previously Plundered Goods
- **Scene:** `scene_hal_shop`. Late morning.
- **Staging:** Hal behind his counter, abacus missing beads. The tea cozy sits on the hat stand with a price tag.

- **hal** (laughing) [jovially] Welcome, welcome! Honest Hal's Previously Plundered Goods. The "honest" is me.
- **kit** (neutral) [urgently] Before anything else. Do you sell hats?
- **hal** (smug) [smoothly] Do I sell hats! A genuine admiral's hat, previously plundered. Ninety gold.
- *He lifts the tea cozy off the stand. It has a pom-pom.*
- **knight** (shocked) [doubtfully] Kit. That's a tea cozy.
- **hal** (smug) [smoothly] It's an admiral's tea cozy.
- **kit** (neutral) [deadpan] Ring it up.

> **Puzzle: catch Hal's sum.** Hal totals the sale, and his board is always wrong in his favor. He works out the true total. Multiples of 10, and ×6 to ×9. **Live:** the items, the prices and Hal's wrong total.

- `halCheck`: **kit** (neutral) [suspiciously] Check his board. His sums only ever go wrong one way.

### `halCaught`: the tea cozy, for forty
- **Scene:** `scene_hal_shop` (variant `cozy_sold`). Late morning.
- **Staging:** Kit takes off the spare and puts on the cozy. From here on Kit's portraits are `portraits_cozy`.

- **hal** (shocked) [wounded] Wrong? Me? It's the dimming! Terrible for sums.
- **hal** (worried) [sighing] Fine. Forty gold. You're robbing an honest man.
- **kit** (smug) [deadpan] It's intimidating in a different way. **(approved)**
- **gunner** (laughing) [teasingly] Looking sharp, Admiral Teapot.
- **kit** (neutral) [dryly] At least she got the rank right.

### Hal, after the first visit
Every purchase runs the same check: Hal reads out a total (no number in the recording; the board shows it), and catching it gets a discount.

- `halAgain`: **hal** (laughing) [jovially] Back for more honest bargains? Pet food, blade bits, all barely plundered.
- `halTotal1`: **hal** (smug) [breezily] Carry the one, carry a little extra... there's your total!
- `halTotal2`: **hal** (smug) [cheerfully] A very fair total. Practically a gift.
- `halTotal3`: **hal** (neutral) [smoothly] Let me just tot that up. Don't look at the board.
- `halCaught1`: **hal** (shocked) [wounded] The dimming strikes again!
- `halCaught2`: **hal** (smug) [smoothly] A rounding error. Rounding toward me.
- `halCaught3`: **hal** (worried) [grumbling] You're a hard customer. Discount. Don't tell anyone.
- `halMissed`: **kit** (neutral) [suspiciously] Look again. Do his totals ever come out low?
- `halBoard` (look: the price board): **kit** (neutral) [dryly] Prices in chalk. Totals in hope.

### `biscuitIntro`: the blank recipe book
- **Scene:** `scene_biscuit`. Noon.
- **Staging:** the baker at the counter, flour to the elbows, turning blank pages. A scale and a measuring jug on the counter.

- **baker** (worried) [bewildered] Thirty years of biscuits. This morning the book went white.
- **baker** (worried) [sadly] My hands still know the taste. They just don't know how much.
- **knight** (neutral) [solemnly] Ma'am, I'm bound by rule forty of the Code. Never say no to a biscuit.
- **knight** (smug) [determined] We'll get your recipe back.
- **kit** (neutral) [helpfully] Weigh the flour, measure the milk. The scale and the jug don't forget.

> **Puzzle: the biscuit recipe.** Grams of flour on the scale, milliliters of milk in the jug, from what the town still knows by heart. **Live:** every amount.

- `recipeMissed`: **baker** (worried) [kindly] Too much and they're bricks. Too little and they're crumbs. Again?
- `recipeWait`: **baker** (neutral) [warmly] The oven will keep. So will I.

### `recipeSolved`: one recipe, written back by hand
- **Scene:** `scene_biscuit`. Noon.
- **Staging:** the baker writes the recipe into the blank book in her own hand. One page has writing; the rest stay blank until the ending.

- **baker** (laughing) [joyfully] That's it! That's exactly it! Quick, before it goes!
- *She scribbles it into the book.*
- **baker** (neutral) [warmly] Biscuits for the road. They mend almost anything.
- **knight** (laughing) [delighted] Rule forty, fulfilled.

- `recipeBook` (look, before): **kit** (neutral) [dryly] Blank. Every page. Even the jam stains are gone.
- `recipeBookOne` (look, after the puzzle): **kit** (neutral) [matter-of-factly] One recipe, in her handwriting. The rest still waiting.
- `recipeBookFull` (look, after the ending): **kit** (smug) [dryly] Every page full. And flour on all of them.

### The Fog Glob signs (any time on the first day)
- **Scene:** `scene_harbor`, the street signs. Day.
- **Staging:** a sign with half its word blurred into fog. Fixing it, the fog lets go and the painted letters come back.

- `fogSign`:
  - **kit** (neutral) [suspiciously] That sign used to say something. The fog's eaten part of it.
  - **spellwright** (laughing) [delighted] A prefix! Or a suffix! Give the word its piece back, and the fog lets go.

> **Puzzle: the signs.** Prefixes and suffixes (un-, re-, -ful and so on). **Live:** the word.

- `fogSignMissed`: **spellwright** (neutral) [kindly] Still foggy. Try a different piece.
- `fogSignSolved1`: **spellwright** (laughing) [delighted] The word comes home!
- `fogSignSolved2`: **kit** (smug) [dryly] One street sign, back on duty.
- `fogSignSolved3`: **spellwright** (smug) [grandly] Fog, you may keep the weather. The words are ours.

### Pockets' chase lines (one per place he's found)
Each plays when he's clicked, then he flees. He's wearing both hats in every place.

- `pocketsHal`: **kit** (angry) [indignantly] He's trying on Hal's stock. Over my hat.
- `pocketsBiscuit`: **kit** (shocked) [appalled] He's dunking my hat in the milk. That's a new low.
- `pocketsMenagerie`: **kit** (worried) [suspiciously] He's hiding with the fiends. He fits right in.
- `pocketsDock`: **kit** (angry) [indignantly] He's dueling a crab. Using my hat as a shield.
- `pocketsSeaCave`: **kit** (worried) [dryly] Even down here. He's following us. Or leading. Both are bad.
- `pocketsLighthouse`: **kit** (angry) [deadpan] On the rail. In my hat. At a jaunty angle.

---

## Beat 3. Tamsin (the first afternoon)

### `wildCagedFirst`: the Caged Drone in the market
- **Scene:** `scene_harbor`, the market street. Afternoon.
- **Staging:** an ambush: a Caged Drone swoops down the street. Fight in `bg_harbor_docks`.

- **kit** (shocked) [alarmed] A Caged Drone! There's something trapped in its belly. Bring it down.

### `tamsinMeets`: "It's shy."
- **Scene:** `scene_harbor`, the market street. Afternoon.
- **Staging:** the beaten drone crashes into a fish stall. The cage in its belly glows, and a small frightened fiend presses against the bars. Cade steps up, sword raised. A girl with a driftwood crook vaults over the stall and gets there first, pries the cage open, and a baby Wick Moth flutters onto her shoulder.

- **knight** (shocked) [urgently] There's a fiend inside! Stand back!
- **beastkeeper** (angry) [flatly] Don't burst it.
- *She levers the cage open with her crook.*
- **beastkeeper** (neutral) [protectively] It's shy.
- **knight** (shocked) [bewildered] It's a fiend!
- **beastkeeper** (neutral) [matter-of-factly] It's a Wick Moth. A baby. They only bite when you wave swords at them.
- **knight** (worried) [sheepishly] Sorry, small moth.
- **beastkeeper** (neutral) [matter-of-factly] Clamp's drones catch fiends to power them. I've freed eleven this week.
- **beastkeeper** (smug) [flatly] Twelve.
- **gunner** (laughing) [eagerly] I like her. I'm calling her Crook.
- **beastkeeper** (neutral) [flatly] Tamsin.
- **gunner** (smug) [teasingly] Crook-Tamsin.
- **beastkeeper** (neutral) [flatly] Tamsin. *(the same recording as two lines up)*
- **kit** (smug) [dryly] She's nicer to the moth than to us.
- **beastkeeper** (neutral) [matter-of-factly] The moth didn't point a sword at me.

### `tamsinGrandpa`: her hook
- **Scene:** the same street. Afternoon.
- **Staging:** Tamsin keeps glancing past them at the lighthouse. The music steps back (`hush`) for this one and leans in on her. No jokes.

- **titancaller** (neutral) [gently] You keep looking at the lighthouse.
- **beastkeeper** (worried) [flatly] My grandpa's the keeper. He doesn't remember my name anymore.
- **beastkeeper** (worried) [sadly] But he still climbs up there every night. Nobody knows why. Not even him.
- *A beat. She turns away.*
- **beastkeeper** (neutral) [flatly] Come on. The moth needs a tank. And you should see the hold.

---

## Beat 4. The menagerie (the first afternoon)

### `menagerieArrive`: the hold of a beached ship
- **Scene:** `scene_menagerie`. Afternoon, inside.
- **Staging:** tanks, nests and hammocks, small rebuilt fiends asleep, warm lantern light. Tamsin settles the moth into a tank.

- **beastkeeper** (neutral) [protectively] Voices down. Nobody bursts anything.
- **gunner** (laughing) [eagerly] A whole ship full of fiends? Best day ever. Actually, this time.
- **beastkeeper** (neutral) [matter-of-factly] They're not fiends anymore. They're remembered.
- **spellwright** (laughing) [delighted] Remembered? Ooh. Go on.
- **beastkeeper** (neutral) [matter-of-factly] A fiend is something forgotten. Give it its name back, and it's itself again.
- **beastkeeper** (angry) [fiercely] Everyone says fiends are just the dark. I'm going to prove they're not.

### `raptorYours` / `raptorFresh`: the Scrap Raptor
- **Scene:** `scene_menagerie`. Afternoon.
- **Staging:** one of two openings. If he captured a Scrap Raptor in chapter 1, it's his (`raptorYours`); if not, one Clamp's drone dropped is in the corner tank (`raptorFresh`). Both lead into the same lines.

`raptorYours`:
- **beastkeeper** (neutral) [matter-of-factly] You caught a Scrap Raptor in the canyon. Let's give it its name back.

`raptorFresh`:
- **beastkeeper** (neutral) [matter-of-factly] There's a Scrap Raptor in the corner tank. Let's give it its name back.

Then, either way:
- **knight** (worried) [warily] Scrap Raptors bit me. Twice.
- **beastkeeper** (neutral) [flatly] You hit them with a sword. Twice.
- **beastkeeper** (neutral) [matter-of-factly] First, it eats on time. Hungry fiends don't remember anything.

> **Puzzle: Rivet's feeding schedule.** Elapsed time on a clock face ("It ate at 3:45. It's 4:20. How long?"). **Live:** both times.

- `feedMissed`: **beastkeeper** (neutral) [flatly] Check the clock again. It's very hungry and very bitey.
- `feedWait`: **beastkeeper** (neutral) [matter-of-factly] It'll wait. It won't be happy about it.
- `feedSolved`: **beastkeeper** (neutral) [matter-of-factly] Good. Now weigh its supper. Exactly. Raptors notice.

> **Puzzle: Rivet's meal.** Grams on the scale. **Live:** the amount.

- `weighMissed`: **beastkeeper** (worried) [flatly] Not quite. Get it wrong and it's sick on my shoes.
- `weighSolved`: **beastkeeper** (neutral) [matter-of-factly] Last thing. Every creature here gets a field note.
- **beastkeeper** (neutral) [matter-of-factly] Write what it looks like and what it does.
- **beastkeeper** (worried) [protectively] If it's written down, the dark can't have it.

> **Writing: Rivet's field note.** Informative writing, judged for detail as in the Titan Forge. **Live:** his words. Read back in the chapter's ending.

- `noteMissed`: **beastkeeper** (neutral) [matter-of-factly] Good start. Tell me more. What's it made of? What's it proud of?
- `noteWait`: **beastkeeper** (neutral) [flatly] The pencil's not going anywhere. Neither is the raptor.

### `rivetHatches`: Rivet
- **Scene:** `scene_menagerie`. Afternoon.
- **Staging:** a flash; the Scrap Raptor folds in on itself and hatches into Rivet (`pet_raptor` stage 1): dog-sized, neat plates, a tiny tower shield on one arm. Clank, happy chirp. He trots straight to Cade.

- **beastkeeper** (laughing) [delighted] Its name's Rivet. It always was.
- **knight** (laughing) [moved] He has a shield. [proudly] Kit, he has a shield. **(approved)**
- **kit** (smug) [dryly] I see it. I'm choosing not to feel replaced. **(approved)**
- **knight** (neutral) [solemnly] Rule four hundred and two: always share your shield.
- **kit** (neutral) [dryly] You just made that up.
- **knight** (smug) [proudly] I made up four hundred and one too.

### `tamsinJoins`: not for you
- **Scene:** `scene_menagerie`. Afternoon.
- **Staging:** Tamsin picks up her crook and her satchel of fish.

- **beastkeeper** (neutral) [flatly] You're going to the lighthouse.
- **knight** (neutral) [earnestly] We have to. The crystal belongs up there.
- **beastkeeper** (angry) [protectively] Then I'm coming. Not for you. For him.

### `pocketsNotAPet`
- **Scene:** `scene_menagerie`. Afternoon.
- **Staging:** Pockets drops from a hammock onto the tank shelf. Tamsin, pencil out, holds up a registration form. Pockets eats it.

- **beastkeeper** (neutral) [matter-of-factly] Three eyes. Two hats. Unregistered. Name?
- *Crunch.*
- **kit** (neutral) [deadpan] Diet: paperwork.

### `tamsinFirstFight`: her first fight, Overdrive full
- **Staging:** the first fight after she joins. Kit's line opens it.

- **kit** (shocked) [impressed] Tamsin's Overdrive is full. New heroes come in hot.

---

## Beat 5. Tamsin in battle (Kit's lines and hers)

### Kit, teaching the new systems
These are battle lines, so like chapter 1's battle lines they name roles, not people (the cast can be renamed), except the one the outline approved.

- `firstFast`: **kit** (shocked) [urgently] It's too quick for us. Tamsin, slow it down. **(approved)**
- `slowLesson`: **kit** (neutral) [helpfully] Pick Slow, and work out how long it lasts. Then it gets one turn.
- `slowLanded`: **kit** (smug) [satisfied] Slowed. Now it moves at our speed. Hit it.
- `feedLesson`: **kit** (neutral) [helpfully] Feed weighs out a meal or pours a tonic. It heals, or calms a fiend.
- `calmCapture`: **kit** (neutral) [matter-of-factly] It's calm. Finish it with three stars, and it's captured.
- `firstCaptureCh2`: **kit** (smug) [satisfied] Captured. The Beastkeeper can remember that one into a friend.
- `odLesson_beastkeeper`: **kit** (neutral) [helpfully] The Beastkeeper's Overdrive is full. Pick Stampede: every right answer, a creature charges.
- `firstPet`: **kit** (neutral) [matter-of-factly] Pets act after a right answer. Rivet mostly bites things. Enthusiastically.
- `petSlot`: **kit** (neutral) [helpfully] A new pet slot on the Grid. Somebody else gets a friend.

### Kit, the "Out of reach" misses (the wrong hero attacks)
One for each kind of fiend, naming who can reach it.

- `reachArmored`: **kit** (worried) [dryly] Out of reach. That shell needs the Knight's sword.
- `reachFlier`: **kit** (worried) [dryly] Out of reach. It's up there. The Sky-Pirate's blasters can get it.
- `reachSlime`: **kit** (worried) [dryly] Splashed right through. The Spellwright's words melt slimes.
- `reachFast`: **kit** (worried) [deadpan] Too quick. It dodged. The Beastkeeper's Slow will pin it.
- `reachColossal`: **kit** (worried) [deadpan] Barely a scratch. Giants need a Titan.
- `reachAgain`: **kit** (neutral) [helpfully] Wrong hero for that one. Swap someone in.

### Kit's wild-fight intros (new fiends)
- `wildBrute`: **kit** (shocked) [alarmed] Barnacle Brute! Its shell is somebody's front door. Knock with a sword.
- `wildMoth`: **kit** (shocked) [alarmed] Wick Moth! The fading lighthouse has it very upset. Blasters reach it.
- `wildFog`: **kit** (shocked) [alarmed] Fog Glob! Swords go straight through. Spells clear it.
- `wildMimic`: **kit** (shocked) [alarmed] Tick Mimic! A clock pretending to be a chest. Always seven minutes late.
- `wildGoblins`: **kit** (shocked) [alarmed] Crumb Goblins! Small, fast and crunchy. Mostly crunchy.
- `wildEel`: **kit** (shocked) [alarmed] Riptide Eel! It's fast. It has already stolen a potion.
- `wildCaged`: **kit** (worried) [urgently] A Caged Drone. Something's trapped inside. Bring it down, gently.

### Tamsin's battle barks
No names in barks (the cast can be renamed). Each has its delivery tag.

**Battle start**
- **beastkeeper** (neutral) [matter-of-factly] Fiends. Nobody burst anything I might want to keep.
- **beastkeeper** (laughing) [delighted] Ooh. Never seen that kind up close.
- **beastkeeper** (neutral) [flatly] Stand back. Fiends like me better.

**Attack**
- **beastkeeper** (neutral) [flatly] Sit.
- **beastkeeper** (neutral) [matter-of-factly] Crook to the shell. They hate that.
- **beastkeeper** (smug) [flatly] Nothing personal. Mostly.

**A ★★★ hit**
- **beastkeeper** (laughing) [delighted] Ha! That's going in the field notes.
- **beastkeeper** (laughing) [delighted] That one's coming home with me.
- **beastkeeper** (smug) [matter-of-factly] Clean. It'll be a much nicer fiend after this.

**Getting hit**
- **beastkeeper** (angry) [flatly] Ow. Noted.
- **beastkeeper** (angry) [indignantly] That's going in your field note. It won't be flattering.

**Low health**
- **beastkeeper** (worried) [urgently] I'm low. Somebody weigh me out a biscuit.
- **beastkeeper** (worried) [flatly] Not great. Still better than a Wick Moth's week.

**Knocked out**
- **beastkeeper** (worried) [sadly] Look after my creatures.
- **beastkeeper** (worried) [flatly] Fine. I'll lie here and study the ground.

**Victory**
- **beastkeeper** (neutral) [matter-of-factly] Done. Nobody burst the small ones? Good.
- **beastkeeper** (laughing) [delighted] Fiend fact: they lose to us. Writing that down.
- **beastkeeper** (smug) [flatly] That went fine. Don't make it weird.

**Swap-in**
- **beastkeeper** (neutral) [flatly] Move over. My turn.
- **beastkeeper** (smug) [matter-of-factly] Fast ones? Leave them to me.
- **beastkeeper** (neutral) [protectively] Easy. I've got you.

**Her two commands (extra, optional)**
- `slow`: **beastkeeper** (smug) [matter-of-factly] Slow. Now it's on our time.
- `feed`: **beastkeeper** (neutral) [matter-of-factly] Weighed out. Eat.

---

## Beat 6. The way in (the first evening)

### `causewayGuarded`
- **Scene:** `scene_lighthouse` (painted at dusk, so this is the first time he can go there). Evening.
- **Staging:** the causeway barred by Clamp's barricade, drones hovering over it.

- **kit** (worried) [warily] A wall of drones, and a barricade that says "Inspection in progress."
- **knight** (angry) [determined] Then we charge them!
- **beastkeeper** (neutral) [flatly] Then you get caged.
- **beastkeeper** (neutral) [matter-of-factly] There's a smugglers' tunnel. It comes out under the old wreck at the cove.
- **beastkeeper** (neutral) [matter-of-factly] Only at low tide. I chalk the tide board every morning. I'd know.

### `coveTideOut`: the cove, changed
- **Scene:** `scene_cove` (variant `tide_out`). Evening. The painting is a sunrise, so no line names the time (see the open questions).
- **Staging:** the sand runs further out, and a sea-cave mouth shows under the old wreck. A new green bottle on the sand.

- **kit** (shocked) [surprised] The tide's out further than I've ever seen. There's a cave under the wreck.
- **knight** (neutral) [earnestly] Under the wreck that isn't ours?
- `wreckAgain` **(reused)**: **kit** (neutral) Still not ours. Still worse.

### `bottleCh2`: a new note from Jumble
- **Scene:** `scene_cove`, the sand. Evening.
- **Staging:** the new bottle (`prop_bottle_ch2`). Kit reads it, as in chapter 1.

- **kit** (neutral) [reading, dryly] "Dear whoever. I have scrambled your clock. Now nobody knows when anything is."
- **kit** (neutral) [dryly] "Ha! Love, Captain Jumble."
- **kit** (smug) [deadpan] He's dated it. Wrongly.

### `petFoodChest`
- **Scene:** inside the sea cave mouth. Evening.

- **kit** (neutral) [dryly] Pet food. Smells like fish and good intentions.
- **beastkeeper** (laughing) [delighted] The good kind!

### `tideTable`: when do they have to be out?
- **Scene:** `scene_sea_cave`. Evening, into night.
- **Staging:** glowing kelp, wet steps leading up. A tide table cut into the rock by smugglers.

- **beastkeeper** (neutral) [matter-of-factly] Low tide doesn't last. Work out when we have to be out, or we swim.

> **Puzzle: the tide table.** Elapsed time ("Low tide is at 8:15 and lasts 50 minutes."). **Live:** the times.

- `tideMissed`: **beastkeeper** (worried) [flatly] That's when we'd be swimming. Try again.
- `tideWait`: **beastkeeper** (neutral) [flatly] The tunnel will wait. The tide won't.
- `tideSolved`: **beastkeeper** (neutral) [matter-of-factly] Good. Out with time to spare. Move.

- `seaCaveKelp` (look): **beastkeeper** (neutral) [matter-of-factly] Glow-kelp. It lights up when it's nervous. It's always nervous.

---

## Beat 7. The lamp room (the first night): the heart

From the stairs to Tamsin's line, nobody jokes. The music is only the wind and the sea until the keeper hums.

### `keeperClimbs`: the stairs
- **Scene:** the lighthouse's spiral stairs, from the cellar. Night.
- **Staging:** story card `story_keeper_climbs` (the old keeper climbing ahead of them, small in the dark, lantern in hand). He doesn't notice them.

- **beastkeeper** (worried) [sadly] That's him. Every night, the same time.
- **knight** (worried) [gently] Should we say hello?
- **beastkeeper** (neutral) [flatly] He won't know who we are. Just let him climb.

### `keeperHums`: the tune
- **Scene:** `scene_lamp_room`. Night, inside.
- **Staging:** the keeper sits in his chair by the great lens, the old crystal guttering in it. He hums: **the keeper's hum** (about 8 seconds, the Lantern Song's tune, no words). Maren freezes on the first notes. Then he speaks to the lens, stands, and goes back down past them without seeing them.

- *The keeper hums.*
- **titancaller** (shocked) [in awe] That's a song.
- **keeper** (neutral) [fondly] Goodnight.
- *He takes his lantern and goes down the stairs.*
- **titancaller** (worried) [wistfully] An old one. He only has the tune now.

### `logbook`: "Said goodnight to the bird."
- **Scene:** `scene_lamp_room`, the desk. Night.
- **Staging:** clicking the logbook (it glints) opens story card `story_logbook`: the open book by lantern light. The game draws the words: page after page, a date, and then the same line in the same shaky hand, *Said goodnight to the bird.* The pages turn slowly. No voice reads them. When the card closes, a pause, then Tamsin. Then nothing for a few seconds.

- **beastkeeper** (worried) [sadly] He forgot my name. He never forgot this. **(approved)**

- `logbookAgain` (later looks): **beastkeeper** (worried) [sadly] Every page. Every night.

### `crystalGrid`: the Sage chart
- **Scene:** `scene_lamp_room` (variant `grid`). Night.
- **Staging:** after the pause, the old crystal flares one last time. Its light catches the lens and throws a web of glowing nodes and paths across the ceiling, one path per hero. Then the Grid screen (`ui/grid_board`) opens for the first visit.

- **spellwright** (shocked) [in awe] A Sage chart. Every road a mind can walk. **(approved)**
- **kit** (neutral) [deadpan] It's a map. Of us. I'd like to see my node. **(approved)**
- **gunner** (smug) [teasingly] Heroes only, Admiral Teapot.
- **kit** (neutral) [matter-of-factly] Every true answer since the beach left light behind. It's been waiting.
- **kit** (neutral) [helpfully] Spend it along each path. Some nodes only open once a skill is truly yours.
- **beastkeeper** (neutral) [flatly] Mine's short.
- **kit** (smug) [dryly] You got here this afternoon.

The Grid screen's own lines (Kit):
- `gridAgain`: **kit** (neutral) [matter-of-factly] More light to spend. Every fight pays.
- `gridGate`: **kit** (neutral) [helpfully] Locked. That one opens when the skill behind it is truly learned.
- `gridGateOpen`: **kit** (smug) [satisfied] The gate's open. You earned that one the long way.
- `gridCalmSeas`: **kit** (smug) [dryly] Calm Seas. Fewer fiends where we've already been. Peace and quiet. Finally.

### `lampDrones`: time to go
- **Scene:** `scene_lamp_room`. Night.
- **Staging:** red drone lights sweep up the stairwell. The party runs for the cellar. At the door, Maren looks back: the lens glows once, slowly, like a breath. No line on that.

- **kit** (worried) [urgently] Drones on the stairs!
- **beastkeeper** (angry) [urgently] Tunnel. Now. Don't let them see Grandpa.

### `songResolve`: Maren decides to find the words
- **Scene:** `scene_sea_cave`, safe below. Night.
- **Staging:** the glow-kelp, everyone catching their breath.

- **titancaller** (worried) [wistfully] That tune. The whole harbor used to sing it. I could feel it.
- **beastkeeper** (neutral) [flatly] Nobody remembers it. I've asked everyone. Twice.
- **titancaller** (neutral) [warmly] Then I'll ask a third time. Somebody always remembers a little.
- **titancaller** (worried) [gently] I've only ever kept a song. I'd like to find one.

---

## Beat 8. The Sword Master's dock (the second morning)

### `swordmasterIntro`
- **Scene:** `scene_sword_dock`. Morning.
- **Staging:** a Barnacle Brute sits in the Sword Master's armchair. The Sword Master glares at it from the dueling platform, rapier drawn.

- **swordmaster** (angry) [indignantly] That crab is in my chair. I've been glaring at it since dawn.
- **kit** (neutral) [dryly] How's that going?
- **swordmaster** (worried) [grandly] It's a duel of wills. [sheepishly] I'm losing.
- **swordmaster** (angry) [theatrically] You fight like a... like a... [frustrated] Blast! It's right there!
- **swordmaster** (worried) [sadly] Sharpest tongue in the isles. Now I can't remember a single comeback.
- **knight** (neutral) [earnestly] Sir. Allow us.

*The fight: a Barnacle Brute (armored, Cade's). Kit's intro is `wildBrute`.*

### `dockWon`: the forge opens
- **Scene:** `scene_sword_dock` (variant `dock_won`). Morning.
- **Staging:** the crab scuttles off the dock. The Sword Master sinks into his chair and lights the forge in the ship's stove.

- **swordmaster** (laughing) [grandly] My chair! My dock! My forge!
- **swordmaster** (smug) [grandly] Bring me fiend parts and gold, and I'll make any weapon sing.
- **swordmaster** (neutral) [grandly] And when my comebacks come back, I'll teach you to duel with words.
- **gunner** (laughing) [cocky] I like him.

### The forge
- `forgeFirst`: **swordmaster** (smug) [grandly] Every hero gets one blade worth a song. Let's see yours.
- `forgeUpgrade`: **swordmaster** (laughing) [grandly] Behold! Sharper, shinier, and very slightly showing off.
- `forgeShort`: **swordmaster** (angry) [indignantly] Not enough parts. Even a master needs material.
- `forgeDone`: **swordmaster** (smug) [grandly] Perfect. I can do no more. I've tried. I'm wonderful.
- `swordmasterAgain`: **swordmaster** (worried) [theatrically] You fight like a... [frustrated] No. Still gone. Blast.

---

## Beat 9. Gathering strength (the second day)

### Tamsin remembers bigger fiends
- `tamsinGrows`: **beastkeeper** (laughing) [delighted] I can remember bigger ones now. Bring me what you catch.

### `petJelly`: a Volt Jelly for Wren
- **Scene:** `scene_menagerie`. Day.
- **Staging:** a captured Volt Jelly hatches (`pet_jelly` stage 1), a little brass cap on top. It floats straight to Wren.

- **beastkeeper** (neutral) [matter-of-factly] Volt Jelly. Floats, sparks, likes high places.
- **gunner** (laughing) [delighted] It's got a little brass cap! I'm calling it Captain Fizzbottom.
- **beastkeeper** (neutral) [flatly] Its name's Fizz. It always was.
- **gunner** (smug) [fondly] Fizz. Okay. That's actually perfect.

### `petSlime`: an Ink Slime for Knox
- **Staging:** an Ink Slime hatches (`pet_slime` stage 1), teacup-sized, writing glowing letters in the air. The first one it writes is a K.

- **spellwright** (laughing) [delighted] It writes! It wrote a K. A silent one!
- **beastkeeper** (neutral) [matter-of-factly] Its name's Blot.
- **spellwright** (smug) [fondly] Blot. We are going to be very good friends.

### `petTide`: a tide creature for Maren
- **Staging:** a sea-glass hermit crab hatches (`pet_tide` stage 1), with a tiny shrine bell for a shell. It rings once.

- **titancaller** (laughing) [warmly] A shrine bell for a shell. It rings when the tide turns.
- **beastkeeper** (neutral) [matter-of-factly] Its name's Chime. It came from your grotto.
- **titancaller** (neutral) [fondly] Hello, Chime.

### Pets growing (each stage; he writes a new field note)
- `petGrows`: **beastkeeper** (laughing) [delighted] It's growing! New form, new field note.
- `petGrowsNote`: **beastkeeper** (neutral) [matter-of-factly] Write what's changed. Every true detail makes it stronger.
- `petGrownMissed`: **beastkeeper** (neutral) [matter-of-factly] Thin. What does it look like now? What can it do?

### The Lantern Song, piece by piece (any time after beat 7)
Maren asks around. Each piece is one short conversation.

`songBaker` (`scene_biscuit`, day):
- **titancaller** (neutral) [gently] Do you remember a song about the lighthouse? An old one.
- **baker** (worried) [wistfully] Lantern... there was a song with a lantern in it. My mother sang it over the dough. **(approved)**
- **titancaller** (neutral) [warmly] Lantern. Thank you. That's a start.
- **baker** (neutral) [warmly] Take a biscuit for the road.

`songHal` (`scene_hal_shop`, day):
- **titancaller** (neutral) [gently] Hal, do you remember a song about the lighthouse?
- **hal** (smug) [proudly] "Count every sail." Obviously about a shopkeeper. Counting. Sales. **(approved)**
- **kit** (neutral) [deadpan] Sails. **(approved)**
- **titancaller** (neutral) [warmly] Thank you, Hal. Count every sail.

`songPieces` (after both, wherever he is; a quiet moment, no jokes):
- **titancaller** (neutral) [wistfully] A lantern. Sails, counted home. A song for keeping a light company.
- **titancaller** (worried) [gently] And I think I know how it ends.

Nobody asks how. She doesn't say. (She means the logbook; the player hears it in beat 11.)

### Kit's stuck nudges
When he's been around a few places with no progress, Kit drops a stronger hint each time: a nudge, a direction, a glint on the spot, then the trail on the map. The "where next?" button plays the same lines on demand.

**Strength 1, a nudge (any goal, rotating):**
- `stuck1a`: **kit** (neutral) [musingly] We've walked a lot of places. I think we're missing something.
- `stuck1b`: **kit** (neutral) [dryly] Lovely stroll. Are we going anywhere?
- `stuck1c`: **kit** (neutral) [thoughtfully] Something here still needs doing. I can feel it in my hat.

**Strength 2, a direction (one per goal):**
- `stuckClock`: **kit** (neutral) [helpfully] The clock tower. It's still pointing at nonsense.
- `stuckHal`: **kit** (neutral) [helpfully] Hal's shop. I need a hat. This is not optional.
- `stuckMarket`: **kit** (neutral) [helpfully] The market street. Something's been crashing around down there.
- `stuckCauseway`: **kit** (neutral) [helpfully] The lighthouse causeway. Let's at least look at it.
- `stuckTunnel`: **kit** (neutral) [helpfully] Tamsin's tunnel starts under the cove's old wreck.
- `stuckDock`: **kit** (neutral) [helpfully] The Sword Master's dock. Somebody's sitting in his chair.
- `stuckSong`: **kit** (neutral) [helpfully] Maren's still looking for her song. Try the baker, and Hal.
- `stuckEngine`: **kit** (worried) [urgently] The lighthouse, at dusk. That's where this ends.

**Strength 3, a glint:**
- `stuckGlint`: **kit** (neutral) [helpfully] There. See that glint? Start there.

**Strength 4, the trail on the map:**
- `stuckTrail`: **kit** (smug) [dryly] I've marked the way on the map. I'll pretend I didn't help.

### Kit's camp call (the play timer)
Never during a problem or a fight: they wait until it's over.

- `campSoon1`: **kit** (neutral) [helpfully] Five more minutes, then we make camp.
- `campSoon2`: **kit** (neutral) [matter-of-factly] Let's find a good stopping place. Camp soon.
- `campAfterFight`: **kit** (neutral) [warmly] That's the last fight for today. Let's make camp.
- `campNow`: **kit** (smug) [dryly] Camp. Fire's lit. The fiends can wait till tomorrow.
- `campMorning`: **kit** (neutral) [dryly] Good morning. The Captain snores, for the record.

Camp is `scene_camp` (night, a beach fire under the stars).

---

## Beat 9b. Jumble's audit (the second afternoon): his serious moment

### `auditSpotted`
- **Scene:** `scene_harbor`, the dock. Afternoon.
- **Staging:** Clamp walks up the *Misspelled*'s gangplank with his clipboard. The party ducks behind crates on the dock. Knox is behind them, out of Jumble's sight.

- **kit** (worried) [suspiciously] Clamp's boarding the Misspelled. With a clipboard.
- **gunner** (smug) [eagerly] Front-row seats. Get down.

### `jumbleAudit`
- **Scene:** the galleon's deck, seen from the dock. Afternoon.
- **Staging:** story card `story_jumble_audit` throughout. Jumble plays it big while Clamp reads, without looking up. The stamp lands (sound): the card shows IRRELEVANT on the file. The music drops out completely before Jumble's quiet line and stays out until the paperwork flies.

- **clamp** (neutral) [politely] Captain Jumble. Routine audit. This won't take long.
- **jumble** (angry) [outraged theatrical gravelly sinister pirate] An AUDIT? Of the MISSPELLED? [roaring] You tin-faced filing cabinet!
- **jumble** (laughing) [gleeful taunting gravelly sinister pirate] CLAMP. Scramble it, and what do you get? [cackling] P. CLAM!
- **jumble** (smug) [boastful gravelly sinister pirate] I've scared more kuh-NIGHTS than you've stamped forms!
- **clamp** (neutral) [flatly] Jumble. Sage school. Failed the final exam by one letter.
- **clamp** (neutral) [flatly] Assessment: unremarkable.
- *The stamp: IRRELEVANT.*
- *Silence. Jumble's plume droops.*
- **jumble** (worried) [low, hurt pirate] It was one letter. **(approved)**
- **clamp** (neutral) [politely] Next: the cargo hold.
- *Clamp walks below decks. On the dock, Knox half rises from behind the crates, then sits back down.*
- **spellwright** (worried) [wistfully] He studied harder than anyone I knew. **(approved)**

### `auditAfter`: back to full volume
- **Staging:** a beat later, the card closes and the music comes back. On deck, Jumble flings Clamp's forms into the air, and the letters on them scramble as they fall.

- **jumble** (laughing) [roaring gravelly sinister pirate] INSPECTOR! [cackling] You dropped your PAPERWORK!
- **clamp** (angry) [coldly] That was alphabetized.
- **jumble** (laughing) [gleeful gravelly sinister pirate] Not anymore!
- **knight** (neutral) [earnestly] Nobody should be stamped irrelevant. **(approved)**

---

## Beat 10. Old places, changed (any time after beat 7)

### `mapRemembering`: the first changed place
- **Staging:** the island map, the first time he opens it after beat 7. The old places glint.

- **kit** (shocked) [surprised] The island's remembering early. The crystal's close, and it knows.

### The temple
`hallGlowing` (`scene_temple_hall`, variant `library_open`; day):
- **spellwright** (shocked) [in awe] The tablets are glowing. The crystal's close enough to feel.
- **kit** (neutral) [dryly] And a door that wasn't open yesterday. Or for three hundred years.

`libraryArrive` (`scene_sage_library`; day, inside):
- **spellwright** (worried) [wistfully] My old reading room.

`librarySeat` (look: the empty seat; told once, a quiet moment):
- **spellwright** (worried) [wistfully] His seat. He used to sit right there and argue with the dictionary.
- **spellwright** (worried) [sadly] I should have told him. One letter is nothing.
- **knight** (neutral) [earnestly] You could still tell him.
- **spellwright** (neutral) [fondly] Perhaps. When he's ready to hear it.

- `librarySeatAgain` (later looks): **spellwright** (neutral) [fondly] Still saved.

`crestMap` (look: the lectern):
- **spellwright** (shocked) [delighted] A crest map! It points to a Legendary Weapon.
- **kit** (smug) [dryly] Sages loved a dramatic hiding place.

### The canyon
`albatrossParts` (`scene_canyon`, variant `parts`; late afternoon):
- **gunner** (shocked) [delighted] Her propeller! Bent. She's flown on a bent one before.
- **gunner** (worried) [wistfully] And Grandma's figurehead. She talked to it in storms.
- **gunner** (neutral) [fondly] Hold on, old girl. I'm getting you back in one piece. **(approved)**

- `albatrossPartsAgain` (later looks): **gunner** (smug) [cocky] Two pieces down. Several hundred to go.

### The lair
`lairDeep` (`scene_lair_deep`; inside):
- **kit** (worried) [warily] A deeper chamber. Glittering. And growling.
- *A hidden fight.*
- `lairDeepDone`: **kit** (smug) [dryly] Glittering. No longer growling.

### The grotto
`grottoCrab` (look: the tide pools, after beat 7):
- **kit** (neutral) [dryly] The crab's still humming Maren's song. Badly. But better.
- **titancaller** (laughing) [fondly] He's been practicing.

---

## Beat 11. The Drain Engine (the second dusk): the boss

### `duskFalls`: the call to the lighthouse
- **Scene:** wherever he is, once the second day's must-dos are done. Late afternoon.

- **kit** (worried) [warily] Sun's going down. Clamp's inspection should be about finished.
- **beastkeeper** (worried) [urgently] Grandpa climbs at dusk. We go now.

### `engineArrives`
- **Scene:** `scene_lighthouse`. Dusk.
- **Staging:** Clamp's voice over a loudspeaker. Then the story card `story_engine_arrives`, or the parent's film from it: the Drain Engine climbs out of the harbor on six iron legs and clamps onto the lighthouse. Its tanks fill with white-gold light and the lamp gutters. Lines resume over the film's last frame.

- **clamp** (neutral) [politely] Attention, Driftwood. Inspection complete. Collection begins now.
- *The Engine climbs. The claw closes on the tower.*
- **kit** (shocked) [urgently] It's drinking the light. The whole harbor's forgetting faster.
- **gunner** (shocked) [alarmed] The fiddler's holding his fiddle by the wrong end!
- **beastkeeper** (worried) [urgently] Grandpa. He's on the stairs. He's going up anyway.
- **knight** (angry) [determined] Then we keep that Engine busy until he's safe. Positions!

### The fight, phase 1 (`bg_lighthouse_rocks`, dusk)
- `engineIntro`: **kit** (worried) [urgently] Colossal, and it drains faster than we hit it. Keep it busy.
- `engineTitan`: **kit** (neutral) [matter-of-factly] Tidebreaker dents it. It just keeps drinking.

**Clamp, from the glass cockpit:**
- Start: **clamp** (neutral) [politely] Please remain still. You are being inventoried.
- Attack: **clamp** (smug) [politely] Confiscated.
- Attack: **clamp** (neutral) [politely] Resisting inventory: section nine. **(approved)**
- Attack: **clamp** (smug) [coldly] Your shield is now Dominion property. Probably.
- Hurt: **clamp** (neutral) [politely] That's a dent. There's a form for dents.
- Hurt: **clamp** (angry) [coldly] Damaging Dominion property. Noted.
- Big hit: **clamp** (shocked) [flustered] That was not on the schedule.
- Hit by a Titan: **clamp** (angry) [coldly] Titans are not permitted in a loading zone.
- Draining: **clamp** (smug) [politely] Draining at the scheduled rate. Thank you for your patience.
- Low: **clamp** (worried) [flustered] Section nine, subsection... I'll need more forms.

### `engineKeeper`: phase 2, "Goodnight, bird."
- **Staging:** the fight pauses. The view leans up the tower: the keeper reaches the lens, in the middle of all of it. From here to the end of the binding, no jokes and no Clamp.

- **beastkeeper** (worried) [urgently] Grandpa! Get down from there!
- *He doesn't hear her. He sets his lantern down by the lens.*
- **keeper** (neutral) [gently] Goodnight, bird.
- *A deep hum from the lens, like thunder a long way off. One prism lights.*
- **titancaller** (shocked) [in awe] There's a Titan in the light.
- **titancaller** (worried) [urgently] It's waking, and it's frightened of the dark. It needs true words about the storm.
- **titancaller** (neutral) [warmly] Write them. I'll sing it the rest.

### Binding Beaconwing (writing, with the Lantern Song)
- **Staging:** Maren stands beside the keeper at the lens and sings. The **Lantern Song** plays from its verse (section 2), then Hal's line (section 3), under the writing window. The keeper hums under her. He writes true words about the storm (what it sounds like, what the wind does, what the light does in it). **Live:** his words.

- `bindMissed`: **titancaller** (neutral) [gently] It heard you. Now show it the storm. The sound, the wind, the light.
- `bindWait`: **titancaller** (neutral) [calmly] It's listening. So am I.

### `beaconwingRises`
- **Staging:** the chorus (section 4) breaks over story card `story_beaconwing_wakes`, or the parent's film from it: the thunderbird unfolds out of the lens, beams for eyes, prisms for feathers, lightning in its wings. His words are read out in the movie-trailer voice, as Tidebreaker's are. Beaconwing tears the Engine off the tower; it falls into the harbor. The cockpit ejects.

- **clamp** (angry) [coldly] This isn't over. It's pending. **(approved)**
- *The ejected cockpit arcs off over the water. The Engine sinks.*

### `lanternLastLine`: "Goodnight, bright bird, goodnight."
- **Staging:** everything falls away. Section 5 of the Lantern Song: Maren alone, gently, at the lens, Beaconwing settling into the light behind it. On the last word the keeper's voice comes in under hers, and his lips move with it. No lines. Nobody explains. Hold, then fade.

---

## Beat 12. The harbor remembers (night into the third morning): the ending

### `endingLens`: the crystal goes in
- **Scene:** `scene_lamp_room` (variant `lit`), then story card `story_crystal_lit`. Night.
- **Staging:** Cade sets the new crystal in the cradle. The first narrator line plays as it settles; the card shows the light rolling over the harbor and the bells swinging on the second.

- **narrator** (neutral) [warmly] The new crystal settled into the great lens, and the lamp caught.
- **narrator** (neutral) [joyfully] Its light rolled over the harbor, carrying every true thing it had learned. And the bells rang.

### `endingTown`: what comes back
- **Scene:** `scene_harbor` (variant `remembered`): bells swinging, people out, bunting up. Night, lamps lit.
- **Staging:** quick cuts. The fiddler turns his fiddle round and plays. The recipe book fills. Hal stares at his board.

- **baker** (laughing) [joyfully] My recipes! Every page!
- **hal** (shocked) [horrified] It's right. Every total. To the coin.
- **hal** (worried) [wailing] I'm ruined!
- **kit** (smug) [dryly] Congratulations, Hal. You're honest.

### `endingKeeper`: her name
- **Scene:** `scene_lamp_room` (variant `lit`). Night.
- **Staging:** a quiet moment (`hush`). The keeper turns from the lens. He looks at Tamsin as if seeing her come up the stairs. Nobody else speaks, and nothing funny happens anywhere near it. Hold on them after his line and after hers.

- **keeper** (neutral) [gently] There you are. Tamsin.
- **beastkeeper** (worried) [tearfully] Hi, Grandpa.

### `endingThanks2`: on the gallery at dawn
- **Scene:** the lighthouse gallery. Dawn of the third morning.
- **Staging:** the party at the rail, the harbor waking below. Pockets is on the rail at the far end with both hats.

- **beastkeeper** (neutral) [matter-of-factly] A fiend into a friend. That's proof. I'm writing it down.
- **titancaller** (neutral) [warmly] I've only ever kept a song. This time, we found one.
- **kit** (neutral) [dryly] Officially: one crystal home, one Titan awake, one hat still missing.

### `endingHat`: back, and gone again
- **Staging:** Pockets scampers along the rail and plonks Kit's hat on Rivet's head. Rivet clanks, very proud, then hands it up to Kit. Kit takes off the tea cozy and puts the hat on. The morning bells ring, the first ordinary morning in weeks. Beaconwing lifts out of the lens for a lap of the harbor, and its downdraft blows the hat off Kit and onto Beaconwing's head as it flies away over the sea: story card `story_ch2_ending` (or the parent's film from it).

- **kit** (neutral) [deadpan] Close. **(approved)**
- *Rivet hands the hat over. Kit puts it on.*
- **kit** (smug) [warmly] Ah. Intimidating. **(approved)**
- *The morning bells. Beaconwing rises out of the lens.*
- **titancaller** (neutral) [warmly] Go and see your harbor. When it's dark, you won't be alone.
- *The downdraft. The hat lifts off Kit and settles on Beaconwing as it flies away.*
- **kit** (neutral) [deadpan] ...It suits him. **(approved)**
- *A beat. Kit puts the tea cozy back on.*
- **gunner** (smug) [fondly] Welcome back, Admiral Teapot.

### Chapter 2 complete
- **Staging:** the "Chapter 2 complete!" card counts it up over the full Lantern Song, and reads back his own words: Rivet's field note and the words that woke Beaconwing. No recorded lines.

### `endingJumble2`: Jumble sails for Smoke Mountain
- **Scene:** story card `story_jumble_smoke` (the *Misspelled* sailing toward a smoking volcano). The next night (see the open questions).
- **Staging:** Jumble at the wheel, sulking, Clamp's fine still tucked in his coat.

- **jumble** (angry) [sulking gravelly sinister pirate] A whole DAY of bells. For a BIRD. [disgusted] And a man with a CLIPBOARD.
- **jumble** (angry) [bitter gravelly sinister pirate] Three hundred years of scrambling, and HE gets noticed. With PAPERWORK!
- **jumble** (worried) [low gravelly pirate] Irrelevant. [roaring] I'll show them IRRELEVANT!
- **jumble** (laughing) [grand theatrical gravelly sinister pirate] Set course for Smoke Mountain! [doubtful] Which side is left? [confused] Hold on.

*To be continued.*

---

## Look lines for the new hotspots

| Hotspot | Key | Line |
|---|---|---|
| The clock tower, before | `clockTower` | (the conversation in beat 1) |
| The clock tower, after | `clockAgain` | **kit** (smug) [satisfied] Right on time. I'd tip my hat, but it's a tea cozy. |
| Hal's price board | `halBoard` | (beat 2) |
| The recipe book | `recipeBook` / `recipeBookOne` / `recipeBookFull` | (beat 2) |
| The logbook | `logbook` / `logbookAgain` | (beat 7) |
| The lens, before beat 11 | `lens` | **kit** (neutral) [matter-of-factly] The great lens. Big enough to walk inside. Its light is nearly out. |
| The lens, after beat 11 | `lensAwake` | **titancaller** (neutral) [fondly] He sleeps lighter now. He knows we're here. |
| The empty seat in the Sage library | `librarySeat` / `librarySeatAgain` | (beat 10) |
| The crest map | `crestMap` | (beat 10) |
| The Albatross parts | `albatrossParts` / `albatrossPartsAgain` | (beat 10) |
| The barricade | `barricade` | **kit** (worried) [dryly] "Inspection in progress." Laminated. He means it. |
| The menagerie tanks | `tanks` | **beastkeeper** (neutral) [matter-of-factly] Don't tap the glass. They remember who taps. |

---

## Continuity for this chapter

| Beat | Place | Picture | Time of day |
|---|---|---|---|
| 1 | The harbor | `story_harbor_arrival`, `scene_harbor`, `story_clamp_meets_jumble` | first morning |
| 2 | Hal's shop, the Salty Biscuit, the streets | `scene_hal_shop`, `scene_biscuit`, `scene_harbor` | late morning to noon |
| 3 | The market street | `scene_harbor` | first afternoon |
| 4 | The menagerie | `scene_menagerie` | first afternoon |
| 6 | The causeway, the cove, the sea cave | `scene_lighthouse`, `scene_cove` (`tide_out`), `scene_sea_cave` | first evening |
| 7 | The stairs, the lamp room | `story_keeper_climbs`, `scene_lamp_room`, `story_logbook` | first night |
| (camp) | The beach | `scene_camp` | night |
| 8 | The Sword Master's dock | `scene_sword_dock` | second morning |
| 9, 10 | Anywhere, old places | as each place | second day |
| 9b | The dock and the galleon | `story_jumble_audit` | second afternoon |
| 11 | The lighthouse | `scene_lighthouse`, `story_engine_arrives`, `story_beaconwing_wakes` | second dusk |
| 12 | The lamp room, the harbor, the gallery | `story_crystal_lit`, `scene_harbor` (`remembered`), `story_ch2_ending` | night into the third dawn |
| 12 | Jumble | `story_jumble_smoke` | the next night |

**Who meets whom:**
- Beat 1: everyone meets Clamp. Jumble sees Cade, Wren, Maren and Kit, but not Knox, who hides (and again in beat 9b). Jumble meets Maren here for the first time, though he doesn't learn her name.
- Beat 3: Tamsin meets everyone. She never meets Jumble this chapter.
- Beat 7: the keeper sees nobody. Beat 12 is the first time he really sees anyone, and it's her.
- Clamp never learns anyone's name. He doesn't ask. He has their file.

**The Crystal Code:** rule 40 (biscuits) pays off at the Salty Biscuit. Cade adds **rule 402: always share your shield** for Rivet. No other numbers are said.

**Running gags used:** "kuh-NIGHT" / "Still silent." (beat 1); "Still not ours. Still worse." (the cove, reused); Jumble's "Hold on." (the last line); Admiral Teapot (Wren, three times); Wren nicknames and Tamsin refuses (Crook, Captain Fizzbottom); Hal's sums; Clamp's forms; Pockets is not a pet; "Best day ever" (Wren, this time meaning it).

**Kit's hat:** Kit wears its chapter 1 spare until Hal's shop, then the tea cozy (`portraits_cozy`) for the rest of the chapter, except for one line at dawn. Pockets wears both tricorns (his and Kit's good one) everywhere until the gallery.

---

## Bends and open questions

**Where the outline had to bend:**
1. **Kit's spare hat.** Chapter 1 ends with Kit in a spare ("only my second most intimidating one"). So at Hal's, Kit isn't hatless: it sees Pockets in two hats, refuses "to chase that monkey in my second-best hat", and swaps the spare for the cozy. That also keeps a hatless Kit off the portraits.
2. **The keeper says "Goodnight." in beat 7 and "Goodnight, bird." in beat 11.** The logbook then answers the question "goodnight to whom?" and beat 11 pays it off, out loud, when the bird answers.
3. **How Tamsin arrives.** The party brings the Caged Drone down in a fight, so it crashes because of them (an event the player causes), and Tamsin stops Cade bursting what's inside. The fiend in the cage is a baby Wick Moth.
4. **The fog signs, Hal's totals, the clock, the recipe, Rivet's schedule and the tide table** are written with no numbers or words in the recorded lines; the outline's examples (6 × 40, 3:45 to 4:20, 8:15 for 50 minutes) become live puzzles.
5. **Clamp's "It's pending."** falls between the chorus and the last line of the Lantern Song (the Engine has to come off the tower before the quiet). It's a cold threat, not a joke, and the song's last line comes after it, alone.
6. **The bells ring twice:** once at night when the crystal goes in, and again at dawn as the town's ordinary morning bells, which set Beaconwing off on its lap. I think the second ringing is its own small payoff (the town remembers its routine), but if it feels like one event happening twice, the dawn can open on gulls instead.
7. **Jumble's coda is the next night**, so it comes after the dawn ending in order; his first line ("A whole DAY of bells") says time has passed.
8. **The fiddler's wrong end** is a line of Wren's in beat 11, because no picture in wave 08 shows him then. If a painting of the square at dusk is added, the line can go.

**Questions for the parent:**
1. **Pet names: decided (13 October).** Rivet, Fizz (Wren's jelly), Blot (Knox's slime) and Chime (Maren's hermit crab) are approved as named.
2. **Jumble's approved tag** is `[outraged sputtering pirate]`. His other tags say "gravelly sinister pirate", which keeps him from sounding like an ordinary man. Fine to make it `[outraged sputtering gravelly sinister pirate]`? The same goes for `[low, hurt pirate]` → `[low hurt gravelly pirate]`.
3. **Kit's "Tamsin, slow it down.": decided (13 October).** It stays as written, naming her, even though chapter 1's battle lines use roles.
4. **Time of day at the cove:** `scene_cove` is painted at sunrise, but beat 6 is evening. The lines don't name the time, but the `tide_out` variant could be painted at dusk instead.
5. **The lighthouse scene** is painted at dusk. I've kept it shut until the first evening (beat 6), so the morning seal in beat 1 is seen from the harbor.
6. **Tamsin's Wick Moth: decided (13 October).** The baby from the cage becomes a pet in a later chapter. Seed it here: it stays on her shoulder or in the menagerie, and it isn't anyone's pet yet.
7. **Not in this script, but noticed:** Kit's capture quips in `src/content/quips.js` say "Monster Arena" and "Collect them all", both close to other games' wording. Worth swapping when the battle lines are next recorded.

---

## Production list

### Lines to record (new)

| Speaker | Voice | Lines | Notes |
|---|---|---:|---|
| kit | existing | 111 | 57 story and look lines, 6 Pockets chases, 48 for the new systems (13 nudges, 9 teaching, 7 wild intros, 6 misses, 5 camp, 4 Grid, 4 in fights) |
| beastkeeper (Tamsin) | **new voice** | 84 | 61 story and look lines, 23 battle barks (21 barks, 2 command lines) |
| titancaller (Maren) | existing | 26 | |
| knight (Cade) | existing | 24 | |
| clamp | **new voice** | 23 | 13 story lines, 10 from the Drain Engine's cockpit |
| gunner (Wren) | existing | 18 | |
| spellwright (Knox) | existing | 18 | |
| jumble | existing | 16 | every tag opens with a pirate's voice |
| hal | **new voice** | 15 | |
| swordmaster | **new voice** | 12 | |
| baker | **new voice** | 9 | |
| keeper | **new voice** | 3 | plus the hum and the sung "goodnight" (below) |
| narrator | existing | 2 | |
| **Total** | | **361** | six new voices, 146 of their lines |

Reused from chapter 1, no cost: `wreckAgain` ("Still not ours. Still worse."). Repeated within this script and recorded once: Tamsin's "Tamsin." (beat 3).

No chapter 1 lines change, so **nothing needs re-recording.**

### Music
- **The Lantern Song** (`music_lantern_song`, about 75 seconds): Maren's voice, built like `music_maren_song`; sections 2 to 5 as approved, with the keeper's voice under hers on the last word. Used in beat 11 (sections 2 to 5, in two parts around Clamp's line) and in full under "Chapter 2 complete!".
- **The keeper's hum** (`music_keeper_hum`, about 8 seconds): section 1, an old man's wavering hum, no words. Beat 7.
- The `voice` agent makes both and reports the cost first. The keeper needs one voice for his three spoken lines, his hum and his sung "goodnight".

### Story cards each conversation uses (all in wave 08, Section J)

| Conversation | Card |
|---|---|
| `harborArrive` | `story_harbor_arrival` |
| `clampArrives` | `story_clamp_meets_jumble` |
| `keeperClimbs` | `story_keeper_climbs` |
| `logbook` | `story_logbook` (the game draws the line) |
| `jumbleAudit` | `story_jumble_audit` (the game draws IRRELEVANT) |
| `engineArrives` | `story_engine_arrives` (**film's first frame**) |
| `beaconwingRises` | `story_beaconwing_wakes` (**film's first frame**) |
| `endingLens` | `story_crystal_lit` |
| `endingHat` | `story_ch2_ending` (**film's first frame**) |
| `endingJumble2` | `story_jumble_smoke` |

Every other conversation plays over its place's painting (Section G) or a variant of it.

### Paintings
- Everything here is already in wave 08. Nothing new is needed.
- Optional: `scene_cove`'s `tide_out` variant painted at dusk (question 4).

### Films (the parent's, in Kling; all optional)
1. **The Drain Engine climbs out of the harbor** and clamps onto the lighthouse (from `story_engine_arrives`).
2. **Beaconwing unfolds out of the lens** (from `story_beaconwing_wakes`).
3. **The hat blows off Kit onto Beaconwing** as it flies away at dawn (from `story_ch2_ending`).

Until they exist, each card holds as a still under its lines.
