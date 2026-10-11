/* ============================================================================
   THE DYING ROAD, ONE CODE FOR THE WORLD AND THE FIGHT (the map's item 5, Desktop/Systems/machine-map.md 4.6; Vera
   2026-10-03, Desktop/V/health-cog-table.md, sadia's check: move 5a the fall and the round, 5b the hours and the days
   after and Rose's left-alone rule).

   The world's road (world/void.js injuryStart, bleedRound, injuryStep) and the fight's corridor (battle/battle.js
   finish, corridorTick) were two codes kept equal by hand. Their RULES live here, as answers over a body's facts;
   each road keeps what is its own: its clock (a fight's turns, the world's six real seconds a round and its hours),
   where the state is kept (a fighter's fields, the record's health.injury), and its words, cards and log.

   THE BOOK (SRD, Injury and Death, d20srd.org/srd/combat/injuryandDeath.htm, read 2026-10-03; the Condition Summary,
   /srd/conditionSummary.htm):
     "When your character's current hit points drop to between -1 and -9 inclusive, he's dying. A dying character
      immediately falls unconscious and can take no actions."
     "On the next turn after a character is reduced to between -1 and -9 hit points and on all subsequent turns, roll d%
      to see whether the dying character becomes stable. He has a 10% chance of becoming stable. If he doesn't, he loses
      1 hit point." "If the character's hit points drop to -10 or lower, he's dead."
     Disabled: "A character with 0 hit points, or one who has negative hit points but has become stable and conscious,
      is disabled."
   ROSE'S RULINGS: troll blood holds a wound that is not fire, acid or the sun to the blood's cap ("-10 is the threshold
   and -19 is the cap", 2026-09-28, the CONDS regeneration row's caps), and a Diehard body stands to -9 ("diehard
   conscious caps at -9"); Diehard by the SRD's feat: "When reduced to between -1 and -9 hit points, you automatically
   become stable."
   A NEW WOUND ON A STABLE BODY: the book is silent (neither page says); MY READING, named so in the table and to Rose
   for her overrule: a new wound bleeds again, so the body is dying again.
   ========================================================================== */
import { CONDS, grantOf } from "./conditions.js";   // the regeneration row and the blood's grant (troll blood's hold, below)
/* the heal's words (the text table) and the night's natural rate (data/heal.js, this cog's own numbers; move H1) */
import { textOf } from "../config/text.js";
import { nightHp } from "../data/heal.js";

/**
 * Where a body lands when a wound leaves it at `hp`.
 * facts: { living: false for a body that never walks the road (revenant.js walksTheCorridor), undead (destroyed at 0),
 *          bloodHolds (troll blood catches this wound), diehard, cap (the blood's cap, trollCapOf below),
 *          prior: the body's road before the blow ("dying", "stable", "held", "cold" for a body knocked out cold, or
 *          none; sadia's check 2026-10-03) }
 * Answers { road, conscious, hp }:
 *   "up"        1 or more: no road
 *   "held"      troll blood: stable at hp (clamped to the cap), conscious with Diehard down to -9
 *   "cold"      exactly 0 for a body already out cold: it stays senseless (a knockout is not disabled)
 *   "disabled"  exactly 0: conscious
 *   "stable"    Diehard below 0: conscious, as disabled
 *   "dying"     -1 to -9, whatever road it lay on before: a body out cold or stable that a wound takes below 0 bleeds
 *   "dead"      -10 or lower, or a body that never walks the road
 *   "destroyed" the undead at 0 or below
 * The road before matters only at exactly 0 (out cold stays out cold); below 0 the number decides, the book's own
 * "-1 to -9 inclusive, he's dying", so a stable body hit again is dying again (my reading of the book's silence) and a
 * knockout struck below 0 is dying, not still stable (sadia's find, 2026-10-03).
 */
export function fallOf(hp, facts = {}) {
    if (hp >= 1) return { road: "up", conscious: true, hp };
    if (facts.undead) return { road: "destroyed", conscious: false, hp };
    if (facts.living === false) return { road: "dead", conscious: false, hp };
    if (facts.bloodHolds) {
        const held = Math.max(hp, Number.isFinite(facts.cap) ? facts.cap : -10);
        return { road: "held", conscious: !!facts.diehard && held >= -9, hp: held };
    }
    if (hp <= -10) return { road: "dead", conscious: false, hp };
    if (hp === 0) return facts.prior === "cold" ? { road: "cold", conscious: false, hp } : { road: "disabled", conscious: true, hp };
    if (facts.diehard) return { road: "stable", conscious: true, hp };
    return { road: "dying", conscious: false, hp };
}

/** One round of the bleeding: the d% (1 to 100) saves at 10 or under, else a hit point goes; -10 is death */
export function bleedOf(hp, pct) {
    if (pct <= 10) return { hp, stable: true, dead: false };
    const after = hp - 1;
    return { hp: after, stable: false, dead: after <= -10 };
}

/*,,. THE HOURS AND THE DAYS AFTER (move 5b) ,,,
   The book (SRD, Injury and Death; the words as world/void.js quotes them, read at d20srd.org 2026-09-27 and 09-28):
     "Recovering with Help: One hour after a tended, dying character becomes stable, roll d%. He has a 10% chance of
      becoming conscious, at which point he is disabled... Even if unconscious, he recovers hit points naturally."
     "Recovering without Help: ... He has a 10% chance each hour of becoming conscious. Each time he misses his hourly
      roll to become conscious, he loses 1 hit point. He also does not recover hit points through natural healing.
      Even once he becomes conscious and is disabled, an unaided character still does not recover hit points
      naturally. Instead, each day he has a 10% chance to start recovering hit points naturally (starting with that
      day); otherwise, he loses 1 hit point."
   Only the world's road walks them: a fight is rounds. */

/** One hour of a stable, senseless body: the d% (1 to 100) wakes it at 10 or under, disabled; missed, an untended body
    loses a hit point and is dead at -10. A tended one only waits on this roll, by design (sadia's note, 10-03): the
    book's "Even if unconscious, he recovers hit points naturally" is natural healing, the night's own road (world/rest.js),
    never this hour's d%. A tended body lying senseless has it by the nights it lies there (senselessRestOf, move 5e) */
export function hourOf(hp, pct, tended) {
    if (pct <= 10) return { hp, woke: true, dead: false };
    if (tended) return { hp, woke: false, dead: false };
    const after = hp - 1;
    return { hp: after, woke: false, dead: after <= -10 };
}

/** One day of a conscious body below 0 that nobody tends: the d% starts it mending at 10 or under (no more loss),
    else a hit point goes; -10 is death */
export function unaidedDayOf(hp, pct) {
    if (pct <= 10) return { hp, recovering: true, dead: false };
    const after = hp - 1;
    return { hp: after, recovering: false, dead: after <= -10 };
}

/** ROSE'S RULE (2026-09-28: "a player without a party member or troll blooded or some sort of friendly npc near them gets
    the you died screen... same with a llm npc"), the book's "A severely wounded character left alone usually dies" made
    the rule: a stable, senseless body with nobody's healing on it, no blood that knits it and no friend on its feet
    near is dead. Only the world asks it (D4): inside a fight a stable body is never alone (its foes stand near, and
    down is down ends the fight), and a fight's end hands the body to the world's road (void.js roadFromFight), whose
    next step asks this. */
export const aloneDies = ({ tended, regen, friendNear } = {}) => !tended && !regen && !friendNear;

/*,,. HEALING ONTO THE ROAD (move 5c) ,,,
   The book (SRD, Injury and Death): "If any sort of healing cures the dying character of even 1 point of damage, he
   stops losing hit points and becomes stable." "Healing that raises his hit points to 1 or more makes him fully
   functional again." Disabled: "A character with 0 hit points, or one who has negative hit points but has become stable
   and conscious, is disabled." Diehard (the feat): below 0 it "may choose to act as if... disabled"; Rose (2026-09-28):
   a troll-blooded Diehard body healed back to -9 is on its feet again. */

/** Where any healing (a spell, a potion, first aid's stabilizing) leaves a body on the road at `hp`, tended always:
    "up" at 1 or more, "disabled" (conscious) at exactly 0, else "stable", conscious with Diehard from -9 up. The blood's
    hold changes nothing here: a held body without Diehard lies senseless, one with it stands from -9, as any Diehard */
export function healedOf(hp, facts = {}) {
    if (hp >= 1) return { road: "up", conscious: true, tended: true };
    if (hp === 0) return { road: "disabled", conscious: true, tended: true };
    return { road: "stable", conscious: !!facts.diehard && hp >= -9, tended: true };
}

/*,,. THE ONE SOAK AND THE ONE POOL (move AW3: drSoak and nonlethalState from battle/battle.js with their stories,
   word for word; the map's 4.6: damage reduction, resistance and immunity are the target's, so health applies them;
   "this file" in the second story is battle.js) ,,, */
/* HER CANON'S DAMAGE REDUCTION IS TYPED (heritage drFor: the
   fiend-blooded drink fire {fire: 5}, the dead drink cold {cold: 5}).
   The roster has stamped f.dr whole since it was built and NOTHING
   ever read it -- the level-1 audit (Rose 08-20: "make sure the
   traits, flaws, feats, class features and spells are up and
   running") found it dead. ONE soak for every lander; the barrel's
   old fireRes field keeps answering for fire through the same law.
   SRD's untyped weapon-DR has no carrier in her tables yet; the day
   one exists, it lands here. */
export const drSoak = (f, dmgType, dmg) => {
    if (!f || dmg <= 0) return { dmg, soaked: 0 };
    const t = String(dmgType || '');
    const n = ((f.dr && typeof f.dr === 'object' && f.dr[t]) || 0)
            + (t === 'fire' ? (f.fireRes || 0) : 0);
    if (n <= 0) return { dmg, soaked: 0 };
    const soaked = Math.min(dmg, n);
    return { dmg: dmg - soaked, soaked };
};

/*,,. NONLETHAL DAMAGE: ONE POOL, AND THE LAST BLOW DECIDES THE END ,,,
   The SRD says the opposite, and it was implemented that way here from 2026-09-17: "Do not deduct the
   nonlethal damage number from your current hit points. It is not 'real' damage. Instead, when your
   nonlethal damage equals your current hit points, you're staggered, and when it exceeds your current
   hit points, you fall unconscious."

   ROSE OVERRULED IT ON 2026-09-19, and the argument is a CRPG argument that the book cannot answer
   because the book was written for a table where a DM says the second number out loud:

     "In combat the player attacks with lethal damage. They change their mind and want to hit
      nonlethal. You just gave the enemy a second health bar... one thats invisible."

   He is right, and this file proved it: `who.nonlethal` was tracked faithfully, fed the staggered
   gate and the knockout, and NOTHING IN THE HUD COULD DRAW IT. A player switching to the pommel
   watched a full bar and landed blow after blow into a number the interface had no way to show. The
   rule that reads correctly on paper reads as a bug on a screen.

   SO: every kind of damage comes off the one bar. What makes nonlethal nonlethal is the FLOOR and
   what waits at it -- his second sentence, "make it so the game goes into death saves if hit with a
   lethal blow and... yada yada if non-lethal". Empty the bar with a blade and you are dying, and the
   dying road is unchanged; empty it with a fist and you are out cold and stable. A body already down
   can still be killed, because a lethal blow keeps carrying it past zero the way it always did.

   THE TALLY IS KEPT ANYWAY, for the one thing it is still the truth about: which part of the missing
   hit points is bruising. Cure spells strip it first, and out in the world an hour by the fire gives
   it back (world/void.js soft.carried), where a real wound would not come back at all.

   STAGGERED LOSES ITS SOURCE, and that is a consequence rather than an oversight: it was defined by
   comparing the two numbers, and there is only one number now. The flag stays for any other rule that
   wants it; nothing computes it from nonlethal any more. */
export const nonlethalState = (hp, nl) => ((+nl || 0) > 0 && hp <= 0 ? 'unconscious' : 'up');

/*,,. WHERE A BLOW LANDS (move AW3, with sadia's packet; the map's 5.3: Attack hands "the DAMAGE PACKET" and asks HEALTH
   "to land the packet: damage reduction, resistance and immunity are the target's, so health applies them and says what
   the body is now"; 4.6, Desktop/V/attack-cog-table.md "Move AW3") ,,,
   The fight's applyAttackOutcome asked each of these itself; they are answered here, each the same test it was, so
   nothing changes in play. Only the answer: nothing is written. The fight writes what this says through the doors it
   has (takeHp, the bruising's tally, the knockout, the massive save's roll and card, the dying flag), and the cards'
   "what lands" ask the same soak, so a card and the bar cannot disagree. */

/**
 * What one blow does to a body.
 * packet: { parts: [{ n, type }], lethal } (rules/attack.js packetOf; one part today). body: the struck body as it stands
 * before the blow, read only. scene: { lethal: the wound can kill this body (no troll blood, a wound real to it, or the
 * sun on it) }, the fight's own answer (lethalTo below, and the sun the fight sees).
 * Answers:
 *   soaked      each part's share the body's resistance drank, [{ type, n }] (drSoak's law, above); soakedN their sum
 *   through     what got past the resistance: the cards' face
 *   dealt       what comes off the bar: all of it, or for a blow that cannot kill what is left above 0 (the floor,
 *               nonlethalState's ruling above)
 *   spill       the part of a blow that cannot kill the floor stopped
 *   bruise      the bruising's share (the nonlethal tally): all that a blow that cannot kill dealt
 *   wakes       a real wound that got through ends a knockout
 *   massive     the DC 15 Fortitude save owed (SRD, Massive Damage: a single blow of 50 or more that does not kill
 *               outright); never the undead's, never a prop's, never a blow that cannot kill, never a wound it holds
 *   knocksOut   a blow that cannot kill put the body under: out cold, never dying (SRD, Nonlethal Damage)
 *   dyingAgain  a stable body hurt to between -1 and -9, without Diehard: dying again (fallOf's reading of the book's
 *               silence); asked only when the massive save left the body alive
 */
export function landedOf(packet, body, scene = {}) {
    const b = body || {};
    const parts = (packet && Array.isArray(packet.parts)) ? packet.parts : [];
    const soaked = [];
    let through = 0;
    for (const p of parts) {
        const s = drSoak(b, p.type, p.n || 0);
        through += s.dmg;
        if (s.soaked > 0) soaked.push({ type: String(p.type || ""), n: s.soaked });
    }
    const soakedN = soaked.reduce((n, s) => n + s.n, 0);
    const lethal = !(packet && packet.lethal === false);
    const hp = b.hp || 0;
    const dealt = lethal ? through : Math.min(through, Math.max(0, hp));
    const after = hp - dealt;
    /* Diehard read as battle.js hasFeat reads it (the exact name), until the Feats cog's one reader (Vera's table, F1c) */
    const diehard = Array.isArray(b.feats) && b.feats.includes("Diehard");
    return {
        soaked, soakedN, through, dealt, spill: through - dealt, bruise: lethal ? 0 : dealt,
        wakes: lethal && through > 0,
        massive: lethal && dealt >= 50 && after > -10 && !b.isProp && !b.undead && !!scene.lethal,
        knocksOut: !lethal && through > 0 && !b.isProp && !b.dying && !b.outCold && after <= 0
            && (hp > 0 || (after === 0 && !b.stable)),
        dyingAgain: dealt > 0 && !!b.stable && after < 0 && after > -10 && !diehard,
    };
}

/*,,. A TENDED BODY HEALS WHILE IT LIES SENSELESS (move 5e; Rose 2026-10-07, in the popup: "As the book") ,,,
   SRD, Injury and Death, Recovering with Help (the words world/void.js's road quotes): "Even if unconscious, he
   recovers hit points naturally"; Recovering without Help: an unaided body "does not recover hit points through natural
   healing". Natural healing is a night's: a full night's rest, 8 hours, gives 1 hit point per character level
   (data/heal.js nightHp, handed in as `perNight`). */
export const NIGHT_MINUTES = 8 * 60;
/** What a stable, senseless body's hours give it. facts: { tended, since: the minute its nights count from (null when
    none yet), now, hp, max, perNight }. Tended: each whole 8 hours from `since` is a night's natural healing, never past
    `max`, and `since` comes back carried to the start of the night still running (none yet: from now). Untended:
    nothing, and `since` comes back null, so the nights count from when someone tends it. Answers { nights, gained, hp,
    since } */
export function senselessRestOf({ tended, since, now, hp, max, perNight } = {}) {
    const at = Number.isFinite(hp) ? hp : 0;
    if (!tended || !Number.isFinite(now)) return { nights: 0, gained: 0, hp: at, since: null };
    const from = Number.isFinite(since) && since <= now ? since : now;
    const nights = Math.floor((now - from) / NIGHT_MINUTES);
    const up = Math.min(Number.isFinite(max) ? max : Infinity, at + nights * Math.max(0, perNight || 0));
    return { nights, gained: Math.max(0, up - at), hp: Math.max(at, up), since: from + nights * NIGHT_MINUTES };
}

/*,,. WHAT THE HOURS HEALED (Rose 2026-10-01, in the popup: "What the hours healed"; sadia's row check that morning) ,,,
   SRD, Nonlethal Damage (d20srd.org/srd/combat/injuryandDeath.htm, read in Chrome that morning): "You heal
   nonlethal damage at the rate of 1 hit point per hour per character level." A body knocked out cold always lies
   at 0 (a fist or a crush stops at nothing, landedOf above), and it woke at exactly 1, whatever its hours
   had healed. Now it wakes with what its whole hours of lying there healed of its BRUISING, `nl` (the fight's own
   tally of the nonlethal share of what is missing), never a blade's wound under it, at least 1 and never past its
   ceiling. The one sum both wakes ask, a body's (wakeOutCold) and the injury road's (injuryStep), so the two cannot
   drift apart. A record from before it (no `since` or no `nl`) heals nothing past 1, as it did. Moved here from
   world/void.js with this story, word for word (move 5e). */
export function wokenHp(now, since, lvl, nl, hpNow, max) {
    const hours = since == null ? 0 : Math.max(0, Math.floor((now - since) / 60));
    const healed = nl == null ? 0 : Math.min(hours * Math.max(1, lvl || 1), Math.max(0, nl));
    return Math.min(max, Math.max(1, (hpNow || 0) + healed));
}

/*,,. WHERE A FIGHT'S END LEAVES A BODY ON THE WORLD'S ROAD (move 5e: world/void.js roadFromFight's answer, moved; Rose
   2026-09-28: "when I hit 0 (or if an ally hits 0) its not an instant you died it should be death saves") ,,,
   The road walks on from the corridor's own state: out cold, it lies stable and tended until the hours a level give its
   bruising back (SRD, Nonlethal Damage: "You heal nonlethal damage at the rate of 1 hit point per hour per character
   level"); held by its blood, stable and knitting; stable, stable (the d% that stopped the blood is not rolled again);
   at 0 and not dying, disabled; else dying. Tended before the fight or in it, tended still (D8, health cog 5c: the
   book's Recovering with Help). A Diehard body stable from -9 up came out of the fight on its feet and stays so. */
/** `f`: the fighter as the fight left it; facts: { held: its blood holds it (trollHeld below), diehard, tended: it lay
    tended before the fight }. Answers the road's state with no clock in it: { dying, stable, conscious, tended,
    recovering }, with `regen` for a held body, or `coldHours` (the hours to come to), `coldLvl` (the level they count
    by) and `coldNl` (the bruising) for one out cold */
export function roadOfFight(hp, f, facts = {}) {
    const road = { dying: false, stable: false, conscious: false, tended: !!facts.tended || !!(f && f.tended), recovering: false };
    const lvl = Math.max(1, (f && f.level) || 1);
    if (f && f.outCold) Object.assign(road, { stable: true, tended: true, coldHours: Math.ceil(Math.max(1, 1 - hp) / lvl),
        coldLvl: lvl, coldNl: Math.max(0, Math.floor(f.nonlethal || 0)) });
    else if (facts.held) Object.assign(road, { stable: true, regen: true });
    else if (f && f.stable) road.stable = true;
    else if (hp === 0 && !(f && f.dying)) road.conscious = true;          // disabled: on its feet at 0
    else road.dying = true;
    if (road.stable && hp <= 0 && hp >= -9 && road.coldHours == null && facts.diehard) road.conscious = true;
    return road;
}

/*,,. THE STRENUOUS POINT (move 5d; Rose 2026-10-07, in the popup: "Yes, everywhere": "a swing, a cast or a run at exactly
   0 costs 1 hit point", outside fights too, for everyone; and "Every round of running") ,,,
   SRD, Injury and Death, Disabled: "performing any standard action (or any other action the DM deems strenuous...) deals 1
   point of damage after the completion of the act. Unless the action increased the disabled character's hit points, she
   is now in negative hit points and dying"; a Diehard body acting as disabled pays the same. The fight's corridor
   (battle.js afterAction) and the world's acts (void.js strainAct, strainRun) ask this one answer. */
/** the point a strenuous act costs, 1 or 0: the act is strenuous (`strenuous`), the body is not dying and above -10, and it
    either began the act disabled (`began`) or stands at 0 or below after it (`hp`, now). An act that lifted it still pays
    its point: the book's "Unless the action increased..." spares only the fall (the fight's own 09-29 reading) */
export function strenuousOf({ hp, began, dying, strenuous = true } = {}) {
    if (!strenuous || dying || !(hp > -10)) return 0;
    return hp <= 0 || began ? 1 : 0;
}

/*,,. TROLL BLOOD'S HOLD (move 5f: regenRate, hasRegen, trollCapOf, trollCap, trollHeld, TROLL_REAL and lethalTo from
   battle/battle.js with their stories, word for word, every one exported; the map's 4.6: the road's hold is the health
   cog's, the fight's corridor and the world's road asking the same) ,,, */
/* THE BLOODLINES THE CORRIDOR MUST HONOUR (Rose 08-14, and the SRD read
   to back each): TROLL-KIN is her canon regeneration 1, "you can only be
   killed by fire or acid", matching RAW regeneration (damage converts to
   nonlethal except fire/acid; a coup only kills with a lethal type). The
   UNDEAD are "immediately destroyed" at 0 or less and are "not at risk of
   death from massive damage" (typesSubtypes, read 08-14): no corridor, no
   saves, game over. Full undead carry fortification 100, which RAW words
   as immunity to criticals, so the coup refuses them the same way. */
/* A FEAT IS NOT A TROLL (Rose 07-29, carried into v1's Rules35): the
   Troll-Blooded FEAT grants regeneration 1; the Troll-kin BLOODLINE grants
   the same regen plus the sun aversion (which is the world's system, not
   the battle's); a monster troll's own statblock rate wins over both. */
/* exported for the world's dying road (void.js trollHolds): one rate and one list of real wounds, never two */
/* the Troll-Blooded FEAT is retired (no feat table or pool holds it), so the one troll blood read is the bloodline's (the
   universal audit's U8, 2026-10-01) */
export const regenRate = (f) => f.regen != null ? f.regen
  : ((grantOf(f.feats, 'regeneration') || {}).rate || 0);   // the rate its blood grants (rules/conditions.js GRANTS, 3c)
export const hasRegen = (f) => regenRate(f) > 0;
/*,,. TROLL BLOOD AND DIEHARD, ROSE'S RULING (2026-09-28; the book has none, and no FAQ, Sage Advice or Rules Compendium
   answer turned up that evening) ,,,
   "-10 is the threshold and -19 is the cap": the blood holds ordinary wounds (not fire, acid or the sun, and nothing
   under a visible sun), and a held body's hit points go on down to its cap and no further, -19 with Diehard ("diehard
   conscious caps at -9 floor of being able to be damaged is -19"), -10 without ("0 unconscious -10 floor"). Only a
   real wound reaches past -10, and there it kills ("Them being hit with fire at -10 kills them"). The knit is the
   world's, an hour at a time ("every hour +1 hp"), so nothing knits inside a fight's six-second rounds. */
export const trollCapOf = (diehard) => (diehard ? CONDS.regeneration.caps.diehard : CONDS.regeneration.caps.none);   // the row's (3c)
/* Diehard read as battle.js hasFeat reads it (the exact name), until the Feats cog's one reader (Vera's table, F1c) */
export const trollCap = (f) => trollCapOf(Array.isArray(f.feats) && f.feats.includes('Diehard'));
/** a regenerating body the blood is holding: stable at 0 or below, not past its cap, not dead */
export const trollHeld = (f) => !!f && !f.dead && hasRegen(f) && !!f.stable && f.hp <= 0 && f.hp >= trollCap(f);
/* what wounds a troll for REAL (Rose 08-14: "trolls can only die in fire
   acid / sun"): the classic pair, and the sun her canon adds. 'sun' and
   'radiant' both count so the day a sunlight or moonlight move exists in
   this table it already kills what it should. The world-side sunlight
   drain (v1's Atmosphere) stays deferred; the void has no sky. */
export const TROLL_REAL = new Set(CONDS.regeneration.real);   // the row's own list (effects step 3c)
export const lethalTo = (f, dmgType) => !hasRegen(f) || TROLL_REAL.has(String(dmgType || ''));

/*,,. ONE HEAL FOR EVERY BODY (move H1, the plug-and-play audit's V2, V7 and V11; Desktop/V/health-cog-table.md "Move H1",
   sadia's check) ,,,
   Rose 2026-10-07: "make sure systems apply to -all- entities". Four world doors did a magical cure's arithmetic (her
   potion, a seat's, a potion given, her cure verse) and the fight's cure a fifth, with two answers for a body carrying both
   wounds and bruising (20 most, 3 of wounds and 5 of bruising, a cure of 4: the book 19, the fight 16). One cure now, for
   the world's doors and the fight's, and the two heal acts in the coup act's shape. */

/** A MAGICAL CURE OVER ONE POOL, FOR EVERY BODY (SRD, Injury and Death, Healing Nonlethal Damage, read in Chrome 2026-10-07:
    "When a spell or a magical power cures hit point damage, it also removes an equal amount of nonlethal damage"). Both
    hosts keep one pool, the most less the wounds and the bruising (`grey`): `healed` is the wounds a cure of `total` mends
    (never past the room the bruising leaves under the ceiling), `lifted` the bruising it takes with it, and the pool rises
    by both. Pure: the world's doors and the fight's cure apply it. */
export function mendOf({ now, max, grey = 0 }, total) {
    const n = Math.max(0, Number(total) || 0), g = Math.max(0, Number(grey) || 0);
    const healed = Math.min(n, Math.max(0, max - now - g)), lifted = Math.min(n, g);
    return { healed, lifted, now: Math.min(max, now + healed + lifted), sum: n };
}

/** A NIGHT'S HEALING FOR EVERY BODY: the book's natural rate (data/heal.js nightHp; SRD, Injury and Death, Natural Healing,
    d20srd.org/srd/combat/injuryandDeath.htm, read in Chrome 2026-10-07 19:5x: "With a full night's rest (8 hours of sleep
    or more), you recover 1 hit point per character level", and a day and night of complete bed rest "twice your character
    level"; a healer's long-term care twice again) and the healed body's own term beside it (Fast Healer, the
    feats cog's healBonusOf: d20pfsrd.com/feats/general-feats/fast-healer/, read in Chrome 2026-10-07 11:07, "When you
    regain hit points by resting or through magical healing, you recover additional hit points equal to half your
    Constitution modifier (minimum +1)"), once a night and never doubled: the doubling is the book's, for the natural
    rate. Her night, a seat's and a tended senseless body's each ask it. */
export const nightMendOf = (level, o = {}, healBonus = 0) => nightHp(level, o) + Math.max(0, Number(healBonus) || 0);

/*,,. A DRAUGHT, AND A POTION GIVEN, AS ACTS FOR EVERY BODY ,,,
   The body, the VIEW its host's adapter builds and the host's DOORS, no host imported; the cure is mendOf's, and Fast
   Healer's term rides it (the HEALED body's own).
   THE VIEW: pool { now, max, grey } (the healed body's); down ('down', 'out cold' or null: nobody drinks while down);
   potions (the pack's line of what it carries, '' when none); want (a named potion, or null for the weakest carried);
   healBonus (the healed body's term). For a potion given, `target` holds the patient's names, pool and healBonus, or is
   null when nobody down lies within reach. (No line of the acts names the drinker: each host's doors say it.)
   THE DOORS: guard() (a host's refusal before anything: words { her, seat } or null); take(want) (the potion out of the
   pack: { name, heal }, or null); roll(expr); mend(res) (the host's writes: the pool, the grey lifted, the road told it
   was healed); show(facts) (her card, a seat's line); refused(words); done(). Each answers true when a potion went down a
   throat. */
export function drinkAct(body, view, doors) {
    /* the same words to either eye; each key asked as a literal (test_textTable [1]) */
    const no = (said) => { doors.refused({ her: said, seat: said }); return false; };
    const g = doors.guard();
    if (g) { doors.refused(g); return false; }
    if (!view.potions) return no(textOf('$lohTXDrinkNone'));
    if (view.down) return no(view.down === 'out cold' ? textOf('$lohTXDrinkOutCold') : textOf('$lohTXDrinkDown'));
    if (view.pool.now >= view.pool.max) return no(textOf('$lohTXDrinkWhole', { have: view.potions }));
    const pot = doors.take(view.want || null);
    if (!pot) return no(textOf('$lohTXDrinkNoSuch', { want: view.want, have: view.potions }));
    const r = doors.roll(pot.heal);
    const res = mendOf(view.pool, r.total + (view.healBonus || 0));
    doors.mend(res);
    doors.show({ pot, r, res, bonus: view.healBonus || 0, before: view.pool.now, max: view.pool.max });
    doors.done();
    return true;
}
export function givePotionAct(giver, view, doors) {
    const no = (said) => { doors.refused({ her: said, seat: said }); return false; };
    const g = doors.guard();
    if (g) { doors.refused(g); return false; }
    const t = view.target;
    if (!t) return no(textOf('$lohTXGiveNoOne'));
    if (!view.potions) return no(textOf('$lohTXGiveNone'));
    const pot = doors.take(null);   // the weakest carried, as before
    if (!pot) return no(textOf('$lohTXGiveNone'));
    const r = doors.roll(pot.heal);
    const res = mendOf(t.pool, r.total + (t.healBonus || 0));
    doors.mend(res);
    doors.show({ pot, r, res, bonus: t.healBonus || 0, before: t.pool.now, max: t.pool.max, target: t });
    doors.done();
    return true;
}
