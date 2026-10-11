/* WEAPON SIZE: the SRD's own step table, and nothing invented.
 *
 * Sources, fetched 2026-09-16 from d20srd.org (v3.5):
 *   srd/improvingMonsters.htm, "Table: Increased Damage By Size":
 *     1d2 -> 1d3, 1d3 -> 1d4, 1d4 -> 1d6, 1d6 -> 1d8, 1d8 -> 2d6,
 *     1d10 -> 2d8, 2d6 -> 3d6, 2d8 -> 3d8, and "Repeat the adjustment if the
 *     creature moves up more than one size category."
 *   srd/equipment/weapons.htm, "Table: Larger and Smaller Weapon Damage",
 *     the example rows that fill the dice the first table skips:
 *     Shuriken 1 -> 1d2, Greataxe 1d12 -> 3d6, Falchion 2d4 -> 2d6 (Medium
 *     to Large), and past Large the same rows run Greatsword 3d6 -> 4d6 ->
 *     6d6 -> 8d6 and Bastard Sword 3d8 -> 4d8 -> 6d8.
 *
 * WHO STEPS. Giant Grip, the bloodline feat ("You are able to wield weapons
 * meant for larger races easily"), which Rose modelled on Monkey Grip
 * (Complete Warrior, 09-16: "this is what its based on"): the character's
 * melee weapons are one size larger than the catalogue's, the die goes up
 * one step, the attack roll pays -2, and the effort (light, one-handed,
 * two-handed) does not change. Rose's own reading of the day Enlarge
 * Person arrives: "instead of the character wielding a large weapon when
 * grown it will wield a colossal weapon because its weapon will already
 * be large", which is exactly what sizeUp(die, 2) returns. The -2 is
 * Monkey Grip's and not in Rose's text, so it is the one number here he
 * may strike.
 *
 * The roster bakes the stepped die into the move; the gear screen's
 * tooltip still names the catalogue item, which IS a Medium dagger, and
 * the sheet's attack line reads the move, so the two disagree on purpose. */
export const SIZE_UP = {
    "1": "1d2", "1d2": "1d3", "1d3": "1d4", "1d4": "1d6", "1d6": "1d8",
    "1d8": "2d6", "1d10": "2d8", "1d12": "3d6", "2d4": "2d6", "2d6": "3d6",
    "2d8": "3d8", "3d6": "4d6", "3d8": "4d8", "4d6": "6d6", "4d8": "6d8",
    "6d6": "8d6",
};

/** the same table read backwards: one size category down */
export const SIZE_DOWN = Object.fromEntries(
    Object.entries(SIZE_UP).map(([small, big]) => [big, small]));

/** The die `steps` size categories up, or DOWN for a negative count; a die the
    table does not know, or zero steps, comes back as it went in. Only the die
    itself: a "+3" is the wielder's Strength, folded on afterwards by whoever
    holds it. */
export function sizeUp(die, steps = 1) {
    let d = String(die == null ? "" : die).trim().toLowerCase();
    const n = steps | 0, table = n < 0 ? SIZE_DOWN : SIZE_UP;
    for (let i = 0; i < Math.abs(n); i++) {
        const next = table[d];
        if (!next) break;
        d = next;
    }
    return d;
}

/*,,. A WEAPON IS A UNIQUE THING, AND ITS SIZE IS A CHOICE (Rose 2026-09-17) ,,,
   "weapons are unique you have the option to increase or decrease their size which increase or decreases reach,
   damage, and value", and "monkey grip can wield large weapons".
   Everything below is the SRD's own arithmetic, read off d20srd.org/srd/equipment/weapons.htm on 2026-09-17:
     cost   -- "the same for a Small or Medium version... A Large version costs twice the listed price"
     weight -- "Halve this number for Small weapons and double it for Large weapons"
     to hit -- "a cumulative -2 penalty... for each size category of difference"
     effort -- shifts one step per category, and past two-handed "the creature can't wield the weapon at all"
   REACH is his, not the book's: the SRD gives reach to the weapon's own design rather than its size, so a longer
   haft is a house rule and is marked as one where it is spent. */
export const WEAPON_SIZES = ["Small", "Medium", "Large"];
const STEP = { small: -1, medium: 0, large: 1 };

/** how many size categories this weapon is from the Medium row */
export const sizeStep = (size) => STEP[String(size || "Medium").toLowerCase()] || 0;

/** the price of one size, from the Medium price: Large doubles, Small is the same (SRD); kept to the copper (a dart's
    5 sp, a pouch of sling bullets' 1 sp), never rounded to whole gold */
export const costAt = (gp, size) => Math.round((+gp || 0) * (sizeStep(size) > 0 ? 2 : 1) * 100) / 100;

/** the weight of one size, from the Medium weight: Large doubles, Small halves (SRD) */
export const weightAt = (lb, size) => {
    const n = +lb || 0, s = sizeStep(size);
    return s > 0 ? n * 2 : s < 0 ? n / 2 : n;
};

/** the die of one size, from the Medium die (the step table above) */
export const dieAt = (die, size) => sizeUp(die, sizeStep(size));

/** the attack penalty a Medium body pays for a weapon of this size: -2 a category (SRD) */
export const sizePenalty = (size) => -2 * Math.abs(sizeStep(size));

/** CAN THIS BODY HOLD IT AT ALL? A two-handed weapon one size up would need a third hand, so the book refuses it --
    and Giant Grip (Monkey Grip) is the feat that says otherwise (Rose 09-17: "monkey grip can wield large weapons"). */
export const canWield = (size, twoHanded, giantGrip) =>
    sizeStep(size) <= 0 || !twoHanded || !!giantGrip;
