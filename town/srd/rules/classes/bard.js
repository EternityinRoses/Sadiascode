/* ============================================================================
   THE BARD'S NUMBERS BY HIS OWN LEVEL (the Classes cog's module for one class, the map's 4.3: "`rules/classes/<class>.js`
   for each class's features"; move C3, Vera 2026-10-07, Desktop/V/classes-feats-cog-table.md, sadia's check). The cog's
   featuresOf (rules/classes.js) asks it; what the fight stamps (battle/roster.js grantClass) and the world's pace
   (rules/movement.js) ask featuresOf. The day's carry stays rules/dayUses.js's. SRD, Bard, Bardic
   Music (d20srd.org/srd/classes/bard.htm, read in Chrome 2026-10-01): "Once per day per bard level, a bard can use his
   song or poetics to produce magical effects".
   ========================================================================== */

/* the class levels the SRD's tables run to */
const levelOf = (n) => Math.max(1, Math.min(20, Math.floor(Number(n)) || 1));

/** songs a day at this bard level */
export const musicPerDay = (bardLevel) => levelOf(bardLevel);
