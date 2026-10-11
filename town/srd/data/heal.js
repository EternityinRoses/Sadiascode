/* ============================================================================
   THE HEAL SKILL, ALL FIVE OF ITS TASKS.

   Rose, 2026-09-20: "rig up the heal system/mechanics too".

   ONE of the five existed before tonight: first aid, written inside
   battle/battle.js as part of the fight's own action ladder. It read
   `ranks.Heal` and Wisdom and NOTHING ELSE -- so a character who had taken
   Self-Sufficient, or bought the fifty-gold kit the shop has sold since
   goods.js was written, rolled exactly the same die as one who had not. Two
   +2s the book gives, both dropped on the floor. That is the first thing this
   module fixes, and it is why the modifier lives HERE rather than at the one
   call site: the next four tasks all want the same sum, and four copies of a
   sum is four chances to forget the kit again.

   THE SRD, WORD FOR WORD, read off d20srd.org/srd/skills/heal.htm on
   2026-09-20, because the rule against inventing rules is the oldest one on
   this project and a module that prices five tasks should carry the prices:

     Heal DCs -- First aid 15. Long-term care 15. Treat wound from caltrop,
     spike growth, or spike stones 15. Treat poison: poison's save DC. Treat
     disease: disease's save DC.

     FIRST AID -- "You usually use first aid to save a dying character. If a
     character has negative hit points and is losing hit points (at the rate
     of 1 per round, 1 per hour, or 1 per day), you can make him or her
     stable. A stable character regains no hit points but stops losing them."

     LONG-TERM CARE -- "Providing long-term care means treating a wounded
     person for a day or more. If your Heal check is successful, the patient
     recovers hit points or ability score points (lost to ability damage) at
     twice the normal rate: 2 hit points per level for a full 8 hours of rest
     in a day, or 4 hit points per level for each full day of complete rest;
     2 ability score points for a full 8 hours of rest in a day, or 4 ability
     score points for each full day of complete rest."
     "You can tend as many as six patients at a time. You need a few items and
     supplies (bandages, salves, and so on) that are easy to come by in
     settled lands. Giving long-term care counts as light activity for the
     healer. You cannot give long-term care to yourself."

     TREAT WOUND FROM CALTROP, SPIKE GROWTH, OR SPIKE STONES -- "A creature
     wounded by stepping on a caltrop moves at one-half normal speed. A
     successful Heal check removes this movement penalty." And for the spells:
     "take injuries that reduce his speed by one-third. Another character can
     remove this penalty by taking 10 minutes to dress the victim's injuries
     and succeeding on a Heal check against the spell's save DC."

     TREAT POISON -- "Every time the poisoned character makes a saving throw
     against the poison, you make a Heal check. The poisoned character uses
     your check result or his or her saving throw, whichever is higher."

     TREAT DISEASE -- the same sentence with the word disease in it.

     ACTION -- "Providing first aid, treating a wound, or treating poison is a
     standard action. Treating a disease or tending a creature wounded by a
     spike growth or spike stones spell takes 10 minutes of work. Providing
     long-term care requires 8 hours of light activity."

     SPECIAL -- "A character with the Self-Sufficient feat gets a +2 bonus on
     Heal checks. A healer's kit gives you a +2 circumstance bonus on Heal
     checks."

   AND THE RATE IT DOUBLES IS THE GAME'S OWN. Natural healing, which
   world/rest.js already quotes and world/void.js already pays out: "With a
   full night's rest (8 hours of sleep or more), you recover 1 hit point per
   character level", and a whole day of doing nothing is twice that. So
   long-term care is not a new number, it is a MULTIPLIER of two on a number
   the night already had -- which is exactly why `nightHp` below takes the
   tending as a flag rather than owning a second table. One rate, one place.

   THE ONE RESTRICTION THAT SHAPES THE WHOLE FEATURE: "You cannot give
   long-term care to yourself." A solo walker gets nothing out of this no
   matter how many ranks she bought, and that is the book's answer, not an
   oversight to code around. What makes it live in Harpine is that an allied
   seat body standing on the grass beside her while she sleeps CAN tend her,
   and she can tend it back. `careGiver` refuses the self case by identity,
   loudly, rather than silently returning a 1x rate that would look like a bad
   roll.

   WHAT THIS MODULE IS NOT. It holds no die. Every function here takes a check
   TOTAL that somebody else rolled (world/rolls.js for the world, battle's own
   d20 for the fight) and answers what the book says happens. That is what
   makes the whole of it testable without a browser, and it is the same split
   rules/conditions.js uses.

   WHAT HAS NO SOURCE YET, said plainly so nobody reads a resolver as a
   feature: nothing in this world inflicts POISON, DISEASE, or a CALTROP or
   SPIKE wound today. Caltrops are a line in the shop with no way to scatter
   them; spike growth and spike stones are not in the verse. Their rules are
   written and tested here because the Heal skill is what was asked for and
   half a skill is worse than none, and `tendTasks` will offer each of them
   the day something sets the flag. Nothing here pretends they are reachable.
   ========================================================================== */

import { featSkillMod } from "../rules/feats.js";

/* the book's table, and the two DCs that are not numbers live with the thing
   that carries them: a poison and a disease each bring their own save DC */
export const HEAL_DC = { firstAid: 15, longTerm: 15, wound: 15 };

/** "A healer's kit gives you a +2 circumstance bonus" -- and the shop row has
    said "ten uses" since goods.js was written without anything counting them. */
export const KIT_NAME = "Healer's kit";
export const KIT_BONUS = 2;
export const KIT_USES = 10;

/** "You can tend as many as six patients at a time." */
export const MAX_PATIENTS = 6;

/** how long each task takes, in the book's own words; the fight only cares
    about the three that are standard actions */
export const HEAL_TIME = {
    firstAid: { kind: "standard", minutes: 0 },
    poison:   { kind: "standard", minutes: 0 },
    caltrop:  { kind: "standard", minutes: 0 },
    spike:    { kind: "minutes",  minutes: 10 },
    disease:  { kind: "minutes",  minutes: 10 },
    longTerm: { kind: "hours",    minutes: 480 },
};

/* -------------------------------------------------------------------------
   THE KIT
   ------------------------------------------------------------------------- */

/** the first healer's kit in a satchel that still has a use left, or null.
    A kit records its remaining uses on the item itself the way a torch
    records its burn; an untouched one has never been counted and is full. */
export function kitIn(satchel) {
    const list = Array.isArray(satchel) ? satchel : [];
    for (const it of list) {
        if (!it || it.name !== KIT_NAME) continue;
        const left = it.uses == null ? KIT_USES : it.uses;
        if (left > 0) return it;
    }
    return null;
}

/** how many uses this kit has left (an untouched kit is full) */
export const kitLeft = (kit) => !kit ? 0 : (kit.uses == null ? KIT_USES : kit.uses);

/** spend one use. Returns what is left, and marks the kit spent at zero so a
    pack can say so rather than quietly going on giving +2 for ever. */
export function spendKit(kit) {
    if (!kit) return 0;
    const left = kitLeft(kit) - 1;
    kit.uses = Math.max(0, left);
    return kit.uses;
}

/* -------------------------------------------------------------------------
   THE MODIFIER
   ------------------------------------------------------------------------- */

/**
 * What a Heal check is worth for this body, with every term NAMED -- because
 * world/rolls.js exists entirely because Rose could not tell where a +2 came
 * from ("no its actually wrong Listen + 2 - 2 from wis?").
 *
 * @param o.ranks    ranks in Heal
 * @param o.wisMod   the Wisdom modifier (Heal is a Wis skill)
 * @param o.feats    the feat list; Self-Sufficient's +2 and Skill Focus (Heal)
 *                   both land through data/featEffects.js, one door
 * @param o.satchel  the pack, so a kit in it counts itself
 * @returns { ranks, wis, feats, kit, total, kitItem, terms }
 */
export function healMod(o = {}) {
    const ranks = o.ranks || 0;
    const wis = o.wisMod || 0;
    const feats = featSkillMod(o.feats || [], "Heal");
    const kitItem = o.satchel ? kitIn(o.satchel) : null;
    const kit = kitItem ? KIT_BONUS : 0;
    const terms = [];
    if (ranks) terms.push({ what: "ranks", n: ranks });
    if (wis) terms.push({ what: "Wis", n: wis });
    if (feats) terms.push({ what: "feats", n: feats });
    if (kit) terms.push({ what: "kit", n: kit });
    return { ranks, wis, feats, kit, kitItem, total: ranks + wis + feats + kit, terms };
}

/** "ranks +3, Wis +1, kit +2" for a log line, or "" when it is all zeroes */
export const modLine = (m) => ((m && m.terms) || [])
    .map((t) => t.what + " " + (t.n >= 0 ? "+" : "") + t.n).join(", ");

/* -------------------------------------------------------------------------
   THE FIVE TASKS
   ------------------------------------------------------------------------- */

/** FIRST AID. "you can make him or her stable" -- and nothing more: "A stable
    character regains no hit points but stops losing them." */
export function firstAid(total) {
    return { ok: total >= HEAL_DC.firstAid, dc: HEAL_DC.firstAid };
}

/*,,. LONG-TERM CARE ,,,
   The check is made once for the day's care, and what it buys is a doubling
   of whatever the rest was already worth. */

/** SRD Natural Healing, and the doubling long-term care lays on top of it.
    @param level       character level (never below 1)
    @param o.complete  a full day of complete rest rather than a night's sleep
    @param o.tended    somebody made the DC 15 check over these hours */
export function nightHp(level, o = {}) {
    const lvl = Math.max(1, level || 1);
    const base = o.complete ? 2 : 1;           // 1 hp/level a night, 2 for a day abed
    return lvl * base * (o.tended ? 2 : 1);    // "twice the normal rate"
}

/** the same doubling, for points of ability damage */
export function nightAbility(o = {}) {
    const base = o.complete ? 2 : 1;
    return base * (o.tended ? 2 : 1);
}

/**
 * Can this healer give THIS patient long-term care, and did it take.
 * Refuses by the book BEFORE it looks at the die, because a refusal is not a
 * failed roll and the player has to be able to tell the two apart.
 *
 * @param o.healer   whoever is tending (any object; identity is what matters)
 * @param o.patient  whoever is being tended
 * @param o.total    the healer's Heal check total for the day
 * @param o.patients how many they are already tending (the six-patient cap)
 * @param o.hours    hours of light activity given; the book asks for 8
 */
export function careGiver(o = {}) {
    const dc = HEAL_DC.longTerm;
    /* "You cannot give long-term care to yourself." */
    if (o.healer && o.patient && o.healer === o.patient)
        return { ok: false, dc, why: "self", line: "Long-term care cannot be given to oneself." };
    if ((o.patients || 0) >= MAX_PATIENTS)
        return { ok: false, dc, why: "crowded",
                 line: "Six patients is all one pair of hands can tend." };
    if ((o.hours == null ? 8 : o.hours) < 8)
        return { ok: false, dc, why: "short",
                 line: "Long-term care is eight hours of light activity. That was not eight hours." };
    const total = o.total || 0;
    return { ok: total >= dc, dc, why: total >= dc ? null : "failed",
             line: total >= dc ? "The wounds were tended through the night."
                               : "The tending did no good." };
}

/*,,. TREAT A WOUND FROM CALTROPS OR SPIKES ,,,
   Two different penalties out of one task: a caltrop halves the speed, the
   two spells take a third of it, and only the spell version has a DC that is
   not 15 (it is "the spell's save DC") or a ten minute clock. */
export const WOUND = {
    caltrop: { name: "caltrop wound", share: 0.5, dc: HEAL_DC.wound, minutes: 0,
               hurt: "moves at half speed" },
    spike:   { name: "spike wound", share: 2 / 3, dc: null, minutes: 10,
               hurt: "moves a third slower" },
};

/** what a wound does to a speed in feet */
export const woundedSpeed = (speedFt, kind) => {
    const row = WOUND[kind];
    if (!row) return speedFt;
    return Math.floor((speedFt || 0) * row.share);
};

/** dress the injuries. `saveDc` is only read for a spike wound, whose DC is
    the spell's rather than the flat 15. */
export function treatWound(total, kind, saveDc) {
    const row = WOUND[kind];
    if (!row) return { ok: false, dc: HEAL_DC.wound, why: "unknown wound" };
    const dc = row.dc != null ? row.dc : (saveDc || HEAL_DC.wound);
    return { ok: total >= dc, dc, minutes: row.minutes };
}

/*,,. TREAT POISON AND TREAT DISEASE ,,,
   One sentence, twice: "The poisoned character uses your check result or his
   or her saving throw, whichever is higher." So this is not a roll that
   replaces the save and not a bonus added to it -- it is a SECOND number the
   patient may use instead, and the difference matters on a natural 1. */

/**
 * @param o.heal   the healer's Heal check total, or null when nobody is tending
 * @param o.save   the patient's own saving throw total
 * @param o.dc     the poison's or disease's own save DC
 */
export function assistSave(o = {}) {
    const save = o.save || 0;
    const heal = o.heal == null ? null : o.heal;
    const helped = heal != null && heal > save;
    const used = helped ? heal : save;
    return { used, from: helped ? "heal" : "save", ok: used >= (o.dc || 0), dc: o.dc || 0 };
}

/* -------------------------------------------------------------------------
   WHAT THIS PATIENT NEEDS
   ------------------------------------------------------------------------- */

/**
 * The five tasks, filtered down to the ones this body could actually use
 * right now, most urgent first. The TEND tile reads this: one verb on the bar
 * that does whichever of the five the person in front of you needs, which is
 * how a healer actually works and how the book's own ordering reads.
 *
 * A patient is a plain bag of flags so this stays testable: { dying, stable,
 * poisoned, diseased, wound, hp, maxHp }.
 */
export function tendTasks(patient, o = {}) {
    const p = patient || {};
    const out = [];
    if (p.dying && !p.stable)
        out.push({ id: "firstAid", name: "First aid", dc: HEAL_DC.firstAid,
                   time: HEAL_TIME.firstAid, why: "is bleeding out" });
    if (p.poisoned)
        out.push({ id: "poison", name: "Treat poison", dc: p.poisonDc || null,
                   time: HEAL_TIME.poison, why: "has poison working in them" });
    if (p.diseased)
        out.push({ id: "disease", name: "Treat disease", dc: p.diseaseDc || null,
                   time: HEAL_TIME.disease, why: "is sick" });
    if (p.wound && WOUND[p.wound])
        out.push({ id: p.wound === "spike" ? "spike" : "caltrop",
                   name: "Dress the wound",
                   dc: WOUND[p.wound].dc,
                   time: p.wound === "spike" ? HEAL_TIME.spike : HEAL_TIME.caltrop,
                   why: WOUND[p.wound].hurt });
    /* and the slow one, which is never urgent and is the only one that is
       refused for the HEALER rather than for the patient */
    const hurt = p.hp != null && p.maxHp != null && p.hp < p.maxHp;
    if (hurt && !(o.healer && o.healer === patient))
        out.push({ id: "longTerm", name: "Long-term care", dc: HEAL_DC.longTerm,
                   time: HEAL_TIME.longTerm, why: "is wounded and would mend faster tended" });
    return out;
}
