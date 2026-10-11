/* ============================================================================
   THE FILE ON HER: what she actually does in a fight, counted.

   Ported from Systems/sand-pit.html, "The house. Three layers of learning, all
   of them inspectable". This is LAYER ONE and only layer one: plain counters
   over real turns. The predictor net and the doctrine bandit read this; they
   cannot be built first, because a net with nothing to learn from is a random
   number generator with extra steps.

   WHY THE COUNTERS AND NOT THE NET FIRST. Rose's own framing at the start of
   this, 09-12: "we just store stuff like the ranges where the player normally
   attacks, preferred weapons, and so on... the game wont -win- vs the player
   but it will make it so the player is being pulled out of monotony." The
   ranges and the habits ARE the product. A readable file that says "you swing
   from 9 ft and you give ground on a third of your turns" is already enough to
   draft a counter; the net only sharpens the guess about the NEXT turn.

   IT BELONGS TO THE CHARACTER, NOT THE SAVE, and that is a ruling not a
   convenience (Rose 09-12: "be sure the 'Learning' is only tied to the
   character not the game... so if the player makes a new character its a new
   machine learning file"). So it lives beside the character's own record in
   chars/, keyed by her name, and NOT inside the save book. Two consequences,
   both wanted: a new character starts blank however many saves exist, and
   RELOADING DOES NOT UNLEARN. If the file rode the save, the counter to every
   lesson would be F9, and a thing that forgets whenever it is inconvenient is
   not learning at all.

   EVERY COUNTER HERE IS ONE THE ENGINE CAN ACTUALLY FILL. The sandbox records
   a dozen more -- tumbles, potions drunk, power attacks -- and this deliberately
   does not, because LoH has no hook for them yet. A field nobody writes is a
   field somebody later reads as zero and believes.
   ========================================================================== */

/** how many raw turn records to keep for the predictor to train on later.
    The sandbox keeps 400 and trains on the last 90. */
import { pron } from "../pronouns.js";

export const KEEP = 400;

/** the seven things a turn can amount to, the sandbox's own vocabulary */
export const ACTS = ["close and swing", "stand and swing", "shoot", "cast",
                     "advance", "back off", "guard or drink"];
export const A_CLOSE = 0, A_STAND = 1, A_SHOOT = 2, A_CAST = 3,
             A_ADV = 4, A_BACK = 5, A_DEF = 6;
/** and the three things her feet can amount to */
export const MOVES = ["closes", "holds", "opens"];

/** a fresh file */
export function blankProfile() {
    return {
        v: 1,
        turns: 0, fights: 0,
        acts: [0, 0, 0, 0, 0, 0, 0],
        mv: [0, 0, 0],
        /* where she STANDS, and where she actually SWINGS from. The gap
           between them is the sandbox's sharpest single read: a slow closer
           spends most of a bout walking, and every step of that walk is a
           free round for anything that shoots. */
        distSum: 0, distN: 0,
        atkDistSum: 0, atkDistN: 0,
        distHist: [0, 0, 0, 0, 0, 0, 0, 0],     // 0-10, 10-20 ... 70+ ft
        coverTurns: 0, threatenedTurns: 0, flankedTurns: 0,
        /* which quarter of the foe she stands in: behind, flank, flank, face */
        angle: [0, 0, 0, 0],
        weapons: {},          // what she had in hand when she swung
        spells: {},           // what she cast, by name
        saveTargets: {},      // and which save those spells asked for
        hpWhenRetreat: [], hpWhenPress: [],
        savesMade: { fort: 0, ref: 0, will: 0 },
        savesFailed: { fort: 0, ref: 0, will: 0 },
        beatenBy: {},         // what put her down, by name
    };
}

/** a fresh brain: the file, plus the raw turns a predictor would train on */
export function blankBrain() {
    return { profile: blankProfile(), recs: [], lastAct: -1 };
}

/* ---------------------------------------------------------------- writing */

/**
 * One turn of hers, counted.
 * @param brain the brain to write into
 * @param t {object} what the turn amounted to:
 *   act, mv        indices into ACTS and MOVES
 *   dist           ft between her and her nearest foe at the turn's START.
 *                  Not the end: readout() prints it as "she starts her turns
 *                  N ft out", and the gap against atkDist is what names a slow
 *                  closer. This line used to say "end", which is what the
 *                  observer first implemented, and it silently flattened that
 *                  gap to nothing.
 *   atkDist        ft she actually swung or shot from, or null
 *   cover, threatened, flanked   booleans
 *   angle          0..3, which quarter of the foe she stood in
 *   hp, maxHp
 *   weapon         what was in her hand, or null
 *   spell          {name, save} if she cast, or null
 *   inp            the feature vector, for the predictor to train on later
 */
export function noteTurn(brain, t) {
    if (!brain || !t) return;
    const P = brain.profile;
    P.turns++;
    if (t.act >= 0 && t.act < P.acts.length) P.acts[t.act]++;
    if (t.mv >= 0 && t.mv < P.mv.length) P.mv[t.mv]++;
    brain.lastAct = t.act;

    if (t.dist > 0) {
        P.distSum += t.dist; P.distN++;
        P.distHist[Math.min(7, Math.floor(t.dist / 10))]++;
    }
    if (t.atkDist > 0) { P.atkDistSum += t.atkDist; P.atkDistN++; }
    if (t.cover) P.coverTurns++;
    if (t.threatened) P.threatenedTurns++;
    if (t.flanked) P.flankedTurns++;
    if (t.angle >= 0 && t.angle < 4) P.angle[t.angle]++;
    if (t.weapon) P.weapons[t.weapon] = (P.weapons[t.weapon] || 0) + 1;
    if (t.spell && t.spell.name) {
        P.spells[t.spell.name] = (P.spells[t.spell.name] || 0) + 1;
        if (t.spell.save) P.saveTargets[t.spell.save] = (P.saveTargets[t.spell.save] || 0) + 1;
    }
    const frac = t.maxHp > 0 ? t.hp / t.maxHp : 1;
    if (t.act === A_BACK) P.hpWhenRetreat.push(+frac.toFixed(3));
    if (t.act === A_CLOSE || t.act === A_STAND) P.hpWhenPress.push(+frac.toFixed(3));

    if (t.inp) {
        brain.recs.push({ inp: Array.from(t.inp), act: t.act, mv: t.mv });
        if (brain.recs.length > KEEP) brain.recs = brain.recs.slice(-KEEP);
    }
}

/** a save she made or failed, for the "aim at her weak one" read */
export function noteSave(brain, which, made) {
    if (!brain) return;
    const k = String(which || "").toLowerCase();
    if (!/^(fort|ref|will)$/.test(k)) return;
    (made ? brain.profile.savesMade : brain.profile.savesFailed)[k]++;
}

/** what put her down */
export function noteDefeat(brain, byName) {
    if (!brain || !byName) return;
    brain.profile.beatenBy[byName] = (brain.profile.beatenBy[byName] || 0) + 1;
}

export function noteFight(brain) { if (brain) brain.profile.fights++; }

/* ---------------------------------------------------------------- reading */

/**
 * THE FILE, IN SENTENCES. The sandbox's readout, which is the part that makes
 * this worth having: counters nobody can read are a spreadsheet, and the
 * point is that a person -- and later a drafting table -- can act on it.
 * Each line carries a `tag`, which is the doctrine it argues for.
 */
export function readout(brain) {
    const P = brain && brain.profile;
    if (!P) return [{ t: "The file is empty", s: "Nothing recorded yet." }];
    const tot = P.turns;
    /* NO TURNS IS NOT AN EMPTY FILE. noteSave and noteDefeat are deliberately
       independent of a turn -- a Reflex save against a blast is rolled on
       somebody else's turn, which is exactly when it matters -- so a dossier
       can hold real evidence before its subject has ever acted. The old gate
       tested P.turns alone and reported such a file as empty, hiding the two
       reads a drafting table wants most: the weak save, and what beats her.
       The turn-derived lines below are the ones that need a denominator, so
       they are what is gated, and pct() can no longer divide by zero. */
    const pct = (n) => (tot ? Math.round((100 * n) / tot) : 0);
    const out = [];

    if (tot) {
    const favIdx = P.acts.indexOf(Math.max.apply(null, P.acts));
    out.push({ t: "{P} habit", s: `{S} ${ACTS[favIdx]} on ${pct(P.acts[favIdx])}% of turns, `
        + `across ${tot} recorded turns${P.fights ? ` in ${P.fights} fights` : ""}.` });

    const stand = P.distN ? P.distSum / P.distN : 0;
    const swing = P.atkDistN ? P.atkDistSum / P.atkDistN : stand;
    if (swing < 12) out.push({ t: "{S} {fights} close",
        s: `{S} {swings} from ${Math.round(swing)} ft on average.`, tag: "kite" });
    else if (swing > 30) out.push({ t: "{S} {fights} long",
        s: `{S} {attacks} from ${Math.round(swing)} ft and keeps the gap.`, tag: "pressure" });
    else out.push({ t: "{S} {fights} the middle",
        s: `{S} {attacks} from about ${Math.round(swing)} ft.` });

    /* the slow closer, the sandbox's best single read */
    if (P.atkDistN && P.distN && stand - swing > 12)
        out.push({ t: "{S} {is} slow", s: `{S} {starts} {p} turns ${Math.round(stand)} ft out `
            + `but only lands blows at ${Math.round(swing)} ft. Every step of that gap is a free round `
            + `for anything that shoots.`, tag: "kite" });

    const closeRate = pct(P.mv[0]), backRate = pct(P.mv[2]);
    if (backRate > 25) out.push({ t: "{S} {gives} ground",
        s: `{S} {opens} the distance on ${backRate}% of turns.`, tag: "pressure" });
    if (closeRate > 55) out.push({ t: "{S} {walks} in",
        s: `{S} {closes} on ${closeRate}% of turns. Standing still and swinging at what arrives is free damage.`,
        tag: "bait" });

    if (P.coverTurns / tot < 0.12) out.push({ t: "{S} {ignores} cover",
        s: `Behind something solid on ${pct(P.coverTurns)}% of turns. Expect archers.`, tag: "cover" });
    else if (P.coverTurns / tot > 0.4) out.push({ t: "{S} {uses} the stones",
        s: `Cover on ${pct(P.coverTurns)}% of turns. It will flank around them.`, tag: "flank" });

    if (P.flankedTurns / tot > 0.25) out.push({ t: "{S} {gives} up {p} back",
        s: `Flanked on ${pct(P.flankedTurns)}% of turns.`, tag: "flank" });

    const topWeapon = Object.keys(P.weapons).sort((a, b) => P.weapons[b] - P.weapons[a])[0];
    if (topWeapon) out.push({ t: "{P} hand",
        s: `${topWeapon} on ${Math.round(100 * P.weapons[topWeapon] / Math.max(1, Object.values(P.weapons).reduce((a, x) => a + x, 0)))}% of {p} swings.` });

    const topSpell = Object.keys(P.spells).sort((a, b) => P.spells[b] - P.spells[a])[0];
    if (topSpell && P.spells[topSpell] >= 2) out.push({ t: "{P} opener",
        s: `${topSpell}, ${P.spells[topSpell]} times.`, tag: "disable" });

    if (P.hpWhenRetreat.length >= 2) {
        const m = P.hpWhenRetreat.reduce((a, x) => a + x, 0) / P.hpWhenRetreat.length;
        out.push({ t: "{P} panic line", s: `{S} {backs} off at about ${Math.round(m * 100)}% health. `
            + `It will try to burst through that window.`, tag: "alpha" });
    }
    }

    const worst = ["fort", "ref", "will"].sort((a, b) =>
        (P.savesFailed[b] / Math.max(1, P.savesFailed[b] + P.savesMade[b]))
      - (P.savesFailed[a] / Math.max(1, P.savesFailed[a] + P.savesMade[a])))[0];
    const wsTot = P.savesFailed[worst] + P.savesMade[worst];
    if (wsTot >= 3) out.push({ t: "{P} weak save",
        s: `${worst.toUpperCase()}: ${P.savesFailed[worst]} failed of ${wsTot}. Expect spells aimed there.`,
        tag: "disable" });

    const beaten = Object.keys(P.beatenBy).sort((a, b) => P.beatenBy[b] - P.beatenBy[a])[0];
    if (beaten) out.push({ t: "What beats {o}",
        s: `${beaten} has put {o} down ${P.beatenBy[beaten]} time(s).`, tag: "draft" });

    if (!out.length) return [{ t: "The file is empty", s: "Nothing recorded yet." }];
    /* the dossier is read in the subject's own pronouns (pronouns.js) */
    return out.map((r) => ({ ...r, t: pron(r.t), s: pron(r.s) }));
}

/** which doctrine the file argues for, by weight of evidence */
export function suggestedDoctrine(brain) {
    const counts = {};
    for (const r of readout(brain)) if (r.tag) counts[r.tag] = (counts[r.tag] || 0) + 1;
    let best = null, bv = 0;
    for (const k of Object.keys(counts)) if (counts[k] > bv) { bv = counts[k]; best = k; }
    return best;
}

/* ------------------------------------------------------------ persistence */

const fileOf = (name) => String(name || "she").trim().replace(/[^\w -]/g, "") + ".learn.json";

/** read her file off disc, or a blank one. Never throws: no server, no file,
    or a half-written one all mean "she is new", which is a fine answer. */
export async function loadBrain(name) {
    try {
        const r = await fetch("chars/" + encodeURIComponent(fileOf(name)) + "?t=" + Date.now(),
                              { cache: "no-store" });
        if (!r.ok) return blankBrain();
        const j = await r.json();
        if (!j || !j.profile) return blankBrain();
        /* a file from an older shape is not thrown away: the counters it does
           carry are still true, and the ones it lacks start at zero */
        return { profile: Object.assign(blankProfile(), j.profile),
                 recs: Array.isArray(j.recs) ? j.recs.slice(-KEEP) : [],
                 lastAct: j.lastAct == null ? -1 : j.lastAct };
    } catch (e) { return blankBrain(); }
}

/**
 * THE SAME WRITE, BUT IT SURVIVES THE TAB CLOSING (Rose 09-13: "this will make
 * the enemies more potent if the player tries to be slick and close mid boss
 * fight or enemy fight the learning system keeps the data").
 *
 * A fetch begun as the page goes away is cancelled with it, so the ordinary
 * saveBrain below is exactly the wrong tool for the one moment that matters
 * most -- somebody shutting the window rather than take a loss. sendBeacon is
 * handed to the browser and sent whether this page lives or not.
 *
 * Fire-and-forget by nature: it returns whether the browser ACCEPTED it, never
 * whether it landed, and there is no page left to tell if it did not.
 */
import { sessionFor } from "../owner.js";

export function beaconBrain(name, brain) {
    if (!brain || typeof navigator === "undefined" || !navigator.sendBeacon) return false;
    try {
        const body = JSON.stringify({ folder: "chars", file: fileOf(name),
                                      text: JSON.stringify(brain), session: sessionFor() });
        return navigator.sendBeacon("/api/sheet/save",
            new Blob([body], { type: "application/json" }));
    } catch (e) { return false; }
}

/** write it back beside her character record */
export async function saveBrain(name, brain) {
    if (!brain) return { ok: false, why: "no brain" };
    const body = JSON.stringify({ folder: "chars", file: fileOf(name),
                                  text: JSON.stringify(brain), session: sessionFor() });
    try {
        const r = await fetch("/api/sheet/save",
            { method: "POST", headers: { "content-type": "application/json" }, body });
        const j = await r.json().catch(() => null);
        return j && j.ok ? { ok: true } : { ok: false, why: (j && j.error) || "no server" };
    } catch (e) { return { ok: false, why: String(e && e.message || e) }; }
}
