/* ============================================================================
   THE CONDITIONS COG (the machine map's 4.6, `rules/conditions.js`; Rose 2026-09-30, in the popup, of the design
   Desktop/Systems/effects-in-one-place.md: "Yes, that shape", "Right after the record").

   Rose asked for every effect on a body's numbers "all in one place so its easier to edit/ add more things to": a
   buff, a debuff, a condition, damage or healing over time, each ONE ROW in one table, read by one reader on one
   clock, for the world and the fight alike, and kept on the record so it survives a save. Built in four steps, each
   its own move with its own table:
     1. the table and the section: the fight's timed modifiers (BOONS) and marks (TAGS) move in UNCHANGED from
        battle/boons.js, so nothing plays differently yet (this step, 2026-10-01)
     2. the fight's own flags become rows: fatigued, dazzled, stunned, helpless, prone and rage
     3. the world's copies become rows on the one clock: the cold and the heat, the grey, troll blood, the sun, and
        the dying road's states
     4. the rows that do not exist yet: Bull's Strength and its family, poison, negative levels

   THE RECORD'S SECTION (rules/entity.js `conditions`, a list), named here for steps 2 and 3 to fill, unwritten in
   step 1 (sadia's row check, 2026-10-01: two numbers, never one). An entry is { id, from, since, until, dc, cl }:
     id     which row it is
     from   where it came from: a spell and its caster (a held spell's holder), a poison, the cold, a feat, the blood
     since  when it began, in GAME MINUTES (the world's clock)
     until  when it ends, in game minutes; null for until cured, or for a spell held by its caster's concentration.
            A fight counts its own rounds on a body's turns and converts them: a round is 6 game seconds (SRD), a tenth
            of a game minute
     dc     the save it asks (Hold Person's Will save each turn), null when none
     cl     the caster level behind it (its duration, a dispel's check), null when none
   A count (negative levels) is one entry each.

   Below, battle/boons.js's own text, moved whole by Vera (step 1).
   ========================================================================== */

/* the marks' and the rows' words, asked by name (config/text.js; Rose 2026-10-01: changeables live in modules) */
import { textOf } from '../config/text.js';

/* ============================================================================
   BOONS -- a modifier that holds for a while and then stops.

   Rose, 2026-09-19: *"so maybe fix your cataloguing of spells now... rig in all
   feasible level 1 spells for now for all available classes."*

   Half of every class's first-level list is a BONUS THAT LASTS A WHILE. Bless,
   Bane, Shield, Mage Armor, Shield of Faith, Magic Weapon, Divine Favor, Doom,
   Resistance, Virtue, True Strike, Jump, Longstrider, Expeditious Retreat,
   Magic Fang, Entangle -- sixteen spells, five classes, one missing thing. The
   engine had no way to say "+2 for ten rounds" at all: rage and the bard's song
   are each hand-built (`raging`/`rageRounds`, `_inspirer`/`inspireRounds`), and
   a seventeenth hand-built pair was not going to be the answer to the sixteenth
   spell. So this is the instrument, and the spells are its first callers.

   IT WRITES THROUGH THE FIELDS THE ENGINE ALREADY SUMS. `attackMod`, `dmgMod`,
   `acMod` and `speedFt` are read all over battle.js today; startRage writes
   `c.attackMod += 2` and endRage takes it back, and every attack roll, AC and
   move pool picks it up for free. A boon does exactly that and nothing cleverer,
   which is why nothing downstream had to learn a new word. Only `saveAll` and
   `jumpMod` are new fields, and they are added at the three save sites and the
   one jump site rather than invented a second way.

   RECOMPUTED, NEVER ACCUMULATED. `apply` takes the whole of the last
   contribution off and puts the whole of the new one on, so a boon that expires
   during a boon that is refreshed during a rage cannot leave a stray +1 behind.
   Rage's own comment names that exact hazard ("endRage took the bonus off
   AGAIN: a cure cost him the rage twice"), and the way not to repeat it is to
   stop doing arithmetic on a running total.

   BONUS TYPES ARE REAL AND THEY DO NOT STACK. SRD, Bonus Types: two bonuses of
   the same type do not add, the better one applies; untyped bonuses do. This is
   not decoration -- Shield of Faith and Protection from Evil are BOTH deflection
   bonuses to AC, so a cleric who casts both gets +2, not +4, and Mage Armor
   (armor) plus Shield (shield) genuinely is +8. Writing the types down was the
   difference between the rules and a pile of plus signs.

   WHAT A BOON IS NOT. It is not a condition: `fatigued`, `dazzledNow`,
   `stunnedRounds` and `helpless` already exist in battle.js and already have
   their own rules, so Touch of Fatigue, Flare, Daze and Sleep set those and do
   not come through here. A boon is a NUMBER with a clock on it.
   ========================================================================== */

/** rounds in a minute, and in an hour: the SRD's durations are written in both */
const MIN = 10, HOUR = 600;

/*,,. THE FIELDS A BOON MAY WRITE ,,,
   Deliberately short, and deliberately all pre-existing but two. A spell that
   wants a field not on this list is a spell that needs a hook in the resolution
   path, and those are the ones I cut rather than fake (see CUT below). */
const FIELDS = ['attackMod', 'dmgMod', 'acMod', 'saveAll', 'speedFt', 'jumpMod',
                /* ONE SAVE AT A TIME (2026-09-25), because Rage's "+1 morale bonus on Will
                   saves" is on Will alone and `saveAll` would have handed it to Fortitude and
                   Reflex too. Read by battle.js saveBonusOf, the one door every save goes through. */
                'saveFort', 'saveRef', 'saveWill',
                /* A RAGE'S STRENGTH (effects step 2d): every roll the fight makes off strMod (the grapple, the bull rush,
                   the trip and the disarm, the jump, a melee touch) takes it, as Nobility's own +4 does */
                'strMod',
                /* THE PART OF acMod A TOUCH ATTACK IGNORES (AC2, Desktop/V/ac-types-table.md): the armour-, shield- and
                   natural-armour-typed boons' terms, kept by the same bookkeeping; battle.js's touch AC takes it off
                   (sadia's B1 acBaseOf) */
                'acNotTouch'];

/** the barbarian rage's step by his own level (SRD, Barbarian): 2 (+4 to Strength and Constitution, +2 Will), 3 at
    Greater Rage (11th), 4 at Mighty Rage (20th) (effects step 2d) */
export function rageStepOf(lv) {
    const n = Math.floor(lv || 1);
    return n >= 20 ? 4 : n >= 11 ? 3 : 2;
}

/**
 * THE TABLE. Every row is one SRD spell, read off the class lists on 2026-09-19.
 *
 *   mods      { field: n } or a function of caster level returning that
 *   type      the SRD bonus type, or null for untyped. Same type, same field:
 *             the better one applies and the other is simply not counted.
 *   rounds    how long it holds, as a function of caster level
 *   charges   spent on use instead of time (True Strike, Guidance). A boon with
 *             charges still carries a duration; whichever runs out first wins.
 *   hp        hit points LENT, rage's pattern: added to `hp`, never to `maxHp`,
 *             and `hpCap` counts them so a heal does not quietly delete them.
 *   noMove    the body cannot move at all this round (Entangle alone)
 */
export const BOONS = {
    /* ---- the cleric's and paladin's half ---- */
    bless: {
        name: 'Bless', mods: { attackMod: 1 }, type: 'morale', rounds: (cl) => MIN * cl,
        srd: 'Bless fills your allies with courage. Each ally gains a +1 morale bonus on attack rolls and on saving throws against fear effects.',
    },
    bane: {
        name: 'Bane', mods: { attackMod: -1, saveAll: -1 }, type: null, rounds: (cl) => MIN * cl,
        foe: true,
        srd: 'Bane fills your enemies with fear and doubt. Each affected creature takes a -1 penalty on attack rolls and a -1 penalty on saving throws against fear effects.',
    },
    divinefavor: {
        /* "+1 per three levels on attack and damage rolls (minimum +1)", a luck
           bonus, and ONE MINUTE flat -- not per level. Read, not remembered. */
        name: 'Divine Favor', type: 'luck', rounds: () => MIN,
        mods: (cl) => ({ attackMod: Math.max(1, Math.floor(cl / 3)), dmgMod: Math.max(1, Math.floor(cl / 3)) }),
        srd: 'Calling upon the strength and wisdom of a deity, you gain a +1 luck bonus on attack and weapon damage rolls for every three caster levels you have (at least +1, maximum +3).',
    },
    shieldoffaith: {
        /* +2, and +1 more per six levels to a ceiling of +5 */
        name: 'Shield of Faith', type: 'deflection', rounds: (cl) => MIN * cl,
        mods: (cl) => ({ acMod: Math.min(5, 2 + Math.floor(cl / 6)) }),
        srd: 'This spell creates a shimmering, magical field around the target that averts and deflects attacks. The spell grants the subject a +2 deflection bonus to AC, with an additional +1 to the bonus for every six caster levels you have (maximum +5 deflection bonus at 18th level).',
    },
    doom: {
        name: 'Doom', mods: { attackMod: -2, saveAll: -2 }, type: null, rounds: (cl) => MIN * cl,
        foe: true,
        srd: 'This spell fills a single subject with a feeling of horrible dread that causes it to become shaken.',
    },
    /* ---- the wizard's and sorcerer's half ---- */
    shield: {
        name: 'Shield', mods: { acMod: 4 }, type: 'shield', rounds: (cl) => MIN * cl,
        srd: 'Shield creates an invisible, tower shield-sized mobile disk of force that hovers in front of you. It negates magic missile attacks directed at you. The disk also provides a +4 shield bonus to AC.',
    },
    magearmor: {
        name: 'Mage Armor', mods: { acMod: 4 }, type: 'armor', rounds: (cl) => HOUR * cl,
        srd: 'An invisible but tangible field of force surrounds the subject of a mage armor spell, providing a +4 armor bonus to AC.',
    },
    truestrike: {
        /* the only +20 in the game, and it is spent on ONE roll */
        name: 'True Strike', mods: { attackMod: 20 }, type: 'insight',
        rounds: () => MIN, charges: 1,
        srd: 'You gain temporary, intuitive insight into the immediate future during your next attack. Your next single attack roll (if it is made before the end of the next round) gains a +20 insight bonus.',
    },
    magicweapon: {
        name: 'Magic Weapon', mods: { attackMod: 1, dmgMod: 1 }, type: 'enhancement',
        rounds: (cl) => MIN * cl,
        srd: 'Magic weapon gives a weapon a +1 enhancement bonus on attack and damage rolls.',
    },
    magicfang: {
        name: 'Magic Fang', mods: { attackMod: 1, dmgMod: 1 }, type: 'enhancement',
        rounds: (cl) => MIN * cl,
        srd: 'Magic fang gives one natural weapon of a creature a +1 enhancement bonus on attack and damage rolls.',
    },
    protevil: {
        /* TWO TYPES IN ONE SPELL, which is why `type` can be per field. The AC
           is deflection (so it will not stack with Shield of Faith) and the
           saves are resistance (so they will not stack with Resistance). */
        name: 'Protection from Evil', mods: { acMod: 2, saveAll: 2 },
        type: { acMod: 'deflection', saveAll: 'resistance' }, rounds: (cl) => MIN * cl,
        srd: 'This spell wards a creature from attacks by evil creatures, from mental control, and from summoned creatures. It creates a magical barrier around the subject at a distance of 1 foot. The barrier moves with the subject and has three major effects. First, the subject gains a +2 deflection bonus to AC and a +2 resistance bonus on saves.',
    },
    /* ---- the orisons every list keeps ---- */
    resistance: {
        name: 'Resistance', mods: { saveAll: 1 }, type: 'resistance', rounds: () => MIN,
        srd: 'You imbue the subject with magical energy that protects it from harm, granting it a +1 resistance bonus on saves.',
    },
    guidance: {
        name: 'Guidance', mods: { attackMod: 1, saveAll: 1 }, type: 'competence',
        rounds: () => MIN, charges: 1,
        srd: 'This spell imbues the subject with a touch of divine guidance. The creature gets a +1 competence bonus on a single attack roll, saving throw, or skill check.',
    },
    virtue: {
        /* `tempHp`: a TEMPORARY hit point (SRD, Virtue: "granting the subject 1 temporary hit point"), unlike the rages'
           lent ones: lost first, gone with the spell, never healed back (R7; THE TEMPORARY HIT POINTS, below) */
        name: 'Virtue', tempHp: 1, rounds: () => MIN,
        srd: 'With a touch, you infuse a creature with a tiny surge of life, granting the subject 1 temporary hit point.',
    },
    /* ---- the druid's and ranger's half ---- */
    jump: {
        /* +10, then +20 at 5th and +30 at 9th, an enhancement bonus */
        name: 'Jump', type: 'enhancement', rounds: (cl) => MIN * cl,
        mods: (cl) => ({ jumpMod: cl >= 9 ? 30 : cl >= 5 ? 20 : 10 }),
        srd: 'The subject gets a +10 enhancement bonus on Jump checks. The enhancement bonus increases to +20 at caster level 5th, and to +30 (the maximum) at caster level 9th.',
    },
    longstrider: {
        name: 'Longstrider', mods: { speedFt: 10 }, type: 'enhancement', rounds: (cl) => HOUR * cl,
        srd: 'This spell increases your base land speed by 10 feet.',
    },
    expeditious: {
        name: 'Expeditious Retreat', mods: { speedFt: 30 }, type: 'enhancement',
        rounds: (cl) => MIN * cl,
        srd: 'This spell increases your base land speed by 30 feet.',
    },
    entangle: {
        /* -2 attack and -4 DEXTERITY, which at this engine's grain is -2 AC
           (a Dex penalty is half of itself to AC, the same conversion rage's
           +4 STR goes through above). "Can't move" is the third clause and it
           is `noMove`, read once in battle.js where the move pool is filled. */
        name: 'Entangle', mods: { attackMod: -2, acMod: -2 }, type: null, noMove: true,
        rounds: (cl) => MIN * cl, foe: true,
        srd: 'An entangled creature takes a -2 penalty on attack rolls, takes a -4 penalty to Dexterity, and can\'t move.',
    },
    /*,,. RAGE, THE SPELL (Rose 2026-09-25: the first PRICE spell) ,,,
       SRD, read on d20srd with Rose on 2026-09-25: "Each affected creature gains a
       +2 morale bonus to Strength and Constitution, a +1 morale bonus on Will
       saves, and a -2 penalty to AC. The effect is otherwise identical with a
       barbarian's rage except that the subjects aren't fatigued at the end of the
       rage." So the -2 AC is the price, paid while it lasts, and nothing is owed
       after: NO comedown, on his word ("ours doesnt cause fatigue either").
       THE SAME CONVERSION battle.js startRage makes for the barbarian's +4, at half:
       +2 Str is a +1 Str modifier (+1 to hit, +1 damage at the 1x Str every weapon
       here swings), +2 Con is a +1 Con modifier (+1 Fortitude, and +1 hp a level,
       LENT the way the barbarian's are: they leave with the spell and are never
       lost first). The Will bonus is MORALE, so two of them do not stack; the rest
       arrive through ability scores and are untyped at this grain.
       DURATION IS "Concentration + 1 round/level": battle.js holds the clock still
       while its caster concentrates (`hold`), and it runs a round a level after.
       KEYED `ragespell`, never `rage`: MOVES.rage is the barbarian's own free action,
       and a spell sharing its key would land on that row. */
    ragespell: {
        name: 'Rage', rages: true, mods: { attackMod: 1, dmgMod: 1, strMod: 1, acMod: -2, saveFort: 1, saveWill: 1 },
        type: { saveWill: 'morale' }, rounds: (cl) => Math.max(1, cl),
        hp: (cl, body) => Math.max(1, (body && body.level) || 1),
        srd: 'Each affected creature gains a +2 morale bonus to Strength and Constitution, a +1 morale bonus on Will saves, and a -2 penalty to AC. The effect is otherwise identical with a barbarian\'s rage except that the subjects aren\'t fatigued at the end of the rage.',
    },
    /*,,. THE BARBARIAN'S RAGE (effects step 2d, Vera 2026-10-01; Desktop/V/effects2d-table.md, sadia's row check) ,,,
       SRD, Barbarian, Rage (Ex), read in Chrome that day: "a +4 bonus to Strength, a +4 bonus to Constitution, and a +2
       morale bonus on Will saves, but he takes a -2 penalty to Armor Class"; Greater Rage (11th): "+6 ... +3", Mighty
       Rage (20th): "+8 ... +4", and "The penalty to AC remains at -2". At this engine's grain +4 to a score is +2 to its
       modifier: attack and damage, every roll off strMod, Fortitude, and 2 hit points a level LENT (counted by hpCap,
       restorable, never lost first; they go in full at the end). Laid at the BARBARIAN'S OWN level (`cl`: roster.js
       rageLevel). It lasts "3 + the character's (newly improved) Constitution modifier" rounds on its own clock, counted
       at its turn's top (battle.js), so tickBoons leaves it (`ownClock`). It restrains as the Rage spell does (`rages`).
       KEYED `barbrage`: MOVES.rage is the free action that lays it, and the spell is `ragespell`. */
    barbrage: {
        name: 'Rage', rages: true, ownClock: true,
        mods: (lv) => { const n = rageStepOf(lv); return { attackMod: n, dmgMod: n, strMod: n, saveFort: n, saveWill: n, acMod: -2 }; },
        type: { saveWill: 'morale' },
        rounds: (lv, body) => 3 + ((body && body.conMod) || 0) + rageStepOf(lv),
        hp: (lv, body) => rageStepOf(lv) * Math.max(1, (body && body.level) || 1),
        srd: 'In a rage, a barbarian temporarily gains a +4 bonus to Strength, a +4 bonus to Constitution, and a +2 morale bonus on Will saves, but he takes a -2 penalty to Armor Class.',
    },
};

/* ============================================================================
   WHAT IS NOT HERE, AND WHY. Named rather than quietly missing, because a
   reader who sees fifteen of a class's sixteen first-level spells will assume
   the sixteenth was forgotten.

   Entropic Shield  -- 20% miss chance on ranged attacks. There is no per-attack
                       miss-chance hook a boon can write to; concealMiss is
                       computed from the map, not from the body. Would need a
                       hook in resolveAttack, so it is not a boon.
   Ray of Enfeeblement, Restoration (Lesser) -- both are ABILITY DAMAGE, and no
                       combatant in this game carries ability scores that can be
                       damaged. Not fakeable as attack/damage: a Str penalty and
                       a to-hit penalty are different things the moment anything
                       else reads Str.
   Bless Weapon     -- its whole text is about evil foes, and nothing in this
                       game has an alignment.
   Cause Fear       -- the subject FLEES, and the AI has no flee.
   Sanctuary        -- "opponents can't attack you" is a targeting gate.
   ========================================================================== */

/** the bonus type this boon gives on this field (a boon may differ per field) */
const typeOf = (row, field) =>
    (row.type && typeof row.type === 'object') ? (row.type[field] || null) : (row.type || null);

/** the mods this row gives at this caster level, always as a plain object */
const modsOf = (row, cl) => {
    const m = typeof row.mods === 'function' ? row.mods(cl) : (row.mods || {});
    return m || {};
};

/** every boon live on this body, oldest first */
export const boonsOn = (c) => (c && c.boons) || {};

/** is this boon holding right now */
export const hasBoon = (c, id) => !!(c && c.boons && c.boons[id]);

/**
 * THE WHOLE CONTRIBUTION, computed from nothing.
 *
 * SRD bonus stacking, applied per field: untyped bonuses all add; for each
 * named type only the BEST one counts, and a penalty of that type counts too
 * (the worse of two same-type penalties is the one that applies, which is the
 * same rule read the other way round). Returns { field: n }.
 */
export function boonTotals(c) {
    const out = {};
    for (const f of FIELDS) out[f] = 0;
    const best = {};                              // field -> type -> the winner
    for (const [id, live] of Object.entries(boonsOn(c))) {
        const row = BOONS[id];
        if (!row) continue;
        const mods = modsOf(row, live.cl || 1);
        for (const [f, n] of Object.entries(mods)) {
            if (!FIELDS.includes(f) || !n) continue;
            const t = typeOf(row, f);
            if (!t) { out[f] += n; continue; }
            best[f] = best[f] || {};
            const was = best[f][t];
            /* the better of a bonus, the worse of a penalty: in both cases the
               one further from zero in its own direction */
            if (was == null || (n >= 0 ? n > was : n < was)) best[f][t] = n;
        }
    }
    for (const [f, byType] of Object.entries(best))
        for (const [t, n] of Object.entries(byType)) {
            /* AN ARMOUR BONUS NEVER STACKS WITH WORN ARMOUR'S (AC1; the SRD, Armor: "The armor bonus from a suit of armor
               doesn't stack with other effects or items that grant an armor bonus"): an armour-typed boon adds only what
               it holds above the worn armour's (battle/roster.js stamps `armourBonus`), so Mage Armor on a chain shirt adds
               nothing and on padded armour 3 */
            const add = (f === 'acMod' && t === 'armor') ? Math.max(0, n - (+c.armourBonus || 0)) : n;
            out[f] += add;
            /* and what a touch attack ignores (AC2; the SRD, Combat Statistics, Touch Attacks: "your AC doesn't include
               any armor bonus, shield bonus, or natural armor bonus") */
            if (f === 'acMod' && (t === 'armor' || t === 'shield' || t === 'natural')) out.acNotTouch += add;
        }
    /* AND THE CONDITIONS' ROWS (effects step 2b, THE ENTRIES below): untyped, each row once however many sources hold
       it, so one recompute and one memory carry both, and one door clears both */
    for (const [f, n] of Object.entries(condTerms(c))) if (FIELDS.includes(f)) out[f] += n;
    return out;
}

/** BOONTOTALS' PARTS FOR ONE FIELD, NAMED (T5, Vera's half of sadia's 6b-1a, the attack roll's terms; Desktop/V/attack-
    cog-table.md): [[n, name], ...], each untyped boon by its row's name, the winner of each named type by its own (the
    better bonus, the worse penalty, as boonTotals picks them), the armour clamp inside the armour-typed term (and, for the
    part a touch ignores, the armour, shield and natural winners), and the rows' term by the row's name; they sum to
    boonTotals(c)[field] */
export function boonTermsOf(c, field) {
    const out = [];
    if (!FIELDS.includes(field)) return out;
    const own = field === 'acNotTouch' ? 'acMod' : field;
    const best = {};                              // type -> [n, name], the winner as boonTotals picks it
    for (const [id, live] of Object.entries(boonsOn(c))) {
        const row = BOONS[id];
        if (!row) continue;
        const n = modsOf(row, live.cl || 1)[own];
        if (!n) continue;
        const t = typeOf(row, own);
        if (!t) { if (own === field) out.push([n, row.name || id]); continue; }
        const was = best[t];
        if (was == null || (n >= 0 ? n > was[0] : n < was[0])) best[t] = [n, row.name || id];
    }
    for (const [t, [n, name]] of Object.entries(best)) {
        const add = (own === 'acMod' && t === 'armor') ? Math.max(0, n - (+c.armourBonus || 0)) : n;
        if (field === 'acNotTouch' && t !== 'armor' && t !== 'shield' && t !== 'natural') continue;
        if (add) out.push([add, name]);
    }
    const row = termsRowOf(c);
    if (row && row.terms[field]) out.push([row.terms[field], row.name]);
    return out;
}

/** hit points LENT by the boons holding now (the rages' Constitution, the Rage spell's): a row's `hp` is a number or a
    function of the caster level and the body (Rage's one a level). Temporary hit points are not lent: `tempHp`, below. */
export const boonHp = (c) => Object.entries(boonsOn(c)).reduce((n, [id, live]) => {
    const row = BOONS[id];
    if (!row || !row.hp) return n;
    return n + (typeof row.hp === 'function' ? (row.hp(live.cl || 1, c) || 0) : row.hp);
}, 0);

/*,,. THE TEMPORARY HIT POINTS (R7, Vera 2026-10-02; Desktop/V/r7-temphp-table.md, sadia's row check 04:5x) ,,,
   The SRD, Injury and Death, Temporary Hit Points (d20srd.org/srd/combat/injuryandDeath.htm, read in Chrome that day):
   "When the temporary hit points go away the character's hit points drop to his current hit point total. If the
   character's hit points are below his current hit point total at that time, all the temporary hit points have already
   been lost and the character's hit point total does not drop further. When temporary hit points are lost, they cannot
   be restored as real hit points can be, even by magic"; and, of a Constitution's lent ones, "they are not lost first as
   temporary hit points are". So a row's `tempHp` fills a POOL of its own on the body, `c.temps[id]`, kept INSIDE `c.hp`
   (they are "in addition to" the total, and every reader of hp reads them so). takeHp is the one door a fighter's hit
   points are lost through, and it empties the pools first; a source that ends takes off only what its pool still holds,
   with no floor; the heal's one ceiling (battle.js hpCap) counts only what the pools still hold, so a lost point is
   never healed back. A recast replaces its pool, never adds (the same spell does not stack). A pool emptied by blows
   keeps its entry at 0 while its source holds, so the next recompute does not grant it again. */
const tempOf = (row, live, c) => (typeof row.tempHp === 'function' ? (row.tempHp(live.cl || 1, c) || 0) : (row.tempHp || 0));
/* the soonest to end is spent first; a held concentration spell's pool last */
const clockOf = (live) => (!live ? 0 : live.hold ? Infinity : (live.rounds || 0));

/** what the temporary pools on this body still hold */
export const tempLeftOf = (c) => Object.values((c && c.temps) || {}).reduce((n, v) => n + (v || 0), 0);

/**
 * THE ONE DOOR A FIGHTER'S HIT POINTS ARE LOST THROUGH (R7; the machine map's health landing the packet, sadia's step 6
 * to come): the temporary pools first, then the whole `n` off `c.hp`, which holds the pools.
 * Returns { fromTemp, n }: how much of it the pools took, and all of it.
 */
export function takeHp(c, n) {
    if (!c) return { fromTemp: 0, n: 0 };
    let left = n > 0 ? n : 0, fromTemp = 0;
    if (c.temps && left) {
        const boons = boonsOn(c);
        for (const id of Object.keys(c.temps).sort((a, b) => clockOf(boons[a]) - clockOf(boons[b]))) {
            const take = Math.min(c.temps[id] || 0, left);
            if (!take) continue;
            c.temps[id] -= take;
            left -= take;
            fromTemp += take;
            if (!left) break;
        }
    }
    c.hp = (c.hp || 0) - n;
    return { fromTemp, n };
}

/** is any boon holding this body still */
export const boonNoMove = (c) => Object.keys(boonsOn(c))
    .some((id) => BOONS[id] && BOONS[id].noMove);

/** the ARMOUR BONUS a body has (weapons D1n's N3: the whip "deals no damage to any creature with an armor bonus of +1 or
    higher"): the larger of its worn armour's (battle/roster.js stamps `armourBonus`) and the best armour-typed boon's
    (Mage Armor's +4), never their sum (SRD, Armor, d20srd.org/srd/equipment/armor.htm, read in Chrome 2026-10-02: "The
    armor bonus from a suit of armor doesn't stack with other effects or items that grant an armor bonus") */
export function armourBonusOf(c) {
    if (!c) return 0;
    let best = 0;
    for (const [id, live] of Object.entries(boonsOn(c))) {
        const row = BOONS[id];
        if (!row || typeOf(row, 'acMod') !== 'armor') continue;
        const n = modsOf(row, live.cl || 1).acMod || 0;
        if (n > best) best = n;
    }
    return Math.max(+c.armourBonus || 0, best);
}

/**
 * PUT THE CURRENT TOTAL ON THE BODY, taking the last one off first.
 *
 * The body's own numbers are left alone: `_boonWas` remembers exactly what this
 * module added last time, so what comes off is what went on and never a
 * recomputed guess. Rage, the song and a charge's -2 all write the same fields
 * and none of them is disturbed (prone pays nothing into them since effects
 * step 2a; the conditions' rows come in through boonTotals since 2b).
 */
export function applyBoons(c) {
    if (!c) return;
    const was = c._boonWas || {};
    const now = boonTotals(c);
    for (const f of FIELDS) {
        const delta = (now[f] || 0) - (was[f] || 0);
        if (delta) c[f] = (c[f] || 0) + delta;
    }
    c._boonWas = now;
    /* hit points are LENT, rage's law: added to hp, never to maxHp, and hpCap
       counts them so a heal does not silently take them back off again */
    /* AND THEY GO IN FULL (effects step 2d; Rose 2026-10-01, "By the rulebook": the SRD's "these hit points go away at
       the end of the rage", the Rage spell's the same): no floor, so a body they leave at 0 or below is the fight's to
       take down its road (battle.js finish, asked where a boon ends: the turn's top, the rage's end). */
    const hpWas = c._boonHpWas || 0, hpNow = boonHp(c);
    if (hpNow !== hpWas) {
        c.boonHpBonus = hpNow;
        c.hp = (c.hp || 0) + (hpNow - hpWas);
        c._boonHpWas = hpNow;
    }
    /* AND THE TEMPORARY POOLS (R7, above): a source gone takes off what its pool still holds, no floor (a body touched
       below 0 drops back to its own total, and one left at 0 or below is the fight's road, as the lent ones are); a
       source new to the body fills its pool and adds it to hp */
    if (c.temps) for (const id of Object.keys(c.temps)) {
        if (hasBoon(c, id)) continue;
        c.hp = (c.hp || 0) - (c.temps[id] || 0);
        delete c.temps[id];
    }
    for (const [id, live] of Object.entries(boonsOn(c))) {
        const row = BOONS[id];
        if (!row || !row.tempHp || (c.temps && id in c.temps)) continue;
        const n = tempOf(row, live, c);
        (c.temps = c.temps || {})[id] = n;
        c.hp = (c.hp || 0) + n;
    }
    c.noMove = boonNoMove(c);
    /* THE RAGE'S TWO WORDS, written here and nowhere else (effects step 2d; R8 by sadia's answer): `raging` is the
       rage's restrictions, which the barbarian's rage and the Rage spell both lay ("otherwise identical with a
       barbarian's rage"); `ownRage` is the barbarian's own row alone, whose clock, fatigue and once a fight are his */
    c.raging = Object.keys(boonsOn(c)).some((id) => !!(BOONS[id] && BOONS[id].rages));
    c.ownRage = hasBoon(c, 'barbrage');
}

/**
 * LAY A BOON ON A BODY. Returns the line to log, or null when it did not take.
 *
 * SRD: a spell cast twice on the same subject does not stack with itself -- the
 * second casting replaces the first. So this REFRESHES rather than doubling,
 * which is also the only behaviour that cannot be farmed.
 */
export function giveBoon(c, id, casterLevel, opts) {
    const row = BOONS[id];
    if (!c || !row) return null;
    const cl = Math.max(1, casterLevel || 1);
    const again = hasBoon(c, id);
    c.boons = c.boons || {};
    /* its whole length kept beside the rounds left (move EF1): one row for every reader, a keeper's "3 of 7" and a seat's brief */
    const rounds = Math.max(1, Math.round(row.rounds(cl, c)));
    c.boons[id] = { cl, rounds, of: rounds, charges: row.charges || 0,
                    /* A CONCENTRATION SPELL'S CLOCK STANDS STILL while its caster holds it
                       (SRD Duration, "Concentration + 1 round/level"); battle.js lets go of
                       `hold` when the concentration ends, and the rounds then run out */
                    hold: !!(opts && opts.hold), by: (opts && opts.by) || null };
    /* a recast REPLACES its temporary pool (R7): what the old one still held goes, and the recompute fills it fresh */
    if (again && row.tempHp && c.temps && id in c.temps) { c.hp = (c.hp || 0) - (c.temps[id] || 0); delete c.temps[id]; }
    applyBoons(c);
    return `${row.name} ${again ? 'is renewed on' : 'settles over'} ${c.name}.`;
}

/** a concentration spell's caster has stopped holding it: its clock starts now */
export function releaseBoon(c, id) {
    const live = c && c.boons && c.boons[id];
    if (!live || !live.hold) return false;
    live.hold = false;
    return true;
}

/** take a boon off early (dispelled, or its charge spent). Returns the line. */
export function endBoon(c, id, why) {
    const row = BOONS[id];
    if (!c || !row || !hasBoon(c, id)) return null;
    delete c.boons[id];
    applyBoons(c);
    return `${row.name} ${why || 'fades'} from ${c.name}.`;
}

/**
 * SPEND A CHARGE. True Strike and Guidance are "one roll, then gone", so
 * whatever rolls them calls this the moment the roll is made.
 * Returns the line when the boon was used up, null when it was not there.
 */
export function spendBoon(c, id) {
    const live = c && c.boons && c.boons[id];
    if (!live || !live.charges) return null;
    live.charges -= 1;
    if (live.charges > 0) return null;
    return endBoon(c, id, 'is spent and leaves');
}

/**
 * ONE ROUND OF THE CLOCK, called at the top of this body's turn beside rage's
 * own countdown. Returns the lines to log, which is the empty array almost
 * always and is why it is cheap to call for everybody.
 */
export function tickBoons(c) {
    const lines = [];
    if (!c || !c.boons) return lines;
    for (const [id, live] of Object.entries(c.boons)) {
        /* held by a concentrating caster: not a round of its duration yet */
        if (live.hold) continue;
        /* a row on its own clock (the barbarian's rage: battle.js counts it at his turn's top and ends it there) */
        if (BOONS[id] && BOONS[id].ownClock) continue;
        live.rounds -= 1;
        if (live.rounds <= 0) {
            const line = endBoon(c, id, 'runs out and lifts');
            if (line) lines.push(line);
        }
    }
    return lines;
}

/*,,. THE RAGE'S READERS (effects step 2d) ,,,
   Its rounds left, the hit points it lends now, and every row's Strength together, for the rolls whose Strength is kept
   apart from strMod (battle.js: the climb and the trip's defence, which took a hand +2 while raging). */
export const rageRoundsOf = (c) => { const live = c && c.boons && c.boons.barbrage; return live ? live.rounds : 0; };
/* and its whole length (move EF1); a row laid before EF1, or built by hand, reads its rounds */
export const rageTotalOf = (c) => { const live = c && c.boons && c.boons.barbrage; return live ? (live.of || live.rounds) : 0; };
export const rageLentOf = (c) => { const live = c && c.boons && c.boons.barbrage; return live ? (BOONS.barbrage.hp(live.cl || 1, c) || 0) : 0; };
export const boonStrOf = (c) => boonTotals(c).strMod || 0;

/** everything holding this body, for a readout: [{ id, name, rounds, of }], `of` its whole length (move EF1) */
export const boonList = (c) => Object.entries(boonsOn(c))
    .map(([id, live]) => ({ id, name: (BOONS[id] || {}).name || id, rounds: live.rounds, of: live.of || live.rounds }))
    .sort((a, b) => a.name.localeCompare(b.name));

/** strip every boon: the fight ended, or the body was rebuilt */
export function clearBoons(c) {
    if (!c || !c.boons) return;
    c.boons = {};
    applyBoons(c);
}

/* ============================================================================
   THE MARKS -- a CONDITION with a clock, which is the other half of the first
   rung. Flare dazzles, Touch of Fatigue tires, Daze and Hideous Laughter take
   the turn away, Sleep puts a body down, Faerie Fire outlines one.

   NOT BOONS, AND NOT A SECOND SYSTEM EITHER. Each of these sets a flag
   battle.js ALREADY reasons about -- `fatigued` costs -1 on attack, damage and
   AC at three sites, `dazzledNow` costs -1 at three more, `stunnedRounds` loses
   the turn at the top of the round, `helpless` is what a coup de grace needs --
   and every one of those flags was written with no way to make it stop. Rage
   sets `fatigued` for ever; the sun sets `dazzledNow` and clears it when the
   sun goes in. A spell needs a DURATION, so the clock is here, beside the
   boons' clock, because there should be exactly one place a round is counted.

   HELPLESS FINALLY HAS A SETTER. battle.js has carried it since the grapple
   pin -- "helpless: bound, unconscious, paralysed. Nothing sets this yet" --
   and Sleep is what the book has always meant by it.

   THE MARKS LIVE ON THE BODY'S ENTRIES NOW (effects step 2b, Vera 2026-10-01; THE ENTRIES below). `c.tags` and
   `c.tagFrom` are gone: a mark is one entry from 'mark' among the body's conditions, so a Touch of Fatigue ending can
   no longer clear the rage's fatigue, nor nightfall Flare's dazzle. (The paragraph above told what the flags meant
   when it was written; the fatigue's -1s were in fact paid by nobody but the rage's end and the troll's sun, by hand.)
   ========================================================================== */

export const TAGS = {
    /* TOUCH OF FATIGUE AND FLARE, MARKS OVER A ROW (effects step 2b): the flag is the row's, from any source, and each
       takes no effect on a body its row already holds, by its spell's own words (read in Chrome 2026-10-01): "This
       spell has no effect on a creature that is already fatigued. Unlike with normal fatigue, the effect ends as soon
       as the spell's duration expires" (d20srd.org/srd/spells/touchOfFatigue.htm); "Sightless creatures, as well as
       creatures already dazzled, are not affected by flare" (d20srd.org/srd/spells/flare.htm) */
    fatigued: {
        name: 'fatigued', row: true, already: true,
        set: (c) => settle(c),
        took: (c) => textOf('$lohTXFatigueMark', { name: c.name }),
        lift: (c) => textOf('$lohTXFatigueLifts', { name: c.name }),
    },
    dazzled: {
        name: 'dazzled', row: true, already: true,
        set: (c) => settle(c),
        took: (c) => textOf('$lohTXDazzleMark', { name: c.name }),
        lift: (c) => textOf('$lohTXDazzleLifts', { name: c.name }),
    },
    /* DAZE AND HIDEOUS LAUGHTER, each a mark over its own row (effects step 2c): the `stun` mark both laid is gone.
       Daze: "A dazed subject is not stunned, so attackers get no special advantage against it"; Hideous Laughter:
       "falling prone. The subject can take no actions while laughing, but is not considered helpless" (their pages,
       read in Chrome 2026-10-01). Laughter's fall is the prone door's: battle.js lays it when the mark takes (`prone`). */
    dazed: {
        name: 'dazed', row: true,
        set: (c) => settle(c),
        took: (c) => textOf('$lohTXDazedMark', { name: c.name }),
        lift: (c) => textOf('$lohTXDazedLifts', { name: c.name }),
    },
    laughing: {
        name: 'laughing', row: true, prone: true,
        set: (c) => settle(c),
        took: (c) => textOf('$lohTXLaughingMark', { name: c.name }),
        lift: (c) => textOf('$lohTXLaughingLifts', { name: c.name }),
    },
    sleep: {
        name: 'asleep',
        set: (c, on, rounds, from) => {
            c.asleep = !!on;
            /* SRD: "Sleeping creatures are helpless." That is the fight's one question, battle.js helplessFor, which
               reads `asleep` (effects step 2c: the `helpless` flag this wrote is retired) */
            /* AND THE LOST TURNS ARE THE SLEEP'S OWN, not a borrowed stun (2026-09-25).
               This used to set `stunnedRounds` to the whole sleep, and waking did not
               take it back: "Slapping or wounding awakens an affected creature", and a
               body woken by the blow still stood there losing turns until the sleep's
               minutes ran out. battle.js now skips a turn for `asleep` itself, so waking
               is waking, and a stun from anything else is left alone. */
            magicHoldOf(c, on, from, 'the sleep');
        },
        took: (c) => `${c.name} goes down asleep, and helpless with it.`,
        lift: (c) => `${c.name} wakes.`,
    },
    /*,,. HELD: Hold Person's paralysis (SRD, read 2026-09-25) ,,,
       "The subject becomes paralyzed and freezes in place. It is aware and
       breathes normally but cannot take any actions, even speech. Each round on
       its turn, the subject may attempt a new saving throw to end the effect.
       (This is a full-round action that does not provoke attacks of
       opportunity.)" And Paralyzed: "frozen in place and unable to move or act
       ... effective Dexterity and Strength scores of 0 and is helpless".
       So the body is HELPLESS (the coup de grace and the rogue's vitals read
       that) and its turn IS the new save: battle.js rolls it at the top of the
       held body's turn and the turn is spent either way. */
    held: {
        name: 'held',
        set: (c, on, rounds, from) => {
            c.held = !!on;   // helpless through battle.js helplessFor, which reads `held` (effects step 2c)
            magicHoldOf(c, on, from, 'the hold');
        },
        took: (c) => `${c.name} locks rigid where it stands: held, and helpless.`,
        lift: (c) => `${c.name} can move again.`,
    },
    lit: {
        /* Faerie Fire: the outline is not damage and not a penalty, it is the
           loss of every kind of hiding. `concealmentBetween` reads it. */
        name: 'outlined',
        set: (c, on) => { c.lit = !!on; },
        took: (c) => `${c.name} is outlined in pale fire: nothing it hides behind holds now.`,
        lift: (c) => `The pale fire around ${c.name} goes out.`,
    },
};

/*,,. WHO LAID A MAGICAL HOLD (Rose 2026-09-18, the Cubi's prey) ,,,
   battle.js dreamHold has read `magicHold = { by, kind }` since that ruling --
   "magical things like sleep, gliterdust or hold person also counts... they must
   have been charmed by the cubi" -- and nothing in the game ever wrote it, so a
   Dream Eater who put a body to sleep got neither its +3 nor its drink. Sleep and
   the hold write it now, naming the caster; lifting clears it only if it is still
   theirs. */
function magicHoldOf(c, on, from, kind) {
    if (on) { if (from && from.by) c.magicHold = { by: from.by, kind }; }
    else if (c.magicHold && c.magicHold.kind === kind) c.magicHold = null;
}

/** lay a mark on a body for a number of rounds. Returns the line, or null.
    `from` is { by, dc }: who laid it and the save it asks, for the marks that
    need either (a held body saves again every round; a hold names its caster).
    A MARK IS ONE ENTRY FROM 'mark' among the body's entries (effects step 2b, THE ENTRIES below). A mark over a row
    takes no effect on a body its row already holds, from any source (its spell's own words, TAGS above): no entry, no
    longer clock, no line. */
export function giveTag(c, id, rounds, from) {
    const row = TAGS[id];
    if (!c || !row) return null;
    if (row.already && isOn(c, id)) return null;
    const again = !!entryOf(c, id, 'mark');
    /* the LONGER of the two, never the newer: a second Sleep on a sleeping body
       should not be able to shorten the first one */
    const e = lay(c, id, 'mark', Math.max(1, Math.round(rounds || 1)));
    if (from) e.laid = { by: from.by || null, dc: from.dc || 0 };
    row.set(c, true, e.rounds, e.laid);
    return again ? null : row.took(c);
}

/** take a mark off early -- damage wakes a sleeper, a heal clears a daze. Its line only when its row goes off: a mark
    ending while another source holds the same row says nothing (the rage's fatigue stands when a touch's ends) */
export function endTag(c, id) {
    const row = TAGS[id];
    const e = row ? entryOf(c, id, 'mark') : null;
    if (!e) return null;
    c.conds = c.conds.filter((x) => x !== e);
    row.set(c, false, 0, e.laid);
    return isOn(c, id) ? null : row.lift(c);
}

/** who laid a mark and what it asks to be saved against, or null */
export const tagFrom = (c, id) => { const e = entryOf(c, id, 'mark'); return (e && e.laid) || null; };

/** is this mark's row on this body, from any source (the fight's "already" skip asks it, and the held body's save) */
export const hasTag = (c, id) => isOn(c, id);

/** one round of the entries' clock, beside the boons' -- the one place a round is counted: every entry with a clock
    counts down on its body's own turns, and a mark says its line only when its row goes off */
export function tickTags(c) {
    const lines = [];
    for (const e of entriesOf(c).filter((x) => x.rounds != null)) {
        e.rounds -= 1;
        if (e.rounds > 0) continue;
        if (e.from === 'mark') { const line = endTag(c, e.id); if (line) lines.push(line); }
        else takeOff(c, e.id, e.from);
    }
    return lines;
}

/** everything on this body, boons and rows, for a readout: a row several sources hold is listed once, with its longest
    clock (null: while its source holds) */
export const marksOn = (c) => {
    const rows = new Map();
    for (const e of entriesOf(c)) {
        const was = rows.get(e.id);
        rows.set(e.id, was === undefined ? e.rounds : (was == null || e.rounds == null) ? null : Math.max(was, e.rounds));
    }
    return [...boonList(c), ...[...rows].map(([id, rounds]) => ({ id, name: (TAGS[id] || CONDS[id] || {}).name || id,
        rounds, mark: true }))].sort((a, b) => a.name.localeCompare(b.name));
};

/* ============================================================================
   PRONE, THE FIRST OF THE FIGHT'S FLAGS TO BECOME A ROW (effects step 2a, Vera 2026-10-01; Desktop/V/effects2a-table.md,
   sadia's row check).

   SRD, Condition Summary, Prone (d20srd.org/srd/conditionSummary.htm, read in Chrome 2026-10-01): "An attacker who is
   prone has a -4 penalty on melee attack rolls and cannot use a ranged weapon (except for a crossbow). A defender who
   is prone gains a +4 bonus to Armor Class against ranged attacks, but takes a -4 penalty to AC against melee attacks.
   Standing up is a move-equivalent action that provokes an attack of opportunity."

   ONE FLAG, TWO DOORS, AND NO RUNNING TOTAL. Prone has one state and no clock: a body is down or up, whatever put it
   there, and standing ends it. The fight wrote it by hand in nine places, five of which paid -4 into `acMod` and four
   of which did not, while all three stand-ups took +4 back: a body tripped by the maneuver or the overrun stood up 4 AC
   better for the rest of the fight, and a ranged swing met the melee -4 too (both found by probe that morning). Now
   `prone` is written only through proneDown and standUp, which touch nothing else, and what prone costs is read off the
   flag at the swing by the two readers below. Steps 2b and 2c add their rows to the same two readers.
   ========================================================================== */

export const PRONE = {
    name: 'prone',
    page: 'd20srd.org/srd/conditionSummary.htm',
    srd: 'An attacker who is prone has a -4 penalty on melee attack rolls and cannot use a ranged weapon (except for a crossbow). A defender who is prone gains a +4 bonus to Armor Class against ranged attacks, but takes a -4 penalty to AC against melee attacks. Standing up is a move-equivalent action that provokes an attack of opportunity.',
    /* its own swings, and its guard against one, by melee and ranged (its words on the bar and the card are
       config/text.js $lohTXCondProne, asked by name where they are drawn) */
    swing: { melee: -4, ranged: 0 },
    guard: { melee: -4, ranged: 4 },
};

/** down: true when the body fell now, false when it already lay there */
export function proneDown(c) {
    if (!c || c.prone) return false;
    c.prone = true;
    return true;
}

/** up: true when the body stood now, false when it was already on its feet */
export function standUp(c) {
    if (!c || !c.prone) return false;
    c.prone = false;
    return true;
}

/** what a body's own conditions do to its swing, melee or ranged: { atk, terms } (terms [[n, word], ...] summing to atk:
    T5, the attack roll's terms) */
export function swingTermsOf(c, ranged) {
    let atk = 0;
    const terms = [];
    if (c && c.prone) {
        const n = ranged ? PRONE.swing.ranged : PRONE.swing.melee;
        atk += n;
        if (n) terms.push([n, textOf('$lohTXTermProne')]);
    }
    /* SRD Dazzled: "a -1 penalty on attack rolls", melee or ranged (effects step 2b: the three swing sites read it
       here, never by hand) */
    if (c && c.dazzledNow) { atk += CONDS.dazzled.swing; terms.push([CONDS.dazzled.swing, CONDS.dazzled.name]); }
    return { atk, terms };
}

/** what a body's conditions do to its guard against one swing, melee or ranged: { ac, atk, note, dexGone, atkTerms }
    (atkTerms [[n, word], ...] summing to atk: T5, the attack roll's terms).
    `o.helpless` is the fight's one answer (battle.js helplessFor, handed in: the cog never imports the fight), and
    `o.meleeSwing` a swing that earns helpless's +4. `atk` and its terms belong on the attacker's side of the line, and
    `note` beside the AC (move 6b-1b: a guard row's numberless notes are facts of the AC, the duel's rule);
    `dexGone` says the Dexterity bonus is already taken, so nothing below takes it twice (effects step 2c). */
export function guardTermsOf(c, ranged, o = {}) {
    let ac = 0, atk = 0;
    let note = '';
    let dexGone = false;
    const atkTerms = [];
    const dex = (c && c.dexMod) || 0;
    if (c && o.helpless) {
        /* SRD Helpless: "treated as having a Dexterity of 0 (-5 modifier). Melee attacks against a helpless target get
           a +4 bonus ... Ranged attacks gets no special bonus" */
        ac += -5 - dex;
        dexGone = true;
        if (o.meleeSwing) { atk += 4; atkTerms.push([4, textOf('$lohTXTermHelpless')]); }
    } else if (c && c.blindRounds > 0) {
        /* the sun's blind round (battle.js lightBlindTick): -2 AC and no Dexterity bonus, the positive half */
        ac += -2 - Math.max(0, dex);
        dexGone = true;
        note += ' (vs blinded)';      // a fact of the AC, said beside it (6b-1b's B5, the duel's rule)
    } else if (c && c.stunned) {
        /* SRD Stunned: "takes a -2 penalty to AC, and loses his Dexterity bonus to AC (if any)" */
        ac += CONDS.stunned.guard.ac - Math.max(0, dex);
        dexGone = true;
        note += ' (vs stunned)';      // a fact of the AC, said beside it (6b-1b's B5)
    }
    if (c && c.prone) {
        const n = ranged ? PRONE.guard.ranged : PRONE.guard.melee;
        ac += n;
        note += ' (prone ' + (n > 0 ? '+' : '') + n + ' vs ' + (ranged ? 'ranged' : 'melee') + ')';
    }
    return { ac, atk, note, dexGone, atkTerms };
}

/*,,. WHAT LYING PRONE REFUSES, ONE QUESTION (sadia's row check: tryUse and the ready's gate both ask it) ,,,
   "cannot use a ranged weapon (except for a crossbow)", and the SRD's own split of the weapons (d20srd.org/srd/
   equipment/weapons.htm, Melee and Ranged Weapons, read in Chrome 2026-10-01): "Melee weapons are used for making melee
   attacks, though some of them can be thrown as well. Ranged weapons are thrown weapons or projectile weapons that are
   not effective in melee." So a bow is refused and a crossbow (the only weapon with a `reload`) is not; a thrown
   weapon is refused when it is a RANGED weapon (`rangedWeapon`, roster.js: the javelin), and a melee weapon thrown (a
   dagger, a club, a spear, a trident, a throwing axe, a light hammer) is not; a spell is no weapon. */
export function proneRefuses(c, move) {
    if (!c || !c.prone || !move || move.reload) return false;
    return move.fx === 'arrow' || !!move.rangedWeapon;
}

/* ============================================================================
   THE ENTRIES: FATIGUED, EXHAUSTED AND DAZZLED BECOME ROWS, AND THE MARKS MOVE ONTO THEM (effects step 2b, Vera
   2026-10-01; Desktop/V/effects2b-table.md, sadia's row checks).

   SRD, Condition Summary (d20srd.org/srd/conditionSummary.htm, read in Chrome 2026-10-01):
     Fatigued   "A fatigued character can neither run nor charge and takes a -2 penalty to Strength and Dexterity.
                Doing anything that would normally cause fatigue causes the fatigued character to become exhausted.
                After 8 hours of complete rest, fatigued characters are no longer fatigued."
     Exhausted  "An exhausted character moves at half speed and takes a -6 penalty to Strength and Dexterity. After 1
                hour of complete rest, an exhausted character becomes fatigued. A fatigued character becomes exhausted
                by doing something else that would normally cause fatigue."
     Dazzled    "A dazzled creature takes a -1 penalty on attack rolls, Search checks, and Spot checks."
   and the page's head: "If more than one condition affects a character, apply them all. If certain effects can't
   combine, apply the most severe effect."

   ONE ENTRY PER SOURCE. Fatigue had three copies in three shapes: the rage's end and the troll's sun each paid
   -1/-1/-1 by hand, and Touch of Fatigue's mark set the flag and cost nothing; dazzled was one flag that the sun and
   Flare each cleared for the other. Now a body holds `c.conds`, one entry `{ id, from, rounds, laid }` per row per
   source. `from` is 'mark' (a spell's mark, TAGS above), 'rage', 'sun' or 'fatigue on fatigue'; `rounds` counts down
   on the body's own turns (tickTags, the one clock), or is null for "while its source holds" and "for the encounter";
   `laid` is a mark's caster and save. A row is on while any entry for it is, and ending one source never ends another's.

   THE NUMBERS COME THROUGH THE BOONS' ONE RECOMPUTE (boonTotals reads condTerms) at the engine's grain (sadia's row
   check): -2 to a score is -1 to its modifier, so fatigued is -1 on the attack, the damage, the AC and Reflex, and -1
   on initiative; exhausted is -3 on each and half speed, in place of fatigued's ("apply the most severe effect"). A
   row counts once however many sources hold it. Dazzled's -1 is the swing's own term (swingTermsOf), where it was paid
   before.

   FATIGUE ON FATIGUE IS EXHAUSTION, reached once and held to the fight's end: only rest lifts it, and a fight holds
   none (sadia's row check; the world's rest is step 3's). A NEW source of fatigue on a body already fatigued is the
   book's "something else that would normally cause fatigue"; a source putting its own row on again is the same
   source, not a new one. (The troll blood's sun is no source: Rose 2026-10-01, by the SRD, whose trolls have no sun.)

   HALF SPEED ROUNDS DOWN (SRD, The Basics, Rounding Fractions, d20srd.org/srd/theBasics.htm, read in Chrome
   2026-10-01): "In general, if you wind up with a fraction, round down, even if the fraction is one-half or larger."
   ========================================================================== */

export const CONDS = {
    fatigued: {
        name: 'fatigued', page: 'd20srd.org/srd/conditionSummary.htm',
        srd: 'A fatigued character can neither run nor charge and takes a -2 penalty to Strength and Dexterity. Doing anything that would normally cause fatigue causes the fatigued character to become exhausted. After 8 hours of complete rest, fatigued characters are no longer fatigued.',
        terms: { attackMod: -1, dmgMod: -1, acMod: -1, saveRef: -1 }, init: -1,
    },
    exhausted: {
        name: 'exhausted', page: 'd20srd.org/srd/conditionSummary.htm',
        srd: 'An exhausted character moves at half speed and takes a -6 penalty to Strength and Dexterity. After 1 hour of complete rest, an exhausted character becomes fatigued. A fatigued character becomes exhausted by doing something else that would normally cause fatigue.',
        terms: { attackMod: -3, dmgMod: -3, acMod: -3, saveRef: -3 }, init: -3,
        /* an exhausted body is tired too: it has every limit fatigue has, and worse, so every "is it fatigued" (the
           charge, Touch of Fatigue's "already", the readers' flag) counts it */
        covers: 'fatigued',
    },
    dazzled: {
        name: 'dazzled', page: 'd20srd.org/srd/conditionSummary.htm',
        srd: 'The creature is unable to see well because of overstimulation of the eyes. A dazzled creature takes a -1 penalty on attack rolls, Search checks, and Spot checks.',
        swing: -1,
        /* and on the two checks the same line names (the skills cog, move S1): rules/skills.js asks rowSkillTermsOf */
        skills: { Spot: -1, Search: -1 },
    },
    /* EFFECTS STEP 2c (Vera 2026-10-01; Desktop/V/effects2c-table.md, sadia's row check; the SRD's own pages read in
       Chrome that day). A row with `noActs` takes its body's turn (actsNotRow below); `guard` is its own term against a
       swing (guardTermsOf); `helpless` makes the fight's one question (battle.js helplessFor) answer yes. */
    stunned: {
        name: 'stunned', page: 'd20srd.org/srd/conditionSummary.htm',
        srd: 'A stunned creature drops everything held, can\'t take actions, takes a -2 penalty to AC, and loses his Dexterity bonus to AC (if any).',
        noActs: true, guard: { ac: -2 },
    },
    dazed: {
        name: 'dazed', page: 'd20srd.org/srd/conditionSummary.htm',
        srd: 'The creature is unable to act normally. A dazed creature can take no actions, but has no penalty to AC. A dazed condition typically lasts 1 round.',
        noActs: true,
    },
    laughing: {
        name: 'laughing', page: 'd20srd.org/srd/spells/hideousLaughter.htm',
        srd: 'It collapses into gales of manic laughter, falling prone. The subject can take no actions while laughing, but is not considered helpless. After the spell ends, it can act normally.',
        noActs: true,
    },
    /* troll blood's sun (Rose 2026-10-01, in the popup: "Paralyzed, as the text says", Troll-kin's own "have a chance
       to be paralyzed"): helpless for its round */
    paralyzed: {
        name: 'paralyzed', page: 'd20srd.org/srd/conditionSummary.htm',
        srd: 'A paralyzed character is frozen in place and unable to move or act. A paralyzed character has effective Dexterity and Strength scores of 0 and is helpless, but can take purely mental actions.',
        noActs: true, helpless: true,
    },
    /* EFFECTS STEP 3b (Vera 2026-10-02; Desktop/V/effects3b-table.md, row-checked by sadia): a body's lie (out cold from the
       elements, a fist's nonlethal, or the dying road) as a WORLD row on its record, saved with it. `world`: never laid
       into a fighter (battle/roster.js skips it), since the fight keeps its own corridor and knock-out */
    unconscious: {
        name: 'unconscious', page: 'd20srd.org/srd/conditionSummary.htm',
        srd: 'Knocked out and helpless. Unconsciousness can result from having current hit points between -1 and -9, or from nonlethal damage in excess of current hit points.',
        world: true, helpless: true,
    },
    /* EFFECTS STEP 3c (Vera 2026-10-02; Desktop/V/effects3c-table.md, row-checked by sadia): rows a body's BLOOD grants
       (GRANTS below), never laid on a record or a fighter (layRow and putOn refuse them): their source holds them while
       it is there, so nothing is stored and a granted row lives exactly as long as its feat. Each carries its own words
       and its numbers, the one place to edit them. Rose's rulings stand in them as recorded. */
    regeneration: {
        name: 'regeneration', page: 'd20srd.org/srd/specialAbilities.htm',
        srd: 'Damage dealt to the creature is treated as nonlethal damage, and the creature automatically cures itself of nonlethal damage at a fixed rate per round, as given in the creature\'s entry. Certain attack forms, typically fire and acid, deal damage to the creature normally.',
        rulings: 'Rose 2026-09-28: the blood holds an ordinary wound at its cap, -19 with Diehard and -10 without, and knits an hour at a time ("every hour +1 hp"); only a real wound reaches past -10, and there it kills. 08-20: nothing knits under a visible sun.',
        granted: true, real: ['fire', 'acid', 'sun', 'radiant'], caps: { diehard: -19, none: -10 }, everyMin: 60,
    },
    sunburn: {
        name: 'sunburn', page: 'data/feats.js, Troll-kin',
        text: 'You are adverse to the sun; you take damage over time in direct sunlight, have a chance to be paralyzed.',
        rulings: 'Rose 2026-09-16, the world: "1 damage every 10 minutes in game. Count it as rain" (shelter and shade stop it), a failure holding the feet a round; 10-01, a fight: a failed save is paralyzed for the round, and no sun fatigue.',
        granted: true, dmg: 1, dc: 12, everyMin: 10, holdS: 6, fightRow: 'paralyzed', fightRounds: 1,
    },
};

/** WHAT A BLOOD, A FEAT OR A TRAIT GRANTS (effects step 3c): its name, the rows it grants, and the grant's own numbers
    (a rate), so a statblock's regeneration 5 is one more line here */
export const GRANTS = {
    'Troll-kin': { regeneration: { rate: 1 }, sunburn: {} },
};
/** the grant of a granted row among these sources (a body's feats), or null; two grants of one row: the better rate */
export function grantOf(sources, id) {
    if (!Array.isArray(sources) || !CONDS[id] || !CONDS[id].granted) return null;
    let best = null;
    for (const s of sources) {
        const g = GRANTS[s] && GRANTS[s][id];
        if (g && (!best || (g.rate || 0) > (best.rate || 0))) best = g;
    }
    return best;
}

/* the body's entries, read (never made by reading) */
function entriesOf(c) { return (c && Array.isArray(c.conds)) ? c.conds : []; }
function entryOf(c, id, from) { return entriesOf(c).find((e) => e.id === id && e.from === from) || null; }

/* add this source's entry for a row, or keep the longer of its two clocks (null, "while its source holds", outlasts
   any count) */
function lay(c, id, from, rounds) {
    const e = entryOf(c, id, from);
    if (e) { e.rounds = (e.rounds == null || rounds == null) ? null : Math.max(e.rounds, rounds); return e; }
    if (!Array.isArray(c.conds)) c.conds = [];
    const fresh = { id, from, rounds, laid: null };
    c.conds.push(fresh);
    return fresh;
}

/** is this row on this body, from any source (an exhausted entry counts as fatigued: CONDS.exhausted.covers) */
export function isOn(c, id) {
    return entriesOf(c).some((e) => e.id === id || (CONDS[e.id] && CONDS[e.id].covers === id));
}

/** does this one source hold this row (the sun's tick asks whether it is the sun's yet) */
export function heldBy(c, id, from) {
    return !!entryOf(c, id, String(from || id));
}

/** the row whose flat terms the one recompute takes: the worse of exhausted and fatigued, once (or null) */
function termsRowOf(c) {
    return isOn(c, 'exhausted') ? CONDS.exhausted : isOn(c, 'fatigued') ? CONDS.fatigued : null;
}
/** the rows' flat terms for the one recompute: the worse of fatigued and exhausted, once */
export function condTerms(c) {
    const row = termsRowOf(c);
    return row ? { ...row.terms } : {};
}

/* the readers' words, written from the entries and nowhere else, and the numbers through the one recompute */
function settle(c) {
    if (!c) return;
    c.exhausted = isOn(c, 'exhausted');
    c.fatigued = isOn(c, 'fatigued');
    c.dazzledNow = isOn(c, 'dazzled');
    c.stunned = isOn(c, 'stunned');
    c.dazed = isOn(c, 'dazed');
    c.laughing = isOn(c, 'laughing');
    c.paralyzed = isOn(c, 'paralyzed');
    applyBoons(c);
}

/**
 * PUT A ROW ON A BODY FROM ONE SOURCE ('rage', 'sun'), for `rounds` of its turns or, null, while the source holds. A
 * new source of fatigue on a body already fatigued exhausts it, for the encounter. Returns true when the row was not
 * on before. (A spell's mark comes through giveTag, which keeps its spell's own "already" rule.)
 */
export function putOn(c, id, from, rounds) {
    if (!c || !CONDS[id] || CONDS[id].granted) return false;   // a granted row is its source's (effects step 3c)
    const src = String(from || id);
    const wasOn = isOn(c, id);
    if (id === 'fatigued' && wasOn && !entryOf(c, id, src) && !isOn(c, 'exhausted'))
        lay(c, 'exhausted', 'fatigue on fatigue', null);
    lay(c, id, src, rounds == null ? null : Math.max(1, Math.round(rounds)));
    settle(c);
    return !wasOn;
}

/** take one source's entry off; the row stays while another source holds it. Returns true when the row went off. */
export function takeOff(c, id, from) {
    const e = entryOf(c, id, String(from || id));
    if (!e) return false;
    c.conds = c.conds.filter((x) => x !== e);
    settle(c);
    return !isOn(c, id);
}

/** every boon and every entry off at once, through the one recompute, and each mark's own flag told (the bench's
    restart) */
export function clearEffects(c) {
    if (!c) return;
    const marks = entriesOf(c).filter((e) => e.from === 'mark' && TAGS[e.id] && !TAGS[e.id].row);
    c.boons = {};
    c.conds = [];
    for (const e of marks) TAGS[e.id].set(c, false, 0, e.laid);
    settle(c);
}

/** a body's feet for one move action after its conditions: none under Entangle's "can't move" (`noMove`), half when
    exhausted ("moves at half speed"), its speed otherwise. `dflt` stands in for a body with no speed, as each reader
    did before. Every place the fight reads a body's feet asks this. */
export function speedOf(c, dflt = 0) {
    if (!c || c.noMove) return 0;
    const ft = c.speedFt || dflt;
    return c.exhausted ? Math.floor(ft / 2) : ft;
}

/** the row that takes this body's turn ("can take no actions": stunned, dazed, laughing, paralyzed), or null: one
    question for the turn's top, the ready's gate, a threat and the learner (effects step 2c) */
export function actsNotRow(c) {
    for (const e of entriesOf(c)) if (CONDS[e.id] && CONDS[e.id].noActs) return e.id;
    return null;
}

/** what the rows do to a body's initiative: fatigued -1, exhausted -3 (the Dexterity penalty's modifier) */
export function initTermsOf(c) {
    return c && c.exhausted ? CONDS.exhausted.init : c && c.fatigued ? CONDS.fatigued.init : 0;
}

/** the row that bars a body's charge ("can neither run nor charge"; the exhausted with it), or null */
export function chargeBarredBy(c) {
    return c && c.exhausted ? 'exhausted' : c && c.fatigued ? 'fatigued' : null;
}

/*,,. THE RECORD'S ROWS (effects step 3a, Vera 2026-10-02; Desktop/V/effects3a-table.md R1, sadia's row check) ,,,
   The world's half of the one reader. Each effect on a body's RECORD is one entry on its `conditions` section, the shape
   step 1 named: { id, from, since, until, dc, cl }, `since` and `until` in game minutes (world/clock.js totalMinutes),
   `until` null while its source holds (the cold's band, the blood, worn armour). The rows are the fight's own (CONDS),
   and so is the rule that a new source of fatigue on a fatigued body exhausts it. The record keeps them between fights
   and through the book; a fight lays them into its fighter's `conds` at the bake and writes back what outlasts it (3a-2).
   The SRD, Condition Summary (d20srd.org/srd/conditionSummary.htm): fatigued "can neither run nor charge and takes a -2
   penalty to Strength and Dexterity"; exhausted "moves at half speed and takes a -6 penalty to Strength and Dexterity".
   At the engine's grain, as the fight's terms: -1 and -3 on what those two abilities move. */
const rowsOf = (rec) => (rec && Array.isArray(rec.conditions) ? rec.conditions : []);
const rowEntryOf = (rec, id, from) => rowsOf(rec).find((e) => e.id === id && e.from === from) || null;

/** is this row on this record, from any source (an exhausted entry counts as fatigued, as `isOn`) */
export function rowOn(rec, id) {
    return rowsOf(rec).some((e) => e.id === id || (CONDS[e.id] && CONDS[e.id].covers === id));
}
/** is this record held by a row its table marks helpless (paralyzed, unconscious): the world's half of the fight's
    helplessFor, for a coup out of a fight (move CA) */
export const helplessOn = (rec) => Object.keys(CONDS).some((id) => CONDS[id].helpless && rowOn(rec, id));

/** every source that holds a row on this record (the band names who did it) */
export const rowSources = (rec, id) => rowsOf(rec).filter((e) => e.id === id).map((e) => e.from);

/**
 * LAY A ROW ON A RECORD FROM ONE SOURCE ('cold', 'heat', 'armour'), from `since` (game minutes) until `until` (null:
 * while the source holds). A new source of fatigue on a record already fatigued exhausts it, held until rest (3a-3); the
 * same source laying its row again keeps the later of its two ends. Returns true when the row was not on before.
 */
export function layRow(rec, id, from, since, until = null, o = {}) {
    if (!rec || !CONDS[id] || CONDS[id].granted) return false;   // a granted row is its source's (effects step 3c)
    const src = String(from || id);
    const wasOn = rowOn(rec, id);
    if (!Array.isArray(rec.conditions)) rec.conditions = [];
    if (id === 'fatigued' && wasOn && !rowEntryOf(rec, id, src) && !rowOn(rec, 'exhausted'))
        rec.conditions.push({ id: 'exhausted', from: 'fatigue on fatigue', since, until: null, dc: null, cl: null });
    const e = rowEntryOf(rec, id, src);
    if (e) e.until = (e.until == null || until == null) ? null : Math.max(e.until, until);
    else rec.conditions.push({ id, from: src, since, until, dc: o.dc == null ? null : o.dc, cl: o.cl == null ? null : o.cl });
    return !wasOn;
}

/** take one source's entry off a record; the row stays while another holds it. Returns true when the row went off */
export function liftRow(rec, id, from) {
    const e = rowEntryOf(rec, id, String(from || id));
    if (!e) return false;
    /* in place (effects step 3a-2): a seat's ledger holds this very list (world/void.js keepSeatWounds), and a new list
       would leave the ledger keeping the row */
    rec.conditions.splice(rec.conditions.indexOf(e), 1);
    return !rowOn(rec, id);
}

/** the entries whose end has come by `now` (game minutes), taken off; returns them, so the world can say so */
export function tickRows(rec, now) {
    const gone = rowsOf(rec).filter((e) => e.until != null && e.until <= now);
    for (const e of gone) rec.conditions.splice(rec.conditions.indexOf(e), 1);   // in place, as liftRow
    return gone;
}

/** what a record's rows cost the world's checks and feet: the worse of fatigued and exhausted, once (as condTerms);
    `{ str, dex }` on what those abilities move, `noRun` for "can neither run nor charge", `half` for half speed */
export function rowTermsOf(rec) {
    if (rowOn(rec, 'exhausted')) return { str: -3, dex: -3, noRun: true, half: true, row: 'exhausted' };
    if (rowOn(rec, 'fatigued')) return { str: -1, dex: -1, noRun: true, half: false, row: 'fatigued' };
    return { str: 0, dex: 0, noRun: false, half: false, row: null };
}

/** the term a record's fatigue rows put on one check of `ability` ('STR', 'DEX'; any other pays nothing): { n, row }, the
    row's name for the dice line. Her roll, a body's, a seat's tool check and her world Reflex save all ask this */
export function tiredTermOf(rec, ability) {
    const t = rowTermsOf(rec);
    const ab = String(ability || '').toUpperCase();
    const n = ab === 'STR' ? t.str : ab === 'DEX' ? t.dex : 0;
    return { n, row: n ? t.row : null };
}

/** WHAT A RECORD'S ROWS COST ONE SKILL CHECK (the skills cog, move S1; sadia's note, 2026-10-03): fatigue and exhaustion
    on what Strength and Dexterity move (tiredTermOf, the worse of the two, once), and each row's own `skills` column
    (dazzled: the SRD's "-1 penalty on attack rolls, Search checks, and Spot checks"). A row the world computes where it
    is asked rather than keeps on the record (the sun's dazzle) comes in the moment under the row's id, and counts once
    whether it is on the record, in the moment, or both. Answers [[n, "row:<name>"], ...] for rules/skills.js checkOf */
export function rowSkillTermsOf(rec, skill, ability, moment = {}) {
    const out = [];
    const tired = tiredTermOf(rec, ability);
    if (tired.n) out.push([tired.n, 'row:' + tired.row]);
    for (const id of Object.keys(CONDS)) {
        const c = CONDS[id];
        if (!c || !c.skills || !Object.prototype.hasOwnProperty.call(c.skills, skill)) continue;
        if (rowOn(rec, id) || (moment && moment[id])) out.push([c.skills[skill], 'row:' + c.name]);
    }
    return out;
}

/**
 * WHAT OUTLASTS THE FIGHT (effects step 3a-2's F2, Vera 2026-10-02; Desktop/V/effects3a2-table.md, row-checked by sadia):
 * a fighter's rows with a game minute or more still to run (ten of its rounds or more), as { id, from, roundsLeft }, for
 * the world to lay on the body's record by its own clock (world/void.js handRowsBack). A row held while its source holds
 * never goes back: the world's own never left the record, the rage's fatigue ends with its encounter (the SRD: "for the
 * duration of that encounter"), and the sun's dazzle is computed where it is asked.
 */
export function rowsOutlastingOf(c) {
    const out = [];
    for (const e of (c && Array.isArray(c.conds) ? c.conds : [])) {
        /* and a critical feat's rider (move F6a): held, it goes back held, for the world's rest to lift (a fight's own
           fatigue on fatigue still ends with its encounter) */
        if (e && CONDS[e.id] && e.rounds == null && e.from === 'critical') { out.push({ id: e.id, from: e.from, roundsLeft: null }); continue; }
        if (!e || !CONDS[e.id] || e.rounds == null || !(e.rounds >= 10)) continue;
        out.push({ id: e.id, from: e.from, roundsLeft: e.rounds });
    }
    return out;
}

/**
 * REST, BY THE SRD (effects step 3a-3, Vera 2026-10-02; Desktop/V/effects3a3-table.md S1, row-checked by sadia). The
 * Condition Summary's own words, CONDS's `srd` above: exhausted "After 1 hour of complete rest, an exhausted character
 * becomes fatigued"; fatigued "After 8 hours of complete rest, fatigued characters are no longer fatigued". The two chain:
 * one 8-hour night takes an exhausted body to fatigued and a second to rested, and sixteen straight hours do both. Rest
 * lifts only what rest ends (REST_ENDS): fatigue on fatigue's exhaustion, the fatigue it leaves ("exhaustion") and a
 * night in armour's ("armour"). The weather's held rows lift when she warms (Rose's 09-20 ruling), and a timed row ends
 * on its own clock. The exhaustion always leaves its own fatigue ('exhaustion', unless one is there already), whatever
 * else is fatigued, so another source never speeds the mending (sadia, 13:5x: the cold's fatigue "end[s] when the
 * character recovers the nonlethal damage", a thing apart). It is pushed straight onto the list, never through layRow,
 * which would read it as a new source on a fatigued body (sadia's (c)). Its 8 hours begin when the first hour ends, so
 * one night leaves it and a second ends it; the other rows rest ends go at 8. In place, as liftRow. Returns { was, now },
 * the worse row before and after (null, 'fatigued', 'exhausted').
 */
const REST_ENDS = new Set(['fatigue on fatigue', 'exhaustion', 'armour', 'critical']);   // a critical feat's rider (move F6a)
const worstRowOf = (rec) => (rowOn(rec, 'exhausted') ? 'exhausted' : rowOn(rec, 'fatigued') ? 'fatigued' : null);
export function restRows(rec, hours, now) {
    const was = worstRowOf(rec);
    if (!rec || !Array.isArray(rec.conditions)) return { was, now: was };
    const list = rec.conditions;
    const h = Math.max(0, Number(hours) || 0);
    const ex = list.filter((e) => e.id === 'exhausted' && REST_ENDS.has(e.from));
    let tail = null;                   // the exhaustion's own fatigue, whose 8 hours begin when the first hour ends
    if (ex.length && h >= 1) {
        for (const e of ex) list.splice(list.indexOf(e), 1);
        tail = list.find((e) => e.id === 'fatigued' && e.from === 'exhaustion') || null;
        if (!tail) list.push(tail = { id: 'fatigued', from: 'exhaustion', since: now == null ? null : now, until: null, dc: null, cl: null });
    }
    for (const e of list.filter((x) => x.id === 'fatigued' && REST_ENDS.has(x.from)))
        if (h >= (e === tail ? 9 : 8)) list.splice(list.indexOf(e), 1);
    return { was, now: worstRowOf(rec) };
}

/**
 * THE DOWN STATES ON A RECORD (effects step 3b, Vera 2026-10-02; Desktop/V/effects3b-table.md, row-checked by sadia). The
 * SRD, Condition Summary (read in Chrome that day): disabled "A character with 0 hit points, or one who has negative hit
 * points but has become stable and conscious"; dying "unconscious and near death... -1 to -9 current hit points"; stable
 * "no longer dying, but is still unconscious"; unconscious "Knocked out and helpless". The dying road is ONE object on the
 * record's health.injury (its minute, hour and day clocks belong together), and a lie from outside the road (the elements,
 * a fist) is the `unconscious` row; the road's own lie lays the row from 'dying' as well. downOf reads the row OR the road,
 * so a missed lift can never hide a down body (sadia's check).
 * A lie keeps today's shape on the row (`lie`), with `until` null: held while its own wake has not come (wakeOutCold,
 * bodyComesRound, the road), never ended by a clock that does not know it. JSON keeps no Infinity, so a held wake is null.
 */
export function lieOf(rec) {
    const e = rowsOf(rec).find((x) => x.id === 'unconscious');
    if (!e) return null;
    const lie = Object.assign({}, e.lie || {});
    lie.wakeAt = Number.isFinite(lie.wakeAt) ? lie.wakeAt : Infinity;
    return lie;
}
export function setLie(rec, v, now) {
    if (!rec) return;
    if (!Array.isArray(rec.conditions)) rec.conditions = [];
    const list = rec.conditions;
    for (const e of list.filter((x) => x.id === 'unconscious')) list.splice(list.indexOf(e), 1);   // in place, as liftRow
    if (!v) return;
    const lie = Object.assign({}, v);
    if (!Number.isFinite(lie.wakeAt)) lie.wakeAt = null;
    list.push({ id: 'unconscious', from: v.why || 'nonlethal', since: v.since != null ? v.since : (now == null ? null : now),
                until: null, dc: null, cl: null, lie });
}
export function downOf(rec) {
    const road = (rec && rec.health && rec.health.injury) || null;
    const lie = lieOf(rec);
    const roadDown = !!(road && (road.dying || !road.conscious));
    return { dying: !!(road && road.dying), stable: !!(road && road.stable), disabled: !!(road && road.conscious && !road.dying),
             unconscious: !!lie || roadDown, why: lie ? (lie.why || 'nonlethal') : roadDown ? 'dying' : null };
}
