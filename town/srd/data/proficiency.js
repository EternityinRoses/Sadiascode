/* ============================================================================
   WHAT A BODY IS PROFICIENT WITH (Rose 2026-09-23: "classes have proficiences with weapons right? look it up
   and rig up the weapons to obey proficiences respecting multiclassing", then "fact check the srd").

   THE SRD, read on d20srd.org that day (each class page's Weapon and Armor Proficiency, Races, the Weapons
   table, Multiclass Characters), quoted:
     Barbarian, Fighter, Paladin, Ranger  "all simple and martial weapons"
     Cleric, Sorcerer                     "all simple weapons"
     Bard    "all simple weapons, plus the longsword, rapier, sap, short sword, shortbow, and whip"
     Rogue   "all simple weapons, plus the hand crossbow, rapier, sap, shortbow, and short sword"
     Druid   "club, dagger, dart, quarterstaff, scimitar, sickle, shortspear, sling, and spear"
     Monk    "club, crossbow (light or heavy), dagger, handaxe, javelin, kama, nunchaku, quarterstaff, sai,
              shuriken, siangham, and sling"
     Wizard  "the club, dagger, heavy crossbow, light crossbow, and quarterstaff"
     "A character who uses a weapon with which he or she is not proficient takes a -4 penalty on attack rolls."
     "A multiclass character gets all the class features of all his or her classes": the lists add together.
   The Weapons table sorts every weapon simple, martial or exotic: data/weaponTable.js's `prof` column (2026-10-01).

   HER RULINGS ON TOP, the same day:
     "unarmed causes aoo"  Bare hands are never a question of proficiency. What they cost is the attack of
                           opportunity they provoke, which battle.js's provoke gate already charges.
     "humans are special look up subclasses each subclass is freely proficient to their affinity weapon"
                           A Human line carries its art's weapon (data/heritage.js ETHNICITIES `trait`): Neigi
                           the rapier, Weish the greatsword, Eishu the polearm family (featEffects POLEARMS, the
                           art's own list), Forbidden bare hands. Read off either parent, the way the blood's
                           other gifts are (state.js lineageOf).
     "religion gives a free proficiency", "give each religion a weapon- make one up"
                           Each god names one (data/faith.js DEITIES `weapon`). The Blessed Lady's own law stands:
                           she gives nothing (faith.js), so hers is named and granted to no one.
     The Savant            takes every class's gift (Rose 09-17, "access to every classes' (in game) traits";
                           data/classes.js `everyGift`), so every list at once.
   The SRD's own road to more stays open: a record holding Simple Weapon Proficiency, or Martial or Exotic
   Weapon Proficiency (Name), is proficient by it.

   ASKED AND NOT YET RULED: the SRD gives Elves "the Martial Weapon Proficiency feats for the longsword, rapier,
   longbow ..., and shortbow ... as bonus feats", and LoH's no-free-feats law forbids a free racial feat. Until
   Rose rules, elven blood grants nothing here.

   A weapon this table has not sorted is not judged: no penalty, because nothing was read to charge one.
   ========================================================================== */

import { ETHNICITIES } from "./heritage.js";
import { DEITIES, MOON_GODDESS } from "./faith.js";
import { BASE_CLASSES } from "./classes.js";
import { classesOf, classLevelsStatedOf, deityOf } from "../rules/classes.js";
import { POLEARMS } from "./featEffects.js";
import { WEAPON_TABLE } from "./weaponTable.js";

/** the penalty, the SRD's number */
export const NONPROFICIENT = -4;

const key = (w) => {
    const s = String(w || "").trim().toLowerCase().replace(/\s*\(.*$/, "");
    return s === "unarmed strike" ? "unarmed" : s;
};

/** the SRD Weapons table's sorting, for every weapon: data/weaponTable.js's `prof` column (2026-10-01, every row of the
    SRD's Table: Weapons, read whole that day), keyed as this file keys a weapon */
export const WEAPON_CATEGORY = Object.fromEntries(Object.keys(WEAPON_TABLE)
    .filter((n) => WEAPON_TABLE[n].prof).map((n) => [key(n), WEAPON_TABLE[n].prof]));
export const categoryOf = (w) => WEAPON_CATEGORY[key(w)] || null;

/** each class's own list, the SRD's words above made data */
export const CLASS_WEAPONS = {
    Barbarian: { simple: true, martial: true },
    Fighter:   { simple: true, martial: true },
    Paladin:   { simple: true, martial: true },
    Ranger:    { simple: true, martial: true },
    Cleric:    { simple: true },
    Sorcerer:  { simple: true },
    Bard:      { simple: true, named: ["longsword", "rapier", "sap", "short sword", "shortbow", "whip"] },
    Rogue:     { simple: true, named: ["hand crossbow", "rapier", "sap", "shortbow", "short sword"] },
    Druid:     { named: ["club", "dagger", "dart", "quarterstaff", "scimitar", "sickle", "shortspear", "sling", "spear"] },
    Monk:      { named: ["club", "light crossbow", "heavy crossbow", "dagger", "handaxe", "javelin", "kama",
                         "nunchaku", "quarterstaff", "sai", "shuriken", "siangham", "sling"] },
    Wizard:    { named: ["club", "dagger", "heavy crossbow", "light crossbow", "quarterstaff"] },
};

/** the Human arts, by the trait each line carries */
const ART_WEAPONS = {
    "Rapier Affinity": ["rapier"],
    "Greatsword Affinity": ["greatsword"],
    "Polearm Affinity": [...POLEARMS],
    "Unarmed Affinity": ["unarmed"],
};

/**
 * Everything a record is proficient with, and why: { simple, martial, named: Set, why: Map }.
 * `rec` is any record that names its classes (path, className, classes or classLevels), and may carry
 * `feats`, `body` (its `blood`: {mother, father}, each with its ethnicity) and `deity`. The why is the first source that
 * granted each thing, for a screen to say.
 */
export function weaponsOf(rec) {
    const r = rec || {};
    const out = { simple: false, martial: false, named: new Set(), why: new Map() };
    const grant = (what, why) => {
        if (what === "simple" || what === "martial") {
            if (!out[what]) { out[what] = true; out.why.set(what, why); }
            return;
        }
        const k = key(what);
        if (!out.named.has(k)) { out.named.add(k); out.why.set(k, why); }
    };
    const classes = new Set(classesOf(r));
    for (const [c, n] of Object.entries(classLevelsStatedOf(r) || {})) if (n >= 1 && BASE_CLASSES[c]) classes.add(c);
    const every = [...classes].some((c) => BASE_CLASSES[c] && BASE_CLASSES[c].everyGift);
    for (const c of (every ? Object.keys(CLASS_WEAPONS) : classes)) {
        const list = CLASS_WEAPONS[c];
        if (!list) continue;
        const why = every ? "the Savant's every gift" : "the " + c.toLowerCase() + "'s training";
        if (list.simple) grant("simple", why);
        if (list.martial) grant("martial", why);
        for (const w of list.named || []) grant(w, why);
    }
    const blood = (r.body && r.body.blood) || {};
    for (const p of [blood.mother, blood.father]) {
        const e = p && ETHNICITIES[p.ethnicity];
        if (!e || e.race !== "Human") continue;
        for (const w of ART_WEAPONS[e.trait] || []) grant(w, "the " + p.ethnicity + " line's art");
    }
    const god = DEITIES.find((d) => d.name === deityOf(r));
    if (god && god.weapon && god.name !== MOON_GODDESS) grant(god.weapon, god.name + "'s gift");
    for (const f of ((r.feats && Array.isArray(r.feats.taken)) ? r.feats.taken : [])) {
        const s = String(f);
        if (/^simple weapon proficiency$/i.test(s)) grant("simple", "Simple Weapon Proficiency");
        const m = /^(?:martial|exotic) weapon proficiency \((.+)\)$/i.exec(s);
        if (m) grant(m[1], s);
    }
    return out;
}

/*,,. SHIELDS, BY THE SRD'S OWN CLASS PAGES (d20srd.org, "Weapon and Armor Proficiency", read 2026-09-28) ,,,
   "shields (except tower shields)": the Barbarian, Bard, Cleric, Paladin and Ranger; the Druid's the same "but must use
   only wooden ones"; the Fighter's "shields (including tower shields)"; the Monk, Rogue, Sorcerer and Wizard "not with
   any" shield. The Shield Proficiency feat gives it to anyone, and the Savant's every gift carries the Fighter's. */
export const CLASS_SHIELDS = { Barbarian: "shields", Bard: "shields", Cleric: "shields", Druid: "wooden",
                               Fighter: "tower", Paladin: "shields", Ranger: "shields" };

/** does this record carry shield proficiency: a class that gives it, or the feat */
export function shieldProficient(rec) {
    const r = rec || {};
    const classes = new Set(classesOf(r));
    for (const [c, n] of Object.entries(classLevelsStatedOf(r) || {})) if (n >= 1 && BASE_CLASSES[c]) classes.add(c);
    if ([...classes].some((c) => BASE_CLASSES[c] && BASE_CLASSES[c].everyGift)) return true;
    if ([...classes].some((c) => CLASS_SHIELDS[c])) return true;
    return ((r.feats && Array.isArray(r.feats.taken)) ? r.feats.taken : []).some((f) => /^shield proficiency$/i.test(String(f)));
}

/** does this record carry tower shield proficiency (move F5b): the Fighter's "shields (including tower shields)", the
    Savant's every gift (the Fighter's), or the Tower Shield Proficiency feat ("Fighters automatically have Tower Shield
    Proficiency as a bonus feat", d20srd.org feats.htm) */
export function towerProficient(rec) {
    const r = rec || {};
    const classes = new Set(classesOf(r));
    for (const [c, n] of Object.entries(classLevelsStatedOf(r) || {})) if (n >= 1 && BASE_CLASSES[c]) classes.add(c);
    if ([...classes].some((c) => BASE_CLASSES[c] && BASE_CLASSES[c].everyGift)) return true;
    if ([...classes].some((c) => CLASS_SHIELDS[c] === "tower")) return true;
    return ((r.feats && Array.isArray(r.feats.taken)) ? r.feats.taken : []).some((f) => /^tower shield proficiency$/i.test(String(f)));
}

/*,,. ARMOUR, BY THE SRD'S OWN CLASS PAGES (A9, Vera 2026-10-02; Desktop/V/a9-armour-prof-table.md, sadia's row check) ,,,
   d20srd.org, each class page's "Weapon and Armor Proficiency", read in Chrome that day: the Barbarian "light armor, medium
   armor"; the Bard "light armor" (the Armor Proficiency (Medium) feat's Special names bards too; the class's own page is
   taken, light); the Cleric "all types of armor (light, medium, and heavy)"; the Druid "light and medium armor" (its metal
   ban is a class feature of its own, not built); the Fighter "all armor (heavy, medium, and light)"; the Paladin "all types
   of armor (heavy, medium, and light)"; the Ranger "light armor"; the Rogue "light armor"; the Monk "not proficient with
   any armor"; the Sorcerer and the Wizard "not proficient with any type of armor". The feats nest (medium wants light,
   heavy wants both), so a class trained in a heavier kind is trained in the lighter ones. A record holding Armor
   Proficiency (Light), (Medium) or (Heavy) is trained in that kind (data/featPool.js offers them since move F5b, one row
   aimed at a kind: Rose 10-06, "all the missing book feats"). The Savant's every gift carries the Fighter's. The rule
   that reads this is rules/armour.js. */
export const CLASS_ARMOUR = { Barbarian: "medium", Bard: "light", Cleric: "heavy", Druid: "medium", Fighter: "heavy",
                              Paladin: "heavy", Ranger: "light", Rogue: "light" };   // the Monk, Sorcerer and Wizard: none
const ARMOUR_STEPS = ["light", "medium", "heavy"];

/** what armour a record is trained in, and why: { light, medium, heavy, why: Map } (as weaponsOf answers weapons) */
export function armourOf(rec) {
    const r = rec || {};
    const out = { light: false, medium: false, heavy: false, why: new Map() };
    const grant = (k, why) => { if (!out[k]) { out[k] = true; out.why.set(k, why); } };
    const classes = new Set(classesOf(r));
    for (const [c, n] of Object.entries(classLevelsStatedOf(r) || {})) if (n >= 1 && BASE_CLASSES[c]) classes.add(c);
    const every = [...classes].some((c) => BASE_CLASSES[c] && BASE_CLASSES[c].everyGift);
    for (const c of (every ? Object.keys(CLASS_ARMOUR) : classes)) {
        const top = CLASS_ARMOUR[c];
        if (!top) continue;
        const why = every ? "the Savant's every gift" : "the " + c.toLowerCase() + "'s training";
        for (const k of ARMOUR_STEPS.slice(0, ARMOUR_STEPS.indexOf(top) + 1)) grant(k, why);
    }
    for (const f of ((r.feats && Array.isArray(r.feats.taken)) ? r.feats.taken : [])) {
        const m = /^armou?r proficiency \((light|medium|heavy)\)$/i.exec(String(f));
        if (m) grant(m[1].toLowerCase(), String(f));
    }
    return out;
}

/** proficient with this weapon? Bare hands always (her ruling); an unsorted weapon is not judged. */
export function proficientWith(prof, weapon) {
    const k = key(weapon);
    if (!k || k === "unarmed") return true;
    if (!prof) return true;
    if (prof.named.has(k)) return true;
    const cat = categoryOf(k);
    if (!cat) return true;
    return (cat === "simple" && prof.simple) || (cat === "martial" && prof.martial);
}

/** what the attack roll pays for this weapon in these hands: 0, or the SRD's -4 */
export const proficiencyPenalty = (prof, weapon) => (proficientWith(prof, weapon) ? 0 : NONPROFICIENT);

/** a short line for a screen: why a body may use it, or what it costs them */
export function proficiencyNote(prof, weapon) {
    const k = key(weapon);
    if (!k || k === "unarmed") return null;
    if (!proficientWith(prof, k)) return "not proficient: " + NONPROFICIENT + " to hit";
    const cat = categoryOf(k);
    return (prof && (prof.why.get(k) || (cat && prof.why.get(cat)))) || null;
}
