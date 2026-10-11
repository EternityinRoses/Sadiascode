/**
 * STATS AND DIFFICULTY: one page, because difficulty IS the point budget.
 *
 * Six tiers, each a whole posture toward the world: how saves work, how the AI
 * fights, and how many distribution points the body gets. The blurbs are
 * authored copy, kept verbatim including the double hyphen, the original
 * writes `--` where an em dash is meant, and the difference is visible on
 * screen.
 */

export const DIFFICULTIES = {
    "Monty Haul": {
        label: "Epic Fantasy", points: 40,
        blurb: "Very Easy -- Save Anywhere, Forgiving A.I., 40 Distribution Points",
    },
    "Beer & Pretzels": {
        label: "High Fantasy", points: 32,
        blurb: "Easy -- Save Anywhere, Forgiving A.I., 32 Distribution Points",
    },
    "Rules as Written": {
        label: "Standard Fantasy", points: 25,
        blurb: "Normal -- Save limited to Points, Punishing A.I., 25 Distribution Points",
    },
    "Gygaxian": {
        label: "Low Fantasy", points: 15,
        blurb: "Hard -- Low Fantasy, Punishing A.I. (lvl 2), 15 Distribution Points",
    },
    /* PERMADEATH (Rose 2026-09-28: "The permadeath modes should kill your characters when you die and go back to
       main menu... then unlock a 'Hall of the dead' screen"). The blurb said the one book was "erased on a total party
       wipe"; a fallen character now rests in the Hall of the Dead instead, so the copy says so. */
    "Tomb of Horrors": {
        label: "Low Fantasy", points: 15, permadeath: true,
        blurb: "Very Hard -- Permadeath: one life; a death is final, and the fallen rest in the Hall of the Dead. " +
               "Punishing A.I. (lvl 2), 15 Distribution Points",
    },
    "The Dice Decide": {
        label: "Challenge Mode", points: null, permadeath: true,          // the dice are the budget
        blurb: "Dice-rolled stats (4d6 drop lowest), permadeath rules",
    },
};

export const DIFFICULTY_DEFAULT = "Rules as Written";

/** does this difficulty end a character at their death (the Hall of the Dead's two modes) */
export const isPermadeath = (difficulty) => !!(DIFFICULTIES[difficulty] && DIFFICULTIES[difficulty].permadeath);

/** Base 8, floor 6, ceiling 18, the original's numbers. */
export const STAT_BASE = 8, STAT_FLOOR = 6, STAT_CEIL = 18;

/**
 * ROSE'S CURVE: priced FROM the current value, not BY the target. "Raising
 * past 12 costs 2" means a score already past 12 costs 2 to raise: 12→13 is
 * still 1, 14→15 is still 2, and 8→18 totals 19. The first version priced by
 * target (→13 = 2) and overcharged by one step at each break, transcribed
 * from the footnote instead of from the original's code, which the scry read
 * and settled. Lowering refunds exactly this, so raise-then-lower is
 * purse-neutral by construction: one table, no separate refund math.
 */
export const stepCost = (target) =>
    target <= 13 ? 1 : target <= 15 ? 2 : target <= 17 ? 3 : 4;

/** What an allocation has spent, summed from the same one table. */
export function spentOn(alloc) {
    let total = 0;
    for (const score of alloc) {
        for (let s = STAT_BASE + 1; s <= score; s++) total += stepCost(s);
        for (let s = STAT_BASE; s > score; s--) total -= 1;   // 8→6 refunds 1/step
    }
    return total;
}

/** ONE SET: 1d6 rolled three times, ALL THREE COUNTED -- range 3..18,
    the old-school die. Rose, 08-17, closing the day's whole dice saga:
    the "4 times" was a misspoken leftover of a mercy-discard she had
    already changed her mind about ("whoop I misspoke I was thinking of
    a mercy discard and changed my mind and forgot about it. 1d6x3").
    Nothing inside a set is ever discarded; sets are dropped whole, in
    rollPool, and nowhere else. */
export const rollSet = () => {
    const d = [0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6));
    return d[0] + d[1] + d[2];
};

/**
 * THE POOL, Rose's law, FINAL (08-17, seven passes to land it and the
 * last word is hers: "1d6x3 you're right"): each CAST rolls NINE sets
 * -- a set is 1d6 three times, all counted (rollSet above, 3..18) --
 * and the three lowest SETS are discarded: the six stats' sets plus
 * three spares, "the only time you drop extra is the extra 3". THREE
 * casts per character (ROLLS_MAX), the third stands however it lands.
 * A 17 is genuinely rare here (~1.9% per set) and 18 is the ceiling the
 * old-school die carries by itself, no drop needed.
 *
 * THE POINT IS CHANCE WITH BOTH EDGES: "The Dice Decide is supposed to
 * be chance, yes, but chance that babies you is counter intuitive... It
 * has the chance to be stronger than beer and pretzels, yes but it can
 * also be worse than tomb of horrors." The book's too-low scrap floor
 * (genuine PHB text: reroll while modifiers sum to 0 or lower, or the
 * best is 13 or lower) stays STRUCK: no minimum, no reroll-to-threshold.
 * Do not "fix" the floor back without her word. The book's ASSIGNMENT
 * right is kept whole ("assign these totals to your ability scores as
 * you see fit"): trades on the page, the rearrange answer at the forge.
 * Sorted high to low only for the eye.
 */
export function rollPool() {
    return [...Array(9)].map(rollSet).sort((a, b) => b - a).slice(0, 6);
}

export const ROLLS_MAX = 3;

/** The plate for an ability, keyed by its FULL name. */
export const ABILITY_NAMES = {
    STR: "Strength", DEX: "Dexterity", CON: "Constitution",
    INT: "Intelligence", WIS: "Wisdom", CHA: "Charisma",
};
export const abilityPlate = (short) =>
    `assets/img/stats/${ABILITY_NAMES[short]}.webp`;
