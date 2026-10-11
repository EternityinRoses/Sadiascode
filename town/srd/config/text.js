/* ============================================================================
   THE GAME'S WORDS, BY NAME (Rose 2026-10-01: "this goes for everything else too like descriptions, and anything that
   is to be changed on the fly. Its just easier to use $lohSEDice1 and a module for it than updating 7 files").

   The library of player-facing words that were written in many places, each one line to change. Code asks for a key,
   never the words. Its twin for sound is config/sounds.js. There is no cue layer here: a word is chosen by the
   sentence it sits in, so the code names the word it needs.
   tests/test_textTable.mjs holds it honest: every key the code asks for is here, and every value is words.
   Written by Vera.
   ========================================================================== */

/* THE LIBRARY */
export const TEXT = {
  /* a body whose name she does not know: void.js shownNameOf answers nothing, and each line keeps its own word */
  $lohTXSomeone: "someone",              // mid-sentence
  $lohTXSomeoneStart: "Someone",         // at a line's start
  $lohTXThey: "They",                    // at a line's start, where a sentence goes on about it
  $lohTXThem: "them",                    // mid-sentence, as the one spoken with
  $lohTXTheRevenant: "The revenant",     // a body from another world
  $lohTXTheBody: "the body",             // a body struck where it stands
  $lohTXASeat: "a seat",                 // a seat in her summon list
  $lohTXIt: "it",                        // a thing or a body in a list
  /* THE COUP DE GRACE (rules/maneuvers.js; battle.js and void.js speak these alike; sadia 2026-10-01): {name} the body finished,
     {by} who strikes, {foe} a foe standing over the striker */
  $lohTXCoupNotHelpless: "{name} is not helpless.",
  $lohTXCoupNotMelee: "A coup de grace takes a melee weapon, or a bow or crossbow held at arm's length.",
  $lohTXCoupOutOfReach: "{name} is out of reach.",
  $lohTXCoupCritImmune: "{name} is immune to critical hits and cannot be given a coup de grace.",
  $lohTXCoupFist: "It takes a lethal blow to finish anyone.",
  $lohTXCoupThreatened: "{foe} stands within reach of you: a coup de grace here would hand it a free swing.",
  $lohTXCoupBlow: "{by} delivers a coup de grace to {name}: {expr} = {dmg}.{note}",
  $lohTXCoupBlowSaid: "{by} delivers a coup de grace to {name}.",
  $lohTXMinDamage: "A hit always deals at least 1 point of damage.",
  /* A FOE PAYS ONCE (move XP1, rules/spoils.js; void.js onSpoils): {names} the foes of a won fight already defeated before */
  $lohTXSpoilsAlready: "{names}: already defeated, no experience.",
  $lohTXSummonTitle: "SUMMON",
  $lohTXSummonAsk: "Which creature answers the call?",
  $lohTXSummonBack: "go back",
  $lohTXSummonArrives: "A {coat} {name} answers the call! It fights for {n} rounds.",
  $lohTXSummonArrivesPlain: "A {name} answers the call! It fights for {n} rounds.",
  $lohTXSummonAlready: "Your summoned creature is already fighting.",
  $lohTXReadySummon: "{name} readied. Click open ground within {ft} ft. Full round casting.",
  $lohTXReadyPhase: "{name} readied. Click open ground within {ft} ft: a teleport, using the move action.",
  $lohTXAimHelp: "Aiming: the mouse aims, {breath} or the right button steadies it, a click looses, {step} step a square, Esc lowers the bow.",
  $lohTXAimNoLine: "No clear line to {name}",
  $lohTXSummonNoBody: "{spell}: it cannot be cast here, there is no creature here to summon. You keep the slot and the round.",
  $lohTXSummonFights: "your summoned creature already fights",
  $lohTXCoupFortNote: "Fortification {pct}%: d100({roll}), no vitals found, the blow lands plain.",
  $lohTXCoupSneakNote: "Sneak attack: +{n}.",
  $lohTXCoupResist: "{name}'s resistance blocks {soaked} of the {type} damage.",
  $lohTXCoupKills: "{name} does not survive the blow ({hp} hp).",
  $lohTXCoupKillsSaid: "{name} does not survive the blow.",
  $lohTXCoupSave: "{name} Fortitude save: d20({raw}){bonus} = {total} vs DC {dc} → {verdict}",
  $lohTXCoupSurvives: "survives.",
  $lohTXCoupDies: "dies.",
  $lohTXCoupTitle: "Coup de grace",
  $lohTXCoupCardSave: "Fortitude {total} vs DC {dc}",
  /* a coup the troll blood holds, on its card (void.js worldCoup): what the held card says (injuryStart); {hp} where it stopped */
  $lohTXCoupCardHeld: "held at {hp}",
  $lohTXCoupCardDiehard: "Diehard, as disabled",
  /* the night's words on a body's fatigue (void.js restRowsOf, effects step 3a-3), said only when it went to sleep tired */
  $lohTXRestRested: "The night's rest ends your fatigue.",
  $lohTXRestEased: "The night's rest eases your exhaustion: you wake fatigued.",
  $lohTXRestStillFatigued: "You wake still fatigued.",
  $lohTXRestStillExhausted: "You wake still exhausted.",
  /* a night in medium or heavy armour (void.js restRowsOf, A8): the piece named, as it is worn */
  $lohTXRestArmour: "You slept in your {armour} and wake fatigued.",
  $lohTXRestArmourExhausted: "You slept in your {armour} and wake exhausted.",
  /* before her night, when her armour would tire her (void.js askArmourOff, A8b): the piece named as she wears it */
  $lohTXRestArmourAsk: "Take off your {armour} for the night?",
  $lohTXRestArmourAskNote: "Asleep in it, you wake fatigued. It is back on when you wake.",
  /* up onto a horse by its clips (void.js, the rider road, the motion cog 1b-ii): no side to get to, a seat on its way */
  $lohTXRideNoSide: "You cannot get to the horse's side.",
  $lohTXRideGoing: "You go to the horse's side to get up.",
  $lohTXRideOnTheWay: "You are already on your way up.",
  /* THE TORCH ON KNITTING FLESH (S2; rules/maneuvers.js trollRecall, battle.js burnKnitter, void.js worldCoup; sadia 2026-10-02):
     {name} the striker, {raw} its die, {bonus} its signed bonus, {total}, {dc}, {verdict} one of the two after it; the
     brand's {by} the striker and {name} the body */
  $lohTXTrollRecall: "{name} sees the wounds closing. Knowledge (nature): d20({raw}){bonus} = {total} vs DC {dc} → {verdict}",
  $lohTXTrollRecallSaid: "{name} sees the wounds closing: {verdict}",
  $lohTXTrollRecallYes: "they remember that fire stops it.",
  $lohTXTrollRecallNo: "they do not know how to stop it.",
  $lohTXTrollUntrained: "{name} sees the wounds closing, but has no training in Knowledge (nature) to know what stops them.",
  $lohTXTrollKnown: "{name} sees the wounds closing, and knows that fire stops them.",
  $lohTXTrollStillNot: "{name} sees the wounds closing, and still does not know what stops them.",
  $lohTXTorchBrand: "{by} brings a torch down on {name}!",
  /* THE BRAND'S TWO PARTS (rules/maneuvers.js brandWork; battle.js coupDeGrace and void.js worldCoup; sadia 2026-10-03, Rose: "Only
     the fire wounds"): {expr} the steel's dice and multiplier, {n} its damage, {type} its type; the fire's {n} a plain hit's,
     {mult} the multiplier, {dmg} the coup's. A seat's whole line: {work} the two parts said, {dmg} what wounds */
  $lohTXBrandSteel: "{expr} = {n} {type}",
  $lohTXBrandHeld: ", which the blood closes",
  $lohTXBrandFire: "{n} fire ×{mult} = {dmg} fire",
  $lohTXBrandBlow: "{by} delivers a coup de grace to {name} with the torch: {work}. {name} takes {dmg}.{note}",
  /* THE BULL RUSH'S STRAY SWING (6c-1, battle.js; SRD Bull Rush: "a 25% chance of accidentally targeting the defender
     instead"): {by} the swinger, {meant} the body it swung at, {name} the body it struck */
  $lohTXStraySwing: "In the crush, {by}'s swing at {meant} falls on {name} instead!",
  /* DELAY (step 3d; battle.js, hud.js, ui/table.js and ally.js speak these; sadia 2026-10-01): {name} the body that
     waits, {after} the body it acts after; the tile's two lines keep pron's slots ({s}, {p}, {P}, {chooses}, {has}) */
  $lohTXDelayDesc: "Step aside in the count and act later this round: right after a body {s} {chooses}, or at the round's end. {P} place in the count stays there for the rest of the fight.",
  $lohTXDelayRider: "Only before {s} {has} done anything this turn.",
  $lohTXDelayNoFight: "Only in a fight.",
  $lohTXDelayNotNow: "There is no turn to delay.",
  $lohTXDelayActed: "A delay comes before acting, and something has already been done this turn.",
  $lohTXDelayNobody: "Nobody acts later in this round.",
  $lohTXDelayNotAfter: "{name} does not act later in this round.",
  $lohTXDelayWaits: "{name} waits, to act right after {after}.",
  $lohTXDelayWaitsEnd: "{name} waits, to act at the end of the round.",
  $lohTXDelayResumes: "{name} takes the delayed turn.",
  $lohTXDelayTitle: "DELAY",
  $lohTXDelayAsk: "Act later this round, and keep that place in the count for the rest of the fight. Act right after:",
  $lohTXDelayEnd: "the end of the round",
  $lohTXDelayBack: "go back",
  $lohTXDelayPrompt: "DELAY <name>: act right after that body this round. DELAY END: act at the end of the round. DELAY WAIT: wait, and decide before each later turn whether to act then. Only before you have done anything this turn, and your place in the count stays where you act for the rest of the fight.",
  /* DELAY'S SECOND FORM (step 3d-2; battle.js, hud.js and ally.js speak these): {name} the body that waits, {next} or
     {before} the body whose turn comes next */
  $lohTXDelayWaitRow: "wait and decide",
  $lohTXDelayWaitsLater: "{name} waits, to act later.",
  $lohTXDelayNoWaitSurprise: "In the surprise round a delay names its count: a body to act after, or the round's end.",
  $lohTXDelayWaitTitle: "WAITING",
  $lohTXDelayWaitAsk: "{name} is waiting. Act now, before {next}'s turn?",
  $lohTXDelayWaitAct: "act now",
  $lohTXDelayWaitKeep: "keep waiting",
  $lohTXDelayComesIn: "{name} stops waiting, and acts before {before}.",
  $lohTXDelayStillWaits: "{name} keeps waiting.",
  $lohTXDelayDeciding: "{name} is deciding whether to act now…",
  $lohTXDelayLapses: "{name} waited until the count came back round: the delay lapses, and {name} takes the regular turn.",
  $lohTXDelayRailMark: "Waiting: a delayed turn, to be taken between two others",
  $lohTXDelayWaitBrief: "You are {name}, and you chose to wait (DELAY WAIT). Between turns you may come in and act. ANSWER WITH ONE WORD, either ACT or WAIT. Nothing else, no reasoning.",
  $lohTXDelayWaitNext: "{next}'s turn is next. ACT to act now, before it; WAIT to keep waiting. If you wait until your own place in the count comes round again, you take your regular turn there.",
  /* READY (step 3e-1; battle.js, hud.js, ui/table.js and ally.js speak these; sadia 2026-10-01): {name} the body that
     readies, {target} or {caster} the caster it waits on, {weapon} what it strikes with, {ft} the distance; the tile's two
     lines keep pron's slots ({s}, {p}) */
  $lohTXReadyDesc: "Hold {p} attack for a moment: a foe starting a spell, a foe {s} name acting, or any foe attacking {p} friend. When it comes, {s} strike first, before it, and {p} place in the count moves to just ahead of that foe. A wound may cost a caster its spell.",
  $lohTXReadyRider: "A standard action. It lasts until {p} next turn. A spell aimed at a friend counts as a foe starting a spell, not as an attack.",
  $lohTXReadyNoFight: "Only in a fight.",
  $lohTXReadyNotNow: "There is no turn to ready in.",
  $lohTXReadyNoCaster: "No foe here casts spells: there is nothing to ready against.",
  $lohTXReadyNotCaster: "{name} casts no spells: there is nothing to ready against.",
  $lohTXReadyNoFoe: "No foe stands against you: there is nothing to ready against.",
  $lohTXReadyNotFoe: "{name} is no foe of yours: there is nothing to ready against.",
  $lohTXReadyNoFriend: "No friend of yours is in this fight: there is no one to guard.",
  $lohTXReadyHeld: "{name} readies an attack against {target}: the moment {target} starts casting a spell, {name} strikes first.",
  $lohTXReadyHeldActs: "{name} readies an attack against {target}: the moment {target} acts, {name} strikes first.",
  $lohTXReadyHeldGuard: "{name} readies an attack: the moment a foe attacks one of {name}'s friends, {name} strikes it first.",
  $lohTXReadyAskWhen: "Hold an attack until a moment comes, before your next turn. When:",
  $lohTXReadyWhenCasts: "a foe starts a spell",
  $lohTXReadyWhenActs: "a foe I name acts",
  $lohTXReadyWhenGuard: "a foe attacks a friend",
  $lohTXReadyAskActs: "Hold an attack for a foe. The moment it acts, before your next turn, you strike first. Against:",
  $lohTXReadyTitle: "READY",
  $lohTXReadyAsk: "Hold an attack for a caster. The moment it starts casting a spell, before your next turn, you strike first. Against:",
  $lohTXReadyBack: "go back",
  $lohTXReadyFireTitle: "READIED ATTACK",
  $lohTXReadyFireAsk: "{caster} starts casting a spell. Strike now with {weapon}, before the words are out?",
  $lohTXReadyFireTriggered: "Your ready has triggered.",
  $lohTXReadyFireAskActs: "{target} is about to act. Strike now with {weapon}, before it does?",
  $lohTXReadyFireAskGuard: "{target} attacks {friend}. Strike {target} now with {weapon}, before the blow?",
  $lohTXReadyFireStrike: "strike",
  $lohTXReadyFireHold: "hold the ready",
  /* HER YES-OR-NO BOXES CLOSE BY THEMSELVES (Rose 2026-10-01: "15 second time out"): what each box says of its wait, and
     the log's line when the wait runs out (silence means swing, or strike, as it does for a seat) */
  $lohTXReadyFireSilence: "If you say nothing in {s} seconds, you strike.",
  $lohTXReadyFireTimedOut: "{name} did not answer in {s} seconds: the readied attack is struck.",
  $lohTXAooSilence: "If you say nothing in {s} seconds, you swing.",
  $lohTXAooTimedOut: "{name} did not answer in {s} seconds: the free swing is taken.",
  /* THE TURN'S CLOCK (move V37; Rose 10-08: "a turn timer before auto passing the turn", 20 s): {name} who held it */
  $lohTXTurnTimeUp: "{name}'s time runs out; the turn passes.",
  $lohTXDeclareTimeUp: "Time runs out on the declarations: {name}'s standing choice holds.",
  $lohTXReadyFires: "{name} takes the readied attack on {target}, before the spell.",
  $lohTXReadyFiresActs: "{name} takes the readied attack on {target}, before it acts.",
  $lohTXReadyFiresGuard: "{name} takes the readied attack on {target}, before its blow.",
  $lohTXReadyHolds: "{name} holds the readied attack.",
  $lohTXReadyDeciding: "{name} is deciding whether to strike now…",
  $lohTXReadyCannotAct: "{name} cannot act on the readied attack now.",
  $lohTXReadyNoLine: "{name} has no line to {target}: the readied attack holds.",
  $lohTXReadyOutOfReach: "{target} is out of {name}'s reach ({ft} ft): the readied attack holds.",
  /* reach (sadia's weapons move, 2026-10-01): a reach weapon cannot strike a foe that near */
  $lohTXReadyTooClose: "{target} is too close for {name}'s {weapon}: the readied attack holds.",
  $lohTXTooClose: "{target} is too close for {name}'s {weapon}, which cannot strike a foe that near. Step back first.",
  $lohTXStepsBack: "{name} steps back to bring the {weapon} to bear.",
  /* an ambush's opening blow refused by the fight's own plan (rules/opener.js; Desktop/V/world-reach-table.md O1-O2): the
     fight opens without it, and her surprise action stays hers */
  $lohTXOpenerOutOfReach: "Too far for the opening blow. The fight begins.",
  $lohTXOpenerTooClose: "Too close for the opening blow with the {weapon}, and no room to step back. The fight begins.",
  /* trip and disarm by the weapon in hand (weapons D1; battle.js perform) */
  $lohTXTripWith: "{name} tries to trip {target} with the {weapon}: touch attack {touch} vs AC {ac}.",
  $lohTXDisarmSpoiled: "The free swing landed, so {name}'s disarm fails.",
  $lohTXDisarmBack: "{target} answers at once and tries to disarm {name} back.",
  $lohTXDisarmed: "The {weapon} is struck from {target}'s hands.",
  $lohTXCannotDisarm: "{target}'s {weapon} cannot be disarmed: a spiked gauntlet stays on the hand.",
  /* the bare-handed disarmer's catch (weapons D1b-2 T3; battle.js wieldTaken) */
  $lohTXDisarmTakes: "{name} takes the {weapon} and wields it.",
  /* dropping the weapon to dodge the trip back (weapons D1b-3; battle.js askDropToDodge, ally.js askDrop) */
  $lohTXDropOfferTitle: "TRIPPED BACK",
  $lohTXDropOfferBody: "{name}'s trip failed, and {target} trips back. Let the {weapon} fall to stay standing? It stays on the ground until it is picked up. Silence keeps it, and {name} falls, in {s} seconds.",
  $lohTXDropHintDrop: "drop it",
  $lohTXDropHintKeep: "keep it and fall",
  $lohTXDropsToDodge: "{name} lets the {weapon} fall and stays standing.",
  $lohTXKeepsAndFalls: "{name} keeps hold of the {weapon} and is knocked prone.",
  $lohTXDropTimedOut: "No answer in {s} seconds: {name} keeps the {weapon}.",
  $lohTXSeatDropBrief: "You are {name}. Your trip failed and your foe's trip back is landing. You may let your weapon fall to stay standing; it stays on the ground until it is picked up. ANSWER WITH ONE WORD, either DROP or KEEP. Nothing else, no reasoning.",
  $lohTXSeatDropAsk: "{target} is tripping you back. Drop the {weapon} and stay standing, or keep it and fall prone?",
  /* blows that pull, and the price of choosing (weapons D1n; battle.js resolveAttack and applyAttackOutcome) */
  $lohTXPulledSpill: "Nonlethal: the other {n} does nothing, because a pulled blow cannot kill.",
  $lohTXPulled: "Nonlethal: a pulled blow.",
  /* THE CRUSH TILE'S WORDS (move MV2c; ui/table.js): a monk's hold is lethal unless she pulls her blows, and pays no -4
     (d20srd.org/srd/classes/monk.htm, Unarmed Strike). {s} and {has} are the tile's own pronoun slots */
  $lohTXCrushMeta: "Nonlethal; a monk's lethal",
  $lohTXCrushDesc: "Bear down on what {s} already {has} hold of, for an unarmed strike's worth of damage: nonlethal, or lethal for a monk who is not pulling blows.",
  $lohTXCrushRider: "Needs a hold. The lethal squeeze is the menu's row and costs -4 on the check; a monk pays nothing.",
  $lohTXWhipArmoured: "The whip does no damage to {name}: armour turns it.",
  /* ammunition, counted (weapons E; rules/weapons.js, battle.js shotFalls) */
  $lohTXNoAmmo: "{name} has no {ammo} left.",
  /* the shot's one ladder (move AI1; rules/attack.js whyNoShot): her click, a seat's SHOOT word and instinct say the same */
  $lohTXShotNoBow: "{name} has no bow.",
  $lohTXShotStorm: "{name} cannot make ranged attacks in this {weather}.",
  $lohTXShotRange: "{target} is out of range.",
  $lohTXShotCover: "{target} is behind total cover: {name} has no shot.",
  $lohTXSeatTakesOver: "The AI takes over this turn.",
  $lohTXSlingStones: "{name}'s pouch is empty: a stone instead, at -1 and a smaller die.",
  $lohTXShotLies: "The missed shot lies on the ground where it fell.",
  /* the surprise round (battle.js start; one name catches, several catch) */
  $lohTXSurpriseOne: "A SURPRISE ROUND: {names} catches the rest unready. One action each, and the unready are flat-footed.",
  $lohTXSurpriseMany: "A SURPRISE ROUND: {names} catch the rest unready. One action each, and the unready are flat-footed.",
  /* the click preview's words for a reach weapon (weapons B3; world/preview.js): {weapon} in capitals */
  $lohTXPvTooClose: "TOO CLOSE FOR THE {weapon}",
  $lohTXPvStepsBack: "STEPS BACK 5 FT, THEN THE {weapon}",
  /* a seat's scene (weapons B3; battle/ally.js): a reach weapon's foe too close, and the weapon in its hand thrown */
  $lohTXSeatStepsBack: "TOO CLOSE for your {weapon}: a blow steps you back 5 ft first",
  $lohTXSeatTooClose: "TOO CLOSE for your {weapon}, and your 5-foot step is spent or has no ground behind it: a blow here is refused",
  $lohTXSeatThrow: "The {weapon} in your hand can be thrown (THROW): {inc}-foot range increments, five of them, and it leaves your hand when it goes.",
  $lohTXSeatThrowImprovised: "The {weapon} in your hand can be thrown (THROW), though it is not made for it: -4 to hit, {inc}-foot range increments, five of them, only a natural 20 threatens a critical hit, and it leaves your hand when it goes.",
  /* THE DARKNESS ACT (move FT1-4; ui/table.js, battle/featHooks.js, battle/ally.js): pron's slots ({p}, {o}) */
  $lohTXDarknessDesc: "Let {p} blood's darkness fall around {o}: a 20-foot area of shadowy illumination where every creature, darkvision or not, has concealment (a 20% miss chance), and no torch can brighten it.",
  $lohTXDarknessRider: "A spell-like ability: a standard action with no words, gestures or materials, once between rests. Used with a foe in reach it invites a free swing, and a wound can break it.",
  $lohTXDarknessNeeds: "Only a blood that carries Darkness.",
  $lohTXDarknessSpent: "{name}'s Darkness is spent until a rest.",
  $lohTXDarknessUsed: "{name} lets the Darkness fall (no words needed): a 20-foot area where every flame burns low and every eye, darkvision too, sees through shadow.",
  $lohTXSlaLost: "{name} loses the {act}: its use is spent.",
  $lohTXSeatDarknessVerb: "  DARKNESS: let your blood's darkness fall around you, if your blood carries it: a 20-foot area where every creature has concealment (a 20% miss), once between rests. It spends your standard, and doing it with an enemy in reach invites a free swing.\n",
  $lohTXSeatDarkness: "Your blood's Darkness is ready: DARKNESS lets it fall around you, once between rests.",
  /* THE THREE FEAT ACTS (move V18; battle/featHooks.js actRefusal and its three doors, ui/table.js, battle/ally.js): {name}
     the body, {foes} the names in its reach, {corpse} the body fed on, {traits} its feats, {ft} feet, {feat} the feat; pron's
     slots ({p}) in the tiles' words */
  $lohTXWhirlwindNeeds: "{name} has no Whirlwind Attack feat.",
  $lohTXWhirlwindSurprise: "A whirlwind is a full round; the surprise round is one action.",
  $lohTXWhirlwindOneAction: "A whirlwind is a full round, and this turn holds only one action.",
  $lohTXWhirlwindMoved: "Whirlwind Attack is a full round: no movement but the 5-foot step.",
  $lohTXWhirlwindBlade: "A whirlwind needs a blade in hand.",
  $lohTXWhirlwindNobody: "Nobody is in reach for a Whirlwind Attack.",
  $lohTXWhirlwindUsed: "{name} uses Whirlwind Attack: one attack each at {foes}.",
  $lohTXDevourNeeds: "{name} cannot feed on the dead.",
  $lohTXDevourNoCorpse: "No corpse within reach to feed on.",
  $lohTXDevourUsed: "{name} eats {corpse}: fast healing 1 for 10 rounds.",
  $lohTXDevourLearns: "{name} eats {corpse}: fast healing 1 for 10 rounds, and learns what it was ({traits}).",
  $lohTXPhaseNeeds: "{name} cannot phase.",
  $lohTXPhaseLit: "Phase only works in darkness, and light reaches {name} here.",
  $lohTXPhaseMoveSpent: "Phase is the move action, and the move is spent.",
  $lohTXPhaseFar: "Too far to phase: {ft} feet.",
  $lohTXPhaseUsed: "{name} phases {ft} ft through the dark (no attacks of opportunity).",
  $lohTXActNeedsFeat: "Only a body with the {feat} feat.",
  $lohTXWhirlwindDesc: "Give up the full attack to spin through every foe in reach: one swing at each, at {p} full attack bonus.",
  $lohTXWhirlwindRider: "The whole round, with no step but the 5-foot one. No Cleave, no second weapon and no hasted swing adds to it: the whirl is every attack of the round.",
  $lohTXDevourDesc: "Feed on a corpse within reach: fast healing 1 for 10 rounds.",
  $lohTXDevourRider: "A standard action. Each corpse feeds once, and what it was is read aloud as it is eaten.",
  $lohTXPhaseDesc: "Step through the dark to open ground within 30 feet: a teleport, so no blade follows.",
  $lohTXPhaseRider: "Only where the dark holds: inside an aura of Darkness, or a place no light reaches, whatever the hour. It spends the move action.",
  $lohTXSeatWhirlwindVerb: "  WHIRLWIND: if you have Whirlwind Attack, spin and swing once at every enemy in your reach, at your full attack bonus. It takes your whole turn with no step before it, and no Cleave or second weapon adds a swing.\n",
  $lohTXSeatDevourVerb: "  DEVOUR: if you have Devour Dead, feed on a corpse within your reach: fast healing 1 for 10 rounds. It spends your standard.\n",
  $lohTXSeatPhaseVerb: "  PHASE <x,z>: if you have Phase and stand in the dark, step through it to that square, 30 feet at most: a teleport, so no enemy gets a free swing. It spends your move.\n",
  $lohTXSeatWhirlwind: "Whirlwind Attack is ready: WHIRLWIND swings once at every enemy in your reach, your whole turn.",
  $lohTXSeatDevour: "A corpse lies within your reach: DEVOUR feeds on it, fast healing 1 for 10 rounds.",
  $lohTXSeatPhase: "You stand in the dark: PHASE <x,z> steps through it to a square up to 30 feet away, for your move.",
  /* THE THROW TILE (weapons B3; ui/table.js; weapons C2, SRD Weapons, Thrown Weapons): pron's slots ({p}) */
  $lohTXThrowDesc: "Throw the weapon in {p} hand at one body. A weapon made for throwing (a dagger, a club, a spear, a javelin, a trident, a throwing axe, a light hammer) flies at its own range; any other goes at -4, in 10-foot range increments, and only a natural 20 threatens a critical hit.",
  $lohTXThrowRider: "It leaves {p} hand and lies where it lands until it is picked up. A two-handed weapon is thrown with the whole round.",
  $lohTXThrowNothing: "Nothing in hand to throw.",
  $lohTXReadyStorm: "{name} cannot shoot in this storm: the readied attack holds.",
  $lohTXReadyProne: "{name} cannot use a ranged weapon while prone (a crossbow can): the readied attack holds.",
  $lohTXReadyUnloaded: "{name}'s crossbow is not loaded: the readied attack holds.",
  /* PRONE (effects step 2a; SRD, Condition Summary, Prone): a body down, its words on the bar and the card, and the
     weapon it may not use from the ground */
  $lohTXProneDown: "{name} is prone: -4 AC against melee, +4 against ranged, until they stand; standing provokes.",
  $lohTXProneKnocked: "{name} is knocked prone! -4 AC against melee, +4 against ranged, until they stand; standing provokes.",
  $lohTXCondProne: "Prone: -4 AC against melee, +4 against ranged; -4 on its own melee swings; no ranged weapon but a crossbow.",
  $lohTXProneNoRanged: "{name} cannot use a ranged weapon while prone, except a crossbow. Stand up first.",
  /* FATIGUED, EXHAUSTED AND DAZZLED (effects step 2b; SRD, Condition Summary, and the two marks' spells' own pages): the
     marks taking and lifting, the rows' sources, what a tired or a held-fast body may not do, and the rows' words on the
     card and the bar */
  $lohTXFatigueMark: "{name} sags: fatigued, -1 on attack, damage, AC and Reflex, and no charging.",
  $lohTXFatigueLifts: "{name} shakes the weariness off.",
  $lohTXDazzleMark: "The burst takes {name} in the eyes: dazzled, -1 on attack rolls.",
  $lohTXDazzleLifts: "{name}'s eyes clear.",
  $lohTXRageEnds: "{name}'s rage ends.",
  $lohTXRageEndsFatigued: "{name}'s rage ends: fatigued for the rest of the fight, -1 on attack, damage, AC and Reflex, and no charging.",
  $lohTXRageEndsExhausted: "{name}'s rage ends on a body already tired: exhausted for the rest of the fight, -3 on attack, damage, AC and Reflex, at half speed, and no charging.",
  $lohTXSunBlinds: "Bright sunlight blinds {name}: BLINDED for a round.",
  $lohTXSunDazzles: "{name} is dazzled (-1 attack) while in bright light.",
  $lohTXSunGone: "The bright light is gone; {name} is no longer dazzled.",
  $lohTXSunGoneStill: "The bright light is gone, but {name} is still dazzled.",
  $lohTXChargeTired: "{name} is {cond}, and cannot run or charge.",
  $lohTXChargeLineBody: "{name} stands in the line: a charge needs a clear path.",
  $lohTXDoubleNoFeet: "{name} cannot move, so a double move would gain nothing.",
  $lohTXCondFatigued: "Fatigued: -1 on attack, damage, AC and Reflex, and on initiative; no charging.",
  $lohTXCondExhausted: "Exhausted: -3 on attack, damage, AC and Reflex, and on initiative; half speed; no charging.",
  $lohTXCondDazzled: "Dazzled: -1 on attack rolls.",
  /* STUNNED, DAZED, LAUGHING AND PARALYSED (effects step 2c; the SRD's Condition Summary and the pages of Daze, Hideous
     Laughter and Stunning Fist): the marks taking and lifting, the turn each takes, the chips' words, Laughter's mind */
  $lohTXDazedMark: "{name} is dazed: no actions this round.",
  $lohTXDazedLifts: "{name}'s head clears.",
  $lohTXLaughingMark: "{name} collapses in gales of manic laughter: prone, and no actions while laughing.",
  $lohTXLaughingLifts: "{name} stops laughing.",
  $lohTXLosesStunned: "{name} is stunned and loses the turn.",
  $lohTXLosesDazed: "{name} is dazed and loses the turn.",
  $lohTXLosesLaughing: "{name} is laughing too hard to act, and loses the turn.",
  $lohTXLosesParalyzed: "{name} is paralysed and loses the turn.",
  $lohTXCondStunned: "Stunned: no actions; -2 AC and no Dexterity bonus to AC.",
  $lohTXCondDazed: "Dazed: no actions, but no penalty to AC.",
  $lohTXCondLaughing: "Laughing: prone, and no actions while laughing; not helpless.",
  $lohTXCondParalyzed: "Paralysed: no actions, and helpless: Dexterity 0, +4 to melee against it, open to a coup de grace.",
  $lohTXLaughterNoMind: "{spell} needs a mind that can laugh (Intelligence 3 or more). {name} has none; nothing is spent.",
  $lohTXOtherKindSave: "another kind of creature, +{n}",
  /* A CHECK'S ARMOUR, PACK AND TRAINING, named on the dice line (A9; data/carry.js checkTermsOf, world/void.js) */
  $lohTXCheckArmour: "your armour",
  $lohTXCheckLoad: "the load you are carrying",
  $lohTXCheckUntrained: "armour you are not trained in",
  $lohTXTowerShield: "Tower shield",   // the tower's -2 on every attack roll, named in its terms (IT1a)
  /* THE SKILLS COG'S TERM WORDS (rules/skills.js termWordsOf, move S1): today's words on her world lines, the blood's new */
  $lohTXTermRanks: "ranks",
  $lohTXTermBlood: "blood",
  $lohTXTermFeats: "feats",
  $lohTXTermFamiliar: "familiar",
  $lohTXTermTraits: "traits",
  $lohTXTermSynergy: "{skill} synergy",
  $lohTXTermSize: "size",
  $lohTXTermNatureSense: "nature sense",
  /* CREATION'S SKILLS PAGE (move S4): the blood's grant said as a bonus and never ranks (Rose 2026-09-22: "ranks are only
     granted by level"), and the working's own words beside the cog's; {list} "Hide +2, Move Silently +2", {n} a number */
  $lohTXBloodGives: "Your blood gives you {list}: a bonus on the check, never ranks.",
  $lohTXRanksSpent: "{n} spent",
  $lohTXMoreInMoment: "{n} more in the right moment",
  /* the attack roll's terms off a body's rows (T5): prone and the helpless, which are no rows of the CONDS table */
  $lohTXTermProne: "prone",
  $lohTXTermHelpless: "helpless",
  $lohTXAbilityStr: "Strength",
  $lohTXAbilityDex: "Dexterity",
  $lohTXAbilityCon: "Constitution",
  $lohTXAbilityInt: "Intelligence",
  $lohTXAbilityWis: "Wisdom",
  $lohTXAbilityCha: "Charisma",
  /* THE HEAD OF EVERY ROLL LINE (rules/dice.js sayRolled; the attack cog, move 6b-1b): the world's notation by Rose's
     09-15 ruling on the world's lines, the face written out and then the modifier with every term that moved it */
  $lohTXRolledHead: "rolled {face} on the die, {mods}",
  $lohTXTookHead: "took {face}, {mods}",
  /* THE ATTACK ROLL'S TERM WORDS (rules/attack.js, battle/roster.js and battle.js resolveAttack; the attack cog, move
     6b-1a): each part of an attack roll named, as the skills cog names a check's; the abilities' words are the five above,
     armour untrained is $lohTXCheckUntrained, and a feat, a trait or a row is named by its own name */
  $lohTXAtkBonus: "attack bonus",
  $lohTXAtkBase: "base attack",
  $lohTXAtkSize: "the weapon's size",
  $lohTXAtkNonproficient: "not proficient",
  $lohTXAtkMasterwork: "masterwork",
  $lohTXAtkEnhancement: "enhancement",
  $lohTXAtkUnderRating: "under the bow's rating",
  $lohTXAtkImprovised: "an improvised throw",
  $lohTXAtkSecondary: "a secondary natural attack",
  $lohTXAtkTwoWeapons: "two weapons",
  $lohTXAtkOffSecond: "a second off-hand blow",
  $lohTXAtkOffThird: "a third off-hand blow",
  $lohTXAtkFlurry: "flurry of blows",
  $lohTXAtkCharging: "charging",
  $lohTXAtkStone: "a stone, not a bullet",
  $lohTXAtkWeather: "the weather",
  $lohTXAtkMoon: "the moon",
  $lohTXAtkIntoMelee: "shooting into melee",
  $lohTXAtkRange: "range",
  $lohTXAtkFlank: "flanking",
  $lohTXAtkGrappling: "grappling",
  $lohTXAtkPull: "to pull the blow",
  $lohTXAtkKill: "to strike to kill",
  $lohTXAtkWarDomain: "the War domain",
  /* THE ROUTINE'S BLOWS, COUNTED (rules/attack.js; the attack cog, move 6b-2): a hand's further blows named "{move}
     ({nth})" as the off hand's always were, the iteratives' term "{nth} attack", the flurry's blows "Flurry ({nth})" */
  $lohTXNth1: "first",
  $lohTXNth2: "second",
  $lohTXNth3: "third",
  $lohTXNth4: "fourth",
  $lohTXNth5: "fifth",
  $lohTXBlowNth: "{move} ({nth})",
  $lohTXAtkIterNth: "{nth} attack",
  $lohTXFlurryName: "Flurry",
  /* AMMUNITION (weapons step E; gear.js and seatGear.js: a bundle refused in the hand) */
  $lohTXAmmoNotHeld: "The {name} are shot from a bow, a crossbow or a sling, not held as a weapon.",
  $lohTXAmmoCase: "A wooden case of {n}.",   // a case of bolts on the Ammunition shelf (data/goods.js, E8b)
  $lohTXAmmoQuiver: "A leather quiver of {n}.",   // a quiver of arrows on the Ammunition shelf (data/goods.js, E8c)
  $lohTXAmmoPouch: "A leather pouch of {n}.",   // a pouch of sling bullets on the Ammunition shelf (data/goods.js, E8c)
  $lohTXReadyInHold:"{name} is caught in a hold and cannot reach {target}: the readied attack holds.",
  $lohTXReadyLapses: "{name}'s readied attack was never taken, and lapses as {name}'s turn comes round.",
  $lohTXReadyPrompt: "READY <name>: spend your standard action holding an attack for that caster; the moment it starts casting a spell, before your next turn, you strike first, and a wound may make it lose the spell. READY <name> ACTS: the same for any foe you name, the moment it acts. READY GUARD: the moment any foe attacks one of your friends, you strike that foe first. When you strike, your place in the count moves to just ahead of the foe you struck.",
  /* THE HOLD'S EIGHT, TAUGHT TO A SEAT (move S3; battle/ally.js allyBrief): what each does and costs; CRUSH's true for a monk
     (move MV2c), the four new ones the fight menu's rows (Crush to Kill, Break a Pin, Haul the Hold, Fling) */
  $lohTXSeatHoldGroup: "These mean nothing unless you already have hold of somebody, or they of you, and the hold says who:",
  $lohTXSeatCrush: "CRUSH: bear down for an unarmed strike's worth of damage: nonlethal, or lethal for a monk who is not pulling blows.",
  $lohTXSeatCrushKill: "CRUSHKILL: the same squeeze, to kill: lethal damage, at -4 on the check (a monk pays nothing).",
  $lohTXSeatPin: "PIN: hold them down. Immobile for a round, and -4 against everyone but you. It lapses on your next turn and must be won again.",
  $lohTXSeatBreakPin: "BREAKPIN: break the pin one of the bodies in your hold has on someone else, so they are held but no longer held down.",
  $lohTXSeatWorkFree: "WORKFREE: out of the hold, or out of a pin back into the hold. Every hand on you has to be beaten, not just the first.",
  $lohTXSeatHaul: "HAUL: move the whole hold half your speed, everyone in it dragged along; +4 when the only one in it is the body you have pinned.",
  $lohTXSeatFling: "FLING: Snatch only: throw what you hold 1d6 x 10 feet. It lands prone and takes 1d6 for every ten feet, and the hold ends.",
  $lohTXSeatLetGo: "LETGO: open your hands. Free, and it refuses nothing.",
  $lohTXReadyBrief: "You are {name}, and you readied an attack (READY). What you readied it for is happening now. ANSWER WITH ONE WORD, either STRIKE or HOLD. Nothing else, no reasoning.",
  $lohTXReadyNow: "{caster} starts casting a spell, {ft} ft from you. STRIKE to take your readied attack with {weapon} now, before the spell; HOLD to keep the ready for another spell before your next turn. If you say nothing, you strike.",
  $lohTXReadyNowActs: "{target} is about to act, {ft} ft from you. STRIKE to take your readied attack with {weapon} now, before it does; HOLD to keep the ready until your next turn. If you say nothing, you strike.",
  $lohTXReadyNowGuard: "{target} attacks your friend {friend}, {ft} ft from you. STRIKE to take your readied attack on {target} with {weapon} now, before the blow; HOLD to keep the ready until your next turn. If you say nothing, you strike.",
  /* THE RAGE'S WORDS (sadia 2026-10-01, the small fixes; Desktop/V/small-fixes-table.md, row-checked by Vera): the start
     names no pronoun; a refusal says its reason (rules/dayUses.js whyNoRage, noRageWords), `who` being "You" for her and
     the body's name for anyone else */
  $lohTXRageStarts: "{name} flies into a rage: +{str} Strength and +{str} Constitution, +{will} on Will saves, -2 AC, for {rounds} rounds.",
  $lohTXRageNow: "{who} {is} already raging.",
  $lohTXRageNot: "{who} cannot rage.",
  $lohTXRageNone: "{who} {has} no rage left today.",
  $lohTXRageOnce: "{who} {has} already raged in this fight.",
  $lohTXYourRageEnds: "Your rage ends.",
  $lohTXRageEndHow: "the rage's end",
  $lohTXRageEndDies: "{name} dies as the rage ends.",
  $lohTXRageEndDiesYou: "You die as the rage ends.",
  $lohTXIndomitable: "+{n} Indomitable Will, against enchantment",
  $lohTXSunBites: "The sun burns {whose} troll blood: 1 damage. Fortitude {roll} vs DC 12: {verdict}",
  $lohTXSunBurnsHer: "The sun burns {whose} troll blood.",
  $lohTXSunBiteHolds: "holds.",
  $lohTXSunBiteHeld: "{who} cannot move for a round.",
  /* EVERY BODY'S TWO CHOICES OF DAMAGE (weapons D1n's N2; data/featEffects.js TOGGLES "Pull Blows" and "Strike to Kill",
     open to every body; the SRD's Nonlethal Damage): the bar's and the rail's tiles. {p} is pron's slot */
  $lohTXPullBlowsMeta: "-4 attack, nonlethal damage",
  $lohTXPullBlowsTip: "Every blow with a melee weapon that deals lethal damage deals nonlethal damage instead, at -4 on the attack roll, while this is on. A bow or a thrown weapon cannot pull its blows. A monk's fist, or one with Improved Unarmed Strike, pulls at no cost.",
  $lohTXStrikeToKillMeta: "-4 attack, lethal damage",
  $lohTXStrikeToKillTip: "Every blow with a weapon that deals nonlethal damage (a sap, a whip, the bolas, a bare fist) deals lethal damage instead, at -4 on the attack roll, while this is on. A monk's fist, or one with Improved Unarmed Strike, already strikes to kill.",
  /* THE DECLARED PEOPLE'S WORDS (config/people.js names the key; rules/people.js personSpec reads it as these words; sadia
     2026-10-01): what each says when spoken to with no tale to tell */
  $lohTXWennaGreet: "Mind the water's edge.",
  /* THE FIGHT'S CHECKS ON THEIR CARDS (C5; Rose 2026-10-03: "dont make more work for yourselves by breaking the game's
     format and not using cards / graphics", "fix anything else you rigged in that also breaks the format"; sadia): a
     check's name on its card (Ck), its verdict (Vd), what is said beneath it (Note), the words of its terms (Term) and what
     it stands against (Vs). The world's cards ask the same keys for the same verdicts (Vera's W2), so a check reads alike
     in a fight and out of one. The slots are the numbers and names a card hands in */
  $lohTXCkTake: "take",
  $lohTXCkWill: "Will",
  $lohTXCkFort: "Fortitude",
  $lohTXCkRef: "Reflex",
  $lohTXCkClimb: "Climb",
  $lohTXCkJump: "Jump",
  $lohTXCkTumble: "Tumble",
  $lohTXCkSpellcraft: "Spellcraft",
  $lohTXCkConcentration: "Concentration",
  $lohTXCkDispel: "Dispel check",
  $lohTXCkNature: "Knowledge (nature)",
  $lohTXCkArcane: "Arcane spell failure",
  $lohTXCkTouch: "Touch attack",
  $lohTXCkInitiative: "Initiative",
  $lohTXCkBullRush: "Bull rush",
  $lohTXCkTrip: "Trip",
  $lohTXCkTripBack: "Trip back",
  $lohTXCkDisarm: "Disarm",
  $lohTXCkDisarmBack: "Disarm back",
  $lohTXCkSunder: "Sunder",
  $lohTXCkOverrun: "Overrun",
  $lohTXCkGrapple: "Grapple",
  $lohTXCkGrappleDamage: "Grapple damage",
  $lohTXCkPin: "Pin",
  $lohTXCkBreakPin: "Break the pin",
  $lohTXCkThrow: "Throw",
  $lohTXCkEscape: "Escape",
  $lohTXCkMoveGrapple: "Move the grapple",
  $lohTXCkGrappleCheck: "grapple",
  $lohTXCkEscapeArtist: "Escape Artist",
  $lohTXCkFeint: "Feint",
  $lohTXCkBluff: "Bluff",
  $lohTXCkSenseMotive: "Sense Motive",
  $lohTXCkShadowStep: "Shadow Step",
  $lohTXCkSpot: "Spot",
  $lohTXCkHide: "Hide",
  $lohTXVdBreaksFree: "BREAKS FREE",
  $lohTXVdStillHeld: "STILL HELD",
  $lohTXVdHeld: "HELD",
  $lohTXVdLost: "LOST",
  $lohTXVdHolds: "HOLDS",
  $lohTXVdBreaks: "BREAKS",
  $lohTXVdLives: "LIVES",
  $lohTXVdDies: "DIES",
  $lohTXVdSurvives: "SURVIVES",
  $lohTXVdRecalls: "RECALLS",
  $lohTXVdNoRecall: "DOES NOT KNOW",
  $lohTXVdSpellWorks: "THE SPELL WORKS",
  $lohTXVdSpellFails: "THE SPELL FAILS",
  $lohTXVdClears: "CLEARS",
  $lohTXVdFallsShort: "FALLS SHORT",
  $lohTXVdUpAndOver: "UP AND OVER",
  $lohTXVdNoProgress: "NO PROGRESS",
  $lohTXVdSlips: "SLIPS AND FALLS",
  $lohTXVdIdentified: "IDENTIFIED",
  $lohTXVdUnread: "UNREAD",
  $lohTXVdDispelled: "DISPELLED",
  $lohTXVdFails: "FAILS",
  $lohTXVdPast: "PAST",
  $lohTXVdCaught: "CAUGHT",
  $lohTXVdStable: "STABLE",
  $lohTXVdResisted: "RESISTED",
  $lohTXVdItTakes: "IT TAKES",
  $lohTXVdHalf: "HALF DAMAGE",
  $lohTXVdFailed: "FAILED",
  $lohTXVdSaved: "SAVED",
  $lohTXVdParalysed: "PARALYSED",
  $lohTXVdStunned: "STUNNED",
  $lohTXVdHits: "HITS",
  $lohTXVdMisses: "MISSES",
  $lohTXVdGrabbed: "GRABBED",
  $lohTXVdAvoided: "AVOIDED",
  $lohTXVdPushed: "PUSHED {n} FT",
  $lohTXVdNotMoved: "NOT MOVED",
  $lohTXVdTripped: "TRIPPED",
  $lohTXVdDisarmed: "DISARMED",
  $lohTXVdKeepsHold: "KEEPS HOLD",
  $lohTXVdStruck: "STRUCK",
  $lohTXVdBlocked: "BLOCKED",
  $lohTXVdKnockedDown: "KNOCKED DOWN",
  $lohTXVdKnockedBack: "KNOCKED BACK",
  $lohTXVdGrappled: "GRAPPLED",
  $lohTXVdDealsDamage: "DEALS DAMAGE",
  $lohTXVdPinned: "PINNED",
  $lohTXVdPinBroken: "PIN BROKEN",
  $lohTXVdPinHolds: "PIN HOLDS",
  $lohTXVdThrown: "THROWN",
  $lohTXVdEscapes: "ESCAPES",
  $lohTXVdMoves: "MOVES",
  $lohTXVdHeldFast: "HELD FAST",
  $lohTXVdOpened: "OPENED",
  $lohTXVdRead: "READ",
  $lohTXVdFound: "FOUND",
  $lohTXVdHidden: "HIDDEN",
  $lohTXNoteTurnLost: "the turn is lost",
  $lohTXNoteCoupDc: "DC {dc}: 10 + {n} damage dealt",
  $lohTXNoteFireStops: "fire stops it",
  $lohTXNoteNoRun: "No running start: the DC is doubled.",
  $lohTXNoteMassive: "Massive damage: 50 or more from one blow.",
  $lohTXNoteConcDc: "DC {dc}: 10 + {dmg} damage + spell level {lvl}",
  $lohTXNoteDispelDc: "DC {dc}: 11 + their caster level {theirs}. The check adds caster level {mine}.",
  $lohTXNoteNoAoo: "No attack of opportunity from {name}.",
  $lohTXNoteAoo: "{name} gets the attack of opportunity.",
  $lohTXNoteKitUsedUp: "The kit is used up.",
  $lohTXNoteSunBurns: "The sun burns: {n} damage.",
  $lohTXNoteStunningFist: "Stunning Fist",
  $lohTXNoteTandem: "Tandem Trip: two rolls, d20({a}) and d20({b}); the better counts.",
  $lohTXNoteTieMod: "A tie, won on the higher modifier.",
  $lohTXNoteTieAgain: "A tie with equal modifiers, rolled again.",
  $lohTXNoteFeintBab: "{name} adds base attack {n} to Sense Motive.",
  $lohTXNoteRollOff: "roll-off {dice}",
  $lohTXTermSave: "{save} save",
  $lohTXTermPrey: "the waning crescent, below half health",
  $lohTXTermOtherKind: "another kind of creature",
  $lohTXTermIndomitable: "Indomitable Will, against enchantment",
  $lohTXTermCover: "cover",
  $lohTXTermAnimalMind: "an animal mind",
  $lohTXTermNotHumanoid: "not a humanoid",
  $lohTXTermCoordinated: "Coordinated Maneuvers",
  $lohTXTermDex: "Dex",
  $lohTXTermBonus: "bonus",
  $lohTXTermFatigued: "fatigued",
  $lohTXTermExhausted: "exhausted",
  $lohTXVsToFail: "{pct}% to fail",
  $lohTXVsTouchAc: "vs touch AC {ac}",
  /* A CONTEST READS [card] vs [card] (move VS; Rose 2026-10-07: "it should read like [card] vs [card] showing the victor";
     sadia): the word between a contest's two dice, and the tag on the one that won (ui/tableCards.js vsMark, winTag) */
  $lohTXVsMark: "vs",
  $lohTXVsWins: "WINS",
  /* AND THE FIGHT'S WOUNDS AND CURES ON THE WORLD'S CARDS (C5-2; sadia): a wound's cause (Ck, How), an object's verdict,
     the working's words (Note), and her lines with no number in them (Her), each beside a twin for the seats that keeps
     the numbers */
  $lohTXCkFalling: "Falling",
  $lohTXCkThrown: "Thrown",
  $lohTXHowBlast: "{name}'s blast",
  $lohTXVdDamaged: "DAMAGED",
  $lohTXVdBroken: "BROKEN",
  $lohTXVdNoDamage: "NO DAMAGE",
  $lohTXNoteLessResisted: "less {n} resisted",
  $lohTXNoteLessHardness: "less hardness {n}",
  $lohTXNoteHalved: "halved",
  $lohTXNoteHalvedRanged: "halved (ranged weapon)",
  $lohTXNoteHalvedFire: "halved (fire)",
  /* WHAT A BLOW DOES TO A THING, ITS LINE'S STEPS (move AW4; rules/attack.js objectDamageOf; sadia): {n} the damage after the
     step, {h} the thing's hardness */
  $lohTXObjHalvedRangedSaid: "halved to {n} (ranged weapon)",
  $lohTXObjHalvedFireSaid: "halved to {n} (fire)",
  $lohTXObjHardnessSaid: "hardness {h} soaks {n}",
  /* and the book's own (move AW4b): electricity's half, cold's quarter, a blow that cannot kill; the card's two notes */
  $lohTXObjHalvedElectricSaid: "halved to {n} (electricity)",
  $lohTXObjQuarteredColdSaid: "quartered to {n} (cold)",
  $lohTXObjNonlethalSaid: "no effect: things are immune to nonlethal damage",
  $lohTXNoteHalvedElectric: "halved (electricity)",
  $lohTXNoteQuarteredCold: "quartered (cold)",
  $lohTXNoteResisted: "Resistance: {n} {type} blocked.",
  $lohTXNoteFlungFt: "Flung {feet} ft.",
  $lohTXNoteGivenBy: "given by {name}",
  $lohTXNoteNonlethalHeals: "Its nonlethal damage heals by as much.",
  $lohTXHerFallsProne: "{name} falls and lands prone.",
  $lohTXHerFlings: "{name} flings {foe}.",
  $lohTXHerBleedingStops: "The bleeding stops. {name} is stable.",
  $lohTXHerHealedStands: "{name} stands (Diehard): stable and standing.",
  $lohTXHerHeldByBlood: "{name} is unconscious, kept alive by troll blood.",
  $lohTXHerUnconscious: "{name} is unconscious.",
  $lohTXHerStrenuous: "The strenuous action costs {name} a hit point.",
  $lohTXHerDiehardHeld: "{name} stays conscious (Diehard): standing and disabled, kept alive by troll blood.",
  $lohTXHerOutByBlood: "{name} falls unconscious: troll blood keeps them alive, healing a hit point an hour.",
  $lohTXHerDisabled: "{name} is disabled: one move or standard action a turn, and a standard action costs a hit point.",
  $lohTXHerDiehardStable: "{name} stays conscious (Diehard): stable and standing.",
  $lohTXHerFallsDying: "{name} falls, dying.",
  $lohTXHerHealedDisabled: "{name} is healed, conscious but disabled.",
  /* A BODY LYING DEAD UNDER THE MOUSE (void.js worldTipAt, the right-click menu and the battle map's name; Rose 2026-10-03:
     "be sure when mouse over / click a corpse it opens the search inventory like how chests behave"): {name} her eye's
     name for it (corpseShownName) */
  $lohTXCorpseTitle: "the body of {name}",
  $lohTXCorpseDead: "dead",
  $lohTXCorpseSearch: "click to search",
  $lohTXCorpseEmpty: "nothing left on it",
  /* THE FEATS A CLASS TABLE GIVES (MOVE G; Rose 2026-10-03: "Give them"): creation's Feats page; the level page, the level's
     line and a seat's words for one she held already. {list} "Track, Improved Unarmed Strike", {feat} a feat, {path} its
     class, {nth} "3rd" */
  $lohTXFeatsGivenFree: "Given free by your class: {list}",
  $lohTXGrantHeld: "{feat}, which the {path} table gives at {nth} level, is already yours: nothing more is given.",
  $lohTXGrantHeldShort: "{feat}, already yours",
  /* the forge's feats page (MOVE G): a seat told what its class table gives free; {source} one of the two below, {list}
     the feats, {them} "it" or "them" */
  $lohTXForgeGivenFree: "Your {source} also gives you {list}, free and beside these, so you do not choose {them}. ",
  $lohTXForgeTableOf: "{path}'s table",
  $lohTXForgeSavantGifts: "Savant's gifts from every class",
  /* A CHANGELING DISGUISES ITS HORNS (move HH-a; Rose 2026-10-07: "Make hiding horns a changeling trait. (They still
     -have them- they just disguise them to hide)"): the face menu's row and its hint, the wearer's three lines (her chat
     or a seat's notice: void.js openGuiseMenu, hornsHide), and the Another Face tile's card and gate (ui/table.js); {p}
     her possessive */
  $lohTXHornsHide: "Hide your horns",
  $lohTXHornsShow: "Show your horns",
  $lohTXHornsHint: "still there, disguised",
  $lohTXHornsHidden: "You disguise your horns. They are still there, only hidden.",
  $lohTXHornsShown: "You let your horns show again.",
  $lohTXHornsCannot: "Only Changeling blood can hide its horns.",
  $lohTXGuiseTileDesc: "Wear another race or another sex, or hide {p} horns (Changeling blood). The face never slips; what decides anything is the Disguise check every watcher rolls against.",
  $lohTXGuiseTileRider: "Faces need the Polymorph feat. Not during a fight.",
  $lohTXGuiseNeeds: "Needs the Polymorph feat or Changeling blood.",
  /* the Moon's Eye is Lunari blood's (move MO1): the hotkey pickers' gate and the bar's refusal on use */
  $lohTXMoonEyeNeeds: "Only Lunari blood can use this.",
  /* the shadow step is taken, never given by blood (move R6, Rose's report #6): the bar's refusal, the Feats cog's gate's words */
  $lohTXShadowStepNeeds: "Needs the Shadowmeld feat, or a Shadowdancer's Shadow Jump.",
  /* A TENDED BODY HEALS WHILE IT LIES SENSELESS (move 5e; Rose 2026-10-07 "As the book"; void.js injuryStep): its card's
     title and detail and a body's line. {nights} one of the two below, {n} a count, {hp} where the body is now */
  $lohTXRestTendedTitle: "Rest, tended",
  $lohTXRestTendedDetail: "{nights} of natural healing",
  $lohTXRestTendedTell: "Tended while you lie unconscious: {nights} of rest heal you to {hp} hit points.",
  $lohTXRestOneNight: "a night",
  $lohTXRestNights: "{n} nights",
  /* THE STRENUOUS POINT OUT OF A FIGHT (move 5d; Rose 2026-10-07 "Yes, everywhere"; void.js strainPay): the wound's name on
     its card and in a seat's line */
  $lohTXStrainHow: "The strenuous action",
  /* THE CRITICAL FEATS (move F6a): the confirmation's term, and a rider's line in the fight */
  $lohTXTermCriticalFocus: "Critical Focus",
  $lohTXCritRider: "{name}'s {feat}: {target} is {cond}.",
  /* ONE HEAL FOR EVERY BODY (move H1): the heal acts' refusals, a seat's lines and her notes; Fast Healer's term */
  $lohTXDrinkNone: "You carry no potion.",
  $lohTXDrinkDown: "You cannot drink a potion while you are down.",
  $lohTXDrinkOutCold: "You cannot drink a potion while you are unconscious.",
  $lohTXDrinkWhole: "You are whole; the potion stays in your pack. You carry {have}.",
  $lohTXDrinkNoSuch: "You carry no {want}. You carry {have}.",
  $lohTXDrinkSaid: "You drink the {pot}: {heal} {roll} = {total}{fast}. Hit points {was} to {now}{of}{mixed}.",
  $lohTXDrinkMixed: " ({healed} healed from wounds, {lifted} from cold damage)",
  $lohTXGiveNoOne: "There is no one down within reach of you.",
  $lohTXGiveNone: "You carry no potion to give.",
  $lohTXGiveSaid: "You give {name} a {pot}: {heal} {roll} = {total}{fast}. Hit points {was} to {now} of {max}{end}",
  $lohTXGiveSaidHers: "You give {name} a {pot}{end}",
  $lohTXGiveUp: "; {name} is up.",
  $lohTXGiveStill: "; still down, but no longer bleeding.",
  $lohTXGiveTold: "Someone gives you a {pot}: hit points {was} to {now}.",
  $lohTXHealMixedNote: "{healed} of wounds, {lifted} of the chill",
  $lohTXHealFastHealer: "+{n} Fast Healer",
  /* the frame counter (move FC1; Rose 2026-10-08: "Put a framerate counter option in settings"): its row and its corner */
  $lohTXSetFrameRate: "Frame Rate",
  $lohTXFps: "{fps} fps, slowest frame {ms} ms",
  $lohTXFpsPaused: "no frames drawn: the window is hidden or covered",
  /* the seat's tags and their Help (move V38a; Rose 2026-10-08: "128/128 [Overloaded!] and the seat can call Help:
     [Overloaded!]"): the load's line and its three heavier bands, HELP's answers, and the brief's line for the verb.
     The numbers are the game's own (data/carry.js loadOf, rules/movement.js landSpeedFt) */
  $lohTXTagLoadLine: "Load {lb}/{max} lb",
  $lohTXTagLoadMedium: "[Medium Load]",
  $lohTXTagLoadHeavy: "[Heavy Load]",
  $lohTXTagLoadOver: "[Overloaded!]",
  $lohTXTagLoadMediumHelp: "a medium load: your pace falls a step (30 ft walks as 20), your Dexterity adds at most +3 to your armour, and -3 on Balance, Climb, Escape Artist, Hide, Jump, Move Silently, Sleight of Hand and Tumble. Carry less to lift it.",
  $lohTXTagLoadHeavyHelp: "a heavy load: your pace falls a step (30 ft walks as 20), you run at three times your pace instead of four, your Dexterity adds at most +1 to your armour, and -6 on Balance, Climb, Escape Artist, Hide, Jump, Move Silently, Sleight of Hand and Tumble. Carry less to lift it.",
  $lohTXTagLoadOverHelp: "more than your heaviest load (the first number is past the second): you move only 5 feet a round and cannot run, your Dexterity adds nothing to your armour, and -6 on Balance, Climb, Escape Artist, Hide, Jump, Move Silently, Sleight of Hand and Tumble. Carry less until the first number is at or under the second.",
  $lohTXTagHelpBare: "HELP: and a tag as your world shows it, in its brackets, e.g. HELP: [Overloaded!], tells what it means and what to do about it, in your next look.",
  $lohTXTagHelpNone: "No tag is called {asked}. HELP: and a tag as your world shows it, in its brackets, e.g. HELP: [Overloaded!].",
  $lohTXTagHelpVerb: "  HELP: [tag]: what a tag in your world means and what to do about it, e.g. HELP: [Overloaded!]; told in your next look, at no cost.",
  /* the forge's Provisions tells the load (move V38b; Rose 2026-10-08: "if the seats were overloaded the game failed to
     let the seats know that"): the seat's limits, and the note an overloading basket is asked again with */
  $lohTXProvLimits: "You can carry {light} lb as a light load, {medium} as a medium one and {heavy} at most (Strength {str}); you already wear and wield {carried} lb. Past {heavy} you are overloaded and move only 5 feet a round.",
  $lohTXProvOverNote: "That basket would carry {lb} lb, past your heaviest load ({max} lb): {tag} you would move only 5 feet a round and could not run. Answer again with less, or {\"keep\": true} to carry it all anyway.",
  /* the Verify gate's purse, said plainly (move MN1; Rose's report #17: "I'm only short 22 gold... wtf is this?") */
  $lohTXPurseShort: "The purse is short by {short}: {spent} worn, wielded and bought ({worn} worn and wielded, {basket} in provisions), and {gold} to spend. Set something down.",
  /* the character card's god when she kneels to none (move MN1; Rose's report #8: "the menu doesnt tell me what god I selected") */
  $lohTXNoDeity: "No god",
  /* the forge's Class page: a fist is never untrained (move MN1, Luna's MK1; data/proficiency.js) */
  $lohTXForgeBareHands: "Bare hands are never a question of proficiency: no path pays -4 for fighting unarmed.",
  /* the Aim tile's refusals (move FP1, FP2's footing with them; Rose 2026-10-08: "I'm using a bow and I cannot go in first person in battle or out of battle... why?") */
  $lohTXAimNotTurn: "Not {p} turn.",
  $lohTXAimBusy: "Not while an action is under way.",
  $lohTXAimUp: "The bow is already up.",
  $lohTXAimNoBow: "No bow or crossbow in {p} hands.",
  $lohTXAimSpent: "{P} standard action is spent this round.",
  $lohTXAimFlat: "Close the battlemap first.",
  $lohTXAimNoPage: "First person needs the game's own window.",
  $lohTXAimFooting: "Not while climbing, swimming or falling.",
};

const warned = new Set();
const warnOnce = (what) => { if (!warned.has(what)) { warned.add(what); console.warn("[text] " + what); } };

/** the words a key names; null for a key not in the library (said once in the console, so a typo shows as a warning
    rather than as missing words). `slots` fills each {slot} the caller hands a value for, and leaves every other one as
    it stands, so a sentence's pronouns ({s}, {o}, {p}) can still be filled after (sadia 2026-10-01, the coup's words) */
export function textOf(key, slots) {
  const t = TEXT[key];
  if (typeof t !== "string" || !t) { warnOnce("no words named " + key); return null; }
  if (!slots || typeof slots !== "object") return t;
  return t.replace(/\{(\w+)\}/g, (all, k) => (Object.prototype.hasOwnProperty.call(slots, k) && slots[k] != null ? String(slots[k]) : all));
}
