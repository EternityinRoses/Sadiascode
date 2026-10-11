/**
 * THE TRADE PAGE'S DATA: skills, class-skill sets, schools, the weapon
 * catalog, and the general feat pool, everything page X renders that is not a
 * bloodline feat (those live in data/feats.js and the page prepends a parent's
 * picks itself).
 *
 * CONVENTIONS THIS FILE KEEPS:
 *   - Skills go by their FULL printed label everywhere, the same convention
 *     the prestige judge (classes.js) and the heritage hidden-skill tables
 *     already committed to. The original kept a second namespace of short ids
 *     and its Verify page leaked them ("Know Religion +2"); one namespace,
 *     no leak.
 *   - `reqLine` is the printed prerequisite line, stored BESIDE the structured
 *     `req` so what the row says and what the judge checks cannot drift.
 *     Ability minimums first (Str Dex Con Int Wis Cha order), then BAB, then
 *     "spellcaster" / "night vision", then skill ranks, then feats, the
 *     original's own print order.
 *   - Display copy is transcribed verbatim FOR ROSE'S CANON ROWS: the double
 *     spaces are the original's line-break markers joined, and "impared" /
 *     "recieve" are the authored spellings. SRD-named feats read as the SRD
 *     rules since 08-16 (Rose: "the srd feats dont have srd description...
 *     fix that") -- Dodge, Mobility and Spring Attack lost their v1
 *     action-game prose. TRAMPLE IS THE EXCEPTION and keeps its canon text
 *     and gate: the 08-08 investigation off the running v1 build ruled it a
 *     deliberate second mounted root (Equestrian's), not SRD drift. `origin`
 *     marks provenance of the FEAT, not of its prose.
 *
 *   - `origin` HAS THREE VALUES AND THEY ARE ABOUT AUTHORSHIP:
 *       absent, a 3.5 SRD feat, open content under the OGL.
 *       "pf". Pathfinder feats: the teamwork feats, the critical feats and the healing feats Rose asked for (2026-10-06).
 *       "canon", **ROSE'S OWN FIRST-PARTY DESIGN.** Nine of these came out
 *                   of the original RMXP Legend of Harpine, pasted by her on
 *                   2026-07-07 as canonical data (see LoH Documentation/
 *                   2026-07-07_canon_feats_reference.md); the Parry chain she
 *                   authored on 08-07. These were mislabelled `"homebrew"`
 *                   until 08-07. MY tag, not hers, and wrong twice over: it
 *                   reads as third-party or casually invented when this is the
 *                   author's own canon, and it hides the fact that these rows
 *                   are cleanly HER IP with no licensing question attached,
 *                   which is exactly what the Product Identity audit needs to
 *                   be able to tell apart. Never infer intent from a label a
 *                   tool applied to itself.
 *
 * WHAT IS DELIBERATELY CARRIED, NOT FIXED:
 *   - All 87 ORIGINAL entries are here INCLUDING the eleven that can never
 *     surface at level 1 (their BAB prerequisite is 2+ while level-1 BAB tops
 *     out at 1, full-BAB classes included). They gate out naturally through
 *     `req` and exist for the level-up era, exactly as in the original.
 *     (Rose added the Parry chain on 08-07; the 08-16 SRD sweep restored
 *     seven more the original never carried: Greater Two-Weapon Fighting,
 *     the Greater Weapon Focus / Specialization four, Improved Precise
 *     Shot, Snatch Arrows, Rapid Reload. 112 entries stand today.)
 *   - The Pathfinder teamwork feats (`origin: "pf"`) pay out only while an
 *     ally holding the same feat stands where it needs them; alone they do
 *     nothing, which is the point.
 *
 * Speak Language is a real skill row: no key ability (`ability: null`),
 * cross-class for every path, and its ranks feed the Faith page's language
 * quota. It sits on no class-skill list, ever. The silenced (Feral) can
 * neither buy it nor aim Skill Focus at it, that behaviour lives in the
 * step; it is noted here because the data looks incomplete without it.
 */
import { classesOf } from "../rules/classes.js";

/** All 45 skills, page order. `ability` null = no key ability. */
export const SKILLS = [
    { label: "Sense Motive",              ability: "WIS" },
    { label: "Gather Information",        ability: "CHA" },
    { label: "Diplomacy",                 ability: "CHA" },
    { label: "Bluff",                     ability: "CHA" },
    { label: "Disguise",                  ability: "CHA" },
    { label: "Intimidate",                ability: "CHA" },
    { label: "Forgery",                   ability: "INT" },
    { label: "Hide",                      ability: "DEX" },
    { label: "Sleight of Hand",           ability: "DEX" },
    { label: "Move Silently",             ability: "DEX" },
    { label: "Tumble",                    ability: "DEX" },
    { label: "Survival",                  ability: "WIS" },
    { label: "Perform",                   ability: "CHA" },
    { label: "Open Lock",                 ability: "DEX" },
    { label: "Knowledge (Religion)",      ability: "INT" },
    { label: "Spot",                      ability: "WIS" },
    { label: "Search",                    ability: "INT" },
    { label: "Ride",                      ability: "DEX" },
    { label: "Knowledge (Local)",         ability: "INT" },
    { label: "Knowledge (Nature)",        ability: "INT" },
    { label: "Knowledge (Planes)",        ability: "INT" },
    { label: "Knowledge (History)",       ability: "INT" },
    { label: "Knowledge (Nobility)",      ability: "INT" },
    { label: "Knowledge (Geography)",     ability: "INT" },
    { label: "Knowledge (Dungeoneering)", ability: "INT" },
    { label: "Knowledge (Arcana)",        ability: "INT" },
    { label: "Heal",                      ability: "WIS" },
    { label: "Spellcraft",                ability: "INT" },
    { label: "Concentration",             ability: "CON" },
    { label: "Handle Animal",             ability: "CHA" },
    { label: "Listen",                    ability: "WIS" },
    { label: "Escape Artist",             ability: "DEX" },
    { label: "Climb",                     ability: "STR" },
    { label: "Balance",                   ability: "DEX" },
    { label: "Disable Device",            ability: "INT" },
    { label: "Knowledge (Architecture)",  ability: "INT" },
    { label: "Jump",                      ability: "STR" },
    { label: "Swim",                      ability: "STR" },
    { label: "Use Rope",                  ability: "DEX" },
    { label: "Appraise",                  ability: "INT" },
    { label: "Decipher Script",           ability: "INT" },
    { label: "Craft",                     ability: "INT" },
    { label: "Profession",                ability: "WIS" },
    { label: "Use Magic Device",          ability: "CHA" },
    { label: "Speak Language",            ability: null  },
];

/** Every Knowledge label: Bard and Wizard take them all. */
const KNOWLEDGES = [
    "Knowledge (Religion)", "Knowledge (Local)", "Knowledge (Nature)",
    "Knowledge (Planes)", "Knowledge (History)", "Knowledge (Nobility)",
    "Knowledge (Geography)", "Knowledge (Dungeoneering)", "Knowledge (Arcana)",
    "Knowledge (Architecture)",
];

/**
 * 3.5 SRD class-skill lists for the eleven base paths, restricted to the
 * skills the game offers. Class skill: 1 point per rank, cap 4 at level 1.
 * Everything else: 2 points per rank, cap 2.
 *
 * FACT-CHECKED AGAINST EACH CLASS'S OWN PAGE (d20srd.org, 2026-09-27; Rose: "fact check yourself by looking at the
 * srd"). Three were wrong and are the book's now: the Wizard's is "Concentration (Con), Craft (Int), Decipher Script
 * (Int), Knowledge (all skills, taken individually) (Int), Profession (Wis), and Spellcraft (Int)" (it had only
 * Concentration, Spellcraft and the Knowledges); the Monk's ends "Perform, Profession, Sense Motive, Spot, Swim, and
 * Tumble" (Profession was missing); the Bard's has "Speak Language (None)" and no Use Rope (it had them the other way
 * round). The other eight match their pages word for word.
 */
export const CLASS_SKILLS = {
    Barbarian: ["Climb", "Craft", "Handle Animal", "Intimidate", "Jump",
        "Listen", "Ride", "Survival", "Swim"],
    Fighter: ["Climb", "Craft", "Handle Animal", "Intimidate", "Jump", "Ride",
        "Swim"],
    Paladin: ["Concentration", "Craft", "Diplomacy", "Handle Animal", "Heal",
        "Knowledge (Nobility)", "Knowledge (Religion)", "Profession", "Ride",
        "Sense Motive"],
    Ranger: ["Climb", "Concentration", "Craft", "Handle Animal", "Heal",
        "Hide", "Jump", "Knowledge (Dungeoneering)", "Knowledge (Geography)",
        "Knowledge (Nature)", "Listen", "Move Silently", "Profession", "Ride",
        "Search", "Spot", "Survival", "Swim", "Use Rope"],
    Cleric: ["Concentration", "Craft", "Diplomacy", "Heal",
        "Knowledge (Arcana)", "Knowledge (History)", "Knowledge (Religion)",
        "Knowledge (Planes)", "Profession", "Spellcraft"],
    Druid: ["Concentration", "Craft", "Diplomacy", "Handle Animal", "Heal",
        "Knowledge (Nature)", "Listen", "Profession", "Ride", "Spellcraft",
        "Spot", "Survival", "Swim"],
    Monk: ["Balance", "Climb", "Concentration", "Craft", "Diplomacy",
        "Escape Artist", "Hide", "Jump", "Knowledge (Arcana)",
        "Knowledge (Religion)", "Listen", "Move Silently", "Perform",
        "Profession", "Sense Motive", "Spot", "Swim", "Tumble"],
    Bard: ["Appraise", "Balance", "Bluff", "Climb", "Concentration", "Craft",
        "Decipher Script", "Diplomacy", "Disguise", "Escape Artist",
        "Gather Information", "Hide", "Jump", "Listen", "Move Silently",
        "Perform", "Profession", "Sense Motive", "Sleight of Hand",
        "Speak Language", "Spellcraft", "Swim", "Tumble", "Use Magic Device",
        ...KNOWLEDGES],
    Rogue: ["Appraise", "Balance", "Bluff", "Climb", "Craft",
        "Decipher Script", "Diplomacy", "Disable Device", "Disguise",
        "Escape Artist", "Forgery", "Gather Information", "Hide", "Intimidate",
        "Jump", "Knowledge (Local)", "Listen", "Move Silently", "Open Lock",
        "Perform", "Profession", "Sense Motive", "Search", "Sleight of Hand",
        "Spot", "Swim", "Tumble", "Use Magic Device", "Use Rope"],
    Sorcerer: ["Bluff", "Concentration", "Craft", "Knowledge (Arcana)",
        "Profession", "Spellcraft"],
    Wizard: ["Concentration", "Craft", "Decipher Script", "Profession", "Spellcraft", ...KNOWLEDGES],
};

/*,,. AND THE SAVANT'S LIST IS ALL OF THEM ,,,
   Rose, 2026-09-19, asked what the Savant's class list was and answered it
   himself: *"every skill that counts as a class skill is savants."* Which is
   the class working as designed -- "able to get access to every classes' (in
   game) traits" (his ruling, data/classes.js) -- and it was the one trait the
   Savant had quietly been refused: there was no `Savant` key here at all, so
   `CLASS_SKILLS[self.path] || []` handed back an empty set and EVERY rank it
   bought cost double. Measured at Int +3: a Rogue and a Savant both carry a
   44-point purse, and the Rogue turned it into 44 ranks while the Savant got
   22.

   DERIVED, NEVER COPIED. A hand-written list of forty-four would be a second
   copy of eleven lists, and it would go stale the first time a skill was added
   to any of them. This is the union, computed once at load, so a skill given
   to a Barbarian tomorrow is a Savant's class skill the same minute.

   SPEAK LANGUAGE IS IN IT NOW, through the Bard. This said it was "the one
   skill in the game no class claims, which is the SRD's own answer"; the SRD's
   Bard page says otherwise ("Speak Language (None)" is on its list), so the
   Bard's list was the one that was wrong, and the union is all forty-five. */
CLASS_SKILLS.Savant = [...new Set(Object.values(CLASS_SKILLS).flat())].sort();

/*,,. A CLASS SKILL FOR ANY OF HER CLASSES (the SRD's multiclass rule; 2026-09-27) ,,,
   "If a skill is a class skill for any of a multiclass character's classes, then character level determines a
   skill's maximum rank." ONE READER for every page that asks: the menu's Skills page asked classRowsOf, which hands
   back the class TABLES (no `path` on any of them), so a Sorcerer who took Rogue saw every Rogue skill capped as
   another class's (Rose, live: "Im a rogue why do I have 2 1/2 fow my rogue class skills?!"). classesOf reads every
   class a record carries, by `path`, `className` or `classes`, so a seat's record answers the same as hers. */
export const isClassSkill = (self, label) => classesOf(self || {}).some((p) => (CLASS_SKILLS[p] || []).includes(label));

/** The eight SRD schools of magic. Spell Focus's targets. */
export const SCHOOLS = ["Abjuration", "Conjuration", "Divination",
    "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"];

/**
 * Every weapon the game knows, catalog order (Simple, then Martial, then
 * Exotic). Weapon Focus aims at ANY of these, not just the handful with
 * models on the doll.
 */
export const WEAPON_CATALOG = [
    // Simple
    "Unarmed", "Dagger", "Club", "Mace", "Morningstar", "Sickle",
    "Quarterstaff", "Shortspear", "Spear", "Longspear", "Light Crossbow",
    "Heavy Crossbow", "Dart", "Javelin", "Sling",
    // Martial
    "Throwing Axe", "Handaxe", "Light Hammer", "Light Pick", "Sap",
    "Short Sword", "Battleaxe", "Flail", "Longsword", "Heavy Pick", "Rapier",
    "Scimitar", "Trident", "Warhammer", "Falchion", "Glaive", "Greataxe",
    "Greatclub", "Heavy Flail", "Greatsword", "Guisarme", "Halberd", "Lance",
    "Ranseur", "Scythe", "Shortbow", "Longbow",
    // Exotic
    "Bastard Sword", "Dwarven Waraxe", "Spiked Chain", "Whip", "Kukri",
    "Kama", "Nunchaku", "Sai", "Siangham", "Hand Crossbow",
];

/**
 * The general feat pool, display order (chains grouped; teamwork last, so the
 * list reads "yours first, then the ones that need a friend"). Bloodline
 * feats are NOT here, data/feats.js owns their text and the page prepends a
 * parent's picks. `choose` marks a selector feat: the base row never reads as
 * taken; each aimed pick is its own entry, named `Base (Target)`.
 * `origin` absent = SRD 3.5.
 */
/* CLASS BONUS SLOT TAGS (Rose 08-14: "you made it so fighter gets ALL
   feats instead of martial only... and same with wizard"). `martial` is
   the SRD fighter bonus feat list (d20srd, Fighter: the printed list --
   Improved Initiative is on it) plus this game's own weapon-and-teamwork
   customs (the parry chain, the teamwork set). `magic` is the metamagic
   family, the wizard slot's diet. Customs left untagged (Berserker,
   Anti-Mage, Night Owl...) spend from GENERAL slots only until Rose
   rules them into a list. */
export const FEAT_POOL = [
    /*,,. THE NATURAL-WEAPON FEATS (Rose 2026-09-17: "we need more natural weapon feats - maybe some natural ac
       feats look it up in pfsrd"; then "first three, snatch") ,,,
       Pathfinder's, read off d20pfsrd on 2026-09-17 and kept to their own numbers. `natural: true` marks the family
       so a body with no claws, horns, fangs or tail is never offered them. */
    { name: "Improved Natural Armor", natural: true, martial: true,
      text: "Your hide thickens: +1 natural armour. Taken again, it thickens again.",
      /* Pathfinder asks for "natural armor"; this game has none to ask for, so the gate is the nearest true thing:
         a body with some beast in it (horns, claws, fangs, a tail). Named as the house reading it is. */
      req: { con: 13, naturals: 1 }, reqLine: "Con 13, a beast's own body" },
    { name: "Improved Natural Attack", natural: true, martial: true,
      text: "One of your natural weapons hits a size harder: its damage die steps up one category.",
      req: { bab: 4, naturals: 1 }, reqLine: "BAB +4, a natural weapon", choose: "natural" },
    { name: "Rending Claws", natural: true, martial: true,
      text: "Land both claws in one turn and the second tears: +1d6, precision damage, never multiplied, once a round.",
      req: { str: 13, bab: 6, feats: ["Riven Hands"] }, reqLine: "Str 13, BAB +6, Riven Hands" },
    { name: "Snatch", natural: true, martial: true,
      text: "A claw or a bite that lands may take hold at once; what you hold you may crush, or fling 1d6 x 10 feet for 1d6 a ten feet.",
      req: { bab: 6, feats: ["Riven Jaw"] }, reqLine: "BAB +6, Riven Jaw" },
    { name: "Power Attack", martial: true,
      text: "Trade attack accuracy for extra damage (two-handers gain double).",
      req: { str: 13 }, reqLine: "Str 13" },
    { name: "Cleave", martial: true,
      text: "Drop a foe and get an immediate extra attack on an adjacent enemy.",
      req: { str: 13, feats: ["Power Attack"] },
      reqLine: "Str 13, Power Attack" },
    { name: "Great Cleave", martial: true,
      text: "Cleave with no limit on the number of follow-up attacks.",
      req: { str: 13, bab: 4, feats: ["Power Attack", "Cleave"] },
      reqLine: "Str 13, BAB +4, Power Attack, Cleave" },
    { name: "Improved Bull Rush", martial: true,
      text: "Bull rush without provoking an attack of opportunity, and gain +4 on the check.",
      req: { str: 13, feats: ["Power Attack"] },
      reqLine: "Str 13, Power Attack" },
    { name: "Improved Overrun", martial: true,
      text: "Overrun foes who cannot avoid you, with +4 on the check.",
      req: { str: 13, feats: ["Power Attack"] },
      reqLine: "Str 13, Power Attack" },
    { name: "Improved Sunder", martial: true,
      text: "Strike a weapon or object without provoking, and gain +4 on the attempt.",
      req: { str: 13, feats: ["Power Attack"] },
      reqLine: "Str 13, Power Attack" },
    { name: "Combat Expertise", martial: true,
      text: "Trade attack accuracy for a dodge bonus to AC.",
      req: { int: 13 }, reqLine: "Int 13" },
    { name: "Improved Disarm", martial: true,
      text: "Disarm without provoking, with +4 on the attempt.",
      req: { int: 13, feats: ["Combat Expertise"] },
      reqLine: "Int 13, Combat Expertise" },
    { name: "Improved Feint", martial: true,
      text: "Feint in combat as a move action instead of a standard action.",
      req: { int: 13, feats: ["Combat Expertise"] },
      reqLine: "Int 13, Combat Expertise" },
    { name: "Improved Trip", martial: true,
      text: "Trip without provoking, gain +4, and make a free attack on a foe you drop.",
      req: { int: 13, feats: ["Combat Expertise"] },
      reqLine: "Int 13, Combat Expertise" },
    { name: "Whirlwind Attack", martial: true,
      text: "One melee attack against every foe within reach.",
      req: { dex: 13, int: 13, bab: 4,
             feats: ["Combat Expertise", "Dodge", "Mobility", "Spring Attack"] },
      reqLine: "Dex 13, Int 13, BAB +4, Combat Expertise, Dodge, Mobility, Spring Attack" },
    /* These three carried v1's action-game prose (dodge rolls, wall runs,
       mid-air strikes) under SRD names; Rose, 08-16: "the srd feats dont
       have srd description... fix that." They read as the rules now. */
    { name: "Dodge", martial: true,
      text: "Pick one foe each round; you gain a +1 dodge bonus to AC against that foe's attacks.",
      req: { dex: 13 }, reqLine: "Dex 13" },
    { name: "Mobility", martial: true,
      text: "+4 dodge bonus to AC against the attacks of opportunity your movement provokes.",
      req: { dex: 13, feats: ["Dodge"] }, reqLine: "Dex 13, Dodge" },
    { name: "Spring Attack", martial: true,
      text: "Split your move around a single melee attack; the foe you strike gets no attack of opportunity against that movement.",
      req: { dex: 13, bab: 4, feats: ["Dodge", "Mobility"] },
      reqLine: "Dex 13, BAB +4, Dodge, Mobility" },
    { name: "Combat Reflexes", martial: true,
      text: "Extra attacks of opportunity each round, one per point of Dexterity bonus.",
      req: null, reqLine: null },
    { name: "Weapon Finesse", martial: true,
      text: "Use DEX instead of STR to hit with light/finesse weapons.",
      req: { bab: 1 }, reqLine: "BAB +1" },
    { name: "Point Blank Shot", martial: true,
      text: "+1 to hit and damage with ranged weapons at close range.",
      req: null, reqLine: null },
    { name: "Precise Shot", martial: true,
      text: "Fire into melee without the -4 penalty.",
      req: { feats: ["Point Blank Shot"] }, reqLine: "Point Blank Shot" },
    { name: "Improved Precise Shot", martial: true,
      text: "Your ranged attacks ignore the cover bonus and the miss chance of anything short of total cover or total concealment.",
      req: { dex: 19, bab: 11, feats: ["Point Blank Shot", "Precise Shot"] },
      reqLine: "Dex 19, BAB +11, Point Blank Shot, Precise Shot" },
    { name: "Rapid Shot", martial: true,
      text: "One extra ranged attack per round, all at -2.",
      req: { dex: 13, feats: ["Point Blank Shot"] },
      reqLine: "Dex 13, Point Blank Shot" },
    { name: "Far Shot", martial: true,
      text: "Increase the range increments of your ranged weapons.",
      req: { feats: ["Point Blank Shot"] }, reqLine: "Point Blank Shot" },
    /* the printed prerequisite is proficiency with the chosen crossbow;
       the game has no proficiency model, so nothing is judged (the
       Shield Wall precedent) */
    { name: "Rapid Reload", martial: true,
      text: "Reload a light or hand crossbow as a free action, a heavy one as a move action. Reloading still provokes.",
      /* judged since 2026-09-28: proficiency with a crossbow (data/proficiency.js), which was printed and never asked */
      req: { crossbow: true }, reqLine: "Weapon Proficiency (crossbow)" },
    { name: "Shot on the Run", martial: true,
      text: "Move, make a single ranged attack, and keep moving.",
      req: { dex: 13, bab: 4, feats: ["Dodge", "Mobility", "Point Blank Shot"] },
      reqLine: "Dex 13, BAB +4, Dodge, Mobility, Point Blank Shot" },
    { name: "Manyshot", martial: true,
      text: "As a standard action, loose two arrows at one target within 30 feet on a single attack roll, both at -4.",
      req: { dex: 17, bab: 6, feats: ["Point Blank Shot", "Rapid Shot"] },
      reqLine: "Dex 17, BAB +6, Point Blank Shot, Rapid Shot" },
    { name: "Weapon Focus", martial: true,
      text: "+1 on attack rolls with one chosen weapon.",
      req: { bab: 1 }, reqLine: "BAB +1", choose: "weapon" },
    /* WEAPON FOCUS IS ROSE'S GATE, NOT A TRANSCRIPTION SLIP. SRD asks only
       "Proficient with weapon, base attack bonus +8" (d20srd 08-08), and on
       08-08 I "corrected" this row to match, wrong. LoH Documentation/
       creation-reference-rules.md, which was built by MEASURING the running
       v1 build, records the weapon chain as Weapon Focus -> Improved Critical
       / Expose Weakness. The stricter gate is the authored design; proficiency
       is not modelled here, so Weapon Focus is what stands in for it. */
    { name: "Improved Critical", martial: true,
      text: "The threat range of one chosen weapon is doubled.",
      req: { bab: 8, feats: ["Weapon Focus"] },
      reqLine: "BAB +8, Weapon Focus", choose: "weapon" },
    /* The fighter-only progression, restored from the SRD on Rose's 08-16
       sweep ("I feel like a few srd feats are missing"). The printed
       prerequisite is FIGHTER LEVEL, and the judge asks it as a class's own
       level (`classLevel`, move F5b; `fighterLevel` from 2026-09-28). */
    { name: "Greater Weapon Focus", martial: true,
      text: "+1 more on attack rolls with the chosen weapon, stacking with Weapon Focus.",
      /* FIGHTER LEVEL, NOT BASE ATTACK (2026-09-28): this asked base attack +8, which a Rogue 9 with one fighter level
         passes; the SRD asks eight levels of fighter */
      req: { classLevel: { Fighter: 8 }, feats: ["Weapon Focus"] },
      reqLine: "Weapon Focus, fighter level 8th", choose: "weapon" },
    { name: "Weapon Specialization", martial: true,
      text: "+2 on damage rolls with the chosen weapon.",
      req: { classLevel: { Fighter: 4 }, feats: ["Weapon Focus"] },
      reqLine: "Weapon Focus, fighter level 4th", choose: "weapon" },
    { name: "Greater Weapon Specialization", martial: true,
      text: "+2 more on damage rolls with the chosen weapon, stacking with Weapon Specialization.",
      req: { classLevel: { Fighter: 12 }, feats: ["Weapon Focus", "Greater Weapon Focus",
                                       "Weapon Specialization"] },
      reqLine: "Weapon Focus, Greater Weapon Focus, Weapon Specialization, fighter level 12th",
      choose: "weapon" },
    { name: "Two-Weapon Fighting", martial: true,
      text: "The two-weapon penalties drop by 2 for your main hand and 6 for your off hand.",
      req: { dex: 15 }, reqLine: "Dex 15" },
    { name: "Improved Two-Weapon Fighting", martial: true,
      text: "Gain a second off-hand attack at a -5 penalty.",
      req: { dex: 17, bab: 6, feats: ["Two-Weapon Fighting"] },
      reqLine: "Dex 17, BAB +6, Two-Weapon Fighting" },
    { name: "Greater Two-Weapon Fighting", martial: true,
      text: "Gain a third off-hand attack, at a -10 penalty.",
      req: { dex: 19, bab: 11,
             feats: ["Two-Weapon Fighting", "Improved Two-Weapon Fighting"] },
      reqLine: "Dex 19, BAB +11, Two-Weapon Fighting, Improved Two-Weapon Fighting" },
    { name: "Improved Unarmed Strike", martial: true,
      text: "Your unarmed strikes deal lethal damage and never provoke attacks of opportunity.",
      req: null, reqLine: null },
    { name: "Improved Grapple", martial: true,
      text: "Start a grapple without provoking, and gain +4 on grapple checks.",
      req: { dex: 13, feats: ["Improved Unarmed Strike"] },
      reqLine: "Dex 13, Improved Unarmed Strike" },
    { name: "Deflect Arrows", martial: true,
      text: "Deflect one ranged attack aimed at you each round.",
      req: { dex: 13, feats: ["Improved Unarmed Strike"] },
      reqLine: "Dex 13, Improved Unarmed Strike" },
    { name: "Snatch Arrows", martial: true,
      text: "Catch the ranged weapons you could deflect with a free hand; a thrown weapon can be hurled straight back.",
      req: { dex: 15, feats: ["Deflect Arrows", "Improved Unarmed Strike"] },
      reqLine: "Dex 15, Deflect Arrows, Improved Unarmed Strike" },
    { name: "Stunning Fist", martial: true,
      text: "Force a struck foe to make a save or be stunned.",
      req: { dex: 13, wis: 13, bab: 8, feats: ["Improved Unarmed Strike"] },
      reqLine: "Dex 13, Wis 13, BAB +8, Improved Unarmed Strike" },
    { name: "Mounted Combat", martial: true,
      text: "Once per round, negate a hit on your mount with a Ride check.",
      req: { skills: { Ride: 1 } }, reqLine: "Ride 1 rank" },
    { name: "Ride-By Attack", martial: true,
      text: "Charge on a mount, attack, and keep riding past without provoking.",
      req: { feats: ["Mounted Combat"] }, reqLine: "Mounted Combat" },
    { name: "Spirited Charge", martial: true,
      text: "Deal double (or triple with a lance) damage on a mounted charge.",
      req: { feats: ["Mounted Combat", "Ride-By Attack"] },
      reqLine: "Mounted Combat, Ride-By Attack" },
    /* EQUESTRIAN IS A DELIBERATE SECOND ROOT, not a broken chain. SRD gates
       Trample behind "Ride 1 rank, Mounted Combat" (d20srd 08-08) and on 08-08
       I rerouted this row to match, calling the original drift, wrong.
       creation-reference-rules.md, measured off the running v1 build, records
       TWO mounted roots: Mounted Combat -> Ride-By Attack -> Spirited Charge /
       Mounted Archery (the SRD chain), and Rose's own Equestrian (Cha 14,
       Ride 1) -> Trample / Soulbond. Trample was never meant to hang off
       Mounted Combat. Its text is canon and so is its gate. */
    { name: "Trample", martial: true,
      text: "Your mount follows up with one attack during charge + overrun attempts.",
      req: { feats: ["Equestrian"] }, reqLine: "Equestrian" },
    { name: "Improved Initiative", martial: true,
      text: "+4 to initiative rolls.",
      req: null, reqLine: null },
    /*,,. THE PROFICIENCIES (Rose 2026-10-06: "all the missing book feats"; d20srd.org/srd/feats.htm, read in Chrome
       2026-10-07, move F5b) ,,,
       data/proficiency.js has read these names since 09-23 and 10-02 (weaponsOf, armourOf, shieldProficient), so the weapon
       and armour ones act the moment they are taken. A body is offered only what it lacks: `gives` names what a row gives
       (the SRD's "They need not select it"), and a weapon or an armour already known is no aim (rules/feats.js choicesOf).
       The three armour feats are one row aimed at a kind, light, then medium, then heavy, as their prerequisites chain them,
       because a name in parentheses is an aim in this pool. No shield is carried in this game yet, and the shield feats
       say so. */
    { name: "Simple Weapon Proficiency", gives: { simple: true },
      text: "Attack with every simple weapon without the -4 for a weapon you were never taught.",
      req: null, reqLine: null },
    { name: "Martial Weapon Proficiency", choose: "martial weapon",
      text: "Choose a martial weapon: you attack with it without the -4 for a weapon you were never taught. Taken again, another.",
      req: null, reqLine: null },
    { name: "Exotic Weapon Proficiency", martial: true, choose: "exotic weapon",
      text: "Choose an exotic weapon: you attack with it without the -4 for a weapon you were never taught. Taken again, another.",
      req: { bab: 1 }, aimReq: { "Bastard Sword": { str: 13 }, "Dwarven Waraxe": { str: 13 } },
      reqLine: "BAB +1 (Str 13 for the bastard sword or the dwarven waraxe)" },
    { name: "Armor Proficiency", choose: "kind of armor",
      text: "Choose a kind of armor, light first, then medium, then heavy: in armor you are trained in, its check penalty falls only on Balance, Climb, Escape Artist, Hide, Jump, Move Silently, Sleight of Hand and Tumble, and never on your attacks.",
      req: null, reqLine: "Medium wants Light; Heavy wants Light and Medium" },
    { name: "Shield Proficiency", gives: { shield: true },
      text: "Use a shield and take only the standard penalties. No shield is carried in this game yet.",
      notYet: "No shield is carried in this game yet.",
      req: null, reqLine: null },
    { name: "Tower Shield Proficiency", gives: { tower: true },
      text: "Use a tower shield and take only the standard penalties. No shield is carried in this game yet.",
      notYet: "No shield is carried in this game yet.",
      req: { shield: true }, reqLine: "Shield Proficiency" },
    { name: "Improved Shield Bash", martial: true,
      text: "Bash with your shield and keep its shield bonus to AC. No shield is carried in this game yet.",
      notYet: "No shield is carried in this game yet.",
      req: { shield: true }, reqLine: "Shield Proficiency" },
    { name: "Toughness",
      text: "+3 hit points.",
      req: null, reqLine: null },
    { name: "Endurance",
      text: "+4 on checks to resist fatigue, heat, cold, and forced marches; sleep in light or medium armor.",
      req: null, reqLine: null },
    { name: "Diehard",
      text: "Remain conscious and acting while between -1 and -9 hit points.",
      /* the undead have no corridor to refuse: destroyed at 0, the feat
         is a dead pick (Rose 08-14, "same with diehard") */
      req: { feats: ["Endurance"], living: true },
      reqLine: "Endurance; the living only" },
    { name: "Great Fortitude",
      text: "+2 on all Fortitude saves.",
      req: null, reqLine: null },
    { name: "Iron Will",
      text: "+2 on all Will saves.",
      req: null, reqLine: null },
    { name: "Lightning Reflexes",
      text: "+2 on all Reflex saves.",
      req: null, reqLine: null },
    { name: "Alertness",
      text: "+2 on Listen and Spot checks.",
      req: null, reqLine: null },
    { name: "Acrobatic",
      text: "+2 on Jump and Tumble checks.",
      req: null, reqLine: null },
    { name: "Agile",
      text: "+2 on Balance and Escape Artist checks.",
      req: null, reqLine: null },
    { name: "Animal Affinity",
      text: "+2 on Handle Animal and Ride checks.",
      req: null, reqLine: null },
    { name: "Athletic",
      text: "+2 on Climb and Swim checks.",
      req: null, reqLine: null },
    { name: "Deceitful",
      text: "+2 on Disguise and Forgery checks.",
      req: null, reqLine: null },
    { name: "Deft Hands",
      text: "+2 on Sleight of Hand and Use Rope checks.",
      req: null, reqLine: null },
    { name: "Diligent",
      text: "+2 on Appraise and Decipher Script checks.",
      req: null, reqLine: null },
    { name: "Investigator",
      text: "+2 on Gather Information and Search checks.",
      req: null, reqLine: null },
    { name: "Magical Aptitude",
      text: "+2 on Spellcraft and Use Magic Device checks.",
      req: null, reqLine: null },
    { name: "Negotiator",
      text: "+2 on Diplomacy and Sense Motive checks.",
      req: null, reqLine: null },
    { name: "Nimble Fingers",
      text: "+2 on Disable Device and Open Lock checks.",
      req: null, reqLine: null },
    { name: "Persuasive",
      text: "+2 on Bluff and Intimidate checks.",
      req: null, reqLine: null },
    { name: "Self-Sufficient",
      text: "+2 on Heal and Survival checks.",
      req: null, reqLine: null },
    /*,,. TRACK, THE SRD'S GENERAL FEAT (d20srd.org/srd/feats.htm, "Track [General]", read in Chrome 2026-10-06; MOVE G's G5) ,,,
       Benefit: "To find tracks or to follow them for 1 mile requires a successful Survival check. You must make another
       Survival check every time the tracks become difficult to follow." Special: "A ranger automatically has Track as a
       bonus feat. He need not select it." (the ranger's table gives it, data/levelling.js grantsOf). Any character may
       pick it (Rose 2026-10-06: "Anyone can pick it"); nothing in the game leaves tracks yet, and its description says so
       on every screen that shows it (`notYet` too, for the level page's list of what a table gives). */
    { name: "Track",
      text: "Find tracks and follow them with Survival checks. Nothing in the game leaves tracks to follow yet.",
      notYet: "Nothing in the game leaves tracks to follow yet.",
      req: null, reqLine: null },
    /* LEADERSHIP (d20srd.org/srd/feats.htm, read in Chrome 2026-10-07, move F5b): character level 6th; no cohort or
       follower comes yet, and it says so (Rose's Track ruling, 10-06) */
    { name: "Leadership",
      text: "Attract a loyal cohort and devoted followers who assist you. No cohort or follower comes to anyone in this game yet.",
      notYet: "No cohort or follower comes to anyone in this game yet.",
      req: { charLevel: 6 }, reqLine: "Character level 6th" },
    { name: "Stealthy",
      text: "+2 on Hide and Move Silently checks.",
      req: null, reqLine: null },
    { name: "Skill Focus",
      text: "+3 on one chosen skill.",
      req: null, reqLine: null, choose: "skill" },
    { name: "Combat Casting",
      text: "+4 on Concentration checks to cast defensively or while grappling.",
      req: null, reqLine: null },
    { name: "Spell Focus",
      text: "+1 to the save DC of one chosen school of your spells.",
      req: { caster: true }, reqLine: "spellcaster", choose: "school" },
    { name: "Spell Penetration",
      text: "+2 on caster level checks to overcome spell resistance.",
      req: { caster: true }, reqLine: "spellcaster" },

    /* THE METAMAGIC FAMILY, SRD 3.5, verbatim from d20srd.org (2026-08-12,
       read in the browser because d20srd 403s a plain fetch). No `origin`,
       these are open content under the OGL like every other untagged row.
       SRD gives metamagic NO prerequisite; `caster: true` is this file's own
       idiom for a row a non-caster should never see, the same gate Spell
       Focus and Spell Penetration already carry for feats the SRD likewise
       leaves open.

       SILENT SPELL IS THE FERAL DOOR. `steps/spells.js` promises the silenced
       a way out in two shapes, "a way to cast without a voice, or a word that
       needs none"; the second is the unminted `noVerbal` word, and this is the
       first. That wiring lives in the step, not here, but it is why the row
       matters more than the others.

       Two the engine will have to answer for when the Verse is fought with:
       every one of these prices itself in SLOT LEVELS, and Quicken's Special
       bars it from spontaneous casting outright. Neither is a creation-layer
       question, so neither is encoded here. */
    { name: "Empower Spell", magic: true,
      text: "All variable, numeric effects of an empowered spell are increased by one-half. Saving throws and opposed rolls are not affected, nor are spells without random variables. An empowered spell uses up a spell slot two levels higher than the spell's actual level.",
      req: { caster: true }, reqLine: "spellcaster" },
    { name: "Enlarge Spell", magic: true,
      text: "You can alter a spell with a range of close, medium, or long to increase its range by 100%. An enlarged spell with a range of close now has a range of 50 ft. + 5 ft./level, while medium-range spells have a range of 200 ft. + 20 ft./level and long-range spells have a range of 800 ft. + 80 ft./level. An enlarged spell uses up a spell slot one level higher than the spell's actual level. Spells whose ranges are not defined by distance, as well as spells whose ranges are not close, medium, or long, do not have increased ranges.",
      req: { caster: true }, reqLine: "spellcaster" },
    { name: "Extend Spell", magic: true,
      text: "An extended spell lasts twice as long as normal. A spell with a duration of concentration, instantaneous, or permanent is not affected by this feat. An extended spell uses up a spell slot one level higher than the spell's actual level.",
      req: { caster: true }, reqLine: "spellcaster" },
    { name: "Heighten Spell", magic: true,
      text: "A heightened spell has a higher spell level than normal (up to a maximum of 9th level). Unlike other metamagic feats, Heighten Spell actually increases the effective level of the spell that it modifies. All effects dependent on spell level (such as saving throw DCs and ability to penetrate a lesser globe of invulnerability) are calculated according to the heightened level. The heightened spell is as difficult to prepare and cast as a spell of its effective level.",
      req: { caster: true }, reqLine: "spellcaster" },
    { name: "Maximize Spell", magic: true,
      text: "All variable, numeric effects of a spell modified by this feat are maximized. Saving throws and opposed rolls are not affected, nor are spells without random variables. A maximized spell uses up a spell slot three levels higher than the spell's actual level. An empowered, maximized spell gains the separate benefits of each feat: the maximum result plus one-half the normally rolled result.",
      req: { caster: true }, reqLine: "spellcaster" },
    { name: "Quicken Spell", magic: true,
      text: "Casting a quickened spell is a swift action. You can perform another action, even casting another spell, in the same round as you cast a quickened spell. You may cast only one quickened spell per round. A spell whose casting time is more than 1 full round action cannot be quickened. A quickened spell uses up a spell slot four levels higher than the spell's actual level. Casting a quickened spell doesn't provoke an attack of opportunity. This feat cannot be applied to any spell cast spontaneously, since applying a metamagic feat to a spontaneously cast spell automatically increases the casting time to a full-round action.",
      req: { caster: true }, reqLine: "spellcaster" },
    { name: "Silent Spell", magic: true,
      text: "A silent spell can be cast with no verbal components. Spells without verbal components are not affected. A silent spell uses up a spell slot one level higher than the spell's actual level.",
      req: { caster: true }, reqLine: "spellcaster" },
    { name: "Still Spell", magic: true,
      text: "A stilled spell can be cast with no somatic components. Spells without somatic components are not affected. A stilled spell uses up a spell slot one level higher than the spell's actual level.",
      req: { caster: true }, reqLine: "spellcaster" },
    { name: "Widen Spell", magic: true,
      text: "You can alter a burst, emanation, line, or spread shaped spell to increase its area. Any numeric measurements of the spell's area increase by 100%. A widened spell uses up a spell slot three levels higher than the spell's actual level. Spells that do not have an area of one of these four sorts are not affected by this feat.",
      req: { caster: true }, reqLine: "spellcaster" },

    /* The rest of the SRD's caster general feats. Augment Summoning names a
       SCHOOL-SCOPED prereq, and the judge in steps/feats.js already reads a
       full display name before it falls back to the base, so "Spell Focus
       (Conjuration)" checks exactly what the printed line says and nothing
       drifts. Spell Mastery is here since move F5b (Rose 10-06, "all the
       missing book feats"), after the item creation feats. */
    /*,,. SCRIBE SCROLL, THE WIZARD'S 1ST-LEVEL FEAT (the SRD's Wizard table: "Summon familiar, Scribe Scroll") ,,,
       Added 2026-09-28 in the SRD's words (d20srd.org feats.htm, "Scribe Scroll [Item Creation]"). The table GRANTS it
       at a wizard's first level; it is never offered as a pick (`grantOnly`), because no scroll is written in this game
       yet, and a feat that does nothing must not be chosen over one that does (`notYet` says so on a screen). */
    { name: "Scribe Scroll", itemCreation: true, grantOnly: true,
      text: "You can create a scroll of any spell that you know. Scribing a scroll takes one day for each 1,000 gp in its base price.",
      notYet: "No scroll is written in this game yet.",
      req: { caster: true }, reqLine: "Caster level 1st" },
    /* THE SRD'S OTHER ITEM CREATION FEATS (d20srd.org/srd/feats.htm, read in Chrome 2026-10-07, move F5b; Rose 10-06: "all
       the missing book feats"): any body of the printed caster level may take one (rules/classes.js casterLevelAt, derive's
       casterLevel), and each fills a wizard's bonus seat as the SRD says (seatLife.js fillsClassSlot). Nothing is made in
       this game yet, and each says so. */
    { name: "Brew Potion", itemCreation: true,
      text: "You can create a potion of any 3rd-level or lower spell that you know and that targets one or more creatures. Brewing a potion takes one day. No potion is made in this game yet.",
      notYet: "No potion is made in this game yet.",
      req: { casterLevel: 3 }, reqLine: "Caster level 3rd" },
    { name: "Craft Magic Arms and Armor", itemCreation: true,
      text: "You can create any magic weapon, armor, or shield whose prerequisites you meet. Enhancing one takes one day for each 1,000 gp in the price of its magical features. No magic arms or armor are made in this game yet.",
      notYet: "No magic arms or armor are made in this game yet.",
      req: { casterLevel: 5 }, reqLine: "Caster level 5th" },
    { name: "Craft Rod", itemCreation: true,
      text: "You can create any rod whose prerequisites you meet. Crafting a rod takes one day for each 1,000 gp in its base price. No rod is made in this game yet.",
      notYet: "No rod is made in this game yet.",
      req: { casterLevel: 9 }, reqLine: "Caster level 9th" },
    { name: "Craft Staff", itemCreation: true,
      text: "You can create any staff whose prerequisites you meet. Crafting a staff takes one day for each 1,000 gp in its base price, and a new staff has 50 charges. No staff is made in this game yet.",
      notYet: "No staff is made in this game yet.",
      req: { casterLevel: 12 }, reqLine: "Caster level 12th" },
    { name: "Craft Wand", itemCreation: true,
      text: "You can create a wand of any 4th-level or lower spell that you know. Crafting a wand takes one day for each 1,000 gp in its base price, and a new wand has 50 charges. No wand is made in this game yet.",
      notYet: "No wand is made in this game yet.",
      req: { casterLevel: 5 }, reqLine: "Caster level 5th" },
    { name: "Craft Wondrous Item", itemCreation: true,
      text: "You can create any wondrous item whose prerequisites you meet. Enchanting one takes one day for each 1,000 gp in its price. No wondrous item is made in this game yet.",
      notYet: "No wondrous item is made in this game yet.",
      req: { casterLevel: 3 }, reqLine: "Caster level 3rd" },
    { name: "Forge Ring", itemCreation: true,
      text: "You can create any ring whose prerequisites you meet. Crafting a ring takes one day for each 1,000 gp in its base price. No ring is made in this game yet.",
      notYet: "No ring is made in this game yet.",
      req: { casterLevel: 12 }, reqLine: "Caster level 12th" },
    /* SPELL MASTERY [Special] (d20srd.org/srd/feats.htm, read in Chrome 2026-10-07, move F5b): a wizard's own, and a
       wizard's bonus seat takes it (the SRD: "a metamagic feat, an item creation feat, or Spell Mastery") */
    { name: "Spell Mastery",
      text: "Each time you take this feat, choose spells you already know, as many as your Intelligence modifier: you can prepare them without your spellbook. Nothing takes a wizard's spellbook away in this game yet.",
      notYet: "Nothing takes a wizard's spellbook away in this game yet.",
      req: { classLevel: { Wizard: 1 } }, reqLine: "Wizard level 1st" },
    { name: "Eschew Materials",
      text: "You can cast any spell that has a material component costing 1 gp or less without needing that component. (The casting of the spell still provokes attacks of opportunity as normal.) If the spell requires a material component that costs more than 1 gp, you must have the material component at hand to cast the spell, just as normal.",
      req: { caster: true }, reqLine: "spellcaster" },
    { name: "Greater Spell Focus",
      text: "Add +1 to the Difficulty Class for all saving throws against spells from the school of magic you select. This bonus stacks with the bonus from Spell Focus. Choose a school of magic to which you already have applied the Spell Focus feat.",
      req: { caster: true, feats: ["Spell Focus"] },
      reqLine: "spellcaster, Spell Focus", choose: "school" },
    { name: "Greater Spell Penetration",
      text: "You get a +2 bonus on caster level checks (1d20 + caster level) made to overcome a creature's spell resistance. This bonus stacks with the one from Spell Penetration.",
      req: { caster: true, feats: ["Spell Penetration"] },
      reqLine: "spellcaster, Spell Penetration" },
    { name: "Augment Summoning",
      text: "Each creature you conjure with any summon spell gains a +4 enhancement bonus to Strength and Constitution for the duration of the spell that summoned it.",
      req: { caster: true, feats: ["Spell Focus (Conjuration)"] },
      reqLine: "spellcaster, Spell Focus (Conjuration)" },
    /*,,. FOUR THAT ASK A CLASS FEATURE (move F5b; d20srd.org/srd/feats.htm, read in Chrome 2026-10-07; the class tables'
       Special column, rules/classes.js hasFeature) ,,,
       Natural Spell a druid's wild shape (5th), Improved Familiar a familiar (a sorcerer's or a wizard's 1st), the two
       turning feats the turning of the undead (a cleric's 1st, a paladin's 4th). None of these is in the game yet, and
       each says so; Extra Turning's "multiple times" waits for turning. */
    { name: "Natural Spell",
      text: "You can complete the verbal and somatic components of spells while in a wild shape. No one takes a wild shape in this game yet.",
      notYet: "No one takes a wild shape in this game yet.",
      req: { wis: 13, feature: ["Wild shape"] }, reqLine: "Wis 13, wild shape" },
    { name: "Improved Familiar",
      text: "When you choose a familiar, creatures beyond the usual list are open to you, of an alignment up to one step from yours. The improved familiars are not in this game yet.",
      notYet: "The improved familiars are not in this game yet.",
      req: { feature: ["Summon familiar"] }, reqLine: "Ability to acquire a new familiar" },
    { name: "Extra Turning",
      text: "You can turn or rebuke creatures four more times per day than normal. No one turns or rebukes the undead in this game yet.",
      notYet: "No one turns or rebukes the undead in this game yet.",
      req: { feature: ["Turn undead", "Turn or rebuke undead"] }, reqLine: "Ability to turn or rebuke creatures" },
    { name: "Improved Turning",
      text: "You turn or rebuke creatures as if you were one level higher in the class that grants you the ability. No one turns or rebukes the undead in this game yet.",
      notYet: "No one turns or rebukes the undead in this game yet.",
      req: { feature: ["Turn undead", "Turn or rebuke undead"] }, reqLine: "Ability to turn or rebuke creatures" },

    { name: "Berserker",
      text: "You move slightly faster than normal when in darkness. If you're hit  in melee by an enemy you cannot see your blows versus that enemy becomes stronger  incrementally until it's death.",
      req: { con: 13 }, reqLine: "Con 13", origin: "canon" },
    { name: "Anti-Mage",
      text: "Every blow made against casting mages will cause their spell timers  to reset and five frames to be added on the next cast.  (10x cap)",
      req: { bab: 1, feats: ["Combat Reflexes"] },
      reqLine: "BAB +1, Combat Reflexes", origin: "canon" },
    { name: "Mage Seeker",
      text: "You suffer no penalties when impared by magic besides nearsighted.",
      req: { wis: 13 }, reqLine: "Wis 13", origin: "canon" },
    { name: "Equestrian",
      text: "Your charisma skills/ checks are more effective on the Equidae family.  You are also more proficient in combat while mounted.",
      req: { cha: 14, skills: { Ride: 1 } },
      reqLine: "Cha 14, Ride 1 rank", origin: "canon" },
    { name: "Soulbond",
      text: "Your charge attacks on your mount now deal x2/ x3 damage.",
      req: { feats: ["Equestrian"] }, reqLine: "Equestrian",
      origin: "canon" },
    /* RUNS SRD RULES (Rose, 08-08: *"there is nothing to decide Im using srd
       here"*). Her RMXP original read "...as the target spell  to counter
       with." with no level clause; SRD Improved Counterspell requires the
       answer be ONE OR MORE LEVELS HIGHER, and that is what the battle
       sandbox already enforces. The printed line gains the clause, a
       DELIBERATE break from this file's transcribe-verbatim rule, because a
       description that promises more than the mechanic grants is the screen
       lying about the save. The verbatim original is preserved in
       LoH Documentation/2026-07-07_canon_feats_reference.md.

       What it does NOT do: countering NEGATES, it never lands. SRD is
       explicit, "both spells automatically negate each other with no other
       results" (verified d20srd.org 08-08). The feat buys FLEXIBILITY in what
       may answer, never damage; `origin` stays "canon" because the feat SLOT
       is hers, while the rule inside it is now openly SRD. */
    { name: "Improved C. Spell",
      text: "You can now use any spell from the same school as the target spell  to counter with, so long as it is a level higher.",
      req: { caster: true }, reqLine: "spellcaster", origin: "canon" },
    /* EXPOSE WEAKNESS IS GONE (Rose 2026-10-07: "ok seems like past you screwed up and made a spell a feat... fix that I
       dont even think its a srd spell"): no feat by that name in the 3.5 SRD or Pathfinder's; d20pfsrd's two are a
       third-party rune-magic script and a psionic power. Improved Critical doubles one chosen weapon's range. */
    /* "Night Owl" left this pool on 2026-09-17: it is a BLOODLINE feat (Rose: "its a bloodline feat", and
       "Bloodline feats are broken and they are canon only able to be taken at level 1 because of how broken they
       are"). It lives in heritage.js BLOODLINE_FEATS now, offered only by a parent who carries it. */
    { name: "Disciplined",
      text: "When not wearing armor you recieve more invincibility  while evading, perfect guarding, or parrying.",
      req: { bab: 2, feats: ["Dodge"] }, reqLine: "BAB +2, Dodge",
      origin: "canon" },
    { name: "Multiattack", martial: true,
      text: "Your secondary natural attacks take only a -2 penalty (instead of -5).",
      req: { naturals: 3 }, reqLine: "Three or more natural attacks" },
    { name: "Improved Multiattack", martial: true,
      text: "Your secondary natural attacks take no penalty at all.",
      req: { naturals: 3, feats: ["Multiattack"] },
      reqLine: "Three or more natural attacks, Multiattack" },
    { name: "Blind-Fight", martial: true,
      text: "Reroll your miss chance against foes you cannot see, and take no penalty when blinded in melee.",
      req: null, reqLine: null },
    { name: "Quick Draw", martial: true,
      text: "Draw a weapon as a free action instead of a move action.",
      req: { bab: 1 }, reqLine: "BAB +1" },
    { name: "Run",
      text: "Run at five times your speed instead of four, and keep your Dexterity bonus to AC while running.",
      req: null, reqLine: null },
    { name: "Two-Weapon Defense", martial: true,
      text: "While wielding two weapons, gain a +1 shield bonus to AC.",
      req: { dex: 15, feats: ["Two-Weapon Fighting"] },
      reqLine: "Dex 15, Two-Weapon Fighting" },
    { name: "Mounted Archery", martial: true,
      text: "Halve the penalty for using a ranged weapon from horseback.",
      req: { skills: { Ride: 1 }, feats: ["Mounted Combat"] },
      reqLine: "Ride 1 rank, Mounted Combat" },
    { name: "Outflank", martial: true,
      text: "Flanking with an ally who also has this feat, your flanking bonus is +4 instead of +2, and a critical from either of you hands the other an attack of opportunity.",
      req: { bab: 4 }, reqLine: "BAB +4", origin: "pf" },
    { name: "Precise Strike", martial: true,
      text: "Flanking with an ally who also has this feat, you deal +1d6 damage with a light or one-handed piercing weapon.",
      req: { dex: 13, bab: 1 }, reqLine: "Dex 13, BAB +1", origin: "pf" },
    /* Two teamwork rows shipped with their prerequisites unlabeled (Rose,
       08-16: "im positive that some of the feats require prerequisites but
       arent labeled"; checked against Archives of Nethys the same hour).
       Shield Wall wants Shield Proficiency, PRINTED but not judged: this
       game has no proficiency model yet, and inventing one here would be a
       second owner of what a class can hold. Back to Back wants Perception
       3 ranks, which in this 3.5 skill list is Spot. */
    { name: "Shield Wall", martial: true,
      text: "Adjacent to a shield-bearing ally who also has this feat, your shield bonus improves by 1, by 2 if either of you carries a tower shield.",
      /* judged since 2026-09-28 (data/proficiency.js shieldProficient): a class that carries shields, or the feat */
      req: { shield: true }, reqLine: "Shield Proficiency", origin: "pf" },
    { name: "Back to Back", martial: true,
      text: "Adjacent to an ally who also has this feat, gain +2 AC against foes flanking you.",
      req: { skills: { "Spot": 3 } }, reqLine: "Spot 3 ranks", origin: "pf" },
    { name: "Swap Places", martial: true,
      text: "Trade places with an adjacent ally who also has this feat, as part of your move, without either of you provoking.",
      req: null, reqLine: null, origin: "pf" },
    { name: "Escape Route", martial: true,
      text: "Move through squares a foe threatens without provoking, so long as an ally who also has this feat is adjacent to that foe.",
      req: null, reqLine: null, origin: "pf" },
    { name: "Coordinated Maneuvers", martial: true,
      text: "Adjacent to an ally who also has this feat, gain +2 on combat maneuver checks and +2 to your CMD.",
      req: null, reqLine: null, origin: "pf" },
    { name: "Paired Opportunists", martial: true,
      text: "Adjacent to an ally who also has this feat, gain +4 on attacks of opportunity against foes you both threaten, and when one of you takes one, so may the other.",
      req: null, reqLine: null, origin: "pf" },
    { name: "Duck and Cover", martial: true,
      text: "Adjacent to an ally who also has this feat, you may take their Reflex save result instead of your own, but you fall prone if you do.",
      req: null, reqLine: null, origin: "pf" },
    { name: "Shake It Off",
      text: "+1 on all saving throws for each adjacent ally who also has this feat, to a maximum of +3.",
      req: null, reqLine: null, origin: "pf" },
    { name: "Lookout", martial: true,
      text: "Adjacent to an ally who also has this feat, you act in the surprise round if either of you could have.",
      req: null, reqLine: null, origin: "pf" },
    { name: "Stealth Synergy", martial: true,
      text: "When you and an ally who also has this feat both hide, you both use the better of the two results.",
      req: null, reqLine: null, origin: "pf" },
    { name: "Tandem Trip", martial: true,
      text: "Tripping a foe an ally with this feat also threatens, roll the attempt twice and keep the better.",
      req: null, reqLine: null, origin: "pf" },

    /* THE HEALING FEATS ROSE ASKED FOR (2026-10-06; Pathfinder's, read on d20pfsrd.com in Chrome 2026-10-07; moves F7a and H1) */
    { name: "Fast Healer",
      text: "Regain extra hit points whenever you heal by resting or by magic: half your Constitution modifier, at least 1.",
      req: { con: 13, feats: ["Diehard", "Endurance"] }, reqLine: "Con 13, Diehard, Endurance", origin: "pf" },

    /* THE CRITICAL FEATS (Rose 2026-10-06 "All of them", and the four more 2026-10-07; Pathfinder's, each read on
       d20pfsrd.com in Chrome 2026-10-07; move F6a). `critical` is a feat's own (Critical) tag, read off each page's title:
       Critical Focus is (Combat) and Critical Versatility (Combat, Human), so neither is one of Critical Mastery's "any
       two critical feats"; one critical feat's effect a critical, two with Critical Mastery. A row whose prerequisite
       this game does not have (`unmet`) is never offered. */
    { name: "Critical Focus", martial: true,
      text: "+4 on the roll to confirm a critical hit.",
      req: { bab: 9 }, reqLine: "BAB +9", origin: "pf" },
    { name: "Bleeding Critical", martial: true, critical: true,
      text: "A slashing or piercing critical leaves the foe bleeding 2d6 each round on its turn, until a DC 15 Heal check or any magical healing; it stacks.",
      req: { feats: ["Critical Focus"], bab: 11 }, reqLine: "Critical Focus, BAB +11", origin: "pf", notYet: "Does nothing yet: it waits for bleeding (F6c)." },
    { name: "Sickening Critical", martial: true, critical: true,
      text: "A critical leaves the foe sickened for a minute.",
      req: { feats: ["Critical Focus"], bab: 11 }, reqLine: "Critical Focus, BAB +11", origin: "pf", notYet: "Does nothing yet: it waits for the sickened condition (F6b)." },
    { name: "Crippling Critical", martial: true, critical: true,
      text: "A critical halves the foe's speed for a minute (a Fortitude save, DC 10 + your base attack bonus, for 1d4 rounds).",
      req: { feats: ["Critical Focus"], bab: 13 }, reqLine: "Critical Focus, BAB +13", origin: "pf", notYet: "Does nothing yet: it waits for a halved speed (F6c)." },
    { name: "Deafening Critical", martial: true, critical: true,
      text: "A critical deafens the foe for good (a Fortitude save, DC 10 + your base attack bonus, for a round).",
      req: { feats: ["Critical Focus"], bab: 13 }, reqLine: "Critical Focus, BAB +13", origin: "pf", notYet: "Does nothing yet: it waits for the deafened condition (F6b)." },
    { name: "Staggering Critical", martial: true, critical: true,
      text: "A critical staggers the foe for 1d4+1 rounds (a Fortitude save for a round).",
      req: { feats: ["Critical Focus"], bab: 13 }, reqLine: "Critical Focus, BAB +13", origin: "pf", notYet: "Does nothing yet: it waits for the staggered condition (F6b)." },
    { name: "Tiring Critical", martial: true, critical: true,
      text: "A critical leaves the foe fatigued; nothing more on the fatigued or exhausted.",
      req: { feats: ["Critical Focus"], bab: 13 }, reqLine: "Critical Focus, BAB +13", origin: "pf" },
    { name: "Blinding Critical", martial: true, critical: true,
      text: "A critical blinds the foe for good (a Fortitude save leaves it dazzled 1d4 rounds); none on what does not see by eyes.",
      req: { feats: ["Critical Focus"], bab: 15 }, reqLine: "Critical Focus, BAB +15", origin: "pf", notYet: "Does nothing yet: it waits for the blinded condition (F6b)." },
    { name: "Censoring Critical", martial: true, critical: true,
      text: "A critical leaves the foe unable to speak for 1d4+1 rounds, so no verse with words (a Fortitude save for a round).",
      req: { feats: ["Critical Focus"], bab: 15 }, reqLine: "Critical Focus, BAB +15", origin: "pf", notYet: "Does nothing yet: it waits for a muted voice (F6c)." },
    { name: "Exhausting Critical", martial: true, critical: true,
      text: "A critical leaves the foe exhausted; nothing more on the exhausted.",
      req: { feats: ["Critical Focus", "Tiring Critical"], bab: 15 }, reqLine: "Critical Focus, Tiring Critical, BAB +15", origin: "pf" },
    { name: "Stunning Critical", martial: true, critical: true,
      text: "A critical stuns the foe for 1d4 rounds (a Fortitude save leaves it staggered 1d4 rounds instead).",
      req: { feats: ["Critical Focus", "Staggering Critical"], bab: 17 }, reqLine: "Critical Focus, Staggering Critical, BAB +17", origin: "pf", notYet: "Does nothing yet: it waits for the staggered condition for its save (F6b)." },
    { name: "Critical Mastery", martial: true, critical: true,
      text: "A critical lays two critical feats' effects, not one.",
      req: { feats: ["Critical Focus"], critFeats: 2, classLevel: { Fighter: 14 } }, reqLine: "Critical Focus, two critical feats, fighter level 14th", origin: "pf" },
    { name: "Impaling Critical", martial: true, critical: true,
      text: "A critical with that weapon leaves it in the foe, hurting it each turn until it is pulled free.",
      req: { feats: ["Critical Focus", "Weapon Specialization"], bab: 11 }, reqLine: "Critical Focus, Weapon Specialization with a piercing melee weapon, BAB +11", origin: "pf", notYet: "Does nothing yet: it waits for a weapon left in a body." },
    { name: "Improved Impaling Critical", martial: true, critical: true,
      text: "An impaled foe needs a grapple to pull your weapon free, moves at half speed, and bleeds as it comes out.",
      req: { feats: ["Impaling Critical", "Critical Focus", "Weapon Specialization"], bab: 13 }, reqLine: "Impaling Critical, Critical Focus, Weapon Specialization, BAB +13", origin: "pf", notYet: "Does nothing yet: it waits for a weapon left in a body." },
    { name: "Impact Critical Shot", martial: true, critical: true,
      text: "A ranged critical whose confirmation beats the foe's defence pushes it back or knocks it down, provoking nothing.",
      req: { dex: 13, feats: ["Point Blank Shot"], bab: 9 }, reqLine: "Dex 13, Point Blank Shot, BAB +9", origin: "pf", notYet: "Does nothing yet: it waits for the push and the trip off a shot." },
    { name: "Dispelling Critical", martial: true, critical: true,
      text: "A critical lets you cast a targeted dispel magic at the foe as a swift action.",
      req: { feats: ["Arcane Strike"], bab: 11, unmet: "Arcane Strike" }, reqLine: "Arcane Strike, BAB +11, dispel magic", origin: "pf", notYet: "Does nothing yet: it waits for Arcane Strike, not in the game." },
    { name: "Entreating Critical", martial: true, critical: true,
      text: "A critical opens a moment for a Diplomacy check to calm the foe, as Call Truce.",
      req: { cha: 15, feats: ["Call Truce", "Critical Focus", "Persuasive"], skills: { Diplomacy: 5 }, bab: 11, unmet: "Call Truce" }, reqLine: "Cha 15, Call Truce, Critical Focus, Persuasive, Diplomacy 5 ranks, BAB +11", origin: "pf", notYet: "Does nothing yet: it waits for Call Truce, not in the game." },
    { name: "Banishing Critical", martial: true, critical: true,
      text: "A slashing or bludgeoning critical lets you cast dismissal or banishment at the foe at once, its Will save at -4.",
      req: { feats: ["Critical Focus"], casterLevel: 9, unmet: "dismissal or banishment" }, reqLine: "Critical Focus, caster level 9th, dismissal or banishment", origin: "pf", notYet: "Does nothing yet: it waits for dismissal and banishment, not in the game." },
    { name: "Critical Versatility", martial: true,
      text: "Once a day, an hour's practice gives you a critical feat you qualify for until you practise another.",
      req: { classLevel: { Fighter: 11 } }, reqLine: "Fighter level 11th, human", origin: "pf", notYet: "Does nothing yet: it waits for the day's practice." },
    { name: "Accursed Critical", martial: true, critical: true,
      text: "A spell's critical lets you cast bestow curse or major curse at the target at once.",
      req: { feats: ["Critical Focus"], casterLevel: 9, unmet: "bestow curse or major curse" }, reqLine: "Critical Focus, caster level 9th, bestow curse or major curse", origin: "pf", notYet: "Does nothing yet: it waits for the curse spells, not in the game." },
    { name: "Blighted Critical", martial: true, critical: true,
      text: "A touch spell's critical gives the target a random minor spellblight.",
      req: { casterLevel: 5 }, reqLine: "Caster level 5th", origin: "pf", notYet: "Does nothing yet: it waits for spellblights." },
    { name: "Greater Blighted Critical", martial: true, critical: true,
      text: "A touch spell's critical gives the target a random major spellblight.",
      req: { feats: ["Blighted Critical"], casterLevel: 12 }, reqLine: "Blighted Critical, caster level 12th", origin: "pf", notYet: "Does nothing yet: it waits for spellblights." },
    { name: "Blighted Critical Mastery", martial: true, critical: true,
      text: "You choose the spellblight your blighted criticals give.",
      req: { feats: ["Blighted Critical"], casterLevel: 9 }, reqLine: "Blighted Critical, caster level 9th", origin: "pf", notYet: "Does nothing yet: it waits for spellblights." },

    /* THE PARRY CHAIN (Rose, 2026-08-07). Homebrew, NOT SRD, no feat named
       Parry, Improved Parry or Riposte exists in the 3.5 SRD, so these are
       ours and are marked as such for the OGL audit (see V/CREDITS.md).
       Transcribed verbatim per this file's convention, including the two
       different apostrophes in "AoO's" and the lowercase "ac bonus"; the
       double spaces are the original's paragraph breaks joined. These three
       are also the rules the battle system's parry/riposte branch is meant
       to implement, that branch is still UNVERIFIED LIVE, and this text is
       the spec it answers to. */
    { name: "Parry", martial: true,
      text: "Whenever you are targeted by anything that requires an attack roll that isn't a ranged touch or a ray, you can expend an attack of opportunity to try to parry the attack. This functions as an opposed attack roll. You must declare that you are parrying before you know the result of their attack roll. If your attack roll is higher than theirs, you parry the attack. You cannot make more parries in any one round than you have attacks in a full attack action. Your first parry in a round uses your full attack bonus, the second uses your first iterative attack, and so on.  If you are fighting with two weapons, you may parry with either at your discretion and may make as many parries as you have attacks with both weapons up to your max number of AoO‘s per round. If you are hasted or are using a weapon with the speed enchantment, you gain an extra parry each round (up to your max number of AoO's).  For each size category larger than yours a weapon is, you suffer a -2 penalty to your parry roll (if you are parrying with a shield, this penalty is halved). If your opponent is using power attack, you take a penalty to your parry roll equal to the bonus damage the opponent receives from power attack (if you are parrying with a shield, this penalty is halved). If you use combat expertise while parrying, you also gain the ac bonus to your parry roll.  If you are two weapon fighting with a shield via improved shield bash and you use your shield to make a parry, you gain its shield bonus to armor class to your parry roll (but not its enhancement bonus if it's enchanted as a weapon) and reduce the two weapon fighting penalty by 2. You cannot use a currently animated animating shield to parry.  You can only make one parry attempt for each enemy attack roll. Every attack you use to parry with, you lose during the following round (they reset at the end of your turn). You have to be aware of an attack to parry it, though you can parry flat-footed because of combat reflexes.",
      req: { dex: 13, feats: ["Combat Reflexes"] },
      reqLine: "Dex 13, Combat Reflexes", origin: "canon" },
    { name: "Improved Parry", martial: true,
      text: "Any size penalty your weapon/shield receives when parrying a larger weapon is lessened by 2.",
      req: { dex: 13, feats: ["Combat Reflexes", "Parry"] },
      reqLine: "Dex 13, Combat Reflexes, Parry", origin: "canon" },
    { name: "Riposte", martial: true,
      text: "Whenever you parry an attack, you may immediately expend another AoO to counterattack your opponent as a free action during their turn at the same attack bonus as the parry. This does not use an additional attack from the following round. If you are fighting with two weapons, you riposte with the weapon you did not parry with (at the base attack bonus as the parry).",
      req: { dex: 13, feats: ["Combat Reflexes", "Parry"] },
      reqLine: "Dex 13, Combat Reflexes, Parry", origin: "canon" },
];
