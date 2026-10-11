/* ============================================================================
   ONE SKILL CHECK FOR EVERYONE (the map's item 8, Desktop/Systems/machine-map.md 4.2; Vera 2026-10-03,
   Desktop/V/skills-cog-table.md, move S1, sadia's check).

   Four sums counted a skill check four ways: hers in the world (world/void.js skillMod and her roller), a body's
   (world/senses.js bodySkillMod), a fighter's site by site (battle.js, featHooks.js, roster.js), and creation's page
   (steps/skills.js skillTotalOf); each counted its own terms. This is the one sum, over a plain VIEW of the body that each
   road builds for itself; the die and the line are the dice cog's (rules/dice.js), and the words are config/text.js's,
   turned from this cog's codes in one place (termWordsOf) so no road translates them its own way.

   THE BOOK (read in Chrome 2026-10-03): "Skill modifier = skill rank + ability modifier + miscellaneous modifiers", and
   "Miscellaneous modifiers include racial bonuses, armor check penalties, and bonuses provided by feats, among others"
   (Skills Summary); "having 5 or more ranks in one skill gives the character a +2 bonus on skill checks with each of its
   synergistic skills" (Using Skills, Synergy); Hide's size table (Hide). ROSE: "ranks are only granted by level"
   (09-22), so the blood's grant is a racial bonus, its own term, and never ranks; the armour check penalty and the size
   modifier on every check that takes them (the map's question 1, "Mistakes, fix by the SRD").
   ========================================================================== */
import { skillRow, classBonusesOf } from "../data/skills.js";
import { featSkillMod } from "./feats.js";
import { familiarSkillMod } from "../data/familiars.js";
import { traitMod, statWideMod } from "../data/traits.js";
import { synergyOf } from "../data/synergies.js";
import { checkTermsOf, loadOf, carriedLbOf } from "../data/carry.js";
import { hideSizeMod } from "../data/size.js";
/* her view's pounds and load, as the world weighs her (move S4: herViewOf below) */
import { sizeOfWeight } from "../data/wind.js";
import { bodyLb } from "../data/heft.js";
import { ABILITIES } from "../data/heritage.js";
import { rowSkillTermsOf } from "./conditions.js";
import { textOf } from "../config/text.js";
/* the ranks' spends (move C4): the purse a level banks in the record's classes section, and the cap the Classes
   cog answers by character level */
import { classesSectionFor, levelStatedOf, maxRank } from "./classes.js";

const WORD = { STR: "Strength", DEX: "Dexterity", CON: "Constitution", INT: "Intelligence", WIS: "Wisdom", CHA: "Charisma" };
const own = (o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : 0);

/** the ranks a view has BOUGHT in a skill, whole (the SRD: half ranks do not improve the check); never the blood's */
export const boughtRanks = (view, skill) => Math.floor(Number(own(view && view.ranks, skill)) || 0);

/**
 * A skill check's modifier, every term named by a code.
 * @param view   { rec (the record: the familiar and the rows), ranks (bought, by label), blood (the grant, by label),
 *               mods { STR, DEX, CON, INT, WIS, CHA } WITHOUT the rows' penalties (the rows are this cog's own terms, so
 *               a penalty already in a modifier would count twice), feats, traits, flaws, worn, loadAcp, prof (data/
 *               proficiency.js armourOf's answer), size, classes ({ class: level }: a class's own bonus, the druid's
 *               nature sense) }, as each road builds it
 * @param skill  the skill's label
 * @param moment the situation: the feats' and the familiar's (night, unobserved, inShadow, woods, biome, moon, bright),
 *               the synergies' limited rows (ropes, tracks...), and a row the world computes where it is asked rather
 *               than keeps on the record (dazzled: the sun's)
 * @returns { total, terms: [[n, code], ...], trained }: a zero term left out, in the book's order (ranks, the ability,
 *          then the miscellaneous); the codes "ranks", "ability:WIS", "blood", "feats", "familiar", "class:Druid",
 *          "traits",
 *          "synergy:Jump", the pack's "armour", "load" or "untrained" (data/carry.js checkTermsOf), "row:fatigued",
 *          "row:dazzled" (rules/conditions.js rowSkillTermsOf) and "size"; `trained` is whole bought ranks above 0
 */
export function checkOf(view = {}, skill, moment = {}) {
    const row = skillRow(skill);
    const ability = row ? row.ability : null;
    const terms = [];
    const add = (n, code) => { if (n) terms.push([n, code]); };
    const ranks = boughtRanks(view, skill);
    add(ranks, "ranks");
    add(ability ? Number(own(view.mods, ability)) || 0 : 0, "ability:" + ability);
    add(Number(own(view.blood, skill)) || 0, "blood");
    add(featSkillMod(view.feats || [], skill, moment), "feats");
    add(view.rec ? familiarSkillMod(view.rec, skill, moment) : 0, "familiar");
    /* a class's own bonus (data/skills.js classBonusesOf: the druid's nature sense, the Savant's every first gift) */
    for (const [n, c] of classBonusesOf(view.classes, skill)) add(n, "class:" + c);
    add(traitMod(view.traits, view.flaws, skill) + (ability ? statWideMod(view.traits, view.flaws, WORD[ability]) : 0), "traits");
    /* the synergies count BOUGHT ranks only: a bonus never makes a synergy's five (data/synergies.js names each "<from> synergy") */
    for (const [n, word] of synergyOf((s) => boughtRanks(view, s), skill, moment).terms) add(n, "synergy:" + String(word).replace(/ synergy$/, ""));
    const ct = checkTermsOf({ skill, ability, worn: view.worn || null, loadAcp: view.loadAcp || 0, prof: view.prof,
                              shield: view.shield || null, shieldsProf: view.shieldsProf || null });   // its shield too (IT1a)
    add(ct.n, ct.why);
    for (const [n, code] of rowSkillTermsOf(view.rec, skill, ability, moment)) add(n, code);
    /* the body's size as it is NOW (Rose 10-01: Enlarge and Reduce Person are a thing), Hide's own column */
    add(row && row.size ? hideSizeMod(view.size) : 0, "size");
    return { total: terms.reduce((n, t) => n + t[0], 0), terms, trained: ranks > 0 };
}

/** may this body try the skill at all: a trained-only skill wants whole BOUGHT ranks above 0 (the blood never opens it) */
export function canTry(view, skill) {
    const row = skillRow(skill);
    return !(row && row.trainedOnly) || boughtRanks(view, skill) > 0;
}

/** HER VIEW FOR THE COG, ONE BUILDER (move S4, Desktop/V/skills-cog-table.md P1, sadia's check): a record and its sheet
    (src/sheet.js), pure, read alike by creation's page and the world (void.js herSkillView): the ranks she bought, her
    blood apart, the sheet's six modifiers, her feats, traits and flaws, what she wears and is trained in (the sheet's),
    her load's check penalty (data/carry.js loadOf over the sheet's Strength, else the allocation's, and what she carries,
    as the world's herLoad), her size by her pounds (data/heft.js bodyLb over her parents' races, her sex and her look's
    heft, and what she carries, as the world's lbOf; 150 lb when they cannot be read, as there) and her classes */
export function herViewOf(self, sheet) {
    const mods = (sheet && sheet.modifiers) || null;
    const scores = (sheet && sheet.scores) || (self && self.abilities && self.abilities.allocation) || null;
    const str = scores ? scores[ABILITIES.indexOf("STR")] : 10;
    let lb = 150;
    try {
        const bl = (self && self.body && self.body.blood) || {};
        lb = bodyLb([bl.mother && bl.mother.race, bl.father && bl.father.race], ((self && self.who) || {}).gender,
                    (((self && self.body) || {}).appearance || {}).weight) + carriedLbOf(self || {});
    } catch (e) { lb = 150; }
    return {
        rec: self,
        ranks: (self && self.skills && self.skills.ranks) || {},
        blood: (sheet && sheet.hiddenSkills) || {},
        mods: Object.fromEntries(ABILITIES.map((a, i) => [a, (mods && mods[i]) || 0])),
        feats: [...((self && self.feats && self.feats.taken) || [])],
        traits: (self && self.traits) || [], flaws: (self && self.flaws) || [],
        worn: (sheet && sheet.armor) || null, loadAcp: loadOf(str, carriedLbOf(self || {})).checkPenalty || 0,
        prof: (sheet && sheet.armour) || null, shield: (sheet && sheet.shield) || null, shieldsProf: (sheet && sheet.shields) || null,
        size: sizeOfWeight(lb),
        classes: (sheet && sheet.classLevels) || {},
    };
}

/** THE ONE CODE-TO-WORD STEP (sadia's ask, 2026-10-03): checkOf's terms as [n, word], each word config/text.js's, so the
    four roads and the dice cog's one renderer (termsOf, which renders [n, word]) never translate a code their own way */
export function termWordsOf(terms) {
    const ability = (a) => (a === "STR" ? textOf("$lohTXAbilityStr") : a === "DEX" ? textOf("$lohTXAbilityDex")
        : a === "CON" ? textOf("$lohTXAbilityCon") : a === "INT" ? textOf("$lohTXAbilityInt")
        : a === "WIS" ? textOf("$lohTXAbilityWis") : a === "CHA" ? textOf("$lohTXAbilityCha") : a);
    const word = (code) => {
        const [k, q] = String(code).split(":");
        if (k === "ranks") return textOf("$lohTXTermRanks");
        if (k === "ability") return ability(q);
        if (k === "blood") return textOf("$lohTXTermBlood");
        if (k === "feats") return textOf("$lohTXTermFeats");
        if (k === "familiar") return textOf("$lohTXTermFamiliar");
        if (k === "class") return q === "Druid" ? textOf("$lohTXTermNatureSense") : q;
        if (k === "traits") return textOf("$lohTXTermTraits");
        if (k === "synergy") return textOf("$lohTXTermSynergy", { skill: q });
        if (k === "armour") return textOf("$lohTXCheckArmour");
        if (k === "load") return textOf("$lohTXCheckLoad");
        if (k === "untrained") return textOf("$lohTXCheckUntrained");
        if (k === "row") return q;
        if (k === "size") return textOf("$lohTXTermSize");
        return String(code);
    };
    return (terms || []).map(([n, code]) => [n, word(code)]);
}

/* ============================================================================
   THE RANKS SPENT (move C4, 2026-10-07; the machine map's 4.2): out of data/levelling.js word for word, their
   comments with them. A level banks the points (rules/classes.js takeRung, with skillPointsFor) and the Classes cog
   answers how high a rank may go (maxRank, the level table's column); these spend a point on a rank and give it
   back.
   ========================================================================== */

/*,,. AND THE TWO SPENDS, WHICH ARE THE ONLY WAY A RANK IS EVER BORN ,,,
   Rose's law, 2026-09-22: *"ranks are only granted by level each level up you can put a rank into a
   skill"*. Nothing else makes one -- not blood, not race, not a feat, not a subrace. Those are BONUSES,
   and a bonus never opens a trained-only skill and never counts toward a synergy's five.

   THE CAP IS THE BOOK'S: 3 + character level for a class skill, half that otherwise, and the half keeps
   its halves because the book prints 2 1/2. `isClassSkill` is the caller's to answer -- this file has no
   opinion about which list a skill is on.

   REFUSALS RATHER THAN CLAMPS. A spend that cannot be made changes nothing and says why, so a caller can
   put the reason on screen instead of silently doing something else.

   PRICE AND CAP ARE TWO QUESTIONS (d20srd.org, Skills Summary, read 2026-09-27): "Regardless of whether a skill is
   purchased as a class skill or a cross-class skill, if it is a class skill for any of your classes, your maximum
   rank equals your total character level + 3." The price is the class the level is taken in (`isClassSkill`); the
   cap is any class she carries, and a caller that knows both says so in `o.capAsClass`. Without it the one flag
   answers both, as it always did. */
export function spendRank(self, skill, isClassSkill, charLevel, o = {}) {
    if (!self || !skill) return { ok: false, why: "no skill named" };
    const sec = classesSectionFor(self);
    const purse = Math.max(0, Math.floor(sec.skillPurse || 0));
    if (purse < 1) return { ok: false, why: "no skill points left to spend" };
    const at = Math.max(1, Math.floor(charLevel || levelStatedOf(self) || 1));
    const ranks = { ...((self.skills && self.skills.ranks) || {}) };
    const had = +ranks[skill] || 0;
    const cap = maxRank(at, o && o.capAsClass != null ? !!o.capAsClass : !!isClassSkill);
    /* a cross-class rank costs the same point and buys half as much, which is what the halved cap IS */
    const step = isClassSkill ? 1 : 0.5;
    if (had + step > cap + 1e-9)
        return { ok: false, why: skill + " is capped at " + cap + " ranks at level " + at };
    ranks[skill] = had + step;
    /* a record with no skills yet takes the section, as the old field was taken (step 1's move 1) */
    if (!self.skills) self.skills = { ranks: {}, bonusLanguages: [] };
    self.skills.ranks = ranks;
    sec.skillPurse = purse - 1;
    return { ok: true, skill, ranks: ranks[skill], left: sec.skillPurse };
}

/** give a point back, for a page that lets the player change their mind before leaving */
export function refundRank(self, skill, isClassSkill) {
    if (!self || !skill) return { ok: false, why: "no skill named" };
    const ranks = { ...((self.skills && self.skills.ranks) || {}) };
    const had = +ranks[skill] || 0;
    const step = isClassSkill ? 1 : 0.5;
    if (had < step) return { ok: false, why: "nothing spent there" };
    ranks[skill] = had - step;
    if (!ranks[skill]) delete ranks[skill];
    if (!self.skills) self.skills = { ranks: {}, bonusLanguages: [] };
    self.skills.ranks = ranks;
    const sec = classesSectionFor(self);
    sec.skillPurse = Math.max(0, Math.floor(sec.skillPurse || 0)) + 1;
    return { ok: true, skill, ranks: ranks[skill] || 0, left: sec.skillPurse };
}
