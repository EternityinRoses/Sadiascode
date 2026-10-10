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
