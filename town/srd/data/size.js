/* ============================================================================
   HOW BIG A BODY IS, AND WHAT THE BOOK PAYS IT FOR THAT (Rose 2026-09-17:
   "Hotkey... also remember grapple benefits or is debuffed by size").

   THE TABLE, copied row for row from the SRD's Table: Creature Size and Scale
   (d20srd.org/srd/combat/movementPositionAndDistance.htm, read 2026-09-17).
   Its own footnotes say what each column is for: "A creature's size modifier
   is applied to it's attack bonus and Armor Class", "See the Grapple special
   attack", "See the Hide skill".

     Size         Size mod   Grapple mod   Hide mod   Weight            Reach (tall/long)
     Fine            +8         -16          +16      1/8 lb. or less      0 / 0
     Diminutive      +4         -12          +12      1/8 lb. - 1 lb.      0 / 0
     Tiny            +2          -8           +8      1 lb. - 8 lb.        0 / 0
     Small           +1          -4           +4      8 lb. - 60 lb.       5 / 5
     Medium          +0          +0           +0      60 lb. - 500 lb.     5 / 5
     Large           -1          +4           -4      500 lb. - 2 tons    10 / 5
     Huge            -2          +8           -8      2 tons - 16 tons    15 / 10
     Gargantuan      -4         +12          -12      16 tons - 125 tons  20 / 15
     Colossal        -8         +16          -16      125 tons or more    30 / 20

   THREE DIFFERENT NUMBERS, and the book is careful to keep them apart:

   THE SPECIAL SIZE MODIFIER, which only a grapple check uses (SRD, Grapple):
   "Your attack bonus on a grapple check is: Base attack bonus + Strength
   modifier + special size modifier... Colossal +16, Gargantuan +12, Huge +8,
   Large +4, Medium +0, Small -4, Tiny -8, Diminutive -12, Fine -16. Use this
   number in place of the normal size modifier you use when making an attack
   roll." IN PLACE OF: a grapple check never pays both.

   THE ORDINARY SIZE MODIFIER, the one it replaces, which rides every attack
   roll and every Armour Class -- and runs the OTHER way, because a big body is
   easy to hit and a small one is not.

   THE OPPOSED-CHECK MODIFIER, which the shoving maneuvers use (SRD, Bull
   Rush): "You each add a +4 bonus for each size category you are larger than
   Medium or a -4 penalty for each size category you are smaller than Medium."
   Trip and Overrun say the same in their own words; Disarm and Sunder give it
   to the larger of the two instead -- "the larger combatant gets a bonus on
   the attack roll of +4 per difference in size category" -- and the smaller
   gets nothing rather than a penalty.

   The grapple column and the opposed-check bonus agree number for number at
   every row. They are still written out separately, because they come from
   different sentences, and the day one of them is house-ruled the other must
   not move with it.

   AND THE LIMITS, which are size's other half. Bull Rush: "You can only bull
   rush an opponent who is one size category larger than you, the same size, or
   smaller." Trip and Overrun repeat it word for word. Grapple lets anyone TRY
   and then takes it out of them: "You automatically lose an attempt to hold if
   the target is two or more size categories larger than you are."

   THE NINE CATEGORIES THEMSELVES ARE data/wind.js's, imported rather than
   retyped: the storm weighs a body against that list already (sizeOfWeight),
   and a body has one size, not one for the weather and another for the fight.
   ========================================================================== */
import { SIZES, sizeOfWeight } from "./wind.js";
export { SIZES, sizeOfWeight };

const MEDIUM = SIZES.indexOf("medium");

/** the row a name sits on; anything unreadable reads Medium, this game's own default body */
export function sizeIdx(size) {
    const i = SIZES.indexOf(String(size || "").toLowerCase());
    return i < 0 ? MEDIUM : i;
}
/** how many categories over Medium this is (negative under it) */
export const stepsFromMedium = (size) => sizeIdx(size) - MEDIUM;
/** how many categories THEIRS stands over MINE */
export const sizeStepsBetween = (mine, theirs) => sizeIdx(theirs) - sizeIdx(mine);
/** the name as a line of prose wants it */
export const sizeName = (size) => {
    const s = String(size || "medium").toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
};

/** the grapple check's own term (SRD: "special size modifier"), the book's table written out */
export const SPECIAL_SIZE_MOD = {
    colossal: 16, gargantuan: 12, huge: 8, large: 4, medium: 0,
    small: -4, tiny: -8, diminutive: -12, fine: -16,
};
export function grappleSizeMod(size) {
    const n = SPECIAL_SIZE_MOD[String(size || "").toLowerCase()];
    return n == null ? 0 : n;
}

/** the ordinary size modifier: attack rolls and Armour Class, and it runs the other way */
export const SIZE_MOD = {
    fine: 8, diminutive: 4, tiny: 2, small: 1, medium: 0,
    large: -1, huge: -2, gargantuan: -4, colossal: -8,
};
export function sizeAtkMod(size) {
    const n = SIZE_MOD[String(size || "").toLowerCase()];
    return n == null ? 0 : n;
}

/** the Hide skill's own column (+16 Fine down to -16 Colossal) */
export const HIDE_MOD = {
    fine: 16, diminutive: 12, tiny: 8, small: 4, medium: 0,
    large: -4, huge: -8, gargantuan: -12, colossal: -16,
};
export function hideSizeMod(size) {
    const n = HIDE_MOD[String(size || "").toLowerCase()];
    return n == null ? 0 : n;
}

/** natural reach in feet, by build: [tall, long] */
export const NATURAL_REACH = {
    fine: [0, 0], diminutive: [0, 0], tiny: [0, 0], small: [5, 5], medium: [5, 5],
    large: [10, 5], huge: [15, 10], gargantuan: [20, 15], colossal: [30, 20],
};
export function reachFt(size, build) {
    const r = NATURAL_REACH[String(size || "").toLowerCase()] || NATURAL_REACH.medium;
    return String(build || "tall").toLowerCase() === "long" ? r[1] : r[0];
}

/** THE SPACE A BODY TAKES, in feet (the SRD's Space column, read in Chrome 2026-10-08, move V16): a square's side, less
    than one square for the very small ("Very small creatures take up less than 1 square of space") */
export const SPACE_FT = {
    fine: 0.5, diminutive: 1, tiny: 2.5, small: 5, medium: 5,
    large: 10, huge: 15, gargantuan: 20, colossal: 30,
};
export const spaceFt = (size) => SPACE_FT[String(size || "").toLowerCase()] || SPACE_FT.medium;
/** a body's space NOW: its stat block's own `spaceFt` where it has one (data/mounts.js's rows), else its size's, read live
    as rules/weapons.js naturalReachOf reads reach (Rose 10-01: Enlarge and Reduce Person are a thing) */
export const spaceOf = (body) => (body && Number.isFinite(body.spaceFt) ? body.spaceFt : spaceFt(body && body.size));

/** bull rush, trip, overrun: "+4 bonus for each size category you are larger than Medium" */
export const opposedSizeMod = (size) => 4 * stepsFromMedium(size);
/** disarm and sunder: "the larger combatant gets... +4 per difference in size category", the smaller nothing */
export const largerBonus = (mine, theirs) => Math.max(0, 4 * sizeStepsBetween(theirs, mine));
/** bull rush, trip, overrun: "one size category larger than you, the same size, or smaller" */
export const withinOneStep = (mine, theirs) => sizeStepsBetween(mine, theirs) <= 1;
/** grapple: "You automatically lose an attempt to hold if the target is two or more size categories larger" */
export const autoLosesHold = (mine, theirs) => sizeStepsBetween(mine, theirs) >= 2;

/** SRD, Multiple Grapplers: "Up to four combatants can grapple a single opponent in a given round.
    Creatures that are one or more size categories smaller than you count for half, creatures that are one
    size category larger than you count double, and creatures two or more size categories larger count
    quadruple." The count is against the one being held. */
export function grapplerWeight(holderSize, heldSize) {
    const steps = sizeStepsBetween(heldSize, holderSize);   // how far the HOLDER stands over the held
    if (steps >= 2) return 4;
    if (steps === 1) return 2;
    return steps <= -1 ? 0.5 : 1;
}
