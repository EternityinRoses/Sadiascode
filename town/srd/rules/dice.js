/* ============================================================================
   THE DICE COG (the machine map's 5.9, its item 6, move 6a; Desktop/V/dice-cog-table.md, row-checked by Vera):
   the die itself, the Moon's Eye hook on it, the percentile, and the one renderer of a roll's named terms. Every road
   rolls here: the fight (battle.js, featHooks.js), the world (void.js, rolls.js), trade and the previews. Moved whole
   on 2026-10-03 from battle/dice.js and world/rolls.js termsOf; nothing changed in play.
   ========================================================================== */
import { textOf } from '../config/text.js';

// Dice notation roller: "2d6+3", "1d8", "1d10+3"
export function roll(notation) {
  const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(notation.replace(/\s/g, ''));
  if (!m) throw new Error(`bad dice notation: ${notation}`);
  const count = +m[1];
  const sides = +m[2];
  const mod = m[3] ? +m[3] : 0;
  const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
  const total = rolls.reduce((a, b) => a + b, 0) + mod;
  const modText = mod ? (mod > 0 ? `+${mod}` : `${mod}`) : '';
  return { total, rolls, mod, text: `[${rolls.join(',')}]${modText}` };
}

/*,,. THE MOON'S EYE (Rose 2026-09-18, the Lunari's third quarter: "One free reroll for any dice roll including
   other people's dice (divination)") ,,,
   ONE HOOK, CONSUMED BY THE NEXT d20 ANYWHERE. A declaration arms `luck`; the next die rolled by anybody --
   her attack, a guard's Spot, a monster's save -- is rolled twice, the hook says which of the two stands, and
   the hook clears itself. Nothing else in the game needs to know it happened, which is exactly why it can be
   honest about "other people's dice": it does not care whose hand the die is in.
   IT IS DELIBERATELY ONE-SHOT. A hook that stayed armed would quietly re-roll the whole evening. */
let luck = null;
/** arm the next d20: fn(a, b) gets both rolls and returns the one that stands */
export function setLuck(fn) { luck = typeof fn === 'function' ? fn : null; return !!luck; }
/** is one armed right now (for a readout, and for refusing a second) */
export const luckArmed = () => !!luck;

export const d20 = () => {
  const a = 1 + Math.floor(Math.random() * 20);
  if (!luck) return a;
  const b = 1 + Math.floor(Math.random() * 20);
  const pick = luck;
  luck = null;                       // spent whether it helped or not
  const out = pick(a, b);
  return (out === a || out === b) ? out : a;
};

/* THE PERCENTILE, the SRD's d% (the dying round's 10% to stabilize, armour's arcane spell failure): one die for the roads
   that ask it here. The Moon's Eye above is the d20's alone, as built. */
export const d100 = () => 1 + Math.floor(Math.random() * 100);

/** THE ROLL RECORD (move 6b-1a, its first user the attack roll): one d20's face and the terms that moved it, each
    [n, word], a zero term left out; what a line or a card is drawn from. `opt.take` marks a take 10 or 20 (move 6b-1b):
    no die was rolled, so a take is never a natural 1 or 20 */
export function rolledOf(face, terms, opt) {
  const kept = (terms || []).filter((t) => t && t[0]);
  const mod = kept.reduce((s, t) => s + t[0], 0);
  const take = !!(opt && opt.take);
  return { face, terms: kept, mod, total: face + mod, nat1: !take && face === 1, nat20: !take && face === 20, take };
}

/** THE MODIFIER AND EVERY TERM THAT MOVED IT, as a line or a card says them (move 6b-1b): "+3 (+1 base attack, +2
    Strength)". r.mod as given, never re-summed, so a caller's line keeps its own number; the terms' sum only when r.mod
    is missing */
export function sayMods(r) {
  const mod = r.mod != null ? r.mod : (r.terms || []).reduce((s, t) => s + ((t && +t[0]) || 0), 0);
  return (mod >= 0 ? '+' : '') + mod + termsOf(r.terms);
}

/** THE HEAD OF EVERY ROLL LINE, in the world's notation (move 6b-1b; Rose's 09-15 ruling on the world's lines): "rolled
    10 on the die, +3 (+1 base attack, +2 Strength)", or "took 10, +3 (...)" for a take. r is any { face, mod, terms,
    take }, rolledOf's record or a caller's own; the caller adds " = total" and what it was against */
export function sayRolled(r) {
  const slots = { face: r.face, mods: sayMods(r) };
  return r.take ? textOf('$lohTXTookHead', slots) : textOf('$lohTXRolledHead', slots);
}

// the most a dice expression can roll: NdS+M -> N*S + M (Maximize Spell)
export function maxOf(notation) {
  const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(notation.replace(/\s/g, ''));
  if (!m) return 0;
  return +m[1] * +m[2] + (m[3] ? +m[3] : 0);
}

// expected value of a dice expression: NdS+M -> N*(S+1)/2 + M
export function average(notation) {
  const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(notation.replace(/\s/g, ''));
  if (!m) return 0;
  return (+m[1] * (+m[2] + 1)) / 2 + (m[3] ? +m[3] : 0);
}

/**
 * The parenthesised list of what moved a number: " (+4 ranks, -2 Wisdom)".
 *
 * EXPORTED so every line and card can use it: sayMods and sayRolled above (the
 * head of every roll line, move 6b-1b) and the world's own cards. The checks
 * that are not skill checks once printed one merged sum, which is the very
 * notation Rose took apart ("so why are you saying 1d20(2) +2?"). One
 * renderer means one notation, whoever is doing the printing.
 *
 * @param pairs  [[n, "what"], ...]; a term worth zero is dropped, because
 *               "+0 for your feats" is noise.
 */
export function termsOf(pairs) {
    const said = termsSaid(pairs);
    return said.length ? " (" + said.join(", ") + ")" : "";
}

/** THE TERMS AS THEIR WORDS, one each: ["+6 base attack", "+2 Strength"], a term worth zero left out (move 6b-1c: the row
    beneath a fight's dice cards, as the world's check card shows them; termsOf above is the same words in a line) */
export function termsSaid(pairs) {
    return (pairs || []).filter((t) => t && t[0]).map(([n, what]) => (n > 0 ? "+" : "") + n + " " + what);
}

/** A SAVE'S VERDICT, THE ONE DOOR (Vera 2026-10-03; Desktop/V/save-door-table.md V1, sadia's check): a natural 20 saves and
    a natural 1 fails whatever the total, else the total against the DC. SRD, Combat Statistics, Saving Throws, "Automatic
    Failures and Successes" (d20srd.org/srd/combat/combatStatistics.htm, read in Chrome 2026-10-03): "A natural 1 (the d20
    comes up 1) on a saving throw is always a failure ... A natural 20 (the d20 comes up 20) is always a success." The die's
    own word for a save, as rolledOf's nat1 and nat20 are for an attack; skill and ability checks have no such rule. Pure,
    with no die of its own: each road keeps its die (the Moon's Eye rides d20). A face not handed is the total alone */
export function saveMade(face, total, dc) {
  if (face === 20) return true;
  if (face === 1) return false;
  return total >= dc;
}

/** AN ATTACK ROLL'S VERDICT, THE ONE DOOR (sadia 2026-10-03; Desktop/V/maneuver-swings-table.md M6, Vera's check): a natural
    20 hits and a natural 1 misses whatever the total, else the total against the AC. SRD, Combat Statistics, Automatic
    Misses and Hits (d20srd.org/srd/combat/combatStatistics.htm, read in Chrome 2026-10-03): "A natural 1 (the d20 comes up
    1) on an attack roll is always a miss. A natural 20 (the d20 comes up 20) is always a hit." A touch attack is an attack
    roll ("the attacker makes a touch attack roll"). Pure, as saveMade: each road keeps its die. A face not handed is the
    total alone */
export function hitMade(face, total, ac) {
  if (face === 20) return true;
  if (face === 1) return false;
  return total >= ac;
}
