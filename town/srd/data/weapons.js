import { WEAPON_TABLE, soldKinds } from "./weaponTable.js";

/* The starting-weapon catalogue. Lived in steps/gear.js until the forge
   needed it too: forge.js is imported by creation.js, so a forge import
   from any STEP file closes the cycle creation -> forge -> step ->
   creation, and the step's registerStep call meets a registry that does
   not exist yet ("Cannot access 'STEPS' before initialization", the
   whole game dead on boot, 08-17). Data files import no steps and no
   frame, so this is the safe floor for anything the forge shares with a
   page. */
/*,,. THE ARTS' BLADES ARE BUYABLE (Rose 2026-09-17) ,,,
   "Thats your fault... you didnt put it in the weapon shop in character creation." Three ethnicity affinities name a
   weapon: the Neigi's rapier, the Weish's greatsword, the Eishu's polearms. Their dice have been in the roster since
   09-11 carrying a comment that they wait on loot and a shop, so a Weish took a feat that could never fire. They are
   on the page now, and the affinity is worth taking the day it is chosen.
   The polearms are the glaive, the halberd and the longspear: the Eishu art's family (battle/featHooks POLEARMS). */
/*,,. AND THE GODS' TWO (Rose 2026-09-23: "actually do morning star and flail now") ,,,
   Halon the Dawnward's morningstar and Kaerix the Tyrant Below's flail (data/faith.js), from the 3.5 SRD weapon table
   read that day: morningstar SIMPLE one-handed, 8 gp, 1d8, x2, 6 lb, bludgeoning and piercing; flail MARTIAL
   one-handed, 8 gp, 1d8, x2, 5 lb, bludgeoning. */
export const WEAPONS = ["Unarmed", "Dagger", "Spear", "Longsword", "Warhammer",
                        "Rapier", "Greatsword", "Glaive", "Halberd", "Longspear",
                        "Morningstar", "Flail"];

/*,,. THE WEIGHTS AND THE PRICES ARE THE WEAPON TABLE'S (2026-10-01) ,,,
   data/weaponTable.js holds every weapon's row of the 3.5 SRD's Table: Weapons (read whole that day), the Medium row's
   pounds and coin among them. These two stay as views for their readers (the carry ledger, the shops, the creation
   purse, the loot): the kinds the shops sell, in shelf order (the table's `sold`), and bare hands, which cost nothing.
   The thrown weapons and the crossbows came on Rose's word (2026-09-26: "throwable weapons look up the srd for those",
   "I dont see a crossbow"), the arts' blades priced from the SRD on hers (09-17: "stop you're looking at pathfinder's
   weapons"). A new weapon is a new line in the table; selling it is its `sold`. */
const SOLD = soldKinds();
export const WEAPON_LB = Object.fromEntries(SOLD.map((n) => [n, WEAPON_TABLE[n].lb]));
export const WEAPON_GP = { Unarmed: 0, ...Object.fromEntries(SOLD.map((n) => [n, WEAPON_TABLE[n].gp])) };
/* THE PRICES AND WEIGHTS ABOVE ARE THE MEDIUM ROW: an item of another size is priced and weighed by rules/items.js
   itemGpOf and weaponLbOf, with data/weaponSize.js's SRD arithmetic (the sized views that stood here had no reader) */
