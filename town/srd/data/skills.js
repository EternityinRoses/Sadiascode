/* ============================================================================
   THE SKILLS, A ROW EACH (the skills cog, the map's item 8, move S1; Vera 2026-10-03, Desktop/V/skills-cog-table.md,
   sadia's check). Each row's key ability and the page order are data/featPool.js SKILLS' (the list stays there for this
   move: K6, the list out of the feat pool, is a later one). The two columns that list never had are the SRD's own, from
   every skill's page header (d20srd.org/srd/skills/<skill>.htm, read in Chrome 2026-10-03):
     trainedOnly  "Trained Only": Decipher Script, Disable Device, Handle Animal, Knowledge (every one), Open Lock,
                  Profession, Sleight of Hand, Speak Language, Spellcraft, Tumble and Use Magic Device
     size         Hide's "size bonus or penalty on Hide checks depending on its size category" (data/size.js HIDE_MOD)
   The armour check penalty's list is data/carry.js CHECK_PENALTY_SKILLS (the book's, and Swim's "double the normal armor
   check penalty and encumbrance penalty" with it), asked through checkTermsOf, so it is not kept a second time here.
   ========================================================================== */
import { SKILLS } from "./featPool.js";
import { BASE_CLASSES } from "./classes.js";

const TRAINED_ONLY = new Set(["Decipher Script", "Disable Device", "Handle Animal", "Open Lock", "Profession",
    "Sleight of Hand", "Speak Language", "Spellcraft", "Tumble", "Use Magic Device"]);

/** every skill's row, by its label */
export const SKILL_ROWS = Object.freeze(Object.fromEntries(SKILLS.map((s) => [s.label, Object.freeze({
    label: s.label,
    ability: s.ability,
    trainedOnly: TRAINED_ONLY.has(s.label) || s.label.startsWith("Knowledge"),
    size: s.label === "Hide",
})])));

/** a skill's row by its label, or null for a name the table does not hold (and never an inherited key) */
export const skillRow = (label) => (Object.prototype.hasOwnProperty.call(SKILL_ROWS, label) ? SKILL_ROWS[label] : null);

/* A CLASS'S OWN BONUS ON A SKILL (the skills cog, move S5's C1; K16: it was the fighter's alone, battle/roster.js
   knNatureMod and survivalMod, and no world check counted it). The SRD's class pages, read in Chrome 2026-10-03: the
   Druid's Nature Sense (Ex), at 1st level (d20srd.org/srd/classes/druid.htm): "A druid gains a +2 bonus on Knowledge
   (nature) and Survival checks." The Savant takes every class's first-level gifts (data/classes.js everyGift; Rose 09-17),
   as the fight grants them (battle/roster.js grantClass: "do I hold this class, or am I the savant"). */
export const CLASS_SKILL_BONUSES = Object.freeze({
    Druid: Object.freeze({ "Knowledge (Nature)": 2, Survival: 2 }),
});

/** what a body's classes ({ class: level }) add to one skill: [[n, class], ...] for each class it holds a level in, every
    one for the Savant */
export function classBonusesOf(classes, skill) {
    const held = classes || {};
    const lv = (c) => (Object.prototype.hasOwnProperty.call(held, c) ? +held[c] || 0 : 0);
    const every = Object.keys(held).some((c) => BASE_CLASSES[c] && BASE_CLASSES[c].everyGift && lv(c) >= 1);
    const out = [];
    for (const [c, row] of Object.entries(CLASS_SKILL_BONUSES)) {
        if (!(every || lv(c) >= 1)) continue;
        const n = Object.prototype.hasOwnProperty.call(row, skill) ? row[skill] : 0;
        if (n) out.push([n, c]);
    }
    return out;
}
