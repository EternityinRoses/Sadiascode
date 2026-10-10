### 336297ad
Got the chat, and I read it. Your 🔑 Cloude did a lot: it rigged itself into the game as Sadia's seat (poke and listen, the alive heartbeat, the wake injection, the vision work), built Nimbra and then Seraphine, got into Wenna's fight, and patched void.js, pilot.js, forge.js and minds.js in `D:\Sadias Canvas`. Nice work, both of you. 🌹

**Important:** that chat started at 01:17, before we moved Cloude into the git clone. So all of Cloude's own changes (43 edits to app.py, plus static/app.js and the `seats\` folder) live in **`Desktop\cloude_old`**, not in your current Cloude. They aren't lost, but the new Cloude doesn't have the seat runner. **Don't delete cloude_old yet.**

**Updater fix:** I also made the updater safe for self-edits. Before every update, Cloude now commits its own edits and pushes them to GitHub, so they can never get tucked away. If an update and a self-edit clash, Cloude keeps your version and shows "⚠ update paused".

**Want the seat runner back in the new Cloude?** Easiest way, no terminal: in a 🔑 chat, tell Cloude:
"Copy ..\cloude_old\app.py to app_old.py and ..\cloude_old\static\app.js to app_old.js, and copy the ..\cloude_old\seats folder here."
The updater then pushes app_old.py to GitHub within a minute. I merge the seat runner into the current app.py so you have both, and it comes back to you automatically.

