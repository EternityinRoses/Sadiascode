/* ============================================================================
   THE SHADOWDANCER'S NUMBERS BY ITS OWN LEVEL (the Classes cog's module for one class, the map's 4.3: "`rules/classes/
   <class>.js` for each class's features"; move R6, sadia 2026-10-08, Vera's yes 22:5x). The well its Shadow Jump draws on
   lived in world/shadow.js, where the Feats cog's shadow-step gate (rules/feats.js shadowStepOf) could not ask it without
   loading the world's clock; the world now asks it here (world/shadow.js dailyJumpFeet), and so does the gate.
   ========================================================================== */

/*,,. SHADOW JUMP'S DAILY WELL, BY SHADOWDANCER LEVEL ,,,
   Moved word for word, its numbers unchanged (move R6): 0 under 4th, 40 ft at 4th, doubling every two levels past that.
   The SRD's own table (d20srd.org/srd/prestigeClasses/shadowdancer.htm) reads "Shadow jump 20 ft." at 4th, then "40 feet at
   6th, 80 feet at 8th, and 160 feet at 10th"; that change is its own move (R6b), so one number moves at a time. */
/** the feet a Shadowdancer may shadow jump in a day at its Shadowdancer level: 0 under 4th */
export function shadowJumpFtAt(sdLevels) {
    const n = Math.floor(sdLevels || 0);
    if (n < 4) return 0;
    return 40 * Math.pow(2, Math.floor((n - 4) / 2));
}
