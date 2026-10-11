/* ============================================================================
   THE MONK'S NUMBERS BY HER OWN LEVEL (the Classes cog's module for one class, the map's 4.3: "`rules/classes/<class>.js`
   for each class's features"; move C3, Vera 2026-10-07, Desktop/V/classes-feats-cog-table.md, sadia's check). The cog's
   featuresOf (rules/classes.js) asks it; what the fight stamps (battle/roster.js grantClass) and the world's pace
   (rules/movement.js) ask featuresOf. Her fist and her flurry (from rules/weapons.js, M3 and
   M4 of G1), her fast movement (from rules/movement.js, U3) and her AC (from grantClass, A6 and A9), each with its story;
   how each acts stays its cog's (the fist as a weapon, the feet on a move, the AC on the fighter).
   ========================================================================== */

/*,,. THE MONK'S FIST AND HER FLURRY, BY HER OWN MONK LEVEL (M3 and M4 of G1, sadia 2026-10-02; Desktop/V/g1-gifts-table.md,
   row-checked by Vera) ,,,
   SRD, Monk (d20srd.org/srd/classes/monk.htm, read in Chrome 2026-10-02), Unarmed Strike: "A monk also deals more damage
   with her unarmed strikes than a normal person would, as shown on Table: The Monk"; its Unarmed Damage column, for a
   Medium monk: 1d6 at 1st-3rd, 1d8 at 4th-7th, 1d10 at 8th-11th, 2d6 at 12th-15th, 2d8 at 16th-19th, 2d10 at 20th. Flurry
   of Blows: "this attack takes a -2 penalty, as does each other attack made that round"; "When a monk reaches 5th level,
   the penalty lessens to -1, and at 9th level it disappears." The fist was 1d6 and the penalty -2 at every level.
   test_classGifts holds both to the table as printed (data/srdClassTables.js) for every level. A Small or Large monk's
   table is the weapons' size step of this column, which no fist takes at the bake yet (named in the G1 table). */
const MONK_FIST = [[20, '2d10'], [16, '2d8'], [12, '2d6'], [8, '1d10'], [4, '1d8'], [1, '1d6']];
/** a Medium monk's unarmed damage at her monk level */
export const monkFistAt = (monkLevel) => {
  const lv = Math.max(1, Math.min(20, Math.floor(+monkLevel) || 1));
  return MONK_FIST.find(([from]) => lv >= from)[1];
};
/** the flurry's penalty on each of its blows at her monk level */
export const flurryPenaltyAt = (monkLevel) => {
  const lv = Math.floor(+monkLevel) || 1;
  return lv >= 9 ? 0 : lv >= 5 ? -1 : -2;
};

const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);
/** the Monk's Fast Movement at a monk level: +10 ft at 3rd and every three levels after, +60 at 18th */
export const monkFtAt = (monkLevel) => {
    const lv = Math.floor(num(monkLevel));
    return lv >= 3 ? 10 * Math.floor(Math.min(lv, 18) / 3) : 0;
};

/*,,. THE MONK'S AC, BY THE SRD (Monk, AC Bonus (Ex), d20srd.org/srd/classes/monk.htm, read in Chrome 2026-10-02) ,,,
   "When unarmored and unencumbered, the monk adds her Wisdom bonus (if any) to her AC. In addition, a monk gains a
   +1 bonus to AC at 5th level. This bonus increases by 1 for every five monk levels thereafter"; "These bonuses to
   AC apply even against touch attacks or when the monk is flat-footed. She loses these bonuses when she is
   immobilized or helpless, when she wears any armor, when she carries a shield, or when she carries a medium or
   heavy load." It went on in ANY armour, its note waiting for an armour system that landed on 09-02 (Vera's find,
   her armour row A6), and the level's +1 a five was never added. The armour is known here (armourClass; no
   shield exists yet), the load after the bake (loadOnFighter, beside paceUnder), and the helpless and the
   immobilized want the AC asked live (the standing-AC move, named for it). The 1d6 fist and
   armed-in-every-direction live with the fist bake and threatens/provoke. */
/** her AC bonus: her Wisdom bonus (if any) and +1 at 5th and every five monk levels after, none in armour */
export const monkAcOf = (monkLevel, wisMod, armoured) => (armoured ? 0 : Math.max(0, wisMod || 0) + Math.floor((monkLevel || 0) / 5));
