# Hollow Town: additions to sim.js

`sim.js` here is your latest `sim.js` with the additions below. `sim-changes.diff` shows
exactly what changed (38 lines changed, about 470 added). To use it, copy `sim.js`
over the one in your town folder.

Everything is a tool or an option. Nobody is told to use any of it.

## 1. Alarm spell

- **Who:** wizards and sorcerers, from the same daily slots as magic missile.
  It can be cast outside a fight.
- **AI command:** `cast alarm [at <place>]`. With no place, it's cast where the
  caster stands.
- **How it works (SRD):** the ward lasts 2 hours per caster level. When a beast
  comes within 20 ft, it rings out and everyone asleep within 60 ft wakes.
  Everyone awake in earshot remembers it.
- **Plain brains:** offered from 19:00, at the spot where they'll sleep.
  It's weighed like the barricade (2 + caution x 3), with +2 at bedtime.
- **Code:** `castAlarm()` and `checkWards()`, next to `nightWatch()`. The step
  loop checks wards every step.

## 2. Shelter

- **1 sp** now buys a cot plus a hot meal (stew and bread, the same as the
  tavern's meal).
- **Free** if you bring meat or fish you caught: they cook it for you and the
  cot costs nothing.
- People with meat or fish but no coin can now head for the shelter instead
  of the fields.
- The AI's no-home prompt says so.

## 3. Parties

- **Unlimited size:** gathering a party no longer stops at 3 (hunts, ambushes)
  or 2 (caravan escorts). Size is now limited only by who is near, willing,
  and affordable.
- **Formations:** a party's leader chooses one with
  `formation <column | line | wedge | ring | loose>`.
  - Followers keep their slot around the leader, turned to the leader's heading.
  - `loose` is the old way: stay close.
  - If a slot is blocked (a wall, a doorway), they just stay close.
- **Plain leaders:** they pick one at random when the party comes together.
  The plain brains can't learn which formation is better yet: every formation
  is the same kind of choice to them.

## 4. Talking

- **Babble is tidied:** "I", names, sentence starts and times ("22:00") are
  fixed.
- **Babble is checked:** a line is only said, or kept as a phrase, if it has at
  least four words, ends a sentence, and never says the same two words twice
  (no more "no roof and no roof").
- **Saying what they're doing:** when a plain brain starts a talk, or is asked
  what they're doing, it may say its real plan. Examples:
  - "I'm working on the palisade at the Wildwood edge. It stands at 175 of 250."
  - "I'm taking a cot at the shelter tonight."
  - "A bear, close by! Get behind a door!"

  Listeners aren't told to do anything about it.

## 5. Deputies

- **Who:** any guard can deputize anyone willing with
  `deputize <name> [melee | ranged]`. Plain guards are offered it too.
- **Who accepts:** their own nature decides (loyalty, aggression, caution, how
  much they like the guard, and whether beasts are about). A "no" stands for
  4 hours, and a plain guard waits 30 minutes between asks.
- **The kit:** lent from the Guard station's loan rack, only where it beats
  what the deputy already has.
  - Melee: longsword or spear, plus a light shield with a one-handed weapon.
  - Ranged: light crossbow or short bow, with 20 bolts or arrows.
  - Armour: chain shirt or leather.
- **The mayor can stock the rack** (see 9), and deputies borrow the best of
  whatever is on it.
- **The rack starts with:** 2 longswords, 4 spears, 3 light crossbows,
  1 short bow, 60 bolts, 20 arrows, 2 chain shirts, 4 leather armours and
  2 light shields. These numbers are set in `sim.rack`.
- **The loan ends** after 8 hours, on `stand down` or `return the gear`, or if
  the deputy is jailed. The kit goes back on the rack and they wear their own
  again. A deputy who dies drops the town's kit where they fall.
- **While deputized,** they count with the militia in the existing rules:
  they run at the beast when the bell rings, and have more nerve in a fight.
- **The AI is told** the rack's contents (guards) or their deputy status
  (deputies).

## 6. Palisades

- **More hands, faster:** everyone working the same stretch speeds each other
  up, counting up to 5 people. With 5 on it, each works 5x as fast.
  It's still 3 wood per 25 points.
- **In front of houses:** a palisade can go in front of a house, or a building
  people sleep in (the shelter, the three barracks, the Cellar).
  - AI command: `build a palisade in front of <place>`.
  - 3 wood and 2 hours a section, 25 points a section, up to 100.
  - A beast has to batter it down before it reaches the barricade and the door.
- **Plain brains** are offered it for wherever they sleep, and want wood for it.

## 7. Seeing and shooting over the palisade

- Open-air places can now see each other (`sameSpace`), within normal sight
  range and darkness. An archer in the fields can see, and shoot, a beast in the
  Wildwood or at the palisade.
- The palisade still gives the target +4 cover in a fight (`coverOf`), as a
  half wall does in the SRD.

## 8. Traps: the criminal guild's trade

The 15 SRD 3.5 sample mechanical traps that suit a town, with SRD stats: CR,
trigger, reset, attack or Reflex save, damage and crit, Search DC, Disable
Device DC and market price.

- **Included:** basic arrow, camouflaged pit, deeper pit, fusillade of darts,
  razor-wire, rolling rock, scything blade, spear, swinging block, wall blade,
  javelin, large net, 40-ft pit, spiked pit, and well-camouflaged pit.
- **Left out:** poison traps (no poisons in the sim), magic traps, and dungeon
  traps (portcullis, bricks from the ceiling, brown mold).
- **Building:** a Craft (trapmaking) check against the SRD DC (20, +5 for a
  proximity trigger, +5 for an automatic reset). Fail by 5 or more and half the
  materials are ruined.
- **The guild's specialty:** guild members (underworld or gang) have trapmaking
  ranks of level + 3, plus masterwork tools (+2). Anyone else builds untrained.
- **Time and cost are scaled down** (my choice; the SRD takes weeks and
  thousands of gold):
  - Hours: 2 + 2 per CR, +2 for proximity or automatic reset, +1 per 10 ft of
    pit.
  - Parts: market price in gp / 20, in copper, plus the wood, stones and
    weapons the trap is made of.
- **Triggers:**
  - Location: a 5-ft square. Large beasts fill more ground.
  - Proximity: 10 ft.
  - Touch: on a door.
  - Traps are checked along the whole path walked, so passing over one counts.
- **Noticing a trap:** Search uses Spot. Only rogues can find a trap with a
  Search DC over 20.
- **Effects:**
  - Pits: Reflex save, falling damage, and spikes as daggers. You're stuck for a
    while. Running means no save.
  - Nets: Reflex DC 14 or caught; burst Str DC 25 or Escape Artist DC 20, a
    minute at a time.
- **Resets:** manual, automatic, none, or repair (a Craft check and a fifth of
  the parts).
- **Disarming:** Disable Device uses Open Lock. Fail by 5 or more and it goes
  off on you.
- **Who knows where a trap is:** the setter, the guild, residents (for a trap on
  their door), and anyone who spots it or gets caught. People who know walk
  around it.
- **Crime:** a guild trap that hurts a townsperson counts as the guild's
  assault.
- **Plain guild members** set traps just inside the gap where the Wildwood path
  comes through the palisade, reset sprung ones, and want wood for them.
  Plain guards disarm guild traps they know of.

## 9. The guild's shop and the mayor's supplies

- **The guild is a shop:** `order a <trap> at <place>` in the Cellar. The price
  is the market price in gp / 10, in copper, paid up front. The money is held
  until a guild member sets the trap, then goes to whoever set it.
  The guild supplies the materials.
- **The mayor can order traps** for the town from the treasury with
  `"traps": [{"trap": ..., "at": ...}]`.
  - Town traps are known to the guards, the deputies and the mayor.
  - A commissioned trap isn't counted as the guild's assault.
  - A plain mayor orders a spiked pit for the fields once beasts have come,
    if the treasury can bear it.
- **The mayor's supply orders (`arm`) now cover:**
  - `"deputies"`
  - `"everyone"`
  - `"rack"`: buys into the Guard station's loan rack, only what the shop has
    on hand.
