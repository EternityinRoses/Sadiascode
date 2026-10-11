// THE SRD BRIDGE (Rose: "we're just bringing the rules not the whole game"). Hollow Town is a training playground for
// Legends of Harpine; its fights are rolled by LoH's own rules, copied read-only into town/srd/ (.backups/loh_bring.js).
// This ES module puts the parts sim.js uses on globalThis.SRD; sim.js falls back to its old rough rules until it loads.
import { attackRoll, rollDamage, damageDiceOf, isRanged } from './srd/rules/attack.js';
import { kindOf, critParts, WEAPON_TABLE } from './srd/data/weaponTable.js';
import { IMPROVISED_THROW, stoneShotOf, pullsBlows, pullTollOf, rangeIncrementOf, maxRangeOf, gripOf } from './srd/rules/weapons.js';
import { monkFistAt } from './srd/rules/classes/monk.js';
import { proficientWith, CLASS_WEAPONS, NONPROFICIENT } from './srd/data/proficiency.js';
import { roll, d20 } from './srd/rules/dice.js';

const SRD = { attackRoll, rollDamage, damageDiceOf, isRanged, kindOf, critParts, WEAPON_TABLE, IMPROVISED_THROW, stoneShotOf,
  pullsBlows, pullTollOf, rangeIncrementOf, maxRangeOf, gripOf, monkFistAt, proficientWith, CLASS_WEAPONS, NONPROFICIENT, roll, d20,
  from: 'Legends of Harpine (D:/Sadias Canvas/src)' };
globalThis.SRD = SRD;
export default SRD;
