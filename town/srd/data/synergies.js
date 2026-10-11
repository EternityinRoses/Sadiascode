/* ============================================================================
   SKILL SYNERGIES, THE SRD'S OWN TABLE (Rose 2026-09-27: "wire up the synergy table").

   THE RULE, verbatim (d20srd.org, Using Skills, read 2026-09-27): "It's possible for a character to have two skills
   that work well together. In general, having 5 or more ranks in one skill gives the character a +2 bonus on skill
   checks with each of its synergistic skills, as noted in the skill description. In some cases, this bonus applies
   only to specific uses of the skill in question, and not to all checks."

   ONE TABLE, ONE READER. The game had three synergies, each written out by hand where it was needed (Tumble on Jump
   in the jump code, Bluff on the disguise check, Craft on Appraise in trade.js), and the other twenty-six nowhere.
   This is the SRD's "Table: Skill Synergies", all twenty-nine rows in its own order, and synergyOf is the one reader
   both skill roads ask (her roller in world/void.js, every body's in world/senses.js bodySkillMod), so a synergy
   reaches her, every seat and every body the same way (Rose's everyone-equal law).

   RANKS, NEVER BONUSES. "5 or more ranks" is a count of ranks bought with skill points: a blood's grant, a feat or a
   +2 from another synergy never carries a character over the line (data/heritage.js and data/levelling.js say the
   same). The caller hands in a ranks reader that knows only bought ranks.

   A ROW LIMITED TO ONE USE carries `when`, a situation key the check's caller sets in its `ctx` when the check is that
   use (a Climb up a rope passes { climbingRope: true }); a check that does not name the situation does not get it.
   `on` keeps the table's own words for each row. The skill names are the game's (data/featPool.js SKILLS): the SRD's
   "Knowledge (nobility and royalty)" is the game's "Knowledge (Nobility)", and so on. Three rows land on checks that
   are class features rather than skills (wild empathy, bardic knowledge, turning undead); they wait for those checks.
   ========================================================================== */

export const SYNERGY_RANKS = 5;
export const SYNERGY_BONUS = 2;

/** the SRD's rows: 5 or more ranks in `from` gives +2 on `to`; `when` names the one use a row is limited to (null:
    every check); `on` is the table's own wording */
export const SYNERGIES = Object.freeze([
    { from: "Bluff", to: "Diplomacy", when: null, on: "Diplomacy checks" },
    { from: "Bluff", to: "Disguise", when: "inCharacter", on: "Disguise checks to act in character" },
    { from: "Bluff", to: "Intimidate", when: null, on: "Intimidate checks" },
    { from: "Bluff", to: "Sleight of Hand", when: null, on: "Sleight Of Hand checks" },
    { from: "Craft", to: "Appraise", when: "relatedCraft", on: "related Appraise checks" },
    { from: "Decipher Script", to: "Use Magic Device", when: "scroll", on: "Use Magic Device checks involving scrolls" },
    { from: "Escape Artist", to: "Use Rope", when: "bindings", on: "Use Rope checks involving bindings" },
    { from: "Handle Animal", to: "Ride", when: null, on: "Ride checks" },
    { from: "Handle Animal", to: "wild empathy", when: null, on: "wild empathy checks" },
    { from: "Jump", to: "Tumble", when: null, on: "Tumble checks" },
    { from: "Knowledge (Arcana)", to: "Spellcraft", when: null, on: "Spellcraft checks" },
    { from: "Knowledge (Architecture)", to: "Search", when: "secretDoor", on: "Search checks involving secret doors and similar compartments" },
    { from: "Knowledge (Dungeoneering)", to: "Survival", when: "underground", on: "Survival checks when underground" },
    { from: "Knowledge (Geography)", to: "Survival", when: "lostOrHazards", on: "Survival checks to keep from getting lost or for avoiding hazards" },
    { from: "Knowledge (History)", to: "bardic knowledge", when: null, on: "bardic knowledge checks" },
    { from: "Knowledge (Local)", to: "Gather Information", when: null, on: "Gather Information checks" },
    { from: "Knowledge (Nature)", to: "Survival", when: "aboveground", on: "Survival checks in aboveground natural environments" },
    { from: "Knowledge (Nobility)", to: "Diplomacy", when: null, on: "Diplomacy checks" },
    { from: "Knowledge (Religion)", to: "turn undead", when: null, on: "checks to turn or rebuke undead" },
    { from: "Knowledge (Planes)", to: "Survival", when: "otherPlanes", on: "Survival checks when on other planes" },
    { from: "Search", to: "Survival", when: "tracks", on: "Survival checks when following tracks" },
    { from: "Sense Motive", to: "Diplomacy", when: null, on: "Diplomacy checks" },
    { from: "Spellcraft", to: "Use Magic Device", when: "scroll", on: "Use Magic Device involving scrolls" },
    { from: "Survival", to: "Knowledge (Nature)", when: null, on: "Knowledge (nature) checks" },
    { from: "Tumble", to: "Balance", when: null, on: "Balance checks" },
    { from: "Tumble", to: "Jump", when: null, on: "Jump checks" },
    { from: "Use Magic Device", to: "Spellcraft", when: "decipherScroll", on: "Spellcraft checks to decipher scrolls" },
    { from: "Use Rope", to: "Climb", when: "climbingRope", on: "Climb checks involving climbing ropes" },
    { from: "Use Rope", to: "Escape Artist", when: "ropes", on: "Escape Artist checks involving ropes" },
]);

/**
 * The synergies on one check.
 * @param ranksOf  (skill) => the RANKS the roller has bought in it (never a bonus)
 * @param skill    the check's skill, in the game's name for it
 * @param ctx      the situation, for the rows limited to one use ({ climbingRope: true }, { tracks: true }...)
 * @returns { bonus, terms }  `terms` names each one for the card and the seat's line ([2, "Tumble synergy"])
 */
export function synergyOf(ranksOf, skill, ctx) {
    const terms = [];
    for (const s of SYNERGIES) {
        if (s.to !== skill) continue;
        if (s.when && !(ctx && ctx[s.when])) continue;
        if ((Number(ranksOf(s.from)) || 0) < SYNERGY_RANKS) continue;
        terms.push([SYNERGY_BONUS, s.from + " synergy"]);
    }
    return { bonus: terms.length * SYNERGY_BONUS, terms };
}
