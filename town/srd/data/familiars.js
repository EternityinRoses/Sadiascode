/* ============================================================================
   FAMILIARS. The ten the book offers, and what each one lends its master.

   Rose, 2026-09-19: *"before spells... familiar selection. Just wire in the srd
   familiars with no plumbing and we'll tackle it later."*

   THAT WAS 2026-09-19, AND EVERY GIFT IS GRANTED NOW (Rose 2026-09-28: "in
   character creation the familiars dont give me the stats... fix that"). The
   SRD: a familiar's special abilities "apply only when the master and familiar
   are within 1 mile of each other", and this game gives the beast no body to
   wander off with, so it is always within the mile. familiarSkillMod,
   familiarSaveMod and familiarHp below read the `grants` shape: the sheet's hit
   points (state.js heritageOf), the fight's builder (battle/roster.js), her
   checks and a seat's (world/void.js, world/senses.js) and the creation pages
   all ask them. The hawk's gift is counted in bright light and the owl's in
   shadows; where no light can be asked (a creation page) neither is in the
   flat sum, and familiarBest says what it would be.

   WHAT IS NOT MODELLED, and is the rest of the familiar rules: the familiar's
   own stat block, Alertness, improved evasion, share spells, empathic link,
   deliver touch spells, speak with master at 5th, spell resistance at 11th,
   and the XP cost of losing one. None of that is here. This file is the
   choosing, not the creature.
   ========================================================================== */

/*,,. WHO GETS ONE ,,,
   The book's two, plus the Savant -- Rose, 2026-09-19: *"savant is technically
   ..."*, and the class datum finishes the sentence for him. The Savant is
   "able to get access to every classes' (in game) traits" (his ruling,
   data/classes.js), it already casts on INT with `BOOK_KIND: "book"`, and it
   walks with the barbarian's fast movement for exactly this reason: a class
   feature is a class feature, and the familiar is the wizard's. Leaving it out
   would have been the one class trait the Savant was quietly refused. */
import { familiarStatedOf } from "../rules/classes.js";
export const FAMILIAR_CLASSES = ["Wizard", "Sorcerer", "Savant"];

/** does this record get to choose one at all */
export const getsFamiliar = (paths) =>
    (Array.isArray(paths) ? paths : [paths]).some((p) => FAMILIAR_CLASSES.includes(p));

/**
 * The ten basic familiars (SRD 3.5, Sorcerers & Wizards). `grants` is the
 * master's benefit, in the book's own words; `kind`/`what`/`amount` is the
 * same fact in a shape something could one day read.
 *
 * Checked 2026-09-19 against three sources that agreed line for line:
 * d20srd.org's Sorcerers & Wizards page, dandwiki's SRD:Familiars, and
 * rpgbot's transcription of the same table.
 */
export const FAMILIARS = [
    { id: "bat",    name: "Bat",    blurb: "A small hunter that reads the dark by its echo.",
      grants: "Master gains a +3 bonus on Listen checks",
      kind: "skill", what: "Listen", amount: 3 },
    { id: "cat",    name: "Cat",    blurb: "Silent on its feet, and unimpressed by you.",
      grants: "Master gains a +3 bonus on Move Silently checks",
      kind: "skill", what: "Move Silently", amount: 3 },
    { id: "hawk",   name: "Hawk",   blurb: "Eyes for the long light; it sees what you cannot.",
      grants: "Master gains a +3 bonus on Spot checks in bright light",
      kind: "skill", what: "Spot", amount: 3, when: "bright light" },
    { id: "lizard", name: "Lizard", blurb: "It goes up a wall the way you go along a road.",
      grants: "Master gains a +3 bonus on Climb checks",
      kind: "skill", what: "Climb", amount: 3 },
    { id: "owl",    name: "Owl",    blurb: "The hawk's opposite number: it hunts where the light fails.",
      grants: "Master gains a +3 bonus on Spot checks in shadows",
      kind: "skill", what: "Spot", amount: 3, when: "shadows" },
    { id: "rat",    name: "Rat",    blurb: "It has survived everything, and means to go on doing so.",
      grants: "Master gains a +2 bonus on Fortitude saves",
      kind: "save", what: "Fort", amount: 2 },
    { id: "raven",  name: "Raven",  blurb: "It knows what a thing is worth, and it can say so.",
      grants: "Master gains a +3 bonus on Appraise checks. A raven familiar can speak one "
            + "language of its master's choice as a supernatural ability",
      kind: "skill", what: "Appraise", amount: 3 },
    { id: "snake",  name: "Snake",  blurb: "A tiny viper, coiled somewhere about you.",
      grants: "Master gains a +3 bonus on Bluff checks",
      kind: "skill", what: "Bluff", amount: 3 },
    { id: "toad",   name: "Toad",   blurb: "Unhurried, unlovely, and it keeps you alive.",
      grants: "Master gains +3 hit points",
      kind: "hp", what: "hit points", amount: 3 },
    { id: "weasel", name: "Weasel", blurb: "All nerve and no patience; it moves before you do.",
      grants: "Master gains a +2 bonus on Reflex saves",
      kind: "save", what: "Ref", amount: 2 },
];

/** one familiar by id, or null */
export const familiarOf = (id) => FAMILIARS.find((f) => f.id === id) || null;

/** the familiar a record keeps, or null */
export const familiarGiftOf = (self) => (familiarStatedOf(self) ? familiarOf(familiarStatedOf(self)) : null);

/**
 * A familiar's gift on a skill (Rose 2026-09-28). `ctx.bright` is the light the check is made in: the hawk's gift
 * counts only when it is true (bright light), the owl's only when it is false (shadows); left out, neither counts.
 */
export function familiarSkillMod(self, skill, ctx) {
    const f = familiarGiftOf(self);
    if (!f || f.kind !== "skill" || String(f.what).toLowerCase() !== String(skill || "").toLowerCase()) return 0;
    if (f.when === "bright light") return ctx && ctx.bright === true ? f.amount : 0;
    if (f.when === "shadows") return ctx && ctx.bright === false ? f.amount : 0;
    return f.amount;
}
/** the gift on a skill in its own light: what a page shows as "more in the right light" */
export function familiarBest(self, skill) {
    const f = familiarGiftOf(self);
    return f && f.kind === "skill" && String(f.what).toLowerCase() === String(skill || "").toLowerCase() ? f.amount : 0;
}
/** a familiar's gift on a save: "fort", "ref" or "will" */
export function familiarSaveMod(self, save) {
    const f = familiarGiftOf(self);
    return f && f.kind === "save" && String(f.what).toLowerCase() === String(save || "").toLowerCase() ? f.amount : 0;
}
/** a familiar's gift in hit points (the toad's) */
export function familiarHp(self) {
    const f = familiarGiftOf(self);
    return f && f.kind === "hp" ? f.amount : 0;
}
/**
 * Stamp the gift on a fighter the way a feat's passive half is stamped (battle/roster.js grantFeats): the saves. Hit
 * points are already the sheet's (state.js heritageOf), and a gift on a skill is the skills cog's familiar term
 * (rules/skills.js checkOf over the fighter's view, which keeps the familiar: the skills cog's move S5). A fight knows no
 * light, so the hawk's and the owl's are left to the world's own checks.
 */
export function applyFamiliarSheet(f, sheet) {
    const self = sheet && sheet.familiar ? { familiar: sheet.familiar } : null;
    if (!f || !self) return f;
    f.saveMod = f.saveMod || { fort: 0, ref: 0, will: 0 };
    f.saveMod.fort += familiarSaveMod(self, "fort");
    f.saveMod.ref += familiarSaveMod(self, "ref");
    f.saveMod.will += familiarSaveMod(self, "will");
    return f;
}
