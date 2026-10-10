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
