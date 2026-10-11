/* ============================================================================
   FEAT EFFECTS: every feat the creation offers and WHERE IT LANDS (Rose
   09-11: "go through the cc feats and make sure the scaffolding and such of
   each and every feat/racial/bloodline feat is implemented").

   One row per name: the general pool (data/featPool.js, 112 rows), the
   bloodline feats, the race traits, the ethnicity signatures, the Riven
   deformities and the Shade's Blink (data/feats.js, data/heritage.js). Each
   row says what KIND it is, whether the mechanic RUNS today ("live"), runs
   in part ("partial") or only stands as a flag the engine reads the day its
   system exists ("scaffold", with `waits` naming that system), and a one
   line `note` of what lands where. `sheet(f, c)` stamps the fighter at
   build (battle/roster.js grantFeats runs it for every feat held);
   battle/featHooks.js reads the stamped flags at the fight's own sites; the
   world reads the skill bonuses through featSkillMod at its doors (the
   lock, her eye, the sneak, the swim, the appraisal).

   NUMBERS THAT ARE MINE are marked "(number mine)" in the note: the canon
   texts that promise "more", "slightly", "enhanced" without a figure got
   the affinities' even-number convention (+2 / +10 ft) so a half-blood's
   half comes out whole. Rose rules them; the audit (featAudit) lists them.

   Never edit the descriptions here: data/feats.js and data/featPool.js own
   the printed text; this file owns only what the text DOES.

   THE TABLES ONLY since move F1a (2026-10-07; the machine map's 4.4): the rows and the stampers they use stay
   here; the readers over them (holds, pickOf, featSkillMod, weaponFeatBonus, the toggles' and trades' readers,
   metamagicFor, applyFeatSheet, featHpOf, featAudit and the rest) are the Feats cog's, src/rules/feats.js. */

/* the polearm family below is the weapon table's `polearm` column (2026-10-01) */
import { WEAPON_TABLE } from "./weaponTable.js";
import { textOf } from "../config/text.js";

/* the polearms the Eishu art covers, by the catalogue's own names: the weapon table's `polearm` column
   (data/weaponTable.js, 2026-10-01) */
export const POLEARMS = new Set(Object.keys(WEAPON_TABLE).filter((n) => WEAPON_TABLE[n].polearm).map((n) => n.toLowerCase()));

/*,,. THE STATIC SKILL FEATS, by the skills' printed labels ,,, */
export const SKILL_FEATS = {
    "Alertness":        { "Listen": 2, "Spot": 2 },
    "Acrobatic":        { "Jump": 2, "Tumble": 2 },
    "Agile":            { "Balance": 2, "Escape Artist": 2 },
    "Animal Affinity":  { "Handle Animal": 2, "Ride": 2 },
    "Athletic":         { "Climb": 2, "Swim": 2 },
    "Deceitful":        { "Disguise": 2, "Forgery": 2 },
    "Deft Hands":       { "Sleight of Hand": 2, "Use Rope": 2 },
    "Diligent":         { "Appraise": 2, "Decipher Script": 2 },
    "Investigator":     { "Gather Information": 2, "Search": 2 },
    "Magical Aptitude": { "Spellcraft": 2, "Use Magic Device": 2 },
    "Negotiator":       { "Diplomacy": 2, "Sense Motive": 2 },
    "Nimble Fingers":   { "Disable Device": 2, "Open Lock": 2 },
    "Persuasive":       { "Bluff": 2, "Intimidate": 2 },
    "Self-Sufficient":  { "Heal": 2, "Survival": 2 },
    "Stealthy":         { "Hide": 2, "Move Silently": 2 },
    /* race and line (numbers mine, the even convention) */
    "Observant":        { "Spot": 2, "Search": 2, "Listen": 2 },
    "Light Step":       { "Move Silently": 4 },     // Rose 2026-09-18: "Light Step is a +4 to move silently"
    "Aug. Disguise":    { "Disguise": 6 },          // Rose 2026-09-18: "simply gives a +6 to their skill check to fool others"
    /* the feat's +4 "on checks to resist fatigue, heat, cold, and forced
       marches" rides the label the world's Constitution checks ask for */
    "Endurance":        { "Endurance": 4 },
};
export const CHA_SKILLS = new Set(["Bluff", "Diplomacy", "Intimidate", "Gather Information",
                            "Disguise", "Perform", "Handle Animal", "Use Magic Device"]);

/** the ten skills Night Owl lifts after dark, in his own order (Rose 2026-09-18) */
export const NIGHT_OWL_SKILLS = new Set([
    "Open Lock", "Listen", "Spot", "Search", "Disable Device",
    "Intimidate", "Hide", "Move Silently", "Diplomacy", "Bluff",
]);

/*,,. TOGGLES (Rose 09-11: "they should be toggles, hun. It is less
   annoying. dungeons and dragons and bg3 did it right. Things like meta
   magic and power attack are toggled on so they get automatically
   declared as long as they're toggled") ,,,
   A toggle is a standing declaration on the record (its feats section,
   feats.toggles, name -> on; step 1's move 3), read by the roster at build
   and flipped live in a fight (battle.setToggle). While on, the trade or
   the metamagic applies to every swing or cast by itself; nothing is
   asked at the moment of the blow. `def` is the state before the player
   ever touches it: the trades start off (they cost accuracy), the free
   extras start on. The rows live on the fight's Actions rail and on the
   world's hotkey bar (ui/table.js), lit while on. */
export const TOGGLES = {
    "Power Attack":     { def: false, meta: "-n attack, +n damage",
        tip: "A dial up to {p} base attack bonus: each press takes one more point off every melee attack roll and adds it to melee damage, twice with a two-handed weapon and none with a light one (the penalty still stands), though an unarmed strike or a natural weapon takes it. A press past the top turns it off; the round's declaration steps it with - and +." },
    "Combat Expertise": { def: false, meta: "-n attack, +n dodge AC",
        tip: "A dial up to five, never past {p} base attack bonus. In a round with a melee swing, each point comes off {p} attack rolls and onto {p} Armor Class as a dodge bonus until {p} next turn; a round without one trades nothing. A press past the top turns it off." },
    "Rapid Shot":       { def: true,  meta: "an extra arrow, all at -2",
        tip: "Every full attack with a bow fires one arrow more, every arrow at -2, while this is on." },
    "Stunning Fist":    { def: true,  meta: "the stun on every unarmed hit",
        tip: "Every unarmed hit tries the stun while uses remain and this is on." },
    "Empower Spell":    { def: false, meta: "x1.5 dice, two slot levels",
        tip: "Every cast rolls half again as much, from a slot two levels higher, while this is on." },
    "Enlarge Spell":    { def: false, meta: "range x2, one slot level",
        tip: "Every cast reaches twice as far, from a slot one level higher, while this is on." },
    "Extend Spell":     { def: false, meta: "duration x2, one slot level",
        tip: "Every cast with a duration lasts twice as long, from a slot one level higher, while this is on." },
    "Heighten Spell":   { def: false, meta: "one level higher",
        tip: "Every cast is one level higher in every way that asks the level, from that slot, while this is on." },
    "Maximize Spell":   { def: false, meta: "maximum dice, three slot levels",
        tip: "Every cast rolls its maximum, from a slot three levels higher, while this is on." },
    "Quicken Spell":    { def: false, meta: "a swift cast, four slot levels",
        tip: "Every cast is a swift action from a slot four levels higher, while this is on." },
    "Silent Spell":     { def: false, meta: "no words, one slot level",
        tip: "Every cast needs no voice, from a slot one level higher, while this is on." },
    "Still Spell":      { def: false, meta: "no gestures, one slot level",
        tip: "Every cast needs no hands, from a slot one level higher, while this is on." },
    "Widen Spell":      { def: false, meta: "area x2, three slot levels",
        tip: "Every cast with an area spreads twice as wide, from a slot three levels higher, while this is on." },
    /* EVERY BODY'S TWO CHOICES OF DAMAGE (weapons D1n's N2; sadia's rows 2026-10-02 04:59, this half Vera's): `open`, so
       no feat gates them. The SRD, Injury and Death, Nonlethal Damage (read in Chrome by sadia that day): "You can use a
       melee weapon that deals lethal damage to deal nonlethal damage instead, but you take a -4 penalty on your attack
       roll", and "You can use a weapon that deals nonlethal damage, including an unarmed strike, to deal lethal damage
       instead, but you take a -4 penalty on your attack roll"; a monk's fist, or one with Improved Unarmed Strike,
       chooses at no cost. Two toggles, because the book's two lines are two choices; each reaches only its own kind of
       weapon, so both may stand on at once. battle.js reads f.pullBlows and f.strikeToKill (applyToggles, below). */
    "Pull Blows":       { def: false, open: true, meta: textOf("$lohTXPullBlowsMeta"), tip: textOf("$lohTXPullBlowsTip") },
    "Strike to Kill":   { def: false, open: true, meta: textOf("$lohTXStrikeToKillMeta"), tip: textOf("$lohTXStrikeToKillTip") },
};
/*,,. THE TWO TRADES ARE DIALS (Rose 2026-09-28: "power attack, when the feat is used how does it work srd? static flat
   damage or sacrifice dynamic accuracy look it up") ,,,
   SRD Power Attack, read at d20srd.org that day: "On your action, before making attack rolls for a round, you may choose
   to subtract a number from all melee attack rolls and add the same number to all melee damage rolls. This number may
   not exceed your base attack bonus." Combat Expertise: "you can take a penalty of as much as -5 on your attack roll and
   add the same number (+5 or less) as a dodge bonus to your Armor Class. This number may not exceed your base attack
   bonus."
   Both are a NUMBER the wielder chooses, and the switch handed over the whole of it every time: a sixth-level fighter
   swung at -6 or not at all. The standing declaration stays (Rose 09-11: toggled, it declares itself every round until
   changed); what it holds now is the number. A press on the bar or the rail takes one point more and turns it off past
   the top; the round's declaration panel steps Power Attack with - and + (battle.js stepTrade). The top is the base
   attack bonus itself, so at +0 there is nothing to trade: the old floor of 1 handed a first-level wizard a point the
   book does not. A record written before this holds `true`, which reads as the whole trade it always meant. */
export const TRADES = {
    "Power Attack":     { key: "powerAttack", maxKey: "powerAttackMax", top: (bab) => Math.max(0, Math.floor(+bab || 0)) },
    "Combat Expertise": { key: "expertise",   maxKey: "expertiseMax",   top: (bab) => Math.min(5, Math.max(0, Math.floor(+bab || 0))) },
};
/* the order the toggled metamagics stack in: the shape-changers first,
   the dice-changers last, so a heightened enlarged empowered ray prices
   the same however it was toggled */
export const META_ORDER = ["Heighten Spell", "Enlarge Spell", "Extend Spell", "Widen Spell",
                    "Silent Spell", "Still Spell", "Empower Spell", "Maximize Spell", "Quicken Spell"];
/* small stampers shared by rows */
const save = (k, n) => (f) => { f.saveMod = f.saveMod || { fort: 0, ref: 0, will: 0 }; f.saveMod[k] += n; };
const flag = (name, v = true) => (f) => { f[name] = v; };
const maneuver = (kind) => (f) => { f.maneuver = f.maneuver || {}; f.maneuver[kind] = 4; };
const school = (f, c, pick) => {
    f.spellFocus = f.spellFocus || {};
    const s = String(pick || "").toLowerCase();
    if (s) f.spellFocus[s] = (f.spellFocus[s] || 0) + 1;
};
const meta = (name) => (f) => { (f.metamagic = f.metamagic || []).push(name); };

export const FEAT_EFFECTS = {
    //--- the general pool: melee ------------------------------------------------
    "Power Attack": { kind: "srd", status: "live",
        note: "a dial on the bar, the Actions rail and the round's declaration, 0 to BAB: -n attack, +n damage (doubled with a two-handed weapon, none with a light one unless unarmed or natural).",
        sheet: (f) => { f.powerAttackMax = TRADES["Power Attack"].top(f.bab); f.powerAttack = 0; } },
    "Cleave": { kind: "srd", status: "live", note: "battle tryCleave: a drop buys one extra swing a round." },
    "Great Cleave": { kind: "srd", status: "live", note: "battle tryCleave: no limit on the follow-ups." },
    "Improved Bull Rush": { kind: "srd", status: "live",
        note: "+4 on the bull rush, and no attack of opportunity for making the attempt (the maneuver landed 2026-09-17).", sheet: maneuver("bullrush") },
    "Improved Overrun": { kind: "srd", status: "live",
        note: "+4 on the overrun, and the attempt draws no attack of opportunity (the maneuver landed 2026-09-17).", sheet: maneuver("overrun") },
    "Improved Sunder": { kind: "srd", status: "live",
        note: "+4 on the sunder, and the attempt draws no attack of opportunity (the maneuver landed 2026-09-17).", sheet: maneuver("sunder") },
    "Combat Expertise": { kind: "srd", status: "live",
        note: "a dial on the bar and the Actions rail, 0 to 5 (capped by BAB): -n attack, +n dodge AC, from a melee swing on its own turn until its next (featHooks attackBonus, battle.js beginTurn).",
        sheet: (f) => { f.expertiseMax = TRADES["Combat Expertise"].top(f.bab); f.expertise = 0; } },
    "Improved Disarm": { kind: "srd", status: "live",
        note: "+4 on the disarm, and the attempt draws no attack of opportunity (the maneuver landed 2026-09-17).", sheet: maneuver("disarm") },
    "Improved Feint": { kind: "srd", status: "live",
        note: "{p} feint spends the move action instead of the standard (battle resolveFeint).", sheet: flag("improvedFeint") },
    "Improved Trip": { kind: "srd", status: "live",
        note: "+4 on the trip and a free blow on a drop (battle.js: the trip move, and resolveTrip for a bite's trip); and a bare-handed trip draws no swing with it (mProvoke asks this feat first).",
        sheet: maneuver("trip") },
    "Whirlwind Attack": { kind: "srd", status: "live",
        note: "an Actions row: one melee swing at every foe in reach, a full round.", sheet: flag("whirlwind") },
    "Dodge": { kind: "srd", status: "live", note: "+1 AC and touch AC at build (against everyone; the one-foe pick is not asked).",
        sheet: (f) => { f.ac += 1; f.touchAc += 1; } },
    "Mobility": { kind: "srd", status: "live", note: "+4 AC against attacks of opportunity (featHooks acBonus).", sheet: flag("mobility") },
    "Spring Attack": { kind: "srd", status: "live",
        note: "the walk goes on past a melee blow (battle springsFor; turn.js spend 'standard', o.springs 'spring': at least 5 ft walked first, never in heavy armour); the foe {s} {closes} on to strike takes no AoO for that walk (provoke waiver). Not yet held: the 5 ft after the blow, which cannot be known until the turn ends.",
        sheet: flag("springAttack") },
    "Combat Reflexes": { kind: "srd", status: "live", note: "reactions = 1 + Dex each round; parries flat-footed.",
        sheet: (f, c) => { f.reactions = Math.max(1, 1 + (c.dexMod || 0)); f.combatReflexes = true; } },
    "Weapon Finesse": { kind: "srd", status: "live", note: "roster: the better of Str and Dex on light weapons, fists and naturals." },
    //--- ranged --------------------------------------------------------------------
    "Point Blank Shot": { kind: "srd", status: "live", note: "battle: +1 attack and damage inside 30 ft." },
    "Precise Shot": { kind: "srd", status: "live",
        note: "waives the SRD's -4 for shooting or throwing into a melee, charged since 2026-09-29 (battle intoMeleePenalty: a target engaged with a standing friend, under 10 ft from the nearest).",
        sheet: flag("preciseShot") },
    "Improved Precise Shot": { kind: "srd", status: "live",
        note: "ranged shots ignore the +4 cover and the 20 percent miss (never total cover or concealment).", sheet: flag("impPreciseShot") },
    "Rapid Shot": { kind: "srd", status: "live",
        note: "the full attack looses one arrow more, every arrow that round at -2, at any range the bow carries ({p} full mode with a bow in hand; a seat's SHOOT with the feat on and its feet unspent, battle.js since 2026-09-29); shooting inside a foe's reach provokes once, before the first arrow. A hand or light crossbow under Rapid Reload looses its bolts the same way, loaded free between them (each load provoking); a heavy one does not.",
        sheet: flag("rapidShot") },
    "Far Shot": { kind: "srd", status: "live", note: "a shot's range increment x1.5 and a throw's x2, and the farthest each carries with it (rules/weapons.js rangeIncrementOf, read by the fight and the click preview).", sheet: flag("farShot") },
    "Rapid Reload": { kind: "srd", status: "live", note: "a hand or light crossbow loads as a free action, a heavy one as a move action, and each load still provokes (battle crossbowGate, since 2026-09-29; the pool offers it for every crossbow at once); in the full attack {p} fire a hand or light one as a bow, Rapid Shot's extra bolt included (battle fullRoutineFor).", sheet: flag("rapidReload") },
    "Shot on the Run": { kind: "srd", status: "live",
        note: "the walk goes on past a shot (battle springsFor; turn.js spend 'standard', o.springs 'shot'); the foe {s} {shoots} takes no AoO for the walk that turn (provoke waiver).",
        sheet: flag("shotOnTheRun") },
    "Manyshot": { kind: "srd", status: "scaffold", waits: "a two-arrow standard action", note: "flag only.", sheet: flag("manyshot") },
    "Weapon Focus": { kind: "srd", status: "live", note: "+1 attack with the named weapon (roster bake; Unarmed and Unarmed Strike are one name now)." },
    "Improved Critical": { kind: "srd", status: "live", note: "the named weapon's threat range doubles at bake." },
    "Greater Weapon Focus": { kind: "srd", status: "live", note: "+1 more attack with the named weapon (roster bake)." },
    "Weapon Specialization": { kind: "srd", status: "live", note: "+2 damage with the named weapon (roster bake)." },
    "Greater Weapon Specialization": { kind: "srd", status: "live", note: "+2 more damage with the named weapon (roster bake)." },
    "Two-Weapon Fighting": { kind: "srd", status: "live",
        note: "the routine's SRD penalty table (-2/-2 with a light off hand, -4/-4 otherwise); the gear screen's off-hand door arms it (09-16).", sheet: flag("twf") },
    "Improved Two-Weapon Fighting": { kind: "srd", status: "live",
        note: "a second off-hand swing at -5 in the routine composer.", sheet: flag("itwf") },
    "Greater Two-Weapon Fighting": { kind: "srd", status: "live",
        note: "a third off-hand swing at -10 in the routine composer.", sheet: flag("gtwf") },
    "Improved Unarmed Strike": { kind: "srd", status: "live", note: "battle threatens(): fists threaten and never provoke." },
    "Improved Grapple": { kind: "srd", status: "live",
        note: "+4 on every grapple check, and the grab draws no attack of opportunity (the maneuver landed 2026-09-17).",
        sheet: maneuver("grapple") },
    "Deflect Arrows": { kind: "srd", status: "live",
        note: "one ranged hit a round is turned aside with a free hand (not flat-footed, no bow in hand).", sheet: flag("deflectArrows") },
    "Snatch Arrows": { kind: "srd", status: "partial",
        note: "the deflected missile is caught (the log says so); hurling it back waits on thrown gear.", sheet: flag("snatchArrows") },
    "Stunning Fist": { kind: "srd", status: "live",
        note: "one unarmed hit a round: Fort DC 10 + level/2 + Wis or stunned a round (the round is lost, -2 AC, no Dex); a day's uses by the SRD (move FT1): a monk's monk level and one for every four other levels, anyone else's one for every four levels.",
        /* its day's whole (SRD, Stunning Fist and its Special); a Savant is a monk of its level, as grantClass stamps it (Luna's
           check 04:3x); the uses left are the record's day (rules/dayUses.js takeDayUses, after this) */
        sheet: (f, c) => { const lv = c.level || 1, monk = f.monkLevel || 0;
                           f.stunPerDay = monk ? monk + Math.floor(Math.max(0, lv - monk) / 4) : Math.floor(lv / 4);
                           f.stunningFist = { uses: f.stunPerDay, dc: 10 + Math.floor(lv / 2) + (c.wisMod || 0) }; } },
    //--- mounted -------------------------------------------------------------------
    "Mounted Combat": { kind: "srd", status: "scaffold", waits: "mounts", note: "flag only.", sheet: flag("mountedCombat") },
    "Ride-By Attack": { kind: "srd", status: "scaffold", waits: "mounts", note: "flag only.", sheet: flag("rideBy") },
    "Spirited Charge": { kind: "srd", status: "scaffold", waits: "mounts", note: "flag only.", sheet: flag("spiritedCharge") },
    "Trample": { kind: "canon", status: "scaffold", waits: "mounts", note: "flag only.", sheet: flag("trample") },
    "Mounted Archery": { kind: "srd", status: "scaffold", waits: "mounts", note: "flag only.", sheet: flag("mountedArchery") },
    "Equestrian": { kind: "canon", status: "scaffold", waits: "mounts and horses",
        note: "+2 on Charisma skills against horses (number mine) through featSkillMod's vsHorse; nothing asks it yet.", sheet: flag("equestrian") },
    "Soulbond": { kind: "canon", status: "scaffold", waits: "mounts", note: "flag only.", sheet: flag("soulbond") },
    //--- the body ------------------------------------------------------------------
    "Improved Initiative": { kind: "srd", status: "live", note: "+4 initiative.",
        sheet: (f) => { f.initMod = (f.initMod || 0) + 4; } },
    /* its hit points named once (`hp`): the fighter's stamp reads it, and so does featHpOf for the pages before the road
       (Rose 2026-09-28: "toughness feat doesnt give me +3 hp... on the char creation screen") */
    "Toughness": { kind: "srd", status: "live", note: "+3 hp.", hp: 3,
                   sheet: (f) => { f.maxHp += FEAT_EFFECTS.Toughness.hp; f.hp += FEAT_EFFECTS.Toughness.hp; } },
    "Endurance": { kind: "srd", status: "live",
        note: "+4 on the world's Constitution checks (holding breath, the cold) through the Endurance label; sleeping in armour is not modelled." },
    "Diehard": { kind: "srd", status: "live", note: "battle: conscious and acting from -1 to -9." },
    /* its extra hit points named once (`heal`, of the Constitution modifier): the Feats cog's healBonusOf reads it at every
       heal by rest or by magic (moves F7a and H1) */
    "Fast Healer": { kind: "pf", status: "live",
        note: "a heal by rest or by magic gives half the Constitution modifier more, at least 1, for every body: the fight's cure (a spell or a potion), the health cog's heal acts (a potion drunk or given), a cure verse said out of a fight and each night's rest (nightMendOf).",
        heal: (c) => Math.max(1, Math.floor((c.conMod || 0) / 2)) },
    "Great Fortitude": { kind: "srd", status: "live", note: "+2 Fortitude.", sheet: save("fort", 2) },
    "Iron Will": { kind: "srd", status: "live", note: "+2 Will.", sheet: save("will", 2) },
    "Lightning Reflexes": { kind: "srd", status: "live", note: "+2 Reflex.", sheet: save("ref", 2) },
    //--- the skill feats -----------------------------------------------------------
    "Alertness": { kind: "srd", status: "live", note: "+2 Listen and Spot: the fight's fields, {p} eye in the world, a seat's senses." },
    "Acrobatic": { kind: "srd", status: "live", note: "+2 Jump and Tumble through featSkillMod: the jump, and the fight's Tumble past a threat." },
    "Agile": { kind: "srd", status: "live", note: "+2 Balance and Escape Artist through featSkillMod: the ice's Balance, and the fight's Escape Artist out of a hold." },
    "Animal Affinity": { kind: "srd", status: "live", note: "+2 Handle Animal and Ride through featSkillMod (no door asks them yet)." },
    "Athletic": { kind: "srd", status: "live", note: "+2 Climb and Swim: the swim's own check reads it." },
    "Deceitful": { kind: "srd", status: "live", note: "+2 Disguise and Forgery through featSkillMod: the disguise's check and the forgery's." },
    "Deft Hands": { kind: "srd", status: "live", note: "+2 Sleight of Hand and Use Rope through featSkillMod." },
    "Diligent": { kind: "srd", status: "live", note: "+2 Appraise (the appraisal reads it) and Decipher Script." },
    "Investigator": { kind: "srd", status: "live", note: "+2 Gather Information and Search through featSkillMod." },
    "Magical Aptitude": { kind: "srd", status: "live", note: "+2 Spellcraft and Use Magic Device through featSkillMod." },
    "Negotiator": { kind: "srd", status: "live", note: "+2 Diplomacy and Sense Motive (the feint's read takes it)." },
    "Nimble Fingers": { kind: "srd", status: "live", note: "+2 Disable Device and Open Lock: the lock and the trap read it." },
    "Persuasive": { kind: "srd", status: "live", note: "+2 Bluff (the feint takes it) and Intimidate." },
    "Self-Sufficient": { kind: "srd", status: "live", note: "+2 Heal and Survival through featSkillMod." },
    "Stealthy": { kind: "srd", status: "live", note: "+2 Hide and Move Silently: the sneak contests read it." },
    "Skill Focus": { kind: "srd", status: "live", note: "+3 on the named skill at every door (featSkillMod)." },
    //--- the caster's feats --------------------------------------------------------
    "Combat Casting": { kind: "srd", status: "scaffold", waits: "casting defensively",
        note: "+4 Concentration when a cast is marked defensive; no cast is, yet.", sheet: flag("combatCasting") },
    "Spell Focus": { kind: "srd", status: "live",
        note: "+1 DC on the spells of the chosen school {s} {casts} (battle spellDc through spellDcBonus, since 2026-09-29).",
        sheet: (f, c, pick) => school(f, c, pick) },
    "Greater Spell Focus": { kind: "srd", status: "live",
        note: "+1 more DC on the chosen school's spells (battle spellDc through spellDcBonus, since 2026-09-29).", sheet: (f, c, pick) => school(f, c, pick) },
    "Spell Penetration": { kind: "srd", status: "scaffold", waits: "spell resistance",
        note: "+2 stamped on f.spellPen; nothing resists spells yet.", sheet: (f) => { f.spellPen = (f.spellPen || 0) + 2; } },
    "Greater Spell Penetration": { kind: "srd", status: "scaffold", waits: "spell resistance",
        note: "+2 more on f.spellPen.", sheet: (f) => { f.spellPen = (f.spellPen || 0) + 2; } },
    "Empower Spell": { kind: "srd", status: "live",
        note: "metamagicVariant prices it (x1.5, two slot levels); {p} toggle on the bar applies it to every cast {s} {makes} (battle metamagicFor), and a seat's TOGGLE does the same for its casts (battle seatCastMove, 2026-09-29).", sheet: meta("Empower Spell") },
    "Enlarge Spell": { kind: "srd", status: "live", note: "metamagicVariant: range x2, one level; {p} toggle on the bar applies it to every cast {s} {makes} (battle metamagicFor), and a seat's TOGGLE does the same for its casts (battle seatCastMove, 2026-09-29).", sheet: meta("Enlarge Spell") },
    "Extend Spell": { kind: "srd", status: "live", note: "metamagicVariant: duration x2, one level; {p} toggle on the bar applies it to every cast {s} {makes} (battle metamagicFor), and a seat's TOGGLE does the same for its casts (battle seatCastMove, 2026-09-29).", sheet: meta("Extend Spell") },
    "Heighten Spell": { kind: "srd", status: "live", note: "metamagicVariant: the level itself rises; {p} toggle on the bar applies it to every cast {s} {makes} (battle metamagicFor), and a seat's TOGGLE does the same for its casts (battle seatCastMove, 2026-09-29).", sheet: meta("Heighten Spell") },
    "Maximize Spell": { kind: "srd", status: "live", note: "metamagicVariant: maximum dice, three levels; {p} toggle on the bar applies it to every cast {s} {makes} (battle metamagicFor), and a seat's TOGGLE does the same for its casts (battle seatCastMove, 2026-09-29).", sheet: meta("Maximize Spell") },
    "Quicken Spell": { kind: "srd", status: "live", note: "metamagicVariant: swift, four levels, never spontaneous; {p} toggle on the bar applies it to every cast {s} {makes} (battle metamagicFor), and a seat's TOGGLE does the same for its casts (battle seatCastMove, 2026-09-29).", sheet: meta("Quicken Spell") },
    "Silent Spell": { kind: "srd", status: "live", note: "the Feral door in creation (steps/spells.js) and metamagicVariant's noVerbal.", sheet: meta("Silent Spell") },
    "Still Spell": { kind: "srd", status: "live", note: "metamagicVariant: no somatic, one level; {p} toggle on the bar applies it to every cast {s} {makes} (battle metamagicFor), and a seat's TOGGLE does the same for its casts (battle seatCastMove, 2026-09-29).", sheet: meta("Still Spell") },
    "Widen Spell": { kind: "srd", status: "live", note: "metamagicVariant: area x2, three levels; {p} toggle on the bar applies it to every cast {s} {makes} (battle metamagicFor), and a seat's TOGGLE does the same for its casts (battle seatCastMove, 2026-09-29).", sheet: meta("Widen Spell") },
    "Eschew Materials": { kind: "srd", status: "live", note: "a spell whose material component costs 1 gp or less needs none, never a focus (data/components.js componentsFor).", sheet: flag("eschewMaterials") },
    "Augment Summoning": { kind: "srd", status: "live",
        note: "the summoned wolf arrives +4 Str and Con: +2 attack, +2 damage, +2 hp a die (battle spawnWolf).", sheet: flag("augmentSummoning") },
    //--- her canon -------------------------------------------------------------------
    "Berserker": { kind: "canon", status: "live",
        note: "+10 ft at night (number mine); every hit from an enemy {s} cannot see adds +1 damage against that enemy, to +5.", sheet: flag("berserker") },
    "Anti-Mage": { kind: "canon", status: "partial",
        note: "a blow on a caster holding a readied counter or a summoning in progress breaks it; the frame-timer clause has no clock to reset.", sheet: flag("antiMage") },
    "Mage Seeker": { kind: "canon", status: "scaffold", waits: "magical impairments",
        note: "flag only: the blindings and dazzles in play are the sun's, not a spell's.", sheet: flag("mageSeeker") },
    "Improved C. Spell": { kind: "canon", status: "live", note: "battle: any higher verse of the school may counter.", sheet: flag("impCounterspell") },
    "Night Owl": { kind: "blood", status: "live",
        note: "at night, Rose's own list (2026-09-18): +2 on ten named skills (NIGHT_OWL_SKILLS; in a fight every skill check takes it from the fight's moment, featHooks fightMomentOf), +1 damage, +1 on every save (the fight's, and the world's Fortitude since 2026-09-29), and +1 on spell save DCs (battle spellDc through spellDcBonus, since 2026-09-29).",
        sheet: flag("nightOwl") },
    "Disciplined": { kind: "canon", status: "scaffold", waits: "Rose's ruling",
        note: "flag only: its text sells invincibility frames, an abandoned concept (parked in the ledger).", sheet: flag("disciplined") },
    "Multiattack": { kind: "srd", status: "live", note: "roster: secondary naturals at -2." },
    "Improved Multiattack": { kind: "srd", status: "live", note: "roster: secondary naturals at no penalty." },
    "Blind-Fight": { kind: "srd", status: "live", note: "battle: the concealment miss is rerolled in melee." },
    "Quick Draw": { kind: "srd", status: "live",
        note: "the draw is already free (the equip switch costs no action), so the feat is the default; flagged for the day drawing costs a move.",
        sheet: flag("quickDraw") },
    "Run": { kind: "srd", status: "live", note: "the world's run is x5 speed instead of x4 ({p} pace x1.25 under shift).", sheet: (f) => { f.runMult = 5; } },
    "Two-Weapon Defense": { kind: "srd", status: "live", note: "+1 shield AC while an off-hand weapon is held (featHooks acBonus; the off-hand door arms it).", sheet: flag("twd") },
    //--- the critical feats (Pathfinder; move F6a): `crit` is a rider's row, its strength and the targets it spares ----
    "Critical Focus": { kind: "pf", status: "live", note: "a confirmation roll +4 (featHooks confirmTermsOf)." },
    "Bleeding Critical": { kind: "pf", status: "scaffold", waits: "bleeding (F6c)", note: "a row: A slashing or piercing critical leaves the foe bleeding 2d6 each round on its turn, until a DC 15 Heal check or any magical healing; it stacks." },
    "Sickening Critical": { kind: "pf", status: "scaffold", waits: "the sickened condition (F6b)", note: "a row: A critical leaves the foe sickened for a minute." },
    "Crippling Critical": { kind: "pf", status: "scaffold", waits: "a halved speed (F6c)", note: "a row: A critical halves the foe's speed for a minute (a Fortitude save, DC 10 + your base attack bonus, for 1d4 rounds)." },
    "Deafening Critical": { kind: "pf", status: "scaffold", waits: "the deafened condition (F6b)", note: "a row: A critical deafens the foe for good (a Fortitude save, DC 10 + your base attack bonus, for a round)." },
    "Staggering Critical": { kind: "pf", status: "scaffold", waits: "the staggered condition (F6b)", note: "a row: A critical staggers the foe for 1d4+1 rounds (a Fortitude save for a round)." },
    "Tiring Critical": { kind: "pf", status: "live", note: "a confirmed critical leaves the foe fatigued, until a night's rest (featHooks afterCrit).",
        crit: { cond: "fatigued", rank: 1, spares: ["fatigued", "exhausted"] } },
    "Blinding Critical": { kind: "pf", status: "scaffold", waits: "the blinded condition (F6b)", note: "a row: A critical blinds the foe for good (a Fortitude save leaves it dazzled 1d4 rounds); none on what does not see by eyes." },
    "Censoring Critical": { kind: "pf", status: "scaffold", waits: "a muted voice (F6c)", note: "a row: A critical leaves the foe unable to speak for 1d4+1 rounds, so no verse with words (a Fortitude save for a round)." },
    "Exhausting Critical": { kind: "pf", status: "live", note: "a confirmed critical leaves the foe exhausted, until rest (featHooks afterCrit).",
        crit: { cond: "exhausted", rank: 2, spares: ["exhausted"] } },
    "Stunning Critical": { kind: "pf", status: "scaffold", waits: "the staggered condition for its save (F6b)", note: "a row: A critical stuns the foe for 1d4 rounds (a Fortitude save leaves it staggered 1d4 rounds instead)." },
    "Critical Mastery": { kind: "pf", status: "live", note: "two critical feats' riders on one critical (rules/feats.js critRidersFor)." },
    "Impaling Critical": { kind: "pf", status: "scaffold", waits: "a weapon left in a body", note: "a row: A critical with that weapon leaves it in the foe, hurting it each turn until it is pulled free." },
    "Improved Impaling Critical": { kind: "pf", status: "scaffold", waits: "a weapon left in a body", note: "a row: An impaled foe needs a grapple to pull your weapon free, moves at half speed, and bleeds as it comes out." },
    "Impact Critical Shot": { kind: "pf", status: "scaffold", waits: "the push and the trip off a shot", note: "a row: A ranged critical whose confirmation beats the foe's defence pushes it back or knocks it down, provoking nothing." },
    "Dispelling Critical": { kind: "pf", status: "scaffold", waits: "Arcane Strike, not in the game", note: "a row: A critical lets you cast a targeted dispel magic at the foe as a swift action." },
    "Entreating Critical": { kind: "pf", status: "scaffold", waits: "Call Truce, not in the game", note: "a row: A critical opens a moment for a Diplomacy check to calm the foe, as Call Truce." },
    "Banishing Critical": { kind: "pf", status: "scaffold", waits: "dismissal and banishment, not in the game", note: "a row: A slashing or bludgeoning critical lets you cast dismissal or banishment at the foe at once, its Will save at -4." },
    "Critical Versatility": { kind: "pf", status: "scaffold", waits: "the day's practice", note: "a row: Once a day, an hour's practice gives you a critical feat you qualify for until you practise another." },
    "Accursed Critical": { kind: "pf", status: "scaffold", waits: "the curse spells, not in the game", note: "a row: A spell's critical lets you cast bestow curse or major curse at the target at once." },
    "Blighted Critical": { kind: "pf", status: "scaffold", waits: "spellblights", note: "a row: A touch spell's critical gives the target a random minor spellblight." },
    "Greater Blighted Critical": { kind: "pf", status: "scaffold", waits: "spellblights", note: "a row: A touch spell's critical gives the target a random major spellblight." },
    "Blighted Critical Mastery": { kind: "pf", status: "scaffold", waits: "spellblights", note: "a row: You choose the spellblight your blighted criticals give." },
    //--- the teamwork set (Pathfinder) --------------------------------------------------
    "Outflank": { kind: "pf", status: "partial",
        note: "the flank is +4 when the flanking ally also carries it; the crit-hands-an-AoO half waits on the swing chain.", sheet: flag("outflank") },
    "Precise Strike": { kind: "pf", status: "live", note: "battle: +1d6 flanking with a fellow, light or one-handed piercing." },
    "Shield Wall": { kind: "pf", status: "scaffold", waits: "shields", note: "flag only: no shield exists.", sheet: flag("shieldWall") },
    "Back to Back": { kind: "pf", status: "live", note: "battle: +2 AC against flankers beside a fellow." },
    "Swap Places": { kind: "pf", status: "scaffold", waits: "a swap verb in the move road", note: "flag only.", sheet: flag("swapPlaces") },
    "Escape Route": { kind: "pf", status: "live",
        note: "moving past a foe a fellow stands beside provokes nothing (provoke waiver).", sheet: flag("escapeRoute") },
    "Coordinated Maneuvers": { kind: "pf", status: "live",
        note: "+2 on trips and feints beside a fellow, +2 against being tripped.", sheet: flag("coordManeuvers") },
    "Paired Opportunists": { kind: "pf", status: "partial",
        note: "+4 on attacks of opportunity against a foe a fellow also threatens; the shared-trigger half waits on the AoO offer.", sheet: flag("pairedOpp") },
    "Duck and Cover": { kind: "pf", status: "live",
        note: "on a burst, an adjacent fellow's Reflex roll may stand in for {own}; {s} {falls} prone if it does.", sheet: flag("duckCover") },
    "Shake It Off": { kind: "pf", status: "live", note: "+1 on saves per adjacent fellow, to +3.", sheet: flag("shakeItOff") },
    "Lookout": { kind: "pf", status: "live", note: "the surprise round: {s} {acts} if an adjacent fellow was aware.", sheet: flag("lookout") },
    "Stealth Synergy": { kind: "pf", status: "scaffold", waits: "a second hider in the sneak contest",
        note: "flag only: the world's sneak is {own} alone.", sheet: flag("stealthSynergy") },
    "Tandem Trip": { kind: "pf", status: "live", note: "a trip beside a fellow who also threatens rolls twice, keeps the better.", sheet: flag("tandemTrip") },
    "Parry": { kind: "canon", status: "live", note: "battle: the declaration and the opposed roll." },
    "Improved Parry": { kind: "canon", status: "scaffold", waits: "weapon sizes", note: "flag only: no size penalty exists to lessen.", sheet: flag("improvedParry") },
    "Riposte": { kind: "canon", status: "live", note: "battle: the counter after a parry." },
    //--- the bloodline feats --------------------------------------------------------
    "Troll-kin": { kind: "blood", status: "live",
        note: "regeneration 1 and the fire-or-acid death (battle); the sun where the body stands: in a fight 1 damage a round and Fort DC 12 (number mine) or paralysed for the round (Rose 10-01), in the world 1 damage every ten game minutes in direct sunlight and the same save or its feet held a round (every body, U6), shelter and shade stopping it; the world's hourly knit asks the body's own place (U6-ii). Both are rows the blood grants (rules/conditions.js GRANTS, effects step 3c), their numbers in those rows." },
    "Ethnocentric": { kind: "blood", status: "live", nearFt: 30, note: "+1 attack and damage per kin of the same race who also holds it, on its feet and within nearFt (Rose 2026-10-07: 'as long as they're near each other', in a fight or out of one, and Rose's pick 'Same race, 30 ft'; rules/feats.js ethnocentricOf). A seat's and a dealt sheet's race rides the sheet since 2026-09-29 (roster seatSheetFrom); before that no seat or NPC was ever anyone's kin." },
    "Nobility": { kind: "blood", status: "live", note: "battle: every ally of a carrier, party members and summons (Rose 2026-09-29), takes +4 Str and Con in the fighter's currency: +2 attack, damage and Strength checks, +2 Fortitude and Concentration, and +2 hp per hit die, lent for the fight and handed back when it ends (nobleFavour, nobleSweep, unennoble)." },
    "Giant Grip": { kind: "blood", status: "live", note: "roster: melee steel one size larger, the die a step up the SRD size table (data/weaponSize.js), -2 attack after Monkey Grip, effort unchanged; main and off hand both.", sheet: flag("giantGrip") },
    "Tremorsense": { kind: "blood", status: "live",
        note: "his ruling and his model (world/tremorsense.js, 2026-09-18): twenty feet of floor is ABSOLUTE -- a moving body in it is felt with no roll -- and the ear is twenty alone, sixty when elven Observant stands with it, which is the only way that sixty exists. Hearing reveals nothing absolutely: a moving body that fails Move Silently against {p} passive Listen at -4 leaves a fading mark where the sound was. Nothing airborne is ever automatic. Past all that {s} {is} blind. In a fight, no concealment inside the twenty, and past it {s} {is} blind: every swing is at total concealment and no charge starts (Rose 2026-09-29: 'theyre blind already'). (Ten, then thirty, then twenty: Rose settled it by playing it.)",
        sheet: (f) => { f.tremorsense = 20; } },
    "Barbaric": { kind: "blood", status: "live", note: "battle: +1 per fifth of hp lost, +2 more in Diehard's corridor." },
    /* NOT A FEAT THE CHILD TAKES (Rose 09-17): a parent carries it and the Savant path unlocks on the starting-path
       page. The row stays so a parent's sheet can read it, and the flag is set for whoever carries it. */
    "Savant": { kind: "blood", status: "live",
        note: "carried by a parent, never taken: it unlocks the Savant path (d12, every class's first gift, no level beyond the first) and that path shuts every other class.",
        sheet: flag("savant") },
    "Noble Rage": { kind: "blood", status: "live", note: "feinting and guile stay open while raging, and of the spells only a reaction (feather fall, misty step); anything longer is refused (Rose 09-17). One gate for every body since 2026-09-29 (battle rageRefusal: the player's own road, a seat's CAST and FEINT orders, instinct's cast).", sheet: flag("nobleRage") },
    "Tracking": { kind: "blood", status: "live", note: "the surprise round's sneak attack deals +2 per die.", sheet: flag("tracking") },
    "Dream Eater": { kind: "blood", status: "live",
        note: "+3 damage against a body THIS cubi charmed or fooled, and +1 hp drunk per landing hit (Rose 2026-09-18: '+3 to damage vs charmed opponents... they must have been charmed by the cubi', and the drain nerfed to +1 a hit because a changeling can land four). Magical holds count; fog and flour do not. A body of a cubi line and a Changeling line drinks the +1 from EVERY landing hit, because the changeling's disguise counts as an illusion (Rose 2026-09-29; battle disguiseFeeds); its +3 stays on the fooled.",
        sheet: flag("dreamEater") },
    "Aug. Disguise": { kind: "blood", status: "live",
        note: "+6 Disguise through featSkillMod (Rose 2026-09-18), which the disguise's own check reads.", sheet: flag("augDisguise") },
    "Shadow Strike": { kind: "blood", status: "live", note: "one free sneak attack die IN THE DARK, whatever the class (Rose 09-17), and the dark is where the striker stands, never the hour (Rose 2026-09-29, 'darkness period'): battle sneakDiceOf counts it with the class dice while no light reaches the striker (featHooks darkAround, the world's light law); none in the light." },
    "Shadow Step": { kind: "blood", status: "live", note: "world: in darkness {s} {is} a contest, never a given." },
    /*,,. THE NATURAL-WEAPON FAMILY (Rose 2026-09-17, Pathfinder read off d20pfsrd that day) ,,,
       Three that run and one that waits. The quotes live beside each number where it is spent. */
    "Improved Natural Armor": { kind: "pf", status: "live",
        note: "+1 natural armour, to AC and never to touch, stacking each time it is taken (PF: \"the creature's natural armor bonus increases by +1\").",
        sheet: (f) => { f.naturalAc = (f.naturalAc || 0) + 1; } },
    "Improved Natural Attack": { kind: "pf", status: "live",
        note: "the chosen natural weapon's die steps up one size category (PF: \"as if the creature's size had increased by one category\").",
        sheet: (f, c, aim) => { f.naturalStep = f.naturalStep || {}; if (aim) f.naturalStep[String(aim).toLowerCase()] = (f.naturalStep[String(aim).toLowerCase()] || 0) + 1; } },
    "Rending Claws": { kind: "pf", status: "live",
        note: "both claws landing in one turn: the second tears for +1d6, precision, never multiplied, once a round (PF's own wording).",
        sheet: flag("rendingClaws") },
    "Snatch": { kind: "pf", status: "live",
        note: "a claw or a bite that lands takes hold at once (battle applyAttackOutcome: no line opened, no grab rolled, the hold still contested), and the Fling row throws what it holds 1d6 x 10 ft for 1d6 a ten feet.",
        sheet: flag("snatch") },
    //--- the race traits -----------------------------------------------------------
    "Observant": { kind: "race", status: "live",
        note: "+2 Spot, Search and Listen (his numbers, 2026-09-18), and the passive ear: anything within 120 ft must beat {p} Listen at -4 to stay hidden, sight or no sight, which is what the surprise round reads (void.js sheHears). Hidden SCENERY -- a secret door, a cache -- is still the one thing there is nothing of to find.",
        sheet: flag("observant") },
    "Light Step": { kind: "race", status: "live", note: "+4 Move Silently (Rose 2026-09-18), running or not." },
    /* Rose 2026-09-18, twice: the die is a BONUS on a sneak attack that already applies and only after a
       teleport, and the quiet is +2 Hide and Move Silently in darkness or in shadow. */
    "Shadowmeld": { kind: "race", status: "live",
        note: "+5 ft and +2 Hide and Move Silently in darkness or in shadow, and a BONUS sneak die on the first blow after a teleport when the target is already open to a sneak attack (Rose 09-18: the die is never a licence to sneak attack, and 'in shadow' means a shadow lying over you, anyone's or anything's)." },
    "Night Vision": { kind: "race", status: "live", note: "intrinsic since 08-07: the blood's grade, drawn by world/darkvision.js." },
    "Flame Affinity": { kind: "race", status: "live", note: "intrinsic since 08-07: DR 5 fire on the blood." },
    //--- the ethnicity signatures ------------------------------------------------------
    "Rapier Affinity": { kind: "line", status: "live",
        note: "+10 ft always (Rose's word); +2 damage and +2 AC while a rapier is the weapon selected (Rose 09-17: in hand means chosen, not drawn).",
        sheet: (f) => { f.speedFt += 10; f.affinityRapier = true; } },
    "Greatsword Affinity": { kind: "line", status: "live", note: "+4 damage and +2 AC while a greatsword is the weapon selected (Rose 09-17: in hand means chosen, not drawn).", sheet: flag("affinityGreatsword") },
    "Unarmed Affinity": { kind: "line", status: "live", note: "+10 ft always (Rose's word); +2 damage bare-handed (rules/feats.js featRidersOf).",
        sheet: (f) => { f.speedFt += 10; f.affinityUnarmed = true; } },
    "Polearm Affinity": { kind: "line", status: "live",
        note: "+2 damage with a polearm and one extra reaction a round while one is the weapon selected (Rose 09-17).", sheet: flag("affinityPolearm") },
    "Woodland Affinity": { kind: "line", status: "live",
        note: "in woodland (the map's biome): +2 damage, +2 AC, +2 Hide and Move Silently; in forest +2 Survival too.", sheet: flag("affinityWoodland") },
    "Darkness": { kind: "line", status: "live",
        note: "the SRD's Darkness spell as a spell-like ability, once between rests (Rose 2026-09-18): 20-ft radius, 10 min/level, normal flames inside it out, and 20 percent concealment for every eye in it -- darkvision included, which is what the 3.5 spell says. Tremorsense is not sight and still passes.",
        sheet: (f) => { f.darknessPerRest = 1; f.darknessUses = 1; } },   // once between rests, the record's day (move FT1)
    "Lunari Ritual": { kind: "line", status: "live",
        note: "his own table of eight, data/moon.js (2026-09-18), stamped at the top of a fight and read live on the grass: new +5 Hide and Move Silently, waxing crescent +2 initiative, first quarter +2 saves, waxing gibbous a free top slot, full night eyes and +2 Int and Wis and a caster level (stamped in a fight since 2026-09-29), waning gibbous a point of healing a damage die, last quarter one reroll a day on anyone's dice, waning crescent -1 on the saves of the wounded against the Lunari's spells (Rose 2026-09-29). The free cast is spent at the two doors a slot is spent through.",
        sheet: flag("lunari") },
    "Polymorph": { kind: "line", status: "live",
        note: "a bar tile (Another Face): race and sex swapped cosmetically at will, one Disguise check per donning with the SRD's +10 for form-altering magic and -2 a step for race and sex, and every mind's Spot opposed to it on sight and each hour (Rose 2026-09-18; the feat's own text: 'never broken, but can be disbelieved').",
        sheet: flag("polymorph") },
    "Masochism": { kind: "line", status: "live",
        note: "+1 hp per landing hit, anyone, always (Rose 2026-09-18 set the number himself: 'Masochism and Dream eater is a +1 each', so the two together drink 2 a hit).",
        sheet: flag("masochism") },
    "Black Cat": { kind: "line", status: "live",
        note: "unobserved, which is no body it knows about having it in sight, crouched or not; a watcher it has not made out never counts (Rose 2026-09-29): +5 ft ({p} pace and every body's) and +2 Hide and Move Silently; in a fight (the surprise round, or unseen) +1 damage, and the first blow on each unaware foe is a critical (Rose 09-17: '+5 ms, +2 hide, +2 move silently + 1 damage'); no sneak die.",
        sheet: flag("blackCat") },
    "Devour Dead": { kind: "line", status: "live",
        note: "an Actions row beside a corpse: rapid healing 1 for ten rounds, his number since 2026-09-18 ('+1 rapid healing for 10 turns upon feeding on corpses'). The corpse's feats are read aloud; LEARNING them is the one half still unbuilt, and his own description still promises it.",
        sheet: flag("devourDead") },
    "Phase": { kind: "line", status: "live", note: "an Actions row in darkness, which is the dark where the body stands, never the hour (Rose 2026-09-29, 'darkness period'): a 30 ft teleport for the move action, no blade follows.", sheet: flag("phase") },
    //--- the Riven deformities ---------------------------------------------------------
    "Riven Hands": { kind: "riven", status: "live", note: "roster: a pair of primary claws." },
    "Riven Jaw": { kind: "riven", status: "live", note: "roster: a secondary bite." },
    "Barbed Tail": { kind: "riven", status: "live", note: "roster: a secondary tail that trips." },
};

