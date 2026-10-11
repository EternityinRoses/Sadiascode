/* ============================================================================
   EVERY WEAPON, ONE LINE EACH (Rose 2026-10-01: "use module rules which will allow you to classify weapons and add
   future weapons easily by just adding it to a module"; "study the weapon page and make a system that can cover all of
   your bases even if some options have to be none or something").

   The rows are the 3.5 SRD's Table: Weapons and each weapon's own description, read whole in Chrome on 2026-10-01
   (d20srd.org/srd/equipment/weapons.htm). One row is one KIND of weapon. What one weapon in a pack is (the size it was
   bought at, its material, masterwork, magic, a composite bow's strength rating, a stack's count) is the ITEM, carried on
   the pack's record. The game's old weapon lists are views of this table: battle/roster.js GEAR_DICE and GEAR_RANGED,
   data/weapons.js WEAPON_LB and WEAPON_GP, data/proficiency.js WEAPON_CATEGORY, data/featEffects.js POLEARMS.

   A row names only what it has; kindOf() fills every other column with its "none", so every kind answers every column.
   This file imports nothing, so any data file may read it.

     srd        the SRD's own name                 prof     simple | martial | exotic (none for ammunition)
     use        melee | melee-thrown | thrown | projectile | ammunition
     effort     unarmed | light | one-handed | two-handed | ranged
     dmg        the Medium die (data/weaponSize.js steps it for other sizes); dmg2: a double weapon's second head
     crit       "x2", "19-20/x2"...; crit2: the second head's      inc   range increment, ft (0: none)
     lb, gp     the Medium weight and the cost (sp as tenths of a gp); null where the SRD says "special"
     types      what it deals; join "and" (all of it is both types) or "or" (the wielder chooses); types2: the second head's
     nonlethal  the table's footnote 3                 reach   0 | "double" | 15 (the whip)
     reachAdjacent  a reach weapon that still strikes next to you (spiked chain, whip)
     threatens  false for the whip ("you don't threaten the area into which you can make an attack")
     ammo       what it fires, or what it is (arrows, bolts, bullets, shuriken)      pack   how many one purchase holds
     reload     free (a bow) | move | full | lever          magazine   a repeating crossbow's case
     oneHandFire  the attack penalty for firing it one-handed (null: it never fires one-handed)
     mounted    false for the longbow ("too unwieldy to use while you are mounted")
     profTwoHands   "martial" for the bastard sword and dwarven waraxe used two-handed
     raceMartial    bloods that treat it as martial (gnome, dwarf; no such blood in the game yet)
     maxFt      a hard range cap (the net's 10 ft)
     breaksAs   the line of the SRD's hardness table it breaks as (exploration.htm; rules/weapons.js hardnessOf): light
                blade, one-handed blade, two-handed blade, light metal-hafted, one-handed metal-hafted, light hafted,
                one-handed hafted, two-handed hafted, projectile; the net's own 5 hp; none where nothing is sundered.
                The SRD gives the table, not the list: each line here is sadia's call from the weapon's form (10-02,
                Desktop/V/weapons-cog-table.md D1s), for Rose to overrule; a two-handed metal weapon takes the two-handed
                blade line, the table's only two-handed metal one
     has        quality words, each one rule in rules/weapons.js:
                trip, trip-ranged, disarm+2, disarm+4, brace, finesse, no-two-hands, double, monk, lance, no-melee,
                melee-nonproficient, composite, entangle, lethal-unarmed, armed-unarmed, cannot-be-disarmed, conceal+2,
                sling-stones, provokes-like-ranged, no-damage-to-armoured, shield-bash, worn (armour's: shields, spikes),
                metal (it has metal parts: adamantine, cold iron and silvering may make it, the lightning finds it; sadia's
                call 10-02), wood (wooden or mostly wooden: darkwood may make it, the SRD's "such as a bow, an arrow, or a
                spear" and never "a battleaxe or a mace"; sadia's call 10-02, for Rose to overrule beside breaksAs)
     sold       the game's: its place on the shops' weapon shelf (data/goods.js WEAPONRY), 0 when not sold
     polearm    the game's: the Eishu art's family (Rose 09-11)
   ========================================================================== */

export const WEAPON_TABLE = {
  /* SIMPLE: unarmed attacks */
  Unarmed:          { srd: "Unarmed strike", prof: "simple", use: "melee", effort: "unarmed", dmg: "1d3", crit: "x2", lb: 0, gp: 0, types: ["bludgeoning"], nonlethal: true, has: [] },
  Gauntlet:         { srd: "Gauntlet", prof: "simple", use: "melee", effort: "unarmed", dmg: "1d3", crit: "x2", lb: 1, gp: 2, types: ["bludgeoning"], breaksAs: "light metal-hafted", has: ["lethal-unarmed", "metal"] },
  /* SIMPLE: light */
  Dagger:           { srd: "Dagger", prof: "simple", use: "melee-thrown", effort: "light", dmg: "1d4", crit: "19-20/x2", inc: 10, lb: 1, gp: 2, types: ["piercing", "slashing"], join: "or", breaksAs: "light blade", has: ["conceal+2", "metal"], sold: 1 },
  "Punching Dagger": { srd: "Dagger, punching", prof: "simple", use: "melee", effort: "light", dmg: "1d4", crit: "x3", lb: 1, gp: 2, types: ["piercing"], breaksAs: "light blade", has: ["metal"] },
  "Spiked Gauntlet": { srd: "Gauntlet, spiked", prof: "simple", use: "melee", effort: "light", dmg: "1d4", crit: "x2", lb: 1, gp: 5, types: ["piercing"], breaksAs: "light metal-hafted", has: ["armed-unarmed", "cannot-be-disarmed", "metal"] },
  "Light Mace":     { srd: "Mace, light", prof: "simple", use: "melee", effort: "light", dmg: "1d6", crit: "x2", lb: 4, gp: 5, types: ["bludgeoning"], breaksAs: "light metal-hafted", has: ["metal"] },
  Sickle:           { srd: "Sickle", prof: "simple", use: "melee", effort: "light", dmg: "1d6", crit: "x2", lb: 2, gp: 6, types: ["slashing"], breaksAs: "light hafted", has: ["trip", "metal"] },
  /* SIMPLE: one-handed */
  Club:             { srd: "Club", prof: "simple", use: "melee-thrown", effort: "one-handed", dmg: "1d6", crit: "x2", inc: 10, lb: 3, gp: 0, types: ["bludgeoning"], breaksAs: "one-handed hafted", has: ["wood"], sold: 13 },
  "Heavy Mace":     { srd: "Mace, heavy", prof: "simple", use: "melee", effort: "one-handed", dmg: "1d8", crit: "x2", lb: 8, gp: 12, types: ["bludgeoning"], breaksAs: "one-handed metal-hafted", has: ["metal"] },
  Morningstar:      { srd: "Morningstar", prof: "simple", use: "melee", effort: "one-handed", dmg: "1d8", crit: "x2", lb: 6, gp: 8, types: ["bludgeoning", "piercing"], join: "and", breaksAs: "one-handed metal-hafted", has: ["metal"], sold: 11 },
  Shortspear:       { srd: "Shortspear", prof: "simple", use: "melee-thrown", effort: "one-handed", dmg: "1d6", crit: "x2", inc: 20, lb: 3, gp: 1, types: ["piercing"], breaksAs: "one-handed hafted", has: ["metal", "wood"], polearm: true },
  /* SIMPLE: two-handed */
  Longspear:        { srd: "Longspear", prof: "simple", use: "melee", effort: "two-handed", dmg: "1d8", crit: "x3", lb: 9, gp: 5, types: ["piercing"], reach: "double", breaksAs: "two-handed hafted", has: ["brace", "metal", "wood"], sold: 10, polearm: true },
  Quarterstaff:     { srd: "Quarterstaff", prof: "simple", use: "melee", effort: "two-handed", dmg: "1d6", dmg2: "1d6", crit: "x2", crit2: "x2", lb: 4, gp: 0, types: ["bludgeoning"], types2: ["bludgeoning"], breaksAs: "two-handed hafted", has: ["double", "monk", "wood"], polearm: true },
  Spear:            { srd: "Spear", prof: "simple", use: "melee-thrown", effort: "two-handed", dmg: "1d8", crit: "x3", inc: 20, lb: 6, gp: 2, types: ["piercing"], breaksAs: "two-handed hafted", has: ["brace", "metal", "wood"], sold: 2, polearm: true },
  /* SIMPLE: ranged */
  "Heavy Crossbow": { srd: "Crossbow, heavy", prof: "simple", use: "projectile", effort: "ranged", dmg: "1d10", crit: "19-20/x2", inc: 120, lb: 8, gp: 50, types: ["piercing"], ammo: "bolts", reload: "full", oneHandFire: -4, breaksAs: "projectile", has: ["wood"], sold: 16 },
  "Light Crossbow": { srd: "Crossbow, light", prof: "simple", use: "projectile", effort: "ranged", dmg: "1d8", crit: "19-20/x2", inc: 80, lb: 4, gp: 35, types: ["piercing"], ammo: "bolts", reload: "move", oneHandFire: -2, breaksAs: "projectile", has: ["wood"], sold: 15 },
  Dart:             { srd: "Dart", prof: "simple", use: "thrown", effort: "ranged", dmg: "1d4", crit: "x2", inc: 20, lb: 0.5, gp: 0.5, types: ["piercing"], breaksAs: "light blade", has: ["metal"] },
  Javelin:          { srd: "Javelin", prof: "simple", use: "thrown", effort: "ranged", dmg: "1d6", crit: "x2", inc: 30, lb: 2, gp: 1, types: ["piercing"], breaksAs: "one-handed hafted", has: ["melee-nonproficient", "metal", "wood"], sold: 14 },
  Sling:            { srd: "Sling", prof: "simple", use: "projectile", effort: "ranged", dmg: "1d4", crit: "x2", inc: 50, lb: 0, gp: 0, types: ["bludgeoning"], ammo: "bullets", reload: "move", oneHandFire: 0, breaksAs: "projectile", has: ["sling-stones"], sold: 23 },
  /* MARTIAL: light */
  "Throwing Axe":   { srd: "Axe, throwing", prof: "martial", use: "melee-thrown", effort: "light", dmg: "1d6", crit: "x2", inc: 10, lb: 2, gp: 8, types: ["slashing"], breaksAs: "light hafted", has: ["metal"], sold: 17 },
  "Light Hammer":   { srd: "Hammer, light", prof: "martial", use: "melee-thrown", effort: "light", dmg: "1d4", crit: "x2", inc: 20, lb: 2, gp: 1, types: ["bludgeoning"], breaksAs: "light metal-hafted", has: ["metal"], sold: 18 },
  Handaxe:          { srd: "Handaxe", prof: "martial", use: "melee", effort: "light", dmg: "1d6", crit: "x3", lb: 3, gp: 6, types: ["slashing"], breaksAs: "light hafted", has: ["metal"] },
  Kukri:            { srd: "Kukri", prof: "martial", use: "melee", effort: "light", dmg: "1d4", crit: "18-20/x2", lb: 2, gp: 8, types: ["slashing"], breaksAs: "light blade", has: ["metal"] },
  "Light Pick":     { srd: "Pick, light", prof: "martial", use: "melee", effort: "light", dmg: "1d4", crit: "x4", lb: 3, gp: 4, types: ["piercing"], breaksAs: "light metal-hafted", has: ["metal"] },
  Sap:              { srd: "Sap", prof: "martial", use: "melee", effort: "light", dmg: "1d6", crit: "x2", lb: 2, gp: 1, types: ["bludgeoning"], nonlethal: true, breaksAs: "light hafted", has: [] },
  "Light Shield":   { srd: "Shield, light", prof: "martial", use: "melee", effort: "light", dmg: "1d3", crit: "x2", lb: null, gp: null, types: ["bludgeoning"], has: ["shield-bash", "worn"] },
  "Spiked Armor":   { srd: "Spiked armor", prof: "martial", use: "melee", effort: "light", dmg: "1d6", crit: "x2", lb: null, gp: null, types: ["piercing"], has: ["worn", "metal"] },
  "Light Spiked Shield": { srd: "Spiked shield, light", prof: "martial", use: "melee", effort: "light", dmg: "1d4", crit: "x2", lb: null, gp: null, types: ["piercing"], has: ["shield-bash", "worn", "metal"] },
  "Short Sword":    { srd: "Sword, short", prof: "martial", use: "melee", effort: "light", dmg: "1d6", crit: "19-20/x2", lb: 2, gp: 10, types: ["piercing"], breaksAs: "light blade", has: ["metal"] },
  /* MARTIAL: one-handed */
  Battleaxe:        { srd: "Battleaxe", prof: "martial", use: "melee", effort: "one-handed", dmg: "1d8", crit: "x3", lb: 6, gp: 10, types: ["slashing"], breaksAs: "one-handed hafted", has: ["metal"] },
  Flail:            { srd: "Flail", prof: "martial", use: "melee", effort: "one-handed", dmg: "1d8", crit: "x2", lb: 5, gp: 8, types: ["bludgeoning"], breaksAs: "one-handed metal-hafted", has: ["disarm+2", "trip", "metal"], sold: 12 },
  Longsword:        { srd: "Longsword", prof: "martial", use: "melee", effort: "one-handed", dmg: "1d8", crit: "19-20/x2", lb: 4, gp: 15, types: ["slashing"], breaksAs: "one-handed blade", has: ["metal"], sold: 3 },
  "Heavy Pick":     { srd: "Pick, heavy", prof: "martial", use: "melee", effort: "one-handed", dmg: "1d6", crit: "x4", lb: 6, gp: 8, types: ["piercing"], breaksAs: "one-handed metal-hafted", has: ["metal"] },
  Rapier:           { srd: "Rapier", prof: "martial", use: "melee", effort: "one-handed", dmg: "1d6", crit: "18-20/x2", lb: 2, gp: 20, types: ["piercing"], breaksAs: "one-handed blade", has: ["finesse", "no-two-hands", "metal"], sold: 6 },
  Scimitar:         { srd: "Scimitar", prof: "martial", use: "melee", effort: "one-handed", dmg: "1d6", crit: "18-20/x2", lb: 4, gp: 15, types: ["slashing"], breaksAs: "one-handed blade", has: ["metal"] },
  "Heavy Shield":   { srd: "Shield, heavy", prof: "martial", use: "melee", effort: "one-handed", dmg: "1d4", crit: "x2", lb: null, gp: null, types: ["bludgeoning"], has: ["shield-bash", "worn"] },
  "Heavy Spiked Shield": { srd: "Spiked shield, heavy", prof: "martial", use: "melee", effort: "one-handed", dmg: "1d6", crit: "x2", lb: null, gp: null, types: ["piercing"], has: ["shield-bash", "worn", "metal"] },
  Trident:          { srd: "Trident", prof: "martial", use: "melee-thrown", effort: "one-handed", dmg: "1d8", crit: "x2", inc: 10, lb: 4, gp: 15, types: ["piercing"], breaksAs: "one-handed hafted", has: ["brace", "metal", "wood"], sold: 19 },
  Warhammer:        { srd: "Warhammer", prof: "martial", use: "melee", effort: "one-handed", dmg: "1d8", crit: "x3", lb: 5, gp: 12, types: ["bludgeoning"], breaksAs: "one-handed metal-hafted", has: ["metal"], sold: 4 },
  /* MARTIAL: two-handed */
  Falchion:         { srd: "Falchion", prof: "martial", use: "melee", effort: "two-handed", dmg: "2d4", crit: "18-20/x2", lb: 8, gp: 75, types: ["slashing"], breaksAs: "two-handed blade", has: ["metal"] },
  Glaive:           { srd: "Glaive", prof: "martial", use: "melee", effort: "two-handed", dmg: "1d10", crit: "x3", lb: 10, gp: 8, types: ["slashing"], reach: "double", breaksAs: "two-handed hafted", has: ["metal", "wood"], sold: 8, polearm: true },
  Greataxe:         { srd: "Greataxe", prof: "martial", use: "melee", effort: "two-handed", dmg: "1d12", crit: "x3", lb: 12, gp: 20, types: ["slashing"], breaksAs: "two-handed hafted", has: ["metal"] },
  Greatclub:        { srd: "Greatclub", prof: "martial", use: "melee", effort: "two-handed", dmg: "1d10", crit: "x2", lb: 8, gp: 5, types: ["bludgeoning"], breaksAs: "two-handed hafted", has: ["wood"] },
  "Heavy Flail":    { srd: "Flail, heavy", prof: "martial", use: "melee", effort: "two-handed", dmg: "1d10", crit: "19-20/x2", lb: 10, gp: 15, types: ["bludgeoning"], breaksAs: "two-handed blade", has: ["disarm+2", "trip", "metal"] },
  Greatsword:       { srd: "Greatsword", prof: "martial", use: "melee", effort: "two-handed", dmg: "2d6", crit: "19-20/x2", lb: 8, gp: 50, types: ["slashing"], breaksAs: "two-handed blade", has: ["metal"], sold: 7 },
  Guisarme:         { srd: "Guisarme", prof: "martial", use: "melee", effort: "two-handed", dmg: "2d4", crit: "x3", lb: 12, gp: 9, types: ["slashing"], reach: "double", breaksAs: "two-handed hafted", has: ["trip", "metal", "wood"], polearm: true },
  Halberd:          { srd: "Halberd", prof: "martial", use: "melee", effort: "two-handed", dmg: "1d10", crit: "x3", lb: 12, gp: 10, types: ["slashing", "piercing"], join: "or", breaksAs: "two-handed hafted", has: ["brace", "trip", "metal", "wood"], sold: 9, polearm: true },
  Lance:            { srd: "Lance", prof: "martial", use: "melee", effort: "two-handed", dmg: "1d8", crit: "x3", lb: 10, gp: 10, types: ["piercing"], reach: "double", breaksAs: "two-handed hafted", has: ["lance", "metal", "wood"] },
  Ranseur:          { srd: "Ranseur", prof: "martial", use: "melee", effort: "two-handed", dmg: "2d4", crit: "x3", lb: 12, gp: 10, types: ["piercing"], reach: "double", breaksAs: "two-handed hafted", has: ["disarm+2", "metal", "wood"], polearm: true },
  Scythe:           { srd: "Scythe", prof: "martial", use: "melee", effort: "two-handed", dmg: "2d4", crit: "x4", lb: 10, gp: 18, types: ["piercing", "slashing"], join: "or", breaksAs: "two-handed hafted", has: ["trip", "metal", "wood"] },
  /* MARTIAL: ranged */
  Longbow:          { srd: "Longbow", prof: "martial", use: "projectile", effort: "ranged", dmg: "1d8", crit: "x3", inc: 100, lb: 3, gp: 75, types: ["piercing"], ammo: "arrows", reload: "free", mounted: false, breaksAs: "projectile", has: ["wood"], sold: 22 },
  "Composite Longbow": { srd: "Longbow, composite", prof: "martial", use: "projectile", effort: "ranged", dmg: "1d8", crit: "x3", inc: 110, lb: 3, gp: 100, types: ["piercing"], ammo: "arrows", reload: "free", breaksAs: "projectile", has: ["composite", "wood"] },
  Shortbow:         { srd: "Shortbow", prof: "martial", use: "projectile", effort: "ranged", dmg: "1d6", crit: "x3", inc: 60, lb: 2, gp: 30, types: ["piercing"], ammo: "arrows", reload: "free", breaksAs: "projectile", has: ["wood"], sold: 5 },
  "Composite Shortbow": { srd: "Shortbow, composite", prof: "martial", use: "projectile", effort: "ranged", dmg: "1d6", crit: "x3", inc: 70, lb: 2, gp: 75, types: ["piercing"], ammo: "arrows", reload: "free", breaksAs: "projectile", has: ["composite", "wood"] },
  /* EXOTIC: light */
  Kama:             { srd: "Kama", prof: "exotic", use: "melee", effort: "light", dmg: "1d6", crit: "x2", lb: 2, gp: 2, types: ["slashing"], breaksAs: "light hafted", has: ["monk", "trip", "metal"] },
  Nunchaku:         { srd: "Nunchaku", prof: "exotic", use: "melee", effort: "light", dmg: "1d6", crit: "x2", lb: 2, gp: 2, types: ["bludgeoning"], breaksAs: "light hafted", has: ["monk", "disarm+2", "wood"] },
  Sai:              { srd: "Sai", prof: "exotic", use: "melee-thrown", effort: "light", dmg: "1d4", crit: "x2", inc: 10, lb: 1, gp: 1, types: ["bludgeoning"], breaksAs: "light metal-hafted", has: ["monk", "disarm+4", "metal"] },
  Siangham:         { srd: "Siangham", prof: "exotic", use: "melee", effort: "light", dmg: "1d6", crit: "x2", lb: 1, gp: 3, types: ["piercing"], breaksAs: "light blade", has: ["monk", "metal"] },
  /* EXOTIC: one-handed */
  "Bastard Sword":  { srd: "Sword, bastard", prof: "exotic", profTwoHands: "martial", use: "melee", effort: "one-handed", dmg: "1d10", crit: "19-20/x2", lb: 6, gp: 35, types: ["slashing"], breaksAs: "one-handed blade", has: ["metal"] },
  "Dwarven Waraxe": { srd: "Waraxe, dwarven", prof: "exotic", profTwoHands: "martial", raceMartial: ["dwarf"], use: "melee", effort: "one-handed", dmg: "1d10", crit: "x3", lb: 8, gp: 30, types: ["slashing"], breaksAs: "one-handed hafted", has: ["metal"] },
  Whip:             { srd: "Whip", prof: "exotic", use: "melee", effort: "one-handed", dmg: "1d3", crit: "x2", lb: 2, gp: 1, types: ["slashing"], nonlethal: true, reach: 15, reachAdjacent: true, threatens: false, breaksAs: "one-handed hafted", has: ["trip", "disarm+2", "finesse", "provokes-like-ranged", "no-damage-to-armoured"] },
  /* EXOTIC: two-handed */
  "Orc Double Axe": { srd: "Axe, orc double", prof: "exotic", use: "melee", effort: "two-handed", dmg: "1d8", dmg2: "1d8", crit: "x3", crit2: "x3", lb: 15, gp: 60, types: ["slashing"], types2: ["slashing"], breaksAs: "two-handed hafted", has: ["double", "metal"] },
  "Spiked Chain":   { srd: "Chain, spiked", prof: "exotic", use: "melee", effort: "two-handed", dmg: "2d4", crit: "x2", lb: 10, gp: 25, types: ["piercing"], reach: "double", reachAdjacent: true, breaksAs: "two-handed blade", has: ["trip", "disarm+2", "finesse", "metal"] },
  "Dire Flail":     { srd: "Flail, dire", prof: "exotic", use: "melee", effort: "two-handed", dmg: "1d8", dmg2: "1d8", crit: "x2", crit2: "x2", lb: 10, gp: 90, types: ["bludgeoning"], types2: ["bludgeoning"], breaksAs: "two-handed blade", has: ["double", "disarm+2", "trip", "metal"] },
  "Gnome Hooked Hammer": { srd: "Hammer, gnome hooked", prof: "exotic", raceMartial: ["gnome"], use: "melee", effort: "two-handed", dmg: "1d8", dmg2: "1d6", crit: "x3", crit2: "x4", lb: 6, gp: 20, types: ["bludgeoning"], types2: ["piercing"], breaksAs: "two-handed blade", has: ["double", "trip", "metal"] },
  "Two-Bladed Sword": { srd: "Sword, two-bladed", prof: "exotic", use: "melee", effort: "two-handed", dmg: "1d8", dmg2: "1d8", crit: "19-20/x2", crit2: "19-20/x2", lb: 10, gp: 100, types: ["slashing"], types2: ["slashing"], breaksAs: "two-handed blade", has: ["double", "metal"] },
  /* the urgrosh: "The urgrosh's axe head is a slashing weapon that deals 1d8 points of damage. Its spear head is a
     piercing weapon that deals 1d6"; set against a charge, "the spear head is the part of the weapon that deals damage" */
  "Dwarven Urgrosh": { srd: "Urgrosh, dwarven", prof: "exotic", raceMartial: ["dwarf"], use: "melee", effort: "two-handed", dmg: "1d8", dmg2: "1d6", crit: "x3", crit2: "x3", lb: 12, gp: 50, types: ["slashing"], types2: ["piercing"], breaksAs: "two-handed hafted", has: ["double", "brace", "metal"] },
  /* EXOTIC: ranged */
  Bolas:            { srd: "Bolas", prof: "exotic", use: "thrown", effort: "ranged", dmg: "1d4", crit: "x2", inc: 10, lb: 2, gp: 5, types: ["bludgeoning"], nonlethal: true, has: ["trip-ranged", "wood"] },
  "Hand Crossbow":  { srd: "Crossbow, hand", prof: "exotic", use: "projectile", effort: "ranged", dmg: "1d4", crit: "19-20/x2", inc: 30, lb: 2, gp: 100, types: ["piercing"], ammo: "bolts", reload: "move", oneHandFire: 0, breaksAs: "projectile", has: ["wood"], sold: 20 },
  "Repeating Heavy Crossbow": { srd: "Crossbow, repeating heavy", prof: "exotic", use: "projectile", effort: "ranged", dmg: "1d10", crit: "19-20/x2", inc: 120, lb: 12, gp: 400, types: ["piercing"], ammo: "bolts", reload: "lever", magazine: 5, oneHandFire: -4, breaksAs: "projectile", has: ["wood"] },
  "Repeating Light Crossbow": { srd: "Crossbow, repeating light", prof: "exotic", use: "projectile", effort: "ranged", dmg: "1d8", crit: "19-20/x2", inc: 80, lb: 6, gp: 250, types: ["piercing"], ammo: "bolts", reload: "lever", magazine: 5, oneHandFire: -2, breaksAs: "projectile", has: ["wood"], sold: 21 },
  Net:              { srd: "Net", prof: "exotic", use: "thrown", effort: "ranged", dmg: null, crit: null, inc: 10, maxFt: 10, lb: 6, gp: 20, types: [], breaksAs: "net", has: ["entangle"] },
  Shuriken:         { srd: "Shuriken", prof: "exotic", use: "thrown", effort: "ranged", dmg: "1d2", crit: "x2", inc: 10, lb: 0.5, gp: 1, pack: 5, types: ["piercing"], ammo: "shuriken", has: ["monk", "no-melee", "metal"] },
  /* AMMUNITION (the table's own rows): "An arrow that hits its target is destroyed; one that misses has a 50% chance
     of being destroyed or lost"; swung in melee, "a light improvised weapon (-4 penalty on attack rolls)" dealing "damage
     as a dagger of its size (critical multiplier x2)" */
  Arrows:           { srd: "Arrows", use: "ammunition", effort: "light", dmg: "1d4", crit: "x2", ammo: "arrows", pack: 20, lb: 3, gp: 1, types: ["piercing"], has: ["metal", "wood"], sold: 25 },
  Bolts:            { srd: "Bolts, crossbow", use: "ammunition", effort: "light", dmg: "1d4", crit: "x2", ammo: "bolts", pack: 10, lb: 1, gp: 1, types: ["piercing"], has: ["metal", "wood"], sold: 24 },
  "Sling Bullets":  { srd: "Bullets, sling", use: "ammunition", effort: "light", dmg: null, crit: null, ammo: "bullets", pack: 10, lb: 5, gp: 0.1, types: [], has: ["metal"], sold: 26 },
};

/** every column, with its "none" where a row names nothing */
const NONE = { srd: null, prof: null, use: "melee", effort: "one-handed", dmg: null, dmg2: null, crit: "x2", crit2: null,
  inc: 0, maxFt: 0, lb: 0, gp: 0, types: [], join: "and", types2: [], nonlethal: false, reach: 0, reachAdjacent: false,
  threatens: true, ammo: null, pack: 0, reload: null, magazine: 0, oneHandFire: null, mounted: true, profTwoHands: null,
  raceMartial: [], breaksAs: null, has: [], sold: 0, polearm: false };

/** the whole row for a kind, every column filled, or null for a name the table does not hold */
export function kindOf(name) {
  const row = WEAPON_TABLE[name];
  return row ? { name, ...NONE, ...row } : null;
}
/** does this kind carry that quality word */
export const kindHas = (name, word) => !!(WEAPON_TABLE[name] && (WEAPON_TABLE[name].has || []).includes(word));
/** "19-20/x2" -> { threat: 19, mult: 2 }; "x3" -> { threat: 20, mult: 3 }; none -> null */
export function critParts(crit) {
  const m = /^(?:(\d+)-20\/)?x(\d)$/.exec(String(crit || ""));
  return m ? { threat: m[1] ? +m[1] : 20, mult: +m[2] } : null;
}
/** the bonus a kind gives on its opposed disarm rolls, both ways (the SRD's "+2... including the roll to avoid being
    disarmed if such an attempt fails"; the sai's +4) */
export const disarmOf = (name) => (kindHas(name, "disarm+4") ? 4 : kindHas(name, "disarm+2") ? 2 : 0);
/** the kinds the shops sell, in shelf order */
export const soldKinds = () => Object.keys(WEAPON_TABLE).filter((n) => WEAPON_TABLE[n].sold)
  .sort((a, b) => WEAPON_TABLE[a].sold - WEAPON_TABLE[b].sold);
