/* ============================================================================
   THE WIND'S OWN RULES (Rose 09-10: the vortex sandbox, "compact the size
   relative to the world"). The SRD's Winds table (d20srd.org/srd/weather.htm,
   "Wind Effects"), read on 2026-09-10 and kept whole:

     force      speed (mph)   ranged / siege     Fort DC   by size
     light         0-10       -                  -         none
     moderate     11-20       -                  -         none
     strong       21-30       -2 / -             10        Tiny or smaller knocked down
     severe       31-50       -4 / -             15        Tiny blown away, Small knocked down,
                                                           Medium checked
     windstorm    51-74       impossible / -4    18        Small or smaller blown away, Medium
                                                           knocked down, Large and Huge checked
     hurricane    75-174      impossible / -8    20        Medium or smaller blown away, Large
                                                           knocked down, Huge checked
     tornado     175-300      impossible / imp.  30        Large or smaller blown away, Huge
                                                           knocked down, Gargantuan and Colossal
                                                           checked

   Checked: "unable to move forward against the force of the wind." Knocked
   down: "knocked prone by the force of the wind." Blown away: "knocked prone
   and rolled 1d4x10 feet, taking 1d4 points of nonlethal damage per 10
   feet." And the tornado's own sentence: creatures near one who fail are
   "sucked toward the tornado. Those who come in contact with the actual
   funnel cloud are picked up and whirled around for 1d10 rounds, taking
   6d6 points of damage per round, before being violently expelled."

   The wind SPEED comes from the vortex's field in metres per second (the
   sandbox's numbers are real; only its distances were compacted), turned
   into the book's miles per hour here. Nothing in this file rolls unless
   handed a die.
   ========================================================================== */
import { saveMade } from "../rules/dice.js";   // the one save door (Desktop/V/save-door-table.md V6)

export const MPH_PER_MS = 2.2369363;
export const SIZES = ["fine", "diminutive", "tiny", "small", "medium", "large", "huge", "gargantuan", "colossal"];

export const BANDS = [
    { key: "light",     name: "Light",     lo: 0,   hi: 10,  ranged: 0,    siege: 0,    dc: 0,
      effect: {} },
    { key: "moderate",  name: "Moderate",  lo: 11,  hi: 20,  ranged: 0,    siege: 0,    dc: 0,
      effect: {} },
    { key: "strong",    name: "Strong",    lo: 21,  hi: 30,  ranged: -2,   siege: 0,    dc: 10,
      effect: { fine: "down", diminutive: "down", tiny: "down" } },
    { key: "severe",    name: "Severe",    lo: 31,  hi: 50,  ranged: -4,   siege: 0,    dc: 15,
      effect: { fine: "blown", diminutive: "blown", tiny: "blown", small: "down", medium: "checked" } },
    { key: "windstorm", name: "Windstorm", lo: 51,  hi: 74,  ranged: null, siege: -4,   dc: 18,
      effect: { fine: "blown", diminutive: "blown", tiny: "blown", small: "blown", medium: "down",
                large: "checked", huge: "checked" } },
    { key: "hurricane", name: "Hurricane", lo: 75,  hi: 174, ranged: null, siege: -8,   dc: 20,
      effect: { fine: "blown", diminutive: "blown", tiny: "blown", small: "blown", medium: "blown",
                large: "down", huge: "checked" } },
    { key: "tornado",   name: "Tornado",   lo: 175, hi: 300, ranged: null, siege: null, dc: 30,
      effect: { fine: "blown", diminutive: "blown", tiny: "blown", small: "blown", medium: "blown",
                large: "blown", huge: "down", gargantuan: "checked", colossal: "checked" } },
];

/** the band a speed in mph falls in; above the table's top is still a tornado */
export function bandFor(mph) {
    const v = Math.max(0, mph);
    for (const b of BANDS) if (v <= b.hi) return b;
    return BANDS[BANDS.length - 1];
}
export const mphOf = (ms) => ms * MPH_PER_MS;

/** what this band does to a creature of this size when its save fails */
export const effectFor = (band, size) => (band && band.effect[size || "medium"]) || null;

/** Fortitude against the band, one creature, one round. `fortTotal` is the
    d20 already added to the modifier, `face` the die itself (a natural 20 saves and a natural 1 fails, rules/dice.js
    saveMade; a caller that hands no face is judged by the total alone); returns the effect that lands. */
export function resolve(band, size, fortTotal, face = null) {
    const effect = effectFor(band, size);
    if (!effect) return { effect: null, saved: true, dc: band.dc };
    const saved = saveMade(face, fortTotal, band.dc);
    return { effect: saved ? null : effect, saved, dc: band.dc };
}

const die = (sides, rng) => 1 + Math.floor((rng || Math.random)() * sides);
export function rollDice(n, sides, rng) {
    let total = 0; const rolls = [];
    for (let i = 0; i < n; i++) { const r = die(sides, rng); rolls.push(r); total += r; }
    return { total, rolls };
}
/** blown away: 1d4 x 10 ft, 1d4 nonlethal per 10 ft */
export function blownAway(rng) {
    const tens = die(4, rng);
    return { feet: tens * 10, nonlethal: rollDice(tens, 4, rng).total, tens };
}
/** the funnel's grip: 1d10 rounds of 6d6 */
export const funnelRounds = (rng) => die(10, rng);
export const funnelDamage = (rng) => rollDice(6, 6, rng);

/** the damage-indicator line, the sandbox's wording keyed to the book's bands */
export function windLine(mph) {
    if (mph < 11) return "still air";
    if (mph < 21) return "leaves moving, cloaks stirring";
    if (mph < 31) return "loose things skitter, arrows drift";
    if (mph < 51) return "hard to stand; the small are knocked flat";
    if (mph < 75) return "a body is knocked down; branches snap";
    if (mph < 175) return "a body is debris here; trees come down";
    return "the funnel: nothing stands";
}

/* ,,. THE POUND IS THE MEASURE (Rose 09-17: "we assigned weight to a lot of things so its not like we
   cant measure even the player") ,,,
   The book's sizes by weight, one table for creatures and for things (the SRD's Table: Creature Size and
   Scale, d20srd.org/srd/combat/movementPositionAndDistance.htm, its Weight column, read 2026-09-17):
   Fine 1/8 lb. or less; Diminutive 1/8 lb. - 1 lb.; Tiny 1 lb. - 8 lb.; Small 8 lb. - 60 lb.; Medium
   60 lb. - 500 lb.; Large 500 lb. - 2 tons; Huge 2 tons - 16 tons; Gargantuan 16 tons - 125 tons;
   Colossal 125 tons or more. So a 50 lb sack of flour is Small and blows away in a windstorm, a chest is
   Small or Medium by what it holds, a 5,200 lb maple is Huge and comes down only under the tornado band. */
export const SIZE_LB = [0.125, 1, 8, 60, 500, 4000, 32000, 250000];
export function sizeOfWeight(lb) {
    const v = Math.max(0, +lb || 0);
    for (let i = 0; i < SIZE_LB.length; i++) if (v <= SIZE_LB[i]) return SIZES[i];
    return "colossal";
}

/* THE FUNNEL'S OWN WIND, by tier and distance, CAPPED AT F1 (Rose 09-17, after watching an F4 take the whole
   cabin: "limit it to f1"). Fujita: F0 40-72 mph, F1 73-112, F2 113-157, F3 158-206, F4 207-260 (read
   2026-09-17). Tier 1 is an F0 core (the book's windstorm row), tiers 2 and 3 F1 cores (the hurricane row:
   Medium and smaller blown away, Large knocked down, Huge checked); the book's tornado row (175 mph and up)
   is out of reach under the cap. The wind falls from the core to the sky's own at the reach. */
export const TIER_MPH = { 1: 65, 2: 90, 3: 110 };
export function funnelMph(dist, core, reach, tier, ambientMph) {
    const amb = Math.max(0, +ambientMph || 0), top = Math.max(amb, TIER_MPH[tier] || TIER_MPH[1]);
    if (dist <= core) return top;
    if (dist >= reach) return amb;
    const t = (dist - core) / Math.max(1e-6, reach - core);
    return amb + (top - amb) * Math.pow(1 - t, 1.6);
}

/* A FIXED THING'S HOLD, a house rule beside the book (which gives things no save, and a rooted tree is
   not a sack): d20 + hold against the band's DC keeps it where it stands, rolled once a gust. A loose
   thing gets no roll. */
export const HOLD = { rooted: 8, nailed: 12, staked: 4 };
export function holds(band, hold, rng) { return die(20, rng) + (hold || 0) >= (band ? band.dc : 0); }
