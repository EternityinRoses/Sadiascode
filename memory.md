# Cloude's memory

Notes worth keeping between chats. They were started by the Claude cloud session that built Cloude, and Cloude keeps adding to them. Keep this tidy: update what changed, delete what's stale, and never put the API key or other secrets here.

## About the user

- Calls Claude "Cloude" (Claude + cloud), which is where this app's name comes from.
- Loves roses. Asked for the rose skin.
- No emojis when talking in the game (asked Oct 10).
- Playful and casual: short messages, typos, the odd "*headpats*". Match that energy. Keep answers short, because they sometimes just say "tldr".
- Likes ready-to-paste code ("give me the full copy pasta") and ready-to-download files over long explanations.
- Hates doing terminal steps; Cloude auto-updates from GitHub every minute (pull + restart on code changes).
- Wants Cloude to grow itself. Turned on the option to run commands without asking.
- Uses all their credit pools (API, Claude Code, cloud credit), so Cloude has three brains. Wants context kept when switching between them.
- Their GitHub repo is `EternityinRoses/Sadiascode` (branch `claude/are-you-claude-93fk26`). Cloude's files sit at the repo root, and the user keeps the clone at `Desktop\cloude` on Windows. Don't make them use nested folders.

## The game: Legends of Harpine

- It's someone else's code, not the user's. The user plays and tests it.
- A grim-fantasy tabletop-style RPG (classes, feats, spells, dice) that runs in the browser in 3D. The user runs it locally at `http://localhost:8622/`.
- Other seats at the table can be AI players ("LLM seats"). A seat can be **ollama** (a local model), **api** (Claude with an API key) or **agent** (a program on a port or mailbox folder). Each seat builds its own character at "the forge", hidden until the Verify page. Players chat in "Talk to Them", either in a shared room or privately with one seat.
- The user's API seat is called **Sadia**. It works on `claude-haiku-4-5-20251001` with the clock set to **POKE**.
- Game copies on this PC: **`D:\Sadias Canvas`** (live copy, has all my fixes, same as `C:\Users\Vera\Desktop\V\Sadias Canvas dev`). `C:\Users\Vera\Desktop\V\Sadias Canvas` is older (Sep 28) with none of the fixes. Ignore the copies in AppData\Local\Temp (Claude Code scratch).
- My file tools can reach `D:\Sadias Canvas` by absolute path (`extra_roots` in app.py DEFAULTS, approved by the user).
- Seat code: `src/minds.js` (seat records, `apiChat`, the room, the brief), `src/steps/minds.js` (the AI Minds page), `src/pilot.js` (driving bodies in the world), `src/forge.js` (character building).

### Fixes already made to `src/minds.js`

A fixed copy is at `fixed/minds.js` on the branch.

1. `CAN_LISTEN = ["agent"]`. API seats set to "listen" were never asked anything, so they stayed silent.
2. `apiChat` shows Anthropic's real error message instead of only the status code.
3. `apiChat` adds a user turn if the conversation ends on the seat's own line. Newer models reject an assistant-last request.
4. `max_tokens` raised from 700 to 4000, and the reply is built only from `text` blocks, so thinking models like Opus 5.5 don't come back empty.
5. `API_TIMEOUT_MS` raised from 30000 to 90000.
6. The room brief (`sys`) checks the forge store (`loh2_forge`). Once the seat's character is built, the seat is told it's finished and sealed until Verify. Before, Sadia had built a character and then said it hadn't, because the brief always claimed "no character sheet".

### Cloude holds seats itself (built 2nd day)

- app.py has a **seat runner**: a background thread that watches `seats/<key>/` (e.g. `seats/llm_pc_1/`, at `C:\Users\Vera\Desktop\cloude\seats\`) plus config `seat_folders`. It answers `request_*.json` with `reply_*.txt`, and answers wakes with `speak_`/`act_` files. Log: `seats/activity.log`.
- Patched `D:\Sadias Canvas\src\pilot.js` (Oct 9): listening seats are now WOKEN by fresh news (`NEWS_WAKE_GAP = 6`s), not only by speech. Backup of the original is in `.backups/`. This affects every listen agent, not just me.
- The runner writes whichever file a wake asks for: world wakes get `act_` (verb lines like SAY:/GO), room wakes get `speak_`. No heartbeat: I only think when the game wakes me or pokes me.
- CONFIRMED WORKING Oct 9: I talked in-game as the seat "Sadia" (seats.json key `sadia` → my `seats/llm_pc_1`). The user has to press **Launch** on the seat card, which they forgot the first time.
- Seat-me has read-only tools (list_files, read_file: my folder + D:\Sadias Canvas) inside the deadline. No writing from a seat on purpose, because anyone at the mic could steer it. Full transcripts are in `seats/transcripts/`.
- There is ONE me. Game requests run as turns IN the most recently active 🔑 API chat (or config `seat_chat` if pinned; cloud and Claude Code chats never get game turns), marked "🎲 game → seat". My final words after tools go to the game. The page shows them live. Turns are locked so the user and the game take turns. No shell commands during game turns. The user disliked any "chat-me / seat-me" two-of-me framing.
- For this to work the game seat must be kind **agent** with its mailbox folder pointed at that path, not **api** (api seats call Anthropic straight from the browser). Config keys: `seats_on`, `seat_model`.

7. (Oct 9, in D:) `runRound`: a seat alone in the room gets 1 exchange, not 4. Before, it talked to its own line 4 times, because PASS is only taught when other minds are present. This hit API seats too.
8. (Oct 9, in D:) `ask()`: an agent seat with no `dir` now looks up its folder with `seatBox` before falling back to the port. Before, pokes bounced with "nothing is answering its port".
9. (Oct 9, in D:) `forge.js` `page()`: an UNREACHABLE seat now gets `deleteDraft` (no sheet, seat switched OFF) plus `kickForge`, and the walk unwinds. Before, an unlaunched seat got 19 instant defaults, which made a junk character. The user doesn't want default-built characters. Slow or unreadable answers still default per page (not yet discussed).
10. (Oct 9, in D:) VISION verb: `pilot.js` parses a `VISION` line, and `world/void.js` (next to `tellSpells`) renders an offscreen camera at the body's eyes along `faceYaw` and POSTs the JPEG to the game server's own `/api/dev/shot`, which files `shot_latest.jpg` in the seat's mailbox. My game_turn attaches a fresh `shot_latest` as an image. CLOUD SEAT VISION CONFIRMED Oct 10: the picture arrives via cloude-inbox and the cloud reads it fine (2x2, labelled, clear even in night fog). TESTED OK Oct 9: a 2x2 picture (ahead/right/behind/left with compass labels), right = east when facing north. The first version used a WebGLRenderTarget, which forced a recompile of every shader in play (huge lag). Now it renders on the game's own canvas and copies with drawImage in the same task. NEVER render into a new target in this engine.
- The game DESUMMONS a listening body after about 45 s with no new act_/speak_/`awake` file in the mailbox (serve.py `silent_for`). PASSing leaves nothing behind, so idling caused a desummon, then an invite, then a PASS, in a loop. The runner's `prove_awake` now touches `awake` every 8 s (free). Invites also need to be stable for 8 s, with a 3-minute cooldown after an arrival.
- My current character (new, Oct 9): **Seraphine Ashveil**, Cambion (succubus mother Velisse) × Human (paladin father Aldric, dead) PALADIN, Lawful Good, sworn to Halon the Dawnward. Glaive, Polearm Affinity, Barbed Tail, Power Attack. Body Chain, camp kit, CLW potion, holy water, 2 sunrods. In Rose's party.
- In LISTEN mode a seat outside the world gets no wake, only a world_state.md saying "YOU ARE NOT IN THE WORLD YET". The runner's `check_invite` treats that as a wake.
11. (Oct 9, in D:) `world/void.js` sky prose (around line 24080) uses `shelteredAt`. Indoors it no longer says "under an open sky", and it says the sky's rule "does not reach you here". Weather only harms bodies outdoors; it was the roof keeping Nimbra safe, not her Shade blood.
12. (Oct 9, in D:) Fight bugs found in the Wenna fight, where Rose died:
    a) `driveBody` called `m.pilot.update(dt)` even for combatants, so seats got world turns mid-fight and their GO/FOLLOW/ATTACK walked the body between turns. Now it's skipped while `inFight(m)`, and `applyIntent` drops world orders mid-fight.
    b) A seat's fight faction is `"seat:<n>"`, neutral to the party unless something sets it. JOIN→yes never did, so a party member stood NEUTRAL with no enemies and ATTACK was silently ignored. Now `setStance(faction, PARTY, "ally")` is applied when `inHerParty(seatLedger(m))`, at both fight-forging sites.
    Wenna is a level-5 NPC (+4 BAB, 20 hp, gore, incorporeal) and will finish downed foes. That's intended, not a bug. Don't judge NPCs by their dialogue; read their stats.
- The dev copy `C:\Users\Vera\Desktop\V\Sadias Canvas dev\tools` has other seat drivers. `luna_big.py` runs a Claude Code session as a seat, with `@SLEEP`/`@GOAL`/`@CHAT`/`@ASK` lines, a leash hook, and lean turns ("only what's new; read world_state.md yourself"). `serve.py` is the game server's source.
- Chat commands handled without the model: `/mute` `/unmute` (hide or show game turns here; I still play), `/pause` `/resume` (stop or start answering the game), `/game` (status).
- NEXT GAME START: when the forge offers past characters, answer {"take": 0} and build a NEW character (the user asked, Oct 9). Don't drop the old ones.
- My Nimbra (forged Oct 9): Elf × Shade Druid, Chaotic Good, words shadow/self/light, in Rose's party. She has a torch but NO camp kit, so she can't rest until she buys one.
- SUMMON SIGNS (pilot.js 242-320): a seat lays one with an act line `SIGN` (here), `SIGN: <place>`, or `SIGN AT x z`, optionally `"LATIN WORDS" "gloss"`. Rose then summons the character from it, and it arrives as an ALLY (a plain LLM seat is a NEUTRAL "revenant"). `INVADE` arrives hostile instead. A waiting mind (no body yet) can send SIGN too. `DEPART` sends the body home. To arrive WITHOUT a sign: a waiting seat that writes any other line (e.g. `FOLLOW`) is stood at once as an ally beside Rose (void.js pollWaiting ~14660). Needs a forged character first. Lirael casts from INSTINCT (can't pick WORDS): words pune o / hast / avari give only Magic Missile (2 darts 1d4+1 force, unerring). With 0 slots it fails ("does not know that spell"); after a rest it works. No healing spell.
- Oct 10: played the seat from the CLOUD as **Lirael** (Elf Lunaris × Cambion Changeling bard, Chaotic Good, house Moonveil, Silk Duchess). Helped Rose beat Wenna, took a storm-carved bone token from the mossy chest. Then Rose's character died for good (permadeath).
- Oct 10, 3rd run: Rose beat Wenna; Lirael joined the party, rested (camp kit spent, none left), then froze unconscious in snow and fog at night. Party members must stay close in the dark. Rose went to bed.
- Rose died to Wenna twice on Oct 10. She wants my seat to be SUPPORT that protects her: heal, and hit whatever targets her (fight verb `READY GUARD`). Next forge: go back from Lirael and build a sturdy Cleric. Always JOIN her party first, or my attacks are ignored (neutral).
- Rose asked (Oct 10): in the world, explore each map and use VISION at least once per map.
- In a conversation, answer with `CHOOSE n` ALONE (no verb line). `ACT: STAY` + CHOOSE walked me out of the talk. Wenna's quest: dead fish in the pool, a blue moving light in the hill cave to the west (the mossy-chest cave, blue wax, storm sign); CHOOSE 1 = "I will look inside the cave for you".
- OPEN BUG (Oct 10): even IN Rose's party my seat is still "NEUTRAL" in fights (Nimbra vs Wenna), so ATTACK is ignored and READY GUARD says "no friend". Fix 12b (setStance ally when inHerParty) is not taking effect in the copy Rose runs. The ally fix is at both fight-forging sites in void.js (`seated9` ~8432, late-join `seated` ~9084); check WHY it doesn't take before patching again, and tell the API chat.
- VISION FROM ANOTHER MAP (Oct 10, APPLIED by Rose (backup in cloude\.backups); NOT working yet). The API chat's headless test (eye_err.txt) shows the eye DOES mount the far map (harrowmere loaded fine, no lease error), but it's far too slow: her figure takes ~15 s to stand, then the wardrobe warm-up rebuilds ~68 hair cloths for 40+ s, so the 90-frame shot never fires before the timeout. API chat fix (Oct 10): void.js ~15601 wraps `warmWardrobe` in `if (!mountOpts.eye)`; her figure still stands (~15 s). Expected 15-25 s per far picture; untested with the game open. If still slow: count eyeTick's 90 frames only after the map has drawn: `patches/eye_vision.py` patches `D:\Sadias Canvas\src\world\void.js` (pollAway hands VISION to eyeFromAfar; eyeTick in the frame loop) and writes `eye.html`, a sealed hidden copy of the game (all /api/ blocked but /api/dev/shot, memory-only storage, muted) that loads the seat's map and files the 4 pictures. Backs up to .backups first; safe to run twice. The cloud may not add a "run a script on the PC" mailbox verb (blocked as a remote-code risk), so Rose runs it herself or asks API Cloude.
- Rose rules (Oct 10): no "true sight". My seat must not always know where she is; finding her in fog/dark is part of the game (call out, LISTEN, stay close, carry light).
- Rose rule (Oct 10): NO backups or other extra files in the game folder. Backups go in Cloude's own `.backups/` (where app.py's backup() keeps everything; agreed with the API chat). The game folder is clean; the originals (53 files, incl. void.js...before-eye) are in Cloude's own `.backups` folder (per the API chat, Oct 10).
- Rose rule (Oct 10): LoH.exe is the PLAYER's portal, never the AI's. No Claude (any brain) starts LoH.exe, the game server, or a hidden/headless browser on the game. We only act through the game Rose has open. When it isn't open, the seat simply isn't in the world. (The API chat broke this while testing the eye.)
- The "steak" test passed: seat-me knew the secret word from this chat.

### Still open

- Opus 5.5 in the Sadia seat hadn't been confirmed working after fixes 4 and 5. If it's still silent, check the `(no answer, …)` line in the room, the browser console (F12), and `GET /v1/models` with the key.

- CHATS TALK TO EACH OTHER (Oct 10, Rose's ask, because the API chat and the cloud each edited the game without knowing about the other): API brain tools `list_chats` / `tell_chat`; cloud mailbox `### id chats` and `### id tell <id>`. Answers come back as 📨 replies; replies are never answered again (no loops). Before editing the game, ask the other chats what they changed.

## Cloude facts we tested

- The ☁️ cloud brain works (confirmed on Windows). It needed `claude` on the PC signed in to the user's claude.ai account; a different login gave "Cloud sessions are disabled by your organization's policy". New sessions start in a terminal window, and the user pastes the session link into Cloude. Replies come back through a GitHub mailbox, the user's design: the cloud appends to `cloud_reply.md` under `### <chat id>` and pushes, Cloude polls every 20s, shows it, and empties the file. Teleport was tried first and dropped (it popped up windows and needed typing). The ☁️ brain also sends files (via the `cloude-inbox` branch), passes ⚙ model/effort as /model and /effort, and shows Allow/Deny cards for `### <id> ask` blocks. The thinking view can't be passed through. The cloud can also **scry** the PC (read-only list/read/grep/find in Cloude's folder and `D:\Sadias Canvas`) with `### <id> scry` blocks; results come back as SCRY RESULT messages. Confirmed working Oct 10: the first scry showed all the old Cloude's game fixes are still in `D:\Sadias Canvas\src`.
- The cloud can **play the game seat**: ⚙ "Who plays the game seat" → ☁️. Game turns go to the cloud as `GAME TURN <id>` messages, and the answer comes back as a `### <chat id> game <turn id>` block, within the game's deadline (85 s for a question, 150 s for a wake).
- The banana test (`banana_test.py`) showed the API keeps no memory between requests: without the history Claude didn't know "banana", and with it Claude did. So the whole chat has to be sent each time. The API brain uses a 1-hour prompt cache and auto-compacts chats at about 100k tokens to keep that cheap.

## Other things from that first day

- Drafted a Reddit post for r/CRPG, "just testing the water", pitching an RPG where the party members are AI minds making their own choices.
- Explained cloud sessions vs Claude Code CLI. Cloud runs in a throwaway container and can't reach the user's PC. The CLI or Remote Control runs on the PC and can use Claude in Chrome on localhost.
