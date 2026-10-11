/* ============================================================================
   THE ENTITY RECORD: ONE SHAPE FOR EVERY BODY (the machine map's step 1, Desktop/Systems/machine-map.md section 2;
   Rose 2026-09-29: "a machine for each flavor", then "approved, start moving the cogs").

   Her character, a seat, a dealt NPC and a summons each carried the same facts in a shape of their own: her creation
   record (a self and a household), a seat's flat forged sheet, a dealt NPC's flat sheet with its scores stored final,
   and loose numbers on the world's bodies and in void.js. Every rule read each shape its own way, through adapters
   (sheet.js seatCreation, asAllocation, levelDraft's creationFor; one copy since step 1's move 24e, sheet.js
   creationOf).

   THIS FILE OWNS THE SHAPE AND NOTHING ELSE: which sections a record has, what a fresh one holds, and how it goes
   into a save and comes back out. It computes nothing. The sheet, a skill's total and a save's bonus are the cogs'
   (src/rules/), and each cog reads and writes the sections it owns (the map names the owner of each).

   DATA ONLY. Where a body stands this frame, its figure, blends and pilot belong to the host that draws it (void.js)
   or places it on the grid (battle.js). `place` keeps only where it was left, for the book.

   THE FIELDS KEEP TODAY'S NAMES. Step 1 moves each field into its section, one section at a time and for every body
   at once, and changes nothing else (agreed with sadia, 2026-09-29, Desktop/V/cog-entity-plan.md). A default below
   that is null means the field is absent on today's records; the move that brings its section confirms it against
   every reader. The cog that owns a section tidies it when that cog moves.

   NO OLD SHAPES (Rose: "Delete all the old shapes. We dont any backwards compatibility as its just needless bloat").
   fromSave reads this format and no other. A book written before it is refused in plain words, never guessed at, and
   no field outside these sections is ever accepted, so an old shape cannot ride along inside a new record.
   Written by Vera.
   ========================================================================== */
import { DIFFICULTY_DEFAULT, STAT_BASE } from "../data/stats.js";
import { DEFAULT_VOICE } from "../data/voices.js";
import { NO_DEITY } from "../data/faith.js";

/** THE RECORD'S FORMAT: what this file's saves carry, and during step 1 the stamp every container of a record carries
    as `recordFormat` (a book, a seat's char file, the forge's draft store, a map NPC's spec, a Blessed Lady export).
    Anything else is refused. Each section move of step 1 raises it by one, so every book written before a move is
    refused after it, with no new code (move 0, agreed with sadia 2026-09-29). Move 1 (skills) raised it to 2, move 2 (magic) to 3, move 2b (one book shape) to 4, move 3 (feats) to 5, move 4 (deeds) to 6, move 5 (abilities) to 7, move 6 (who) to 8, move 7 (pack) to 9, move 8 (body) to 10, move 9 (her figure) to 11, move 10 (the race words) to 12, move 11a (her health) to 13, move 12a (the class) to 14, move 12b (the levels) to 15, move 12c (the god, the domains and the familiar) to 16, move 12d (what a level owes) to 17, move 13a (her place) to 18, move 13b (a seat's place) to 19, move 14 (standing) to 20, move 15 (her keys) to 21, move 16 (traits and flaws) to 22, move 17 (the disguise) to 23, move 18 (her moon's day) to 24, move 20 (a mind's class word, into its classes section) to 25, move 22 (one hit point ceiling, computed: the dealt sheet's and the ledger's kept copies gone) to 26, move 23 (the name, into who) to 27, move 24a (a level's feat slots, into feats) to 28, move 24b (her pages' scratch, off her record) to 29, move 24b2 (her tallies, into deeds) to 30, move 24c (her record whole, checked at the book's two doors) to 31, move 24d (a seat's and a dealt person's records whole, made by makeEntity and checked at the seat file's doors) to 32. */
export const FORMAT = 32;

/** The groups the classifier (src/rules/kinds/, step 2) places a record in. */
export const KINDS = ["person", "boss", "beast", "summon", "object"];

/* EACH SECTION, FRESH EVERY CALL, so no two records ever share an array or an object (two characters made from the
   same defaults must never hold the same satchel). The owner named on each is the cog in the map. */
const FRESH = {
    /* who it is (step 1's move 6), and how it presents and is spoken of (move 9, when her figure became a view of
       her record: state.js selfAsFigure). Its kind is "person" until step 2's classifier places it. Its name (move 23)
       is "" until a page writes it (her Name page, the forge's identity page, the dealer, a map's spec), and every
       reader asks data/who.js nameOf. Its gender and pronouns are absent until an answer writes them (her record's
       die, the forge's identity page, the dealer), and its presentation until a press on her identity page or the
       forge's answer */
    who: () => ({
        name: "",
        kind: "person",
        gender: null,
        pronouns: null,
        presentation: null,
        voice: { ...DEFAULT_VOICE },
        order: "Neutral",
        morality: "Neutral",
        biography: "",
        house: "none",
        houseName: "",
        houseBanner: null,
        /* the disguise (step 1's move 17): the face worn (`guise`), her donning's one roll (`guiseCheck`), the looks
           kept (`closet`), the stolen face's notes (`lookStudies`) and the fallen bodies tried (`lookTries`), each null
           until the disguise writes it (data/disguise.js, world/stolenface.js; void.js wearRec hands this section out) */
        guise: null,
        guiseCheck: null,
        closet: null,
        lookStudies: null,
        lookTries: null,
        /* and a Changeling's horns hidden (Rose 2026-10-07: "Make hiding horns a changeling trait"; rules/sheet.js
           hornsHiddenOf), null (shown) until the face menu writes it (void.js hideHerHorns) */
        hornsHidden: null,
    }),
    /* blood and body (sheet; step 1's move 8). You inherit from blood; the hearth is story (state.js freshCreation).
       Her household came here: her record carries its own two parents, the 0-2 who raised her, and whether the two
       stayed together. And the look it wears, the mirror's record (move 9), absent until the mirror or a forge fills
       it; no record holds an age */
    body: () => ({
        blood: { mother: null, father: null },
        hearth: [],
        together: true,
        appearance: null,
    }),
    /* the ALLOCATION, never the finals: the sheet adds the blood once (step 1's move 5 named it so, sadia's ask:
       `scores` is only ever a computed sheet's). The stats page's dice stay on her record, the page's own scratch */
    abilities: () => ({
        allocation: [STAT_BASE, STAT_BASE, STAT_BASE, STAT_BASE, STAT_BASE, STAT_BASE],
        difficulty: DIFFICULTY_DEFAULT,
    }),
    /* each class and its level, and what a level still owes (classes). Step 1's move 12a brought the first two:
       `path`, the class a character was made in (her record's page IX default, "Fighter", seeded in the open), and
       `classes`, the others a level took after it, null until one does. Move 12b brought the levels: `classLevels`
       (a class's level, written by the rung that took it), `level` (the character level the last rung wrote) and
       `rungs` (one per level past the first, { path, level, hp }), null (read as the first level) until a rung
       writes them. Move 12c brought the god (`deity`, page XII's answer; "None" is a real one, as her record has
       always seeded it), the domains a hand may set (`domains`, null: a cleric's pair is read off the alignment)
       and the familiar (`familiar`, an id, null for none). Move 12d brought what a level still owes: the skill
       points and the ability point not yet spent (`skillPurse`, `bumpPurse`), a class's spell grants not yet
       learned (`spellPurse`), a sorcerer's or bard's open trade (`spellSwap`), and the hit points a raised
       Constitution paid back to the levels past the first (`hpRetro`), all null (nothing owed) */
    classes: () => ({
        path: "Fighter",
        classes: null,
        classLevels: null,
        level: null,
        rungs: null,
        deity: NO_DEITY,
        domains: null,
        familiar: null,
        skillPurse: null,
        bumpPurse: null,
        spellPurse: null,
        spellSwap: null,
        hpRetro: null,
        /* what is left of the day's rage and song, with the day it was written ({ day, rage, music }; rules/dayUses.js,
           Rose 2026-10-01: "Per day, like the SRD"), null for a whole day */
        dayUses: null,
    }),
    /* ranks by the full skill label, and the tongues bought with them (skills); and what the body has recalled that it
       cannot recall twice (S2-4, 2026-10-02: `lore.trollBlood`, read and kept by rules/maneuvers.js trollLoreOf and
       keepTrollLore; the SRD's Knowledge, "Try Again: No"). Here, so every copy of a record carries it: sheet.js
       creationOf takes only the fresh section's keys */
    skills: () => ({ ranks: {}, bonusLanguages: [], lore: {} }),
    /* the feats taken, by display name, and their standing toggles (feats); and which feat filled which of a level's
       slots (step 1's move 24a): `levelFeats`, the general feats a level took, by name (SRD: 3rd, 6th, 9th...), and
       `classFeats`, a class's own bonus feats as { path, name }, null until a level writes them. The slots a level
       owes stay derived from the classes, never stored. And `grants` (MOVE G), the feats a class table gave free, by name
       (a Ranger's Track and Endurance, a Monk's Improved Unarmed Strike), each beside every other feat, null until one is
       given: what the tables give stays derived (data/levelling.js grantsOf), and this marks which taken feats came that
       way, so a feat picked before its grant came earns no second seat. No FORMAT step: fromSave lays an older book's
       section over this one, so it reads null there */
    feats: () => ({ taken: [], toggles: {}, levelFeats: null, classFeats: null, grants: null }),
    /* page V's picks by name (data/traits.js TRAITS and FLAWS), each a list like `conditions` (step 1's move 16: the
       names and places every record already used, made sections). A flaw owes a feat on the feats page, and Feral
       silences (isSilenced) */
    traits: () => [],
    flaws: () => [],
    /* words, the book, and the slots left (sadia's casting); and her moon's gifts of the day (`moonDay`: the waxing
       crescent's free cast and the third quarter's free reroll, with the day they belong to; state.js moonDay; step
       1's move 18), null until a day asks */
    magic: () => ({ words: [], spellbook: null, slots: null, moonDay: null }),
    /* carried, worn and wielded, and the purse (inventory; step 1's move 7). `weapon` is null until one is chosen
       (her record seeds "Unarmed", the forge picks one, a map may name an NPC's); `bought` is the Provisions
       basket, { item: count }; the two grants and the basket are flagged once. The grey damage a body carries is
       health's, and her lead attack is her keys' (mind) */
    pack: () => ({
        weapon: null,
        weaponSize: null,
        /* the rest of each hand's ITEM beside its name (rules/items.js, the weapons cog's 2b): null for a plain one */
        weaponItem: null,
        offhand: null,
        offhandItem: null,
        bought: {},
        satchel: null,
        mounts: null,
        basketPacked: null,
        trinkets: null,
        purse: null,
        toolsGranted: null,
        torchesGranted: null,
    }),
    /* hit points and the grey (step 1's move 11a: hers; a body's with 11b). `hp` is null until the world first sets
       it to her ceiling. `grey` is the world's own grey record, { carried, out, regen, paid, startGrey, minute }:
       the nonlethal she carries, whether it has put her out, and the warmth that heals it; the world binds it by
       reference when it mounts. The cold's hold and the wounds stay the host's until the conditions cog (they are
       not saved today: a found fault); nothing fills temporary hit points, and `out` rides in the grey */
    health: () => ({ hp: null, grey: null, exposure: null, injury: null }),
    /* each condition with its source and time left (conditions and health) */
    conditions: () => [],
    /* its side (`faction`), how it regards each onlooker on the SRD's ladder (`attitudes`, keyed by who: hers is
       `her`), and, in her ledger's copy of a seat, whether it is in her party (`party`). A world body's faction,
       attitude and attitudes are views of it since step 1's move 14 (void.js bindBodyStanding), until sadia's
       standing cog (step 11) reads it here directly */
    standing: () => ({ faction: null, attitudes: null, party: null }),
    /* who is asked for its decisions (`by`, `seat`: null until sadia's asking cog fills them), and her keys (step 1's
       move 15): the bar's four pages (`hotbar`, { pages, page }), the numbers under the Spell Hold and the Word Hold
       (`spellKeys`, `wordKeys`, data/holds.js) and her lead attack (`lead`, the name of the hand her attacks open
       with; move 7 left it to this section, sadia's yes). Only her record carries it so far: a world body's record
       already lives at `m.mind` (void.js), so a body's copy waits for the asking cog, which may name it anew */
    mind: () => ({ by: null, seat: null, hotbar: null, spellKeys: null, wordKeys: null, lead: null }),
    /* where it was left (the host keeps where it is now): the map's key, x and z, and the facing (`yaw`). `y` is null,
       which is the ground at (x, z): nothing stands a body above the ground yet. Her record's is filed by the world
       before every save (step 1's move 13a, world/void.js through save.js beforePages); a seat's is filed the same
       way into her book's ledger, under the character in the seat (move 13b, void.js seatPlaceOf / fileSeatPlace) */
    place: () => ({ map: null, x: null, y: null, z: null, yaw: null }),
    /* experience, and the deeds a seat keeps (step 1's move 4). The blood spot, the hours walked and the deaths are
       the host's live state until her live numbers move (1d), so the section claims none of them. And her lifetime
       counts (`tallies`: locks picked, traps disarmed, pockets picked; world/tallies.js, Rose's "Skyrim's stats"; step
       1's move 24b2), null until a count is made; a seat's ride in its ledger in her book */
    deeds: () => ({ xp: 0, deeds: [], tallies: null }),
};

/** The sections, in the map's order. */
export const SECTIONS = Object.freeze(Object.keys(FRESH));

/** One section as a fresh record holds it. */
export function freshSection(name) {
    const make = FRESH[name];
    if (!make) throw new Error("entity: there is no section called " + JSON.stringify(name));
    return make();
}

const isPlain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const copy = (v) => structuredClone(v);

/* a part laid over a fresh section: the part's fields win, and a field the section does not have is refused, so an
   old shape's field can never be carried in by a maker that still speaks it */
function layOver(name, fresh, part) {
    if (Array.isArray(fresh)) {
        if (!Array.isArray(part)) throw new Error("entity: section " + name + " is a list");
        return copy(part);
    }
    if (!isPlain(part)) throw new Error("entity: section " + name + " is a record");
    for (const k of Object.keys(part))
        if (!(k in fresh)) throw new Error("entity: section " + name + " has no field " + JSON.stringify(k));
    return Object.assign(fresh, copy(part));
}

/**
 * A WHOLE RECORD, every section present, so no reader ever has to ask whether this one has a pack.
 *
 * @param parts  { id, who: {...}, abilities: {...}, ... }: any section given is laid over its fresh default; the
 *               record owns copies of everything handed in, never the caller's own objects
 * @returns      the record
 */
export function makeEntity(parts = {}) {
    if (!isPlain(parts)) throw new Error("entity: makeEntity takes { id, <section>: {...} }");
    for (const k of Object.keys(parts))
        if (k !== "id" && !(k in FRESH)) throw new Error("entity: there is no section called " + JSON.stringify(k));
    const e = { id: parts.id == null ? null : String(parts.id) };
    for (const name of SECTIONS) {
        const fresh = FRESH[name]();
        e[name] = parts[name] === undefined ? fresh : layOver(name, fresh, parts[name]);
    }
    const bad = validate(e);
    if (bad.length) throw new Error("entity: " + bad.join("; "));
    return e;
}

/**
 * WHAT IS WRONG WITH A RECORD, in words; an empty list when nothing is.
 * Checks the shape only: the id, every section present as the kind of thing it is, the kind known, and no field
 * outside the sections (an old shape's `self`, `household` or flat `scores` is named here).
 */
export function validate(e) {
    if (!isPlain(e)) return ["a record is an object"];
    const bad = [];
    if (!(e.id === null || (typeof e.id === "string" && e.id.length > 0)))
        bad.push("the id is a name or null, not " + JSON.stringify(e.id));
    for (const k of Object.keys(e))
        if (k !== "id" && !(k in FRESH)) bad.push("it carries " + JSON.stringify(k) + ", which is no section");
    for (const name of SECTIONS) {
        const wantList = Array.isArray(FRESH[name]());
        const v = e[name];
        if (v === undefined) bad.push("the " + name + " section is missing");
        else if (wantList ? !Array.isArray(v) : !isPlain(v))
            bad.push("the " + name + " section is " + (wantList ? "a list" : "a record") + ", not " + JSON.stringify(v));
    }
    if (isPlain(e.who) && !KINDS.includes(e.who.kind))
        bad.push("its kind is " + JSON.stringify(e.who.kind) + ", which is none of " + KINDS.join(", "));
    return bad;
}

/**
 * THE RECORD AS A BOOK KEEPS IT: plain JSON, with its format. A record that is not whole is never written: the save
 * fails out loud rather than keeping a broken record and reporting success.
 */
export function toSave(e) {
    const bad = validate(e);
    if (!bad.length && !e.id) bad.push("a record is saved under its id, and this one has none");
    if (bad.length) throw new Error("entity: this record cannot be saved: " + bad.join("; "));
    return { format: FORMAT, ...JSON.parse(JSON.stringify(e)) };
}

/**
 * A RECORD BACK FROM A BOOK, or the reason it cannot be, in plain words for the player.
 * Each section is laid over a fresh one, so a field added to a section since the book was written has its default.
 * A book in any other shape is refused: nothing is guessed from it.
 *
 * @returns { entity, why }: the record and null, or null and the reason
 */
export function fromSave(saved) {
    const OLD = "This character was saved before the new character record (2026-09-29) and cannot be loaded. "
        + "Make a new one.";
    if (!isPlain(saved)) return { entity: null, why: "There is no character in this save." };
    if (saved.format !== FORMAT) return { entity: null, why: OLD };
    const { format, ...rest } = saved;
    const bad = validate(rest);
    if (bad.length) return { entity: null, why: "This save's character is damaged (" + bad.join("; ") + ")." };
    try {
        const e = { id: rest.id };
        for (const name of SECTIONS) {
            const fresh = FRESH[name]();
            if (Array.isArray(fresh)) { e[name] = copy(rest[name]); continue; }
            /* a field this format no longer has is dropped by the section's own list, never carried */
            const known = {};
            for (const k of Object.keys(rest[name])) if (k in fresh) known[k] = rest[name][k];
            e[name] = Object.assign(fresh, copy(known));
        }
        return { entity: e, why: null };
    } catch (err) {
        return { entity: null, why: "This save's character could not be read (" + err.message + ")." };
    }
}
