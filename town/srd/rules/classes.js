/* ============================================================================
   THE CLASSES COG (the machine map's 4.3, its order's item 10; Rose 2026-10-07: "build the classes and feats cogs";
   Desktop/V/classes-feats-cog-table.md, sadia's check). Every body's classes and levels, asked of its own record: the
   classes it carries and at what levels, the casting questions and, in the moves after this one, the progressions,
   each class's features by its level (rules/classes/<class>.js) and taking a level. It keeps no body's state.
   data/classes.js keeps the TABLE (PREPARES, BASE_CLASSES, PRESTIGE_CLASSES); this module is the rules over it.
   Move C1 brought the rules below out of data/classes.js word for word, their comments with them.
   Move C2 brought what each class gives by its level out of data/levelling.js, word for word: the section at
   the end.
   Move C4 brought taking a level out of data/levelling.js, word for word but for one line: the last section.
   ========================================================================== */
import { freshSection } from "./entity.js";
import { BASE_CLASSES, PREPARES } from "../data/classes.js";
/* the class tables' own feats (MOVE G, grantsAt below): the SRD's Special column, and the pool's names to read it by */
import { srdSpecial, SRD_CLASS_TABLES } from "../data/srdClassTables.js";
import { FEAT_POOL } from "../data/featPool.js";
/* taking a level (move C4): the scores a level is priced by, and the casting tables a rung reads. It imports no
   other cog: the Skills cog asks this one for the points and the ranks' cap, never the reverse */
import { abilityMod, ABILITIES } from "../data/heritage.js";
/* each class's numbers by its own level, one module a class (move C3; the map's 4.3) */
import { sneakDiceAt } from "./classes/rogue.js";
import { ragesPerDay } from "./classes/barbarian.js";
import { musicPerDay } from "./classes/bard.js";
import { monkFtAt } from "./classes/monk.js";
import { slotsAt, topSlotAt, knownAt, BOOK_KIND, castableTopAt } from "../data/spells.js";

/** true when this class picks a hand at each rest; false for a spontaneous
    caster, and false for anyone who casts nothing at all. */
export const preparesSpells = (path) => PREPARES[path] === true;

/*,,. MULTICLASSING IS A THING (Rose, 2026-09-16) ,,,
   "Remember that multiclassing is a thing, so once the player gets a caster
   class it can be unlocked. Sorc/Wiz, Rogue/Sorc/Wiz, etc"
   No page writes a second class yet. When one does, it goes in
   the classes section's list (class names, the primary staying in its `path`), and every
   reader below already looks there, so a Rogue who takes a level of Wizard
   finds the Verse open without anyone editing the gate. Unknown names are
   dropped rather than trusted. */

/*,,. ONE READER OF A CLASS, WHATEVER SHAPE CARRIES IT (step 1's move 12a, 2026-09-30; sadia's suggestion) ,,,
   A record keeps its classes in its classes section, `classes: { path, classes }`: the class it was made in, and
   the list of the others a level took after it. A fighter names its first class `className` and keeps the others
   as a `classes` LIST; a world body's mind keeps the section as every record does (step 1's move 20: it named its
   class `className` before); a view made for one question (the class page's prestige build, battle/roster.js
   classRecordOf, the caster world/casting.js lends the Verse) says `path` beside a list. These three readers are
   the only code that knows the shapes, and every rule below asks them.
   THE SAME-NAME TRAP: a record's `classes` is the section and a fighter's is a list, so a section is an object
   that is not an array, and a list is never read as one. */
/** a record's classes section, or null for any other shape */
export const classesSectionOf = (x) => {
    const c = x && x.classes;
    return c && typeof c === "object" && !Array.isArray(c) ? c : null;
};
/** the first class: the section's, else a view's `path`, a fighter's `className`, the sign's `klass`, a world body's
    mind's section (a body handed in whole); null when none is named */
export const pathOf = (x) => {
    if (!x) return null;
    const sec = classesSectionOf(x);
    return (sec && sec.path) || x.path || x.className || x.klass || (classesSectionOf(x.mind) || {}).path || null;
};
/** the classes taken after the first, by name: the section's list, else a fighter's or a view's; [] when none */
export const extraClassesOf = (x) => {
    const sec = classesSectionOf(x);
    const list = sec ? sec.classes : x && x.classes;
    return Array.isArray(list) ? list.map((p) => (typeof p === "string" ? p : p && p.path)).filter(Boolean) : [];
};
/* AND ITS LEVELS (step 1's move 12b): a record keeps them in the same section, a fighter and a view flat. `level`
   is the SAME-NAME TRAP of this move: the heritage sheet's computed level, a fighter's, xpLine's and every row's
   are not a record's, and a view that spreads a record (menu.js `her`, spellKeys.js `c`) carries none flat. */
/** the levels a record states per class (its section's `classLevels`), else a fighter's or a view's; null when none */
export const classLevelsStatedOf = (x) => {
    const sec = classesSectionOf(x);
    const v = sec ? sec.classLevels : x && x.classLevels;
    return v && typeof v === "object" ? v : null;
};
/** the character level a record states (its section's `level`, the last rung's), else a fighter's or a view's flat
    `level`; null when none. The SRD's character level is characterLevelOf, which reads this */
export const levelStatedOf = (x) => {
    const sec = classesSectionOf(x);
    const v = sec ? sec.level : x && x.level;
    return v == null ? null : v;
};
/** the rungs a record has taken, one per level past the first; [] when none (only a record keeps them) */
export const rungsOf = (x) => {
    const sec = classesSectionOf(x);
    return sec && Array.isArray(sec.rungs) ? sec.rungs : [];
};
/* AND ITS GOD, ITS DOMAINS AND ITS FAMILIAR (step 1's move 12c): a record keeps them in the same section, a fighter
   (roster.js stamps its deity and domains) and a view made for one question (the Verse's caster, a weaponsOf view,
   the familiar view of a sheet) flat. A view that SPREADS a record (menu.js `her`, spellKeys.js `c`) carries none
   flat, so every reader asks these. */
/** the god a record kneels to (its section's `deity`), else a fighter's or a view's; null when none */
export const deityOf = (x) => {
    const sec = classesSectionOf(x);
    const v = sec ? sec.deity : x && x.deity;
    return v == null ? null : v;
};
/** the domains set by hand on a record (its section's `domains`), else a fighter's stamped pair; null when none */
export const domainsStatedOf = (x) => {
    const sec = classesSectionOf(x);
    const v = sec ? sec.domains : x && x.domains;
    return Array.isArray(v) ? v : null;
};
/** the familiar a record keeps (its section's `familiar`, an id), else a view's; null when none */
export const familiarStatedOf = (x) => {
    const sec = classesSectionOf(x);
    const v = sec ? sec.familiar : x && x.familiar;
    return v == null ? null : v;
};
/* AND WHAT A LEVEL STILL OWES (step 1's move 12d): skillPurse, bumpPurse, spellPurse, spellSwap and hpRetro, only ever
   a record's. They are read off classesSectionOf (a record with no section owes nothing) and WRITTEN through
   classesSectionFor (sadia's ask), which makes the section when a record has none, so a write never makes a flat
   field again. */
/** a record's classes section, made from entity.js's fresh one when it has none (its class and its others kept) */
export const classesSectionFor = (x) => {
    if (!x) return null;
    const sec = classesSectionOf(x);
    if (sec) return sec;
    const more = extraClassesOf(x);
    x.classes = { ...freshSection("classes"), path: pathOf(x), classes: more.length ? more : null };
    return x.classes;
};

/** every class this record carries, the primary first, no repeats */
/*,,. A CAPPED CLASS IS THE ONLY CLASS (Rose, 2026-09-20) ,,,
   His words, after I got this wrong once: *"Do you not understand the words 'Savant cannot
   gain exp / cannot level?' Savant is perma level 1 - period. No multiclassing. No leveling.
   Just perma level 1"*.

   WHAT I BUILT THE FIRST TIME WAS A FREEZE, NOT A CAP. `neverAdvances` stopped a Savant taking
   any NEW rung, and left whatever it had already taken standing -- so his own HealTest read
   `path: "Savant", classLevels: { Fighter: 2 }, level: 3` and I kept asking him whether to roll
   it back. That was never an open question; the ruling already answered it. A Savant is level
   one, and a Savant carrying two Fighter levels is not a record to be migrated, it is a record
   that is WRONG and is read correctly here instead.

   SO THE CAP IS ENFORCED AT THE ROOT, in the two functions every other rule reads. Every gate
   downstream -- the hit dice, the attack and save sums, the slots, the feat cap, the skill
   purse, the Rest ladder, the fight's own body -- asks one of these two and now cannot see a
   second class or a second level however the record was written. Nothing needs to migrate a
   save and nothing needs to remember to check. */
const cappedOf = (self) => {
    const paths = [];
    const add = (p) => { if (p && BASE_CLASSES[p] && !paths.includes(p)) paths.push(p); };
    add(pathOf(self));
    add(self && self.className);
    for (const p of extraClassesOf(self)) add(p);
    return paths.find((p) => !!BASE_CLASSES[p].capped) || null;
};

export const classesOf = (self) => {
    /* one capped class in the record means that is the WHOLE record's class list */
    const cap = cappedOf(self);
    if (cap) return [cap];
    const out = [];
    const add = (p) => { if (p && BASE_CLASSES[p] && !out.includes(p)) out.push(p); };
    /* THE PRIMARY FIRST, WHICHEVER NAME IT GOES BY (2026-09-26): a fighter carries it as `className`,
       and once the roster stamps the rest of her classes as `classes` too, the fallback below would
       never run and a Sorcerer/Wizard in a fight would be read as a Wizard alone. pathOf asks every name
       the first class goes by, and extraClassesOf every list of the others (step 1's move 12a) */
    add(pathOf(self));
    for (const p of extraClassesOf(self)) add(p);
    /*,,. A BODY THE WORLD STOOD CARRIES className, NOT path (2026-09-19) ,,,
       Rose, of the whole spellbook and sorcerer pass: *"Is it also rigged into the
       enemies / llm seats / npcs?"* It was not, and this line is why. A creation
       record says `path`; a fighter roster.js stands from a class key says
       `className`, and an NPC whose mind made it keeps it under `mind` (in that
       mind's classes section since step 1's move 20). Every rule
       below reads THIS function -- preparesAny, spontaneousOnly, classRowsOf -- so
       for every body in the game that is not the player, all four answered "carries
       no class at all". Measured: an enemy Sorcerer came back spontaneousOnly=false
       and was judged a preparer, with a Litany of ONE sentence where the player's
       identical build had four.
       battle/verse.js already knew -- `classListOf` there carries this exact
       fallback with a comment explaining it -- so the two readers of one question
       disagreed, which is the same species as the Fighter/Wizard book bug this
       month. One owner now; verse.js's copy defers to this. */
    if (!out.length) add((self && self.className)
        || (classesSectionOf(self && self.mind) || {}).path || null);
    return out;
};
/** the class rows for verseGate: one per class the record carries */
export const classRowsOf = (self) => classesOf(self).map((p) => BASE_CLASSES[p]);
/** does any class this record carries prepare its spells? */
export const preparesAny = (self) => classesOf(self).some(preparesSpells);
/** a caster whose every casting class is spontaneous. The typed line is not
    this body's road (Rose 09-16: "Your magic is instinctive this method
    cannot be used by you"); the hold is (keys.js). A prepared class gained
    later turns this false and unlocks the line. */
export const spontaneousOnly = (self) => {
    const paths = classesOf(self);
    return paths.some((p) => !!BASE_CLASSES[p].casts) && !paths.some(preparesSpells);
};
/*,,. AND A BODY CAN BE BOTH (Rose 2026-09-26: "you know multiclassing exists, right?") ,,,
   A Sorcerer/Wizard prepares through one class and casts by blood through the other, so "is she a
   spontaneous caster" is not the negation of preparesAny. These two answer the spontaneous half on its
   own: whether any class she carries casts without choosing words, and which class that is, so the
   Spell Hold's digits can be judged against the sorcerer's book rather than the wizard's hand. */
/** does any class this record carries cast spontaneously (a Sorcerer, a Bard) */
export const spontaneousAny = (self) =>
    classesOf(self).some((p) => !!BASE_CLASSES[p].casts && !preparesSpells(p));
/** EVERY class this record casts spontaneously through: a Sorcerer/Bard has two (Rose 2026-09-26:
    "remember I can pick more than one multiclass") */
export const bloodPathsOf = (self) =>
    classesOf(self).filter((p) => !!BASE_CLASSES[p].casts && !preparesSpells(p));
/** the first of them, or null */
export const spontaneousPathOf = (self) => bloodPathsOf(self)[0] || null;
/** OF THE CLASSES THAT CAN CAST A SPELL, THE ONE WITH THE HIGHEST CASTING MODIFIER (Rose 2026-09-26: "If
    two classes know the same spell and you have two classes with the same spell prepared/learned it uses
    the highest modifier if it uses modifiers for casting"). `modOf(ability)` answers the body's modifier
    for "INT", "WIS" or "CHA"; a tie keeps the earlier class, which is the order the record names them. */
export const bestCastingPath = (paths, modOf, scores) => {
    let best = null, bestMod = -Infinity;
    for (const p of paths || []) {
        const ab = castingAbilityOf(p, scores);
        if (!ab) continue;
        const m = Number(modOf(ab)) || 0;
        if (m > bestMod) { best = p; bestMod = m; }
    }
    return best;
};

/*,,. A LITTLE FROM COLUMN A, A LITTLE FROM COLUMN B ,,,
   Rose, 2026-09-15: "I believe clerics actually have spontaneous spells as
   well - moreso it's a little from column A a little from column B". Right,
   and I had recorded it as a footnote not worth modelling. SRD, verbatim:

     Cleric -- "can channel stored spell energy into healing spells that the
     cleric did not prepare ahead of time. The cleric can 'lose' any prepared
     spell that is not a domain spell in order to cast any cure spell of the
     same spell level or lower (a cure spell is any spell with 'cure' in its
     name)." An evil cleric converts to inflict instead; one who is neither
     picks once, irreversibly, and that choice also sets turn vs command.

     Druid -- "can 'lose' a prepared spell in order to cast any summon
     nature's ally spell of the same level or lower."

   So they PREPARE, and keep one door open. The door is named here; whether
   anything is behind it is world/casting.js's problem and is answered by the
   spell table, not by a guess.

   THE BOOK DEFINES THE CHANNEL BY NAME -- "any spell with 'cure' in its name"
   -- which is why these are name tests rather than a hand-kept list. A cure
   spell minted next month joins the channel by being called one. */
export const CONVERTS_TO = (path, morality) =>
    path === "Cleric" ? (morality === "Evil" ? "inflict" : "cure")
  : path === "Druid" ? "summon nature"
  : null;

/** Is this spell in that channel? The SRD's own naming test. */
export const inChannel = (channel, name) => {
    if (!channel || !name) return false;
    return String(name).toLowerCase().includes(channel);
};

/*,,. WHICH ABILITY A BODY CASTS ON, and for one class it is a question ,,,
   Every class in the book names its ability outright: a Wizard on INT, a
   Cleric, Druid and Ranger on WIS, a Sorcerer and Bard on CHA. Note that
   spontaneity has NOTHING to do with it -- Rose, 2026-09-19: *"why do you have
   them tied to it at all? Cleric is a fucking wis caster so is ranger and
   druid"*. Right: prepared/spontaneous and the ability are two independent
   facts, and a previous pass had quietly tied them together to justify giving
   the Savant's spontaneous half Wisdom. Its own comment admitted the guess
   ("THE ABILITY FOR THE SPONTANEOUS HALF IS MINE, not his").

   THE SAVANT IS THE EXCEPTION, and his ruling retires the question rather than
   answering it: *"Savant itself can be whatever - whichever its highest stat is
   int, cha, wis will be the cast stat."* One ability for both its halves, and
   it is whichever of the three the body actually carries highest -- which fits
   the class better than any fixed letter, since the Savant is every class at
   once and should cast on whatever it turned out to be good at.

   TIES GO TO THE ORDER INT, CHA, WIS. Something has to break them and silence
   would mean the first row of ABILITIES wins by accident; this is a stated
   rule instead of an emergent one.

   `scores` is the TOTAL (heritageOf: allocation plus blood), because a race's
   free +2 is exactly the kind of thing that decides which of three is highest.
   A caller with no scores to offer gets the class's own letter, or INT for a
   Savant, so nothing ever reads undefined. */
export const SAVANT_ABILITIES = ["INT", "CHA", "WIS"];
const ABIL_ROW = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

/** which ability ONE class casts on. The Basics: "Intelligence for wizards;
    Wisdom for clerics, druids, paladins, and rangers; or Charisma for sorcerers
    and bards" -- so it follows the class and never the character. The Savant is
    the one exception and it is Rose's: whichever of INT/CHA/WIS the body carries
    highest, ties falling INT then CHA then WIS. `scores` is the TOTAL, blood
    included, because a racial +2 is exactly what decides which of three is top. */
export const castingAbilityOf = (path, scores) => {
    const cls = BASE_CLASSES[path];
    if (!cls || !cls.casts) return null;
    if (cls.casts !== "BEST") return cls.casts;
    if (!Array.isArray(scores)) return SAVANT_ABILITIES[0];
    let best = SAVANT_ABILITIES[0], bestN = -Infinity;
    for (const a of SAVANT_ABILITIES) {
        const n = Number(scores[ABIL_ROW.indexOf(a)]) || 0;
        if (n > bestN) { bestN = n; best = a; }
    }
    return best;
};

/*,,. THE SRD'S OWN SHAPE: PER CLASS, SUMMED, NEVER ENUMERATED ,,,
   Rose, 2026-09-19, after watching me reason about "Rogue/Wizard" and
   "Sorc/Wiz" one pair at a time: *"its a level 20 max game and you're slowly
   working through combinations like an idiot... have you ever considered the
   rice chessboard thing?"* He is right, and the book never enumerates either.
   Multiclass Characters, verbatim:

     "As a general rule, the abilities of a multiclass character are the sum of
      the abilities of each of the character's classes."
     "'Character level' is a character's total number of levels... 'Class
      level' is a character's level in a particular class."
     "The character gains spells from all of his or her spellcasting classes
      and keeps a SEPARATE SPELL LIST FOR EACH CLASS."

   And The Basics, on which ability and which level:

     "The ability that governs bonus spells depends on what type of spellcaster
      your character is: Intelligence for wizards; Wisdom for clerics, druids,
      paladins, and rangers; or Charisma for sorcerers and bards. In addition
      to having a high ability score, a spellcaster must be of high enough
      CLASS LEVEL to be able to cast spells of a given spell level."

   So there is no such thing as "the character's casting ability" and no such
   thing as "the character's caster level". A Wizard 2 / Sorcerer 1 is a
   character of level 3 who casts as a Wizard 2 and, separately, as a Sorcerer
   1 -- which is why she cannot scribe a 2nd-level scroll though her character
   level would reach it, and why a high Intelligence showing a 2nd-level bonus
   spell buys her nothing. Multiclassing COSTS caster level; that is the price
   the book charges for it.

   NOTHING BELOW LOOKS AT A COMBINATION. Every function maps over the classes
   the record happens to carry, so a pairing nobody anticipated is not a case
   to handle -- it is two things that already work.

   I DELETED `bestCastingAbility` TO WRITE THIS. It answered "which one stat
   governs this body" by taking the highest-scoring, which let a Wizard dump
   Intelligence to 8, take one level of Sorcerer, and cast the wizard's own
   spellbook off Charisma: 1 Verse became 3. That is not a heuristic slightly
   off, it is the opposite of the rule, and it was invented minutes after he
   warned me that attaching a stat to anything but a class is dangerous. */

/** class level per class: the record's own numbers where it has them, else the
    primary carries the character level and each other class carries one. */
export const classLevelsOf = (self) => {
    const paths = classesOf(self);
    if (!paths.length) return [];
    /* AND ITS LEVEL IS ITS FIRST AND ONLY ONE. `capped` on the class row is the number of
       levels that body ever has; a record claiming more is read down to it rather than
       believed. characterLevelOf sums these rows, so this is also what makes a Savant's
       CHARACTER level 1 no matter what `self.level` was written as. */
    if (paths.length === 1 && BASE_CLASSES[paths[0]].capped)
        return [{ path: paths[0], level: Math.max(1, Math.floor(BASE_CLASSES[paths[0]].capped)) }];
    const stated = classLevelsStatedOf(self);
    const charLevel = Math.max(1, Math.floor(Number(levelStatedOf(self)) || 1));
    const rows = paths.map((p) => ({
        path: p,
        level: stated && stated[p] >= 1 ? Math.floor(stated[p]) : null,
    }));
    const known = rows.filter((r) => r.level).reduce((n, r) => n + r.level, 0);
    for (const r of rows)
        if (!r.level) r.level = r.path === paths[0]
            ? Math.max(1, charLevel - known - (rows.length - 1 - rows.filter((x) => x.level).length))
            : 1;
    return rows;
};

/** the SRD's "character level": the sum of the class levels. */
export const characterLevelOf = (self) =>
    classLevelsOf(self).reduce((n, r) => n + r.level, 0) || 1;

/** one class's own level on a record: its row from classLevelsOf, 0 for a class it does not hold (sadia 2026-10-01, U3: the
    Monk's speed; G1's gifts and U5's Shadowdancer ask it too, one reader) */
export const classLevelOf = (self, name) => {
    const row = classLevelsOf(self).find((r) => r.path === name);
    return row ? row.level : 0;
};

/** every CASTING class this body carries: its own ability and its own class
    level, which is what gates the spell levels it reaches. */
export const castingClassesOf = (self, scores) =>
    classLevelsOf(self)
        .flatMap((r) => (r.path === "Savant" ? savantRows(r, scores)
                                             : [{ ...r, ability: castingAbilityOf(r.path, scores) }]))
        .filter((r) => !!r.ability);

/*,,. THE SAVANT GETS ONE TAB PER CASTING CLASS (Rose 2026-09-19) ,,,
   *"just give savant all of the tabs and name them after their classes."*
   Which is the class doing what it says on the tin -- "able to get access to
   every classes' (in game) traits" -- so its cast list is not one Savant roll
   but a Wizard's, a Sorcerer's, a Cleric's and so on, each with its own list
   and none of them leaking into another.
   ONE ABILITY ACROSS ALL OF THEM, because that is his earlier ruling and it
   does not stop being true here: "whichever its highest stat is int, cha, wis
   will be the cast stat". The tabs are named for the class; the stat is the
   Savant's own.
   ONLY THE CLASSES THAT CAST AT THIS LEVEL, so a level-1 Savant is not handed
   an empty Paladin tab. Read off `castsAt`, never a list typed here, so a
   class minted next month arrives with a tab and no edit. */
const savantRows = (row, scores) => {
    const mine = castingAbilityOf("Savant", scores);
    return Object.entries(BASE_CLASSES)
        .filter(([p, c]) => p !== "Savant" && c.casts && c.castsAt >= 1 && c.castsAt <= row.level)
        .map(([p]) => ({ path: p, level: row.level, ability: mine, via: "Savant" }))
        /* ALPHABETICAL, on his word: "Bard Goes first and Sorcerer goes after
           Ranger". BASE_CLASSES is in render order for the class picker, which
           put Paladin and Ranger at the head of the strip for no reason a
           reader could see. A row of tabs wants an order the eye can predict. */
        .sort((x, y) => x.path.localeCompare(y.path));
};

/*,,. WHEN A CALLER STILL HOLDS ONLY ONE HAND ,,,
   The book is unambiguous -- "keeps a separate spell list for each class" --
   so the endpoint is one hand per casting class. Until the world's hold is
   rebuilt that way, a caller with one hand asks for the PRIMARY casting class:
   the first one the record names, which is the class the character is built
   around.
   THIS IS A PLACEHOLDER AND NOT A RULE, and the difference matters. It cannot
   be gamed the way `bestCastingAbility` could -- dipping a class with a better
   stat does not move your primary, so there is no dump-Intelligence exploit --
   but a Sorcerer 3 / Wizard 1 will hold her one hand on Charisma, and her
   wizard half should have its own on Intelligence. The gap is named here so
   the next reader knows it is owed rather than decided. */
export const primaryCastingClass = (self, scores) => castingClassesOf(self, scores)[0] || null;

/** The row's stat line: `d10 · full BAB · 2 skill pts`, casters at first level
    adding ` · casts on WIS`. Prestige never prints a casts clause. */
export function statLine(c) {
    /* the savant is a d12 that never climbs: say so where the other rows stop at their skill points (Rose 09-17) */
    if (c.capped) return `d${c.hd} · ${c.bab} BAB · ${c.skills} skill pts · every class's first gift · never levels`;
    let s = `d${c.hd} · ${c.bab} BAB · ${c.skills} skill pts`;
    if (c.casts && c.castsAt === 1) s += ` · casts on ${c.casts}`;
    return s;
}

export const babAtLevel1 = (path) =>
    BASE_CLASSES[path] && BASE_CLASSES[path].bab === "full" ? 1 : 0;

/** One requirement line: its display text, and whether this build meets it.
    `build` = { morality, path, feats, ranks, languages }. */
export function judgeLine(line, build) {
    const [kind, a, b] = line;
    switch (kind) {
        case "align":     return { text: `${a} alignment`, met: build.morality === a };
        case "bab":       return { text: `BAB +${a}`, met: babAtLevel1(build.path) >= a };
        case "feat":      return { text: a, met: build.feats.includes(a) };
        case "featCount": return { text: `${a} x${b}`,
            met: build.feats.filter(f => f === a || f.startsWith(`${a} (`)).length >= b };
        case "skill":     return { text: `${a} ${b}`, met: (build.ranks[a] || 0) >= b };
        case "lang":      return { text: `speaks ${a}`, met: build.languages.includes(a) };
        case "classAny":  return { text: `${a.join(" or ")} levels`, met: a.includes(build.path) };
    }
}

/** All of an entry's lines judged, MET FIRST, the original's display order. */
export function entryLines(prestige, build) {
    const lines = prestige.entry.map(l => judgeLine(l, build));
    return [...lines.filter(l => l.met), ...lines.filter(l => !l.met)];
}

/* ============================================================================
   WHAT EACH CLASS GIVES BY ITS LEVEL (move C2, 2026-10-07; the machine map's 4.3): out of data/levelling.js word
   for word, their comments with them, in that file's order: who never advances, a class's own bonus feats and the
   feats its table gives, base attack and base saves, the hit die, the hit points of the levels taken, and the
   classes a level may be taken in.
   ========================================================================== */

/*,,. SOME BODIES DO NOT ADVANCE AT ALL (Rose, 2026-09-20) ,,,
   His ruling, asked and answered the night levels landed: a Savant "never
   advances at all... no XP bar, no rung ever offered, no multiclass." That is
   the strict reading of what data/classes.js has said since 09-17 in his own
   words: "it just cannot level", and `capped` "is the whole of the difference:
   this body does not advance."

   WHY IT ASKS THE WHOLE RECORD AND NOT THE PATH. A body that carries a capped
   class ANYWHERE is frozen, not just one whose `path` is the Savant. That
   matters for the short window tonight when the loose reading was live and a
   Savant could take a Fighter level: such a record exists, it keeps the levels
   it already has, and it gains no more. Freezing it where it stands is the
   honest treatment of a rung that should never have been offered.

   AND IT IS ONE PREDICATE, asked by every reader -- the rung, the list, the
   purse, the Rest page and the world's own spoils -- because the same rule
   written out in five places is five chances for the Savant to quietly start
   levelling again. */
export const neverAdvances = (self) =>
    classesOf(self).some((p) => !!(BASE_CLASSES[p] && BASE_CLASSES[p].capped));

/** which class it is that stops them, for a line the player can read */
export const cappedClassOf = (self) =>
    classesOf(self).find((p) => !!(BASE_CLASSES[p] && BASE_CLASSES[p].capped)) || null;

/*,,. AND A CLASS'S OWN BONUS FEATS, BY ITS OWN LEVEL (v-cli-85, the overnight run, 2026-09-27) ,,,
   The level road paid only the character's feats above (every third level), so a Fighter took his 2nd level and
   was owed nothing: seen live, Kestra (Fighter 2) with no feat to choose. The SRD's class tables, verbatim:
     Fighter  "At 1st level, a fighter gets a bonus combat-oriented feat ... The fighter gains an additional bonus
              feat at 2nd level and every two fighter levels thereafter (4th, 6th, 8th, 10th, 12th, 14th, 16th,
              18th, and 20th). These bonus feats must be drawn from the feats noted as fighter bonus feats."
     Monk     a bonus feat at 1st (Improved Grapple or Stunning Fist), 2nd (Combat Reflexes or Deflect Arrows)
              and 6th (Improved Disarm or Improved Trip)
     Wizard   Scribe Scroll at 1st; "At 5th, 10th, 15th, and 20th level, a wizard gains a bonus feat" (a
              metamagic feat, an item creation feat, or Spell Mastery)
   HOW MANY a class has given through a class level. The 1st-level one of the class a character is made in is the
   creation page's own slot (the forge's "one for your Fighter's own slot"); a class taken later owes its first. */
const CLASS_FEAT_LEVELS = {
    Fighter: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    Monk: [1, 2, 6],
    Wizard: [1, 5, 10, 15, 20],
};
export const classFeatsThrough = (path, classLevel) =>
    (CLASS_FEAT_LEVELS[path] || []).filter((n) => n <= (classLevel || 0)).length;

/*,,. AND THE FEATS A CLASS TABLE GIVES OUTRIGHT, BY ITS OWN LEVEL (MOVE G; Rose 2026-10-03, "Give them";
   Desktop/V/class-grants-table.md) ,,,
   Read off the SRD's own tables (srdClassTables.js), as the level road reads a level since Rose's 2026-09-28 "I can bet
   money the level up doesnt use any of the srd tables". A Special entry that is, WHOLE, the name of a feat in the pool
   is that feat, given at that class level: the Ranger's "Track" at 1st and "Endurance" at 3rd (ranger.htm: "A ranger
   gains Track as a bonus feat.", "A ranger gains Endurance as a bonus feat at 3rd level."), the Wizard's "Scribe Scroll"
   at 1st. Whole and never a part, or the Druid's "Trackless step" would read as Track (sadia's warning). One feature
   names its feat only in its text, and it is the one row here: the Monk's "unarmed strike" (monk.htm, Unarmed Strike:
   "At 1st level, a monk gains Improved Unarmed Strike as a bonus feat."). The class pages read in Chrome 2026-10-06.
   A grant FILLS its class's own seat where the class counts one at that level and its table names no "Bonus feat"
   there: the Wizard's 1st, which CLASS_FEAT_LEVELS above counts and Scribe Scroll is. Every other grant comes free,
   beside every other feat; the record marks it given (feats.grants), so a feat picked before its grant came earns no
   second seat (steps/feats.js givenOf). */
const FEATURE_FEATS = Object.freeze({ "unarmed strike": "Improved Unarmed Strike" });

/** the feats one class's table gives at one class level: [{ feat, seat }], `seat` when it fills the class's own seat */
export function grantsAt(path, classLevel) {
    const special = srdSpecial(path, classLevel);
    const pool = new Map(FEAT_POOL.map((f) => [f.name.toLowerCase(), f.name]));
    const seatHere = classFeatsThrough(path, classLevel) > classFeatsThrough(path, classLevel - 1)
        && !special.some((s) => s.trim().toLowerCase() === "bonus feat");
    const out = [];
    for (const s of special) {
        const k = s.trim().toLowerCase();
        const feat = pool.get(k) || FEATURE_FEATS[k] || null;
        if (feat && !out.some((g) => g.feat === feat)) out.push({ feat, seat: seatHere && !out.some((g) => g.seat) });
    }
    return out;
}

/** the feats a record's classes give, each class through its own level: [{ path, level, feat, seat }]. The Savant takes
    every class's 1st-level ones (data/classes.js everyGift; Rose 2026-09-17: "access to every classes' (in game)
    traits"), as the fight's gifts do; it never advances */
export function grantsOf(self) {
    const rows = self ? classLevelsOf(self) : [];
    const every = rows.some((r) => BASE_CLASSES[r.path] && BASE_CLASSES[r.path].everyGift);
    const reach = every ? Object.keys(SRD_CLASS_TABLES).map((path) => ({ path, level: 1 })) : rows;
    const out = [];
    for (const r of reach)
        for (let n = 1; n <= r.level; n++)
            for (const g of grantsAt(r.path, n))
                if (!out.some((x) => x.feat === g.feat)) out.push({ path: r.path, level: n, ...g });
    return out;
}

/*,,. A CLASS'S CASTER LEVEL (move F5b; SRD, Casting Spells, Caster Level, d20srd.org/srd/magicOverview/castingSpells.htm,
   read in Chrome 2026-10-07: "equal to your class level in the class you're using to cast the spell"; the paladin's and
   the ranger's pages, Spells: "Through 3rd level, a paladin has no caster level. At 4th level and higher, her caster level
   is one-half her paladin level") ,,,
   The table says which class casts, from which level (castsAt) and which at half its level (`casterLevel: "half"`). */
export const casterLevelAt = (path, classLevel) => {
    const c = BASE_CLASSES[path];
    if (!c || !c.casts || !(c.castsAt >= 1) || !(classLevel >= c.castsAt)) return 0;
    return c.casterLevel === "half" ? Math.floor(classLevel / 2) : classLevel;
};

/*,,. A CLASS FEATURE BY ITS TABLE (move F5b; the feats' "wild shape ability", "Ability to turn or rebuke creatures" and
   "Ability to acquire a new familiar") ,,,
   The SRD's class tables name each level's features in their Special column (data/srdClassTables.js srdSpecial). A record
   holds every word of each of its classes through that class's own level; the Savant every class's first (its every gift,
   as grantsOf reads the tables). C3's featuresOf grows out of this. */
export function specialsOf(self) {
    const rows = self ? classLevelsOf(self) : [];
    const every = rows.some((r) => BASE_CLASSES[r.path] && BASE_CLASSES[r.path].everyGift);
    const reach = every ? Object.keys(SRD_CLASS_TABLES).map((path) => ({ path, level: 1 })) : rows;
    const out = [];
    for (const r of reach) for (let n = 1; n <= r.level; n++) out.push(...srdSpecial(r.path, n));
    return out;
}
/** does the record hold a class feature whose table word begins with one of `words`, case-blind ("Wild shape (1/day)"
    begins with "Wild shape") */
export const hasFeature = (self, words) => {
    const want = [].concat(words || []).map((w) => String(w).toLowerCase());
    return specialsOf(self).some((s) => want.some((w) => String(s).toLowerCase().startsWith(w)));
};

/*,,. WHAT EACH CLASS GIVES AT ITS OWN LEVEL (move C3; the map's 4.3: featuresOf, "what each class gives at its level") ,,,
   SRD, Multiclass Characters, Class Features (read in Chrome 2026-10-02): "A multiclass character gets all the class
   features of all his or her classes". Each class the body holds by its own level (classLevelsOf), the Savant every
   class's first (data/classes.js everyGift; Rose 2026-09-17: "access to every classes' (in game) traits"), as grantsOf and
   specialsOf read it. The per-level numbers only, each from its class's module (rules/classes/<class>.js), so the world's
   pace may ask it at every step; the class feats are grantsOf's and the skills' class view is classLevelsOf's. 0, or null,
   for a class the body does not hold. */
export function featuresOf(self) {
    const rows = self ? classLevelsOf(self) : [];
    const every = rows.some((r) => BASE_CLASSES[r.path] && BASE_CLASSES[r.path].everyGift);
    const lv = (path) => (every ? 1 : ((rows.find((r) => r.path === path) || {}).level || 0));
    const rogue = lv("Rogue"), barbarian = lv("Barbarian"), bard = lv("Bard"), monk = lv("Monk");
    return {
        sneakDice: rogue ? sneakDiceAt(rogue) : 0,
        ragesPerDay: barbarian ? ragesPerDay(barbarian) : null,
        rageLevel: barbarian || null,
        musicPerDay: bard ? musicPerDay(bard) : null,
        monkLevel: monk || null,
        monkFt: monk ? monkFtAt(monk) : 0,
        /* Fast Movement, the barbarian's and the savant's (the class table's speedFt): one feature, so the largest of the
           classes held, never a sum (U3's F6) */
        fastMovementFt: Math.max(0, ...rows.map((r) => (BASE_CLASSES[r.path] && BASE_CLASSES[r.path].speedFt) || 0)),
    };
}

/* ------------------------------------------------------------------------
   THE THREE PROGRESSIONS
   ------------------------------------------------------------------------ */

/** base attack bonus for one class at one class level */
export function babFor(progression, classLevel) {
    const L = Math.max(0, Math.floor(classLevel || 0));
    if (progression === "full") return L;
    if (progression === "three-quarter") return Math.floor(L * 3 / 4);
    if (progression === "half") return Math.floor(L / 2);
    return 0;
}

/** base save for one class at one class level */
export const saveFor = (good, classLevel) => {
    const L = Math.max(0, Math.floor(classLevel || 0));
    return good ? 2 + Math.floor(L / 2) : Math.floor(L / 3);
};

/** THE HIT DIE AT ITS MAXIMUM, AT EVERY LEVEL (Rose 2026-09-29: "hit point max every level, everything else srd"),
    never below 1 after the Constitution modifier (SRD, theBasics.htm, Constitution: the modifier applies to each
    roll of a Hit Die). The first level's is data/heritage.js hpFrom's, by the same rule. */
export function hpGain(hd, conMod) {
    return Math.max(1, (hd || 8) + (conMod || 0));
}

/** every hit point past the first level's, from the record's own history */
export const rungHp = (self) =>
    rungsOf(self).reduce((n, r) => n + (Math.max(1, r.hp) || 0), 0)
    /* AND WHAT A RAISED CONSTITUTION ADDS BACK (2026-09-27): each rung keeps the hit points it gave, its Constitution
       bonus of the day inside them, and when an ability point lifts the modifier the book pays every level again,
       so the lift is kept beside the history rather than written into it (menu.js, the ability point) */
    + (Number((classesSectionOf(self) || {}).hpRetro) || 0);

/* the classes a record may take its next rung in: everything it already
   carries, plus every base class, because 3.5 lets anyone multiclass freely
   (the book's only brake is the favoured-class XP penalty, which is not
   modelled here and is flagged in the handoff sheet rather than invented). */
export const rungChoices = (self) => {
    /* and a body that does not advance is offered NOTHING, not even the
       classes it is not: his ruling of 09-20, "no rung ever offered" */
    if (neverAdvances(self)) return [];
    /*,,. A CAPPED CLASS IS NEVER OFFERED, INCLUDING HER OWN ,,,
       This read "unless she already carries it", and the Rest page duly
       offered a Savant another level of Savant -- seen on screen, 2026-09-20.
       data/classes.js says of that row, in his own words, "every class's first
       gift, never levels", and capped means exactly that: there is no second
       rung of Savant to take, whoever is asking. A Savant who earns a level
       therefore multiclasses, which is what his design already implies. */
    const all = Object.keys(BASE_CLASSES);
    return all.filter((p) => !BASE_CLASSES[p].capped);
};

/* ============================================================================
   TAKING A LEVEL (move C4, 2026-10-07; the machine map's 4.3, "Also taking a level"): out of data/levelling.js
   word for word, their comments with them, in that file's order: the top of the table, the ladder and the counts by
   character level, the skill points a level gives and the ranks' cap (columns of the class tables and the level
   table, which the Skills cog asks), what the next level in a class would give, taking it (the hit points and the
   levels written, the skill points, the ability point, a wizard's spells and the sorcerer's or bard's trade banked
   on the record), and the ability point's spend. ONE LINE CHANGED: nextRung asks this cog for the character level
   and the class rows it read off levelling's sheetOf. The ranks' spends went to the Skills cog (rules/skills.js).
   ========================================================================== */

export const MAX_LEVEL = 20;

/* ------------------------------------------------------------------------
   THE LADDER
   ------------------------------------------------------------------------ */

/** experience needed to STAND at each level, index 0 = 1st level. */
export const XP_AT_LEVEL = [
    0, 1000, 3000, 6000, 10000, 15000, 21000, 28000, 36000, 45000,
    55000, 66000, 78000, 91000, 105000, 120000, 136000, 153000, 171000, 190000,
];

/** the character levels at which a feat is gained (SRD: 1st, 3rd, 6th, 9th...) */
export const FEAT_LEVELS = [1, 3, 6, 9, 12, 15, 18];

/** the character levels at which one ability score goes up by one */
export const ABILITY_LEVELS = [4, 8, 12, 16, 20];

/** what standing at this level costs. Above 20 the table stops and so do we. */
export const xpFor = (level) =>
    XP_AT_LEVEL[Math.max(1, Math.min(MAX_LEVEL, Math.floor(level || 1))) - 1];

/** the level this much experience stands at */
export function levelFromXp(xp) {
    const n = Math.max(0, Math.floor(Number(xp) || 0));
    let lvl = 1;
    for (let i = 0; i < XP_AT_LEVEL.length; i++) if (n >= XP_AT_LEVEL[i]) lvl = i + 1;
    return lvl;
}

/** how far to the next rung: { next, need, have, short, ready } */
export function toNextLevel(xp, atLevel) {
    const have = Math.max(0, Math.floor(Number(xp) || 0));
    const at = Math.max(1, Math.floor(atLevel || levelFromXp(have)));
    if (at >= MAX_LEVEL) return { next: null, need: null, have, short: 0, ready: false };
    const need = XP_AT_LEVEL[at];          // the row for level at+1
    return { next: at + 1, need, have, short: Math.max(0, need - have), ready: have >= need };
}

/** how many feats a character of this level has been given in total, and the
    same for ability increases. Both read CHARACTER level, never class level. */
export const featsThrough = (charLevel) =>
    FEAT_LEVELS.filter((n) => n <= (charLevel || 1)).length;
export const bumpsThrough = (charLevel) =>
    ABILITY_LEVELS.filter((n) => n <= (charLevel || 1)).length;

/** does THIS rung hand one over */
export const featAt = (charLevel) => FEAT_LEVELS.includes(charLevel);

export const bumpAt = (charLevel) => ABILITY_LEVELS.includes(charLevel);

/** SRD: (class points + Int modifier) x 4 at 1st level, that many each level
    after, and never fewer than 1 a level. A human's extra is the race's, and
    is passed in rather than guessed at here. */
export function skillPointsFor(path, intMod, classLevel, humanBonus) {
    const row = BASE_CLASSES[path];
    if (!row) return 0;
    /*,,. THE FLOOR COMES BEFORE THE HUMAN'S EXTRA ,,,
       "A character always gets at least 1 skill point per level" is about the
       class-and-Intelligence figure; the human's is an EXTRA laid on top of
       whatever that came to. The order matters only for a class whose points
       and Int sum to nothing, which is a Wizard with Int 6 -- but it matters
       there by a whole point a level, and steps/feats.js derive() has always
       read it this way, so this reads it the same. One rule, two callers. */
    const extra = humanBonus ? 1 : 0;
    const each = Math.max(1, (row.skills || 0) + (intMod || 0)) + extra;
    return classLevel === 1 ? each * 4 : each;
}

/** "The maximum rank for a class skill is 3 + character level", and half that
    for one that is nobody's class skill. The half keeps its ranks: the book
    prints 2 1/2, 3 1/2, and a rank and a half is a real thing you can buy. */
export const maxRank = (charLevel, isClassSkill) => {
    const cap = 3 + Math.max(1, Math.floor(charLevel || 1));
    return isClassSkill ? cap : cap / 2;
};

/**
 * What taking the next level in `path` would GIVE. Nothing is written: this
 * answers the question the level-up screen asks, and the screen applies it.
 *
 * @param self      the creation record
 * @param path      the class this rung is taken in (a new one is a multiclass)
 * @param o.roll    the hit die already rolled, when the caller has one
 * @param o.human   whether the blood pays its extra skill point
 * @returns a description, or { ok: false, why } when the rung cannot be taken
 */
export function nextRung(self, path, o = {}) {
    const row = BASE_CLASSES[path];
    if (!row) return { ok: false, why: `${path} is not a class.` };
    /*,,. A BODY THAT DOES NOT ADVANCE REFUSES HERE, NOT ONLY IN THE LIST ,,,
       `rungChoices` left the Savant out of what the Rest page offers and this
       function went on accepting one, so the UI was the only thing enforcing
       the rule and a seat, a script or the next screen would have walked
       straight through it. world/casting.js setHand says the same of itself,
       in those words: "the refusal lives here, not only in the screen". */
    if (row.capped)
        return { ok: false, why: `${path} does not advance past its first level.` };
    if (neverAdvances(self))
        return { ok: false, why: cappedClassOf(self) + " does not advance, in any class." };

    /* the character level and the class rows, which it read off data/levelling.js sheetOf (the sheet's, which
       stays there): the same two values, asked of this cog (move C4) */
    const before = { charLevel: characterLevelOf(self), classes: classLevelsOf(self) };
    if (before.charLevel >= MAX_LEVEL)
        return { ok: false, why: "Twentieth is the top of the table." };

    const charLevel = before.charLevel + 1;
    const had = before.classes.find((c) => c.path === path);
    const classLevel = (had ? had.level : 0) + 1;
    const fresh = !had;

    /* THE FINAL SCORES (Rose 2026-09-29, "everything else srd"): the Constitution and Intelligence a level is priced
       by are the character's own, the blood's adjustments in them (SRD, races.htm), handed in by the caller that
       knows the blood (o.scores). A bare record's own scores stand in only where no caller says. */
    const scores = Array.isArray(o.scores) ? o.scores : ((self && self.abilities && self.abilities.allocation) || []);
    const conMod = abilityMod(scores[2] != null ? scores[2] : 10);
    const intMod = abilityMod(scores[3] != null ? scores[3] : 10);

    /* the three per-class sums, as a DIFFERENCE: what this one rung adds */
    const good = (s) => (row.saves || []).includes(s);
    const step = (fn, was) => fn - was;
    const babAdd = step(babFor(row.bab, classLevel), babFor(row.bab, classLevel - 1));
    const fortAdd = step(saveFor(good("Fort"), classLevel), saveFor(good("Fort"), classLevel - 1));
    const refAdd = step(saveFor(good("Ref"), classLevel), saveFor(good("Ref"), classLevel - 1));
    const willAdd = step(saveFor(good("Will"), classLevel), saveFor(good("Will"), classLevel - 1));

    /*,,. A NEW CLASS'S FIRST LEVEL IS NOT A CHARACTER'S FIRST ,,,
       SRD multiclassing: the hit points and skill points of a new class's
       first level are that CLASS's first level, so the die is maximised and
       the skill points are quadrupled -- but only for the character's very
       first level. A 5th-level wizard who takes a level of fighter rolls the
       d10; she does not get a maximised one. The book is explicit that the x4
       skill points are "a 1st-level character" benefit, not a new class's. */
    const firstEver = before.charLevel === 0 || (fresh && before.classes.length === 0);
    const hp = hpGain(row.hd, conMod);
    const skill = skillPointsFor(path, intMod, firstEver ? 1 : 2, !!o.human);

    /* what the casting half gains, per class, exactly as the book keeps it */
    const spells = row.casts ? {
        was: slotsAt(path, classLevel - 1),
        now: slotsAt(path, classLevel),
        topWas: topSlotAt(path, classLevel - 1),
        topNow: topSlotAt(path, classLevel),
        knownWas: knownAt(path, classLevel - 1),
        knownNow: knownAt(path, classLevel),
    } : null;

    return {
        ok: true,
        path, fresh, classLevel, charLevel,
        hp, hpDie: row.hd, conMod,
        skillPoints: skill,
        bab: babAdd, fort: fortAdd, ref: refAdd, will: willAdd,
        /* these two are the character's, never the class's */
        feat: featAt(charLevel),
        /* and the class's own, at its own level (classFeatsThrough) */
        classFeat: classFeatsThrough(path, classLevel) > classFeatsThrough(path, classLevel - 1),
        abilityBump: bumpAt(charLevel),
        classSkillRank: maxRank(charLevel, true),
        crossSkillRank: maxRank(charLevel, false),
        spells,
        xpNeeded: xpFor(charLevel),
    };
}

/* ------------------------------------------------------------------------
   TAKING ONE
   ------------------------------------------------------------------------ */

/*,,. THE RUNGS ARE KEPT, NOT SUMMARISED ,,,
   A record could carry one number for hit points and be done with it. It does
   not, because a level is a HISTORY: which class it was taken in and what the
   die said. Keeping the list means the sheet can be rebuilt from the record
   at any time, a bad roll cannot be quietly re-rolled, and a multiclass
   character's hit points are the sum of the dice she actually threw rather
   than a figure nobody can check.
   `self.rungs` holds one entry PER LEVEL PAST THE FIRST. The first level is
   not in it: data/heritage.js hpFrom already owns "maximum hit die plus the
   Constitution modifier", and duplicating that here is how two owners of one
   number start disagreeing. */

/**
 * Take the rung. WRITES to the record, and is the only thing here that does.
 * The mechanical half lands at once (level, class level, hit points); the
 * CHOSEN half -- a feat, an ability point, skill ranks, new spells -- is only
 * flagged, because those are the player's to spend on the pages that already
 * know how to spend them (steps/feats.js derive() now grows its purses with
 * the level, so those pages need no second copy of any rule).
 *
 * @returns the rung that was taken, or { ok: false, why }
 */
export function takeRung(self, path, o = {}) {
    /* THE HUMAN'S POINT (v-cli-85, 2026-09-27): "4 extra skill points at 1st level and 1 extra skill point at each
       additional level" (SRD, Humans). This read `self.human`, which nothing anywhere sets, so no level ever paid
       it, hers or a seat's; the caller that knows the blood says so (o.human), and the old field is gone (step 1's move
       24c) */
    const rung = nextRung(self, path, { scores: o.scores, human: !!o.human });
    if (!rung.ok) return rung;
    /* the levels she climbed before a rung could teach a spell are paid first, off the ledger as it
       stood, so this rung's own grant is not counted twice (seedSpellPurse below) */
    seedSpellPurse(self, o.scores);
    /* the levels and the classes in the classes section (step 1's moves 12a-b); a record with no section (a mind's
       className alone) is given one */
    const more = extraClassesOf(self);
    const sec = classesSectionFor(self);
    sec.level = rung.charLevel;
    sec.classLevels = { ...(sec.classLevels || {}) };
    sec.classLevels[path] = rung.classLevel;
    if (rung.fresh) {
        /* a class taken after the first joins the section's list */
        if (path !== sec.path && !more.includes(path)) more.push(path);
        sec.classes = more;
    }
    /*,,. AND WHAT THE LEVEL OWES IS BANKED, NOT ANNOUNCED (Rose 2026-09-22) ,,,
       *"If it cant deliver it fix it so it can"*, on learning that ranks come only from levelling and
       that levelling could not grant one.

       THIS FUNCTION'S OWN COMMENT SAID THE CHOSEN HALF WAS "only flagged, because those are the player's
       to spend on the pages that already know how to spend them". Half true: the FEAT is genuinely
       handled that way, because steps/feats.js derive() sizes its purse from featsThrough(charLevel) and
       therefore grows on its own. The other two had no such reader. skillPointsFor was computed by
       nextRung, printed by menu.js as "N skill points", and dropped on the floor; the ability point was
       printed as "an ability point" and no page in the game has ever taken one. So a character could
       reach twentieth with the skill ranks it left creation with.

       A PURSE ON THE RECORD, because the grant happens at the rung and the spend happens whenever the
       player opens the page -- possibly several levels later, possibly across a save. It is a COUNT of
       what is owed, never a total of what was granted, so spending draws it down and nothing has to
       remember which level paid for what. */
    sec.rungs = [...rungsOf(self), { path, level: rung.charLevel, hp: rung.hp }];
    sec.skillPurse = Math.max(0, Math.floor(sec.skillPurse || 0)) + Math.max(0, rung.skillPoints || 0);
    if (rung.abilityBump) sec.bumpPurse = Math.max(0, Math.floor(sec.bumpPurse || 0)) + 1;
    /* and the spells a wizard's level owes her, banked beside the skill points for the same reason */
    const grants = bookGrantsFor(path, rung.classLevel, rung.fresh, intModOf(self, o.scores), intScoreOf(self, o.scores));
    if (grants.length) {
        sec.spellPurse = { ...(sec.spellPurse || {}) };
        sec.spellPurse[path] = [...(sec.spellPurse[path] || []), ...grants];
    }
    /*,,. AND THE ONE TRADE A SORCERER'S OR BARD'S LEVEL MAY OPEN (Rose 2026-09-26: "SRD. look it up.") ,,,
       Sorcerer, verbatim: "Upon reaching 4th level, and at every even-numbered sorcerer level after that (6th,
       8th, and so on), a sorcerer can choose to learn a new spell in place of one he already knows ... A
       sorcerer may swap only a single spell at any given level, and must choose whether or not to swap the
       spell at the same time that he gains new spells known for the level." The bard's is the same "Upon
       reaching 5th level, and at every third bard level after that (8th, 11th, and so on)".
       So the chance is banked here and LAPSES at the next rung: the moment that level's new spells are chosen
       is the menu that follows this rung, and a trade left for a later level is one the book never offered.
       What may be traded, and for what, is battle/verse.js swapSpell's. */
    sec.spellSwap = {};
    if (swapAt(path, rung.classLevel)) sec.spellSwap[path] = { classLevel: rung.classLevel };
    return rung;
}

/** does this class level open the SRD's one-spell trade: a sorcerer at 4, 6, 8 ... and a bard at 5, 8, 11 ... */
export const swapAt = (path, classLevel) => {
    const L = Math.floor(classLevel || 0);
    if (path === "Sorcerer") return L >= 4 && L % 2 === 0;
    if (path === "Bard") return L >= 5 && (L - 5) % 3 === 0;
    return false;
};

/* ------------------------------------------------------------------------
   THE SPELLS A RUNG OWES
   ------------------------------------------------------------------------ */

/*,,. WHAT A LEVEL TEACHES, AND WHO CHOOSES IT (Rose 2026-09-26: "what happens when I level and choose
   sorc/wiz?") ,,,
   The SRD, Sorcerer/Wizard, read for this: a wizard "begins play with a spellbook containing all 0-level
   wizard spells ... plus three 1st-level spells of your choice. For each point of Intelligence bonus the
   wizard has, the spellbook holds one additional 1st-level spell of your choice. At each new wizard level,
   she gains two new spells of any spell level or levels that she can cast (based on her new wizard level)
   for her spellbook." A new class's first level is that class's first level (Multiclass Characters), so a
   Fighter who takes Wizard is owed the three and the Intelligence exactly as a new wizard is.

   A SORCERER AND A BARD ARE NOT BANKED HERE. What they know is a table (data/spells.js KNOWN_BY_LEVEL), and
   a table is read, not remembered: battle/verse.js spellsOwed holds it against the book. A wizard's book is
   the one that cannot be read off a table, because it also grows by copying (her creation page promises
   that), so what a level gave her is banked the way the skill points are: a COUNT of what is owed, drawn
   down as she writes.

   EACH GRANT KEEPS ITS OWN CEILING: "any spell level ... that she can cast (based on her new wizard
   level)". Two taken at Wizard 3 may be 2nd-level; two banked at Wizard 2 and spent later may not. `at` is
   a grant for one spell level only (a new wizard's three), `upTo` one for any level from first to that. */
/** the grants ONE rung in a book-keeping class hands over; none for any other class */
export function bookGrantsFor(path, classLevel, fresh, intMod, score) {
    const row = BASE_CLASSES[path];
    if (BOOK_KIND[path] !== "book" || !row || row.capped) return [];
    if (fresh) return [{ at: 1, n: 3 + Math.max(0, Math.floor(+intMod || 0)) }];
    /* "The two free spells must be of spell levels she can cast" (SRD, Arcane Spells): her table at her new
       level AND her Intelligence, which must be 10 + the spell level (data/spells.js castableTopAt). A caller
       without the score gets the table alone. */
    const top = castableTopAt(path, classLevel, score == null ? null : score);
    return top != null && top >= 1 ? [{ upTo: top, n: 2 }] : [];
}

/* the Intelligence score and modifier a wizard's book counts: the TOTAL score when the caller has it (blood
   included, as her creation page counts it), else the record's own */
const intScoreOf = (self, scores) => {
    const s = Array.isArray(scores) ? scores
        : (self && self.abilities && Array.isArray(self.abilities.allocation) ? self.abilities.allocation : null);
    const n = s ? s[ABILITIES.indexOf("INT")] : null;
    return n != null ? +n : null;
};
const intModOf = (self, scores) => {
    const n = intScoreOf(self, scores);
    return abilityMod(n != null ? n : 10);
};

/*,,. AND THE LEVELS TAKEN BEFORE THERE WAS A PURSE ,,,
   Levelling landed on 09-20 and no rung could teach a spell until 09-26, so a wizard who climbed in between
   is owed every grant those rungs should have paid, and nothing she holds was bought with one: her book is
   exactly what creation wrote. So the first time the purse is asked for it is filled from the ledger
   (`rungs`, one entry per level past the first, in the order they were taken, which is how cappedRecord
   walks it too), and after that it only grows by a rung and shrinks by a pick. The empty object is the mark
   that this has run, so it runs once. */
export function seedSpellPurse(self, scores) {
    if (!self) return null;
    const sec = classesSectionFor(self);
    if (sec.spellPurse && typeof sec.spellPurse === "object") return sec.spellPurse;
    const purse = {};
    const intMod = intModOf(self, scores);
    const intScore = intScoreOf(self, scores);
    const born = (classLevelsOf(self)[0] || {}).path || pathOf(self) || null;
    const at = {};
    if (born) at[born] = 1;
    for (const r of rungsOf(self)) {
        if (!r || !r.path) continue;
        const fresh = !at[r.path];
        at[r.path] = (at[r.path] || 0) + 1;
        const g = bookGrantsFor(r.path, at[r.path], fresh, intMod, intScore);
        if (g.length) purse[r.path] = [...(purse[r.path] || []), ...g];
    }
    sec.spellPurse = purse;
    return purse;
}

/** the ability point every fourth level, which no page has ever been able to take */
export function spendBump(self, ability) {
    if (!self) return { ok: false, why: "no record" };
    const i = ABILITIES.indexOf(String(ability || "").toUpperCase());
    if (i < 0) return { ok: false, why: ability + " is not an ability" };
    const sec = classesSectionFor(self);
    const purse = Math.max(0, Math.floor(sec.bumpPurse || 0));
    if (purse < 1) return { ok: false, why: "no ability point to spend" };
    const ab = self.abilities || (self.abilities = { allocation: ABILITIES.map(() => 8), difficulty: null });
    const scores = [...(ab.allocation || ABILITIES.map(() => 8))];
    scores[i] = (+scores[i] || 8) + 1;
    ab.allocation = scores;
    sec.bumpPurse = purse - 1;
    return { ok: true, ability: ABILITIES[i], score: scores[i], left: sec.bumpPurse };
}

/** give the ability point back, for the page that spent it, before the menu closes (refundRank's shape) */
export function refundBump(self, ability) {
    if (!self) return { ok: false, why: "no record" };
    const i = ABILITIES.indexOf(String(ability || "").toUpperCase());
    if (i < 0) return { ok: false, why: ability + " is not an ability" };
    const ab = self.abilities || (self.abilities = { allocation: ABILITIES.map(() => 8), difficulty: null });
    const scores = [...(ab.allocation || ABILITIES.map(() => 8))];
    scores[i] = (+scores[i] || 8) - 1;
    ab.allocation = scores;
    const sec = classesSectionFor(self);
    sec.bumpPurse = Math.max(0, Math.floor(sec.bumpPurse || 0)) + 1;
    return { ok: true, ability: ABILITIES[i], score: scores[i], left: sec.bumpPurse };
}
