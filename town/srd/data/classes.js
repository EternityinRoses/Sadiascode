/**
 * CLASSES: the eleven paths a first-level soul may walk, and the twelve
 * prestige paths that are earned, not chosen.
 *
 * Numbers are the 3.5 SRD chassis except where marked HOMEBREW, the original
 * declares four prestige spines its own. One deliberate house rule carries
 * over as a RULE, not a datum: hit dice are max-rolled every level (the SRD
 * max-rolls 1st only), that lives wherever level-up is built, not here.
 *
 * Paladin and Ranger carry a casting ability as data; in the SRD they gain
 * spells at 4th level. The stat line therefore only says "casts on" for the
 * classes that cast at FIRST level, printing "casts on WIS" beside a level-1
 * Paladin claims something false about the character being built. The
 * original printed it; the check against it stands recorded.
 *
 * Declared order IS render order. Sorcerer and Wizard come last, as the
 * original declares them.
 *
 * THE TABLE ONLY (the Classes cog's move C1, 2026-10-07; Rose: "build the classes and feats cogs"): which
 * classes there are and what each row says (PREPARES, BASE_CLASSES, PRESTIGE_CLASSES). The rules over a
 * record's classes (its section's readers, the classes it carries, the casting questions, its levels, the
 * prestige entry's judging) are the Classes cog's, src/rules/classes.js.
 */

/* `gold` is the class's STARTING WEALTH: the Pathfinder table's dice at
   MAX ROLL (her ruling, 2026-09-02: "pathfinder it is... max roll") --
   fighter/paladin/ranger 5d6x10 = 300 down to monk 1d6x10 = 60. The
   creation purse reads it; the walk cannot seal while the worn gear
   spends past it. */
/*,,. WHO CHOOSES WORDS, AND WHO IS SIMPLY BORN WITH THEM ,,,
   Rose, 2026-09-15: "sorcerer doesnt need to learn words they are spontaneous
   casters... wizards, cleric, druids need words... I think bards are also
   spontaneous casters". Checked against the SRD rather than taken on trust,
   because he asked me to and because I had just spent an evening inventing a
   rule instead of reading one:

     Sorcerer -- "a sorcerer need not prepare his spells in advance"
     Bard     -- "a bard need not prepare his spells in advance"
     Cleric   -- "A cleric must choose and prepare his spells in advance"
     Druid    -- "A druid must choose and prepare her spells in advance"
     Wizard   -- "After resting, a wizard must study her spellbook"

   He is right on all five. Paladins and Rangers prepare too, the way clerics
   and druids do, which is why they read true here despite casting nothing
   until 4th level.

   ONE NUANCE, RECORDED AND DELIBERATELY NOT MODELLED: a cleric may drop a
   prepared spell to cast cure or inflict, and a druid to cast summon nature's
   ally. That is a SPONTANEOUS CONVERSION inside a prepared caster, not a
   second kind of caster, and this flag is about who picks a hand at rest.

   WHAT IT DECIDES. The Somatic Selection offers the word exchange only to a
   caster who prepares. A sorcerer still HOLDS words -- Rose, earlier the same
   day: "sorcerer still gets the words (because counter spell needs to counter
   words)" -- she simply never chooses them, and the screen says so instead of
   quietly handing her a choice the class does not have. */
export const PREPARES = {
    Wizard: true, Cleric: true, Druid: true, Paladin: true, Ranger: true,
    Sorcerer: false, Bard: false,
    /* THE SAVANT DOES BOTH (Rose 2026-09-17): "Savant is a caster it works like both a sorc and a wizard but instead
       of its spontaneous spells being wizard spells it is cleric spells". It PREPARES like a wizard, so the typed
       line is open to it; the spontaneous half is carried on the class row below. */
    Savant: true,
};

export const BASE_CLASSES = {
    Barbarian: { hd: 12, bab: "full",          skills: 4, casts: null,  castsAt: 0, saves: ["Fort"] , speedFt: 10, gold: 180 },
    Fighter:   { hd: 10, bab: "full",          skills: 2, casts: null,  castsAt: 0, saves: ["Fort"], gold: 300 },
    /* `casterLevel: "half"` (move F5b): the paladin's and the ranger's pages, Spells (d20srd.org, read in Chrome 2026-10-07):
       "Through 3rd level, a paladin has no caster level. At 4th level and higher, her caster level is one-half her paladin
       level", the ranger's the same; every other caster casts at its class level (rules/classes.js casterLevelAt) */
    Paladin:   { hd: 10, bab: "full",          skills: 2, casts: "WIS", castsAt: 4, casterLevel: "half", saves: ["Fort"], gold: 300 },
    Ranger:    { hd: 8,  bab: "full",          skills: 6, casts: "WIS", castsAt: 4, casterLevel: "half", saves: ["Fort", "Ref"], gold: 300 },
    Cleric:    { hd: 8,  bab: "three-quarter", skills: 2, casts: "WIS", castsAt: 1, saves: ["Fort", "Will"], gold: 240 },
    Druid:     { hd: 8,  bab: "three-quarter", skills: 4, casts: "WIS", castsAt: 1, saves: ["Fort", "Will"], gold: 120 },
    Monk:      { hd: 8,  bab: "three-quarter", skills: 4, casts: null,  castsAt: 0, saves: ["Fort", "Ref", "Will"], gold: 60 },
    Bard:      { hd: 6,  bab: "three-quarter", skills: 6, casts: "CHA", castsAt: 1, saves: ["Ref", "Will"], gold: 180 },
    Rogue:     { hd: 6,  bab: "three-quarter", skills: 8, casts: null,  castsAt: 0, saves: ["Ref"], gold: 240 },
    Sorcerer:  { hd: 4,  bab: "half",          skills: 2, casts: "CHA", castsAt: 1, saves: ["Will"], gold: 120 },
    Wizard:    { hd: 4,  bab: "half",          skills: 2, casts: "INT", castsAt: 1, saves: ["Will"], gold: 120 },
    /*,,. THE SAVANT (Rose, 2026-09-17) ,,,
       "No matter what class they have 12 Max HP. They get rage, Fighter's Bonus Feat, Wizard's Bonus Feat, Sneak
       attack, etc etc... basically they're literally unable to level up but they are something akin to a super novice
       Able to get access to every classes' (in game) traits", and then the ruling that moved it here: "actually
       'savant' shouldnt be a feat it should be a class... because of how feats are selected."

       It was authored as a bloodline feat and could only arrive through a parent's dice, which is exactly the wrong
       door for a thing that replaces a class. So it IS the class now, and the starting-path page offers it beside the
       eleven.

       IT IS A d12 LIKE ANY OTHER (Rose 09-17: "Savant doesnt have 12 flat it has 12 + con but it just cannot level.
       So its d12"). First level is the maximum die plus the Constitution modifier, the same line every class reads.
       `capped` is the whole of the difference: this body does not advance. Nothing levels yet, so the number is a
       promise the day levels land, not a gate that runs today.

       The three saves are all good because the savant is every class at once, and the bab is full for the same reason.
       Skills are the ROGUE's eight, on his word (09-17: "savant has rogues skill point scaling but it has every class
       feat all the other classes have"). */
    /*,,. THE SAVANT CASTS BOTH WAYS (Rose 2026-09-17) ,,,
       "Savant is a caster it works like both a sorc and a wizard but instead of its spontaneous spells being wizard
       spells it is cleric spells... but unfortunately for it even though it has access to metamagic it cannot
       naturally pay the cost of using it."
       The PREPARED half is the wizard's, on Intelligence, which is what `casts` and PREPARES above carry. The
       SPONTANEOUS half is the sorcerer's shape drawing on the cleric's list, carried here as `spontaneous` (the
       ability) and `spontaneousList`. The verse table is one list of sentences today with no arcane or divine
       halves, so the list half of his ruling is RECORDED AND NOT YET ENFORCED; the split is its own pass.
       THE ABILITY FOR THE SPONTANEOUS HALF IS MINE, not his: Wisdom, because that is the list's own ability here
       (Cleric casts on WIS). Say Charisma and it changes in one place.
       THE METAMAGIC CAVEAT NEEDS NO CODE: metamagic is paid by casting from a higher slot, and a savant never leaves
       first level, so it holds the feats and has no room to spend them. That is his "cannot naturally pay the cost",
       and it falls straight out of the cap rather than being enforced anywhere. */
    Savant:    { hd: 12, bab: "full",          skills: 8, casts: "BEST", castsAt: 1, spontaneousList: "divine",
                 saves: ["Fort", "Ref", "Will"],
                 /* the barbarian's fast movement is a class feature like any other, so the savant walks with it
                    (Rose 09-17: "barbarian gets +10 ms... so Savant should be able to do that too") */
                 speedFt: 10, capped: 1, everyGift: true, gold: 180 },
};

/**
 * Requirement grammar: each line is `[kind, ...args]`, rendered and judged by
 * the helpers below. Kinds: align (morality), bab, feat, featCount, skill,
 * lang, classAny.
 */
export const PRESTIGE_CLASSES = {
    Shadowdancer: {
        hd: 8, bab: "three-quarter", skills: 6, saves: ["Ref"],
        entry: [["feat", "Combat Reflexes"], ["feat", "Dodge"], ["feat", "Mobility"],
                ["skill", "Hide", 10], ["skill", "Move Silently", 8], ["skill", "Perform", 5]],
    },
    Assassin: {
        /* Entry drops the SRD's Disguise ranks and the murder clause, the
           original's own cut, kept. */
        hd: 6, bab: "three-quarter", skills: 4, saves: ["Ref"],
        entry: [["align", "Evil"], ["skill", "Hide", 8], ["skill", "Move Silently", 8]],
    },
    Blackguard: {
        hd: 10, bab: "full", skills: 2, saves: ["Fort"],
        entry: [["align", "Evil"], ["bab", 6], ["feat", "Power Attack"], ["feat", "Cleave"],
                ["feat", "Improved Sunder"], ["skill", "Hide", 5], ["skill", "Knowledge (Religion)", 2]],
    },
    Duelist: {
        hd: 10, bab: "full", skills: 4, saves: ["Ref"],
        entry: [["bab", 6], ["feat", "Weapon Finesse"], ["feat", "Dodge"], ["feat", "Mobility"],
                ["skill", "Tumble", 5], ["skill", "Perform", 3]],
    },
    "Horizon Walker": {
        hd: 8, bab: "full", skills: 4, saves: ["Fort"],
        entry: [["feat", "Endurance"], ["skill", "Knowledge (Geography)", 8]],
    },
    "Dragon Disciple": {
        /* "Casts arcane without preparation" proxied as Sorcerer/Bard levels,
           the original's reading. Its language check could never tick (a
           list-vs-string bug); this one can. */
        hd: 12, bab: "three-quarter", skills: 2, saves: ["Fort", "Will"],
        entry: [["skill", "Knowledge (Arcana)", 8], ["lang", "Draconic"],
                ["classAny", ["Sorcerer", "Bard"]]],
    },
    Archmage: {
        hd: 4, bab: "half", skills: 2, saves: ["Will"],
        entry: [["feat", "Skill Focus (Spellcraft)"], ["featCount", "Spell Focus", 2],
                ["skill", "Spellcraft", 15], ["skill", "Knowledge (Arcana)", 15],
                ["classAny", ["Wizard", "Sorcerer"]]],
    },
    Hierophant: {
        hd: 8, bab: "half", skills: 2, saves: ["Fort", "Will"],
        entry: [["skill", "Knowledge (Religion)", 15], ["classAny", ["Cleric", "Druid"]]],
    },
    "Frenzied Berserker": {  // HOMEBREW spine, the original's own (Rose, 07-14)
        hd: 12, bab: "full", skills: 2, saves: ["Fort"],
        entry: [["bab", 6], ["feat", "Power Attack"], ["feat", "Cleave"],
                ["classAny", ["Barbarian"]]],
    },
    "Ki Adept": {            // HOMEBREW
        hd: 8, bab: "three-quarter", skills: 4, saves: ["Fort", "Ref", "Will"],
        entry: [["bab", 5], ["feat", "Improved Unarmed Strike"], ["skill", "Tumble", 5],
                ["classAny", ["Monk"]]],
    },
    Virtuoso: {              // HOMEBREW
        hd: 6, bab: "three-quarter", skills: 6, saves: ["Ref", "Will"],
        entry: [["skill", "Perform", 10], ["classAny", ["Bard"]]],
    },
    Beastlord: {             // HOMEBREW
        hd: 8, bab: "three-quarter", skills: 4, saves: ["Fort", "Will"],
        entry: [["skill", "Knowledge (Nature)", 8], ["skill", "Handle Animal", 5],
                ["classAny", ["Druid"]]],
    },
};
