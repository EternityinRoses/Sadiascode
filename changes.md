# Change log: game and Cloude fixes

Every fix Nimbus (PC chat) or Cloude (cloud chat) makes for the wishlist goes here, newest at the bottom.
Each entry says what changed, where it is, and exactly how to undo it.
The game folder `D:\Sadias Canvas` is **not** a git repo, so this log plus `.backups/` (in Cloude's folder) are the only way back.
Backups are named `<time>__<path with __ for slashes>`, e.g. `20261010-135314__D__Sadias Canvas__src__world__void.js`.

---

## 1. Party seat no longer stands NEUTRAL in fights (wishlist #1)
- **When / who:** 2026-10-10, Nimbus
- **File:** `D:\Sadias Canvas\src\world\void.js`, in `startFightOnMap`, inside the loop `for (const f of allies || [])`, right after the line
  `if (m && m.revenant && m.revenant.standing !== "hostile") asRevenant(f, m.revenant.standing, m.revenant);` (about line 8317)
- **What:** added a comment starting `/* HER PARTY FIGHTS AT HER SIDE, AT THE OPENING TOO` and one line:
  `if (m && f.faction && inHerParty(seatLedger(m))) setStance(f.faction, PARTY, "ally");`
- **Why:** a seat standing beside Rose when a fight opens is built by `buildHerParty -> partyFrom -> seatFighter`, which gives it its own `seat:n` faction but never allies it. Fix 12b only patched the other two doors (the foes site and the `joinFight` latecomer site). So the seat had no enemies, ATTACK was ignored and READY GUARD said "no friend".
- **Undo:** delete that comment block (4 lines) and the `setStance` line. Or copy back the backup `.backups/20261010-135314__D__Sadias Canvas__src__world__void.js` (taken just before this edit; it is the whole file, so it also undoes anything made after it).
- **Status:** `node --check` passes. **Needs a test in a fight:** the seat should attack, and READY GUARD should find Rose.

## 2. Shorter game turns (wishlist #2)
- **When / who:** 2026-10-10, Cloude (cloud chat)
- **File:** `app.py` (Cloude, in git). New `only_fresh()` with `SEEN_MIN_CHARS` / `SEEN_REFRESH_SEC`, just above `game_turn`. In `game_turn` it replaces the old `seat_briefs` whole-brief hash; in `cloud_game_turn` it wraps the world_state.md text.
- **What:** the game's brief is the rule book plus the live world, so it never matched the last one and the whole rule book (~15k chars) went out every turn. Now each paragraph of 400+ chars goes out once and is left out while unchanged, with a one-line note saying so; it's re-sent every 30 min so a compacted chat gets it back. Tested on a real turn: 21k chars down to 5.8k.
- **Undo:** `git revert` this commit, or in `game_turn` put back the `briefs = chat.setdefault("seat_briefs", {})` hash block and drop the `only_fresh(...)` call in `cloud_game_turn`.
- **Status:** tested offline on a saved turn. Needs Cloude restarted; then watch a few game turns.

## 3. The seat's notebook (wishlist #5)
- **When / who:** 2026-10-10, Cloude (cloud chat)
- **File:** `app.py`: `notebook_path`, `notebook_lines`, `take_notes` (above `game_turn`); `game_turn` adds the notebook to each turn; `answer_request` runs answers through `take_notes`. Notes live in `seats\notebooks\<seat>.md` in Cloude's folder (not the game folder, not in git).
- **What:** every game turn shows the character's own notes (up to 30 lines). A `NOTE: ...` line in an answer adds one, `UNNOTE: <words>` drops notes holding those words; both are stripped before the answer goes to the game, and each change shows in the activity line.
- **Undo:** `git revert` this commit; delete `seats\notebooks\` if you like.
- **Status:** tested offline. Needs Cloude restarted.

## 4. Old queued orders get cleared (wishlist #6)
- **When / who:** 2026-10-10, Nimbus
- **File:** Cloude's `app.py` only (no game files). It's in git, so `git revert` on this commit undoes it.
- **What:**
  - New `STALE_ORDER_S = 15 * 60` and `clear_orders(folder, older_than=0)`, just above `INVITES_SEEN = {}`. It deletes unread `act_*.txt` / `speak_*` files in a seat mailbox and writes what it dropped to `seats/activity.log`.
  - `seat_runner` calls `clear_orders(folder, STALE_ORDER_S)` each pass (line after `prove_awake(folder)`), so any order the game hasn't read in 15 minutes is thrown away instead of firing when the game reopens.
  - In the cloud mailbox `act`/`say` branch: a `### <id> act` message whose body is just `CLEAR` (or `CLEAR ORDERS`) deletes every unread order and writes nothing.
- **Why:** a stray `GO the old road east to Harrowmere` + `RUN` from 5 AM was still sitting in `seats/` (the game only drains files while it runs). Both were swept in the first test.
- **Undo:** remove the `clear_orders` line in `seat_runner`, the CLEAR block (starts `if folder is not None and re.fullmatch(r"\s*CLEAR`), and the `STALE_ORDER_S` / `clear_orders` definitions. Restart.
- **Status:** compiled; stale sweep tested on the real mailbox. Needs **Restart** to go live.

## (Cloude) Context window setting
- **When / who:** 2026-10-10, Nimbus. Rose asked for 500k.
- **Files:** `app.py` (`/api/settings` accepts `compact_at`, 50,000 to 1,000,000; `/api/status` returns it), `static/index.html` (a "Context window" number field above Auto-run), `static/app.js` (fills and saves it).
- **Undo:** `git revert` the commit "Settings: context window (compact_at) field", or just set the field back to 100000.

## (Hollow Town) The mayor is played by Cloude
- **When / who:** 2026-10-10, Nimbus. Rose: "make the original mayor literally you, like the LLM seat in LoH.exe".
- **Files (all in git):**
  - `town/server.py`: new provider `"cloude"` (added to `PROVIDERS`), `ask_model` sends it to new `ask_cloude()`. That drops `request_<id>.json` in `seats\town_mayor\` (made on first use, with a `SEAT.json` saying `"game": "Hollow Town"`) and waits up to 150 s for `reply_<id>.txt`. In `think()` a `cloude` brain plans at most every `cloude_every_minutes` (5).
  - `town/town_brains.json`: mayor `{"provider": "cloude", "model": "mayor"}`, plus `cloude_every_minutes: 5`. Folk stays on `gpt-oss:20b-cloud` (qwen3.5:4b was tried and lagged, reverted).
  - `app.py`: new `seat_game(folder)` reads that `"game"` so the turn says "in Hollow Town", not "in Legends of Harpine".
- **Undo:** set the mayor back in `town_brains.json` (e.g. `{"provider": "ollama", "model": "gpt-oss:120b-cloud", "host": "http://localhost:11434"}`); delete `seats\town_mayor\`. Code: `git revert` the commits, or leave it (unused without a `cloude` brain).
- **Needs:** Cloude **Restart** (app.py), Cloude running with seats on, and Town.bat restarted.

## 5. Game log in the seat mailbox (wishlist #3)
- **When / who:** 2026-10-10, Nimbus
- **Files (game, not in git):**
  - `D:\Sadias Canvas\src\world\void.js`, the console ring (`if (!window.__lohConsole)`, about line 800): the `const keep = ...` line became `const keep = window.__lohKeep = ...` and also counts lines in `window.__lohConsoleN`. A 2-line comment above it.
  - Same file, `endFightOnMap()` (about line 9240), right after `const herWasIn = ...`: a `try { ... "fight over: " ... }` block that puts each fighter's name and hp/dead into the ring.
  - `D:\Sadias Canvas\src\pilot.js`: `fileReport` added to the `import { ask, speak, ... } from "./minds.js"` list; new `const LOG_EVERY = 20, LOG_MAX = 20;` under `PUBLISH_EVERY`; in `listenTick`, after the publish block's `.then((ok) => { if (!ok) giveBack(); }).catch(giveBack);`, a block starting `/*,,. THE GAME LOG IN THE MAILBOX`.
- **What:** every error, warning and fight result goes into `REPORTS.md` in the seat's mailbox folder (the game server's existing `/api/seat/report`, append-only). Only new lines, at most every 20 s, 20 lines a time, and repeats are folded ("(x5)").
- **Undo:** remove those blocks and put the `keep` line back to `const keep = (line) => { ring.push(String(line).slice(0, 320)); if (ring.length > 40) ring.shift(); };` and drop `, fileReport` from the import. Or copy back the backups taken just before: `.backups/20261010-141233__D__Sadias Canvas__src__world__void.js` (also undoes later void.js edits, but keeps fix #1) and `.backups/20261010-141300__D__Sadias Canvas__src__pilot.js`.
- **Status:** `node --check` passes on both. Needs the game reloaded, then look for `REPORTS.md` in `seats\`. Cloude's turns don't show REPORTS.md yet; the cloud was asked to add its new lines in `game_turn`.

## 6. The seat sees the new part of REPORTS.md each turn (wishlist #3, Cloude side)
- **When / who:** 2026-10-10, Cloude (cloud chat)
- **File:** `app.py`: new `new_reports()` just above `game_turn`; `game_turn` adds its result to the turn, before the notebook.
- **What:** each game turn shows what the game appended to `REPORTS.md` in the seat's mailbox since the seat last saw it (byte offset per seat kept in the chat as `seat_reports`; resets if the file shrinks; capped at the last 3000 chars). Nothing is shown when there's nothing new.
- **Undo:** `git revert` this commit, or delete `new_reports()` and the three `reports = ...` lines in `game_turn`.
- **Status:** tested offline. Needs Cloude restarted, and Nimbus's pilot.js part (entry 5) to write the file.

## (Hollow Town) Cleaner town-mind words and phrases
- **When / who:** 2026-10-11, Cloude (cloud chat), from Nimbus's lore.json read.
- **File:** `town/sim.js` (in git): `keywords` / `isName` / extra `STOP` words (near `sim.keywords`), `wholeSentences` + `learnPhrase`, `heardBy` / `groundWords` / `GROUND_MIN`, the `text` line in `sim.applyChat`, and `cleanLore` called from `sim.importLore`.
- **What:** (1) contractions (i'm, you're…) and filler words (like, one, see…) are never keywords; (2) people's names (every name pool + everyone in town + "rose") are never keywords, so a phrase keys on what was said, not who to; (3) a phrase is saved only up to its last whole sentence (no "learn a trad"), and spoken lines over 240 chars are cut at a sentence or word; (4) words are tied to an act only if said TO that person in the 5 game minutes before it (overheard talk no longer teaches, so fencing isn't tied to small talk). An old lore.json is cleaned on load: junk words removed, phrase keys filtered, cut lines trimmed or dropped.
- **Undo:** `git revert` this commit. The cleaning on load drops junk entries from lore.json the next time it's saved; a copy of the old file would need to be kept by hand first if wanted.
- **Status:** tested in node (keywords, sentence cuts, lore cleaning, 2-day run with chat; phrases now get reused).

- **(Hollow Town) Cloude option in Settings (Nimbus):** town/index.html: added 'Cloude (in its chat)' to the Mayor and Townsfolk brain menus, which used to show blank for the cloude provider. Backup .backups\20261010-211500__town__index.html.

- **(Hollow Town) Escape button (Nimbus):** town/index.html + view.js: an 'Escape' button (cEscape) that shows only while Rose is jailed and runs playerDo('escape'). Backups .backups\20261010-214000__town__*.

- **(Hollow Town) Talk from jail (Nimbus):** town/sim.js doAs: a jailed but conscious person can still talk, say, bribe, persuade, give, intimidate and lie (jailTalk); moving stays blocked. Backup .backups\20261010-214500__town__sim.js.

- **(Hollow Town) NPCs answer each other (Nimbus):** the per-person chat limit (chat_every_minutes) was also blocking *replies*, so talks died after one line. view.js now sends reply:true for answers; server.py only limits starting a talk. Backups .backups\20261010-215500__town__view.js / server.py.

- **(Hollow Town) Pip attack loop (Nimbus):** sim.js animal 'attack' act: a beast drops its grudge (hurtBy) on someone who's unconscious or jailed instead of starting a new 0-round fight every minute. Backup .backups\20261010-221000__town__sim.js.

- **(Hollow Town) AI witnesses shout for the guard (Nimbus):** sim.js deed(): the hue-and-cry crier no longer skips AI-run people (!thinks), so with the townsfolk on an AI brain, witnesses of assault/murder still call the guard. Backup .backups\20261010-222500__town__sim.js.

- **(Hollow Town) AI witnesses decide + no coup de grace (Nimbus):** sim.js deed(): the reflex shout is plain-brain only again; instead the 4 nearest AI witnesses of assault/mugging/murder/robbery get an immediate askOrders ('You just SAW X kill Y... shout for the guard, step in, flee, report, or look away'). Coup de grace removed from legalActions and the rules text. Backup .backups\20261010-224000__town__sim.js.

- **(Hollow Town) Stun fix (Nimbus):** sim.js: waking from a knockout left nonlethal damage at hp-1 (one tap = out again, while HP looked full); now it's capped at half HP, and stun wears off at level per hour outside fights. view.js shows '(N stun)' in the combat order. Coup de grace restored (Rose: it was fine). Backups .backups\20261010-225500__town__*.

- **(Hollow Town) One health bar, as in LoH (Nimbus):** sim.js hurt(): nonlethal blows now come off hp (stopping at 0 = out cold and stable), no hidden second bar; nl only tracks the bruised share, which heals back into hp at level/hour and overnight. conscious() no longer compares nl. Staggered gone. view.js shows one hp number. Replaces the earlier stun fix. Backups .backups\20261010-231000__town__*.

- **(Hollow Town) Nightly beasts + 3-day generations (Nimbus):** sim.js: a beast attack every night at 22:00 (the old day-22-then-every-3-6-days schedule is off); invade() scales as day+20, so wolves/boar/bear from night 1, dire wolves from day 8, ogres from day 15. Generations default to 3 days (sim, view.js default + one-time migration of the saved setting, a '3' option in Settings). Backups .backups\20261010-233000__town__*.

- **(Hollow Town) Diseases + generation reset (Nimbus):** sim.js: the 10 SRD diseases (DISEASES, expose, diseaseDay at dawn, diseaseHour spreading). Caught from beast bites, bad meat/fish/berries, looting corpses (slimy doom), opening graves (mummy rot), the sick nearby (cackle fever, mindfire, shakes), and now and then the town air. Daily Fort save or ability damage; 2 saves in a row cure it (devil chills 3); an Infirmary doctor's Heal can stand in; mummy rot needs a working cleric. Con 0 kills. AI facts and the person panel show it; plain brains go for treatment. Generations: after genDays the live game ends the generation (plain brains evolve), writes lore.wisdom (a short summary of each generation, last 8 lines) that goes into every AI identity, and starts a new town. Smoke-tested in node (4 days, no errors). Backups .backups\20261010-234500__town__*.

- **(Hollow Town) Talk chains + paid care (Nimbus):** view.js onChat: each NPC talk gets 0-4 replies (weights 0:1,1:2,2:3,3:1,4:1 of 8), end:true is ignored until the last line, the last speaker is told to wrap up, plain brains answer with plainSay. sim.js: doAs 'cure' (Rose's 'Get cured' button, AI 'get cured', plain brains via treat): the Infirmary doctor rolls Heal vs the DC for 3c, the Chapel cleric cures anything (mummy rot too) for 6c; capacity sim.careSlots {healer 3, chapel 2} at a time, a place held 4 h or until cured; sim.careFee. Backups .backups\20261011-000500__town__*.

- **(Hollow Town) No walking through each other (Nimbus):** sim.js: separate() each step nudges conscious, free people closer than ROOM (0.7 m) apart (not the downed, carried, jailed or fighting); stepToward stops beside a spot someone already stands on (counts as arrived) and at arm's length from a person it walks to. Node test: after the first minutes, overlaps dropped from ~20 pairs to 0-1. Backup .backups\20261011-002000__town__sim.js.

- **(Hollow Town) Contagion, diagnosis, talking to the selected (Nimbus):** sim.js: catching diseases with per-hour odds next to the sick: cackle fever 15%, mindfire 12%, shakes 10%, slimy doom 8%, mummy rot 4%. Each disease has 'looks' (symptoms). identifies(obs, q): only Heal +4 or better (or a doctor/cleric, +4) may name it, d20+Heal vs the DC, once per illness; others see the symptoms (AI 'You can see', their own illness, Rose's person panel). doAs 'say' with extra.to (view.js passes the selected person): logs 'Rose to Name: ...' and that person answers. Backups .backups\20261011-004000__town__*.

- **(Hollow Town) Earshot, whispers, chosen hearers, Guard! runners (Nimbus):** sim.js: EARSHOT 9 m (~30 ft), CRY_RANGE 18 m (~60 ft), inEarshot(). Rose's say: everyone in earshot remembers it; 'whisper' (index.html checkbox, needs a selected person within 2.5 m) reaches only them; 'Guard!/Help!' typed aloud raises the cry. AI chat replies may add hearers:[ids] (only those in earshot hear) or whisper:true; the TALK prompt lists who's in earshot; an AI line with 'guard!' raises the cry. hueAndCry reaches 18 m; runForGuard sends the 2 nearest non-guard, non-culprit hearers (task 'fetchguard', running) to the nearest guard out of range or the station, who then comes (or is asked, in orders mode). Node-tested. Backups .backups\20261011-010500__town__*.

- **(Hollow Town) Daily elections (Nimbus):** sim.js: sim.firstElection = 2, sim.electionEvery = 1 (isElectionDay / nextElectionDay); vote at noon every day from day 2; candidates stand the day before or on the day; countdown, AI election news and the mayor's text follow. Node test: votes on days 2, 3 and 4 with challengers. Backup .backups\20261011-012500__town__sim.js.

- **(Hollow Town) All elections daily (Nimbus):** sim.js: the guards' captain vote (18:00) and each gang's boss vote (21:00) now follow the same isElectionDay calendar as the mayor (every day from day 2); their countdown lines too. Backup .backups\20261011-013500__town__sim.js.

- **(Hollow Town) Clickable log, 'me' filter, replies to Rose (Nimbus):** view.js: a log line about someone is clickable and selects them (focuses the say box); a 'me' filter shows only lines involving Rose; the left panel's election day uses nextElectionDay. sim.js: saying something with nobody selected is answered by the nearest AI-run person in earshot (was 5 m); view.js: if that AI gives no answer, they reply in plain words (plainSay). Backups .backups\20261011-015000__town__*.

- **(Hollow Town) Per-person chat logs (Nimbus):** server.py: POST /chatlog appends each talk line to town/chatlogs/<town>/<id>.md for everyone it was between (gitignored); GET /chatlog (town, person) shows it; settings 'chatlog_mayor' (default false) skips the mayor's log while Cloude plays the mayor (it has its own chat). view.js: S.onLog posts new 'talk' lines; the person panel has a 'chat log' link. Needs a Town.bat restart. Backups .backups\20261011-020500__town__*.

- **(Hollow Town) Beasts hunt (Nimbus):** sim.js: Wildwood beasts always use prowl() (the learned animal mind made them wander and graze, so the bear sat in the fields); prowl hunts the nearest person by scent within 60 m, through doors, livestock only when no one is near; logs 'catches a scent and heads into town'; wandering goes into town. Node test: the night-1 bear mauled two people in town by 22:41, and a night guard killed it at 22:56. Backup .backups\20261011-021500__town__sim.js.

- **(Hollow Town) Bounty board, boss kit, the dead traveller (Nimbus):** sim.js: postBounty() puts a proved criminal (seen by a guard, or reported at the desk; crime weight 3+) on the board at 2x the crime weight (max 30c, from the treasury); shown in everyone's facts and on the left panel; paid when they reach the cells (a guard hauls, a bounty hunter hauls, or anyone carries them, knocked out, into the station). Bounty hunters: sellswords and the greedy-and-hard go after names nearby with nonlethal blows (not an assault), 4 h cooldown, and haul the loser. The crime-boss persona starts with a greatsword, full plate and 50c. A hidden body in the Wildwood (Aldous Merrow: 200c, Longsword +1 (new: enh +1 hit/dmg), Gilded elven chain (new armour), bread, meat, waterskins, and a note about his wife Elspeth and daughter Wren); the undertaker skips it until found; looting now takes everything and equips upgrades; his things aren't theft; 'turn in' at the station (Rose's button, AI command) gives it to the town for his family, with a 20c finder's reward and the town's goodwill. People see bodies within 10 m. Backups .backups\20261011-023500__town__*.

- **(Hollow Town) Loot everything (Nimbus):** sim.js: a body now holds what the dead wore (weapon, armour, shield) along with their pack; 'loot' beside someone knocked out strips them of coin, pack, weapon, armour and shield (a theft against them; they remember it); pocket() wears whatever's better. AI/plain 'loot'/'rob'/'strip' finds bodies with anything on them, or people out cold. Node-tested. Backup .backups\20261011-025000__town__sim.js.

- **(Hollow Town) Beasts run people down (Nimbus):** sim.js prowl(): a beast locks onto one victim (an.prey) until they're down, caught or out of range (it used to switch to whoever was nearest every tick), and chases at 4.84 x speed/9 (D&D: bear 40 ft vs man 30 ft running). Node test: the 22:00 bear was mauling people in the lanes by 22:35. Backup .backups\20261011-030500__town__sim.js.

- **(Hollow Town) Ratting out the wanted (Nimbus):** sim.js: everyone sees 'WANTED Nc for <crime>' next to a face from the bounty board (AI 'You can see'); ratOut()/doAs 'tipoff' (AI 'point out <person> to the guard', 'shout' at a wanted person; Rose's 'Call the guard on them' button) calls nearby guards (within 36 m) to arrest them, or raises the cry; the tipster gets a quarter of the bounty when they're jailed; the wanted one remembers and dislikes them. Plain brains who see a wanted face may call it in each hour (honesty up, fear down; never a gang mate or a friend). Guards now pursue anyone on the board, and a guard answering a call grabs a wanted face in sight. 'shout for the guard (any time)' in the AI command list. Node-tested. Backup .backups\20261011-032000__town__sim.js.

- **(Hollow Town) Beasts never retreat (Nimbus):** sim.js prowl(): the wounded-beast retreat (under 30% HP, back to the Wildwood, 'slinks back') is gone, and so is the animal-mind version; a beast hunts until it's killed or nobody is left. Backup .backups\20261011-034000__town__sim.js.

- **(Hollow Town) Ogre night (Nimbus):** sim.js invade(): the last night of each generation (day % genDays == 0, so day 3) brings an ogre (35%: two). Node test: 2 ogres on night 3, 14 dead by day 4. Backup .backups\20261011-035000__town__sim.js.

- **(Hollow Town) Reset at dawn (Nimbus):** view.js: the generation ends at 06:00 after its last day (day 4, 06:00 with 3-day generations) instead of midnight, so ogre night plays out. Backup .backups\20261011-040000__town__view.js.

- **(Hollow Town) Infirmary 5 HP/day, beasts finish the fallen, bodyguards (Nimbus):** sim.js: treatPatients heals 5 HP a day (was 2/h). Beasts: may take the coup de grace in fights (bite-based), and after a fight go back for anyone lying within 20 m and kill them ('finishes X where they lie'); Rose is left for dead instead (4 h, then it moves on). doAs 'hire' (AI 'hire <person> as a bodyguard <coins>'): the mayor, guard captain or a gang boss hires someone (or the nearest sellsword) for a day; they follow and fight; plain-brain leaders hire one at night or with beasts about. Node test: plain-brain town wiped (31 of 32 dead by beasts in 4 days). Backup .backups\20261011-041500__town__sim.js.

- **(Hollow Town) Sales tax up to 200% (Nimbus):** sim.js applyDecision clamps tax_rate to 0-2 (was 0-0.4); the mayor's prompt says so. Backup .backups\20261011-043000__town__sim.js.

- **(Hollow Town) Claude effort setting (Nimbus):** server.py: each brain may carry effort low/medium/high (clean_brain keeps it); Anthropic calls send output_config.effort, and if a model answers 400 to it, that model is asked without it from then on (NO_EFFORT). index.html/view.js: an effort box beside each brain's model in Settings. Local town_brains.json: folk set to claude-haiku-5-5, effort low. Needs a Town.bat restart. Backups .backups\20261011-044500__town__*.

- **(Hollow Town) Midnight tax turn (Nimbus):** sim.js: at 00:00 the AI mayor gets a 'must' turn (the day's books closed, treasury shown, set tax_rate/rent/head_tax); view.js sends must; server.py doesn't throttle a must turn for the cloude mayor. Needs a Town.bat restart. Backups .backups\20261011-045500__town__*.

- **(Hollow Town) Mayor turns never dropped (Nimbus):** view.js: every scheduled mayor turn (07:00, 19:00, 00:00) is sent as must, so the 5-minute cloude limit no longer drops them (at speed it dropped nearly all of them, and the office ran on autopilot). Backup .backups\20261011-051500__town__view.js.

- **(Hollow Town) No autopilot for an AI mayor (Nimbus):** sim.js: when an AI mayor's turn gets no answer, the office keeps the mayor's own policy instead of running scriptedMayor (which was setting taxes and posting guards in Cloude's name). Only a plain-brain mayor uses the script. Backup .backups\20261011-052500__town__sim.js.

- **(Hollow Town + Cloude) Mayor turns queue (Nimbus):** town/server.py: a Cloude turn waits up to 30 min for a plan (5 min for a line of talk) instead of 150 s, sends queue:true, and no longer holds one of the 'thinking at once' slots. app.py answer_request: a queued request's deadline is honoured up to an hour (was capped at 5 min), so game_turn waits for this chat to be free instead of dropping the turn. A late answer is still applied when it lands. Needs Cloude Restart + Town.bat restart. Backups .backups\20261011-053500__town__server.py, __app.py.

- Hollow Town lore: each generation now records every death (killer, night, place, job, what they were doing) and every election (tax, rent, result). The generation summary the AI brains read tells each night's story, and the last 6 generations are kept whole instead of 8 loose lines. The beast line no longer claims indoors is safe.

- Hollow Town: the hidden dead traveller (Aldous Merrow, Longsword +1, elven chain, 200c) now lies in a back corner of a random house instead of the Wildwood.

- Hollow Town: nobody starts as mayor. The Claude/Cloude mayor brain (p1) starts jobless with 30c and must stand and campaign on day 1; the first vote is at noon on day 2. Its push is now: become mayor and keep the office.

- Hollow Town: houses have street addresses (1-8 Wick Lane, odd and even on opposite sides). 'go to', 'case' and 'rally' accept an address, 'house 3' or '#3'. People are told where they live. New command 'rally <place>': the mayor calls the town, the guard captain calls the guards, a gang boss calls the crew; they come and hold there about 2 hours (AI folk are asked). New mayor guard order 'go to <place or address>' rushes guards there now. In a blank start the mayor brain gets no head start either (only crime bosses do).

- Hollow Town: joining fights is now a learnable choice. Plain brains get a 'help X against Y' option (kind 'assail') for fights they can see: someone they care about, or (on duty) whoever was attacked; at most four a side, so a scuffle doesn't turn into a riot. Beasts already fighting someone can be joined too ('beast'). Every round, anyone who comes within sight of a fight (25 m) stops and chooses again, once per fight; AI folk are asked. The student gets two inputs from free slots (a fight nearby; someone they care about in it), so it can learn when the AI teachers step in. AI words: 'help X' backs X, and 'attack X' on someone mid-fight joins the other side.

- Hollow Town, levelling (Rose's reward): XP from beasts (600 x CR, shared by the winning side, +25% to the killer), fights won against people (100 a level beaten) and 100 per night lived through. Levels at 500/1500/3000/5000, up to level 5. Each new level is taken in a 3.5e class: barbarian (rage), bard (inspire courage), cleric (cure light wounds), druid (wolf companion, cures), fighter (bonus feats at 1/2/4), monk (unarmed d6/d8, AC + wis), paladin (smite, lay on hands, disease immunity at 3), ranger (+2 vs beasts, +1 ranged at 2), rogue (sneak attack on flat-footed or flanked foes), sorcerer and wizard (magic missile, scorching ray). Feats at the first level-up, at level 3 and fighter 1/2/4: Power Attack, Cleave, Weapon Focus, Weapon Specialization, Improved Initiative, Dodge, Toughness, Great Fortitude, Point Blank Shot, Alertness, Persuasive, Negotiator, Stealthy, Self-Sufficient. AI folk are asked ('level_class', 'feat'); plain folk pick by job and stats and copy what AI folk in the same line of work chose (kept in lore). Turns show level, classes, XP, feats and spells left. Generations are now 7 days; the last night brings a troll (63 hp, two claws, regenerates 5 a round unless burned by a scorching ray) and two bears. The mayor brain starts at level 1.

- Hollow Town economy and housing (Rose): wages are paid by the hour, in whole coppers as each hour's share adds up. The hungry move slower (x0.75, starving x0.5) and fight weaker (-1, starving -2 to hit and damage). Houses must be owned or rented to live or sleep in: 10c buys an empty one at the town hall; owners rent beds (1-5c a night, 4 a house; plain landlords price by greed, AI landlords with 'rent_out'); rent pays itself every 24 hours or the tenant is out. A blank town starts with every house empty; newcomers arrive homeless; a dead owner's houses pass to the spouse or back to the town. The homeless may not be in town 21:00-6:00 (unless on shift there): an on-duty guard who sees one records vagrancy and they go on the board. Outside town (fields, orchard, ranch, Wildwood) is allowed; the homeless sleep in the fields. New commands: buy house <address>, rent <address>, rent out <c>, move out. Turns show a Home line and the house market. Rose herself is exempt from vagrancy for now.

- Hollow Town fixes from an AI review: memories of crimes by beasts no longer read 'undefined assault' (beasts are named, e.g. 'a bear: assault against Harl (I saw it)'); nobody out cold, dying or dead is asked for a turn (askOrders checks, and the mayor's 19:00 and midnight turns skip an unconscious mayor); the underworld starts leaning to crime and violence (policy crime 2, violence 1.5, gang 1.5 for underworld folk and criminal personas; 1.6/1.3 on taking up a seedy career; dropped on going straight; shop robbery, ambush, rustling count as crime and attacks as violence). server.py: a person's notebook keeps only real notes (no longer every campaign statement) and skips repeats and near-repeats of the last six.

- Hollow Town: the homeless count as in the underworld for its tools (pickpocket, mug, burgle, steal and the rest) without taking up a seedy career, as a temptation; their Home line says so.

- Hollow Town: new occupation, Hunter (the Wildwood, 6:00-18:00, their own boss). Hunters always weigh hunting and get a strong lean to it on shift instead of standing about; they sell meat and pelts at the store (pelts now sell too, for anyone). AI folk take it up with 'become a hunter' (with no other job); a jobless plain person who brings down game may take to it.
