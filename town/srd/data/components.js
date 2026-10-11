/* ============================================================================
   SPELL COMPONENTS: what a sentence asks for besides its words, and the
   pouches that stand in for the SRD's thousand materials.

   Rose, 2026-09-26, asking "do you have spell components as a thing?" They were
   not: no sentence said whether it had a gesture, so the failure chance armour
   prints on the Gear tab was never rolled, and nothing asked for a material.
   His ruling on the materials, the same hour:

     "We don't need all the random crap the srd has takes too much time so we'll
      just isolate the components into bags. 'Level 1 Enchantment component
      bag', etc. But don't name it that just like name it something that fits
      and have what it is in the description. Then give it 'uses'. By giving it
      a use amount we keep the shape of it without needing seven billion
      materials."

   THE LETTERS ARE THE BOOK'S, read off every sentence's own page at d20srd.org
   on 2026-09-26 (the spell index, one page each). Three pages print no line of
   their own and say "This spell functions like" another, so theirs is the
   parent's: Summon Monster II (Summon Monster I), Cure Minor Wounds (Cure Light
   Wounds), Inflict Minor Wounds (Inflict Light Wounds). Cure Wounds is the SRD's
   Cure Light Wounds, by its levels. Misty Step is not a 3.5 spell; its line is
   the 5e SRD's (dnd5eapi.co, the same day): "V".

   WHAT EACH LETTER DOES HERE (SRD, Spell Descriptions, read the same day):
     V   "a spoken incantation": the Verse already is one, so nothing new
     S   "a measured and precise movement of the hand": the gesture armour can
         ruin, arcane spell failure below
     M   "physical substances or objects that are annihilated by the spell
         energies in the casting process": one use of the matching pouch
     F   "Unlike a material component, a focus is not consumed when the spell is
         cast and can be reused": the matching pouch must be carried, and no use
         goes
     DF  "an item of spiritual significance ... a holy symbol": free, on Rose's
         "we don't need all the random crap" (the shop sells holy symbols if he
         ever wants one asked for)
     M/DF, F/DF  "the arcane version of the spell has a focus component or a
         material component (the abbreviation before the slash) and the divine
         version has a divine focus component (the abbreviation after the slash)"
   ========================================================================== */

/** the eight schools, as the SRD lists them (Sorcerers & Wizards, School Specialization) */
export const SCHOOLS = ["Abjuration", "Conjuration", "Divination", "Enchantment",
                        "Evocation", "Illusion", "Necromancy", "Transmutation"];

/** a sentence's school without its subschool or descriptors: "Conjuration (Healing)" is Conjuration */
export const schoolOf = (entry) => {
    const word = String((entry && entry.school) || "").trim().split(/[\s([]/)[0];
    return SCHOOLS.includes(word) ? word : null;
};

/** every castable sentence's Components line, keyed by its verse key, as the book prints it */
export const COMPONENTS = {
    magicmissile: "V, S",        ray: "V, S",                 summon: "V, S, F/DF",
    cureminor: "V, S",           cure: "V, S",                light: "V, M/DF",
    featherfall: "V",            mistystep: "V",              fogcloud: "V, S",
    silence: "V, S",             darkness: "V, M/DF",         blink: "V, S",
    dimensiondoor: "V",          teleport: "V",               endure: "V, S",
    mist: "V, S",                gust: "V, S",                resistcold: "V, S, DF",
    sleet: "V, S, M/DF",         calllightning: "V, S",       icestorm: "V, S, M/DF",
    controlweather: "V, S",      dispelmagic: "V, S",         acidsplash: "V, S",
    rayoffrost: "V, S",          disruptundead: "V, S",       touchoffatigue: "V, S, M",
    flare: "V",                  dancinglights: "V, S",       inflictminor: "V, S",
    daze: "V, S, M",             resistance: "V, S, M/DF",    guidance: "V, S",
    virtue: "V, S, DF",          burninghands: "V, S",        shockinggrasp: "V, S",
    chilltouch: "V, S",          inflictlight: "V, S",        produceflame: "V, S",
    sleep: "V, S, M",            laughter: "V, S, M",         truestrike: "V, F",
    shield: "V, S",              magearmor: "V, S, F",        expeditious: "V, S",
    jump: "V, S, M",             magicweapon: "V, S, DF",     protevil: "V, S, M/DF",
    summonmonster1: "V, S, F/DF", summonnature1: "V, S, DF",  bless: "V, S, DF",
    bane: "V, S, DF",            divinefavor: "V, S, DF",     shieldoffaith: "V, S, M",
    doom: "V, S, DF",            faeriefire: "V, S, DF",      longstrider: "V, S, M",
    magicfang: "V, S, DF",       entangle: "V, S, DF",        holdperson: "V, S, F/DF",
    ragespell: "V, S",
};

/*,,. WHICH CLASSES CAST ARCANE SPELLS ,,,
   SRD, Magic Overview: "Wizards, sorcerers, and bards cast arcane spells", and "Clerics, druids, experienced
   paladins, and experienced rangers can cast divine spells." The kind belongs to the CLASS a sentence is cast
   through, never to the body: a Cleric/Wizard's cure is divine and her magic missile arcane, which is also the
   bard's own rule ("A multiclass bard still incurs the normal arcane spell failure chance for arcane spells
   received from other classes").
   THE SAVANT IS NEITHER, BECAUSE IT IS EVERY CLASS (Rose 2026-09-26: "Savant isnt an arcane caster... its a
   super novice perma level 1 character. It is -all- classes"; "If it uses a class that uses material it needs
   material if it doesnt it doesnt"). Its cast is ruled by the class it casts that sentence AS, which
   battle/verse.js castingClassFor reads off its book, and every caller hands that class in here. */
export const ARCANE_CLASSES = ["Wizard", "Sorcerer", "Bard"];
export const isArcane = (path) => ARCANE_CLASSES.includes(String(path || ""));

/**
 * What this sentence asks of a caster, read off its line. `divine` picks the half after a slash.
 * A sentence with no line (one minted after 2026-09-26 and not yet read) is taken to have a gesture,
 * the SRD's own "most do", and nothing else; tests/test_components.mjs holds every row to having a line.
 */
export function needsOf(key, divine) {
    const line = COMPONENTS[key];
    const out = { listed: !!line, verbal: false, somatic: !line, material: false, focus: false, divineFocus: false };
    if (!line) return out;
    for (const raw of line.split(",")) {
        const [before, after] = raw.trim().split("/");
        const t = after ? (divine ? after : before) : before;
        if (t === "V") out.verbal = true;
        else if (t === "S") out.somatic = true;
        else if (t === "M") out.material = true;
        else if (t === "F") out.focus = true;
        else if (t === "DF") out.divineFocus = true;
    }
    return out;
}

/* ============================================================================
   THE POUCHES
   ========================================================================== */

/*,,. ONE POUCH PER SCHOOL AND SPELL LEVEL, NAMED FOR THE WORLD, DESCRIBED FOR THE PLAYER ,,,
   His words: "don't name it that just like name it something that fits and have what it is in the
   description". So the NAME is a trade's (a warder carries abjuration's, a charmer enchantment's) with the
   level as a numeral, the way the creation pages number themselves; a cantrip's is a Pinch, because a cantrip
   wants a pinch of something. The NOTE the shop prints under it says plainly what it is for.
   MY PICKS, said so they can be changed in one place: ten uses (the healer's kit's, the book's other counted
   pouch), half a pound (the SRD's belt pouch), and 1 gp for a pinch then 5 gp a spell level, the SRD's own
   component pouch price for the first level. */
const EPITHET = {
    Abjuration: "Warder's", Conjuration: "Summoner's", Divination: "Seer's", Enchantment: "Charmer's",
    Evocation: "Evoker's", Illusion: "Veilmaker's", Necromancy: "Gravewright's", Transmutation: "Shaper's",
};
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
export const BAG_USES = 10;
export const BAG_LB = 0.5;
export const bagPrice = (level) => (level <= 0 ? 1 : 5 * level);

/** the pouch for one school and one spell level */
export const bagName = (school, level) =>
    (level <= 0 ? EPITHET[school] + " Pinch" : EPITHET[school] + " Pouch " + ROMAN[level]);

/** what the shop prints under it: what it is, in so many words */
const bagNote = (school, level) =>
    "components for " + (level <= 0 ? school.toLowerCase() + " cantrips"
                                    : ORDINAL[level] + "-level " + school.toLowerCase() + " spells")
    + ", ten uses";

/** the whole catalogue, lowest level first so a new caster finds hers at the top of the shelf */
export const COMPONENT_BAGS = (() => {
    const out = {};
    for (let level = 0; level <= 9; level++)
        for (const school of SCHOOLS)
            out[bagName(school, level)] = { price: bagPrice(level), lb: BAG_LB, uses: BAG_USES,
                                            school, spellLevel: level, note: bagNote(school, level) };
    return out;
})();

/** the catalogue row for a pouch's name, or null */
export const bagOf = (name) => COMPONENT_BAGS[name] || null;

/** how many uses a pouch has left; one that has never been opened is full */
export const bagLeft = (bag) => (!bag ? 0 : (bag.uses == null ? BAG_USES : Math.max(0, +bag.uses || 0)));

/** the first pouch in a pack for this school and level that still has a use, or null */
export function bagIn(satchel, school, level) {
    if (!school || level == null) return null;
    const want = bagName(school, level);
    for (const it of (Array.isArray(satchel) ? satchel : [])) {
        if (it && it.name === want && bagLeft(it) > 0) return it;
    }
    return null;
}

/** spend one use; returns what is left. An empty pouch stays in the pack, the way a spent kit does. */
export function spendBag(bag) {
    if (!bag) return 0;
    bag.uses = Math.max(0, bagLeft(bag) - 1);
    return bag.uses;
}

/* the feat's name without its bracketed choice, the way verse.js reads Silent Spell */
const baseNameOf = (t) => String(t).replace(/ \([^)]*\)$/, "");

/**
 * WHAT A CAST NEEDS FROM THE PACK, AND WHETHER THE PACK HAS IT. The one question both roads ask before a
 * slot is touched (world/casting.js speak, battle/battle.js armAction), so a refusal costs nothing, the
 * Verse's own law ("A refused verse costs NOTHING").
 *
 * A BODY WITH NO PACK IS NOT ASKED. Every NPC the world stands, and every bench fighter, carries no satchel,
 * and a pouch rule applied to them would silence every enemy caster in the game. A body with a pack, the
 * player and a seat, is asked. That is the line the healer's kit draws as well.
 *
 * ESCHEW MATERIALS (SRD: "You can cast any spell that has a material component costing 1 gp or less without
 * needing that component") covers the material and never the focus, as the feat's own text reads.
 *
 * @param o { key, school, level, path, satchel, feats }
 * @returns { ok, why, bag, spends, need }: `bag` is the pouch to spend from once the spell goes off,
 *          `spends` whether a use goes (a material; a focus is kept)
 */
export function componentsFor(o) {
    const need = needsOf(o && o.key, !isArcane(o && o.path));
    const eschew = ((o && o.feats) || []).some((f) => baseNameOf(f) === "Eschew Materials");
    const material = need.material && !eschew;
    if (!material && !need.focus) return { ok: true, bag: null, spends: false, need };
    if (!o || !Array.isArray(o.satchel)) return { ok: true, bag: null, spends: false, need, unasked: true };
    const bag = bagIn(o.satchel, o.school, o.level);
    if (!bag) {
        const name = bagName(o.school, o.level);
        return { ok: false, bag: null, spends: false, need,
                 why: "wants " + (/^[AEIOU]/i.test(name) ? "an " : "a ") + name + (need.focus && !material ? " to hand" : "") };
    }
    return { ok: true, bag, spends: material, need };
}

/* ============================================================================
   ARCANE SPELL FAILURE
   ========================================================================== */

/**
 * THE CHANCE ARMOUR RUINS THIS CAST, in percent; 0 when it cannot. SRD, read 2026-09-26:
 *   Armor: "A character who casts an arcane spell while wearing armor must usually make an arcane spell failure
 *     roll. The number in the Arcane Spell Failure Chance column ... is the chance that the spell fails and is
 *     ruined. If the spell lacks a somatic component, however, it can be cast with no chance of arcane spell
 *     failure." Shields add to it ("add the two numbers together"); this game sells none yet.
 *   Bard: "A bard can cast bard spells while wearing light armor without incurring the normal arcane spell
 *     failure chance. However, like any other arcane spellcaster, a bard wearing medium or heavy armor or using
 *     a shield incurs a chance of arcane spell failure... A multiclass bard still incurs the normal arcane spell
 *     failure chance for arcane spells received from other classes."
 *   Casting Spells: "Spells also fail ... if you're wearing armor while casting a spell with somatic
 *     components" and "the casting fails and the spell is wasted": the slot goes with it.
 * Still Spell would lift the gesture and is not yet a thing a caster can choose (featEffects: scaffold).
 * @param o { key, path, armor }: `armor` is the worn armour block (`class`, `spellFailure`) or null
 */
export function failureChance(o) {
    if (!o || !isArcane(o.path)) return 0;
    const armor = o.armor || null;
    const pct = armor ? Math.max(0, Math.floor(+armor.spellFailure || 0)) : 0;
    if (!pct) return 0;
    if (!needsOf(o.key, false).somatic) return 0;
    if (o.path === "Bard" && armor.class === "light") return 0;
    return pct;
}

/** the d% roll against a chance: true when the spell is ruined. `roll` may be handed in (1-100) so a test
    can hold it still; otherwise it is thrown here. */
export const ruinedByArmor = (chance, roll) =>
    chance > 0 && (roll != null ? roll : 1 + Math.floor(Math.random() * 100)) <= chance;
