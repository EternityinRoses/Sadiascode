/**
 * THE FAITH PAGE'S DATA: the pantheon page XII offers, and the tongues.
 *
 * Two separate questions share the page: WHO YOU KNEEL TO and WHAT YOU SPEAK.
 * They are separate in the data too. A deity in Harpine is narrative for EIGHT
 * of the nine, the original wires no mechanic to the choice anywhere (Cleric
 * domains ride ALIGNMENT, never the god; no class demands a patron; nothing
 * gates on the answer). So a deity is a name, an alignment tag, a portrait, and
 * prose, and for those eight that is the whole datum. Do not come back looking
 * for a mechanic there; its absence is confirmed, not overlooked.
 *
 * THE NINTH IS THE EXCEPTION, and it is a deliberate one, see `unanswered`
 * below. The Blessed Lady is the only god this file hands a rule, and the rule
 * is that she gives nothing.
 *
 * CONVENTIONS THIS FILE KEEPS:
 *   - Declared order IS render order, both lists, the original's order.
 *   - The pantheon is SRD-SAFE archetypes, no WotC proper nouns. The Silk
 *     Duchess is the homebrew star, a legally-distinct spider-matron of
 *     Rose's own. Rename freely; never restore a trademarked name.
 *   - Blurbs and lore lines are the original's display copy. They were once
 *     re-punctuated on the way in ("--" became an em dash, "the em dashes this
 *     project writes everywhere", said this very line) and 08-09 reversed that
 *     for good: NOTHING that ships carries an em dash. Rose's own writing never
 *     did; the habit was mine. Keep her copy as she wrote it.
 *   - `align` holds the two-letter tag the original stores. It PRINTED the
 *     raw tag ("NE") on a page that spells alignments out everywhere else,
 *     the same shortfall traits.js fixed for "Diplo", so `deityAlign`
 *     expands it and the step should print the expansion.
 *
 * WHO GETS THE TONGUE LIST is not this file's datum. Feral silences the whole
 * right-hand box, traits.js already exports `isSilenced`, heritage.js already
 * owes the "???" picks through `heritage().languagePicksOwed`, this file only
 * states the quota law those feed.
 */

/** Kneeling to no one is a real answer, always the first row, a refusal,
    not a god, so it lives beside the pantheon rather than in it. */
export const NO_DEITY = "None";
export const NO_DEITY_BLURB = "No god holds your knee.";

/** The nine of the pantheon, page order. */
/*,,. AND EACH NAMES A WEAPON (Rose 2026-09-23: "religion gives a free proficiency", then "give each religion a
   weapon- make one up") ,,,
   The one mechanic a god now carries past the Blessed Lady's silence: kneel, and you are proficient with your
   god's weapon (data/proficiency.js). Chosen from what this game can put in a hand, by what each god is:
   the Silk Duchess the shortbow (Rose: "more of a shortbow thing... huntress"), Vharun the longsword (the
   disciplined blade), Mourne the glaive (the reaper's), Aeliss the spear (the wise goddess's), Halon the
   morningstar (the dawn star, for the Dawnward), Skell the rapier (the rogue's), Kaerix the flail (the chained
   ambition), the Hollow King the halberd (the throne's guard). The morningstar and the flail came into the
   game for them the same day (Rose: "actually do morning star and flail now"). THE BLESSED LADY'S IS THE DAGGER (Rose: "since
   she's the moon goddess (ritual)") and she gives it to no one: her law below is that she gives nothing, and
   this does not break it. So the header's "narrative for eight of the nine" is true of everything except
   the weapon. */
export const DEITIES = [
    { name: "The Blessed Lady", align: "NE", weapon: "Dagger",
      blurb: "The moon that shines for one child alone. She cradles her chosen and lets the wicked fade in her light; the desperate pray up into her silence, and she listens, rapt, unanswering. Her mercy is real. It simply has a name, and the name is not yours." },
    { name: "The Silk Duchess", align: "NE", weapon: "Shortbow",
      blurb: "Vaelissa: nine feet of mourning-silk and appetite, who holds court in a web-hung hall beneath the roots of the world. Her daughters are ten thousand and eight-legged, and she loves them the way a spider loves the fly. She prizes cunning, punishes weakness with patience, and wraps what she cannot yet use in silk, to keep. Kneel prettily and she may call you clever." },
    { name: "Vharun, the Iron Vow", align: "LN", weapon: "Longsword",
      blurb: "The soldier's god of oaths kept and lines held; he blesses the disciplined blade and damns the oathbreaker." },
    { name: "Mourne, the Last Door", align: "LN", weapon: "Glaive",
      blurb: "The quiet keeper of the grave, who judges the dead without cruelty and hates the undeath that cheats him." },
    { name: "Aeliss, the Loremother", align: "N", weapon: "Spear",
      blurb: "Keeper of secrets and star-charts, who trades knowledge for knowledge and forgives no locked door." },
    { name: "Halon the Dawnward", align: "NG", weapon: "Morningstar",
      blurb: "The sun made kind: courage, honest fire, and the truth that burns off fog. Foe of every crawling dark." },
    { name: "Skell, the Grinning Coin", align: "CN", weapon: "Rapier",
      blurb: "Luck's own rascal, patron of thieves, traders, and long roads; he loves a clever theft and a fair wager." },
    { name: "Kaerix, the Tyrant Below", align: "LE", weapon: "Flail",
      blurb: "The chained ambition, who whispers that any throne is yours if you are cruel enough to take it." },
    { name: "The Hollow King", align: "NE", weapon: "Halberd",
      blurb: "The shade-crowned lord of forgotten things, who rules the shadow and the grave-cold and remembers what the living let go." },
];

/**
 * THE MOON GODDESS ANSWERS ONE CHILD, AND IT IS NOT YOU.
 *
 * Rose, 2026-08-09: *"make it so the moon goddess is something only diana can
 * benefit from by design she is a deity that has worshipers but shes indifferent
 * to the point that it can [be] assumed that she doesnt exist... if the player
 * selects the moon goddess as a cleric or paladin they will have no power...
 * gives them no benefit. No class skills. Nothing."*
 *
 * The lore said it first and this is the mechanic finally agreeing with it:
 * *"the desperate pray up into her silence, and she listens, rapt,
 * unanswering. Her mercy is real. It simply has a name, and the name is not
 * yours."* Every other god's clerics and paladins work exactly as the SRD
 * chassis says. Kneel to HER in either of those two paths and the POWER is
 * simply not there: no casting, no words, and no caster-gated feats. A player
 * can still walk that road, it is a real and choosable answer, and it is a bad
 * bargain, which is the point.
 *
 * WHAT IS DELIBERATELY LEFT ALONE, and the line moved once: hit die, BAB,
 * saves, AND the class skills and skill points. The first version took the
 * skills too, which Rose overruled the same day: *"class skills being removed
 * doesnt make sense they're still clerics"*. The test that settles it is WHO
 * TAUGHT IT. Heal, Concentration and Knowledge (Religion) come from the order,
 * its libraries and its living priests, and a dormant god cannot un-teach them;
 * the body's hit points and its trained saves were never hers either. Only the
 * casting comes DOWN from a god, so only the casting stops. A forsaken cleric
 * is a fully trained cleric praying to no answer, not a peasant.
 *
 * BY NAME, NOT BY "the moon god of this world", one string, one place. If the
 * pantheon is ever renamed, this constant moves with it and every consumer
 * follows, because none of them names her themselves.
 */
export const MOON_GODDESS = "The Blessed Lady";

/** The two paths that draw their power from a god rather than from training.
    Druid and Ranger answer to the wild, Bard to their own throat, none of the
    three kneels for what they can do, so none of the three is touched. */
export const DIVINE_PATHS = ["Cleric", "Paladin"];

/** True when this build is a divine path praying into the silence. The ONE
    owner of the question, no consumer may re-derive it from the name. */
export const unanswered = (path, deity) =>
    deity === MOON_GODDESS && DIVINE_PATHS.includes(path);

/**
 * Take back what she never lent. Words are picked on page XI and the god is
 * chosen on page XII, so the record CAN hold a verse bought before the silence
 * was chosen, the same "an answer changed out from under a later gate"
 * problem Verify exists to catch. Returns true when something was taken, so the
 * caller can say so rather than edit the sheet behind the player's back.
 *
 * Skills and feats are not healed here: `healRecord()` on the feats page
 * already owns that sweep, and it re-prices every rank the moment `derive()`
 * reports no class skills.
 */
export function dropUnlentWords(self) {
    if (!self || !unanswered(self.classes.path, self.classes.deity)) return false;
    const held = self.magic && self.magic.words;
    if (!held || !held.length) return false;
    self.magic.words = [];
    return true;
}

const ORDERS = { L: "Lawful", N: "Neutral", C: "Chaotic" };
const MORALS = { G: "Good",   N: "Neutral", E: "Evil" };

/** "NE" → "Neutral Evil"; the lone "N" → "True Neutral". */
export const deityAlign = (tag) =>
    tag === "N" ? "True Neutral" : `${ORDERS[tag[0]]} ${MORALS[tag[1]]}`;

/**
 * The portrait, keyed by the god's printed name. The names carry commas, so a
 * plain space swap would miss the files on disk, every run of anything that
 * is not a letter or digit collapses to one underscore, which is exactly how
 * the shipped art is named ("Vharun, the Iron Vow" → Vharun_the_Iron_Vow.webp).
 */
export const deityPlate = (name) =>
    `assets/img/deity/${name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "")}.webp`;

/**
 * Every tongue a character can learn, base 3.5 SRD plus the homebrew:
 * Demon for the defect hosts, Canine for the beast-blooded, Emetu for the
 * shades (2026-09-25; Infernal is Kotuq, the devils' tongue). The lore line is
 * the row's hover copy, spoken and learnable tongues alike. The learnable POOL
 * is this list minus what the blood already speaks, never a second list.
 */
export const LANGUAGES = [
    { name: "Common",      lore: "The trade-tongue of Harpine. Anyone who buys, sells, or bargains speaks it." },
    { name: "Draconic",    lore: "The tongue of dragons and their kin, and the script most spellbooks are penned in." },
    { name: "Dwarven",     lore: "The stone-cut speech of dwarves, hard-edged and old as the deep roads." },
    { name: "Elven",       lore: "The flowing tongue of elves, and the language of most high song and poetry." },
    { name: "Giant",       lore: "The booming speech of giants, ogres, and trolls." },
    { name: "Gnome",       lore: "The quick, punning tongue of gnomes, thick with burrow-lore and craft-words." },
    { name: "Goblin",      lore: "The harsh chatter of goblins, hobgoblins, and bugbears." },
    { name: "Halfling",    lore: "The warm, homely speech of halflings, seldom written down." },
    { name: "Orc",         lore: "The blunt, growling war-tongue of orcs." },
    { name: "Abyssal",     lore: "The churning speech of demons and the boiling layers of the Abyss." },
    { name: "Aquan",       lore: "The rippling tongue of water elementals and things that dwell beneath the waves." },
    { name: "Auran",       lore: "The whistling speech of air elementals and creatures of the open sky." },
    { name: "Celestial",   lore: "The radiant tongue of angels and the kind powers of the upper planes." },
    { name: "Ignan",       lore: "The crackling speech of fire elementals and things born of flame." },
    { name: "Infernal",    lore: "The rigid, lawful tongue of devils and the ordered Hells." },
    { name: "Sylvan",      lore: "The old woodland speech of fey, dryads, and the deep wild." },
    { name: "Terran",      lore: "The grinding, slow tongue of earth elementals and things of deep stone." },
    { name: "Undercommon", lore: "The shared cant of the lightless underworld and all who trade in it." },
    { name: "Demon",       lore: "The guttural cant of the defect hosts, spoken where the monstrous races muster." },
    /* THE SHADE TONGUE (Rose 2026-09-25, "The Verse: Tongues and Corruption": "Emetu needs
       adding as the Shade tongue"). Its lore line is his, from The Tongues of Harpine. Its words
       are the shades' corruption of the Verse; Kotuq's are Infernal's, which is already above. */
    { name: "Emetu",       lore: "The dead tongue of the shades: a language visibly losing the ability to speak." },
    { name: "Canine",      lore: "The howl-and-scent speech of hounds and wolves, and the beast-blooded who run with them." },
];

/**
 * The bonus-tongue quota, the original's law, all three terms:
 *
 *     max(0, INT modifier) + floor(Speak Language ranks) + picks the blood owes
 *
 * The INT modifier is taken off the FINAL score (allocation + inherited mods,
 * what `heritage().modifiers` already holds); a negative wit clamps to zero,
 * never subtracts. Speak Language is cross-class for everyone, so its ranks
 * arrive halved and the floor is doing real work. The owed picks are the "???"
 * entries a parent's blood hands down. Rose's ruling: "???" is A PICK, NOT A
 * TONGUE, and the original once got that wrong in both directions (counted it
 * as spoken, granted nothing). It needed a frozen pre-bonus snapshot of the
 * blood list to count them safely; heritage() derives `languagePicksOwed`
 * fresh from the cross every call, so no snapshot exists here to drift.
 *
 * The page's gate holds BOTH ways: at least one tongue spoken (unless
 * silenced), and no quota left unspent, an owed tongue skipped is a tongue
 * silently lost, and the original patched exactly that leak.
 */
export const tongueQuota = (intMod, speakLanguageRanks, picksOwed) =>
    Math.max(0, intMod || 0) + Math.floor(speakLanguageRanks || 0) +
    Math.max(0, picksOwed || 0);
