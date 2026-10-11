/**
 * THE SPELLS PAGE'S DATA: the Verse vocabulary page XI offers.
 *
 * A spell in Harpine is a SENTENCE. A caster does not tick spells off a list;
 * she holds WORDS, picked here at creation, re-chosen at each rest once the
 * preparation rite exists, and the spells she can cast are the sentences
 * those words can form. Page XI is therefore a word picker, never a spell
 * list. The sentence table itself (which word-sequences form which spells) is
 * combat data and belongs to the battle engine when it is built; nothing on
 * page XI needs it or shows it.
 *
 * CONVENTIONS THIS FILE KEEPS:
 *   - Declared order IS render order, the original's registry order. The four
 *     tail words (wild, thorn, wind, song) sit last because the original added
 *     them to its combat tongue first and mirrored them into the chargen
 *     registry afterward, at the tail; its own comment calls the period where
 *     the two tables disagreed the bug to never repeat.
 *   - `incant` is the word as spoken (the row's name); `meaning` is the English
 *     gloss (the row's description). Both are display copy verbatim, interior
 *     spaces included ("pune o", "con pren", "sa cius", "lum e").
 *   - `noVerbal` marks a word castable without a voice. NO word carries it
 *     today, it is the escape hatch the silenced are promised ("a word that
 *     needs none") and the original never yet minted one. The hook is kept so
 *     the data is ready the moment such a word exists.
 *
 * WHO GETS THE PAGE is not this file's datum, classes.js already carries
 * `casts` / `castsAt` per path, and the Feral voiceless gate is behaviour that
 * lives in the step. What this file adds is the one casting fact classes.js
 * cannot express: how deep each casting class's slots reach at level 1.
 */

/*,,. THE THREE TONGUES A SPELL CAN BE SPOKEN IN (Rose 2026-09-25) ,,,
   Rose's rules, written up as "The Verse: Tongues and Corruption" (Downloads/
   verse-corruption-rules-1.pdf) and drawn from his language reference (Desktop/
   Systems/tongues-of-harpine.pdf). Most spells are the goddess's: her nineteen
   words, spaced and whole. Two tongues can also carry one. KOTUQ is the devils'
   (Hungarian and Inuktitut stock) and EMETU the shades' (Akkadian and
   Sumerian). Each does it two ways: a PURE spell is spoken wholly in that
   tongue, a CORRUPTED one is hers with one of their words fused into it.

   THE LETTERS ARE CODE'S JOB, and that is his rule too ("Agents write the
   language; code writes the letters"). So a tongue word is stored as its STOCK
   form and its spoken form is derived here, by the tongue's own transform, and
   never typed by hand:
     Kotuq  every vowel in a word becomes that word's first vowel
     Emetu  every consonant is devoiced (b>p, d>t, g>k, g-circumflex>k, z>s,
            v>f), then the final sound is dropped
   One consequence worth saying: the PDF prints `kabit` (Daze) with its second
   vowel untouched; the rule makes it `kabat`. The rule wins here, and the Daze
   sentence reads the same either way because the whole sentence collapses.

   THE TRANSFORMS SIT ABOVE THE TABLE ON PURPOSE. The rows below call them while
   the module is still loading, and a `const` reached before its own line is a
   ReferenceError, not undefined -- the trap that took the spells page out on
   2026-09-20. */
const TONGUE_KOTUQ = "kotuq", TONGUE_EMETU = "emetu", TONGUE_HERS = "hers";

/* Hungarian's vowels, both cases. `y` is NOT one: it is the second letter of
   gy and ny (vagy, arnyek), and harmony that treated it as a vowel would eat
   them. */
const KOTUQ_VOWELS = "aáeéiíoóöőuúüűAÁEÉIÍOÓÖŐUÚÜŰ";
const isKotuqVowel = (c) => KOTUQ_VOWELS.includes(c);

/** Kotuq's harmony collapse: every vowel becomes the word's first vowel. */
export function kotuqHarmony(word) {
    const chars = Array.from(String(word || "").normalize("NFC"));
    const first = chars.find(isKotuqVowel);
    if (!first) return chars.join("");
    const lower = first.toLowerCase(), upper = first.toUpperCase();
    return chars.map((c) => (!isKotuqVowel(c) ? c
        : (c === c.toUpperCase() && c !== c.toLowerCase()) ? upper : lower)).join("");
}

/* Emetu's devoicing, his list in the PDF's Speaking section; the sonorants
   (l, m, n, r) have no voiceless partner and stay as they are */
const EMETU_DEVOICE = { b: "p", d: "t", g: "k", "ĝ": "k", z: "s", v: "f",
                        B: "P", D: "T", G: "K", "Ĝ": "K", Z: "S", V: "F" };

/** Emetu's decay: devoice every consonant, then drop the final sound. */
export function emetuDecay(word) {
    const chars = Array.from(String(word || "").normalize("NFC"))
        .map((c) => EMETU_DEVOICE[c] || c);
    chars.pop();
    return chars.join("");
}

/* a tongue row: the stock is kept, the spoken form is derived from it */
const kotuq = (id, stock, source, meaning, use) =>
    ({ id, incant: kotuqHarmony(stock), meaning, tongue: TONGUE_KOTUQ, stock, source, use });
const emetu = (id, stock, source, meaning, use) =>
    ({ id, incant: emetuDecay(stock), meaning, tongue: TONGUE_EMETU, stock, source, use });

/** The words of the Verse, page order: her nineteen first, then Kotuq's, then Emetu's. */
/*,,. HOW MANY WORDS A CASTER RISES WITH -- SUPERSEDED, AND KEPT ONLY AS A FLOOR ,,,
   v1's flat one, for every caster in the game. Rose ruled it out on 2026-09-19:
   the number is banded by the casting ability's total score now (`verseQuota`,
   further down this file, with his words on it). This constant stays because a
   body with no score to read at all still has to be dealt something, and one
   word is what the game shipped with. Nothing should reach for it otherwise. */
export const WORD_QUOTA = 1;

export const WORDS = [
    { id: "bathe",     incant: "avari",    meaning: "Bathe" },
    { id: "world",     incant: "orbis",    meaning: "World" },
    { id: "flames",    incant: "ignis",    meaning: "Flames" },
    { id: "entropy",   incant: "tabis",    meaning: "Entropy" },
    { id: "strike",    incant: "pune o",   meaning: "Strike" },
    { id: "embrace",   incant: "con pren", meaning: "Embrace" },
    { id: "enemy",     incant: "hast",     meaning: "Enemy" },
    { id: "ally",      incant: "sa cius",  meaning: "Ally" },
    { id: "lightning", incant: "fulga",    meaning: "Lightning" },
    { id: "light",     incant: "lum e",    meaning: "Light" },
    { id: "mind",      incant: "menta",    meaning: "Mind" },
    { id: "shadow",    incant: "umris",    meaning: "Shadow" },
    { id: "death",     incant: "murti",    meaning: "Death" },
    { id: "bind",      incant: "ligo",     meaning: "Bind" },
    { id: "self",      incant: "ipa",      meaning: "Self" },
    { id: "wild",      incant: "silva",    meaning: "Wild" },
    { id: "thorn",     incant: "spina",    meaning: "Thorn" },
    { id: "wind",      incant: "venti",    meaning: "Wind" },
    { id: "song",      incant: "carmen",   meaning: "Song" },

    /*,,. KOTUQ, THE DEVILS' TONGUE (Rose's table, verse-corruption-rules p.3) ,,,
       Charm, compulsion and deception, and `ar`, the price that marks every
       bargain spell. Held only by someone who speaks it: Kotuq is the Infernal
       already in data/faith.js LANGUAGES (TONGUE_LANGUAGE below). The id is the
       stock with its marks folded off, so a VERSES row reads plainly. */
    kotuq("ar",      "ár",      "Hungarian", "Price",          "marks every price spell"),
    kotuq("kabit",   "kábít",   "Hungarian", "Daze",           "Daze"),
    kotuq("alom",    "álom",    "Hungarian", "Dream",          "Sleep"),
    kotuq("nevet",   "nevet",   "Hungarian", "Laughs",         "Hideous Laughter"),
    kotuq("kot",     "köt",     "Hungarian", "Bind, contract", "hold, sleep"),
    kotuq("test",    "test",    "Hungarian", "Body",           "Hold Person"),
    kotuq("elme",    "elme",    "Hungarian", "Mind",           "the target's mind"),
    kotuq("ellen",   "ellen",   "Hungarian", "Against",        "the enemy, in devil spells"),
    kotuq("vagy",    "vágy",    "Hungarian", "Desire",         "charm"),
    kotuq("parancs", "parancs", "Hungarian", "Command",        "command"),
    kotuq("igen",    "igen",    "Hungarian", "Yes",            "suggestion, domination"),
    kotuq("felejt",  "felejt",  "Hungarian", "Forget",         "memory"),
    kotuq("atiq",    "atiq",    "Inuktitut", "Name",           "geas"),
    kotuq("al",      "ál",      "Hungarian", "False",          "disguise, glamer"),
    kotuq("csal",    "csal",    "Hungarian", "Deceive",        "misdirection"),
    kotuq("kep",     "kép",     "Hungarian", "Image",          "figments"),
    kotuq("rejt",    "rejt",    "Hungarian", "Hide",           "invisibility"),
    kotuq("delibab", "délibáb", "Hungarian", "Mirage",         "terrain illusions"),
    kotuq("arnyek",  "árnyék",  "Hungarian", "Shadow",         "shadow illusions"),

    /*,,. EMETU, THE SHADES' TONGUE (Rose's table, verse-corruption-rules p.4) ,,,
       Necromancy aimed at the living, and `lemnu`, the evil that turns a cure
       into an inflict. Held only by someone who speaks it; Emetu is the Shade
       tongue added to LANGUAGES alongside this. */
    emetu("lemnu",   "lemnu",   "Akkadian", "Evil",           "marks every rot spell: cure into inflict"),
    emetu("nakru",   "nakru",   "Akkadian", "Enemy",          "the target, in shade spells"),
    emetu("lapatu",  "lapātu",  "Akkadian", "Touch",          "touch spells"),
    emetu("rakasu",  "rakāsu",  "Akkadian", "Bind",           "Doom"),
    emetu("mutu",    "mūtu",    "Akkadian", "Death",          "slay outright"),
    emetu("mitu",    "mītu",    "Akkadian", "A dead one",     "raise the dead"),
    emetu("gidim",   "gidim",   "Sumerian", "Ghost",          "spirits, speaking with the dead"),
    emetu("pagru",   "pagru",   "Akkadian", "Corpse",         "command the body"),
    emetu("sahar",   "saḫar",   "Sumerian", "Dust",           "wither: Chill Touch"),
    emetu("mursu",   "murṣu",   "Akkadian", "Sickness",       "contagion"),
    emetu("ekletu",  "ekletu",  "Akkadian", "Darkness",       "blindness, deafness"),
    emetu("napistu", "napištu", "Akkadian", "Life, breath",   "drain life"),
    emetu("ensu",    "enšu",    "Akkadian", "Weak",           "fatigue: Touch of Fatigue"),
    emetu("puluhtu", "puluḫtu", "Akkadian", "Fear",           "Doom, Scare"),
];

/*,,. WHICH TONGUE A WORD IS, AND WHO MAY HOLD IT (Rose 2026-09-25) ,,,
   "The tongue is the gate. Anyone who speaks Kotuq or Emetu can hold its words,
   and nobody gets them free." Her own nineteen need no tongue beyond the
   caster's own. The LANGUAGE each tongue is, is data/faith.js's: Kotuq is the
   Infernal already on that list, Emetu the Shade tongue added to it.
   THIS GATES HOLDING, and only holding. A sorcerer or bard holds no words and
   is not asked (Rose: "Everyone that isn't Feral can cast spells"); Feral holds
   no tongue's word because Feral speaks nothing at all (state.js spokenTongues
   silences it to an empty list). */
export const TONGUE_LANGUAGE = Object.freeze({ [TONGUE_KOTUQ]: "Infernal", [TONGUE_EMETU]: "Emetu" });
/** what each tongue is called on a page */
export const TONGUE_NAME = Object.freeze({ [TONGUE_HERS]: "the goddess's tongue",
                                           [TONGUE_KOTUQ]: "Kötuq", [TONGUE_EMETU]: "Emetu" });
const WORD_BY_ID = Object.fromEntries(WORDS.map((w) => [w.id, w]));

/** the tongue a word (an id or a row) belongs to: "hers", "kotuq" or "emetu" */
export const tongueOfWord = (w) => {
    const row = typeof w === "string" ? WORD_BY_ID[w] : w;
    return (row && row.tongue) || TONGUE_HERS;
};

/** may a body that speaks `tongues` (language names) hold this word */
export const canHoldWord = (w, tongues) => {
    const t = tongueOfWord(w);
    if (t === TONGUE_HERS) return !!(typeof w === "string" ? WORD_BY_ID[w] : w);
    return Array.isArray(tongues) && tongues.includes(TONGUE_LANGUAGE[t]);
};

/** every word such a body may hold, page order */
export const holdableWords = (tongues) => WORDS.filter((w) => canHoldWord(w, tongues));

/*,,. THE FIVE KINDS OF SPELL, READ OFF ITS WORDS (Rose's PDF, "Five kinds of spell") ,,,
   hers    her words only
   devil   pure Kotuq            price   one Kotuq word, then hers
   shade   pure Emetu            rot     one Emetu word, then hers
   The kind is not stored on a row: the words already say it, and a second copy
   of that fact is the drift this file's header calls the bug to never repeat.
   Anything else is not one of the five and is spoken plainly, word by word. */
export function verseKind(ids) {
    const t = (Array.isArray(ids) ? ids : []).map(tongueOfWord);
    if (!t.length || t.every((x) => x === TONGUE_HERS)) return "hers";
    if (t.every((x) => x === TONGUE_KOTUQ)) return "devil";
    if (t.every((x) => x === TONGUE_EMETU)) return "shade";
    if (t.length > 1 && t[0] !== TONGUE_HERS && t.slice(1).every((x) => x === TONGUE_HERS))
        return t[0] === TONGUE_KOTUQ ? "price" : "rot";
    return null;
}

/*,,. HOW A SENTENCE IS SPOKEN, IN PARTS (Rose's PDF, "Speaking") ,,,
   One function, three modes, because until today the spoken sentence was
   joined by hand in about sixteen places and every one of them would have
   printed a welded spell as loose words.
     hers     her words, spaced and whole
     pure     Kotuq welds the WHOLE sentence into one word, then every vowel
              becomes the first; Emetu decays each word and nothing welds
     corrupt  the corruption comes first and welds to the next goddess word
              only; two-part words close their space first (sa cius > sacius,
              pune o > puneo); the tongue's transform runs over that compound;
              the rest stays Latin
   A PART IS ONE UNIT OF THE LENGTH LAW, so the parts are also the chant: a
   welded devil spell still takes one beat a word, and a corruption "welds into
   its host and adds no length" -- the compound is one part. `sep` is what goes
   BEFORE a part when the parts are joined: nothing inside a weld, a space
   anywhere else. */
const closeSpace = (s) => String(s).split(" ").join("");
const incantOfId = (id) => (WORD_BY_ID[id] ? WORD_BY_ID[id].incant : String(id));

export function spokenParts(ids) {
    const list = Array.isArray(ids) ? ids : [];
    const kind = verseKind(list);
    if (kind === "devil") {
        const pieces = list.map((id) => closeSpace(incantOfId(id)));
        const welded = Array.from(kotuqHarmony(pieces.join("")));
        const out = [];
        let at = 0;
        for (const p of pieces) {
            const n = Array.from(p).length;
            out.push({ text: welded.slice(at, at + n).join(""), sep: "" });
            at += n;
        }
        return out;
    }
    if (kind === "price" || kind === "rot") {
        const [corruption, host, ...rest] = list;
        const compound = closeSpace(incantOfId(corruption)) + closeSpace(incantOfId(host));
        const text = kind === "price" ? kotuqHarmony(compound) : emetuDecay(compound);
        return [{ text, sep: "" }, ...rest.map((id) => ({ text: incantOfId(id), sep: " " }))];
    }
    return list.map((id) => ({ text: incantOfId(id), sep: " " }));
}

/** the sentence as it is spoken, whole */
export const speakWords = (ids) =>
    spokenParts(ids).map((p, i) => (i ? p.sep : "") + p.text).join("");

/** the first `n` parts of it, which is what a chant has said so far */
export const speakPartial = (ids, n) =>
    spokenParts(ids).slice(0, Math.max(0, n)).map((p, i) => (i ? p.sep : "") + p.text).join("");

/** THE LENGTH LAW'S COUNT: every word, except a corruption, which welds into its
    host and adds no length ("Welding is display, never arithmetic") */
export const verseLength = (ids) => spokenParts(ids).length;

/*,,. ONE BEAT OF A SPOKEN VERSE (Rose 2026-09-25) ,,,
   "On the sorcerer side they do nothing their words automatically go through 0.55
   seconds at a time." One beat a PART (spokenParts, the length law's unit), for
   every caster, in a fight and on the grass alike: the fight's chant and the
   field's listening race both read this, so a sentence takes as long to say in
   one place as in the other. It replaces the fight's 0.52 s (0.95 s while a
   counter window stood) and the field's 0.9 s with its 1.8 s floor. */
export const VERSE_BEAT_MS = 550;

/** THE WHOLE CLOCK OF ONE SPOKEN SENTENCE, begun to landed: the breath before the first
    word, then a beat for each part, the last of them hanging its beat before the spell
    lands. battle.js chantThen runs exactly this many beats; the field's race
    (world/incant.js) waits exactly this long. */
export const verseClockMs = (ids) => VERSE_BEAT_MS * (verseLength(ids) + 1);

/**
 * The hard ceiling on a hand: nine, what the combat tongue allows a caster
 * with 9th-level slots. A CEILING, not the budget, the cap below decides what
 * a given body has actually earned.
 */
export const MAX_WORDS = 9;

/** True while the word must be spoken aloud, every word today. The silenced
    (Feral) may only be offered words where this is false. */
export const needsVoice = (word) => !word.noVerbal;

/**
 * Deepest spell LEVEL each casting class reaches at character level 1, read
 * off the 3.5 spells-per-day tables. Bard casts at 1st but holds only
 * cantrips (0). Paladin and Ranger have no slot row at all before class
 * level 4, null, not 0: at creation they have nothing to hold words FOR.
 */
export const LEVEL1_TOP_SLOT = {
    Cleric: 1, Druid: 1, Bard: 0, Sorcerer: 1, Wizard: 1,
    Paladin: null, Ranger: null, Savant: 1,
};

/**
 * SPELLS PER DAY AT CHARACTER LEVEL 1, off the 3.5 class tables: [0th, 1st].
 * No class casts 2nd level at 1st level, which is a fact with teeth rather
 * than an omission -- it means a 2nd-level sentence (misty step, by the
 * reading in battle/verse.js) is genuinely out of reach until 3rd level, and
 * that is the book's answer, not a shortfall in the engine.
 *
 * NOBODY HAD A SLOT BEFORE THIS TABLE EXISTED. roster.js's UNSHEETED hands
 * out `slots: 0, maxSlots: 0, slots1: 0, maxSlots1: 0` and nothing in the
 * game ever raised them, so `hasSlots` answered no to every spell and the
 * whole Verse -- sentences, hand, release ladder, counterspell, all of it
 * written and all of it correct -- has never once been castable by anyone,
 * in a fight or out of one. The pay rung was a closed door with no key cut.
 */
export const SLOTS_AT_1 = {
    Sorcerer: [5, 3], Wizard: [3, 1], Cleric: [3, 2], Druid: [3, 1],
    Bard: [2, 0], Paladin: [0, 0], Ranger: [0, 0],
    /* the Savant prepares like a wizard (BOOK_KIND below), so it casts like one.
       Its absence here and from SLOTS_BY_LEVEL is why a Savant had no slots at all. */
    Savant: [3, 1],
};

/**
 * SPELLS PER DAY BY CHARACTER LEVEL: [0th, 1st, 2nd, 3rd, 4th, 5th, 6th, 7th, 8th, 9th].
 *
 * Rose, 2026-09-15, on misty step being out of reach: "that'd be an issue if
 * we couldnt just ignore the rules... so we can test the bloody system... if
 * you want to follow the rules thats great just make a level 5 character or
 * something." Following them is cheaper than bending them, so here is the
 * table -- but the game had no notion of a character level at all before this,
 * which is why it did not exist.
 *
 * IT USED TO STOP AT SIX AND AT 2nd LEVEL, and the note here defended that: the
 * engine kept two slot pools, so "a 3rd-level slot is a number with nowhere to
 * be spent". Rose, 2026-09-19, asked for Dispel Magic -- a 3rd-level spell --
 * and when I offered to house-rule it down instead: *"do you think I'm going to
 * stop at 2nd level spell slots?"* No. The pools are indexed now (battle.js
 * slotPoolFor), so every column below has somewhere to be spent.
 *
 * AND THE OLD NOTE'S REAL WARNING STILL STANDS, word for word: "a table of
 * twenty rows transcribed from memory today is twenty chances to be quietly
 * wrong about a game everybody can look up." So none of this is from memory.
 *
 * READ OFF dndtools.net ON 2026-09-19, one class page at a time, the same way
 * data/srdSpells.js was read off d20srd.org. Every row is the book's; nothing
 * here is authored. TWO THINGS MAKE THAT CHECKABLE RATHER THAN A CLAIM:
 *
 *   THE OVERLAP AGREES. Rows 1-6 of Sorcerer, Wizard, Druid, Cleric and Bard
 *     came back IDENTICAL to the rows that were already in this file, which
 *     were transcribed independently on 09-15. Two sources, one answer.
 *
 *   THE PALADIN'S HIGH ROWS CAME BACK CORRUPT and are NOT what the fetch said.
 *     It returned level 17 as "2 1 2 1" -- non-monotonic, which these tables
 *     never are -- and levels 13, 14 and 16 disagreed with its own ranger page.
 *     Paladins and rangers share one progression in 3.5, and the RANGER page
 *     came back clean and self-consistent, so the ranger's numbers are used for
 *     both. That is a cross-check between two pages of one source, not a repair
 *     from memory, and it is written down here so the next reader can re-check
 *     exactly the rows I did not take at face value.
 *
 * THE CLERIC'S COLUMNS INCLUDE THE DOMAIN SLOT (her +1 at every level she has
 * spells), which is why hers read one higher than the Druid's all the way down.
 * That was this file's rule before tonight and it is kept.
 * A `0` for Bard, Paladin and Ranger is the book's own: the level is reached,
 * but nothing is granted except what a high casting ability adds on top.
 * PALADIN AND RANGER HAVE NO 0-LEVEL SPELLS, so their first column is always 0.
 */
export const SLOTS_BY_LEVEL = {
    Sorcerer: [
        [5, 3, 0, 0, 0, 0, 0, 0, 0, 0], [6, 4, 0, 0, 0, 0, 0, 0, 0, 0],
        [6, 5, 0, 0, 0, 0, 0, 0, 0, 0], [6, 6, 3, 0, 0, 0, 0, 0, 0, 0],
        [6, 6, 4, 0, 0, 0, 0, 0, 0, 0], [6, 6, 5, 3, 0, 0, 0, 0, 0, 0],
        [6, 6, 6, 4, 0, 0, 0, 0, 0, 0], [6, 6, 6, 5, 3, 0, 0, 0, 0, 0],
        [6, 6, 6, 6, 4, 0, 0, 0, 0, 0], [6, 6, 6, 6, 5, 3, 0, 0, 0, 0],
        [6, 6, 6, 6, 6, 4, 0, 0, 0, 0], [6, 6, 6, 6, 6, 5, 3, 0, 0, 0],
        [6, 6, 6, 6, 6, 6, 4, 0, 0, 0], [6, 6, 6, 6, 6, 6, 5, 3, 0, 0],
        [6, 6, 6, 6, 6, 6, 6, 4, 0, 0], [6, 6, 6, 6, 6, 6, 6, 5, 3, 0],
        [6, 6, 6, 6, 6, 6, 6, 6, 4, 0], [6, 6, 6, 6, 6, 6, 6, 6, 5, 3],
        [6, 6, 6, 6, 6, 6, 6, 6, 6, 4], [6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
    ],
    Wizard: [
        [3, 1, 0, 0, 0, 0, 0, 0, 0, 0], [4, 2, 0, 0, 0, 0, 0, 0, 0, 0],
        [4, 2, 1, 0, 0, 0, 0, 0, 0, 0], [4, 3, 2, 0, 0, 0, 0, 0, 0, 0],
        [4, 3, 2, 1, 0, 0, 0, 0, 0, 0], [4, 3, 3, 2, 0, 0, 0, 0, 0, 0],
        [4, 4, 3, 2, 1, 0, 0, 0, 0, 0], [4, 4, 3, 3, 2, 0, 0, 0, 0, 0],
        [4, 4, 4, 3, 2, 1, 0, 0, 0, 0], [4, 4, 4, 3, 3, 2, 0, 0, 0, 0],
        [4, 4, 4, 4, 3, 2, 1, 0, 0, 0], [4, 4, 4, 4, 3, 3, 2, 0, 0, 0],
        [4, 4, 4, 4, 4, 3, 2, 1, 0, 0], [4, 4, 4, 4, 4, 3, 3, 2, 0, 0],
        [4, 4, 4, 4, 4, 4, 3, 2, 1, 0], [4, 4, 4, 4, 4, 4, 3, 3, 2, 0],
        [4, 4, 4, 4, 4, 4, 4, 3, 2, 1], [4, 4, 4, 4, 4, 4, 4, 3, 3, 2],
        [4, 4, 4, 4, 4, 4, 4, 4, 3, 3], [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    ],
    Druid: [
        [3, 1, 0, 0, 0, 0, 0, 0, 0, 0], [4, 2, 0, 0, 0, 0, 0, 0, 0, 0],
        [4, 2, 1, 0, 0, 0, 0, 0, 0, 0], [5, 3, 2, 0, 0, 0, 0, 0, 0, 0],
        [5, 3, 2, 1, 0, 0, 0, 0, 0, 0], [5, 3, 3, 2, 0, 0, 0, 0, 0, 0],
        [6, 4, 3, 2, 1, 0, 0, 0, 0, 0], [6, 4, 3, 3, 2, 0, 0, 0, 0, 0],
        [6, 4, 4, 3, 2, 1, 0, 0, 0, 0], [6, 4, 4, 3, 3, 2, 0, 0, 0, 0],
        [6, 5, 4, 4, 3, 2, 1, 0, 0, 0], [6, 5, 4, 4, 3, 3, 2, 0, 0, 0],
        [6, 5, 5, 4, 4, 3, 2, 1, 0, 0], [6, 5, 5, 4, 4, 3, 3, 2, 0, 0],
        [6, 5, 5, 5, 4, 4, 3, 2, 1, 0], [6, 5, 5, 5, 4, 4, 3, 3, 2, 0],
        [6, 5, 5, 5, 5, 4, 4, 3, 2, 1], [6, 5, 5, 5, 5, 4, 4, 3, 3, 2],
        [6, 5, 5, 5, 5, 5, 4, 4, 3, 3], [6, 5, 5, 5, 5, 5, 4, 4, 4, 4],
    ],
    /* the druid's table with the domain slot added at every level she has
       spells at all -- the book prints it as "+1" and this file folds it in */
    Cleric: [
        [3, 2, 0, 0, 0, 0, 0, 0, 0, 0], [4, 3, 0, 0, 0, 0, 0, 0, 0, 0],
        [4, 3, 2, 0, 0, 0, 0, 0, 0, 0], [5, 4, 3, 0, 0, 0, 0, 0, 0, 0],
        [5, 4, 3, 2, 0, 0, 0, 0, 0, 0], [5, 4, 4, 3, 0, 0, 0, 0, 0, 0],
        [6, 5, 4, 3, 2, 0, 0, 0, 0, 0], [6, 5, 4, 4, 3, 0, 0, 0, 0, 0],
        [6, 5, 5, 4, 3, 2, 0, 0, 0, 0], [6, 5, 5, 4, 4, 3, 0, 0, 0, 0],
        [6, 6, 5, 5, 4, 3, 2, 0, 0, 0], [6, 6, 5, 5, 4, 4, 3, 0, 0, 0],
        [6, 6, 6, 5, 5, 4, 3, 2, 0, 0], [6, 6, 6, 5, 5, 4, 4, 3, 0, 0],
        [6, 6, 6, 6, 5, 5, 4, 3, 2, 0], [6, 6, 6, 6, 5, 5, 4, 4, 3, 0],
        [6, 6, 6, 6, 6, 5, 5, 4, 3, 2], [6, 6, 6, 6, 6, 5, 5, 4, 4, 3],
        [6, 6, 6, 6, 6, 6, 5, 5, 4, 4], [6, 6, 6, 6, 6, 6, 5, 5, 5, 5],
    ],
    /* a bard's tongue stops at 6th; the four columns past it are always 0 */
    Bard: [
        [2, 0, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [3, 1, 0, 0, 0, 0, 0, 0, 0, 0], [3, 2, 0, 0, 0, 0, 0, 0, 0, 0],
        [3, 3, 1, 0, 0, 0, 0, 0, 0, 0], [3, 3, 2, 0, 0, 0, 0, 0, 0, 0],
        [3, 3, 2, 0, 0, 0, 0, 0, 0, 0], [3, 3, 3, 1, 0, 0, 0, 0, 0, 0],
        [3, 3, 3, 2, 0, 0, 0, 0, 0, 0], [3, 3, 3, 2, 0, 0, 0, 0, 0, 0],
        [3, 3, 3, 3, 1, 0, 0, 0, 0, 0], [3, 3, 3, 3, 2, 0, 0, 0, 0, 0],
        [3, 3, 3, 3, 2, 0, 0, 0, 0, 0], [4, 3, 3, 3, 3, 1, 0, 0, 0, 0],
        [4, 4, 3, 3, 3, 2, 0, 0, 0, 0], [4, 4, 4, 3, 3, 2, 0, 0, 0, 0],
        [4, 4, 4, 4, 3, 3, 1, 0, 0, 0], [4, 4, 4, 4, 4, 3, 2, 0, 0, 0],
        [4, 4, 4, 4, 4, 4, 3, 0, 0, 0], [4, 4, 4, 4, 4, 4, 4, 0, 0, 0],
    ],
    /* PALADIN AND RANGER SHARE ONE PROGRESSION in 3.5, and these are the
       ranger page's numbers, used for both: the paladin page came back corrupt
       (see the header). No 0-level spells, and nothing at all until 4th. */
    Paladin: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0], [0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 0], [0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 0, 0, 0, 0, 0, 0], [0, 2, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 2, 1, 1, 1, 0, 0, 0, 0, 0], [0, 2, 2, 1, 1, 0, 0, 0, 0, 0],
        [0, 2, 2, 2, 1, 0, 0, 0, 0, 0], [0, 3, 2, 2, 1, 0, 0, 0, 0, 0],
        [0, 3, 3, 3, 2, 0, 0, 0, 0, 0], [0, 3, 3, 3, 3, 0, 0, 0, 0, 0],
    ],
    Ranger: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0], [0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 0], [0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 0, 0, 0, 0, 0, 0], [0, 2, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 2, 1, 1, 1, 0, 0, 0, 0, 0], [0, 2, 2, 1, 1, 0, 0, 0, 0, 0],
        [0, 2, 2, 2, 1, 0, 0, 0, 0, 0], [0, 3, 2, 2, 1, 0, 0, 0, 0, 0],
        [0, 3, 3, 3, 2, 0, 0, 0, 0, 0], [0, 3, 3, 3, 3, 0, 0, 0, 0, 0],
    ],
};

/** the highest spell level any class reaches, and so the width of a slot row */
export const TOP_SPELL_LEVEL = 9;

/*,,. THE SRD'S PRINTED "0", WHICH THE ROWS ABOVE CANNOT SAY (read off d20srd.org 2026-09-26) ,,,
   Rose, the same day: "SRD (Raw) is pretty strict about leveled spells." The Bard, Paladin and Ranger tables
   print two different things the rows above both write as 0: a "—", a spell level the class has not
   reached, and a "0", one it has reached with no base slot. The book on the second, class by class:
     Bard: "When Table: The Bard indicates that the bard gets 0 spells per day of a given spell level, he
       gains only the bonus spells he would be entitled to based on his Charisma score for that spell level."
     Paladin and Ranger, word for word the same with Wisdom.
   So a Bard 2 with Charisma 12 casts one 1st-level spell a day, and a Paladin 4 with Wisdom 12 one of his;
   read as "—", both had nothing. These are the printed zeros, [class level, spell level], copied from the
   three tables (Bard 2/4/7/10/13/16; Paladin and Ranger 4, 5, 8, 9, 11, 14). */
export const BONUS_ONLY = {
    Bard: [[2, 1], [4, 2], [7, 3], [10, 4], [13, 5], [16, 6]],
    Paladin: [[4, 1], [5, 1], [8, 2], [9, 2], [11, 3], [14, 4]],
    Ranger: [[4, 1], [5, 1], [8, 2], [9, 2], [11, 3], [14, 4]],
};
/** is this entry the book's printed "0": a level reached, paid only by bonus spells */
export const bonusOnlyAt = (path, level, spellLevel) =>
    (BONUS_ONLY[path] || []).some(([l, s]) => l === Math.floor(level || 1) && s === spellLevel);

/*,,. THE HIGHEST SPELL LEVEL A CLASS CASTS, BY THE BOOK (Rose 2026-09-26: "SRD (Raw) is pretty strict about
   leveled spells") ,,,
   Two gates, both the SRD's, read that day:
     The Basics: "a spellcaster must be of high enough class level to be able to cast spells of a given spell
       level", which is the class table at the CLASS's level: a slot there, or a printed 0 a bonus spell fills.
     Every caster's own page: "To learn or cast a spell, a sorcerer must have a Charisma score equal to at
       least 10 + the spell level"; the wizard's "To learn, prepare, or cast a spell ... an Intelligence score
       equal to at least 10 + the spell level"; the bard's the same on Charisma; divine casters "must have a
       Wisdom score of 10 + the spell's level" to prepare one.
   And what the second does NOT take away (Arcane Spells, Spell Slots): "A spellcaster who lacks a high enough
   ability score to cast spells that would otherwise be his or her due still gets the slots but must fill them
   with spells of lower level." So this caps what she can CAST, and the purse is left as it is.
   `score` is the casting ability's total score; a caller that does not know it passes null and only the
   table is asked. Returns the level, 0 for cantrips only, or null for a class that casts nothing yet. */
export const castableTopAt = (path, level, score) => {
    const per = slotsAt(path, level);
    const known = score != null && Number.isFinite(+score);
    const mod = known ? Math.floor((+score - 10) / 2) : 0;
    for (let L = per.length - 1; L >= 0; L--) {
        const reached = per[L] > 0 || (L >= 1 && bonusOnlyAt(path, level, L) && known && bonusSlots(mod, L) > 0);
        if (!reached) continue;
        if (known && +score < 10 + L) continue;
        return L;
    }
    return null;
};

/** her spells per day at this level, clamped into the table's range. */
/*,,. THE SAVANT HAD NO ROW AT ALL, AND SO COULD NOT CAST (found in game, 2026-09-20) ,,,
   Rose: *"You definitely didnt smoke test it in game..."* He was right, and this is what the game
   said the moment I stood a fight up and looked at her: `slotsBy: [0,0,0,0,0,0,0,0,0,0]`.

   `SLOTS_BY_LEVEL` is keyed by class and has never held a Savant. So `slotsAt("Savant", 1)` came
   back `[0,0,0]` and `topSlotAt("Savant", 1)` came back NULL -- a class declared a caster in
   classes.js (`casts: "BEST", castsAt: 1`), handed a spellbook by creation page XV, and unable to
   cast one word of it. It cost her the WORDS too: `handCap` falls through to `wordCap(mod, top)`
   when no casting score is stamped, and a null top slot gives the floor, so a Savant who chose
   three words at creation woke up holding one.

   NOT AN INVENTED TABLE. The wizard's, because the Savant's own row already says it prepares like
   a wizard -- data/spells.js BOOK_KIND: "the Savant prepares like a wizard, so it keeps a book",
   and creation deals it a wizard's allowance of first-level sentences. A class that learns like a
   wizard and casts on Intelligence casts as often as one. Written as a REFERENCE, not a copy, so
   the two cannot drift.
   ROSE'S TO RULE. The Savant is his own class, not the book's; if he wants it to cast less often
   than a wizard (it already carries d12 hit dice, full BAB, eight skills and every class's list),
   this is the one line to change. What is not arguable is that it needed a row. */
SLOTS_BY_LEVEL.Savant = SLOTS_BY_LEVEL.Wizard;

export const slotsAt = (path, level) => {
    const rows = SLOTS_BY_LEVEL[path];
    if (!rows) return [0, 0, 0];
    const i = Math.max(0, Math.min(rows.length - 1, (level || 1) - 1));
    return rows[i].slice();
};

/** the deepest spell LEVEL she reaches, 0 for a cantrip-only caster and null
    for a class whose casting has not begun. The hand size rides this
    (`wordCap`), so it is the same question page XI asks at creation, just
    asked of a character who may be past her first level. */
export const topSlotAt = (path, level) => {
    const rows = SLOTS_BY_LEVEL[path];
    if (!rows) return null;
    const per = slotsAt(path, level);
    for (let lvl = per.length - 1; lvl >= 1; lvl--) if (per[lvl] > 0) return lvl;
    /* nothing leveled: a cantrip caster reads 0, and a class that has not
       begun at all (Paladin, Ranger before 4th) reads null, which is the
       distinction LEVEL1_TOP_SLOT has always drawn */
    return per[0] > 0 ? 0 : null;
};

/**
 * SRD bonus spells from a high casting ability: one more of spell level L
 * for every four points of modifier past L, and none at all for cantrips.
 * A +2 gives one extra 1st and one extra 2nd; a +0 gives nothing.
 * Bonus spells are only ever ADDED to a level the class already reaches,
 * which is the caller's business, not this line's.
 */
export const bonusSlots = (castingMod, level) =>
    level < 1 ? 0 : Math.max(0, Math.floor((castingMod - level) / 4) + 1);

/**
 * The word budget, the original's AUTHORED law: 1 word, + the casting
 * modifier, + 1 per spell level beyond first; a class whose slots have not
 * begun (top slot below 1st) earns nothing; never below 1 for a body the
 * page admits at all. At level 1 that is `1 + max(0, casting mod)` for
 * Cleric / Druid / Sorcerer / Wizard and a flat 1 for Bard.
 *
 * KNOWN DIVERGENCE FROM WHAT THE ORIGINAL SHIPPED: its creation page asked
 * this law of a record that never carries the field the law reads, so every
 * caster's quota computed to the floor, exactly 1, whatever the class or
 * scores, and the picked word was then read back by nothing in the world.
 * Which quota page XI enforces is Rose's ruling to make, not this file's;
 * both candidates pass through this function (the shipped behaviour is
 * `wordCap(0, 1)`).
 */
/*,,. HOW MANY VERSES A CASTER MAY HOLD, WHICH IS ROSE'S LAW AND NOT THE BOOK'S ,,,
   2026-09-19. Everything else about casting in this game follows the SRD; this
   one number is his, because the Verse is his:

     "my ruling on verses known stays but everything else is to respect what the
      srd says. Since verses is my thing it makes sense that 10 gives you 2
      because 2 is the floor amount needed to cast anything and 1 buys you
      nothing while 12(+1) gives you the ability to cast at least a level 1
      spell."

   AND THE WORD COUNTS AGREE WITH HIM, which is why the floor is 2 and not 1: a
   cantrip is a two-word sentence (`avari sa cius`, `lum e ipa`) and a
   first-level one is three (`pune o hast pune o`). So two Verses is the least
   that can say anything at all, and the third is exactly what buys a spell.
   One Verse would buy nothing, which is what the shipped flat quota of 1 was
   doing to every caster in the game.

   IT IS READ FROM THE SCORE, NOT THE MODIFIER, and that is not a style choice:
   his bands cut ACROSS modifier boundaries. A score of 6 and a score of 7 are
   both a -2 modifier, and he puts one at 0 Verses and the other at 1. The
   modifier cannot express this rule; only the score can.

     6 and below  0     nothing it holds can finish a sentence
     7 - 9        1     a word, and no sentence to spend it in
     10 - 11      2     the floor: a cantrip
     12 - 19      3     a first-level sentence
     20 - 27      4
     28 - 35      5     and onward, in the SRD's own eight-wide bands

   The bands above 11 are the Bonus Spells table's own (d20srd.org, Ability
   Modifiers and Bonus Spells), so the shape follows the book even though the
   numbers in it are his. */
export const verseQuota = (score) => {
    const n = Math.floor(Number(score));
    if (!(n >= 7)) return 0;
    if (n <= 9) return 1;
    if (n <= 11) return 2;
    return 3 + Math.floor((n - 12) / 8);
};

/*,,. THE OLD WORD BUDGET, KEPT ONLY AS A DOOR ,,,
   This was `1 + max(0, castingMod) + (topSlot - 1)` -- the v1 authored law,
   which Rose's ruling above replaces. Callers that still hold a modifier
   instead of a score come through here; it converts back to the nearest score
   so nobody gets a silently different answer from the one true table. A caller
   that HAS the score should call verseQuota directly. */
export const wordCap = (castingMod, level1TopSlot) =>
    (level1TopSlot === null || level1TopSlot === undefined)
        ? 1
        : verseQuota(10 + 2 * (Number(castingMod) || 0));
/*,,. AND IT NO LONGER GATES ON THE TOP SLOT, which was a real regression I
   introduced and test_casting caught within the minute. The v1 formula used
   the slot depth twice: as a gate ("a class whose slots have not begun earns
   nothing") and as a term (+1 per level past first). Rose's law uses neither
   -- it is the SCORE and only the score -- so keeping the gate meant a
   Bard/Wizard read the BARD's top slot of 0, earned nothing, and lost the
   typed line that her prepared half is supposed to unlock.
   WHO MAY HOLD WORDS AT ALL is a different question and already has an owner:
   `verseGate` refuses a non-caster, and a Paladin at 1st hears "not yet" from
   the page. A cap should answer how many, never whether.
   THE null CASE STAYS, and the difference between it and 0 is the whole point:
   `null` is a class with NO ROW in the slot table (a Fighter, a Paladin before
   4th) and keeps the old floor of 1 so nothing downstream sees NaN; `0` is a
   class that HAS a row and reaches only cantrips (a Bard), which is a caster
   and gets his banded number like any other. Folding the two together is what
   cost the Bard/Wizard her line. */
/* `== null` and `!(x >= 1)` rather than `=== null` and `< 1`: the table has a
   row only for the seven classes that ever cast, so a Fighter or a Rogue
   arrives here as UNDEFINED. `undefined < 1` is false, so the old test fell
   through to the arithmetic and returned NaN, and a NaN cap silently slices a
   hand to nothing rather than saying no. It never showed while only page XI
   called this, because the page asks its caster question first (`verseGate`
   below) and never reaches a non-caster. The world asks in a different order. */


/**
 * IS THE VERSE OPEN TO THIS BODY AT ALL, and WHY NOT -- page XI's own gate,
 * lifted out of the page so the world cannot answer it differently.
 *
 * The page (steps/spells.js) has always asked this in four branches, in an
 * order that matters: Feral closes the tongue before the class question is
 * worth asking, so a Feral Wizard and a Feral Fighter hear the same refusal;
 * a forsaken divine caster is refused for the GOD, not the training, while
 * its class datum still reads `castsAt: 1`. Getting that order wrong
 * somewhere else would not crash anything, it would just quietly disagree
 * with the page that dealt her the words, which is the worse failure.
 *
 * @param self  the creation record (its classes section, with its deity; flaws, feats)
 * @param cls   BASE_CLASSES[self.classes.path], or the rows of EVERY class the record
 *              carries (data/classes.js classRowsOf): multiclassing is a thing
 *              (Rose 09-16), and one caster class among several opens the Verse
 * @param deps  { isSilenced, unanswered, silentWordCount } from the data
 *              modules the caller already holds; passed in rather than
 *              imported so this file keeps its no-dependency standing.
 * @returns { open, why } -- why is 'feral' | 'forsaken' | 'notyet' | 'never'
 *          | 'open', a key, never copy: the page and the world each write
 *          their own words for it.
 */
export const verseGate = (self, cls, deps) => {
    const rows = (Array.isArray(cls) ? cls : [cls]).filter(Boolean);
    const d = deps || {};
    const silent = d.isSilenced ? d.isSilenced(self && self.flaws) : false;
    const forsaken = d.unanswered
        ? d.unanswered(self && self.classes && self.classes.path, self && self.classes && self.classes.deity) : false;
    const casts = rows.some((r) => r.castsAt === 1) && !forsaken;
    if (silent) {
        /* the two doors the refusal copy has always promised: Silent Spell
           (the casting itself, so it opens the whole lexicon) or a word that
           needs no voice. Either one and a Feral caster speaks. */
        const baseNameOf = (t) => String(t).replace(/ \([^)]*\)$/, "");
        const hasSilentSpell = ((self && self.feats && self.feats.taken) || [])
            .some((f) => baseNameOf(f) === "Silent Spell");
        const noVoiceWords = d.silentWordCount != null
            ? d.silentWordCount : WORDS.filter((w) => !needsVoice(w)).length;
        if (!(casts && (hasSilentSpell || noVoiceWords > 0)))
            return { open: false, why: "feral" };
    }
    if (forsaken) return { open: false, why: "forsaken" };
    if (!rows.some((r) => r.casts)) return { open: false, why: "never" };
    if (!rows.some((r) => r.casts && r.castsAt <= 1)) return { open: false, why: "notyet" };
    return { open: true, why: "open" };
};

/* ============================================================================
   THE SPELLBOOK: which spells a caster actually KNOWS.

   Rose, 2026-09-19, looking at the Somatic Selection on a level-1 wizard and
   seeing Teleport and Control Weather in it: *"Why are all of these spells in
   my spell book if I didnt add them to it in character creation?"*

   THE HONEST ANSWER WAS THAT NOTHING EVER ASKED. `knowsVerse` checked one
   thing -- are this sentence's words in today's hand -- so every caster in the
   game implicitly knew all twenty-two verses, and the only reason a first-level
   wizard could not speak Control Weather is that she cannot hold nine words. A
   wide enough hand and she could. That is not a spellbook; that is no gate at
   all, and data/srdSpells.js predicted this in its own header when it said the
   spellbook "that decides which of them a given caster knows" was still owed.

   THREE KINDS OF CASTER, AND THE SRD TREATS THEM DIFFERENTLY. This is the part
   that cannot be one rule:

     A WIZARD HAS A BOOK. At 1st level she knows every 0-level spell plus
       "3 + Int modifier" 1st-level spells, and adds two of her choice at every
       new level (plus whatever she scribes). The book is a THING she owns and
       can grow in the field.

     A SPONTANEOUS CASTER HAS A LIST. Sorcerer and Bard know a fixed number per
       spell level, set by the class table, and it only ever changes on
       level-up. Nothing found in a dungeon adds to it. That is the other half
       of the trade he named: she never prepares, and she never learns.

     A PREPARED DIVINE CASTER KNOWS ITS WHOLE LIST. Cleric, Druid, Paladin and
       Ranger choose each day from every spell their class has, because the
       spells are lent rather than learned. There is no book to gate, so they
       are not gated.

   READ OFF dndtools.net ON 2026-09-19, the same source and the same day as the
   spells-per-day tables above.
   ========================================================================== */

/** Sorcerer "Spells Known", [0th..9th] by class level 1-20 */
export const KNOWN_BY_LEVEL = {
    Sorcerer: [
        [4, 2, 0, 0, 0, 0, 0, 0, 0, 0], [5, 2, 0, 0, 0, 0, 0, 0, 0, 0],
        [5, 3, 0, 0, 0, 0, 0, 0, 0, 0], [6, 3, 1, 0, 0, 0, 0, 0, 0, 0],
        [6, 4, 2, 0, 0, 0, 0, 0, 0, 0], [7, 4, 2, 1, 0, 0, 0, 0, 0, 0],
        [7, 5, 3, 2, 0, 0, 0, 0, 0, 0], [8, 5, 3, 2, 1, 0, 0, 0, 0, 0],
        [8, 5, 4, 3, 2, 0, 0, 0, 0, 0], [9, 5, 4, 3, 2, 1, 0, 0, 0, 0],
        [9, 5, 5, 4, 3, 2, 0, 0, 0, 0], [9, 5, 5, 4, 3, 2, 1, 0, 0, 0],
        [9, 5, 5, 4, 4, 3, 2, 0, 0, 0], [9, 5, 5, 4, 4, 3, 2, 1, 0, 0],
        [9, 5, 5, 4, 4, 4, 3, 2, 0, 0], [9, 5, 5, 4, 4, 4, 3, 2, 1, 0],
        [9, 5, 5, 4, 4, 4, 3, 3, 2, 0], [9, 5, 5, 4, 4, 4, 3, 3, 2, 1],
        [9, 5, 5, 4, 4, 4, 3, 3, 3, 2], [9, 5, 5, 4, 4, 4, 3, 3, 3, 3],
    ],
    /* a bard's tongue stops at 6th, so the last three columns are always 0 */
    Bard: [
        [4, 0, 0, 0, 0, 0, 0, 0, 0, 0], [5, 2, 0, 0, 0, 0, 0, 0, 0, 0],
        [6, 3, 0, 0, 0, 0, 0, 0, 0, 0], [6, 3, 2, 0, 0, 0, 0, 0, 0, 0],
        [6, 4, 3, 0, 0, 0, 0, 0, 0, 0], [6, 4, 3, 0, 0, 0, 0, 0, 0, 0],
        [6, 4, 4, 2, 0, 0, 0, 0, 0, 0], [6, 4, 4, 3, 0, 0, 0, 0, 0, 0],
        [6, 4, 4, 3, 0, 0, 0, 0, 0, 0], [6, 4, 4, 4, 2, 0, 0, 0, 0, 0],
        [6, 4, 4, 4, 3, 0, 0, 0, 0, 0], [6, 4, 4, 4, 3, 0, 0, 0, 0, 0],
        [6, 4, 4, 4, 4, 2, 0, 0, 0, 0], [6, 4, 4, 4, 4, 3, 0, 0, 0, 0],
        [6, 4, 4, 4, 4, 3, 0, 0, 0, 0], [6, 5, 4, 4, 4, 4, 2, 0, 0, 0],
        [6, 5, 5, 4, 4, 4, 3, 0, 0, 0], [6, 5, 5, 5, 4, 4, 3, 0, 0, 0],
        [6, 5, 5, 5, 5, 4, 4, 0, 0, 0], [6, 5, 5, 5, 5, 5, 4, 0, 0, 0],
    ],
};

/** how a class comes by what it knows: a book, a fixed list, or the whole list */
export const BOOK_KIND = {
    Wizard: "book", Sorcerer: "known", Bard: "known",
    Cleric: "all", Druid: "all", Paladin: "all", Ranger: "all",
    /* the Savant prepares like a wizard, so it keeps a book (Rose 09-17) */
    Savant: "book",
};

/**
 * HOW MANY SPELLS OF EACH LEVEL THIS BODY MAY KNOW, [0th..9th].
 *
 * `null` for a class that knows its whole list -- which is NOT the same as
 * "none" and must not be written as a row of zeros, or a cleric would wake up
 * knowing nothing. A caller checks BOOK_KIND, or takes null as "no gate".
 */
export const knownAt = (path, level) => {
    const kind = BOOK_KIND[path];
    if (kind !== "book" && kind !== "known") return null;
    const lvl = Math.max(1, Math.min(20, level || 1));
    if (kind === "known") {
        const rows = KNOWN_BY_LEVEL[path];
        return rows ? rows[lvl - 1].slice() : null;
    }
    /* A WIZARD'S BOOK, SRD: "all 0-level spells" plus "3 + Int modifier"
       first-level ones at 1st, and two more of any level she can cast at each
       new level after. The Intelligence part is the caller's, because this
       file does not know her scores; it is added by startingBook below. */
    const out = new Array(TOP_SPELL_LEVEL + 1).fill(0);
    out[0] = Infinity;                       // every cantrip, by the book
    out[1] = 3;                              // +Int mod, added by the caller
    for (let l = 2; l <= lvl; l++) out[1] += 0;   // the two-per-level are CHOSEN, not free
    return out;
};

/*,,. HOW MANY SENTENCES A NEW CASTER PICKS, AND WHO PICKS THEM ,,,
   Rose, 2026-09-19: *"remember sorcs and wizards are different wiz gets the
   book sorc get spells no book check srd"*. Checked, and quoted, because the
   numbers are the whole point of the function:

     WIZARD -- "begins play with a spellbook containing all 0-level wizard
     spells ... plus three 1st-level spells of your choice", and "for each
     point of Intelligence bonus the wizard has, the spellbook holds one
     additional 1st-level spell of your choice."
     SORCERER -- "begins play knowing four 0-level spells and two 1st-level
     spells of your choice", and no spellbook at all.

   THE DIFFERENCE THAT MATTERS ON SCREEN is `pickCantrips`. A wizard's cantrips
   are not chosen -- she has all of them and always will -- so offering her a
   cantrip picker would be offering a choice that is not hers to make. A
   sorcerer's four ARE chosen, and in this game that choice is hollow only
   because the Verse holds two; the caller compares these numbers against what
   the Verse actually has and says so out loud rather than dealing short.

   It lives here, with the tables, because the creation page and the seat's
   forge must deal the same hand. One rule, two dealers.
   @returns {{cantrips:number, firsts:number, pickCantrips:boolean, book:boolean}|null}
     null for a class that keeps no list of its own (divine preparers) or
     casts nothing; `cantrips` may be Infinity, meaning "every one there is". */
export const startingPicks = (path, level, intMod) => {
    const kind = BOOK_KIND[path];
    if (kind !== "book" && kind !== "known") return null;
    const row = knownAt(path, level || 1);
    if (!row) return null;
    const book = kind === "book";
    const firsts = book ? row[1] + Math.max(0, +intMod || 0) : row[1];
    /*,,. THE SAVANT CHOOSES ITS ORISONS TOO (Rose 2026-09-20) ,,,
       *"the cantrip like the 1st level shares slots... so..."*

       A wizard's row says `Infinity` at 0 level, because the book's rule is
       "all 0-level WIZARD spells" -- nine of the thirteen this game has. Give
       that to a Savant, whose list is all seven at once, and "all" means every
       cantrip in the game, free, while its first-level sentences come out of
       one small shared purse. He looked at the two halves and ruled them the
       same: the orisons are an ALLOWANCE, chosen, spent across whichever lists
       it likes, exactly as the firsts are.

       THE NUMBER IS THE SAME NUMBER, which is what "like the 1st level" says
       and is the one thing here worth his second look: three plus Intelligence,
       its own purse, not shared WITH the firsts. One line to change if he wants
       orisons cheaper or dearer than sentences.

       IT LIVES HERE AND NOT ON THE PAGE so the seat's forge (src/forge.js
       bookPage) deals the same hand; two dealers of one rule is the drift this
       file's own header calls the bug to never repeat. */
    const savant = path === "Savant";
    return {
        book,
        cantrips: savant ? firsts : row[0],
        /* the Int bonus is a WIZARD's, and only a bonus: a penalty never takes
           a sentence away from the three the book promises */
        firsts,
        pickCantrips: savant ? true : !book,
    };
};

/*,,. READING A HAND BACK OUT OF WHAT SOMEBODY SAID (Rose 2026-09-20, item 5) ,,,
   A seat answers WORDS: with INCANTS, because incants are what it is shown;
   the game stores word IDS. This turns one into the other, and it lives here
   rather than in world/void.js because WORDS is here: a reader of the table
   that sits in another file is a second idea of what a word is.

   LONGEST FIRST TO FIND THEM, THE SPEAKER'S ORDER TO KEEP THEM. Four incants
   are two syllables ("pune o", "con pren", "sa cius", "lum e"), so a shorter
   one must not be matched inside a longer. But the RESULT comes back in the
   order it was said: battle/roster.js reads words[0] as the leading word, and
   the quota must cut a speaker's LAST choices rather than the ones they put
   first.

   AND NO REGULAR EXPRESSION, on purpose. The first cut built one per incant
   and escaped the space as a whitespace class; one backslash was lost on the
   way into the file, the pattern became "punes+o", and all four two-syllable
   incants silently stopped being words. A matcher whose correctness depends
   on an escape surviving three layers of quoting will break again. This
   flattens everything that is not a letter to a single space and uses
   indexOf, which cannot be broken that way. */
/*,,. AND THE MARKS ARE FOLDED, NOT DROPPED (Rose's PDF, "For the build") ,,,
   Kotuq and Emetu words carry accents (mūt, mīt, köt, saḫa), and flattening to
   a-z used to delete every marked LETTER outright: mūt and mīt both read as
   "m t", two different words as one, and ár as a stray "r". Decomposing first
   and dropping only the combining marks keeps the letter under each one, so mūt
   reads "mut" and mīt reads "mit". Written as a code-point range rather than a
   regular expression for the reason above: nothing here depends on an escape
   surviving its way into the file. */
export const foldMarks = (s) => Array.from(String(s || "").normalize("NFD"))
    .filter((c) => { const n = c.codePointAt(0); return n < 0x300 || n > 0x36f; })
    .join("");
const flatten = (s) => " " + foldMarks(s).toLowerCase()
    .replace(/[^a-z]+/g, " ").replace(/\s+/g, " ").trim() + " ";

/** the word ids a line names, in the order it names them, capped. */
export function wordsFrom(line, quota) {
    const cap = Math.max(0, Math.floor(Number(quota) || 0));
    if (!cap) return [];
    const flat = flatten(line);
    const byIncant = [...WORDS].sort(
        (a, b) => String(b.incant).length - String(a.incant).length);
    const found = [];
    for (const w of byIncant) {
        if (found.some((f) => f.id === w.id)) continue;
        const at = flat.indexOf(flatten(w.incant));
        if (at >= 0) found.push({ id: w.id, at });
    }
    return found.sort((a, b) => a.at - b.at).slice(0, cap).map((f) => f.id);
}
