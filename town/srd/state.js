import {
    RACES, ABILITIES, deriveChild, hasHorns, hasElfEars, inheritedMods,
    abilityMod, hpFrom, moveSpeed, hiddenSkills, drFor, nightVisionFor,
    lightBlindFor,
    ETHNICITIES, bloodlinesOf, fortificationFor, hasShadeBlood, hasHumanBlood,
    armorWorn, spentOf, lineOf,
} from "./data/heritage.js";
/* a familiar's gift of hit points (Rose 2026-09-28: "the familiars dont give me the stats") */
import { familiarHp } from "./data/familiars.js";
import { characterLevelOf, classLevelsOf, pathOf, familiarStatedOf, rungHp } from "./rules/classes.js";
import { BASE_CLASSES } from "./data/classes.js";
import { costOf } from "./data/goods.js";
import { weaponsOf, armourOf, shieldProficient, towerProficient } from "./data/proficiency.js";
import { shieldOf } from "./rules/armour.js";
import { SPELL_DIGITS, WORD_DIGITS, digitsOf } from "./data/holds.js";
import { DEFAULT_VOICE } from "./data/voices.js";
import { DIFFICULTY_DEFAULT, ROLLS_MAX } from "./data/stats.js";
import { isSilenced } from "./data/traits.js";
import { toggleOn, featHpOf } from "./rules/feats.js";
import { registerSaver, currentBook } from "./save.js";
/* the record's sections, fresh (src/rules/entity.js; step 1 moves the fields in, one section at a time) */
import { freshSection, makeEntity, SECTIONS } from "./rules/entity.js";
import { hornsHiddenOf } from "./rules/sheet.js";
import { nameOf } from "./data/who.js";

/**
 * THE RECORD: the live answers, in one place, plain and inspectable.
 *
 * Character creation is not a dressing-up screen. Every answer here is a
 * variable the rest of the game reads: dialogue asks whether your mother is
 * alive, whether the pair who made you stayed together, what your father did for
 * a living, which region you come from, whether anyone raised you at all.
 * Treating any of it as cosmetic breaks writing that has not been written yet.
 *
 * TWO RULES THIS FILE EXISTS TO KEEP:
 *   1. Stored once. Anything derivable (your race, your languages, your HP) is
 *      COMPUTED here, never written down beside its inputs, two copies drift,
 *      and the copy the dialogue reads is always the stale one.
 *   2. Nothing is dropped because a screen had no room for it. A biography with
 *      nowhere to display is still recorded.
 */

/** One fresh record, exactly as every new walk begins it. */
function freshCreation() {
    return {
        /**
         * YOU. Page one is about the people who made and raised you, and since step 1's move 8 they ride in
         * your own record, in your body section, not beside you in a household.
         */
        /* HER RECORD, WHOLE (step 1's move 24c): made by entity.js makeEntity, so every section is present, conditions
           too, and no other field is; its id is its book's, filed at the first save (the creation saver, below) */
        self: makeEntity({
            /**
             * BLOOD and HEARTH are separate collections on purpose, not one list
             * with a flag. **You inherit from blood. The hearth is story.**
             *
             * Everything that touches heredity below reads `blood` and cannot
             * see `hearth`, so wiring a guardian into an ability score is not a
             * mistake you can make quietly, it is a mistake you have to reach
             * for. The two who made you carry all of it whether they lived, died,
             * vanished or disowned you; the 0–2 who raised you carry none of it
             * and matter to the writing instead. `together` is only meaningful
             * while neither blood parent has taken a partner. And your look, the
             * mirror's record, filled on page III (step 1's move 9). Your race and
             * ethnicity are NOT chosen: they fall out of the blood, so they are
             * never stored at all, and your figure derives them (selfAsFigure).
             */
            body: freshSection("body"),
            /* THE HEALTH SECTION (step 1's move 11a): her hit points and her grey, which the world reads and writes
               here (world/void.js herLife and `soft`), so her book carries them with her */
            health: freshSection("health"),
            /* THE START IS A THREE-WAY DIE (Rose, 2026-09-01: "can you
               randomize whether the player starts as a female or male?",
               then "he/she/or they... add a nonbinary randomization in
               there so it can be truly random what it initializes as").
               The die seeds what carries a presentation -- the pronoun
               row, the voice folder, and the roll-seed gender -- and page
               II changes any of it freely. On a They start the gender seed
               still flips between the two roll sides: it feeds the first
               appearance roll only, and a They pronoun already takes the
               full sweep there regardless. Lives in this factory so every
               new walk rolls again.
               THE WHO SECTION (step 1's move 6) rides in the die: its voice, its gender and its pronouns from the
               roll (move 9 brought the two in), the rest fresh. Page IV's
               alignment is kept as the two AXES, never the joined name, which is derived and so can never disagree;
               both start Neutral, so the page opens already answered. Page VIII's `house` is the ANSWER KEY ("none"
               | "Noctiluca" | "Asari" | "own"): the printable label and any "houseless" question are DERIVED
               (houseLabel(), houseless()), and a founded house's name and banner are kept when the answer changes,
               so trying another row does not eat the work. Page XIII's name rides in it too (step 1's move 23): what
               they carve or curse, the one answer with no derivation, judged shape:false at the field's blur (a
               half-typed name is not yanked mid-edit) and shape:true at the page GATE. */
            who: (() => {
                const r = Math.random() * 3;
                if (r < 1) return { ...freshSection("who"), gender: "female",
                    pronouns: { subjective: "She", objective: "Her", possessive: "Her" },
                    voice: { ...DEFAULT_VOICE } };
                if (r < 2) return { ...freshSection("who"), gender: "male",
                    pronouns: { subjective: "He", objective: "Him", possessive: "His" },
                    voice: { ...DEFAULT_VOICE, kind: "Male" } };
                return { ...freshSection("who"), gender: Math.random() < 0.5 ? "female" : "male",
                    pronouns: { subjective: "They", objective: "Them", possessive: "Their" },
                    voice: { ...DEFAULT_VOICE, kind: "Andro" } };
            })(),
            /* Page V. Each capped at two. `flaws` is the single biggest source
               of downstream consequence in the walk, every entry owes a feat
               on the Feats page, and `Feral` reshapes four later pages. */
            traits: [],
            flaws: [],
            /* Page VI, THE ABILITIES SECTION (step 1's move 5): `allocation` is what the player spent, base 8
               each, never the finals; ethnicity mods stack on top inside `heritage()`, so there is exactly one
               place that adds them. `difficulty` IS the point budget, and later pages read it (the AI seats forge
               from it). The dice the stats page casts under The Dice Decide are the page's own scratch, kept in
               the pages store below, never on the record (step 1's move 24b). */
            abilities: freshSection("abilities"),
            /* Page IX, THE CLASSES SECTION (step 1's move 12a): `path` is the class, and `classes` the others a
               level takes after it. The original defaulted everyone to Fighter in a CONSTRUCTOR nobody could see
               and gated the choice on the wrong page, here the same default is seeded in the open, in the record,
               where Verify reads it: the section's own fresh default. */
            classes: freshSection("classes"),
            /* THE PACK SECTION (step 1's move 7). Her weapon is seeded "Unarmed": the original only wrote it on
               change, so an untouched walk printed ", " at Verify while the page showed Unarmed. The off hand
               (the gear screen's second door, 09-16) is a one-handed or light weapon's name, or null; the roster
               bakes offhandMove from it. Page XIV's Provisions basket, { item name -> count }, is seeded empty
               so the purse can price it before the page is ever visited. */
            pack: { ...freshSection("pack"), weapon: "Unarmed" },
            /* Page X. `feats` holds DISPLAY NAMES, aimed picks as
               "Base (Target)". `ranks` is keyed by the FULL SKILL LABEL
               ("Move Silently", never a project id), the convention the
               prestige judge and hiddenSkills already speak. Both empty is a
               real answer; the gate, not the seed, enforces the owed feats.
               The purse-refill rule ("change your path and the purse is
               refilled") is enforced EAGERLY in Gear's path click, v1 wiped
               lazily at next render and the stale window was a trap. */
            /* THE FEATS SECTION (step 1's move 3, 2026-09-29): page X's feats as `taken`, and THE FEAT TOGGLES
               (Rose 09-11: "they should be toggles... toggled on so they get automatically declared as long as
               they're toggled"): name -> on, for the feats that are a standing declaration
               (data/featEffects.js TOGGLES). Absent means the toggle's own default. */
            feats: freshSection("feats"),
            /* THE SKILLS SECTION (step 1's move 1, 2026-09-29): page X's ranks, keyed by the FULL SKILL LABEL,
               and the tongues its wits bought on page XII, held together as every body's record holds them */
            skills: freshSection("skills"),
            /* Page XI. Word IDs from data/spells.js, the pick is REAL here
               (v1 exported it to a global nothing read). Wiped for Feral and
               for classes that do not cast at first level. */
            /* ... and page XV's book, the two together as the MAGIC SECTION (step 1's move 2): the words of the day
               and the book, which stays null until a page writes one (bookOfRecord then answers with the class's
               own book) */
            magic: freshSection("magic"),
            /* THE DEEDS SECTION (step 1's move 4): her experience (absent read as none before), and the deeds a seat
               keeps, which hers does not yet */
            deeds: freshSection("deeds"),
            /* THE PLACE SECTION (step 1's move 13a): where she was left, which the world files here before every
               save (world/void.js through save.js beforePages), so her book carries it with her. Fresh, all
               null, until the first save of a world files it */
            place: freshSection("place"),
            /* THE STANDING SECTION (step 1's move 14): her side and how she regards others. Her side is answered by
               the world meanwhile (senses.js worldFaction: she is the party), until the standing cog (sadia's step
               11) reads it here */
            standing: freshSection("standing"),
            /* THE MIND SECTION (step 1's move 15): her keys, the bar and the two holds' numbers (setHotbar, setSpellKeys
               and setWordKeys below), and her lead attack (gear.js, the world's R), so her book carries them with her.
               Who is asked for her decisions stays null until the asking cog (sadia's step 12) */
            mind: freshSection("mind"),
            /* Page XII. `deity` is seeded openly like `path` ("None" is a real
               answer), in the classes section above since step 1's move 12c. Spoken
               tongues are DERIVED, heritage().languages + skills.bonusLanguages at read
               time, never stored as a union: v1 stored it and needed a snapshot dance
               plus a Feral wipe in three places. */
        }),

        /** A sheet read in through the import door, kept whole. */
        importedSheet: null,

        /**
         * WHAT HER PAGES REMEMBER, never her record (step 1's move 24b). The stats page's dice under The Dice
         * Decide: three casts per character, each cast nine totals with the worst three discarded (Rose's law,
         * final form -- data/stats.js carries their words; the book's too-low scrap floor is deliberately struck),
         * and the pool survives leaving the page. `assign[abilityIndex]` is which POOL RANK that ability holds:
         * trades move ranks, not rows, so the arrangement is its own record beside the rolled pool. And which
         * class's tab of the spell book was last open. Reset and restored with the creation, and saved with the
         * book beside her record.
         */
        pages: { dice: { rollsLeft: ROLLS_MAX, pool: null, assign: null }, bookTab: null },
    };
}

export const state = {
    /** Everything creation decides. Steps write here; nothing else does. */
    creation: freshCreation(),
};

/*,,. IS CHARACTER CREATION'S SCREEN UP? (Rose 2026-09-26: a piece's blood "is just only available IN CHARACTER
   CREATION to that race, but -anyone- can wear it") ,,,
   creation.js raises this when its screen mounts and drops it when the screen goes; steps/mirror.js asks it before
   taking a piece off a record for its blood, which is creation's offer and nothing else. Kept off state.creation,
   which a save snapshots whole. */
let creationScreen = false;
export function setCreationScreen(on) { creationScreen = !!on; }
export function creationScreenUp() { return creationScreen; }

/** THE FEAT TOGGLES' ONE DOOR: the record remembers (its feats section), the fight and the hotkey bar read through
    here */
export function setFeatToggle(name, on) {
    const s = state.creation.self;
    /* a trade's number is kept as the number (data/featEffects.js TRADES: Power Attack, Combat Expertise); a switch as
       yes or no */
    s.feats.toggles[name] = typeof on === "number" ? Math.max(0, Math.floor(on)) : !!on;
}
export function featToggled(name) {
    const s = state.creation.self;
    return toggleOn(s && s.feats.toggles, name);
}

/*,,. THE ACTION BAR IS HERS (Rose 2026-09-17: "You may have to add a hotkey addition page to the character
   creation so the player can customize the bar") ,,,
   Four pages of eight slots, arranged at creation and rearranged on the grass, kept on the RECORD (its mind
   section since step 1's move 15) so that it travels with the character instead of with the browser. ui/table.js
   still writes its own localStorage copy for a body with no record behind it (the sandbox, a bench page); a record
   always wins when there is one. */
/*,,. THE FACE SHE IS WEARING (Rose 2026-09-18: "Polymorph allows the player to swap between races
   -cosmetically- and conversationally they are seen as x Race or x Gender") ,,,
   `guise` is what others see, `guiseCheck` is the one Disguise roll every eye is opposed by, both in her record's
   `who` since step 1's move 17 (the SRD makes it
   once per donning, however many people look). Null is her own face. Nothing here rolls; the world does. */
/*,,. WHAT THE MOON GIVES ONCE A DAY (Rose 2026-09-18) ,,,
   Two of his eight boons are daily rather than standing -- the waxing crescent's free cast and the third
   quarter's free reroll -- so they live on the record (its magic section since step 1's move 18) with the day
   they belong to and refresh when the day number moves. `day` is the world clock's own count; nothing here reads
   a clock, the caller hands it in. EVERY LUNARI BODY'S, NOT HERS ALONE (the universal audit's S1, 2026-10-01): the record
   is handed in, hers by default, and a record with no magic section has no gift. */
export function moonDay(dayNumber, gifts, rec) {
    const s = rec || state.creation.self;
    if (!s || !s.magic) return { day: dayNumber, freeCast: 0, reroll: 0 };
    if (!s.magic.moonDay || s.magic.moonDay.day !== dayNumber) {
        s.magic.moonDay = { day: dayNumber, freeCast: (gifts && gifts.freeCast) || 0,
                            reroll: (gifts && gifts.reroll) || 0 };
    }
    return s.magic.moonDay;
}
/** spend one, if there is one; the answer is whether it was there */
export function spendMoonGift(kind, rec) {
    const s = rec || state.creation.self;
    if (!s || !s.magic || !s.magic.moonDay || !(s.magic.moonDay[kind] > 0)) return false;
    s.magic.moonDay[kind] -= 1;
    return true;
}

/* and since 2026-09-28 a disguise's look rides with it (Rose's closet, data/disguise.js): its age, who it impersonates
   and their people, the check's own modifier (an opposed tie goes to the higher, SRD) and the donning's stamp */
export function setGuise(race, gender, check, extra) {
    const s = state.creation.self;
    if (!s) return;
    if (!race && !gender) { s.who.guise = null; s.who.guiseCheck = 0; return; }
    s.who.guise = { ...(extra || {}), race: race || null, gender: gender || null };
    s.who.guiseCheck = check | 0;
}
export function guiseOf() {
    const s = state.creation.self;
    return (s && s.who.guise) || null;
}

export function setHotbar(pages, page) {
    const s = state.creation.self;
    if (!s) return;
    s.mind.hotbar = { pages: (pages || []).map((row) => (row || []).slice()), page: page | 0 };
}
export function hotbarOf() {
    const s = state.creation.self;
    return (s && s.mind.hotbar) || null;
}
/*,,. AND THE NUMBERS UNDER THE TWO HOLDS, BESIDE IT (Rose 2026-09-28: "it didnt allow me to assign my spells (or verse
   words for wizards) to a hotkey number (which is different from hotkey bar)") ,,,
   The Spell Hold's eight (a spell each, for a body that casts by blood) and the Word Hold's nine (a word each, for one
   that speaks the words) are the record's, in its mind section like the bar: chosen on the Hotkeys page before the
   road and in the menu's Hotkeys tab after it, read by world/casting.js when it wakes. data/holds.js holds the rule
   for both rows. */
export function setSpellKeys(list) {
    const s = state.creation.self;
    if (!s) return;
    s.mind.spellKeys = digitsOf(list, SPELL_DIGITS);
}
export function setWordKeys(list) {
    const s = state.creation.self;
    if (!s) return;
    s.mind.wordKeys = digitsOf(list, WORD_DIGITS);
}

/*,,. THE GENDER DIALS ARE TWO, NOT ONE (Rose 08-20: "they are actually
   isolated elements you can be 100% masculine and 50% feminine instead
   you have it as either 100% masculine OR 50% feminine") ,,,
   G9 agrees with her: BodyFeminine and BodyMasculine are independent
   follow keys the old signed slider could never mix. The record now
   carries BOTH -- `morph` is the FEMININE dial (0..1) and `masc` the
   MASCULINE (0..1) -- and every OLD record (signed morph, no masc) is
   read through dialsOf without being touched: its sign folds into the
   pair it always meant.
   `leanOf` is the old signed axis DERIVED (fem - masc), and it is what
   every styling gate, pose gate and couple comparison reads: for every
   record that exists today leanOf equals the number it stored, so no
   saved body styles differently -- while a mixed body finally styles by
   whichever side of it DOMINATES. One owner here, because mirror and
   doll both need it and neither may import the other. */
const clamp01 = (v) => Math.max(0, Math.min(1, v || 0));
export function dialsOf(a) {
    const m = (a && a.morph) || 0;
    if (a && a.masc != null)
        return { fem: clamp01(m), masc: clamp01(a.masc) };
    return { fem: Math.max(0, m), masc: Math.max(0, -m) };   // legacy signed
}
export function leanOf(a) {
    const d = dialsOf(a);
    return d.fem - d.masc;
}
/** Materialize the two dials on a record the sliders are about to bind
    to. Reading never needs this (dialsOf is legacy-aware); WRITING does,
    or a slider would edit a field whose sign still means the old law. */
export function normalizeDials(a) {
    if (!a || a.masc != null) return a;
    const m = a.morph || 0;
    a.masc = Math.max(0, -m);
    a.morph = Math.max(0, m);
    return a;
}

/**
 * NEW GAME BIRTHS A NEW SOUL (Rose, 08-06: her second walk wore the first
 * walk's rolls, the draft survives at module scope for the whole page
 * session, so only the first walk ever rolled fresh). The reset MUTATES IN
 * PLACE: blood.js binds her body, its `blood` and its `hearth` at module
 * scope, so those identities must survive with their contents gutted.
 */
/** THE RECORD COMES BACK WHOLE from a save book (save.js): the same shape it
    was serialised in, laid over a fresh record so a field added since the
    book was written has its default. Never a hand-kept list. */
export function restoreCreation(saved) {
    if (!saved || !saved.self) return;
    const f = freshCreation();
    const c = state.creation;
    /* her body keeps its objects (steps/blood.js holds its blood and hearth), refilled from the book */
    const body = c.self.body, fb = f.self.body, sb = saved.self.body || {};
    for (const k of Object.keys(c.self)) delete c.self[k];
    /* only the record's own keys come back (step 1's move 24c): a book that passed the save's door holds no other */
    const kept = {};
    for (const k of ["id", ...SECTIONS]) if (saved.self[k] !== undefined) kept[k] = saved.self[k];
    Object.assign(c.self, f.self, kept);
    c.self.body = body;
    Object.assign(body.blood, fb.blood, sb.blood || {});
    body.hearth.length = 0;
    for (const p of (sb.hearth || [])) body.hearth.push(p);
    for (const k of Object.keys(fb)) if (k !== "blood" && k !== "hearth") body[k] = sb[k] != null ? sb[k] : fb[k];
    c.importedSheet = null;
    /* her pages' scratch, beside the record (step 1's move 24b): as the book kept it, or fresh */
    c.pages = saved.pages ? JSON.parse(JSON.stringify(saved.pages)) : f.pages;
}
/* the record's own page in the save book: everything creation decided and
   everything the world wrote on her since (the satchel, the purse, the
   toggles), as it stands, plain JSON */
registerSaver("creation", {
    phase: "boot",
    snapshot: () => {
        /* her record takes its book's id the first time it is filed (step 1's move 24c): one character a book */
        const b = currentBook();
        if (!state.creation.self.id && b && b.id) state.creation.self.id = String(b.id);
        return JSON.parse(JSON.stringify(state.creation));
    },
    restore: (c) => restoreCreation(c),
});

export function resetCreation() {
    const f = freshCreation();
    const c = state.creation;
    const body = c.self.body, fb = f.self.body;
    for (const k of Object.keys(c.self)) delete c.self[k];
    Object.assign(c.self, f.self);
    c.self.body = body;
    Object.assign(body.blood, fb.blood);
    body.hearth.length = 0;
    for (const k of Object.keys(fb)) if (k !== "blood" && k !== "hearth") body[k] = fb[k];
    c.importedSheet = null;
    c.pages = f.pages;           // her pages' scratch, fresh (step 1's move 24b): a New Game rolls fresh
}

/** A person as creation records them. Absent answers stay null, never guessed. */
export function makePerson(slot, gender) {
    /* Pronouns are SEEDED, never left null. A null here shows as the dropdown's
       first option while the record holds nothing, the screen says "She/Her"
       and dialogue later reads null. Anyone created without them (a guardian
       added by hand) inherits from their gender and can be changed freely. */
    const seed = gender === "male"
        ? { subjective: "He",   objective: "Him", possessive: "His" }
        : { subjective: "She",  objective: "Her", possessive: "Her" };
    return {
        slot,                    // "father" | "mother" | "guardian"
        gender,                  // seeds ethnicity eligibility and the name pool
        name: "",
        race: "Human",
        standing: "Alive",       // Alive | Missing | Disowned | Dead
        ethnicity: null,
        cls: null,
        occupation: null,
        region: null,
        alignment: null,
        pronouns: seed,
        bloodline: "None",
        racialFeat: "None",
        lifespan: 0,
        ageAtBirth: 0,           // mother slot only; harmless elsewhere
        biography: "",
        partner: "no one",       // guardians only
        appearance: null,        // filled by the mirror, later
    };
}

//--- questions the rest of the game may ask -----------------------------------

const H = () => state.creation.self.body;      // her household, in her body section (move 8)

/** The two who made you. The ONLY thing heredity is allowed to read. */
const blood = () => H().blood;
/** The 0–2 who raised you. Story, never heredity. */
const hearth = () => H().hearth;

export const everyone = () =>
    [H().blood.father, H().blood.mother, ...H().hearth].filter(Boolean);

export const isPresent = (p) => !!p && p.standing === "Alive";
export const living = () => everyone().filter(isPresent);

/* THE DEFAULT BLOOD IS HUMAN (Rose 09-11: "make it so the default race is
   human not -"). A record with no parents on it (the void's own default
   walker, a bench body, anyone who never walked the blood page) used to
   derive as nothing: heritage() null, the sheet's race a dash, the human
   gifts withheld. Now each missing parent stands in as a plain Human with
   no ethnicity and no bloodline, so such a child is Human through and
   through. Creation never meets the stand-in: the blood page fills both
   parents the moment it is visited (steps/blood.js). */
const HUMAN_STAND_IN = Object.freeze({
    race: "Human", ethnicity: null, bloodline: "None", racialFeat: "None", standing: "Alive",
});
const bloodOrHuman = () => {
    const b = blood();
    return { mother: b.mother || HUMAN_STAND_IN, father: b.father || HUMAN_STAND_IN };
};
/** the same, off any creation record rather than the live one */
const bloodOf = (creation) => {
    const b = (creation && creation.self && creation.self.body && creation.self.body.blood) || {};
    return { mother: b.mother || HUMAN_STAND_IN, father: b.father || HUMAN_STAND_IN };
};

/** Standing is irrelevant here: heredity does not care whether they lived. */
export function childRace() {
    const b = bloodOrHuman();
    return deriveChild(b.mother.race, b.father.race);
}

/** Ability modifiers come from ETHNICITY, both blood parents', stacked, uncapped. */
/**
 * What the parents' SUBRACES put on the table, as {subraces, traits, bloodlines}.
 *
 * Read off ETHNICITIES rather than off the parents' rolled picks: a Succubus IS
 * a thing that can carry Masochism and Dream Eater whether or not her own dice
 * came up that way. The rolled picks decide what SHE holds; this decides what
 * the LINE offers her child. Both parents contribute, deduped.
 */
function lineageOf(mother, father) {
    const subraces = [], traits = [], bloodlines = [];
    for (const p of [mother, father]) {
        const e = p && ETHNICITIES[p.ethnicity];
        if (!e) continue;
        if (!subraces.includes(p.ethnicity)) subraces.push(p.ethnicity);
        if (e.trait && !traits.includes(e.trait)) traits.push(e.trait);
        for (const b of bloodlinesOf(p.ethnicity)) {
            if (!bloodlines.includes(b)) bloodlines.push(b);
        }
    }
    return { subraces, traits, bloodlines };
}

/**
 * THE SAME RULE, READ OFF A RECORD (the shelf, 2026-09-16: Continue's plate
 * shows what the rules say of a character whose book is on disc, and the
 * title must not adopt her creation into the live state just to look at her).
 * heritage() below is this on the live creation, unchanged in what it says.
 */
export function heritageOf(creation) {
    const b = bloodOf(creation);
    const c = deriveChild(b.mother.race, b.father.race);
    if (!c) return null;                     // only a race the tables do not know
    const mods = inheritedMods(b.mother.ethnicity, b.father.ethnicity);
    /* Final = the player's ALLOCATION (page VI, base 8) + the blood's mods.
       The allocation lives on `self`; before page VI touches it, it is all 8s
       and this line is exactly what it always was. */
    const alloc = (creation.self.abilities && creation.self.abilities.allocation) || ABILITIES.map(() => 8);
    const scores = ABILITIES.map((_, i) => alloc[i] + mods[i]);
    /* what it wields and bought, for the purse (step 1's move 7): read as a missing pack holds nothing, since every
       caller's creation reaches here, not only hers */
    const pk = creation.self.pack || {};
    /* and what it wears, the mirror's record, in its body section (step 1's move 9); a book with no body wears nothing */
    const look = (creation.self.body || {}).appearance;
    const langs = c.languages || [];
    const known = langs.filter(l => l !== "???");
    /* the hit points the fight builds from (battle/roster.js grantClass reads `hp`), and hpFull below beside them */
    /* its class through pathOf: a creation made up for one question (a seat's tongues) may have no classes section */
    const hpSheet = hpFrom(scores[ABILITIES.indexOf("CON")], pathOf(creation.self))
        + rungHp(creation.self)
        /* and a toad's (data/familiars.js): on the sheet itself, so Verify, the fight and the world all carry it */
        + familiarHp(creation.self);
    return {
        race: c.race,
        pair: c.pair,                       // null when both parents share a race
        blurb: c.blurb,
        traits: c.traits || [],
        /* the human gift, as flags: +1 feat cap and +4 skill purse ride
           the blood without wearing trait names (Rose 08-14) */
        bonusFeat: !!c.bonusFeat,
        bonusSkills: !!c.bonusSkills,
        languages: known,
        languagePicksOwed: langs.length - known.length,
        /* A GRADE now (1 / 0.5 / 0). Asked of the whole PARENT, not just their
           race, because a subrace can carry this one, see nightVisionFor.
           Still truthy at a half, so every `if (nightVision)` gate reads the
           same as it always did. */
        nightVision: nightVisionFor(b.mother, b.father),
        /* the banished line's price for its eyes (SRD Light
           Blindness): full blood only, see lightBlindFor */
        lightBlind: lightBlindFor(b.mother, b.father),
        incorporeal: !!c.incorporeal,
        undead: !!c.undead,
        /* A FLAG, not a grade, asked of the two parent races exactly like
           horns below. Whether, never how much: how far gone a shade looks is
           the player's to set on the mirror. */
        rots: hasShadeBlood(b.mother.race, b.father.race),
        horns: hasHorns(b.mother.race, b.father.race),
        elfEars: hasElfEars(b.mother.race, b.father.race),
        humanBlood: hasHumanBlood(b.mother.race, b.father.race),
        /* Asked of the two PARENTS, whole records, for the same reason horns
           ask the races: a cross's own race string is "Half-blood" and knows
           nothing about which bloods made it. Whole records since 09-16
           because a LINE can carry DR too (the cubi's cold 5), see drFor. */
        dr: drFor(b.mother, b.father),
        /* THE WORN ARMOUR RIDES THE SHEET (her AC attribution, 2026-09-02):
           the same derived sheet feeds the creation readout, the pause menu
           and the battle roster, so the armour lands here once and every
           consumer reads one truth. Null for an unarmoured top. */
        armor: armorWorn(look),
        /* AND THE SHIELD IN THE OFF HAND beside it (IT1a): the AC's other half, its penalties and its spell failure */
        shield: shieldOf(pk.offhand, pk.offhandItem),
        /* THE PURSE (her pricing order, 2026-09-02): the class's Pathfinder
           starting wealth, and what the worn look plus the chosen weapon
           spend of it. The verify gate refuses the seal while spent runs
           past gold; the adornment page whispers what remains.
           CLASS ONLY, and never invented (her fact-check, 2026-09-02:
           "gold is decided by class right? (and background? ... or is
           that 5e" -- verified at the sources: Pathfinder starting
           wealth is "indexed purely by class"; background gear-and-gold
           is 5e's rule, not this game's). `path` is openly seeded
           ("Fighter", v1's own law) so this read is always a real
           class's number; an impossible record reads 0 -- no class, no
           coin, never a pre-given fallback. */
        gold: (BASE_CLASSES[pathOf(creation.self)] || {}).gold || 0,
        /* ONE SUM, TWO TILLS: what is worn (the mirror prices it) plus
           the chosen weapon plus the shop's basket. The Provisions page
           and the wardrobe spend the same coin, so a horse really does
           cost a coat -- and the Verify gate judges the total once. */
        spent: spentOf(look, pk.weapon, pk.weaponSize)
            + costOf(pk.bought),
        /* Percent chance a crit or sneak attack becomes ordinary damage.
           Full undead take neither at all (100); a half-undead gets 50. */
        fortification: fortificationFor(b.mother.race, b.father.race),
        /* From the PARENTS' race and ethnicity grants, not from the child's
           cross, ranks stack where they overlap, and the count that gets shown
           is how many distinct skills appear, never the sum of ranks. */
        hiddenSkills: hiddenSkills(b.mother, b.father),
        /* THE SUBRACE'S OWN SIGNATURE, which nothing surfaced before (Rose,
           08-08: *"the problem here is subraces are being ignored... Succubi
           should get dreameater and masochism... why don't I see those in
           there?"*). Both were in ETHNICITIES all along. Succubus carries
           trait "Masochism" and bloodline "Dream Eater", but `heritage()`
           returned only RACE-level `traits`, so a subrace contributed nothing
           but invisible ability mods and hidden skills. With Cambion's race
           traits now empty, a succubus-blooded character read as having no
           heritage at all. Asked of BOTH parents because that is what the
           child's blood actually offers, de-duplicated, "None" dropped. */
        lineage: lineageOf(b.mother, b.father),
        /*,,. WHAT THE BLOOD GRANTS AS FEATS (and my own dead wiring made
           honest, 08-14: partyFrom spread h.trait/h.bloodline, keys this
           function never returned, so the Succubus's Masochism and Dream
           Eater and every parent's PICKED bloodline -- Troll-kin -- fell
           silently to the floor) ,,,
           The subrace signatures (each parent ethnicity's trait and
           bloodline) plus the bloodlines the parents chose in the dive,
           de-duplicated. AND THE UNDEAD GATE (Rose: "make it so shades
           cant get troll kin... no matter what they get destroyed at 0
           hp"): an undead child cannot carry the living knit, whatever
           its parents were. */
        /*,,. THE BLOOD GRANTS NO FEATS (Rose 2026-09-18: "dont give me free feats you idiot"; "I spent this
           entire system building an inheritance system and you bypass it and give them FREE FEATS behind my
           back breaking what little balancing I'm trying to do?"; "no free bloodline feats period"; "no free
           racial feats either") ,,,
           `bloodFeats` stood here and handed the cross's own traits -- Light Step, Shadowmeld -- to the child
           outright, shown as feats on the card, the sheet, the skills page and in the fight. It was the one
           road that put a feat on a sheet nobody paid for, and it is gone, with every reader.
           WHAT REMAINS IS HIS INHERITANCE SYSTEM, WHOLE: a PARENT selects a racial feat or a bloodline in the
           dive (steps/personDive.js, out of data/heritage.js racialFeatsFor), the child is OFFERED that pick on
           the feats page and spends a slot on it (steps/feats.js racialOffers / bloodlineOffers), and
           reconcile() takes it straight back if the parent who carried it changes.
           `traits` above stays what it always was: the POOL a parent of this race picks FROM. It is not a list
           of things the child owns, and nothing may read it as one.
           (This reverses the 09-17 restore, which was itself on his word -- "Dont decide to take out any of my
           fucking feats" -- and tonight's ruling overrules it.) */
        scores,
        modifiers: scores.map(abilityMod),
        /* THE CLASS DECIDES THE DIE (SRD, level 1: max hit die + CON).
           Without the path this read the Fighter's 10 for everyone. */
        /*,,. AND EVERY RUNG SHE HAS CLIMBED SINCE (Rose 2026-09-20, item 1) ,,,
           hpFrom is the FIRST level and only the first: "maximum hit die plus
           the Constitution modifier". Everything after it is dice she actually
           threw, kept one per level on the record (data/levelling.js takeRung),
           so a multiclass sheet adds up the dice rather than trusting a total
           nobody can check. A record that has never levelled has no rungs and
           this reads exactly what it read yesterday. */
        /*,,. AND THE LEVEL ITSELF, WHICH THE SHEET HAS NEVER CARRIED ,,,
           Rose 2026-09-20, item 1. battle/roster.js makeFighter reads
           sheet.level in two places and battle.js reads actor.level in
           three, and not one of them has ever found anything: the sheet had
           no such field, so every reader quietly fell back to 1. Harmless
           while the game had one level in it and wrong the moment it does
           not -- the revenant rule at battle.js:3828 weighs one level
           against another and has been weighing 1 against 1 all along.
           characterLevelOf, not self.level, because a multiclass record
           keeps its levels per class and the sum is the character. */
        level: characterLevelOf(creation.self),
        /* and the split, so the fight can add a multiclass up per class the
           way the book does rather than reading one level for all of them */
        classLevels: Object.fromEntries(classLevelsOf(creation.self).map((r) => [r.path, r.level])),
        hp: hpSheet,
        /*,,. AND WHAT SHE STANDS UP WITH, HER FEATS INCLUDED (Rose 2026-09-28: "toughness feat doesnt give me +3 hp...
           on the char creation screen") ,,,
           `hp` is what the fight builds from, and the fighter stamps her feats on it (Toughness's +3,
           data/featEffects.js), so `hp` stays without them or the fight would pay them twice. Every page that PRINTS her
           hit points before the road reads this: the same sheet and what her feats add, by the feats' own rows. */
        hpFull: hpSheet + featHpOf(creation.self.feats && creation.self.feats.taken),
        /* the familiar the record keeps, so the fight's builder stamps its gift (battle/roster.js) */
        familiar: familiarStatedOf(creation.self) || null,
        moveSpeed: moveSpeed(b.mother.ethnicity, b.father.ethnicity),
        /* WHAT SHE IS PROFICIENT WITH (Rose 2026-09-23, "rig up the weapons to obey proficiences respecting
           multiclassing"): every class she carries, her line's art, her god's weapon, her feats. The fight
           charges the SRD's -4 off this; the shop and the Gear tab say it. data/proficiency.js owns the rule. */
        /* the record's classes section itself (its classes and its levels, step 1's moves 12a-b) */
        weapons: weaponsOf({ classes: creation.self.classes,
                             feats: creation.self.feats, body: { blood: b } }),
        /* AND WHAT ARMOUR SHE IS TRAINED IN (A9, 2026-10-02): every class she carries and her feats, by the class pages;
           rules/armour.js and data/carry.js charge the SRD's penalty off it on her checks, the fight on her attacks */
        armour: armourOf({ classes: creation.self.classes, feats: creation.self.feats }),
        /* and the shields she is trained in (IT1a; data/proficiency.js, by the class pages and the two feats) */
        shields: { shield: shieldProficient({ classes: creation.self.classes, feats: creation.self.feats }),
                   tower: towerProficient({ classes: creation.self.classes, feats: creation.self.feats }) },
    };
}

/*,,. ONE SHEET A FRAME (Rose 2026-09-29: "this is a shit ton of lag...") ,,,
   The world asks for her sheet many times a frame (her pace and her load in the step, the bar's verse and its casting
   numbers, her eyes, her skills), and every ask built it whole: blood, lineage, hidden skills, hit points, armour,
   purse, proficiencies. Measured in LoH.exe, 4 to 5 percent of every frame, for an answer that cannot change inside
   one. So while the world's frame runs (world/void.js frame() opens the window before the step and closes it after,
   in a finally), the first ask builds the sheet and every later ask in that frame shares the build.
   OUTSIDE A FRAME NOTHING IS KEPT: a click, a key, the creation pages, the level-up screen and the tests all build
   fresh, so a handler that changes her record and reads the sheet again (menu.js reads CON before and after a rise)
   sees the change at once. EACH ASK GETS ITS OWN COPY of the top level, so a field a caller writes on its copy stays
   there (none writes `lines` since SHEET1: sheet.js sheetOf lays them). Keyed by the record itself: a Continue or a new
   creation is another record and builds fresh. Builders that KEEP what they build (her card, her fighter) read fresh
   through src/sheet.js sheetOf, which asks heritageOf every time (world/void.js fallbackSheet). */
let frameOpen = false, frameFor = null, frameSheet = null;
/** the world's frame opens (true) and closes (false) the one-sheet-a-frame window; either way the kept build goes */
export function heritageFrame(open) { frameOpen = !!open; frameFor = null; frameSheet = null; }

/** what the blood and the page make of HER, the live creation */
export function heritage() {
    if (!frameOpen) return heritageOf(state.creation);
    if (frameSheet && frameFor === state.creation) return { ...frameSheet };
    const h = heritageOf(state.creation);
    if (!h) return h;
    frameFor = state.creation;
    frameSheet = h;
    return { ...h };
}

/**
 * The house as it PRINTS, never the answer key. A founded house is its typed
 * name ("an unnamed house" until typed, v1's own wording); the named lines are
 * themselves; no house prints as nothing.
 */
export function houseLabel() {
    const s = state.creation.self.who;
    if (s.house === "none") return "";
    if (s.house === "own") return s.houseName.trim() || "an unnamed house";
    return s.house;
}

/**
 * Every tongue the character SPEAKS, blood plus wit, silenced to nothing by
 * Feral. The one union; readout, Gear's prestige judge and Faith all read it
 * here so it cannot disagree with itself (v1 stored it and wiped it in three
 * places).
 */
export function spokenTongues() {
    return tonguesOf(state.creation);
}

/**
 * THE SAME UNION, ASKED OF ANY RECORD (2026-09-25). The Verse's tongue gate
 * ("Anyone who speaks Kotuq or Emetu can hold its words", Rose) has to be asked
 * of a SEAT as well as of her, and a seat's record is creation-shaped
 * (sheet.js creationOf). One function, so the page, the forge and the world
 * cannot give three answers about who speaks Infernal.
 */
export function tonguesOf(creation) {
    const s = (creation && creation.self) || {};
    if (isSilenced(s.flaws)) return [];
    const h = heritageOf(creation);
    return [...(h ? h.languages : []), ...((s.skills && s.skills.bonusLanguages) || [])];
}

/** True for "no house" AND for a founded house not yet named, v1's rule. */
export const houseless = () =>
    state.creation.self.who.house === "none" ||
    (state.creation.self.who.house === "own" && !state.creation.self.who.houseName.trim());

/**
 * A description of the truth, not a claim that can override it, the shape of
 * the house you actually grew up in.
 */
export function upbringing() {
    const b = blood(), hs = hearth();
    const byBlood = [b.mother, b.father].filter(isPresent).length;
    const byHearth = hs.filter(isPresent).length;
    if (byBlood === 2 && !byHearth) return "blood";
    if (byBlood === 1 && !byHearth) return "single";
    if (byBlood && byHearth) return "step";
    if (!byBlood && byHearth) return "adopted";
    return "alone";
}

/** True once either blood parent has taken someone else, or the player says so. */
function bloodPairSplit() {
    if (hearth().some(g => g.partner === "the mother" || g.partner === "the father")) return true;
    return !H().together;
}

/*,,. HER FIGURE IS A VIEW OF HER RECORD, NEVER THE RECORD (step 1's move 9, 2026-09-30) ,,,
   The dais, the doll, the mirror pages and the world stand her as a PERSON, the shape a parent or a seat's body
   has: its look, its sex and its pronouns flat on it, its race and the blood's marks derived. Until move 9 her figure
   WAS her record, with seven derived fields written onto it on every call, so her book carried copies of what her
   blood decides, and every section move hollowed the look system out (her Riven Hands claws went that way at
   move 3). Now her figure is ONE object, kept for the page's life because the dais keeps figures by identity
   (doll.js show), and rebuilt from her record on every call:
     LIVE, through accessors, so every edit the look system makes lands on her record: `appearance` is her body's,
     `gender`, `pronouns` and `presentation` are her who's. The mirror SEEDS a missing look by assigning
     `person.appearance = {...}` (ensureAppearance), and a copy would drop that seed. Enumerable (sadia's ask), so
     JSON.stringify and a `{...figure}` copy carry them as they carry any person's fields.
     BY VALUE, refreshed each call: the slot, the name, the race the blood makes and the ethnicity whichever
     parent's line shows, the blood's marks, and her feats as a person holds them, a list (her record's own).
   Nothing is written onto her record, so nothing derived can drift from the parents who decide it. */
let herFigure = null;
const FIGURE_LIVE = { appearance: "body", gender: "who", pronouns: "who", presentation: "who" };
/** a figure's fields off a record's self and its sheet (null for blood the tables do not know: a Human figure) */
function figureFields(s, h) {
    /* A half-blood is not any one race, so the body cannot be driven off a race
       string the way a parent's is. The CROSS already decided incorporeality and
       horns, hand those over directly rather than re-deriving them from a name
       that does not exist. */
    return {
        slot: "self",
        name: nameOf(s) || "",
        race: h ? h.race : "Human",
        ethnicity: lineOf(s),
        incorporeal: !!(h && h.incorporeal),
        rots: !!(h && h.rots),
        horned: !!(h && h.horns),
        /* and hidden (Rose 2026-10-07: a Changeling's blood disguises its horns; rules/sheet.js): still horned, not drawn */
        hornsHidden: hornsHiddenOf(s),
        earsPointed: !!(h && h.elfEars),
        humanBlooded: !!(h && h.humanBlood),
        feats: (s.feats && Array.isArray(s.feats.taken)) ? s.feats.taken : [],
    };
}

/** YOU, as a figure the dais can stand up: the one view of her record (above). */
export function selfAsFigure() {
    if (!herFigure) {
        herFigure = {};
        for (const [k, sec] of Object.entries(FIGURE_LIVE))
            Object.defineProperty(herFigure, k, {
                enumerable: true,
                get: () => (state.creation.self[sec] || {})[k],
                set: (v) => { state.creation.self[sec][k] = v; },
            });
    }
    return Object.assign(herFigure, figureFields(state.creation.self, heritage()));
}

/** is this person her figure: the look system's questions that are hers alone (her purse, her blood's heal, the
    dealing hands' armour) ask this, never whether it is her record */
export const isHerFigure = (person) => !!person && person === herFigure;

/* the race a record's blood makes, its two parents' races and the line that shows (data/heritage.js, beside the
   rule they ask), for the readers of a record */
export { raceOf, bloodRacesOf, lineOf } from "./data/heritage.js";

/**
 * THE SAME FIGURE, OFF A RECORD (the shelf, 2026-09-16: a book on disc is
 * stood up for its likeness without adopting it). A plain COPY with her
 * figure's fields, so the book is not written on the way past.
 */
export function figureOf(creation) {
    const s = creation && creation.self;
    if (!s) return null;
    const who = s.who || {};
    return JSON.parse(JSON.stringify({
        ...figureFields(s, heritageOf(creation)),
        appearance: (s.body || {}).appearance,
        gender: who.gender, pronouns: who.pronouns, presentation: who.presentation,
    }));
}

/**
 * HOW THE HOUSEHOLD STANDS. Relationships decide the arrangement, so this is a
 * question about the record, not about rendering, the dais only obeys it.
 *
 * Returns groups in display order, left to right. A group of two is a couple and
 * stands close, turned slightly inward; a group of one faces out. A blood parent
 * who has been replaced stands APART rather than beside the person who replaced
 * them, that is the point of showing this at all.
 */
export function stagingGroups() {
    const b = blood(), hs = hearth().filter(isPresent);
    const groups = [];
    const placed = new Set();
    const take = (p) => { placed.add(p); return p; };

    const partnerOf = (who) => hs.find(g => g.partner === who && !placed.has(g));

    for (const [slot, key] of [[b.mother, "the mother"], [b.father, "the father"]]) {
        if (!isPresent(slot) || placed.has(slot)) continue;
        const mate = partnerOf(key);
        if (mate) groups.push([take(slot), take(mate)]);
    }

    // The pair who made you stand together only if neither took anyone else and
    // the player has not said they parted.
    if (isPresent(b.mother) && isPresent(b.father) &&
        !placed.has(b.mother) && !placed.has(b.father) && !bloodPairSplit()) {
        groups.push([take(b.mother), take(b.father)]);
    }

    const pairedHearth = hs.filter(g => g.partner === "the other here" && !placed.has(g));
    if (pairedHearth.length === 2) groups.push([take(pairedHearth[0]), take(pairedHearth[1])]);

    for (const p of living()) if (!placed.has(p)) groups.push([take(p)]);
    return groups;
}

