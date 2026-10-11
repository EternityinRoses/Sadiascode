/* ============================================================================
   THE ATTACK COG (the machine map's 5.3, its item 6, move 6b-1a; Desktop/V/attack-cog-table.md, row-checked by Vera):
   the attack roll's terms, each [n, word]. A move carries its terms beside its sum (`toHitTerms`, baked by
   battle/roster.js and moves.js fitMove); every change to a move after the bake goes through termed(), so the list and
   the sum never part. battle.js resolveAttack gathers the rest of the roll's terms beside its bonus, and the test holds
   the two equal (test_attackTerms) before any line reads them (move 6b-1b). The words are config/text.js's keys, or a
   feat's, a trait's or a row's own name. The full attack's iteratives live here too (move 6b-2: iterativesOf, the
   blows a base attack bonus earns, and iteratedOf, a blow and its copies through termed), and since move AW1 the whole
   routine: routineOf (a body's full attack), shotRoutineOf (the bow's) and rapidChains, out of battle/battle.js; and since move AW2a its own pure
   terms: isRanged, flanksFrom, intoMeleeTerm, sneakDiceFrom and openingOf (the rule here, the scene the battle's); and since
   move AW2b the roll itself: attackRoll, rollDamage and damageDiceOf; since move S7a it asks the feats cog at the roll's
   slot and the damage's (moonOf, barbaricOf, ethnocentricOf, featRollOf, featRidersOf).
   ========================================================================== */
import { textOf } from '../config/text.js';
/* the routine's (move AW1): the claws are hands (rules/hands.js, moved whole out of battle/ so this cog asks no host's
   file; Vera's check), and the flurry's penalty by monk level (the weapons cog's, until the Classes cog's C3 takes it to
   the Monk's own file) */
import { freeNaturals, handsHeldBy } from './hands.js';
import { pullTollOf, pullsBlows, rangeIncrementOf, noDamageTo, shotEmptyOf, ammoWordOf } from './weapons.js';
import { flurryPenaltyAt } from './classes/monk.js';   // the flurry's penalty by her monk level (the Classes cog, move C3)
/* the roll's (move AW2b): the dice and the roll's words; the rows' terms on the swing and the guard, the boons' and
   the armour's (the Conditions cog's); the miss chance's percentile (world/cover.js, the Senses' when it moves) */
import { d20, roll, maxOf, rolledOf, sayRolled } from './dice.js';
import { swingTermsOf, guardTermsOf, boonTermsOf, armourBonusOf, proneRefuses } from './conditions.js';
import { shieldAtkOf } from './armour.js';   // a tower shield's -2, read at the roll (IT1a; armour.js imports only its table)
import { concealMiss, CONCEALED, TOTALLY_CONCEALED } from '../world/cover.js';
/* the feats' and bloods' terms at the roll's slot and the damage's (move S7a): the feats cog's fills, over the scene the
   host hands */
import { moonOf, barbaricOf, ethnocentricOf, featRollOf, featRidersOf } from './feats.js';

/** a move's terms: its baked list, or one term for a move baked with none (a statblock's row, the testbed's) */
export function termsOfMove(move) {
  if (move && Array.isArray(move.toHitTerms)) return move.toHitTerms;
  return [[(move && move.toHit) || 0, textOf('$lohTXAtkBonus')]];
}

/** a copy of the move with `n` more on its attack and the term that says why: the one door for a change after the bake */
export function termed(move, n, word) {
  return { ...move, toHit: ((move && move.toHit) || 0) + n, toHitTerms: [...termsOfMove(move), [n, word]] };
}

/** what a list of terms adds up to */
export const sumOf = (terms) => (terms || []).reduce((s, t) => s + ((t && +t[0]) || 0), 0);

/** the effects still written onto attackMod by hand, by name, until each is a row of the boons' table (Nobility,
    Inspire Courage, Augment Summoning; Desktop/V/attack-cog-table.md A9 and A10): the map the writers keep */
export const handTermsOf = (c) => Object.entries((c && c.atkHand) || {}).map(([word, n]) => [n, word]);
/** A TOWER SHIELD'S -2 ON EVERY ATTACK ROLL ITS BEARER MAKES (IT1a, Vera's; the SRD, Armor, tower shield: "you take a -2
    penalty on attack rolls because of the shield's encumbrance"), read at the roll from what the body holds now, so a
    shield strapped on or loosed mid-fight is never a stale bake: the one door every roll sum asks */
export const towerAtkOf = (actor) => shieldAtkOf(actor && actor.shieldWorn);
/** a writer's hand on attackMod, kept by name: `n` added (or taken back with -n) under `word` */
export function handAtk(c, word, n) {
  if (!c) return;
  c.attackMod = (c.attackMod || 0) + n;
  const h = c.atkHand || (c.atkHand = {});
  h[word] = (h[word] || 0) + n;
  if (!h[word]) delete h[word];
}

/** THE ORDINAL WORDS a routine's blows are named and worded by (move 6b-2): 1 "first" to 5 "fifth", keys */
export function nthWord(n) {
  switch (n) {
    case 1: return textOf('$lohTXNth1');
    case 2: return textOf('$lohTXNth2');
    case 3: return textOf('$lohTXNth3');
    case 4: return textOf('$lohTXNth4');
    case 5: return textOf('$lohTXNth5');
    default: return String(n);
  }
}
/** a hand's nth blow, named as the off hand's always were: "Longsword (second)" */
export const nthBlowName = (name, n) => textOf('$lohTXBlowNth', { move: name, nth: nthWord(n) });

/** THE BLOWS A BASE ATTACK BONUS EARNS (move 6b-2; SRD, Combat Statistics, Base Attack Bonus: "A second attack is gained
    when a base attack bonus reaches +6, a third with a base attack bonus of +11 or higher, and a fourth with a base attack
    bonus of +16 or higher"; each 5 below the one before, the classes' tables; Actions in Combat, Full Attack: "in order
    from highest bonus to lowest"): the offsets, highest first. Natural weapons take none (SRD, Special Abilities) */
export function iterativesOf(bab) {
  const b = Math.floor(+bab || 0);
  return [0, -5, -10, -15].slice(0, b >= 16 ? 4 : b >= 11 ? 3 : b >= 6 ? 2 : 1);
}

/** a leading blow and its iterative copies, highest first: the first as it is, each further one through termed by its
    word ("second attack") and named by `nameAt(k)` (k = 2 for the second attack; by default the hand's nth blow) */
export function iteratedOf(move, bab, nameAt = (k) => nthBlowName(move.name, k)) {
  return iterativesOf(bab).map((off, i) => (i === 0 ? { ...move }
    : { ...termed(move, off, textOf('$lohTXAtkIterNth', { nth: nthWord(i + 1) })), name: nameAt(i + 1) }));
}

/*,,. CAN THIS RANGED WEAPON CHAIN RAPID SHOT'S SECOND SHOT (SRD, feats.htm, read 2026-09-29) ,,,
   A bow always. A crossbow only under Rapid Reload, and only a hand or light one (a move to load, freed): "If you have
   selected this feat for hand crossbow or light crossbow, you may fire that weapon as many times in a full attack action
   as you could attack if you were using a bow." A heavy crossbow's load is still a move, and a repeating one's case is
   its own road. One question for her full mode and a seat's SHOOT alike. */
/* (move AW1) Rapid Reload read by name, as battle.js's hasFeat read it, until the Feats cog's featsOf (Vera's F1) */
export const rapidChains = (actor, move) => !!move && (!move.reload
  || (move.reload === 'move' && Array.isArray(actor.feats) && actor.feats.includes('Rapid Reload')));
/** ONE SHOT ROUTINE (the attack cog, move 6b-2), her full mode's bow and a seat's SHOOT alike, a plain function so a
    routine composed without a battle (a test's) asks it too: a shot that chains (rapidChains) fires the iteratives its base
    attack bonus earns; with Rapid Shot on, the volley first (SRD, feats.htm, Rapid Shot: "one extra attack per round with
    a ranged weapon. The attack is at your highest base attack bonus, but each attack you make in that round (the extra one
    and the normal ones) takes a -2 penalty"): the first shot, the extra, then the iteratives, every shot -2. A routine of
    one shot, or a shot that cannot chain: [] */
export function shotRoutineOf(actor, shot) {
  if (!shot || !rapidChains(actor, shot)) return [];
  const bab = actor.bab || 0;
  if (actor.rapidShotOn) {
    const rapid = { ...termed(shot, -2, 'Rapid Shot'), name: shot.name + ' (rapid)' };
    const [first, ...more] = iteratedOf(rapid, bab, () => rapid.name);
    return [first, { ...rapid }, ...more];
  }
  const shots = iteratedOf(shot, bab);
  return shots.length >= 2 ? shots : [];
}

/** THE FULL ATTACK'S ROUTINE (move AW1: battle.js fullRoutineFor's body, moved whole; Desktop/V/attack-cog-table.md AW1):
    a body's blows in a full attack, from its own fields. `rows` is the move table (battle/moves.js MOVES), which the
    battle's door hands in for the strike slot's static row */
/* THE ROUTINE COMPOSER (Rose 08-14: "full attack shouldnt really be
   limited to naturals... main hand off hand. or main hand off hand
   gore etc"). A wielded melee weapon LEADS at full bonus; an off-hand
   (the day equipment grants one, `actor.offhandMove`) follows with the
   SRD two-weapon table: -6/-10 bare, -4/-8 light off-hand, -4/-4 with
   the feat, -2/-2 with both; and beside any manufactured weapon every
   natural goes SECONDARY. With empty hands the fist leads where a hand
   is free and every natural goes secondary beside it, as beside steel
   (Rose 2026-10-01, below); a clawed body's hands are its claws, so its
   blood leads as baked: the claws primary, the rest secondary. */
export function routineOf(actor, rows) {
  const nats = actor.naturalWeapons || [];
  const key = actor.equipped;
  /* A BOW IN HAND FIRES ITS SHOT ROUTINE (shotRoutineOf, the attack cog's move 6b-2: Rapid Shot's volley, then the
     iteratives a base attack bonus earns; a seat's SHOOT asks the same one); a crossbow chains only under Rapid Reload
     (rapidChains). A shot with no routine (one shot, or one that cannot chain) falls through, as before */
  if (key === 'bow' && actor.rangedMove) {
    const volley = shotRoutineOf(actor, actor.rangedMove);
    if (volley.length >= 2) return volley;
  }
  /* THE STRIKE SLOT IS THE WEAPON IN THE HAND (moveForKey's own rule): the baked gear weapon when there is one, the
     static row otherwise. This read MOVES[key] itself, so a full attack beside a natural weapon or an off hand swung
     the static "Sword Strike" (+6, 1d8+2) whatever was held: a seat's greatsword, her own dagger (seen in the arena
     runs, 2026-09-29: Vessa, a horned Fighter with a Greatsword, full-attacked with "Sword Strike, Gore"). */
  const held = (key === 'strike' && actor.meleeMove && actor.meleeMove.gear) ? actor.meleeMove
      : (key && rows && rows[key]) || null;
  const wield = held && held.type === 'attack' && !held.fx && !held.unarmed ? held : null;
  /* an off hand swings only beside a main hand: with the main hand empty
     the blood (or the fists) lead and the second blade waits */
  const off = wield ? (actor.offhandMove || null) : null;
  /* CLAWS ARE HANDS (Rose 09-16): every weapon held takes a claw out of the
     round, two-handed steel or a second blade both of them; gore, bite and
     tail stay secondary beside steel exactly as before. hands.js is the rule. */
  const natsFree = freeNaturals(nats, handsHeldBy(wield, off));
  /*,,. AND WITH EMPTY HANDS THE FIST LEADS WHERE A HAND IS FREE (Rose 2026-10-01) ,,,
     Grist, a bare-handed Cambion, only ever gored once: this composer handed a body with no weapon its naturals
     alone, so a lone gore was a routine of one, instinct's full-attack gate never opened, and her own full mode
     refused. Rose: "a full attack would be weapon + gore or unarmed + gore", and in the popup, "All of its one system
     if npcs can do it everyone can do it unless its a custom boss ruleset". SRD, Unarmed Attacks
     (d20srd.org/srd/combat/actionsInCombat.htm): "Unarmed strikes count as light weapons"; Natural Weapons
     (d20srd.org/srd/specialAbilities.htm): beside a manufactured weapon "any natural weapons the creature also uses
     are considered secondary natural attacks". So the fist leads at its own numbers and every natural rides at its
     baked `sec` beside it, as beside steel: her full mode, a seat's ATTACK and instinct alike. Only where holding the
     fist takes no claw (hands.js: a claw IS a hand), so a clawed body keeps its claws' routine below. */
  const fist = !wield && nats.length && actor.unarmedMove
      && freeNaturals(nats, 1).length === nats.length ? actor.unarmedMove : null;
  const routine = [];
  /* THE ITERATIVES (the attack cog, move 6b-2; rules/attack.js iteratedOf): the leading hand's blows a base attack bonus
     earns, highest first, each named as a hand's further blows are and worded "second attack" in its terms */
  const bab = actor.bab || 0;
  if (wield) {
    let mainPen = 0, offPen = 0;
    if (off) {
      const light = !!off.light;
      mainPen = actor.twf ? (light ? -2 : -4) : (light ? -4 : -6);
      offPen = actor.twf ? (light ? -2 : -4) : (light ? -8 : -10);
    }
    /* each change through termed (the attack cog, move 6b-1a), so the blow's terms say why; the primary hand's every
       attack pays the two-weapon penalty (SRD, Two-Weapon Fighting, Normal: "your regular attack or attacks with your
       primary hand") */
    const twoW = textOf('$lohTXAtkTwoWeapons');
    routine.push(...iteratedOf(mainPen ? termed(wield, mainPen, twoW) : { ...wield }, bab));
    const offHand = off ? termed(off, offPen, twoW) : null;
    if (off) routine.push(offHand);
    /* Improved and Greater Two-Weapon Fighting: a second and a third
       off-hand swing at -5 and -10 (SRD), the day an off-hand exists; the off hand's own, never the iteratives */
    if (off && actor.itwf) routine.push({ ...termed(offHand, -5, textOf('$lohTXAtkOffSecond')), name: nthBlowName(off.name, 2) });
    if (off && actor.gtwf) routine.push({ ...termed(offHand, -10, textOf('$lohTXAtkOffThird')), name: nthBlowName(off.name, 3) });
    for (const n of natsFree)
      routine.push({ ...n, primary: false,
                     toHit: n.sec.toHit, toHitTerms: n.sec.toHitTerms, dmg: n.sec.dmg });
  } else if (fist) {
    /* the fist takes no claw (its own test above), so every natural is free beside it; the fist leads with its
       iteratives (an unarmed strike is no natural weapon), the naturals ride beside with none */
    routine.push(...iteratedOf(fist, bab));
    for (const n of natsFree)
      routine.push({ ...n, primary: false,
                     toHit: n.sec.toHit, toHitTerms: n.sec.toHitTerms, dmg: n.sec.dmg });
  } else if (nats.length) {
    routine.push(...nats);
  } else if ((actor.monkLevel || 0) >= 1
             && actor.unarmedMove && actor.flurry !== false) {
    /* FLURRY OF BLOWS (SRD monk 1st: "he may make one extra attack
       in a round... this penalty applies for 1 round" -- at 1st
       level, two attacks each at -2). The routine architecture the
       naturals built carries it whole; empty monk hands are never
       "one blow is a standard action" again. */
    /* A MONK BY HER MONK LEVEL, AND HER PENALTY BY IT (G1 and its M4, 2026-10-02; the SRD read in Chrome that day, Monk,
       Flurry of Blows: "When a monk reaches 5th level, the penalty lessens to -1, and at 9th level it disappears"): the
       class's name kept a Fighter / Monk built from Fighter out of it, and the savant it was handed. */
    /* AND THE TABLE'S WHOLE COLUMN (the attack cog, move 6b-2; SRD, Monk, Flurry of Blows: "one extra attack in a round
       at her highest base attack bonus, but this attack takes a -2 penalty, as does each other attack made that round",
       the modified bonuses "shown in the Flurry of Blows Attack Bonus column on Table: The Monk"; Greater Flurry at 11th:
       "a second extra attack at her full base attack bonus"): the first blow, the extra (two from 11th), then the
       iteratives, each with the penalty by her monk level; the column's 8th +5/+5/+0, its 11th +8/+8/+8/+3 */
    const blow = termed(actor.unarmedMove, flurryPenaltyAt(actor.monkLevel), textOf('$lohTXAtkFlurry'));
    const named = (k) => textOf('$lohTXBlowNth', { move: textOf('$lohTXFlurryName'), nth: nthWord(k) });
    const extras = (actor.monkLevel || 0) >= 11 ? 2 : 1;
    const [first, ...more] = iteratedOf(blow, bab, (k) => named(k + extras));
    routine.push({ ...first, name: named(1) });
    for (let e = 1; e <= extras; e++) routine.push({ ...blow, name: named(1 + e) });
    routine.push(...more);
  } else if (actor.unarmedMove && iterativesOf(bab).length >= 2) {
    /* A BARE FIST ALONE, no naturals and no flurry (move 6b-2): its iteratives, the full attack it never had */
    routine.push(...iteratedOf(actor.unarmedMove, bab));
  }
  return routine;
}

/* ---- ATTACK'S OWN TERMS, out of battle.js (move AW2a; Desktop/V/attack-cog-table.md "Move AW2", Vera's check): the
   rule here, the scene there. The battle keeps a door or a gatherer under each old name (tests stub them on the fight),
   and hands in each fact the rule asks, only when it asks */
/*,,. WHAT COUNTS AS A RANGED ATTACK, ONCE ,,,
   Rose, 2026-09-15, holding a shortbow: "explain why my bow is doing 17+4
   attack". Because the bonus line asked `move.fx`, which a RAY sets and a
   BOW does not -- so his Unsteady flaw (-3 on ranged attack rolls) never
   reached the arrow, and Palsied (-3 on MELEE rolls) would have reached it
   by mistake. He was rolling +4 where the flaw he paid a bonus feat for
   makes it +1.

   THE FILE ALREADY HELD A BETTER TEST, in sneakOpening (battle.js), and
   that is the whole lesson: two answers to one question a few lines apart,
   and the attack roll asked the wrong one. THREE copies of the wrong one,
   in fact -- the swing, the full attack and the blow at scenery.

   `rangeFt > 10` catches a weapon built without the flags; a melee move
   carries 7.2 ft of reach, so it cannot trip this. */
export function isRanged(move) {
  return !!(move && (move.fx || move.ranged || move.thrown
                     || (move.rangeFt || 0) > 10));
}

/** FLANKING'S GEOMETRY (move AW2a, out of battle.js flankingAlly, which keeps who stands with her: allied, up,
    threatening the target): the attacker at `ap` and the ally at `op` stand around the target at `tp` from roughly
    opposite sides, more than 120 degrees apart */
export function flanksFrom(ap, tp, op) {
  const av = { x: ap.x - tp.x, z: ap.z - tp.z };
  const alen = Math.hypot(av.x, av.z) || 1;
  const ov = { x: op.x - tp.x, z: op.z - tp.z };
  const olen = Math.hypot(ov.x, ov.z) || 1;
  const cos = (av.x * ov.x + av.z * ov.z) / (alen * olen);
  return cos < -0.5; // more than 120 degrees apart
}

/*,,. SHOOTING OR THROWING INTO A MELEE (SRD, d20srd.org/srd/combat/actionsInCombat.htm, read 2026-09-29) ,,,
   "If you shoot or throw a ranged weapon at a target engaged in melee with a friendly character, you take a -4
   penalty on your attack roll. Two characters are engaged in melee if they are enemies of each other and either
   threatens the other. (An unconscious or otherwise immobilized character is not considered engaged unless he is
   actually being attacked.) If your target ... is at least 10 feet away from the nearest friendly character, you
   can avoid the -4 penalty ... If you have the Precise Shot feat you don't take this penalty."
   The penalty was never charged, so Precise Shot bought nothing (the general feats check, 2026-09-29). A friend here
   is a standing ally of the shooter; a friend and the target are engaged when they are at war and either threatens
   the other (armed, awake, within THREAT_FT); a target the friend has knocked senseless is not engaged. */
/* (move AW2a) the rule, out of battle.js intoMeleePenalty, which hands in the shooter's own three facts and asks the
   scene (`engaged`: how many friends are engaged with the target; `nearestFt`: the nearest friend's distance) only
   when the rule reaches it */
export function intoMeleeTerm(o, scene) {
  if (!o.ranged || o.preciseShot || !o.targetUp) return 0;
  const s = scene();
  if (!s.engaged) return 0;
  return s.nearestFt >= 10 ? 0 : -4;
}

/** A SHOT, AS THE LADDER ASKS IT (move AI1): a weapon's attack that draws ammunition or flies as an arrow; a thrown
    weapon keeps its own road's gates, and a spell's missile is no weapon (the caller asks the fight's verseOf) */
export function isShot(move) {
  return !!(move && move.type === 'attack' && (move.ammo || move.fx === 'arrow') && !move.thrown);
}

/*,,. ONE LADDER BEFORE A SHOT, FOR EVERY ROAD (move AI1, sadia 2026-10-08; Desktop/V/asking-table.md) ,,,
   Rose 10-08: "there should be no 'Well the player can do this, but x cant'". Her click, a seat's SHOOT word and an
   NPC's instinct each put their own questions before a shot, and they disagreed: a seat could not fire a crossbow prone
   where she could, a seat refused a shot into fog that she took at a 50% miss, and her shot at a body behind total
   cover rolled a sure miss and spent its arrow where a seat's was refused. One ladder now, each rung the SRD's: a
   shooting weapon; the storm (weather.htm, Storms: "Ranged weapon attacks are impossible in a storm"; the fight's
   weather); prone (conditionSummary.htm, Prone: "cannot use a ranged weapon (except for a crossbow)";
   conditions.js proneRefuses); the range (the fight's bandOf); the ammunition (weapons.js shotEmptyOf); total cover
   (combatModifiers.htm, Total Cover: "You can't make an attack against a target that has total cover"). Total
   CONCEALMENT is no rung: the book lets the attack go into the square at a 50% miss, and the roll charges it. `b` is
   the fight, whose doors answer the weather, the band and the line. Answers { why, say }, or null when it may shoot. */
export function whyNoShot(b, actor, target, move = actor && actor.rangedMove) {
  const at = { name: actor && actor.name, target: target && target.name };
  const no = (why, say) => ({ why, say });
  if (!isShot(move)) return no('bow', textOf('$lohTXShotNoBow', at));
  const w = b.weather ? b.weather() : null;
  if (w && w.ranged === null) return no('storm', textOf('$lohTXShotStorm', { ...at, weather: w.kind === 'tornado' ? 'tornado' : 'storm' }));
  if (proneRefuses(actor, move)) return no('prone', textOf('$lohTXProneNoRanged', at));
  if (b.distFt(actor, target) > b.bandOf(actor, move).maxFt) return no('range', textOf('$lohTXShotRange', at));
  if (shotEmptyOf(actor, move)) return no('ammo', textOf('$lohTXNoAmmo', { name: at.name, ammo: ammoWordOf(move.ammo) }));
  const cov = b.coverBetween(actor, target);
  if (cov && cov.total) return no('cover', textOf('$lohTXShotCover', at));
  return null;
}

/*,,. SHADOW STRIKE'S DIE IS COUNTED WITH THE REST (Rose 2026-09-29, "darkness period") ,,,
   "a free sneak attack dice when in the dark", and "regardless of class path": one die more while the striker
   stands in the dark (featHooks darkAround: magical darkness, or no light reaching it), none in the light. It
   was a standing die for a body with no class dice (roster.js, paid by day too) and a second one after
   nightfall; it is one die, in the dark, whatever the class. Counted here so every reader of the opening (the
   swing, the parry's riposte, the coup, the free-swing offer) pays the same number. */
/* (move AW2a) the sum, out of battle.js sneakDiceOf, which hands the dark in (featHooks darkAround), asked only for a
   Shadow Striker */
export const sneakDiceFrom = (actor, dark) => (actor.sneakDice || 0) + (actor.shadowStrike && dark() ? 1 : 0);

/**
 * PRECISION DAMAGE: is this body OPEN, and can this attacker see to use it?
 *
 * Sneak attack is two questions and both must answer yes. The engine only
 * ever asked the first half of one of them (flanking, for its +2), so this
 * is the whole test in one place, and every consumer reads it here.
 *
 * OPEN (any one of these):
 *   - flanked, melee only. A flanked body is the classic opening and the
 *     engine already knows how to see it.
 *   - flat-footed. Set at initiative, cleared on your own first turn, so
 *     the opening round is real rather than theoretical.
 *   - helpless: bound, unconscious, paralysed. Nothing sets this yet.
 *   - blinded, or an attacker it cannot see. Nothing sets these yet either,
 *     but they are the same denial and belong in the same list.
 * Deliberately NOT here: PRONE. A prone body keeps its Dex bonus in 3.5
 * (it takes an AC penalty in melee instead), and the engine already models
 * that penalty separately. Prone is not an opening.
 *
 * SEEN WELL ENOUGH:
 *   - no concealment on the target. You cannot pick a vital spot you cannot
 *     make out, which is why the mist that hides a body also protects it.
 *   - ranged shots inside 30 ft. Past that it is a lucky shot, not a chosen
 *     one, and there are no Str-based extra dice on it either.
 *   - the target can actually HAVE vitals: a creature immune to critical
 *     hits is immune to this too. Undead, constructs, oozes, plants and
 *     elementals in 3.5; here it is the `critImmune` flag, and the game's
 *     own `fortification` percentage is the partial version, rolled at
 *     resolution because it is a chance rather than a state.
 *
 * openingOf answers the reason, the player-facing word, or null; battle.js sneakOpening pairs it with the dice.
 */
/* (move AW2a) the ladder, out of battle.js sneakWhy, which hands in what only the scene knows (Vera's cogs will
   answer them: Senses' concealment and unobserved, Conditions' helpless; the distance; the flanking ally), each asked
   only when the ladder reaches it, in today's order */
export function openingOf(actor, target, ranged, ask) {
  if (target.critImmune) return null;
  if (ranged && ask.distFt() > 30) return null;
  if (ask.concealment()) return null;
  /* the corridor's unconscious ARE helpless, and RAW says the rogue may
     sneak attack them; the flag stays for other sources (bound, held) */
  if (ask.helpless()) return 'helpless';   // the one question (effects step 2c)
  if (target.blinded) return 'blinded';
  if (target.flatFooted) return 'flat-footed';
  /* A won feint is a denied Dex bonus, and denied Dex is the sneak
     attack's own condition, so the precision dice ride the swing the
     feint bought. Melee only, and only for the body that did the lying. */
  if (!ranged && target.deniedDexTo && target.deniedDexTo.by === actor) return 'feinted';
  if (ask.unobserved()) return 'unseen';
  if (!ranged && ask.flanked()) return 'flanked';
  return null;
}

/* ---- THE ROLL ITSELF (move AW2b; Desktop/V/attack-cog-table.md "Move AW2", Vera's check and her names). battle.js
   resolveAttack's to-hit, guard, miss chances, threat, opening and fortification (attackRoll), and its damage
   (rollDamage), moved here with every word that explains them. The battle hands in what only the scene knows: `gather()`
   is its swingFacts, read right after the d20 as the roll always read them; `ask` holds what only a hit or a threat asked
   (each hook runs only where it ran before: Deflect Arrows spends its once a round, a Shadow Step's roll is made once).
   The dice are drawn in today's order. The cover and the concealment are the Senses' to answer, the feats' terms the
   Feats cog's by slot, helpless the Conditions', the base AC the Sheet's (map 5.3); until those cogs stand, the battle
   reads each where it always did. */
/* a feat read by name, the exact copy of battle.js's hasFeat, until the Feats cog's one reader (Vera's table) */
const hasFeat = (f, name) => Array.isArray(f.feats) && f.feats.includes(name);

/** THE DAMAGE DICE (rollDmg's body; Maximize and Empower). battle.js rollDmg is its door, asked by every road */
export function damageDiceOf(move) {
  const r = roll(move.dmg);
  if (move.maximize) {
    const mx = maxOf(move.dmg);
    r.rolls = []; r.total = mx; r.text = `[max ${mx}]`;
  }
  if (move.empower) {
    const half = Math.floor((move.maximize ? roll(move.dmg).total : r.total) / 2);
    r.total += half;
    r.text += ` +${half} (empowered)`;
  }
  return r;
}

/** THE ATTACK ROLL over a swing { attacker, target, move }: the scene's facts from `gather()`, the lazy `ask`s; answers
    the roll's record (its sum and terms, the AC and its words, hit or miss and why, the threat and the confirmation, the
    opening and fortification, the line, and what the damage needs) */
export function attackRoll(swing, gather, ask) {
  const { attacker: actor, target, move } = swing;
  const raw = d20();
  const fumble = raw === 1;
  const autoHit = raw === 20;
  /* the scene's facts for this swing, read now as the roll always read them, right after the d20 (move AW2b) */
  const f = gather();
  /* the feats' and bloods' terms, asked of the feats cog at the roll's slot over the scene the host handed (move S7a) */
  const scene = f.scene || {};
  const moon = moonOf(actor, scene), barbaric = barbaricOf(actor), kin = ethnocentricOf(actor, scene), tower = towerAtkOf(actor);
  let atkBonus = move.toHit + (actor.attackMod || 0) + tower
    + (isRanged(move) ? (actor.rangedAtkMod || 0) + f.weather
                             : (actor.meleeAtkMod || 0))
    + moon.n
    /* dazzled's -1 is the rows' term too (swingTermsOf, effects step 2b) */
    /* SRD Prone: -4 on melee swings thrown from the ground (08-20), the row's own term (rules/conditions.js) */
    + swingTermsOf(actor, isRanged(move)).atk
    + barbaric + kin;
  /*,,. EVERY TERM OF THE ROLL, NAMED, BESIDE ITS SUM (the attack cog, move 6b-1a; Desktop/V/attack-cog-table.md) ,,,
     atkBonus is summed as it always was; these say what it is made of, each [n, word]: the move's own (rules/attack.js
     termsOfMove), the boons' and the rows' on attackMod (rules/conditions.js boonTermsOf), the effects still written
     onto it by hand (handTermsOf), the melee or ranged fields' parts, and the moment's here and below. test_attackTerms
     holds the two equal; the line and the card say them (6b-1b: rules/dice.js sayRolled and sayMods). */
  const rangedRoll = isRanged(move);
  const atkTerms = [...termsOfMove(move), ...boonTermsOf(actor, 'attackMod'), ...handTermsOf(actor),
    ...((rangedRoll ? actor.rangedAtkParts : actor.meleeAtkParts) || []),
    [rangedRoll ? f.weather : 0, textOf('$lohTXAtkWeather')],
    [moon.n, moon.word],
    ...(swingTermsOf(actor, rangedRoll).terms || []),
    [barbaric, 'Barbaric'], [kin, 'Ethnocentric'], [tower, textOf('$lohTXTowerShield')]];
  /* the feats' terms on the swing (the feats cog's featRollOf, move S7a: the dials, Paired Opportunists on a reaction) */
  const fb = featRollOf(actor, target, move, scene);
  atkBonus += fb.n;
  atkTerms.push(...(fb.terms || []));
  /* a standing choice against the weapon's nature, -4 where the SRD asks it (weapons D1n: Pull Blows, Strike to Kill) */
  const toll = pullTollOf(actor, move);
  if (toll) { atkBonus += toll;
    atkTerms.push([toll, pullsBlows(actor, move) ? textOf('$lohTXAtkPull') : textOf('$lohTXAtkKill')]); }
  /* Point Blank Shot, RAW: +1 on attack AND damage rolls with
     ranged weapons at up to 30 feet (level-1 audit, Rose 08-20:
     the feat sat in the pool with no engine behind it) */
  let pbs = 0;
  if (move.fx && hasFeat(actor, 'Point Blank Shot')
      && f.distFt <= 30) {
    pbs = 1;
    atkBonus += 1;
    atkTerms.push([1, 'Point Blank Shot']);
  }
  /* and a shot into a melee takes the SRD's -4 unless Precise Shot waives it (intoMeleePenalty) */
  const intoMelee = f.intoMelee;
  if (intoMelee) {
    atkBonus += intoMelee;
    atkTerms.push([intoMelee, textOf('$lohTXAtkIntoMelee')]);
  }
  if (move.rangeIncFt) {
    const dist = f.distFt;
    /* Far Shot: a shot's increments half again as long, a throw's twice (rules/weapons.js rangeIncrementOf) */
    const increments = Math.floor(dist / rangeIncrementOf(actor, move));
    if (increments > 0) {
      atkBonus -= increments * 2;
      atkTerms.push([-increments * 2, textOf('$lohTXAtkRange')]);
    }
  }
  // flanking bonus for melee attacks
  let preciseDice = false;
  let b2b = false;
  if (move.type === 'attack' && !move.fx && (move.rangeFt || 0) <= 10) {
    const fAlly = f.flank.ally;
    if (fAlly) {
      /* Outflank: +4 when the fellow carries it too */
      const fl = f.flank.bonus;
      atkBonus += fl;
      atkTerms.push([fl, fl > 2 ? 'Outflank' : textOf('$lohTXAtkFlank')]);
      /* PRECISE STRIKE (teamwork, pool text): flanking with an
         ally who ALSO carries it, +1d6 with a light or one-handed
         piercing weapon. Light gear and naturals qualify (naturals
         are always light); the two-handed spear does not. */
      if (hasFeat(actor, 'Precise Strike')
          && hasFeat(fAlly, 'Precise Strike')
          && move.dmgType === 'piercing'
          && (move.light || move.natural)) {
        preciseDice = true;
      }
    }
    /* BACK TO BACK (teamwork, pool text): the TARGET, adjacent to
       an ally who also carries it, takes +2 AC against flankers.
       Flagged here, paid below where AC is assembled. */
    if (f.flank.backToBack) {   // a friend of the target's beside it with the feat too: the battle's to see
      b2b = true;
    }
  }
  /* the feats' terms on the damage (featHooks: the power attack dial,
     the affinities' blades, the woods, the night, the grudge) */
  const fd = f.feat.damage;
  const dmgMod = (actor.dmgMod || 0) + featRidersOf(actor, move, scene) + pbs + fd.n;   // the damage's riders (move S7a)
  let ac = f.acBase;   // a touch less what it ignores (acNotTouch; Vera's AC3)
  ac += target.acMod || 0;
  if (b2b) ac += 2;   // Back to Back, flagged at the flank check
  if (target.defending) ac += f.totalDefense;
  /* THE GUARD'S ROWS AGAINST THIS ONE SWING (rules/conditions.js guardTermsOf; effects steps 2a and 2c): helpless (the
     fight's one answer, helplessFor: Dex 0 by RAW, combatModifiers, and +4 to a melee swing; a ranged one gets none),
     the sun's blind round, stunned (-2 and no Dex), and prone's -4 against melee and +4 against ranged. Said beside
     the AC and the roll, never paid into acMod; the deliberate version is coupDeGrace, which never rolls at all. */
  const guardRow = guardTermsOf(target, isRanged(move), { helpless: f.helpless,
    meleeSwing: move.type === 'attack' && !move.fx && !isRanged(move) });
  ac += guardRow.ac;
  atkBonus += guardRow.atk;
  atkTerms.push(...(guardRow.atkTerms || []));
  /* the feats' terms on the guard (featHooks: the expertise dial,
     Mobility against a reaction, the affinities' blades, the woods,
     the moon) */
  const fa = f.feat.guard;
  ac += fa.n;
  /* THE GUARD'S OWN TERMS BELONG TO THE GUARD (the overnight duel, 2026-09-27): this appended them to the
     attacker's side of the line, so Kestra's +2 AC from her greatsword read as Wrenna's +2 to hit,
     "d20(1)+2 (+2 greatsword) = 3 vs AC 15", with the 2 already inside the 15. They go beside the AC now. */
  const acFeatNote = fa.note || '';
  /* "You can make an attack with an unarmed strike, natural weapon, or light weapon against another
     character you are grappling. You take a -4 penalty on such attacks." (SRD, If You're Grappling) */
  if (f.attackerHeld && move.type === 'attack' && !move.fx) {
    atkBonus -= 4;
    atkTerms.push([-4, textOf('$lohTXAtkGrappling')]);
  }
  const total = raw + atkBonus;
  /*,,. AND SO DO THE TWO SPELLS THAT ARE WORTH EXACTLY ONE ROLL ,,,
     True Strike is "+20 on your NEXT single attack roll" and Guidance is "+1
     on a single attack roll, saving throw, or skill check". Both are already
     IN `atkBonus` on the line above, which is the whole point of spending
     them one line below it: the roll they were bought for gets them, and the
     next roll does not. Same law as the feint directly beneath -- the opening
     was the purchase and the swing is the spending, hit or miss. */
  ask.spend();   // the battle spends them and says so, here, where they were always spent
  /* A FEINT SPENDS ITSELF HERE. Denied Dex is an AC drop, not a flag that
     merely feels good: the swing it was bought for lands against a guard
     short by the whole Dex bonus. Melee only, the body that earned it only,
     and consumed below whether it hits or misses, because the opening was
     the purchase and the swing was the spending. */
  const meleeSwing = !(move.fx || move.thrown) && (move.rangeFt || 0) <= 10;
  const feinted = !!(target.deniedDexTo && target.deniedDexTo.by === actor && meleeSwing);
  let feintNote = '';
  if (feinted) {
    const dex = Math.max(0, target.dexMod || 0);
    ac -= dex;
    feintNote = ` (-${dex} feinted)`;
  }
  /*,,. WHAT A HOLD COSTS THE GUARD (SRD, Grappling Consequences) ,,,
     "No Dexterity Bonus: You lose your Dexterity bonus to AC (if you have one) against opponents you aren't
     grappling. (You can still use it against opponents you are grappling.)" And for a pin: "you take a -4
     penalty to your AC against opponents other than the one pinning you."
     Only when the guard still HAS its Dexterity to lose: the helpless, blinded and stunned branches above
     have already taken it, and taking it twice would be a second rule nobody wrote. */
  if (!guardRow.dexGone
      && f.targetHeldByOther) {
    const dex = Math.max(0, target.dexMod || 0);
    ac -= dex;
    feintNote += dex ? ` (-${dex} grappled)` : ' (grappled)';
  }
  if (target.pinnedBy && target.pinnedBy !== actor) {
    ac -= 4;
    feintNote += ' (-4 pinned)';
  }

  // SRD cover: +4 AC when something solid grazes the line of the shot
  let coverNote = '';
  let coverProp = null;
  let coverTotal = false;
  if ((move.fx || move.thrown) && !actor.impPreciseShot) {
    const cov = f.cover;
    if (cov) {
      /*,,. THE COVER'S OWN NUMBER, NOT A HARD-CODED FOUR ,,,
         This read `ac += 4` whatever the cover was, so improved cover paid
         +4 instead of +8 and TOTAL cover -- which means there is no line of
         effect at all -- made a target four harder to hit rather than
         impossible. Total is already refused for magic missile and for
         missiles further up this file; the ordinary attack roll never
         learned it. */
      coverProp = cov.prop;
      if (cov.total) {
        coverTotal = true;
        coverNote = cov.prop
          ? ` (no line of effect: the ${cov.prop.name} is in the way)`
          : ' (no line of effect)';
      } else {
        ac += cov.ac;
        coverNote = cov.prop
          ? ` (+${cov.ac} cover from the ${cov.prop.name})`
          : ` (+${cov.ac} cover)`;
      }
    }
  }
  /* the guard's own notes beside the AC (move 6b-1b, the overnight duel's rule above): its rows' (prone, and the sun's
     blind round and the stun since Vera's half of it), and Back to Back's, flagged at the flank check */
  const acLabel = `${move.touch ? 'touch AC' : 'AC'} ${ac}${target.defending ? ' (+' + f.totalDefense + ' total defense)' : ''}${acFeatNote}${guardRow.note}${b2b ? ' (back to back +2 AC)' : ''}${feintNote}${coverNote}`;
  /* AND NOTHING GETS THROUGH TOTAL COVER, whatever the die said. A natural
     20 does not find a target on the far side of a wall. */
  let hit = !coverTotal && !fumble && (autoHit || total >= ac);

  // SRD concealment: a would-be hit still rolls the miss chance
  // (20% concealed, 50% blind shot into total concealment)
  let concealText = '';
  if (hit) {
    /* the concealment this swing meets: blinded, blind past a tremor's reach, Shadow Step's unseen body, or the air
       between them, the one reading every blow and the coup de grace ask (swingConcealment) */
    const conc = ask.concealment();
    /* Improved Precise Shot ignores anything short of total
       concealment; tremorsense feels its way inside its reach */
    if (conc && !(actor.impPreciseShot && !conc.total && (move.fx || move.thrown))
        && !ask.perceives()) {
      /*,,. THE PERCENTILE IS READ IN ONE PLACE NOW (world/cover.js) ,,,
         cover.js has owned the NUMBERS since it was written and this kept
         its own reading of the die, so the world -- which had no reading at
         all until 09-15 -- could not share it. Two copies of a rule always
         drift; these two had already started, since out there a blow in fog
         was never rolled for at all.

         WHAT STAYS HERE IS THE ONLY PART THAT IS ABOUT A BODY: whether this
         particular swing earns Blind-Fight's reroll. RAW: "In melee, every
         time you miss because of concealment, you can reroll your miss
         chance percentile roll one time." Melee only -- a blind SHOT stays
         blind. cover.js takes that as a fact and never decides it. */
      const air = conc.total ? TOTALLY_CONCEALED : CONCEALED;
      let m = concealMiss(air, roll('1d100').total);
      /* AND THE REROLL IS ROLLED ONLY ONCE THE FIRST HAS MISSED. An eager
         second die would be drawn on every concealed swing in the game, for
         a feat almost no body has, shifting every roll after it. */
      const meleeHere = !(move.fx || move.thrown)
          && (move.rangeFt || 0) <= 10;
      if (m.missed && meleeHere && hasFeat(actor, 'Blind-Fight'))
        m = concealMiss(air, m.rolls[0], { again: roll('1d100').total });
      if (m.missed) hit = false;
      /* the note says WHICH state and both dice; the feat is named here
         because cover.js does not know what bought the second roll */
      concealText = ' ' + m.note
        + (m.rolls.length > 1 ? ' (Blind-Fight)' : '');
    }
  }

  /*,,. INCORPOREAL (Rose 09-16: "Fix it so it does something") ,,,
     SRD, Incorporeal Subtype, fetched 09-16: "It is immune to all
     nonmagical attack forms. Even when hit by spells or magic weapons, it
     has a 50% chance to ignore any damage from a corporeal source (except
     for positive energy, negative energy, force effects such as magic
     missile, or attacks made with ghost touch weapons)." A first-level
     race cannot be immune to every blade in the void, so what ships is
     the CHANCE alone, against every corporeal source, graded by the blood
     the way fortification is: 50% at full Shade, 25% for a cross
     (roster: f.incorporeal 1 / 0.5). Force is the one exemption the game
     can already name (dmgType 'force'); positive and negative energy and
     ghost touch join it the day they exist. The whole RAW immunity is one
     line here if Rose wants it. */
  if (hit && (target.incorporeal || 0) > 0 && move.dmgType !== 'force') {
    const chance = Math.round(50 * target.incorporeal);
    const r100 = roll('1d100').total;
    if (r100 <= chance) {
      hit = false;
      concealText += ` The blow passes through ${target.name} (incorporeal ${chance}%: ${r100}).`;
    }
  }
  /* DEFLECT ARROWS: one missile a round turned aside by a free hand;
     Snatch Arrows catches it (featHooks) */
  if (hit && (move.fx || move.thrown)) {
    const dfl = ask.feat.deflect();
    if (dfl.deflected) { hit = false; concealText += dfl.note; }
  }

  const threatRange = move.threat || 20;
  const isThreat = hit && raw >= threatRange;
  let crit = false;
  let confirmText = '';
  let confirmTotal = null;
  if (isThreat) {
    const confirmRaw = d20();
    /* WHAT A FEAT ADDS TO THE CONFIRMATION ONLY (move AW3b; the map's 5.3: the threat and its confirmation, the feats asked
       at the slots): the Feats cog's answer through the fight's door (battle/featHooks.js confirmTermsOf; Critical Focus's
       is Vera's F6), asked only on a threat, summed onto the same modifiers and named on the line after them */
    const confirmTerms = (ask.confirmTerms() || []).filter((t) => t && t[0]);
    confirmTotal = confirmRaw + atkBonus + sumOf(confirmTerms);
    crit = confirmRaw !== 1 && (confirmRaw === 20 || confirmTotal >= ac);
    /* the confirmation is "another attack roll with all the same modifiers" (SRD): its sum alone, the line has just
       named them (move 6b-1b) */
    confirmText = ` Threat! Confirm: ${sayRolled({ face: confirmRaw, mod: atkBonus })}`
      + confirmTerms.map(([n, word]) => `, ${n > 0 ? '+' : ''}${n} ${word}`).join('')
      + ` = ${confirmTotal} → ${crit ? 'CRITICAL HIT!' : 'not confirmed.'}`;
  }
  /* BLACK CAT (her canon): the first blow on each unaware foe, from a
     body nobody is watching, is a critical with no confirmation */
  if (hit && !crit && ask.feat.blackCat()) {
    crit = true;
    confirmText += ' Black Cat: the first blow on the unaware is a critical.';
  }

  // PRECISION DAMAGE, and the one thing that turns it off. Fortification is
  // the creator's number (heritage.js `fortificationFor`: 50 for half-undead,
  // 100 for full) and it negates a critical hit and a sneak attack alike, so
  // it is rolled once, here, immediately after confirmation, and applies to
  // whichever of the two happened.
  let sneak = hit ? ask.sneak() : null;
  let fortText = '';
  let fortSaved = false;
  if ((crit || sneak) && (target.fortification || 0) > 0) {
    const f100 = roll('1d100').total;
    fortSaved = f100 <= target.fortification;
    fortText = ` Fortification ${target.fortification}%: d100(${f100}) → ` +
      (fortSaved ? `${target.name} has no vitals to find.` : 'the blow lands true.');
    if (fortSaved) { crit = false; sneak = null; }
  }

  const verb = move.thrown ? 'throws the' : move.fx === 'arrow' ? 'fires' : move.anim === 'cast' ? 'casts' : 'attacks with';
  /*,,. THE LINE SAYS ITS ROLL IN THE WORLD'S NOTATION (the attack cog, move 6b-1b; Rose's 09-15 ruling on the world's
     lines) ,,, the face written out, then the bonus and every term that moved it, each by its word (rules/dice.js
     sayRolled over the roll's record): "rolled 10 on the die, +4 (+1 base attack, +3 Strength) = 14 vs AC 12". The
     notes it carried were some of those terms as words; they are the list now. The card's modifier says the same. */
  const rolled = rolledOf(raw, atkTerms);
  let rollLine = `${actor.name} ${verb} ${move.name}: ${sayRolled(rolled)} = ${total} vs ${acLabel} → ` +
    (fumble ? 'natural 1, miss!' : hit ? 'hit.' : 'miss.') + concealText + confirmText + fortText;
  return { raw, fumble, autoHit, total, atkBonus, atkTerms, ac, acLabel, hit, crit, sneak, coverProp, coverTotal, feinted,
    rolled, rollLine, concealText, confirmText, confirmTotal, fortText, fortSaved, fd, dmgMod, pbs, preciseDice, b2b, facts: f };
}

/** THE DAMAGE of a roll's record `rec` (attackRoll's answer) for the same swing: the multipliers off the original, the
    precision after them, the floor, the whip; answers it with the marks the blow leaves on its striker ({ clawsLanded,
    rent, meldSpent }) for the battle to write, so a test can roll it twice on one fighter */
export function rollDamage(rec, swing, ask) {
  const { attacker: actor, target, move } = swing;
  const { hit, crit, sneak, dmgMod, fd, preciseDice } = rec;
  const f = rec.facts;
  const marks = {};
  let dmg = 0;
  let dmgLine = '';
  let sneakExpr = '';
  /*,,. THE PRECISION HAS TO BE ITS OWN NUMBER TO GET ITS OWN CARD ,,,
     Rose, 2026-09-15: "Why isnt there a seperate card for sneak attack?"
     Because it was never kept apart: the dice were rolled, added straight
     into `dmg`, and the only trace left on the table was the word
     SNEAK ATTACK in the damage card's footer. So the card COULD not be
     drawn -- there was no quantity to draw.
     These two carry it out: how much the opening was worth, and the working
     that earned it. Everything precision goes in -- the sneak dice, the
     Forest Elf's tracking, Shadow Strike, Precise Strike -- because they are
     one idea (damage the multiplier never touches) and a card that showed
     only part of it would be a second lie. */
  let sneakDmg = 0;
  let sneakWork = '';
  let meldNote = '', floorNote = '';
  if (hit) {
    /* a SET weapon meeting a charge deals double damage (SRD), and a critical on top ADDS to it: "When you multiply
       damage more than once, each multiplier works off the original, unmultiplied damage" (SRD, Combat Statistics:
       Multiplying Damage). This multiplied the two, so a spear's x3 critical on a set came to x6; it is x4. */
    const mult = 1 + (crit ? (move.critMult || 2) - 1 : 0) + (move.setStrike ? 1 : 0);
    let detail = '';
    for (let i = 0; i < mult; i++) {
      const r = ask.damageDice(move);
      dmg += r.total + dmgMod;
      detail += (i ? ' + ' : '') + r.text + (dmgMod ? `${dmgMod > 0 ? '+' : ''}${dmgMod}` : '');
    }
    const base = dmg;
    let sneakText = '';
    /*,,. RENDING CLAWS (Pathfinder, read 2026-09-17: "If you hit a creature with two claw attacks in the same turn,
       the second claw attack deals an additional 1d6 points of damage. This damage is precision damage and is not
       multiplied on a critical hit. You can use this feat once per round.") ,,,
       The count is per turn and per target, kept on the actor and cleared where every other per-turn state is. */
    if (actor.rendingClaws && move.kind === 'claw') {
      marks.clawsLanded = (actor._clawsLanded || 0) + 1;   // the striker's count, written by the battle
      if (marks.clawsLanded === 2 && !actor._rentThisRound) {
        marks.rent = true;
        const r2 = roll('1d6');
        dmg += r2.total; sneakDmg += r2.total;
        sneakWork = (sneakWork ? sneakWork + ' + ' : '') + `rending 1d6 ${r2.text}`;
        sneakText += ` The second claw tears (Rending Claws): 1d6 ${r2.text} = +${r2.total}.`;
      }
    }
    if (sneak) {
      /* ADDED AFTER THE MULTIPLIER, WHICH IS THE WHOLE RULE. Precision
         damage is never multiplied by a critical: the extra dice are a
         chosen spot, not a harder swing, so they are rolled once and added
         on. Rolling them inside the loop above would double them on a crit,
         and it would look right in the log while being wrong. */
      const s = roll(`${sneak.dice}d6`);
      dmg += s.total;
      sneakDmg += s.total;
      sneakWork = `${sneak.dice}d6 ${s.text}`;
      sneakExpr = `+${sneak.dice}d6`;
      /* The chain has to CLOSE: the base line prints the base, and this
         line prints the addition and the new total. A log that shows 12
         after rolling a 5 is a log nobody can check. */
      /* SHADOW STRIKE's die is one of these dice (sneakDiceOf), and the line says which */
      const shadowNote = sneak.shadow ? '; one die is Shadow Strike\'s, in the dark' : '';
      sneakText = ` Sneak attack (${sneak.why}${shadowNote}): ${sneak.dice}d6 ${s.text} = +${s.total}, ${base}+${s.total} = ${dmg} total.`;
      /* TRACKING (the Forest Elf's bloodline): the surprise round's
         strikes deal +2 per sneak die, Shadow Strike's among them
         (precision, never doubled) */
      const track = (f.surprise && actor.tracking) ? sneak.dice * 2 : 0;
      if (track) {
        dmg += track; sneakDmg += track;
        sneakWork += ` +${track} tracking`;
        sneakText += ` Tracking: +${track} in the surprise, ${dmg} total.`;
      }
    }
    /*,,. SHADOWMELD'S DIE (Rose 2026-09-18: "Shadow meld only grants the sneak attack dice -after- you
       teleport. Meaning your first hit after teleporting if the enemy is blind, stun, flatfoot, flanked,
       etc... carries a bonus sneak attack dice") ,,,
       OUTSIDE the sneak attack's block on purpose, and off the clock on purpose. It is a bonus die, not a
       licence: the teleport earns it, the target's own state qualifies it, and a Shade with no rogue dice
       at all gets it exactly as a rogue does. The world sets the mark where every teleport lands (void.js
       mistyStepTo, only into real shadow), the fight spends it on the first blow that lands, and the mark
       is spent either way so it cannot ride into the next round. */
    if (actor.shadowmeld && actor.meldStepped) {
      const meldWhy = sneak ? sneak.why : ask.opening();
      if (meldWhy) {
        const md = roll('1d6');
        dmg += md.total;
        sneakDmg += md.total;
        sneakWork = (sneakWork ? sneakWork + ' + ' : '') + `+1d6 ${md.text} meld`;
        sneakText += ` Shadowmeld, the first blow out of the step (${meldWhy}): 1d6 ${md.text} = +${md.total}, ${dmg} total.`;
      } else {
        meldNote = ` Shadowmeld finds nothing open: the step is spent for nothing.`;
        sneakText += meldNote;
      }
      marks.meldSpent = true;   // the mark is spent either way, by the battle
    }
    if (preciseDice) {
      /* Precise Strike's +1d6 is precision damage like the sneak
         dice: rolled once, added after the multiplier, never
         doubled by a crit */
      const p = roll('1d6');
      dmg += p.total;
      sneakDmg += p.total;
      sneakWork = (sneakWork ? sneakWork + ' ' : '') + `+1d6 ${p.text} precise`;
      sneakText += ` Precise strike: 1d6 ${p.text} = +${p.total}, `
        + `${dmg} total.`;
    }
    /*,,. A HIT DEALS AT LEAST ONE (SRD, Combat Statistics, Damage, Minimum Damage, d20srd.org/srd/combat/combatStatistics.htm,
       read 2026-10-01: "If penalties reduce the damage result to less than 1, a hit still deals 1 point of damage") ,,,
       Seen live that day: a Str 8 Cambion's lone gore is 1d6-2, a 1 came to -1, and the blow HEALED its target from 40
       to 41, since applyAttackOutcome takes the number off the bar as it comes. The floor is on the whole result,
       precision included ("the damage result"); the line keeps the roll's own sum and says why the hit dealt one. */
    if (move.dmg && dmg < 1) { dmg = 1; floorNote = ' ' + textOf('$lohTXMinDamage'); }
    /* the whip's own clause after the floor, which it overrules (weapons D1n): no damage to armour */
    if (noDamageTo(move, target, armourBonusOf(target))) { dmg = 0; floorNote = ' ' + textOf('$lohTXWhipArmoured', { name: target.name }); }
    dmgLine = `Damage: ${move.dmg}${dmgMod ? ` (${dmgMod > 0 ? '+' : ''}${dmgMod} mods${fd.note})` : ''}${crit ? ` ×${mult}` : ''} ${detail} = ${base} ${move.dmgType || 'damage'}.` + sneakText + floorNote;
  }
  return { dmg, dmgLine, sneakExpr, sneakDmg, sneakWork, meldNote, floorNote, marks };
}

/*,,. THE DAMAGE PACKET (move AW3; the map's 5.3: Attack hands "the DAMAGE PACKET ... the amount, its type, lethal or not,
   the weapon's make (magic, silver, cold iron, adamantine), crit, sneak" to HEALTH, which lands it: rules/health.js
   landedOf) ,,,
   One part today, the blow's own type (a flaming blade's two the day one exists); `make` null until a weapon carries one;
   `lethal` false for a blow that cannot kill (pulled: the fight's fistPulls, or its caller's `nonlethal`); `precision`
   the sneak's share of the amount, which no multiplier touched; `by` and `move` for whoever lands it. */
export function packetOf(res, pulled) {
  const r = res || {};
  const n = Math.max(0, r.dmg || 0);
  return { amount: n, parts: [{ n, type: r.dmgType || null }], lethal: !pulled, make: null, crit: !!r.crit,
    precision: r.sneakDmg || 0, by: r.attacker || null, move: r.move || null };
}

/*,,. THE CONFIRMED CRITICAL'S SLOT (move AW3b; the map's 5.3 slots: "after a hit ... whether a body can be crit") ,,,
   The facts a critical feat reads at that moment (Vera's F6, through battle/featHooks.js afterCrit): who, whom, with
   what, the damage dealt and its type, the multiplier, and the confirmation's total (a feat that compares it with the
   target's defence asks it; null for Black Cat's critical, which rolls no confirmation). Pure; null for a blow that was
   not a critical. */
export function critOf(res, target) {
  if (!res || !res.hit || !res.crit) return null;
  const move = res.move || null;
  return { by: res.attacker || null, target: target || null, move, dmg: res.dmg || 0, dmgType: res.dmgType || null,
    mult: (move && move.critMult) || 2, confirmTotal: res.confirmTotal != null ? res.confirmTotal : null, confirmed: true };
}

/*,,. A BLOW AT A THING (move AW4; the map's 5.3: attack owns "attacks on objects", its tangle "a second road beside the
   first"; the book, Smashing an Object, d20srd.org/srd/exploration.htm: "your attack roll is opposed by the object's AC") ,,,
   The sum battle.js resolveObjectAttack added, in its order: the move's own bonus, the attacker's attack, a shot's ranged
   bonus and the weather on it (or a blade's melee bonus), the moon, the rows' swing terms, barbaric and ethnocentric, the
   feats' attack bonus; then Point Blank Shot's +1 for a shot within 30 feet, and -2 a range increment. A 20 hits and a 1
   misses, and a thing is never threatened ("Objects are immune to ... critical hits"). The scene's facts are the host's
   (battle.js objectFacts), read right after the d20 as the creature's road reads its own; the moon, Barbaric, Ethnocentric
   and the feats' dials are the feats cog's fills over the scene it hands (move S7a). */
export function objectRollOf(swing, gather) {
  const { attacker: actor, target, move } = swing;
  const raw = d20();
  const f = gather();
  const scene = f.scene || {};   // the feats cog's fills read it (move S7a)
  const fumble = raw === 1;
  const ranged = isRanged(move);
  let atkBonus = move.toHit + (actor.attackMod || 0) + towerAtkOf(actor)
    + (ranged ? (actor.rangedAtkMod || 0) + f.weather : (actor.meleeAtkMod || 0))
    + moonOf(actor, scene).n
    /* dazzled's -1 is the rows' term too (swingTermsOf, effects step 2b) */
    /* prone swings at scenery pay the same -4 (SRD, 08-20), the row's own term (rules/conditions.js) */
    + swingTermsOf(actor, ranged).atk
    + barbaricOf(actor) + ethnocentricOf(actor, scene)
    /* the power attack dial swings at scenery too (the feats cog's featRollOf, no target) */
    + featRollOf(actor, null, move, scene).n;
  let rangeNote = '';
  /* Point Blank Shot pays against scenery too: the SRD's 30 feet
     exempt nothing that can be shot */
  let pbs = 0;
  if (move.fx && hasFeat(actor, 'Point Blank Shot') && f.distFt <= 30) {
    pbs = 1;
    atkBonus += 1;
    rangeNote = ' (+1 point blank)';
  }
  if (move.rangeIncFt) {
    /* Far Shot: a shot's increments half again as long, a throw's twice (rules/weapons.js rangeIncrementOf) */
    const increments = Math.floor(f.distFt / rangeIncrementOf(actor, move));
    if (increments > 0) {
      atkBonus -= increments * 2;
      rangeNote += ` (range penalty ${increments * 2})`;
    }
  }
  const total = raw + atkBonus;
  const ac = target.ac;
  const hit = !fumble && (raw === 20 || total >= ac);
  return { raw, fumble, total, atkBonus, ac, hit, pbs, rangeNote };
}

/*,,. WHAT A BLOW DOES TO A THING (moves AW4 and AW4b; the book, Smashing an Object, d20srd.org/srd/exploration.htm, read in
   Chrome 2026-10-07) ,,,
   One rule for every blow on a thing, a swing at it and a stray shot it catches, in the book's order:
     Immunities: "Objects are immune to nonlethal damage" -- a blow that cannot kill (`pulled`) does nothing;
     Ranged Weapon Damage: "Objects take half damage from ranged weapons ... Divide the damage dealt by 2 before applying
       the object's hardness" -- every ranged WEAPON, a shot or a throw (isRanged), never a spell's ray or blast;
     Energy Attacks: "Acid and sonic attacks deal damage to most objects just as they do to creatures ... Electricity and
       fire attacks deal half damage ... Cold attacks deal one-quarter damage ... before applying the hardness";
     Hardness: "Whenever an object takes damage, subtract its hardness from the damage".
   Until AW4b only an arrow was halved as ranged, only fire as energy, and a pulled blow broke things. Pure: what lands,
   what the hardness drank, which shares bit (`halved`: 'ranged', 'fire', 'electricity', 'cold'), `immune` for a blow
   that cannot kill, and the line's words for each step (config/text.js). */
export function objectDamageOf(move, prop, base, pulled) {
  if (pulled) return { dmg: 0, soaked: 0, halved: [], notes: [], immune: true, steps: [textOf('$lohTXObjNonlethalSaid')] };
  let cur = base;
  /* each share's words twice: the line's step ("halved to 5 (fire)") and the card's note ("halved (fire)") */
  const halved = [], steps = [], notes = [];
  if (isRanged(move) && move.anim !== 'cast') {
    cur = Math.floor(cur / 2);
    halved.push('ranged');
    steps.push(textOf('$lohTXObjHalvedRangedSaid', { n: cur }));
    notes.push(textOf('$lohTXNoteHalvedRanged'));
  }
  if (move.dmgType === 'fire') {
    cur = Math.floor(cur / 2);
    halved.push('fire');
    steps.push(textOf('$lohTXObjHalvedFireSaid', { n: cur }));
    notes.push(textOf('$lohTXNoteHalvedFire'));
  } else if (move.dmgType === 'electricity') {
    cur = Math.floor(cur / 2);
    halved.push('electricity');
    steps.push(textOf('$lohTXObjHalvedElectricSaid', { n: cur }));
    notes.push(textOf('$lohTXNoteHalvedElectric'));
  } else if (move.dmgType === 'cold') {
    cur = Math.floor(cur / 4);
    halved.push('cold');
    steps.push(textOf('$lohTXObjQuarteredColdSaid', { n: cur }));
    notes.push(textOf('$lohTXNoteQuarteredCold'));
  }
  const soaked = Math.min(cur, prop.hardness);
  const dmg = Math.max(0, cur - prop.hardness);
  steps.push(textOf('$lohTXObjHardnessSaid', { h: prop.hardness, n: soaked }));
  return { dmg, soaked, halved, steps, notes };
}
