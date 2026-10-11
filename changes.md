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
