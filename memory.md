# Cloude's memory

Notes worth keeping between chats. They were started by the Claude cloud session that built Cloude, and Cloude keeps adding to them. Keep this tidy: update what changed, delete what's stale, and never put the API key or other secrets here.

## About the user

- Calls Claude "Cloude" (Claude + cloud), which is where this app's name comes from.
- Loves roses. Asked for the rose skin.
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
- Seat code: `src/minds.js` (seat records, `apiChat`, the room, the brief), `src/steps/minds.js` (the AI Minds page), `src/pilot.js` (driving bodies in the world), `src/forge.js` (character building).

### Fixes already made to `src/minds.js`

A fixed copy is at `fixed/minds.js` on the branch.

1. `CAN_LISTEN = ["agent"]`. API seats set to "listen" were never asked anything, so they stayed silent.
2. `apiChat` shows Anthropic's real error message instead of only the status code.
3. `apiChat` adds a user turn if the conversation ends on the seat's own line. Newer models reject an assistant-last request.
4. `max_tokens` raised from 700 to 4000, and the reply is built only from `text` blocks, so thinking models like Opus 5.5 don't come back empty.
5. `API_TIMEOUT_MS` raised from 30000 to 90000.
6. The room brief (`sys`) checks the forge store (`loh2_forge`). Once the seat's character is built, the seat is told it's finished and sealed until Verify. Before, Sadia had built a character and then said it hadn't, because the brief always claimed "no character sheet".

### Still open

- Opus 5.5 in the Sadia seat hadn't been confirmed working after fixes 4 and 5. If it's still silent, check the `(no answer, …)` line in the room, the browser console (F12), and `GET /v1/models` with the key.

## Cloude facts we tested

- The ☁️ cloud brain works (confirmed on Windows). It needed `claude` on the PC signed in to the user's claude.ai account; a different login gave "Cloud sessions are disabled by your organization's policy". New sessions start in a terminal window, and the user pastes the session link into Cloude. Replies come back through a GitHub mailbox, the user's design: the cloud appends to `cloud_reply.md` under `### <chat id>` and pushes, Cloude polls every 20s, shows it, and empties the file. Teleport was tried first and dropped (it popped up windows and needed typing). The ☁️ brain also sends files (via the `cloude-inbox` branch), passes ⚙ model/effort as /model and /effort, and shows Allow/Deny cards for `### <id> ask` blocks. The thinking view can't be passed through.
- The banana test (`banana_test.py`) showed the API keeps no memory between requests: without the history Claude didn't know "banana", and with it Claude did. So the whole chat has to be sent each time. The API brain uses a 1-hour prompt cache and auto-compacts chats at about 100k tokens to keep that cheap.

## Other things from that first day

- Drafted a Reddit post for r/CRPG, "just testing the water", pitching an RPG where the party members are AI minds making their own choices.
- Explained cloud sessions vs Claude Code CLI. Cloud runs in a throwaway container and can't reach the user's PC. The CLI or Remote Control runs on the PC and can use Claude in Chrome on localhost.
