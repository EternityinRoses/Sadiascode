/* ============================================================================
   THE SHEET COG: WHAT A BODY'S BLOOD AND RECORD MAKE OF IT (the machine map's 4.1, Desktop/Systems/machine-map.md;
   Rose's copy at E:\Systems). Its numbers still live in today's code (src/sheet.js sheetOf, state.js heritageOf,
   data/heritage.js) and move here when the Sheet cog moves; a rule NEW to blood and body is written here from the
   start, never into a data file (the 2026-10-07 law: a rule goes where the map puts it).

   PURE: it reads a record (a creation `{ self }` or a self) and answers. Nothing is written and nothing is drawn.
   ========================================================================== */

import { acFrom, ABILITIES } from "../data/heritage.js";   // the AC arithmetic's one owner, asked by the door below (V43)

/*,,. A CHANGELING DISGUISES ITS HORNS (Rose 2026-10-07: "Make hiding horns a changeling trait. (They still -have them-
   they just disguise them to hide)"; her popup the same minute: at will, from the Another Face menu, for "Any Changeling
   blood", anyone with a Changeling parent, full or half, no feat) ,,,
   The horns stay the body's: `horned` (data/heritage.js hasHorns, any Cambion blood) is unchanged, so a gore and every
   horn rule hold. Only the figure stops drawing them (steps/mirror.js lookOf), and the look keeps their shape and
   colour for when they show again. */

/** the two parents of a record's blood, as its body section holds them */
const parentsOf = (record) => {
    const s = record && (record.self || record);
    const b = (s && s.body && s.body.blood) || {};
    return [b.mother, b.father];
};

/** may this record hide its horns: a Changeling mother or father (the parent's line, `ethnicity`), full or half */
export function hidesHorns(record) {
    return parentsOf(record).some((p) => !!p && p.ethnicity === "Changeling");
}

/** are this record's horns hidden now: its who says so, and its blood may (the flag on any other blood hides nothing) */
export function hornsHiddenOf(record) {
    const s = record && (record.self || record);
    return !!(s && s.who && s.who.hornsHidden) && hidesHorns(record);
}

/*,,. ONE ARMOR CLASS FOR EVERY READOUT (V43; Rose 2026-10-08, her sheet's THE READ said 13 where the band said 11:
   "oooh boy.... thats interesting... see the problem here?") ,,,
   The whole sum lives once, in the body's own fighter (battle/roster.js makeFighter: acFrom's 10 + Dex + armour +
   shield, then a feat's natural armour, the traits' and flaws' landings, a monk's Wisdom; and the world's build of her
   cuts the Dexterity her load forbids). Every readout asks it here: the fighter's own numbers when there is one, else
   acFrom's honest part of the sheet, for a body no fighter can be built for yet. So her sheet, the book screen, the band
   and the fight say one number.
   AND IT NEVER SAYS A NUMBER IT DOES NOT HAVE (Vera's review of V43): a fighter that carries no touch AC has its touch
   unknown, never its whole Armor Class said as touch; with no fighter the Dexterity is the one handed in, else the
   sheet's own, and with neither the door says nothing rather than a Dexterity of 0. */
/** { ac, touchAc } of a body: its fighter's (touchAc null when the fighter carries none), or acFrom's part of its sheet
    by the Dexterity modifier handed in, else the sheet's own; null with no fighter and no Dexterity to read */
export function armorClassOf(fighter, sheet, dexMod) {
    if (fighter && Number.isFinite(fighter.ac))
        return { ac: fighter.ac, touchAc: Number.isFinite(fighter.touchAc) ? fighter.touchAc : null };
    const own = sheet && Array.isArray(sheet.modifiers) ? sheet.modifiers[ABILITIES.indexOf("DEX")] : null;
    const dex = Number.isFinite(dexMod) ? dexMod : Number.isFinite(own) ? own : null;
    if (dex == null) return null;
    return acFrom(dex, (sheet && sheet.armor) || null, (sheet && sheet.shield) || null);
}
