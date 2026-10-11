/* ============================================================================
   HER OWN POUNDS (Rose 2026-09-17: "we assigned weight to a lot of things so
   its not like we cant measure even the player"). The book's bodies by race
   and sex: the SRD's Table: Random Height and Weight (d20srd.org/srd/
   description.htm, read on 2026-09-17), kept whole for the stock Harpine has:

     Human, male       4' 10"   +2d10   120 lb.   x(2d4) lb.
     Human, female     4' 5"    +2d10    85 lb.   x(2d4) lb.
     Elf, male         4' 5"    +2d6     85 lb.   x(1d6) lb.
     Elf, female       4' 5"    +2d6     80 lb.   x(1d6) lb.
     Half-elf, male    4' 7"    +2d8    100 lb.   x(2d4) lb.
     Half-elf, female  4' 5"    +2d8     80 lb.   x(2d4) lb.

   "The dice roll given in the Height Modifier column determines the
   character's extra height beyond the base height. That same number
   multiplied by the dice roll or quantity given in the Weight Modifier
   column determines the character's extra weight beyond the base weight."

   The doll's heft dial (appearance.weight, 0..1: Spare, Middling, Full,
   Heavy) stands in for those two rolls: 0 is the lightest body the dice
   allow, 1 the heaviest. A Shade or a Cambion is weighed by the blood that
   made it: two elven parents on the elven row, one of each on the half-elf's,
   anything else on the human's. Nothing here rolls.
   ========================================================================== */

/** [base lb, height dice [n, sides], weight dice [n, sides]] */
export const WEIGHT_ROWS = {
    human:   { male: [120, [2, 10], [2, 4]], female: [85, [2, 10], [2, 4]] },
    elf:     { male: [85,  [2, 6],  [1, 6]], female: [80, [2, 6],  [1, 6]] },
    halfelf: { male: [100, [2, 8],  [2, 4]], female: [80, [2, 8],  [2, 4]] },
};

/** which row two parents' races put a child on */
export function rowOf(races) {
    const kin = (races || []).filter(Boolean).map((r) => (String(r).toLowerCase() === "elf" ? "elf" : "human"));
    if (!kin.length) return "human";
    if (kin.every((r) => r === "elf")) return "elf";
    return kin.every((r) => r === "human") ? "human" : "halfelf";
}

/** the lightest and heaviest body the row's dice allow */
export function weightSpan(row, gender) {
    const r = (WEIGHT_ROWS[row] || WEIGHT_ROWS.human)[gender === "male" ? "male" : "female"];
    const [base, [hn, hs], [wn, ws]] = r;
    return { lo: base + hn * wn, hi: base + hn * hs * wn * ws };
}

/** her pounds: the row's span at the heft dial (0..1) */
export function bodyLb(races, gender, heft) {
    const { lo, hi } = weightSpan(rowOf(races), gender);
    const t = Math.max(0, Math.min(1, heft == null ? 0.35 : (+heft || 0)));
    return Math.round(lo + (hi - lo) * t);
}
