/* ============================================================================
   EVERY ARMOUR AND SHIELD, ONE LINE EACH (Rose 2026-10-01, the popup: "Armour table (Recommended)", under the module
   rules law: one table per kind of thing, one rules module that reads its qualities for every body).

   The rows are the 3.5 SRD's Table: Armor and Shields, Table: Donning Armor and each piece's own description, read whole
   in Chrome on 2026-10-02 (d20srd.org/srd/equipment/armor.htm), with the shields' hardness and hit points from Table:
   Common Armor, Weapon, and Shield Hardness and Hit Points (d20srd.org/srd/exploration.htm). One row is one KIND of
   armour. What one piece someone wears is (its material, masterwork, magic, the size it was made for) is the ITEM,
   carried on the garment that is that armour (data/heritage.js OUTFIT_TOPS `armour`). The game's old worn block
   (heritage.js armorWorn: class, bonus, maxDex, checkPenalty, spellFailure, lb, material, dr) is a view of this table
   (rules/armour.js wornOf).

   A row names only what it has; kindOf() fills every other column with its "none". This file imports nothing.

     srd        the SRD's own name                  class   light | medium | heavy | shield | extra
     gp, lb     the cost and the Medium weight      bonus   the armour (or shield) bonus to AC
     maxDex     the most Dexterity bonus it lets AC keep (absent: no cap)
     acp        its armour check penalty (0 or less)  asf   its arcane spell failure chance, percent
     speed30, speed20   the wearer's speed in it (absent: unchanged)
     don, donHastily, remove   in rounds (a minute is 10 rounds); "move" a move action; absent where the SRD says "n/a";
                removeDice: half-plate's and full plate's "1d4+1" minutes
     needsHelp  "The wearer must have help to don this armor. Without help, it can be donned only hastily."
     material   cloth | leather | hide | steel | wood: what a blow on it meets (adamantine and mithral are the ITEM's)
     hardness, hp   a shield's, from the table; an armour's are its material's hardness and its bonus x5 (rules/armour.js)
     has        quality words, each one rule in rules/armour.js:
                run-x3 (heavy: "you move only triple your speed, not quadruple"), sleep-fatigue (medium and heavy),
                gauntlets, helmet, padding, fitted (full plate: 2d4x100 gp to refit), buckler-arm, hand-busy,
                hand-carries, no-bash, tower-cover, attack-2, keep-weapon+10 (the locked gauntlet), spikes,
                metal (a kind whose `material` is not steel but which is metal armour all the same: studded leather, by
                the SRD's druid page, d20srd.org/srd/classes/druid.htm, read in Chrome 2026-10-02: a druid "may wear only
                padded, leather, or hide armor" of the light and medium kinds; rules/armour.js metalWornOf, A4)
   ========================================================================== */

export const ARMOUR_TABLE = {
  /* LIGHT */
  Padded:            { srd: "Padded", class: "light", gp: 5, lb: 10, bonus: 1, maxDex: 8, acp: 0, asf: 5, don: 10, donHastily: 5, remove: 10, material: "cloth", has: [] },
  Leather:           { srd: "Leather", class: "light", gp: 10, lb: 15, bonus: 2, maxDex: 6, acp: 0, asf: 10, don: 10, donHastily: 5, remove: 10, material: "leather", has: [] },
  "Studded Leather": { srd: "Studded leather", class: "light", gp: 25, lb: 20, bonus: 3, maxDex: 5, acp: -1, asf: 15, don: 10, donHastily: 5, remove: 10, material: "leather", has: ["metal"] },
  "Chain Shirt":     { srd: "Chain shirt", class: "light", gp: 100, lb: 25, bonus: 4, maxDex: 4, acp: -2, asf: 20, don: 10, donHastily: 5, remove: 10, material: "steel", has: ["helmet"] },
  /* MEDIUM: a 30-ft body walks 20, a 20-ft body 15 */
  Hide:              { srd: "Hide", class: "medium", gp: 15, lb: 25, bonus: 3, maxDex: 4, acp: -3, asf: 20, speed30: 20, speed20: 15, don: 10, donHastily: 5, remove: 10, material: "hide", has: ["sleep-fatigue"] },
  "Scale Mail":      { srd: "Scale mail", class: "medium", gp: 50, lb: 30, bonus: 4, maxDex: 3, acp: -4, asf: 25, speed30: 20, speed20: 15, don: 40, donHastily: 10, remove: 10, material: "steel", has: ["sleep-fatigue", "gauntlets"] },
  Chainmail:         { srd: "Chainmail", class: "medium", gp: 150, lb: 40, bonus: 5, maxDex: 2, acp: -5, asf: 30, speed30: 20, speed20: 15, don: 40, donHastily: 10, remove: 10, material: "steel", has: ["sleep-fatigue", "gauntlets"] },
  Breastplate:       { srd: "Breastplate", class: "medium", gp: 200, lb: 30, bonus: 5, maxDex: 3, acp: -4, asf: 25, speed30: 20, speed20: 15, don: 40, donHastily: 10, remove: 10, material: "steel", has: ["sleep-fatigue", "helmet"] },
  /* HEAVY: the same speeds, and a run of only triple */
  "Splint Mail":     { srd: "Splint mail", class: "heavy", gp: 200, lb: 45, bonus: 6, maxDex: 0, acp: -7, asf: 40, speed30: 20, speed20: 15, don: 40, donHastily: 10, remove: 10, material: "steel", has: ["run-x3", "sleep-fatigue", "gauntlets"] },
  "Banded Mail":     { srd: "Banded mail", class: "heavy", gp: 250, lb: 35, bonus: 6, maxDex: 1, acp: -6, asf: 35, speed30: 20, speed20: 15, don: 40, donHastily: 10, remove: 10, material: "steel", has: ["run-x3", "sleep-fatigue", "gauntlets"] },
  "Half-Plate":      { srd: "Half-plate", class: "heavy", gp: 600, lb: 50, bonus: 7, maxDex: 0, acp: -7, asf: 40, speed30: 20, speed20: 15, don: 40, donHastily: 40, removeDice: "1d4+1", needsHelp: true, material: "steel", has: ["run-x3", "sleep-fatigue", "gauntlets"] },
  "Full Plate":      { srd: "Full plate", class: "heavy", gp: 1500, lb: 50, bonus: 8, maxDex: 1, acp: -6, asf: 35, speed30: 20, speed20: 15, don: 40, donHastily: 40, removeDice: "1d4+1", needsHelp: true, material: "steel", has: ["run-x3", "sleep-fatigue", "gauntlets", "helmet", "padding", "fitted"] },
  /* SHIELDS: no cap on Dexterity but the tower's, no change of speed; strapped on and loosed as a move action */
  Buckler:               { srd: "Buckler", class: "shield", gp: 15, lb: 5, bonus: 1, acp: -1, asf: 5, don: "move", remove: "move", material: "steel", hardness: 10, hp: 5, has: ["buckler-arm", "no-bash"] },
  "Light Wooden Shield": { srd: "Shield, light wooden", class: "shield", gp: 3, lb: 5, bonus: 1, acp: -1, asf: 5, don: "move", remove: "move", material: "wood", hardness: 5, hp: 7, has: ["hand-carries"] },
  "Light Steel Shield":  { srd: "Shield, light steel", class: "shield", gp: 9, lb: 6, bonus: 1, acp: -1, asf: 5, don: "move", remove: "move", material: "steel", hardness: 10, hp: 10, has: ["hand-carries"] },
  "Heavy Wooden Shield": { srd: "Shield, heavy wooden", class: "shield", gp: 7, lb: 10, bonus: 2, acp: -2, asf: 15, don: "move", remove: "move", material: "wood", hardness: 5, hp: 15, has: ["hand-busy"] },
  "Heavy Steel Shield":  { srd: "Shield, heavy steel", class: "shield", gp: 20, lb: 15, bonus: 2, acp: -2, asf: 15, don: "move", remove: "move", material: "steel", hardness: 10, hp: 20, has: ["hand-busy"] },
  "Tower Shield":        { srd: "Shield, tower", class: "shield", gp: 30, lb: 45, bonus: 4, maxDex: 2, acp: -10, asf: 50, don: "move", remove: "move", material: "wood", hardness: 5, hp: 20, has: ["hand-busy", "no-bash", "tower-cover", "attack-2"] },
  /* EXTRAS: added to a piece, priced and weighed on top of it */
  "Armor Spikes":    { srd: "Armor spikes", class: "extra", gp: 50, lb: 10, has: ["spikes"] },
  "Locked Gauntlet": { srd: "Gauntlet, locked", class: "extra", gp: 8, lb: 5, has: ["keep-weapon+10"] },
  "Shield Spikes":   { srd: "Shield spikes", class: "extra", gp: 10, lb: 5, has: ["spikes"] },
};

/* every column's "none", so every kind answers every column */
const NONE = { srd: null, class: null, gp: 0, lb: 0, bonus: 0, maxDex: null, acp: 0, asf: 0, speed30: null, speed20: null,
               don: null, donHastily: null, remove: null, removeDice: null, needsHelp: false, material: null,
               hardness: null, hp: null, has: [] };
const KINDS = Object.fromEntries(Object.entries(ARMOUR_TABLE).map(([k, v]) => [k, Object.freeze({ ...NONE, ...v, name: k })]));
/** one kind, every column answered; null for a name the table has not got */
export const armourKindOf = (name) => KINDS[name] || null;
/** the names of every kind of a class ("light", "medium", "heavy", "shield", "extra") */
export const armourKindsOf = (cls) => Object.keys(KINDS).filter((k) => KINDS[k].class === cls);
