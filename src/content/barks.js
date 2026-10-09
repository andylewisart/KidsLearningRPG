// The heroes' battle barks: short, occasional lines in their own voices.
// Monkey Island humor: jokes land on themselves, each other or the fiends,
// never on him. No hero names here (he renames them); every line is pre-recorded
// by tools/audio/generate.mjs, so editing a line means re-running it.
//
// who:  knight | gunner | spellwright | titancaller
// when: start | attack | crit | hurt | low | ko | healed | swapIn | victory | cheer | encourage
// mood: a portrait expression (neutral, laughing, angry, shocked, smug, worried)

const lines = (who, table) =>
  Object.entries(table).flatMap(([when, list]) => list.map(([mood, text]) => ({ who, when, mood, text })));

export const BARKS = [
  // Earnest, formal and honor-bound; narrates his own legend; bad at jokes.
  ...lines("knight", {
    start: [
      ["neutral", "Chapter one: our hero stands firm. Chapter two: the fiends regret everything."],
      ["smug", "By the Code, I shall hold this line. The Code is very clear about lines."],
      ["neutral", "Stand behind me. My shield has room for everyone. It is a very large shield."],
    ],
    attack: [
      ["angry", "For honor, and for the correct answer!"],
      ["smug", "A strike worthy of the songs!"],
      ["neutral", "The Code says: strike true. I have struck true."],
    ],
    crit: [
      ["laughing", "Let the bards write this down. Slowly. With good handwriting."],
      ["shocked", "A legendary blow! I shall describe it at dinner for many years."],
      ["smug", "Ha! That one goes in the official chronicle."],
    ],
    hurt: [
      ["worried", "Oof. A mere dent. In the armor. And slightly in my pride."],
      ["angry", "Hmph. A worthy hit. I shall frown about it."],
      ["neutral", "My armor took that. My armor is fine. Mostly."],
    ],
    low: [
      ["worried", "My shield arm grows weary. The legend may need a short intermission."],
      ["worried", "I am, shall we say, strategically low on health."],
      ["shocked", "The Code permits a potion at a time like this. I checked twice."],
    ],
    ko: [
      ["worried", "The legend pauses. Briefly. For a nap."],
      ["worried", "Tell the bards I was very brave about this."],
    ],
    healed: [
      ["laughing", "Restored! The legend continues!"],
      ["smug", "My thanks. I feel at least forty percent more noble."],
      ["neutral", "Much better. Even my armor feels shinier."],
    ],
    swapIn: [
      ["angry", "Fear not! The shield has arrived!"],
      ["neutral", "Reporting for duty, exactly on time, as the Code requires."],
      ["smug", "Step aside, friend. This calls for some very formal sword work."],
    ],
    victory: [
      ["smug", "And so the fiends were vanquished, and the heroes were very tidy about it."],
      ["laughing", "Victory, by the Code! Also by math."],
      ["laughing", "A triumph! I shall celebrate with a joke. Why did the knight... no. I have forgotten the rest."],
    ],
    cheer: [
      ["laughing", "Splendid work! The Code salutes you."],
      ["smug", "Well reasoned! That was a true hero's answer."],
      ["shocked", "Excellent! Even my shield is impressed, and it is a shield."],
    ],
    encourage: [
      ["neutral", "No shame in it. Every legend has a tricky chapter."],
      ["neutral", "Steady. We try again, as the Code requires."],
      ["smug", "Even I miss sometimes. Usually on purpose. To stay humble."],
    ],
  }),

  // Cocky, fast-talking daredevil; nicknames every fiend; secretly the team's biggest cheerleader.
  ...lines("gunner", {
    start: [
      ["laughing", "Okay, fiends! Who wants to be the first to get a nickname?"],
      ["smug", "Locked, loaded and looking fabulous. Let's go!"],
      ["laughing", "Ooh, these ones look loud. I love loud."],
    ],
    attack: [
      ["laughing", "Pew pew! That's the technical term."],
      ["smug", "Special delivery, Mister Clanky!"],
      ["smug", "Bullseye! I'd sign it, but I'm busy."],
      ["laughing", "Hey, Wobbles! Catch!"],
    ],
    crit: [
      ["shocked", "Did you see that? Tell me you saw that!"],
      ["laughing", "Ka-blam! Best shot of the day! Until my next one."],
      ["laughing", "That was so loud my goggles fogged up!"],
    ],
    hurt: [
      ["angry", "Hey! Watch the hair!"],
      ["angry", "Oof! Okay, that one was rude."],
      ["shocked", "Ow! You scratched my brass arm. I just polished that!"],
    ],
    low: [
      ["worried", "Uh, small problem. I'm running low on not getting hit."],
      ["smug", "Low on health, high on style. That still counts, right?"],
      ["worried", "Could somebody pass me a potion? Asking for me."],
    ],
    ko: [
      ["worried", "Nobody look. I'm doing a cool fall."],
      ["worried", "I'm fine! Just resting my eyes. Dramatically."],
      ["smug", "Down, but still fabulous."],
    ],
    healed: [
      ["laughing", "Woo! Fully charged!"],
      ["laughing", "That potion tastes like victory. And a little bit like socks."],
      ["smug", "Back in action! Did you miss me?"],
    ],
    swapIn: [
      ["smug", "Make way! The fun one is here!"],
      ["laughing", "Did somebody order more noise?"],
      ["laughing", "Tag me in! Tag me in! Oh. I'm in."],
    ],
    victory: [
      ["laughing", "Ha! Too easy! Okay, medium easy."],
      ["laughing", "Now that's what I call a sky-pirate party!"],
      ["smug", "We won! Hey, Shiny, you can stop posing now."],
    ],
    cheer: [
      ["laughing", "Yes! You're a math machine!"],
      ["laughing", "Boom! Nailed it! Total captain material."],
      ["laughing", "That's my crewmate! Woo!"],
    ],
    encourage: [
      ["neutral", "Hey, I miss shots all the time. Never twice, though. Go get it!"],
      ["smug", "Shake it off! The next one's ours."],
      ["neutral", "No biggie. Even sky-pirates hit a cloud sometimes."],
    ],
  }),

  // Mysterious, ancient and whispery, until a word gets interesting. Polite, a little pompous.
  ...lines("spellwright", {
    start: [
      ["smug", "I have studied these fiends for three hundred years. Also, I read about them on the way here."],
      ["shocked", "The ancient runes stir. Ooh! And one of them is a silent E!"],
      ["neutral", "Behold. My spellbook is open to the good page."],
    ],
    attack: [
      ["neutral", "By the ancient letters... zap!"],
      ["smug", "Spelled correctly, cast correctly. As it should be."],
      ["smug", "A spell! With every vowel in its proper place."],
    ],
    crit: [
      ["shocked", "Magnificent! Spelled perfectly, down to the very last letter!"],
      ["laughing", "Ooh, ooh! Did you see the double letters glow?"],
      ["smug", "Three hundred years of study, for that exact moment."],
    ],
    hurt: [
      ["worried", "Oof. My hood is crooked."],
      ["angry", "Ow. That was rude, and also poorly worded."],
      ["angry", "Hmph! I was in the middle of a sentence!"],
    ],
    low: [
      ["worried", "My glow is flickering. This is not ideal."],
      ["worried", "I am running low on magic. And on dignity."],
      ["worried", "Perhaps a potion? Spelled P, O, T, I, O, N. Quickly, please."],
    ],
    ko: [
      ["worried", "I'll just... lie here and think about my choices."],
      ["neutral", "Fine. I needed a nap anyway. Three hundred years is a long time."],
    ],
    healed: [
      ["laughing", "Ahh. Restored, like a fresh new page."],
      ["smug", "Delightful. That potion was made with care."],
      ["shocked", "My glow returns! Ooh, it's even a little brighter."],
    ],
    swapIn: [
      ["shocked", "Did someone say spelling? I came as fast as my little feet allow."],
      ["smug", "Make room. The book and I have arrived."],
      ["smug", "The ancient one is here. That's me. I'm the ancient one."],
    ],
    victory: [
      ["laughing", "Victory. Spelled V, I, C, T, O, R, Y. A lovely word."],
      ["smug", "Just as the ancient texts foretold. Well, my notes."],
      ["laughing", "Splendid! I shall write this in my book. In cursive."],
    ],
    cheer: [
      ["shocked", "Ooh! Correct! Every piece in its proper place!"],
      ["smug", "Exquisite. I could not have done better. Well. Slightly."],
      ["laughing", "Yes! That was beautifully done!"],
    ],
    encourage: [
      ["neutral", "That one is tricky. It took me a hundred years to learn it."],
      ["neutral", "Patience. Answers reveal themselves to those who try again."],
      ["smug", "Not quite, but very close. The letters believe in you."],
    ],
  }),

  // Calm, wise and poetic; grand when summoning; warm big-sister energy.
  ...lines("titancaller", {
    start: [
      ["neutral", "The sea is calm, and so am I. Let's begin."],
      ["smug", "Breathe in. Breathe out. Now let's show them what we've got."],
      ["neutral", "My Titan is listening, far out in the waves. Let's make it proud."],
    ],
    attack: [
      ["angry", "Words have power. Watch."],
      ["angry", "Like a wave against stone!"],
      ["smug", "Feel the tide turn!"],
    ],
    crit: [
      ["laughing", "Rise, and roar! Oh, that was wonderful."],
      ["shocked", "The ocean itself cheered for that one."],
      ["laughing", "A storm of a strike! Beautiful."],
    ],
    hurt: [
      ["worried", "Oof. The tide pulls back, but it always returns."],
      ["neutral", "Ouch. That's alright. I've been splashed worse."],
      ["angry", "That stung. I'm still standing."],
    ],
    low: [
      ["worried", "I'm running low. Even the ocean has a low tide."],
      ["worried", "I could use a little help over here, friends."],
      ["worried", "My staff is flickering. Let's be careful."],
    ],
    ko: [
      ["worried", "I'm going to float here for a moment. Like seaweed."],
      ["neutral", "The tide goes out. It'll come back in. I promise."],
    ],
    healed: [
      ["laughing", "Thank you. Like a cool wave on a hot day."],
      ["neutral", "Much better. The tide is rising again."],
      ["smug", "I can feel the sea in my bones again."],
    ],
    swapIn: [
      ["neutral", "I'm here. The waves told me you needed me."],
      ["smug", "Stand back, everyone. Let me handle this one."],
      ["laughing", "The tide brings me in!"],
    ],
    victory: [
      ["laughing", "Well done, all of you. The sea is calm again."],
      ["laughing", "Listen. Even the waves are cheering."],
      ["smug", "Now that was a story worth telling."],
    ],
    cheer: [
      ["laughing", "Beautifully done. I knew you had it."],
      ["smug", "Yes! That's the spirit of a true hero."],
      ["laughing", "Lovely work. You make it look easy."],
    ],
    encourage: [
      ["neutral", "That's alright. Every wave falls before it rises again."],
      ["neutral", "Take a breath. You've got this."],
      ["smug", "So close! Try again. I'm right here with you."],
    ],
  }),
];

/** Two-line exchanges at the start of a fight (both speakers must be on the field). */
export const BANTER = [
  {
    lines: [
      { who: "gunner", mood: "smug", text: "Hey, Shiny! Try not to trip over your own shield this time." },
      { who: "knight", mood: "angry", text: "That was one time, and the ground was being dishonorable." },
    ],
  },
  {
    lines: [
      { who: "knight", mood: "angry", text: "Fiends! You face the mightiest heroes in all the land!" },
      { who: "spellwright", mood: "smug", text: "Of all the land. Not in. But a very fine speech." },
    ],
  },
  {
    lines: [
      { who: "gunner", mood: "laughing", text: "I'm gonna call that one Clanky McGee." },
      { who: "spellwright", mood: "smug", text: "Going to. Not gonna. But I do like Clanky McGee." },
    ],
  },
  {
    lines: [
      { who: "knight", mood: "smug", text: "Why did the knight bring a ladder to battle? To reach the high... honor. Ha." },
      { who: "gunner", mood: "shocked", text: "Oh no. The jokes have started." },
    ],
  },
  {
    lines: [
      { who: "titancaller", mood: "neutral", text: "Stay close, everyone. And remember to breathe." },
      { who: "knight", mood: "smug", text: "I am always breathing. It is part of the Code." },
    ],
  },
  {
    lines: [
      { who: "gunner", mood: "smug", text: "Bet I hit more fiends than you." },
      { who: "knight", mood: "neutral", text: "A true knight does not make bets. But I accept. And I shall win." },
    ],
  },
  {
    lines: [
      { who: "spellwright", mood: "shocked", text: "I sense a great disturbance in the vowels." },
      { who: "titancaller", mood: "laughing", text: "That's just the fiends. They're very loud vowels." },
    ],
  },
];

export const BARK_MOMENTS = ["start", "attack", "crit", "hurt", "low", "ko", "healed", "swapIn", "victory", "cheer", "encourage"];
