# Hollow Town: additions to sim.js

`sim.js` here is your latest `sim.js` with the additions below. `sim-changes.diff` shows
exactly what changed (39 lines changed, about 485 added). To use it, copy `sim.js`
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
- **The boss can put the crew to trap work** through `crew_orders`:
  `set a <trap> at <place>` or `fill orders`. The boss pays for the parts.

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

## 10. A mayor from day one

The town no longer starts with the office empty. At 07:00 on day 1, someone
picked at random from the jobless adults is named mayor until the first
election, which still comes on day 2.

## 11. Blood, traits, flaws, feats and the full armoury (from LoH's data, kept basic)

Copied as plain tables from `heritage.js`, `traits.js`, `featPool.js`/`feats.js`,
`weaponTable.js` and `armourTable.js`. No LoH engine is pulled in: everything is
a flat number ("x weapon does x damage").

- **Blood.** Each townsperson (not the player) is born of a mother and a father,
  each a race (Human 55%, Elf/Shade/Cambion 15% each; 70% of couples share a race)
  and a line. The child is that race or a half-blood, takes both lines' ability
  changes, sees in the dark as the blood allows (half for a half-blood), and walks
  at the lines' pace.
- **Offers, not freebies.** A parent's bloodline or racial feat is *offered* at
  first level and costs a feat slot. A pure human gets a bonus feat.
- **Traits and flaws** (Restless, Ironhide, Fleet, Devout, Moontouched, Honeyed;
  Frail, Clumsy, Dim, Palsied, Unsteady, Vulnerable, Oblivious, Graceless, Witless,
  Off-Putting, Distractible) as plain modifiers. Each flaw owes one extra feat
  slot. Feral is left out because the town runs on talk.
- **Feats.** The whole pool (118 feats) can be picked if its plain prerequisites
  are met (BAB, abilities, feats, class levels, casting, dark sight, natural
  weapons). Weapon feats aim at the weapon carried when taken. Feats with a
  town effect: skill bonuses, Improved Natural Armor, Greater Weapon
  Focus/Specialization, Improved Critical, Weapon Finesse, Far Shot, Run,
  Fast Healer, the affinities, Troll-kin (regen 1), Ethnocentric, Nobility,
  Giant Grip, Barbaric, Night Owl, Tracking, Shadow Strike, Masochism / Dream
  Eater (+1 hp per hit), Riven Hands (claws), Riven Jaw / Barbed Tail (extra
  natural attacks). The others can be held but do nothing yet (mounts,
  metamagic, ...).
- **Weapons and armour.** The other 41 LoH weapons (thrown-only ones like dart and
  net are left out) and Splint mail are added to the shop and forge tables.
- **AI.** The prompt tells each AI their blood, parents, dark sight, traits and
  flaws. At first level it lists what their blood offers (with text), plus the
  names of the other feats they qualify for. They answer `"feats": [...]`.

## 12. No hints: the town learns on its own

Nothing tells the townsfolk what is coming any more. They have to see it for themselves or remember it.

- **Prompt.** The line "Beasts come every night at 22:00, and on the last night a
  troll and two bears" is gone. The goal (win at noon on the last day; 6 deaths
  fails the town) stays.
- **Town memory.** End-of-generation summaries now hold only what was recorded
  (who died, to what, where, what they were doing, what killed what). The
  written-in conclusions are gone: "hunted people by scent, even asleep in their
  houses", "the ones who rested at the Infirmary mostly lived", "food and coin for
  it mattered". Old `lore.json` files have those sentences stripped when loaded.
- **Tool texts** describe what the tool does, not what's coming: barricade
  ("anyone getting in must batter it down"), alarm bell, Alarm spell ("anything
  wild"), militia, the homeless note, defences, leatherworker.
- **Plain brains.** The day-one wood bonus ("the town knows the beasts come at
  22:00") and the smith's default fear are gone. Both now depend on beasts
  actually having been seen.

## 13. The work week: XP for work, training, crafting, loans, banks, caravans, aimed shots, orders

**XP (SRD table: level 2 at 1,000, 3 at 3,000, 4 at 6,000, 5 at 10,000).** The AI sees its XP and "+N XP" when it
grows, never why, and never the thresholds. Rates per hour of doing something (my numbers, tuned against your targets):
- Training hall, guards and deputies, 6:00-18:00: 375. It gives nothing past 3,000, and nobody is told that.
  A full day, meals included, reaches 3,000.
- Building (chopping, barricades, palisades): 350. A barricade from nothing (an hour's chopping, three 40-minute
  sections) comes to about 1,040, which is level 2.
- Everything else that isn't idling, crime included: 95. A busy day to 18:00 just reaches 1,000.
- Caravans: 1,000 for everyone on a trip that comes home whole, 500 if robbed.
- Giving to the poor earns no XP. The 100 XP for surviving a night is gone ("not just sleeping").

**Wood and building.** Chopping gives 9 wood an hour (15 with an axe). Barricades, the palisade and the
palisades in front of buildings take 40 minutes a section.

**Training hall** behind the Artillery barracks. **Bank** behind the town hall, plus a counter in Marrowford. Deposits
earn 1% a day at midnight (my rate). The mayor can bank the treasury.

**Workshops (SRD Craft, by the day).** Each hour of work makes a check: d20 + the best hand's craft + 1 per worker
(up to 8) against the DC. Fail by 4 or less and the hour is lost; fail by 5 or more and half the materials are
ruined and paid again. Each worker adds a share of the work. Anyone can "help at the smithy / apothecary".
- Smithy: every weapon, armour and shield, including the SRD's full shield list. +1 pieces take 3 hours, +2 take 6,
  at SRD prices (masterwork + enhancement). It starts with 5 of every mundane piece and 10 bundles of each
  ammunition.
- Apothecary: brews by the hour too (healing draughts, healer's kits, alchemist's fire), plus potions of bull's
  strength and cat's grace (+4 for 9 minutes) and cure moderate wounds (2d8+3) at 2 hours each.
- Fixed: LoH's arrows, bolts and sling bullets had come in as melee weapons.

**Commissions on loan.** The mayor or the guard captain can commission stock from the smithy or the apothecary.
The finished items go to the Guard station's rack. Anyone can pay toward the debt; the mayor can repay from the
treasury. Debt left at 12:00 on day 8 (and every 7 days after) fails the town. The only thing the AI is told
about the deadline is your line: "All commissions have to be paid off by 12:00 on day 8 after each work week."
SRD prices are huge for this town (a longsword +1 is 2,315 gp).

**Caravans.** "caravan [items]": the smith can load the smithy's stock, and the mayor or captain the town's rack.
Marrowford pays full price for weapons, armour and shields, and the town taxes the sale. A round trip takes about
half a day. Bandits from either town may strike on the road (40% a leg, my number; 2-4 of them, most fighting
nonlethal to take the goods). If they beat the caravan they take the cargo and the purse. The AI isn't told any
of this.

**The 60 ft rule.** Anyone awake within 60 ft of a fight decides at once whether to join: AI townsfolk are
asked on the spot, plain ones re-weigh their options. Joining puts them in the initiative order straight away.
Moving still follows the fight's rules (30 ft a move, 20 ft in medium or heavy armour).

**Aimed shots** (bows, crossbows, slings):
- Eyes: -8 to hit. Each hit takes an eye; both make the target blind (50% miss, -2 AC) until magically healed.
- Throat: -6. Silenced: no spells, no shouting.
- Arms: -4. Spells fail 50% of the time; -4 to hit and damage.
- Legs: -4. Half speed.
- Feet: -6. Pinned in place for 1d4 rounds.

Effects other than eyes and feet last a minute (10 rounds). An AI picks "aim" in its fighting style.

**Ready actions.** "Ready" an attack that goes off at the first foe who comes into reach (or a bow's range),
including against a charge. It lasts until your next turn.

**The captain's orders.**
- Anyone can choose "follow_captain": true or false.
- Outside fights, the captain's "barks" become the plans of listeners within 60 ft.
- In a fight, the captain can bark every round. It costs their standard and bonus action, not the move, and
  reaches every listener within 60 ft.
- Listeners whose turn comes after the captain's follow that round's bark, and can't attack until a bark comes.
- Listeners whose turn comes first act on their own judgement, or "wait" to move their turn to just after the
  captain's (SRD delay).
- Care (stabilizing, a draught, a cure) is never held back.
- When the captain dies, it is every one for themselves for the rest of the generation.

**Skills.** At first level and on levelling, an AI can spend SRD skill points ("skills": {"hide": 4, ...}).
Points are class base + Int (×4 at first level, +4/+1 for a pure human). Class skills cost 1 a rank; others
cost 2, up to half the cap.

### Battle test (tools/battle.mjs, 12 nights each)
| Night | No preparation | Basic squad | Full squad | Full squad + fire |
|---|---|---|---|---|
| A bear | 83% won, 3.9 dead | 58%, 4.3 dead | 75%, 5.1 dead | 75%, 6.1 dead |
| The troll and two bears | 0% won, everyone dead | 17%, 22 dead | 75%, 6.5 dead | **92%, 3.9 dead** |

The full squad: six level-3 fighters in full plate +1 with heavy shields +1 and longswords +1 behind a full
palisade, six rangers with longbows +1 aiming at legs, feet and arms, three clerics with potions, and the
captain barking. "Fire" adds two flasks of alchemist's fire each for the tanks and archers. Against the troll it works.
Against a single bear the squad does no better than staying indoors: standing at the palisade puts people in
reach of something that would otherwise have to break a door.

### Later the same day
- **Craft is a skill with ranks** (an Int skill, a class skill for every class). The smiths and the alchemist
  start with ranks in their trade (smith and alchemist 4, journeyman 3, apprentice 1), and AIs can spend points
  on it. A workshop's check is d20 + the owner's craft ranks + what their feats add - what their flaws (Witless:
  -4) and hunger take + 1 per helper (up to 8). When the owner isn't there, the most skilled hand leads. The
  smithy favours applicants with craft ranks, and plain townsfolk with ranks lean towards helping at the workshops.
- **Commissions aren't a dead end.** The town can sell gear and resources in Marrowford to pay them off.
- **Meat by the animal:** rabbit and pheasant 1, wolf 3, deer 8, dire wolf 8, boar 10, bear 25.
- **Marrowford trades in resources both ways:** food, wood, pelts, iron, grain, rope, potions and so on.
  "caravan 20 wood, 2 bear pelt; buy 10 grain, 5 iron" sells the first list and brings the second home.
- **Fixed:** a caravan leader who got thirsty was put back on the road every moment and never reached water.
  The smith's old caravan instinct (always "12 pieces to export") pulled the smith off the forge every morning.
  It now counts real surplus.
