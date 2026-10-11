/* ============================================================================
   THE POTIONS, AS ITEMS (the overnight run, 2026-09-27).

   Rose, before she slept: "it should reveal stuff missing like potions, items". It did at once. The fight has had
   a potion row since the port (battle/moves.js MOVES.potion, "Drink a potion -- standard action, provokes"), but
   no body ever held one: her rail read a counter that started at 0 ("Out of potions.", always), and a seat's
   ordered DRINK skipped the counter altogether and drank for ever. battle.js said what was owed in its own words:
   "the day potions are ITEMS, both roads gate on the satchel together." This is that day.

   THE SRD, read at the source that night (srd/magicItems/potionsAndOils.htm):
     Cure light wounds (potion)     50 gp       Cure moderate wounds (potion)   300 gp
     Cure serious wounds (potion)  750 gp
     "The caster level for a standard potion is the minimum caster level needed to cast the spell" -- so the light
     heals 1d8+1 (caster level 1), the moderate 2d8+3 (3rd), the serious 3d8+5 (5th).
     "Drinking a potion ... is a standard action ... Using a potion or oil provokes attacks of opportunity."
     "A typical potion ... consists of 1 ounce of liquid held in a ceramic or glass vial" -- weighed here at the
     tenth of a pound goods.js already gives the empty vial.
   ========================================================================== */

export const POTIONS = {
    "Potion of Cure Light Wounds":    { heal: "1d8+1", cl: 1, price: 50,  lb: 0.1 },
    "Potion of Cure Moderate Wounds": { heal: "2d8+3", cl: 3, price: 300, lb: 0.1 },
    "Potion of Cure Serious Wounds":  { heal: "3d8+5", cl: 5, price: 750, lb: 0.1 },
};

/** the Potions shelf, in the shape every other shelf in data/goods.js has */
export const POTION_STOCK = Object.fromEntries(Object.entries(POTIONS).map(([name, p]) => [name,
    { price: p.price, lb: p.lb, note: "heals " + p.heal + "; a standard action to drink, and it provokes" }]));

export const isPotion = (it) => !!(it && POTIONS[it.name]);

/** one satchel record for a potion, the way data/basket.js itemOf packs a bought row */
export const potionItem = (name) => POTIONS[name]
    ? { kind: "potion", slot: "potion", name, lb: POTIONS[name].lb, gp: POTIONS[name].price } : null;

/** every potion in a satchel, in its order */
export const potionsIn = (satchel) => (Array.isArray(satchel) ? satchel.filter(isPotion) : []);

/** the potion a name asks for: exact, a word of it ("light", "moderate"), or the whole shelf's first match */
export function potionNamed(want) {
    const w = String(want || "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
    if (!w) return null;
    const names = Object.keys(POTIONS);
    return names.find((n) => n.toLowerCase() === w)
        || names.find((n) => w.split(" ").filter((x) => x.length >= 4 && !/potion|cure|wounds/.test(x))
            .some((x) => n.toLowerCase().includes(x)))
        || (/\bpotion\b|\bcure\b|\bheal/.test(w) ? names[0] : null);
}

/**
 * TAKE ONE OUT OF A SATCHEL, for drinking. The named one when asked for; unasked, the WEAKEST that is carried,
 * so a fight that reaches for "a potion" does not pour away the serious one on a scratch. The record leaves the
 * satchel (by reference: a fighter's satchel IS the record's). Returns {name, heal, cl, ...} or null.
 */
export function takePotion(satchel, want) {
    if (!Array.isArray(satchel)) return null;
    const name = want ? potionNamed(want) : null;
    const order = Object.keys(POTIONS);
    let at = -1;
    if (name) at = satchel.findIndex((it) => it && it.name === name);
    else {
        for (const n of order) { at = satchel.findIndex((it) => it && it.name === n); if (at >= 0) break; }
    }
    if (at < 0) return null;
    const [it] = satchel.splice(at, 1);
    return { name: it.name, ...POTIONS[it.name] };
}

/** how many a fighter may drink: the potions in its satchel when it carries one, else a statblock's own count */
export const potionCount = (c) => (c && Array.isArray(c.satchel)
    ? potionsIn(c.satchel).length
    : Math.max(0, Math.floor((c && c.potions) || 0)));

/** "2 Potion of Cure Light Wounds, 1 Potion of Cure Moderate Wounds" -- the pack's potions, counted */
export function potionsLine(satchel) {
    const n = {};
    for (const it of potionsIn(satchel)) n[it.name] = (n[it.name] || 0) + 1;
    return Object.entries(n).map(([k, v]) => v + " " + k).join(", ");
}
