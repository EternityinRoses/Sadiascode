/**
 * HERITAGE: the authored content behind Blood & Hearth.
 *
 * THE LAW THAT IS EASIEST TO GET WRONG: **races carry no ability modifiers.**
 * Every race is flat zeroes. All ability changes come from ETHNICITY, and both
 * parents' ethnicities stack onto the child, uncapped.
 *
 * "???" is not a mistake. It is an authored, visible token meaning one unspent
 * language pick, spent later on the Faith page. It is filtered out of counts and
 * printed lists but stays alive underneath.
 */
/* a data leaf importing a data leaf -- the safe floor weapons.js itself
   documents; the purse charges the chosen weapon in spentOf below */
import { WEAPON_GP } from "./weapons.js";
import { BASE_CLASSES } from "./classes.js";
/* an armour piece's numbers: its kind in the armour table, worn as rules/armour.js answers (the armour table, A0-A3) */
import { wornOf } from "../rules/armour.js";

export const RACES = {
    Human: {
        name: "Human",
        blurb: "Harpine's prominent race.",
        /* the human gift rides as FLAGS now, not named pseudo-traits
           (Rose 08-14: "remove talent and skill from racial feats since
           it's confusing... leave the regional racial feats"): the +1
           feat and +4 skill points still land, the labels do not. */
        traits: [],
        bonusFeat: true, bonusSkills: true,
        languages: ["Common", "???"],
        lifespan: () => 70 + roll(20) + roll(20),          // 70–108
        bearingAge: 25,
        nightVision: 0,
        skills: {},
    },
    Elf: {
        name: "Elf",
        blurb: "Frail cousin to humanity.",
        traits: ["Observant", "Light Step"],
        languages: ["Common", "Elven"],
        lifespan: () => 350 + roll(100) + roll(100) + roll(100) + roll(100),
        bearingAge: 110,
        nightVision: 0,
        skills: { Tumble: 1, Listen: 1 },
    },
    Shade: {
        name: "Shade",
        blurb: "Defects born of shadow.",
        traits: ["Shadowmeld"],
        languages: ["Common"],
        lifespan: () => 200 + roll(100) + roll(100),
        bearingAge: 25,
        nightVision: 1,
        incorporeal: true,
        undead: true,
        dr: { cold: 5 },                // undead things do not feel the cold
        /* 100 = never takes a critical or a sneak attack. RAW undead are "not
           subject to critical hits, nonlethal damage, ability drain, or energy
           drain" outright; a HALF-undead gets the 50% fortification instead. The
           two numbers fall straight out of the full/half rule, so this needs no
           special case, see fortificationFor. */
        fortification: 100,
        skills: {},
    },
    Cambion: {
        name: "Cambion",
        blurb: "Charismatic defects.",
        /* CAMBIONS CARRY NO AUTOMATIC TRAIT, and that is the point rather than
           an omission. Everything a cambion IS, fire, dark sight, horns. Is
           INTRINSIC and stated in its own field below, so a trait slot spent
           restating the blood was pure redundancy (Rose, 08-07: *"flame
           affinity is redundant tbh so we remove that and just let riven
           feats carry"*, and *"night vision is a intrensic inheritance"*).
           What a cambion CHOOSES is the Riven feats, which is the shape they
           were authored in: deformities TAKEN, not blood inherited. */
        traits: [],
        languages: ["Common", "Demon", "???"],
        lifespan: () => 100 + roll(25) + roll(25),
        bearingAge: 25,
        nightVision: 1,
        dr: { fire: 5 },                // effectively tieflings
        skills: {},
    },
};

/** Canonical order, so mother/father order never changes the child. */
export const RACE_ORDER = ["Human", "Elf", "Shade", "Cambion"];

/**
 * The youngest a mother can have borne the child. DERIVED from the race's
 * own authored bearingAge, one ratio for every blood (Rose, 08-06: human
 * floor is 20, and 20 is exactly 0.8 of the human bearingAge of 25, so an
 * Elf floors at 88 of her 110, never at a human number). Every place that
 * seeds, clamps or sliders ageAtBirth reads THIS; the flat 16s it replaced
 * were the squick oversight.
 */
export const bearingFloor = (race) =>
    Math.round(((RACES[race] ? RACES[race].bearingAge : 25)) * 0.8);

/**
 * The six crosses. Their LEARNED traits stay authored and their inconsistencies
 * are deliberate. Human/Elf carries no trait effects at all, uniquely.
 *
 * WHAT IS NO LONGER TABLED HERE: night vision and damage reduction. Both are
 * INTRINSIC (Rose, 08-07: *"night vision is a intrensic inheritance kid gets
 * half the parent full if a full blood"*), so both are DERIVED from the two
 * parent races by `nightVisionFor` / `drFor`, one rule instead of six hand
 * written flags that could disagree with each other, which they already did:
 * Human/Shade was authored with night vision and Elf/Shade without it, from
 * the same Shade parent. Neither entry was wrong on purpose; nobody had a
 * rule to check them against. Now there is one.
 *
 * Any Shade cross is undead, a "half-blood Shade" names which kind of undead
 * you are, not a dilution of the fact, so `undead`/`incorporeal` STAY tabled.
 */
const CROSSES = {
    "Human|Elf": {
        blurb: "Shunned halfblood pairing.",
        traits: ["Light Step"],
        bonusSkills: true,
        languages: ["Common", "Elven", "???"],
        skills: {},
    },
    "Human|Shade": {
        blurb: "Birthed from malice and lust.",
        traits: [],
        /* carried bonusFeat until 08-17; Rose overruled: "pure humans
           get an extra feat... only pure humans". No cross carries the
           feat half now; the RACES.Human entry is its only home. */
        languages: ["Common", "???"],
        undead: true, incorporeal: true, skills: {},
    },
    "Human|Cambion": {
        blurb: "Charismatic halfblood.",
        traits: [],
        bonusSkills: true,
        languages: ["Common", "Demon", "???"],
        skills: {},
    },
    "Elf|Shade": {
        blurb: "An agile and silent hunter.",
        traits: ["Light Step", "Shadowmeld"],
        languages: ["Common", "Elven"],
        undead: true, incorporeal: true, skills: { Tumble: 1, Listen: 1 },
    },
    "Elf|Cambion": {
        blurb: "Charismatic and beautiful.",
        traits: ["Light Step"],
        languages: ["Common", "Demon", "Elven", "???"],
        skills: { Tumble: 1, Listen: 1 },
    },
    "Shade|Cambion": {
        blurb: "Born of shadow and flame.",
        traits: ["Shadowmeld"],
        languages: ["Common", "Demon", "???"],
        undead: true, incorporeal: true, skills: {},
    },
};

/**
 * Both derived by watching the original run, not from any written spec.
 * HP = 10 + CON modifier fits all ten observed pairings.
 * Move speed is 3.00 flat, less 0.35 for each Shade parent, observed exactly
 * 3.00 / 2.65 / 2.30 for zero / one / two.
 */
export const abilityMod = (score) => Math.floor((score - 10) / 2);
/*,,. A d4 WIZARD WAS AS TOUGH AS A d12 BARBARIAN ,,,
   Rose, 2026-09-15: "Character creation lies about stats. It says rogues have
   8 hp and so on..."

   It did. This was `10 + abilityMod(con)` for EVERY class, and 10 is the
   Fighter's die -- so a Rogue read three too many, a Sorcerer six too many,
   and a Barbarian two too few. His own rogue has Con -2: the page said 8 and
   the body that takes the hits said 4.

   THE CLASS TABLE WAS ALREADY THERE. data/classes.js has carried every hit
   die since it was written, battle/roster.js grants `c.hd + con` correctly,
   and the comment beside that line has named this exact fault for weeks --
   "hpFrom gives everyone 10 + CON, which makes a d4 wizard as tough as a d12
   barbarian". menu.js works around it by preferring the fighter's maxHp and
   says so at its own hpMax. Three files knew; the one the player reads did
   not ask.

   SRD, first level: MAXIMUM hit die plus the Constitution modifier, and never
   below 1 -- a first-level character does not roll for it.

   THE PATH IS OPTIONAL so nothing that cannot name a class breaks: with no
   class this answers exactly what it always did, which keeps the pre-class
   pages of creation reading the same as before she has chosen one. */
export const hpFrom = (con, path) => {
    const key = path && Object.keys(BASE_CLASSES).find(
        (k) => k.toLowerCase() === String(path).trim().toLowerCase());
    const hd = key ? BASE_CLASSES[key].hd : 10;
    return Math.max(1, hd + abilityMod(con));
};
/* THE MOVE COLUMN, RESTORED (Rose 08-14: "I swear forest elf and wraith
   had movement speed increases" -- and the reference table proves her
   sworn memory: Sadia_learning/LoH Documentation/creation-reference-rules
   carries Move as its own column, ADDED to base movement: Forest Elf
   +0.25, Wraith +0.5 (and falling +0.75, unported), Lich -0.35). The old
   line here, "-0.35 per Shade parent", was the LICH's penalty observed
   in playtests and mistaken for a race-wide Shade rule -- the observed
   Shades were Liches -- which quietly robbed every Wraith of its speed.
   The pace is an ETHNICITY's, summed per parent exactly as the old rule
   already summed (two Lich parents = 2.30, the observed number), and it
   reaches combat on its own: sheet.moveSpeed rides speedFtFrom, so a
   Wraith-blooded 3.50 walks 35 ft a turn. */
/* AUTHORED IN FEET NOW (Rose 08-14: "10+ movement is like agh....
   change move speed to feet. Barbarian gets +10 I believe, wood elf and
   wraith gets +5"). The ethnicity `move` fields are FEET, the sum is
   FEET (base 30), and speedFtFrom's pass-through tolerance was built
   for exactly this day: anything already large enough to be feet goes
   through untouched. The world's own integrator pace never read this
   number for her, and the jump's converter tolerates both units. */
export const moveSpeed = (motherEthnicity, fatherEthnicity) => {
    const of = (e) => (ETHNICITIES[e] && ETHNICITIES[e].move) || 0;
    return 30 + of(motherEthnicity) + of(fatherEthnicity);
};

/**
 * THE SAME PACE, AS A TURN'S WORTH OF FEET -- and it lives here because
 * `moveSpeed` lives here, so the two cannot drift apart.
 *
 * There are two clocks in this game and they are easy to mistake for each
 * other. `moveSpeed` is 3.00 and it is the void integrator's real-time pace;
 * `speedFt` is how far a fighter may move in one six-second turn, which the
 * battle engine is tuned against at 30. Reading one as the other gives a body
 * that moves three feet in a turn, and on the board that reads as an ally
 * refusing to close rather than as a units bug.
 *
 * The rule is the world's own, lifted verbatim out of `world/void.js`'s
 * private `speedFtOf()` (which the jump has used since 08-09) rather than
 * invented a second time here: ×10, and anything already large enough to be
 * feet is passed through untouched. That tolerance is the part worth keeping -- 
 * it is what stops a sheet that one day carries feet directly from becoming a
 * three-hundred-foot turn.
 *
 * Same numbers the jump has always used: 3.00 → 30 ft, one Shade 2.65 → 26.5,
 * two 2.30 → 23.
 */
export const speedFtFrom = (pace) => {
    const s = Number(pace);
    if (!isFinite(s) || s <= 0) return 30;      // no sheet yet: the default
    return s > 10 ? s : s * 10;                 // feet, or LoH units ×10
};

/** Ability order everywhere: STR DEX CON INT WIS CHA. */
export const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

export const ETHNICITIES = {
    Neigi:        { race: "Human", blurb: "Noble-blooded humans of refined bearing.", mods: [0,0,0,0,0,0], trait: "Rapier Affinity",
                    tones: ["Pale","Porcelain","Warm Ivory","Beige","Honey"] },
    Forbidden:    { race: "Human", blurb: "Outcast humans hardened by the wilds.",    mods: [0,0,0,0,0,0], trait: "Unarmed Affinity",
                    tones: ["Beige","Honey","Almond","Chocolate","Senna"] },
    Eishu:        { race: "Human", blurb: "Artisans and tinkers of the eastern reaches.", mods: [0,0,0,0,0,0], trait: "Polearm Affinity",
                    tones: ["Warm Ivory","Beige","Senna","Honey","Porcelain"] },
    Weish:        { race: "Human", blurb: "Hardy frontier folk.",                     mods: [0,0,0,0,0,0], trait: "Greatsword Affinity",
                    tones: ["Pale","Warm Ivory","Porcelain","Beige","Albino"] },

    /* THE ELVEN STAT BLOCKS, SET BY ROSE 08-08: Forest Elf DEX/WIS ("they feel
       like hunter gatherers"), Lunaris INT/WIS, Exiled Elf DEX/INT, two stats
       at **+1** each, plus one **−1** apiece added 08-08: Forest Elf −STR,
       Lunaris −CON, Exiled Elf −CHA. Replaces the v1 arrays, which spread ±1
       across five stats and put the CON penalty on all three lines.
       +1 IS THE FULL BLOCK, not a halved one (Rose, 08-08: *"give them 1 so if
       both parents are the same they get the full statblock"*). A matched pair
       hands the child the whole +1; a mixed pair halves it, and at this
       granularity halving simply means the child does not inherit it. Ability
       mods are already the smallest meaningful unit, do NOT inflate them to
       even numbers to make the division tidy. That reasoning belongs only to the
       affinity bonuses in feats.js, where AC and movement have room to halve.
       ("W. Affinity" was the authored abbreviation; Rose spelled it out 08-08.) */
    "Forest Elf": { race: "Elf", blurb: "Woodland elves attuned to nature.",  mods: [-1,1,0,0,1,0], trait: "Woodland Affinity", bloodline: "Tracking", move: 5,
                    tones: ["Senna","Almond","Honey","Porcelain","Beige"] },
    Lunaris:      { race: "Elf", blurb: "Moon-touched elven mystics.",        mods: [0,0,-1,1,1,0], trait: "Lunari Ritual",
                    tones: ["Pale","Albino","Porcelain","Warm Ivory","Grey"] },
    /* The one SUBRACE that carries an intrinsic: they took to the dark and
       their eyes went with them, though elves as a race see no better than
       humans. Graded like every other night vision (1 = full) rather than the
       bare `true` it sat at while nothing read it. */
    "Exiled Elf": { race: "Elf", blurb: "Banished elves who took to the dark.", mods: [0,1,0,1,0,-1], trait: "Darkness", nightVision: 1,
                    tones: ["Dark Grey","Jet Black","Obsidian","Blue","Albino"] },

    /* THE SHADE LINES, SET BY ROSE 08-08. The wraith is the fast one and the
       lich is the scholar, which the v1 arrays did not express. Lich was a flat
       WIS/CHA penalty and nothing else, and Wraith was a +1 in four stats. */
    /* ONE SHADOW BLOODLINE EACH (Rose, 2026-09-17: "Give lich shadow step instead oh giving lich shadow strike AND
       shadow step so both subraces gets one a piece"). Both were filed under the Wraith on 08-08, when the point was
       simply that they had to be reachable at all; now the Wraith keeps the strike, which suits the swift and vengeful
       one, and the Lich takes the step, which suits the scholar who would rather not be seen. `bloodline` stays able
       to hold an array: a line may still own more than one. */
    Wraith:       { race: "Shade", blurb: "Swift, vengeful shades.",                  mods: [1,1,0,-1,0,0], trait: "Black Cat", move: 5,
                    bloodline: "Shadow Strike",
                    tones: ["Blue","Grey","Obsidian","Pale","Dark Grey"] },
    Lich:         { race: "Shade", blurb: "Undying shade scholars of forbidden lore.", mods: [-1,-1,0,1,1,1], trait: "Devour Dead", move: -3.5,
                    bloodline: "Shadow Step",
                    tones: ["Blue","Grey","Obsidian","Pale","Jet Black"] },

    /* THE CAMBION LINES REACH THEIR OWN PALETTE (2026-08-07). v1's authored
       tones are kept and the infernal ones APPENDED rather than swapped in: a
       succubus who passes for human is the point of a succubus, so the dice
       must still be able to hand her Warm Ivory. Without this the new reds are
       gated open and never rolled, a palette nobody wears. */
    /* THE CUBI STAT BLOCK, SET BY ROSE 08-08: **CHA +2, INT −1, STR −1**, and
       her note alongside it, *"(+4 cha for full bloods)"*. The array here is
       the ONE line's block; the doubled Charisma is what a MATCHED pair is meant
       to yield. The penalties were to "stay at −1" in that note; Rose
       closed it on 09-16 ("Cubi x Cubi is correct they're that broken in
       terms of charisma, but no go ahead and double it to -2"), so the
       plain sum in inheritedMods is the rule: STR −2, INT −2, CHA +4 for
       a matched pair, and there is no exception to build.
       Succubus and Incubus carry the SAME block because they are the same
       subrace under two gendered names (see the Incubus note below). */
    /* THE CUBI'S COLD (Rose 09-16, after the tiefling check: the SRD tiefling
       has "resistance to cold 5, electricity 5, and fire 5"; "just give
       succubus dr to cold as well and call it a day. Changeling is fine as
       is"). So the three cubi names carry `dr: { cold: 5 }` on TOP of the
       Cambion race's fire 5, and Changeling keeps the race's fire alone. The
       game keeps its own word for it, DR, on the sheet and in the fight;
       drFor below reads a subrace's dr the way nightVisionFor reads its eyes. */
    Succubus:     { race: "Cambion", blurb: "Seductive cambion daughters.",  mods: [-1,0,0,-1,0,2], trait: "Masochism", bloodline: "Dream Eater", only: "female", dr: { cold: 5 },
                    tones: ["Warm Ivory","Honey","Almond","Chocolate","Porcelain","Ember","Crimson"] },
    /* INCUBUS IS A NAME, NOT A SUBRACE (Rose, 08-08: *"succubi, incubi, concubi
       are the names of the same subrace but gendered"* / *"all 3 cubi has the
       same statblock"*). Its row previously held Changeling's numbers as filler
       and `trait: null`; it now carries the cubi block, Masochism and Dream
       Eater like its sisters. The row survives only until the three collapse
       into one subrace whose NAME follows the pronoun triple, parked in
       _deferred_systems.md, and it needs Concubus's palette from Rose.
       (No palette was authored for Incubus in v1, so it silently fell back to
       the generic one; the one below was given rather than reproducing the hole.) */
    Incubus:      { race: "Cambion", blurb: "Seductive cambion sons.",       mods: [-1,0,0,-1,0,2], trait: "Masochism", bloodline: "Dream Eater", dr: { cold: 5 },
                    tones: ["Warm Ivory","Honey","Almond","Senna","Beige","Vermilion","Maroon"] },
    /* Rose 08-08: **STR +1, DEX +1, INT −1.** No longer the array Incubus was
       carrying, a shape-stealer is quick and strong-handed, not charismatic. */
    /* THE THIRD CUBI NAME. Same subrace, same block; it exists so a cambion
       whose pronouns are neither wholly feminine nor wholly masculine has a word
       (Rose, 08-08). Its palette is Succubus's for now, the fully authored one,
       and Rose still owes Concubus a spread of its own. */
    Concubus:     { race: "Cambion", blurb: "Seductive cambion children.",   mods: [-1,0,0,-1,0,2], trait: "Masochism", bloodline: "Dream Eater", dr: { cold: 5 },
                    tones: ["Warm Ivory","Honey","Almond","Chocolate","Porcelain","Ember","Crimson"] },
    Changeling:   { race: "Cambion", blurb: "Shape-stealing cambion tricksters.", mods: [1,1,0,-1,0,0], trait: "Polymorph", bloodline: "Aug. Disguise",
                    tones: ["Chocolate","Senna","Honey","Porcelain","Beige","Cinder","Vermilion"] },
};

/**
 * PRONOUN TONE: 'fem' | 'masc' | 'mixed'. Rose, 08-08: *"she/her/her is a
 * succubus while he/him/his is a incubus and anything else is a concubus even
 * mix combinations of pronouns."*
 *
 * PURITY, NOT MAJORITY. All three slots must agree; one stray word makes the set
 * mixed. `kinWord` used to resolve by majority, so `she/he/his` came out Father,
 * two votes to one, when Rose's rule makes it Parent. This is the single source
 * both the kin word and the cubi name read, so they can never disagree.
 */
const FEM = ["She", "Her", "Hers"];
const MASC = ["He", "Him", "His"];

export function pronounTone(pronouns) {
    if (!pronouns) return "mixed";
    const rows = [pronouns.subjective, pronouns.objective, pronouns.possessive];
    if (rows.every(v => FEM.includes(v))) return "fem";
    if (rows.every(v => MASC.includes(v))) return "masc";
    return "mixed";
}

/** The cubi are ONE subrace under three gendered names; the pronouns pick which. */
export const CUBI = { fem: "Succubus", masc: "Incubus", mixed: "Concubus" };
export const isCubi = (name) => Object.values(CUBI).includes(name);
export const cubiNameFor = (pronouns) => CUBI[pronounTone(pronouns)];

/**
 * ETHNICITY SKILL GRANTS: the "hidden skills from heritage".
 *
 * Added to the child's final ranks but never shown on the skills page, which
 * lists only what the player allocated themselves. Applied once PER PARENT, so
 * two parents of the same ethnicity stack the ranks.
 */
const ETHNIC_SKILLS = {
    Neigi:        { "Knowledge (Nobility)": 2, "Diplomacy": 2, "Knowledge (Local)": 1, "Sense Motive": 1 },
    Forbidden:    { "Knowledge (Local)": 2, "Knowledge (Geography)": 2, "Knowledge (Dungeoneering)": 2, "Balance": 1, "Climb": 1 },
    Eishu:        { "Disable Device": 2, "Open Lock": 2, "Knowledge (Architecture)": 2 },
    Weish:        { "Intimidate": 2, "Survival": 2 },
    "Forest Elf": { "Survival": 1, "Spot": 1, "Move Silently": 1, "Hide": 1, "Gather Information": 1,
                    "Search": 1, "Ride": 1, "Knowledge (Nature)": 1, "Handle Animal": 1 },
    Lunaris:      { "Knowledge (Religion)": 1, "Heal": 1, "Spellcraft": 1, "Concentration": 1 },
    "Exiled Elf": { "Move Silently": 1, "Hide": 1, "Intimidate": 1, "Open Lock": 1, "Spot": 1 },
    Wraith:       { "Move Silently": 2, "Hide": 2, "Escape Artist": 1, "Intimidate": 1 },
    Lich:         { "Knowledge (History)": 2, "Knowledge (Arcana)": 2, "Knowledge (Local)": 2,
                    "Knowledge (Planes)": 1, "Spellcraft": 1 },
    Succubus:     { "Sense Motive": 1, "Gather Information": 1, "Diplomacy": 1, "Bluff": 1, "Perform": 1 },
    Incubus:      { "Sense Motive": 1, "Gather Information": 1, "Diplomacy": 1, "Bluff": 1, "Perform": 1 },
    Changeling:   { "Disguise": 1, "Intimidate": 1, "Bluff": 1, "Forgery": 1, "Hide": 1, "Sleight of Hand": 1 },
};

/** Race grants, also once per parent. Only the Elf carries any. */
const RACE_SKILLS = {
    Elf: { "Tumble": 1, "Listen": 1 },
};

/*,,. THESE ARE BONUSES. THEY ARE NOT RANKS (Rose 2026-09-22) ,,,

   *"forest elf cannot grant ranks.... just bonuses"*, and then, of the rest:
   *"same for every other subrace"*, and the law under both:
   *"ranks are only granted by level each level up you can put a rank into a skill"*.

   SO THE ONLY SOURCE OF A RANK IS LEVELLING -- the allocation at first level and one spend per level
   after. Blood, race, subrace, feats and Skill Focus all grant BONUSES, which reach the roll and reach
   nothing else.

   WHAT THAT DISTINCTION DECIDES, and it is not cosmetic:
     TRAINED ONLY   Open Lock and Disable Device cannot be attempted without a RANK. An Eishu bonus of 2
                    in both was opening them, so a character who had never studied a lock was picking
                    them. That was the sharpest of nine readers treating this table as ranks.
     SYNERGY        "5 or more ranks in X" is a rank count. A +2 bonus must never carry a character over
                    that line.
     THE RANK CAP   3 + level for a class skill, half otherwise, is a cap on what was BOUGHT. A bonus
                    does not eat the budget and is not capped by it.

   The name `hiddenSkills` and the old wording here ("ranks stacked where the two parents overlap") are
   what let the mistake spread; both are corrected. The numbers themselves are unchanged -- they were
   always the right SIZE, they were just the wrong KIND.

 * Everything the blood grants, as a BONUS per skill, stacked where the two
 * parents overlap.
 * The counter beside it is the number of DISTINCT skills, not the total bonus,
 * two Forest Elf parents give nine skills at rank 2, and that reads as 11 with
 * the Elf race pair, not 22.
 */
export function hiddenSkills(mother, father) {
    const out = {};
    const add = (grants) => {
        for (const [skill, rank] of Object.entries(grants || {})) {
            out[skill] = (out[skill] || 0) + rank;
        }
    };
    for (const p of [mother, father]) {
        if (!p) continue;
        add(RACE_SKILLS[p.race]);
        add(ETHNIC_SKILLS[p.ethnicity]);
    }
    return out;
}

/**
 * Advisory, not a gate, what gets ROLLED, never what may be chosen.
 *
 * `allowed` is the person's gated palette (see `tonesFor`). A roll must never
 * hand out a tone the player is not allowed to keep, so an ethnicity that names
 * a Shade tone simply rolls from what is left.
 */
export function tonesOffered(ethnicity, allowed = null) {
    const e = ETHNICITIES[ethnicity];
    const list = (e && e.tones) || Object.keys(SKIN_TONES).slice(0, 5);
    if (!allowed) return list;
    const legal = list.filter(t => allowed.includes(t));
    return legal.length ? legal : allowed.slice(0, 5);
}

/**
 * The fourteen tones, MEASURED off the original's chips rather than guessed.
 * All fourteen are always choosable, an ethnicity's offering is ADVISORY, not a
 * gate. What it controls is which tones get ROLLED, so a Lich is normally grey
 * or obsidian and a player who wants otherwise is not stopped.
 */
/**
 * COLOUR IS A NAMED CHOICE, like a skin tone, not a slider.
 *
 * A hue slider only moves one of colour's three axes, so black, white and grey
 * were unreachable and every natural brown was a coordinated drag away. Naming
 * the colours fixes that and reads far better beside the skin chips: the record
 * stores `"Auburn"`, not three floats nobody can picture.
 *
 * Each slot gets its own palette because the believable range differs, hair
 * that a human grows, eyes a human has, and then a few the blood might explain.
 * Every name appears ONCE per slot: a list offering `Black` twice, at two
 * different values, is a list that cannot be trusted.
 */
export const COLOURS = {
    eye: {
        "Dark Brown": "#3b2416", "Brown": "#634e34", "Hazel": "#8e7618",
        "Amber": "#b07a3c", "Green": "#5b7f4a", "Blue": "#6a8caf",
        "Pale Blue": "#a8c4d8", "Grey": "#8f9aa3", "Violet": "#6f4a9c",
        "Red": "#8c2f2f", "Black": "#141114", "White": "#e8e6e2",
    },
    hair: {
        "Black": "#141114", "Dark Brown": "#3b2f2a", "Brown": "#6b4423",
        "Auburn": "#7b3f1d", "Ginger": "#a8551f", "Blonde": "#c9a45e",
        "Platinum": "#ded4bf", "White": "#efece4", "Grey": "#9a9a9a",
        "Blue": "#3f5f8c", "Green": "#3f6b4a", "Violet": "#6b4a8c", "Rose": "#a85f77",
        /* pure red (Rose 2026-09-26: "also pure red for the hair option I like the color red because I'm edgy") */
        "Red": "#ff0000",
    },
    horn: {
        "Bone": "#c9bda3", "Ivory": "#ded3bb", "Ash": "#8a8478",
        "Charcoal": "#3d3a36", "Black": "#1a1816", "Crimson": "#6e2320",
        "Gold": "#a8822f",
    },
    /* the DEV ROOM's tint dropdown reads this palette (room.js); it is
       wear-engine colour, not a creator offering */
    garment: {
        "Black": "#17161a", "Charcoal": "#33313a", "Grey": "#7d7b85", "White": "#e8e6ea",
        "Crimson": "#7c2230", "Rust": "#8a4a24", "Amber": "#b07f2a", "Olive": "#5d6234",
        "Teal": "#2c6168", "Blue": "#33507f", "Indigo": "#413a72", "Violet": "#6a4a8c",
        "Rose": "#96566b",
    },
    /* Pale shades earn their place: a white or silver lip is how a Shade or a
       Lich reads as one, and the ordinary browns cannot say that. */
    makeup: {
        "Rose": "#b4586e", "Berry": "#7d2740", "Crimson": "#9c2230", "Wine": "#5c1d2c",
        "Coral": "#c86a52", "Nude": "#b98a76", "Plum": "#6b3a63", "Violet": "#7a4a94",
        "Gold": "#b08a34", "Bronze": "#8a6134", "Teal": "#2f6b6f",
        "Ash": "#9a97a2", "Silver": "#c6c4cc", "White": "#f0eef2", "Black": "#15131a",
    },
    /* INK IS NOT PAINT and the palette says so: these are the colours a needle
       actually lays down, which is why there is no pastel in it and why White
       is here (a real and deliberate thing to be tattooed in) beside a Black
       that is nearly but not quite neutral. The layers on disk are BLACK with
       an alpha, so `composeSkin`'s `source-in` refills the shape with whatever
       is chosen here and the artwork's own feathering survives it. */
    ink: {
        "Black": "#17151a", "Ash": "#4a4750", "Blue Black": "#1c2436",
        "Indigo": "#33306b", "Teal": "#1f5559", "Emerald": "#245140",
        "Crimson": "#7a2029", "Rust": "#7d4326", "Violet": "#553874",
        "Gold": "#8f7226", "White": "#eae6df",
    },
    /* METAL AND STONE IN ONE PALETTE, because a choker is both and the same
       row has to dress a band and the gem hanging off it. Tinting a worn piece
       DROPS its opaque map (doll.js's map rule), so these read as solid
       material rather than as a wash over the authored texture, which is why
       the metals are values rather than hues. */
    jewel: {
        "Gold": "#b08a34", "Pale Gold": "#cbb26a", "Rose Gold": "#b98168",
        "Silver": "#c6c4cc", "Steel": "#8a8b93", "Copper": "#96613a",
        "Bronze": "#8a6134", "Black": "#17161a", "White": "#e8e6ea",
        "Crimson": "#7c2230", "Amber": "#b07f2a", "Emerald": "#2c6a4a",
        "Blue": "#33507f", "Violet": "#6a4a8c",
    },
};

/** The hex a slot's named colour resolves to, or a safe mid-grey. */
export const colourOf = (slot, name) => (COLOURS[slot] && COLOURS[slot][name]) || "#808080";

/* HIGHLIGHTS (her ask, 2026-09-03: "can we do highlights or ... stuff like
   this" -- balayage tips, dark roots, platinum-and-blue streaks). A second
   colour from the hair palette, laid on by STYLE and AMOUNT; words on the
   surface, and underneath the one number the dais hands its shader: for
   Tips and Roots the fraction of the hair's height the second colour
   reaches from its own end, for Streaks the share of strands it takes.
   RESTORED 2026-09-09 from the 2026-09-03 backup: the whole 09-03 session
   was reverted to v204 that night at her word over the transport rig, and
   this went out with it though it was never the fault (Rose, 2026-09-09:
   "we had things like multiple hair colors rigged in I dont see it
   anymore"). */
export const HIGHLIGHT_STYLES = ["Tips", "Roots", "Streaks"];
export const HIGHLIGHT_AMOUNTS = ["Subtle", "Balanced", "Bold"];
export const HIGHLIGHT_REACH = {
    Tips:    { Subtle: 0.30, Balanced: 0.50, Bold: 0.70 },
    Roots:   { Subtle: 0.10, Balanced: 0.20, Bold: 0.32 },
    Streaks: { Subtle: 0.22, Balanced: 0.40, Bold: 0.60 },
};

/**
 * GLOWING EYES: emission on the eye materials, in the chosen eye colour.
 *
 * From the Rendorgal "Glowing Eyes" set, which targets exactly `Eye Left` and
 * `Eye Right`, the same two materials this project already tints, as a colour
 * plus a POWER. Its presets are emission settings, so they are reproduced
 * natively rather than imported; the pack's one texture is an iris mask authored
 * for Genesis **8.1** and does not belong to this figure's UVs.
 *
 * Worth having beyond the effect: a Shade or a Lich reads as one at a glance,
 * and nothing else on this page can say that.
 */
export const EYE_GLOW = {
    "None": 0, "Faint": 0.25, "Soft": 0.5, "Bright": 0.9, "Blazing": 1.5,
};

/**
 * PAINTED ONTO SKIN: makeup and marks, composited over the tone rather than
 * modelled. Every one is a 4096² map with alpha, authored against the Genesis 9
 * UVs, so they land without a re-export.
 *
 * Face layers paint the head material, body layers the torso. Order matters:
 * they are drawn in the sequence given.
 */
/**
 * MAKEUP IS A STYLE AND A COLOUR, the same shape as hair, because a lipstick
 * you cannot choose the colour of is not really a choice.
 *
 * The shipped maps are pre-coloured, so the shape is used as a MASK and tinted
 * on the way in (`skinTexture.js`). One `None` per group; the groups are
 * independent, so shadow and lipstick can be worn together.
 */
/* THE FACES ARE GONE, AND THAT IS THE POINT. Seventy-seven baked keys used to
   live here, chosen from a list. Rose, 2026-08-27: *"delete the 70 something
   premade faces... We have the sliders instead"*. A face is now the dials a
   hand produced -- molded on the figure (`world/mold.js`) or rolled
   (`mirror.js rollFaceShape`) -- and it rides the record as `appearance.shape`
   with the gestures that made it beside it. `FACE_DIALS` at the bottom of this
   file is what a face is made of now. */

/* A style is one of three shapes:
     - a plain url string -- tinted by the group's colour row (the original
       hand-painted styles);
     - `{ url, fixed: true }` -- ONE authored painting, no colour row at all
       (the jewellery's "As made" doctrine on skin);
     - `{ fixed: true, def, colours: { Name: url } }` -- one DESIGN the artist
       painted in several colourways; the colour row picks AMONG them, still
       no tint.
   Her rulings, 2026-09-01: styles are the chips and colour lives in the
   colour row ("None, I... and so on for all options"; None hides the row,
   a style loads it); the original tintable style is "I" everywhere and the
   painted looks follow in sequence; Face Art goes by design NAME ("the
   color is different than glyphs"); blush keeps plain colour chips ("the
   blush doesnt really have colors thats actually telling the truth").
   Stars' colourways are named by their PIXELS -- the vendor's look-5 names
   lie (its "blue" renders gold, its "orange" silver). */
export const FACE_PAINT = {
    lips: {
        label: "Lipstick", slot: "makeup", def: "Rose",
        styles: {
            "I": "assets/img/skin/lipstick_1.png",
            "II": { fixed: true, def: "Black", colours: {
                "Black": "assets/img/skin/makeup/ll1_lips_black.png",
                "Orange": "assets/img/skin/makeup/ll1_lips_orange.png",
                "Purple": "assets/img/skin/makeup/ll1_lips_purple.png",
            } },
            "III": { fixed: true, def: "Pink", colours: {
                "Gray": "assets/img/skin/makeup/ll2_lips_gray.png",
                "Pink": "assets/img/skin/makeup/ll2_lips_pink.png",
                "Purple": "assets/img/skin/makeup/ll2_lips_purple.png",
            } },
            "IV": { fixed: true, def: "Black", colours: {
                "Black": "assets/img/skin/makeup/ll3_lips_black.png",
                "Blue": "assets/img/skin/makeup/ll3_lips_blue.png",
                "White": "assets/img/skin/makeup/ll3_lips_white.png",
            } },
            "V": { fixed: true, def: "Red", colours: {
                "Green": "assets/img/skin/makeup/ll4_lips_green.png",
                "Orange Blue": "assets/img/skin/makeup/ll4_lips_orange_blue.png",
                "Red": "assets/img/skin/makeup/ll4_lips_red.png",
            } },
            "VI": { fixed: true, def: "Purple", colours: {
                "Brown Orange": "assets/img/skin/makeup/ll5_lips_brown_orange.png",
                "Pink Blue": "assets/img/skin/makeup/ll5_lips_pink_blue.png",
                "Purple": "assets/img/skin/makeup/ll5_lips_purple.png",
            } },
        },
    },
    shadow: {
        label: "Eye Shadow", slot: "makeup", def: "Plum",
        styles: {
            "I": "assets/img/skin/eyeshadow_1.png",
            "II": { fixed: true, def: "Blue Gray", colours: {
                "Blue Gray": "assets/img/skin/makeup/ll1_eyeshadow_blue_gray.png",
                "Orange Brown": "assets/img/skin/makeup/ll1_eyeshadow_orange_brown.png",
                "Red Black": "assets/img/skin/makeup/ll1_eyeshadow_red_black.png",
            } },
            "III": { fixed: true, def: "Black Purple", colours: {
                "Black Purple": "assets/img/skin/makeup/ll3_eyeshadow_black_purple.png",
                "Blue Red": "assets/img/skin/makeup/ll3_eyeshadow_blue_red.png",
                "Gray White": "assets/img/skin/makeup/ll3_eyeshadow_gray_white.png",
            } },
            "IV": { fixed: true, def: "Blue", colours: {
                "Blue": "assets/img/skin/makeup/ll4_eyeshadow_blue.png",
                "Brown": "assets/img/skin/makeup/ll4_eyeshadow_brown.png",
                "Green": "assets/img/skin/makeup/ll4_eyeshadow_green.png",
            } },
            "V": { fixed: true, def: "Purple", colours: {
                "Blue": "assets/img/skin/makeup/ll5_eyeshadow_blue.png",
                "Orange Brown": "assets/img/skin/makeup/ll5_eyeshadow_orange_brown.png",
                "Purple": "assets/img/skin/makeup/ll5_eyeshadow_purple.png",
            } },
        },
    },
    liner: {
        label: "Eyeliner", slot: "makeup", def: "Black",
        styles: {
            "I": "assets/img/skin/eyeliner.png",
            "II": { fixed: true, def: "Black", colours: {
                "Black": "assets/img/skin/makeup/ll1_eyeliner_black.png",
            } },
        },
    },
    blush: {
        label: "Blush", slot: "makeup", def: "Rose",
        styles: {
            "Orange II": { url: "assets/img/skin/makeup/ll2_blush_orange.png", fixed: true },
            "Pink II": { url: "assets/img/skin/makeup/ll2_blush_pink.png", fixed: true },
            "Red II": { url: "assets/img/skin/makeup/ll2_blush_red.png", fixed: true },
            "Blue IV": { url: "assets/img/skin/makeup/ll4_blush_blue.png", fixed: true },
            "Deep Green IV": { url: "assets/img/skin/makeup/ll4_blush_g2.png", fixed: true },
            "Green IV": { url: "assets/img/skin/makeup/ll4_blush_green.png", fixed: true },
            "Orange IV": { url: "assets/img/skin/makeup/ll4_blush_orange.png", fixed: true },
            "Blue V": { url: "assets/img/skin/makeup/ll5_blush_blue.png", fixed: true },
            "Orange V": { url: "assets/img/skin/makeup/ll5_blush_orange.png", fixed: true },
            "Purple V": { url: "assets/img/skin/makeup/ll5_blush_purple.png", fixed: true },
        },
    },
    base: {
        label: "Face Paint", slot: "makeup", def: "White",
        styles: {
            "I": { fixed: true, def: "White", colours: {
                "Blue": "assets/img/skin/makeup/ll1_base_blue.png",
                "Dark Blue": "assets/img/skin/makeup/ll1_base_blue_dark.png",
                "Purple": "assets/img/skin/makeup/ll1_base_purple.png",
                "White": "assets/img/skin/makeup/ll1_base_white.png",
                "White Orange": "assets/img/skin/makeup/ll1_base_white_orange.png",
            } },
            "II": { fixed: true, def: "Veil", colours: {
                "Veil": "assets/img/skin/makeup/ll3_base_all.png",
            } },
        },
    },
    art: {
        label: "Face Art", slot: "makeup", def: "Black",
        styles: {
            "Glyphs": { fixed: true, def: "Ink", colours: {
                "Ink": "assets/img/skin/makeup/ll1_art_all.png",
            } },
            "Smoke": { fixed: true, def: "Blue", colours: {
                "Blue": "assets/img/skin/makeup/ll2_art_blue.png",
                "Gray": "assets/img/skin/makeup/ll2_art_gray.png",
                "Pink": "assets/img/skin/makeup/ll2_art_pink.png",
            } },
            "Moon": { fixed: true, def: "Blue", colours: {
                "Blue": "assets/img/skin/makeup/ll2_moon_blue.png",
                "Gray": "assets/img/skin/makeup/ll2_moon_gray.png",
                "Pink": "assets/img/skin/makeup/ll2_moon_pink.png",
            } },
            "Thorns": { fixed: true, def: "Black", colours: {
                "Black": "assets/img/skin/makeup/ll3_art_black.png",
                "Red Blue": "assets/img/skin/makeup/ll3_art_red_blue.png",
                "White": "assets/img/skin/makeup/ll3_art_white.png",
            } },
            "Sigils": { fixed: true, def: "Ink", colours: {
                "Ink": "assets/img/skin/makeup/ll4_art_plain.png",
            } },
            "Dots": { fixed: true, def: "Blue", colours: {
                "Blue": "assets/img/skin/makeup/ll4_dots_blue.png",
                "Green": "assets/img/skin/makeup/ll4_dots_green.png",
                "Yellow": "assets/img/skin/makeup/ll4_dots_yelow.png",
            } },
            "Stars": { fixed: true, def: "Gold", colours: {
                "Gold": "assets/img/skin/makeup/ll5_art_blue.png",
                "Silver": "assets/img/skin/makeup/ll5_art_orange.png",
                "Lavender": "assets/img/skin/makeup/ll5_art_purple.png",
            } },
        },
    },
};

/**
 * MARKS PAINTED ONTO THE SKIN, each an independent toggle rather than a style
 * pool. Several are worn at once and none excludes another, which is the one
 * way this table is shaped differently from FACE_PAINT above, where a second
 * lipstick is not a thing a face can have.
 *
 * Top surgery scars are offered to everyone, unconditionally and without
 * comment, a body that has them is not a special case needing a gate, and
 * asking the blood for permission would be the wrong question entirely.
 */
export const BODY_MARKS = {
    /* `skinRelative` marks take their colour FROM the wearer's skin
       (Rose, 08-16: "top scars slightly darker than skin color or
       slightly lighter for darker skin tones") -- scar tissue reads
       darker on light skin and lighter on dark, and one authored colour
       could never do both. A mark without the flag stamps as authored. */
    topScars: { label: "Top Scars", url: "assets/img/skin/top_scars.png",
                skinRelative: true },
};

/**
 * INK. A TATTOO IS NOT A MARK OF THE SAME KIND (Rose, 2026-08-25: *"the chest
 * tattoo and the top scars (trans scars) are different layers"*). Top surgery
 * scars are a body's history, offered unconditionally because a body that has
 * them is not a special case; a tattoo is something the person chose and had
 * done. They composite the same way and they are still not the same thing, so
 * they get their own table and their own row rather than sharing one list.
 * Measured, they do not even touch: the scars sit in a band at v 0.337 to
 * 0.381 and the chest ink at v 0.145 to 0.393, and not one pixel of the two
 * overlaps.
 *
 * INDEPENDENT TOGGLES, NEVER A POOL (Rose, same day, on a styles list of
 * fifteen: *"twenty tattoos? no... they're not a bundle"*). A face cannot wear
 * a second lipstick, which is why FACE_PAINT is one-style-per-group; a person
 * can wear ink on a chest AND both arms AND a leg, so each design is its own
 * switch and none excludes another.
 *
 * `parts` IS A LIST BECAUSE GENESIS 9 IS UDIM, one layer per material zone:
 * `body` is tile 1, `legs` tile 2, `arms` tile 3, `head` tile 0. Three of
 * these designs run across a boundary (a back piece that climbs the neck) and
 * carry two maps. That is still ONE tattoo with one switch, not a bundle.
 *
 * GENERATED by `V	ools	attoo_batch.py` from the products' own presets, at
 * the strength each was authored at. Do not hand-edit the rows; re-run it.
 */
/* BEGIN GENERATED INK TABLE, from V	ools	attoo_batch.py. Do not hand-edit. */
export const INK_REGIONS = ["Chest", "Ribs", "Stomach", "Back", "Left Arm", "Right Arm", "Left Leg", "Right Leg"];

const INK = "assets/img/skin/ink/";

export const BODY_INK = {
    batpairchest: { label: "Bat Pair (Chest)", region: "Chest", short: "Bat Pair", parts: [["head", INK + "batpairchest_head.png"], ["body", INK + "batpairchest_body.png"]] },
    battriochest: { label: "Bat Trio (Chest)", region: "Chest", short: "Bat Trio", parts: [["head", INK + "battriochest_head.png"], ["body", INK + "battriochest_body.png"]] },
    chest01: { label: "Chest 01", region: "Chest", short: "01", parts: [["body", INK + "chest01_body.png"]] },
    chest02: { label: "Chest 02", region: "Chest", short: "02", parts: [["body", INK + "chest02_body.png"]] },
    chest03: { label: "Chest 03", region: "Chest", short: "03", parts: [["body", INK + "chest03_body.png"]] },
    chest04: { label: "Chest 04", region: "Chest", short: "04", parts: [["body", INK + "chest04_body.png"]] },
    chest05: { label: "Chest 05", region: "Chest", short: "05", parts: [["body", INK + "chest05_body.png"]] },
    chest06: { label: "Chest 06", region: "Chest", short: "06", parts: [["body", INK + "chest06_body.png"]] },
    chest07: { label: "Chest 07", region: "Chest", short: "07", parts: [["body", INK + "chest07_body.png"]] },
    chest08: { label: "Chest 08", region: "Chest", short: "08", parts: [["body", INK + "chest08_body.png"]] },
    chest09: { label: "Chest 09", region: "Chest", short: "09", parts: [["body", INK + "chest09_body.png"]] },
    chest10: { label: "Chest 10", region: "Chest", short: "10", parts: [["body", INK + "chest10_body.png"]] },
    chest11: { label: "Chest 11", region: "Chest", short: "11", parts: [["body", INK + "chest11_body.png"]] },
    chest12: { label: "Chest 12", region: "Chest", short: "12", parts: [["body", INK + "chest12_body.png"]] },
    chest13: { label: "Chest 13", region: "Chest", short: "13", parts: [["body", INK + "chest13_body.png"]] },
    chest14: { label: "Chest 14", region: "Chest", short: "14", parts: [["body", INK + "chest14_body.png"]] },
    chest15: { label: "Chest 15", region: "Chest", short: "15", parts: [["body", INK + "chest15_body.png"]] },
    chest16: { label: "Chest 16", region: "Chest", short: "16", parts: [["body", INK + "chest16_body.png"]] },
    chest17: { label: "Chest 17", region: "Chest", short: "17", parts: [["body", INK + "chest17_body.png"]] },
    chest18: { label: "Chest 18", region: "Chest", short: "18", parts: [["body", INK + "chest18_body.png"]] },
    chest19: { label: "Chest 19", region: "Chest", short: "19", parts: [["body", INK + "chest19_body.png"]] },
    chest20: { label: "Chest 20", region: "Chest", short: "20", parts: [["body", INK + "chest20_body.png"]] },
    chest21: { label: "Chest 21", region: "Chest", short: "21", parts: [["body", INK + "chest21_body.png"]] },
    chest22: { label: "Chest 22", region: "Chest", short: "22", parts: [["body", INK + "chest22_body.png"]] },
    chest23: { label: "Chest 23", region: "Chest", short: "23", parts: [["body", INK + "chest23_body.png"]] },
    chest24: { label: "Chest 24", region: "Chest", short: "24", parts: [["body", INK + "chest24_body.png"]] },
    chest25: { label: "Chest 25", region: "Chest", short: "25", parts: [["body", INK + "chest25_body.png"]] },
    chest26: { label: "Chest 26", region: "Chest", short: "26", parts: [["body", INK + "chest26_body.png"]] },
    chest27: { label: "Chest 27", region: "Chest", short: "27", parts: [["body", INK + "chest27_body.png"]] },
    chest28: { label: "Chest 28", region: "Chest", short: "28", parts: [["body", INK + "chest28_body.png"]] },
    chest29: { label: "Chest 29", region: "Chest", short: "29", parts: [["body", INK + "chest29_body.png"]] },
    chest30: { label: "Chest 30", region: "Chest", short: "30", parts: [["body", INK + "chest30_body.png"]] },
    chest31: { label: "Chest 31", region: "Chest", short: "31", parts: [["body", INK + "chest31_body.png"]] },
    chest32: { label: "Chest 32", region: "Chest", short: "32", parts: [["body", INK + "chest32_body.png"]] },
    chest33: { label: "Chest 33", region: "Chest", short: "33", parts: [["body", INK + "chest33_body.png"]] },
    chest34: { label: "Chest 34", region: "Chest", short: "34", parts: [["body", INK + "chest34_body.png"]] },
    chest35: { label: "Chest 35", region: "Chest", short: "35", parts: [["body", INK + "chest35_body.png"]] },
    batsleftribs: { label: "Bats (Left Ribs)", region: "Ribs", short: "Bats (Left)", parts: [["body", INK + "batsleftribs_body.png"]] },
    batsrightribs: { label: "Bats (Right Ribs)", region: "Ribs", short: "Bats (Right)", parts: [["body", INK + "batsrightribs_body.png"]] },
    batstomach: { label: "Bat (Stomach)", region: "Stomach", short: "Bat", parts: [["body", INK + "batstomach_body.png"]] },
    batpairstomach: { label: "Bat Pair (Stomach)", region: "Stomach", short: "Bat Pair", parts: [["body", INK + "batpairstomach_body.png"]] },
    battyboistomach: { label: "Batty Boi (Stomach)", region: "Stomach", short: "Batty Boi", parts: [["body", INK + "battyboistomach_body.png"]] },
    batpairback: { label: "Bat Pair (Back)", region: "Back", short: "Bat Pair", parts: [["body", INK + "batpairback_body.png"]] },
    battrioback: { label: "Bat Trio (Back)", region: "Back", short: "Bat Trio", parts: [["body", INK + "battrioback_body.png"]] },
    battyboiback: { label: "Batty Boi (Back)", region: "Back", short: "Batty Boi", parts: [["head", INK + "battyboiback_head.png"], ["body", INK + "battyboiback_body.png"]] },
    battyboilowerback: { label: "Batty Boi (Lower Back)", region: "Back", short: "Batty Boi (Lower)", parts: [["body", INK + "battyboilowerback_body.png"]] },
    arm01left: { label: "Arm 01 Left", region: "Left Arm", short: "01", parts: [["arms", INK + "arm01left_arms.png"]] },
    arm02left: { label: "Arm 02 Left", region: "Left Arm", short: "02", parts: [["arms", INK + "arm02left_arms.png"]] },
    arm03left: { label: "Arm 03 Left", region: "Left Arm", short: "03", parts: [["arms", INK + "arm03left_arms.png"]] },
    arm04left: { label: "Arm 04 Left", region: "Left Arm", short: "04", parts: [["arms", INK + "arm04left_arms.png"]] },
    arm05left: { label: "Arm 05 Left", region: "Left Arm", short: "05", parts: [["arms", INK + "arm05left_arms.png"]] },
    arm06left: { label: "Arm 06 Left", region: "Left Arm", short: "06", parts: [["arms", INK + "arm06left_arms.png"]] },
    arm07left: { label: "Arm 07 Left", region: "Left Arm", short: "07", parts: [["arms", INK + "arm07left_arms.png"]] },
    arm08left: { label: "Arm 08 Left", region: "Left Arm", short: "08", parts: [["arms", INK + "arm08left_arms.png"]] },
    arm09left: { label: "Arm 09 Left", region: "Left Arm", short: "09", parts: [["arms", INK + "arm09left_arms.png"]] },
    arm10left: { label: "Arm 10 Left", region: "Left Arm", short: "10", parts: [["arms", INK + "arm10left_arms.png"]] },
    batsleftshoulder: { label: "Bats (Left Shoulder)", region: "Left Arm", short: "Bats (Shoulder)", parts: [["arms", INK + "batsleftshoulder_arms.png"]] },
    arm01right: { label: "Arm 01 Right", region: "Right Arm", short: "01", parts: [["arms", INK + "arm01right_arms.png"]] },
    arm02right: { label: "Arm 02 Right", region: "Right Arm", short: "02", parts: [["arms", INK + "arm02right_arms.png"]] },
    arm03right: { label: "Arm 03 Right", region: "Right Arm", short: "03", parts: [["arms", INK + "arm03right_arms.png"]] },
    arm04right: { label: "Arm 04 Right", region: "Right Arm", short: "04", parts: [["arms", INK + "arm04right_arms.png"]] },
    arm05right: { label: "Arm 05 Right", region: "Right Arm", short: "05", parts: [["arms", INK + "arm05right_arms.png"]] },
    arm06right: { label: "Arm 06 Right", region: "Right Arm", short: "06", parts: [["arms", INK + "arm06right_arms.png"]] },
    arm07right: { label: "Arm 07 Right", region: "Right Arm", short: "07", parts: [["arms", INK + "arm07right_arms.png"]] },
    arm08right: { label: "Arm 08 Right", region: "Right Arm", short: "08", parts: [["arms", INK + "arm08right_arms.png"]] },
    arm09right: { label: "Arm 09 Right", region: "Right Arm", short: "09", parts: [["arms", INK + "arm09right_arms.png"]] },
    arm10right: { label: "Arm 10 Right", region: "Right Arm", short: "10", parts: [["arms", INK + "arm10right_arms.png"]] },
    batrightshoulder: { label: "Bat (Right Shoulder)", region: "Right Arm", short: "Bat (Shoulder)", parts: [["arms", INK + "batrightshoulder_arms.png"]] },
    batleftthigh: { label: "Bat (Left Thigh)", region: "Left Leg", short: "Bat (Thigh)", parts: [["legs", INK + "batleftthigh_legs.png"]] },
    leg01left: { label: "Leg 01 Left", region: "Left Leg", short: "01", parts: [["legs", INK + "leg01left_legs.png"]] },
    leg02left: { label: "Leg 02 Left", region: "Left Leg", short: "02", parts: [["legs", INK + "leg02left_legs.png"]] },
    leg03left: { label: "Leg 03 Left", region: "Left Leg", short: "03", parts: [["legs", INK + "leg03left_legs.png"]] },
    leg04left: { label: "Leg 04 Left", region: "Left Leg", short: "04", parts: [["legs", INK + "leg04left_legs.png"]] },
    leg05left: { label: "Leg 05 Left", region: "Left Leg", short: "05", parts: [["legs", INK + "leg05left_legs.png"]] },
    leg06left: { label: "Leg 06 Left", region: "Left Leg", short: "06", parts: [["legs", INK + "leg06left_legs.png"]] },
    leg07left: { label: "Leg 07 Left", region: "Left Leg", short: "07", parts: [["legs", INK + "leg07left_legs.png"]] },
    leg08left: { label: "Leg 08 Left", region: "Left Leg", short: "08", parts: [["legs", INK + "leg08left_legs.png"]] },
    leg09left: { label: "Leg 09 Left", region: "Left Leg", short: "09", parts: [["legs", INK + "leg09left_legs.png"]] },
    leg10left: { label: "Leg 10 Left", region: "Left Leg", short: "10", parts: [["legs", INK + "leg10left_legs.png"]] },
    battriorightthigh: { label: "Bat Trio (Right Thigh)", region: "Right Leg", short: "Bat Trio (Thigh)", parts: [["legs", INK + "battriorightthigh_legs.png"]] },
    batsrightcalve: { label: "Bats (Right Calve)", region: "Right Leg", short: "Bats (Calf)", parts: [["legs", INK + "batsrightcalve_legs.png"]] },
    leg01right: { label: "Leg 01 Right", region: "Right Leg", short: "01", parts: [["legs", INK + "leg01right_legs.png"]] },
    leg02right: { label: "Leg 02 Right", region: "Right Leg", short: "02", parts: [["legs", INK + "leg02right_legs.png"]] },
    leg03right: { label: "Leg 03 Right", region: "Right Leg", short: "03", parts: [["legs", INK + "leg03right_legs.png"]] },
    leg04right: { label: "Leg 04 Right", region: "Right Leg", short: "04", parts: [["legs", INK + "leg04right_legs.png"]] },
    leg05right: { label: "Leg 05 Right", region: "Right Leg", short: "05", parts: [["legs", INK + "leg05right_legs.png"]] },
    leg06right: { label: "Leg 06 Right", region: "Right Leg", short: "06", parts: [["legs", INK + "leg06right_legs.png"]] },
    leg07right: { label: "Leg 07 Right", region: "Right Leg", short: "07", parts: [["legs", INK + "leg07right_legs.png"]] },
    leg08right: { label: "Leg 08 Right", region: "Right Leg", short: "08", parts: [["legs", INK + "leg08right_legs.png"]] },
    leg09right: { label: "Leg 09 Right", region: "Right Leg", short: "09", parts: [["legs", INK + "leg09right_legs.png"]] },
    leg10right: { label: "Leg 10 Right", region: "Right Leg", short: "10", parts: [["legs", INK + "leg10right_legs.png"]] },
};
/* END GENERATED INK TABLE */

/**
 * JEWELLERY, WORN WITHOUT A SLOT (Rose, 2026-08-25: *"Earrings in character
 * creation like tattoos are options selectable with no slots"*). These are the
 * first pieces of real GEOMETRY the mirror offers that way. Everything else
 * with a mesh takes a slot and excludes whatever shared it; ink takes none
 * because it is paint. Jewellery is neither: it is worn, but it sits on ears
 * and a throat that no garment claims, so nothing is gained by making it fight
 * a helmet for a row. Several at once, none excluding another.
 *
 * The dev room shows these in its HELMET slot and that is scaffolding, not a
 * home: that room dresses through slots and a piece needs one to be looked at
 * at all.
 *
 * `parts` ENTRIES ARE NAMED because each one takes its OWN colour (Rose,
 * 2026-08-25: *"like if I want a black choker and blue jewel"*). The band
 * and the stone are separate meshes, so they were already separately
 * tintable; naming them is what lets the panel label the two colour rows
 * something a person would recognise instead of "part 1" and "part 2".
 *
 * It IS a list for the same reason BODY_INK's is, and for a second one.
 * The bat pair is two props, one per ear, and would be half an outfit as a
 * single url. Every choker is the BAND plus a charm (Rose: *"the choker itself
 * is the band that is supposed to combine with the gems"*): the band sits on
 * the throat at y 141.2 to 147.4 and each charm hangs below it at 138.8 to
 * 141.8, so a charm alone is a gem floating at a collarbone with nothing
 * holding it up.
 *
 * NO TINT, EVER. These pass `null` where a garment passes a colour, and
 * doll.js's `wear` gates its whole recolour path on `tint != null`, so the
 * gold, the gems and the crystal keep the materials they were authored with.
 * A garment colour dragged across a crystal drop would be a bug wearing a
 * feature's clothes.
 */
export const JEWEL_REGIONS = ["Ears", "Neck"];

const JEWEL = "assets/models/g9/wardrobe/";

/* Emptied in the second cleanse (2026-08-28, her order: "jewelry too");
   the twelve entries live verbatim in the re-integration manual. The
   no-tint law above stands for their return. */
export const JEWELRY = {};


/**
 * THE SHADE'S DECAY: what a shade looks like, after the stitches were cut.
 *
 * Rose, 2026-08-08: *"zombified this instead (morphs)"*, then *"shade only"*.
 * Christophe3D's *Zombified*, baked into `g9-base.glb` as the shape key
 * `Zombie` by `V\tools\bake_zombie.py`.
 *
 * BLOOD DECIDES WHETHER, NOT HOW MUCH. Any Shade in the parentage gets the
 * sliders; where they sit is entirely the player's.
 *
 * It briefly graded this full/half, capping a half-shade at 0.5. Rose, 08-08:
 * *"why are you doing the halfblood shit thats stats only"*. Correct, the
 * full/half law is an ABILITY-SCORE rule and was never a rule about
 * appearance: horns are not half-grown on a half-blood and ears are not half
 * pointed. The grading also hid a bug of its own. The mirror asked
 * `heritage()` whether to DRAW the row while `lookOf` asked the person record
 * for the VALUE, and a cross's race string reads "Half-blood", so the
 * multiplier came out zero and the sliders moved nothing at all. One fact, one
 * owner; that is the whole lesson.
 *
 * THE 1.0 END IS HALF THE AUTHORED MORPH, `DECAY_MAX = 0.5` in doll.js's
 * applyMorph, the one place a decay value becomes an influence (Rose, 08-09:
 * *"max being 0.50 for both body and head"*, chosen by eye once the wounds
 * opened into nothing). The KEYS stay baked at full strength so the ceiling is
 * one constant, not a re-bake: it moved twice in two days and each re-bake was
 * an evening. Rolled Shades land anywhere on the sweep, rerollAppearance
 * rolls both channels with the rest of the look.
 */
export const hasShadeBlood = (motherRace, fatherRace) =>
    motherRace === "Shade" || fatherRace === "Shade";

/* The human wardrobe's gate (Rose, 08-16: "human 1 and 2 for humans"),
   the same any-drop shape as the shade's. */
export const hasHumanBlood = (motherRace, fatherRace) =>
    motherRace === "Human" || fatherRace === "Human";

/* HOW THE SHADE'S DECAY SETTLED: three cuts in two days, recorded so none of
   them is rebuilt.

   ROT TEXTURES (08-08, *"I dont want the rot ... you can remove the
   textures"*): Zombified's grey diffuse set repainted the WHOLE skin. Cut
   within the hour; assets deleted.

   THE PROPS (08-09, *"eh remove the bone bleed"*, then *"no remove props
   totally"*): the full pipeline was built and worked, all ten conforming
   figures (skeleton, guts, eight blood pieces) converted, follower-morphed,
   worn like garments, driven by the sliders. On the doll it read as gore
   theatre: bone-white through the ghost, meat crowding every opening. Cut.
   The game's decay/ assets are deleted; the PIPELINE survives in
   `V\tools\dsf_to_glb.py` + `V\tools\bake_decay_props.py`, and any piece can
   be regenerated from the product and re-worn by pushing [url, null] into
   `worn`, see git-less history in _deferred_systems.md.

   WHAT REMAINS is the morphs alone: gaunt wasting (ZombieBody/Face) and the
   eight ZombieW_* wounds, which now tear open into NOTHING, the skin folds
   away and the translucent inside of an incorporeal thing shows through. On a
   creature whose whole nature is absence, missing flesh that is genuinely
   MISSING is the cleaner read, and it is the one Rose steered to. */

/* THE SHADE'S STITCHES ARE GONE (Rose, 2026-08-08: *"remove the stitches all of
   them they're ugly"*). Built and removed the same day; nothing of them remains
   in the game, the assets are deleted, and Ragdoll Stitches (Neikdian) is off
   the licence ledger.

   Kept only so it is not rebuilt from the same wrong reading: that pack is
   BASE SHEET PLUS MASK. Each material preset loads `A <Zone> Base.png` for the
   thread colour AND a numbered `.jpg` that cuts it down to ONE placement. I
   used the base sheets alone, so every Shade wore all 44 placements at once,
   thirteen on the face, eight on the body, eleven on the arms, twelve on the
   legs. That is what got looked at and rejected, and it is not what the product
   is for. If seams are ever wanted again, they are a chosen few per zone, not
   a sheet. */

export const SKIN_TONES = {
    "Pale":        "#efdbd2",
    "Porcelain":   "#f3e3da",
    "Warm Ivory":  "#eed3b8",
    "Beige":       "#dfb794",
    "Honey":       "#c9955c",
    "Almond":      "#9c6b43",
    "Senna":       "#a9714b",
    "Chocolate":   "#4a2d1c",
    "Dark Grey":   "#5a5866",
    "Jet Black":   "#2c2a35",
    "Obsidian":    "#1c1b26",
    "Blue":        "#7d8fb3",
    "Albino":      "#f8efec",
    "Grey":        "#8b8a96",
    /* THE INFERNAL FIVE (Rose, 2026-08-07: *"cambions and cambion half bloods
       should have demon skin color access too like the reds and yada yada"*).
       These are the first tones in this table that were NOT measured off v1,
       the original gave its cambion ethnicities ordinary human palettes, so
       there was nothing to measure. Built as a light-to-dark ladder the way
       the shade five run pale-to-black, and pitched to the blood's own word:
       Cambion is a fire-blooded thing (DR 5 fire, it carried the retired
       Flame Affinity trait when these were named), and Shade/Cambion is
       "born of shadow and flame". */
    "Ember":       "#c25a3f",
    "Vermilion":   "#a83f30",
    "Crimson":     "#8a2b2b",
    "Maroon":      "#5e2224",
    "Cinder":      "#3b1d1d",
};

/* "Hime Cut" is NOT here on purpose: that export carries 150 bones and ZERO
   meshes, a skeleton with no hair on it. Offering it renders a bald head and
   looks like the game is broken. Verified by counting triangles, not by
   trusting the filename.

   "Eirgrid Hair" is gone too. Rose's call, 2026-07-31. */
/**
 * Twelve styles as of 2026-08-07 ("kay but add in all the hair"). The two
 * inherited from v1 come first; everything after was converted by
 * V/tools/dsf_to_glb.py, and the last six exist as game meshes only because that
 * tool BUILDS ribbon cards out of dForce strand data, those products ship no
 * polygons at all. See genesis-9-figures.md, "THE HAIR CHEST".
 */
/* CLEANSED 2026-08-20, refilled 2026-08-27, CLEANSED AGAIN 2026-08-30
   (Rose: "delete all the hair - nuke them"). Hair comes back only after
   it is watched moving in the dev room; the assets sit whole in
   V\_removed_g9_assets\hair_2026-08-30_nuke and every port recipe is in
   the learning. */
/* THE BODY, BY PART (2026-08-31, Rose: "port the muscles, veins, fat,
   and the various sliders to the character creation system"). One table
   of the parts each system dials, with the words a player reads. The
   figure's keys mirror these (Muscular_ArmL, Veins_Head, ArmLHeavy...);
   doll.js drives them, the mirror and the look sheet read THIS. */
export const BODY_PARTS = {
    muscle: { armL: "Left arm", armR: "Right arm", shoulders: "Shoulders",
              chest: "Chest", stomach: "Stomach", back: "Back",
              neck: "Neck", legL: "Left leg", legR: "Right leg" },
    veins:  { head: "Head", neck: "Neck", chest: "Chest",
              stomach: "Stomach", back: "Back", armL: "Left arm",
              armR: "Right arm", legL: "Left leg", legR: "Right leg" },
    fat:    { head: "Head", neck: "Neck", chest: "Chest",
              stomach: "Stomach", back: "Back", armL: "Left arm",
              armR: "Right arm", legL: "Left leg", legR: "Right leg" },
};

/* wardrobe path, so the table reads as names rather than as file paths */
const W = (n) => "assets/models/g9/wardrobe/" + n + ".glb";

/* THE RETURN, 2026-08-31 (Rose: "after that port the hair and
   clothing"). Every style below walked the 08-30 bench arc whole --
   ported, physics-rigged per piece in clothes.js, watched moving in the
   dev room, reviewed against her promo images, the failures fixed or
   nuked (fluxx died there). The names are what a player reads; the cap
   is the style's own scalp patch, worn with it so the parting never
   shows bare skull. */
export const HAIR_CAPS = {
    /* EMPTY ON PURPOSE. Rose, 2026-09-08, after the idol cap came off:
       "remove the skin cap for every other hair... it looks way better."
       The caps were worn so a parting never showed bare skull; her eye says
       the cap under moving hair reads worse than the parting. The caps are
       gone now: grace's and ember's with their styles that night, natcurl's
       with natcurl, and Stage Bob's, Short Curls', High Bun's, Side Sweep's,
       Buzzcut's and Loose Strands' erased 2026-09-24, on Rose's word after
       judging them in the animation room. A cap back now is a new port of
       its product's scalp piece. */
    /* ember's cap was put back here for a look ("first reenable ember's skin
       cap temporarily") and came out again the same evening with the style
       itself -- see HAIR_STYLES below for why. Strand-built hairs need their
       scalp piece; that was never the fault. */
    /* BACK ON, Rose 2026-09-08: "put the cap on natcurl, also adcurl". Both
       strand-built (Nat Curly; Ad Curly at 1.65M source strand verts); the
       cap is each product's own scalp piece. natcurl's cap left with its
       style on 2026-09-22 and was erased 2026-09-24; see HAIR_STYLES below. */
    /* Cloud Curls (jess) wore Short Curls' scalp here for about an hour on
       2026-09-09 and then left the game with the style itself (Rose:
       "delete jess hair"). It came back capless 2026-09-24 and was nuked the
       same day; see HAIR_STYLES below. */
    "Tight Curls": W("adcurl_cap"),
};

export const HAIR_STYLES = {
    /* No hair is a haircut: the honest default for a head nobody has
       dressed yet. */
    "Bald": null,
    /* "Gentle Waves": W("grace_hair") was here. Rose, 2026-09-08: "delete
       grace hair". Same fault class as ember, thinner: CS Grace is strand-
       built, 202,239 source strand verts, and the port kept 25,402 -- about
       an eighth -- the thinnest hair in the wardrobe. Both grace glbs were
       deleted the same night at her word ("delete any residue of dead files
       you removed"); the CS Grace source under Desktop\G9 stuff\hair was
       not named and stays. */
    "Tumbling Curls": W("zooey_hair"),
    /* "Feathered Layers": W("ember_hair") was here. Rose, 2026-09-08: "its
       a complete balding hairstyle... if its not [missing pieces] just delete
       ember from game and desc." Checked against the Emberlynn source before
       deleting: the port is COMPLETE -- all 8 material zones (Top, UpperBack,
       Sides, Bangs, BangsLong, NeckLong, BackLong, FrontLong) plus the Scalp
       as ember_cap -- but the converter kept 46,244 ribbon vertices of a
       369,672-vertex strand source, about a sixteenth of the strands. Thin
       ribbons at that budget cannot cover a skull the way edgy's wide alpha
       cards do at the same count. No re-port: Rose, later the same night,
       "ember and strand doesnt need a re-port in fact delete them from the
       g9 folder" and "delete any residue of dead files you removed" -- the
       Emberlynn source and both ember glbs are gone. */
    "Stage Bob": W("idol_hair"),
    /* "Stage Long", RE-PORTED 2026-09-26 the night it was erased: it was judged while the scalp cap had frozen every short hair and the crown pin froze every crown (Rose: "I deleted all that stuff because it had no physics near the Crown", then "you'll have to pull back in some hairs") */
    "Stage Long": W("idol2_hair"),
    "Short Curls": W("shcurl_hair"),
    "High Bun": W("bun_hair"),
    /* "Soft Curls": W("natcurl_hair") was here, the Nat Curly strand port.
       Rose, 2026-09-22: "delete natcurl hair", then "delete the characters
       too". Both natcurl glbs were parked at assets/models/g9/_removed/ and
       then erased 2026-09-24 on Rose's word. Vi, the one character wearing
       it (her mother's record rides inside hers), is parked with her shelf
       at _removed/chars/2026-09-22/, not destroyed. A record still naming
       "Soft Curls" is re-rolled to a live style by ensureAppearance in
       steps/mirror.js. */
    "Tight Curls": W("adcurl_hair"),
    "Ragged Crop": W("edgy_hair"),
    "Wild Crop": W("edgy2_hair"),
    "Pinned Back": W("barett_hair"),
    "Loose Strands": W("strand_hair"),
    "Side Sweep": W("sideflip_hair"),
    "Buzzcut": W("buzz_hair"),
    "Cornrows": W("cornrow_hair"),
    "Ocean Waves": W("nami_hair"),
    /* "Long & Sleek" (along_hair, the Antonio Top Hair alone: the product's Long Hair piece is authored spread
       80 cm wide for DAZ to drape), "Long Waves" (largeo_hair), "Side Sweep" and "Hime Cut" below: each was
       RE-PORTED 2026-09-26 the night it was erased: it was judged while the scalp cap had frozen every short hair and the crown pin froze every crown (Rose: "I deleted all that stuff because it had no physics near the Crown", then "you'll have to pull back in some hairs"). */
    "Long & Sleek": W("along_hair"),
    "Long Waves": W("largeo_hair"),
    /* the big curly bob, ported on her order (2026-09-02: "port whats not
       ported to character creation") -- polygon-built, it covers its own
       scalp and wears no cap. */
    /* "Cloud Curls" (jess_hair, the thin-12 polygon bob) left the game
       2026-09-09 (Rose: "fuck... heartbreaking... delete jess hair"): at
       plate 720 + a 180 deg / 8 Hz shake its crown parted to bare skull,
       a 3 cm leash held it as a bob but not closed, and a borrowed scalp
       cap under it did not read right. It came back for a few hours on
       2026-09-24 ("the other two hair style can be phoenix downed... jess /
       supernova") and was then erased from the project ("nuke jess"). A
       record naming "Cloud Curls" resolves to no hair, the same fall-through
       every other deleted style takes. */
    /* SHAGGY FRINGE: dForce Supernova, a layered shag under a heavy fringe, strand-built at 117,872 verts
       (NeoLearning Loh/hair.md:70). Cut 09-22, back 09-24, parked 09-25 ("delete that and the supernova hair"),
       BACK 2026-09-26 (Rose: "restore supernova... let me see how it looks"), the third return, with the body-follow keys every hair got that night (tools/hair_fit.py). */
    "Shaggy Fringe": W("supernova_hair"),
    /* THE DAZ LIBRARY HAIRS, SHIPPED (Rose 2026-09-25: "ship everything in character creation thats not in
       character creation"). Racked 09-24 for Rose's review and kept through it; named for their shapes, the
       names Rose's to change. Pixie: the G9 Starter Essentials dForce Pixie. Hime: the MK Hime Cut, blunt bangs
       and cheek-length side locks over a long back. Long Bangs: Kin, long and straight under a full fringe. The
       Hime Cut and Long Bangs were erased and re-ported 2026-09-26 (above). */
    "Pixie Crop": W("pixie_hair"),
    "Hime Cut": W("hime_hair"),
    "Long Bangs": W("kin_hair"),
};

/*,,. SHAGGY FRINGE IS SHADE ONLY, IN CHARACTER CREATION (Rose 2026-09-26: "make supernova shade only", then "I
   didnt say gate the hair everywhere. I meant Character creation only") ,,,
   The blood a style asks for, read by character creation alone (steps/mirror.js creationHairs and creationHair):
   the mirror's hair chips and its Randomize, and creation's own rolls for the self and the household. The world's
   dice, a seat's look page, a saved record and the start-up warm read HAIR_STYLES whole. */
export const HAIR_BLOOD = { "Shaggy Fringe": "Shade" };

/** No "none". The blood shows, you choose the shape, not whether. */
export const HORN_STYLES = {
    "Horn 1":  "assets/models/g9/wardrobe/horn_1.glb",
    "Horn 2":  "assets/models/g9/wardrobe/horn_2.glb",
    "Horn 3a": "assets/models/g9/wardrobe/horn_3a.glb",
    "Horn 3b": "assets/models/g9/wardrobe/horn_3b.glb",
    // Succubus set: skinned to the head rig, so wear() binds them like a
    // garment and the rigid hangOnBone road never fires for these two.
    // Bottom Horns and Crest were cut on Rose's call (2026-08-16), removed
    // from disk with them; the set shipped four and keeps two.
    "Top Horns":    "assets/models/g9/wardrobe/horn_top.glb",
    "Middle Horns": "assets/models/g9/wardrobe/horn_middle.glb",
};

/** Not a style and never a choice: the body the Barbed Tail feat wears.
    One piece, tinted with the wearer's own skin, offered nowhere in the
    mirror; lookOf sets it only when the feat list carries the feat, the
    same gate the claws read. Its fifteen tail bones are folded onto the
    pelvis at conversion, so it rides the hips rigidly in its authored
    curve. */
export const DEMON_TAIL = "assets/models/g9/wardrobe/demon_tail.glb";

/* FACE HAIR (Rose, 2026-09-02: "you didnt import the eyebrows or beards
   ... or mustaches... also beard, mustache, etc"). Three channels, never
   one: a beard coexists with a mustache and the products ship them
   separately, which is the dev room's own split. Styles are numbered the
   way the paint chips are; the eye names them better than a guess would.
   All of it is tinted with the worn hair colour, brows a shade darker,
   so the face always matches the head. */
export const BROW_STYLES = {
    "None": null,
    "I": W("brow_01"), "II": W("brow_02"), "III": W("brow_03"),
    "IV": W("brow_04"), "V": W("brow_05"), "VI": W("brow_06"),
    "VII": W("brow_07"), "VIII": W("brow_08"), "IX": W("brow_09"),
    "X": W("brow_10"), "XI": W("brow_11"), "XII": W("brow_12"),
    /* the DAZ library brows, shipped 2026-09-25 on the same word: the nine G9 Starter Essentials Fiber styles,
       then Kin's own */
    "XIII": W("brow_f01"), "XIV": W("brow_f02"), "XV": W("brow_f03"),
    "XVI": W("brow_f04"), "XVII": W("brow_f05"), "XVIII": W("brow_f06"),
    "XIX": W("brow_f07"), "XX": W("brow_f08"), "XXI": W("brow_f09"),
    "XXII": W("kin_brow"),
};
export const BEARD_STYLES = {
    "None": null,
    "I": W("fe_beard"), "II": W("fe_beard_01"), "III": W("fe_beard_02"),
    "IV": W("fe_beard_03"), "V": W("fe_beard_04"), "VI": W("fe_beard_05"),
    "VII": W("fe_beard_06"), "VIII": W("antonio_beard"),
    "IX": W("ak_beard"), "X": W("barett_beard"),
    /* Mavick's beard, which stayed when its hair left (Rose 2026-09-24: "maverick beard can stay"), shipped
       2026-09-25 */
    "XI": W("mavick_beard"),
};
export const MUSTACHE_STYLES = {
    "None": null,
    "Stubble": W("fe_stubble"),
    "I": W("fe_mustache"), "II": W("fe_mustache_01"),
    "III": W("fe_mustache_02"), "IV": W("fe_mustache_03"),
    "V": W("fe_mustache_04"), "VI": W("fe_mustache_05"),
    "VII": W("fe_mustache_06"), "VIII": W("fe_mustache_07"),
};
/* BODY_SPIKES lived here for one bench run (08-16, "always on") and was
   cut by Rose's eye the same hour ("eh nevermind take them out"): under
   any shirt the pierce read as debris, not spikes. Deleted from disk;
   the conversion recipe survives in the learning if they return. */

/* Viking Vest/Shirt, Dancing Queen and Angie Top removed AND deleted from
   disk (Rose 08-02). A record still naming one falls back to Base Shirt at
   the doll, display only, the record keeps what it said. */
/* THE ACCESSORY SLOTS ARE CUT (Rose 08-18, within the hour of their
   landing: "the earrings arent in okat delete the accessories"). Neck,
   earrings and head slots were built whole -- tables here, rows in the
   mirror, dice, dressing, and the seats' own asks -- and the earrings
   never appeared on the body. The cause was found and is written in
   COMMON_WEAR.LICENSE.txt beside the deleted assets: dsf_to_glb writes
   a SKIN even for a joints-0 prop, so three.js built a SkinnedMesh and
   hangOnBone (which looks for a plain Mesh) attached nothing. The
   horns escape it because their conversion emitted no JOINTS_0 at all.
   Nothing here needs rebuilding to bring the family back: convert the
   props rigid, and re-add the tables. */

/* THE CLOTHES COME BACK (Rose, 2026-09-02: "also port the clothing in").
   Restored VERBATIM from the pre-nuke tables (learning _versions v065, the
   last snapshot that held them), then reconciled to TODAY's room index --
   the one-source law stands: every entry below is a room.js seat, and
   nothing else. What changed since the nuke, entry by entry:
   - Base Bra and Shorts (base_shorts) are DEAD (Blender-era, no source,
     no shelf); Halter Bra stands where Base Bra stood, in the tables and
     in the Smallclothes set alike. (The FILE NAMES came back 2026-09-24 as
     new G9 Starter Essentials ports, shipped 09-25 as the Plain Bra and
     Plain Shorts below; the old pieces stay dead. Plain Shorts was ERASED
     2026-09-28, model and all, Rose: "remove plain shorts from the project
     its too modern".)
   - The vamp split (her ruling): Ruffled Shirt stays the vestless blouse
     (vamp_top); Vested Shirt is the full vested original (vamp_top2).
   - The Priestess set's portable pieces earn their lines: top, skirt,
     shoes, wrist wraps, finger claws, hooded cape, plus the capelet.
   - Armour stays on the shelf as ever (helmets, the crown, the plate). */
export const GARMENTS = {
    top:    { /* classified by what it IS, not by the product it came in
                 (Rose, 08-16: "halter bra is a underwear top") */
              "Halter Bra": W("halter_bra"),
              "Undershirt": W("london_tank"),
              "Wrapped Top": W("rh_top"),
              /* "Silk Undershirt": W("sc_undershirt") moved to OUTFIT_TOPS as "Silk Shirt", Rose 2026-09-24:
                 "move the sc_undershsirt to the shirt section" */
              "Beaded Top": W("shaman_top"),
              "Lace Top": W("alena_top"),
              /* the G9 Starter Essentials pair, shipped 2026-09-25 (Rose: "ship everything in character creation
                 thats not in character creation") */
              "Plain Bra": W("base_bra") },
    bottom: { "Halter Panty": W("halter_panty"),
              "Lace Panty":   W("alena_panty"),
              "Boxers":       W("boxers"),
              "Silk Briefs":  W("sc_underwear"),
              "Beaded Briefs": W("shaman_bottom"),
              "Bikini Briefs": W("base_bikini"),
              /* Hong Xiu's own (DAZ 93288), 2026-09-29 (Rose: "put in all of the new outfits"); my name */
              "Tied Briefs":  W("hx_panty") },
};

/* The outfit layer: TOP and BOTTOM slots, mixable, each None-able; an
   entry's `pieces` all wear together under the slot's one tint; `covers`
   reaches the legs; `open` keeps the underwear beneath (the Pleated
   Skirt's own law); `blood` offers and deals only to that blood;
   `diceSkips` names the pronoun tone the dice never land it on. All of
   it hers, rulings recorded in the pre-nuke history this block restores. */
/*,,. `diceSkips` IS A SHIRT'S RANDOMIZE OPTION (Rose 2026-09-26: "each shirt should have 'randomize only female/
   nonbinary' or 'randomize only male/ nonbinary' options") ,,,
   "masc" = randomize only female/nonbinary, "fem" = randomize only male/nonbinary, absent = anyone. Every dealing
   hand keeps it (the Randomize dice, the world's dice, and the everyday fill a new record is first dressed from,
   steps/mirror.js); the chips still offer the piece to everybody. Hers as female/nonbinary: "dh top is female/nb,
   so is dv_chest, leathertop, eg_top, sq top, zk top, sk corset" (zk top was the one not yet carrying it). */
/* `armor` IS THE PIECE'S PROTECTION (Rose, 2026-09-02: "lets attribute
   AC to some of these set pieces... Body Chain light armor, heavy
   cuirass heavy armor(Adamantine), breastblate heavy, Leather Jerkin
   Light armor, Gambeson Medium?"). Classes are HERS (the Breastplate
   rode heavy on her word until her 2026-10-07 answer made it medium); the
   NUMBERS are Pathfinder's own armor table, fact-checked at d20pfsrd
   on her order (2026-09-02 "look up pathfinder rules involving
   armor"): Leather Jerkin = leather (+2/+6/0), Body Chain = chain
   shirt (+4/+4/-2), Gambeson = armored coat (+4/+3/-2, the padded-
   coat line), Breastplate = breastplate (+6/+3/-4), Heavy Cuirass =
   half-plate (+8/+0/-7) in adamantine, which grants heavy armor
   DR 3/-- (rides the roster's existing `dr`, best-of, never
   stacking). bonus adds to AC, maxDex caps the Dex AC may keep,
   checkPenalty and the medium/heavy speed cut wait for the skill and
   load gates (named debts, not wired). A top with no `armor`
   protects nothing. */
/*,,. THE NUMBERS NOW COME FROM THE ARMOUR TABLE (Vera 2026-10-02, Desktop/V/armour-table.md A2; Rose's popup 10-01:
   "Armour table (Recommended)") ,,,
   Each armour piece names its KIND in data/armourTable.js (the SRD's Table: Armor and Shields) and its ITEM (material,
   masterwork), and rules/armour.js wornOf answers the same block every reader read before. Two pieces STATE values over
   their kind, and Rose answered the morning file's question on 2026-10-07 (her popups before bed): the SRD's numbers, so
   the Heavy Cuirass is a half-plate's +7 and the Breastplate +5, and the Breastplate MEDIUM. Only the Heavy Cuirass states
   a value now, its adamantine's DR 3; its -6 is the half-plate's -7 lessened by masterwork (SRD, Masterwork Armor).
   The three plate pieces that protected nothing are real armour on her word ("you pick"), each by its look (move A10,
   Desktop/V/armour-table.md): the Lacquered Plate banded mail, the Filigree Plate a breastplate, the Plated Skirt
   studded leather, each at its kind's price. */
/* `shop` IS ARMOUR, AND ARMOUR IS BOUGHT (Rose 2026-09-23: "remove heavy cuirass from the lineup add it to
   the shop", then "move all armors to shop"). The mirror never offers a `shop` piece: not the Adornment
   chips, not the dice, not the everyday fill, not a seat's look page (steps/mirror.js mayOffer). It is sold
   on the Armour shelf instead (data/goods.js ARMOURY), packed at standing as the garment it is
   (data/basket.js), and worn from the Gear tab. A record that already wears one keeps it: `shop` gates the
   offer, never the wear. Armour is what the game already calls armour: every entry with `armor` stats, and
   the coat law's armour tier (steps/mirror.js ARMOR_TOPS, ARMOR_BOTTOMS). test_armouryShelf holds both
   lists to this flag. */
export const OUTFIT_TOPS = {
    "Cropped Top":     { pieces: [W("mk_top")], blood: "Shade", price: 1 },
    /* open on her word (09-02: "Body chain shirt should show the
       undershirts") -- the room's SHIRTS_OVER_UNDERSHIRT pair is
       wf_chain + vamp_top, and the Ruffled Shirt below already
       carries the parity; the chain owed the same flag. */
    "Body Chain":      { pieces: [W("wf_chain")], shop: true, blood: "Human", open: true,
                         armor: wornOf({ kind: "Chain Shirt" }), price: 100 },
    "Laced Corset":    { pieces: [W("sk_corset")], blood: "Cambion", diceSkips: "masc", price: 3 },
    "Heavy Cuirass":   { pieces: [W("df_suit")], shop: true, covers: true, blood: "Human",
                         armor: wornOf({ kind: "Half-Plate", material: "adamantine", masterwork: true,
                                         stated: { dr: 3 } }), price: 15600 },
    "Breastplate":     { pieces: [W("lp_chest")], shop: true, blood: "Human",
                         armor: wornOf({ kind: "Breastplate" }), price: 200 },
    /* open per her 09-01 ruling ("undershirts are visible with vamp_top")
       -- the room obeyed it that night; the game table owed the parity. */
    "Ruffled Shirt":   { pieces: [W("vamp_top")], ownsHands: true, blood: "Elf", open: true, price: 2 },
    "Vested Shirt":    { pieces: [W("vamp_top2")], blood: "Elf", price: 2 },
    /* THE ROOM'S BUNDLES, WORN WHOLE HERE TOO (Rose 2026-09-26: "only the dev room hair (and dev room
       clothing) are available in game. Nothing more. Nothing less."): the room wears bloodmoon_shirt with its
       lace cuffs (dev/room.js BUNDLES, Rose 08-24: "move bm cuffs to bm shirt"), and a shirt that brings its own
       wrist speaks for the Hands slot (PIECES_OWNING_HANDS, Rose 08-25: "for bloodmoon shirt no handwear are to
       ever show when its equipped"; the vestless blouse ends in ruffles and is in the same set). `ownsHands`:
       the record keeps its gloves, the body declines them while the shirt is on (steps/mirror.js wornOf). */
    "Moonlit Shirt":   { pieces: [W("bloodmoon_shirt"), W("bm_cuffs")], ownsHands: true, blood: "Cambion", price: 2 },
    "Priestess Top":   { pieces: [W("zk_top")], diceSkips: "masc", price: 2, starter: "Cambion" },
    /* the Sun Queen set, 2026-09-03 (her "port in the sun queen"):
       seven wearables benched in the room incl. the composed extreme;
       the headdress stays room-side (armour-class law), the earrings
       and neck band wait on the JEWELRY refill her word gates. */
    "Sun Halter":      { pieces: [W("sq_top")], diceSkips: "masc", price: 75 },
    /* the Egyptian Goddess set, 2026-09-03 (her "import egyptian
       outfit"): the two skirt layers are ONE garment by her word
       ("eg skirt and egskirt2 are supposed to be combined") -- the
       multi-piece entry shape exists for exactly this. The cloak was
       removed on her word; jewellery waits on the JEWELRY refill. */
    "Gilded Halter":   { pieces: [W("eg_top")], diceSkips: "masc", price: 75 },
    /* GOTHIC CROP IS GONE (Rose, 2026-09-15: "delete the gothic crop top by
       the way.. it shows breasts even if the char is flat"). The garment was
       exported with the bust baked into its geometry rather than carried on a
       shape key, so it has nothing for the BustGone morphs to drive: a flat
       character wore a chest that was not hers, and no dial in creation could
       answer it. Cut from the catalogue rather than hidden behind a gate,
       because a gate would still offer it to every body it happens to suit
       and leave the same fault waiting.
       The file stayed on disk at assets/models/g9/wardrobe/gh_crop.glb until
       Rose judged it in the animation room and it was erased 2026-09-24 on
       Rose's word. A return now is the port again, with a bust key. */
    /* "Forest Tunic" (druid_shirt) left 2026-09-24 in Rose's rack review ("remove druid shirt"); its glb was
       erased 2026-09-26 (Rose: "nuke the pieces"). A record still naming it dresses without it. */
    /* the Cambion leather pair, 2026-09-02 (her sweep order: "look in
       the outfits port everything we didnt port in yet"). */
    "Leather Wrap":    { pieces: [W("leather_top")], blood: "Cambion", diceSkips: "masc", price: 2 },
    /* the rag family rejoined 2026-09-02 (the sweep tail); worn by the
       dead alongside the kilt and foot wraps. */
    "Ragged Wrap":     { pieces: [W("rag_top")], blood: "Shade", diceSkips: "masc", price: 1 },
    /* the second wave, 2026-09-02 overnight (her live audit re-racked
       and cut; merges are hers: raa shirt+chest, raa pants+beltskirt,
       dh+dsw bottoms tri-merge, sao frock+plate instance). */
    /* "Gambeson" (pd_jacket; medium, +4 / max Dex 3 / -2 / 20 percent, 20 lb, 50 gp) left 2026-09-24 in Rose's
       rack review ("remove pd jacket and gr vest"); the glb was erased 2026-09-26 ("nuke the pieces"). The shop's
       medium armour tops are the Breastplate (medium on Rose's 2026-10-07 answer) and the Filigree Plate (A10). */
    "Huntress Blouse": { pieces: [W("dh_top")], diceSkips: "masc", blood: "Shade", price: 2 },
    /* REAL ARMOUR ON ROSE'S WORD, MY PICKS BY LOOK (move A10, 2026-10-07: "you pick"): the Lacquered Plate is an embossed
       chest plate over overlapping metal bands at the belly, so BANDED MAIL; the Filigree Plate a fitted solid plate
       bodice, so a BREASTPLATE. Each at its kind's price (they were 30 gp each and protected nothing) */
    "Lacquered Plate": { pieces: [W("dsw_chest")], shop: true, blood: "Shade",
                         armor: wornOf({ kind: "Banded Mail" }), price: 250 },
    "Filigree Plate":  { pieces: [W("sc_chest")], shop: true, diceSkips: "masc", blood: "Elf",
                         armor: wornOf({ kind: "Breastplate" }), price: 200 },
    "Rough Shirt":     { pieces: [W("gr_shirt")], blood: "Human", price: 1 },
    /* "Leather Jerkin" (gr_vest; light, +2 / max Dex 6 / 0 / 10 percent, 15 lb, 10 gp) left with it, the same
       word; erased beside it 2026-09-26. Body Chain is the shop's one light armour top; the Plated Skirt is light
       armour below (A10). */
    "Beaded Bodice":   { pieces: [W("dv_chest")], diceSkips: "masc", blood: "Elf", price: 3 },
    /* SILK SHIRT, moved up from the underwear tops (Rose 2026-09-24: "move the sc_undershsirt to the shirt
       section"), where it was "Silk Undershirt". A shirt's name and a shirt's price, 2 gp like the Ruffled and
       Vested Shirts, and its set's blood: every outer sc piece is Elf (Filigree Plate, the Duelist pair, the
       Opera Gloves), which also keeps a Human villager's plain top the Rough Shirt alone (test_npcLooks, Rose's
       09-03 "generic clothes only"). Underwear carries no blood, so below it had none. All mine to be corrected. */
    "Silk Shirt":      { pieces: [W("sc_undershirt")], blood: "Elf", price: 2 },
    /* THE DAZ LIBRARY PIECES, SHIPPED (Rose 2026-09-25: "ship everything in character creation thats not in
       character creation"): racked 09-24, kept through Rose's review. `dealt: false` is mine, not a ruling: these
       are modern cuts (a work tee and a streetwear tee; the cuffed jeans, sneakers and work boots that shipped with
       them were erased 2026-09-29 on Rose's word), so the chips and a seat's look page
       offer them to anyone while no dice and no everyday fill ever deals one (steps/mirror.js dealable). A village
       does not open in jeans by chance; Rose's word turns the dealing on. */
    "Work Tee":        { pieces: [W("wu_tshirt")], dealt: false, price: 1 },
    /* dForce Princess Petra's Shadow Streetwear (CREDITS.md in the pool), ported 2026-09-01 for Rose's eye and on
       the shirt rack since */
    "Shadow Tee":      { pieces: [W("ppss_tshirt")], dealt: false, price: 1 },
    /* THE NEW OUTFITS FROM E:\g9 stuff\Outfit (Rose 2026-09-29: "put in all of the new outfits"): Dawn Warrior
       (DAZ 88275) here, its boots and vambraces below, Hong Xiu's panty (DAZ 93288) in GARMENTS, the Midnight
       Outfit's thigh boots (DAZ 105418) with the shoes; dev/room.js has what was left out and why. No blood: no set was
       given to a people, so everyone is offered them. The names and prices are mine, to be corrected. Every one costs
       more than 5 gp, so a villager, who dresses plainly (Rose 09-03: "generic clothes only", nothing past 5 gp), is
       never dealt one. Ported too and erased the same night, Rose looking at the racks: the Dawn Warrior bodysuit,
       corset and skirt ("remove dw corset", "remove dw skirt", "remove the bodysuit") and the Hong Xiu dress
       ("remove hx dress"). */
    "Strapped Top":    { pieces: [W("dw_top")], diceSkips: "masc", price: 8 },
    /* "Angel Top" (angel_top) and "Angel Skirt" (angel_skirt), the FD Arielle gown (FaeDesign DAZ 113044) broken into
       pieces, were here for an hour on 2026-09-29 and went costume-only (Rose: "dekete the non costume angel", "keep
       the sandals"): the blonde story character wears them (dev/room.js COSTUMES, assets/models/g9/costumes). */
};
export const OUTFIT_BOTTOMS = {
    /* "Pleated Skirt" (sw_skirt, dForce Princess Petra's Shadow Streetwear) left 2026-09-25 (Rose, in the dev
       room's wind: "its mainly the sw skirt thats obvious... so delete that"); erased 2026-09-26 ("nuke the pieces"). */
    /* REAL ARMOUR ON ROSE'S WORD, MY PICK BY LOOK (move A10, 2026-10-07): the Breastplate's own set's skirt, metal plates
       down its front, so STUDDED LEATHER, at its kind's price (it was 20 gp). It counts only when it protects more than
       the top (armorWorn: the SRD's armour bonuses never stack) */
    "Plated Skirt":    { pieces: [W("lp_skirt")], shop: true, blood: "Human",
                         armor: wornOf({ kind: "Studded Leather" }), price: 25 },
    "Leather Breeches": { pieces: [W("druid_pants")], blood: "Human", price: 2 },
    "Ragged Kilt":     { pieces: [W("rag_kilt")], blood: "Shade", price: 1 },
    "Buckled Trousers": { pieces: [W("sk_pants")], blood: "Elf", price: 2 },
    "Canvas Trousers": { pieces: [W("rf_pants")], blood: "Human", price: 1 },
    "Priestess Skirt": { pieces: [W("zk_skirt")], price: 2 },   /* closed over the underwear, her 2026-09-04 */
    "Sunwrap Skirt":   { pieces: [W("sq_skirt")], price: 75 },
    /* "Goddess Skirt" (eg_skirt) left 2026-09-24 in Rose's rack review ("remove base shirt and eg_skirt"); erased
       2026-09-26 ("nuke the pieces"). */
    "Linen Pants":     { pieces: [W("eg_pants")], price: 1 },
    "Pentagram Tights": { pieces: [W("gh_tights")], blood: "Cambion", price: 2 },
    /* the Cambion leather pair's bottom half, 2026-09-02 (the sweep). */
    "Leather Mini":    { pieces: [W("leather_skirt")], blood: "Cambion", diceSkips: "masc", price: 2 },
    "Ragged Trousers": { pieces: [W("rag_pants")], blood: "Shade", price: 1 },
    "Moonlit Pants":   { pieces: [W("bloodmoon_pants")], blood: "Cambion", price: 2 },
    "Quilted Trousers": { pieces: [W("pd_pants")], blood: "Human", price: 2 },
    "Lacquered Warskirt": { pieces: [W("dsw_skirt")], shop: true, blood: "Shade", price: 20 },
    "Duelist Skirt":   { pieces: [W("sc_skirt")], diceSkips: "masc", blood: "Elf", price: 2 },
    "Duelist Trousers": { pieces: [W("sc_pants")], blood: "Elf", price: 2 },
    "Viking Trousers": { pieces: [W("lva_pants")], blood: "Human", price: 2 },
    "Warrior Trews":   { pieces: [W("vw_pants")], blood: "Human", price: 2 },
    /* Elarion, 2026-09-02 (the sweep): the hood is authored DOWN. */
    "Ranger Pants":    { pieces: [W("el_pants")], blood: "Elf", price: 2 },
    /* pants + thigh plates, ONE item by her word (2026-09-02: "df
       thighs... and pads or whatever is one thing"); the tasset and
       shoulders died the same ruling. */
    "Leg Armor":       { pieces: [W("df_legs")], shop: true, blood: "Human", price: 25 },
    /* "Cuffed Jeans" (angie_jeans; shipped 2026-09-25 with the tees above, hand-picked only) erased 2026-09-29
       (Rose: "remove angie jeans"). A record still naming it dresses without it. */
};

/* Shoes are their own slot, never welded into a bottom (Rose, 08-16:
   "why aren't you isolating the shoes too?"). No underwear-feet layer
   exists, so shoes only ever ADD. */
export const OUTFIT_SHOES = {
    "Riding Boots":    { pieces: [W("vamp_boots")], blood: "Elf", price: 2 },
    "Lacquered Boots": { pieces: [W("dsw_boots")], blood: "Shade", price: 5 },
    "Fiend Slippers":  { pieces: [W("sao_shoes")], blood: "Cambion", diceSkips: "masc", price: 2 },
    /* "Warrior Boots" (vw_boots) left 2026-09-24 ("delete the vw_boots"); erased 2026-09-26 ("nuke the pieces"). */
    /* ERASED 2026-09-29, Rose at the dev room's racks ("remove angie sneakers", then "remove lva boots, priest shoes,
       wu boots"): "Raider Boots" (lva_boots), "Temple Shoes" (priest_shoes), "Sneakers" (angie_sneakers) and "Work
       Boots" (wu_boots; the last two were the hand-picked-only modern pair shipped 2026-09-25). A record still naming
       one dresses without it. */
    "Soft Shoes":      { pieces: [W("mk_shoes")], price: 1 },
    "Buckled Boots":   { pieces: [W("df_boots")], blood: "Human", price: 2 },
    "Lined Boots":     { pieces: [W("wf_boots")], blood: "Human", price: 2 },
    "Ankle Boots":     { pieces: [W("rf_boots")], blood: "Human", price: 1 },
    "Plated Boots":    { pieces: [W("lp_boots")], blood: "Human", price: 10 },
    "Elven Boots":     { pieces: [W("elarion_boots")], blood: "Elf", price: 3 },
    "Tall Boots":      { pieces: [W("druid_boots")], blood: "Elf", price: 2 },
    "Foot Wraps":      { pieces: [W("rag_footwraps")], blood: "Shade", price: 1 },
    "Marching Boots":  { pieces: [W("sk_boots")], blood: "Human", price: 2 },
    "Sun Sandals":     { pieces: [W("sq_sandals")], price: 20 },
    "Gilded Sandals":  { pieces: [W("eg_shoes")], price: 20 },
    /* the new outfits, 2026-09-29 (OUTFIT_TOPS says why no blood and why over 5 gp): Dawn Warrior's boots */
    "Strapped Boots":  { pieces: [W("dw_boots")], price: 8 },
    /* the Midnight Outfit's thigh-high stockings, which wear as boots (Rose 2026-09-29: "the boots can go in the boot
       slot"); a bottom named "Thigh Stockings" (mo_stockings) for an hour before that */
    "Thigh Boots":     { pieces: [W("mo_boots")], diceSkips: "masc", price: 6 },
    /* the FD Arielle Outfit's flat sandals (FaeDesign DAZ 113044), kept on the racks when the rest of the angel set went
       costume-only (Rose 2026-09-29: "keep the sandals"); foot gap 1.17 cm; name and price mine */
    "Angel Sandals":   { pieces: [W("angel_sandals")], price: 6 },
};

/* Hands only ever ADD, the shoes' law. */
export const OUTFIT_HANDS = {
    "War Bracers":     { pieces: [W("bh_bracers")], blood: "Human", price: 5 },
    "Carved Bracers":  { pieces: [W("druid_bracers")], blood: "Elf", price: 3 },
    "Elven Gauntlets": { pieces: [W("el_gloves")], blood: "Elf", price: 5 },
    /* ERASED 2026-09-29, Rose at the dev room's racks ("remove sao gloves, sq armguards, zk wrists, rf gloves, lp
       gloves"): "Leather Gloves" (rf_gloves with its bracer rf_bracers), "Fiend Claws" (sao_gloves), "Plated
       Gauntlets" (lp_gloves with its vambrace lp_arms), "Wrist Wraps" (zk_wrists) and "Sun Guards" (sq_armguards).
       The two second halves went with their gloves: each was only ever worn as part of one. A record still naming
       one dresses without it. */
    "Padded Bracers":  { pieces: [W("pd_bracers")], price: 2 },
    "Huntress Bracers": { pieces: [W("dh_bracers")], blood: "Shade", price: 3 },
    "Lacquered Gloves": { pieces: [W("dsw_gloves")], blood: "Shade", price: 5 },
    "Opera Gloves":    { pieces: [W("sc_gloves")], diceSkips: "masc", blood: "Elf", price: 2 },
    "Sheer Sleeves":   { pieces: [W("dv_sleeves")], diceSkips: "masc", blood: "Elf", price: 1 },
    "Shadow Gloves":   { pieces: [W("df_gloves")], blood: "Human", price: 5 },
    "Finger Claws":    { pieces: [W("zk_claws")], price: 5 },
    "Sun Bands":       { pieces: [W("sq_armband")], price: 10 },
    "Gilded Gauntlets": { pieces: [W("eg_gauntlets")], price: 20 },
    /* the new outfits, 2026-09-29 (OUTFIT_TOPS says why no blood and why over 5 gp): Dawn Warrior's vambraces.
       Hong Xiu's detached sleeves were ported too and erased the same night (Rose: "remove hx sleeves"). */
    "Laced Vambraces": { pieces: [W("dw_vambraces")], price: 6 },
};

/* Cloaks are an OVER layer, not a top (Rose, 08-16): worn over whatever
   the other slots dress, hiding nothing beneath. */
export const OUTFIT_CLOAKS = {
    /* "War Cape": { pieces: [W("bh_cape")], blood: "Human", price: 10 } was here. Rose, 2026-09-23:
       "delete war cape". bh_cape.glb went to assets/models/g9/_removed/ with it and was erased 2026-09-24
       on Rose's word; a record that still names it dresses without it, the fallback every deleted piece
       takes. */
    "Winter Cape":     { pieces: [W("wf_cape")], blood: "Human", price: 5 },
    "Leather Vest":    { pieces: [W("rf_vest")], blood: "Human", price: 5 },
    "Plated Cape":     { pieces: [W("lp_cape")], blood: "Human", price: 30 },
    /* "Hooded Cape": { pieces: [W("zk_cape")], price: 2 } was here. Rose,
       2026-09-08: "delete zk_cape please". It was the one cloak that
       stripped the hair and its cap and swung a hood over a bare skull
       (Sadia_TODO, 09-07); glb deleted with it. */
    "Ranger Coat":     { pieces: [W("el_jacket")], blood: "Elf", price: 8 },
    "Forest Cape":     { pieces: [W("druid_cape")], blood: "Elf", price: 3 },
    /* her cloak law, 2026-09-02: "a jacket, a cloak, or anything of
       that class... thats it" -- the open jacket IS the cloak layer. */
    "Cropped Jacket":  { pieces: [W("sk_jacket")], blood: "Human", price: 5 },
    /* "Hooded Capelet" (mo_hood, the Midnight Outfit's short cape with its hood down) was here for an hour on
       2026-09-29 and erased with the gown (Rose: "unfortunate the outfit is janky... remove it except the boots"). */
};

/*,,. THE HELMET SLOT (Rose 2026-09-26: "Make a helmet slot", after "only the dev room hair (and dev room clothing)
   are available in game. Nothing more. Nothing less.") ,,,
   The dev room's helmet rack. The Moon Tiara and the Work Helmet left it and the project the same day, erased
   (Rose 2026-09-26: "delete the work helmet I didnt see that... delete it from project and the dev room. also delete the moon tiara its hideous"). Asked for on 09-10 ("also helmet and gauntlets") and only the gauntlets
   were built then; a miss, not a ruling. The two per-piece laws are the room's own (dev/room.js): `cropsHair` is
   HELMETS_CROPPING_HAIR (Rose 09-03: "some helmets (like tiaras) can show hair other helmets cant"), worn as the
   buzz while the record keeps its style; `hidesFacial` is HELMETS_HIDING_FACIAL (Rose 08-26, mn_helmet: the beard
   and moustache step aside under the faceplate and come back when it comes off). No armour stats: the SRD's
   armour table has no helm row. MINE, to be corrected: the names (after each set's other pieces), the prices,
   the blood where a set's other pieces agree on one (bh and rf are Human), and `dealt: false` on every one, so
   the chips and a seat's look page offer a helmet while no dice or everyday fill deals one over a chosen hair. */
export const OUTFIT_HELMETS = {
    "Padded Coif":      { pieces: [W("pd_coif")], cropsHair: true, dealt: false, price: 2 },
    "Beaded Headdress": { pieces: [W("shaman_headdress")], dealt: false, price: 3 },
    "Priestess Crown":  { pieces: [W("zk_crown")], dealt: false, price: 5 },
    "War Helm":         { pieces: [W("bh_helmet")], blood: "Human", cropsHair: true, dealt: false, price: 5 },
    "Leather Helm":     { pieces: [W("rf_helmet")], blood: "Human", cropsHair: true, dealt: false, price: 2 },
    "Closed Helm":      { pieces: [W("mn_helmet")], cropsHair: true, hidesFacial: true, dealt: false, price: 5 },
};

/**
 * SETS: the dice's dressing grammar. A set's `top` is asked about the
 * BODY (the morph boundary), never `person.gender` -- that field is
 * seeded-and-never-written on the player.
 */
export const GARMENT_SETS = {
    Smallclothes: {
        /* her default law, 2026-08-31 ("by default women wears base bra,
           men wears london tank") with 09-02's living pieces: Base Bra is
           dead and the Halter Bra stands in its stead */
        top: (feminine) => (feminine ? "Halter Bra" : "Undershirt"),
        bottom: (feminine) => (feminine ? "Halter Panty" : "Boxers"),
    },
    /* Dice-only, never in SET_ORDER: the underwear half of the Cambion
       default look. Hand-pickers reach these pieces directly. */
    Halter: {
        top: () => "Halter Bra",
        bottom: "Halter Panty",
    },
};
export const SET_ORDER = ["Smallclothes"];

export const STANDINGS = ["Alive", "Missing", "Disowned", "Dead"];

/**
 * Offered to EVERY parent regardless of blood, an ethnicity may add one more on
 * top, it does not replace the pool. ("Vessel" is deliberately absent: it is
 * reserved to one NPC.)
 */
const BLOODLINE_FEATS = [
    "Troll-kin", "Ethnocentric", "Nobility", "Giant Grip",
    /* "Savant" is a bloodline feat AND a class: the feat is the only key to the path (Rose 09-17: "Its a bloodline
       feat inheriting it from the parent unlocks it - nothing else"), and what the path grants lives in
       data/classes.js BASE_CLASSES.Savant. */
    "Tremorsense", "Barbaric", "Savant", "Noble Rage",
    /* NIGHT OWL IS ONE OF THESE (Rose 2026-09-17: "its a bloodline feat.... move it back to bloodline"). It had been
       sitting in the general pool as a canon feat gated on night vision; it belongs here, where only a parent's
       blood can offer it. */
    "Night Owl",
];

/*,,. WHY THE BLOODLINE FEATS ARE FIRST-LEVEL ONLY (Rose 2026-09-17) ,,,
   "Bloodline feats are broken and they are canon only able to be taken at level 1 because of how broken they are."
   They are his own canon and deliberately stronger than anything on the general pool -- regeneration that only fire
   and acid end, a +4 to every dependent, a grip that wields a size up -- so the blood gives them at the start or
   never. Nothing levels yet, so this is recorded as the law it is; the day levels land, the feats step must refuse
   them after first. */
export const BLOODLINE_AT_FIRST_LEVEL_ONLY = true;

/**
 * The RIVEN feats, claws, fangs, a barbed tail. Race-locked to Cambion, and
 * they are DEFORMITIES TAKEN, not blood inherited: a Cambion who never takes one
 * never grows them. That is why they sit here among the racial feats rather than
 * being handed out with the horns, which the blood gives whether you want them
 * or not.
 */
/* Exported since 08-16: the dive's feat dropdowns must know which picks
   change the BODY (claws, tail), because those redraw the figure where an
   ordinary feat only repaints the footer. */
export const RIVEN_FEATS = ["Riven Hands", "Riven Jaw", "Barbed Tail"];

/**
 * BLINK IS THE SHADE'S RIVEN (08-08). The v1 Ruby files it under `#Shade` in
 * `LoH_RacialFeats`, *"While in Darkness you gain the ability to teleport short
 * distances."*, and v2 had the text with no owner at all, so it was authored
 * and unreachable.
 *
 * Race-locked and CHOSEN, not granted. Shades carry four intrinsics (DR 5 cold,
 * full night vision, incorporeal, undead) and NO free feat: Shadowmeld rode the
 * blood free until Rose's 2026-09-18 ruling ("no free racial feats either"), and the
 * bar's last free road for its shadow step closed with her report #6 (2026-10-08,
 * move R6). A free gift is not what "the potency is decided by what the player
 * picks" means. The Cambion/Riven branch below is the precedent it follows.
 */
/* PHASE, not Blink (Rose 2026-09-17: "they're two blinks. The spell blink and the SLA Blink... rename the SLA
   Blink (Shade's ability) to Phase"). The SPELL is Blink, a 3rd-level transmutation on the verse table; this is
   the Shade's own race-locked ability and it needed its own name. */
const SHADE_FEATS = ["Phase"];

/** Everything a person of this race and ethnicity may take as a racial feat. */
export function racialFeatsFor(race, ethnicity) {
    const eth = ETHNICITIES[ethnicity];
    const own = (RACES[race] && RACES[race].traits) || [];
    const locked = race === "Cambion" ? RIVEN_FEATS
                 : race === "Shade"   ? SHADE_FEATS : [];
    return ["None", ...own, ...(eth && eth.trait ? [eth.trait] : []), ...locked];
}

/**
 * A LINE MAY OWN MORE THAN ONE BLOODLINE, so `bloodline` takes a string OR an
 * array and everything reads it through here. Wraith owns two. Shadow Strike
 * and Shadow Step, and while the field held a single string the second was
 * simply unreachable, which is why both sat in `feats.js` fully authored and
 * offered by nobody.
 */
export const bloodlinesOf = (ethnicity) => {
    const b = (ETHNICITIES[ethnicity] || {}).bloodline;
    return !b ? [] : Array.isArray(b) ? b : [b];
};

/*,,. THE SAVANT COMES DOWN THE BLOOD, NOT OFF A PAGE (Rose 2026-09-17) ,,,
   "Savant isnt a feat it automatically becomes selectable if your parents have it and moves to the top of the choice
   menu." A parent may carry it like any other thing in the blood; the child never takes it, never spends a slot on
   it, and is never offered it among feats. What it opens is the Savant path on the starting-path page.
   ONE OWNER for the question, so the class page and anything later ask the same thing of the same record. */
export const SAVANT = "Savant";
export function parentsCarrySavant(creation) {
    const b = (creation && creation.self && creation.self.body && creation.self.body.blood) || {};
    return [b.mother, b.father].some((p) => p && (p.bloodline === SAVANT
        || (Array.isArray(p.bloodline) && p.bloodline.includes(SAVANT))));
}

/** The general pool plus whatever this ethnicity adds. */
export function bloodlineFeatsFor(ethnicity, race) {
    /* a Shade parent is already destroyed at 0: the troll's living knit
       has nothing to hold (Rose 08-14: "shades cant get troll kin") */
    const pool = race === "Shade"
        ? BLOODLINE_FEATS.filter((n) => n !== "Troll-kin")
        : BLOODLINE_FEATS;
    return ["None", ...pool, ...bloodlinesOf(ethnicity)];
}

/**
 * WHAT A PARENT'S BLOOD ACTUALLY ROLLS (Rose, 2026-08-07: *"Randomize
 * bloodlines"*).
 *
 * The old roll was `pick(["None", "None", eth.bloodline])`, which could only
 * ever produce an ethnicity's OWN bloodline, so the eight general feats
 * above sat in every dropdown and in no dice, and since a rolled parent is
 * always Human and no Human ethnicity carries a bloodline, a freshly rolled
 * household offered the player NOTHING. Measured before the fix: 0 bloodline
 * feats across 20,000 households. The whole inherit-from-your-blood feature
 * on the feats page was unreachable without hand-editing a parent.
 *
 * The odds are kept where the old roll put them, about one parent in three
 * carries a bloodline, so a household still reads as ordinary people with
 * the occasional something in the blood. What changed is WHICH: the draw is
 * now even across the eight general feats plus this ethnicity's own, so
 * every authored bloodline can actually arrive.
 */
const BLOODLINE_ODDS = 1 / 3;

/**
 * A LINE'S OWN BLOODLINE IS NOT A LOTTERY PRIZE (Rose, 08-08: *"if the parents
 * doesnt have the feat the player cant inherit it"*).
 *
 * Dream Eater used to be one entry in a nine-deep pool behind a 1-in-3 gate, so
 * a Succubus parent carried it **3.7%** of the time and carried both her
 * signatures 1.8% of the time, measured. The child inherits only what a parent
 * holds, so the subrace's whole identity was unreachable in practice.
 *
 * So a subrace WITH a bloodline of its own always has it: a succubus is a thing
 * that eats dreams. The 1-in-3 roll against the general eight is for lines with
 * no signature of their own, where "something in the blood" is the flavour.
 */
export function rollBloodline(ethnicity) {
    /* A person carries ONE bloodline, so a line owning two hands its child a
       draw between them, a wraith is a Shadow Strike or a Shadow Step, never
       both at once. The dropdown still offers the line's full set. */
    const own = bloodlinesOf(ethnicity);
    if (own.length) return pick(own);
    return Math.random() < BLOODLINE_ODDS ? pick(BLOODLINE_FEATS) : "None";
}

export const PARENT_CLASSES = [
    "Rogue", "Bard", "Wizard", "Sorcerer", "Druid", "Monk",
    "Ranger", "Cleric", "Fighter", "Paladin", "Barbarian",
];

/** The two slots read different lists, this is authored, not a bug. */
export const OCCUPATIONS = {
    mother: ["Military","Merchant","Scholar","Blacksmith","Alchemist","Songstress","Huntress","Courtesan","Vagrant","Unemployed"],
    father: ["Military","Merchant","Scholar","Blacksmith","Alchemist","Minstrel","Hunter","Hustler","Vagrant","Unemployed"],
};

export const REGIONS = ["Poroure", "Ainmuc", "Nivea", "Oxa"];

export const ALIGNMENTS = [
    "True Neutral", "Neutral Evil", "Chaotic Good", "Chaotic Neutral",
    "Chaotic Evil", "Lawful Good", "Lawful Neutral", "Lawful Evil", "Neutral Good",
];

/**
 * ALIGNMENT IS TWO AXES, NOT A LIST OF NINE.
 *
 * The flat list above is still what a PARENT rolls, one pick out of nine is the
 * right shape for a character nobody is authoring. The player answers the two
 * questions instead and the name falls out of them, which is why `alignmentName`
 * exists rather than a ninth entry in a dropdown.
 *
 * `Neutral` + `Neutral` is the one pairing that does not simply join: it is
 * "True Neutral", never "Neutral Neutral".
 */
export const ALIGNMENT_ORDER = ["Lawful", "Neutral", "Chaotic"];
export const ALIGNMENT_MORALITY = ["Good", "Neutral", "Evil"];

export const alignmentName = (order, morality) =>
    (order === "Neutral" && morality === "Neutral") ? "True Neutral" : `${order} ${morality}`;

/** The plate for an alignment, keyed by the name `alignmentName` produces. */
export const alignmentPlate = (name) =>
    `assets/img/alignment/${name.replace(/ /g, "_")}.webp`;

/**
 * Authored as FOUR LINES each and printed as four. The shape is deliberate and
 * identical throughout, a title, what you are, what it buys you, what it costs.
 * Kept verbatim from the original, and the wording is Rose's. (This line used to
 * credit her with "the em dash habit" as well. There is not a single dash in
 * these forty-eight strings, and the habit was MINE everywhere else in the
 * codebase; 08-09 it was swept out and the misattribution with it.)
 */
export const ALIGNMENT_BLURB = {
    "Lawful Good":     ["The crusader.", "Your word is a wall others shelter behind.", "Pro: law, temple and town trust you.", "Con: the oath holds even when mercy begs."],
    "Lawful Neutral":  ["The judge.", "The law is the law, in daylight or dark.", "Pro: none can bend you, few can buy you.", "Con: the rule stands even when it wounds."],
    "Lawful Evil":     ["The tyrant.", "Order is a ladder, and you are climbing.", "Pro: structure serves you, contracts bind.", "Con: obeyed everywhere, loved nowhere."],
    "Neutral Good":    ["The benefactor.", "Kindness first, the paperwork can wait.", "Pro: help given freely, no dogma attached.", "Con: every side counts you half an ally."],
    "True Neutral":    ["The balance.", "The scale tips for no one, not even you.", "Pro: no chain, no creed, no debt to carry.", "Con: no banner will shelter you either."],
    "Neutral Evil":    ["The opportunist.", "Whatever serves you is what is right.", "Pro: unburdened by scruple or sentiment.", "Con: no one lends you their back twice."],
    "Chaotic Good":    ["The rebel.", "A kind heart with no patience for chains.", "Pro: freedom and heart in equal measure.", "Con: the law counts you trouble anyway."],
    "Chaotic Neutral": ["The free spirit.", "You go where the whim and the wind agree.", "Pro: liberty, total and untaxed.", "Con: loyalty is a language you forget."],
    "Chaotic Evil":    ["The destroyer.", "What stands, you unmake. What binds, you burn.", "Pro: nothing holds you, nothing ever will.", "Con: every hand turns against you."],
};

/** Ten and ten per blood, so a race swap is audible. Half-bloods borrow Human. */
export const NAMES = {
    Human: {
        fem:  ["Aemilia","Corvina","Drusa","Marcella","Sabine","Valeria","Livia","Octavia","Tullia","Aurelia"],
        masc: ["Cassian","Marcus","Varro","Serranus","Quintus","Aemilius","Decimus","Lucan","Tiberius","Gaius"],
    },
    Elf: {
        fem:  ["Aelinor","Sylvara","Faenwyn","Ilyriel","Miravel","Naeryn","Elowen","Maerwyn","Lythien","Yrisel"],
        masc: ["Thaelen","Lorien","Caelith","Vaelen","Sirion","Ithiel","Anorien","Faelar","Celebrin","Aerandir"],
    },
    Shade: {
        fem:  ["Mortessa","Sepulcra","Reliquia","Morrigane","Tenebra","Gravelyn","Palewyn","Nocturne","Sableth","Hollowen"],
        masc: ["Umbriel","Vesper","Cairn","Mourne","Duskane","Ashvane","Grimhold","Ossian","Wraithe","Cinderash"],
    },
    Cambion: {
        fem:  ["Vessaline","Nyxara","Seraphel","Lilivant","Velmara","Ixthara","Sythera","Ravenne","Belmora","Nyssara"],
        masc: ["Malachar","Zerith","Balthorn","Azrieth","Karnyx","Dessarion","Morvael","Zavriel","Tharsis","Vaeloth"],
    },
};

//--- derivation --------------------------------------------------------------

const roll = (n) => Math.floor(Math.random() * n);
export const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** Ordered pair key, so mother/father order cannot matter. */
function crossKey(a, b) {
    const [x, y] = [a, b].sort((p, q) => RACE_ORDER.indexOf(p) - RACE_ORDER.indexOf(q));
    return `${x}|${y}`;
}

/**
 * The child. Same race → that race, pure. Different → the literal word
 * "Half-blood", with the cross carried alongside it.
 */
export function deriveChild(motherRace, fatherRace) {
    if (!motherRace || !fatherRace) return null;
    if (motherRace === fatherRace) {
        const r = RACES[motherRace];
        return { race: motherRace, pair: null, ...r, lifespan: undefined };
    }
    const key = crossKey(motherRace, fatherRace);
    return { race: "Half-blood", pair: key, ...CROSSES[key] };
}

/**
 * THE RACE A RECORD'S BLOOD MAKES (step 1's move 9: nothing writes a race onto a record any more). The rule above,
 * asked of the two parents in the record's body section; a missing one stands in as Human, as the sheet's does
 * (state.js heritageOf). A record with no parent at all has no blood anyone knows and answers null, never Human
 * (sadia's ask: a rat or a race-named NPC must not read as Human), and so does a record with no body (a book from
 * before the rebuild, still listed on the shelf). Takes a creation ({ self }) or a record.
 */
export function raceOf(record) {
    const s = record && (record.self || record);
    const b = s && s.body && s.body.blood;
    const m = b && b.mother, f = b && b.father;
    if (!m && !f) return null;
    const c = deriveChild((m || { race: "Human" }).race, (f || { race: "Human" }).race);
    return c ? c.race : null;
}

/** THE TWO PARENTS' RACES off a record's blood, [the mother's, the father's], a missing parent null (step 1's
    move 10: the race WORDS a sheet and a mind carried beside the blood are gone). Takes a creation or a record. */
export function bloodRacesOf(record) {
    const s = record && (record.self || record);
    const b = (s && s.body && s.body.blood) || {};
    return [(b.mother && b.mother.race) || null, (b.father && b.father.race) || null];
}

/** THE LINE THAT SHOWS: the mother's ethnicity, else the father's, else null (her figure's rule, and what a dealt
    sheet stored as its `ethnicity` until move 10). Takes a creation or a record. */
export function lineOf(record) {
    const s = record && (record.self || record);
    const b = (s && s.body && s.body.blood) || {};
    return (b.mother && b.mother.ethnicity) || (b.father && b.father.ethnicity) || null;
}

/** A WHOLE CHARACTER'S RECORD IS ONE WITH ITS BLOOD (step 1's move 21): a seat's, a dealt person's and a statblock's
    name a mother or a father (a statblock carries the blood its look was drawn from, void.js bloodFor, 2026-10-01); a
    beast and a post carry none, and a fresh body section names neither. Every gate that builds a body's sheet off its
    record asks this (a seat's chair beside it), never a flag kept on the mind */
export function hasBlood(record) {
    const s = record && (record.self || record);
    const b = s && s.body && s.body.blood;
    return !!(b && (b.mother || b.father));
}

/** Any Cambion blood, the child's own or either parent's, grows horns. */
export function hasHorns(motherRace, fatherRace) {
    return motherRace === "Cambion" || fatherRace === "Cambion";
}

/** Any Elf blood points the ears, the horn law's twin (Rose, 08-06: "give
    the elven ears to the elves", and a half-elf is still of the elves). */
export function hasElfEars(motherRace, fatherRace) {
    return motherRace === "Elf" || fatherRace === "Elf";
}

/**
 * WHAT A LOOK READS OFF A BODY'S TWO PARENTS (Wenna's blood, sadia 2026-10-01). The race their blood makes, the horns,
 * the ears, the human gate, the shade's incorporeal flesh and its ROT, and both races themselves (`parents`), so the
 * mirror's tones and eyes can ask the blood behind anyone, not only the player: "halfbreeds can get access to whatever
 * their parents have access to" (Rose 08-07). "The five lines" the forge and a standing seat each wrote by hand never
 * set the rot, so a Shade cross never rotted and was never offered the Shade's pieces. The race reads a missing parent
 * as Human, as raceOf does; each flag asks the race given.
 */
export function bloodLook(motherRace, fatherRace) {
    const m = motherRace || "Human", f = fatherRace || "Human";
    return { race: deriveChild(m, f).race, horned: hasHorns(motherRace, fatherRace),
             earsPointed: hasElfEars(motherRace, fatherRace), humanBlooded: hasHumanBlood(motherRace, fatherRace),
             incorporeal: hasShadeBlood(motherRace, fatherRace), rots: hasShadeBlood(motherRace, fatherRace),
             parents: [m, f] };
}

/**
 * DAMAGE REDUCTION, WHICH IS WHAT THE BLOOD IS RATHER THAN WHAT IT LEARNED
 * (Rose, 2026-08-07: *"shades get DR 5 cold, tieflings get dr 5 fire...
 * half bloods should get dr 2 so a shade cambion gets d2 cold, dr 2 fire"*).
 *
 * DERIVED, never tabled. The half-blood value is ONE RULE applied to whatever
 * the parents are, so a Shade|Cambion picking up both kinds falls out on its
 * own instead of being hand-written into a seventh cross entry that could
 * drift from the six others. Same shape as `hasHorns` and `hasElfEars`: ask
 * the two parent races, do not ask the child's name for itself.
 *
 * A pure blood carries its race's full value. A half-blood carries HALF_DR of
 * each type either parent brings, both types when both parents bring one.
 * Human and Elf bring nothing, so a Human|Elf has no DR at all.
 *
 * A SUBRACE CAN BRING A KIND OF ITS OWN since 09-16 (the cubi's cold 5 on top
 * of the Cambion fire 5, see the Succubus row), so a parent is asked as a
 * WHOLE PERSON now, race and line, exactly as nightVisionFor asks. The rule
 * does not change: a kind BOTH parents bring comes through in full, a kind
 * only one brings comes through at HALF_DR. Succubus|Incubus: cold 5, fire 5.
 * Succubus|Changeling: fire 5 (both are Cambion), cold 2 (one line brings it).
 * Succubus|Human: fire 2, cold 2. The roster's seat records keep only race
 * NAMES, and drFor still takes those, so a seat is sheeted as before.
 *
 * NOTHING READS THIS YET. Two feats already promise it in prose (Troll-kin's
 * "can only be killed by fire or acid", Flame Affinity's "take less damage
 * from fire" before it was retired), so when combat learns to reduce damage,
 * it must read `heritage().dr` and not re-derive its own.
 */
const HALF_DR = 2;

/**
 * NIGHT VISION, THE OTHER INTRINSIC, on exactly the same rule: *"kid gets half
 * the parent full if a full blood"* (Rose, 08-07).
 *
 * A GRADE, not a flag, 1 full, 0.5 half, 0 none. Read that rule literally and
 * it is about PARENTS, not races: each parent contributes half of whatever they
 * themselves see with, so two dark-eyed parents make a fully dark-eyed child
 * and one makes a half. Shade|Cambion reaching full falls out of that rather
 * than being a special case, and it is what the table already said.
 *
 * ASKED OF THE WHOLE PARENT, because a SUBRACE can carry this too, the exiled
 * elves took to the dark and see in it, though elves as a race do not. That is
 * why this takes person records; `drFor` took race names alone until the
 * cubi's cold (09-16) made DR a thing a line can carry too, so it now reads a
 * person record as well and falls back to a bare race name.
 *
 * Deriving it settled a contradiction the hand-written table had carried:
 * Human|Shade was authored WITH night vision and Elf|Shade WITHOUT, from the
 * same Shade parent.
 *
 * Every gate that asks "do you have night vision" still reads true at a half,
 * 0.5 is truthy, so a half-blood keeps the feats their eyes qualify for. Only
 * something that cares HOW FAR needs to read the number.
 */
const seesInDark = (person) => {
    if (!person) return 0;
    const byRace = (RACES[person.race] || {}).nightVision || 0;
    const byLine = (ETHNICITIES[person.ethnicity] || {}).nightVision || 0;
    return Math.max(byRace, byLine);
};

export function nightVisionFor(mother, father) {
    if (!mother || !father) return 0;
    return Math.min(1, (seesInDark(mother) + seesInDark(father)) / 2);
}

/** SRD Light Blindness for the banished line: eyes bred to the deep
    dark pay for it under the open sun (abrupt bright light blinds
    for 1 round; dazzled for as long as it holds). FULL blood only,
    the SRD's own half-kin rule: a mixed child keeps the dark sight
    and loses the sun's price. Person records, like night vision:
    the line is an ethnicity, not a race. */
export function lightBlindFor(mother, father) {
    return !!(mother && father
        && mother.ethnicity === "Exiled Elf"
        && father.ethnicity === "Exiled Elf");
}

/** "Night Vision" / "Night Vision (half)", nothing at all when blind to dark. */
export const nightVisionLine = (n) =>
    !n ? "" : n >= 1 ? "Night Vision" : "Night Vision (half)";

/** What one parent brings: the race's DR, and on top of it whatever the
    parent's own line carries (the cubi's cold). A person record or a bare
    race name; a name knows no line. */
const bringsDr = (p) => {
    const race = typeof p === "string" ? p : (p && p.race);
    const line = typeof p === "string" ? null : (p && p.ethnicity);
    const out = { ...((RACES[race] || {}).dr || {}) };
    const byLine = (ETHNICITIES[line] || {}).dr || {};
    for (const kind of Object.keys(byLine)) out[kind] = Math.max(out[kind] || 0, byLine[kind]);
    return out;
};

export function drFor(mother, father) {
    const out = {};
    if (!mother || !father) return out;
    const m = bringsDr(mother), f = bringsDr(father);
    for (const kind of new Set([...Object.keys(m), ...Object.keys(f)])) {
        /* both parents bring it: the full value; one of them: the half-blood's */
        out[kind] = (m[kind] && f[kind]) ? Math.max(m[kind], f[kind]) : HALF_DR;
    }
    return out;
}

/** "DR 2 cold · DR 2 fire", or "" when the blood reduces nothing. */
export const drLine = (dr) => Object.keys(dr || {}).sort()
    .map(k => `DR ${dr[k]} ${k}`).join(" · ");

/**
 * FORTIFICATION: the chance a critical hit or sneak attack is downgraded to
 * ordinary damage. Percent, 0 when the blood offers none.
 *
 * The full/half rule produces BOTH published numbers on its own, which is why
 * this needed no exception: RAW undead are simply "not subject to critical hits"
 * (100), and the half-undead template grants exactly "a 50% chance that the
 * critical hit or sneak attack is negated" (half of 100). Derived from the two
 * PARENT races like DR and night vision, a cross's own race string knows
 * nothing about which bloods made it.
 *
 * NOTHING CONSUMES THIS YET. The battle sandbox rolls and confirms crits
 * (`resolveAttack` -> `res.crit`), so the check belongs immediately after
 * confirmation; sneak attack is not modelled there at all.
 */
export function fortificationFor(motherRace, fatherRace) {
    if (!motherRace || !fatherRace) return 0;
    if (motherRace === fatherRace) return (RACES[motherRace] || {}).fortification || 0;
    return [motherRace, fatherRace]
        .reduce((n, r) => Math.max(n, ((RACES[r] || {}).fortification || 0) / 2), 0);
}

/** "Fortification 50%", or "" when the blood offers none. */
export const fortLine = (n) => n ? `Fortification ${n}%` : "";

/* THE ARMOR A LOOK IS WEARING (her AC attribution, 2026-09-02): the worn
   top's `armor` block, or null for every unarmoured shirt. Judged by the
   record's name alone -- the same name the chips offered -- so the sheet,
   the pause menu and the roster can never disagree about what is worn. */
/* THE TOP'S ARMOUR OR THE BOTTOM'S, THE BETTER, NEVER BOTH (move A10, Rose 2026-10-07: the Plated Skirt is real armour;
   SRD, Armor, Armor/Shield Bonus, d20srd.org/srd/equipment/armor.htm, read in Chrome that night: "The armor bonus from a
   suit of armor doesn't stack with other effects or items that grant an armor bonus"): the larger bonus, the top on a
   tie. Each piece still weighs its own (data/carry.js clothLbOf, slot by slot). */
export const armorWorn = (a) => {
    const top = (a && OUTFIT_TOPS[a.outfitTopName] && OUTFIT_TOPS[a.outfitTopName].armor) || null;
    const bottom = (a && OUTFIT_BOTTOMS[a.outfitBottomName] && OUTFIT_BOTTOMS[a.outfitBottomName].armor) || null;
    if (!bottom) return top;
    if (!top) return bottom;
    return (bottom.bonus || 0) > (top.bonus || 0) ? bottom : top;
};

/* ONE OWNER FOR THE AC ARITHMETIC (SRD): armor bonus adds to AC but not
   to touch (touch ignores exactly the armour, roster.js's own words);
   maxDex caps the Dexterity that EITHER line may keep. Its consumers --
   the roster's pair, the pause card and sheet, the character list -- and a
   formula each would otherwise re-derive is how they drift apart.
   AND THE SHIELD (IT1a, 2026-10-08; SRD, Combat Statistics: "10 + armor bonus + shield bonus + Dexterity modifier + size
   modifier"; Touch Attacks: "your AC doesn't include any armor bonus, shield bonus"): its bonus to AC, never to touch,
   and the tower's own cap on Dexterity (Max Dex 2) beside the armour's. */
export function acFrom(dexMod, armor, shield) {
    let dex = armor ? Math.min(dexMod, armor.maxDex) : dexMod;
    if (shield && shield.maxDex != null) dex = Math.min(dex, shield.maxDex);
    return { ac: 10 + dex + (armor ? armor.bonus : 0) + (shield ? shield.bonus : 0), touchAc: 10 + dex };
}

/* WHAT THE WORN LOOK COSTS (her pricing order, 2026-09-02: "update the
   clothing selection to run on 'price' so the character cant complete
   creation if they've spent too much"). Prices are Pathfinder's, read
   from d20pfsrd; a clothing entry with no `price` is ordinary dress at
   1 gp. Two Pathfinder rules shape the sum: armour and weapons are
   always PAID, but "each character begins play with an outfit worth
   10 gp or less" free -- so plain clothes cost nothing until the
   ensemble passes the allowance, then it pays whole. Underwear is free
   always (her standing law: "underwear free"). */
/* ITEMISED FIRST, SUMMED FROM THE ITEMISATION (her 2026-09-02: "'the
   pack' doesnt list all of the things thats costing money... (like the
   armor)"). The Provisions page shows what the purse is paying for, and
   a list built beside the total is a list that drifts from it; so the
   LINES are the truth and `spentOf` adds them up. A line the allowance
   forgives carries `free`, because "Rough Shirt — free" tells the
   player why their clothes cost nothing far better than silence. */
export function spendLines(a, weaponName) {
    const lines = [];
    if (a) {
        const slots = [[OUTFIT_TOPS, a.outfitTopName],
                       [OUTFIT_BOTTOMS, a.outfitBottomName],
                       [OUTFIT_SHOES, a.outfitShoesName],
                       [OUTFIT_HANDS, a.outfitHandsName],
                       [OUTFIT_CLOAKS, a.outfitCloakName],
                       [OUTFIT_HELMETS, a.outfitHelmetName]];
        const cloth = [];
        for (const [table, name] of slots) {
            const e = table[name];
            if (!e) continue;
            if (e.armor) lines.push({ name, gp: e.price || 0, kind: "armour" });
            else cloth.push({ name, gp: (e.price != null ? e.price : 1), kind: "clothing" });
        }
        /* THE FREE-OUTFIT RULE IS DEAD (her 2026-09-03 override: "Every
           article of clothing thats not underwear costs gold"). The SRD's
           10-gp starting outfit stood here one day; her word replaces it,
           and every entry now carries its own price so nothing rides the
           silent default. Underwear alone stays free -- it is not in the
           slots above. */
        for (const c of cloth) lines.push(c);
    }
    const w = WEAPON_GP[weaponName] || 0;
    if (weaponName && weaponName !== "Unarmed")
        lines.push({ name: weaponName, gp: w, kind: "weapon" });
    return lines;
}
export function spentOf(a, weaponName, weaponSize) {
    /* a Large weapon costs twice the listed price and a Small one the same (SRD, read 09-17); the purse pays what
       the page shows (Rose 09-17: size changes "reach, damage, and value") */
    const base = spendLines(a, weaponName).reduce((n, l) => n + l.gp, 0);
    const extra = weaponName && weaponName !== "Unarmed" && String(weaponSize || "").toLowerCase() === "large"
        ? (WEAPON_GP[weaponName] || 0) : 0;
    return base + extra;
}

/**
 * COLOURING THAT BELONGS TO A BLOOD. Rose, 2026-07-31: *"the Blue and Grey skin
 * options are Shade race only (or half-shade)."* Widened 2026-08-06: *"dark grey
 * obsidian and jet black is also shade only skin colors."* Widened again
 * 2026-08-07: *"cambions and cambion half bloods should have demon skin color
 * access too like the reds and yada yada."*
 *
 * These tones are not a palette choice, they are what a Shade or a Cambion IS,
 * so each set is offered to that full race and to a half-blood with one such
 * parent, and to nobody else. Gated the same way horns are, and for the same
 * reason: the blood decides, not the player.
 *
 * ADDITIVE, unlike the eye families: a Shade may wear every ordinary tone AND
 * the shade five. The eye gate is exclusive because a fey eye only reads as fey
 * if a human cannot have one; skin has never worked that way here, and a
 * cambion with an ordinary complexion is not a contradiction.
 */
const BLOODED_TONES = {
    Shade: ["Blue", "Grey", "Dark Grey", "Obsidian", "Jet Black"],
    Cambion: ["Ember", "Vermilion", "Crimson", "Maroon", "Cinder"],
};

/** Every tone that any blood gates, the complement is open to all. */
const GATED_TONES = new Set(Object.values(BLOODED_TONES).flat());

/**
 * The tones a given person may WEAR. `tonesOffered` above is the roll table and
 * is advisory; this is the gate.
 *
 * Note two ethnicity roll tables reach for gated tones. Lunaris lists `Grey`
 * and Exiled Elf lists `Blue`, both Elf lines with no Shade in them. They are
 * filtered here rather than edited out of the data, so the contradiction stays
 * visible and is Rose's to settle rather than mine to quietly rewrite.
 */
export function tonesFor(motherRace, fatherRace) {
    const open = new Set();
    for (const race of [motherRace, fatherRace]) {
        for (const tone of BLOODED_TONES[race] || []) open.add(tone);
    }
    return Object.keys(SKIN_TONES).filter(t => !GATED_TONES.has(t) || open.has(t));
}

/**
 * WHICH EYES A BLOOD MAY WEAR. Rose, 2026-08-07: *"give demon to shade and
 * cambion, fey to elves, normal to human... halfbreeds can get access to
 * whatever their parents have access to."*
 *
 * The same law as SHADE_TONES and as horns, now covering the eye families: the
 * blood decides. It is EXCLUSIVE, not additive, a pure Elf wears fey eyes and
 * a pure Human wears plain ones, which is what makes a fey eye read as fey. A
 * cross takes the UNION of what its two parents may wear, so a half-elf may go
 * either way and a Shade/Elf child may go either uncanny way.
 *
 * Keyed by RACE, and a cross's own race string is "Half-blood", so this is
 * always asked with the two PARENT races, never with the child's (the horn
 * law's trap, and the elf-ears law's).
 */
const RACE_EYES = {
    Human: ["Natural"],
    Elf: ["Fey"],
    Shade: ["Demon"],
    Cambion: ["Demon"],
};

export function eyeFamiliesFor(motherRace, fatherRace) {
    const allowed = new Set([...(RACE_EYES[motherRace] || RACE_EYES.Human),
                             ...(RACE_EYES[fatherRace] || RACE_EYES.Human)]);
    return [...allowed];
}

/**
 * Which subraces this person may be. `who` is the PERSON (pronouns matter), not
 * a gender string: the three cubi names are one subrace chosen by pronoun tone,
 * so exactly one of them is ever on offer and the other two must not be listed.
 * Everything else is open to anyone.
 */
export function ethnicitiesFor(race, who) {
    const mine = cubiNameFor(who && who.pronouns);
    return Object.entries(ETHNICITIES)
        .filter(([k, e]) => e.race === race && (!isCubi(k) || k === mine))
        .map(([k]) => k);
}

/** Both parents' ethnicity modifiers stack. Nothing caps this. */
export function inheritedMods(motherEth, fatherEth) {
    const out = [0, 0, 0, 0, 0, 0];
    for (const key of [motherEth, fatherEth]) {
        const e = ETHNICITIES[key];
        if (!e) continue;
        e.mods.forEach((m, i) => { out[i] += m; });
    }
    return out;
}

/* A SIDED DIAL HOLDS EITHER ONE VALUE OR TWO.
 *
 * Rose, 2026-08-27: *"It should be left eye and right eye, left eyelid and
 * right eyelid... the player should decide whether or not they want symmetry"*.
 *
 * A number means BOTH sides together, which is what symmetry is and what every
 * face saved before today holds. `{l, r}` means the player has broken the pair
 * and is steering each eye on its own. Keeping the number form as the default
 * is the whole reason old records still load: nothing has to be migrated, and
 * a face that never touches the toggle never grows the second field.
 *
 * LEFT IS HERS, NOT THE VIEWER'S. Measured off the mesh rather than assumed:
 * the nose tip and the toes both sit at +Z, so the figure faces +Z, so her own
 * left is +X -- which a viewer sees on their right. `split_eyes.py` bakes the
 * halves under that same reading, so the label and the geometry agree.
 */
export function sideOf(value, side) {
    if (value && typeof value === "object")
        return Number(side === "R" ? value.r : value.l) || 0;
    return Number(value) || 0;
}

/** "EyeWholeSizeL" -> ["EyeWholeSize", "L"], anything else -> [name, null].
    Only a dial the bake actually SPLIT answers with a side, so a future dial
    whose name happens to end in L or R cannot be misread as half of a pair. */
export function dialSide(name) {
    if (name && name.length > 1) {
        const s = name.charAt(name.length - 1);
        if (s === "L" || s === "R") {
            const base = name.slice(0, -1);
            const d = FACE_DIALS[base];
            if (d && d.sided) return [base, s];
        }
    }
    return [name, null];
}

/* BEGIN GENERATED FACE DIALS
   -- regenerate with `python V/tools/bake_shapes.py`, do not
   hand-edit: every field here is the dial's own, and the min/max are
   the MEASURED range within which that dial folds no triangles. */
export const FACE_DIAL_GROUPS = [
    "Head",
    "Face",
    "Brows",
    "Eyes",
    "Nose",
    "Cheeks",
    "Mouth",
    "Jaw",
    "Ears",
];
export const FACE_DIALS = {
    CraniumHeight: { label: "Cranium Height", group: "Head", min: -1.0, max: 1.0 },
    CraniumSize: { label: "Cranium Size", group: "Head", min: -1.0, max: 1.0 },
    CraniumSlope: { label: "Cranium Slope", group: "Head", min: -1.0, max: 1.0 },
    ForeheadUpperThin: { label: "Forehead Upper Thin", group: "Head", min: -1.0, max: 1.0 },
    ForeheadWholeFlat: { label: "Forehead Whole Flat", group: "Head", min: -1.0, max: 1.0 },
    ForeheadWholeRound: { label: "Forehead Whole Round", group: "Head", min: -1.0, max: 1.0 },
    ForeheadWholeThin: { label: "Forehead Whole Thin", group: "Head", min: 0.0, max: 1.0 },
    ForeheadWholeWidth: { label: "Forehead Whole Width", group: "Head", min: -1.0, max: 1.0 },
    SkullAboveEarWidth: { label: "Skull Above Ear Width", group: "Head", min: -1.0, max: 1.0 },
    SkullSize: { label: "Skull Size", group: "Head", min: -1.0, max: 1.0 },
    SkullWidth: { label: "Skull Width", group: "Head", min: -0.9, max: 1.0 },
    FaceAngle: { label: "Face Angle", group: "Face", min: -1.0, max: 1.0 },
    FaceCenterDepth: { label: "Face Center Depth", group: "Face", min: -1.0, max: 1.0 },
    FaceDepth: { label: "Face Depth", group: "Face", min: -1.0, max: 1.0 },
    FaceFlat: { label: "Face Flat", group: "Face", min: -0.3, max: 1.0 },
    FaceHeart: { label: "Face Heart", group: "Face", min: -1.0, max: 1.0 },
    FaceOlder: { label: "Face Older", group: "Face", min: 0.0, max: 0.9 },
    FaceRound: { label: "Face Round", group: "Face", min: -1.0, max: 1.0 },
    FaceSize: { label: "Face Size", group: "Face", min: -1.0, max: 1.0 },
    FaceSquare: { label: "Face Square", group: "Face", min: 0.0, max: 1.0 },
    FaceYoung: { label: "Face Young", group: "Face", min: -1.0, max: 1.0 },
    Nostrils: { label: "Nostrils", group: "Face", min: 0.0, max: 0.1 },
    BrowAboveDepthInner: { label: "Brow Above Depth Inner", group: "Brows", min: -1.0, max: 1.0 },
    BrowAboveDepthOuter: { label: "Brow Above Depth Outer", group: "Brows", min: -1.0, max: 1.0 },
    BrowArchSizeInner: { label: "Brow Arch Size Inner", group: "Brows", min: -1.0, max: 1.0 },
    BrowArchSizeOuter: { label: "Brow Arch Size Outer", group: "Brows", min: -1.0, max: 1.0 },
    BrowSharpen: { label: "Brow Sharpen", group: "Brows", min: -1.0, max: 1.0 },
    BrowSkinSlack: { label: "Brow Skin Slack", group: "Brows", min: 0.0, max: 0.5 },
    BrowTempleNarrow: { label: "Brow Temple Narrow", group: "Brows", min: 0.0, max: 1.0 },
    BrowWholeHeight: { label: "Brow Whole Height", group: "Brows", min: -1.0, max: 1.0 },
    BrowWholeSize: { label: "Brow Whole Size", group: "Brows", min: -1.0, max: 1.0 },
    BrowWholeWidth: { label: "Brow Whole Width", group: "Brows", min: -1.0, max: 1.0 },
    EyeAlmondInner: { label: "Eye Almond Inner", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyeAlmondOuter: { label: "Eye Almond Outer", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyeAngleInner: { label: "Eye Angle Inner", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyeAngleOuter: { label: "Eye Angle Outer", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyeHeightSize: { label: "Eye Height Size", group: "Eyes", min: -0.5, max: 0.7, sided: true },
    EyeInnerHeightSize: { label: "Eye Inner Height Size", group: "Eyes", min: -0.1, max: 0.8, sided: true },
    EyeLacrimalInnerHeight: { label: "Eye Lacrimal Inner Height", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyeLacrimalPinch: { label: "Eye Lacrimal Pinch", group: "Eyes", min: -1.0, max: 0.7, sided: true },
    EyeLacrimalSize: { label: "Eye Lacrimal Size", group: "Eyes", min: -0.7, max: 1.0, sided: true },
    EyeLowerCurveBalance: { label: "Eye Lower Curve Balance", group: "Eyes", min: -0.4, max: 0.4, sided: true },
    EyeLowerCurveHeight: { label: "Eye Lower Curve Height", group: "Eyes", min: -0.3, max: 0.6, sided: true },
    EyeOuterArcDown: { label: "Eye Outer Arc Down", group: "Eyes", min: 0.0, max: 0.7, sided: true },
    EyeSocketInnerDepth: { label: "Eye Socket Inner Depth", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyeSocketLowerDepth: { label: "Eye Socket Lower Depth", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyeSocketPuffyLower: { label: "Eye Socket Puffy Lower", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyeSocketPuffyUpper: { label: "Eye Socket Puffy Upper", group: "Eyes", min: -0.9, max: 1.0, sided: true },
    EyeSocketWholeDepth: { label: "Eye Socket Whole Depth", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyeSwoopUp: { label: "Eye Swoop Up", group: "Eyes", min: 0.0, max: 0.7, sided: true },
    EyeUpperCurveBalance: { label: "Eye Upper Curve Balance", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyeUpperCurveHeight: { label: "Eye Upper Curve Height", group: "Eyes", min: -1.0, max: 0.8, sided: true },
    EyeUpperPeak: { label: "Eye Upper Peak", group: "Eyes", min: 0.0, max: 1.0, sided: true },
    EyeWholeAngle: { label: "Eye Whole Angle", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyeWholeDepth: { label: "Eye Whole Depth", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyeWholeHeight: { label: "Eye Whole Height", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyeWholeSize: { label: "Eye Whole Size", group: "Eyes", min: -0.1, max: 0.3, sided: true },
    EyeWholeWidth: { label: "Eye Whole Width", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyeWidthSize: { label: "Eye Width Size", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyelidAngleLowerOuter: { label: "Eyelid Angle Lower Outer", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyelidAngleUpperOuter: { label: "Eyelid Angle Upper Outer", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyelidCreaseLowerDeepen: { label: "Eyelid Crease Lower Deepen", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyelidCreaseLowerHeight: { label: "Eyelid Crease Lower Height", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyelidCreaseUpperDeepen: { label: "Eyelid Crease Upper Deepen", group: "Eyes", min: -0.6, max: 1.0, sided: true },
    EyelidCreaseUpperHeight: { label: "Eyelid Crease Upper Height", group: "Eyes", min: -0.3, max: 1.0, sided: true },
    EyelidCreaseUpperInnerHeight: { label: "Eyelid Crease Upper Inner Height", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyelidCreaseUpperOuterHeight: { label: "Eyelid Crease Upper Outer Height", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyelidCreaseUpperSmooth: { label: "Eyelid Crease Upper Smooth", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyelidFoldInnerToward: { label: "Eyelid Fold Inner Toward", group: "Eyes", min: -1.0, max: 0.8, sided: true },
    EyelidFoldThickness: { label: "Eyelid Fold Thickness", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    EyelidFoldToward: { label: "Eyelid Fold Toward", group: "Eyes", min: 0.0, max: 0.5, sided: true },
    EyelidThickness: { label: "Eyelid Thickness", group: "Eyes", min: -1.0, max: 1.0, sided: true },
    NoseBaseAngle: { label: "Nose Base Angle", group: "Nose", min: -1.0, max: 1.0 },
    NoseBaseFleshSize: { label: "Nose Base Flesh Size", group: "Nose", min: -1.0, max: 1.0 },
    NoseBaseHeight: { label: "Nose Base Height", group: "Nose", min: -1.0, max: 1.0 },
    NoseBasePinched: { label: "Nose Base Pinched", group: "Nose", min: -1.0, max: 1.0 },
    NoseBaseSize: { label: "Nose Base Size", group: "Nose", min: -1.0, max: 1.0 },
    NoseBridgeBump: { label: "Nose Bridge Bump", group: "Nose", min: -1.0, max: 1.0 },
    NoseBridgeDefinition: { label: "Nose Bridge Definition", group: "Nose", min: 0.0, max: 1.0 },
    NoseBridgeDepth: { label: "Nose Bridge Depth", group: "Nose", min: -1.0, max: 1.0 },
    NoseBridgeLowerSlope: { label: "Nose Bridge Lower Slope", group: "Nose", min: -1.0, max: 1.0 },
    NoseBridgeLowerWidth: { label: "Nose Bridge Lower Width", group: "Nose", min: -1.0, max: 1.0 },
    NoseBridgeSize: { label: "Nose Bridge Size", group: "Nose", min: -1.0, max: 1.0 },
    NoseBridgeSlope: { label: "Nose Bridge Slope", group: "Nose", min: -1.0, max: 1.0 },
    NoseBridgeToCheekDepth: { label: "Nose Bridge To Cheek Depth", group: "Nose", min: 0.0, max: 1.0 },
    NoseBridgeUpperDepth: { label: "Nose Bridge Upper Depth", group: "Nose", min: -1.0, max: 1.0 },
    NoseBridgeUpperHeight: { label: "Nose Bridge Upper Height", group: "Nose", min: -1.0, max: 1.0 },
    NoseBridgeUpperHollow: { label: "Nose Bridge Upper Hollow", group: "Nose", min: -1.0, max: 1.0 },
    NoseBridgeUpperSize: { label: "Nose Bridge Upper Size", group: "Nose", min: -1.0, max: 1.0 },
    NoseBridgeUpperWidth: { label: "Nose Bridge Upper Width", group: "Nose", min: -1.0, max: 1.0 },
    NoseBridgeWidth: { label: "Nose Bridge Width", group: "Nose", min: -1.0, max: 1.0 },
    NoseLarge: { label: "Nose Large", group: "Nose", min: 0.0, max: 0.1 },
    NosePhiltrumAngle: { label: "Nose Philtrum Angle", group: "Nose", min: -1.0, max: 1.0 },
    NosePhiltrumCenterDepth: { label: "Nose Philtrum Center Depth", group: "Nose", min: -1.0, max: 1.0 },
    NosePhiltrumOuterDepth: { label: "Nose Philtrum Outer Depth", group: "Nose", min: -1.0, max: 1.0 },
    NosePhiltrumWidth: { label: "Nose Philtrum Width", group: "Nose", min: -1.0, max: 1.0 },
    NoseSeptumDepth: { label: "Nose Septum Depth", group: "Nose", min: -1.0, max: 1.0 },
    NoseSeptumHeight: { label: "Nose Septum Height", group: "Nose", min: -1.0, max: 1.0 },
    NoseSeptumWidth: { label: "Nose Septum Width", group: "Nose", min: -1.0, max: 1.0 },
    NoseSmall: { label: "Nose Small", group: "Nose", min: 0.0, max: 0.1 },
    NoseTipDepth: { label: "Nose Tip Depth", group: "Nose", min: -1.0, max: 1.0 },
    NoseTipHeight: { label: "Nose Tip Height", group: "Nose", min: -1.0, max: 1.0 },
    NoseTipSeptumContour: { label: "Nose Tip Septum Contour", group: "Nose", min: -1.0, max: 1.0 },
    NoseTipSize: { label: "Nose Tip Size", group: "Nose", min: -1.0, max: 1.0 },
    NoseTipUpturn: { label: "Nose Tip Upturn", group: "Nose", min: -1.0, max: 1.0 },
    NoseTipWidth: { label: "Nose Tip Width", group: "Nose", min: -1.0, max: 1.0 },
    NoseWholeDepth: { label: "Nose Whole Depth", group: "Nose", min: -1.0, max: 1.0 },
    NoseWholeSize: { label: "Nose Whole Size", group: "Nose", min: -1.0, max: 1.0 },
    NoseWholeWidth: { label: "Nose Whole Width", group: "Nose", min: -1.0, max: 1.0 },
    NoseWingDepth: { label: "Nose Wing Depth", group: "Nose", min: -1.0, max: 1.0 },
    NoseWingHeight: { label: "Nose Wing Height", group: "Nose", min: -1.0, max: 1.0 },
    NoseWingLowerHeight: { label: "Nose Wing Lower Height", group: "Nose", min: -1.0, max: 1.0 },
    NoseWingLowerWidth: { label: "Nose Wing Lower Width", group: "Nose", min: -1.0, max: 1.0 },
    NoseWingSize: { label: "Nose Wing Size", group: "Nose", min: -1.0, max: 1.0 },
    NoseWingSizeVertical: { label: "Nose Wing Size Vertical", group: "Nose", min: -1.0, max: 1.0 },
    NoseWingWidth: { label: "Nose Wing Width", group: "Nose", min: -1.0, max: 1.0 },
    CheekCreaseDepth: { label: "Cheek Crease Depth", group: "Cheeks", min: -1.0, max: 1.0 },
    CheekLowerAngular: { label: "Cheek Lower Angular", group: "Cheeks", min: 0.0, max: 1.0 },
    CheekLowerSize: { label: "Cheek Lower Size", group: "Cheeks", min: -1.0, max: 1.0 },
    CheekMiddleDiagonalBisect: { label: "Cheek Middle Diagonal Bisect", group: "Cheeks", min: 0.0, max: 1.0 },
    CheekMiddleRound: { label: "Cheek Middle Round", group: "Cheeks", min: -1.0, max: 1.0 },
    CheekMiddleSize: { label: "Cheek Middle Size", group: "Cheeks", min: -1.0, max: 1.0 },
    CheekNasolabialSizeLower: { label: "Cheek Nasolabial Size Lower", group: "Cheeks", min: -1.0, max: 1.0 },
    CheekNasolabialSizeUpper: { label: "Cheek Nasolabial Size Upper", group: "Cheeks", min: -1.0, max: 1.0 },
    CheekSink: { label: "Cheek Sink", group: "Cheeks", min: 0.0, max: 1.0 },
    CheekSize: { label: "Cheek Size", group: "Cheeks", min: -1.0, max: 1.0 },
    CheekSlack: { label: "Cheek Slack", group: "Cheeks", min: 0.0, max: 1.0 },
    CheekTearTrough: { label: "Cheek Tear Trough", group: "Cheeks", min: -1.0, max: 1.0 },
    CheektoJawSize: { label: "Cheek to Jaw Size", group: "Cheeks", min: -1.0, max: 1.0 },
    CheektoLipDepth: { label: "Cheek to Lip Depth", group: "Cheeks", min: -1.0, max: 1.0 },
    CheekboneSize: { label: "Cheekbone Size", group: "Cheeks", min: -1.0, max: 1.0 },
    CheekboneThin: { label: "Cheekbone Thin", group: "Cheeks", min: -1.0, max: 1.0 },
    CheekboneUpperArchSize: { label: "Cheekbone Upper Arch Size", group: "Cheeks", min: -1.0, max: 1.0 },
    LipBorderCurveUpper: { label: "Lip Border Curve Upper", group: "Mouth", min: -1.0, max: 1.0 },
    LipDepthLower: { label: "Lip Depth Lower", group: "Mouth", min: -1.0, max: 1.0 },
    LipDepthUpper: { label: "Lip Depth Upper", group: "Mouth", min: -1.0, max: 1.0 },
    LipHeart: { label: "Lip Heart", group: "Mouth", min: -1.0, max: 1.0 },
    LipSizeLower: { label: "Lip Size Lower", group: "Mouth", min: -1.0, max: 1.0 },
    LipSizeUpper: { label: "Lip Size Upper", group: "Mouth", min: -1.0, max: 1.0 },
    LipSquare: { label: "Lip Square", group: "Mouth", min: -1.0, max: 1.0 },
    LipThin: { label: "Lip Thin", group: "Mouth", min: -1.0, max: 1.0 },
    LipThinLowerInner: { label: "Lip Thin Lower Inner", group: "Mouth", min: -1.0, max: 1.0 },
    LipThinLowerOuter: { label: "Lip Thin Lower Outer", group: "Mouth", min: -1.0, max: 1.0 },
    LipThinUpperInner: { label: "Lip Thin Upper Inner", group: "Mouth", min: -1.0, max: 1.0 },
    LipThinUpperOuter: { label: "Lip Thin Upper Outer", group: "Mouth", min: -1.0, max: 1.0 },
    LipTopPeak: { label: "Lip Top Peak", group: "Mouth", min: -1.0, max: 1.0 },
    LipWidthLower: { label: "Lip Width Lower", group: "Mouth", min: -0.7, max: 1.0 },
    LipWidthUpper: { label: "Lip Width Upper", group: "Mouth", min: -1.0, max: 1.0 },
    MouthAboveSizeInner: { label: "Mouth Above Size Inner", group: "Mouth", min: -1.0, max: 1.0 },
    MouthAboveSizeOuter: { label: "Mouth Above Size Outer", group: "Mouth", min: -1.0, max: 1.0 },
    MouthApertureCurve: { label: "Mouth Aperture Curve", group: "Mouth", min: -1.0, max: 1.0 },
    MouthApertureCurveUpper: { label: "Mouth Aperture Curve Upper", group: "Mouth", min: -1.0, max: 1.0 },
    MouthBelowHollow: { label: "Mouth Below Hollow", group: "Mouth", min: -1.0, max: 1.0 },
    MouthBelowSizeInner: { label: "Mouth Below Size Inner", group: "Mouth", min: -1.0, max: 1.0 },
    MouthBelowSizeOuter: { label: "Mouth Below Size Outer", group: "Mouth", min: -1.0, max: 1.0 },
    MouthDepth: { label: "Mouth Depth", group: "Mouth", min: -1.0, max: 1.0 },
    MouthHeight: { label: "Mouth Height", group: "Mouth", min: -0.9, max: 1.0 },
    MouthSize: { label: "Mouth Size", group: "Mouth", min: -1.0, max: 1.0 },
    MouthWidth: { label: "Mouth Width", group: "Mouth", min: -1.0, max: 1.0 },
    ChinCleft: { label: "Chin Cleft", group: "Jaw", min: -1.0, max: 1.0 },
    ChinDepth: { label: "Chin Depth", group: "Jaw", min: -1.0, max: 1.0 },
    ChinHeight: { label: "Chin Height", group: "Jaw", min: -1.0, max: 1.0 },
    ChinPoint: { label: "Chin Point", group: "Jaw", min: -1.0, max: 1.0 },
    ChinWidth: { label: "Chin Width", group: "Jaw", min: -1.0, max: 1.0 },
    ChintoLipDepth: { label: "Chin to Lip Depth", group: "Jaw", min: -1.0, max: 1.0 },
    ChintoLipSharpen: { label: "Chin to Lip Sharpen", group: "Jaw", min: 0.0, max: 1.0 },
    JawAngular: { label: "Jaw Angular", group: "Jaw", min: 0.0, max: 1.0 },
    JawMiddleCurve: { label: "Jaw Middle Curve", group: "Jaw", min: -1.0, max: 1.0 },
    JawRearDefine: { label: "Jaw Rear Define", group: "Jaw", min: 0.0, max: 1.0 },
    JawRearHeight: { label: "Jaw Rear Height", group: "Jaw", min: -1.0, max: 1.0 },
    JawRearWidth: { label: "Jaw Rear Width", group: "Jaw", min: -1.0, max: 1.0 },
    JawSlack: { label: "Jaw Slack", group: "Jaw", min: 0.0, max: 1.0 },
    JawWholeHeight: { label: "Jaw Whole Height", group: "Jaw", min: -1.0, max: 1.0 },
    JawWholeSharpen: { label: "Jaw Whole Sharpen", group: "Jaw", min: 0.0, max: 1.0 },
    JawWholeSize: { label: "Jaw Whole Size", group: "Jaw", min: -1.0, max: 1.0 },
    JawWholeWidth: { label: "Jaw Whole Width", group: "Jaw", min: -1.0, max: 1.0 },
    JawtoNeckSlack: { label: "Jaw to Neck Slack", group: "Jaw", min: -1.0, max: 1.0 },
    EarDepth: { label: "Ear Depth", group: "Ears", min: -1.0, max: 1.0 },
    EarElf: { label: "Ear Elf", group: "Ears", min: 0.0, max: 0.6 },
    EarHeight: { label: "Ear Height", group: "Ears", min: -1.0, max: 0.7 },
    EarSizeLower: { label: "Ear Size Lower", group: "Ears", min: -0.1, max: 1.0 },
    EarSizeUpper: { label: "Ear Size Upper", group: "Ears", min: -0.3, max: 0.9 },
    EarlobeAttached: { label: "Earlobe Attached", group: "Ears", min: 0.0, max: 1.0 },
    EarlobeLength: { label: "Earlobe Length", group: "Ears", min: -0.5, max: 0.3 },
    EarlobeSize: { label: "Earlobe Size", group: "Ears", min: -0.9, max: 1.0 },
};
/* END GENERATED FACE DIALS */
