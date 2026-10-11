/**
 * TRAITS AND FLAWS: two opposite trades, each capped at two.
 *
 * THE EFFECT LINE IS GENERATED, NEVER AUTHORED. Every row prints its mechanics
 * from the numbers below, so a rule and its description cannot drift apart. The
 * original writes some of these by hand and it already shows: its Honeyed line
 * reads "+2 Diplo", the internal short name, on a page that shows the player
 * full skill names everywhere else. Here the label IS the printed label.
 *
 * A FLAW IS A DEBT, not a discount. Each one raises the feat budget on the Feats
 * page, and that page refuses to be left until the extra feats are spent. The
 * original says a flaw "buys a bonus feat" and never mentions the bill again
 * until it arrives, `DEBT_WARNING` exists so this one does.
 */

/** The true minus sign, U+2212, not a hyphen. Effect lines are numbers. */
const MINUS = "−";

const signed = (n) => (n < 0 ? MINUS : "+") + Math.abs(n);

/**
 * One printed effect line. `effects` are `[amount, label]` pairs; `prose` is for
 * the one entry whose consequence is not a number. Flaws append their bounty
 * last, because it is the compensation and reads as the end of the trade.
 */
export function effectLine(entry, isFlaw) {
    const parts = entry.prose
        ? [entry.prose]
        : entry.effects.map(([n, label]) => `${signed(n)} ${label}`);
    if (isFlaw) parts.push("+1 bonus feat");
    return parts.join(" · ");
}

export const TRAITS = {
    "Restless": {
        flavour: "Poised to move: fast to act, loose on defense.",
        effects: [[2, "Initiative"], [-1, "Armor Class"]],
    },
    "Ironhide": {
        flavour: "You endure what fells others, but turn aside slowly.",
        effects: [[1, "Fortitude saves"], [-1, "Reflex saves"]],
    },
    "Fleet": {
        flavour: "Quick to dodge, but you can't soak a blow.",
        effects: [[1, "Reflex saves"], [-1, "Fortitude saves"]],
    },
    "Devout": {
        flavour: "Iron will over frail flesh.",
        effects: [[1, "Will saves"], [-1, "Fortitude saves"]],
    },
    "Moontouched": {
        flavour: "The moon sharpens your hand by night and dulls it by day.",
        effects: [[1, "attack at night"], [-1, "attack by day"]],
    },
    "Honeyed": {
        /* Full skill names on purpose, the original prints "Diplo" here. */
        flavour: "Charm comes easily; menace does not.",
        effects: [[2, "Diplomacy"], [2, "Bluff"], [-2, "Intimidate"]],
    },
};

export const FLAWS = {
    "Feral": {
        flavour: "You cannot speak, read, or understand any language.",
        prose: "no languages at all, you cannot speak, read or understand any",
        /* Reaches further than any other answer in the walk: it locks the
           Speak Language skill, removes it as a Skill Focus target, closes the
           Verse, and strips the tongue lists from the Faith page.
           THE VERSE CLOSURE IS THE ONE THAT CAN BE BOUGHT BACK (2026-08-12):
           SRD Silent Spell casts with no verbal components, so a Feral caster
           who takes it on page X walks page XI with the whole lexicon open.
           The other three stand, it buys a way to cast, never a tongue. */
        silences: true,
    },
    "Frail":        { flavour: "-3 on Fortitude saves.", effects: [[-3, "Fortitude saves"]] },
    "Clumsy":       { flavour: "-3 on Reflex saves.",    effects: [[-3, "Reflex saves"]] },
    "Dim":          { flavour: "-3 on Will saves.",      effects: [[-3, "Will saves"]] },
    "Palsied":      { flavour: "-3 on melee attack rolls.",  effects: [[-3, "melee attack"]] },
    "Unsteady":     { flavour: "-3 on ranged attack rolls.", effects: [[-3, "ranged attack"]] },
    "Vulnerable":   { flavour: "-2 to Armor Class.",     effects: [[-2, "Armor Class"]] },
    "Oblivious":    { flavour: "-4 on Spot and Listen.", effects: [[-4, "Spot"], [-4, "Listen"]] },
    "Graceless":    { flavour: "-4 on every Dexterity skill.",    effects: [[-4, "to every Dexterity skill"]] },
    "Witless":      { flavour: "-4 on every Intelligence skill.", effects: [[-4, "to every Intelligence skill"]] },
    "Off-Putting":  { flavour: "-4 on every Charisma skill.",     effects: [[-4, "to every Charisma skill"]] },
    "Distractible": { flavour: "-4 on Concentration.",   effects: [[-4, "Concentration"]] },
};

export const CAP = 2;

/** The stat-wide labels ("-4 on every Dexterity skill"), summed for
    one ability across a body's traits AND flaws. One reader for every
    door that rolls a skill of that stat -- the sneak contests and the
    lock take Dexterity's, the feint takes Charisma's -- so the label
    and its landings cannot drift (level-1 sweep, 08-20: these sat
    "awaiting the skill readout" while Hide, Move Silently, Open Lock
    and Bluff were already rolling). */
export function statWideMod(traits, flaws, ability) {
    const label = "to every " + ability + " skill";
    let n = 0;
    const sum = (table, names) => {
        for (const name of (names || [])) {
            const entry = table[name];
            if (!entry || !entry.effects) continue;
            for (const [amt, lbl] of entry.effects)
                if (lbl === label) n += amt;
        }
    };
    sum(TRAITS, traits);
    sum(FLAWS, flaws);
    return n;
}

/** A NAMED label ("Spot", "Diplomacy", "Fortitude saves"), summed across a body's traits AND flaws: the other half of
    what a trait or flaw does to a skill, beside statWideMod's "to every X skill". Her world roller has asked this
    since 08-20 (void.js herTraitMod); a body's world skills asked neither half until 2026-09-29 (the traits and
    flaws audit), so Honeyed, Oblivious, Graceless, Witless and Off-Putting did nothing for a seat on the grass. */
export function traitMod(traits, flaws, label) {
    let n = 0;
    const sum = (table, names) => {
        for (const name of (names || [])) {
            const entry = table[name];
            if (!entry || !entry.effects) continue;
            for (const [amt, lbl] of entry.effects)
                if (lbl === label) n += amt;
        }
    };
    sum(TRAITS, traits);
    sum(FLAWS, flaws);
    return n;
}

/** How many extra feats the Feats page will demand. One per flaw taken. */
export const bonusFeatsOwed = (flaws) => (flaws || []).length;

/** True when the character has no tongue at all, four later pages read this. */
export const isSilenced = (flaws) => (flaws || []).some(f => FLAWS[f] && FLAWS[f].silences);

export const DEBT_WARNING =
    "A flaw is a debt: the Feats page will not let you leave until its feat is spent.";
