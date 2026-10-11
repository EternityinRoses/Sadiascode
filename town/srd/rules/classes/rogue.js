/* ============================================================================
   THE ROGUE'S NUMBERS BY ITS OWN LEVEL (the Classes cog's module for one class, the map's 4.3: "`rules/classes/<class>.js`
   for each class's features"; move C3, Vera 2026-10-07, Desktop/V/classes-feats-cog-table.md, sadia's check). The cog's
   featuresOf (rules/classes.js) asks it; what the fight stamps (battle/roster.js grantClass) and the world's pace
   (rules/movement.js) ask featuresOf. Moved here from grantClass with its story.
   ========================================================================== */

/* SRD Rogue sneak attack, the WHOLE table 1-20 (Rose 08-14:
   "might as well while you are at it patch in rogue sa 1-20"):
   +1d6 at 1st and every odd level after -- 1d6/2d6/3d6...10d6
   at 19th -- which is floor((level+1)/2). The engine
   carried the whole precision pipeline since the port; every
   swing of a full routine asks sneakOpening on its own, so an
   ambush's gore-claw-claw carries the dice per tooth.
   BY THE ROGUE'S OWN LEVEL (G1's R1, 2026-10-02; SRD, Rogue, Sneak Attack, read in Chrome that day: "This extra
   damage is 1d6 at 1st level, and it increases by 1d6 every two rogue levels thereafter"): it read the CHARACTER
   level, so a Rogue 1 / Fighter 4 built from Rogue threw 3d6. */
/** the sneak attack's dice at this rogue level */
export const sneakDiceAt = (rogueLevel) => Math.floor((Math.max(1, Math.min(20, Math.floor(Number(rogueLevel)) || 1)) + 1) / 2);
