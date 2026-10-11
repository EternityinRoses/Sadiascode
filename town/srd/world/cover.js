/* ============================================================================
   COVER -- a property of the LINE between two bodies, never of a nearby wall.

   Rose, 2026-09-15, and he wrote the whole rule himself before I could get it
   wrong: "if you are doing cover whenever the target is near a wall you'll
   have to do it... and then you'll have to consider if the orientation
   -relative- to where the enemy is... for example if there is a wall between
   the enemy and target then its cover but if the enemy is in front of a wall
   but visible to the target... it isnt".

   THAT IS THE SRD EXACTLY, and it is worth saying why the naive version is not
   merely inaccurate but actively wrong: "is there a wall within a metre" is a
   fact about a PLACE, and cover is a fact about a PAIR. A body pressed against
   a wall with an archer on the same side of it has no cover at all -- it has a
   wall behind it, which helps nobody. Proximity would hand it +4 AC for
   standing in the open. So there is no proximity test anywhere in this file.
   The only question ever asked is what lies ON THE LINE.

   THE BOOK'S METHOD, and the corners are the point. From the SRD:

       "To determine whether your target has cover, choose a corner of your
        square. If any line from this corner to any corner of the target's
        square passes through a square or border that blocks line of effect or
        provides cover, the target has cover (+4 AC, +2 Reflex)."

   THE ATTACKER CHOOSES, so the attacker takes the kindest corner. The target
   therefore has cover only if EVERY corner the attacker could stand in still
   leaves at least one blocked line. That asymmetry is the rule doing real
   work: stepping one square sideways to clear your shot is a genuine tactical
   move, and a centre-to-centre ray cannot model it.

   TOTAL COVER is when nothing gets through at all -- no line of effect, and
   the target cannot be attacked or targeted rather than merely being harder to
   hit.

   SOFT COVER is a creature in the way: +4 AC and nothing else. No Reflex bonus
   and no Hide, because a body you are standing behind does not conceal you, it
   just gets in the way.

   WHAT MAKES IT MAP AGNOSTIC: it never learns what a wall is. It is handed a
   `blocked(x1, z1, x2, z2)` predicate -- the MAP'S OWN segment test, the same
   one the pathfinder and the sight law already use -- and it owns the corners,
   the counting and the SRD's numbers. A dungeon passes its own walls, a forest
   passes its trunks, and neither changes a line here. Passing a second line
   test would be the bug this whole file is built to avoid: the shot that the
   cover rule says is blocked and the sight rule says is clear.

       const cover = mountCover({ blocked, softBlocked, squareM });
       const c = cover.between(attacker, target);   // { degree, ac, ref, hide }
   ========================================================================== */

/** the SRD's own numbers, named once so nothing else hard-codes a 4 */
export const COVER_AC = 4;
export const COVER_REF = 2;

/*,,. THE FOUR STATES, CHECKED AGAINST THE SRD RATHER THAN AGAINST MY MEMORY ,,,
   Rose 2026-09-15: "fact check yourself look up the srd online" -- and he was
   right to ask, because I had improved cover half wrong and stated a claim
   about 3.0 terminology I could not support.

   COVER          +4 AC, +2 Reflex, and it lets you Hide.
   IMPROVED       the same bonuses DOUBLED: +8 AC, +4 Reflex. It also grants
                  +10 on Hide checks and effectively IMPROVED EVASION against
                  any attack the Reflex bonus applies to -- both of which I
                  missed first time round and neither of which is decoration.
   TOTAL          no line of effect: cannot be attacked or targeted at all.
                  It grants no AC bonus because there is no attack to modify.
   SOFT           a CREATURE in the way. +4 AC and nothing else: no Reflex
                  bonus, and it does NOT let you Hide, because a body you are
                  standing behind gets in the way rather than concealing you.

   AND COVER IS NOT CONCEALMENT. Concealment is mist and darkness and gives a
   MISS CHANCE, not an armour bonus; battle.js keeps concealmentBetween apart
   from this for exactly that reason. */
export const NONE = { degree: "none", ac: 0, ref: 0, hide: false, hideBonus: 0,
                      evasion: false, blocksLine: false, label: "" };
export const SOFT = { degree: "soft", ac: COVER_AC, ref: 0, hide: false, hideBonus: 0,
                      evasion: false, blocksLine: false, label: "Soft cover" };
export const COVER = { degree: "cover", ac: COVER_AC, ref: COVER_REF, hide: true,
                       hideBonus: 0, evasion: false, blocksLine: false, label: "Cover" };
export const IMPROVED = { degree: "improved", ac: COVER_AC * 2, ref: COVER_REF * 2,
                          hide: true, hideBonus: 10, evasion: true,
                          blocksLine: false, label: "Improved cover" };
export const TOTAL = { degree: "total", ac: 0, ref: 0, hide: true, hideBonus: 0,
                       evasion: false, blocksLine: true, label: "Total cover" };

/*,,. AND CONCEALMENT, WHICH IS ITS SIBLING AND NOT ITS SYNONYM ,,,
   Rose 2026-09-15, standing in weather fog: "Im literally in fog right now
   which is concealed".

   HE WAS, AND THE GAME GAVE HIM NOTHING FOR IT. world/air.js already models
   smoke as concealment and battle.js already models its mists; weather fog
   changed a line of description and stopped there. No chip, no Hide, no miss
   chance.

   COVER IS A WALL AND CONCEALMENT IS MIST, and the book keeps them apart for
   a reason: cover is ARMOUR -- it adds to AC, so a better attack bonus beats
   it -- while concealment is a MISS CHANCE rolled after the attack already
   hit, which no amount of skill overcomes. They stack, they are tracked
   separately, and folding them together would quietly make a fog bank into
   plate armour.

     CONCEALED        20% miss chance. Lets you Hide, same as cover.
     TOTAL            50% miss chance, and the attacker cannot see you to
                      target you at all -- only guess at a square.

   THE DEGREES ARE THE SRD'S and the numbers are named once here so nothing
   downstream hard-codes a 20. */
export const CLEAR = { degree: "none", miss: 0, hide: false, label: "" };
export const CONCEALED = { degree: "concealed", miss: 20, hide: true,
                           label: "Concealed" };
export const TOTALLY_CONCEALED = { degree: "total", miss: 50, hide: true,
                                   label: "Total concealment" };

/**
 * How concealed is a body, given what the map says is in the air?
 *
 * IT IS NOT A LINE TEST, and that is the whole difference from cover. Mist
 * conceals you because you are IN it, or because it lies between you and the
 * eye -- either one. So the map answers two much simpler questions than the
 * corner fan needs, and this owns only what the degrees are worth.
 *
 * @param o
 *   inIt   (x, z) => how thick the air is at a point: 0 clear, 1 concealing,
 *          2 total. A map with clear air always answers 0.
 *   onLine (x1, z1, x2, z2) => does mist lie between them. Optional.
 */
export function mountConcealment(o = {}) {
    const thick = (x, z) => (o.inIt ? (o.inIt(x, z) | 0) : 0);
    return {
        /** what `to` has against an eye at `from`, or against the world at
            large when nobody is named */
        at(to, from) {
            if (!to) return CLEAR;
            const here = thick(to.x, to.z);
            if (here >= 2) return TOTALLY_CONCEALED;
            let conceal = here >= 1;
            if (!conceal && from && o.onLine) {
                conceal = !!o.onLine(from.x, from.z, to.x, to.z);
            }
            return conceal ? CONCEALED : CLEAR;
        },
    };
}

/**
 * DID THE MURK EAT THE BLOW? The percentile, read.
 *
 * cover.js has owned the NUMBERS since it was written (20 concealed, 50 total)
 * and nothing owned the ROLL, so battle.js kept its own reading of the die and
 * the world kept none at all -- Rose, 09-15, standing in weather: "Im literally
 * in fog right now which is concealed", and a walk-up blow ignored it entirely.
 * A miss chance that only applies once a fight has started is not a rule, it is
 * a fight feature.
 *
 * PURE, AND FEAT-FREE ON PURPOSE. Whether Blind-Fight applies, whether the
 * shooter has Improved Precise Shot, whether something felt its way there by
 * tremorsense: those are questions about a BODY and they stay where bodies are
 * understood. This answers only what the percentile said, and takes the reroll
 * as a fact rather than deciding it.
 *
 * @param conc    a state from mountConcealment, or anything with a `miss`
 * @param d100    the percentile, 1..100
 * @param o.again a second percentile, when the caller has ruled a reroll is
 *                owed (SRD Blind-Fight: melee only, once)
 * @returns {chance, rolls, missed, note} -- `note` is one sentence for a card
 */
export function concealMiss(conc, d100, o = {}) {
    const chance = (conc && conc.miss) | 0;
    if (chance <= 0) return { chance: 0, rolls: [], missed: false, note: "" };
    const name = (conc && conc.label) || "Concealment";
    const rolls = [d100 | 0];
    let missed = rolls[0] <= chance;
    if (missed && o.again != null) {         // the reroll the caller ruled owed
        rolls.push(o.again | 0);
        missed = rolls[1] <= chance;
    }
    const dice = rolls.map((r) => "d100(" + r + ")").join(", rerolled ");
    return {
        chance, rolls, missed,
        /* the note names the odds and the die and stops there (Rose 09-16:
           "concealed is fine - remove 'and the blow finds it' this is
           overexplaining and serves no purpose"); the card's verdict already
           says whether the blow landed */
        note: name + " " + chance + "%: " + dice,
    };
}

/**
 * @param o
 *   blocked     (x1, z1, x2, z2) => is something SOLID on that segment. The
 *               map's own test -- the one its pathfinder and sight law use.
 *               Required; without it nothing has cover from anything.
 *   softBlocked (x1, z1, x2, z2) => is a CREATURE on that segment. Optional:
 *               a map with no bodies in the way simply never has soft cover.
 *   squareM     the grid square in metres. Defaults to the SRD's 5 ft at the
 *               game's own scale; a map on a different scale says so.
 */
export function mountCover(o = {}) {
    const half = ((o.squareM || 1.524) / 2);

    /*,,. THE SAMPLES ARE SPREAD ACROSS THE SHOT, NOT ROUND THE COMPASS ,,,
       The first cut took the four CARDINAL corners of each square, which reads
       like the SRD and fails badly on a narrow obstacle. Rose: "when I step
       behind a tree it still counts as total cover", and then when that was
       fixed the tree stopped giving cover AT ALL -- the maple's trunk is r 0.35
       and NONE of the sixteen cardinal lines went near it. The two parallel
       ones ran 0.76 m to either side of it, and the crossing ones crossed the
       trunk's own plane three or four metres away. The straight line between
       the two of them -- the one that obviously hits a tree you are standing
       behind -- is never traced at all by corner-to-corner.

       SO THE OFFSETS ARE PERPENDICULAR TO THE LINE OF SIGHT and include the
       middle: for a target due north the samples fan out east-west, which is
       the direction that decides whether a trunk is in the way. That is what
       RAW's corner rule APPROXIMATES on a square grid, and it is what
       battle.js had been doing all along with a 3x3 fan -- I replaced a
       working approximation with a more faithful-looking one that was worse.
       Keeping its shape here is the second time tonight the older code turned
       out to be right. */
    /*,,. AND A SQUARE STOPS AT A WALL (Rose 2026-09-27: "if I just stand next to a wall I probably count as 'behind a
       wall'") ,,,
       The side samples are half a square out from the body's own centre, and flush against a wall one of them sat INSIDE
       the stone: every line to it was blocked, so the kindest corner always had one blocked line and the rule said COVER
       from everyone, the woman at arm's length included. A body's space does not reach into a wall, so a side sample
       the body's own centre cannot reach in a straight line is no part of it and is dropped; the centre always stays.
       The same for the one looking, which can only look from where it can stand. Fights read this same fan (battle.js
       coverBetween), so the rule is one rule. */
    const fan = (from, to) => {
        const dx = to.x - from.x, dz = to.z - from.z;
        const len = Math.hypot(dx, dz) || 1e-6;
        const px = -dz / len, pz = dx / len;      // the shot's own right hand
        const at = (p, k) => [p.x + px * k, p.z + pz * k];
        const offs = [-half, 0, half];
        const reach = (p) => offs.filter((k) => k === 0 || !o.blocked || !o.blocked(p.x, p.z, p.x + px * k, p.z + pz * k))
            .map((k) => at(p, k));
        return { a: reach(from), b: reach(to) };
    };

    return {
        /**
         * What cover does `to` have from `from`?
         *
         * @param from { x, z }  the attacker
         * @param to   { x, z }  the target
         * @returns one of NONE / SOFT / COVER / TOTAL, frozen constants so a
         *          caller cannot accidentally mutate the rule.
         */
        between(from, to) {
            if (!from || !to || !o.blocked) return NONE;
            const { a: ac, b: tc } = fan(from, to);
            let bestHard = Infinity;      // fewest blocked lines from any corner
            let worstHard = 0;            // most, for the total-cover test
            /*,,. WHAT BLOCKED IT, when the map cares to say ,,,
               `blocked()` may answer with a bare true or with the THING in the
               way, and the difference matters upstream: battle/ally.js tells a
               mind "behind the stone, which gives it cover", and a mind told
               only that there is cover somewhere cannot decide to go round it.
               So a truthy object is carried out; a bare true simply is not. */
            let by = null;
            for (const [ax, az] of ac) {
                let hit = 0;
                for (const [tx, tz] of tc) {
                    const b = o.blocked(ax, az, tx, tz);
                    if (b) { hit++; if (b !== true && !by) by = b; }
                }
                if (hit < bestHard) bestHard = hit;
                if (hit > worstHard) worstHard = hit;
            }
            /** the verdicts are FROZEN shared constants, so a caller that
                wants the blocker gets its own object rather than scribbling
                the last thing it saw onto the rule itself */
            const said = (base) => (by ? { ...base, by } : base);
            /* TOTAL: nothing gets through from anywhere to anywhere. Tested
               against the WORST corner being fully blocked AND the best one
               too -- i.e. all sixteen lines -- because "no line of effect" is
               exactly that and nothing less. */
            /* TOTAL is every line from every offset -- three by three now,
               not four by four -- because "no line of effect" is exactly that
               and nothing less. */
            if (bestHard === tc.length && worstHard === tc.length) return said(TOTAL);
            /*,,. THE ATTACKER TOOK THE KINDEST CORNER. If even that one still
               has a line through something, the target has cover ,,,
               AND THE OBSTACLE MAY SAY IT IS BETTER THAN ORDINARY. The SRD
               leaves improved cover to judgement -- an arrow slit, a murder
               hole, a wall you are firing through rather than around -- so it
               is DECLARED by the thing in the way rather than guessed at from
               geometry. A map that never declares it never has it, which is
               the right default. */
            if (bestHard > 0) {
                return said(by && by.cover === "improved" ? IMPROVED : COVER);
            }
            /* AND ONLY THEN DO BODIES COUNT. Soft cover is the weakest kind
               and is checked last, so a target already behind a wall is not
               downgraded to soft by a friend standing in the way. */
            if (o.softBlocked) {
                let soft = Infinity;
                for (const [ax, az] of ac) {
                    let hit = 0;
                    for (const [tx, tz] of tc) {
                        if (o.softBlocked(ax, az, tx, tz)) hit++;
                    }
                    if (hit < soft) soft = hit;
                }
                if (soft > 0) return SOFT;
            }
            return NONE;
        },

        /*,,. THE BEST COVER IT HAS FROM ANYWHERE, which is what HIDING asks ,,,
           Rose 2026-09-15: "cover gives +10 and whatever other stat increases
           you're blocking by not letting me get cover".

           `fromAny` below answers "am I protected from everyone", which is the
           right question for a readout and the WRONG one for a Hide check.
           Hiding is not about being safe from all comers: you get behind a
           thing, and you are hidden from whatever is on the far side of it. A
           friend standing in the open beside you does not stop you hiding from
           the archer across the wall.

           AND WITH NOBODY LOOKING AT ALL there is still cover to be had. You
           hide BEFORE the enemy arrives -- that is the entire use of it -- so
           `dirs` lets the map hand in a ring of directions to test against
           when no one is named, and the answer is what she is behind. */
        best(froms, to) {
            const rank = { total: 3, improved: 2, cover: 2, soft: 1, none: 0 };
            let top = NONE;
            for (const f of (froms || [])) {
                const c = this.between(f, to);
                if (rank[c.degree] > rank[top.degree]) top = c;
                if (top.degree === "total") break;
            }
            return top;
        },

        /** the worst cover `to` has from ANY of `froms` -- what a body is
            actually protected by when several things are looking at it. A
            target behind a wall from one archer and in the open to another has
            no cover worth the name, and this is the honest answer to "is she
            in cover" for a readout. */
        fromAny(froms, to) {
            let best = TOTAL;
            /* IMPROVED sits between cover and total (2026-09-27): without it an eye with her behind a declared arrow slit
               ranked undefined and never replaced TOTAL, so every eye giving improved cover read as TOTAL */
            const rank = { total: 3, improved: 2.5, cover: 2, soft: 1, none: 0 };
            for (const f of (froms || [])) {
                const c = this.between(f, to);
                if (rank[c.degree] < rank[best.degree]) best = c;
                if (best === NONE) break;
            }
            return (froms && froms.length) ? best : NONE;
        },
    };
}
