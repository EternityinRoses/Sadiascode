/* ============================================================================
   THE FEATS COG (the machine map's 4.4, its order's item 10; Rose 2026-10-07: "build the classes and feats cogs";
   Desktop/V/classes-feats-cog-table.md "F1, the Feats cog stands", sadia's check). Every body's feats, asked of its
   own record: the cap and the purse a record may hold (derive), the prerequisite gate (meetsReq, visible) and what
   a record may take (offerableFeats), the blood's offers, the feats a class table gives (classGrantsOf,
   freeGrantsOf, givenOf), the healer that brings a record back inside its rules (reconcile), and what a feat may be
   aimed at (choicesOf). The creation page, the level-up screen, the forge, the dealer and the world all ask
   here; none of them loads the page for it any more. It keeps no body's state.
   Move F1b brought these out of src/steps/feats.js word for word, their comments with them; the ones the page
   draws with are exported, the only change in their text. Move F1a brought featEffects' readers in, word for word:
   the section at the end. Move F5a made a feat's aims one list for every picker (choicesOf), read off the record that
   takes the feat. Move S7a brought in the fills of the attack cog's two slots, the roll's and the damage's (the last
   section). Still to come: one feat table (F2), the rest of the fight's hooks (F3). derive's skill purse waits for the
   Skills cog's next move.
   ========================================================================== */
import { heritageOf } from "../state.js";
import { BASE_CLASSES } from "../data/classes.js";
import { babAtLevel1, characterLevelOf, classLevelsOf, classLevelOf, classFeatsThrough, grantsOf, featsThrough, maxRank,
         casterLevelAt, hasFeature } from "./classes.js";
import { weaponsOf, armourOf, proficientWith, shieldProficient, towerProficient } from "../data/proficiency.js";
/* the SRD's weapons by kind, for a proficiency feat's aims (move F5b) */
import { WEAPON_TABLE } from "../data/weaponTable.js";
import { sheetOf } from "../data/levelling.js";
import { SAVANT } from "../data/heritage.js";
import { SKILLS, CLASS_SKILLS, FEAT_POOL, WEAPON_CATALOG, SCHOOLS } from "../data/featPool.js";
import { bonusFeatsOwed, isSilenced } from "../data/traits.js";
import { unanswered } from "../data/faith.js";
import { textOf } from "../config/text.js";   // the confirmation term's word (move F6a)
import { shadowJumpFtAt } from "./classes/shadowdancer.js";   // a Shadowdancer's well, asked by the shadow step's gate (move R6)
/* the feat-effect tables the readers below read (move F1a: the rows stay data) */
import { SKILL_FEATS, CHA_SKILLS, NIGHT_OWL_SKILLS, TOGGLES, META_ORDER, FEAT_EFFECTS } from "../data/featEffects.js";
/* the attack's two slots, filled at this file's end (move S7a): the reach a fellow stands within of the target (the weapons
   cog's numbers); the moon's plain word, where its trait names none, comes through textOf, imported above */
import { ADJACENT_FT, REACH_SLACK_FT } from "./weapons.js";

/*,,. WHAT A FEAT MAY BE AIMED AT, ONE LIST FOR EVERY BODY (move F5a; Rose 2026-10-06: "Feats and such are to be able to
   be accessed by all character (Player, enemy, npc, llm pc, allies, etc)") ,,,
   A feat with `choose` is taken as `Base (Aim)`. Its aims were drawn three ways: her creation page asked her own natural
   weapons and kept Speak Language from a silenced body, the level-up screen asked the draft's naturals and offered
   every skill, and a seat's road offered a fixed four naturals whatever its body had. One list now, read off the
   record that takes the feat:
     "natural"  what a body may aim Improved Natural Attack at: only the weapons its own blood and its own Riven picks
                grant (Gore for its own blood's horns, read off the record, never off the player's heritage); a body with
                none is answered the claw, as it always was, the feat's gate wanting a natural weapon first
     "weapon"   the catalogue (data/featPool.js WEAPON_CATALOG: "Weapon Focus aims at ANY of these")
     "school"   the eight schools
     "skill"    every skill, less Speak Language for a silenced record (the Feral flaw "removes it as a Skill Focus
                target", data/traits.js) */
/** the record a reader answers, or a loud fault: never hers by default (move PP1, the plug-and-play audit's V10) */
function needRecord(creation) {
    if (!creation || !creation.self) throw new Error("the Feats cog answers a body's record: none was handed");
    return creation;
}
export function choicesOf(f, creation) {
    return f && f.choose ? aimsOf(f, derive(creation)) : [];
}
/* the aims over a record already derived: choicesOf's, and the offer's (offered, below) */
function aimsOf(f, d) {
    if (f.choose === "natural") {
        const has = (n) => ((d.self.feats && d.self.feats.taken) || []).some((t) => String(t).split(" (")[0].toLowerCase() === n);
        const out = [];
        if (has("riven hands")) out.push("Claw");
        if (has("riven jaw")) out.push("Bite");
        if (has("barbed tail")) out.push("Tail");
        if (d.h && d.h.horns) out.push("Gore");
        return out.length ? out : ["Claw"];
    }
    if (f.choose === "weapon") return WEAPON_CATALOG.slice();
    if (f.choose === "school") return SCHOOLS.slice();
    if (f.choose === "skill") return SKILLS.map((s) => s.label).filter((l) => !(d.silenced && l === "Speak Language"));
    /* A WEAPON OF ITS OWN KIND NOT YET KNOWN (move F5b; Martial and Exotic Weapon Proficiency: "Each time you take the
       feat, it applies to a new type of weapon"): the weapon table's rows of that kind (data/weaponTable.js `prof`, the
       column data/proficiency.js judges by), less what the record is proficient with already, and an aim the row asks
       more of (`aimReq`: the SRD's Str 13 for the bastard sword and the dwarven waraxe) only when the record has it */
    if (f.choose === "martial weapon" || f.choose === "exotic weapon") {
        const kind = f.choose.split(" ")[0];
        const prof = weaponsOf(d.self);
        const meets = (w) => Object.entries((f.aimReq && f.aimReq[w]) || {})
            .every(([ab, n]) => ((d.h.scores || [])[ABILITY_INDEX[ab]] || 0) >= n);
        return Object.keys(WEAPON_TABLE).filter((w) => WEAPON_TABLE[w].prof === kind && !proficientWith(prof, w) && meets(w));
    }
    /* A KIND OF ARMOR IN THE SRD'S ORDER (move F5b; Armor Proficiency (Light); (Medium), "Prerequisite: Armor Proficiency
       (light)"; (Heavy), "Armor Proficiency (light), Armor Proficiency (medium)"): the next kind the record is not
       trained in, by its classes or its feats (data/proficiency.js armourOf) */
    if (f.choose === "kind of armor") {
        const a = armourOf(d.self);
        return !a.light ? ["Light"] : !a.medium ? ["Medium"] : !a.heavy ? ["Heavy"] : [];
    }
    return [];
}
const INT = 3;                       // index into heritage().scores/modifiers
const ABILITY_INDEX = { str: 0, dex: 1, con: 2, int: 3, wis: 4, cha: 5 };

export const poolByName = new Map(FEAT_POOL.map(f => [f.name, f]));
/** "Skill Focus (Hide)" → the Skill Focus definition. */
export const defOf = (taken) => poolByName.get(taken.replace(/ \([^)]*\)$/, ""));
export const baseNameOf = (taken) => taken.replace(/ \([^)]*\)$/, "");

/**
 * WHAT THE BLOOD HANDS DOWN (Rose, 2026-08-07: *"bloodline feats should only
 * be selectable if inherited by parents same for racial"*).
 *
 * Neither list is a pool the player shops from, both are strictly what the
 * two who made them actually carried. Nothing else in the game can put a
 * bloodline or a racial feat on this page, and `reconcile` drops a taken one
 * the moment the parent it came from stops carrying it, so editing a parent
 * after the fact cannot leave the player holding an inheritance from nobody.
 */
function bloodlineOffers(creation) {
    const b = creation.self.body.blood;
    const names = [b.mother, b.father].map(p => p && p.bloodline)
        /* SAVANT IS NOT A FEAT (Rose 09-17): a parent carries it, and it unlocks the Savant path on the gear page
           (data/classes.js, steps/gear.js). It must never appear among the feats, which is the whole reason it
           stopped being one. */
        .filter(n => n && n !== "None" && n !== SAVANT);
    return [...new Set(names)];
}

/**
 * The two blood parents' RACIAL feats, on the same terms.
 *
 * NOTHING IS FILTERED OUT ANY MORE, because nothing is granted any more
 * (Rose 2026-09-18: "no free racial feats either"; "Light step and shadowmeld
 * if you didnt realize are racial skills... they -are- selectable, but are not
 * supposed to be given automatically"). This comment used to explain a filter
 * against the traits the blood handed over free, and that grant is deleted at
 * its root in state.js heritageOf. A parent SELECTS one racial feat out of
 * data/heritage.js racialFeatsFor -- their race's own names plus their
 * subrace's signature plus anything race-locked -- and the child spends a seat
 * on it here or does without it.
 * (Talent and Skill are not named traits at all: Rose 08-14, they fold into
 * the bonusFeat / bonusSkills flags on the blood.)
 */
function racialOffers(creation) {
    const b = creation.self.body.blood;
    /* NO FILTER ANY MORE (Rose 2026-09-17: "Shadowmeld is not a duplicate thing"). This used to drop any racial feat
       the child's own line already granted for free, which was right only while lines granted feats. They do not:
       what a parent selected is offered and paid for, and that is the whole of the inheritance. */
    const names = [b.mother, b.father].map(p => p && p.racialFeat)
        .filter(n => n && n !== "None");
    return [...new Set(names)];
}

/** Everything the blood offers, which is the ONLY source of these two kinds. */
export const inheritedOffers = (creation) =>
    [...bloodlineOffers(needRecord(creation)), ...racialOffers(creation)];

/*,,. AND IT MAY BE ASKED ABOUT A RECORD THAT IS NOT HERS (Rose 2026-09-18: "if the LLM cant do it thats your
   fail state") ,,,
   This read `state.creation` directly, so the feat cap, the prerequisite gate and the skill purse could only
   ever be computed for the player. A seat's sheet is the same shape and wants the same answers, so the record
   is an argument now, and since move PP1 a required one (the plug-and-play audit's V10; Rose 2026-10-07: "make sure
   systems apply to -all- entities"): a reader handed none throws (needRecord), so a forgotten body is a fault a suite
   sees, never her answers in play. One implementation of the rule, every record asking it.
   exported for the Skills page, which spends the same purse this maths */
export function derive(creation) {
    const self = needRecord(creation).self;
    const h = heritageOf(creation) || { traits: [], scores: [8,8,8,8,8,8], modifiers: [0,0,0,0,0,0], nightVision: false };
    /* Feral sanitizes BEFORE budgeting, a lingering Speak Language rank
       would count against the purse of a character with no tongue. */
    if (isSilenced(self.flaws) && self.skills.ranks["Speak Language"])
        delete self.skills.ranks["Speak Language"];
    /* THE CAP: 1 base + the human blood's extra + the class slot + one
       per flaw. The human +1 is heritage()'s own `bonusFeat` flag,
       written on 08-14 beside `bonusSkills` ("the +1 feat and +4 skill
       points still land, the labels do not") -- and the skill half
       landed while this half NEVER DID: the flag sat unread and a plain
       human opened with one feat (Rose, 08-17: "Im a human why do I
       have only one feat choice... what did you do?" -- nothing that
       day; the 08-14 wiring was half-done and her canon's Talent text,
       "an extra feat at level 1", had been v1's own never-granted
       defect too). The doubling she called on 08-14 was the trait LABEL
       granting a second +1 on top of the blood's; one owner now, the
       flag. */
    /*,,. FEATS ARE COUNTED OFF THE CHARACTER'S LEVEL (Rose 2026-09-20, item 1) ,,,
       This read a flat 1 and was right for exactly as long as nobody had a
       second level. SRD: a feat at 1st, 3rd, 6th, 9th, 12th, 15th and 18th,
       and the multiclass page is explicit that it is CHARACTER level that
       decides, "regardless of individual class level" -- so a Fighter 1 /
       Wizard 1 gets ONE feat, not two. data/levelling.js owns the list.
       AT FIRST LEVEL THIS IS THE SAME NUMBER IT ALWAYS WAS, which is the
       point: nothing about an existing character changes. */
    const charLevel = characterLevelOf(self);
    /* what a class table gave free and she holds given (MOVE G; givenOf, below) */
    const given = givenOf(self);
    const cap = featsThrough(charLevel) +
        (h.bonusFeat ? 1 : 0)
        /*,,. THE SAVANT'S THREE BONUS SEATS (Rose 2026-09-17) ,,,
           He asked whether the fighter's and the monk's are one thing; the SRD says no, and his rule is that the game
           follows the book both ways: "they are not the same - in the game they have to be different too", "if in the
           book they're the same in the game they have to be the same". The fighter's is drawn from the fighter list
           with every prerequisite standing; the monk's is Improved Grapple or Stunning Fist with the prerequisites
           waived; the wizard's is the SRD's own Scribe Scroll, given, not chosen (classGrantsOf, Rose 2026-09-28: "do
           you not know hwizard works?"). Three seats, three lists, three windows on this page. */
        /*,,. AND EACH CLASS'S OWN BONUS FEATS THROUGH ITS OWN LEVEL (2026-09-28) ,,,
           This was a flat one for a Fighter, Monk or Wizard, right at 1st level and wrong after: the forge heals a
           levelled seat through this cap, so a Fighter 2's second bonus feat (the SRD's "additional bonus feat at 2nd
           level") was over it and cut. levelling.js classFeatsThrough counts the SRD's tables per class. */
        + (self.classes.path === "Savant" ? 3 : classLevelsOf(self).reduce((n, r) => n + classFeatsThrough(r.path, r.level), 0))
        + bonusFeatsOwed(self.flaws)
        /*,,. AND WHAT A CLASS TABLE GAVE FREE (MOVE G: a Ranger's Track and Endurance, a Monk's Improved Unarmed Strike) ,,,
           Each beside every other feat, counted as the record holds it given (feats.grants): a feat she had picked
           before its grant came earns no second seat, the SRD naming no replacement. */
        + given.length;
    /* SHE WITHHOLDS POWER, NOT TRAINING (data/faith.js `unanswered`).
       Class skills and skill points were taken away here for one day and Rose
       overruled it: *"class skills being removed doesnt make sense they're
       still clerics"*. Right, and it is the same argument that already
       protected the hit die: Heal, Concentration and Knowledge (Religion) are
       taught by the ORDER, in its libraries, by priests who are still alive. A
       dormant god cannot un-teach them. The casting is the only thing that
       comes down from her, so the casting is the only thing that stops. */
    /* and the casting stops class by class (move F5b): a divine class whose god does not answer casts nothing, every
       other class at its own caster level (rules/classes.js casterLevelAt), the record's highest the one a feat asks */
    const casterLevel = Math.max(0, ...classLevelsOf(self).map((r) =>
        unanswered(r.path, self.classes.deity) ? 0 : casterLevelAt(r.path, r.level)));
    const classSkills = new Set(CLASS_SKILLS[self.classes.path] || []);
    /*,,. AND SO IS THE SKILL PURSE, ONE LEVEL AT A TIME ,,,
       SRD: (class points + Int) x 4 at 1st level, that many again at every
       level after, never fewer than 1 a level, and a human takes +4 at 1st
       and +1 at each level after. The floor is applied to the class-and-Int
       figure BEFORE the human extra, which is how this line has always read
       it and is the reading data/levelling.js skillPointsFor matches.
       THE FIRST TWO TERMS ARE UNTOUCHED, so a 1st-level record budgets today
       exactly what it budgeted yesterday. */
    const perLevel = Math.max(1, BASE_CLASSES[self.classes.path].skills + h.modifiers[INT])
        + (h.bonusSkills ? 1 : 0);
    const budget = Math.max(1, BASE_CLASSES[self.classes.path].skills + h.modifiers[INT]) * 4
        + (h.bonusSkills ? 4 : 0)
        + Math.max(0, charLevel - 1) * perLevel;
    let spent = 0;
    for (const [label, r] of Object.entries(self.skills.ranks))
        spent += r * (classSkills.has(label) ? 1 : 2);
    return { self, h, cap, classSkills, budget, spent, left: budget - spent,
             /* "The maximum rank for a class skill is 3 + character level",
                and half that for one no class of hers teaches. Handed over
                here so the page draws the cap it is actually enforcing, and
                so there is still exactly ONE owner of the purse. */
             charLevel, perLevel,
             /* the free grants she holds given (MOVE G), which the page counts apart from her picks */
             given,
             rankCap: (isClass) => maxRank(charLevel, isClass),
             /* Caster-gated feats fall with the casting: a forsaken cleric can
                no more take a spell feat than a fighter can. The flag itself is
                no longer handed out, because nothing on this page draws
                differently for her clerics any more.
                A CASTER IS A BODY WITH A CASTER LEVEL (move F5b): a Fighter/Wizard, and a paladin or a ranger from 4th,
                cast; this read the first class alone, casting from 1st */
             caster: casterLevel >= 1, casterLevel,
             /* THE WHOLE SHEET'S BASE ATTACK (2026-09-27): this read babAtLevel1(self.path) for every level, so a
                feat gated on base attack (Spring Attack's +4) never opened however high she climbed, and a
                Sorcerer who took Fighter kept a Sorcerer's first-level +0. levelling.js sheetOf sums it class by
                class, the SRD's multiclass rule; at 1st level it is the same number the old line gave. */
             bab: Math.max(babAtLevel1(self.classes.path), sheetOf(self).bab), silenced: isSilenced(self.flaws) };
}

/** What this record's BLOOD offers it: the racial feat and the bloodline each parent selected, which are the
    only source of those two kinds and are paid for with a feat slot like anything else. Exported for the
    seat's forge, which had the parents recorded and no way to offer what they carried (Rose 2026-09-18). */
export function inheritedFor(creation) {
    return inheritedOffers(creation);
}

/*,,. WHAT THIS RECORD MAY LEGALLY TAKE, BY NAME (Rose 2026-09-18) ,,,
   The page draws its rows through visible(), so what it SHOWS is already what may be taken. A seat's forge
   was offering the raw pool instead -- Improved Grapple with no Improved Unarmed Strike, Precise Shot with
   no Point Blank Shot -- and then keeping whatever was picked. This is the page's own filter, exported, so
   the two doors offer one list. */
export function offerableFeats(creation) {
    const d = derive(creation);
    return FEAT_POOL.filter((f) => offered(f, d)).map((f) => f.name);
}

/*,,. THE MONK'S PAIR IGNORES ITS PREREQUISITES (2026-08-15),,,
   blocks() demands the monk take Improved Grapple or Stunning Fist and calls
   them "its SRD pair" -- and the SRD's bonus feat comes with an exemption
   this page never implemented: "At 1st level, a monk may select either
   Improved Grapple or Stunning Fist as a bonus feat. A monk need not have any
   of the prerequisites normally required for these feats to select them."

   Without it the gate is a SOFTLOCK, not a rule: Stunning Fist carries
   bab 8 in the pool, which no first-level body can ever reach, and Improved
   Grapple wants Dex 13 + Improved Unarmed Strike. A monk who rolled Dex 12
   is told to take one of two feats the page will not show her, and creation
   cannot be finished at all.

   So this completes the rule the gate already says it is enforcing rather
   than inventing a new one -- the debt was implemented, the exemption was
   not. It is monk-only and pair-only: every other body still meets its
   prerequisites the ordinary way.

   SOURCING NOTE, honestly: d20srd, dandwiki and dndtools all returned 403
   tonight, so the sentence above is from two independent searches agreeing
   verbatim plus the feats' own Special lines, NOT a page I fetched. It also
   matches this file's own comment about the pair. If Rose rules that her
   monks meet prerequisites like anyone else, the fix is to reword blocks()
   instead -- but the softlock has to die either way. */
export const MONK_PAIR = ["Improved Grapple", "Stunning Fist"];

/** THE HONEST PREREQUISITE TEST, with no waiver in it. One owner, so what the page SHOWS and what a seat ACCEPTS
    cannot drift apart -- they did, and Improved Grapple could be taken with no Improved Unarmed Strike behind it
    (Rose 2026-09-17: "you didnt gate any of these feats"). */
export function meetsReq(f, d) {
    if (!f.req) return true;
    const r = f.req;
    if (r.bab && d.bab < r.bab) return false;
    /* THE THREE THE GATE NEVER ASKED (2026-09-28, Rose: "feats dont respect prequisites"): a fighter level is levels of
       FIGHTER, not base attack; a crossbow proficiency and a shield proficiency are the SRD's own words for Rapid Reload
       and Shield Wall, and data/proficiency.js answers both for any record */
    /* a class's own level (fighterLevel until move F5b): Weapon Specialization's fighter levels, Spell Mastery's wizard's */
    if (r.classLevel) for (const [p, n] of Object.entries(r.classLevel)) if (classLevelOf(d.self, p) < n) return false;
    if (r.crossbow && !["light crossbow", "heavy crossbow", "hand crossbow"].some((w) => proficientWith(weaponsOf(d.self), w))) return false;
    if (r.shield && !shieldProficient(d.self)) return false;
    if (r.caster && !d.caster) return false;
    /* THE KINDS ROSE'S BOOK FEATS ASK (move F5b; d20srd.org/srd/feats.htm, read in Chrome 2026-10-07): a character level
       (Leadership's 6th), a caster level (the item creation feats'), a class feature by its table (wild shape, the turning
       of the undead, a familiar: rules/classes.js hasFeature) */
    if (r.charLevel && d.charLevel < r.charLevel) return false;
    if (r.casterLevel && (d.casterLevel || 0) < r.casterLevel) return false;
    if (r.feature && !hasFeature(d.self, r.feature)) return false;
    /* THE CRITICAL FEATS' GATES (move F6a): Critical Mastery's "any two critical feats", and a row whose prerequisite the
       game does not have (`unmet`: Arcane Strike, Call Truce, the curse spells, dismissal) is never met */
    if (r.unmet) return false;
    if (r.critFeats && d.self.feats.taken.filter((t) => (defOf(t) || {}).critical).length < r.critFeats) return false;
    if (r.nightVision && !d.h.nightVision) return false;
    if (r.living && d.h.undead) return false;
    for (const [ab, i] of Object.entries(ABILITY_INDEX))
        if (r[ab] && d.h.scores[i] < r[ab]) return false;
    if (r.skills) for (const [label, n] of Object.entries(r.skills))
        if ((d.self.skills.ranks[label] || 0) < n) return false;
    if (r.feats) for (const p of r.feats)
        if (!d.self.feats.taken.includes(p) &&
            !d.self.feats.taken.some(t => baseNameOf(t) === p)) return false;
    if (r.naturals) {
        /* horns are blood (one gore); the Riven feats are taken:
           Hands a PAIR of claws, Jaw a bite, Tail a tail */
        const picked = d.self.feats.taken.map(t => baseNameOf(t));
        const n = (d.h.horns ? 1 : 0)
            + (picked.includes("Riven Hands") ? 2 : 0)
            + (picked.includes("Riven Jaw") ? 1 : 0)
            + (picked.includes("Barbed Tail") ? 1 : 0);
        if (n < r.naturals) return false;
    }
    return true;
}
/** WHETHER A ROW EXISTS RIGHT NOW. Absent, never greyed.
    The monk's pair is shown to a body that owns the monk's bonus seat even with its prerequisites unmet, because
    that SEAT waives them (SRD: "A monk need not have any of the prerequisites normally required for these feats to
    select them"). Whether it may actually be TAKEN is mayAdd's word, and mayAdd refuses a general seat -- which is
    the hole Rose found on 2026-09-17: "I can select Improved grapple without getting improved unarmed strike". */
/** WHAT A RECORD IS OFFERED (move F5b): a visible row, less one whose gift it holds already (`gives`; the SRD's Special
    lines: "automatically have ... as a bonus feat. They need not select it") and less one aimed at a weapon or an armour
    of its own kind with no aim left to learn. The healer asks visible alone, so a feat held before a class gave the same
    thing is never taken back */
export function offered(f, d) {
    if (!visible(f, d)) return false;
    const g = f.gives;
    if (g && ((g.simple && weaponsOf(d.self).simple) || (g.shield && shieldProficient(d.self))
        || (g.tower && towerProficient(d.self)))) return false;
    if (RUN_OUT.has(f.choose) && !aimsOf(f, d).length) return false;
    return true;
}
const RUN_OUT = new Set(["martial weapon", "exotic weapon", "kind of armor"]);
export function visible(f, d) {
    /* a feat a class table grants (Scribe Scroll at a wizard's 1st) is never offered as a pick */
    if (f.grantOnly) return false;
    if ((d.self.classes.path === "Monk" || d.self.classes.path === "Savant") && MONK_PAIR.includes(f.name)) return true;
    return meetsReq(f, d);
}
/**
 * The original's fixed-point sweep (≤6 passes): drop feats whose prereqs no
 * longer hold, pop over-cap picks newest-first, shed ranks until the purse
 * balances. Returns the float lines for what it took.
 */
/* exported for the Skills page: its gate heals the same record first. Takes the record it is healing, the
   player's by default, so a forged seat can be healed by this function rather than by a copy of it. */
/** THE FEATS A CLASS TABLE GIVES, which no pick pays for (the SRD's Special column, data/levelling.js grantsOf; MOVE G):
    the Wizard's Scribe Scroll at 1st ("At 1st level, a wizard gains Scribe Scroll as a bonus feat"), in the wizard's own
    seat; the Ranger's Track at 1st and Endurance at 3rd and the Monk's Improved Unarmed Strike at 1st, free. Every class
    of the record is asked, each by its own level, so a class taken second keeps what its levels gave; a Savant, every
    class at once, takes every 1st level's. */
export function classGrantsOf(self) {
    return self ? grantsOf(self).map((g) => g.feat) : [];
}
/** the ones of them that come free, beside every other feat: no class seat pays for them */
export function freeGrantsOf(self) {
    return self ? grantsOf(self).filter((g) => !g.seat).map((g) => g.feat) : [];
}
/** the free grants this record holds AS given (feats.grants, the table's mark), still given by a class it holds: what
    the cap counts beside the picks, so a feat she had picked before its grant came earns no second seat */
export function givenOf(self) {
    const fs = (self && self.feats) || {};
    const free = freeGrantsOf(self);
    return (fs.grants || []).filter((n) => free.includes(n) && (fs.taken || []).some((t) => baseNameOf(t) === n));
}

export function reconcile(creation, o = {}) {
    const lost = [];
    let shedRanks = false;
    for (let pass = 0; pass < 6; pass++) {
        const d = derive(creation);
        let changed = false;
        /* WHAT A CLASS TABLE GIVES IS ON THE RECORD (classGrantsOf: the SRD's Scribe Scroll at a wizard's 1st, and since
           MOVE G a Ranger's Track and Endurance and a Monk's Improved Unarmed Strike). On the creation pages it is written
           at once. One that fills a class's own seat (Scribe Scroll) takes a full list's last pick, said like any other
           loss; a free one (freeGrantsOf) carries its own seat and is marked given (feats.grants), and a pick of the same
           feat becomes the grant, its seat freed, the first level's choices being made together. The forge asks with
           { grants: "room" }: a seat's older sheet that chose its feats before this rule keeps every one of them, gains a
           seat's grant only where it has a seat free, and a feat it picked stays its pick (nothing twice, nothing extra).
           A free grant no class gives any more goes, mark and all, said like any other loss. */
        const grants = classGrantsOf(d.self);
        const free = freeGrantsOf(d.self);
        const fs = d.self.feats;
        const marks = () => fs.grants || [];
        for (const g of grants) {
            const own = free.includes(g);
            if (fs.taken.some((t) => baseNameOf(t) === g)) {
                if (own && o.grants !== "room" && !marks().includes(g)) { fs.grants = [...marks(), g]; changed = true; }
                continue;
            }
            if (!own && o.grants === "room" && fs.taken.length >= d.cap) continue;
            fs.taken.unshift(g); changed = true;
            if (own) fs.grants = [...marks(), g];
        }
        for (const n of marks()) {
            if (free.includes(n)) continue;
            const rest = marks().filter((x) => x !== n);
            fs.grants = rest.length ? rest : null;
            const at = fs.taken.findIndex((t) => baseNameOf(t) === n);
            if (at >= 0) { fs.taken.splice(at, 1); lost.push(n); }
            changed = true;
        }
        /* a grant written, marked or gone moves the cap: the next pass reads it again before anything is popped */
        if (changed) continue;
        for (const t of [...d.self.feats.taken]) {
            const f = defOf(t);
            /* A name the pool doesn't know is INHERITED, bloodline or
               racial, and it stands only while a blood parent still
               carries it. Change that parent and the child loses it, with
               a report, exactly as a broken prerequisite would. */
            /* a feat a class table granted stands on the table, not on the gate (grantOnly, or marked given), and only
               while a class of the record still grants it */
            const broken = f ? ((f.grantOnly || marks().includes(f.name)) ? !grants.includes(f.name) : !visible(f, d))
                : !inheritedOffers(creation).includes(t);
            if (broken) {
                d.self.feats.taken.splice(d.self.feats.taken.indexOf(t), 1);
                lost.push(t); changed = true;
            }
        }
        /*,,. v1's clamp: ranks past a cap the class no longer grants ,,,
           AND THE CAP IS THE CHARACTER'S, NOT THE FIRST LEVEL'S (Rose 2026-09-20, item 3).
           This read a flat 4 and 2 while the Skills page, two hours earlier the
           same night, was taught to draw "3 + character level". So a levelled
           character could buy ranks the page offered her and this healer took
           every one of them back the moment Verify ran -- and said so only
           through pendingSay, which is read by the Feats page on its NEXT
           draw. Walk straight to the end and nothing is ever said at all.
           THAT IS THE SILENT REFUSAL. Not a gate that says nothing: a healer
           that quietly undoes a legal purchase. I made half of it myself by
           teaching one reader the new rule and not the other, having claimed
           in the same breath that derive() was the one owner of the purse. It
           is now: d.rankCap is the only place either number comes from. */
        for (const { label } of SKILLS) {
            const rc = d.rankCap ? d.rankCap(d.classSkills.has(label))
                                 : (d.classSkills.has(label) ? 4 : 2);
            if ((d.self.skills.ranks[label] || 0) > rc) {
                d.self.skills.ranks[label] = rc; shedRanks = true; changed = true;
            }
        }
        while (d.self.feats.taken.length > d.cap) {
            lost.push(d.self.feats.taken.pop()); changed = true;
        }
        let { left, classSkills } = derive(creation);
        if (left < 0) {
            for (const { label } of SKILLS) {
                while (left < 0 && (creation.self.skills.ranks[label] || 0) > 0) {
                    creation.self.skills.ranks[label] -= 1;
                    if (!creation.self.skills.ranks[label]) delete creation.self.skills.ranks[label];
                    left += classSkills.has(label) ? 1 : 2;
                    shedRanks = true; changed = true;
                }
                if (left >= 0) break;
            }
        }
        if (!changed) break;
    }
    const msgs = [];
    if (lost.length === 1) msgs.push(`Feat lost: ${lost[0]}`);
    if (lost.length > 1) msgs.push(`Feats lost: ${lost.join(", ")}`);
    if (shedRanks) msgs.push("Skill points returned to the purse.");
    return msgs.join(" · ");
}

/* ============================================================================
   WHAT EACH FEAT DOES, READ OFF ITS ROWS (move F1a, 2026-10-07; the machine map's 4.4): out of data/featEffects.js
   word for word, their comments with them, in that file's order: the picks' readers (splitPick, holds, pickOf),
   the threat's doubling, a skill's feat bonuses, a weapon's named feats, the maneuvers' and the spells' bonuses,
   metamagic's price, the toggles' and the trades' readers, the toggled metamagic, and the stamp of every held
   feat on a fighter, its hit points and the audit. The rows stay in data/featEffects.js.
   ========================================================================== */

/** "Weapon Focus (Rapier)" -> ["weapon focus", "rapier"], lower-cased. */
export function splitPick(pick) {
    const s = String(pick || "").trim();
    const m = s.match(/^(.*?)\s*\((.*)\)\s*$/);
    return m ? [m[1].toLowerCase(), m[2].toLowerCase()] : [s.toLowerCase(), ""];
}
const baseOf = (pick) => splitPick(pick)[0];

/** does the list hold this feat, by base name, case-blind */
export function holds(feats, name) {
    const want = String(name).toLowerCase();
    return (Array.isArray(feats) ? feats : []).some((x) => baseOf(x) === want);
}
/** the aimed pick's target, or "" ("Skill Focus (Hide)" -> "hide") */
export function pickOf(feats, name) {
    const want = String(name).toLowerCase();
    const hit = (Array.isArray(feats) ? feats : []).find((x) => baseOf(x) === want);
    return hit ? splitPick(hit)[1] : "";
}
function picksOf(feats, name) {
    const want = String(name).toLowerCase();
    return (Array.isArray(feats) ? feats : [])
        .filter((x) => baseOf(x) === want).map((x) => splitPick(x)[1]);
}

/*,,. THE SHADOW STEP IS TAKEN, NEVER GIVEN BY BLOOD (move R6; Rose's report #6, 2026-10-08: "I'm a pure shade... I dont
   have shadow jump as a feat it agve it to me anyway"; her law 2026-09-18: "no free bloodline feats period", "no free
   racial feats either") ,,,
   ONE GATE for every body that would step shadow to shadow: the Shadowmeld feat, which a parent of shade blood may pass
   down and a slot pays for, or a Shadowdancer's own Shadow Jump (its well, rules/classes/shadowdancer.js, at its own
   class level). The race is never asked. The bar asks it (ui/table.js barGrants); the world's and the fight's doors ask
   it as they are lifted (rows R6-4 and R6-5). */
/** may this record shadow step: { ok, why, by }, `by` the feat or the class that opens it, `why` the library's words */
export function shadowStepOf(rec) {
    if (holds((rec && rec.feats && rec.feats.taken) || [], "Shadowmeld")) return { ok: true, why: "", by: "Shadowmeld" };
    if (rec && shadowJumpFtAt(classLevelOf(rec, "Shadowdancer")) > 0) return { ok: true, why: "", by: "Shadowdancer" };
    return { ok: false, why: textOf("$lohTXShadowStepNeeds"), by: null };
}

/* SRD threat doubling: 20 -> 19-20, 19-20 -> 17-20, 18-20 -> 15-20.
   Two doublings never stack (SRD, Improved Critical's own Special). */
export const doubleThreat = (t) => 21 - 2 * (21 - (t || 20));

/**
 * Every bonus the held feats hang on one skill, static and conditional.
 * `ctx`: { biome: "open"|"woodland"|"forest", night: bool,
 *          unobserved: bool, vsHorse: bool }.
 */

export function featSkillMod(feats, skill, ctx = {}) {
    const list = Array.isArray(feats) ? feats : [];
    let n = 0;
    for (const pick of list) {
        const [base, aim] = splitPick(pick);
        if (base === "skill focus") {
            if (aim === String(skill).toLowerCase()) n += 3;
            continue;
        }
        const row = Object.keys(SKILL_FEATS).find((k) => k.toLowerCase() === base);
        if (row && SKILL_FEATS[row][skill]) n += SKILL_FEATS[row][skill];
    }
    /*,,. AROUND ANY FORESTED AREA (Rose 2026-09-18: "Woodland Affinity is around any forested area they get
       those bonus") ,,,
       It used to ask the MAP's label, so a body standing in a wood on a map called "open" got nothing and a
       body on a treeless corner of a map called "forest" got everything. `ctx.woods` is the ground she is
       actually standing on, answered by the world (void.js: trees within thirty feet); the label is still
       read, because a map that calls itself a forest is one. */
    const woods = !!ctx.woods || /wood|forest/i.test(String(ctx.biome || ""));
    const forest = !!ctx.woods || /forest/i.test(String(ctx.biome || ""));
    if (holds(list, "Woodland Affinity")) {
        if (woods && (skill === "Hide" || skill === "Move Silently")) n += 2;
        if (forest && skill === "Survival") n += 2;
    }
    /*,,. NIGHT OWL'S TEN, NAMED BY HIM (Rose 2026-09-18) ,,,
       "+2 to open lock, listen, spot, search, disable device, intimidation, hide, move silently, diplomacy,
       bluff... during night time." A blanket +2 on every Charisma skill stood here, which was my invention;
       this is his list, and nothing outside it gets anything. */
    if (ctx.night && holds(list, "Night Owl") && NIGHT_OWL_SKILLS.has(skill)) n += 2;
    if (ctx.unobserved && holds(list, "Black Cat")) {
        if (skill === "Hide" || skill === "Move Silently") n += 2;   // Rose 09-17: "+5 ms, +2 hide, +2 move silently + 1 damage"
    }
    /*,,. SHADOWMELD'S QUIET (Rose 2026-09-18: "Shadowmeld grants +2 hide and move silently in darkness or in
       shadow... and 'in shadow' always means when a shadow falls on you... even if its someone's shadow or a
       shadow that belongs to an object") ,,,
       Two conditions, either one: the hour being dark, or a shadow actually lying over her. The second is the
       world's own reading (world/shadow.js isInShadow), handed in as ctx.inShadow. */
    /*,,. THE NEW MOON (Rose 2026-09-18: "New moon +5 Hide +5 move silently") ,,,
       The gift arrives whole from data/moon.js rather than being retyped here, so the table stays the one
       place the eight phases are written down. */
    if (ctx.moon && holds(list, "Lunari Ritual")) {
        if (skill === "Hide" && ctx.moon.hide) n += ctx.moon.hide;
        if (skill === "Move Silently" && ctx.moon.quiet) n += ctx.moon.quiet;
    }
    if ((ctx.night || ctx.inShadow) && holds(list, "Shadowmeld")) {
        if (skill === "Hide" || skill === "Move Silently") n += 2;
    }
    if (ctx.vsHorse && holds(list, "Equestrian") && CHA_SKILLS.has(skill)) n += 2;  // number mine
    return n;
}

/**
 * The named-weapon feats, folded for one weapon: attack, damage and whether
 * its threat range doubles. Weapon Focus +1, Greater Weapon Focus +1,
 * Weapon Specialization +2, Greater +2, Improved Critical doubles (Expose
 * Weakness, which doubled every Weapon Focus weapon, removed: Rose 2026-10-07).
 * "Unarmed" and "Unarmed Strike" are one weapon here (the catalogue says
 * Unarmed, the fist's move says Unarmed Strike; the old reader matched
 * neither pick to the other).
 */
export function weaponFeatBonus(feats, weaponName) {
    const list = Array.isArray(feats) ? feats : [];
    const w = String(weaponName || "").toLowerCase();
    const same = (aim) => aim === w
        || (aim === "unarmed" && w === "unarmed strike")
        || (aim === "unarmed strike" && w === "unarmed");
    const aimed = (name) => picksOf(list, name).some(same);
    const focus = aimed("Weapon Focus");
    const greater = aimed("Greater Weapon Focus");
    return {
        atk: (focus ? 1 : 0) + (greater ? 1 : 0),
        /* the same two as the attack roll's terms (the attack cog, move 6b-1a), each feat by its own name */
        atkTerms: [...(focus ? [[1, "Weapon Focus"]] : []), ...(greater ? [[1, "Greater Weapon Focus"]] : [])],
        dmg: (aimed("Weapon Specialization") ? 2 : 0)
           + (aimed("Greater Weapon Specialization") ? 2 : 0),
        threatDouble: aimed("Improved Critical"),
    };
}

/** the improved-maneuver +4s, for the maneuver roads (trip today) */
export function maneuverBonus(f, kind) {
    return (f && f.maneuver && f.maneuver[kind]) || 0;
}

/** +1 per Spell Focus / Greater Spell Focus in the school, for a spell's DC */
export function spellDcBonus(f, school, ctx = {}) {
    const s = String(school || "").toLowerCase();
    let n = (f && f.spellFocus && f.spellFocus[s]) || 0;
    /* Night Owl's +1 after dark (Rose 2026-09-18). It is stamped in the same place Spell Focus's is, which is
       the honest place for it: neither has a reader until a verse asks for a saving throw, and when that road
       is built both arrive through this one door rather than one of them being remembered later. */
    if (ctx.night && holds((f && f.feats) || [], "Night Owl")) n += 1;
    return n;
}

/*,,. METAMAGIC, PRICED (SRD) ,,,
   The verse road accepts a variant the day it offers one; this is the
   arithmetic, so the pricing is written once. Returns null when the feat
   cannot touch the move (a spell with no dice for Empower, no duration for
   Extend). `slotLevel` is the level the slot must be. */
export function metamagicVariant(move, featName) {
    if (!move) return null;
    /* `== null`, not `|| 1`: an orison is level 0 and zero is falsy (battle.js
       carries the same repair at three more sites, 2026-09-19) */
    const lvl = move.slotLevel == null ? 1 : move.slotLevel;
    switch (String(featName)) {
    case "Empower Spell":
        return move.dmg ? { ...move, name: "Empowered " + move.name, empower: 1.5, slotLevel: lvl + 2 } : null;
    case "Maximize Spell":
        return move.dmg ? { ...move, name: "Maximized " + move.name, maximize: true, slotLevel: lvl + 3 } : null;
    case "Extend Spell":
        return move.durationRounds ? { ...move, name: "Extended " + move.name,
            durationRounds: move.durationRounds * 2, slotLevel: lvl + 1 } : null;
    case "Enlarge Spell":
        return move.rangeFt ? { ...move, name: "Enlarged " + move.name,
            rangeFt: move.rangeFt * 2, slotLevel: lvl + 1 } : null;
    case "Widen Spell":
        return move.radiusFt ? { ...move, name: "Widened " + move.name,
            radiusFt: move.radiusFt * 2, slotLevel: lvl + 3 } : null;
    case "Heighten Spell":
        return { ...move, name: "Heightened " + move.name, slotLevel: lvl + 1, heightened: 1 };
    case "Quicken Spell":
        return move.castRounds ? null
            : { ...move, name: "Quickened " + move.name, swift: true, provokes: false, slotLevel: lvl + 4 };
    case "Silent Spell":
        return { ...move, name: "Silent " + move.name, noVerbal: true, slotLevel: lvl + 1 };
    case "Still Spell":
        return { ...move, name: "Stilled " + move.name, noSomatic: true, slotLevel: lvl + 1 };
    default:
        return null;
    }
}

/** the toggles this list of feats owns, and the OPEN ones, which are every body's */
export const toggleNames = (feats) => Object.keys(TOGGLES).filter((n) => TOGGLES[n].open || holds(feats, n));
/** the standing answer: the record's, else the toggle's own default */
export function toggleOn(toggles, name) {
    if (toggles && toggles[name] != null) return !!toggles[name];
    const t = TOGGLES[name];
    return !!(t && t.def);
}

/** where a trade stands: `true` (a record from before the dial) is the whole of it, a number is held to what the book allows */
export function tradeValue(toggles, name, max) {
    const top = Math.max(0, Math.floor(+max || 0));
    const v = toggles ? toggles[name] : null;
    if (v === true) return top;
    const n = Math.floor(+v);
    return Number.isFinite(n) ? Math.max(0, Math.min(top, n)) : 0;
}
/** one press on the bar or the rail: a point more, and past the top, off */
export function nextTrade(toggles, name, max) {
    const top = Math.max(0, Math.floor(+max || 0));
    const cur = tradeValue(toggles, name, top);
    return cur >= top ? 0 : cur + 1;
}
/** derive the live numbers from the toggles (build, and every flip) */
export function applyToggles(f) {
    const t = f.toggles || {};
    f.powerAttack = tradeValue(t, "Power Attack", f.powerAttackMax);
    f.expertise = tradeValue(t, "Combat Expertise", f.expertiseMax);
    f.rapidShotOn = !!(f.rapidShot && toggleOn(t, "Rapid Shot"));
    f.stunningFistOn = !!(f.stunningFist && toggleOn(t, "Stunning Fist"));
    /* every body's two choices of damage (weapons D1n's N2): the fight reads them on each blow */
    f.pullBlows = toggleOn(t, "Pull Blows");
    f.strikeToKill = toggleOn(t, "Strike to Kill");
    return f;
}

/** the cast a caster's toggled metamagic makes of a plain move: the
    variant (its `base` the plain row) and the names applied; the plain
    move itself when nothing toggled touches it */
export function metamagicFor(move, f) {
    const held = (f && f.metamagic) || [];
    let cur = move;
    const applied = [];
    for (const name of META_ORDER) {
        if (!held.includes(name) || !toggleOn(f && f.toggles, name)) continue;
        const v = metamagicVariant(cur, name);
        if (v) { cur = v; applied.push(name); }
    }
    if (cur !== move) cur.base = move;
    return { move: cur, applied };
}

/**
 * Stamp every held feat's passive half on the fighter. `c` is the build
 * context: { sheet, dexMod, wisMod, level }. Aimed picks ("Spell Focus
 * (Evocation)") hand their target to the row.
 */
export function applyFeatSheet(f, feats, c = {}) {
    const list = Array.isArray(feats) ? feats : [];
    f.saveMod = f.saveMod || { fort: 0, ref: 0, will: 0 };
    for (const pick of list) {
        const [base, aim] = splitPick(pick);
        const key = Object.keys(FEAT_EFFECTS).find((k) => k.toLowerCase() === base);
        const row = key && FEAT_EFFECTS[key];
        if (row && row.sheet) row.sheet(f, c, aim);
    }
    return f;
}

/*,,. WHAT HER FEATS ADD TO HER HIT POINTS, for a page that prints them before any fighter exists (Rose 2026-09-28:
   "toughness feat doesnt give me +3 hp... on the char creation screen") ,,,
   The rows' own `hp` (Toughness's 3), once per pick: the SRD's Toughness "may be gained multiple times. Its effects
   stack." The fighter takes the same number through the row's sheet (applyFeatSheet), so the two cannot disagree. */
export function featHpOf(feats) {
    let n = 0;
    for (const pick of (Array.isArray(feats) ? feats : [])) {
        const base = baseOf(pick);
        const key = Object.keys(FEAT_EFFECTS).find((k) => k.toLowerCase() === base);
        const row = key && FEAT_EFFECTS[key];
        if (row && row.hp) n += row.hp;
    }
    return n;
}

/*,,. WHAT A HEAL BY REST OR BY MAGIC GIVES BEYOND ITS OWN NUMBER (moves F7a and H1) ,,,
   The rows' own `heal`, of the body's Constitution modifier: Fast Healer's (d20pfsrd, Advanced Player's Guide, read in
   Chrome 2026-10-07: "half your Constitution modifier (minimum +1)"). Health names the slot; the heals by rest or by
   magic ask it: the fight's cure, the health cog's heal acts and her cure verse, and each night's rest. */
export function healBonusOf(feats, conMod) {
    let n = 0;
    for (const pick of (Array.isArray(feats) ? feats : [])) {
        const base = baseOf(pick);
        const key = Object.keys(FEAT_EFFECTS).find((k) => k.toLowerCase() === base);
        const row = key && FEAT_EFFECTS[key];
        if (row && row.heal) n += row.heal({ conMod: Number(conMod) || 0 });
    }
    return n;
}

/*,,. THE CRITICAL FEATS AT THE ATTACK COG'S SLOT (move F6a; sadia's AW3b doors in battle/featHooks.js) ,,,
   Critical Focus: "+4 circumstance bonus on attack rolls made to confirm critical hits" (d20pfsrd, read in Chrome
   2026-10-07). A confirmed critical lays its feats' riders, each row's `crit`: the strongest first, one a critical, two
   with Critical Mastery (every critical feat's Special: "one critical feat to a given critical hit unless you possess
   Critical Mastery"), and none a row's own words spare (Tiring "has no additional effect on a fatigued or exhausted
   creature"). */
/** what the striker's feats add to the confirmation roll only: [[n, word]] */
export function confirmTermsFor(feats) {
    return holds(feats, "Critical Focus") ? [[4, textOf("$lohTXTermCriticalFocus")]] : [];
}
/** the riders a confirmed critical lays on `target` (a fighter: its `fatigued` and `exhausted` read): [{ feat, cond }] */
export function critRidersFor(feats, crit, target) {
    const held = Object.keys(FEAT_EFFECTS).filter((k) => FEAT_EFFECTS[k].crit && holds(feats, k))
        .sort((a, b) => FEAT_EFFECTS[b].crit.rank - FEAT_EFFECTS[a].crit.rank);
    const max = holds(feats, "Critical Mastery") ? 2 : 1, laid = new Set(), out = [];
    const on = (id) => !!(target && target[id]) || laid.has(id) || (id === "fatigued" && on("exhausted"));
    for (const k of held) {
        if (out.length >= max) break;
        const c = FEAT_EFFECTS[k].crit;
        if ((c.spares || []).some(on)) continue;
        laid.add(c.cond);
        out.push({ feat: k, cond: c.cond });
    }
    return out;
}

/** the audit: every row's landing, for the ledger and the dev room */
export function featAudit() {
    return Object.keys(FEAT_EFFECTS).map((name) => {
        const r = FEAT_EFFECTS[name];
        return { name, kind: r.kind, status: r.status, waits: r.waits || "", note: r.note };
    });
}

/*,,. THE ATTACK'S TWO SLOTS, FILLED (move S7a; Desktop/V/attack-cog-table.md "Move S7a", Vera's check) ,,,
   The machine map's 5.3 names the attack's slots, "before the roll and after a hit", and its 4.4 has this cog fill them:
   "The other cogs name their slots; the feats fill them". What a feat or a blood adds to a swing's roll and to its
   damage, asked by the attack cog (rules/attack.js attackRoll and objectRollOf) and by every coup, over the body and the
   SCENE its host hands, never a fight: { night, ownTurn, aoo, company: [{ body, ft, toTargetFt, up }] }, the distances in
   feet, each host's own measure. Moved here word for word from battle/battle.js (barbaricBonus, ethnocentricBonus,
   dmgRiderFor, moonMod) and battle/featHooks.js (attackBonus), their stories with them. */
/* a feat read by its exact name, battle.js's hasFeat word for word, until this cog's one reader takes every fill (Vera's
   F1c: holds, by base name and case-blind) */
const holdsFeat = (c, name) => !!c && Array.isArray(c.feats) && c.feats.includes(name);
/* a melee swing, as the fight's hooks count one (battle/featHooks.js melee) */
const meleeSwing = (move) => !(move && (move.fx || move.thrown))
    && ((move && move.rangeFt) || 0) <= 10;

/* BARBARIC (Rose 08-14: "+1 atk and damage for every 20% hp missing
   and an extra +2 while in diehard"): pain is fuel. Computed LIVE off
   the current wound, never stamped, so healing cools it and the
   corridor stokes it; capped at five steps because a body cannot miss
   more than the whole of itself, and the negatives belong to the
   Diehard rider instead. */
export function barbaricOf(c) {
    if (!holdsFeat(c, "Barbaric")) return 0;
    const max = c.maxHp || 1;
    const missing = max - Math.max(c.hp || 0, 0);
    const steps = Math.min(5, Math.floor((missing / max) * 5));
    const diehard = c.hp < 0 && !c.dying
        && holdsFeat(c, "Diehard");
    return steps + (diehard ? 2 : 0);
}

/* ETHNOCENTRIC, RULED ANEW (Rose 08-14: "+1 bonus for every member
   with ethnocentric same race in the party - only for the members of
   the party with the same race"): the carrier counts every OTHER
   standing ally who shares both the blood and the feat, +1 attack and
   damage per kin. Personal, not an aura: an ally without the feat
   grants and gains nothing. Live-counted, so the bond dies with the
   kin who falls.
   AND NEAR, IN A FIGHT OR OUT OF ONE (Rose 2026-10-07, through Vera: "+1 per entity with ethnocentric. Its a pack tactics
   feat... and its just in general", then "as long as they're near each other", and her pick "Same race, 30 ft"; and "Thats
   the only thing that stacks"): a kin of its race counts within its row's nearFt (data/featEffects.js, 30 feet), once
   however often it is handed, wherever a host hands its company. */
export function ethnocentricOf(c, scene = {}) {
    if (!holdsFeat(c, "Ethnocentric") || !c.race) return 0;
    const near = FEAT_EFFECTS.Ethnocentric.nearFt;
    const kin = new Set();
    for (const k of scene.company || []) {
        const o = k && k.body;
        if (o && o !== c && o.hp > 0 && o.race === c.race && holdsFeat(o, "Ethnocentric") && k.ft <= near) kin.add(o);
    }
    return kin.size;
}

/* Moontouched's halves (Rose 08-14 traits order; consumed at last on
   08-20's audit): the trait stamped moonNight/moonDay and no swing
   ever asked the hour. The host hands `night` in its scene off the
   sky's own state; a scene with no sky answers day. The word is the
   trait's own, or the roll's plain word for the moon. */
export function moonOf(c, scene = {}) {
    const night = !!scene.night;
    return { n: night ? (c.moonNight || 0) : (c.moonDay || 0),
             word: (night ? c.moonNightBy : c.moonDayBy) || textOf("$lohTXAtkMoon") };
}

/** the attack roll's feat terms: { n, terms }, each term by its feat's name (the attack cog, move 6b-1a); the line says
    them through the roll's list since move 6b-1b, so the notes it once wrote beside them are gone (battle/featHooks.js
    attackBonus until move S7a: the fight's turn, its reaction's swing and its fellows are the scene's now) */
export function featRollOf(c, target, move, scene = {}) {
    let n = 0;
    const terms = [];
    if (meleeSwing(move)) {
        if (c.powerAttack > 0) { n -= c.powerAttack; terms.push([-c.powerAttack, "Power Attack"]); }
        /*,,. COMBAT EXPERTISE COMES WITH A SWING (SRD, read 2026-09-28) ,,,
           "When you use the attack action or the full attack action in melee, you can take a penalty of as much as -5 on
           your attack roll and add the same number (+5 or less) as a dodge bonus to your Armor Class... The changes to
           attack rolls and Armor Class last until your next action." The dial is the standing choice; the trade itself
           begins with a melee swing on the body's own turn and holds until its next turn, which battle.js beginTurn clears.
           Set HERE because every melee roll comes through here (resolveAttack, the parried swing, the swing at scenery):
           one door, so no road into a swing can miss it. An attack of opportunity between the two carries it; a round spent
           casting or moving trades nothing, and its Armor Class is the plain one. */
        if (c.expertise > 0 && scene.ownTurn && !scene.aoo) c.expertiseGuard = c.expertise;
        if (c.expertiseGuard > 0) { n -= c.expertiseGuard; terms.push([-c.expertiseGuard, "Combat Expertise"]); }
    }
    /* Paired Opportunists: a fellow with the feat on its feet, within 200 feet, and within reach of the target */
    if (scene.aoo && c.pairedOpp && target
        && (scene.company || []).some((k) => k.up && k.body.pairedOpp && k.ft <= 200
            && k.toTargetFt <= ADJACENT_FT + REACH_SLACK_FT)) {
        n += 4; terms.push([4, "Paired Opportunists"]);
    }
    return { n, terms };
}

/* conditional damage riders (deferred: affinity EFFECTS): the unarmed
   affinity pays +2 only while the swing is actually bare-handed;
   Barbaric's wound-fuel rides every swing (battle.js dmgRiderFor until move S7a) */
export function featRidersOf(c, move, scene = {}) {
    return ((move && move.unarmed && holdsFeat(c, "Unarmed Affinity"))
        ? 2 : 0) + barbaricOf(c) + ethnocentricOf(c, scene);
}
