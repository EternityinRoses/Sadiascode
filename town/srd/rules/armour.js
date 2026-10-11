/* ============================================================================
   ONE RULE PER COLUMN OF THE ARMOUR TABLE, ASKED FOR EVERY BODY (Vera 2026-10-02, Desktop/V/armour-table.md; Rose's
   popup 10-01: "Armour table (Recommended)", the module rules law; sadia's row check 02:1x).

   Step 1 (A1-A3): the worn block every reader reads today (data/heritage.js armorWorn: class, bonus, maxDex,
   checkPenalty, spellFailure, lb, and the material and DR a piece names), answered from the table's KIND and the ITEM:
     { kind, material, masterwork, stated }
   `stated` holds a value the record states over its kind's: Rose's 09-02 numbers (Pathfinder's, and the Breastplate
   heavy on her word), kept until she answers the morning file's question. Masterwork lessens the check penalty by 1
   ("Such a well-made item functions like the normal version, except that its armor check penalty is lessened by 1",
   SRD, Armor, Masterwork Armor, read in Chrome 2026-10-02).
   ========================================================================== */
import { armourKindOf } from "../data/armourTable.js";

/** the worn block for one piece of armour: today's shape, from its kind and its item; null when it names no kind */
export function wornOf(item) {
    const k = item && armourKindOf(item.kind);
    if (!k) return null;
    const st = item.stated || {};
    const has = (f) => Object.prototype.hasOwnProperty.call(st, f);
    const out = {
        kind: k.name,
        class: has("class") ? st.class : k.class,
        bonus: has("bonus") ? st.bonus : k.bonus,
        maxDex: has("maxDex") ? st.maxDex : k.maxDex,
        checkPenalty: has("checkPenalty") ? st.checkPenalty : Math.min(0, k.acp + (item.masterwork ? 1 : 0)),
        spellFailure: has("spellFailure") ? st.spellFailure : k.asf,
        lb: has("lb") ? st.lb : k.lb,
    };
    if (item.material) out.material = item.material;
    if (has("dr")) out.dr = st.dr;
    return out;
}

/*,,. ARMOUR A BODY IS NOT TRAINED IN (A9, Vera 2026-10-02; Desktop/V/a9-armour-prof-table.md) ,,,
   The SRD, Armor, Nonproficient with Armor Worn (read in Chrome that day): "A character who wears armor and/or uses a
   shield with which he or she is not proficient takes the armor's (and/or shield's) armor check penalty on attack rolls
   and on all Strength-based and Dexterity-based ability and skill checks." `prof` is data/proficiency.js armourOf's answer;
   a body with none is not judged, as a weapon is not (proficientWith). Wearing is never refused: the cost is the rule. */
/** is this proficiency trained for armour of this class ("light", "medium", "heavy"); no armour is always */
export function armourProficient(prof, cls) {
    if (!cls || !prof) return true;
    return !!prof[String(cls).toLowerCase()];
}
/** the worn armour's check penalty (negative) when its wearer is not trained in its class, else 0: on attack rolls (the
    fight) and on every Strength- and Dexterity-based check (data/carry.js checkTermsOf) */
export function nonproficientAcpOf(prof, worn) {
    if (!worn) return 0;
    return armourProficient(prof, worn.class) ? 0 : Math.min(0, +worn.checkPenalty || 0);
}

/*,,. IS IT METAL ARMOUR (A4, Vera 2026-10-02; Desktop/V/a4-materials-table.md M1) ,,,
   Asked of the table, never of a name: the piece's own material when it names a metal (the SRD's special materials page,
   d20srd.org/srd/specialMaterials.htm, read in Chrome that day: adamantine and cold iron only on what is "normally made of
   metal", mithral worked "like steel"), else its kind's `material` column (steel) or its kind's quality word `metal`
   (studded leather). The lightning's steel, a dwarf's eye for metal and, when they are built, the extreme heat's and
   cold's metal clause and the druid's ban ask it. Nothing worn is no metal. */
const METALS = new Set(["adamantine", "mithral", "cold iron"]);
export function metalWornOf(worn) {
    if (!worn) return false;
    if (worn.material && METALS.has(String(worn.material).toLowerCase())) return true;
    const k = armourKindOf(worn.kind);
    return !!k && (k.material === "steel" || k.has.includes("metal"));
}

/*,,. SLEEPING IN ARMOUR (A8, effects step 3a-3, Vera 2026-10-02; Desktop/V/effects3a3-table.md, row-checked by sadia) ,,,
   The SRD, Armor, Sleeping in Armor (d20srd.org/srd/equipment/armor.htm, read in Chrome 2026-10-02): "A character who
   sleeps in medium or heavy armor is automatically fatigued the next day... Sleeping in light armor does not cause
   fatigue." Endurance (d20srd.org/srd/feats.htm, the same day): "you may sleep in light or medium armor without becoming
   fatigued." Which kinds tire a sleeper is the table's quality word `sleep-fatigue` (medium and heavy); how heavy it is
   worn is the worn block's class, so a piece stated heavy (Rose's 09-02 Breastplate, until she answers) tires one with
   Endurance too. The feats are the body's own list, as they are (sadia's 7: no class grants Endurance today). */
export function sleepsFatiguedIn(worn, feats) {
    if (!worn) return false;
    const k = armourKindOf(worn.kind);
    if (!k || !k.has.includes("sleep-fatigue")) return false;
    if (String(worn.class || "").toLowerCase() === "heavy") return true;
    return !(Array.isArray(feats) && feats.includes("Endurance"));
}

/*,,. A SHIELD IN THE OFF HAND (IT1a, Vera 2026-10-08; Desktop/V/shield-table.md, sadia's row check 04:0x) ,,,
   The SRD, Armor (d20srd.org/srd/equipment/armor.htm, read in Chrome that night): "shields grant a shield bonus to AC";
   "Shields do not affect a character's maximum Dexterity bonus" (the tower's Max Dex 2 is the table's own exception);
   "If a character is wearing armor and using a shield, both armor check penalties apply"; spell failure, "add the two
   numbers together"; the nonproficient bearer pays the shield's check penalty "on attack rolls and on all Strength-based
   and Dexterity-based ability and skill checks", stacking with the armour's; the tower: "you take a -2 penalty on attack
   rolls because of the shield's encumbrance". Read off the table's shield rows as wornOf reads armour, for any body whose
   off hand holds one; its quality words are its rules ("attack-2" here; the buckler's, the bash's and the tower's cover
   are IT1c's). The hand itself already fills the grip (battle/roster.js bakeHand: anything named in the off hand). */
/** the off hand's shield block ({ kind, class, bonus, maxDex, checkPenalty, spellFailure, lb, has }), or null for no shield */
export function shieldOf(name, item) {
    const k = name ? armourKindOf(name) : null;
    if (!k || k.class !== "shield") return null;
    const it = item || {};
    return { ...wornOf({ kind: k.name, masterwork: !!it.masterwork, stated: it.stated, material: it.material }), has: k.has.slice() };
}
/** the shield's own term on every attack roll its bearer makes (the tower's -2), or 0 */
export const shieldAtkOf = (shield) => (shield && Array.isArray(shield.has) && shield.has.includes("attack-2") ? -2 : 0);
/** the shield's check penalty when its bearer is not trained in it (negative or 0): `shields` is the sheet's answer,
    { shield, tower } (data/proficiency.js shieldProficient and towerProficient); a body with none is not judged */
export function shieldNonprofOf(shield, shields) {
    if (!shield || !shields) return 0;
    const trained = shield.kind === "Tower Shield" ? !!shields.tower : !!shields.shield;
    return trained ? 0 : Math.min(0, +shield.checkPenalty || 0);
}
