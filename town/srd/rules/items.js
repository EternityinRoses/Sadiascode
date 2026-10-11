/* ============================================================================
   ONE ITEM SHAPE FOR A WEAPON, WHEREVER IT GOES (Vera 2026-10-02, Desktop/V/item-table.md, the weapons cog's 2b; sadia's
   row check 02:4x, I1-I8 hold; the record her D2 (materials, magic) and E (ammunition) read).

   A weapon KIND is a row of data/weaponTable.js. An ITEM is one weapon somebody carries:
     { kind: "weapon", slot: "weapon", name, size, material, masterwork, enhancement, composite, count, hpLeft }
   Every field but the name is optional, and its "none" is today's meaning: size null (made for its wielder), material
   null (the kind's own), masterwork false, enhancement 0, composite 0 (a composite bow's Strength rating), count 1, hpLeft
   null (whole). An item is the same item as another when itemKey says so; the count is a stack's and never its
   identity, so two longswords that differ never trade places in a satchel.

   A PACK HOLDS ITS HANDS BY NAME, as every reader reads them (`pack.weapon`, `pack.offhand`), with the size the main hand
   was made in (`pack.weaponSize`) and the rest of each hand's item beside it (`pack.weaponItem`, `pack.offhandItem`,
   null for a plain one), so no reader changes and no old book needs a migration. takeIntoHand and stowHand are the one
   road between a satchel and a hand, hers (gear.js) and a seat's (seatGear.js) alike, and the size goes with the weapon
   both ways (her stow kept only the name until this).
   ========================================================================== */

import { costAt, weightAt } from "../data/weaponSize.js";
import { kindOf } from "../data/weaponTable.js";

const DEFAULTS = Object.freeze({ size: null, material: null, masterwork: false, enhancement: 0, composite: 0, count: 1, hpLeft: null });
const EXTRAS = ["material", "masterwork", "enhancement", "composite", "hpLeft"];

/** a weapon item in its one shape, from a satchel entry, a ground item, a loot record or a bare name; null for none */
export function itemOf(it) {
    const src = typeof it === "string" ? { name: it } : (it || {});
    if (!src.name || src.name === "Unarmed") return null;
    const out = { kind: "weapon", slot: "weapon", name: src.name };
    for (const [k, d] of Object.entries(DEFAULTS)) out[k] = src[k] != null ? src[k] : d;
    out.masterwork = !!out.masterwork;
    out.enhancement = +out.enhancement || 0;
    out.composite = +out.composite || 0;
    /* a count spent to 0 is KEPT (weapons E: running out of ammunition is real, and the entry stays the truth); any
       other missing count is one */
    out.count = out.count === 0 ? 0 : (+out.count || 1);
    return out;
}

/** what makes one item this item: every field but its count. A Medium size and no size are one size (the roster bakes an
    unsized weapon at Medium: battle/roster.js `gearSize || 'Medium'`) */
export function itemKey(it) {
    const i = itemOf(it);
    if (!i) return "";
    return [i.name, i.size && i.size !== "Medium" ? i.size : "", i.material || "", i.masterwork ? "mw" : "",
            i.enhancement || "", i.composite || "", i.hpLeft == null ? "" : i.hpLeft].join("|");
}

/** the fields that make an item more than a plain one of its size, or null for a plain one */
export function extrasOf(it) {
    const i = itemOf(it);
    if (!i) return null;
    const x = {};
    for (const k of EXTRAS) if (i[k] !== DEFAULTS[k]) x[k] = i[k];
    return Object.keys(x).length ? x : null;
}

/** the satchel's record for an item: its kind, slot and name, its size when it has one, and its extras */
export function entryOf(it) {
    const i = itemOf(it);
    if (!i) return null;
    const e = { kind: "weapon", slot: "weapon", name: i.name };
    if (i.size) e.size = i.size;
    if (i.count !== 1) e.count = i.count;
    return { ...e, ...(extrasOf(i) || {}) };
}

/** the item a pack holds in a hand ("weapon" or "offhand"), or null for an empty hand */
export function handItemOf(pk, hand = "weapon") {
    if (!pk) return null;
    if (hand === "offhand") return pk.offhand ? itemOf({ ...(pk.offhandItem || {}), name: pk.offhand }) : null;
    return pk.weapon && pk.weapon !== "Unarmed"
        ? itemOf({ size: pk.weaponSize || null, ...(pk.weaponItem || {}), name: pk.weapon }) : null;
}

/** the satchel entry a hand would take: by its itemKey when one is asked for, else the first of that name */
export function findCarried(satchel, name, key) {
    return (satchel || []).find((e) => e && e.kind === "weapon" && e.name === name && (!key || itemKey(e) === key)) || null;
}

/** put a hand's item into the satchel and empty the hand; the satchel's new entry, or null when the hand was empty */
export function stowHand(pk, hand = "weapon") {
    const it = handItemOf(pk, hand);
    if (hand === "offhand") { pk.offhand = null; pk.offhandItem = null; }
    else { pk.weapon = "Unarmed"; pk.weaponItem = null; }
    if (!it) return null;
    const e = entryOf(it);
    (pk.satchel = pk.satchel || []).push(e);
    return e;
}

/** take an item into a hand: out of the satchel when it is there (that very entry), its name, size and extras on the
    pack; what the hand held is the caller's to stow first */
export function takeIntoHand(pk, hand, it) {
    const i = itemOf(it);
    if (!i) return null;
    const bag = pk.satchel || [];
    const at = bag.indexOf(it);
    if (at >= 0) bag.splice(at, 1);
    if (hand === "offhand") {
        pk.offhand = i.name;
        const x = { ...(extrasOf(i) || {}) };
        if (i.size) x.size = i.size;
        pk.offhandItem = Object.keys(x).length ? x : null;
    } else {
        pk.weapon = i.name;
        /* a size travels with its weapon, and an unsized one is Medium (seatGear.js's own rule: "a bought one is Medium") */
        pk.weaponSize = i.size || "Medium";
        pk.weaponItem = extrasOf(i);
    }
    return i;
}

/*,,. WHAT AN ITEM COSTS AND WEIGHS (the weapons cog's 2b, I5, with D2's M7: the prices of materials and magic) ,,,
   The SRD, read in Chrome on 2026-10-02: the weapons page (masterwork "adds 300 gp to the cost of a normal weapon"; a
   composite longbow's "Each point of Strength bonus granted by the bow adds 100 gp to its cost", the shortbow's 75);
   the special materials page (adamantine "Weapon +3,000 gp" and mithral "Other items +500 gp/lb.", for both "the
   masterwork cost is included"; darkwood "add 10 gp per pound to the price of a masterwork version", an item that
   "weighs only half"; cold iron "cost twice as much to make", and "any magical enhancements cost an additional 2,000 gp";
   alchemical silver +20 gp light, +90 one-handed, +180 two-handed; mithral "weighs half as much"); and the magic weapons
   page's Table: Weapons (+1 2,000 gp, +2 8,000, +3 18,000, +4 32,000, +5 50,000), whose weapons "are also masterwork".
   The base is the kind's own row (data/weaponTable.js, sold or not) at the item's own size, by data/weaponSize.js's SRD
   arithmetic (Rose 2026-09-17: a weapon's size is chosen when it is bought; the SRD: a Large weapon costs and weighs
   double, a Small one weighs half at the same price). A plain Medium item costs and weighs what its row says, as before.
   Ammunition's own prices are E's. */
const ENHANCEMENT_GP = [0, 2000, 8000, 18000, 32000, 50000];
const SILVER_GP = { unarmed: 20, light: 20, "one-handed": 90, "two-handed": 180 };
const COMPOSITE_GP = { "Composite Longbow": 100, "Composite Shortbow": 75 };
const MASTERWORK_BY_MATERIAL = new Set(["adamantine", "mithral", "darkwood"]);

/** an item's price in gp, or null when the weapons table has no price for its kind (none, or the SRD's "special") */
export function itemGpOf(it) {
    const i = itemOf(it);
    const k = i && kindOf(i.name);
    if (!k || k.gp == null) return null;
    /* the size's price at the copper, never rounded to whole gold (data/weaponSize.js costAt rounds, which lost a dart's
       5 sp and a pouch of sling bullets' 1 sp): Large twice the row, by costAt's own step */
    const base = (+k.gp || 0) * costAt(1, i.size), lb = weightAt(k.lb || 0, i.size);
    /* a bundle of ammunition by its shots over its row's pack, masterwork 6 gp more a shot (weapons E) */
    if (k.use === "ammunition" && k.pack) {
        const each = base / k.pack + (i.masterwork ? 6 : 0);
        return Math.round(each * i.count * 100) / 100;
    }
    const m = i.material;
    let gp = m === "cold iron" ? base * 2 : base;
    if (m === "adamantine") gp += 3000;
    else if (m === "mithral") gp += 500 * lb;
    else if (m === "darkwood") gp += 300 + 10 * lb;
    else if (m === "alchemical silver") gp += SILVER_GP[k.effort] || 0;
    if (!MASTERWORK_BY_MATERIAL.has(m) && (i.masterwork || i.enhancement > 0)) gp += 300;
    if (i.enhancement > 0) gp += ENHANCEMENT_GP[Math.min(5, i.enhancement)] + (m === "cold iron" ? 2000 : 0);
    if (i.composite > 0) gp += i.composite * (COMPOSITE_GP[i.name] || 0);
    return gp;
}

/** an item's weight in lb: its row's at its own size, and half that for mithral or darkwood */
export function weaponLbOf(it) {
    const i = itemOf(it);
    const k = i && kindOf(i.name);
    if (!k) return 0;
    const lb = weightAt(k.lb || 0, i.size);
    const one = i.material === "mithral" || i.material === "darkwood" ? lb / 2 : lb;
    /* a bundle of ammunition weighs by its shots over its row's pack (weapons E): a spent one nothing */
    return k.use === "ammunition" && k.pack ? one * i.count / k.pack : one;
}

/*,,. AMMUNITION ON THE GROUND AND IN THE PACK (weapons step E, Vera's half; sadia's rows, Desktop/V/weapons-cog-table.md) ,,,
   The SRD (the weapons page, read in Chrome by sadia 2026-10-02): arrows come "in a leather quiver that holds 20 arrows",
   bolts "in a wooden case that holds 10 bolts", sling bullets "in a leather pouch that holds 10 bullets", and "normal
   ammunition that misses has a 50% chance of being destroyed or lost". Rose's popup (10-01): "lying where they fell.
   ITems are on ground as items, alt helps locate them". A bundle is one record whose `count` is its shots; one of the same
   make (itemKey: every field but the count) takes another's shots into its count, on the ground and in the pack, so a
   quiver stays one quiver. */
/** is this item a bundle of ammunition (the weapons table's own `use`) */
export function isAmmoItem(it) {
    const k = it && kindOf(it.name);
    return !!(k && k.use === "ammunition");
}
/** the ground item a dropped item joins: one of the same make within `r` metres of (x, z), else null. `ground` is the
    world's list of { it, x, z } */
export function stackFor(ground, it, x, z, r = 0.5) {
    const key = itemKey(it);
    if (!key) return null;
    return (ground || []).find((g) => g && Math.hypot(g.x - x, g.z - z) <= r && itemKey(g.it) === key) || null;
}
/** an entry of the same make takes another's count into its own (a ground stack, a pack's bundle); the entry */
export function addCount(entry, it) {
    entry.count = itemOf(entry).count + itemOf(it).count;
    return entry;
}

/*,,. A BODY THE GAME ARMS CARRIES WHAT ITS WEAPON SHOOTS (R6, Vera 2026-10-07; Desktop/V/ammo-r6-rows.md, with sadia's R1 in
   Desktop/V/arrows-srd-table.md) ,,,
   Rose, 10-02, on a bow before its first arrow: "SRD." (a shot needs carried ammunition: rules/weapons.js quiverOf); and
   10-03, of the bodies the game itself arms with a bow, a crossbow or a sling, which would stand there unable to shoot:
   "Give them ammo", the weapon's bundle with the weapon, as the Ammunition shelf sells it (the SRD's quiver of 20 arrows,
   case of 10 bolts and pouch of 10 bullets, quoted above: the row's `pack`); her own characters still buy theirs. Those
   bodies are a seat's forge (data/basket.js unpackBasket), a stood body (world/void.js standNpc) and a fight's body made
   with no satchel at all (battle/roster.js makeFighter). It takes the ammunition's NAME, which the caller asks of
   rules/weapons.js ammoNameOf: asking it here would import rules/weapons.js, whose imports come back round to this file
   (through rules/attack.js, state.js, data/goods.js and data/carry.js; a trial of it broke six suites at load). */
/** the satchel with one bundle of that ammunition ("Arrows", "Bolts", "Sling Bullets") added when it holds none of it: a
    new list, the one handed in untouched (null in, a list out). As it was for no ammunition (a weapon that shoots none),
    and for a satchel holding any entry of it, a spent one too: the game arms once and never refills */
export function armedSatchel(satchel, ammoName) {
    const k = ammoName ? kindOf(ammoName) : null;
    if (!k || k.use !== "ammunition" || !(k.pack > 0)) return satchel;
    const bag = Array.isArray(satchel) ? satchel : [];
    if (bag.some((e) => e && e.kind === "weapon" && e.name === ammoName)) return satchel;
    return [...bag, entryOf({ name: ammoName, count: k.pack })];
}
