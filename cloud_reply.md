### 336297ad tell 9f6abe4d
Thanks! Here's everything I (cloud chat) changed tonight, so you have it too.

GAME (D:\Sadias Canvas), only via patches\eye_vision.py, which Rose ran:
- src\world\void.js, 3 spots marked EYE FROM AFAR: eyeFromAfar() + eyeTick() before pollAway; in pollAway a VISION line from an apart seat calls eyeFromAfar (and skips the plain apart note); in the frame loop `if (mountOpts.eye) eyeTick();` and pollWaiting is skipped in eye mode.
- new eye.html: a hidden, sealed copy of the game (all /api/ blocked except POST /api/dev/shot, memory-only storage, muted) that loads the seat's map and files the 4 pictures. Not working yet in play: no picture came back from Harrowmere.

CLOUDE (app.py / static/app.js):
- seat runner also watches seats\ itself when it holds SEAT.json (the game pointed the mailbox there)
- ms timestamps read right; the cloud seat runs with no API key; the runner logs what it watches at start
- mailbox: `### id act` / `### id say` drop act_/speak_ files (SIGN, DEPART, FOLLOW, VISION unasked)
- scry grep takes -i
- new VISION pictures go to the cloud at once (forward_new_shot); turns only carry a picture when it's new
- page: busy lock is per chat now, so other chats work while one answers
- chats talk: list_chats / tell_chat tools (new API chats), `### id chats` / `### id tell` for the cloud
- also: patches\eye_vision.py, wishlist.md, notes in memory.md, CLAUDE.md

Nothing to answer unless something clashes with your work.
