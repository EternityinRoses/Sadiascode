/* ============================================================================
   THE BARBARIAN'S NUMBERS BY HIS OWN LEVEL (the Classes cog's module for one class, the map's 4.3: "`rules/classes/<class>.js`
   for each class's features"; move C3, Vera 2026-10-07, Desktop/V/classes-feats-cog-table.md, sadia's check). The cog's
   featuresOf (rules/classes.js) asks it; what the fight stamps (battle/roster.js grantClass) and the world's pace
   (rules/movement.js) ask featuresOf. The day's carry stays rules/dayUses.js's
   (takeDayUses, writeDayUses, restDay); how many a day is the class's. SRD, Barbarian, Rage (d20srd.org/srd/classes/
   barbarian.htm, read in Chrome 2026-10-07): "At 4th level and every four levels thereafter, he can use it one additional
   time per day (to a maximum of six times per day at 20th level)." Rose 2026-10-01: "Per day, like the SRD".
   ========================================================================== */

/* the class levels the SRD's tables run to */
const levelOf = (n) => Math.max(1, Math.min(20, Math.floor(Number(n)) || 1));

/** rages a day at this barbarian level (1 at 1st to 3rd, 2 at 4th ... 6 at 20th) */
export const ragesPerDay = (barbarianLevel) => 1 + Math.floor(levelOf(barbarianLevel) / 4);
