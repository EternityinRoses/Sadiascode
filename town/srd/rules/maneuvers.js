/* ============================================================================
   THE MANEUVERS COG (the machine map's 5.5, rules/maneuvers.js; sadia 2026-10-07, moves MV1 and MV2; Desktop/V/maneuvers-cog-table.md,
   Vera's check)

   The map: Maneuvers owns grapple, trip, bull rush, overrun, disarm, sunder, the SRD's feint and the coup de grace; it
   takes the maneuver and the two bodies and answers the opposed rolls and what changed. MV1 brought the six's CONTESTS here:
   the check each side rolls, and what a won bull rush pushes; MV2 the GRAPPLE'S sums: its check, its crowd, its tie, its
   damage dice, the way out and the hold moved. Each answer is pure over the bodies' fields and the numbers the fight hands
   in (the feats' bonuses through the fight's door, featHooks maneuverBonus and tripBonus); no die is rolled here and nothing
   is written. battle.js keeps the order of things: the spend, the free swings a maneuver draws, the dice's line and card,
   the push, the fall, the drop, the hold's state. MV3 the FEINT'S sums, and a bite's trip asks tripChecks for both sides
   and MV4 the COUP DE GRACE'S rules and words, rules/coup.js folded in whole (its story stands at the tail). And CA the
   coup as an ACT (coupAct, at the end), the first of the plug-and-play order's acts: one for every body in either host,
   over the view and the doors a host hands it; it rolls and writes only through those doors.

   THE BOOK (SRD, Special Attacks, d20srd.org/srd/combat/specialAttacks.htm, as perform quoted it when each was built,
   read in Chrome 2026-09-17 and 2026-10-02/03):
     the size: "+4 bonus for each size category you are larger than Medium or a -4 penalty for each size category you are
       smaller than Medium"; "You can only bull rush an opponent who is one size category larger than you, the same
       size, or smaller" (bull rush, trip and overrun each say it in their own words);
     the defender: "whichever ability score has the higher modifier"; "+4 ... if he has more than two legs or is
       otherwise exceptionally stable";
     bull rush: "+2 bonus on the Strength check made to bull rush" while charging; the push, "5 feet ... and an
       additional 5 feet for each 5 points by which your check result is greater than the defender's";
     disarm: "The wielder of a two-handed weapon on a disarm attempt gets a +4 bonus on this roll, and the wielder of a
       light weapon takes a -4 penalty. (An unarmed strike is considered a light weapon...)", the larger's +4 a step, and
       a weapon's own disarm bonus (the weapons page);
     sunder: opposed attack rolls with the same heft and size terms, by the weapons the two hold;
     overrun: the defender may avoid or block, a block "a Strength check opposed by Strength or Dexterity" with the trip's
       size and stability terms; Improved Overrun, "the target may not choose to avoid you".
   And an untrained armour's check penalty on Strength and Dexterity checks (A9's P6).
   ========================================================================== */
import { opposedSizeMod, withinOneStep, largerBonus, grappleSizeMod, grapplerWeight, stepsFromMedium } from '../data/size.js';
import { sizeUp } from '../data/weaponSize.js';
/* AND THE COUP DE GRACE'S (move MV4: rules/coup.js's own imports, moved with it; sizeUp and stepsFromMedium the cog's above) */
import { textOf } from "../config/text.js";
/* a blow's weapon kind, for the book's "a bow or crossbow" (E9's S2) */
import { kindOfMove } from "./weapons.js";
/* THE COUP AS AN ACT's own asks (move CA): the band a blow reaches, a pulled blow and the engine's adjacency (the weapons
   cog's); the riders (the feats cog's, S7a); the sneak dice and Shadow Strike's dark (the attack cog's); the body's
   resistance (health's) */
import { strikeBandOf, inBand, pullsBlows, ADJACENT_FT, REACH_SLACK_FT } from "./weapons.js";
import { featRidersOf } from "./feats.js";
import { sneakDiceFrom } from "./attack.js";
import { drSoak } from "./health.js";
/* the torch's blow is a gauntlet's of its size (the SRD's Torch; Desktop/V/torch-coup-table.md TC1): the table's die, stepped */
import { WEAPON_TABLE } from "../data/weaponTable.js";
/* a striker's Knowledge (Nature): the skills cog's one check (move S5) */
import { checkOf, boughtRanks } from "./skills.js";
import { saveMade } from "./dice.js";   // the one save door (Desktop/V/save-door-table.md V2)

/** the size step over Medium a maneuver's check carries */
export const sizeStepOf = (c) => opposedSizeMod(c && c.size);
/** the one-step limit: true when `b` is more than one size category larger than `a` */
export const tooBigFor = (a, b) => !withinOneStep(a.size, b.size);
/** a Strength check, with an untrained armour's penalty */
export const strCheckOf = (c) => (c.strMod || 0) + (c.nonprofAcp || 0);
/** the defender's check: "whichever ability score has the higher modifier", with the same penalty */
export const resistCheckOf = (c) => Math.max(c.strMod || 0, c.dexMod || 0) + (c.nonprofAcp || 0);
/** "+4 ... if he has more than two legs or is otherwise more stable" */
export const stableOf = (c) => (c.moreLegs ? 4 : 0);

/** a bull rush's two checks: the rusher's Strength, its size, its feat's bonus, +2 charging; the defender's Strength, its
    size, its stability */
export function bullRushChecks(a, b, o = {}) {
  return { mine: strCheckOf(a) + sizeStepOf(a) + (o.improved || 0) + (o.charging ? 2 : 0),
           theirs: strCheckOf(b) + sizeStepOf(b) + stableOf(b) };
}
/** a won bull rush's push in feet: 5, and 5 more for each 5 the check won by; nothing for a check that did not win */
export const pushOf = (mine, theirs) => (mine > theirs ? 5 + Math.floor((mine - theirs) / 5) * 5 : 0);

/** a trip's two checks, after its touch: the tripper's Strength and size and the feats' terms (`tb`: featHooks tripBonus,
    its atk and def); the defender's better ability, size, stability */
export function tripChecks(a, b, tb = {}) {
  return { mine: strCheckOf(a) + sizeStepOf(a) + (tb.atk || 0),
           theirs: resistCheckOf(b) + sizeStepOf(b) + stableOf(b) + (tb.def || 0) };
}
/** the trip back, `b` at `a`: b's Strength and size against a's better ability, size, stability */
export function tripBackChecks(a, b) {
  return { back: strCheckOf(b) + sizeStepOf(b), mine: resistCheckOf(a) + sizeStepOf(a) + stableOf(a) };
}

/* a disarm's side: the weapon's attack, its heft (two-handed +4, light or unarmed -4), the larger's step */
const heftOf = (m) => (m && m.twoHanded ? 4 : m && (m.light || m.unarmed) ? -4 : 0);
const disarmSideOf = (who, m, other) => ((m && m.toHit) || 0) + heftOf(m) + largerBonus(who.size, other.size);
const disarmWordOf = (m) => (m && m.disarmBonus) || 0;
/** a disarm's two rolls: `a` with the blow it disarms with (its weapon's own disarm bonus, its feat's), `b` with its weapon */
export function disarmChecks(a, aBlow, b, bWeapon, o = {}) {
  return { mine: disarmSideOf(a, aBlow, b) + disarmWordOf(aBlow) + (o.improved || 0), theirs: disarmSideOf(b, bWeapon, a) };
}
/** the disarm back, `b` at `a`'s held weapon: b's weapon, its disarm bonus and its feat's; a keeps hold with its own word */
export function disarmBackChecks(a, aHeld, b, bWeapon, o = {}) {
  return { back: disarmSideOf(b, bWeapon, a) + disarmWordOf(bWeapon) + (o.backImproved || 0),
           keep: disarmSideOf(a, aHeld, b) + disarmWordOf(aHeld) };
}

/* a sunder's side: the weapon held's heft by the body's own held weapon (two-handed +4, light -4) */
const holdHeftOf = (c) => (c.meleeMove && c.meleeMove.twoHanded ? 4 : c.meleeMove && c.meleeMove.light ? -4 : 0);
/** a sunder's two rolls: `a`'s blade with its heft, the larger's step and its feat's; `b`'s weapon the same */
export function sunderChecks(a, aBlade, b, o = {}) {
  return { mine: (aBlade.toHit || 0) + holdHeftOf(a) + largerBonus(a.size, b.size) + (o.improved || 0),
           theirs: (b.meleeMove.toHit || 0) + holdHeftOf(b) + largerBonus(b.size, a.size) };
}

/** whether an overrun's target blocks: always against Improved Overrun, else a body that stands its ground (its
    Dexterity no better than its Strength) blocks and a quick one steps aside */
export const overrunBlocks = (b, improved) => !!improved || (b.dexMod || 0) <= (b.strMod || 0);
/** an overrun's two checks: the runner's Strength, size and feat's bonus; the blocker's better ability, size, stability */
export function overrunChecks(a, b, o = {}) {
  return { mine: strCheckOf(a) + sizeStepOf(a) + (o.improved || 0), theirs: resistCheckOf(b) + sizeStepOf(b) + stableOf(b) };
}

/*,,. THE GRAPPLE'S SUMS (move MV2; SRD, Special Attacks, Grapple, d20srd.org/srd/combat/specialAttacks.htm, read in Chrome
   2026-09-17 and again 2026-10-07; battle.js keeps the hold's state, its dice and its words) ,,,
     the check: "Base attack bonus + Strength modifier + special size modifier" ("Use this number in place of the normal
       size modifier you use when making an attack roll"); "A grapple check is like a melee attack roll", so armour not
       trained in costs it its penalty (A9's P6); Improved Grapple's +4 is the feat's, handed in;
     the crowd: "Up to four combatants can grapple a single opponent in a given round. Creatures that are one or more size
       categories smaller than you count for half, creatures that are one size category larger than you count double, and
       creatures two or more size categories larger count quadruple";
     the tie: "In case of a tie, the combatant with the higher grapple check modifier wins. If this is a tie, roll again to
       break the tie";
     the damage: "you deal nonlethal damage as normal for your unarmed strike (1d3 points for Medium attackers or 1d2 points
       for Small attackers, plus Strength modifiers). If you want to deal lethal damage, you take a -4 penalty on your grapple
       check. Exception: Monks deal more damage on an unarmed strike than other characters, and the damage is lethal";
     the way out: "You can make an Escape Artist check in place of your grapple check if you so desire";
     the hold moved: "You can move half your speed (bringing all others engaged in the grapple with you) by winning an
       opposed grapple check... You get a +4 bonus on your grapple check to move a pinned opponent, but only if no one else
       is involved in the grapple." */
/** the grapple check's modifier: base attack, Strength, the special size modifier, the feat's bonus (`feat`, handed in),
    an untrained armour's penalty */
export const grappleModOf = (c, feat = 0) =>
  (c.bab || 0) + (c.strMod || 0) + grappleSizeMod(c.size) + (feat || 0) + (c.nonprofAcp || 0);
/** whether `a` taking hold of `t` makes more than four on it, each holder counted by its size against `t`'s */
export const crowdedOut = (holders, a, t) =>
  (holders || []).reduce((n, g) => n + grapplerWeight(g.size, t.size), 0) + grapplerWeight(a.size, t.size) > 4;
/** an opposed grapple check's answer, { won, tied, again }: the higher check wins, a tie goes to the higher modifier, and
    equal modifiers roll again */
export function contestOf(mine, mineMod, theirs, theirsMod) {
  const tied = mine === theirs;
  if (tied && mineMod === theirsMod) return { won: false, tied, again: true };
  return { won: tied ? mineMod > theirsMod : mine > theirs, tied, again: false };
}
/** the damage a hold deals, { dice, lethal, check }: the body's unarmed strike (`unarmedMove.dmg`, baked at a Medium body's
    die; 1d3 bare) stepped by its size, read live, through the same table the weapons use; lethal when chosen
    (`lethalWanted`); the squeeze's -4 on the check when lethal is chosen. A MONK'S CHOICE (move MV2c; the monk's page,
    d20srd.org/srd/classes/monk.htm, Unarmed Strike, read in Chrome 2026-10-07: "Usually a monk's unarmed strikes deal lethal
    damage, but she can choose to deal nonlethal damage instead with no penalty on her attack roll. She has the same choice to
    deal lethal or nonlethal damage while grappling"; the Grapple's own exception, "without taking the usual -4 penalty"): a
    monk's hold (by her monk level, G1) is lethal unless she pulls her blows (the standing choice, `pullBlows`), and pays no -4 */
export function holdDiceOf(c, lethalWanted) {
  const base = (c.unarmedMove && c.unarmedMove.dmg) || '1d3';
  const m = /^([0-9]*d[0-9]+|[0-9]+)(.*)$/.exec(String(base));
  const die = m ? m[1] : '1d3', rest = m ? m[2] : '';
  const monk = (c.monkLevel || 0) >= 1;
  return { dice: sizeUp(die, stepsFromMedium(c.size)) + rest, lethal: !!lethalWanted || (monk && !c.pullBlows),
           check: lethalWanted && !monk ? -4 : 0 };
}
/** the way out, { ea, mod }: the better of the grapple check (`grapple`) and Escape Artist (`escapeArtist`, the skills cog's
    sum); `ea` when Escape Artist is the one */
export const escapeCheckOf = (grapple, escapeArtist) =>
  ({ ea: escapeArtist > grapple, mod: escapeArtist > grapple ? escapeArtist : grapple });
/** the hold moved, { bonus, feet }: +4 when `c` pins the only body in its hold (`holders`); half its speed in whole 5-ft
    steps, at least 5 */
export const holdMoveOf = (c, holders, speedFt) =>
  ({ bonus: c.pinning && (holders || []).length === 1 ? 4 : 0, feet: Math.max(5, Math.floor((speedFt / 2) / 5) * 5) });
/** WHETHER A HOLD'S ACT MAY BE TAKEN NOW, for every body (move S3: her click and a seat's word ask it alike): null when it
    may; else why not, { why: 'free' } with no hold to act in, or { why: 'turn', words } with the turn's standard action
    spent (the turn cog's words, `standardWhy`, handed in; a release is free) */
export function holdGateOf({ inHold, kind, standardWhy }) {
  if (!inHold) return { why: 'free' };
  return kind !== 'release' && standardWhy ? { why: 'turn', words: standardWhy } : null;
}

/*,,. THE FEINT (move MV3; SRD, Special Attacks, Feint, d20srd.org/srd/combat/specialAttacks.htm, read in Chrome 2026-10-07) ,,,
     "make a Bluff check opposed by a Sense Motive check by your target. The target may add his base attack bonus to this
     Sense Motive check... When feinting in this way against a nonhumanoid you take a -4 penalty. Against a creature of
     animal Intelligence (1 or 2), you take a -8 penalty. Against a nonintelligent creature, it's impossible." */
/** a feint's two sides against `b`, over the sums the fight hands in (the skills cog's Bluff and Sense Motive, Coordinated
    Maneuvers' +2): { impossible } for a mindless body (no Intelligence), else { mine, theirs, penalty, animal } */
export function feintChecksOf(b, o = {}) {
  if (!b || b.int == null) return { impossible: true };
  const animal = b.int <= 2;
  const penalty = animal ? -8 : b.nonhumanoid ? -4 : 0;
  return { impossible: false, animal, penalty, mine: (o.bluff || 0) + penalty + (o.coord || 0), theirs: (o.sense || 0) + (b.bab || 0) };
}

/* ============================================================================================================================
   THE COUP DE GRACE, ONE RULE FOR THE FIGHT AND THE WORLD (sadia, 2026-10-01; Rose: "once enemies or npcs are down the
   battle should end If the player wants to kill them out of battle or heal them out of battle while they're doing death
   saves they're free to").

   SRD, Combat Modifiers, Coup de Grace (d20srd.org/srd/combat/combatModifiers.htm, read 2026-10-01 04:1x):
     "As a full-round action, you can use a melee weapon to deliver a coup de grace to a helpless opponent. You can also
      use a bow or crossbow, provided you are adjacent to the target. You automatically hit and score a critical hit. If
      the defender survives the damage, he must make a Fortitude save (DC 10 + damage dealt) or die. A rogue also gets
      her extra sneak attack damage against a helpless opponent when delivering a coup de grace. Delivering a coup de
      grace provokes attacks of opportunity from threatening opponents. You can't deliver a coup de grace against a
      creature that is immune to critical hits."
   And Rose's own: a bare fist finishes nobody (2026-09-29: "He cant finish me off without a lethal weapon").
   battle.js dealt it inside a fight and nothing dealt it outside one. Both roads ask this now: whether a blow may
   finish, the blow, and what it leaves; and both speak its words from config/text.js.
   ========================================================================================================================== */
/** WHETHER A BLOW MAY FINISH: null when it may, else why not (a reason the caller words with coupWords). The order is the
    fight's own: not helpless, not a weapon for it, out of reach, immune to criticals, a fist. */
export function coupRefusalOf({ helpless, melee, bowAdjacent, inReach, critImmune, fistPulls }) {
    if (!helpless) return "notHelpless";
    if (!melee && !bowAdjacent) return "notMelee";
    if (melee && !inReach) return "outOfReach";
    if (critImmune) return "critImmune";
    if (fistPulls) return "fist";
    return null;
}

/** "You can also use a bow or crossbow, provided you are adjacent to the target": an attack whose weapon looses arrows or
    bolts (the weapons table's own `ammo`); a sling, a thrown weapon or a spell is no bow. A bow row with no kind (the
    testbed's static shortbow) is read by its flight. The caller asks the adjacency (E9's S2; Vera's find 10-02: every
    projectile flies as an arrow, so a sling finished helpless bodies) */
export function coupBowOf(move) {
    if (!move || move.type !== "attack") return false;
    const k = kindOfMove(move);
    if (k) return k.use === "projectile" && (k.ammo === "arrows" || k.ammo === "bolts");
    return move.fx === "arrow";
}

/** a refusal in its words; `name` is the body that would have been finished */
export function coupWords(why, name) {
    switch (why) {
        case "notHelpless": return textOf("$lohTXCoupNotHelpless", { name });
        case "notMelee": return textOf("$lohTXCoupNotMelee");
        case "outOfReach": return textOf("$lohTXCoupOutOfReach", { name });
        case "critImmune": return textOf("$lohTXCoupCritImmune", { name });
        case "fist": return textOf("$lohTXCoupFist");
        default: return null;
    }
}

/** THE BLOW: an automatic critical (the weapon's multiplier), unless fortification's roll finds no vitals, when it lands
    plain; a rogue's sneak dice ride only the critical. `base` is the weapon's roll with its damage modifiers, before the
    multiplier; `fortRoll` the d100 against `fortification` (a percentage), asked only when there is some. */
export function coupBlow({ base, critMult = 2, fortification = 0, fortRoll = null, sneak = 0 }) {
    const plain = fortification > 0 && fortRoll != null && fortRoll <= fortification;
    const mult = plain ? 1 : critMult;
    /* a hit deals at least one (SRD, Combat Statistics, Minimum Damage: "If penalties reduce the damage result to less
       than 1, a hit still deals 1 point of damage"), the coup's blow too: it lands by its own road, never resolveAttack's */
    return { mult, plain, dmg: Math.max(1, base * mult + (mult > 1 ? sneak : 0)) };
}

/** WHAT THE BLOW LEAVES (SRD: "If the defender survives the damage, he must make a Fortitude save (DC 10 + damage dealt)
    or die"): a body left at -10 or lower is dead and rolls nothing (Injury and Death, Dead); a survivor saves against
    10 + the damage dealt. `killable` false (a regenerator the blood holds, no fire or acid in the blow, no sun up) lives
    whatever it rolls. `d20` and `fortBonus` are asked only when a save is made (the die and the body's whole Fortitude
    bonus), so a blow that kills outright rolls nothing. */
export function coupVerdict({ hpAfter, dealt, killable, d20, fortBonus }) {
    const dc = 10 + dealt;
    if (killable && hpAfter <= -10) return { blowKills: true, lives: false, dc, raw: null, bonus: null, total: null };
    const raw = d20(), bonus = fortBonus();
    const total = raw + bonus;
    /* a natural 1 dies and a natural 20 lives, as every save (rules/dice.js saveMade); the blood holds whatever the die */
    return { blowKills: false, lives: saveMade(raw, total, dc) || !killable, dc, raw, bonus, total };
}

/*,,. THE TORCH ON KNITTING FLESH, ONE RULE FOR EVERY STRIKER IN EITHER HOST (S2, sadia 2026-10-02; Desktop/V/s2-torch-table.md,
   row-checked by Vera) ,,,
   Rose 08-20: "they have to 1 have a torch and 2 pass a knowledge nature check to know to torch the troll blooded entity";
   Rose 10-01 (the universal audit's S2): her torch too, as everyone's. The recall is the SRD's Knowledge check
   (d20srd.org/srd/skills/knowledge.htm, read in Chrome 2026-10-02): "Knowledge (Int; Trained Only)"; "the DC of such a
   check equals 10 + the monster's HD"; untrained, "you know only common knowledge (DC 10 or lower)"; "If you have 5 or more
   ranks in Survival, you get a +2 bonus on Knowledge (nature) checks"; Try Again: "No. The check represents what you know,
   and thinking about a topic a second time doesn't let you know something that you never learned in the first place." So
   the answer is KEPT on the striker's record (skills.lore.trollBlood): a success for good, a failure until its bonus rises
   (Vera's row check). It rolled d20 + Intelligence against a flat 11, so a body with no training recalled and ranks never
   counted. The brand is the SRD's torch since 2026-10-03, and only its fire wounds the blood (below). The fight (battle.js
   burnKnitter and coupDeGrace) and the world (void.js worldCoup) ask these. */
const NATURE = "Knowledge (Nature)";
/*,,. THE BRAND IS THE SRD'S TORCH, AND ONLY ITS FIRE WOUNDS THE BLOOD (sadia 2026-10-03; Desktop/V/torch-coup-table.md TC1 to
   TC3, row-checked by Vera) ,,,
   Rose 10-02 (popup): "The SRD's torch"; Rose 10-03 (popup, written 10:19): "Only the fire wounds", the choice that read "the
   bludgeoning heals and only the fire wounds. At the blood's floor (-10) any real wound kills; above the floor the
   Fortitude save is against 10 + the fire's 2". The SRD, read in Chrome 2026-10-03: Goods and Services, Torch
   (d20srd.org/srd/equipment/goodsAndServices.htm): "treat it as a one-handed improvised weapon that deals bludgeoning
   damage equal to that of a gauntlet of its size, plus 1 point of fire damage"; Special Abilities, Regeneration
   (d20srd.org/srd/specialAbilities.htm): "Damage dealt to the creature is treated as nonlethal damage", and "Certain
   attack forms, typically fire and acid, deal damage to the creature normally"; Combat Statistics, Multiplying Damage
   (d20srd.org/srd/combat/combatStatistics.htm): "Roll the damage (with all modifiers) multiple times and total the
   results", and "Exception: Extra damage dice over and above a weapon's normal damage are never multiplied" (the torch's
   1 fire is its own damage and no dice, so a coup's x2 makes it 2). The brand was 1d3 FIRE whole: a held troll at -3,
   struck for (2 + 1) x2, took 6 and saved against 16. It takes 2 now, and saves against 12. */
/** the brand, a fresh one each time (a coup may carry its move on): a gauntlet's die at the striker's CURRENT size (the
    weapons table's row, stepped as Enlarge Person steps a body's gear), bludgeoning, and `fire`, the torch's 1 point */
export const torchBrand = (size) => ({ name: "Torch", type: "attack", dmgType: "bludgeoning",
    dmg: sizeUp(WEAPON_TABLE.Gauntlet.dmg, stepsFromMedium(size)), fire: 1, toHit: 0, rangeFt: 7.2, anim: "attack" });
/** THE BRAND'S BLOW: its steel is coupBlow's own (the critical, fortification's plain hit, the sneak dice on the critical
    only, at least 1), and its fire is multiplied as the steel is */
export function brandBlow({ base, critMult = 2, fortification = 0, fortRoll = null, sneak = 0, fire = 1 }) {
    const steel = coupBlow({ base, critMult, fortification, fortRoll, sneak });
    return { ...steel, steel: steel.dmg, fire: fire * steel.mult };
}
/** WHAT IT WOUNDS: `soak(type, n)` is the caller's own (drSoak: damage reduction on the steel, resistance on the fire). The
    steel wounds only where the blood does not hold it (`steelHeld`, the caller's reading of the blood and the sun), and the
    fire always. `real` is what the body loses, `healed` the steel the blood closes (said, never taken), and `killable`
    whether the blow can kill at all (coupVerdict's word) */
export function brandLands({ blow, type, soak, steelHeld }) {
    const steel = soak(type, blow.steel), fire = soak("fire", blow.fire);
    return { steel, fire, steelHeld: !!steelHeld, real: fire.dmg + (steelHeld ? 0 : steel.dmg),
             healed: steelHeld ? steel.dmg : 0, killable: !steelHeld || fire.dmg > 0 };
}
/** the brand's two parts in words, the fight's and the world's alike: `expr` is the steel's dice and multiplier; `less` puts
    each part's resisted share in (the fight's card's working), else the caller says it apart (a seat's line, the world's
    card) */
export function brandWork({ expr, blow, land, type, less = false }) {
    const lessOf = (p) => (less && p.soaked > 0 ? ", " + textOf("$lohTXNoteLessResisted", { n: p.soaked }) : "");
    return textOf("$lohTXBrandSteel", { expr, n: blow.steel, type }) + lessOf(land.steel)
        + (land.steelHeld && land.steel.dmg > 0 ? textOf("$lohTXBrandHeld") : "")
        + "; " + textOf("$lohTXBrandFire", { n: blow.fire / blow.mult, mult: blow.mult, dmg: blow.fire }) + lessOf(land.fire);
}
/** what a body brings to Knowledge (Nature), off its skills view (battle/roster.js skillViewOf for a fighter): the ranks
    it BOUGHT (the trained gate: the blood's grant never trains it) and its whole bonus, the skills cog's (rules/skills.js
    checkOf: the ranks, Intelligence, the blood, feats, traits, the Survival synergy, a druid's nature sense) */
export function natureLoreOf(view) {
    return { ranks: Math.max(0, boughtRanks(view, NATURE)), bonus: checkOf(view, NATURE, {}).total };
}
/** THE RECALL, KEPT. `kept` is the striker's answer so far ({ known: true }, or { known: false, bonus }, or null): a known
    answer stands with no roll; a failure stands with no roll until `bonus` rises past the one it failed with; untrained
    there is no roll (the blood's DC is 11 or more) and the failure is kept; else d20 + bonus against 10 + `hd`. `d20` is
    asked only when a roll is made, and the answer's `kept` is the record's new value. */
export function trollRecall({ bonus = 0, ranks = 0, hd = 1, kept = null, d20 }) {
    const dc = 10 + Math.max(1, Math.floor(+hd) || 1);
    const b = Math.floor(+bonus || 0);
    const trained = (+ranks || 0) >= 1;
    if (kept && kept.known === true)
        return { knows: true, rolled: false, trained, raw: null, bonus: b, total: null, dc, kept };
    if (kept && kept.known === false && b <= (+kept.bonus || 0))
        return { knows: false, rolled: false, trained, raw: null, bonus: b, total: null, dc, kept };
    if (!trained)
        return { knows: false, rolled: false, trained, raw: null, bonus: b, total: null, dc, kept: { known: false, bonus: b } };
    const raw = d20();
    const total = raw + b;
    const knows = total >= dc;
    return { knows, rolled: true, trained, raw, bonus: b, total, dc, kept: knows ? { known: true } : { known: false, bonus: b } };
}
/** the recall in its words, the fight's and the world's alike; `name` is the striker */
export function trollRecallWords(r, name) {
    if (r.rolled) return textOf("$lohTXTrollRecall", { name, raw: r.raw, bonus: r.bonus ? (r.bonus > 0 ? "+" : "") + r.bonus : "",
        total: r.total, dc: r.dc, verdict: r.knows ? textOf("$lohTXTrollRecallYes") : textOf("$lohTXTrollRecallNo") });
    if (r.knows) return textOf("$lohTXTrollKnown", { name });
    if (r.trained) return textOf("$lohTXTrollStillNot", { name });
    return textOf("$lohTXTrollUntrained", { name });
}
/* THE KEPT ANSWER'S ONE READER AND ONE WRITER (Vera's row check 10-02: one module owns `skills.lore.trollBlood`; the fight's
   bake reads it, the world's hand-back and its coup write it) */
/** the striker's kept answer on its record (skills.lore.trollBlood), or null */
export function trollLoreOf(rec) {
    const k = rec && rec.skills && rec.skills.lore && rec.skills.lore.trollBlood;
    return k && typeof k === "object" ? k : null;
}
/** keep an answer on a record: true when it changed (the caller then keeps a seat's ledger). The section's `lore` is made
    when missing: the builders that make a skills section of their own (npcSheet.js, void.js standNpc, levelling.js) carry
    none, and only the fresh section has it */
export function keepTrollLore(rec, kept) {
    if (!rec || !rec.skills || typeof rec.skills !== "object" || !kept || typeof kept !== "object") return false;
    const was = trollLoreOf(rec);
    if (was && was.known === kept.known && (+was.bonus || 0) === (+kept.bonus || 0)) return false;
    if (!rec.skills.lore || typeof rec.skills.lore !== "object") rec.skills.lore = {};
    rec.skills.lore.trollBlood = { ...kept };
    return true;
}

/*,,. THE COUP AS AN ACT, ONE FOR EVERY BODY IN EITHER HOST (move CA, the plug-and-play order's step 2b; Desktop/V/maneuvers-
   cog-table.md "Move CA", Vera's check and answers) ,,,
   Rose 2026-10-07: "one system should be able to just be plug and played into whatever character is tied to it". The rules
   above were asked by two acts that drifted, battle.js coupDeGrace with burnKnitter and void.js worldCoup; this is the one
   act. It takes the striker (`body`: its fighter's facts, with the hit points its riders read), the VIEW its host's adapter
   builds (the same fields in a fight and out of one) and the host's DOORS, and imports no host. Its dice come in the order
   both acts drew them: the recall's d20, the shot loosed, the weapon's dice, fortification's d100, the sneak dice, the save.
   THE VIEW: names { her, seat } (what each eye calls the striker); move (the blow in hand); light ("torch", "sunrod" or
   null: what burns in its hand); lore() ({ bonus, ranks, kept, told }: its Knowledge (Nature), its kept troll answer, and
   `told` when this fight has heard its recall; asked only at a torch); dark() (Shadow Strike's dark where it stands, asked
   only for sneak dice); distFt (to the target); again (a blow come back once its blade is drawn); brandOnly (no act and no
   word unless the brand comes down: the fight's torch road); scene (the feats cog's, S7a); target { names, fighter (what
   the rules read: critImmune, fortification, hd, dr, fireRes), helpless, held(type) (its blood holds a wound of that type
   now: regeneration, the type, the sun where it lies), hp() (its hit points now), fort() (its whole Fortitude bonus), cap
   (the blood's floor) }.
   THE DOORS: guard(), dry(move) and round() (a host's refusals: words { her, seat } or null; the world's foe within reach of
   the striker, as out of a fight there is no free swing to give it; a shot with nothing to loose; the fight's full round);
   refused(words) (told to the chooser); find() (the unseen's two rounds: true to strike this round); spend(); ready(move,
   go); provoke(go); wield(move) ("go"; "later" when the blade is drawn first and the blow comes back; "no"); loose(move)
   ({ move, stone, drawn }); swing(move, impact) (the blow played; impact() lands it; the host goes on after it);
   hurt(n, type, mult); feed(n); declare(); keepLore(kept); d20(); roll(dice); say(words) (a line by eye, { her, seat },
   either may be null); show(kind, facts) (a card: "recall", "wound", "save"); kill(facts); live(facts). Answers true when
   the blow fell, comes back or took the round, false when refused. */
/** WHY THIS BLOW MAY NOT FINISH, over a host's view (coupRefusalOf, the fight's order): reach by the weapons cog's band, a
    bow adjacent by the engine's one measure (5 feet and its slack, so the diagonal square counts, as the SRD's adjacency
    does), a fist that pulls its blow. Null when it may; the reason otherwise (coupWords says it) */
export function coupWhyNot(body, view, move) {
    const t = view.target, melee = move.type === "attack" && !move.fx;
    return coupRefusalOf({ helpless: t.helpless, melee,
        bowAdjacent: coupBowOf(move) && view.distFt <= ADJACENT_FT + REACH_SLACK_FT,   // a bow or crossbow, never a sling (rules/maneuvers.js; E9's S2)
        inReach: inBand(strikeBandOf(body, move), view.distFt), critImmune: !!(t.fighter && t.fighter.critImmune),
        fistPulls: pullsBlows(body, move) });
}
export function coupAct(body, view, doors) {
    const t = view.target, tf = t.fighter || {}, say = !view.brandOnly;
    const no = (w) => { if (say) doors.refused(w); return false; };
    const g = doors.guard();
    if (g) return no(g);
    /* THE HAND: the blow in it, or the brand where a torch meets helpless flesh its blood holds and the striker knows to
       (S2's rule above: the recall kept on the striker's record, told once) */
    let move = view.move, branding = false;
    if (view.light === "torch" && t.helpless && t.held(move.dmgType)) {
        const lore = view.lore();
        /* told this fight: its answer stands, with no recall and no word (the fight's once a fight); else the recall */
        const r = lore.told ? { knows: !!(lore.kept && lore.kept.known === true) }
            : trollRecall({ bonus: lore.bonus, ranks: lore.ranks, hd: tf.hd || tf.level || 1, kept: lore.kept, d20: () => doors.d20() });
        if (!lore.told) {
            doors.keepLore(r.kept);
            if (!view.again) doors.show("recall", { r, words: { seat: trollRecallWords(r, view.names.seat),
                her: r.rolled ? textOf("$lohTXTrollRecallSaid", { name: view.names.her,
                    verdict: r.knows ? textOf("$lohTXTrollRecallYes") : textOf("$lohTXTrollRecallNo") }) : trollRecallWords(r, view.names.her) } });
        }
        if (r.knows) { move = torchBrand(body.size); branding = true; }   // a gauntlet's die at its size (Desktop/V/torch-coup-table.md TC1)
    }
    if (view.brandOnly && !branding) return false;
    /* whether it may finish (coupWhyNot, above, the fight's order), then a shot with nothing to loose, then the host's round */
    const why = coupWhyNot(body, view, move);
    if (why) return no({ her: coupWords(why, t.names.her), seat: coupWords(why, t.names.seat) });
    const dry = doors.dry(move);
    if (dry) return no(dry);
    const round = doors.round();
    if (round) return no(round);
    /* the unseen's two rounds (the fight's: nothing is struck while finding, and the round is spent on it) */
    if (!doors.find()) return true;
    doors.spend();
    doors.ready(move, () => doors.provoke(() => blow(move)));
    return true;

    function blow(mv) {
        if (doors.wield(mv) !== "go") return;
        /* the brand's own line, the striker's and hers when it falls near her, once the hand is ready */
        if (branding) doors.say({ her: textOf("$lohTXTorchBrand", { by: view.names.her, name: t.names.her }),
                                  seat: textOf("$lohTXTorchBrand", { by: view.names.seat, name: t.names.seat }) });
        /* a coup by arrow spends its arrow, as every hit does (weapons E3); a sling's empty pouch, a stone */
        mv = doors.loose(mv).move;
        const r = doors.roll(mv.dmg);
        /* THE BLOW IS THE RULE'S (rules/maneuvers.js coupBlow, which the world's coup asks too): fortification is the partial
           no-vitals chance, made, the blow is a plain hit (no crit, no precision; RAW's full immunity already refused the coup
           at the dispatch); a rogue's sneak dice ride only the critical, Shadow Strike's die in the dark among them */
        const fortPct = tf.fortification || 0;
        const fortRoll = fortPct > 0 ? doors.roll("1d100").total : null;
        const plain = fortPct > 0 && fortRoll <= fortPct;
        const dice = !plain && (mv.critMult || 2) > 1 ? sneakDiceFrom(body, () => !!view.dark()) : 0;
        const sneak = dice ? doors.roll(dice + "d6").total : 0;
        /* the brand's blow is its steel and its fire, each multiplied (rules/maneuvers.js brandBlow; Desktop/V/torch-coup-table.md TC4) */
        /* the riders are the feats cog's (featRidersOf, S7a), over the striker's hit points now */
        const b = (mv.fire ? brandBlow : coupBlow)({ base: r.total + (body.dmgMod || 0) + featRidersOf(body, mv, view.scene),
            critMult: mv.critMult || 2, fortification: fortPct, fortRoll, sneak, fire: mv.fire });
        let note = b.plain ? " " + textOf("$lohTXCoupFortNote", { pct: fortPct, roll: fortRoll }) : "";
        if (sneak && b.mult > 1) note += " " + textOf("$lohTXCoupSneakNote", { n: sneak });
        const expr = mv.dmg + " " + r.text + " ×" + b.mult + (sneak && b.mult > 1 ? " +" + sneak : "");
        /* her line with no number, the world's own words (W2), and its twin with the working the seats' (C5-2) */
        /* the brand's whole line waits for what its two parts land as (onImpact, below) */
        doors.say({ her: textOf("$lohTXCoupBlowSaid", { by: view.names.her, name: t.names.her }),
                    seat: mv.fire ? null : textOf("$lohTXCoupBlow", { by: view.names.seat, name: t.names.seat, expr, dmg: b.dmg, note }) });
        doors.swing(mv, () => land(mv, b, expr, note));
    }

    function land(mv, b, expr, note) {
        /*,,. THE BRAND LANDS IN TWO PARTS (rules/maneuvers.js brandLands; Desktop/V/torch-coup-table.md TC4; Rose 2026-10-03: "Only
           the fire wounds") ,,,
           its steel against the body's damage reduction, and only where the blood does not hold it; its fire against the
           body's resistance, always. What wounds is the sum. Every other blow is one part, as before */
        const held = t.held(mv.dmgType);
        const ld = mv.fire ? brandLands({ blow: b, type: mv.dmgType, soak: (type, n) => drSoak(tf, type, n), steelHeld: held }) : null;
        const soak = ld ? null : drSoak(tf, mv.dmgType, b.dmg);
        const dealt = ld ? ld.real : soak.dmg;
        const resisted = ld ? [[ld.steel.soaked, mv.dmgType], [ld.fire.soaked, "fire"]] : [[soak.soaked, mv.dmgType]];
        const work = ld ? brandWork({ expr, blow: b, land: ld, type: mv.dmgType }) : null;
        if (ld) doors.say({ her: null, seat: textOf("$lohTXBrandBlow", { by: view.names.seat, name: t.names.seat, dmg: ld.real, note, work }) });
        for (const [n, type] of resisted) if (n > 0) doors.say({ her: null, seat: textOf("$lohTXCoupResist", { name: t.names.seat, soaked: n, type }) });
        /* the wound's kind: the brand's fire where the blood holds its steel */
        const type = ld && ld.steelHeld ? "fire" : mv.dmgType;
        const killable = ld ? ld.killable : !held;
        const before = t.hp();
        doors.hurt(dealt, type, b.mult);
        const after = t.hp();
        doors.feed(dealt);
        doors.declare();
        const said = { expr, note: note.trim(), blowDmg: b.dmg, work, resisted,
            card: ld ? brandWork({ expr, blow: b, land: ld, type: mv.dmgType, less: true })
                     : expr + (soak.soaked > 0 ? ", " + textOf("$lohTXNoteLessResisted", { n: soak.soaked }) : "") };
        doors.show("wound", { dealt, type, mult: b.mult, before, after, killable, said });
        /*,,. THE SAVE IS FOR A BODY THE BLOW LEFT ALIVE (SRD, Combat Modifiers, Coup de Grace,
           d20srd.org/srd/combat/combatModifiers.htm, read 2026-09-30) ,,,
           "If the defender survives the damage, he must make a Fortitude save (DC 10 + damage dealt) or die." A
           blow that leaves the body at -10 or lower has killed it (Injury and Death, "Dead (-10 Hit Points or
           Lower)"), so no save is rolled or shown. It was rolled first, and a coup from -9 to -13 read
           "Fortitude save: d20(13)+4 = 17 vs DC 14 → dies." (seen live 2026-09-30). A body the blood holds is
           not killed by the blow: it rolls, as before. Her tally keeps its kind and its finisher, the two the
           world reads (void.js coupBy); the save's DC and roll it also carried were read nowhere, and are gone. */
        const v = coupVerdict({ hpAfter: after, dealt, killable, d20: () => doors.d20(), fortBonus: () => t.fort() });
        if (v.blowKills) doors.say({ her: textOf("$lohTXCoupKillsSaid", { name: t.names.her }),   // her line with no number, the world's (C5-2)
                                     seat: textOf("$lohTXCoupKills", { name: t.names.seat, hp: after }) });
        else doors.show("save", { v, dealt });
        const facts = { dealt, before, after, v, killable, held: !killable, cap: t.cap, said };
        if (!v.lives) doors.kill(facts);
        else doors.live(facts);
    }
}
