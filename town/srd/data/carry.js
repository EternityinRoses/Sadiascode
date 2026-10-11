/* ============================================================================
   CARRYING CAPACITY -- SRD to the letter (Rose 08-19: "dnd has carry
   weight and I believe thats based on strength... giving the clothing
   pieces and weapons weight. I believe SRD has rulings for this").

   Table: Carrying Capacity, read verbatim from d20srd.org (08-19):
   light/medium/heavy maxima by Strength 1..29, and the Tremendous
   Strength rule above that (the 20..29 row sharing the ones digit,
   x4 for every ten points above it). Table: Carrying Loads gives the
   effects: medium = max Dex +3, check -3, run x4; heavy = max Dex +1,
   check -6, run x3; both cut speed by the SRD's own speed column.
   Past heavy is the lifting rule: up to double the heavy maximum she
   can only stagger -- no Dexterity bonus to AC, five feet a round.

   NOTE, verified against the SRD's own pages: the PHB's worn-clothes
   exemption did NOT make the SRD. The SRD sentence is "total the
   weight of all the character's items, including armor, weapons, and
   gear" -- so worn cloth weighs here, to the letter. Underwear is the
   one exception by omission: it is not an item the game lets go of,
   so it is not an item the ledger counts.
   ========================================================================== */

export const CAPACITY = [
    [0, 0, 0],                                    // Str 0 stands nothing up
    [3, 6, 10], [6, 13, 20], [10, 20, 30], [13, 26, 40], [16, 33, 50],
    [20, 40, 60], [23, 46, 70], [26, 53, 80], [30, 60, 90], [33, 66, 100],
    [38, 76, 115], [43, 86, 130], [50, 100, 150], [58, 116, 175],
    [66, 133, 200], [76, 153, 230], [86, 173, 260], [100, 200, 300],
    [116, 233, 350], [133, 266, 400], [153, 306, 460], [173, 346, 520],
    [200, 400, 600], [233, 466, 700], [266, 533, 800], [306, 613, 920],
    [346, 693, 1040], [400, 800, 1200], [466, 933, 1400],
];

/** [light, medium, heavy] maxima for a Strength score. */
export function capacityFor(str) {
    const s = Math.max(1, Math.floor(str || 10));
    if (s < CAPACITY.length) return CAPACITY[s];
    const base = 20 + (s % 10);
    const steps = Math.floor((s - base) / 10);
    return CAPACITY[base].map((v) => v * Math.pow(4, steps));
}

/* the SRD speed column (20->15, 30->20, 40->30, 50->35 ...) is
   two-thirds rounded up to the nearest five; the formula reproduces
   every printed row, and answers the bloods' off-table paces too */
export function loadedSpeed(baseFt) {
    return Math.ceil((baseFt * 2 / 3) / 5) * 5;
}

/** The load a weight is at a Strength, with the table's effects. */
/*,,. THE CHECK PENALTY, AND IT IS A NAMED LIST, NOT AN ABILITY ,,,
   Rose 2026-09-15, seeing HEAVY LOAD on the band: "look up that online that
   must fuck with some skill checks too", then "same with armor".

   BOTH WERE DEBTS THE CODE ADMITTED AND NOBODY PAID. heritage.js carries a
   checkPenalty on every armour (a gambeson -2, a breastplate -4, half-plate
   -6) with a comment beside it saying in as many words: "checkPenalty and the
   medium/heavy speed cut wait for the skill and load gates (named debts, not
   wired)". Nothing read it. She has been wearing armour and paying nothing.

   THREE THINGS THE SRD SAYS THAT THE CODE DID NOT (d20srd.org, checked rather
   than remembered, because Rose told me to look it up):

   1. IT IS A LIST, NOT AN ABILITY. "An armor check penalty ... applies to
      Balance, Climb, Escape Artist, Hide, Jump, Move Silently, Sleight of
      Hand, and Tumble checks." My gate asked whether the skill was Strength-
      or Dexterity-based, which is the right FAMILY and the wrong SET: Open
      Lock, Ride and Use Rope are all Dexterity and take nothing. A load was
      quietly costing her lockpicking.

   2. SWIM TAKES DOUBLE. "Double the normal armor check penalty is applied to
      Swim checks."

   3. ARMOUR AND LOAD DO NOT STACK. Verbatim: "If your character is wearing
      armor, use the worse figure (from armor or from load) for each category.
      Do not stack the penalties." Adding them would have been the obvious
      thing to write and would have been wrong.

   THE UNPROFICIENT CASE IS PAID NOW (A9, 2026-10-02): the SRD widens the penalty
   to attack rolls and every Str/Dex check for armour you are not trained in
   (data/proficiency.js armourOf, rules/armour.js nonproficientAcpOf); a check's
   whole answer is checkTermsOf below, the fight's attack roll its own. */
export const CHECK_PENALTY_SKILLS = [
    "Balance", "Climb", "Escape Artist", "Hide", "Jump",
    "Move Silently", "Sleight of Hand", "Tumble",
];

/**
 * What the armour and the pack cost this check, together.
 *
 * @param skill     the skill's own name, not its ability
 * @param armourAcp the worn armour's checkPenalty (negative, or 0)
 * @param loadAcp   the carried load's checkPenalty (negative, or 0)
 * @returns a NEGATIVE number, or 0 when this skill is untouched
 */
export function checkPenaltyOn(skill, armourAcp, loadAcp) {
    const swim = skill === "Swim";
    if (!swim && CHECK_PENALTY_SKILLS.indexOf(skill) < 0) return 0;
    /* THE WORSE OF THE TWO, NEVER THE SUM (SRD, verbatim above). Both arrive
       negative, so the worse is the more negative -- Math.min. */
    const worse = Math.min(armourAcp || 0, loadAcp || 0);
    return swim ? worse * 2 : worse;
}

/**
 * WHAT THE ARMOUR AND THE PACK COST ONE CHECK, AND WHY: the one rule her roll and every body's ask (A9; the SRD, Armor:
 * Armor Check Penalty, and Nonproficient with Armor Worn, read in Chrome 2026-10-02).
 *   The eight skills and Swim: checkPenaltyOn above, the worse of the armour's and the load's, Swim double, as before.
 *   Any OTHER Strength- or Dexterity-based check (Open Lock, Ride, Use Rope, a bare ability check) pays the armour's when
 *   its wearer is not trained in it, and the load never (the load's list is the eight).
 *   AND A SHIELD (IT1a, 2026-10-08; the SRD, Armor: "If a character is wearing armor and using a shield, both armor check
 *   penalties apply"; "The penalty for nonproficiency with armor stacks with the penalty for nonproficiency with shields").
 * @param o  { skill, ability, worn: the worn block or null, loadAcp: the load's (negative or 0), prof: armourOf's answer,
 *             shield: the off hand's shield block or null, shieldsProf: the sheet's { shield, tower } }
 * @returns  { n: negative or 0, why: "armour" | "load" | "untrained" | null }
 */
export function checkTermsOf(o) {
    const { skill, ability, worn, loadAcp, prof, shield, shieldsProf } = o || {};
    const armourAcp = (worn ? Math.min(0, +worn.checkPenalty || 0) : 0) + (shield ? Math.min(0, +shield.checkPenalty || 0) : 0);
    const load = Math.min(0, +loadAcp || 0);
    if (skill === "Swim" || CHECK_PENALTY_SKILLS.indexOf(skill) >= 0) {
        const n = checkPenaltyOn(skill, armourAcp, load);
        return { n, why: n ? (armourAcp && armourAcp <= load ? "armour" : "load") : null };
    }
    const ab = String(ability || "").toUpperCase();
    if (ab !== "STR" && ab !== "DEX") return { n: 0, why: null };
    const n = nonproficientAcpOf(prof, worn) + shieldNonprofOf(shield, shieldsProf);
    return { n, why: n ? "untrained" : null };
}

export function loadOf(str, lb) {
    const [L, M, H] = capacityFor(str);
    if (lb <= L) return { tier: "light", maxDex: null, checkPenalty: 0,
                          runMult: 4, slowed: false, stagger: false };
    if (lb <= M) return { tier: "medium", maxDex: 3, checkPenalty: -3,
                          runMult: 4, slowed: true, stagger: false };
    if (lb <= H) return { tier: "heavy", maxDex: 1, checkPenalty: -6,
                          runMult: 3, slowed: true, stagger: false };
    return { tier: "overloaded", maxDex: 0, checkPenalty: -6,
             runMult: 0, slowed: true, stagger: true };
}

/* THE CLOTH SLOTS, canonical: applyPick label, the door's title, and
   the appearance key that names the worn piece. The menu's doors and
   the weight ledger both read this one list. */
export const CLOTH_SLOTS = [
    ["outfit top",    "Top",    "outfitTopName"],
    ["outfit bottom", "Bottom", "outfitBottomName"],
    ["outfit shoes",  "Shoes",  "outfitShoesName"],
    ["outfit cloak",  "Cloak",  "outfitCloakName"],
    /* the hands (Rose 09-10: "also helmet and gauntlets"): the mirror
       dresses this slot already (OUTFIT_HANDS); now it has a door */
    ["outfit hands",  "Gauntlets", "outfitHandsName"],
    /* and the helmet, the other half of that 09-10 ask, built 2026-09-26 (heritage.js OUTFIT_HELMETS); menu.js
       hangs its door on the Gear tab by index, so this one is appended and the first five keep their places */
    ["outfit helmet", "Helmet", "outfitHelmetName"],
];

/* statless cloth still weighs: per-slot pounds carved from the SRD's
   own outfit rows (traveler's 5 lb, monk's 2, noble's 10) -- a top is
   a pound, legs two, shoes one, a cloak two. Coarse on purpose; the
   day garments carry their own pounds, this table retires. */
export const CLOTH_LB = {
    "outfit top": 1, "outfit bottom": 2,
    "outfit shoes": 1, "outfit cloak": 2, "outfit hands": 1, "outfit helmet": 1,
};

/* carried kit: SRD's own pound for the picks (thieves' tools 1 lb;
   the torch row reads "Torch 1 cp 1 lb.", verified 08-20) */
export const TOOL_LB = { "Thieves' Tools": 1, "Thieves' Tools, masterwork": 2, "Torch": 1 };

import { WEAPON_LB } from "./weapons.js";
/* a weapon weighed as the one item it is, in either hand (the weapons cog's 2b, rules/items.js) */
import { weaponLbOf, handItemOf } from "../rules/items.js";
import { nonproficientAcpOf, shieldNonprofOf } from "../rules/armour.js";
import { OUTFIT_TOPS, OUTFIT_BOTTOMS, OUTFIT_SHOES, OUTFIT_HANDS, OUTFIT_CLOAKS, OUTFIT_HELMETS }
    from "./heritage.js";

/* ARMOUR WEIGHS WHAT ITS ENTRY SAYS (Rose 09-10, the tooltip pass: a
   breastplate at "1 lb" from the coarse slot table was the lie the
   tooltips would have told). An outfit entry with `armor.lb` carries the
   SRD's pounds for that armour; everything else is ordinary dress and
   keeps the per-slot pound above. */
const TABLE_BY_SLOT = {
    "outfit top": OUTFIT_TOPS, "outfit bottom": OUTFIT_BOTTOMS,
    "outfit shoes": OUTFIT_SHOES, "outfit hands": OUTFIT_HANDS,
    "outfit cloak": OUTFIT_CLOAKS, "outfit helmet": OUTFIT_HELMETS,
};
export function clothLbOf(slot, name) {
    const e = name && TABLE_BY_SLOT[slot] && TABLE_BY_SLOT[slot][name];
    if (e && e.armor && e.armor.lb != null) return e.armor.lb;
    return CLOTH_LB[slot] || 0;
}

/** what one satchel entry weighs: a weapon by weapons.js, a tool by
    TOOL_LB, cloth by its entry or slot, a trinket or a mount nothing */
export function itemLbOf(it) {
    if (!it) return 0;
    /* a bought thing carries its own pound (data/basket.js), whatever shelf
       it came off; the tables below serve the records that predate it */
    if (it.lb != null)
        /* a carried chest is its own pound plus whatever is inside it
           (Rose 09-16: "chests have a base weight + whatever they have
           inside"), and what is inside weighs by this same rule */
        return it.lb + (Array.isArray(it.contents) ? it.contents.reduce((n, x) => n + itemLbOf(x), 0) : 0);
    if (it.kind === "weapon") return weaponLbOf(it);   // mithral and darkwood weigh half (rules/items.js)
    if (it.kind === "tool") return TOOL_LB[it.name] || 0;
    if (it.kind === "cloth") return clothLbOf(it.slot, it.name);
    return 0;
}

/** Everything she has, in pounds: the wielded weapon, the worn cloth
    (the SRD counts it), and the satchel. `self` is a record: the weapon and the satchel ride in its pack section
    (step 1's move 7), the worn cloth in its body (move 9); absent pieces weigh nothing. */
export function carriedLbOf(self) {
    const a = (self && self.body && self.body.appearance) || {};
    const pk = (self && self.pack) || {};
    let lb = 0;
    /* both hands, each as its item: the off hand's weapon weighed nothing here until the weapons cog's 2b */
    lb += weaponLbOf(handItemOf(pk, "weapon")) + weaponLbOf(handItemOf(pk, "offhand"));
    for (const [label, , nameKey] of CLOTH_SLOTS)
        if (a[nameKey]) lb += clothLbOf(label, a[nameKey]);
    for (const it of pk.satchel || []) {
        lb += itemLbOf(it);
    }
    return lb;
}
