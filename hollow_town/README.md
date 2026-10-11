# Hollow Town: alarm, shelter, parties, talk

`sim.js` here is your latest `sim.js` with four additions. `sim-changes.diff` shows
exactly what changed (16 lines changed, about 140 added). To use it, copy `sim.js`
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
