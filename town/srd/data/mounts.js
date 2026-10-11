/* MOUNTS, BY THE BOOK (v-cli-85, 2026-09-27; Rose: "make sure all of it is srd compliant").
   Every number below is transcribed from the Hypertext d20 SRD (d20srd.org, read 2026-09-27: monsters/horse.htm,
   pony.htm, ponyWar.htm, dogRiding.htm; skills/ride.htm), never typed from memory. Abilities run in the game's own
   order (data/heritage.js ABILITIES: STR, DEX, CON, INT, WIS, CHA). A creature the page marks with an asterisk
   ("secondary") attacks with half its Strength bonus and "does not normally use its hooves to attack".

   THE SHOP'S NAMES ARE PATHFINDER'S, THE ANIMALS ARE 3.5'S. data/goods.js prices the pens off Pathfinder's table by
   Rose's 09-02 ruling, which sells a horse "combat-trained" where 3.5 sells a separate creature bred for war. The two
   meet here: a combat-trained light horse IS the SRD's light warhorse, a combat-trained heavy horse its heavy warhorse,
   a combat-trained pony its warpony. What the rider may do follows the SRD's own line for each (`rider`), and the Ride
   DCs below are the skill's own table. The book's "unless he or she succeeds on a Ride check" reads "unless the rider
   succeeds" here: the game names no gender in a literal (tests/test_pronouns.mjs), and the rule is the same. */

import { loadedSpeed } from "./carry.js";

export const SRD_MOUNTS = {
    "Horse, Light": {
        size: "Large", hd: "3d8+6", hp: 19, init: 1, speedFt: 60, ac: 13, touch: 10, flatFooted: 12, bab: 2, grapple: 8,
        attacks: [{ name: "hoof", count: 2, bonus: -2, damage: "1d4+1", secondary: true }],
        spaceFt: 10, reachFt: 5, saves: { fort: 5, ref: 4, will: 2 }, abilities: [14, 13, 15, 2, 12, 6],
        skills: { Listen: 4, Spot: 4 }, feats: ["Endurance", "Run"], cr: 1, warTrained: false,
        loadsLb: { light: 150, medium: 300, heavy: 450, drag: 2250 },
        rider: "A light horse cannot fight while carrying a rider.",
    },
    "Horse, Heavy": {
        size: "Large", hd: "3d8+6", hp: 19, init: 1, speedFt: 50, ac: 13, touch: 10, flatFooted: 12, bab: 2, grapple: 9,
        attacks: [{ name: "hoof", count: 2, bonus: -1, damage: "1d6+1", secondary: true }],
        spaceFt: 10, reachFt: 5, saves: { fort: 5, ref: 4, will: 2 }, abilities: [16, 13, 15, 2, 12, 6],
        skills: { Listen: 4, Spot: 4 }, feats: ["Endurance", "Run"], cr: 1, warTrained: false,
        loadsLb: { light: 200, medium: 400, heavy: 600, drag: 3000 },
        rider: "A heavy horse cannot fight while carrying a rider.",
    },
    "Warhorse, Light": {
        size: "Large", hd: "3d8+9", hp: 22, init: 1, speedFt: 60, ac: 14, touch: 10, flatFooted: 13, bab: 2, grapple: 9,
        attacks: [{ name: "hoof", count: 2, bonus: 4, damage: "1d4+3" }, { name: "bite", count: 1, bonus: -1, damage: "1d3+1" }],
        spaceFt: 10, reachFt: 5, saves: { fort: 6, ref: 4, will: 2 }, abilities: [16, 13, 17, 2, 13, 6],
        skills: { Listen: 4, Spot: 4 }, feats: ["Endurance", "Run"], cr: 1, warTrained: true,
        loadsLb: { light: 230, medium: 460, heavy: 690, drag: 3450 },
        rider: "A light warhorse can fight while carrying a rider, but the rider cannot also attack unless the rider succeeds on a Ride check.",
    },
    "Warhorse, Heavy": {
        size: "Large", hd: "4d8+12", hp: 30, init: 1, speedFt: 50, ac: 14, touch: 10, flatFooted: 13, bab: 3, grapple: 11,
        attacks: [{ name: "hoof", count: 2, bonus: 6, damage: "1d6+4" }, { name: "bite", count: 1, bonus: 1, damage: "1d4+2" }],
        spaceFt: 10, reachFt: 5, saves: { fort: 7, ref: 5, will: 2 }, abilities: [18, 13, 17, 2, 13, 6],
        skills: { Listen: 5, Spot: 4 }, feats: ["Endurance", "Run"], cr: 2, warTrained: true,
        loadsLb: { light: 300, medium: 600, heavy: 900, drag: 4500 },
        rider: "A heavy warhorse can fight while carrying a rider, but the rider cannot also attack unless the rider succeeds on a Ride check.",
    },
    "Pony": {
        size: "Medium", hd: "2d8+2", hp: 11, init: 1, speedFt: 40, ac: 13, touch: 11, flatFooted: 12, bab: 1, grapple: 2,
        attacks: [{ name: "hoof", count: 2, bonus: -3, damage: "1d3", secondary: true }],
        spaceFt: 5, reachFt: 5, saves: { fort: 4, ref: 4, will: 0 }, abilities: [13, 13, 12, 2, 11, 4],
        skills: { Listen: 5, Spot: 5 }, feats: ["Endurance"], cr: 0.25, warTrained: false,
        loadsLb: { light: 75, medium: 150, heavy: 225, drag: 1125 },
        rider: "Ponies are otherwise similar to light horses and cannot fight while carrying a rider.",
    },
    "Pony, War": {
        size: "Medium", hd: "2d8+4", hp: 13, init: 1, speedFt: 40, ac: 13, touch: 11, flatFooted: 12, bab: 1, grapple: 3,
        attacks: [{ name: "hoof", count: 2, bonus: 3, damage: "1d3+2" }],
        spaceFt: 5, reachFt: 5, saves: { fort: 5, ref: 4, will: 0 }, abilities: [15, 13, 14, 2, 11, 4],
        skills: { Listen: 5, Spot: 5 }, feats: ["Endurance"], cr: 0.5, warTrained: true,
        loadsLb: { light: 100, medium: 200, heavy: 300, drag: 1500 },
        rider: "A warpony can fight while carrying a rider, but the rider cannot also attack unless the rider succeeds on a Ride check.",
    },
    "Dog, Riding": {
        size: "Medium", hd: "2d8+4", hp: 13, init: 2, speedFt: 40, ac: 16, touch: 12, flatFooted: 14, bab: 1, grapple: 3,
        attacks: [{ name: "bite", count: 1, bonus: 3, damage: "1d6+3" }],
        spaceFt: 5, reachFt: 5, saves: { fort: 5, ref: 5, will: 1 }, abilities: [15, 15, 15, 2, 12, 6],
        skills: { Jump: 8, Listen: 5, Spot: 5, Swim: 3, Survival: 1 }, feats: ["Alertness", "Track"], cr: 1, warTrained: true,
        loadsLb: { light: 100, medium: 200, heavy: 300, drag: 1500 },
        rider: "A riding dog can fight while carrying a rider, but the rider cannot also attack unless the rider succeeds on a Ride check.",
    },
};

/* the shop's row (data/goods.js MOUNTS) to the SRD creature it is. Camel and "Donkey or mule" are priced there and have
   no body yet, so they have no block here: nothing that cannot stand in the world is sold as a mount. */
export const SHOP_TO_SRD = {
    "Pony": "Pony",
    "Pony, combat-trained": "Pony, War",
    "Horse, light": "Horse, Light",
    "Horse, light (combat-trained)": "Warhorse, Light",
    "Horse, heavy": "Horse, Heavy",
    "Horse, heavy (combat-trained)": "Warhorse, Heavy",
    "Dog, riding": "Dog, Riding",
};

/* the SRD's Ride table ("Armor check penalty applies"), and its two modifiers: "If you are riding bareback, you take a
   -5 penalty on Ride checks" and "If your mount has a military saddle you get a +2 circumstance bonus on Ride checks
   related to staying in the saddle". Mounting or dismounting "normally is a move action"; a fast one is a free action
   on a DC 20 check, "on a mount of up to one size category larger than yourself". */
export const RIDE_DC = {
    guideWithKnees: 5, stayInSaddle: 5, fightWithWarhorse: 10, cover: 15, softFall: 15, leap: 15, spurMount: 15,
    controlMountInBattle: 20, fastMountOrDismount: 20,
};
export const RIDE_BAREBACK = -5;
export const MILITARY_SADDLE_STAY = 2;

/*,,. HOW FAST A MOUNT GOES UNDER WHAT IT CARRIES (Rose 2026-09-27: "srd is our bible in this case") ,,,
   Three rules, every one the SRD's (d20srd.org, read 2026-09-27: monsters/horse.htm, movement.htm, feats.htm):
   - ITS SPEED is its stat block's ("Speed: 60 ft." for a light horse), and a load takes it down the Mounts and Vehicles
     table: "Light horse or light warhorse 6 miles" an hour, "Light horse (151-450 lb.) 4 miles". That is 60 ft to 40,
     the same two-thirds column a body's own load uses (data/carry.js loadedSpeed), and it answers every row of the
     table: 50 to 35 ("3 1/2 miles"), 40 to 30 ("3 miles").
   - THE LOAD is the mount's own ("A light load for a light horse is up to 150 pounds; a medium load, 151-300 pounds;
     and a heavy load, 301-450 pounds"), and what it carries is the rider and everything the rider carries.
   - ITS RUN: the horses have the Run feat, "When running, you move five times your normal speed (if wearing medium,
     light, or no armor and carrying no more than a medium load) or four times your speed (if wearing heavy armor or
     carrying a heavy load)"; without it (a pony, a riding dog), "four times ... or three times". The world's run
     constant is the four-times run, so `runMult` is 5/4 over it (4/4 under a heavy load) with the feat, and 1 (3/4)
     without, as the Run feat is 1.25 on her own run (void.js herRunMult).
   Past a heavy load it does what a body does (the lifting rule, carry.js): staggers, five feet, and no run. */
export function mountPace(stats, carriedLb) {
    const s = stats || {};
    const L = s.loadsLb || {};
    const lb = Math.max(0, +carriedLb || 0);
    const load = !(L.light > 0) || lb <= L.light ? "light" : lb <= L.medium ? "medium" : lb <= L.heavy ? "heavy" : "over";
    const base = s.speedFt || 0;
    const ft = load === "over" ? 5 : load === "light" ? base : loadedSpeed(base);
    const runFeat = (s.feats || []).includes("Run");
    const runMult = load === "over" ? 0 : runFeat ? (load === "heavy" ? 1 : 1.25) : (load === "heavy" ? 0.75 : 1);
    return { ft, load, runMult, lb };
}

/* THE MOUNTS THAT HAVE A BODY IN THE WORLD (stage C, v-cli-85 2026-09-27): the four horses, all of them Daz Horse 3
   (data/creatures.js "Horse"; world/mounts.js stands them). The pony and the riding dog have stat blocks above and no
   model yet, and nothing that cannot stand in the world is sold as a mount (data/goods.js MOUNT_STOCK). */
export const WITH_BODY = new Set(["Horse, Light", "Horse, Heavy", "Warhorse, Light", "Warhorse, Heavy"]);
export const hasBody = (name) => WITH_BODY.has(SHOP_TO_SRD[name] || name);

/** The SRD block for a shop row, or for an SRD name given directly; null for anything that has none. */
export function mountStats(name) {
    if (!name) return null;
    return SRD_MOUNTS[SHOP_TO_SRD[name] || name] || null;
}
