/* THE PRE-CAMPAIGN CATALOGUE (her order, 2026-09-02: "We'll probably
   also need other things pre campaign You know like rope, camp, mount
   etc etc", then "read up..." on the SRD's own Goods and Services page).
   Pure data. No page consumes it yet: the provisioning step is hers to
   call, and the purse (heritage.js spentOf) will charge these the same
   way it charges the wardrobe when that page lands.

   SOURCE: d20srd.org Goods and Services, read in full 2026-09-02. The
   game rules on Pathfinder by her ruling, and PF inherited these prices
   essentially unchanged; where the two differ the 3.5 line is kept and
   the difference is noted at the entry, because THIS is the table the
   numbers were read from and a half-remembered blend is how a catalogue
   rots.

   MONEY IS GP, always: a silver is 0.1, a copper is 0.01. One unit for
   every price in the game means no conversion can be forgotten at a
   till. `lb` is the SRD's carry weight where the table gives one; "—"
   in the table means negligible, recorded here as 0. */

/* ---- adventuring gear ------------------------------------------- */
import { WEAPON_GP, WEAPON_LB } from "./weapons.js";
/* the weapon table's own rows, to tell a pack of ammunition from a weapon (E8b), and the shop's words by name */
import { WEAPON_TABLE } from "./weaponTable.js";
import { textOf } from "../config/text.js";
import { OUTFIT_TOPS, OUTFIT_BOTTOMS, OUTFIT_SHOES, OUTFIT_HANDS, OUTFIT_CLOAKS, OUTFIT_HELMETS } from "./heritage.js";
import { clothLbOf } from "./carry.js";
/* the component pouches, one per school and spell level (Rose 2026-09-26) */
import { COMPONENT_BAGS } from "./components.js";
/* the cure potions, the SRD's own three (the overnight run, 2026-09-27: data/potions.js) */
import { POTION_STOCK } from "./potions.js";
/* which mounts have a body in the world, for the Mounts shelf (stage C) */
import { hasBody } from "./mounts.js";
/* THE WEAPON RACK (Rose 09-17: "Weapon shop in the character creation"):
   every weapon the game can put in a hand, at the coin and pounds
   weapons.js already keeps; bare hands are not for sale. A bought weapon is
   a pack row of kind "weapon" (basket.js) and the Gear tab's Wield knows it. */
/*,,. AMMUNITION ON A SHELF OF ITS OWN (E8b, Vera 2026-10-02; Desktop/V/e8b-table.md, sadia's check) ,,,
   A sold kind whose `use` is "ammunition" is bought by the pack (data/weaponTable.js `pack`; the SRD's weapons page,
   read in Chrome that night: bolts "come in a wooden case that holds 10 bolts") and never put in a hand, so it leaves
   the rack for the Ammunition shelf, at its pack's coin and pounds, saying how it comes. basket.js packs each as one
   record of its shots. */
const isAmmoKind = (n) => !!(WEAPON_TABLE[n] && WEAPON_TABLE[n].use === "ammunition");
export const WEAPONRY = Object.fromEntries(Object.keys(WEAPON_GP)
    .filter((n) => n !== "Unarmed" && !isAmmoKind(n))
    .map((n) => [n, { price: WEAPON_GP[n], lb: WEAPON_LB[n] || 0 }]));
/** how a pack comes, in the shop's words, by its `ammo` (the SRD's weapons page: arrows "come in a leather quiver that
    holds 20", bolts "come in a wooden case that holds 10 bolts", bullets "come in a leather pouch that holds 10
    bullets"; the quiver and the pouch since E8c, 2026-10-03); each key a literal, as test_textTable reads them */
const ammoNote = (k) => (k.ammo === "arrows" ? textOf("$lohTXAmmoQuiver", { n: k.pack })
    : k.ammo === "bolts" ? textOf("$lohTXAmmoCase", { n: k.pack })
    : k.ammo === "bullets" ? textOf("$lohTXAmmoPouch", { n: k.pack }) : null);
export const AMMUNITION = Object.fromEntries(Object.keys(WEAPON_GP)
    .filter(isAmmoKind)
    .map((n) => [n, { price: WEAPON_GP[n], lb: WEAPON_LB[n] || 0, pack: WEAPON_TABLE[n].pack, note: ammoNote(WEAPON_TABLE[n]) }]));
export const GEAR = {
    "Backpack":              { price: 2,    lb: 2 },
    "Barrel":                { price: 2,    lb: 30 },
    "Basket":                { price: 0.4,  lb: 1 },
    "Bedroll":               { price: 0.1,  lb: 5 },
    "Bell":                  { price: 1,    lb: 0 },
    "Blanket, winter":       { price: 0.5,  lb: 3 },
    "Block and tackle":      { price: 5,    lb: 5 },
    "Bottle, wine, glass":   { price: 2,    lb: 0 },
    "Bucket":                { price: 0.5,  lb: 2 },
    "Caltrops":              { price: 1,    lb: 2 },
    "Candle":                { price: 0.01, lb: 0 },
    "Canvas (sq. yd.)":      { price: 0.1,  lb: 1 },
    "Case, map or scroll":   { price: 1,    lb: 0.5 },
    "Chain (10 ft.)":        { price: 30,   lb: 2 },
    "Chalk":                 { price: 0.01, lb: 0 },
    "Chest":                 { price: 2,    lb: 25 },
    "Crowbar":               { price: 2,    lb: 5 },
    "Firewood (per day)":    { price: 0.01, lb: 20 },
    "Fishhook":              { price: 0.1,  lb: 0 },
    "Fishing net":           { price: 4,    lb: 5 },
    "Flask":                 { price: 0.03, lb: 1.5 },
    "Flint and steel":       { price: 1,    lb: 0 },
    "Grappling hook":        { price: 1,    lb: 4 },
    "Hammer":                { price: 0.5,  lb: 2 },
    "Ink (1 oz. vial)":      { price: 8,    lb: 0 },
    "Inkpen":                { price: 0.1,  lb: 0 },
    "Jug, clay":             { price: 0.03, lb: 9 },
    "Ladder, 10-foot":       { price: 0.05, lb: 20 },
    "Lamp, common":          { price: 0.1,  lb: 1 },
    "Lantern, bullseye":     { price: 12,   lb: 3 },
    "Lantern, hooded":       { price: 7,    lb: 2 },
    "Lock (very simple)":    { price: 20,   lb: 1 },
    "Lock (average)":        { price: 40,   lb: 1 },
    "Lock (good)":           { price: 80,   lb: 1 },
    "Lock (amazing)":        { price: 150,  lb: 1 },
    "Manacles":              { price: 15,   lb: 2 },
    "Manacles, masterwork":  { price: 50,   lb: 2 },
    "Mirror, small steel":   { price: 10,   lb: 0.5 },
    "Mug/Tankard, clay":     { price: 0.02, lb: 1 },
    "Oil (1-pint flask)":    { price: 0.1,  lb: 1 },
    "Paper (sheet)":         { price: 0.4,  lb: 0 },
    "Parchment (sheet)":     { price: 0.2,  lb: 0 },
    "Pick, miner's":         { price: 3,    lb: 10 },
    "Pitcher, clay":         { price: 0.02, lb: 5 },
    "Piton":                 { price: 0.1,  lb: 0.5 },
    "Pole, 10-foot":         { price: 0.2,  lb: 8 },
    "Pot, iron":             { price: 0.5,  lb: 10 },
    "Pouch, belt":           { price: 1,    lb: 0.5 },
    "Ram, portable":         { price: 10,   lb: 20 },
    "Rations, trail (per day)": { price: 0.5, lb: 1 },
    "Rope, hempen (50 ft.)": { price: 1,    lb: 10 },
    "Rope, silk (50 ft.)":   { price: 10,   lb: 5 },
    "Sack":                  { price: 0.1,  lb: 0.5 },
    "Sealing wax":           { price: 1,    lb: 1 },
    "Sewing needle":         { price: 0.5,  lb: 0 },
    "Signal whistle":        { price: 0.8,  lb: 0 },
    "Signet ring":           { price: 5,    lb: 0 },
    "Sledge":                { price: 1,    lb: 10 },
    "Soap (per lb.)":        { price: 0.5,  lb: 1 },
    "Spade or shovel":       { price: 2,    lb: 8 },
    "Spyglass":              { price: 1000, lb: 1 },
    /* the SRD lists ONE tent at 10 gp / 20 lb; Pathfinder splits it into
       small/medium/large (10/15/30). The single line is kept. */
    "Tent":                  { price: 10,   lb: 20 },
    "Torch":                 { price: 0.01, lb: 1 },
    "Vial, ink or potion":   { price: 1,    lb: 0.1 },
    "Waterskin":             { price: 1,    lb: 4 },
    "Whetstone":             { price: 0.02, lb: 1 },
};

/* ---- alchemy and one-use items ---------------------------------- */
export const SUBSTANCES = {
    "Acid (flask)":            { price: 10,  lb: 1 },
    "Alchemist's fire (flask)": { price: 20, lb: 1 },
    "Antitoxin (vial)":        { price: 50,  lb: 0 },
    "Everburning torch":       { price: 110, lb: 1 },
    "Holy water (flask)":      { price: 25,  lb: 1 },
    "Smokestick":              { price: 20,  lb: 0.5 },
    "Sunrod":                  { price: 2,   lb: 1 },
    "Tanglefoot bag":          { price: 50,  lb: 4 },
    "Thunderstone":            { price: 30,  lb: 1 },
    "Tindertwig":              { price: 1,   lb: 0 },
};

/* ---- tools and skill kits ---------------------------------------
   the ones carrying a +2 circumstance bonus say so, because a shop that
   sells a bonus should be able to name it when the skill gates land */
export const TOOLS = {
    "Alchemist's lab":            { price: 500, lb: 40, bonus: "Craft (alchemy) +2" },
    "Artisan's tools":            { price: 5,   lb: 5 },
    "Artisan's tools, masterwork": { price: 55, lb: 5, bonus: "Craft +2" },
    "Climber's kit":              { price: 80,  lb: 5, bonus: "Climb +2" },
    /* and the disguise kit's too (Rose 2026-09-28, the disguise system): data/disguise.js spends one a donning */
    "Disguise kit":               { price: 50,  lb: 8, bonus: "Disguise +2, ten uses", uses: 10 },
    /*,,. AND THE TEN USES ARE COUNTED NOW (Rose 2026-09-20, the Heal skill) ,,,
       `bonus` has said "ten uses" since this row was written and nothing counted one. `uses` is the
       number data/heal.js spends: a kit in the pack is worth +2 on every Heal check until it is
       empty, and the pack keeps the remainder the way a torch keeps its burn. */
    "Healer's kit":               { price: 50,  lb: 1, bonus: "Heal +2, ten uses", uses: 10 },
    "Holy symbol, wooden":        { price: 1,   lb: 0 },
    "Holy symbol, silver":        { price: 25,  lb: 1 },
    "Hourglass":                  { price: 25,  lb: 1 },
    "Magnifying glass":           { price: 100, lb: 0, bonus: "Appraise +2 on small items" },
    "Musical instrument":         { price: 5,   lb: 3 },
    "Musical instrument, masterwork": { price: 100, lb: 3, bonus: "Perform +2" },
    "Scale, merchant's":          { price: 2,   lb: 1, bonus: "Appraise +2 by weight" },
    /* the SRD's one Spell component pouch is gone (Rose 2026-09-26: "Remove the old, yes"): the Components
       shelf's pouches, one per school and spell level, are what a caster carries now (data/components.js) */
    "Spellbook, wizard's (blank)": { price: 15, lb: 3 },
    "Thieves' tools":             { price: 30,  lb: 1 },
    "Thieves' tools, masterwork": { price: 100, lb: 2, bonus: "Disable Device, Open Lock +2" },
    "Tool, masterwork":           { price: 50,  lb: 1, bonus: "its own skill +2" },
    "Water clock":                { price: 1000, lb: 200 },
};

/* ---- the outfit tiers, and why they matter here ------------------
   THE HONEST BASIS FOR DRESSING A CHARACTER. Pathfinder's own starting
   rule gives every character one outfit worth 10 gp or less free, and
   THIS is the table that says what 10 gp buys: everything up to the
   explorer's outfit, and nothing above it. heritage.js spentOf already
   works that allowance; these are the tiers a garment should be priced
   AT rather than guessed near (the wardrobe currently defaults ordinary
   dress to 1 gp -- the traveller's/artisan's line -- and the four
   luxury pieces to 75, the noble's line, which this table confirms).
   Assigning a tier per wardrobe entry is HER call, not mine. */
export const OUTFITS = {
    "Peasant's outfit":    { price: 0.1, lb: 2 },
    "Artisan's outfit":    { price: 1,   lb: 4 },
    "Traveler's outfit":   { price: 1,   lb: 5 },
    "Entertainer's outfit": { price: 3,  lb: 4 },
    "Monk's outfit":       { price: 5,   lb: 2 },
    "Scholar's outfit":    { price: 5,   lb: 6 },
    "Cleric's vestments":  { price: 5,   lb: 6 },
    "Cold weather outfit": { price: 8,   lb: 7, note: "+5 Fortitude vs cold exposure" },
    "Explorer's outfit":   { price: 10,  lb: 8 },
    "Courtier's outfit":   { price: 30,  lb: 6, note: "wants 50 gp of jewelry to read as court dress" },
    "Noble's outfit":      { price: 75,  lb: 10, note: "wants a signet ring and 100 gp of jewelry" },
    "Royal outfit":        { price: 200, lb: 15 },
};

/* ---- food, drink, lodging (per day unless said) ------------------ */
export const PROVISIONS = {
    "Ale (gallon)":        { price: 0.2,  lb: 8 },
    "Ale (mug)":           { price: 0.04, lb: 1 },
    "Banquet (per person)": { price: 10,  lb: 0 },
    "Bread (loaf)":        { price: 0.02, lb: 0.5 },
    "Cheese (hunk)":       { price: 0.1,  lb: 0.5 },
    "Meat (chunk)":        { price: 0.3,  lb: 0.5 },
    "Wine, common (pitcher)": { price: 0.2, lb: 6 },
    "Wine, fine (bottle)": { price: 10,   lb: 1.5 },
    "Meals, poor":         { price: 0.1,  lb: 0 },
    "Meals, common":       { price: 0.3,  lb: 0 },
    "Meals, good":         { price: 0.5,  lb: 0 },
    "Inn, poor":           { price: 0.2,  lb: 0 },
    "Inn, common":         { price: 0.5,  lb: 0 },
    "Inn, good":           { price: 2,    lb: 0 },
};

/* ---- trade goods -------------------------------------------------
   SOURCE: d20srd.org, Equipment > Wealth and Money, Table: Trade Goods,
   read 2026-09-12. NOT the Goods and Services page the rest of this file
   came from, which is why it was missing: the SRD keeps this one table
   with the coinage rather than with the shops.

   The SRD prices these by the POUND, or by the head, or by the square
   yard, and it groups several things at one cost -- "One pound of flour,
   or one chicken" is a single row. Each thing is given its own line here
   at the cost its row names, and `per` says what one unit actually is, so
   nothing has to remember that a cow is not sold by weight.

   `lb` is null, not 0, wherever the table gives no weight. Zero means
   negligible everywhere else in this file, and a cow is not negligible;
   a lie that reads as a number is worse than an honest blank. */
export const TRADE = {
    "Wheat":     { price: 0.01, lb: 1,    per: "pound" },
    "Flour":     { price: 0.02, lb: 1,    per: "pound" },
    "Chicken":   { price: 0.02, lb: null, per: "head" },
    "Iron":      { price: 0.1,  lb: 1,    per: "pound" },
    "Tobacco":   { price: 0.5,  lb: 1,    per: "pound" },
    "Copper":    { price: 0.5,  lb: 1,    per: "pound" },
    "Cinnamon":  { price: 1,    lb: 1,    per: "pound" },
    "Goat":      { price: 1,    lb: null, per: "head" },
    "Ginger":    { price: 2,    lb: 1,    per: "pound" },
    "Pepper":    { price: 2,    lb: 1,    per: "pound" },
    "Sheep":     { price: 2,    lb: null, per: "head" },
    "Pig":       { price: 3,    lb: null, per: "head" },
    "Linen":     { price: 4,    lb: null, per: "square yard" },
    "Salt":      { price: 5,    lb: 1,    per: "pound" },
    "Silver":    { price: 5,    lb: 1,    per: "pound" },
    "Silk":      { price: 10,   lb: null, per: "square yard" },
    "Cow":       { price: 10,   lb: null, per: "head" },
    "Saffron":   { price: 15,   lb: 1,    per: "pound" },
    "Cloves":    { price: 15,   lb: 1,    per: "pound" },
    "Ox":        { price: 15,   lb: null, per: "head" },
    "Gold":      { price: 50,   lb: 1,    per: "pound" },
    "Platinum":  { price: 500,  lb: 1,    per: "pound" },
};

/* ---- the pens ----------------------------------------------------
   PATHFINDER'S ANIMAL TABLE, not 3.5's (her fact-check, 2026-09-02: "I
   am sure mounts and horses as well as pets are buyable... fact check
   me. If I'm correct look up the price" -- she is correct, and the
   game rules on Pathfinder by her own earlier ruling, so its numbers
   win where the two differ). THE DIFFERENCE IS REAL AND WORTH THE
   NOTE: 3.5 sells war-trained animals as their own creature (warpony
   100, light warhorse 150, heavy warhorse 400); Pathfinder sells the
   same animal COMBAT-TRAINED for much less (pony 45, light 110, heavy
   300). Pathfinder's line is used. Camels are Pathfinder's too. */
export const MOUNTS = {
    "Pony":                    { price: 30,  note: "a small rider's mount" },
    "Pony, combat-trained":    { price: 45,  note: "rides into combat" },
    "Horse, light":            { price: 75,  note: "hard to control in combat" },
    "Horse, light (combat-trained)": { price: 110, note: "rides into combat" },
    "Horse, heavy":            { price: 200, note: "hard to control in combat" },
    "Horse, heavy (combat-trained)": { price: 300, note: "rides into combat" },
    "Camel":                   { price: 150, note: "carries far, drinks little" },
    "Donkey or mule":          { price: 8,   note: "will enter dungeons; surefooted" },
    "Dog, riding":             { price: 150, note: "a small rider's mount; brave in combat" },
};

/* ---- the ones that are company, not carriage ---------------------
   her word, same message: "as well as pets". Pathfinder prices these;
   the SRD's goods page has only the two dogs. Where the table gives a
   RANGE (a goat is 1-6 gp by quality) the shop quotes the low end and
   says so, because a shop quotes a price, not a spread. */
export const PETS = {
    "Cat":            { price: 0.03 },
    "Rat":            { price: 0.01 },
    "Chicken":        { price: 1 },
    "Dog, lap":       { price: 15 },
    "Dog, guard":     { price: 25 },
    "Hawk":           { price: 18 },
    "Falcon":         { price: 40 },
    "Cat, hunting":   { price: 100 },
    "Goat":           { price: 1,  note: "1-6 gp by quality" },
    "Pig":            { price: 3,  note: "3-10 gp by quality" },
    "Sheep":          { price: 2,  note: "2-20 gp by quality" },
    "Cattle":         { price: 10, note: "10-50 gp by quality" },
};
export const TACK = {
    "Bit and bridle":    { price: 2,  lb: 1 },
    "Saddle, riding":    { price: 10, lb: 25 },
    "Saddle, military":  { price: 20, lb: 30, note: "+2 Ride to stay seated" },
    "Saddle, pack":      { price: 5,  lb: 15, note: "gear, no rider" },
    "Saddlebags":        { price: 4,  lb: 8 },
    "Feed (per day)":    { price: 0.05, lb: 10 },
    "Stabling (per day)": { price: 0.5, lb: 0 },
    "Falconry gauntlet": { price: 10, lb: 1 },
};

/* ---- wheels and hulls -------------------------------------------- */
export const TRANSPORT = {
    "Cart":         { price: 15,    lb: 200 },
    "Wagon":        { price: 35,    lb: 400 },
    "Sled":         { price: 20,    lb: 300 },
    "Carriage":     { price: 100,   lb: 600 },
    "Rowboat":      { price: 50,    lb: 100 },
    "Oar":          { price: 2,     lb: 10 },
    "Keelboat":     { price: 3000,  lb: 0 },
    "Longship":     { price: 10000, lb: 0 },
    "Sailing ship": { price: 10000, lb: 0 },
    "Warship":      { price: 25000, lb: 0 },
    "Galley":       { price: 30000, lb: 0 },
};

/* ============================================================================
   THE CAMP KIT, WHICH IS NOT IN THE SRD AND SAYS SO.

   Rose asked me to look it up before I priced it -- "look up camp kit in dnd
   srd 3.5" -- and the honest answer is that there is no such row. Searched the
   whole Goods and Services table: zero occurrences of "camp". The SRD does use
   the KIT pattern (climber's, disguise, healer's), so the shape is the book's
   even though this entry is not.

   I had already invented one at 1 gp and 8 lb, numbers out of nowhere in a
   file where every other line is transcribed. That is the same mistake as the
   rest-cooldown, one table along, and it is why this row is DERIVED instead.

   His ruling, 2026-09-15: "make campkit basically a container containing
   bedroll, blanket, tent, firewood, flint combine the prices and weights -
   also add a bag to put everything in."

   SO IT IS A SUM, COMPUTED, NEVER TYPED. Every part is a real SRD row read out
   of GEAR above: change the price of a tent and the kit follows, and no one
   has to remember that a second number exists. The bag is the SRD's Sack (1 sp,
   half a pound) rather than a Backpack, because a backpack is what you wear
   and this is a bundle you set down when you make camp.

   IT IS HEAVY, AND THAT IS THE BOOK'S DOING. Firewood is 20 lb a day and a
   tent is 20 more, so the kit lands near fifty pounds and a caster will feel
   it in her load. That is a real decision rather than a number I softened,
   which is the entire reason for deriving it.
   ========================================================================== */
export const CAMP_KIT_PARTS = [
    "Bedroll", "Blanket, winter", "Tent", "Firewood (per day)",
    "Flint and steel", "Sack",
];

const kitSum = (field) => CAMP_KIT_PARTS.reduce(
    (n, part) => n + ((GEAR[part] && GEAR[part][field]) || 0), 0);

/* rounded to the copper, because 0.1 + 0.5 + 10 + 0.01 + 1 + 0.1 in binary
   floating point is 11.709999999999999 and a shop would print that */
const CAMP_KIT = {
    price: Math.round(kitSum("price") * 100) / 100,
    lb: Math.round(kitSum("lb") * 100) / 100,
    parts: CAMP_KIT_PARTS,
    /* NOT A ROW FROM THE BOOK. Anything reading this file to quote the SRD
       has to be able to tell, and the flag is how. */
    homebrew: true,
};

/*,,. AND IT GOES WHERE A SHOPPER WOULD LOOK FOR IT ,,,
   Rose, 2026-09-15: "I dont see camp kit in character creations provisions".

   It WAS there. It was the sixty-seventh row of sixty-seven, sitting after
   Whetstone at the bottom of a list that is alphabetical all the way down --
   because assigning a key to an object literal appends, and the shop draws
   Object.entries in insertion order. So scrolling to C, which is what anyone
   would do, found Caltrops, Candle, Canvas and no kit. A thing you cannot find
   is not in the shop.

   INSERTED, NOT RE-SORTED. A blanket sort of the whole table would reorder the
   handwritten rows too -- "Bottle, wine, glass" against "Bucket" is not
   obvious once commas are involved -- and silently rearranging sixty-six rows
   the SRD printed in a particular order is a much bigger change than the one
   being asked for. This walks the existing order and drops the kit in at the
   first row that sorts after it, leaving every other row exactly where the
   file put it.

   The rebuild is delete-then-reassign because a JS object keeps STRING keys in
   insertion order, and that order is the only thing the shop reads. */
{
    const rebuilt = [];
    let placed = false;
    for (const key of Object.keys(GEAR)) {
        if (!placed && key.localeCompare("Camp kit") > 0) {
            rebuilt.push(["Camp kit", CAMP_KIT]);
            placed = true;
        }
        rebuilt.push([key, GEAR[key]]);
    }
    if (!placed) rebuilt.push(["Camp kit", CAMP_KIT]);
    for (const key of Object.keys(GEAR)) delete GEAR[key];
    for (const [key, row] of rebuilt) GEAR[key] = row;
}

/* ---- what other people charge ------------------------------------
   priced per day or per mile as the SRD gives them; a spell's price is
   a FORMULA (caster level x the level fee), so it is a function here
   rather than a number, and the level-0 case keeps its own line
   because "caster level x 5" is not what a cantrip is worth to a
   village priest with no levels to speak of. */
export const SERVICES = {
    "Hireling, untrained": { price: 0.1, per: "day" },
    "Hireling, trained":   { price: 0.3, per: "day" },
    "Coach cab":           { price: 0.03, per: "mile" },
    "Messenger":           { price: 0.02, per: "mile" },
    "Ship's passage":      { price: 0.1, per: "mile" },
    "Road or gate toll":   { price: 0.01, per: "crossing" },
};
/* caster level x the spell's own fee; the SRD's own note is that past
   3,000 gp of total cost a spell is simply not for sale */
export const spellFee = (spellLevel, casterLevel) =>
    casterLevel * (spellLevel === 0 ? 5 : spellLevel * 10);

/* ---- what the shop actually stocks -------------------------------
   THE SHELVES, in the order a departing adventurer walks them (her
   order, 2026-09-02: "a pre-adventure shop that allows the player to
   buy stuff for the adventure - put it after the skills and feats
   page"). OUTFITS are NOT here: clothing is chosen at the mirror and
   priced there, and a second till would charge for it twice. TRANSPORT
   is not here either -- a keelboat is not bought at a kit shop on the
   way out of town; the table stays in this file for the day the world
   sells one. */
/* MOUNTS, PETS AND TACK ARE PRICED BUT NOT STOCKED, and that is her
   call (2026-09-02: "I doubt we can find that stuff... lets look for
   assets before we declare horse, pony, etc." -- checked, and she is
   right: the whole project holds ONE animal model, creatures/rat.glb,
   plus a wolf belonging to the old battle-system project. No horse, no
   pony, no dog, no camel, no bird).
   THE LINE THIS DRAWS: a rope or a lantern can be a line in a pack and
   lose nothing, but a mount is a BODY in the world -- it follows, it is
   ridden, it is looked at -- so selling one the game cannot show is
   selling a promise. The tables stay complete and correct in this file;
   the shelf appears the day a horse does. Same reasoning already keeps
   TRANSPORT off the shelves, and OUTFITS off them for a different one
   (the mirror is clothing's own till) -- except ARMOUR, which the mirror
   no longer offers and the Armour shelf below sells (Rose 2026-09-23). */

/*,,. THE ARMOUR SHELF (Rose 2026-09-23: "remove heavy cuirass from the lineup add it to the shop", then "move
   all armors to shop") ,,,
   Built from the mirror's own tables: every entry flagged `shop` (data/heritage.js), so a piece's price, its
   pounds (carry.js clothLbOf, the same weight the Gear tab shows once it is worn) and its protection live in
   one place, and armour added later arrives here by its flag. `wear` names the door a bought piece goes to:
   basket.js packs it as that garment and the Gear tab wears it. `blood` rides along so a shelf can offer a
   blood-bound piece only to a body that may wear it. */
const WEAR_TABLES = [["outfit top", OUTFIT_TOPS], ["outfit bottom", OUTFIT_BOTTOMS],
    ["outfit shoes", OUTFIT_SHOES], ["outfit hands", OUTFIT_HANDS], ["outfit cloak", OUTFIT_CLOAKS],
    ["outfit helmet", OUTFIT_HELMETS]];
const armourNote = (e) => {
    const a = e.armor;
    if (!a) return undefined;
    const bits = [a.class + " armour, +" + a.bonus + " AC"];
    if (a.material) bits.push(a.material);
    if (a.dr) bits.push("damage reduction " + a.dr);
    return bits.join(", ");
};
export const ARMOURY = Object.fromEntries(WEAR_TABLES.flatMap(([slot, table]) =>
    Object.entries(table).filter(([, e]) => e && e.shop).map(([name, e]) => [name, {
        price: e.price || 0, lb: clothLbOf(slot, name), wear: slot,
        blood: e.blood || null, note: armourNote(e),
    }])));

/*,,. THE MOUNTS SHELF, THE DAY A HORSE STANDS (stage C, v-cli-85 2026-09-27; Rose: "one of you make a mount build while
   also testing if everything in place to make your mount builds including buying a horse from the shop") ,,,
   The line drawn above ("the shelf appears the day a horse does") is crossed for the horses and only for them: every
   MOUNTS row whose animal has a body in the world (data/mounts.js hasBody), at the table's own price. Rose 09-27 on the
   prices: "pathfinder is fine as long as its srd compliant and as long as pathfinder has an ogl" -- it has (OGL 1.0a,
   its Core Rulebook's notice is in OPEN-GAME-LICENSE.txt), every horse row matches its Core Rulebook's "Mounts and
   Related Gear", and the animal each row buys is the SRD's own stat block (data/mounts.js SHOP_TO_SRD). A bought horse
   is not packed: data/basket.js keeps it on its owner, and the world stands it beside them. The pony, the riding dog,
   the camel, the mule, the pets and the tack stay priced and off the shelves, as above. */
export const MOUNT_STOCK = Object.fromEntries(Object.entries(MOUNTS).filter(([name]) => hasBody(name)));

/*,,. THE COMPONENTS SHELF (Rose 2026-09-26: "isolate the components into bags ... Then give it 'uses'") ,,,
   One pouch per school and spell level, from data/components.js, which owns their names, prices, uses and
   what each is for; the shop prints the `note` under each so a shopper reads what it holds. Beside the
   tools, where the SRD's single component pouch stood until it was removed the same day. */
export const SHELVES = [
    { name: "Weapons",          stock: WEAPONRY },
    { name: "Armour",           stock: ARMOURY },
    { name: "Ammunition",       stock: AMMUNITION },
    { name: "Adventuring gear", stock: GEAR },
    { name: "Alchemy",          stock: SUBSTANCES },
    { name: "Potions",          stock: POTION_STOCK },
    { name: "Tools and kits",   stock: TOOLS },
    { name: "Components",       stock: COMPONENT_BAGS },
    { name: "Food and lodging", stock: PROVISIONS },
    { name: "Mounts",           stock: MOUNT_STOCK },
];

/* every stocked line by name, so a saved basket can be priced and
   weighed without knowing which shelf it came from */
export const STOCK = Object.assign({}, ...SHELVES.map((s) => s.stock));

/* WHAT THE BASKET COSTS. `bought` is { item name -> count }; a name the
   shelves no longer carry is worth nothing rather than throwing, the
   same tolerance every other record readback here keeps. */
export function costOf(bought) {
    let gp = 0;
    for (const [name, n] of Object.entries(bought || {})) {
        const item = STOCK[name];
        if (item && n > 0) gp += item.price * n;
    }
    return gp;
}

/* and what it WEIGHS -- the carry ledger's own question, answered from
   the same table so the two can never disagree */
export function loadOf(bought) {
    let lb = 0;
    for (const [name, n] of Object.entries(bought || {})) {
        const item = STOCK[name];
        if (item && n > 0) lb += (item.lb || 0) * n;
    }
    return lb;
}
