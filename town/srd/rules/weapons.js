/* ============================================================================
   THE WEAPONS COG (Rose 2026-10-01: "wire it using the same cog rules", "use module rules which will allow you to
   classify weapons and add future weapons easily by just adding it to a module"). data/weaponTable.js says what each
   kind of weapon IS, one line each; this file is the RULE every body asks of it: her, a seat, a foe, a beast, alike.
   Nothing here knows a weapon by name. It reads the row's columns and quality words, so a new line in the table is
   ruled the day it is written. The plan, step by step: Desktop/V/weapons-cog-table.md.
   ========================================================================== */
import { kindOf, WEAPON_TABLE } from '../data/weaponTable.js';
/* a sling's stone hits as a weapon a size smaller (weapons E) */
import { sizeUp } from '../data/weaponSize.js';
import { textOf } from '../config/text.js';
import { termed } from './attack.js';
import { reachFt as reachBySize, stepsFromMedium } from '../data/size.js';

/*,,. STRENGTH ON DAMAGE, BY THE SRD'S OWN WORDS (Rose 2026-10-01, the popup: "Look up the SRD everything it says you
   do") ,,,
   The Weapons page, read whole in Chrome that day (d20srd.org/srd/equipment/weapons.htm):
     Light: "Add the wielder's Strength bonus (if any) to damage rolls for melee attacks with a light weapon if it's used
       in the primary hand, or one-half the wielder's Strength bonus if it's used in the off hand."
     Two-Handed: "Apply 1½ times the character's Strength bonus to damage rolls for melee attacks with such a weapon."
     Projectile Weapons: "A character gets no Strength bonus on damage rolls with a projectile weapon unless it's a
       specially built composite shortbow, specially built composite longbow, or sling. If the character has a penalty
       for low Strength, apply it to damage rolls when he or she uses a bow or a sling."
   And the natural weapons, the monsters' introduction read the same day: a primary attack takes "its full Strength
   modifier (1½ times its Strength bonus if the attack is with the creature's sole natural weapon)", and "Secondary
   attacks add only ½ the creature's Strength bonus".
   Every multiplier is on a BONUS. A penalty is the modifier, whole, wherever the book applies Strength at all: until
   today a weak arm swung a greatsword at 1.5 times its penalty, an off hand at half of it, and a bow took none. */
/** the Strength a blow adds: a bonus times its multiplier, rounded down; a penalty whole */
export const scaleStr = (str, mult) => (str > 0 ? Math.floor(str * mult) : str);
/** the Strength a projectile weapon adds: a bow its penalty only (a composite bow its bonus too, up to the bow's
    strength rating), a sling the whole modifier, a crossbow nothing */
export function projectileStr(str, weapon, rating = 0) {
  const k = kindOf(weapon);
  if (!k || k.use !== 'projectile') return 0;
  if (k.ammo === 'bullets') return str;
  if (k.ammo === 'arrows') return str < 0 ? str : (k.has.includes('composite') ? Math.min(str, rating || 0) : 0);
  return 0;
}

/*,,. REACH (Rose 2026-10-01: "have reach rulls and everything it says in?"; "so a 10ft reach can double right? and same
   with 5ft": yes, the book's own words below; "be sure to remember enlarge/reduce person is a thing": so every answer
   here is asked of the body's CURRENT size, never baked at the fight's build) ,,,
   The SRD, read in Chrome on 2026-10-01:
     Weapons, Reach Weapons: "Most reach weapons double the wielder's natural reach, meaning that a typical Small or
       Medium wielder of such a weapon can attack a creature 10 feet away, but not a creature in an adjacent square. A
       typical Large character wielding a reach weapon of the appropriate size can attack a creature 15 or 20 feet
       away, but not adjacent creatures or creatures up to 10 feet away." The note: "Small and Medium creatures wielding
       reach weapons threaten all squares 10 feet (2 squares) away, even diagonally."
     The spiked chain "can be used against an adjacent foe"; the whip "is treated as a melee weapon with 15-foot reach,
       though you don't threaten the area into which you can make an attack... you can use it against foes anywhere
       within your reach (including adjacent foes)."
     Attacks of Opportunity, Threatened Squares: "You threaten all squares into which you can make a melee attack."
     Big and Little Creatures: natural reach by size (data/size.js holds the table); "a creature with greater than
       normal natural reach (more than 5 feet) still threatens squares adjacent to it"; "Large or larger creatures using
       reach weapons can strike up to double their natural reach but can't strike at their natural reach or less."
   THE ENGINE HAS NO SQUARES. battle.js THREAT_FT (7.2) is the calibration: center to center, the bound sits just past
   the farthest square a reach touches and short of the nearest one it does not. For a reach of R feet counted 5-10-5
   that is R + 2.2 (5 gives the 7.2 every body fought at; 10 gives 12.2; 15, 17.2; 20, 22.2). A reach weapon in a Small
   or Medium hand reaches 14.2: two squares diagonally (14.14) in, three straight (15) out. Two gaps stay named, not
   built: a body's SPACE (a Large body is still a point here) and a 0-ft reach (a Tiny body should enter its foe's
   square; it keeps 5 ft). */
/** the margin THREAT_FT carries over a 5-ft reach (battle.js), for every reach */
export const REACH_SLACK_FT = 2.2;
/** a reach weapon in a Small or Medium hand: "even diagonally" two squares */
export const DIAGONAL_REACH_FT = 14.2;
/** the stance a walk-up takes for a 5-ft reach (battle.js ADJ_FT) */
export const ADJACENT_FT = 5;

/** a body's natural reach in feet: its stat block's own `reachFt` where it has one (data/mounts.js rows), else the
    SRD's size table by its build, "tall" unless the body says "long"; never under 5 (the header's second gap) */
export function naturalReachOf(body) {
  const own = body && Number.isFinite(body.reachFt) ? body.reachFt : reachBySize(body && body.size, body && body.build);
  return Math.max(ADJACENT_FT, own || 0);
}
const boundFt = (reach) => reach + REACH_SLACK_FT;

/** the weapon kind a move swings: a baked move carries `weapon` (a charge's renamed copy keeps it) or is gear named for
    its kind; a fist, a claw, a torch or a spell has none */
export const kindOfMove = (move) => (move && (move.weapon || (move.gear && move.name)) ? kindOf(move.weapon || move.name) : null);

/** WHERE A MELEE MOVE STRIKES: { minFt, maxFt }, center to center. minFt is exclusive (a reach weapon cannot touch what
    stands at or inside it; 0 means anything up to maxFt), maxFt inclusive. */
export function strikeBandOf(body, move) {
  const n = naturalReachOf(body);
  const k = kindOfMove(move);
  const reach = k ? k.reach : 0;
  if (reach === 'double') {
    const smallHand = stepsFromMedium(body && body.size) <= 0;
    return { minFt: k.reachAdjacent ? 0 : boundFt(n), maxFt: smallHand ? DIAGONAL_REACH_FT : boundFt(2 * n) };
  }
  if (typeof reach === 'number' && reach > 0) return { minFt: k.reachAdjacent ? 0 : boundFt(n), maxFt: boundFt(reach) };
  return { minFt: 0, maxFt: boundFt(n) };
}
/** does the band hold that distance */
export const inBand = (band, ft) => ft <= band.maxFt + 1e-9 && (band.minFt === 0 || ft > band.minFt);

/** where a walk-up stops to swing this move: a reach weapon's own stance (two squares for a Small or Medium wielder,
    double the natural reach for a bigger one), else the adjacent stance */
export function standOffFt(body, move) {
  const band = strikeBandOf(body, move);
  if (band.minFt === 0) return ADJACENT_FT;
  return Math.min(band.maxFt - 0.2, 2 * naturalReachOf(body));
}

/** does the weapon in this move threaten at all (the whip: "you don't threaten the area into which you can make an
    attack"); a fist, a claw and every other blade do */
export const weaponThreatens = (move) => { const k = kindOfMove(move); return !(k && k.threatens === false); };

/** THE BLOWS A BODY CAN THROW AS AN ATTACK OF OPPORTUNITY, each with where it lands ("You threaten all squares into which
    you can make a melee attack"): the weapon in hand (`held`, unless it threatens nothing), an armed fist (`fistArmed`:
    Improved Unarmed Strike, a monk) and its natural weapons. Whether the body threatens at all (asleep, held,
    grappling, bare-handed) is the caller's gate. */
export function threatFormsOf(body, held, { fistArmed = false, fist = null, naturals = [] } = {}) {
  const out = [];
  if (held && weaponThreatens(held)) out.push({ move: held, band: strikeBandOf(body, held) });
  if (fistArmed && fist) out.push({ move: fist, band: strikeBandOf(body, fist) });
  for (const nat of naturals || []) out.push({ move: nat, band: strikeBandOf(body, nat) });
  return out;
}
/** the first form whose band holds that distance (the blow an attack of opportunity takes), or null */
export const formAt = (forms, ft) => (forms.find((f) => inBand(f.band, ft)) || null);

/*,,. THE GRIP, CASE BY CASE (Rose 2026-10-01, the popup: "You're forgetting about versatile weapons. I cannot answer this
   its a case by case thing... but you can now that you are aware of versatile weapons") ,,,
   The Weapons page, read whole in Chrome that day: a light weapon, "Using two hands to wield a light weapon gives no
   advantage on damage"; a one-handed weapon, "If a one-handed weapon is wielded with two hands during melee combat, add
   1½ times the character's Strength bonus to damage rolls"; a two-handed one, "Two hands are required"; the rapier, "You
   can't wield a rapier in two hands in order to apply 1½ times your Strength bonus to damage". The cases, set here: a
   one-handed weapon goes into both hands whenever the other hand holds nothing (no off-hand weapon, no torch) and the
   body has no Deflect Arrows, whose own text wants "at least one hand free"; a light weapon and the rapier stay in one;
   a two-handed weapon is always two. 1 or 2 hands. */
export function gripOf(kind, { offhandBusy = false, keepHandFree = false } = {}) {
  if (!kind) return 1;
  if (kind.effort === 'two-handed') return 2;
  if (kind.effort !== 'one-handed' || kind.has.includes('no-two-hands')) return 1;
  return (offhandBusy || keepHandFree) ? 1 : 2;
}

/*,,. A WEAPON THROWN THAT WAS NOT MADE FOR IT (SRD, Weapons, Thrown Weapons) ,,,
   "It is possible to throw a weapon that isn't designed to be thrown... a character who does so takes a -4 penalty on
   the attack roll. Throwing a light or one-handed weapon is a standard action, while throwing a two-handed weapon is a
   full-round action. Regardless of the type of weapon, such an attack scores a threat only on a natural roll of 20 and
   deals double damage on a critical hit. Such a weapon has a range increment of 10 feet." */
export const IMPROVISED_THROW = { toHit: -4, incFt: 10, threat: 20, mult: 2 };

/*,,. RANGE, AND FAR SHOT ,,,
   The Weapons page: "each full range increment imposes a cumulative -2 penalty on the attack roll. A thrown weapon has a
   maximum range of five range increments. A projectile weapon can shoot out to ten range increments." Far Shot (feats,
   read in Chrome 2026-10-01): "When you use a projectile weapon, such as a bow, its range increment increases by one-half
   (multiply by 1½). When you use a thrown weapon, its range increment is doubled." It ran x1.5 for both, and the reach
   never grew with it. */
/** this body's range increment with this move, Far Shot read off the body (0 for a move with none) */
export const rangeIncrementOf = (body, move) => (!(move && move.rangeIncFt) ? 0
  : move.rangeIncFt * (body && body.farShot ? (move.thrown ? 2 : 1.5) : 1));
/** the farthest it carries: five increments thrown, ten shot; a move with no increment keeps its own rangeFt */
export const maxRangeOf = (body, move) => (!(move && move.rangeIncFt) ? ((move && move.rangeFt) || 0)
  : rangeIncrementOf(body, move) * (move.thrown ? 5 : 10));

/*,,. A MANEUVER'S BLOW (weapons D1; the SRD's Special Attacks, read in Chrome 2026-10-02) ,,,
   Trip: "Make an unarmed melee touch attack"; Tripping with a Weapon: "Some weapons can be used to make trip attacks. In
   this case, you make a melee touch attack with the weapon instead of an unarmed melee touch attack". Disarm: "If you do
   so with a weapon ... If you attempt the disarm while unarmed". Sunder: "a melee attack with a slashing or bludgeoning
   weapon". So a trip is made with a held weapon whose row says it trips, else with the bare hand; a disarm with the
   weapon in hand, else the bare hand; a sunder with the weapon in hand or not at all. The blow says where the maneuver
   lands (its band) and what its touch or its opposed roll adds. */
export function maneuverBlowOf(type, held, fist) {
  if (type === 'trip') {
    const k = held && kindOf(held.weapon || held.name);
    return k && k.has.includes('trip') ? held : fist;
  }
  if (type === 'disarm') return held || fist;
  if (type === 'sunder') return held || null;
  return null;
}
/** a weapon its wielder cannot be disarmed of: the spiked gauntlet ("Your opponent cannot use a disarm action to disarm
    you of spiked gauntlets", the weapons page; "A defender wearing spiked gauntlets can't be disarmed", Disarm's note) */
export function cannotBeDisarmed(move) {
  const k = move && kindOf(move.weapon || move.name);
  return !!(k && k.has.includes('cannot-be-disarmed'));
}
/** a weapon whose every use provokes "just as if you had used a ranged weapon" (the whip's own sentence, the weapons
    page): a trip made with it draws a swing after all, whatever Improved Trip spares */
export function provokesLikeRanged(move) {
  const k = move && kindOf(move.weapon || move.name);
  return !!(k && k.has.includes('provokes-like-ranged'));
}

/*,,. WHO PULLS A BLOW, AND WHAT CHOOSING COSTS (weapons D1n; the SRD read in Chrome 2026-10-02 04:5x) ,,,
   Injury and Death, Nonlethal Damage: "You can use a melee weapon that deals lethal damage to deal nonlethal damage
   instead, but you take a -4 penalty on your attack roll"; "You can use a weapon that deals nonlethal damage, including an
   unarmed strike, to deal lethal damage instead, but you take a -4 penalty on your attack roll." The weapons page: the
   table's nonlethal mark (the unarmed strike, the sap, the whip, the bolas: each row's `nonlethal`); "A monk or any
   character with the Improved Unarmed Strike feat can deal lethal or nonlethal damage with unarmed strikes, at her
   option" (the monk's page: "with no penalty on her attack roll"); the gauntlet "lets you deal lethal damage rather than
   nonlethal damage with unarmed strikes", and "Medium and heavy armors (except breastplate) come with gauntlets". The
   whip: "It deals no damage to any creature with an armor bonus of +1 or higher or a natural armor bonus of +3 or higher."
   The two standing choices are every body's toggles (data/featEffects.js "Pull Blows" and "Strike to Kill", stamped
   f.pullBlows and f.strikeToKill). Only a weapon's blow is asked: a spell's touch, a shot's arrow, never. */
const isWeaponBlow = (move) => !!(move && move.type === 'attack' && !move.fx);
const isMeleeBlow = (move) => !(move.ranged || move.thrown || move.fx);
const isFist = (move) => !!(move.unarmed && !move.natural);
/** a fist that may strike either way at no cost: the Improved Unarmed Strike feat, or a monk's by her monk level (battle.js
    hasFeat's test; roster.js grantClass's monkLevel, G1) */
const freeFist = (actor) => (Array.isArray(actor.feats) && actor.feats.includes('Improved Unarmed Strike'))
  || (actor.monkLevel || 0) >= 1;
/** a fist in gauntlets: medium or heavy armour that is not a breastplate (roster.js armourClass and armourKind) */
export const gauntleted = (actor) => /^(medium|heavy)$/i.test(String((actor && actor.armourClass) || ''))
  && !/breastplate/i.test(String(actor.armourKind || ''));
/** the blow's own nature before any choice: true for nonlethal */
function pullsByNature(actor, move) {
  if (isFist(move)) return !(freeFist(actor) || gauntleted(actor));
  const k = kindOf(move.weapon || move.name);
  return !!(k && k.nonlethal);
}
/** does this blow deal nonlethal damage, the body's standing choice counted */
export function pullsBlows(actor, move) {
  if (!actor || !isWeaponBlow(move)) return false;
  if (pullsByNature(actor, move)) return !actor.strikeToKill;
  return !!actor.pullBlows && isMeleeBlow(move);
}
/** what that choice costs the attack roll: -4 to turn a weapon against its nature, nothing for a fist that may choose */
export function pullTollOf(actor, move) {
  if (!actor || !isWeaponBlow(move)) return 0;
  if (pullsByNature(actor, move)) return actor.strikeToKill ? -4 : 0;
  if (!actor.pullBlows || !isMeleeBlow(move)) return 0;
  return isFist(move) && freeFist(actor) ? 0 : -4;
}
/** the whip's clause: no damage to a body with an armour bonus of +1 or more (`armourBonus`: rules/conditions.js
    armourBonusOf, Mage Armor's too) or a natural armour bonus of +3 or more */
export function noDamageTo(move, target, armourBonus) {
  const k = move && kindOf(move.weapon || move.name);
  if (!k || !k.has.includes('no-damage-to-armoured') || !target) return false;
  return (+armourBonus || 0) >= 1 || (+target.naturalAc || 0) >= 3;
}

/* THE MONK'S FIST AND HER FLURRY BY HER MONK LEVEL are the Classes cog's (rules/classes/monk.js monkFistAt and
   flurryPenaltyAt, with their story; move C3); the fist as a weapon stays this cog's */

/*,,. AMMUNITION, COUNTED (weapons E; the SRD read in Chrome 2026-10-02 04:5x, the weapons page; Rose 10-01: "lying where
   they fell. ITems are on ground as items, alt helps locate them") ,,,
   "Ammunition that hits its target is destroyed or rendered useless, while normal ammunition that misses has a 50% chance
   of being destroyed or lost"; "Masterwork ammunition is damaged (effectively destroyed) when used"; a magic arrow, bolt
   or bullet that misses has "a 50% chance it breaks" (magic weapons). A projectile's row names what it shoots (`ammo`:
   arrows, bolts, bullets), the ammunition's own row the same word with `use: "ammunition"`.
   THE QUIVER IS A VIEW OF THE SATCHEL: roster.js hands the fighter its pack's own satchel by reference, so a shot draws
   from the entries themselves, first entry first, each down to 0 and kept (rules/items.js keeps an explicit 0), and the
   pack holds the count when the fight ends. Every shot draws at its roll, a repeating crossbow's too: its case is the
   rhythm of its reloading, never a second count. THE QUIVER IS ALWAYS JUDGED (weapons R1 with R6, built 2026-10-07 after
   Rose's question, "Does it need reloading each round and doesnt it use bolts?"; her "SRD." of 10-02 and "Give them ammo"
   of 10-03): a satchel with no entry of that ammunition, or no satchel at all, is an empty quiver, so the shot is refused
   before anything is spent; a body the game itself equips comes with its weapon's bundle (rules/items.js armedSatchel). */
/** the ammunition row a projectile shoots ("Arrows", "Bolts", "Sling Bullets"), or null for one that shoots none */
export function ammoNameOf(weapon) {
  const k = kindOf(weapon);
  if (!k || k.use !== 'projectile' || !k.ammo) return null;
  return Object.keys(WEAPON_TABLE).find((n) => WEAPON_TABLE[n].use === 'ammunition' && WEAPON_TABLE[n].ammo === k.ammo) || null;
}
/** its plain word ("arrows", "bolts", "bullets") */
export const ammoWordOf = (name) => (WEAPON_TABLE[name] && WEAPON_TABLE[name].ammo) || String(name || '').toLowerCase();
const countOf = (e) => (e.count == null ? 1 : Math.max(0, +e.count || 0));
/** the quiver: the satchel's own entries of that ammunition and their total. None of it, or no satchel, is an empty
    quiver (always judged, weapons R1); null only for a move that shoots no ammunition */
export function quiverOf(satchel, ammoName) {
  if (!ammoName) return null;
  const entries = (Array.isArray(satchel) ? satchel : []).filter((e) => e && e.kind === 'weapon' && e.name === ammoName);
  return { name: ammoName, entries, count: entries.reduce((n, e) => n + countOf(e), 0) };
}
/** one shot drawn from the quiver, first entry first, down to 0 and kept: the entry it came from, or null when empty */
export function drawShot(q) {
  if (!q) return null;
  for (const e of q.entries) {
    const n = countOf(e);
    if (n > 0) { e.count = n - 1; q.count -= 1; return e; }
  }
  return null;
}
/** a shot whose quiver is judged and empty, with no stones to hurl instead: refused before anything is spent */
export function shotEmptyOf(body, move) {
  const q = quiverOf(body && body.satchel, move && move.ammo);
  return !!q && q.count <= 0 && !stoneShotOf(move);
}
/** the shot loosed at its roll: its arrow drawn from the quiver and counted on the shooter (`ammoSpent`, which the seat's
    ledger reads at the fight's end), or a sling's stone when the pouch is empty: { move, drawn, stone } */
export function looseShot(body, move) {
  const q = quiverOf(body && body.satchel, move && move.ammo);
  if (!q) return { move, drawn: null, stone: false };
  const drawn = drawShot(q);
  if (drawn) { body.ammoSpent = (body.ammoSpent || 0) + 1; return { move, drawn, stone: false }; }
  const stone = stoneShotOf(move);
  return stone ? { move: stone, drawn: null, stone: true } : { move, drawn: null, stone: false };
}
/** a repeating crossbow's new case: its five, or what the quiver holds when it holds fewer (none: none) */
export function caseFillOf(body, move) {
  const n = (move && move.magazine) || 5, q = quiverOf(body && body.satchel, move && move.ammo);
  return q ? Math.min(n, q.count) : n;
}
/** IS THE CROSSBOW LOADED (weapons R1; the fight's crossbowGate and the aim's sight ask this one rule): a move that needs
    no loading is always ready; a crossbow comes into a fight loaded (boltLoaded unset) and is empty after a shot; a
    repeating one is ready again by its free lever while its case holds bolts */
export function crossbowLoaded(body, move) {
  if (!move || !move.reload) return true;
  if (!body || body.boltLoaded !== false) return true;
  if (move.reload !== 'lever') return false;
  return (body.boltsInCase == null ? (move.magazine || 0) : body.boltsInCase) > 0;
}
/** what becomes of a shot: "spent" on a hit, and masterwork ammunition always (magic breaks as plain does); a miss is
    "lost" on a d100 of 50 or under, and else it "lies" where it fell */
export function ammoAfter(hit, item, d100) {
  if (hit) return 'spent';
  if (item && item.masterwork && !(+item.enhancement > 0)) return 'spent';
  return d100 <= 50 ? 'lost' : 'lies';
}
/** a sling with an empty pouch hurls "ordinary stones ... as if the weapon were designed for a creature one size category
    smaller than you and you take a -1 penalty on attack rolls" (the row's `sling-stones`); null for any other weapon */
export function stoneShotOf(move) {
  /* the kind by the move's own name, a volley's " (rapid)" set aside (battle.js names a Rapid Shot volley's shots so) */
  const k = move && (move.weapon || move.gear) ? kindOf(String(move.weapon || move.name || '').replace(/ \(rapid\)$/, '')) : null;
  if (!k || !k.has.includes('sling-stones')) return null;
  const m = /^(\d+d\d+)(.*)$/.exec(String(move.dmg || ''));
  return { ...termed(move, -1, textOf('$lohTXAtkStone')), dmg: m ? sizeUp(m[1], -1) + m[2] : move.dmg, ammo: null, stone: true };
}
/** WHERE A MISS THAT SURVIVES LANDS (weapons E4; E9's world shots ask it too, one rule): `past` units beyond the target
    along the line from the shooter, or only `short` past it when `blocked(to, at)` says something solid stands in that
    line (the fight's _segmentBlocked, the world's colliders). The world's units are the fight's five feet */
export function missLandingOf(from, to, blocked = null, past = 1.5, short = 0.3) {
  const dx = to.x - from.x, dz = to.z - from.z, L = Math.hypot(dx, dz) || 1;
  const at = { x: to.x + (dx / L) * past, z: to.z + (dz / L) * past };
  return blocked && blocked(to, at) ? { x: to.x + (dx / L) * short, z: to.z + (dz / L) * short } : at;
}
/** where a shot caught by cover lies: at the cover's foot on the shooter's side, `gap` units outside its body */
export function coverLandingOf(from, cover, radius = 0, gap = 0.3) {
  const dx = from.x - cover.x, dz = from.z - cover.z, L = Math.hypot(dx, dz) || 1, r = (+radius || 0) + gap;
  return { x: cover.x + (dx / L) * r, z: cover.z + (dz / L) * r };
}

/*,,. WHAT THE ITEM IS MADE OF, AND ITS MAGIC (weapons D2; the SRD read in Chrome 2026-10-02: specialMaterials.htm and
   magicItems/magicWeapons.htm; Desktop/V/weapons-cog-table.md "Step D2", row-checked by Vera) ,,,
   Magic: "enhancement bonuses ranging from +1 to +5", "to both attack and damage rolls"; "All magic weapons are also
   masterwork weapons, but their masterwork bonus on attack rolls does not stack with their enhancement bonus"; "Each +1
   of enhancement bonus adds 2 to a weapon's or shield's hardness and +10 to its hit points". The materials: adamantine
   "ignoring hardness less than 20" and masterwork by nature, steel items of it "one-third more hit points", hardness 20;
   mithral masterwork, hardness 15; cold iron hardness 10; alchemical silver "a -1 penalty on the damage roll (with the
   usual minimum of 1 point of damage)", hardness 8; darkwood masterwork, hardness 5. What may be made of what: metal
   parts (the table's `metal`) for adamantine, cold iron and silver; a primarily metal weapon for mithral ("A longsword
   can be a mithral weapon, while a scythe cannot be": breaksAs a blade or metal-hafted, or a metal kind with no break
   line and no wood, the shuriken and the sling bullet); a wooden or mostly wooden one for darkwood (the table's `wood`:
   "such as a bow, an arrow, or a spear", never "a battleaxe or a mace"). An item has one material, so silver never
   meets a rare metal. */
const MATERIALS = {
  adamantine: { hardness: 20, masterwork: true, needs: 'metal', ignoresUnder: 20, steelHp: 4 / 3 },
  mithral: { hardness: 15, masterwork: true, needs: 'primarily-metal' },
  'cold iron': { hardness: 10, needs: 'metal' },
  'alchemical silver': { hardness: 8, needs: 'metal', dmg: -1 },
  darkwood: { hardness: 5, masterwork: true, needs: 'wood' },
};
/** the special materials a weapon item may name (rules/items.js `material`) */
export const MATERIAL_NAMES = Object.freeze(Object.keys(MATERIALS));
/** what an item adds to the attack: its enhancement, else masterwork's +1 (its own, or its material's); never both */
export function attackTermsOf(item) {
  if (!item) return 0;
  const e = +item.enhancement || 0;
  if (e > 0) return e;
  const m = MATERIALS[item.material];
  return (item.masterwork || (m && m.masterwork)) ? 1 : 0;
}
/** the same as the attack roll's terms (the attack cog, move 6b-1a): its enhancement, else masterwork, by name */
export function attackTermPartsOf(item) {
  if (!item) return [];
  const e = +item.enhancement || 0;
  if (e > 0) return [[e, textOf('$lohTXAtkEnhancement')]];
  const m = MATERIALS[item.material];
  return (item.masterwork || (m && m.masterwork)) ? [[1, textOf('$lohTXAtkMasterwork')]] : [];
}
/** what an item adds to the damage: its enhancement; alchemical silver -1 (the fight's floor of 1 still holds) */
export function damageTermsOf(item) {
  if (!item) return 0;
  const m = MATERIALS[item.material];
  return (+item.enhancement || 0) + ((m && m.dmg) || 0);
}
/** may this kind of weapon (a data/weaponTable.js kindOf row) be made of this material (none: always) */
export function materialAllowed(kind, material) {
  if (!material) return true;
  const m = MATERIALS[material];
  if (!m || !kind) return false;
  const has = (w) => kind.has.includes(w);
  if (m.needs === 'metal') return has('metal');
  if (m.needs === 'primarily-metal') return /blade|metal-hafted/.test(String(kind.breaksAs || ''))
    || (!kind.breaksAs && has('metal') && !has('wood') && !has('worn'));
  if (m.needs === 'wood') return has('wood');
  return true;
}
/** the hardness a blow made with this item ignores: adamantine's "hardness less than 20"; 0 for any other */
export const ignoresHardnessUnder = (item) => { const m = item && MATERIALS[item.material]; return (m && m.ignoresUnder) || 0; };

/*,,. SUNDER, AND WHAT A WEAPON TAKES BEFORE IT IS RUINED (weapons D1s; the SRD read in Chrome 2026-10-02) ,,,
   Special Attacks, Sunder: "You can use a melee attack with a slashing or bludgeoning weapon to strike a weapon or shield
   that your opponent is holding"; a weapon of two types ("and" or "or", or a double weapon's two heads) has both to give,
   so a dagger or a scythe sunders though piercing is listed first. Exploration, Table: Common Armor, Weapon, and Shield
   Hardness and Hit Points: light blade 10/2, one-handed blade 10/5, two-handed blade 10/10, light metal-hafted 10/10,
   one-handed metal-hafted 10/20, light hafted 5/2, one-handed hafted 5/5, two-handed hafted 5/10, projectile 5/5; "The hp
   value given is for Medium armor, weapons, and shields. Divide by 2 for each size category of the item smaller than
   Medium, or multiply it by 2 for each size category larger than Medium"; "When an object's hit points reach 0, it's
   ruined." The net's own entry: "The net has 5 hit points". Each kind names its line (`breaksAs`, data/weaponTable.js). */
const BREAKS = { 'light blade': [10, 2], 'one-handed blade': [10, 5], 'two-handed blade': [10, 10],
  'light metal-hafted': [10, 10], 'one-handed metal-hafted': [10, 20], 'light hafted': [5, 2],
  'one-handed hafted': [5, 5], 'two-handed hafted': [5, 10], 'projectile': [5, 5], 'net': [0, 5] };
/** the lines a kind may name (data/weaponTable.js `breaksAs`), for the table's own check */
export const BREAK_LINES = Object.freeze(Object.keys(BREAKS));
/** can this weapon sunder: true or false by its row (either head, either type), or null for one the table does not know */
export function sundersWith(move) {
  const k = move && kindOf(move.weapon || move.name);
  if (!k) return null;
  return [...k.types, ...k.types2].some((t) => t === 'slashing' || t === 'bludgeoning');
}
/** a weapon's hardness and hit points at a size, by its line of the table, or null for one the table gives none */
export function hardnessOf(move, size = 'medium') {
  const k = move && kindOf(move.weapon || move.name);
  const line = k && BREAKS[k.breaksAs];
  if (!line) return null;
  let hp = Math.max(1, Math.floor(line[1] * Math.pow(2, stepsFromMedium(size))));
  /* the item's material and magic (weapons D2, the block above): a special material's own hardness in place of its line's,
     adamantine steel a third more hit points, and each +1 of enhancement +2 hardness and +10 hit points (never sized) */
  const item = move.item || null;
  const mat = item && MATERIALS[item.material];
  if (mat && mat.steelHp && k.has.includes('metal')) hp = Math.floor(hp * mat.steelHp);
  const e = item ? (+item.enhancement || 0) : 0;
  return { hardness: (mat ? mat.hardness : line[0]) + 2 * e, hp: hp + 10 * e };
}
