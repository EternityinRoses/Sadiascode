/* WHICH NATURALS ARE FREE TO SWING beside steel (rules/, since move AW1: moved whole out of battle/hands.js, so the
 * attack cog asks no host's file).
 *
 * Rose, 2026-09-16: "claw is an empty hand ... you can easily use claw hand
 * crossbow, or claw dagger, or claw whatever". A claw IS a hand, so every
 * weapon held takes one claw out of the round: a one-handed weapon leaves
 * the other claw, a two-handed weapon or a main hand plus an off hand
 * leaves none. Gore, bite and tail are not hands and always stay, secondary
 * beside a manufactured weapon exactly as the routine already made them.
 *
 * Pure so the fight's routine composer and the tests read one rule. `kind`
 * is what the roster stamps on a natural; the name is the fallback for a
 * move baked before the stamp existed ("Left Claw" / "Right Claw"). */
import { kindOf } from "../data/weaponTable.js";   // a shooting weapon's hands, by its row (handsOfHeld, below)

export function freeNaturals(nats, handsHeld) {
    let claws = Math.max(0, 2 - (handsHeld | 0));
    return (nats || []).filter((n) => {
        const claw = String(n && n.kind || "").toLowerCase() === "claw"
            || (!(n && n.kind) && /claw/i.test(String(n && n.name || "")));
        if (!claw) return true;
        if (claws > 0) { claws -= 1; return true; }
        return false;
    });
}

/** How many hands the weapon in hand takes, for the claws it puts out (move AO1, the threats): none for a fist or
    nothing; a shooting weapon by its row (a bow, a light or a heavy crossbow both hands; a hand crossbow or a sling,
    whose row fires one-handed at no cost, one); two for two-handed steel; one for the rest. A natural weapon held as
    the hand's move is the caller's to count as none (it knows the body's naturals). */
export function handsOfHeld(move) {
    if (!move || move.unarmed) return 0;
    const k = kindOf(String(move.weapon || move.name || "").replace(/ \(rapid\)$/, ""));
    if (k && k.use === "projectile") return k.oneHandFire === 0 ? 1 : 2;
    return move.twoHanded ? 2 : 1;
}

/** How many hands a routine's steel takes: two for a two-handed weapon,
    one for a one-handed main, one more for an off hand. */
export function handsHeldBy(wield, off) {
    if (!wield) return 0;
    return (wield.twoHanded ? 2 : 1) + (off ? 1 : 0);
}
